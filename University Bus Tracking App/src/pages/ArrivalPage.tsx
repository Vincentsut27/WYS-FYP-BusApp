import { useMemo, useState } from "react";
import { CampusMap } from "../components/CampusMap";
import { Icon, ICONS } from "../components/Icon";
import { ROUTES, STOPS } from "../data/routes";
import { useLiveBusEta } from "../hooks/useLiveBusEta";
import { useCurrentMinute } from "../hooks/useCurrentMinute";
import { useRouteGeometry } from "../hooks/useRouteGeometry";
import { routeHeading, stopLabel } from "../i18n/content";
import { useI18n } from "../i18n/LanguageProvider";
import { LIVE_ETA_ENABLED } from "../lib/featureFlags";
import {
  getDistance,
  getPhysicalStops,
  getRouteArrivalMinutes,
  sameStopLocation,
} from "../lib/transit";
import { recordUsage } from "../lib/usage";
import type { Route, Stop } from "../types/transit";

function getNextRouteArrival(
  route: Route,
  selectedStop: Stop,
  now: Date,
) {
  return route.stopIds
    .flatMap((stopId, stopIndex) => {
      if (!sameStopLocation(STOPS[stopId], selectedStop)) return [];
      const arrivals = getRouteArrivalMinutes(route, stopIndex, now);
      return arrivals ? [{ stopId, stopIndex, arrivals }] : [];
    })
    .sort((first, second) => first.arrivals[0] - second.arrivals[0])[0] ?? null;
}

