import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Stop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

interface Route {
  id: string;
  label: string;
  description: string;
  color: string;
  operatingDays: string;
  serviceHours: string;
  frequency: string;
  notes?: string;
  stopIds: string[];
}

// ─── Stop Data ──────────────────────────────────────────────────────────────
function makeStop(id: string, name: string, lat: number, lng: number): Stop {
  return { id, name, shortName: name, lat, lng };
}

const STOPS: Record<string, Stop> = {
  stationPiazza: makeStop("stationPiazza", "Station Piazza", 22.41402418241919, 114.20951365384028),
  postgraduateHall1: makeStop("postgraduateHall1", "Postgraduate Hall 1", 22.420263, 114.212156),
  sports: makeStop("sports", "Univ. Sports Centre", 22.417786, 114.210515),
  shawHall: makeStop("shawHall", "Sir Run Run Shaw Hall", 22.419865390456728, 114.20697616419724),
  fungKingHey: makeStop("fungKingHey", "Fung King Hey Bldg.", 22.420004165692188, 114.20314134034673),
  unitedUp: makeStop("unitedUp", "United College (Upward)", 22.42033254674031, 114.20540209166288),
  newAsia: makeStop("newAsia", "New Asia College", 22.421349, 114.207530),
  unitedDown: makeStop("unitedDown", "United College (Downward)", 22.42033254674031, 114.20540209166288),
  admin: makeStop("admin", "Univ. Admin. Bldg.", 22.418812277340415, 114.2053521300643),
  shHo: makeStop("shHo", "S.H. Ho College", 22.417999, 114.209951),
  universityStation: makeStop("universityStation", "Univ. Station", 22.414591596662277, 114.2103213737358),
  stationPiazzaNonTeaching: makeStop("stationPiazzaNonTeaching", "Station Piazza (non-teaching days)", 22.41402418241919, 114.20951365384028),
  residencesDown: makeStop("residencesDown", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
  residencesUp: makeStop("residencesUp", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  chanChunHa: makeStop("chanChunHa", "Chan Chun Ha Hostel", 22.42201994564561, 114.20494713239741),
  ucStaff: makeStop("ucStaff", "U.C. Staff Residence", 22.423007, 114.205779),
  cwChuDown: makeStop("cwChuDown", "C.W. Chu College (Downward)", 22.425662, 114.206056),
  cwChuUp: makeStop("cwChuUp", "CW Chu College (Upward)", 22.425662, 114.206056),
  shawUp: makeStop("shawUp", "Shaw College (Upward)", 22.422482793334858, 114.20129809371062),
  shawDown: makeStop("shawDown", "Shaw College (Downward)", 22.422482793334858, 114.20129809371062),
  yiap: makeStop("yiap", "Y.I.A.P.", 22.415976075794102, 114.21082288564051),
  chungChiTeaching: makeStop("chungChiTeaching", "Chung Chi Teaching Bldg.", 22.416110051980585, 114.20836398267592),
  chungChiNonTeaching: makeStop("chungChiNonTeaching", "Chung Chi Teaching Bldg. (non-teaching days)", 22.416110051980585, 114.20836398267592),
  circuitEastUp: makeStop("circuitEastUp", "Campus Circuit East (Upward)", 22.42081397563455, 114.21269586733412),
  circuitNorth: makeStop("circuitNorth", "Campus Circuit North", 22.425648654353616, 114.20674541151153),
  circuitEastDown: makeStop("circuitEastDown", "Campus Circuit East (Downward)", 22.42081397563455, 114.21269586733412),
  scienceCentre: makeStop("scienceCentre", "Science Centre", 22.419861083772084, 114.20719745848922),
  newAsiaCircle: makeStop("newAsiaCircle", "New Asia Circle", 22.421072776114638, 114.20765936415471),
  wuYeeSunUp: makeStop("wuYeeSunUp", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  wuYeeSunDown: makeStop("wuYeeSunDown", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
  area39: makeStop("area39", "Area 39 (Upward)", 22.427561, 114.204514),
  area39Down: makeStop("area39Down", "Area 39 (Downward)", 22.427561, 114.204514),
  postgraduateHall: makeStop("postgraduateHall", "Postgraduate Hall 1", 22.4162, 114.2090),
  universityResidence15: makeStop("universityResidence15", "University Residence No. 15", 22.423765, 114.206629),
  universityStationTeaching: makeStop("universityStationTeaching", "Univ. Station (teaching days only)", 22.414591596662277, 114.2103213737358),
  universityMtr: makeStop("universityMtr", "University Station", 22.414591596662277, 114.2103213737358),
  universitySports: makeStop("universitySports", "University Sports Centre", 22.417786, 114.210515),
  united: makeStop("united", "United College", 22.42033254674031, 114.20540209166288),
  residences34Up: makeStop("residences34Up", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  residences34Down: makeStop("residences34Down", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
};

// ─── Route Data ──────────────────────────────────────────────────────────────
const ROUTES: Route[] = [
  {
    id: "1",
    label: "1",
    description: "Main Campus",
    color: "#7C2D9C",
    operatingDays: "Mon – Sat (Suspended on Sunday & Public Holidays)",
    serviceHours: "07:40 – 18:55",
    frequency: "Every 10, 25, 40, 55 minutes",
    stopIds: ["universityStation","sports","shawHall","admin","shHo","universityStation"],
  },
  {
    id: "2",
    label: "2",
    description: "NA / UC",
    color: "#0F766E",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "07:45 – 18:45",
    frequency: "Every 15, 45 minutes",
    notes: "Buses departing from 31 to 00 minutes stop at Sir Run Run Shaw Hall.",
    stopIds: ["stationPiazza","sports","shawHall","fungKingHey","unitedUp","newAsia","unitedDown","admin","shHo","universityStation"],
  },
  {
    id: "2S",
    label: "2S",
    description: "NA / UC (Special)",
    color: "#0284C7",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "08:00 – 18:30",
    frequency: "Every 00, 30 minutes",
    stopIds: ["stationPiazza","postgraduateHall1","sports","shawHall","fungKingHey","unitedUp","newAsia","unitedDown","admin","shHo","postgraduateHall1","universityStation"],
  },
  {
    id: "3",
    label: "3",
    description: "Shaw College",
    color: "#DC2626",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "09:00 – 18:40",
    frequency: "Every 00, 20, 40 minutes",
    stopIds: ["yiap","sports","scienceCentre","fungKingHey","wuYeeSunUp","shawUp","cwChuDown","universityResidence15","ucStaff","chanChunHa","shawDown","wuYeeSunDown","admin","shHo","stationPiazza"],
  },
  {
    id: "4",
    label: "4",
    description: "Circuit Road",
    color: "#B45309",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "07:30 – 18:50",
    frequency: "Every 10, 30, 50 minutes",
    stopIds: ["yiap","circuitEastUp","cwChuUp","area39","cwChuDown","universityResidence15","ucStaff","chanChunHa","shawDown","wuYeeSunDown","newAsia","unitedDown","admin","shHo","universityStation"],
  },
  {
    id: "5",
    label: "5",
    description: "Upward",
    color: "#7C3AED",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)",
    serviceHours: "Mon–Fri 09:18 – 17:26; Sat 09:18 – 13:26",
    frequency: "Every 18, 22, 26 minutes",
    stopIds: ["chungChiTeaching","sports","shawHall","fungKingHey","unitedUp","newAsia","wuYeeSunUp","shawUp","cwChuDown"],
  },
  {
    id: "6A",
    label: "6A",
    description: "Downward – CWC",
    color: "#059669",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)",
    serviceHours: "Mon–Fri 09:10 – 17:10; Sat 09:10 – 13:10",
    frequency: "Every 10 minutes",
    stopIds: ["cwChuDown","ucStaff","chanChunHa","wuYeeSunDown","newAsia","unitedDown","admin","shHo","stationPiazza","chungChiTeaching"],
  },
  {
    id: "6B",
    label: "6B",
    description: "Downward – NA / UC",
    color: "#D97706",
    operatingDays: "Mon – Fri (Teaching days only)",
    serviceHours: "12:20 – 17:20",
    frequency: "Every 20 minutes",
    stopIds: ["newAsia","unitedDown","admin","shHo","stationPiazza","chungChiTeaching"],
  },
  {
    id: "7",
    label: "7",
    description: "Downward – Shaw",
    color: "#DC2626",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)",
    serviceHours: "Mon–Fri 08:18 – 17:18; Sat 08:18 – 13:18",
    frequency: "Every 00, 18 minutes",
    stopIds: ["shawDown","wuYeeSunDown","newAsia","unitedDown","admin","shHo","stationPiazza","chungChiTeaching"],
  },
  {
    id: "8",
    label: "8",
    description: "Western Campus",
    color: "#B45309",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "07:35 – 18:35",
    frequency: "Every 15, 35, 55 minutes",
    notes: "On non-teaching days, buses stop at Station Piazza and Chung Chi Teaching Bldg. instead of Univ. Station.",
    stopIds: ["yiap","circuitEastUp","cwChuUp","area39","cwChuDown","ucStaff","chanChunHa","shawDown","wuYeeSunDown","admin","scienceCentre","newAsiaCircle","unitedDown","wuYeeSunUp","shawUp","area39Down","circuitNorth","circuitEastDown","universityStationTeaching","stationPiazzaNonTeaching","chungChiNonTeaching"],
  },
  {
    id: "N",
    label: "N",
    description: "Night Service",
    color: "#1E293B",
    operatingDays: "Mon – Sat (except Public Holidays)",
    serviceHours: "19:00 – 23:30",
    frequency: "Every 00, 15, 30, 45 minutes",
    notes: "Buses departing at 00 minutes stop at Postgraduate Hall 1.",
    stopIds: ["universityStation","postgraduateHall1","sports","shawHall","newAsiaCircle","unitedDown","wuYeeSunUp","shawUp","area39","cwChuDown","universityResidence15","ucStaff","chanChunHa","shawDown","wuYeeSunDown","newAsia","unitedDown","admin","shHo","postgraduateHall1","universityStation"],
  },
  {
    id: "H",
    label: "H",
    description: "Holiday Route",
    color: "#7C3AED",
    operatingDays: "Sun & Public Holidays",
    serviceHours: "08:20 – 23:20",
    frequency: "Every 00, 20, 40 minutes",
    stopIds: ["universityStation","postgraduateHall1","sports","shawHall","newAsiaCircle","unitedDown","wuYeeSunUp","shawUp","area39","cwChuDown","universityResidence15","ucStaff","chanChunHa","shawDown","wuYeeSunDown","newAsia","unitedDown","admin","shHo","postgraduateHall1","universityStation"],
  },
];

// ─── Simulated arrival times ─────────────────────────────────────────────────
function getArrivals(stopId: string) {
  const seed = stopId.charCodeAt(0) + stopId.charCodeAt(stopId.length - 1);
  const base = [3, 8, 18, 23, 33];
  return base.map((b) => (b + (seed % 7)) % 60 || 1);
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function sameStopLocation(first: Stop, second: Stop) {
  return Math.abs(first.lat - second.lat) < 0.00001 && Math.abs(first.lng - second.lng) < 0.00001;
}

function getPhysicalStops() {
  return Object.values(STOPS).reduce<Stop[]>((stops, stop) => {
    if (!stops.some((existing) => sameStopLocation(existing, stop))) {
      stops.push({ ...stop, name: getCanonicalStopName(stop.name), shortName: getCanonicalStopName(stop.shortName) });
    }
    return stops;
  }, []);
}

function getCanonicalStopName(name: string) {
  return name
    .replace(/\s*\((?:Upward|Downward)\)/gi, "")
    .replace(/\s+(?:Upward|Downward)$/i, "")
    .replace(/\s*\((?:teaching days only|non-teaching days)\)/gi, "")
    .trim();
}

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

function useGpsLocation() {
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

      if (orientationListenerRef.current) {
        window.removeEventListener("deviceorientation", orientationListenerRef.current);
      }

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
    if (orientationListenerRef.current) {
      window.removeEventListener("deviceorientation", orientationListenerRef.current);
    }
  }, []);

  return { position, error, heading, start };
}

function playArrivalTone() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
}

type JourneyNotification = { route: Route; destination: Stop };

// ─── Icons (SVG paths as components) ────────────────────────────────────────
function Icon({ path, size = 24, className = "", style }: { path: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  bus: "M8 6v6m8-6v6M3 10l.73-4.38A2 2 0 0 1 5.72 4h12.56a2 2 0 0 1 1.99 1.62L21 10M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8zM9 18v2M15 18v2",
  clock: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v4l3 3",
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0",
  navigation: "M12 2L19.07 19.07L12 15.94L4.93 19.07L12 2z",
  chevronRight: "M9 18l6-6-6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  locate: "M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  map: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15",
  info: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 8v4m0 4h.01",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01",
  swap: "M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  x: "M18 6L6 18M6 6l12 12",
  play: "M5 3l14 9-14 9V3z",
  stop: "M6 4h4v16H6zm8 0h4v16h-4z",
};

// ─── Real campus map ─────────────────────────────────────────────────────────
const CAMPUS_CENTER: [number, number] = [22.419, 114.207];
const ROUTE_ACCENT = "#7C2D9C";
const ROUTE_HIGHLIGHT = "#8B5CF6";
const ROAD_PATH_CACHE: Record<string, [number, number][]> = {};

async function fetchRoadPath(points: [number, number][]) {
  if (points.length < 2) return points;
  const coordinates = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`);
  if (!response.ok) return points;
  const data = await response.json();
  const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(routeCoordinates)) return points;
  return routeCoordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
}

function MapViewport({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join(";");

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 17), { animate: true });
      return;
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 16 });
    }
  }, [map, pointsKey]);

  return null;
}

function MapFocusStop({ stopId, active }: { stopId?: string; active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!active || !stopId) return;
    const stop = STOPS[stopId];
    if (!stop) return;
    map.setView([stop.lat, stop.lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [active, map, stopId]);

  return null;
}

function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(container);
    map.invalidateSize({ animate: false });
    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
}

function UserMapFocus({ position, active }: { position?: [number, number] | null; active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (active && position) {
      map.invalidateSize({ animate: false });
      map.setView(position, 17, { animate: true });
    }
  }, [active, map, position]);

  return null;
}

function CampusMap({
  routeId,
  highlightStopId,
  focusStopId,
  userPos,
  vehiclePos,
  highlightPath,
  focusUser = false,
  showAllStops = false,
  onStopClick,
  height = 240,
  rotation = 0,
  userHeading = 0,
  guidancePoints,
}: {
  routeId?: string;
  highlightStopId?: string;
  focusStopId?: string;
  userPos?: [number, number] | null; // latitude, longitude
  vehiclePos?: [number, number] | null; // simulated bus latitude, longitude
  highlightPath?: [number, number][];
  guidancePoints?: [number, number][];
  focusUser?: boolean;
  showAllStops?: boolean;
  onStopClick?: (stop: Stop) => void;
  height?: number;
  rotation?: number;
  userHeading?: number;
}) {
  const route = routeId ? ROUTES.find((r) => r.id === routeId) : null;
  const routeStops = route ? route.stopIds.map((id) => STOPS[id]).filter(Boolean) : [];
  const displayStops = (showAllStops ? Object.values(STOPS) : routeStops)
    .filter((stop, index, stops) => stops.findIndex((candidate) => candidate.id === stop.id) === index);
  const routeColor = route?.color ?? ROUTE_ACCENT;
  const routePath = routeStops.map((stop) => [stop.lat, stop.lng] as [number, number]);
  const [roadPath, setRoadPath] = useState<[number, number][] | null>(null);
  const [highlightRoadPath, setHighlightRoadPath] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!route || routePath.length < 2) {
      setRoadPath(null);
      return;
    }

    if (route.id in ROAD_PATH_CACHE) {
      setRoadPath(ROAD_PATH_CACHE[route.id]);
      return;
    }

    let active = true;
    fetchRoadPath(routePath)
      .then((nextPath) => {
        if (!active) return;
        ROAD_PATH_CACHE[route.id] = nextPath;
        setRoadPath(nextPath);
      })
      .catch(() => {
        if (active) setRoadPath(null);
      });

    return () => { active = false; };
  }, [routeId]);

  useEffect(() => {
    if (!highlightPath || highlightPath.length < 2) {
      setHighlightRoadPath(null);
      return;
    }
    if (highlightPath.length <= 2) {
      setHighlightRoadPath(highlightPath);
      return;
    }
    const controller = new AbortController();
    const coordinates = highlightPath.map(([lat, lng]) => `${lng},${lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Routing request failed")))
      .then((data) => {
        const coordinates = data.routes?.[0]?.geometry?.coordinates;
        setHighlightRoadPath(Array.isArray(coordinates) ? coordinates.map(([lng, lat]: [number, number]) => [lat, lng]) : highlightPath);
      })
      .catch(() => setHighlightRoadPath(highlightPath));
    return () => controller.abort();
  }, [highlightPath]);

  const renderedPath = roadPath ?? routePath;

  return (
    <div className="relative w-full overflow-hidden" style={{ height, transform: `rotate(${rotation}deg)`, transformOrigin: "center center" }}>
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />
        <MapSizeSync />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport points={renderedPath.length > 1 ? renderedPath : displayStops.map((stop) => [stop.lat, stop.lng])} />
        <MapFocusStop stopId={focusStopId} active={Boolean(focusStopId)} />
        <UserMapFocus position={userPos} active={focusUser} />
        {route && roadPath && roadPath.length > 1 && (
          <Polyline positions={roadPath} pathOptions={{ color: routeColor, weight: 5, opacity: 0.9 }} />
        )}
        {highlightPath && highlightPath.length > 1 && (
          <Polyline positions={highlightRoadPath ?? highlightPath} pathOptions={{ color: ROUTE_HIGHLIGHT, weight: 8, opacity: 0.95 }} />
        )}
        {guidancePoints && guidancePoints.length > 1 && guidancePoints.map((point, index) => (
          <CircleMarker
            key={`guidance-${index}`}
            center={point}
            radius={3.25}
            pathOptions={{ color: "#7C3AED", weight: 1, fillColor: "#7C3AED", fillOpacity: 0.9 }}
          />
        ))}
        {displayStops.map((stop) => {
          const isHighlighted = stop.id === highlightStopId;
          const isRouteStop = routeStops.some((routeStop) => routeStop.id === stop.id);
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lng]}
              radius={isHighlighted ? 9 : isRouteStop ? 7 : 5}
              pathOptions={{
                color: "white",
                weight: isHighlighted ? 3 : 2,
                fillColor: isHighlighted ? ROUTE_ACCENT : isRouteStop ? "#A78BFA" : "#1D4ED8",
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
              html: `
                <svg width="28" height="28" viewBox="0 0 64 64" style="transform:rotate(${userHeading}deg);filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));overflow:visible;">
                  <polygon points="32,4 56,46 40,46 40,60 24,60 24,46 8,46" fill="#2563EB" stroke="rgba(255,255,255,0.9)" stroke-width="3" stroke-linejoin="round" />
                </svg>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
              popupAnchor: [0, -18],
            })}
          >
            <Popup>Your location</Popup>
          </Marker>
        )}
        {vehiclePos && (
          <CircleMarker
            center={vehiclePos}
            radius={8}
            pathOptions={{ color: "white", weight: 2, fillColor: "#F97316", fillOpacity: 1 }}
          >
            <Popup>Demo bus position</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

// ─── Bottom Navigation ───────────────────────────────────────────────────────
type TabId = "routes" | "arrival" | "search" | "track";

function BottomNav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; iconPath: string }[] = [
    { id: "routes",  label: "Routes",  iconPath: ICONS.bus },
    { id: "arrival", label: "Arrival", iconPath: ICONS.clock },
    { id: "search",  label: "Search",  iconPath: ICONS.search },
    { id: "track",   label: "Track",   iconPath: ICONS.navigation },
  ];
  return (
    <div className="tab-bar-safe bg-white border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{ color: isActive ? "var(--purple)" : "var(--muted)" }}
              onClick={() => onChange(t.id)}
            >
              {isActive && t.id === "routes" ? (
                <div className="p-1.5 rounded-2xl" style={{ background: "var(--purple-pale)" }}>
                  <Icon path={t.iconPath} size={20} />
                </div>
              ) : (
                <Icon path={t.iconPath} size={20} />
              )}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Routes Tab ─────────────────────────────────────────────────────────────
function RoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [highlightStop, setHighlightStop] = useState<string | null>(null);

  if (selectedRoute) {
    const stops = selectedRoute.stopIds.map((id) => STOPS[id]).filter(Boolean);
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { setSelectedRoute(null); setHighlightStop(null); }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.chevronLeft} size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold"
              style={{ color: selectedRoute.color }}
            >
              Route {selectedRoute.label}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              · {selectedRoute.description}
            </span>
          </div>
          <button
            onClick={() => setShowDetail(true)}
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ color: "var(--purple)", background: "var(--purple-pale)" }}
          >
            Info
          </button>
        </div>

        {/* Map */}
        <div className="relative bg-white shadow-sm">
          <CampusMap
            routeId={selectedRoute.id}
            highlightStopId={highlightStop ?? undefined}
            focusStopId={highlightStop ?? undefined}
            height={220}
            onStopClick={(s) => setHighlightStop(s.id === highlightStop ? null : s.id)}
          />
          <div className="absolute bottom-2 left-2 text-[9px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded">
            Tap stop to highlight
          </div>
        </div>

        {/* Stop list */}
        <div className="flex-1 scrollable bg-white mt-2">
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              {stops.length} Stops
            </span>
          </div>
          {stops.map((stop, idx) => {
            const isHighlighted = stop.id === highlightStop;
            return (
              <button
                key={stop.id}
                onClick={() => setHighlightStop(stop.id === highlightStop ? null : stop.id)}
                className="w-full flex items-center gap-4 px-4 py-3 border-b transition-colors text-left"
                style={{
                  borderColor: "var(--border)",
                  background: isHighlighted ? "var(--purple-pale)" : "white",
                }}
              >
                {/* Timeline */}
                <div className="flex flex-col items-center" style={{ width: 24, minHeight: 40 }}>
                  <div
                    className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor: isHighlighted ? selectedRoute.color : "#C8C8D8",
                      background: isHighlighted ? selectedRoute.color : "white",
                    }}
                  />
                  {idx < stops.length - 1 && (
                    <div className="w-0.5 flex-1 mt-1" style={{ background: isHighlighted ? selectedRoute.color : "#DDD" }} />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className="text-sm font-medium"
                    style={{ color: isHighlighted ? selectedRoute.color : "var(--text)" }}
                  >
                    {idx + 1}. {stop.name}
                  </span>
                  <div className="flex gap-2 mt-0.5">
                    {getArrivals(stop.id).slice(0, 2).map((t, i) => (
                      <span key={i} className="text-xs font-semibold" style={{ color: selectedRoute.color }}>
                        {t} min
                      </span>
                    ))}
                  </div>
                </div>
                <Icon path={ICONS.chevronRight} size={16} className="opacity-30" />
              </button>
            );
          })}
          <div className="h-6" />
        </div>

        {/* Route info modal */}
        {showDetail && (
          <div className="absolute inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowDetail(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl slide-up overflow-hidden"
              style={{ background: "var(--bg)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-4 left-4 text-sm font-semibold px-4 py-1.5 rounded-full bg-white shadow-sm"
              >
                Close
              </button>
              <div
                className="px-6 pt-14 pb-8"
                style={{ background: selectedRoute.color }}
              >
                <div className="text-5xl font-extrabold text-white">{selectedRoute.label}</div>
                <div
                  className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
                >
                  {selectedRoute.description}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-white rounded-2xl p-4 space-y-4">
                  {[
                    { icon: ICONS.info, label: "Operating Days", value: selectedRoute.operatingDays },
                    { icon: ICONS.clock, label: "Service Hours", value: selectedRoute.serviceHours },
                    { icon: ICONS.bus, label: "Frequency", value: selectedRoute.frequency },
                    ...(selectedRoute.notes ? [{ icon: ICONS.info, label: "Note", value: selectedRoute.notes }] : []),
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex gap-4 items-start">
                      <div className="mt-0.5" style={{ color: selectedRoute.color }}>
                        <Icon path={icon} size={20} />
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: selectedRoute.color }}
                >
                  <Icon path={ICONS.map} size={16} />
                  View Holiday & Teaching Calendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "white" }}>
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>Route List</h1>
      </div>
      <div className="flex-1 scrollable">
        {ROUTES.map((route) => (
          <button
            key={route.id}
            onClick={() => setSelectedRoute(route)}
            className="w-full flex items-center px-5 py-4 border-b text-left gap-4 active:bg-gray-50"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: route.color }}
            >
              {route.label}
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold" style={{ color: "var(--text)" }}>{route.label}</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{route.description}</div>
            </div>
            <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
          </button>
        ))}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ─── Arrival Tab ─────────────────────────────────────────────────────────────
function ArrivalPage({ gpsPosition, onRequestGps, userHeading }: { gpsPosition: GeolocationPosition | null; onRequestGps: () => void; userHeading?: number | null }) {
  const [subTab, setSubTab] = useState<"nearby" | "stops">("nearby");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const userPos: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;

  const physicalStops = getPhysicalStops();
  const nearbyStops = physicalStops
    .map((s) => ({ ...s, dist: userPos ? getDistance(userPos[0], userPos[1], s.lat, s.lng) : Infinity }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8);

  const stopList = subTab === "nearby" ? nearbyStops : physicalStops;

  if (selectedStop) {
    const stopRoutes = ROUTES.filter((route) => route.stopIds.some((stopId) => sameStopLocation(STOPS[stopId], selectedStop)));
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setSelectedStop(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.chevronLeft} size={20} />
          </button>
          <div>
            <div className="text-base font-bold" style={{ color: "var(--text)" }}>{selectedStop.name}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Live arrival times</div>
          </div>
        </div>
        <div className="flex-1 scrollable">
          <div className="p-3">
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <CampusMap highlightStopId={selectedStop.id} userPos={userPos} height={180} userHeading={userHeading ?? 0} />
            </div>
          </div>
          {stopRoutes.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>No routes serve this stop.</div>
          ) : (
            <>
              <div className="px-4 pb-1 pt-1">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  Buses arriving at this stop
                </span>
              </div>
              {stopRoutes.map((route) => {
                const arrivals = getArrivals(selectedStop.id + route.id).slice(0, 3);
                const stopIdx = route.stopIds.findIndex((stopId) => sameStopLocation(STOPS[stopId], selectedStop));
                const nextStop = route.stopIds[stopIdx + 1] ? STOPS[route.stopIds[stopIdx + 1]] : null;
                return (
                  <div key={route.id} className="mx-3 mb-3 bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ background: route.color }}
                      >
                        {route.label}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{route.description}</div>
                        {nextStop && (
                          <div className="text-xs" style={{ color: "var(--muted)" }}>Next → {nextStop.shortName}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {arrivals.map((mins, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-xl py-2 text-center"
                          style={{ background: i === 0 ? route.color : "var(--bg)" }}
                        >
                          <div
                            className="text-lg font-extrabold"
                            style={{ color: i === 0 ? "white" : route.color }}
                          >
                            {mins}
                          </div>
                          <div
                            className="text-[10px] font-medium"
                            style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : "var(--muted)" }}
                          >
                            mins
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div className="h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="bg-white border-b px-4 pt-4 pb-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>Arrival Times</h1>
          <button onClick={onRequestGps} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--purple-pale)", color: "var(--purple)" }}>
            <Icon path={ICONS.locate} size={18} />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 mb-3">
          {(["nearby", "stops"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: subTab === t ? "white" : "transparent",
                color: subTab === t ? "var(--purple)" : "var(--muted)",
                boxShadow: subTab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t === "nearby" ? "Near Me" : "All Stops"}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white shadow-sm">
        {!gpsPosition && subTab === "nearby" && (
          <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)", background: "#FFFBEB" }}>
            <Icon path={ICONS.locate} size={18} style={{ color: "#B45309" }} />
            <span className="flex-1 text-xs" style={{ color: "#92400E" }}>Allow location access to find stops near you.</span>
            <button onClick={onRequestGps} className="text-xs font-bold" style={{ color: "#B45309" }}>Enable</button>
          </div>
        )}
        <CampusMap
          showAllStops
          userPos={userPos}
          height={190}
          onStopClick={(s) => setSelectedStop(s)}
          highlightStopId={undefined}
          userHeading={userHeading ?? 0}
        />
      </div>

      {/* Stop list */}
      <div className="flex-1 scrollable mt-1 bg-white">
        <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            {subTab === "nearby" ? "Nearby Stops" : "All Stops"}
          </span>
        </div>
        {(gpsPosition ? stopList : subTab === "nearby" ? [] : stopList).map((stop, idx) => {
          const dist = "dist" in stop ? (stop as any).dist : null;
          return (
            <button
              key={stop.id}
              onClick={() => setSelectedStop(stop)}
              className="w-full flex items-center px-4 py-3.5 border-b text-left gap-3 active:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "var(--purple-pale)", color: "var(--purple)" }}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{stop.name}</div>
              </div>
              {dist !== null && (
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--muted)" }}>
                  {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`}
                </span>
              )}
              <Icon path={ICONS.chevronRight} size={16} className="opacity-30" />
            </button>
          );
        })}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ─── Search Tab ──────────────────────────────────────────────────────────────
