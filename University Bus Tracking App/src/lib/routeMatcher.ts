import {
  distanceBetweenCoordinates,
  type Coordinate,
  type RouteSegmentGeometry,
} from "./routeGeometry";

export interface RouteMatch {
  progressMeters: number;
  segmentIndex: number;
  distanceFromRouteMeters: number;
}

function projectToEdge(
  position: Coordinate,
  start: Coordinate,
  end: Coordinate,
) {
  const metersPerDegree = 111320;
  const longitudeScale = Math.cos((position[0] * Math.PI) / 180);
  const startX = (start[1] - position[1]) * metersPerDegree * longitudeScale;
  const startY = (start[0] - position[0]) * metersPerDegree;
  const endX = (end[1] - position[1]) * metersPerDegree * longitudeScale;
  const endY = (end[0] - position[0]) * metersPerDegree;
  const edgeX = endX - startX;
  const edgeY = endY - startY;
  const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
  const ratio = edgeLengthSquared
    ? Math.max(
        0,
        Math.min(1, -(startX * edgeX + startY * edgeY) / edgeLengthSquared),
      )
    : 0;
  const projectedX = startX + ratio * edgeX;
  const projectedY = startY + ratio * edgeY;
  return {
    ratio,
    distanceMeters: Math.hypot(projectedX, projectedY),
  };
}

export function matchPositionToRoute(
  segments: RouteSegmentGeometry[],
  position: Coordinate,
  minimumProgressMeters: number,
  maximumProgressMeters: number,
  accuracyMeters: number,
): RouteMatch | null {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters > 100) return null;
  const maximumDistanceMeters = Math.min(
    80,
    Math.max(40, accuracyMeters * 1.5),
  );
  let bestMatch: RouteMatch | null = null;
  let bestScore = Infinity;

  for (const segment of segments) {
    if (
      segment.endDistanceMeters < minimumProgressMeters - 25 ||
      segment.startDistanceMeters > maximumProgressMeters
    ) {
      continue;
    }
    let localDistanceMeters = 0;
    for (let index = 1; index < segment.points.length; index++) {
      const start = segment.points[index - 1];
      const end = segment.points[index];
      const edgeLengthMeters = distanceBetweenCoordinates(start, end);
      const projection = projectToEdge(position, start, end);
      const progressMeters =
        segment.startDistanceMeters +
        localDistanceMeters +
        edgeLengthMeters * projection.ratio;
      localDistanceMeters += edgeLengthMeters;
      if (
        progressMeters < minimumProgressMeters - 25 ||
        progressMeters > maximumProgressMeters ||
        projection.distanceMeters > maximumDistanceMeters
      ) {
        continue;
      }
      const forwardPenalty =
        Math.max(0, progressMeters - minimumProgressMeters - 80) * 0.025;
      const score = projection.distanceMeters + forwardPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestMatch = {
          progressMeters: Math.max(minimumProgressMeters, progressMeters),
          segmentIndex: segment.stopIndex,
          distanceFromRouteMeters: projection.distanceMeters,
        };
      }
    }
  }

  return bestMatch;
}
