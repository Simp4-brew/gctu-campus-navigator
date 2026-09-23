import { useCallback, useEffect, useRef, useState } from "react";

import { getDistance } from "../lib/geo.js";

const SIM_WALK_SPEED_MPS = 1.4;

// A campus route is only 150-250m. At true walking pace the demo would
// run for two or three minutes, so play it back faster.
const SIM_TIME_SCALE = 5;

const SIM_TICK_MS = 100;

const SIM_SPEED_LABEL = `1.4 m/s (Walking · ${SIM_TIME_SCALE}× demo)`;

const METRES_PER_TICK = (SIM_WALK_SPEED_MPS * SIM_TIME_SCALE * SIM_TICK_MS) / 1000;

function announceArrival(name) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(
    `You have arrived at ${name}. Enjoy GCTU campus!`,
  );
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

/* Split a list of graph nodes into segments with their cumulative
   start distance, so a distance travelled maps to a point on the route. */
function buildSegments(routeNodes) {
  const segments = [];
  let routeLength = 0;

  for (let i = 0; i < routeNodes.length - 1; i++) {
    const length = getDistance(routeNodes[i], routeNodes[i + 1]);

    segments.push({
      from: routeNodes[i],
      to: routeNodes[i + 1],
      length,
      startsAt: routeLength,
    });

    routeLength += length;
  }

  return { segments, routeLength };
}

/* =========================================================
   Walk demo: moves a simulated GPS marker along a route at
   walking pace, interpolating along each segment so the
   motion is continuous rather than node-to-node jumps.

   onMove([lat, lng]) is called for every new position.
========================================================= */

export function useWalkSimulation(onMove) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState(null);
  const [position, setPosition] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const moveTo = useCallback(
    (point) => {
      setPosition(point);
      onMove(point);
    },
    [onMove],
  );

  const stop = useCallback(() => {
    clearTimer();
    setActive(false);
    setStatus(null);
    setStepIndex(0);
  }, [clearTimer]);

  /* routeNodes: at least two graph nodes ({ id, name, lat, lng }). */
  const start = useCallback(
    (routeNodes) => {
      clearTimer();

      const { segments, routeLength } = buildSegments(routeNodes);
      const firstNode = routeNodes[0];
      const destination = routeNodes[routeNodes.length - 1];

      setActive(true);
      setStepIndex(0);
      moveTo([firstNode.lat, firstNode.lng]);
      setStatus({
        nodeId: firstNode.id,
        name: firstNode.name,
        speed: SIM_SPEED_LABEL,
        remainingDist: Math.round(routeLength),
        status: "Starting simulation...",
      });

      let traveled = 0;

      timerRef.current = setInterval(() => {
        traveled += METRES_PER_TICK;

        if (traveled >= routeLength) {
          clearTimer();
          moveTo([destination.lat, destination.lng]);
          setStatus({
            nodeId: destination.id,
            name: destination.name,
            speed: "0 m/s (Idle)",
            remainingDist: 0,
            status: "Arrived! Welcome to your destination!",
          });
          setActive(false);
          setStepIndex(0);
          announceArrival(destination.name);
          return;
        }

        const found = segments.findIndex(
          (s) => traveled < s.startsAt + s.length,
        );
        const segmentIndex = found === -1 ? segments.length - 1 : found;
        const segment = segments[segmentIndex];
        const progress =
          segment.length > 0 ? (traveled - segment.startsAt) / segment.length : 1;

        moveTo([
          segment.from.lat + (segment.to.lat - segment.from.lat) * progress,
          segment.from.lng + (segment.to.lng - segment.from.lng) * progress,
        ]);
        setStepIndex(segmentIndex);
        setStatus({
          // The node we are walking away from, so the walk log highlights
          // the step being performed rather than the next one.
          nodeId: segment.from.id,
          name: segment.to.name,
          speed: SIM_SPEED_LABEL,
          remainingDist: Math.round(Math.max(0, routeLength - traveled)),
          status: `Heading to: ${segment.to.name}`,
        });
      }, SIM_TICK_MS);
    },
    [clearTimer, moveTo],
  );

  return { active, status, position, stepIndex, start, stop };
}
