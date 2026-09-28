import { STOPS } from "../data/routes";
import type { Route, SearchStop, Stop } from "../types/transit";

export function getArrivals(stopId: string) {
  const seed = stopId.charCodeAt(0) + stopId.charCodeAt(stopId.length - 1);
  const base = [3, 8, 18, 23, 33];
  return base.map((value) => (value + (seed % 7)) % 60 || 1);
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function sameStopLocation(first: Stop, second: Stop) {
  return Math.abs(first.lat - second.lat) < 0.00001 && Math.abs(first.lng - second.lng) < 0.00001;
}

export function getCanonicalStopName(name: string) {
  return name
    .replace(/\s*\((?:Upward|Downward)\)/gi, "")
    .replace(/\s+(?:Upward|Downward)$/i, "")
    .replace(/\s*\((?:teaching days only|non-teaching days)\)/gi, "")
    .trim();
}

export function getPhysicalStops() {
  return Object.values(STOPS).reduce<Stop[]>((stops, stop) => {
    if (!stops.some((existing) => sameStopLocation(existing, stop))) {
      stops.push({ ...stop, name: getCanonicalStopName(stop.name), shortName: getCanonicalStopName(stop.shortName) });
    }
    return stops;
  }, []);
}

export const SEARCH_STOPS: SearchStop[] = Object.values(STOPS).reduce<SearchStop[]>((stops, stop) => {
  const displayName = getCanonicalStopName(stop.name);
  const existing = stops.find((candidate) => candidate.name === displayName);
  if (existing) {
    existing.searchIds.push(stop.id);
    return stops;
  }
  stops.push({ ...stop, name: displayName, shortName: displayName, searchIds: [stop.id] });
  return stops;
}, []);

export function getSearchRouteTrip(route: Route, from: SearchStop, to: SearchStop) {
  const fromIndexes = from.searchIds.flatMap((id) => route.stopIds.flatMap((stopId, index) => stopId === id ? [index] : []));
  const toIndexes = to.searchIds.flatMap((id) => route.stopIds.flatMap((stopId, index) => stopId === id ? [index] : []));
  const trips: { stops: string[]; count: number }[] = [];

  fromIndexes.forEach((fromIndex) => toIndexes.forEach((toIndex) => {
    if (toIndex <= fromIndex) return;
    const count = toIndex - fromIndex;
    if (trips.some((trip) => trip.count <= count)) return;
    trips.push({ stops: route.stopIds.slice(fromIndex, toIndex + 1), count });
  }));

  return trips.sort((first, second) => first.count - second.count)[0] ?? null;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getOperatingWindow(route: Route, date: Date): [number, number] | null {
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
  const serviceHours: Record<string, [string, string]> = {
    "1": ["07:40", "18:55"],
    "2": ["07:45", "18:45"],
    "2S": ["08:00", "18:30"],
    "3": ["09:00", "18:40"],
    "4": ["07:30", "18:50"],
    "8": ["07:35", "18:35"],
  };
  const hours = serviceHours[route.id];
  return hours ? [toMinutes(hours[0]), toMinutes(hours[1])] : null;
}

export function isRouteOperatingNow(route: Route, date = new Date()) {
  const window = getOperatingWindow(route, date);
  if (!window) return false;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes >= window[0] && currentMinutes <= window[1];
}

export function playArrivalTone() {
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