import React, { useEffect, useRef, useState } from "react";
import { BUILDING_LIST, GRAPH_NODES, GRAPH_EDGES } from "../data/buildings";

import {
  Navigation,
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
} from "lucide-react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import "./NavigationPanel.css";

/* =========================================================
   LEAFLET MAP CONTROLLER
========================================================= */

function MapController({ center, zoom, active, fitPoints }) {
  const map = useMap();

  const hasFitRef = useRef(false);

  useEffect(() => {
    if (fitPoints && fitPoints.length > 1) {
      if (!hasFitRef.current) {
        const bounds = L.latLngBounds(fitPoints);
        map.fitBounds(bounds, { padding: [60, 60], animate: true });
        hasFitRef.current = true;
      }
      return;
    }

    hasFitRef.current = false;

    if (
      Array.isArray(center) &&
      center.length === 2 &&
      Number.isFinite(center[0]) &&
      Number.isFinite(center[1])
    ) {
      map.setView(center, zoom || 18, {
        animate: true,
      });
    }
  }, [center, zoom, fitPoints, map]);

  useEffect(() => {
    const invalidateMapSize = () => {
      try {
        map.invalidateSize(false);
      } catch (error) {
        console.warn("Leaflet invalidateSize warning:", error);
      }
    };

    invalidateMapSize();

    const timer1 = setTimeout(invalidateMapSize, 50);
    const timer2 = setTimeout(invalidateMapSize, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [active, map]);

  return null;
}

/* =========================================================
   DISTANCE CALCULATION
========================================================= */

export function getDistance(node1, node2) {
  if (!node1 || !node2) {
    return 0;
  }

  const R = 6371000;

  const lat1 = (node1.lat * Math.PI) / 180;
  const lat2 = (node2.lat * Math.PI) / 180;

  const deltaLat = ((node2.lat - node1.lat) * Math.PI) / 180;
  const deltaLng = ((node2.lng - node1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/* =========================================================
   DIJKSTRA SHORTEST PATH
========================================================= */

export function findDijkstraPath(startId, endId) {
  const nodes = GRAPH_NODES;
  const edges = GRAPH_EDGES;

  if (!nodes[startId] || !nodes[endId]) {
    return {
      path: [],
      distance: 0,
    };
  }

  if (startId === endId) {
    return {
      path: [startId],
      distance: 0,
    };
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
      }

      if (edge.to === currentId && unvisited.has(edge.from)) {
        neighbors.push(edge.from);
      }
    });

    neighbors.forEach((neighborId) => {
      const distance = getDistance(nodes[currentId], nodes[neighborId]);

      const alternative = distances[currentId] + distance;

      if (alternative < distances[neighborId]) {
        distances[neighborId] = alternative;
        previous[neighborId] = currentId;
      }
    });
  }

  const path = [];

  let current = endId;

  if (previous[current] !== null || current === startId) {
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
  }

  return {
    path,
    distance: distances[endId] === Infinity ? 0 : distances[endId],
  };
}

/* =========================================================
   TURN-BY-TURN DIRECTIONS
========================================================= */

function generateTurnByTurn(path) {
  if (!path || path.length < 2) {
    return [];
  }

  const directions = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = GRAPH_NODES[path[i]];
    const toNode = GRAPH_NODES[path[i + 1]];

    if (!fromNode || !toNode) {
      continue;
    }

    const distance = getDistance(fromNode, toNode);

    let turnType = "straight";
    let instruction = "";

    if (i === 0) {
      turnType = "depart";

      instruction = `Depart from ${fromNode.name} and head directly toward ${toNode.name}.`;
    } else {
      const previousNode = GRAPH_NODES[path[i - 1]];

      if (!previousNode) {
        continue;
      }

      const angle1 =
        (Math.atan2(
          fromNode.lng - previousNode.lng,
          fromNode.lat - previousNode.lat,
        ) *
          180) /
        Math.PI;

      const angle2 =
        (Math.atan2(toNode.lng - fromNode.lng, toNode.lat - fromNode.lat) *
          180) /
        Math.PI;

      let difference = angle2 - angle1;

      while (difference < -180) {
        difference += 360;
      }

      while (difference > 180) {
        difference -= 360;
      }

      if (Math.abs(difference) < 22) {
        turnType = "straight";

        instruction = `Continue straight past ${fromNode.name} toward ${toNode.name}.`;
      } else if (difference >= 22 && difference < 65) {
        turnType = "slight-right";

        instruction = `Bear slightly right at ${fromNode.name} toward ${toNode.name}.`;
      } else if (difference >= 65 && difference < 125) {
        turnType = "right";

        instruction = `Turn right at ${fromNode.name} and walk toward ${toNode.name}.`;
      } else if (difference >= 125) {
        turnType = "sharp-right";

        instruction = `Make a sharp right turn at ${fromNode.name} toward ${toNode.name}.`;
      } else if (difference <= -22 && difference > -65) {
        turnType = "slight-left";

        instruction = `Bear slightly left at ${fromNode.name} toward ${toNode.name}.`;
      } else if (difference <= -65 && difference > -125) {
        turnType = "left";

        instruction = `Turn left at ${fromNode.name} and proceed toward ${toNode.name}.`;
      } else {
        turnType = "sharp-left";

        instruction = `Make a sharp left turn at ${fromNode.name} toward ${toNode.name}.`;
      }
    }

    directions.push({
      key: i,
      from: fromNode.name,
      to: toNode.name,
      text: instruction,
      turnType,
      distance: Math.round(distance),
    });
  }

  return directions;
}

/* =========================================================
   NAVIGATION PANEL
========================================================= */

export default function NavigationPanel({
  presetDestination,
  clearPresetDestination,
  theme,
  active,
}) {
  /* -------------------------------------------------------
     MAP STATE
  ------------------------------------------------------- */

  const defaultCenter = [5.602, -0.2285];

  const [mapViewStyle, setMapViewStyle] = useState("leaflet");

  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const [mapZoom, setMapZoom] = useState(18);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  /* -------------------------------------------------------
     ROUTE STATE
  ------------------------------------------------------- */

  const [startId, setStartId] = useState("gate");

  const [endId, setEndId] = useState("focis");

  const [shortestPath, setShortestPath] = useState([]);

  const [totalDistance, setTotalDistance] = useState(0);

  const [steps, setSteps] = useState([]);

  /* -------------------------------------------------------
     GPS STATE
  ------------------------------------------------------- */

  const [gpsActive, setGpsActive] = useState(false);

  const [simActive, setSimActive] = useState(false);

  const [realGpsActive, setRealGpsActive] = useState(false);

  const [simState, setSimState] = useState(null);

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [gpsCoordinates, setGpsCoordinates] = useState(defaultCenter);

  /* -------------------------------------------------------
     PANEL STATE
  ------------------------------------------------------- */

  const [panelCollapsed, setPanelCollapsed] = useState(false);

  /* -------------------------------------------------------
     REFS
  ------------------------------------------------------- */

  const simIntervalRef = useRef(null);

  const realGpsWatchRef = useRef(null);

  /* =======================================================
     ONLINE / OFFLINE
  ======================================================= */

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMapViewStyle("schematic");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);

      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);

        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  /* =======================================================
     PRESET DESTINATION
  ======================================================= */

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
      setEndId(match.id);
      setStartId("gate");

      setMapCenter([match.lat, match.lng]);

      setPanelCollapsed(false);

      console.log(`Preset destination applied: ${match.name}`);
    }

    if (clearPresetDestination) {
      clearPresetDestination();
    }
  }, [presetDestination, clearPresetDestination]);

  /* =======================================================
     CALCULATE ROUTE
  ======================================================= */

  useEffect(() => {
    if (!startId || !endId) {
      return;
    }

    const result = findDijkstraPath(startId, endId);

    setShortestPath(result.path);

    setTotalDistance(result.distance);

    setSteps(generateTurnByTurn(result.path));

    if (result.path.length > 0) {
      const startNode = GRAPH_NODES[result.path[0]];

      if (startNode) {
        setMapCenter([startNode.lat, startNode.lng]);
      }
    }
  }, [startId, endId]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }

      if (
        realGpsWatchRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
      }
    };
  }, []);

  /* =======================================================
     SWAP ROUTE
  ======================================================= */

  const handleSwap = () => {
    if (simActive) {
      return;
    }

    const oldStart = startId;

    setStartId(endId);
    setEndId(oldStart);
  };

  /* =======================================================
     REAL DEVICE GPS
  ======================================================= */

  const toggleRealGPS = () => {
    if (simActive) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);

        simIntervalRef.current = null;
      }

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

      if (startNode) {
        setMapCenter([startNode.lat, startNode.lng]);
      }

      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Your device or browser does not support GPS location services.");

      return;
    }

    setRealGpsActive(true);
    setGpsActive(true);

    realGpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        console.log(
          `Live GPS: ${latitude}, ${longitude}, accuracy: ${accuracy}m`,
        );

        const newCoordinates = [latitude, longitude];

        setGpsCoordinates(newCoordinates);

        setMapCenter(newCoordinates);

        setMapZoom(18);
      },

      (error) => {
        console.error("GPS Watch error:", error);

        alert(`Could not read device GPS: ${error.message}`);

        setRealGpsActive(false);
        setGpsActive(false);
      },

      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  };

  /* =======================================================
     WALK SIMULATION
  ======================================================= */

  const startSimulation = () => {
    if (realGpsActive) {
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);

        realGpsWatchRef.current = null;
      }

      setRealGpsActive(false);
    }

    if (simActive) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);

        simIntervalRef.current = null;
      }

      setSimActive(false);
      setGpsActive(false);
      setSimState(null);
      setActiveStepIndex(0);

      return;
    }

    if (shortestPath.length === 0) {
      alert("No route is available to simulate.");

      return;
    }

    const firstNode = GRAPH_NODES[shortestPath[0]];

    if (!firstNode) {
      return;
    }

    setGpsActive(true);
    setSimActive(true);
    setActiveStepIndex(0);

    setGpsCoordinates([firstNode.lat, firstNode.lng]);

    setMapCenter([firstNode.lat, firstNode.lng]);

    let stepIndex = 0;
    let remainingDistance = totalDistance;

    setSimState({
      nodeId: shortestPath[0],
      name: firstNode.name,
      speed: "1.4 m/s (Walking)",
      remainingDist: Math.round(remainingDistance),
      status: "Starting simulation...",
    });

    simIntervalRef.current = setInterval(() => {
      stepIndex++;

      if (stepIndex >= shortestPath.length) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);

          simIntervalRef.current = null;
        }

        const destinationId = shortestPath[shortestPath.length - 1];

        const destinationNode = GRAPH_NODES[destinationId];

        setGpsCoordinates([destinationNode.lat, destinationNode.lng]);

        setMapCenter([destinationNode.lat, destinationNode.lng]);

        setSimState({
          nodeId: destinationId,
          name: destinationNode.name,
          speed: "0 m/s (Idle)",
          remainingDist: 0,
          status: "Arrived! Welcome to your destination!",
        });

        setSimActive(false);
        setGpsActive(false);
        setActiveStepIndex(0);

        if (typeof window !== "undefined" && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(
            `You have arrived at ${destinationNode.name}. Enjoy GCTU campus!`,
          );

          utterance.rate = 1;

          window.speechSynthesis.speak(utterance);
        }

        return;
      }

      const nextNode = GRAPH_NODES[shortestPath[stepIndex]];

      const previousNode = GRAPH_NODES[shortestPath[stepIndex - 1]];

      if (!nextNode || !previousNode) {
        return;
      }

      const sectionDistance = getDistance(previousNode, nextNode);

      remainingDistance = Math.max(0, remainingDistance - sectionDistance);

      setGpsCoordinates([nextNode.lat, nextNode.lng]);

      setMapCenter([nextNode.lat, nextNode.lng]);

      setActiveStepIndex(stepIndex - 1);

      setSimState({
        nodeId: nextNode.id,
        name: nextNode.name,
        speed: "1.4 m/s (Walking)",
        remainingDist: Math.round(remainingDistance),
        status: `Passing: ${nextNode.name}`,
      });
    }, 2500);
  };

  /* =======================================================
     SVG / OFFLINE MAP COORDINATES
  ======================================================= */

  const mapToSvg = (lat, lng) => {
    const minLat = 5.6006;
    const maxLat = 5.6027;

    const minLng = -0.2294;
    const maxLng = -0.2276;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;

    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

    return {
      x: x.toFixed(3),
      y: y.toFixed(3),
    };
  };

  const getSvgCoordinates = (nodeId) => {
    const node = GRAPH_NODES[nodeId];

    if (!node) {
      return {
        x: 50,
        y: 50,
      };
    }

    const position = mapToSvg(node.lat, node.lng);

    return {
      x: parseFloat(position.x),
      y: parseFloat(position.y),
    };
  };

  /* =======================================================
     LEAFLET ICONS
  ======================================================= */

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

  /* =======================================================
     TURN ICON
  ======================================================= */

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

  /* =======================================================
     ROUTE POLYLINE
  ======================================================= */

  const polylinePositions = shortestPath
    .map((nodeId) => {
      const node = GRAPH_NODES[nodeId];

      if (!node) {
        return null;
      }

      return [node.lat, node.lng];
    })
    .filter(Boolean);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="navigate-container" id="navigate-panel">
      {/* ===================================================
          ROUTE CONTROL PANEL
      =================================================== */}

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
              onSubmit={(event) => event.preventDefault()}
            >
              {/* START */}

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
                    onChange={(event) => {
                      if (simActive) {
                        return;
                      }

                      setStartId(event.target.value);
                    }}
                    disabled={simActive}
                  >
                    <option value="gate">🚪 Main Campus Gate</option>

                    {BUILDING_LIST.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.emoji} {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SWAP */}

              <div className="swap-btn-container">
                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwap}
                  id="swap-route-direction-btn"
                  title="Reverse route start and end"
                  disabled={simActive}
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* DESTINATION */}

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
                    onChange={(event) => {
                      if (simActive) {
                        return;
                      }

                      setEndId(event.target.value);
                    }}
                    disabled={simActive}
                  >
                    {BUILDING_LIST.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.emoji} {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GPS BUTTONS */}

              <div className="gps-controls">
                <div className="gps-controls-grid">
                  <button
                    type="button"
                    id="simulate-walk-btn"
                    className={`action-btn sim-btn ${
                      simActive ? "active" : ""
                    }`}
                    onClick={startSimulation}
                  >
                    {simActive ? (
                      <>
                        <Square size={12} />
                        Stop Demo
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        Walk Demo
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="locate-me-btn"
                    className={`action-btn locate-btn ${
                      realGpsActive ? "active" : ""
                    }`}
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
                      📡 Live GPS Active:
                    </span>{" "}
                    Your device GPS is being monitored. Open this page on a
                    phone outdoors and move around to see the blue marker
                    update.
                  </div>
                )}
              </div>
            </form>

            {/* =================================================
                SIMULATION STATUS
            ================================================= */}

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

            {/* =================================================
                ROUTE SUMMARY
            ================================================= */}

            {shortestPath.length > 1 && (
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
                  {steps.map((step, index) => {
                    const currentNodeIndex = shortestPath.indexOf(
                      simState?.nodeId,
                    );

                    const stepVisited = simActive && currentNodeIndex > index;

                    const stepActive =
                      simActive && simState?.nodeId === shortestPath[index];

                    return (
                      <li
                        key={step.key}
                        className={`tbt-step ${stepVisited ? "visited" : ""} ${
                          stepActive ? "active" : ""
                        }`}
                      >
                        <span className="tbt-step-icon">
                          {getTurnIcon(step.turnType)}
                        </span>

                        <div className="tbt-step-text">
                          <p
                            className={`tbt-step-instruction ${
                              stepActive ? "active" : ""
                            }`}
                          >
                            {step.text}
                          </p>

                          <span
                            className={`tbt-step-distance ${
                              stepActive ? "active" : ""
                            }`}
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

      {/* =====================================================
          MAP
      ===================================================== */}

      <div className="map-view-panel" id="campus-leaflet-map-container">
        {/* FLOATING NAVIGATION GUIDE */}

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

        {/* MAP STYLE TOGGLE */}

        <div
          className={`map-style-toggle ${theme === "dark" ? "dark" : "light"} ${
            simActive ? "shifted" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setMapViewStyle("leaflet")}
            className={`map-style-btn ${
              mapViewStyle === "leaflet" ? "active" : ""
            } ${theme === "dark" ? "dark" : "light"}`}
          >
            🗺️ Live Map
          </button>

          <button
            type="button"
            onClick={() => setMapViewStyle("schematic")}
            className={`map-style-btn ${
              mapViewStyle === "schematic" ? "active" : ""
            } ${theme === "dark" ? "dark" : "light"}`}
          >
            📐 Blueprint
          </button>
        </div>

        {/* OFFLINE */}

        {!isOnline && (
          <div className="offline-badge">
            📡 Offline Mode: GCTU local blueprint loaded
          </div>
        )}

        {/* TELEMETRY */}

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
              {gpsActive ? (simActive ? "MOVING" : "LIVE") : "STANDBY"}
            </span>
          </div>
        </div>

        {/* ===================================================
            OFFLINE SCHEMATIC
        =================================================== */}

        {mapViewStyle === "schematic" ? (
          <div
            className={`schematic-container ${
              theme === "dark" ? "dark" : "light"
            }`}
          >
            <div
              className={`schematic-grid-bg ${
                theme === "dark" ? "dark" : "light"
              }`}
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="schematic-svg"
            >
              {/* GRAPH EDGES */}

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
                    className={`schematic-edge ${
                      theme === "dark" ? "dark" : "light"
                    }`}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="1,1"
                  />
                );
              })}

              {/* ROUTE */}

              {shortestPath.length > 1 &&
                shortestPath.map((nodeId, index) => {
                  if (index === shortestPath.length - 1) {
                    return null;
                  }

                  const from = getSvgCoordinates(nodeId);

                  const to = getSvgCoordinates(shortestPath[index + 1]);

                  return (
                    <g key={`sch-route-${index}`}>
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

              {/* JUNCTIONS */}

              {Object.keys(GRAPH_NODES).map((id) => {
                const node = GRAPH_NODES[id];

                if (node.type !== "junction") {
                  return null;
                }

                const position = getSvgCoordinates(id);

                return (
                  <circle
                    key={`sch-junc-${id}`}
                    cx={`${position.x}%`}
                    cy={`${position.y}%`}
                    r="1.2"
                    className={`schematic-junction ${
                      theme === "dark" ? "dark" : "light"
                    }`}
                  />
                );
              })}

              {/* GPS */}

              {gpsActive &&
                gpsCoordinates &&
                (() => {
                  const position = mapToSvg(
                    gpsCoordinates[0],
                    gpsCoordinates[1],
                  );

                  return (
                    <g key="sch-gps-tracer">
                      <circle
                        cx={`${parseFloat(position.x)}%`}
                        cy={`${parseFloat(position.y)}%`}
                        r="4"
                        className="schematic-gps-pulse animate-ping"
                      />

                      <circle
                        cx={`${parseFloat(position.x)}%`}
                        cy={`${parseFloat(position.y)}%`}
                        r="1.8"
                        className="schematic-gps-dot"
                        strokeWidth="0.6"
                      />
                    </g>
                  );
                })()}
            </svg>

            {/* BUILDING LABELS */}

            {Object.keys(GRAPH_NODES).map((id) => {
              const node = GRAPH_NODES[id];

              if (node.type !== "building" && id !== "gate") {
                return null;
              }

              const position = getSvgCoordinates(id);

              const isSelectedStart = id === startId;

              const isSelectedEnd = id === endId;

              const details = BUILDING_LIST.find(
                (building) => building.id === id,
              );

              const emoji = id === "gate" ? "🚪" : details?.emoji || "🏫";

              const shortName =
                id === "gate" ? "Main Gate" : details?.shortName || node.name;

              let bubbleClass = "schematic-bubble";

              if (isSelectedStart) {
                bubbleClass += " start";
              } else if (isSelectedEnd) {
                bubbleClass += " end";
              } else {
                bubbleClass += theme === "dark" ? " dark" : " light";
              }

              let labelClass = "schematic-bubble-label";

              if (isSelectedStart) {
                labelClass += " start";
              } else if (isSelectedEnd) {
                labelClass += theme === "dark" ? " end-dark" : " end-light";
              } else {
                labelClass += theme === "dark" ? " dark" : " light";
              }

              return (
                <div
                  key={`sch-bubble-${id}`}
                  onClick={() => {
                    if (simActive) {
                      return;
                    }

                    setEndId(id);
                  }}
                  className={`schematic-bubble-wrapper ${
                    simActive ? "disabled" : ""
                  } ${isSelectedStart || isSelectedEnd ? "elevated" : ""}`}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                >
                  <div
                    className={`${bubbleClass} ${
                      isSelectedStart || isSelectedEnd ? "large" : ""
                    }`}
                  >
                    {emoji}
                  </div>

                  <span
                    className={`${labelClass} ${
                      theme === "dark" ? "bg-dark" : "bg-light"
                    } ${isSelectedStart || isSelectedEnd ? "bold" : ""}`}
                  >
                    {shortName}
                  </span>
                </div>
              );
            })}

            <div
              className={`schematic-status-bar ${
                theme === "dark" ? "dark" : "light"
              }`}
            >
              <span className="schematic-status-dot" />

              <strong>Offline-Ready Blueprint</strong>
            </div>
          </div>
        ) : (
          /* =================================================
             LEAFLET MAP
          ================================================= */

          <MapContainer
            center={defaultCenter}
            zoom={18}
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

            <MapController
              center={mapCenter}
              zoom={mapZoom}
              active={active}
              fitPoints={
                realGpsActive && polylinePositions.length > 1 && gpsCoordinates
                  ? [...polylinePositions, gpsCoordinates]
                  : null
              }
            />

            {/* ROUTE SHADOW */}

            {polylinePositions.length > 1 && (
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

            {/* DISTANCE BADGE */}

            {polylinePositions.length > 1 && (
              <Marker
                position={
                  polylinePositions[Math.floor(polylinePositions.length / 2)]
                }
                icon={L.divIcon({
                  html: `
                    <div class="leaflet-distance-badge">
                      ⚡ ${(totalDistance / 1000).toFixed(2)} km
                      (${Math.round(totalDistance)}m)
                    </div>
                  `,

                  className: "custom-path-midpoint-badge",

                  iconSize: [110, 24],

                  iconAnchor: [55, 12],
                })}
              />
            )}

            {/* START MARKER */}

            {polylinePositions.length > 0 && GRAPH_NODES[startId] && (
              <Marker
                position={polylinePositions[0]}
                icon={getStartLIcon(GRAPH_NODES[startId].name)}
                zIndexOffset={100}
              />
            )}

            {/* DESTINATION MARKER */}

            {polylinePositions.length > 0 && GRAPH_NODES[endId] && (
              <Marker
                position={polylinePositions[polylinePositions.length - 1]}
                icon={getEndLIcon(GRAPH_NODES[endId].name)}
                zIndexOffset={200}
              />
            )}

            {/* MAIN GATE */}

            {startId !== "gate" && endId !== "gate" && GRAPH_NODES.gate && (
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

            {/* BUILDINGS */}

            {BUILDING_LIST.map((building) => {
              if (building.id === startId || building.id === endId) {
                return null;
              }

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
                        type="button"
                        className="popup-set-destination-btn"
                        onClick={() => {
                          if (simActive) {
                            return;
                          }

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

            {/* LIVE GPS MARKER */}

            {gpsActive && gpsCoordinates && (
              <Marker
                position={gpsCoordinates}
                icon={getGPSLIcon()}
                zIndexOffset={500}
              >
                <Popup>
                  <div className="popup-gps-title">
                    📡{" "}
                    {simActive ? "Walking simulation GPS" : "Live device GPS"}
                  </div>

                  <div className="popup-gps-coords">
                    [{gpsCoordinates[0].toFixed(6)},{" "}
                    {gpsCoordinates[1].toFixed(6)}]
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
