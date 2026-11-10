import { useEffect, useMemo, useRef, useState } from "react";
import { CampusMap } from "../components/CampusMap";
import { Icon, ICONS } from "../components/Icon";
import { CAMPUS_BUILDINGS } from "../data/buildings";
import { ROUTES, STOPS } from "../data/routes";
import {
  buildingLabel,
  routeDescription,
  routeHeading,
  routeTitle,
  serviceHours,
  stopLabel,
} from "../i18n/content";
import { useI18n } from "../i18n/LanguageProvider";
import { localizeSystemMessage } from "../i18n/messages";
import { useBusLocationSharing } from "../hooks/useBusLocationSharing";
import { useRouteGeometry } from "../hooks/useRouteGeometry";
import { useTripProgress } from "../hooks/useTripProgress";
import { LIVE_ETA_ENABLED } from "../lib/featureFlags";
import {
  getDistance,
  playArrivalTone,
} from "../lib/transit";
import { supabase } from "../lib/supabase";
import type { CampusBuilding, Route, Stop } from "../types/transit";

const TRIP_SURVEY_SEEN_KEY = "cuhk-bus-trip-survey-seen";

type ArrivalNotice =
  | { kind: "getOff"; stopId: string; buildingId: string }
  | { kind: "stop"; stopId: string }
  | { kind: "building"; buildingId: string };
const GUIDANCE_HIDE_METERS = 13;
const DEST_STOP_ALERT_METERS = 75;

