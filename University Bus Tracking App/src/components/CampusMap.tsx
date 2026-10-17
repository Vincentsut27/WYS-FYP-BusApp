import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { ROUTES, STOPS } from "../data/routes";
import { useRouteGeometry } from "../hooks/useRouteGeometry";
import {
  distanceBetweenCoordinates,
  loadRoadPath,
  loadWalkingPath,
} from "../lib/routeGeometry";
import {
  createRouteFadePieces,
  getFadeOpacity,
  getVisibleFadePath,
} from "../lib/pathFade";
import type { Stop } from "../types/transit";
import "leaflet/dist/leaflet.css";

const CAMPUS_CENTER: [number, number] = [22.419, 114.207];
const ROUTE_ACCENT = "#7C2D9C";
const ROUTE_HIGHLIGHT = "#8B5CF6";

function pathDistance2(first: [number, number], second: [number, number]) {
  const dLat = first[0] - second[0];
  const dLng = first[1] - second[1];
  return dLat * dLat + dLng * dLng;
}

function nearestPathIndex(
  path: [number, number][],
  point: [number, number],
  fromIndex = 0,
) {
  let bestIndex = fromIndex;
  let bestDistance = Infinity;
  for (let index = fromIndex; index < path.length; index++) {
    const distance = pathDistance2(path[index], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function samplePath(
  path: [number, number][],
  spacingMeters = 4,
): [number, number][] {
  if (path.length < 2) return path;
  const segmentLengths = path
    .slice(1)
    .map((point, index) => distanceBetweenCoordinates(path[index], point));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  if (totalLength === 0) return [path[0]];

  const intervalCount = Math.max(1, Math.round(totalLength / spacingMeters));
  const exactSpacing = totalLength / intervalCount;
  const markers: [number, number][] = [path[0]];
  let segmentIndex = 0;
  let distanceBeforeSegment = 0;

  for (let markerIndex = 1; markerIndex < intervalCount; markerIndex++) {
    const targetDistance = markerIndex * exactSpacing;
    while (
      segmentIndex < segmentLengths.length - 1 &&
      distanceBeforeSegment + segmentLengths[segmentIndex] < targetDistance
    ) {
      distanceBeforeSegment += segmentLengths[segmentIndex];
      segmentIndex++;
    }
    const segmentLength = segmentLengths[segmentIndex];
    const ratio =
      segmentLength === 0
        ? 0
        : (targetDistance - distanceBeforeSegment) / segmentLength;
    const segmentStart = path[segmentIndex];
    const segmentEnd = path[segmentIndex + 1];
    markers.push([
      segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * ratio,
      segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * ratio,
    ]);
  }
  markers.push(path[path.length - 1]);
  return markers;
}

function sliceRoadPath(
  roadPath: [number, number][],
  waypoints: [number, number][],
) {
  if (roadPath.length < 2 || waypoints.length < 2) return null;
  let searchFrom = 0;
  const indices = waypoints.map((waypoint) => {
    const index = nearestPathIndex(roadPath, waypoint, searchFrom);
    searchFrom = index;
    return index;
  });
  const startIndex = indices[0];
  const endIndex = indices[indices.length - 1];
  if (endIndex <= startIndex) return null;
  const sliced = roadPath.slice(startIndex, endIndex + 1);
  return sliced.length >= 2 ? sliced : null;
}

function MapViewport({
  points,
  rotation,
  locked = false,
}: {
  points: [number, number][];
  rotation: number;
  locked?: boolean;
}) {
  const map = useMap();
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join(";");
  const rotationBaseZoomRef = useRef<number | null>(null);
  const previousRotationRef = useRef(rotation);
  const routePointsKeyRef = useRef(pointsKey);
  useEffect(() => {
    if (locked) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 17), { animate: true });
      return;
    }
    if (points.length > 1)
      map.fitBounds(points, { padding: [24, 24], maxZoom: 16 });
  }, [locked, map, pointsKey]);

  useEffect(() => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const previousRotation = ((previousRotationRef.current % 360) + 360) % 360;
    const routeChanged = routePointsKeyRef.current !== pointsKey;
    routePointsKeyRef.current = pointsKey;

    if (normalizedRotation === 0) {
      if (
        previousRotation !== 0 &&
        !routeChanged &&
        rotationBaseZoomRef.current !== null
      ) {
        map.setZoom(rotationBaseZoomRef.current, { animate: false });
      }
      rotationBaseZoomRef.current = null;
      previousRotationRef.current = rotation;
      return;
    }

    if (
      previousRotation === 0 ||
      routeChanged ||
      rotationBaseZoomRef.current === null
    ) {
      rotationBaseZoomRef.current = map.getZoom();
    }
    previousRotationRef.current = rotation;

    if (points.length < 2) return;
    const size = map.getSize();
    const center = L.point(size.x / 2, size.y / 2);
    const radians = (normalizedRotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const mapPaneScale = getMapPaneScale(size, normalizedRotation);
    const rotatedPoints = points.map((point) => {
      const screenPoint = map.latLngToContainerPoint(point).subtract(center);
      return L.point(
        (screenPoint.x * cos - screenPoint.y * sin) * mapPaneScale,
        (screenPoint.x * sin + screenPoint.y * cos) * mapPaneScale,
      );
    });
    const horizontalExtent =
      Math.max(...rotatedPoints.map((point) => point.x)) -
      Math.min(...rotatedPoints.map((point) => point.x));
    const verticalExtent =
      Math.max(...rotatedPoints.map((point) => point.y)) -
      Math.min(...rotatedPoints.map((point) => point.y));
    const availableWidth = Math.max(1, size.x - 48);
    const availableHeight = Math.max(1, size.y - 48);
    const zoomScale = Math.min(
      availableWidth / Math.max(1, horizontalExtent),
      availableHeight / Math.max(1, verticalExtent),
    );
    const adjustedZoom = Math.min(
      rotationBaseZoomRef.current,
      map.getZoom() + Math.log2(zoomScale),
    );
    const targetZoom = Math.floor(adjustedZoom * 4) / 4;
    if (Math.abs(targetZoom - map.getZoom()) >= 0.25) {
      map.setZoom(targetZoom, { animate: false });
    }
  }, [map, pointsKey, rotation]);
  return null;
}

