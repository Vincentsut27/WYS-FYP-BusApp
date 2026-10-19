import { useState } from "react";
import { Icon, ICONS } from "../components/Icon";
import { CAMPUS_BUILDINGS } from "../data/buildings";
import { ROUTES, STOPS } from "../data/routes";
import { useCurrentMinute } from "../hooks/useCurrentMinute";
import {
  getArrivals,
  getCanonicalStopName,
  getDistance,
  getRouteArrivalMinutes,
  getSearchRouteTrip,
  getRouteTripMinutes,
  getPhysicalStops,
  isRouteOperatingNow,
  SEARCH_STOPS,
  sameStopLocation,
} from "../lib/transit";
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
  const currentTime = useCurrentMinute();
  const userPosition: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;

  const closestSearchStopId = userPosition
    ? SEARCH_STOPS.reduce((closest, stop) => {
        if (!closest) return stop.id;
        const currentClosest = SEARCH_STOPS.find(
          (candidate) => candidate.id === closest,
        )!;
        return getDistance(
          userPosition[0],
          userPosition[1],
          stop.lat,
          stop.lng,
        ) <
          getDistance(
            userPosition[0],
            userPosition[1],
            currentClosest.lat,
            currentClosest.lng,
          )
          ? stop.id
          : closest;
      }, "")
    : null;
  const filtered = SEARCH_STOPS.filter((stop) =>
    stop.name.toLowerCase().includes(query.toLowerCase()),
  );
  const physicalStops = getPhysicalStops();
  const filteredBuildings = CAMPUS_BUILDINGS.filter((building) =>
    building.name.toLowerCase().includes(placeQuery.toLowerCase()),
  );
  const filteredPhysicalStops = physicalStops.filter((stop) =>
    stop.name.toLowerCase().includes(placeQuery.toLowerCase()),
  );
  const selectedBuilding = CAMPUS_BUILDINGS.find(
    (building) => building.id === selectedBuildingId,
  );
  const buildingStartCandidates = userPosition
    ? physicalStops
        .map((stop) => ({
          stop,
          distance: getDistance(
            userPosition[0],
            userPosition[1],
            stop.lat,
            stop.lng,
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
    if (!from || !to) {
      if (!gpsPosition) onRequestGps();
      return;
    }
    if (!gpsPosition) {
      onRequestGps();
      return;
    }
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
          {searchMode === "places" ? "Where are you going?" : "Stop-To-Stop Search"}
        </h1>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Search mode">
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
            Places
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
            Bus routes
          </button>
        </div>
        {searchMode === "routes" ? (
          <>
        <div className="relative">
          <button
            onClick={() => {
              if (!gpsPosition) onRequestGps();
              setSelecting("from");
            }}
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
              {from ? from.name : "Select starting stop"}
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
            onClick={() => {
              if (!gpsPosition) onRequestGps();
              setSelecting("to");
            }}
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
              {to ? to.name : "Select destination stop"}
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
          Search Routes
        </button>
          </>
        ) : (
          <input
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Search buildings or stops..."
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
                      Selected destination
                    </div>
                    <div className="mt-1 text-base font-bold" style={{ color: "var(--text)" }}>
                      {selectedBuilding.name}
                    </div>
                    {buildingNearestStop && (
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        To: {getCanonicalStopName(buildingNearestStop.name)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId(null)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--bg)", color: "var(--muted)" }}
                    aria-label="Clear selected building"
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
                    Enable location to find bus routes
                  </button>
                ) : buildingRoutes.length === 0 ? (
                  <div className="mt-3 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                    No bus service connects your three nearest stops to this building right now.
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                      Direct bus routes
                    </div>
                    <div className="space-y-2">
                      {buildingRoutes.map((option) => (
                        <button
                          key={`${option.route.id}-${option.startStopId}-${option.endStopId}`}
                          type="button"
                          onClick={() => onTrackBuilding(
                            option.route,
                            option.startStopId,
                            option.endStopId,
                            option.startStopIndex,
                            option.endStopIndex,
                            selectedBuilding.id,
                          )}
                          className="flex w-full items-center gap-3 rounded-xl border p-3 text-left"
                          style={{ borderColor: "var(--border)", background: "white" }}
                        >
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: option.route.color }}>
                            {option.route.label}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
                              {getCanonicalStopName(option.startStop.name)} → {getCanonicalStopName(option.endStop.name)}
                            </span>
                            <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                              {option.rideMinutes} min bus · {Math.round(option.walkToStartMeters)} m to stop · {Math.round(option.walkToBuildingMeters)} m to building
                            </span>
                          </span>
                          <span className="flex flex-shrink-0 flex-col items-end">
                            <span className="text-xl font-extrabold leading-none" style={{ color: option.route.color }}>
                              {option.arrivalMinutes === 0 ? "Now" : `${option.arrivalMinutes} min`}
                            </span>
                            <span className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
                              bus arrival
                            </span>
                          </span>
                          <Icon path={ICONS.chevronRight} size={18} className="flex-shrink-0 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Campus buildings
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
                        {building.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--muted)" }}>
                        Teaching · near {getCanonicalStopName(nearestStop.name)}
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
                  Show 10 more buildings
                </button>
              )}
            </section>

            <section>
              <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Bus stops
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
                    {stop.name}
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
                  Show 10 more stops
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
              {results.length} bus{results.length !== 1 ? "es" : ""} available
              now
              {searchedAt && (
                <span className="normal-case tracking-normal font-medium">
                  {" "}
                  · checked{" "}
                  {searchedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            {results.length > 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Arrival and ride-time figures are illustrative estimates, not
                live or official schedule times.
              </p>
            )}
            {results.length === 0 ? (
              <div
                className="bg-white rounded-2xl p-6 text-center"
                style={{ color: "var(--muted)" }}
              >
                {hasDirectRoute
                  ? "A direct bus route exists, but none is operating at this time. Check the service hours or search again later."
                  : "No direct one-way bus route connects these stops."}
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
                const arrivalMinutes = getArrivals(from!.id + route.id)[0];
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
                          {route.title ?? route.description}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {stopsCount} stop{stopsCount !== 1 ? "s" : ""} · ~
                          {tripMinutes} min ride
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-lg font-extrabold"
                          style={{ color: route.color }}
                        >
                          {arrivalMinutes}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          min away
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
                                {stop?.shortName}
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
                        <span className="flex-1">Track this route</span>
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
                          Your journey
                        </div>
                        <div className="space-y-1">
                          {route.stopIds.map((stopId, index) => {
                            const stop = STOPS[stopId];
                            const highlighted = trip.stops.includes(stopId);
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
                                  {getCanonicalStopName(stop.name)}
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
              Select your start and destination stops to find available routes
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
                Select {selecting === "from" ? "Starting" : "Destination"} Stop
              </span>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stops..."
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
                    {stop.name}
                  </span>
                  {closestSearchStopId === stop.id && (
                    <div
                      className="text-[10px] font-semibold mt-0.5"
                      style={{ color: "#16A34A" }}
                    >
                      Closest to your current location
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