export function TrackPage({
  isActive = true,
  gpsPosition,
  filteredGpsPosition,
  gpsError,
  userHeading,
  presetRouteId,
  presetStartStopId,
  presetDestStopId,
  presetStartStopIndex,
  presetDestStopIndex,
  presetDestBuildingId,
  presetRevision,
}: {
  isActive?: boolean;
  gpsPosition: GeolocationPosition | null;
  filteredGpsPosition: GeolocationPosition | null;
  gpsError: string | null;
  userHeading?: number | null;
  presetRouteId?: string;
  presetStartStopId?: string;
  presetDestStopId?: string;
  presetStartStopIndex?: number;
  presetDestStopIndex?: number;
  presetDestBuildingId?: string;
  presetRevision?: number;
}) {
  const { locale, t } = useI18n();
  const tRef = useRef(t);
  const localeRef = useRef(locale);
  tRef.current = t;
  localeRef.current = locale;
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [destStop, setDestStop] = useState<Stop | null>(null);
  const [destinationBuilding, setDestinationBuilding] =
    useState<CampusBuilding | null>(null);
  const [buildingWalkStarted, setBuildingWalkStarted] = useState(false);
  const [buildingGuidanceDismissed, setBuildingGuidanceDismissed] =
    useState(false);
  const [destStopRouteIndex, setDestStopRouteIndex] = useState<number | null>(
    null,
  );
  const [startStop, setStartStop] = useState<Stop | null>(null);
  const [startGuidanceDismissed, setStartGuidanceDismissed] = useState(false);
  const [startStopRouteIndex, setStartStopRouteIndex] = useState<number | null>(
    null,
  );
  const [startStopManuallySet, setStartStopManuallySet] = useState(false);
  const [nearestStopRouteIndex, setNearestStopRouteIndex] = useState<
    number | null
  >(null);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [stopsAway, setStopsAway] = useState<number | null>(null);
  const [stopAlert, setStopAlert] = useState<ArrivalNotice | null>(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [hasSeenTripSurvey, setHasSeenTripSurvey] = useState(
    () => window.localStorage.getItem(TRIP_SURVEY_SEEN_KEY) === "true",
  );
  const [arrivalNotificationsEnabled, setArrivalNotificationsEnabled] =
    useState(false);
  const [notificationPermissionMessage, setNotificationPermissionMessage] =
    useState<string | null>(null);
  const [showTripSurvey, setShowTripSurvey] = useState(false);
  const [surveyExpanded, setSurveyExpanded] = useState(false);
  const [surveyRating, setSurveyRating] = useState<number | null>(null);
  const [surveyExperience, setSurveyExperience] = useState("");
  const [surveySuggestion, setSurveySuggestion] = useState("");
  const [surveyStatus, setSurveyStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [surveyPendingAfterArrival, setSurveyPendingAfterArrival] = useState(false);
  const [shareTripProgress, setShareTripProgress] = useState(false);
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null);
  const [tripStopIndex, setTripStopIndex] = useState<number | null>(null);
  const [tripStartStopIndex, setTripStartStopIndex] = useState<number | null>(
    null,
  );
  const [mapRotation, setMapRotation] = useState(0);
  const appliedPresetRevisionRef = useRef<number | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const routeStops = selectedRoute
    ? selectedRoute.stopIds.map((id) => STOPS[id]).filter(Boolean)
    : [];
  const routePoints = routeStops.map(
    (stop) => [stop.lat, stop.lng] as [number, number],
  );
  const routeGeometry = useRouteGeometry(selectedRoute?.id, routePoints);
  const userPosition: [number, number] | null = gpsPosition
    ? [gpsPosition.coords.latitude, gpsPosition.coords.longitude]
    : null;
  const trackingPosition = userPosition;
  const tripProgress = useTripProgress(
    routeGeometry,
    filteredGpsPosition,
    tripStarted,
    tripStartStopIndex,
  );
  const busLocationSharing = useBusLocationSharing(
    LIVE_ETA_ENABLED && shareTripProgress && tripStarted,
    selectedRoute?.id,
    anonymousToken,
    gpsPosition,
    userHeading ?? gpsPosition?.coords.heading ?? null,
    tripProgress.progressMeters,
  );

  const endTrip = (arrivalAlert: ArrivalNotice | null = null) => {
    setTripStarted(false);
    setShareTripProgress(false);
    setAnonymousToken(null);
    setTripStopIndex(null);
    setTripStartStopIndex(null);
    setBuildingWalkStarted(false);
    setStopAlert(arrivalAlert);
    setSurveyRating(null);
    setSurveyExperience("");
    setSurveySuggestion("");
    setSurveyExpanded(false);
    setSurveyStatus("idle");
    setSurveyError(null);
    const shouldPromptForSurvey = !hasSeenTripSurvey;
    setSurveyPendingAfterArrival(Boolean(arrivalAlert && shouldPromptForSurvey));
    setShowTripSurvey(!arrivalAlert && shouldPromptForSurvey);
    if (!arrivalAlert && shouldPromptForSurvey) {
      window.localStorage.setItem(TRIP_SURVEY_SEEN_KEY, "true");
      setHasSeenTripSurvey(true);
    }
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const requestArrivalNotifications = async () => {
    setNotificationPermissionMessage(null);
    if (!window.isSecureContext) {
      setNotificationPermissionMessage(
        t("httpsNeeded"),
      );
      return;
    }
    if (!("Notification" in window)) {
      setNotificationPermissionMessage(
        t("notificationsUnavailable"),
      );
      return;
    }
    if (Notification.permission === "denied") {
      setArrivalNotificationsEnabled(false);
      setNotificationPermissionMessage(
        t("notificationsBlocked"),
      );
      return;
    }
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission === "granted") {
        setArrivalNotificationsEnabled(true);
      } else {
        setArrivalNotificationsEnabled(false);
        setNotificationPermissionMessage(
          permission === "denied"
            ? t("notificationsBlocked")
            : t("notificationsNoChoice"),
        );
      }
    } catch {
      setArrivalNotificationsEnabled(false);
      setNotificationPermissionMessage(
        t("notificationsUnable"),
      );
    }
  };

  const submitTripSurvey = async () => {
    if (!supabase || surveyRating === null) {
      setSurveyError(t("surveyUnavailable"));
      setSurveyStatus("error");
      return;
    }
    setSurveyStatus("submitting");
    setSurveyError(null);
    try {
      const { error } = await supabase.from("trip_feedback").insert({
        route_id: selectedRoute?.id ?? null,
        rating: surveyRating,
        experience: surveyExpanded ? surveyExperience || null : null,
        suggestion: surveyExpanded ? surveySuggestion.trim() || null : null,
      });
      if (error) throw error;
      setSurveyStatus("success");
    } catch {
      setSurveyStatus("error");
      setSurveyError(t("surveyFailed"));
    }
  };
  useEffect(() => {
    if (!trackingPosition || routeStops.length === 0) {
      setNearestStopRouteIndex(null);
      return;
    }
    let nearest = routeStops[0];
    let nearestRouteIndex = 0;
    let minimumDistance = Infinity;
    routeStops.forEach((stop, index) => {
      const distance = getDistance(
        trackingPosition[0],
        trackingPosition[1],
        stop.lat,
        stop.lng,
      );
      if (distance < minimumDistance) {
        minimumDistance = distance;
        nearest = stop;
        nearestRouteIndex = index;
      }
    });
    setNearestStopRouteIndex(nearestRouteIndex);
    if (!startStopManuallySet && !tripStarted) {
      setStartStop(nearest);
      setStartStopRouteIndex(nearestRouteIndex);
    }
    if (destStop) {
      const nearestIndex =
        tripStarted && tripStopIndex !== null
          ? tripStopIndex
          : (startStopRouteIndex ?? nearestRouteIndex);
      const destinationIndex =
        destStopRouteIndex ??
        routeStops.findIndex((stop) => stop.id === destStop.id);
      setStopsAway(
        destinationIndex > nearestIndex
          ? destinationIndex - nearestIndex
          : null,
      );
    }
  }, [
    trackingPosition,
    routeStops,
    destStop,
    destStopRouteIndex,
    startStop,
    startStopRouteIndex,
    startStopManuallySet,
    tripStarted,
    tripStopIndex,
  ]);

  useEffect(() => {
    if (!tripStarted || tripProgress.currentStopIndex === null) return;
    setTripStopIndex((current) =>
      current === null
        ? tripProgress.currentStopIndex
        : Math.max(current, tripProgress.currentStopIndex!),
    );
  }, [tripStarted, tripProgress.currentStopIndex]);

  useEffect(() => {
    if (trackingPosition || !startStop || !destStop || routeStops.length === 0)
      return;
    const startIndex =
      startStopRouteIndex ??
      routeStops.findIndex((stop) => stop.id === startStop.id);
    const destinationIndex =
      destStopRouteIndex ??
      routeStops.findIndex((stop) => stop.id === destStop.id);
    setStopsAway(
      destinationIndex > startIndex ? destinationIndex - startIndex : null,
    );
  }, [
    trackingPosition,
    startStop,
    startStopRouteIndex,
    destStop,
    destStopRouteIndex,
    routeStops,
  ]);

  const highlightPath = useMemo<[number, number][]>(() => {
    if (!destStop) return [];

    const currentStop =
      tripStarted && tripStopIndex !== null
        ? routeStops[tripStopIndex]
        : startStop;
    if (!routeStops.length || !currentStop) return [];
    const startIndex =
      tripStarted && tripStopIndex !== null
        ? tripStopIndex
        : (startStopRouteIndex ??
          routeStops.findIndex((stop) => stop.id === currentStop.id));
    const destinationIndex =
      destStopRouteIndex ??
      routeStops.findIndex((stop) => stop.id === destStop.id);
    if (startIndex < 0 || destinationIndex <= startIndex) return [];
    return routeStops
      .slice(startIndex, destinationIndex + 1)
      .map((stop) => [stop.lat, stop.lng]);
  }, [
    routeStops,
    startStop,
    startStopRouteIndex,
    destStop,
    destStopRouteIndex,
    tripStarted,
    tripStopIndex,
  ]);

  const activeStop =
    tripStarted && tripStopIndex !== null
      ? routeStops[tripStopIndex]
      : startStop;
  const nextStop =
    tripStarted && tripStopIndex !== null
      ? routeStops[tripStopIndex + 1]
      : null;

  const guidancePoints = useMemo<[number, number][] | null>(() => {
    if (!userPosition || !startStop || startGuidanceDismissed) return null;
    return [userPosition, [startStop.lat, startStop.lng]];
  }, [userPosition, startStop, startGuidanceDismissed]);
  const buildingGuidancePoints = useMemo<[number, number][] | null>(() => {
    if (!destStop || !destinationBuilding) return null;
    return [
      [destStop.lat, destStop.lng],
      [destinationBuilding.lat, destinationBuilding.lng],
    ];
  }, [destStop, destinationBuilding]);

  useEffect(() => {
    if (!userPosition || !startStop || startGuidanceDismissed) return;
    if (
      getDistance(
        userPosition[0],
        userPosition[1],
        startStop.lat,
        startStop.lng,
      ) <= GUIDANCE_HIDE_METERS
    ) {
      setStartGuidanceDismissed(true);
    }
  }, [userPosition, startStop, startGuidanceDismissed]);

  const startTrip = () => {
    if (!selectedRoute) {
      setShowStartPrompt(false);
      setShowRoutePicker(true);
      return;
    }
    const selectedStartIndex =
      startStopRouteIndex ??
      routeStops.findIndex((stop) => stop.id === startStop?.id);
    const initialStopIndex = selectedStartIndex >= 0 ? selectedStartIndex : 0;
    setAnonymousToken(
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    setShareTripProgress(LIVE_ETA_ENABLED);
    setTripStartStopIndex(initialStopIndex);
    setTripStopIndex(initialStopIndex);
    setTripStarted(true);
    setShowStartPrompt(false);
  };

  useEffect(() => {
    if (!isActive || tripStarted || showTripSurvey || stopAlert) {
      setShowStartPrompt(false);
      return;
    }
    const timer = window.setTimeout(() => setShowStartPrompt(true), 5000);
    return () => window.clearTimeout(timer);
  }, [isActive, tripStarted, showTripSurvey, stopAlert]);

  const destinationRouteIndex =
    destStopRouteIndex ??
    (destStop ? routeStops.findIndex((stop) => stop.id === destStop.id) : -1);
  useEffect(() => {
    if (
      (presetRouteId &&
        appliedPresetRevisionRef.current !== (presetRevision ?? 0)) ||
      !tripStarted ||
      !destStop ||
      destinationRouteIndex < 0
    )
      return;

    const startIndex = tripStartStopIndex ?? 0;
    const reachedAlongRoute =
      tripProgress.confident &&
      tripProgress.currentStopIndex !== null &&
      tripProgress.currentStopIndex >= destinationRouteIndex;
    const distanceToDest = userPosition
      ? getDistance(
          userPosition[0],
          userPosition[1],
          destStop.lat,
          destStop.lng,
        )
      : Infinity;
    const leftStart =
      tripProgress.currentStopIndex !== null &&
      tripProgress.currentStopIndex > startIndex
        ? true
        : Boolean(
            startStop &&
              userPosition &&
              getDistance(
                userPosition[0],
                userPosition[1],
                startStop.lat,
                startStop.lng,
              ) > 80,
          );
    const nearDestStop =
      distanceToDest <= DEST_STOP_ALERT_METERS && leftStart;
    if (!reachedAlongRoute && !nearDestStop) return;

    if (destinationBuilding) {
      if (buildingWalkStarted) return;
      setBuildingWalkStarted(true);
      setShareTripProgress(false);
      const getOffAlert: ArrivalNotice = {
        kind: "getOff",
        stopId: destStop.id,
        buildingId: destinationBuilding.id,
      };
      setStopAlert(getOffAlert);
      if (arrivalNotificationsEnabled) playArrivalTone();
      if (
        arrivalNotificationsEnabled &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const copy = tRef.current;
        const activeLocale = localeRef.current;
        new Notification(copy("getOffTitle", { stop: stopLabel(destStop, activeLocale) }), {
          body: copy("getOffBody", { building: buildingLabel(destinationBuilding, activeLocale) }),
        });
      }
      return;
    }

    const arrivalAlert: ArrivalNotice = { kind: "stop", stopId: destStop.id };
    endTrip(arrivalAlert);
    if (arrivalNotificationsEnabled) playArrivalTone();
    if (
      arrivalNotificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const copy = tRef.current;
      new Notification(copy("arrivedTitle"), {
        body: copy("arrivedStopBody", { stop: stopLabel(destStop, localeRef.current) }),
      });
    }
  }, [
    tripStarted,
    destStop,
    destinationBuilding,
    buildingWalkStarted,
    destinationRouteIndex,
    tripProgress.confident,
    tripProgress.currentStopIndex,
    arrivalNotificationsEnabled,
    presetRouteId,
    presetRevision,
    tripStartStopIndex,
    userPosition,
    startStop,
  ]);

  useEffect(() => {
    if (
      !tripStarted ||
      !buildingWalkStarted ||
      !destinationBuilding ||
      !userPosition ||
      getDistance(
        userPosition[0],
        userPosition[1],
        destinationBuilding.lat,
        destinationBuilding.lng,
      ) > GUIDANCE_HIDE_METERS
    ) {
      return;
    }

    const arrivalAlert: ArrivalNotice = {
      kind: "building",
      buildingId: destinationBuilding.id,
    };
    setBuildingWalkStarted(false);
    setBuildingGuidanceDismissed(true);
    setShareTripProgress(false);
    endTrip(arrivalAlert);
    if (arrivalNotificationsEnabled) playArrivalTone();
    if (
      arrivalNotificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(tRef.current("arrivedTitle"), {
        body: tRef.current("arrivedBuildingBody", {
          building: buildingLabel(destinationBuilding, localeRef.current),
        }),
      });
    }
  }, [
    tripStarted,
    buildingWalkStarted,
    destinationBuilding,
    userPosition,
    arrivalNotificationsEnabled,
  ]);

  useEffect(() => {
    setStopAlert(null);
    setArrivalNotificationsEnabled(false);
    setNotificationPermissionMessage(null);
  }, [destStop?.id, destStopRouteIndex]);

  useEffect(() => {
    if (!presetRouteId) return;
    const presetRoute = ROUTES.find((route) => route.id === presetRouteId);
    if (!presetRoute) return;

    const startId = presetStartStopId ?? presetRoute.stopIds[0];
    const endId =
      presetDestStopId ?? presetRoute.stopIds[presetRoute.stopIds.length - 1];
    const startIndex =
      presetStartStopIndex !== undefined &&
      presetRoute.stopIds[presetStartStopIndex] === startId
        ? presetStartStopIndex
        : presetRoute.stopIds.indexOf(startId);
    const endIndex =
      presetDestStopIndex !== undefined &&
      presetRoute.stopIds[presetDestStopIndex] === endId
        ? presetDestStopIndex
        : presetRoute.stopIds.indexOf(endId);

    appliedPresetRevisionRef.current = presetRevision ?? 0;
    setStopAlert(null);
    setSelectedRoute(presetRoute);
    setStartStop(STOPS[startId] ?? null);
    setStartGuidanceDismissed(false);
    setStartStopRouteIndex(startIndex >= 0 ? startIndex : null);
    setStartStopManuallySet(true);
    setDestStop(endIndex >= 0 ? (STOPS[endId] ?? null) : null);
    setDestStopRouteIndex(endIndex >= 0 ? endIndex : null);
    setDestinationBuilding(
      CAMPUS_BUILDINGS.find((building) => building.id === presetDestBuildingId) ??
        null,
    );
    setBuildingWalkStarted(false);
    setBuildingGuidanceDismissed(false);
    setTripStarted(false);
    setShareTripProgress(false);
    setAnonymousToken(null);
    setTripStopIndex(null);
    setTripStartStopIndex(null);
    setShowRoutePicker(false);
    setShowDestPicker(false);
    setShowStartPicker(false);
  }, [
    presetRouteId,
    presetStartStopId,
    presetDestStopId,
    presetStartStopIndex,
    presetDestStopIndex,
    presetDestBuildingId,
    presetRevision,
  ]);

  useEffect(() => setMapRotation(0), [selectedRoute?.id]);

  const arrivalCopy = (notice: ArrivalNotice) => {
    if (notice.kind === "getOff") {
      const building = CAMPUS_BUILDINGS.find((item) => item.id === notice.buildingId);
      return {
        title: t("getOffTitle", { stop: stopLabel(STOPS[notice.stopId], locale) }),
        body: t("getOffBody", { building: building ? buildingLabel(building, locale) : "" }),
      };
    }
    if (notice.kind === "stop") {
      return {
        title: t("arrivedTitle"),
        body: t("arrivedStopBody", { stop: stopLabel(STOPS[notice.stopId], locale) }),
      };
    }
    const building = CAMPUS_BUILDINGS.find((item) => item.id === notice.buildingId);
    return {
      title: t("arrivedTitle"),
      body: t("arrivedBuildingBody", { building: building ? buildingLabel(building, locale) : "" }),
    };
  };

  if (showRoutePicker) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowRoutePicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            {t("selectRouteTrack")}
          </span>
        </div>
        <div className="flex-1 scrollable">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => {
                setSelectedRoute(route);
                setDestinationBuilding(null);
                setBuildingWalkStarted(false);
                setStartStop(null);
                setStartStopRouteIndex(null);
                setStartGuidanceDismissed(false);
                setStartStopManuallySet(false);
                setDestStop(null);
                setDestStopRouteIndex(null);
                setTripStarted(false);
                setShareTripProgress(false);
                setAnonymousToken(null);
                setTripStopIndex(null);
                setTripStartStopIndex(null);
                setShowRoutePicker(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: route.color }}
              >
                {route.label}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {routeHeading(route, locale)}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {t("stopCountShort", { count: route.stopIds.length })} · {serviceHours(route.serviceHours, locale)}
                </div>
              </div>
              {selectedRoute?.id === route.id && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--purple)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M2 5l2.5 2.5L8 2.5"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const startIndex = startStop
    ? (startStopRouteIndex ??
      routeStops.findIndex((stop) => stop.id === startStop.id))
    : -1;
  const destinationOptions =
    startIndex >= 0 ? routeStops.slice(startIndex + 1) : [];

  if (showDestPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowDestPicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            {t("selectYourStop")}
          </span>
        </div>
        <div className="flex-1 scrollable">
          <button
            onClick={() => {
              setDestStop(null);
              setDestStopRouteIndex(null);
              setDestinationBuilding(null);
              setBuildingWalkStarted(false);
              setShowDestPicker(false);
            }}
            className="w-full px-4 py-4 border-b text-left text-sm active:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            {t("noDestination")}
          </button>
          {destinationOptions.map((stop, index) => (
            <button
              key={`${stop.id}-${index}`}
              onClick={() => {
                setDestStop(stop);
                setDestinationBuilding(null);
                setBuildingWalkStarted(false);
                setDestStopRouteIndex(startIndex + index + 1);
                setShowDestPicker(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{
                borderColor: "var(--border)",
                background:
                  destStopRouteIndex === startIndex + index + 1
                    ? "var(--purple-pale)"
                    : "white",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background:
                    destStopRouteIndex === startIndex + index + 1
                      ? "var(--purple)"
                      : "var(--bg)",
                  color:
                    destStopRouteIndex === startIndex + index + 1
                      ? "white"
                      : "var(--muted)",
                }}
              >
                {index + 1}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                {stopLabel(stop, locale)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showStartPicker && selectedRoute) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setShowStartPicker(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <Icon path={ICONS.x} size={18} />
          </button>
          <span
            className="text-base font-bold"
            style={{ color: "var(--text)" }}
          >
            {t("selectStartingStop")}
          </span>
        </div>
        <div className="flex-1 scrollable">
          {routeStops.map((stop, index) => (
            <button
              key={`${stop.id}-${index}`}
              onClick={() => {
                setStartStop(stop);
                setStartStopRouteIndex(index);
                setStartGuidanceDismissed(false);
                setStartStopManuallySet(true);
                setBuildingWalkStarted(false);
                setShowStartPicker(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-4 border-b text-left active:bg-gray-50"
              style={{
                borderColor: "var(--border)",
                background:
                  startStopRouteIndex === index
                    ? "var(--purple-pale)"
                    : "white",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background:
                    startStopRouteIndex === index
                      ? "var(--purple)"
                      : "var(--bg)",
                  color:
                    startStopRouteIndex === index ? "white" : "var(--muted)",
                }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {stopLabel(stop, locale)}
                </span>
                {nearestStopRouteIndex === index && (
                  <div
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: "#16A34A" }}
                  >
                    {t("closestLocation")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="px-4 pt-3 pb-2 bg-white border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1
            className="text-[1.05rem] font-extrabold leading-none"
            style={{ color: "var(--text)" }}
          >
            {t("liveTracker")}
          </h1>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: trackingPosition ? "#DCFCE7" : "var(--purple-pale)",
              color: trackingPosition ? "#16A34A" : "var(--purple)",
            }}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                trackingPosition ? "bg-green-500" : "bg-purple-400"
              }`}
            />
            {trackingPosition ? t("tracking") : t("notTracking")}
          </div>
        </div>
        <p className="text-[10px]" style={{ color: "var(--muted)" }}>
          {t("trackerIntro")}
        </p>
      </div>

      <div ref={contentScrollRef} className="flex-1 min-h-0 tracker-scrollable">
        <div className="relative ml-4 mr-4 mt-3 rounded-2xl overflow-hidden shadow-sm bg-white">
          {selectedRoute ? (
            <div className="relative">
              <div className="absolute bottom-3 left-3 z-[600] flex gap-1">
                <button
                  type="button"
                  onClick={() => setMapRotation((value) => value - 15)}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold pointer-events-auto"
                  style={{ color: "var(--purple)" }}
                  aria-label={t("rotateLeft")}
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={() => setMapRotation((value) => value + 15)}
                  className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-sm font-bold pointer-events-auto"
                  style={{ color: "var(--purple)" }}
                  aria-label={t("rotateRight")}
                >
                  ↻
                </button>
              </div>
              <CampusMap
                routeId={selectedRoute.id}
                userPos={userPosition}
                highlightPath={buildingWalkStarted ? [] : highlightPath}
                guidancePoints={
                  !buildingWalkStarted && !startGuidanceDismissed
                    ? (guidancePoints ?? undefined)
                    : undefined
                }
                destinationGuidancePoints={
                  !buildingGuidanceDismissed
                    ? (buildingGuidancePoints ?? undefined)
                    : undefined
                }
                destinationBuilding={
                  destinationBuilding
                    ? {
                        name: destinationBuilding.name,
                        position: [
                          destinationBuilding.lat,
                          destinationBuilding.lng,
                        ],
                      }
                    : undefined
                }
                tripProgressMeters={
                  tripStarted ? tripProgress.progressMeters : null
                }
                tripStartStopIndex={tripStartStopIndex ?? 0}
                highlightStopId={activeStop?.id}
                focusStopId={
                  buildingWalkStarted ||
                  (destinationBuilding && !buildingGuidanceDismissed) ||
                  (userPosition && guidancePoints)
                    ? undefined
                    : (activeStop?.id ?? destStop?.id ?? undefined)
                }
                height={tripStarted ? "clamp(300px, 48svh, 430px)" : 300}
                rotation={mapRotation}
                userHeading={userHeading ?? 0}
                dimRoute={buildingWalkStarted}
                enableTouchRotate
                onRotationChange={setMapRotation}
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-[240px]"
              style={{ background: "#E8EDF2" }}
            >
              <Icon path={ICONS.map} size={40} className="opacity-20 mb-2" />
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                {t("selectRouteMap")}
              </span>
            </div>
          )}
        </div>

        {selectedRoute && (
          <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm p-3">
            <div
              className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--muted)" }}
            >
              {t("currentStatus")}
            </div>
            <div className="flex gap-2 mb-2">
              <div
                className="flex-1 rounded-xl p-2.5"
                style={{ background: "var(--purple-pale)" }}
              >
                <div
                  className="text-[10px] mb-1"
                  style={{ color: "var(--muted)" }}
                >
                  {t("currentStop")}
                </div>
                <div
                  className="text-xs font-bold"
                  style={{ color: "var(--purple)" }}
                >
                  {activeStop
                    ? stopLabel(activeStop, locale)
                    : "—"}
                </div>
              </div>
              {destStop && (
                <div
                  className="flex-1 rounded-xl p-2.5"
                  style={{ background: "#FEF3C7" }}
                >
                  <div
                    className="text-[10px] mb-1"
                    style={{ color: "#92400E" }}
                  >
                    {t("stopsToDest")}
                  </div>
                  <div
                    className="text-xs font-bold"
                    style={{ color: "#D97706" }}
                  >
                    {stopsAway !== null ? stopsAway : "—"}
                  </div>
                </div>
              )}
            </div>
            {tripStarted && (
              <div
                className="rounded-xl p-2.5"
                style={{ background: "#EFF6FF" }}
              >
                <div className="text-[10px] mb-1" style={{ color: "#1D4ED8" }}>
                  {buildingWalkStarted ? t("walkingDestination") : t("nextStop")}
                </div>
                <div className="text-xs font-bold" style={{ color: "#1D4ED8" }}>
                  {buildingWalkStarted && destinationBuilding
                    ? buildingLabel(destinationBuilding, locale)
                    : nextStop
                      ? stopLabel(nextStop, locale)
                      : t("endOfRoute")}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowRoutePicker(true)}
            className="w-full flex items-center gap-4 px-4 py-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{
                background: selectedRoute
                  ? selectedRoute.color
                  : "var(--muted)",
              }}
            >
              {selectedRoute ? (
                selectedRoute.label
              ) : (
                <Icon path={ICONS.bus} size={18} />
              )}
            </div>
            <div className="flex-1 text-left">
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                {selectedRoute
                  ? t("routeWord", { name: `${routeTitle(selectedRoute, locale)} – ${routeDescription(selectedRoute, locale)}` })
                  : t("selectRoute")}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {selectedRoute
                  ? `${routeStops.length} stops`
                  : t("tapChooseBus")}
              </div>
            </div>
            <Icon path={ICONS.chevronRight} size={18} className="opacity-30" />
          </button>
          {selectedRoute && (
            <>
              <div
                className="h-px mx-4"
                style={{ background: "var(--border)" }}
              />
              <button
                onClick={() => setShowStartPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--purple-pale)" }}
                >
                  <Icon
                    path={ICONS.locate}
                    size={18}
                    style={{ color: "var(--purple)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {startStop
                      ? stopLabel(startStop, locale)
                      : t("findingStart")}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {startStopManuallySet
                      ? t("tapChangeStart")
                      : t("basedOnLocation")}
                  </div>
                </div>
                <Icon
                  path={ICONS.chevronRight}
                  size={18}
                  className="opacity-30"
                />
              </button>
              <div
                className="h-px mx-4"
                style={{ background: "var(--border)" }}
              />
              <button
                onClick={() => setShowDestPicker(true)}
                className="w-full flex items-center gap-4 px-4 py-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: destStop ? "#FEF3C7" : "var(--bg)" }}
                >
                  <Icon
                    path={ICONS.locate}
                    size={18}
                    style={{ color: destStop ? "#D97706" : "var(--muted)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {destinationBuilding
                      ? buildingLabel(destinationBuilding, locale)
                      : destStop
                        ? stopLabel(destStop, locale)
                        : t("setDestination")}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {destinationBuilding && destStop
                      ? t("busThenWalk", { stop: stopLabel(destStop, locale) })
                      : destStop
                        ? t("tripEndsHere")
                        : t("optionalEnd")}
                  </div>
                </div>
                <Icon
                  path={ICONS.chevronRight}
                  size={18}
                  className="opacity-30"
                />
              </button>
              {destStop && (
                <div className="px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (arrivalNotificationsEnabled) {
                        setArrivalNotificationsEnabled(false);
                        setNotificationPermissionMessage(null);
                      } else {
                        void requestArrivalNotifications();
                      }
                    }}
                    aria-pressed={arrivalNotificationsEnabled}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold"
                    style={{
                      borderColor: arrivalNotificationsEnabled
                        ? "#86EFAC"
                        : "var(--border)",
                      background: arrivalNotificationsEnabled
                        ? "#F0FDF4"
                        : "white",
                      color: arrivalNotificationsEnabled
                        ? "#15803D"
                        : "var(--text)",
                    }}
                  >
                    <Icon path={ICONS.alert} size={16} />
                    {arrivalNotificationsEnabled
                      ? t("arrivalOn")
                      : destinationBuilding
                        ? t("notifyBuilding")
                        : t("notifyArrive")}
                  </button>
                  {notificationPermissionMessage && (
                    <div
                      className="mt-2 text-center text-xs"
                      style={{ color: "#B91C1C" }}
                    >
                      {notificationPermissionMessage}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mx-3 mt-3">
          {selectedRoute && (
            <button
              onClick={() => {
                if (tripStarted) endTrip();
                else startTrip();
              }}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
              style={{ background: tripStarted ? "#DC2626" : "var(--navy)" }}
            >
              <Icon path={tripStarted ? ICONS.stop : ICONS.play} size={16} />
              {tripStarted ? t("changeOrEnd") : t("startTrip")}
            </button>
          )}
        </div>
        {selectedRoute && tripStarted && LIVE_ETA_ENABLED && (
          <div className="mx-3 mt-2 rounded-xl border bg-white px-3 py-3">
            <button
              type="button"
              role="switch"
              aria-checked={shareTripProgress}
              onClick={() => setShareTripProgress((enabled) => !enabled)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span
                  className="block text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {t("shareTitle")}
                </span>
                <span
                  className="mt-0.5 block text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {!shareTripProgress
                    ? t("sharePaused")
                    : busLocationSharing.status === "unconfigured"
                      ? t("shareUnconfigured")
                      : busLocationSharing.status === "error"
                        ? t("shareFailed")
                        : t("shareBody")}
                </span>
              </span>
              <span
                className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                style={{
                  background: shareTripProgress ? "#16A34A" : "#CBD5E1",
                }}
              >
                <span
                  className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{
                    transform: shareTripProgress
                      ? "translateX(20px)"
                      : undefined,
                  }}
                />
              </span>
            </button>
            {shareTripProgress && (
              <div
                className="mt-2 text-xs"
                style={{
                  color:
                    busLocationSharing.status === "error"
                      ? "#B91C1C"
                      : "var(--muted)",
                }}
                role="status"
              >
                {busLocationSharing.status === "sharing"
                  ? t("shareStatus")
                  : busLocationSharing.status === "unconfigured"
                    ? localizeSystemMessage(locale, busLocationSharing.error ?? "")
                    : busLocationSharing.status === "error"
                      ? localizeSystemMessage(locale, busLocationSharing.error ?? "")
                      : t("waitingMatch")}
              </div>
            )}
          </div>
        )}
        {gpsError && (
          <div
            className="mx-3 mt-2 px-4 py-2 rounded-xl text-xs text-center"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            {localizeSystemMessage(locale, gpsError)}
          </div>
        )}
        <div className="h-8" />
      </div>

      {showStartPrompt &&
        isActive &&
        !tripStarted &&
        !showRoutePicker &&
        !showTripSurvey &&
        !stopAlert && (
        <div
          className="absolute inset-0 z-[2000] flex items-center justify-center p-5"
          style={{ background: "rgba(15,23,42,0.45)" }}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-trip-prompt-title"
          >
            <div
              className="text-lg font-bold"
              id="start-trip-prompt-title"
              style={{ color: "var(--text)" }}
            >
              {t("readyTitle")}
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              {destinationBuilding && destStop
                ? t("promptBuilding", {
                    building: buildingLabel(destinationBuilding, locale),
                    route: selectedRoute ? routeTitle(selectedRoute, locale) : t("theBus"),
                    stop: stopLabel(destStop, locale),
                  })
                : destStop
                  ? t("promptStop", { stop: stopLabel(destStop, locale) })
                : selectedRoute
                  ? t("promptNoStop")
                  : t("promptNoRoute")}
            </p>
            <button
              type="button"
              onClick={startTrip}
              className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--navy)" }}
            >
              {selectedRoute ? t("startTrip") : t("chooseRoute")}
            </button>
            <button
              type="button"
              onClick={() => setShowStartPrompt(false)}
              className="mt-2 w-full rounded-xl border py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {t("notNow")}
            </button>
          </div>
        </div>
      )}
      {stopAlert && (
        <div
          className="absolute inset-0 z-[2100] flex items-center justify-center p-5"
          style={{ background: "rgba(15,23,42,0.45)" }}
        >
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "#FEF3C7" }}
            >
              <Icon path={ICONS.alert} size={24} style={{ color: "#D97706" }} />
            </div>
            <div
              className="text-center text-lg font-bold"
              style={{ color: "var(--text)" }}
            >
              {arrivalCopy(stopAlert).title}
            </div>
            <div
              className="mt-2 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              {arrivalCopy(stopAlert).body}
            </div>
            <button
              onClick={() => {
                setStopAlert(null);
                if (surveyPendingAfterArrival) {
                  setSurveyPendingAfterArrival(false);
                  setShowTripSurvey(true);
                  window.localStorage.setItem(TRIP_SURVEY_SEEN_KEY, "true");
                  setHasSeenTripSurvey(true);
                }
              }}
              className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white"
              style={{ background: "var(--purple)" }}
            >
              {t("gotIt")}
            </button>
          </div>
        </div>
      )}
      {showTripSurvey && (
        <div
          className="absolute inset-0 z-[2200] flex items-center justify-center p-5"
          style={{ background: "rgba(15,23,42,0.48)" }}
        >
          <div
            className="max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-survey-title"
          >
            {surveyStatus === "success" ? (
              <>
                <h2
                  id="trip-survey-title"
                  className="text-lg font-bold"
                  style={{ color: "var(--text)" }}
                >
                  {t("thanksFeedback")}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  {t("thanksBody")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowTripSurvey(false)}
                  className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white"
                  style={{ background: "var(--navy)" }}
                >
                  {t("done")}
                </button>
              </>
            ) : (
              <>
                <h2
                  id="trip-survey-title"
                  className="text-lg font-bold"
                  style={{ color: "var(--text)" }}
                >
                  {t("howWasTrip")}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  {t("rateStars")}
                </p>
                <div
                  className="mt-4 flex justify-center gap-2"
                  role="group"
                  aria-label={t("tripRating")}
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setSurveyRating(rating)}
                      aria-label={t(rating === 1 ? "star" : "stars", { count: rating })}
                      aria-pressed={surveyRating === rating}
                      className="h-11 w-11 text-3xl leading-none"
                      style={{
                        color:
                          surveyRating !== null && rating <= surveyRating
                            ? "#F59E0B"
                            : "#CBD5E1",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSurveyExpanded((expanded) => !expanded)}
                  className="mt-4 w-full text-left text-sm font-semibold"
                  style={{ color: "var(--purple)" }}
                  aria-expanded={surveyExpanded}
                >
                  {surveyExpanded
                    ? t("hideComment")
                    : t("addComment")}
                </button>
                {surveyExpanded && (
                  <div className="mt-3 space-y-3">
                    <label
                      className="block text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {t("experienceLabel")}
                      <textarea
                        value={surveyExperience}
                        onChange={(event) =>
                          setSurveyExperience(event.target.value.slice(0, 280))
                        }
                        maxLength={280}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-lg border p-2 text-sm font-normal"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                    <label
                      className="block text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {t("suggestionLabel")}
                      <textarea
                        value={surveySuggestion}
                        onChange={(event) =>
                          setSurveySuggestion(event.target.value.slice(0, 280))
                        }
                        maxLength={280}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-lg border p-2 text-sm font-normal"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                  </div>
                )}
                {surveyError && (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: "#B91C1C" }}
                    role="alert"
                  >
                    {surveyError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={surveyRating === null || surveyStatus === "submitting"}
                  onClick={() => void submitTripSurvey()}
                  className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--navy)" }}
                >
                  {surveyStatus === "submitting" ? t("sending") : t("sendFeedback")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTripSurvey(false)}
                  className="mt-2 w-full rounded-xl border py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  {t("skip")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
