import { useCallback, useEffect, useRef, useState } from "react";

function getHeadingFromMovement(previous: { lat: number; lng: number } | null, current: GeolocationPosition) {
  if (current.coords.heading != null && !Number.isNaN(current.coords.heading)) return current.coords.heading;
  if (!previous) return 0;
  const lat1 = (previous.lat * Math.PI) / 180;
  const lat2 = (current.coords.latitude * Math.PI) / 180;
  const lng1 = (previous.lng * Math.PI) / 180;
  const lng2 = (current.coords.longitude * Math.PI) / 180;
  const dLng = lng2 - lng1;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const angle = (Math.atan2(x, y) * 180) / Math.PI;
  return (angle + 360) % 360;
}

export function useGpsLocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const watchRef = useRef<number | null>(null);
  const previousPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const orientationListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

  const start = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("This browser does not support GPS.");
      return;
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    setError(null);

    if (window.DeviceOrientationEvent) {
      const permApi = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      const hasPermissionApi = typeof permApi.requestPermission === "function";
      if (hasPermissionApi) {
        const permissionStatus = await permApi.requestPermission?.();
        if (permissionStatus && permissionStatus !== "granted") {
          setError("Motion access is unavailable on this device.");
        }
      }

      if (orientationListenerRef.current) window.removeEventListener("deviceorientation", orientationListenerRef.current);
      orientationListenerRef.current = (event: DeviceOrientationEvent) => {
        const orientationEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
        const alpha = typeof orientationEvent.webkitCompassHeading === "number" ? orientationEvent.webkitCompassHeading : event.alpha;
        if (typeof alpha === "number" && !Number.isNaN(alpha)) {
          setHeading(alpha % 360);
          return;
        }
        const gamma = typeof event.gamma === "number" ? event.gamma : 0;
        const beta = typeof event.beta === "number" ? event.beta : 0;
        const angle = (Math.atan2(gamma, beta) * 180) / Math.PI + 90;
        setHeading((angle + 360) % 360);
      };
      window.addEventListener("deviceorientation", orientationListenerRef.current);
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (nextPosition) => {
        setPosition(nextPosition);
        setHeading((existingHeading) => {
          const gpsHeading = getHeadingFromMovement(previousPositionRef.current, nextPosition);
          return gpsHeading !== 0 || existingHeading !== 0 ? gpsHeading : existingHeading;
        });
        previousPositionRef.current = { lat: nextPosition.coords.latitude, lng: nextPosition.coords.longitude };
        setError(null);
      },
      (geoError) => {
        setError(geoError.code === 1 ? "Location access was denied." : "Unable to get your current location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }, []);

  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (orientationListenerRef.current) window.removeEventListener("deviceorientation", orientationListenerRef.current);
  }, []);

  return { position, error, heading, start };
}