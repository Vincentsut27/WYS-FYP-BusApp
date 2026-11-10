import { formatBuildingName } from "../data/buildings";
import { getCanonicalStopName } from "../lib/transit";
import type { CampusBuilding, Route, Stop } from "../types/transit";
import type { Locale } from "./messages";

const ROUTE_ZH: Record<string, { description: string; title?: string }> = {
  "1": { description: "主校園" },
  "2": { description: "新亞／聯合" },
  "2-runrunshawHall": { description: "新亞／聯合", title: "2（經邵逸夫堂）" },
  "2S": { description: "新亞／聯合（特別班）" },
  "3": { description: "逸夫書院" },
  "4": { description: "環迴路" },
  "5": { description: "上行" },
  "5-sat": { description: "上行", title: "5（星期六班次）" },
  "6A": { description: "下行－敬文" },
  "6A-sat": { description: "下行－敬文", title: "6A（星期六班次）" },
  "6B": { description: "下行－新亞／聯合" },
  "7": { description: "下行－逸夫" },
  "7-sat": { description: "下行－逸夫", title: "7（星期六班次）" },
  "8": { description: "西部校園" },
  "8-nonTeaching": { description: "西部校園", title: "8（非教學日）" },
  N: { description: "夜間服務" },
  H: { description: "假期路線" },
  "H-postgard-area39": { description: "假期路線", title: "H（經39區）" },
  "N-postgrad": { description: "夜間服務", title: "N（經研究生宿舍）" },
};

const OPERATING_DAYS_ZH: Record<string, string> = {
  "Mon – Sat (Suspended on Sunday & Public Holidays)": "星期一至六（星期日及公眾假期停駛）",
  "Mon – Fri (Teaching days only)": "星期一至五（只限教學日）",
  "Sat (Teaching days only)": "星期六（只限教學日）",
  "Mon – Sat (Teaching days only)": "星期一至六（只限教學日）",
  "Sun & Public Holidays": "星期日及公眾假期",
};

export function stopLabel(stop: Pick<Stop, "name" | "nameZh"> | null | undefined, locale: Locale) {
  if (!stop) return "";
  return locale === "zh-Hant" ? stop.nameZh : getCanonicalStopName(stop.name);
}

export function buildingLabel(building: CampusBuilding, locale: Locale) {
  return formatBuildingName(building, locale);
}

export function routeTitle(route: Pick<Route, "id" | "label" | "title">, locale: Locale) {
  if (locale === "zh-Hant") return ROUTE_ZH[route.id]?.title ?? route.label;
  return route.title ?? route.label;
}

export function routeDescription(route: Pick<Route, "id" | "description">, locale: Locale) {
  if (locale === "zh-Hant") return ROUTE_ZH[route.id]?.description ?? route.description;
  return route.description;
}

export function routeHeading(route: Route, locale: Locale) {
  if (locale === "zh-Hant" && ROUTE_ZH[route.id]?.title) return ROUTE_ZH[route.id].title!;
  return locale === "zh-Hant" ? routeDescription(route, locale) : (route.title ?? route.description);
}

export function operatingDays(value: string, locale: Locale) {
  if (locale !== "zh-Hant") return value;
  return OPERATING_DAYS_ZH[value] ?? value;
}

export function serviceHours(value: string, locale: Locale) {
  if (locale !== "zh-Hant") return value;
  return value.replace(/^Mon–Fri /, "星期一至五 ").replace(/^Sat /, "星期六 ");
}

export function frequency(route: Route, locale: Locale) {
  if (locale !== "zh-Hant") return route.frequency;
  if (route.departureMinutes?.length) {
    const minutes = route.departureMinutes
      .map((minute) => String(minute).padStart(2, "0"))
      .join("、");
    return `每小時的 ${minutes} 分`;
  }
  if (route.departureIntervals?.length) {
    return `相隔 ${route.departureIntervals.join("、")} 分鐘`;
  }
  const numbers = route.frequency.match(/\d+/g);
  if (numbers?.length === 1) return `每 ${numbers[0]} 分鐘`;
  return route.frequency;
}
