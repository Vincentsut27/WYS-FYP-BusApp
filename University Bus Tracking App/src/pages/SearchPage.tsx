import { useEffect, useMemo, useState } from "react";
import { Icon, ICONS } from "../components/Icon";
import { CAMPUS_BUILDINGS } from "../data/buildings";
import { ROUTES, STOPS } from "../data/routes";
import {
  distanceByPath,
  useCampusWalkingDistances,
} from "../hooks/useCampusWalkingDistances";
import { useCurrentMinute } from "../hooks/useCurrentMinute";
import { buildingLabel, routeHeading, stopLabel } from "../i18n/content";
import { useI18n } from "../i18n/LanguageProvider";
import {
  getDistance,
  getRouteArrivalMinutes,
  getSearchRouteTrip,
  getRouteTripMinutes,
  getPhysicalStops,
  isRouteOperatingNow,
  SEARCH_STOPS,
  sameStopLocation,
} from "../lib/transit";
import { loadWalkingDistance, type Coordinate } from "../lib/routeGeometry";
import { recordUsage } from "../lib/usage";
import type { CampusBuilding, Route, SearchStop, Stop } from "../types/transit";

interface BuildingRouteOption {
  route: Route;
  startStopId: string;
  endStopId: string;
  startStopIndex: number;
  endStopIndex: number;
  startStop: Stop;
  endStop: Stop;
  rideMinutes: number;
  walkToStartMeters: number;
  walkToBuildingMeters: number;
  arrivalMinutes: number;
}

function getBuildingRouteOptions(
  origin: Stop,
  destination: Stop,
  userPosition: [number, number],
  building: CampusBuilding,
  now: Date,
) {
  const options: BuildingRouteOption[] = [];
  for (const route of ROUTES) {
    if (!isRouteOperatingNow(route, now)) continue;
    let bestOption: BuildingRouteOption | null = null;
    for (let startIndex = 0; startIndex < route.stopIds.length - 1; startIndex += 1) {
      const startStopId = route.stopIds[startIndex];
      const startStop = STOPS[startStopId];
      if (!startStop || !sameStopLocation(startStop, origin)) continue;
      const arrivals = getRouteArrivalMinutes(route, startIndex, now);
      if (!arrivals) continue;

      for (let endIndex = startIndex + 1; endIndex < route.stopIds.length; endIndex += 1) {
        const endStopId = route.stopIds[endIndex];
        const endStop = STOPS[endStopId];
        if (!endStop || !sameStopLocation(endStop, destination)) continue;
        const option: BuildingRouteOption = {
          route,
          startStopId,
          endStopId,
          startStopIndex: startIndex,
          endStopIndex: endIndex,
          startStop,
          endStop,
          rideMinutes: getRouteTripMinutes(route, startIndex, endIndex),
          walkToStartMeters: getDistance(
            userPosition[0],
            userPosition[1],
            origin.lat,
            origin.lng,
          ),
          walkToBuildingMeters: getDistance(
            building.lat,
            building.lng,
            destination.lat,
            destination.lng,
          ),
          arrivalMinutes: arrivals[0],
        };
        if (
          !bestOption ||
          option.arrivalMinutes < bestOption.arrivalMinutes ||
          (option.arrivalMinutes === bestOption.arrivalMinutes &&
            option.rideMinutes < bestOption.rideMinutes)
        ) {
          bestOption = option;
        }
      }
    }
    if (bestOption) options.push(bestOption);
  }
  return options.sort(
    (first, second) => first.arrivalMinutes - second.arrivalMinutes,
  );
}

