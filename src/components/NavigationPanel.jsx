import React, { useState, useEffect, useRef } from "react";
import { BUILDING_LIST, GRAPH_NODES, GRAPH_EDGES } from "../data/buildings";
import {
  MapPin,
  Navigation,
  Compass,
  RefreshCw,
  Play,
  Square,
  Landmark,
  Compass as GpsIcon,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowUpLeft,
  ArrowLeft,
  CornerDownRight,
  CornerDownLeft,
  Info,
} from "lucide-react";

// Leaflet imports
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";

import "./NavigationPanel.css";

// Re-centering hook for Leaflet map container updates
function MapController({ center, zoom, active }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 18, { animate: true });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const triggerInvalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch (e) {
        console.warn("Leaflet map invalidateSize warning:", e);
      }
    };

    triggerInvalidate();

    if (active) {
      const t1 = setTimeout(triggerInvalidate, 50);
      const t2 = setTimeout(triggerInvalidate, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [active, map]);

  return null;
}

export function getDistance(node1, node2) {
  const R = 6371e3;
  const lat1 = (node1.lat * Math.PI) / 180;
  const lat2 = (node2.lat * Math.PI) / 180;
  const deltaLat = ((node2.lat - node1.lat) * Math.PI) / 180;
  const deltaLng = ((node2.lng - node1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function findDijkstraPath(startId, endId) {
  const nodes = GRAPH_NODES;
  const edges = GRAPH_EDGES;

  if (!nodes[startId] || !nodes[endId]) {
    return { path: [], distance: 0 };
  }

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  Object.keys(nodes).forEach((id) => {
    distances[id] = Infinity;
    previous[id] = null;
    unvisited.add(id);
  });
  distances[startId] = 0;

  while (unvisited.size > 0) {
    let currentId = null;
    unvisited.forEach((id) => {
      if (currentId === null || distances[id] < distances[currentId]) {
        currentId = id;
      }
    });

    if (currentId === null || distances[currentId] === Infinity) {
      break;
    }

    if (currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    const neighbors = [];
    edges.forEach((edge) => {
      if (edge.from === currentId && unvisited.has(edge.to)) {
        neighbors.push(edge.to);
      } else if (edge.to === currentId && unvisited.has(edge.from)) {
        neighbors.push(edge.from);
      }
    });

    neighbors.forEach((neighborId) => {
      const dist = getDistance(nodes[currentId], nodes[neighborId]);
      const alt = distances[currentId] + dist;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
      }
    });
  }

  const path = [];
  let curr = endId;
  if (previous[curr] !== null || curr === startId) {
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr];
    }
  }

  return {
    path,
    distance: distances[endId] === Infinity ? 0 : distances[endId],
  };
}

function generateTurnByTurn(path) {
  if (!path || path.length < 2) return [];

  const directions = [];
  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = GRAPH_NODES[path[i]];
    const toNode = GRAPH_NODES[path[i + 1]];
    const dist = getDistance(fromNode, toNode);

    let turnType = "straight";
    let instruction = "";

    if (i === 0) {
      instruction = `Depart from ${fromNode.name} and head directly toward ${toNode.name}.`;
      turnType = "depart";
    } else {
      const prevNode = GRAPH_NODES[path[i - 1]];
      const angle1 =
        (Math.atan2(fromNode.lng - prevNode.lng, fromNode.lat - prevNode.lat) *
          180) /
        Math.PI;
      const angle2 =
        (Math.atan2(toNode.lng - fromNode.lng, toNode.lat - fromNode.lat) *
          180) /
        Math.PI;

      let diff = angle2 - angle1;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;

      if (Math.abs(diff) < 22) {
        turnType = "straight";
        instruction = `Continue straight past ${fromNode.name} layout towards ${toNode.name}.`;
      } else if (diff >= 22 && diff < 65) {
        turnType = "slight-right";
        instruction = `Bear slightly right at ${fromNode.name} towards ${toNode.name}.`;
      } else if (diff >= 65 && diff < 125) {
        turnType = "right";
        instruction = `Turn right at ${fromNode.name} and walk along the paved path towards ${toNode.name}.`;
      } else if (diff >= 125) {
        turnType = "sharp-right";
        instruction = `Make a sharp right turn at ${fromNode.name} onto the plaza towards ${toNode.name}.`;
      } else if (diff <= -22 && diff > -65) {
        turnType = "slight-left";
        instruction = `Bear slightly left at ${fromNode.name} towards ${toNode.name}.`;
      } else if (diff <= -65 && diff > -125) {
        turnType = "left";
        instruction = `Turn left at ${fromNode.name} and proceed along the walkway towards ${toNode.name}.`;
      } else {
        turnType = "sharp-left";
        instruction = `Make a sharp left turn at ${fromNode.name} heading directly for ${toNode.name}.`;
      }
    }

    directions.push({
      key: i,
      from: fromNode.name,
      to: toNode.name,
      text: instruction,
      turnType: turnType,
      distance: Math.round(dist),
    });
  }

  return directions;
}

