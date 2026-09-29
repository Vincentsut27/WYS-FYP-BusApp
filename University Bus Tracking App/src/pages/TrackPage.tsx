import { useEffect, useMemo, useRef, useState } from "react";
import { CampusMap } from "../components/CampusMap";
import { Icon, ICONS } from "../components/Icon";
import { ROUTES, STOPS } from "../data/routes";
import {
  getCanonicalStopName,
  getDistance,
  playArrivalTone,
} from "../lib/transit";
import type { Route, Stop } from "../types/transit";

export function TrackPage({
  gpsPosition,
  gpsError,
  userHeading,
}: {
  gpsPosition: GeolocationPosition | null;
  gpsError: string | null;
  userHeading?: number | null;
}) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [destStop, setDestStop] = useState<Stop | null>(null);
  const [startStop, setStartStop] = useState<Stop | null>(null);
  const [startStopManuallySet, setStartStopManuallySet] = useState(false);
  const [nearestStop, setNearestStop] = useState<Stop | null>(null);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [stopsAway, setStopsAway] = useState<number | null>(null);
  const [stopAlert, setStopAlert] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [tripStopIndex, setTripStopIndex] = useState<number | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  const arrivalAlertStop = useRef<string | null>(null);
  const approachingAlertStop = useRef<string | null>(null);
  const routeStops = selectedRoute
    ? selectedRoute.stopIds.map((id) => STOPS[id]).filter(Boolean)
    : [];
  const userPosition: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;
  const trackingPosition = userPosition;

  useEffect(() => {
    if (!trackingPosition || routeStops.length === 0) {
      setNearestStop(null);
      return;
    }
    let nearest = routeStops[0];
    let minimumDistance = Infinity;
    routeStops.forEach((stop) => {
      const distance = getDistance(
        trackingPosition[0],
        trackingPosition[1],
        stop.lat,
        stop.lng,
      );
      if (distance < minimumDistance) {
        minimumDistance = distance;
        nearest = stop;
      }
    });
    setNearestStop(nearest);
    if (!startStopManuallySet && !tripStarted) setStartStop(nearest);
    if (destStop) {
      const nearestIndex =
        tripStarted && tripStopIndex !== null
          ? tripStopIndex
          : routeStops.findIndex(
              (stop) => stop.id === (startStop?.id ?? nearest.id),
            );
      const destinationIndex = routeStops.findIndex(
        (stop) => stop.id === destStop.id,
      );
      setStopsAway(
        destinationIndex > nearestIndex
          ? destinationIndex - nearestIndex
          : null,
      );
    }
  }, [
    trackingPosition,
    routeStops,
    destStop,
    startStop,
    startStopManuallySet,
    tripStarted,
    tripStopIndex,
  ]);

  useEffect(() => {
    if (!tripStarted || !userPosition || tripStopIndex === null) return;
    let reachedIndex = -1;
    let closestDistance = 50;
    for (let index = tripStopIndex + 1; index < routeStops.length; index++) {
      const stop = routeStops[index];
      const distance = getDistance(
        userPosition[0],
        userPosition[1],
        stop.lat,
        stop.lng,
      );
      if (distance <= closestDistance) {
        closestDistance = distance;
        reachedIndex = index;
      }
    }
    if (reachedIndex > tripStopIndex) setTripStopIndex(reachedIndex);
  }, [tripStarted, userPosition, tripStopIndex, routeStops]);

  useEffect(() => {
    if (trackingPosition || !startStop || !destStop || routeStops.length === 0)
      return;
    const startIndex = routeStops.findIndex((stop) => stop.id === startStop.id);
    const destinationIndex = routeStops.findIndex(
      (stop) => stop.id === destStop.id,
    );
    setStopsAway(
      destinationIndex > startIndex ? destinationIndex - startIndex : null,
    );
  }, [trackingPosition, startStop, destStop, routeStops]);

  const highlightPath = useMemo<[number, number][]>(() => {
    const currentStop =
      tripStarted && tripStopIndex !== null
        ? routeStops[tripStopIndex]
        : startStop;
    if (!routeStops.length || !currentStop) return [];
    const startIndex = routeStops.findIndex(
      (stop) => stop.id === currentStop.id,
    );
    const destinationIndex = destStop
      ? routeStops.findIndex((stop) => stop.id === destStop.id)
      : tripStarted
        ? routeStops.length - 1
        : -1;
    if (startIndex < 0 || destinationIndex <= startIndex) return [];
    return routeStops
      .slice(startIndex, destinationIndex + 1)
      .map((stop) => [stop.lat, stop.lng]);
  }, [routeStops, startStop, destStop, tripStarted, tripStopIndex]);

  const activeStop =
    tripStarted && tripStopIndex !== null
      ? routeStops[tripStopIndex]
      : startStop;
  const nextStop =
    tripStarted && tripStopIndex !== null
      ? routeStops[tripStopIndex + 1]
      : null;

  const guidancePoints = useMemo<[number, number][] | null>(() => {
    if (!userPosition || !startStop) return null;
    const distance = getDistance(
      userPosition[0],
      userPosition[1],
      startStop.lat,
      startStop.lng,
    );
    if (distance < 25) return null;
    const stepCount = 12;
    return Array.from({ length: stepCount + 1 }, (_, index) => {
      const ratio = index / stepCount;
      return [
        userPosition[0] + (startStop.lat - userPosition[0]) * ratio,
        userPosition[1] + (startStop.lng - userPosition[1]) * ratio,
      ] as [number, number];
    });
  }, [userPosition, startStop]);

  useEffect(() => {
    if (!tripStarted || !userPosition || !destStop) return;
    const distance = getDistance(
      userPosition[0],
      userPosition[1],
      destStop.lat,
      destStop.lng,
    );
    if (distance <= 50 && arrivalAlertStop.current !== destStop.id) {
      arrivalAlertStop.current = destStop.id;
      setStopAlert({
        title: "You are about to arrive",
        body: `${destStop.name} is nearby. Get ready to alight.`,
      });
      playArrivalTone();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("You are nearly there", {
          body: `${destStop.name} is about ${distance}m away.`,
        });
      }
    }
  }, [tripStarted, userPosition, destStop]);

  useEffect(() => {
    if (!tripStarted || !destStop || stopsAway !== 1) return;
    if (approachingAlertStop.current === destStop.id) return;
    approachingAlertStop.current = destStop.id;
    setStopAlert({
      title: "Approaching your stop!",
      body: `${destStop.name} is the next stop. Get ready!`,
    });
    playArrivalTone();
  }, [tripStarted, destStop, stopsAway]);

  useEffect(() => {
    arrivalAlertStop.current = null;
    approachingAlertStop.current = null;
    setStopAlert(null);
  }, [destStop?.id]);

  useEffect(() => setMapRotation(0), [selectedRoute?.id]);

  useEffect(() => {
    if (tripStarted) return;
    approachingAlertStop.current = null;
    arrivalAlertStop.current = null;
    setStopAlert(null);
  }, [tripStarted]);

  if (showRoutePicker) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowRoutePicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            Select Route to Track
          </span>
        </div>
        <div className="flex-1 scrollable">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => {
                setSelectedRoute(route);
                setStartStop(null);
                setStartStopManuallySet(false);
                setDestStop(null);
                setTripStarted(false);
                setTripStopIndex(null);
                setShowRoutePicker(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: route.color }}
              >
                {route.label}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {route.description}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {route.stopIds.length} stops · {route.serviceHours}
                </div>
              </div>
              {selectedRoute?.id === route.id && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--purple)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M2 5l2.5 2.5L8 2.5"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const startIndex = startStop
    ? routeStops.findIndex((stop) => stop.id === startStop.id)
    : -1;
  const destinationOptions =
    startIndex >= 0 ? routeStops.slice(startIndex + 1) : [];

  if (showDestPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowDestPicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            Select Your Stop
          </span>
        </div>
        <div className="flex-1 scrollable">
          <button
            onClick={() => {
              setDestStop(null);
              setShowDestPicker(false);
            }}
            className="w-full px-4 py-4 border-b text-left text-sm active:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            No destination (just track position)
          </button>
          {destinationOptions.map((stop, index) => (
            <button
              key={stop.id}
              onClick={() => {
                setDestStop(stop);
                setShowDestPicker(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{
                borderColor: "var(--border)",
                background:
                  destStop?.id === stop.id ? "var(--purple-pale)" : "white",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background:
                    destStop?.id === stop.id ? "var(--purple)" : "var(--bg)",
                  color: destStop?.id === stop.id ? "white" : "var(--muted)",
                }}
              >
                {index + 1}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                {stop.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showStartPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowStartPicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            Select Starting Stop
          </span>
        </div>
        <div className="flex-1 scrollable">
          {routeStops.map((stop, index) => (
            <button
              key={`${stop.id}-${index}`}
              onClick={() => {
                setStartStop(stop);
                setStartStopManuallySet(true);
                setDestStop(null);
                setShowStartPicker(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{
                borderColor: "var(--border)",
                background:
                  startStop?.id === stop.id ? "var(--purple-pale)" : "white",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background:
                    startStop?.id === stop.id ? "var(--purple)" : "var(--bg)",
                  color: startStop?.id === stop.id ? "white" : "var(--muted)",
                }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {getCanonicalStopName(stop.name)}
                </span>
                {nearestStop?.id === stop.id && (
                  <div
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: "#16A34A" }}
                  >
                    Closest to current location
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="px-4 pt-5 pb-3 bg-white border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1
            className="text-xl font-extrabold"
            style={{ color: "var(--text)" }}
          >
            Live Tracker
          </h1>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: trackingPosition ? "#DCFCE7" : "var(--purple-pale)",
              color: trackingPosition ? "#16A34A" : "var(--purple)",
            }}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${trackingPosition ? "bg-green-500" : "bg-purple-400"}`}
            />
            {trackingPosition ? "Tracking" : "Not tracking"}
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Select a route and track your position — get alerted before your stop.
        </p>
      </div>

      <div className="flex-1 scrollable">
        <div className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-sm bg-white">
          {selectedRoute ? (
            <div className="relative">
              <CampusMap
                routeId={selectedRoute.id}
                userPos={userPosition}
                highlightPath={highlightPath}
                guidancePoints={
                  tripStarted ? undefined : (guidancePoints ?? undefined)
                }
                dimRoute={tripStarted}
                highlightStopId={activeStop?.id}
                focusStopId={activeStop?.id ?? destStop?.id ?? undefined}
                height={tripStarted ? 520 : 240}
                rotation={mapRotation}
                userHeading={userHeading ?? 0}
                enableTouchRotate
                onRotationChange={setMapRotation}
              />
              <div className="absolute right-2 top-2 z-[500] flex gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMapRotation((value) => value - 15);
                  }}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold"
                  style={{ color: "var(--purple)" }}
                  aria-label="Rotate left"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMapRotation((value) => value + 15);
                  }}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold"
                  style={{ color: "var(--purple)" }}
                  aria-label="Rotate right"
                >
                  ↻
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-[240px]"
              style={{ background: "#E8EDF2" }}
            >
              <Icon path={ICONS.map} size={40} className="opacity-20 mb-2" />
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                Select a route to view map
              </span>
            </div>
          )}
        </div>

        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowRoutePicker(true)}
            className="w-full flex items-center gap-4 px-4 py-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{
                background: selectedRoute
                  ? selectedRoute.color
                  : "var(--muted)",
              }}
            >
              {selectedRoute ? (
                selectedRoute.label
              ) : (
                <Icon path={ICONS.bus} size={18} />
              )}
            </div>
            <div className="flex-1 text-left">
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                {selectedRoute
                  ? `Route ${selectedRoute.label} – ${selectedRoute.description}`
                  : "Select a route"}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {selectedRoute
                  ? `${routeStops.length} stops`
                  : "Tap to choose which bus you're on"}
              </div>
            </div>
            <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
          </button>
          {selectedRoute && (
            <>
              <div
                className="h-px mx-4"
                style={{ background: "var(--border)" }}
              />
              <button
                onClick={() => setShowStartPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--purple-pale)" }}
                >
                  <Icon
                    path={ICONS.locate}
                    size={18}
                    style={{ color: "var(--purple)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {startStop
                      ? getCanonicalStopName(startStop.name)
                      : "Finding your starting stop..."}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {startStopManuallySet
                      ? "Tap to change starting stop"
                      : "Based on your current location"}
                  </div>
                </div>
                <Icon
                  path={ICONS.chevronRight}
                  size={18}
                  className="opacity-30"
                />
              </button>
              <div
                className="h-px mx-4"
                style={{ background: "var(--border)" }}
              />
              <button
                onClick={() => setShowDestPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: destStop ? "#FEF3C7" : "var(--bg)" }}
                >
                  <Icon
                    path={ICONS.locate}
                    size={18}
                    style={{ color: destStop ? "#D97706" : "var(--muted)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {destStop ? destStop.name : "Set destination stop"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {destStop
                      ? "You'll be alerted when approaching"
                      : "Optional: get alerted before your stop"}
                  </div>
                </div>
                <Icon
                  path={ICONS.chevronRight}
                  size={18}
                  className="opacity-30"
                />
              </button>
            </>
          )}
        </div>

        {selectedRoute && (
          <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm p-4">
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--muted)" }}
            >
              Current Status
            </div>
            <div className="flex gap-3 mb-3">
              <div
                className="flex-1 rounded-xl p-3"
                style={{ background: "var(--purple-pale)" }}
              >
                <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
                  Current Stop
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: "var(--purple)" }}
                >
                  {activeStop
                    ? getCanonicalStopName(activeStop.shortName)
                    : "—"}
                </div>
              </div>
              {destStop && (
                <div
                  className="flex-1 rounded-xl p-3"
                  style={{ background: "#FEF3C7" }}
                >
                  <div className="text-xs mb-1" style={{ color: "#92400E" }}>
                    Stops to Dest.
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#D97706" }}
                  >
                    {stopsAway !== null ? stopsAway : "—"}
                  </div>
                </div>
              )}
            </div>
            {tripStarted && (
              <div className="rounded-xl p-3" style={{ background: "#EFF6FF" }}>
                <div className="text-xs mb-1" style={{ color: "#1D4ED8" }}>
                  Next Stop
                </div>
                <div className="text-sm font-bold" style={{ color: "#1D4ED8" }}>
                  {nextStop
                    ? getCanonicalStopName(nextStop.shortName)
                    : "End of route"}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mx-3 mt-3">
          {selectedRoute && (
            <button
              onClick={() => {
                if (tripStarted) {
                  setTripStarted(false);
                  setTripStopIndex(null);
                } else {
                  setTripStopIndex(startIndex >= 0 ? startIndex : 0);
                  setTripStarted(true);
                }
              }}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
              style={{ background: tripStarted ? "#DC2626" : "var(--navy)" }}
            >
              <Icon path={tripStarted ? ICONS.stop : ICONS.play} size={16} />
              {tripStarted ? "End Trip" : "Start Trip"}
            </button>
          )}
        </div>
        {gpsError && (
          <div
            className="mx-3 mt-2 px-4 py-2 rounded-xl text-xs text-center"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            {gpsError}
          </div>
        )}
        <div className="h-8" />
      </div>

      {stopAlert && (
        <div
          className="absolute inset-0 z-[2000] flex items-center justify-center p-5"
          style={{ background: "rgba(15,23,42,0.45)" }}
        >
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "#FEF3C7" }}
            >
              <Icon path={ICONS.alert} size={24} style={{ color: "#D97706" }} />
            </div>
            <div
              className="text-center text-lg font-bold"
              style={{ color: "var(--text)" }}
            >
              {stopAlert.title}
            </div>
            <div
              className="mt-2 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              {stopAlert.body}
            </div>
            <button
              onClick={() => setStopAlert(null)}
              className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--purple)" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
