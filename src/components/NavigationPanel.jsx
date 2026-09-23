import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Compass as GpsIcon,
  Landmark,
  Navigation,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./NavigationPanel.css";

import { BUILDING_LIST, GRAPH_NODES } from "../data/buildings.js";
import { formatDistance } from "../lib/geo.js";
import { planRoute } from "../lib/routing.js";
import { arrivalMessage, speak } from "../lib/speech.js";
import { useLiveGps } from "../hooks/useLiveGps.js";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { useWalkSimulation } from "../hooks/useWalkSimulation.js";
import CampusMap, { DEFAULT_CENTER } from "./navigation/CampusMap.jsx";
import LocationSelect from "./navigation/LocationSelect.jsx";
import MapTelemetry from "./navigation/MapTelemetry.jsx";
import NavigationGuide from "./navigation/NavigationGuide.jsx";
import RouteWalkLog from "./navigation/RouteWalkLog.jsx";

// Routing functions live in src/lib; re-exported for existing importers.
export { getDistance } from "../lib/geo.js";
export { findDijkstraPath } from "../lib/routing.js";

// A fix further than this from the route means the device is not on campus.
const FAR_FROM_CAMPUS_M = 300;

/* =========================================================
   NAVIGATION PANEL

   Route planner + map. The route is derived from the selected
   start/destination; live GPS and the walk demo are mutually
   exclusive tracking modes provided by their own hooks.
========================================================= */

