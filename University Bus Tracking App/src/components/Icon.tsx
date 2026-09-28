import type { CSSProperties } from "react";

export function Icon({ path, size = 24, className = "", style }: { path: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d={path} />
    </svg>
  );
}

export const ICONS = {
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
  x: "M18 6L6 18M6 6l12 12",
  play: "M5 3l14 9-14 9V3z",
  stop: "M6 4h4v16H6zm8 0h4v16h-4z",
} as const;