type SearchStop = Stop & { searchIds: string[] };

function getSearchStopName(name: string) {
  return name
    .replace(/\s*\((?:Upward|Downward)\)/gi, "")
    .replace(/\s+(?:Upward|Downward)$/i, "")
    .replace(/\s*\((?:teaching days only|non-teaching days)\)/gi, "")
    .trim();
}

const SEARCH_STOPS: SearchStop[] = Object.values(STOPS).reduce<SearchStop[]>((stops, stop) => {
  const displayName = getSearchStopName(stop.name);
  const existing = stops.find((candidate) => candidate.name === displayName);
  if (existing) {
    existing.searchIds.push(stop.id);
    return stops;
  }
  stops.push({ ...stop, name: displayName, shortName: displayName, searchIds: [stop.id] });
  return stops;
}, []);

function getRouteTrip(route: Route, fromId: string, toId: string) {
  const fromIndexes = route.stopIds.map((id, index) => id === fromId ? index : -1).filter((index) => index >= 0);
  const toIndexes = route.stopIds.map((id, index) => id === toId ? index : -1).filter((index) => index >= 0);
  if (!fromIndexes.length || !toIndexes.length || fromId === toId) return null;

  let best: { stops: string[]; count: number } | null = null;
  fromIndexes.forEach((fromIndex) => toIndexes.forEach((toIndex) => {
    // Routes are one-way: only stops later in the published sequence are valid destinations.
    if (toIndex <= fromIndex) return;
    const count = toIndex - fromIndex;
    if (best && count >= best.count) return;
    const stops = route.stopIds.slice(fromIndex, toIndex + 1);
    best = { stops, count };
  }));
  return best;
}

