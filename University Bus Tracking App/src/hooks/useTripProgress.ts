import { useEffect, useRef, useState } from "react";
import type { RouteGeometry } from "../lib/routeGeometry";
import { matchPositionToRoute } from "../lib/routeMatcher";

interface TripProgress {
  progressMeters: number | null;
  currentStopIndex: number | null;
  confident: boolean;
}

const EMPTY_PROGRESS: TripProgress = {
  progressMeters: null,
  currentStopIndex: null,
  confident: false,
};

export function useTripProgress(
  geometry: RouteGeometry | null,
  position: GeolocationPosition | null,
  enabled: boolean,
  startStopIndex: number | null,
) {
  const [tripProgress, setTripProgress] = useState(EMPTY_PROGRESS);
  const sessionRef = useRef<string | null>(null);
  const progressRef = useRef<number | null>(null);
  const stopIndexRef = useRef<number | null>(null);
  const lastAcceptedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !geometry || startStopIndex === null) {
      sessionRef.current = null;
      progressRef.current = null;
      stopIndexRef.current = null;
      lastAcceptedTimestampRef.current = null;
      setTripProgress(EMPTY_PROGRESS);
      return;
    }

    const sessionKey = `${geometry.routeId}:${startStopIndex}`;
    if (sessionRef.current !== sessionKey) {
      const initialProgress =
        geometry.segments[startStopIndex]?.startDistanceMeters ??
        geometry.totalDistanceMeters;
      sessionRef.current = sessionKey;
      progressRef.current = initialProgress;
      stopIndexRef.current = startStopIndex;
      lastAcceptedTimestampRef.current = null;
      setTripProgress({
        progressMeters: initialProgress,
        currentStopIndex: startStopIndex,
        confident: false,
      });
    }
    if (!position) return;
    if (
      lastAcceptedTimestampRef.current !== null &&
      position.timestamp <= lastAcceptedTimestampRef.current
    ) {
      return;
    }

    const previousProgress = progressRef.current ?? 0;
    const previousTimestamp = lastAcceptedTimestampRef.current;
    const elapsedSeconds = previousTimestamp
      ? Math.max(1, (position.timestamp - previousTimestamp) / 1000)
      : 0;
    const accuracyMeters = position.coords.accuracy;
    const maximumProgress =
      previousProgress +
      (previousTimestamp
        ? Math.max(60, elapsedSeconds * 20 + accuracyMeters * 2)
        : 300);
    const match = matchPositionToRoute(
      geometry.segments,
      [position.coords.latitude, position.coords.longitude],
      previousProgress,
      maximumProgress,
      accuracyMeters,
    );
    if (!match) {
      setTripProgress((current) => ({ ...current, confident: false }));
      return;
    }

    const nextProgress = Math.max(previousProgress, match.progressMeters);
    progressRef.current = nextProgress;
    lastAcceptedTimestampRef.current = position.timestamp;
    const boundaryMarginMeters = Math.max(
      10,
      Math.min(accuracyMeters * 0.5, 25),
    );
    let nextStopIndex = stopIndexRef.current ?? startStopIndex;
    while (
      nextStopIndex < geometry.segments.length &&
      nextProgress >=
        geometry.segments[nextStopIndex].endDistanceMeters +
          boundaryMarginMeters
    ) {
      nextStopIndex += 1;
    }
    stopIndexRef.current = nextStopIndex;
    setTripProgress({
      progressMeters: nextProgress,
      currentStopIndex: nextStopIndex,
      confident: true,
    });
  }, [enabled, geometry, position, startStopIndex]);

  return tripProgress;
}