export default function NavigationPanel({
  presetDestination,
  clearPresetDestination,
  active,
}) {
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [startId, setStartId] = useState("gate");
  const [endId, setEndId] = useState("focis");
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const route = useMemo(() => planRoute(startId, endId), [startId, endId]);

  // Arrival is announced from a timer or a GPS callback, so it reads the
  // route through a ref rather than a stale closure.
  const routeRef = useRef(route);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const announceArrival = useCallback(() => {
    speak(arrivalMessage(routeRef.current));
  }, []);

  const simulation = useWalkSimulation(setMapCenter, announceArrival);
  const liveGps = useLiveGps({
    routePoints: route.points,
    stepCount: route.steps.length,
    onMove: setMapCenter,
    onArrive: announceArrival,
  });

  const { active: simulating, stop: stopSimulation } = simulation;
  const tracking = simulating || liveGps.active;
  const trackedPosition = simulating ? simulation.position : liveGps.position;
  const activeStepIndex = simulating
    ? simulation.stepIndex
    : liveGps.active
      ? liveGps.stepIndex
      : 0;

  // Keep the phone screen on while navigating, so tracking and the
  // arrival announcement are not paused by the screen locking.
  useWakeLock(tracking);

  // For a place inside a building, the final "enter and take the stairs" step.
  const lastStep = route.steps[route.steps.length - 1];
  const indoorStep = lastStep?.indoor ? lastStep : null;

  const isFarFromCampus =
    liveGps.active &&
    liveGps.offRoute !== null &&
    liveGps.offRoute > FAR_FROM_CAMPUS_M;

  /* Preset destination from "Get Directions" on the Campus tab. */
  useEffect(() => {
    if (!presetDestination) {
      return;
    }

    const match = BUILDING_LIST.find(
      (building) =>
        building.name === presetDestination ||
        building.shortName === presetDestination ||
        building.id === presetDestination,
    );

    if (match) {
      // The demo walks the route captured when it started; changing the
      // route underneath it would leave the marker on a path no longer drawn.
      if (simulating) {
        stopSimulation();
      }

      setEndId(match.id);
      setStartId("gate");
      setMapCenter([match.lat, match.lng]);
      setPanelCollapsed(false);
    }

    clearPresetDestination?.();
  }, [presetDestination, clearPresetDestination, simulating, stopSimulation]);

  /* While not tracking, centre on the start of the route. While tracking,
     the centre belongs to the GPS feed. */
  useEffect(() => {
    if (tracking || route.path.length === 0) {
      return;
    }

    const startNode = GRAPH_NODES[route.path[0]];

    if (startNode) {
      setMapCenter([startNode.lat, startNode.lng]);
    }
  }, [route, tracking]);

  const handleSwap = () => {
    if (simulating) return;

    setStartId(endId);
    setEndId(startId);
  };

  const handleSetDestination = useCallback(
    (buildingId) => {
      if (!simulating) setEndId(buildingId);
    },
    [simulating],
  );

  const toggleLiveGps = () => {
    if (simulating) {
      stopSimulation();
    }

    if (liveGps.active) {
      liveGps.stop();
      return;
    }

    // Speaking inside the tap also unlocks speech on iPhone, so the later
    // arrival announcement (from a GPS callback) is allowed to play.
    if (liveGps.start()) {
      speak(`Starting live navigation to ${route.endName}.`);
    }
  };

  const toggleSimulation = () => {
    if (liveGps.active) {
      liveGps.stop();
    }

    if (simulating) {
      stopSimulation();
      return;
    }

    const routeNodes = route.path.map((id) => GRAPH_NODES[id]).filter(Boolean);

    if (routeNodes.length === 0) {
      alert("No route is available to simulate.");
      return;
    }

    if (routeNodes.length < 2) {
      alert("You are already at your destination - pick a different one.");
      return;
    }

    // Must run inside the tap: see toggleLiveGps.
    speak(`Starting navigation to ${route.endName}.`);
    simulation.start(routeNodes);
  };

  const togglePanel = () => setPanelCollapsed((collapsed) => !collapsed);

  return (
    <div className="navigate-container" id="navigate-panel">
      {/* ================= ROUTE CONTROL PANEL ================= */}
      <div
        className={`nav-controls-panel ${panelCollapsed ? "collapsed" : ""}`}
        id="nav-controls-and-stats"
      >
        <div
          className="panel-mobile-drag-bar"
          onClick={togglePanel}
          aria-hidden="true"
        />

        <div
          className={`panel-toggle-header ${panelCollapsed ? "collapsed" : ""}`}
          onClick={togglePanel}
        >
          <div className="panel-toggle-header-left">
            <span className="panel-toggle-icon" aria-hidden="true">
              🧭
            </span>

            <div>
              <span className="panel-toggle-title">Route Planner</span>

              {panelCollapsed && (
                <span className="panel-toggle-subtitle">
                  {route.startName} → {route.endName} · tap to change
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="panel-toggle-btn"
            aria-expanded={!panelCollapsed}
            aria-controls="route-planner-content"
          >
            {panelCollapsed ? "EXPAND" : "MINIMIZE"}
          </button>
        </div>

        {!panelCollapsed && (
          <div className="controls-scrollable-content" id="route-planner-content">
            <form
              className="route-form"
              id="navigation-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <LocationSelect
                id="select-start-point"
                label="Starting Point"
                icon={<Navigation size={14} className="select-icon-nav" />}
                value={startId}
                onChange={setStartId}
                disabled={simulating}
              />

              <div className="swap-btn-container">
                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwap}
                  id="swap-route-direction-btn"
                  title="Reverse route start and end"
                  disabled={simulating}
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <LocationSelect
                id="select-end-point"
                label="Destination"
                icon={<Landmark size={14} className="select-icon-nav" />}
                value={endId}
                onChange={setEndId}
                disabled={simulating}
              />

              <div className="gps-controls">
                <div className="gps-controls-grid">
                  <button
                    type="button"
                    id="simulate-walk-btn"
                    className={`action-btn sim-btn ${simulating ? "active" : ""}`}
                    onClick={toggleSimulation}
                  >
                    {simulating ? <Square size={12} /> : <Play size={12} />}
                    {simulating ? "Stop Demo" : "Walk Demo"}
                  </button>

                  <button
                    type="button"
                    id="locate-me-btn"
                    className={`action-btn locate-btn ${liveGps.active ? "active" : ""}`}
                    onClick={toggleLiveGps}
                  >
                    <GpsIcon
                      size={12}
                      className={liveGps.active ? "animate-spin" : ""}
                    />
                    {liveGps.active ? "Stop Live GPS" : "Real Device GPS"}
                  </button>
                </div>

                {liveGps.active && liveGps.arrived && (
                  <div className="real-gps-notice" role="status">
                    <span className="real-gps-notice-title">
                      ✅ You have arrived at {route.endName}.
                    </span>{" "}
                    {indoorStep?.text}
                  </div>
                )}

                {liveGps.active && !liveGps.arrived && !isFarFromCampus && (
                  <div className="real-gps-notice">
                    <span className="real-gps-notice-title">
                      📡 Live GPS Active:
                    </span>{" "}
                    Your device GPS is being monitored. Open this page on a
                    phone outdoors and move around to see the blue marker
                    update.
                  </div>
                )}

                {isFarFromCampus && (
                  <div className="real-gps-notice">
                    <span className="real-gps-notice-title">
                      ⚠️ You are not on campus:
                    </span>{" "}
                    Your device is about {formatDistance(liveGps.offRoute)} from
                    this route, so the map has followed you away from GCTU.
                    Route guidance only tracks properly while you are walking
                    on campus - use Walk Demo to preview it from anywhere.
                  </div>
                )}
              </div>
            </form>

            {simulation.status && (
              <div
                className="simulation-banner walk-banner"
                id="gps-hud-indicator"
                role="status"
              >
                <div className="walk-banner-label">Active Walking Simulation</div>
                <div className="walk-banner-status">
                  {simulation.status.status}
                </div>
                <div className="walk-banner-stats">
                  <span>Speed: {simulation.status.speed}</span>
                  <span className="walk-banner-remaining">
                    Left: {simulation.status.remainingDist}m
                  </span>
                </div>
              </div>
            )}

            <RouteWalkLog
              route={route}
              simulating={simulating}
              currentNodeId={simulation.status?.nodeId}
            />
          </div>
        )}
      </div>

      {/* ================= MAP ================= */}
      <div className="map-view-panel" id="campus-leaflet-map-container">
        {tracking && <NavigationGuide step={route.steps[activeStepIndex]} />}

        <MapTelemetry
          center={mapCenter}
          tracking={tracking}
          simulating={simulating}
          liveGps={liveGps}
        />

        <CampusMap
          active={active}
          mapCenter={mapCenter}
          route={route}
          startId={startId}
          endId={endId}
          tracking={tracking}
          simulating={simulating}
          gpsPosition={trackedPosition}
          gpsAccuracy={liveGps.accuracy}
          showAccuracy={liveGps.active}
          onSetDestination={handleSetDestination}
        />
      </div>
    </div>
  );
}
