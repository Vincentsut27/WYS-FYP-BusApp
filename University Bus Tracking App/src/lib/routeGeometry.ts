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

interface RoadRoute {
  points: Coordinate[];
  waypointIndices: number[];
}

const routeGeometryCache = new Map<string, Promise<RouteGeometry>>();
const roadRouteCache = new Map<string, Promise<RoadRoute | null>>();
const walkingRouteCache = new Map<string, Promise<Coordinate[] | null>>();

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

function getCoordinatesKey(points: Coordinate[]) {
  return points
    .map(([latitude, longitude]) => `${latitude},${longitude}`)
    .join(";");
}

function loadRoadRoute(stops: Coordinate[]) {
  const coordinatesKey = getCoordinatesKey(stops);
  const cached = roadRouteCache.get(coordinatesKey);
  if (cached) return cached;

  const request = (async (): Promise<RoadRoute | null> => {
    const coordinates = stops
      .map(([latitude, longitude]) => `${longitude},${latitude}`)
      .join(";");
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    const data: {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
      waypoints?: { location?: [number, number] }[];
    } = await response.json();
    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    const waypoints = data.waypoints;
    if (
      !Array.isArray(routeCoordinates) ||
      routeCoordinates.length < 2 ||
      !Array.isArray(waypoints) ||
      waypoints.length !== stops.length ||
      waypoints.some((waypoint) => !waypoint.location)
    ) {
      return null;
    }

    const roadPath = routeCoordinates.map(
      ([longitude, latitude]) => [latitude, longitude] as Coordinate,
    );
    let searchFrom = 0;
    const waypointIndices = waypoints.map((waypoint) => {
      const location = waypoint.location!;
      const index = nearestPathIndex(
        roadPath,
        [location[1], location[0]],
        searchFrom,
      );
      searchFrom = index;
      return index;
    });
    return { points: roadPath, waypointIndices };
  })().catch(() => null);

  roadRouteCache.set(coordinatesKey, request);
  void request.then((route) => {
    if (!route && roadRouteCache.get(coordinatesKey) === request) {
      roadRouteCache.delete(coordinatesKey);
    }
  });
  return request;
}

export async function loadRoadPath(stops: Coordinate[]) {
  if (stops.length < 2) return null;
  const route = await loadRoadRoute(stops);
  return route?.points ?? null;
}

export function loadWalkingPath(stops: Coordinate[]) {
  if (stops.length < 2) return Promise.resolve(null);
  const coordinatesKey = getCoordinatesKey(stops);
  const cached = walkingRouteCache.get(coordinatesKey);
  if (cached) return cached;

  const request = (async (): Promise<Coordinate[] | null> => {
    const coordinates = stops
      .map(([latitude, longitude]) => `${longitude},${latitude}`)
      .join(";");
    const response = await fetch(
      `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    const data: {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    } = await response.json();
    const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
      return null;
    }
    const roadPath = routeCoordinates.map(
      ([longitude, latitude]) => [latitude, longitude] as Coordinate,
    );
    return [stops[0], ...roadPath, stops[stops.length - 1]];
  })().catch(() => null);

  walkingRouteCache.set(coordinatesKey, request);
  void request.then((path) => {
    if (!path && walkingRouteCache.get(coordinatesKey) === request) {
      walkingRouteCache.delete(coordinatesKey);
    }
  });
  return request;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapItem: (item: T, index: number) => Promise<U>,
) {
  const results = new Array<U>(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapItem(items[index], index);
      }
    }),
  );
  return results;
}

async function fetchRouteSegments(stops: Coordinate[]) {
  const route = await loadRoadRoute(stops);
  if (route) {
    return {
      points: stops.slice(0, -1).map((start, index) => {
        const segmentStart = route.waypointIndices[index];
        const segmentEnd = route.waypointIndices[index + 1];
        const segment = route.points.slice(segmentStart, segmentEnd + 1);
        return segment.length > 1 ? segment : [start, stops[index + 1]];
      }),
      fullyRouted: true,
    };
  }

  const legs = stops
    .slice(0, -1)
    .map((start, index) => [start, stops[index + 1]]);
  const routedLegs = await mapWithConcurrency(legs, 4, (leg) =>
    loadRoadRoute(leg),
  );
  return {
    points: legs.map((leg, index) => routedLegs[index]?.points ?? leg),
    fullyRouted: routedLegs.every(Boolean),
  };
}

async function buildRouteGeometry(routeId: string, stops: Coordinate[]) {
  const { points: segmentPoints, fullyRouted } =
    await fetchRouteSegments(stops);
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
  return {
    geometry: { routeId, points: routePoints, segments, totalDistanceMeters },
    fullyRouted,
  };
}

export function loadRouteGeometry(routeId: string, stops: Coordinate[]) {
  const cacheKey = `${routeId}:${getCoordinatesKey(stops)}`;
  const existing = routeGeometryCache.get(cacheKey);
  if (existing) return existing;
  let request: Promise<RouteGeometry>;
  request = buildRouteGeometry(routeId, stops).then(
    ({ geometry, fullyRouted }) => {
      if (!fullyRouted && routeGeometryCache.get(cacheKey) === request) {
        routeGeometryCache.delete(cacheKey);
      }
      return geometry;
    },
  );
  routeGeometryCache.set(cacheKey, request);
  void request.catch(() => {
    if (routeGeometryCache.get(cacheKey) === request) {
      routeGeometryCache.delete(cacheKey);
    }
  });
  return request;
}