export function SearchPage({
  onTrackRoute,
  onTrackBuilding,
  gpsPosition,
  onRequestGps,
}: {
  onTrackRoute: (route: Route, from: SearchStop, to: SearchStop) => void;
  onTrackBuilding: (
    route: Route,
    startStopId: string,
    endStopId: string,
    startStopIndex: number,
    endStopIndex: number,
    buildingId: string,
  ) => void;
  gpsPosition: GeolocationPosition | null;
  onRequestGps: () => void;
}) {
  const { locale, t } = useI18n();
  const [searchMode, setSearchMode] = useState<"places" | "routes">("places");
  const [from, setFrom] = useState<SearchStop | null>(null);
  const [to, setTo] = useState<SearchStop | null>(null);
  const [selecting, setSelecting] = useState<"from" | "to" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof ROUTES | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);
  const [hasDirectRoute, setHasDirectRoute] = useState<boolean | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [visibleBuildingCount, setVisibleBuildingCount] = useState(8);
  const [visibleStopCount, setVisibleStopCount] = useState(8);
  const [openTripDetailKey, setOpenTripDetailKey] = useState<string | null>(null);
  const currentTime = useCurrentMinute();
  const userPosition: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;
  const walkingDistances = useCampusWalkingDistances(userPosition);

  const closestSearchStopId = userPosition
    ? SEARCH_STOPS.reduce((closest, stop) => {
        if (!closest) return stop.id;
        const currentClosest = SEARCH_STOPS.find(
          (candidate) => candidate.id === closest,
        )!;
        return distanceByPath(
          walkingDistances,
          [stop.lat, stop.lng],
          getDistance(
            userPosition[0],
            userPosition[1],
            stop.lat,
            stop.lng,
          ),
        ) <
          distanceByPath(
            walkingDistances,
            [currentClosest.lat, currentClosest.lng],
            getDistance(
              userPosition[0],
              userPosition[1],
              currentClosest.lat,
              currentClosest.lng,
            ),
          )
          ? stop.id
          : closest;
      }, "")
    : null;
  const filtered = SEARCH_STOPS.filter((stop) => {
    const needle = query.trim().toLowerCase();
    return (
      stop.name.toLowerCase().includes(needle) ||
      stop.nameZh.toLowerCase().includes(needle)
    );
  });
  const physicalStops = getPhysicalStops();
  const placeSearch = placeQuery.trim().toLowerCase();
  const compactPlaceSearch = placeSearch.replace(/\s+/g, "");
  const filteredBuildings = CAMPUS_BUILDINGS.filter((building) =>
    building.name.toLowerCase().includes(placeSearch) ||
    building.nameZh.toLowerCase().includes(placeSearch) ||
    building.abbr.toLowerCase().includes(placeSearch) ||
    building.abbr.toLowerCase().replace(/\s+/g, "").includes(compactPlaceSearch),
  );
  const filteredPhysicalStops = physicalStops.filter((stop) =>
    stop.name.toLowerCase().includes(placeSearch) ||
    stop.nameZh.toLowerCase().includes(placeSearch),
  );
  const selectedBuilding = CAMPUS_BUILDINGS.find(
    (building) => building.id === selectedBuildingId,
  );
  const buildingStartCandidates = userPosition
    ? physicalStops
        .map((stop) => ({
          stop,
          distance: distanceByPath(
            walkingDistances,
            [stop.lat, stop.lng],
            getDistance(
              userPosition[0],
              userPosition[1],
              stop.lat,
              stop.lng,
            ),
          ),
        }))
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 3)
    : [];
  const buildingDestinationCandidates = selectedBuilding
    ? physicalStops
        .map((stop) => ({
          stop,
          distance: getDistance(
            selectedBuilding.lat,
            selectedBuilding.lng,
            stop.lat,
            stop.lng,
          ),
        }))
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 3)
    : [];
  const buildingNearestStop = buildingDestinationCandidates[0]?.stop ?? null;
  const buildingRoutesById = new Map<string, BuildingRouteOption>();
  if (selectedBuilding && userPosition) {
    for (const { stop: origin } of buildingStartCandidates) {
      for (const { stop: destination } of buildingDestinationCandidates) {
        const routes = getBuildingRouteOptions(
          origin,
          destination,
          userPosition,
          selectedBuilding,
          currentTime,
        );
        for (const option of routes) {
          const currentOption = buildingRoutesById.get(option.route.id);
          if (
            !currentOption ||
            option.arrivalMinutes < currentOption.arrivalMinutes ||
            (option.arrivalMinutes === currentOption.arrivalMinutes &&
              option.rideMinutes < currentOption.rideMinutes)
          ) {
            buildingRoutesById.set(option.route.id, option);
          }
        }
      }
    }
  }
  const buildingRoutes = [...buildingRoutesById.values()].sort(
    (first, second) => first.arrivalMinutes - second.arrivalMinutes,
  );
  const walkingQuery = userPosition && selectedBuilding
    ? `${userPosition[0].toFixed(5)},${userPosition[1].toFixed(5)}>${selectedBuilding.id}|${buildingRoutes
        .map((option) => `${option.startStop.id}:${option.endStop.id}`)
        .join(",")}`
    : "";
  const walkingPairs = useMemo(() => {
    if (!userPosition || !selectedBuilding) return [];
    const pairs: Array<{ key: string; from: Coordinate; to: Coordinate }> = [];
    const seen = new Set<string>();
    const add = (from: Coordinate, to: Coordinate) => {
      const key = `${from[0]},${from[1]}>${to[0]},${to[1]}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ key, from, to });
    };
    for (const option of buildingRoutes) {
      add(userPosition, [option.startStop.lat, option.startStop.lng]);
      add(
        [option.endStop.lat, option.endStop.lng],
        [selectedBuilding.lat, selectedBuilding.lng],
      );
    }
    return pairs;
  }, [walkingQuery]);
  const [walkingMeters, setWalkingMeters] = useState<Record<string, number>>({});
  useEffect(() => {
    if (walkingPairs.length === 0) return;
    let cancelled = false;
    void Promise.all(
      walkingPairs.map(async (pair) => {
        const meters = await loadWalkingDistance(pair.from, pair.to);
        return [pair.key, meters] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      setWalkingMeters((current) => {
        let changed = false;
        const next = { ...current };
        for (const [key, meters] of results) {
          if (meters === null) continue;
          const rounded = Math.round(meters);
          if (next[key] !== rounded) {
            next[key] = rounded;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [walkingPairs]);

  function handleSelect(stop: SearchStop) {
    if (selecting === "from") setFrom(stop);
    else setTo(stop);
    setSelecting(null);
    setQuery("");
    setResults(null);
    setExpandedRouteId(null);
    setSearchedAt(null);
    setHasDirectRoute(null);
  }

  function swap() {
    const previousFrom = from;
    setFrom(to);
    setTo(previousFrom);
    setResults(null);
    setExpandedRouteId(null);
    setSearchedAt(null);
    setHasDirectRoute(null);
  }

  function search() {
    if (!from || !to) return;
    recordUsage("search");
    const now = new Date();
    const directRoutes = ROUTES.filter((route) =>
      getSearchRouteTrip(route, from, to),
    );
    const found = directRoutes
      .filter((route) => isRouteOperatingNow(route, now))
      .sort(
        (first, second) =>
          getSearchRouteTrip(first, from, to)!.count -
          getSearchRouteTrip(second, from, to)!.count,
      );
    setResults(found);
    setExpandedRouteId(null);
    setSearchedAt(now);
    setHasDirectRoute(directRoutes.length > 0);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="px-4 pt-5 pb-4 bg-white border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h1
          className="text-xl font-extrabold mb-4"
          style={{ color: "var(--text)" }}
        >
          {searchMode === "places" ? t("placesTitle") : t("stopSearchTitle")}
        </h1>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1" role="tablist" aria-label={t("searchMode")}>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "places"}
            onClick={() => setSearchMode("places")}
            className="rounded-lg py-2 text-sm font-semibold"
            style={{
              color: searchMode === "places" ? "var(--purple)" : "var(--muted)",
              background: searchMode === "places" ? "white" : "transparent",
            }}
          >
            {t("places")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "routes"}
            onClick={() => setSearchMode("routes")}
            className="rounded-lg py-2 text-sm font-semibold"
            style={{
              color: searchMode === "routes" ? "var(--purple)" : "var(--muted)",
              background: searchMode === "routes" ? "white" : "transparent",
            }}
          >
            {t("busRoutes")}
          </button>
        </div>
        {searchMode === "routes" ? (
          <>
        <div className="relative">
          <button
            onClick={() => setSelecting("from")}
            className="w-full text-left px-4 py-3.5 rounded-2xl border mb-2 flex items-center gap-3"
            style={{
              borderColor:
                selecting === "from" ? "var(--purple)" : "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span
              className={from ? "text-sm font-medium" : "text-sm"}
              style={{ color: from ? "var(--text)" : "var(--muted)" }}
            >
              {from ? stopLabel(from, locale) : t("selectStart")}
            </span>
          </button>
          <button
            onClick={swap}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center z-10"
            style={{ color: "var(--purple)" }}
          >
            <Icon path={ICONS.swap} size={16} />
          </button>
          <button
            onClick={() => setSelecting("to")}
            className="w-full text-left px-4 py-3.5 rounded-2xl border flex items-center gap-3"
            style={{
              borderColor:
                selecting === "to" ? "var(--purple)" : "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span
              className={to ? "text-sm font-medium" : "text-sm"}
              style={{ color: to ? "var(--text)" : "var(--muted)" }}
            >
              {to ? stopLabel(to, locale) : t("selectDest")}
            </span>
          </button>
        </div>
        <button
          onClick={search}
          disabled={!from || !to}
          className="w-full mt-3 py-3 rounded-2xl text-sm font-bold text-white transition-opacity"
          style={{
            background: from && to ? "var(--purple)" : "var(--muted)",
            opacity: from && to ? 1 : 0.5,
          }}
        >
          {t("searchRoutes")}
        </button>
          </>
        ) : (
          <input
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder={t("searchPlaces")}
            className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
        )}
      </div>
      <div className="flex-1 scrollable">
        {searchMode === "places" && (
          <div className="bg-white">
            {selectedBuilding && (
              <section className="border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                      {t("selectedDestination")}
                    </div>
                    <div className="mt-1 text-base font-bold" style={{ color: "var(--text)" }}>
                      {buildingLabel(selectedBuilding, locale)}
                    </div>
                    {buildingNearestStop && (
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        {t("toStop", { stop: stopLabel(buildingNearestStop, locale) })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId(null)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--bg)", color: "var(--muted)" }}
                    aria-label={t("clearBuilding")}
                  >
                    <Icon path={ICONS.x} size={16} />
                  </button>
                </div>
                {!gpsPosition ? (
                  <button
                    type="button"
                    onClick={onRequestGps}
                    className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white"
                    style={{ background: "var(--purple)" }}
                  >
                    {t("enableLocationRoutes")}
                  </button>
                ) : buildingRoutes.length === 0 ? (
                  <div className="mt-3 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                    {t("noBuildingRoutes")}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                      {t("directRoutes")}
                    </div>
                    <div className="space-y-2">
                      {buildingRoutes.map((option) => {
                        const detailKey = `${option.route.id}-${option.startStopId}-${option.endStopId}`;
                        const detailsOpen = openTripDetailKey === detailKey;
                        const walkToStopMeters =
                          walkingMeters[`${userPosition?.[0]},${userPosition?.[1]}>${option.startStop.lat},${option.startStop.lng}`] ??
                          Math.round(option.walkToStartMeters);
                        const walkToBuildingMeters =
                          walkingMeters[`${option.endStop.lat},${option.endStop.lng}>${selectedBuilding.lat},${selectedBuilding.lng}`] ??
                          Math.round(option.walkToBuildingMeters);
                        const tripSteps = [
                          { label: t("walkToStopStep"), value: t("meterDistance", { meters: walkToStopMeters }) },
                          { label: t("rideStep"), value: t("minutes", { count: option.rideMinutes }) },
                          { label: t("walkToBuildingStep"), value: t("meterDistance", { meters: walkToBuildingMeters }) },
                        ];
                        return (
                          <div
                            key={detailKey}
                            className="overflow-hidden rounded-xl border"
                            style={{ borderColor: "var(--border)", background: "white" }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                recordUsage("search");
                                onTrackBuilding(
                                  option.route,
                                  option.startStopId,
                                  option.endStopId,
                                  option.startStopIndex,
                                  option.endStopIndex,
                                  selectedBuilding.id,
                                );
                              }}
                              className="flex w-full items-center gap-3 p-3 text-left"
                            >
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: option.route.color }}>
                                {option.route.label}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
                                  {stopLabel(option.startStop, locale)} → {stopLabel(option.endStop, locale)}
                                </span>
                              </span>
                              <span className="flex flex-shrink-0 flex-col items-end">
                                {option.arrivalMinutes !== 0 && (
                                  <span className="mb-1 text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
                                    {t("arrivingIn")}
                                  </span>
                                )}
                                <span className="text-xl font-extrabold leading-none" style={{ color: option.route.color }}>
                                  {option.arrivalMinutes === 0 ? t("now") : t("minutes", { count: option.arrivalMinutes })}
                                </span>
                              </span>
                              <Icon path={ICONS.chevronRight} size={18} className="flex-shrink-0 opacity-50" />
                            </button>
                            <button
                              type="button"
                              aria-expanded={detailsOpen}
                              onClick={() => setOpenTripDetailKey(detailsOpen ? null : detailKey)}
                              className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-xs font-semibold"
                              style={{ borderColor: "var(--border)", color: "var(--purple)", background: "var(--bg)" }}
                            >
                              <span>{t("tripDetails")}</span>
                              <Icon
                                path={ICONS.chevronDown}
                                size={16}
                                className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                            {detailsOpen && (
                              <ol className="border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
                                {tripSteps.map((step, index) => (
                                  <li key={step.label} className="flex gap-2.5">
                                    <span className="flex w-3 flex-col items-center">
                                      <span
                                        className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                                        style={{ background: option.route.color }}
                                      />
                                      {index < tripSteps.length - 1 && (
                                        <span className="my-0.5 w-px flex-1" style={{ background: "var(--border)", minHeight: 14 }} />
                                      )}
                                    </span>
                                    <span className={`flex min-w-0 flex-1 items-baseline justify-between gap-3 ${index < tripSteps.length - 1 ? "pb-2.5" : ""}`}>
                                      <span className="text-xs" style={{ color: "var(--muted)" }}>{step.label}</span>
                                      <span className="text-xs font-bold tabular-nums" style={{ color: "var(--text)" }}>{step.value}</span>
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {t("campusBuildings")}
              </div>
              {filteredBuildings.slice(0, visibleBuildingCount).map((building) => {
                const nearestStop = SEARCH_STOPS.reduce((nearest, stop) =>
                  getDistance(building.lat, building.lng, stop.lat, stop.lng) <
                  getDistance(building.lat, building.lng, nearest.lat, nearest.lng)
                    ? stop
                    : nearest,
                SEARCH_STOPS[0]);
                return (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setSelectedBuildingId(building.id)}
                    className="flex w-full items-center gap-4 border-b px-4 py-3.5 text-left"
                    style={{
                      borderColor: "var(--border)",
                      background: selectedBuildingId === building.id ? "var(--purple-pale)" : "white",
                    }}
                  >
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--purple-pale)", color: "var(--purple)" }}>
                      <Icon path={ICONS.building} size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {buildingLabel(building, locale)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--muted)" }}>
                        {t("teachingNear", { stop: stopLabel(nearestStop, locale) })}
                      </span>
                    </span>
                  </button>
                );
              })}
              {visibleBuildingCount < filteredBuildings.length && (
                <button
                  type="button"
                  onClick={() => setVisibleBuildingCount((count) => count + 10)}
                  className="w-full border-b px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--purple)" }}
                >
                  {t("showMoreBuildings")}
                </button>
              )}
            </section>

            <section>
              <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {t("busStops")}
              </div>
              {filteredPhysicalStops.slice(0, visibleStopCount).map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    const destination = SEARCH_STOPS.find((candidate) =>
                      sameStopLocation(candidate, stop),
                    );
                    setTo(destination ?? null);
                    setFrom(closestSearchStopId
                      ? SEARCH_STOPS.find((candidate) => candidate.id === closestSearchStopId) ?? null
                      : null);
                    setResults(null);
                    setSearchMode("routes");
                  }}
                  className="flex w-full items-center gap-4 border-b px-4 py-3.5 text-left"
                  style={{ borderColor: "var(--border)", background: "white" }}
                >
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--bg)", color: "var(--purple)" }}>
                    <Icon path={ICONS.locate} size={21} />
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {stopLabel(stop, locale)}
                  </span>
                </button>
              ))}
              {visibleStopCount < filteredPhysicalStops.length && (
                <button
                  type="button"
                  onClick={() => setVisibleStopCount((count) => count + 10)}
                  className="w-full px-4 py-3 text-sm font-semibold"
                  style={{ color: "var(--purple)" }}
                >
                  {t("showMoreStops")}
                </button>
              )}
            </section>
            <div className="h-4" />
          </div>
        )}
        {searchMode === "routes" && results !== null && (
          <div className="p-4 space-y-3">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--muted)" }}
            >
              {t(results.length === 1 ? "busesAvailable" : "busesAvailablePlural", { count: results.length })}
              {searchedAt && (
                <span className="normal-case tracking-normal font-medium">
                  {" "}
                  · {t("checkedAt", { time: searchedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) })}
                </span>
              )}
            </div>
            {results.length > 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t("estimateNote")}
              </p>
            )}
            {results.length === 0 ? (
              <div
                className="bg-white rounded-2xl p-6 text-center"
                style={{ color: "var(--muted)" }}
              >
                {hasDirectRoute
                  ? t("routeClosed")
                  : t("noDirect")}
              </div>
            ) : (
              results.map((route) => {
                const trip = getSearchRouteTrip(route, from!, to!)!;
                const stopsCount = trip.count;
                const tripMinutes = getRouteTripMinutes(
                  route,
                  trip.startIndex,
                  trip.endIndex,
                );
                const arrivalMinutes =
                  getRouteArrivalMinutes(route, trip.startIndex, currentTime)?.[0] ??
                  null;
                return (
                  <div
                    key={route.id}
                    onClick={() =>
                      setExpandedRouteId(
                        expandedRouteId === route.id ? null : route.id,
                      )
                    }
                    className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ background: route.color }}
                      >
                        {route.label}
                      </div>
                      <div className="flex-1">
                        <div
                          className="text-sm font-bold"
                          style={{ color: "var(--text)" }}
                        >
                          {routeHeading(route, locale)}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {t("rideSummary", {
                            stops: stopsCount === 1 ? t("oneStop") : t("manyStops", { count: stopsCount }),
                            minutes: tripMinutes,
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-lg font-extrabold"
                          style={{ color: route.color }}
                        >
                          {arrivalMinutes === null ? "--" : arrivalMinutes}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {arrivalMinutes === null ? t("noBus") : t("minAway")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 overflow-hidden">
                      {trip.stops.map((stopId, index, routeStops) => {
                        const stop = STOPS[stopId];
                        const isEnd =
                          index === 0 || index === routeStops.length - 1;
                        return (
                          <div
                            key={`${stopId}-${index}`}
                            className="flex items-center gap-1 min-w-0"
                          >
                            <div
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{
                                background: isEnd ? route.color : "#DDD",
                              }}
                            />
                            {isEnd && (
                              <span
                                className="text-xs font-medium truncate max-w-20"
                                style={{ color: "var(--text)" }}
                              >
                                {stop ? stopLabel(stop, locale) : ""}
                              </span>
                            )}
                            {index < routeStops.length - 1 && (
                              <div
                                className="flex-1 h-px min-w-4"
                                style={{ background: "#DDD" }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onTrackRoute(route, from!, to!);
                        }}
                        className="flex w-full min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-left"
                        style={{
                          color: route.color,
                          background: `${route.color}18`,
                        }}
                      >
                        <Icon path={ICONS.navigation} size={16} />
                        <span className="flex-1">{t("trackThisRoute")}</span>
                        <Icon path={ICONS.chevronRight} size={16} />
                      </button>
                    </div>
                    {expandedRouteId === route.id && (
                      <div
                        className="mt-3 pt-3 border-t"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div
                          className="text-xs font-semibold uppercase tracking-widest mb-2"
                          style={{ color: "var(--muted)" }}
                        >
                          {t("yourJourney")}
                        </div>
                        <div className="space-y-1">
                          {route.stopIds.map((stopId, index) => {
                            const stop = STOPS[stopId];
                            const highlighted =
                              index >= trip.startIndex &&
                              index <= trip.endIndex;
                            return (
                              <div
                                key={`${stopId}-${index}`}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                                style={{
                                  background: highlighted
                                    ? `${route.color}18`
                                    : "transparent",
                                  color: highlighted
                                    ? route.color
                                    : "var(--muted)",
                                }}
                              >
                                <span className="w-4 text-right">
                                  {index + 1}
                                </span>
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    background: highlighted
                                      ? route.color
                                      : "#D7D7E2",
                                  }}
                                />
                                <span
                                  className={highlighted ? "font-semibold" : ""}
                                >
                                  {stopLabel(stop, locale)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {searchMode === "routes" && results === null && (
          <div className="p-8 text-center" style={{ color: "var(--muted)" }}>
            <Icon
              path={ICONS.map}
              size={40}
              className="mx-auto mb-3 opacity-30"
            />
            <p className="text-sm">
              {t("searchEmpty")}
            </p>
          </div>
        )}
      </div>
      {selecting && (
        <div
          className="absolute inset-0 z-50 flex flex-col"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="px-4 pt-4 pb-3 bg-white border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => {
                  setSelecting(null);
                  setQuery("");
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg)" }}
              >
                <Icon path={ICONS.x} size={18} />
              </button>
              <span
                className="text-base font-bold"
                style={{ color: "var(--text)" }}
              >
                {selecting === "from" ? t("selectStartingStop") : t("selectDestinationStop")}
              </span>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchStops")}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>
          <div className="flex-1 scrollable bg-white">
            {filtered.map((stop) => (
              <button
                key={stop.id}
                onClick={() => handleSelect(stop)}
                className="w-full px-4 py-3.5 border-b text-left flex items-center gap-3 active:bg-gray-50"
                style={{ borderColor: "var(--border)" }}
              >
                <Icon
                  path={ICONS.locate}
                  size={16}
                  className="flex-shrink-0"
                  style={{ color: "var(--purple)" }}
                />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: "var(--text)" }}>
                    {stopLabel(stop, locale)}
                  </span>
                  {closestSearchStopId === stop.id && (
                    <div
                      className="text-[10px] font-semibold mt-0.5"
                      style={{ color: "#16A34A" }}
                    >
                      {t("closestYou")}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
