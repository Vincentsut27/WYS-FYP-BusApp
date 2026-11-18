import { useEffect, useState } from "react";
import { getPhysicalStops } from "../lib/transit";
import {
  loadWalkingDistances,
  type Coordinate,
} from "../lib/routeGeometry";

const CAMPUS_STOP_POINTS: Coordinate[] = getPhysicalStops().map((stop) => [
  stop.lat,
  stop.lng,
]);

export interface WalkingDistanceLookup {
  ready: boolean;
  metersByPoint: Record<string, number>;
}

const EMPTY_LOOKUP: WalkingDistanceLookup = {
  ready: false,
  metersByPoint: {},
};

export function useCampusWalkingDistances(origin: Coordinate | null) {
  const query = origin
    ? `${origin[0].toFixed(4)},${origin[1].toFixed(4)}`
    : "";
  const [lookup, setLookup] = useState<{
    query: string;
    metersByPoint: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (!query) return;
    const [latitude, longitude] = query.split(",").map(Number);
    const snappedOrigin: Coordinate = [latitude, longitude];
    let cancelled = false;
    void loadWalkingDistances(snappedOrigin, CAMPUS_STOP_POINTS).then((table) => {
      if (cancelled) return;
      setLookup({
        query,
        metersByPoint: table?.byPoint ?? {},
      });
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!lookup || lookup.query !== query || Object.keys(lookup.metersByPoint).length === 0) {
    return EMPTY_LOOKUP;
  }
  return { ready: true, metersByPoint: lookup.metersByPoint };
}

export function distanceByPath(
  lookup: WalkingDistanceLookup,
  point: Coordinate,
  straightMeters: number,
) {
  if (!lookup.ready) return straightMeters;
  return lookup.metersByPoint[`${point[0]},${point[1]}`] ?? Number.POSITIVE_INFINITY;
}
