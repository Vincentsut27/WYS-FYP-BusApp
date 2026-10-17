import { useCallback, useEffect, useState } from "react";
import { BottomNav, type TabId } from "./components/BottomNav";
import { GpsPermissionModal } from "./components/GpsPermissionModal";
import { AboutPage } from "./pages/AboutPage";
import { useGpsLocation } from "./hooks/useGpsLocation";
import { ArrivalPage } from "@/pages/ArrivalPage";
import { RoutesPage } from "./pages/RoutesPage";
import { SearchPage } from "./pages/SearchPage";
import { TrackPage } from "./pages/TrackPage";
import type { Route, SearchStop } from "./types/transit";

export default function App() {
  const [tab, setTab] = useState<TabId>("routes");
  const [gpsPrompt, setGpsPrompt] = useState(false);
  const [trackPreset, setTrackPreset] = useState<{
    routeId: string;
    startStopId: string;
    endStopId: string;
  } | null>(null);
  const [routeFocusPreset, setRouteFocusPreset] = useState<{
    routeId: string;
    stopId: string;
  } | null>(null);
  const trackerOnly = new URLSearchParams(window.location.search).has(
    "tracker",
  );
  const gps = useGpsLocation();

  const handleTrackRoute = (route: Route, from: SearchStop, to: SearchStop) => {
    const startStopId =
      from.searchIds.find((stopId) => route.stopIds.includes(stopId)) ??
      from.searchIds[0];
    const endStopId =
      to.searchIds.find((stopId) => route.stopIds.includes(stopId)) ??
      to.searchIds[0];
    setTrackPreset({ routeId: route.id, startStopId, endStopId });
    setTab("track");
  };

  const requestGps = useCallback(() => setGpsPrompt(true), []);
  const handleArrivalRoute = useCallback((routeId: string, stopId: string) => {
    setRouteFocusPreset({ routeId, stopId });
    setTab("routes");
  }, []);
  const clearRouteFocusPreset = useCallback(
    () => setRouteFocusPreset(null),
    [],
  );
  useEffect(() => {
    if (
      (trackerOnly ||
        tab === "arrival" ||
        tab === "search" ||
        tab === "track") &&
      !gps.position &&
      !gps.error
    ) {
      setGpsPrompt(true);
    }
  }, [tab, gps.position, gps.error, trackerOnly]);

  return (
    <div
      className="flex flex-col h-full max-w-sm mx-auto relative overflow-hidden"
      style={{
        background: "var(--bg)",
        boxShadow: "0 0 40px rgba(0,0,0,0.08)",
      }}
    >
      {trackerOnly ? (
        <div className="flex-1 relative overflow-hidden">
          <TrackPage
            gpsPosition={gps.position}
            gpsError={gps.error}
            userHeading={gps.heading}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "routes" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <RoutesPage
                presetRouteId={routeFocusPreset?.routeId}
                presetStopId={routeFocusPreset?.stopId}
                onPresetApplied={clearRouteFocusPreset}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "arrival" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <ArrivalPage
                gpsPosition={gps.position}
                onRequestGps={requestGps}
                userHeading={gps.heading}
                onSelectRoute={handleArrivalRoute}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "search" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <SearchPage
                onTrackRoute={handleTrackRoute}
                gpsPosition={gps.position}
                onRequestGps={requestGps}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "track" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <TrackPage
                isActive={tab === "track"}
                gpsPosition={gps.position}
                gpsError={gps.error}
                userHeading={gps.heading}
                presetRouteId={trackPreset?.routeId}
                presetStartStopId={trackPreset?.startStopId}
                presetDestStopId={trackPreset?.endStopId}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "about" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <AboutPage />
            </div>
          </div>
          <BottomNav active={tab} onChange={setTab} />
        </>
      )}
      {gpsPrompt && (
        <GpsPermissionModal
          onCancel={() => setGpsPrompt(false)}
          onAllow={() => {
            setGpsPrompt(false);
            void gps.start();
          }}
        />
      )}
    </div>
  );
}