function getSearchRouteTrip(route: Route, from: SearchStop, to: SearchStop) {
  const trips: { stops: string[]; count: number }[] = [];
  from.searchIds.forEach((fromId) => {
    to.searchIds.forEach((toId) => {
      const trip = getRouteTrip(route, fromId, toId);
      if (trip) trips.push(trip);
    });
  });
  return trips.sort((a, b) => a.count - b.count)[0] ?? null;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getOperatingWindow(route: Route, date: Date) {
  const day = date.getDay();
  if (route.id === "H") return day === 0 ? [toMinutes("08:20"), toMinutes("23:20")] : null;
  if (route.id === "N") return day >= 1 && day <= 6 ? [toMinutes("19:00"), toMinutes("23:30")] : null;
  if (route.id === "5") {
    if (day >= 1 && day <= 5) return [toMinutes("09:18"), toMinutes("17:26")];
    if (day === 6) return [toMinutes("09:18"), toMinutes("13:26")];
    return null;
  }
  if (route.id === "6A") {
    if (day >= 1 && day <= 5) return [toMinutes("09:10"), toMinutes("17:10")];
    if (day === 6) return [toMinutes("09:10"), toMinutes("13:10")];
    return null;
  }
  if (route.id === "6B") return day >= 1 && day <= 5 ? [toMinutes("12:20"), toMinutes("17:20")] : null;
  if (route.id === "7") {
    if (day >= 1 && day <= 5) return [toMinutes("08:18"), toMinutes("17:18")];
    if (day === 6) return [toMinutes("08:18"), toMinutes("13:18")];
    return null;
  }
  if (day === 0) return null;
  if (route.id === "1") return [toMinutes("07:40"), toMinutes("18:55")];
  if (route.id === "2") return [toMinutes("07:45"), toMinutes("18:45")];
  if (route.id === "2S") return [toMinutes("08:00"), toMinutes("18:30")];
  if (route.id === "3") return [toMinutes("09:00"), toMinutes("18:40")];
  if (route.id === "4") return [toMinutes("07:30"), toMinutes("18:50")];
  if (route.id === "8") return [toMinutes("07:35"), toMinutes("18:35")];
  return null;
}

function isRouteOperatingNow(route: Route, date = new Date()) {
  const window = getOperatingWindow(route, date);
  if (!window) return false;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes >= window[0] && currentMinutes <= window[1];
}

function SearchPage({ onNotify, gpsPosition, onRequestGps }: { onNotify: (journey: JourneyNotification) => void; gpsPosition: GeolocationPosition | null; onRequestGps: () => void }) {
  const [from, setFrom] = useState<SearchStop | null>(null);
  const [to, setTo] = useState<SearchStop | null>(null);
  const [selecting, setSelecting] = useState<"from" | "to" | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Route[] | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);
  const [hasDirectRoute, setHasDirectRoute] = useState<boolean | null>(null);
  const userPosition: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;

  const closestSearchStopId = userPosition
    ? SEARCH_STOPS.reduce((closest, stop) => {
        if (!closest) return stop.id;
        return getDistance(userPosition[0], userPosition[1], stop.lat, stop.lng) < getDistance(userPosition[0], userPosition[1], SEARCH_STOPS.find((candidate) => candidate.id === closest)!.lat, SEARCH_STOPS.find((candidate) => candidate.id === closest)!.lng)
          ? stop.id
          : closest;
      }, "" as string)
    : null;

  const filtered = SEARCH_STOPS.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(stop: SearchStop) {
    if (selecting === "from") setFrom(stop);
    else setTo(stop);
    setSelecting(null);
    setQuery("");
    setResults(null);
    setExpandedRouteId(null);
    setSearchedAt(null);
    setHasDirectRoute(null);
  }

  useEffect(() => {
    if (!gpsPosition || !from || !to) return;
    const closestFrom = closestSearchStopId && from.id === closestSearchStopId ? from : from;
    void closestFrom;
  }, [gpsPosition, from, to, closestSearchStopId]);

  function swap() {
    const tmp = from;
    setFrom(to);
    setTo(tmp);
    setResults(null);
    setExpandedRouteId(null);
    setSearchedAt(null);
    setHasDirectRoute(null);
  }

  function search() {
    if (!from || !to) {
      if (!gpsPosition) onRequestGps();
      return;
    }
    if (!gpsPosition) {
      onRequestGps();
      return;
    }
    const now = new Date();
    const directRoutes = ROUTES.filter((route) => getSearchRouteTrip(route, from, to));
    const found = ROUTES
      .filter((route) => getSearchRouteTrip(route, from, to) && isRouteOperatingNow(route, now))
      .sort((a, b) => getSearchRouteTrip(a, from, to)!.count - getSearchRouteTrip(b, from, to)!.count);
    setResults(found);
    setExpandedRouteId(null);
    setSearchedAt(now);
    setHasDirectRoute(directRoutes.length > 0);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-5 pb-4 bg-white border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-extrabold mb-4" style={{ color: "var(--text)" }}>Stop-To-Stop Search</h1>

        {/* From/To inputs */}
        <div className="relative">
          <button
            onClick={() => {
              if (!gpsPosition) onRequestGps();
              setSelecting("from");
            }}
            className="w-full text-left px-4 py-3.5 rounded-2xl border mb-2 flex items-center gap-3"
            style={{
              borderColor: selecting === "from" ? "var(--purple)" : "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className={from ? "text-sm font-medium" : "text-sm"} style={{ color: from ? "var(--text)" : "var(--muted)" }}>
              {from ? from.name : "Select starting stop"}
            </span>
          </button>

          <button
            onClick={swap}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center z-10"
            style={{ color: "var(--purple)" }}
          >
            <Icon path={ICONS.swap} size={16} />
          </button>

          <button
            onClick={() => {
              if (!gpsPosition) onRequestGps();
              setSelecting("to");
            }}
            className="w-full text-left px-4 py-3.5 rounded-2xl border flex items-center gap-3"
            style={{
              borderColor: selecting === "to" ? "var(--purple)" : "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className={to ? "text-sm font-medium" : "text-sm"} style={{ color: to ? "var(--text)" : "var(--muted)" }}>
              {to ? to.name : "Select destination stop"}
            </span>
          </button>
        </div>

        <button
          onClick={search}
          disabled={!from || !to}
          className="w-full mt-3 py-3 rounded-2xl text-sm font-bold text-white transition-opacity"
          style={{ background: from && to ? "var(--purple)" : "var(--muted)", opacity: from && to ? 1 : 0.5 }}
        >
          Search Routes
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 scrollable">
        {results !== null && (
          <div className="p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              {results.length} bus{results.length !== 1 ? "es" : ""} available now
              {searchedAt && <span className="normal-case tracking-normal font-medium"> · checked {searchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center" style={{ color: "var(--muted)" }}>
                {hasDirectRoute
                  ? "A direct bus route exists, but none is operating at this time. Check the service hours or search again later."
                  : "No direct one-way bus route connects these stops."}
              </div>
            ) : (
              results.map((route) => {
                const trip = getSearchRouteTrip(route, from!, to!)!;
                const stopsCount = trip.count;
                const avgTime = stopsCount * 4 + 2;
                return (
                  <div
                    key={route.id}
                    onClick={() => setExpandedRouteId(expandedRouteId === route.id ? null : route.id)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ background: route.color }}
                      >
                        {route.label}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{route.description}</div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>{stopsCount} stop{stopsCount !== 1 ? "s" : ""} · ~{avgTime} min ride</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold" style={{ color: route.color }}>
                          {getArrivals(from!.id + route.id)[0]}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--muted)" }}>min away</div>
                      </div>
                    </div>
                    {/* Mini stop path */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {trip.stops.map((sid, i, arr) => {
                        const s = STOPS[sid];
                        const isEnd = i === 0 || i === arr.length - 1;
                        return (
                          <div key={sid} className="flex items-center gap-1 min-w-0">
                            <div
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ background: isEnd ? route.color : "#DDD" }}
                            />
                            {isEnd && (
                              <span className="text-xs font-medium truncate max-w-20" style={{ color: isEnd ? "var(--text)" : "var(--muted)" }}>
                                {s?.shortName}
                              </span>
                            )}
                            {i < arr.length - 1 && (
                              <div className="flex-1 h-px min-w-4" style={{ background: "#DDD" }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-semibold" style={{ color: route.color }}>
                        {expandedRouteId === route.id ? "Hide complete route" : "View complete route"}
                      </span>
                      <button
                        onClick={(event) => { event.stopPropagation(); onNotify({ route, destination: STOPS[to!.searchIds[0]] }); }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ color: route.color, background: `${route.color}18` }}
                      >
                        Notify me
                      </button>
                    </div>
                    {expandedRouteId === route.id && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                          Complete Route · highlighted section is your journey
                        </div>
                        <div className="space-y-1">
                          {route.stopIds.map((stopId, index) => {
                            const stop = STOPS[stopId];
                            const highlighted = trip.stops.includes(stopId);
                            return (
                              <div
                                key={`${stopId}-${index}`}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                                style={{ background: highlighted ? `${route.color}18` : "transparent", color: highlighted ? route.color : "var(--muted)" }}
                              >
                                <span className="w-4 text-right">{index + 1}</span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: highlighted ? route.color : "#D7D7E2" }} />
                                <span className={highlighted ? "font-semibold" : ""}>{getCanonicalStopName(stop.name)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {results === null && (
          <div className="p-8 text-center" style={{ color: "var(--muted)" }}>
            <Icon path={ICONS.map} size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select your start and destination stops to find available routes</p>
          </div>
        )}
      </div>

      {/* Stop picker sheet */}
      {selecting && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>
          <div className="px-4 pt-4 pb-3 bg-white border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => { setSelecting(null); setQuery(""); }}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg)" }}
              >
                <Icon path={ICONS.x} size={18} />
              </button>
              <span className="text-base font-bold" style={{ color: "var(--text)" }}>
                Select {selecting === "from" ? "Starting" : "Destination"} Stop
              </span>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stops..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
            />
          </div>
          <div className="flex-1 scrollable bg-white">
            {filtered.map((stop) => (
              <button
                key={stop.id}
                onClick={() => handleSelect(stop)}
                className="w-full px-4 py-3.5 border-b text-left flex items-center gap-3 active:bg-gray-50"
                style={{ borderColor: "var(--border)" }}
              >
                <Icon path={ICONS.locate} size={16} className="flex-shrink-0" style={{ color: "var(--purple)" }} />
                <div className="flex-1">
                  <span className="text-sm" style={{ color: "var(--text)" }}>{stop.name}</span>
                  {closestSearchStopId === stop.id && (
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#16A34A" }}>Closest to your current location</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Track Tab (GPS Live Tracking) ──────────────────────────────────────────
function TrackPage({ gpsPosition, gpsError, onRequestGps, userHeading }: { gpsPosition: GeolocationPosition | null; gpsError: string | null; onRequestGps: () => void; userHeading?: number | null }) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [destStop, setDestStop] = useState<Stop | null>(null);
  const [startStop, setStartStop] = useState<Stop | null>(null);
  const [startStopManuallySet, setStartStopManuallySet] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [nearestStop, setNearestStop] = useState<Stop | null>(null);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [stopsAway, setStopsAway] = useState<number | null>(null);
  const [arrivalAlert, setArrivalAlert] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const arrivalAlertStop = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPos = gpsPosition;

  const routeStops = selectedRoute
    ? selectedRoute.stopIds.map((id) => STOPS[id]).filter(Boolean)
    : [];

  // Keep the user's real location separate from the moving demo bus.
  const userSvg: [number, number] | null = useMemo(() => {
    if (userPos) {
      return [userPos.coords.latitude, userPos.coords.longitude];
    }
    return null;
  }, [userPos]);

  const vehiclePos: [number, number] | null = useMemo(() => {
    if (!simulating || routeStops.length === 0) return null;
    const stop = routeStops[simIdx % routeStops.length];
    return [stop.lat, stop.lng];
  }, [simulating, simIdx, routeStops]);

  const trackingPos = vehiclePos ?? userSvg;

  // Find nearest stop on selected route
  useEffect(() => {
    if (!trackingPos || routeStops.length === 0) { setNearestStop(null); return; }
    let nearest = routeStops[0];
    let minDist = Infinity;
    routeStops.forEach((s) => {
      const d = getDistance(trackingPos[0], trackingPos[1], s.lat, s.lng);
      if (d < minDist) { minDist = d; nearest = s; }
    });
    setNearestStop(nearest);
    if (!startStopManuallySet) setStartStop(nearest);
    if (destStop) {
      const ni = routeStops.findIndex((s) => s.id === (startStop?.id ?? nearest.id));
      const di = routeStops.findIndex((s) => s.id === destStop.id);
      setStopsAway(di > ni ? di - ni : null);
    }
  }, [trackingPos, routeStops, destStop, startStop, startStopManuallySet]);

  const highlightPath = useMemo<[number, number][]>(() => {
    if (!routeStops.length || !startStop || !destStop) return [];

    const startIndex = routeStops.findIndex((stop) => stop.id === startStop.id);
    const destinationIndex = routeStops.findIndex((stop) => stop.id === destStop.id);
    if (startIndex < 0 || destinationIndex <= startIndex) return [];

    return routeStops.slice(startIndex, destinationIndex + 1).map((stop) => [stop.lat, stop.lng]);
  }, [routeStops, startStop, destStop]);

  const guidancePoints = useMemo<[number, number][] | null>(() => {
    if (!userSvg || !startStop) return null;
    const distanceFromUserToStart = getDistance(userSvg[0], userSvg[1], startStop.lat, startStop.lng);
    if (distanceFromUserToStart < 25) return null;

    const stepCount = 12;
    return Array.from({ length: stepCount + 1 }, (_, index) => {
      const t = index / stepCount;
      return [
        userSvg[0] + (startStop.lat - userSvg[0]) * t,
        userSvg[1] + (startStop.lng - userSvg[1]) * t,
      ] as [number, number];
    });
  }, [userSvg, startStop]);

  useEffect(() => {
    if (!userSvg || !destStop) return;
    const distance = getDistance(userSvg[0], userSvg[1], destStop.lat, destStop.lng);
    if (distance <= 150 && arrivalAlertStop.current !== destStop.id) {
      arrivalAlertStop.current = destStop.id;
      setArrivalAlert(true);
      playArrivalTone();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("You are nearly there", { body: `${destStop.name} is about ${distance}m away.` });
      }
    }
  }, [userSvg, destStop]);

  useEffect(() => {
    arrivalAlertStop.current = null;
    setArrivalAlert(false);
  }, [destStop?.id]);

  useEffect(() => () => {
    if (simRef.current !== null) clearInterval(simRef.current);
  }, []);

  // Simulation
  function toggleSim() {
    if (simulating) {
      setSimulating(false);
      setSimIdx(0);
      if (simRef.current) clearInterval(simRef.current);
    } else {
      setSimulating(true);
      setSimIdx(0);
      simRef.current = setInterval(() => {
        setSimIdx((i) => (i + 1) % (routeStops.length || 1));
      }, 2000);
    }
  }

  // Stops away alert
  const approaching = stopsAway === 1;

  if (showRoutePicker) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setShowRoutePicker(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
            <Icon path={ICONS.x} size={18} />
          </button>
          <span className="text-base font-bold" style={{ color: "var(--text)" }}>Select Route to Track</span>
        </div>
        <div className="flex-1 scrollable">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => { setSelectedRoute(route); setStartStop(null); setStartStopManuallySet(false); setDestStop(null); setTripStarted(false); setSimulating(false); setShowRoutePicker(false); }}
              className="w-full flex items-center gap-4 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: route.color }}>
                {route.label}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{route.description}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{route.stopIds.length} stops · {route.serviceHours}</div>
              </div>
              {selectedRoute?.id === route.id && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--purple)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const startIndex = startStop ? routeStops.findIndex((stop) => stop.id === startStop.id) : -1;
  const destinationOptions = startIndex >= 0 ? routeStops.slice(startIndex + 1) : [];

  if (showDestPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setShowDestPicker(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
            <Icon path={ICONS.x} size={18} />
          </button>
          <span className="text-base font-bold" style={{ color: "var(--text)" }}>Select Your Stop</span>
        </div>
        <div className="flex-1 scrollable">
          <button
            onClick={() => { setDestStop(null); setShowDestPicker(false); }}
            className="w-full px-4 py-4 border-b text-left text-sm active:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            No destination (just track position)
          </button>
          {destinationOptions.map((stop, idx) => (
            <button
              key={stop.id}
              onClick={() => { setDestStop(stop); setShowDestPicker(false); }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{ borderColor: "var(--border)", background: destStop?.id === stop.id ? "var(--purple-pale)" : "white" }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: destStop?.id === stop.id ? "var(--purple)" : "var(--bg)", color: destStop?.id === stop.id ? "white" : "var(--muted)" }}>
                {idx + 1}
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{stop.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showStartPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setShowStartPicker(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
            <Icon path={ICONS.x} size={18} />
          </button>
          <span className="text-base font-bold" style={{ color: "var(--text)" }}>Select Starting Stop</span>
        </div>
        <div className="flex-1 scrollable">
          {routeStops.map((stop, idx) => (
            <button
              key={`${stop.id}-${idx}`}
              onClick={() => { setStartStop(stop); setStartStopManuallySet(true); setDestStop(null); setShowStartPicker(false); }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{ borderColor: "var(--border)", background: startStop?.id === stop.id ? "var(--purple-pale)" : "white" }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: startStop?.id === stop.id ? "var(--purple)" : "var(--bg)", color: startStop?.id === stop.id ? "white" : "var(--muted)" }}>{idx + 1}</div>
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{getCanonicalStopName(stop.name)}</span>
                {nearestStop?.id === stop.id && (
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#16A34A" }}>Closest to current location</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 bg-white border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>Live Tracker</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: trackingPos ? "#DCFCE7" : "var(--purple-pale)", color: trackingPos ? "#16A34A" : "var(--purple)" }}>
            <div className={`w-1.5 h-1.5 rounded-full ${trackingPos ? "bg-green-500" : "bg-purple-400"}`} />
            {trackingPos ? "Tracking" : "Not tracking"}
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Select a route and track your position — get alerted before your stop.
        </p>
      </div>

      <div className="flex-1 scrollable">
        {arrivalAlert && destStop && (
          <div className="absolute inset-0 z-[90] flex items-center justify-center p-5" style={{ background: "rgba(15,23,42,0.40)" }}>
            <div className="w-full max-w-xs rounded-3xl p-5 shadow-2xl" style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B" }}>
              <div className="flex items-start gap-3">
                <Icon path={ICONS.alert} size={22} style={{ color: "#D97706" }} />
                <div className="flex-1">
                  <div className="text-base font-bold" style={{ color: "#92400E" }}>You are about to arrive</div>
                  <div className="text-sm mt-1" style={{ color: "#B45309" }}>{destStop.name} is nearby.</div>
                </div>
                <button onClick={() => setArrivalAlert(false)} className="text-xs font-bold" style={{ color: "#92400E" }}>Dismiss</button>
              </div>
            </div>
          </div>
        )}
        {/* Approaching alert */}
        {approaching && destStop && (
          <div className="mx-3 mt-3 p-3.5 rounded-2xl flex items-start gap-3 fade-in"
            style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B" }}>
            <Icon path={ICONS.alert} size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
            <div>
              <div className="text-sm font-bold" style={{ color: "#92400E" }}>Approaching your stop!</div>
              <div className="text-xs mt-0.5" style={{ color: "#B45309" }}>{destStop.name} is the next stop. Get ready!</div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-sm bg-white">
          {selectedRoute ? (
            <div className="relative">
              <CampusMap
                routeId={selectedRoute.id}
                userPos={userSvg}
                vehiclePos={vehiclePos}
                highlightPath={highlightPath}
                guidancePoints={guidancePoints ?? undefined}
                focusUser={tripStarted}
                highlightStopId={nearestStop?.id}
                focusStopId={destStop?.id ?? startStop?.id ?? undefined}
                height={tripStarted ? 520 : 240}
                rotation={0}
                userHeading={userHeading ?? 0}
              />
              <div className="absolute right-2 top-2 z-[500] flex gap-1">
                <button
                  onClick={() => {
                    const next = -15;
                    const mapRoot = document.querySelector(".leaflet-container") as HTMLElement | null;
                    if (mapRoot) mapRoot.style.transform = `rotate(${next}deg)`;
                  }}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold"
                  style={{ color: "var(--purple)" }}
                  aria-label="Rotate left"
                >
                  ↺
                </button>
                <button
                  onClick={() => {
                    const next = 15;
                    const mapRoot = document.querySelector(".leaflet-container") as HTMLElement | null;
                    if (mapRoot) mapRoot.style.transform = `rotate(${next}deg)`;
                  }}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold"
                  style={{ color: "var(--purple)" }}
                  aria-label="Rotate right"
                >
                  ↻
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px]" style={{ background: "#E8EDF2" }}>
              <Icon path={ICONS.map} size={40} className="opacity-20 mb-2" />
              <span className="text-sm" style={{ color: "var(--muted)" }}>Select a route to view map</span>
            </div>
          )}
        </div>

        {/* Route selector */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowRoutePicker(true)}
            className="w-full flex items-center gap-4 px-4 py-4"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: selectedRoute ? selectedRoute.color : "var(--muted)" }}>
              {selectedRoute ? selectedRoute.label : <Icon path={ICONS.bus} size={18} />}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {selectedRoute ? `Route ${selectedRoute.label} – ${selectedRoute.description}` : "Select a route"}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {selectedRoute ? `${routeStops.length} stops` : "Tap to choose which bus you're on"}
              </div>
            </div>
            <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
          </button>

          {selectedRoute && (
            <>
              <div className="h-px mx-4" style={{ background: "var(--border)" }} />
              <button
                onClick={() => setShowStartPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--purple-pale)" }}>
                  <Icon path={ICONS.locate} size={18} style={{ color: "var(--purple)" }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{startStop ? getCanonicalStopName(startStop.name) : "Finding your starting stop..."}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{startStopManuallySet ? "Tap to change starting stop" : "Based on your current location"}</div>
                </div>
                <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
              </button>
              <div className="h-px mx-4" style={{ background: "var(--border)" }} />
              <button
                onClick={() => setShowDestPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: destStop ? "#FEF3C7" : "var(--bg)" }}>
                  <Icon path={ICONS.locate} size={18} style={{ color: destStop ? "#D97706" : "var(--muted)" }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {destStop ? destStop.name : "Set destination stop"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {destStop ? "You'll be alerted when approaching" : "Optional: get alerted before your stop"}
                  </div>
                </div>
                <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
              </button>
            </>
          )}
        </div>

        {/* Status card */}
        {selectedRoute && (
          <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
              Current Status
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-xl p-3" style={{ background: "var(--purple-pale)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Current Stop</div>
                <div className="text-sm font-bold" style={{ color: "var(--purple)" }}>
                  {startStop ? getCanonicalStopName(startStop.shortName) : "—"}
                </div>
              </div>
              {destStop && (
                <div className="flex-1 rounded-xl p-3" style={{ background: "#FEF3C7" }}>
                  <div className="text-xs mb-1" style={{ color: "#92400E" }}>Stops to Dest.</div>
                  <div className="text-sm font-bold" style={{ color: "#D97706" }}>
                    {stopsAway !== null ? stopsAway : "—"}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Controls */}
        <div className="mx-3 mt-3">
          {selectedRoute && (
            <button
              onClick={() => setTripStarted((started) => !started)}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
              style={{ background: simulating ? "#DC2626" : "var(--navy)" }}
            >
              <Icon path={tripStarted ? ICONS.stop : ICONS.play} size={16} />
              {tripStarted ? "End Trip" : "Start Trip"}
            </button>
          )}
        </div>

        {gpsError && (
          <div className="mx-3 mt-2 px-4 py-2 rounded-xl text-xs text-center" style={{ background: "#FEF2F2", color: "#DC2626" }}>
            {gpsError}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
function GpsPermissionModal({ onAllow, onCancel }: { onAllow: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-[100] flex items-end" style={{ background: "rgba(15,23,42,0.45)" }}>
      <div className="w-full rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--purple-pale)", color: "var(--purple)" }}>
          <Icon path={ICONS.locate} size={22} />
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Allow location and motion access?</h2>
        <p className="text-sm mt-2 leading-5" style={{ color: "var(--muted)" }}>
          CUHK Bus Routes uses your location and motion/orientation data to show nearby stops, point the user arrow in the right direction, and track your journey accurately. Your data stays in this browser and is not saved by this app.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: "var(--bg)", color: "var(--muted)" }}>Not now</button>
          <button onClick={onAllow} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "var(--purple)" }}>Allow GPS</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>("routes");
  const [gpsPrompt, setGpsPrompt] = useState(false);
  const [journeyNotification, setJourneyNotification] = useState<JourneyNotification | null>(null);
  const [journeyAlert, setJourneyAlert] = useState(false);
  const gps = useGpsLocation();

  const requestGps = useCallback(() => setGpsPrompt(true), []);

  const notifyJourney = useCallback(async (journey: JourneyNotification) => {
    setJourneyNotification(journey);
    setJourneyAlert(false);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (!gps.position) requestGps();
    else gps.start();
  }, [gps, requestGps]);

  useEffect(() => {
    if (!gps.position || !journeyNotification) return;
    const distance = getDistance(
      gps.position.coords.latitude,
      gps.position.coords.longitude,
      journeyNotification.destination.lat,
      journeyNotification.destination.lng,
    );
    if (distance <= 150 && !journeyAlert) {
      setJourneyAlert(true);
      playArrivalTone();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("You are nearly there", { body: `${journeyNotification.destination.name} is about ${distance}m away.` });
      }
    }
  }, [gps.position, journeyNotification, journeyAlert]);

  useEffect(() => {
    if ((tab === "arrival" || tab === "search" || tab === "track") && !gps.position && !gps.error) {
      setGpsPrompt(true);
    }
  }, [tab, gps.position, gps.error]);

  useEffect(() => {
    if (tab === "arrival" || tab === "search") {
      void gps.start();
    }
  }, [tab, gps]);

  return (
    <div
      className="flex flex-col h-full max-w-sm mx-auto relative overflow-hidden"
      style={{ background: "var(--bg)", boxShadow: "0 0 40px rgba(0,0,0,0.08)" }}
    >
      <div className="flex-1 relative overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-200 ${tab === "routes" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
          <RoutesPage />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-200 ${tab === "arrival" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
          <ArrivalPage gpsPosition={gps.position} onRequestGps={requestGps} userHeading={gps.heading} />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-200 ${tab === "search" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
          <SearchPage onNotify={notifyJourney} gpsPosition={gps.position} onRequestGps={requestGps} />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-200 ${tab === "track" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}>
          <TrackPage gpsPosition={gps.position} gpsError={gps.error} onRequestGps={requestGps} userHeading={gps.heading} />
        </div>
      </div>
      <BottomNav active={tab} onChange={setTab} />
      {gpsPrompt && (
        <GpsPermissionModal
          onCancel={() => setGpsPrompt(false)}
          onAllow={() => { setGpsPrompt(false); gps.start(); }}
        />
      )}
      {journeyAlert && journeyNotification && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center p-5" style={{ background: "rgba(15,23,42,0.35)" }}>
          <div className="w-full max-w-xs rounded-3xl p-5 shadow-2xl" style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B" }}>
            <div className="flex items-start gap-3">
              <Icon path={ICONS.alert} size={22} style={{ color: "#D97706" }} />
              <div className="flex-1">
                <div className="text-base font-bold" style={{ color: "#92400E" }}>You are about to arrive</div>
                <div className="text-sm mt-1" style={{ color: "#B45309" }}>{journeyNotification.destination.name} is nearby.</div>
              </div>
              <button onClick={() => setJourneyAlert(false)} className="text-xs font-bold" style={{ color: "#92400E" }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
