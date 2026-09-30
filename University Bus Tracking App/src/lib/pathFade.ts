import {
  distanceBetweenCoordinates,
  type Coordinate,
  type RouteSegmentGeometry,
} from "./routeGeometry";

const NEWLY_TRAVELED_OPACITY = 0.78;
const MINIMUM_PAST_OPACITY = 0.16;
const FADE_DISTANCE_METERS = 360;
const FADE_PIECE_LENGTH_METERS = 60;

export interface RouteFadePiece {
  stopIndex: number;
  points: Coordinate[];
  startDistanceMeters: number;
  endDistanceMeters: number;
}

export function createRouteFadePieces(segments: RouteSegmentGeometry[]) {
  const pieces: RouteFadePiece[] = [];
  segments.forEach((segment) => {
    if (segment.points.length < 2) return;
    let points = [segment.points[0]];
    let pieceLengthMeters = 0;
    let pieceStartDistanceMeters = segment.startDistanceMeters;
    for (let index = 1; index < segment.points.length; index++) {
      const previous = segment.points[index - 1];
      const current = segment.points[index];
      pieceLengthMeters += distanceBetweenCoordinates(previous, current);
      points.push(current);
      if (
        pieceLengthMeters < FADE_PIECE_LENGTH_METERS &&
        index < segment.points.length - 1
      ) {
        continue;
      }
      const endDistanceMeters = pieceStartDistanceMeters + pieceLengthMeters;
      pieces.push({
        stopIndex: segment.stopIndex,
        points,
        startDistanceMeters: pieceStartDistanceMeters,
        endDistanceMeters,
      });
      pieceStartDistanceMeters = endDistanceMeters;
      pieceLengthMeters = 0;
      points = [current];
    }
  });
  return pieces;
}

export function getVisibleFadePath(
  piece: RouteFadePiece,
  progressMeters: number,
) {
  const visibleDistanceMeters = progressMeters - piece.startDistanceMeters;
  if (visibleDistanceMeters <= 0) return null;
  if (
    visibleDistanceMeters >=
    piece.endDistanceMeters - piece.startDistanceMeters
  )
    return piece.points;

  const visiblePoints = [piece.points[0]];
  let traversedDistanceMeters = 0;
  for (let index = 1; index < piece.points.length; index++) {
    const start = piece.points[index - 1];
    const end = piece.points[index];
    const edgeLengthMeters = distanceBetweenCoordinates(start, end);
    if (traversedDistanceMeters + edgeLengthMeters < visibleDistanceMeters) {
      visiblePoints.push(end);
      traversedDistanceMeters += edgeLengthMeters;
      continue;
    }
    const ratio = edgeLengthMeters
      ? (visibleDistanceMeters - traversedDistanceMeters) / edgeLengthMeters
      : 0;
    visiblePoints.push([
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ]);
    break;
  }
  return visiblePoints.length > 1 ? visiblePoints : null;
}

export function getFadeOpacity(piece: RouteFadePiece, progressMeters: number) {
  const visibleEndDistanceMeters = Math.min(
    progressMeters,
    piece.endDistanceMeters,
  );
  const visibleMidpointMeters =
    (piece.startDistanceMeters + visibleEndDistanceMeters) / 2;
  const distanceBehindMeters = Math.max(
    0,
    progressMeters - visibleMidpointMeters,
  );
  const fade = Math.exp(-distanceBehindMeters / FADE_DISTANCE_METERS);
  return (
    MINIMUM_PAST_OPACITY +
    (NEWLY_TRAVELED_OPACITY - MINIMUM_PAST_OPACITY) * fade
  );
}
