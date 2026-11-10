import { useCallback, useEffect, useRef, useState } from "react";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeHeading(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function screenHeadingOffset() {
  const angle = window.screen?.orientation?.angle;
  if (typeof angle === "number" && Number.isFinite(angle)) return angle;
  const legacyOrientation = (
    window as Window & { orientation?: number }
  ).orientation;
  if (typeof legacyOrientation === "number" && Number.isFinite(legacyOrientation)) {
    return legacyOrientation < 0 ? 360 + legacyOrientation : legacyOrientation;
  }
  return 0;
}

function headingFromAbsoluteOrientation(
  alpha: number,
  beta: number,
  gamma: number,
) {
  const radians = Math.PI / 180;
  const alphaRadians = alpha * radians;
  const betaRadians = beta * radians;
  const gammaRadians = gamma * radians;
  const east = -Math.sin(alphaRadians) * Math.cos(betaRadians);
  const north = Math.cos(alphaRadians) * Math.cos(betaRadians);
  if (Math.hypot(east, north) > 0.2) {
    return (Math.atan2(east, north) * 180) / Math.PI;
  }
  const facingEast =
    -Math.cos(alphaRadians) * Math.sin(gammaRadians) -
    Math.sin(alphaRadians) * Math.sin(betaRadians) * Math.cos(gammaRadians);
  const facingNorth =
    -Math.sin(alphaRadians) * Math.sin(gammaRadians) +
    Math.cos(alphaRadians) * Math.sin(betaRadians) * Math.cos(gammaRadians);
  return (Math.atan2(facingEast, facingNorth) * 180) / Math.PI;
}

function compassHeadingFromEvent(event: DeviceOrientationEvent) {
  const webkitHeading = (
    event as DeviceOrientationEvent & { webkitCompassHeading?: number }
  ).webkitCompassHeading;
  const screenOffset = screenHeadingOffset();
  if (typeof webkitHeading === "number" && Number.isFinite(webkitHeading)) {
    return normalizeHeading(webkitHeading + screenOffset);
  }
  const isAbsolute =
    event.absolute === true || event.type === "deviceorientationabsolute";
  if (
    !isAbsolute ||
    event.alpha == null ||
    event.beta == null ||
    event.gamma == null ||
    Number.isNaN(event.alpha) ||
    Number.isNaN(event.beta) ||
    Number.isNaN(event.gamma)
  ) {
    return null;
  }
  return normalizeHeading(
    headingFromAbsoluteOrientation(event.alpha, event.beta, event.gamma) +
      screenOffset,
  );
}

function getHeadingFromMovement(
  previous: { lat: number; lng: number } | null,
  current: GeolocationPosition,
) {
  if (current.coords.heading != null && !Number.isNaN(current.coords.heading)) {
    return current.coords.heading;
  }
  if (!previous) return null;
  const lat1 = (previous.lat * Math.PI) / 180;
  const lat2 = (current.coords.latitude * Math.PI) / 180;
  const lng1 = (previous.lng * Math.PI) / 180;
  const lng2 = (current.coords.longitude * Math.PI) / 180;
  const dLng = lng2 - lng1;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const angle = (Math.atan2(x, y) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function withSmoothedCoordinates(
  position: GeolocationPosition,
  latitude: number,
  longitude: number,
): GeolocationPosition {
  const { coords } = position;
  return {
    coords: {
      latitude,
      longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      toJSON() {
        return {
          latitude,
          longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
        };
      },
    },
    timestamp: position.timestamp,
    toJSON() {
      return { coords: this.coords.toJSON(), timestamp: position.timestamp };
    },
  };
}

export function useGpsLocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [filteredPosition, setFilteredPosition] =
    useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number>(0);

  const watchRef = useRef<number | null>(null);
  const previousAcceptedRef = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);
  const smoothedCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const orientationListenerRef = useRef<
    ((event: DeviceOrientationEvent) => void) | null
  >(null);
  const compassHeadingRef = useRef<number | null>(null);
  const headingFrameRef = useRef<number | null>(null);
  const isMovingRef = useRef(false);

  const start = useCallback(() => {
    if (!window.isSecureContext) {
      setError("Location access requires a secure connection (HTTPS).");
      return;
    }
    if (!navigator.geolocation) {
      setError("Location access is unavailable in this browser.");
      return;
    }
    if (watchRef.current !== null)
      navigator.geolocation.clearWatch(watchRef.current);
    setError(null);

    watchRef.current = navigator.geolocation.watchPosition(
      (nextPosition) => {
        const accuracy = nextPosition.coords.accuracy;

        if (!Number.isFinite(accuracy) || accuracy > 50) {
          return;
        }

        const currentLat = nextPosition.coords.latitude;
        const currentLng = nextPosition.coords.longitude;
        const timestamp = nextPosition.timestamp;
        const prev = previousAcceptedRef.current;

        if (prev) {
          const distanceMeters = calculateDistance(
            prev.lat,
            prev.lng,
            currentLat,
            currentLng,
          );
          const timeElapsedSeconds = Math.max(
            0.1,
            (timestamp - prev.timestamp) / 1000,
          );
          const impliedSpeed = distanceMeters / timeElapsedSeconds;

          if (impliedSpeed > 25) {
            return;
          }

          isMovingRef.current = distanceMeters > 2 && impliedSpeed > 0.6;
        }

        setFilteredPosition(nextPosition);

        let smoothedLat = currentLat;
        let smoothedLng = currentLng;
        if (smoothedCoordRef.current) {
          const weight = Math.max(0.2, Math.min(0.8, 1 - accuracy / 50));
          smoothedLat =
            smoothedCoordRef.current.lat * (1 - weight) + currentLat * weight;
          smoothedLng =
            smoothedCoordRef.current.lng * (1 - weight) + currentLng * weight;
        }
        smoothedCoordRef.current = { lat: smoothedLat, lng: smoothedLng };
        setPosition(
          withSmoothedCoordinates(nextPosition, smoothedLat, smoothedLng),
        );

        if (compassHeadingRef.current === null) {
          const moveHeading = getHeadingFromMovement(prev, nextPosition);
          if (moveHeading !== null && !Number.isNaN(moveHeading) && moveHeading !== 0) {
            setHeading(normalizeHeading(moveHeading));
          }
        }

        previousAcceptedRef.current = {
          lat: currentLat,
          lng: currentLng,
          timestamp,
        };
        setError(null);
      },
      (geoError) => {
        setError(
          geoError.code === 1
            ? "Location access was denied. Allow location for this site in site settings."
            : "Unable to get your current location.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    if (window.DeviceOrientationEvent) {
      const permApi =
        DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<"granted" | "denied">;
        };
      if (orientationListenerRef.current) {
        window.removeEventListener(
          "deviceorientationabsolute",
          orientationListenerRef.current,
        );
        window.removeEventListener(
          "deviceorientation",
          orientationListenerRef.current,
        );
      }

      orientationListenerRef.current = (event: DeviceOrientationEvent) => {
        const nextHeading = compassHeadingFromEvent(event);
        if (nextHeading === null) return;
        compassHeadingRef.current = nextHeading;
        if (headingFrameRef.current !== null) return;
        headingFrameRef.current = window.requestAnimationFrame(() => {
          headingFrameRef.current = null;
          if (compassHeadingRef.current !== null) {
            setHeading(compassHeadingRef.current);
          }
        });
      };

      const requestOrientation = async () => {
        try {
          if (typeof permApi.requestPermission === "function") {
            const permissionStatus = await permApi.requestPermission();
            if (permissionStatus !== "granted") return;
          }
          window.addEventListener(
            "deviceorientationabsolute",
            orientationListenerRef.current!,
          );
          window.addEventListener(
            "deviceorientation",
            orientationListenerRef.current!,
          );
        } catch {
          // Motion is optional; location tracking remains active.
        }
      };
      void requestOrientation();
    }
  }, []);

  useEffect(
    () => () => {
      if (watchRef.current !== null)
        navigator.geolocation.clearWatch(watchRef.current);
      if (orientationListenerRef.current) {
        window.removeEventListener(
          "deviceorientationabsolute",
          orientationListenerRef.current,
        );
        window.removeEventListener(
          "deviceorientation",
          orientationListenerRef.current,
        );
      }
      if (headingFrameRef.current !== null) {
        window.cancelAnimationFrame(headingFrameRef.current);
      }
    },
    [],
  );

  return { position, filteredPosition, error, heading, start };
}
