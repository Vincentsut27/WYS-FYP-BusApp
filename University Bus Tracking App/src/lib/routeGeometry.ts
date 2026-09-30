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

function nearestPathIndex(
  path: Coordinate[],
  point: Coordinate,
  fromIndex: number,
) {
  let nearestIndex = fromIndex;
  let nearestDistance = Infinity;
  for (let index = fromIndex; index < path.length; index++) {
    const distance =
      (path[index][0] - point[0]) ** 2 + (path[index][1] - point[1]) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

async function fetchRouteSegments(stops: Coordinate[]) {
  const coordinates = stops
    .map(([latitude, longitude]) => `${longitude},${latitude}`)
    .join(";");
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    );
    if (!response.ok) throw new Error("Road route request failed.");
    const data = await response.json();
    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    const waypoints = data.waypoints;
    if (
      !Array.isArray(routeCoordinates) ||
      routeCoordinates.length < 2 ||
      !Array.isArray(waypoints) ||
      waypoints.length !== stops.length
    ) {
      throw new Error("Road route response was incomplete.");
    }
    const roadPath = routeCoordinates.map(
      ([longitude, latitude]: [number, number]) =>
        [latitude, longitude] as Coordinate,
    );
    let searchFrom = 0;
    const waypointIndices = waypoints.map(
      (waypoint: { location: [number, number] }) => {
        const index = nearestPathIndex(
          roadPath,
          [waypoint.location[1], waypoint.location[0]],
          searchFrom,
        );
        searchFrom = index;
        return index;
      },
    );
    return stops.slice(0, -1).map((start, index) => {
      const segmentStart = waypointIndices[index];
      const segmentEnd = waypointIndices[index + 1];
      const segment = roadPath.slice(segmentStart, segmentEnd + 1);
      return segment.length > 1 ? segment : [start, stops[index + 1]];
    });
  } catch {
    return stops.slice(0, -1).map((start, index) => [start, stops[index + 1]]);
  }
}

async function buildRouteGeometry(routeId: string, stops: Coordinate[]) {
  const segmentPoints = await fetchRouteSegments(stops);
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