function MapFocusStop({
  stopId,
  active,
  focusNonce = 0,
}: {
  stopId?: string;
  active: boolean;
  focusNonce?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active || !stopId) return;
    const stop = STOPS[stopId];
    if (!stop) return;
    map.stop();
    map.invalidateSize({ animate: false });
    map.setView([stop.lat, stop.lng], 17, { animate: false });
  }, [active, focusNonce, map, stopId]);
  return null;
}

function getMapPaneScale(size: L.Point, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return Math.max(cos + (size.y / size.x) * sin, cos + (size.x / size.y) * sin);
}

function applyMapBearing(map: L.Map, rotation: number) {
  const pane = map.getPane("mapPane");
  if (!pane) return;
  const size = map.getSize();
  const panePos = L.DomUtil.getPosition(pane) ?? L.point(0, 0);
  const scale = getMapPaneScale(size, rotation);
  pane.style.transformOrigin = `${size.x / 2 - panePos.x}px ${size.y / 2 - panePos.y}px`;
  pane.style.rotate = `${rotation}deg`;
  pane.style.scale = `${scale}`;
}

function screenDeltaToMapDelta(dx: number, dy: number, rotation: number) {
  const radians = (-rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return L.point(dx * cos - dy * sin, dx * sin + dy * cos);
}

function MapBearing({ rotation }: { rotation: number }) {
  const map = useMap();
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  useEffect(() => {
    const apply = () => applyMapBearing(map, rotation);
    apply();
    map.on("move zoom viewreset", apply);
    return () => {
      map.off("move zoom viewreset", apply);
      const pane = map.getPane("mapPane");
      if (!pane) return;
      pane.style.rotate = "";
      pane.style.scale = "";
      pane.style.transformOrigin = "";
    };
  }, [map, rotation]);
  useEffect(() => {
    const container = map.getContainer();
    const pointers = new Map<number, { x: number; y: number }>();
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (rotationRef.current === 0 || pointers.size !== 1) return;
      const offset = screenDeltaToMapDelta(
        event.clientX - previous.x,
        event.clientY - previous.y,
        rotationRef.current,
      );
      map.panBy([-offset.x, -offset.y], { animate: false, noMoveStart: true });
    };
    const onPointerUp = (event: PointerEvent) =>
      pointers.delete(event.pointerId);
    if (rotation) map.dragging.disable();
    else map.dragging.enable();
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      map.dragging.enable();
    };
  }, [map, rotation]);
  return null;
}

