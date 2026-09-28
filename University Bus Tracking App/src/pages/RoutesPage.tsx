import { useState } from "react";
import { CampusMap } from "../components/CampusMap";
import { Icon, ICONS } from "../components/Icon";
import { ROUTES, STOPS } from "../data/routes";
import { getArrivals } from "../lib/transit";
import type { Route } from "../types/transit";

export function RoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [highlightStop, setHighlightStop] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const selectStop = (stopId: string) => {
    setHighlightStop(stopId);
    setFocusNonce((value) => value + 1);
  };

  if (selectedRoute) {
    const stops = selectedRoute.stopIds.map((id) => STOPS[id]).filter(Boolean);
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => { setSelectedRoute(null); setHighlightStop(null); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
            <Icon path={ICONS.chevronLeft} size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: selectedRoute.color }}>Route {selectedRoute.label}</span>
            <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>· {selectedRoute.description}</span>
          </div>
          <button onClick={() => setShowDetail(true)} className="text-sm font-semibold px-3 py-1 rounded-full" style={{ color: "var(--purple)", background: "var(--purple-pale)" }}>Info</button>
        </div>

        <div className="relative bg-white shadow-sm">
          <CampusMap
            routeId={selectedRoute.id}
            highlightStopId={highlightStop ?? undefined}
            focusStopId={highlightStop ?? undefined}
            focusNonce={focusNonce}
            height={220}
            onStopClick={(stop) => selectStop(stop.id)}
          />
          <div className="absolute bottom-2 left-2 text-[9px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded">Tap stop to highlight</div>
        </div>

        <div className="flex-1 scrollable bg-white mt-2">
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{stops.length} Stops</span>
          </div>
          {stops.map((stop, index) => {
            const isHighlighted = stop.id === highlightStop;
            const isLast = index === stops.length - 1;
            return (
              <button
                key={`${stop.id}-${index}`}
                onClick={() => selectStop(stop.id)}
                className="w-full flex items-stretch gap-4 px-4 text-left transition-colors"
                style={{ background: isHighlighted ? "var(--purple-pale)" : "white" }}
              >
                <div className="flex w-6 flex-shrink-0 flex-col items-center self-stretch">
                  <div className="w-0.5 flex-shrink-0" style={{ height: 14, background: index === 0 ? "transparent" : isHighlighted ? selectedRoute.color : "#D8D8E4" }} />
                  <div className="relative z-10 w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: isHighlighted ? selectedRoute.color : "#C8C8D8", background: isHighlighted ? selectedRoute.color : "white" }} />
                  {!isLast && <div className="w-0.5 flex-1" style={{ background: isHighlighted ? selectedRoute.color : "#D8D8E4" }} />}
                </div>
                <div className="flex-1 flex items-center gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex-1">
                    <span className="text-sm font-medium" style={{ color: isHighlighted ? selectedRoute.color : "var(--text)" }}>{index + 1}. {stop.name}</span>
                    <div className="flex gap-2 mt-0.5">
                      {getArrivals(stop.id).slice(0, 2).map((minutes, arrivalIndex) => (
                        <span key={arrivalIndex} className="text-xs font-semibold" style={{ color: selectedRoute.color }}>{minutes} min</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          <div className="h-6" />
        </div>

        {showDetail && (
          <div className="absolute inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowDetail(false)}>
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl slide-up overflow-hidden" style={{ background: "var(--bg)" }} onClick={(event) => event.stopPropagation()}>
              <button onClick={() => setShowDetail(false)} className="absolute top-4 left-4 text-sm font-semibold px-4 py-1.5 rounded-full bg-white shadow-sm">Close</button>
              <div className="px-6 pt-14 pb-8" style={{ background: selectedRoute.color }}>
                <div className="text-5xl font-extrabold text-white">{selectedRoute.label}</div>
                <div className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(255,255,255,0.25)", color: "white" }}>{selectedRoute.description}</div>
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
                      <div className="mt-0.5" style={{ color: selectedRoute.color }}><Icon path={icon} size={20} /></div>
                      <div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "white" }}>
      <div className="px-5 pt-6 pb-3"><h1 className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>Route List</h1></div>
      <div className="flex-1 scrollable">
        {ROUTES.map((route) => (
          <button key={route.id} onClick={() => setSelectedRoute(route)} className="w-full flex items-center px-5 py-4 border-b text-left gap-4 active:bg-gray-50" style={{ borderColor: "var(--border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: route.color }}>{route.label}</div>
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