export default function NavigationPanel({
  presetDestination,
  clearPresetDestination,
  theme,
  active,
}) {
  const [mapViewStyle, setMapViewStyle] = useState("leaflet");
  const [isOnline, setIsOnline] = useState(navigator ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setMapViewStyle("schematic");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      if (!navigator.onLine) {
        setMapViewStyle("schematic");
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  const mapToSvg = (lat, lng) => {
    const minLat = 5.6006;
    const maxLat = 5.6027;
    const minLng = -0.2294;
    const maxLng = -0.2276;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    return { x: `${x.toFixed(3)}%`, y: `${y.toFixed(3)}%` };
  };

  const getSvgCoordinates = (nodeId) => {
    const node = GRAPH_NODES[nodeId];
    if (!node) return { x: 50, y: 50 };
    const pos = mapToSvg(node.lat, node.lng);
    return { x: parseFloat(pos.x), y: parseFloat(pos.y) };
  };

  const defaultCenter = [5.602, -0.2285];
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(18);

  const [startId, setStartId] = useState("gate");
  const [endId, setEndId] = useState("focis");

  const [shortestPath, setShortestPath] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [steps, setSteps] = useState([]);

  const [gpsActive, setGpsActive] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const [realGpsActive, setRealGpsActive] = useState(false);
  const [simState, setSimState] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [gpsCoordinates, setGpsCoordinates] = useState(defaultCenter);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const simIntervalRef = useRef(null);
  const realGpsWatchRef = useRef(null);

  useEffect(() => {
    if (presetDestination) {
      const match = BUILDING_LIST.find(
        (b) =>
          b.name === presetDestination || b.shortName === presetDestination,
      );
      if (match) {
        setEndId(match.id);
        setStartId("gate");
        setMapCenter([match.lat, match.lng]);
        setPanelCollapsed(false);

        console.log(`Preset destination applied: ${match.name}`);
      }
      clearPresetDestination();
    }
  }, [presetDestination, clearPresetDestination]);

  useEffect(() => {
    if (startId && endId) {
      const result = findDijkstraPath(startId, endId);
      setShortestPath(result.path);
      setTotalDistance(result.distance);
      setSteps(generateTurnByTurn(result.path));

      if (result.path.length > 0) {
        const startNode = GRAPH_NODES[result.path[0]];
        setMapCenter([startNode.lat, startNode.lng]);
      }
    }
  }, [startId, endId]);

  useEffect(() => {
    return () => {
      clearInterval(simIntervalRef.current);
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
      }
    };
  }, []);

  const handleSwap = () => {
    if (simActive) return;
    const temp = startId;
    setStartId(endId);
    setEndId(temp);
  };

  const toggleRealGPS = () => {
    if (simActive) {
      clearInterval(simIntervalRef.current);
      setSimActive(false);
      setSimState(null);
      setActiveStepIndex(0);
    }

    if (realGpsActive) {
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
        realGpsWatchRef.current = null;
      }
      setRealGpsActive(false);
      setGpsActive(false);
      const startNode = GRAPH_NODES[startId] || GRAPH_NODES.gate;
      setMapCenter([startNode.lat, startNode.lng]);
    } else {
      if (!navigator.geolocation) {
        alert("Your laptop or browser does not support Geolocation Services.");
        return;
      }

      setRealGpsActive(true);
      setGpsActive(true);

      realGpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(
            `Real device GPS obtained: Lat ${latitude}, Lng ${longitude}, Error Margin: ${accuracy}m`,
          );
          setGpsCoordinates([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(18);
        },
        (error) => {
          console.error("GPS Watch error", error);
          alert(
            `Could not read physical GPS hardware: ${error.message}. Please enable location permissions!`,
          );
          setRealGpsActive(false);
          setGpsActive(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        },
      );
    }
  };

  const startSimulation = () => {
    if (realGpsActive) {
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
        realGpsWatchRef.current = null;
      }
      setRealGpsActive(false);
    }

    if (simActive) {
      clearInterval(simIntervalRef.current);
      setSimActive(false);
      setSimState(null);
      setActiveStepIndex(0);
      return;
    }

    if (shortestPath.length === 0) {
      alert("No route loaded to simulate.");
      return;
    }

    setGpsActive(true);
    setSimActive(true);
    setActiveStepIndex(0);

    const firstNode = GRAPH_NODES[shortestPath[0]];
    setGpsCoordinates([firstNode.lat, firstNode.lng]);
    setMapCenter([firstNode.lat, firstNode.lng]);

    let stepIndex = 0;
    let distRemaining = totalDistance;

    setSimState({
      nodeId: shortestPath[0],
      name: firstNode.name,
      speed: "1.4 m/s (Walking)",
      remainingDist: Math.round(distRemaining),
      status: "Starting simulation...",
    });

    simIntervalRef.current = setInterval(() => {
      stepIndex++;
      if (stepIndex >= shortestPath.length) {
        clearInterval(simIntervalRef.current);
        setSimState({
          nodeId: shortestPath[shortestPath.length - 1],
          name: GRAPH_NODES[shortestPath[shortestPath.length - 1]].name,
          speed: "0 m/s (Idle)",
          remainingDist: 0,
          status: "Arrived! Welcome to your destination!",
        });
        setSimActive(false);
        setActiveStepIndex(0);

        try {
          const synth = window.speechSynthesis;
          if (synth) {
            const destName =
              GRAPH_NODES[shortestPath[shortestPath.length - 1]].name;
            const utter = new SpeechSynthesisUtterance(
              `You have arrived at ${destName}. Enjoy GCTU campus!`,
            );
            utter.rate = 1.0;
            synth.speak(utter);
          }
        } catch (e) {}

        return;
      }

      const nextNode = GRAPH_NODES[shortestPath[stepIndex]];
      const prevNode = GRAPH_NODES[shortestPath[stepIndex - 1]];
      const sectionDist = getDistance(prevNode, nextNode);
      distRemaining = Math.max(0, distRemaining - sectionDist);

      setGpsCoordinates([nextNode.lat, nextNode.lng]);
      setMapCenter([nextNode.lat, nextNode.lng]);
      setActiveStepIndex(stepIndex - 1);

      setSimState({
        nodeId: nextNode.id,
        name: nextNode.name,
        speed: "1.4 m/s (Walking)",
        remainingDist: Math.round(distRemaining),
        status: `Passing: ${nextNode.name}`,
      });
    }, 2500);
  };

  const getStartLIcon = (name) => {
    return L.divIcon({
      html: `
        <div class="leaflet-start-pin-wrapper">
          <div class="leaflet-start-pin-label">
            🟢 START: ${name}
          </div>
          <div class="leaflet-start-pin-dot"></div>
        </div>
      `,
      className: "uber-start-pin",
      iconSize: [120, 42],
      iconAnchor: [60, 36],
    });
  };

  const getEndLIcon = (name) => {
    return L.divIcon({
      html: `
        <div class="leaflet-end-pin-wrapper">
          <div class="leaflet-end-pin-label">
            📍 DEST: ${name}
          </div>
          <div class="leaflet-end-pin-dot"></div>
        </div>
      `,
      className: "uber-end-pin",
      iconSize: [120, 42],
      iconAnchor: [60, 36],
    });
  };

  const getMinimalBuildingLIcon = (emoji) => {
    return L.divIcon({
      html: `
        <div class="leaflet-minimal-building-icon">
          ${emoji}
        </div>
      `,
      className: "custom-leaflet-building-minimal-icon",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  };

  const getGateLIcon = () => {
    return L.divIcon({
      html: `
        <div class="leaflet-gate-icon">
          🚪
        </div>
      `,
      className: "custom-leaflet-gate-icon",
      iconSize: [25, 25],
      iconAnchor: [12.5, 12.5],
    });
  };

  const getGPSLIcon = () => {
    return L.divIcon({
      html: `
        <div class="leaflet-gps-marker-wrapper">
          <div class="leaflet-gps-marker-dot"></div>
          <div class="leaflet-gps-marker-pulse"></div>
        </div>
      `,
      className: "custom-leaflet-gps-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getTurnIcon = (turnType) => {
    switch (turnType) {
      case "depart":
        return <Navigation size={15} className="turn-icon-depart" />;
      case "straight":
        return <ArrowUp size={15} className="turn-icon-straight" />;
      case "slight-right":
        return <ArrowUpRight size={15} className="turn-icon-slight-right" />;
      case "right":
        return <ArrowRight size={15} className="turn-icon-right" />;
      case "sharp-right":
        return <CornerDownRight size={15} className="turn-icon-sharp-right" />;
      case "slight-left":
        return <ArrowUpLeft size={15} className="turn-icon-slight-left" />;
      case "left":
        return <ArrowLeft size={15} className="turn-icon-left" />;
      case "sharp-left":
        return <CornerDownLeft size={15} className="turn-icon-sharp-left" />;
      default:
        return <ArrowUp size={15} className="turn-icon-straight" />;
    }
  };

  const polylinePositions = shortestPath.map((nodeId) => [
    GRAPH_NODES[nodeId].lat,
    GRAPH_NODES[nodeId].lng,
  ]);

  return (
    <div className="navigate-container" id="navigate-panel">
      {/* 2.1 Route controls panel (Left on desktop, Bottom slide overlay on mobile) */}
      <div
        className={`nav-controls-panel ${panelCollapsed ? "collapsed" : ""}`}
        id="nav-controls-and-stats"
      >
        <div
          className="panel-mobile-drag-bar"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
        />

        <div
          className={`panel-toggle-header ${panelCollapsed ? "collapsed" : ""}`}
          onClick={() => setPanelCollapsed(!panelCollapsed)}
        >
          <div className="panel-toggle-header-left">
            <span className="panel-toggle-icon">🧭</span>
            <div>
              <span className="panel-toggle-title">Route Planner</span>
              {panelCollapsed && (
                <span className="panel-toggle-subtitle">
                  Tap to expand and set route
                </span>
              )}
            </div>
          </div>
          <button type="button" className="panel-toggle-btn">
            {panelCollapsed ? "EXPAND" : "MINIMIZE"}
          </button>
        </div>

        {!panelCollapsed && (
          <div className="controls-scrollable-content">
            <form
              className="route-form"
              id="navigation-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="select-group">
                <label htmlFor="select-start-point" className="select-label">
                  Starting Point
                </label>
                <div className="select-wrapper">
                  <span className="select-icon">
                    <Navigation size={14} className="select-icon-nav" />
                  </span>
                  <select
                    id="select-start-point"
                    className="custom-select route-select"
                    value={startId}
                    onChange={(e) => {
                      if (simActive) return;
                      setStartId(e.target.value);
                    }}
                    disabled={simActive}
                  >
                    <option value="gate">
                      🚪 Main Campus Gate (Tesano Entrada)
                    </option>
                    {BUILDING_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.emoji} {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="swap-btn-container">
                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwap}
                  id="swap-route-direction-btn"
                  title="Reverse route start & end"
                  disabled={simActive}
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="select-group">
                <label htmlFor="select-end-point" className="select-label">
                  Destination
                </label>
                <div className="select-wrapper">
                  <span className="select-icon">
                    <Landmark size={14} className="select-icon-nav" />
                  </span>
                  <select
                    id="select-end-point"
                    className="custom-select route-select"
                    value={endId}
                    onChange={(e) => {
                      if (simActive) return;
                      setEndId(e.target.value);
                    }}
                    disabled={simActive}
                  >
                    {BUILDING_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.emoji} {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="gps-controls">
                <div className="gps-controls-grid">
                  <button
                    type="button"
                    id="simulate-walk-btn"
                    className={`action-btn sim-btn ${simActive ? "active" : ""}`}
                    onClick={startSimulation}
                  >
                    {simActive ? (
                      <>
                        <Square size={12} /> Stop Demo
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Walk Demo
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="locate-me-btn"
                    className={`action-btn locate-btn ${realGpsActive ? "active" : ""}`}
                    onClick={toggleRealGPS}
                  >
                    <GpsIcon
                      size={12}
                      className={realGpsActive ? "animate-spin" : ""}
                    />
                    {realGpsActive ? "Stop Live GPS" : "Real Device GPS"}
                  </button>
                </div>

                {realGpsActive && (
                  <div className="real-gps-notice">
                    <span className="real-gps-notice-title">
                      📡 Real Hardware GPS Watch Active:
                    </span>{" "}
                    Uses your physical mobile/laptop hardware. Open this on a
                    phone outdoors, walk, and see the blue dot update live!
                  </div>
                )}
              </div>
            </form>

            {simState && (
              <div
                className="simulation-banner walk-banner"
                id="gps-hud-indicator"
              >
                <div className="walk-banner-label">
                  Active Walking Simulation
                </div>
                <div className="walk-banner-status">{simState.status}</div>
                <div className="walk-banner-stats">
                  <span>Speed: {simState.speed}</span>
                  <span className="walk-banner-remaining">
                    Left: {simState.remainingDist}m
                  </span>
                </div>
              </div>
            )}

            {shortestPath.length > 0 && (
              <div
                className="route-summary-card compact"
                id="route-path-summary"
              >
                <div className="route-summary-title compact-title">
                  <span className="route-summary-heading">
                    🚶 Route Walk Log
                  </span>
                  <span
                    className="route-distance-pill compact-pill"
                    id="route-meters-span"
                  >
                    {Math.round(totalDistance)} meters
                  </span>
                </div>

                <ul className="tbt-list compact-list" id="tbt-list-ul">
                  {steps.map((step, idx) => {
                    const stepVisited =
                      simActive && shortestPath.indexOf(simState?.nodeId) > idx;
                    const stepActive =
                      simActive && simState?.nodeId === shortestPath[idx];

                    return (
                      <li
                        key={step.key}
                        className={`tbt-step ${stepVisited ? "visited" : ""} ${stepActive ? "active" : ""}`}
                      >
                        <span className="tbt-step-icon">
                          {getTurnIcon(step.turnType)}
                        </span>
                        <div className="tbt-step-text">
                          <p
                            className={`tbt-step-instruction ${stepActive ? "active" : ""}`}
                          >
                            {step.text}
                          </p>
                          <span
                            className={`tbt-step-distance ${stepActive ? "active" : ""}`}
                          >
                            ({step.distance} meters walk)
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2.3 Interactive Layer MAP container */}
      <div className="map-view-panel" id="campus-leaflet-map-container">
        {simActive && steps[activeStepIndex] && (
          <div
            id="floating-navigation-guide"
            className="floating-navigation-guide"
          >
            <div className="floating-guide-icon-box">
              {getTurnIcon(steps[activeStepIndex].turnType)}
            </div>
            <div className="floating-guide-text">
              <div className="floating-guide-label">Directional Guide</div>
              <p className="floating-guide-instruction">
                {steps[activeStepIndex].text}
              </p>
            </div>
            <div className="floating-guide-distance">
              <span className="floating-guide-distance-value">
                {steps[activeStepIndex].distance}m
              </span>
              <span className="floating-guide-distance-label">to turn</span>
            </div>
          </div>
        )}

        {/* State Toggle for Live Map vs Offline SVG Campus Schematic */}
        <div
          className={`map-style-toggle ${theme === "dark" ? "dark" : "light"} ${simActive ? "shifted" : ""}`}
        >
          <button
            onClick={() => setMapViewStyle("leaflet")}
            className={`map-style-btn ${mapViewStyle === "leaflet" ? "active" : ""} ${theme === "dark" ? "dark" : "light"}`}
          >
            🗺️ Live Map
          </button>
          <button
            onClick={() => setMapViewStyle("schematic")}
            className={`map-style-btn ${mapViewStyle === "schematic" ? "active" : ""} ${theme === "dark" ? "dark" : "light"}`}
          >
            📐 Blueprint (Offline)
          </button>
        </div>

        {!isOnline && (
          <div className="offline-badge">
            📡 Offline Mode: GCTU local blueprint loaded
          </div>
        )}

        <div className="gps-map-telemetry" id="gps-mapping-telemetry-panel">
          <div className="telemetry-row">
            <span>Center Lat:</span>
            <span className="telemetry-val">{mapCenter[0].toFixed(5)}</span>
          </div>
          <div className="telemetry-row">
            <span>Center Lng:</span>
            <span className="telemetry-val">{mapCenter[1].toFixed(5)}</span>
          </div>
          <div className="telemetry-row">
            <span>GPS Tracking:</span>
            <span
              className={`telemetry-val ${gpsActive ? "gps-on" : "gps-off"}`}
            >
              {gpsActive ? (simActive ? "MOVING" : "STANDBY") : "STANDBY"}
            </span>
          </div>
        </div>

        {mapViewStyle === "schematic" ? (
          <div
            className={`schematic-container ${theme === "dark" ? "dark" : "light"}`}
          >
            <div
              className={`schematic-grid-bg ${theme === "dark" ? "dark" : "light"}`}
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="schematic-svg"
            >
              {GRAPH_EDGES.map((edge, index) => {
                const from = getSvgCoordinates(edge.from);
                const to = getSvgCoordinates(edge.to);
                return (
                  <line
                    key={`sch-edge-${index}`}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    className={`schematic-edge ${theme === "dark" ? "dark" : "light"}`}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="1,1"
                  />
                );
              })}

              {shortestPath.length > 1 &&
                shortestPath.map((nodeId, idx) => {
                  if (idx === shortestPath.length - 1) return null;
                  const from = getSvgCoordinates(nodeId);
                  const to = getSvgCoordinates(shortestPath[idx + 1]);
                  return (
                    <g key={`sch-route-${idx}`}>
                      <line
                        x1={`${from.x}%`}
                        y1={`${from.y}%`}
                        x2={`${to.x}%`}
                        y2={`${to.y}%`}
                        className="schematic-route-halo"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                      <line
                        x1={`${from.x}%`}
                        y1={`${from.y}%`}
                        x2={`${to.x}%`}
                        y2={`${to.y}%`}
                        className="schematic-route-core"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}

              {Object.keys(GRAPH_NODES).map((id) => {
                const node = GRAPH_NODES[id];
                if (node.type !== "junction") return null;
                const pos = getSvgCoordinates(id);
                return (
                  <circle
                    key={`sch-junc-${id}`}
                    cx={`${pos.x}%`}
                    cy={`${pos.y}%`}
                    r="1.2"
                    className={`schematic-junction ${theme === "dark" ? "dark" : "light"}`}
                  />
                );
              })}

              {gpsActive &&
                gpsCoordinates &&
                (() => {
                  const pos = mapToSvg(gpsCoordinates[0], gpsCoordinates[1]);
                  return (
                    <g key="sch-gps-tracer">
                      <circle
                        cx={`${parseFloat(pos.x)}%`}
                        cy={`${parseFloat(pos.y)}%`}
                        r="4"
                        className="schematic-gps-pulse animate-ping"
                      />
                      <circle
                        cx={`${parseFloat(pos.x)}%`}
                        cy={`${parseFloat(pos.y)}%`}
                        r="1.8"
                        className="schematic-gps-dot"
                        strokeWidth="0.6"
                      />
                    </g>
                  );
                })()}
            </svg>

            {Object.keys(GRAPH_NODES).map((id) => {
              const node = GRAPH_NODES[id];
              if (node.type !== "building" && id !== "gate") return null;
              const pos = getSvgCoordinates(id);
              const isSelectedStart = id === startId;
              const isSelectedEnd = id === endId;
              const details = BUILDING_LIST.find((b) => b.id === id);
              const emoji = id === "gate" ? "🚪" : details?.emoji || "🏫";
              const shortName =
                id === "gate" ? "Main Gate" : details?.shortName || node.name;

              let bubbleClass = "schematic-bubble";
              if (isSelectedStart) bubbleClass += " start";
              else if (isSelectedEnd) bubbleClass += " end";
              else bubbleClass += theme === "dark" ? " dark" : " light";

              let labelClass = "schematic-bubble-label";
              if (isSelectedStart) labelClass += " start";
              else if (isSelectedEnd)
                labelClass += theme === "dark" ? " end-dark" : " end-light";
              else labelClass += theme === "dark" ? " dark" : " light";

              return (
                <div
                  key={`sch-bubble-${id}`}
                  onClick={() => {
                    if (simActive) return;
                    setEndId(id);
                  }}
                  className={`schematic-bubble-wrapper ${simActive ? "disabled" : ""} ${isSelectedStart || isSelectedEnd ? "elevated" : ""}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div
                    className={`${bubbleClass} ${isSelectedStart || isSelectedEnd ? "large" : ""}`}
                  >
                    {emoji}
                  </div>

                  <span
                    className={`${labelClass} ${theme === "dark" ? "bg-dark" : "bg-light"} ${isSelectedStart || isSelectedEnd ? "bold" : ""}`}
                  >
                    {shortName}
                  </span>
                </div>
              );
            })}

            <div
              className={`schematic-status-bar ${theme === "dark" ? "dark" : "light"}`}
            >
              <span className="schematic-status-dot" />
              <strong>Offline-Ready Blueprint</strong>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={defaultCenter ? 18 : 17}
            scrollWheelZoom={true}
            className="leaflet-map-fill"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={
                theme === "dark"
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
            />

            <MapController center={mapCenter} zoom={mapZoom} active={active} />

            {polylinePositions.length > 0 && (
              <>
                <Polyline
                  positions={polylinePositions}
                  color="#000000"
                  weight={9}
                  opacity={0.16}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  positions={polylinePositions}
                  color="#0055FF"
                  weight={5}
                  opacity={0.95}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}

            {polylinePositions.length > 0 && (
              <Marker
                position={
                  polylinePositions[Math.floor(polylinePositions.length / 2)]
                }
                icon={L.divIcon({
                  html: `
                    <div class="leaflet-distance-badge">
                      ⚡️ ${(totalDistance / 1000).toFixed(2)} km (${Math.round(totalDistance)}m)
                    </div>
                  `,
                  className: "custom-path-midpoint-badge",
                  iconSize: [110, 24],
                  iconAnchor: [55, 12],
                })}
              />
            )}

            {polylinePositions.length > 0 && (
              <Marker
                position={polylinePositions[0]}
                icon={getStartLIcon(GRAPH_NODES[startId].name)}
                zIndexOffset={100}
              />
            )}

            {polylinePositions.length > 0 && (
              <Marker
                position={polylinePositions[polylinePositions.length - 1]}
                icon={getEndLIcon(GRAPH_NODES[endId].name)}
                zIndexOffset={200}
              />
            )}

            {startId !== "gate" && endId !== "gate" && (
              <Marker
                position={[GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]}
                icon={getGateLIcon()}
              >
                <Popup>
                  <div className="popup-title">
                    🚪 GCTU Main Campus Entrance
                  </div>
                  <div className="popup-subtitle">
                    Entrance along J.A. Kufuor Avenue, Tesano, Accra.
                  </div>
                </Popup>
              </Marker>
            )}

            {BUILDING_LIST.map((building) => {
              if (building.id === startId || building.id === endId) return null;

              return (
                <Marker
                  key={building.id}
                  position={[building.lat, building.lng]}
                  icon={getMinimalBuildingLIcon(building.emoji)}
                >
                  <Popup>
                    <div className="popup-building-content">
                      <span className="popup-building-name">
                        {building.name}
                      </span>
                      <span className="category-badge popup-category-badge">
                        {building.category}
                      </span>
                      <p className="popup-building-desc">{building.desc}</p>
                      <button
                        className="popup-set-destination-btn"
                        onClick={() => {
                          if (simActive) return;
                          setEndId(building.id);
                        }}
                      >
                        Set Destination
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {gpsActive && gpsCoordinates && (
              <Marker
                position={gpsCoordinates}
                icon={getGPSLIcon()}
                zIndexOffset={500}
              >
                <Popup>
                  <div className="popup-gps-title">
                    📡{" "}
                    {simActive
                      ? "Simulating GPS walking route..."
                      : "User Live Simulated GPS Dot"}
                  </div>
                  <div className="popup-gps-coords">
                    [{gpsCoordinates[0].toFixed(5)},{" "}
                    {gpsCoordinates[1].toFixed(5)}]
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
