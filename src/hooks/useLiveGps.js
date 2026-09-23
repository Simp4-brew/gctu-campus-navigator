import { useCallback, useEffect, useRef, useState } from "react";

import { getDistance, projectOntoRoute } from "../lib/geo.js";

// Within this distance of the destination counts as arrived. Phone GPS is
// typically accurate to 5-15m outdoors.
const ARRIVAL_RADIUS_M = 20;

// Ignore fixes worse than this for arrival, so one wild reading cannot
// announce arrival from across campus.
const MAX_ARRIVAL_ACCURACY_M = 50;

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

/* =========================================================
   Live device GPS via navigator.geolocation.watchPosition.

   Each fix is snapped onto the current route to work out how
   far off-route the user is, how much distance remains and
   which turn-by-turn step they are on.

   routePoints / stepCount can change while tracking, so they
   are read through refs rather than captured when the watch
   starts. onMove([lat, lng]) is called for every fix, and
   onArrive() once per route when the user reaches the end.
========================================================= */

export function useLiveGps({ routePoints, stepCount, onMove, onArrive }) {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [offRoute, setOffRoute] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);

  const watchIdRef = useRef(null);
  const routePointsRef = useRef(routePoints);
  const stepCountRef = useRef(stepCount);
  const onMoveRef = useRef(onMove);
  const onArriveRef = useRef(onArrive);
  const arrivedRef = useRef(false);

  useEffect(() => {
    routePointsRef.current = routePoints;
    stepCountRef.current = stepCount;
    onMoveRef.current = onMove;
    onArriveRef.current = onArrive;
  }, [routePoints, stepCount, onMove, onArrive]);

  // A new destination can be reached (and announced) again.
  useEffect(() => {
    arrivedRef.current = false;
    setArrived(false);
  }, [routePoints]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  useEffect(() => clearWatch, [clearWatch]);

  const stop = useCallback(() => {
    clearWatch();
    setActive(false);
    setAccuracy(null);
    setOffRoute(null);
    setRemaining(null);
    setStepIndex(0);
    setArrived(false);
    arrivedRef.current = false;
  }, [clearWatch]);

  const handleFix = useCallback((fix) => {
    const { latitude, longitude, accuracy: fixAccuracy } = fix.coords;
    const coordinates = [latitude, longitude];

    setPosition(coordinates);
    setAccuracy(Number.isFinite(fixAccuracy) ? fixAccuracy : null);
    onMoveRef.current?.(coordinates);

    const route = routePointsRef.current;
    const destination = route?.[route.length - 1];
    const accurateEnough =
      !Number.isFinite(fixAccuracy) || fixAccuracy <= MAX_ARRIVAL_ACCURACY_M;

    if (
      destination &&
      !arrivedRef.current &&
      accurateEnough &&
      getDistance(
        { lat: latitude, lng: longitude },
        { lat: destination[0], lng: destination[1] },
      ) <= ARRIVAL_RADIUS_M
    ) {
      arrivedRef.current = true;
      setArrived(true);
      onArriveRef.current?.();
    }

    // Snap the fix onto the route so the turn list and floating guide
    // advance in real GPS mode, not just in the walk demo.
    const projection = projectOntoRoute(coordinates, routePointsRef.current);

    if (!projection) {
      setOffRoute(null);
      setRemaining(null);
      return;
    }

    setOffRoute(projection.offRoute);
    setRemaining(Math.max(0, projection.routeLength - projection.distanceAlong));

    if (stepCountRef.current > 0) {
      setStepIndex(Math.min(projection.segmentIndex, stepCountRef.current - 1));
    }
  }, []);

  const handleError = useCallback(
    (error) => {
      // Only permission denial is fatal. POSITION_UNAVAILABLE and TIMEOUT
      // are usually transient and watchPosition keeps retrying on its own.
      if (error.code === error.PERMISSION_DENIED) {
        alert(
          `Location permission denied: ${
            error.message || "Please allow location access and try again."
          }`,
        );
        stop();
      } else {
        console.warn("Transient GPS error, still tracking:", error.message || error.code);
      }
    },
    [stop],
  );

  /* Returns true if tracking started. */
  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Your device or browser does not support GPS location services.");
      return false;
    }

    // The Geolocation API is gated behind a secure context. Over plain http
    // on a LAN address the call fails silently on most mobile browsers,
    // which looks exactly like "GPS is broken".
    if (typeof window !== "undefined" && !window.isSecureContext) {
      alert(
        "GPS needs a secure connection. Open this page over https:// or on " +
          "localhost - location will not work over a plain http:// address.",
      );
      return false;
    }

    clearWatch();
    arrivedRef.current = false;
    setArrived(false);
    setActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleFix,
      handleError,
      WATCH_OPTIONS,
    );
    return true;
  }, [clearWatch, handleFix, handleError]);

  return {
    active,
    position,
    accuracy,
    offRoute,
    remaining,
    stepIndex,
    arrived,
    start,
    stop,
  };
}
