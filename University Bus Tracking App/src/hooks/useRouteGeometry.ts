import { useEffect, useState } from "react";
import {
  loadRouteGeometry,
  type Coordinate,
  type RouteGeometry,
} from "../lib/routeGeometry";

interface LoadedGeometry {
  routeId: string;
  pointsKey: string;
  geometry: RouteGeometry;
}

export function useRouteGeometry(
  routeId: string | undefined,
  points: Coordinate[],
) {
  const pointsKey = points
    .map(([latitude, longitude]) => `${latitude},${longitude}`)
    .join(";");
  const [loadedGeometry, setLoadedGeometry] = useState<LoadedGeometry | null>(
    null,
  );

  useEffect(() => {
    if (!routeId || points.length < 2) return;
    let active = true;
    loadRouteGeometry(routeId, points).then((geometry) => {
      if (active) setLoadedGeometry({ routeId, pointsKey, geometry });
    });
    return () => {
      active = false;
    };
  }, [routeId, pointsKey]);

  if (
    !loadedGeometry ||
    loadedGeometry.routeId !== routeId ||
    loadedGeometry.pointsKey !== pointsKey
  ) {
    return null;
  }
  return loadedGeometry.geometry;
}
