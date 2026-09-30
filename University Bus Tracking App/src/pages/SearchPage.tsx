import { useState } from "react";
import { Icon, ICONS } from "../components/Icon";
import { ROUTES, STOPS } from "../data/routes";
import {
  getArrivals,
  getCanonicalStopName,
  getDistance,
  getSearchRouteTrip,
  isRouteOperatingNow,
  SEARCH_STOPS,
} from "../lib/transit";
import type { JourneyNotification, Route, SearchStop } from "../types/transit";

export function SearchPage({
  onNotify,
  onTrackRoute,
  gpsPosition,
  onRequestGps,
}: {
  onNotify: (
    journey: JourneyNotification,
  ) => Promise<NotificationPermission | "unsupported">;
  onTrackRoute: (route: Route, from: SearchStop, to: SearchStop) => void;
  gpsPosition: GeolocationPosition | null;
  onRequestGps: () => void;
}) {
  const [from, setFrom] = useState<SearchStop | null>(null);
  const [to, setTo] = useState<SearchStop | null>(null);
  const [selecting, setSelecting] = useState<"from" | "to" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof ROUTES | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);
  const [hasDirectRoute, setHasDirectRoute] = useState<boolean | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<{
    routeId: string;
    message: string;
  } | null>(null);
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
          Stop-To-Stop Search
        </h1>
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
      </div>
      <div className="flex-1 scrollable">
        {results !== null && (
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
                const averageTime = stopsCount * 4 + 2;
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
                          {route.description}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {stopsCount} stop{stopsCount !== 1 ? "s" : ""} · ~
                          {averageTime} min ride
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
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onTrackRoute(route, from!, to!);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold text-left"
                        style={{
                          color: route.color,
                          background: `${route.color}18`,
                        }}
                      >
                        Track route · {route.label} · {from!.name} → {to!.name}
                      </button>
                      <button
                        onClick={async (event) => {
                          event.stopPropagation();
                          setNotificationFeedback({
                            routeId: route.id,
                            message: "Setting reminder...",
                          });
                          const permission = await onNotify({
                            route,
                            origin: STOPS[from!.searchIds[0]],
                            arrivalMinutes,
                          });
                          const message =
                            permission === "granted"
                              ? `Reminder set for about ${arrivalMinutes} min from now.`
                              : permission === "unsupported"
                                ? `In-app reminder set for about ${arrivalMinutes} min. ${window.isSecureContext ? "Browser notifications are unavailable here." : "Browser notifications require a secure HTTPS connection."}`
                                : permission === "denied"
                                  ? `In-app reminder set for about ${arrivalMinutes} min. Allow notifications for this site in browser settings to receive browser alerts.`
                                  : `In-app reminder set for about ${arrivalMinutes} min. Browser permission is still pending.`;
                          setNotificationFeedback({
                            routeId: route.id,
                            message,
                          });
                        }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          color: route.color,
                          background: `${route.color}18`,
                        }}
                      >
                        Notify me
                      </button>
                    </div>
                    {notificationFeedback?.routeId === route.id && (
                      <div
                        className="mt-2 text-xs leading-5"
                        style={{ color: "var(--muted)" }}
                        role="status"
                      >
                        {notificationFeedback.message}
                      </div>
                    )}
                    {expandedRouteId === route.id && (
                      <div
                        className="mt-3 pt-3 border-t"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div
                          className="text-xs font-semibold uppercase tracking-widest mb-2"
                          style={{ color: "var(--muted)" }}
                        >
                          Complete Route · highlighted section is your journey
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
        {results === null && (
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
