import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export type BusLocationSharingStatus =
  | "off"
  | "starting"
  | "sharing"
  | "waiting"
  | "unconfigured"
  | "error";

export function useBusLocationSharing(
  enabled: boolean,
  routeId: string | undefined,
  anonymousToken: string | null,
  position: GeolocationPosition | null,
  heading: number | null,
  progressMeters: number | null,
) {
  const [status, setStatus] = useState<BusLocationSharingStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const latestReport = useRef({ position, heading, progressMeters });
  latestReport.current = { position, heading, progressMeters };

  useEffect(() => {
    if (!enabled || !routeId || !anonymousToken) {
      setStatus("off");
      setError(null);
      return;
    }
    const client = supabase;
    if (!client) {
      setStatus("unconfigured");
      setError("Supabase is not configured for this app yet.");
      return;
    }

    let active = true;
    let sending = false;
    const reportLocation = async () => {
      const current = latestReport.current;
      if (!active || sending || !current.position) {
        if (active && !current.position) setStatus("waiting");
        return;
      }

      sending = true;
      try {
        // Upload GPS only for the current trip; anonymous_token is regenerated for each trip.
        const { error: reportError } = await client
          .from("location_reports")
          .insert({
            route_id: routeId,
            anonymous_token: anonymousToken,
            lat: current.position.coords.latitude,
            lng: current.position.coords.longitude,
            heading: current.heading,
            speed: current.position.coords.speed,
            progress_meters: current.progressMeters,
          });
        if (reportError) throw reportError;
        if (active) {
          setStatus("sharing");
          setError(null);
        }
      } catch (reportError) {
        if (active) {
          setStatus("error");
          setError(
            reportError instanceof Error
              ? reportError.message
              : "Unable to share trip progress.",
          );
        }
      } finally {
        sending = false;
      }
    };

    setStatus(position ? "starting" : "waiting");
    setError(null);
    void reportLocation();
    const interval = window.setInterval(() => void reportLocation(), 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [enabled, routeId, anonymousToken]);

  return { status, error };
}