function MapTouchRotate({
  enabled = false,
  rotation,
  onRotationChange,
}: {
  enabled?: boolean;
  rotation: number;
  onRotationChange?: (next: number) => void;
}) {
  const map = useMap();
  const rotationRef = useRef(rotation);
  const lastAngleRef = useRef<number | null>(null);
  rotationRef.current = rotation;
  useEffect(() => {
    if (!enabled || !onRotationChange) return;
    const container = map.getContainer();
    const touchAngle = (touches: TouchList) => {
      const first = touches.item(0);
      const second = touches.item(1);
      if (!first || !second) return 0;
      return (
        Math.atan2(
          second.clientY - first.clientY,
          second.clientX - first.clientX,
        ) *
        (180 / Math.PI)
      );
    };
    const onStart = (event: TouchEvent) => {
      lastAngleRef.current =
        event.touches.length === 2 ? touchAngle(event.touches) : null;
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || lastAngleRef.current == null) return;
      const nextAngle = touchAngle(event.touches);
      let delta = nextAngle - lastAngleRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngleRef.current = nextAngle;
      onRotationChange(rotationRef.current + delta);
    };
    const onEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) lastAngleRef.current = null;
    };
    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchmove", onMove, { passive: true });
    container.addEventListener("touchend", onEnd);
    container.addEventListener("touchcancel", onEnd);
    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", onEnd);
      container.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, map, onRotationChange]);
  return null;
}

function MapSizeSync() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() =>
      map.invalidateSize({ animate: false }),
    );
    resizeObserver.observe(container);
    map.invalidateSize({ animate: false });
    return () => resizeObserver.disconnect();
  }, [map]);
  return null;
}

function UserMapFocus({
  position,
  active,
}: {
  position?: [number, number] | null;
  active: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (active && position) {
      map.invalidateSize({ animate: false });
      map.setView(position, 17, { animate: true });
    }
  }, [active, map, position]);
  return null;
}

