import { useEffect, useState } from "react";
import type { RouteGeometry } from "../lib/routeGeometry";
import { matchPositionToRoute } from "../lib/routeMatcher";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { LocationReport } from "../lib/supabase";

export type LiveBusEta = {
  status: "loading" | "ready" | "unconfigured" | "error";
  etaMinutes: number | null;
  reportsCount: number;
};

const EMPTY_ETA: LiveBusEta = {
  status: "loading",
  etaMinutes: null,
  reportsCount: 0,
};

export function useLiveBusEta(
  routeId: string,
  destinationProgressMeters: number[],
  geometry: RouteGeometry | null,
) {
  const [eta, setEta] = useState(EMPTY_ETA);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setEta({ ...EMPTY_ETA, status: "unconfigured" });
      return;
    }
    if (!geometry || destinationProgressMeters.length === 0) {
      setEta(EMPTY_ETA);
      return;
    }

    let active = true;
    const calculateEta = (reports: LocationReport[]) => {
      // Keep only the latest sample per anonymous trip, then use the median ETA to limit GPS outliers.
      const byToken = new Map<string, LocationReport[]>();
      reports.forEach((report) => {
        if (!report.anonymous_token) return;
        const tokenReports = byToken.get(report.anonymous_token) ?? [];
        tokenReports.push(report);
        byToken.set(report.anonymous_token, tokenReports);
      });

      const estimates: number[] = [];
      byToken.forEach((tokenReports) => {
        const latest = tokenReports[0];
        const positionProgress =
          latest.progress_meters ??
          matchPositionToRoute(
            geometry.segments,
            [latest.lat, latest.lng],
            0,
            geometry.totalDistanceMeters,
            40,
          )?.progressMeters ??
          null;
        if (positionProgress === null) return;

        let nextDestination = destinationProgressMeters
          .filter((progress) => progress >= positionProgress - 25)
          .sort((first, second) => first - second)[0];
        let remainingMeters =
          nextDestination === undefined
            ? null
            : Math.max(0, nextDestination - positionProgress);

        if (
          remainingMeters === null &&
          destinationProgressMeters.length > 0 &&
          destinationProgressMeters[0] < 100 &&
          positionProgress < geometry.totalDistanceMeters
        ) {
          nextDestination = destinationProgressMeters[0];
          remainingMeters =
            geometry.totalDistanceMeters - positionProgress + nextDestination;
        }
        if (remainingMeters === null) return;

        const previous = tokenReports[1];
        const elapsedSeconds = previous
          ? (Date.parse(latest.reported_at) -
              Date.parse(previous.reported_at)) /
            1000
          : 0;
        const previousProgress = previous?.progress_meters;
        const measuredSpeed =
          previousProgress !== null &&
          previousProgress !== undefined &&
          elapsedSeconds > 0
            ? (positionProgress - previousProgress) / elapsedSeconds
            : null;
        const reportedSpeed = Number(latest.speed);
        const speedMetersPerSecond =
          Number.isFinite(reportedSpeed) &&
          reportedSpeed >= 1 &&
          reportedSpeed <= 20
            ? reportedSpeed
            : measuredSpeed !== null &&
                measuredSpeed >= 1 &&
                measuredSpeed <= 20
              ? measuredSpeed
              : 4.5;
        const reportAgeSeconds = Math.max(
          0,
          (Date.now() - Date.parse(latest.reported_at)) / 1000,
        );
        estimates.push(
          Math.max(
            0,
            remainingMeters / speedMetersPerSecond / 60 - reportAgeSeconds / 60,
          ),
        );
      });

      if (estimates.length === 0) return null;
      estimates.sort((first, second) => first - second);
      return {
        etaMinutes: Math.ceil(estimates[Math.floor(estimates.length / 2)]),
        reportsCount: estimates.length,
      };
    };

    const refresh = async () => {
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data, error } = await client
        .from("location_reports")
        .select(
          "id, route_id, anonymous_token, lat, lng, heading, speed, progress_meters, reported_at",
        )
        .eq("route_id", routeId)
        .gte("reported_at", since)
        .order("reported_at", { ascending: false });
      if (!active) return;
      if (error) {
        setEta({ ...EMPTY_ETA, status: "error" });
        return;
      }
      const estimate = calculateEta(data);
      setEta({
        status: "ready",
        etaMinutes: estimate?.etaMinutes ?? null,
        reportsCount: estimate?.reportsCount ?? 0,
      });
    };

    setEta(EMPTY_ETA);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    const channel = client
      .channel(`arrival-eta-${routeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "location_reports",
          filter: `route_id=eq.${routeId}`,
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      active = false;
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [routeId, destinationProgressMeters, geometry]);

  return eta;
}
