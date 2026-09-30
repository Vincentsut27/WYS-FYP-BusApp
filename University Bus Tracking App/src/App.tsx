import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav, type TabId } from "./components/BottomNav";
import { GpsPermissionModal } from "./components/GpsPermissionModal";
import { Icon, ICONS } from "./components/Icon";
import { useGpsLocation } from "./hooks/useGpsLocation";
import { ArrivalPage } from "./pages/ArrivalPage";
import { RoutesPage } from "./pages/RoutesPage";
import { SearchPage } from "./pages/SearchPage";
import { TrackPage } from "./pages/TrackPage";
import { playArrivalTone } from "./lib/transit";
import type { JourneyNotification, Route, SearchStop } from "./types/transit";

export default function App() {
  const [tab, setTab] = useState<TabId>("routes");
  const [gpsPrompt, setGpsPrompt] = useState(false);
  const [journeyNotification, setJourneyNotification] =
    useState<JourneyNotification | null>(null);
  const [journeyAlert, setJourneyAlert] = useState(false);
  const journeyTimerRef = useRef<number | null>(null);
  const [trackPreset, setTrackPreset] = useState<{
    routeId: string;
    startStopId: string;
    endStopId: string;
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
  const notifyJourney = useCallback(async (journey: JourneyNotification) => {
    let permission: NotificationPermission | "unsupported" = "unsupported";
    if (window.isSecureContext && "Notification" in window) {
      permission = Notification.permission;
      if (permission === "default") {
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = "denied";
        }
      }
    }
    if (journeyTimerRef.current !== null) {
      window.clearTimeout(journeyTimerRef.current);
    }
    setJourneyNotification(journey);
    setJourneyAlert(false);
    journeyTimerRef.current = window.setTimeout(() => {
      journeyTimerRef.current = null;
      setJourneyAlert(true);
      playArrivalTone();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Bus arriving", {
          body: `Route ${journey.route.label} is arriving at ${journey.origin.name}. Head to the stop.`,
        });
      }
    }, journey.arrivalMinutes * 60_000);
    return permission;
  }, []);

  useEffect(() => {
    return () => {
      if (journeyTimerRef.current !== null) {
        window.clearTimeout(journeyTimerRef.current);
      }
    };
  }, []);

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
              <RoutesPage />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "arrival" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <ArrivalPage
                gpsPosition={gps.position}
                onRequestGps={requestGps}
                userHeading={gps.heading}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "search" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <SearchPage
                onNotify={notifyJourney}
                onTrackRoute={handleTrackRoute}
                gpsPosition={gps.position}
                onRequestGps={requestGps}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${tab === "track" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              <TrackPage
                gpsPosition={gps.position}
                gpsError={gps.error}
                userHeading={gps.heading}
                presetRouteId={trackPreset?.routeId}
                presetStartStopId={trackPreset?.startStopId}
                presetDestStopId={trackPreset?.endStopId}
              />
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
      {journeyAlert && journeyNotification && (
        <div
          className="absolute inset-0 z-[90] flex items-center justify-center p-5"
          style={{ background: "rgba(15,23,42,0.35)" }}
        >
          <div
            className="w-full max-w-xs rounded-3xl p-5 shadow-2xl"
            style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B" }}
          >
            <div className="flex items-start gap-3">
              <Icon path={ICONS.alert} size={22} style={{ color: "#D97706" }} />
              <div className="flex-1">
                <div
                  className="text-base font-bold"
                  style={{ color: "#92400E" }}
                >
                  Bus arriving
                </div>
                <div className="text-sm mt-1" style={{ color: "#B45309" }}>
                  Route {journeyNotification.route.label} is arriving at{" "}
                  {journeyNotification.origin.name}.
                </div>
              </div>
              <button
                onClick={() => {
                  setJourneyAlert(false);
                  setJourneyNotification(null);
                }}
                className="text-xs font-bold"
                style={{ color: "#92400E" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
