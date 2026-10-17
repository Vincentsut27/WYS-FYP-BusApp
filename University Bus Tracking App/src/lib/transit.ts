import { STOPS } from "../data/routes";
import type { Route, SearchStop, Stop } from "../types/transit";

export function getArrivals(stopId: string) {
  const seed = stopId.charCodeAt(0) + stopId.charCodeAt(stopId.length - 1);
  const base = [3, 8, 18, 23, 33];
  return base.map((value) => (value + (seed % 7)) % 60 || 1);
}
export function getRouteTravelMinutes(route: Route, stopIndex: number) {
  const elapsedSeconds = route.travelTimesSeconds
    .slice(0, Math.max(0, stopIndex))
    .reduce((total, seconds) => total + seconds, 0);
  return Math.floor((elapsedSeconds + 30) / 60);
}

export function getRouteArrivalMinutes(route: Route, stopIndex: number) {
  const firstArrival = getRouteTravelMinutes(route, stopIndex);
  const departureMinutes = route.frequency.match(/\d+/g)?.map(Number) ?? [];
  const departureInterval =
    departureMinutes.length > 1
      ? (departureMinutes[1] - departureMinutes[0] + 60) % 60
      : (departureMinutes[0] ?? 15);
  return [firstArrival, firstArrival + (departureInterval || 60)];
}

export function getRouteTripMinutes(
  route: Route,
  startIndex: number,
  endIndex: number,
) {
  const tripSeconds = route.travelTimesSeconds
    .slice(startIndex, endIndex)
    .reduce((total, seconds) => total + seconds, 0);
  return Math.floor((tripSeconds + 30) / 60);
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
  const trips: {
    stops: string[];
    count: number;
    startIndex: number;
    endIndex: number;
  }[] = [];

  fromIndexes.forEach((fromIndex) => toIndexes.forEach((toIndex) => {
    if (toIndex <= fromIndex) return;
    const count = toIndex - fromIndex;
    if (trips.some((trip) => trip.count <= count)) return;
    trips.push({
      stops: route.stopIds.slice(fromIndex, toIndex + 1),
      count,
      startIndex: fromIndex,
      endIndex: toIndex,
    });
  }));

  return trips.sort((first, second) => first.count - second.count)[0] ?? null;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const PUBLIC_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-04-03",
  "2026-04-04",
  "2026-04-06",
  "2026-04-07",
  "2026-05-01",
  "2026-05-25",
  "2026-06-19",
  "2026-07-01",
  "2026-09-26",
  "2026-10-01",
  "2026-10-19",
  "2026-12-25",
  "2026-12-26",
]);

function isPublicHoliday(date: Date) {
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return PUBLIC_HOLIDAYS_2026.has(dateKey);
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const WEEKDAY_PATTERN = /\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b(?:\s*[–-]\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b)?/g;

function getScheduledDays(value: string) {
  const days = new Set<number>();
  for (const match of value.matchAll(WEEKDAY_PATTERN)) {
    const firstDay = WEEKDAY_INDEX[match[1]];
    const lastDay = match[2] ? WEEKDAY_INDEX[match[2]] : firstDay;
    for (let day = firstDay; ; day = (day + 1) % 7) {
      days.add(day);
      if (day === lastDay) break;
    }
  }
  return days;
}

function getOperatingWindow(route: Route, date: Date): [number, number] | null {
  const day = date.getDay();
  const publicHoliday = isPublicHoliday(date);
  const operatingDays = route.operatingDays.replace(/\([^)]*\)/g, "");
  const runsOnPublicHolidays =
    /public holidays/i.test(operatingDays) &&
    !/(?:except|suspended).*public holidays/i.test(route.operatingDays);
  const scheduledDays = getScheduledDays(operatingDays);
  if (publicHoliday ? !runsOnPublicHolidays : !scheduledDays.has(day)) {
    return null;
  }

  for (const period of route.serviceHours.split(";")) {
    const timeRange = period.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    if (!timeRange || timeRange.index === undefined) continue;
    const periodDays = getScheduledDays(period.slice(0, timeRange.index));
    if (periodDays.size > 0 && !periodDays.has(day)) continue;
    return [toMinutes(timeRange[1]), toMinutes(timeRange[2])];
  }
  return null;
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