function LiveRouteEstimate({
  route,
  selectedStop,
  fallbackMinutes,
}: {
  route: Route;
  selectedStop: Stop;
  fallbackMinutes: [number, number | null] | null;
}) {
  const routeStops = route.stopIds.map((id) => STOPS[id]).filter(Boolean);
  const routePoints = routeStops.map(
    (stop) => [stop.lat, stop.lng] as [number, number],
  );
  const routeGeometry = useRouteGeometry(route.id, routePoints);
  const destinationProgressMeters = useMemo(
    () =>
      routeGeometry
        ? route.stopIds.flatMap((stopId, index) => {
            if (!sameStopLocation(STOPS[stopId], selectedStop)) return [];
            return [
              routeGeometry.segments[index]?.startDistanceMeters ??
                routeGeometry.totalDistanceMeters,
            ];
          })
        : [],
    [route.stopIds, routeGeometry, selectedStop],
  );
  const estimate = useLiveBusEta(
    route.id,
    destinationProgressMeters,
    routeGeometry,
  );
  const { t } = useI18n();
  const hasLiveEta =
    estimate.status === "ready" && estimate.etaMinutes !== null;

  return (
    <div
      className="rounded-xl px-3 py-2 text-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="text-[10px] font-semibold uppercase"
        style={{ color: "var(--muted)" }}
      >
        {hasLiveEta ? t("liveEta") : t("scheduledArrival")}
      </div>
      {hasLiveEta ? (
        <div className="text-lg font-extrabold" style={{ color: route.color }}>
          {t("liveMinutes", { count: estimate.etaMinutes ?? 0 })}
        </div>
      ) : fallbackMinutes ? (
        <div className="mt-1 flex gap-2">
          {fallbackMinutes.map((minutes, index) => (
            <div
              key={`${minutes}-${index}`}
              className="flex-1 rounded-lg py-1 text-center text-sm font-bold"
              style={{
                background: index === 0 ? route.color : "white",
                color: index === 0 ? "white" : route.color,
              }}
            >
              {minutes === null ? "--" : t("minutes", { count: minutes })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
          {t("beyondHours")}
        </div>
      )}
      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
        {hasLiveEta
          ? t(estimate.reportsCount === 1 ? "liveReports" : "liveReportsPlural", { count: estimate.reportsCount })
          : estimate.status === "error"
            ? t("liveUnavailable")
            : estimate.status === "unconfigured"
              ? t("liveUnconfigured")
              : t("scheduleVariesShort")}
      </div>
    </div>
  );
}

function IllustrativeRouteEstimate({
  route,
  minutes,
}: {
  route: Route;
  minutes: [number, number | null] | null;
}) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-xl px-3 py-2 text-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="text-[10px] font-semibold uppercase"
        style={{ color: "var(--muted)" }}
      >
        {t("scheduledArrival")}
      </div>
      {minutes ? (
        <div className="mt-1 flex gap-2">
          {minutes.map((value, index) => (
            <div
              key={`${value}-${index}`}
              className="flex-1 rounded-lg py-1 text-center text-sm font-bold"
              style={{
                background: index === 0 ? route.color : "white",
                color: index === 0 ? "white" : route.color,
              }}
            >
              {value === null ? "--" : t("minutes", { count: value })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
          {t("beyondHours")}
        </div>
      )}
      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
        {t("scheduleVariesShort")}
      </div>
    </div>
  );
}

export function ArrivalPage({
  gpsPosition,
  onRequestGps,
  userHeading,
  onSelectRoute,
}: {
  gpsPosition: GeolocationPosition | null;
  onRequestGps: () => void;
  userHeading?: number | null;
  onSelectRoute: (routeId: string, stopId: string) => void;
}) {
  const { locale, t } = useI18n();
  const [subTab, setSubTab] = useState<"nearby" | "stops">("nearby");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const openStop = (stop: Stop) => {
    setSelectedStop(stop);
    recordUsage("arrival");
  };
  const currentTime = useCurrentMinute();
  const userPos: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;
  const physicalStops = getPhysicalStops();
  const nearbyStops = physicalStops
    .map((stop) => ({
      ...stop,
      dist: userPos
        ? getDistance(userPos[0], userPos[1], stop.lat, stop.lng)
        : Infinity,
    }))
    .sort((first, second) => first.dist - second.dist)
    .slice(0, 8);
  const stopList = subTab === "nearby" ? nearbyStops : physicalStops;

  if (selectedStop) {
    const servingRoutes = ROUTES.filter((route) =>
      route.stopIds.some((stopId) =>
        sameStopLocation(STOPS[stopId], selectedStop),
      ),
    );
    const scheduledRoutes = servingRoutes
      .flatMap((route) => {
        const arrival = getNextRouteArrival(route, selectedStop, currentTime);
        return arrival ? [{ route, ...arrival }] : [];
      })
      .sort((first, second) => first.arrivals[0] - second.arrivals[0]);
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div
          className="flex items-center gap-3 px-4 py-3 bg-white border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setSelectedStop(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.chevronLeft} size={20} />
          </button>
          <div>
            <div
              className="text-base font-bold"
              style={{ color: "var(--text)" }}
            >
              {stopLabel(selectedStop, locale)}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {t("scheduleCountdowns")}
            </div>
          </div>
        </div>
        <div className="flex-1 scrollable">
          <div className="p-3">
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <CampusMap
                highlightStopId={selectedStop.id}
                userPos={userPos}
                height={180}
                userHeading={userHeading ?? 0}
              />
            </div>
          </div>
          {servingRoutes.length === 0 ? (
            <div
              className="px-4 py-8 text-center"
              style={{ color: "var(--muted)" }}
            >
              {t("noRoutesStop")}
            </div>
          ) : scheduledRoutes.length === 0 ? (
            <div
              className="px-4 py-8 text-center"
              style={{ color: "var(--muted)" }}
            >
              {t("noBusesRemaining")}
            </div>
          ) : (
            <>
              <div className="px-4 pb-1 pt-1">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--muted)" }}
                >
                  {t("routesServing")}
                </span>
                {LIVE_ETA_ENABLED ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {t("liveEtaHint")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {t("scheduleVaries")}
                  </p>
                )}
              </div>
              {scheduledRoutes.map(({ route, stopId, stopIndex, arrivals }) => {
                const routeMinutes = arrivals;
                const nextStop = route.stopIds[stopIndex + 1]
                  ? STOPS[route.stopIds[stopIndex + 1]]
                  : null;
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => {
                      onSelectRoute(route.id, stopId);
                    }}
                    className="mx-3 mb-3 block w-[calc(100%-1.5rem)] bg-white rounded-2xl p-4 text-left shadow-sm active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ background: route.color }}
                      >
                        {route.label}
                      </div>
                      <div>
                        <div
                          className="text-sm font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {routeHeading(route, locale)}
                        </div>
                        {nextStop && (
                          <div
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            {t("nextStopArrow", { stop: stopLabel(nextStop, locale) })}
                          </div>
                        )}
                      </div>
                    </div>
                    {LIVE_ETA_ENABLED ? (
                      <LiveRouteEstimate
                        route={route}
                        selectedStop={selectedStop}
                        fallbackMinutes={routeMinutes}
                      />
                    ) : (
                      <IllustrativeRouteEstimate
                        route={route}
                        minutes={routeMinutes}
                      />
                    )}
                  </button>
                );
              })}
            </>
          )}
          <div className="h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="bg-white border-b px-4 pt-4 pb-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1
            className="text-xl font-extrabold"
            style={{ color: "var(--text)" }}
          >
            {t("arrivalTitle")}
          </h1>
          <button
            onClick={onRequestGps}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--purple-pale)", color: "var(--purple)" }}
          >
            <Icon path={ICONS.locate} size={18} />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 mb-3">
          {(["nearby", "stops"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: subTab === tab ? "white" : "transparent",
                color: subTab === tab ? "var(--purple)" : "var(--muted)",
                boxShadow:
                  subTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab === "nearby" ? t("nearMe") : t("allStops")}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white shadow-sm">
        {!gpsPosition && subTab === "nearby" && (
          <div
            className="px-4 py-3 flex items-center gap-3 border-b"
            style={{ borderColor: "var(--border)", background: "#FFFBEB" }}
          >
            <Icon path={ICONS.locate} size={18} style={{ color: "#B45309" }} />
            <span className="flex-1 text-xs" style={{ color: "#92400E" }}>
              {t("allowLocation")}
            </span>
            <button
              onClick={onRequestGps}
              className="text-xs font-bold"
              style={{ color: "#B45309" }}
            >
              {t("enable")}
            </button>
          </div>
        )}
        <CampusMap
          showAllStops
          userPos={userPos}
          height={190}
          onStopClick={openStop}
          userHeading={userHeading ?? 0}
        />
      </div>
      <div className="flex-1 scrollable mt-1 bg-white">
        <div
          className="px-4 py-2 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            {subTab === "nearby" ? t("nearbyStops") : t("allStops")}
          </span>
        </div>
        {(gpsPosition ? stopList : subTab === "nearby" ? [] : stopList).map(
          (stop, index) => {
            const distance = "dist" in stop ? stop.dist : null;
            return (
              <button
                key={stop.id}
                onClick={() => openStop(stop)}
                className="w-full flex items-center px-4 py-3.5 border-b text-left gap-3 active:bg-gray-50"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: "var(--purple-pale)",
                    color: "var(--purple)",
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {stopLabel(stop, locale)}
                  </div>
                </div>
                {typeof distance === "number" && (
                  <span
                    className="text-xs font-semibold flex-shrink-0"
                    style={{ color: "var(--muted)" }}
                  >
                    {distance < 1000
                      ? locale === "zh-Hant" ? `${distance} 米` : `${distance}m`
                      : locale === "zh-Hant" ? `${(distance / 1000).toFixed(1)} 公里` : `${(distance / 1000).toFixed(1)}km`}
                  </span>
                )}
                <Icon
                  path={ICONS.chevronRight}
                  size={16}
                  className="opacity-30"
                />
              </button>
            );
          },
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