export function CampusMap({
  routeId,
  highlightStopId,
  focusStopId,
  userPos,
  highlightPath,
  focusUser = false,
  showAllStops = false,
  onStopClick,
  height = 240,
  rotation = 0,
  userHeading = 0,
  guidancePoints,
  focusNonce = 0,
  enableTouchRotate = false,
  onRotationChange,
  dimRoute = false,
  tripProgressMeters = null,
  tripStartStopIndex = 0,
}: {
  routeId?: string;
  highlightStopId?: string;
  focusStopId?: string;
  userPos?: [number, number] | null;
  highlightPath?: [number, number][];
  guidancePoints?: [number, number][];
  focusUser?: boolean;
  showAllStops?: boolean;
  onStopClick?: (stop: Stop) => void;
  height?: number | string;
  rotation?: number;
  userHeading?: number;
  focusNonce?: number;
  enableTouchRotate?: boolean;
  onRotationChange?: (next: number) => void;
  dimRoute?: boolean;
  tripProgressMeters?: number | null;
  tripStartStopIndex?: number;
}) {
  const route = routeId
    ? ROUTES.find((candidate) => candidate.id === routeId)
    : null;
  const routeStops = route
    ? route.stopIds.map((id) => STOPS[id]).filter(Boolean)
    : [];
  const displayStops = (
    showAllStops ? Object.values(STOPS) : routeStops
  ).filter(
    (stop, index, stops) =>
      stops.findIndex((candidate) => candidate.id === stop.id) === index,
  );
  const routeColor = route?.color ?? ROUTE_ACCENT;
  const routePath = routeStops.map(
    (stop) => [stop.lat, stop.lng] as [number, number],
  );
  const routeGeometry = useRouteGeometry(routeId, routePath);
  const roadPath = routeGeometry?.points ?? null;
  const pastRoutePieces = useMemo(
    () => (routeGeometry ? createRouteFadePieces(routeGeometry.segments) : []),
    [routeGeometry],
  );
  const [highlightRoadPath, setHighlightRoadPath] = useState<
    [number, number][] | null
  >(null);
  const [guidanceRoadPath, setGuidanceRoadPath] = useState<
    [number, number][] | null
  >(null);

  useEffect(() => {
    if (!guidancePoints || guidancePoints.length < 2) {
      setGuidanceRoadPath(null);
      return;
    }
    let active = true;
    setGuidanceRoadPath(guidancePoints);
    loadWalkingPath(guidancePoints).then((path) => {
      if (active) setGuidanceRoadPath(path ?? guidancePoints);
    });
    return () => {
      active = false;
    };
  }, [guidancePoints]);

  useEffect(() => {
    if (!highlightPath || highlightPath.length < 2) {
      setHighlightRoadPath(null);
      return;
    }
    const slicedPath = roadPath ? sliceRoadPath(roadPath, highlightPath) : null;
    if (slicedPath && slicedPath.length > highlightPath.length) {
      setHighlightRoadPath(slicedPath);
      return;
    }
    let active = true;
    loadRoadPath(highlightPath)
      .then((nextPath) => {
        if (!active) return;
        setHighlightRoadPath(
          nextPath && nextPath.length > 1 ? nextPath : slicedPath,
        );
      })
      .catch(() => {
        if (active) setHighlightRoadPath(slicedPath);
      });
    return () => {
      active = false;
    };
  }, [highlightPath, roadPath]);

  const renderedPath = roadPath ?? routePath;
  const guidanceDots = useMemo(
    () => samplePath(guidanceRoadPath ?? []),
    [guidanceRoadPath],
  );
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, touchAction: enableTouchRotate ? "none" : undefined }}
    >
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={15}
        zoomSnap={0.25}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />
        <MapSizeSync />
        <MapBearing rotation={rotation} />
        <MapTouchRotate
          enabled={enableTouchRotate}
          rotation={rotation}
          onRotationChange={onRotationChange}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport
          points={
            guidancePoints?.length && highlightPath?.length
              ? [...guidancePoints, ...highlightPath]
              : guidancePoints?.length
                ? guidancePoints
                : renderedPath.length > 1
                  ? renderedPath
                  : displayStops.map((stop) => [stop.lat, stop.lng])
          }
          rotation={rotation}
          locked={Boolean(focusStopId)}
        />
        <MapFocusStop
          stopId={focusStopId}
          active={Boolean(focusStopId)}
          focusNonce={focusNonce}
        />
        <UserMapFocus position={userPos} active={focusUser} />
        {route && renderedPath.length > 1 && (
          <Polyline
            positions={renderedPath}
            pathOptions={{
              color: routeColor,
              weight: 4,
              opacity: dimRoute ? 0.25 : 0.86,
            }}
          />
        )}
        {tripProgressMeters !== null &&
          pastRoutePieces.map((piece) => {
            if (piece.stopIndex < tripStartStopIndex) return null;
            const visiblePath = getVisibleFadePath(piece, tripProgressMeters);
            if (!visiblePath) return null;
            const opacity = getFadeOpacity(piece, tripProgressMeters);
            return (
              <Polyline
                key={`past-route-${piece.stopIndex}-${piece.startDistanceMeters}`}
                positions={visiblePath}
                pathOptions={{
                  color: routeColor,
                  weight: 6,
                  opacity,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            );
          })}
        {highlightRoadPath && highlightRoadPath.length > 1 && (
          <Polyline
            positions={highlightRoadPath}
            pathOptions={{ color: ROUTE_HIGHLIGHT, weight: 6, opacity: 0.92 }}
          />
        )}
        {guidanceDots.map((point, index) => (
          <CircleMarker
            key={`guidance-${index}`}
            pane="markerPane"
            center={point}
            radius={3}
            pathOptions={{
              color: "white",
              weight: 1.5,
              fillColor: "#F59E0B",
              fillOpacity: 1,
            }}
          />
        ))}
        {displayStops.map((stop) => {
          const isHighlighted = stop.id === highlightStopId;
          const isRouteStop = routeStops.some(
            (routeStop) => routeStop.id === stop.id,
          );
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lng]}
              radius={isHighlighted ? 9 : isRouteStop ? 7 : 5}
              pathOptions={{
                color: "white",
                weight: isHighlighted ? 3 : 2,
                fillColor: isHighlighted
                  ? ROUTE_ACCENT
                  : isRouteStop
                    ? "#A78BFA"
                    : "#1D4ED8",
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onStopClick?.(stop) }}
            >
              <Popup>{stop.name}</Popup>
            </CircleMarker>
          );
        })}
        {userPos && (
          <Marker
            position={userPos}
            icon={L.divIcon({
              className: "user-direction-marker",
              html: `<svg width="28" height="28" viewBox="0 0 64 64" style="transform:rotate(${userHeading - rotation}deg);filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));overflow:visible;"><polygon points="32,4 56,46 40,46 40,60 24,60 24,46 8,46" fill="#2563EB" stroke="rgba(255,255,255,0.9)" stroke-width="3" stroke-linejoin="round" /></svg>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
              popupAnchor: [0, -18],
            })}
          >
            <Popup>Your location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
