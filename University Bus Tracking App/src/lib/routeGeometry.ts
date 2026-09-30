export type Coordinate = [number, number];

export interface RouteSegmentGeometry {
  stopIndex: number;
  points: Coordinate[];
  startDistanceMeters: number;
  endDistanceMeters: number;
  lengthMeters: number;
}

export interface RouteGeometry {
  routeId: string;
  points: Coordinate[];
  segments: RouteSegmentGeometry[];
  totalDistanceMeters: number;
}

const routeGeometryCache = new Map<string, Promise<RouteGeometry>>();

export function distanceBetweenCoordinates(
  first: Coordinate,
  second: Coordinate,
) {
  const radius = 6371000;
  const latitudeDelta = ((second[0] - first[0]) * Math.PI) / 180;
  const longitudeDelta = ((second[1] - first[1]) * Math.PI) / 180;
  const latitude1 = (first[0] * Math.PI) / 180;
  const latitude2 = (second[0] * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

async function fetchSegment(start: Coordinate, end: Coordinate) {
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    );
    if (!response.ok) return [start, end];
    const data = await response.json();
    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2)
      return [start, end];
    return routeCoordinates.map(
      ([longitude, latitude]: [number, number]) =>
        [latitude, longitude] as Coordinate,
    );
  } catch {
    return [start, end];
  }
}

async function buildRouteGeometry(routeId: string, stops: Coordinate[]) {
  const segmentPoints = await Promise.all(
    stops
      .slice(0, -1)
      .map((stop, index) => fetchSegment(stop, stops[index + 1])),
  );
  let totalDistanceMeters = 0;
  const segments = segmentPoints.map((points, stopIndex) => {
    const startDistanceMeters = totalDistanceMeters;
    const lengthMeters = points
      .slice(1)
      .reduce(
        (distance, point, index) =>
          distance + distanceBetweenCoordinates(points[index], point),
        0,
      );
    totalDistanceMeters += lengthMeters;
    return {
      stopIndex,
      points,
      startDistanceMeters,
      endDistanceMeters: totalDistanceMeters,
      lengthMeters,
    };
  });
  const routePoints: Coordinate[] = [];
  segments.forEach((segment) => {
    routePoints.push(
      ...(routePoints.length ? segment.points.slice(1) : segment.points),
    );
  });
  return { routeId, points: routePoints, segments, totalDistanceMeters };
}

export function loadRouteGeometry(routeId: string, stops: Coordinate[]) {
  const existing = routeGeometryCache.get(routeId);
  if (existing) return existing;
  const request = buildRouteGeometry(routeId, stops);
  routeGeometryCache.set(routeId, request);
  return request;
}
