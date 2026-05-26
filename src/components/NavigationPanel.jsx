import React, { useState, useEffect, useRef } from 'react';
import { BUILDING_LIST, GRAPH_NODES, GRAPH_EDGES } from '../data/buildings';
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
  Info
} from 'lucide-react';

// Leaflet imports
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';

// Re-centering hook for Leaflet map container updates
function MapController({ center, zoom, active }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 18, { animate: true });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    // Force Leaflet to inspect container physical dimensions and draw tiles instantly
    const triggerInvalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch (e) {
        console.warn("Leaflet map invalidateSize warning:", e);
      }
    };

    triggerInvalidate();

    if (active) {
      // Execute instantly and also with a subtle delay to account for web container drawing cycles
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

// 1. Distance calculator (Haversine formula in meters)
// The Haversine formula calculates the great-circle distance between two points on a sphere 
// given their longitudes and latitudes. This is critical for geographic projections on maps
// as it factors in Earth's spherical curvature (radius R = 6,371 km).
export function getDistance(node1, node2) {
  const R = 6371e3; // Earth radius in meters
  const lat1 = node1.lat * Math.PI / 180;
  const lat2 = node2.lat * Math.PI / 180;
  const deltaLat = (node2.lat - node1.lat) * Math.PI / 180;
  const deltaLng = (node2.lng - node1.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

// 2. Dijkstra Shortest Path Finder Algorithm
// This algorithm resolves the absolute shortest walkway distance between any two locations
// in GCTU by iterating over the campus graph (defined by vertices and undirected edge routes).
// It maintains a state map of distances populated greedily, selecting the node with the minimum
// cumulative cost at each turn, updating neighboring vertex coordinates dynamically.
export function findDijkstraPath(startId, endId) {
  const nodes = GRAPH_NODES;
  const edges = GRAPH_EDGES;

  if (!nodes[startId] || !nodes[endId]) {
    return { path: [], distance: 0 };
  }

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  // Initialize all nodes with custom default value of Infinity
  Object.keys(nodes).forEach(id => {
    distances[id] = Infinity;
    previous[id] = null;
    unvisited.add(id);
  });
  distances[startId] = 0; // Cumulative distance to the start vertex is zero

  while (unvisited.size > 0) {
    // Greedily find unvisited node with minimum distance
    let currentId = null;
    unvisited.forEach(id => {
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

    // Get unvisited neighboring walkways
    const neighbors = [];
    edges.forEach(edge => {
      if (edge.from === currentId && unvisited.has(edge.to)) {
        neighbors.push(edge.to);
      } else if (edge.to === currentId && unvisited.has(edge.from)) {
        neighbors.push(edge.from);
      }
    });

    // Relax the edges ofneighbors and calculate weight options
    neighbors.forEach(neighborId => {
      const dist = getDistance(nodes[currentId], nodes[neighborId]);
      const alt = distances[currentId] + dist;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
      }
    });
  }

  // Backtrack from the target building through previous nodes to construct final route array
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
    distance: distances[endId] === Infinity ? 0 : distances[endId]
  };
}

// 3. Build detailed, user-friendly directions
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
      // Draw angles from previous segment to current segment
      const prevNode = GRAPH_NODES[path[i - 1]];
      const angle1 = Math.atan2(fromNode.lng - prevNode.lng, fromNode.lat - prevNode.lat) * 180 / Math.PI;
      const angle2 = Math.atan2(toNode.lng - fromNode.lng, toNode.lat - fromNode.lat) * 180 / Math.PI;
      
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
      distance: Math.round(dist)
    });
  }

  return directions;
}

export default function NavigationPanel({ presetDestination, clearPresetDestination, theme, active }) {
  // High-performance offline-first view style selection ('leaflet' | 'schematic')
  const [mapViewStyle, setMapViewStyle] = useState('leaflet');
  const [isOnline, setIsOnline] = useState(navigator ? navigator.onLine : true);

  // Automatically switch to high-performance local schematic vector blueprint if off-grid
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setMapViewStyle('schematic'); // Active offline healing swap
    };

    if (typeof window !== "undefined") {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      if (!navigator.onLine) {
        setMapViewStyle('schematic');
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Proportional vector mapping helper from geographic GPS coordinates to visual SVG viewBox canvas
  const mapToSvg = (lat, lng) => {
    // Exact bounding perimeter of GCTU Tesano plot
    const minLat = 5.6006;
    const maxLat = 5.6027;
    const minLng = -0.2294;
    const maxLng = -0.2276;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - (((lat - minLat) / (maxLat - minLat)) * 100);
    return { x: `${x.toFixed(3)}%`, y: `${y.toFixed(3)}%` };
  };

  // Resolves the SVG pixel percentage position of any GCTU network node
  const getSvgCoordinates = (nodeId) => {
    const node = GRAPH_NODES[nodeId];
    if (!node) return { x: 50, y: 50 };
    const pos = mapToSvg(node.lat, node.lng);
    return { x: parseFloat(pos.x), y: parseFloat(pos.y) };
  };

  // Mapping options
  const defaultCenter = [5.6020, -0.2285]; // Central GCTU location
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(18);

  // Selector state
  const [startId, setStartId] = useState('gate'); // Start at Main Campus Gate
  const [endId, setEndId] = useState('focis'); // End at Faculty of Computing

  // Computed Path State
  const [shortestPath, setShortestPath] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [steps, setSteps] = useState([]);

  // Telemetry GPS simulation and real GPS tracking state
  const [gpsActive, setGpsActive] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const [realGpsActive, setRealGpsActive] = useState(false);
  const [simState, setSimState] = useState(null); // { currentNodeIndex, lat, lng, speed, remainingDist }
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [gpsCoordinates, setGpsCoordinates] = useState(defaultCenter);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  
  const simIntervalRef = useRef(null);
  const realGpsWatchRef = useRef(null);

  // Handle incoming 'presetDestination' from home tab clicks
  useEffect(() => {
    if (presetDestination) {
      const match = BUILDING_LIST.find(b => b.name === presetDestination || b.shortName === presetDestination);
      if (match) {
        setEndId(match.id);
        setStartId('gate'); // Default Start to gate
        setMapCenter([match.lat, match.lng]);
        setPanelCollapsed(false); // Make sure panel is open to show route
        
        // Auto alert to help desktop user notice simulation or paths loaded
        console.log(`Preset destination applied: ${match.name}`);
      }
      clearPresetDestination();
    }
  }, [presetDestination, clearPresetDestination]);

  // Recalculate route anytime start or end selectors change (or when simulations are stopped)
  useEffect(() => {
    if (startId && endId) {
      const result = findDijkstraPath(startId, endId);
      setShortestPath(result.path);
      setTotalDistance(result.distance);
      setSteps(generateTurnByTurn(result.path));
      
      // Sync map highlight to center on midpoint of path if exists
      if (result.path.length > 0) {
        const startNode = GRAPH_NODES[result.path[0]];
        setMapCenter([startNode.lat, startNode.lng]);
      }
    }
  }, [startId, endId]);

  // Clean simulation / watch loops on unmount
  useEffect(() => {
    return () => {
      clearInterval(simIntervalRef.current);
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
      }
    };
  }, []);

  const handleSwap = () => {
    if (simActive) return; // Disable swap during active walk
    const temp = startId;
    setStartId(endId);
    setEndId(temp);
  };

  // Toggle real-time hardware GPS location tracking on device
  // This utilizes the standard Web Geolocation API of modern browsers (navigator.geolocation).
  // When active, it triggers high-accuracy hardware updates, tapping into cellular triangulation,
  // Wi-Fi beacons, and physical GPS receiver chips on mobile devices and laptops.
  // As you walk, the browser returns live, changing coordinates, allowing the user's progress
  // to be rendered dynamically on our campus vector map.
  const toggleRealGPS = () => {
    // If demo simulation is running, stop it first
    if (simActive) {
      clearInterval(simIntervalRef.current);
      setSimActive(false);
      setSimState(null);
      setActiveStepIndex(0);
    }

    if (realGpsActive) {
      // Clear the active geolocation daemon watch to save battery / CPU resources
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
        realGpsWatchRef.current = null;
      }
      setRealGpsActive(false);
      setGpsActive(false);
      // Reset back to GCTU campus start coordinate
      const startNode = GRAPH_NODES[startId] || GRAPH_NODES.gate;
      setMapCenter([startNode.lat, startNode.lng]);
    } else {
      if (!navigator.geolocation) {
        alert("Your laptop or browser does not support Geolocation Services.");
        return;
      }

      setRealGpsActive(true);
      setGpsActive(true);

      // watchPosition registers a handler that will be called automatically each time the
      // physical position of the device changes.
      realGpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          // accuracy is returned in meters representing the 95% confidence radius
          console.log(`Real device GPS obtained: Lat ${latitude}, Lng ${longitude}, Error Margin: ${accuracy}m`);
          setGpsCoordinates([latitude, longitude]);
          // Center the Leaflet map on the student's actual physical location
          setMapCenter([latitude, longitude]);
          setMapZoom(18); // Zoom map closer for accurate walkway sight
        },
        (error) => {
          console.error("GPS Watch error", error);
          alert(`Could not read physical GPS hardware: ${error.message}. Please enable location permissions!`);
          setRealGpsActive(false);
          setGpsActive(false);
        },
        {
          enableHighAccuracy: true, // Forces physical GPS query instead of cheap cached network approximations
          maximumAge: 0,            // Ensures only fresh, instant hardware outputs are accepted
          timeout: 10000            // Generates timeout warning if hardware responds slowly
        }
      );
    }
  };

  // Launch Simulated Walking Walkway GPS Dijkstra Tracer
  // This loops over the precalculated shortest path array coordinates at 1.4 m/s.
  // Useful for students without physical GPS signals (e.g. indoors or on desktop computers).
  // Simulates step transitions, calculates leftover distances, and triggers text-to-speech directions.
  const startSimulation = () => {
    // Stop real hardware watch if active to avoid overlapping state updates
    if (realGpsActive) {
      if (realGpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(realGpsWatchRef.current);
        realGpsWatchRef.current = null;
      }
      setRealGpsActive(false);
    }

    if (simActive) {
      // Stop the animation cycle
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
    
    // Position simulation blue dot at first index
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
      status: "Starting simulation..."
    });

    // Animate coordinates transitions at 2500ms intervals
    simIntervalRef.current = setInterval(() => {
      stepIndex++;
      if (stepIndex >= shortestPath.length) {
        // Arrived at final campus destination!
        clearInterval(simIntervalRef.current);
        setSimState({
          nodeId: shortestPath[shortestPath.length - 1],
          name: GRAPH_NODES[shortestPath[shortestPath.length - 1]].name,
          speed: "0 m/s (Idle)",
          remainingDist: 0,
          status: "Arrived! Welcome to your destination!"
        });
        setSimActive(false);
        setActiveStepIndex(0);

        // Optional high-fidelity Speech Synthesis notification (narrator audio guidance)
        try {
          const synth = window.speechSynthesis;
          if (synth) {
            const destName = GRAPH_NODES[shortestPath[shortestPath.length - 1]].name;
            const utter = new SpeechSynthesisUtterance(`You have arrived at ${destName}. Enjoy GCTU campus!`);
            utter.rate = 1.0;
            synth.speak(utter);
          }
        } catch(e) {}
        
        return;
      }

      const nextNode = GRAPH_NODES[shortestPath[stepIndex]];
      const prevNode = GRAPH_NODES[shortestPath[stepIndex - 1]];
      const sectionDist = getDistance(prevNode, nextNode);
      distRemaining = Math.max(0, distRemaining - sectionDist);

      // Advance the simulated marker along coordinate paths to reflect a human scale walk
      setGpsCoordinates([nextNode.lat, nextNode.lng]);
      setMapCenter([nextNode.lat, nextNode.lng]);
      setActiveStepIndex(stepIndex - 1);

      setSimState({
        nodeId: nextNode.id,
        name: nextNode.name,
        speed: "1.4 m/s (Walking)",
        remainingDist: Math.round(distRemaining),
        status: `Passing: ${nextNode.name}`
      });

    }, 2500); // Transitions coordinates every 2.5 seconds
  };

  // Leaflet div icon setups
  const getStartLIcon = (name) => {
    return L.divIcon({
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translateY(-16px);">
          <div style="
            background-color: #05195E;
            color: #FFFFFF;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            border: 1.5px solid #10B981;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            font-family: system-ui, sans-serif;
            white-space: nowrap;
            margin-bottom: 2px;
          ">
            🟢 START: ${name}
          </div>
          <div style="
            width: 12px;
            height: 12px;
            background-color: #10B981;
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      className: 'uber-start-pin',
      iconSize: [120, 42],
      iconAnchor: [60, 36]
    });
  };

  const getEndLIcon = (name) => {
    return L.divIcon({
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translateY(-16px);">
          <div style="
            background-color: #000000;
            color: #FFFFFF;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            border: 1.5px solid #FFD700;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            font-family: system-ui, sans-serif;
            white-space: nowrap;
            margin-bottom: 2px;
          ">
            📍 DEST: ${name}
          </div>
          <div style="
            width: 14px;
            height: 14px;
            background-color: #FFD700;
            border: 2.5px solid #000000;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      className: 'uber-end-pin',
      iconSize: [120, 42],
      iconAnchor: [60, 36]
    });
  };

  const getMinimalBuildingLIcon = (emoji) => {
    return L.divIcon({
      html: `
        <div style="
          background-color: #FFFFFF;
          color: #1F2937;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          border: 1 px solid #E5E7EB;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          opacity: 0.85;
        ">
          ${emoji}
        </div>
      `,
      className: 'custom-leaflet-building-minimal-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  const getGateLIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          background-color: #1F2937;
          color: #FFF;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          border: 1.5px solid #FFFFFF;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        ">
          🚪
        </div>
      `,
      className: 'custom-leaflet-gate-icon',
      iconSize: [25, 25],
      iconAnchor: [12.5, 12.5]
    });
  };

  const getGPSLIcon = () => {
    return L.divIcon({
      html: `
        <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transform: translate(-3px, -3px);">
          <div style="
            width: 14px;
            height: 14px;
            background-color: #0066FF;
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0,102,255,0.8);
            z-index: 10;
          "></div>
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            background-color: rgba(0, 102, 255, 0.3);
            border-radius: 50%;
            animation: gpsPulse 2s infinite ease-out;
            z-index: 1;
          "></div>
        </div>
      `,
      className: 'custom-leaflet-gps-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const getTurnIcon = (turnType) => {
    switch (turnType) {
      case 'depart':
        return <Navigation size={15} style={{ color: '#10B981' }} />;
      case 'straight':
        return <ArrowUp size={15} style={{ color: '#3B82F6' }} />;
      case 'slight-right':
        return <ArrowUpRight size={15} style={{ color: '#F59E0B' }} />;
      case 'right':
        return <ArrowRight size={15} style={{ color: '#05195E', fontWeight: 'bold' }} />;
      case 'sharp-right':
        return <CornerDownRight size={15} style={{ color: '#EF4444', fontWeight: 'bold' }} />;
      case 'slight-left':
        return <ArrowUpLeft size={15} style={{ color: '#F59E0B' }} />;
      case 'left':
        return <ArrowLeft size={15} style={{ color: '#05195E', fontWeight: 'bold' }} />;
      case 'sharp-left':
        return <CornerDownLeft size={15} style={{ color: '#EF4444', fontWeight: 'bold' }} />;
      default:
        return <ArrowUp size={15} style={{ color: '#3B82F6' }} />;
    }
  };

  // Assemble path nodes coordinates for Map route Polyline
  const polylinePositions = shortestPath.map(nodeId => [
    GRAPH_NODES[nodeId].lat,
    GRAPH_NODES[nodeId].lng
  ]);

  return (
    <div className="navigate-container" id="navigate-panel">
      
      {/* 2.1 Route controls panel (Left on desktop, Bottom slide overlay on mobile) */}
      <div 
        className={`nav-controls-panel ${panelCollapsed ? 'collapsed' : ''}`} 
        id="nav-controls-and-stats"
      >
        {/* Sleek, premium drag-bar trigger for mobile (Google Maps/Uber style) */}
        <div 
          className="panel-mobile-drag-bar" 
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#D1D5DB',
            borderRadius: '2px',
            margin: '0 auto 10px auto',
            cursor: 'pointer',
            display: 'block'
          }}
        />

        {/* Collapsible Panel Header */}
        <div 
          className="panel-toggle-header"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: panelCollapsed ? '0' : '0.75rem',
            borderBottom: panelCollapsed ? 'none' : '1px solid var(--border-color)',
            marginBottom: panelCollapsed ? '0' : '0.75rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem' }}>🧭</span>
            <div>
              <span style={{ fontWeight: '800', fontSize: '0.82rem', color: '#05195E', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', lineHeight: 1 }}>
                Route Planner
              </span>
              {panelCollapsed && (
                <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: '500' }}>
                  Tap to expand and set route
                </span>
              )}
            </div>
          </div>
          <button 
            type="button"
            className="panel-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#0066FF',
              fontWeight: '700',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'none',
              padding: '2px 8px',
              backgroundColor: '#F0F4FF',
              borderRadius: '6px'
            }}
          >
            {panelCollapsed ? "EXPAND" : "MINIMIZE"}
          </button>
        </div>

        {!panelCollapsed && (
          <div className="controls-scrollable-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <form className="route-form" id="navigation-form" onSubmit={(e) => e.preventDefault()}>
              
              <div className="select-group">
                <label htmlFor="select-start-point" style={{ fontSize: '0.75rem', fontWeight: '750', color: '#05195E' }}>Starting Point</label>
                <div className="select-wrapper">
                  <span className="select-icon"><Navigation size={14} style={{ color: '#05195E' }} /></span>
                  <select 
                    id="select-start-point" 
                    className="custom-select"
                    value={startId}
                    onChange={(e) => {
                      if (simActive) return;
                      setStartId(e.target.value);
                    }}
                    disabled={simActive}
                    style={{ fontSize: '0.82rem', padding: '0.55rem 0.65rem 0.55rem 2rem' }}
                  >
                    <option value="gate">🚪 Main Campus Gate (Tesano Entrada)</option>
                    {BUILDING_LIST.map(b => (
                      <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>
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
                <label htmlFor="select-end-point" style={{ fontSize: '0.75rem', fontWeight: '750', color: '#05195E' }}>Destination</label>
                <div className="select-wrapper">
                  <span className="select-icon"><Landmark size={14} style={{ color: '#05195E' }} /></span>
                  <select 
                    id="select-end-point" 
                    className="custom-select"
                    value={endId}
                    onChange={(e) => {
                      if (simActive) return;
                      setEndId(e.target.value);
                    }}
                    disabled={simActive}
                    style={{ fontSize: '0.82rem', padding: '0.55rem 0.65rem 0.55rem 2rem' }}
                  >
                    {BUILDING_LIST.map(b => (
                      <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action trigger buttons (Locate GPS & Simulate Loop) */}
              <div className="gps-controls" style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  
                  <button 
                    type="button" 
                    id="simulate-walk-btn"
                    className={`action-btn sim-btn ${simActive ? 'active' : ''}`}
                    onClick={startSimulation}
                    style={{
                      backgroundColor: simActive ? '#EF4444' : '#FFD700',
                      color: simActive ? '#FFFFFF' : '#05195E',
                      fontWeight: '800',
                      fontSize: '0.78rem'
                    }}
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
                    className="action-btn"
                    onClick={toggleRealGPS}
                    style={{
                      backgroundColor: realGpsActive ? '#10B981' : '#F3F4F6',
                      color: realGpsActive ? '#FFFFFF' : '#1F2937',
                      border: '1.5px solid #05195E',
                      fontWeight: '805',
                      fontSize: '0.78rem'
                    }}
                  >
                    <GpsIcon size={12} className={realGpsActive ? "animate-spin" : ""} /> 
                    {realGpsActive ? "Stop Live GPS" : "Real Device GPS"}
                  </button>

                </div>

                {realGpsActive && (
                  <div style={{
                    fontSize: '10px',
                    padding: '8px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    color: '#065F46',
                    lineHeight: 1.3
                  }}>
                    <span style={{ fontWeight: 'bold' }}>📡 Real Hardware GPS Watch Active:</span> Uses your physical mobile/laptop hardware. Open this on a phone outdoors, walk, and see the blue dot update live!
                  </div>
                )}
              </div>

            </form>

            {/* Walk progress HUD active info */}
            {simState && (
              <div className="simulation-banner" style={{ marginTop: '0.2rem' }} id="gps-hud-indicator">
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#0055FF', letterSpacing: '0.03em', marginBottom: '0.15rem' }}>Active Walking Simulation</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#05195E' }}>{simState.status}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  <span>Speed: {simState.speed}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Left: {simState.remainingDist}m</span>
                </div>
              </div>
            )}

            {/* 2.2 Turn by turn outcome card */}
            {shortestPath.length > 0 && (
              <div className="route-summary-card" id="route-path-summary" style={{ marginTop: '0.2rem', padding: '0.65rem' }}>
                <div className="route-summary-title" style={{ paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>🚶 Route Walk Log</span>
                  <span className="route-distance-pill" id="route-meters-span" style={{ backgroundColor: '#FFD700', padding: '1px 6px', fontSize: '0.68rem' }}>{Math.round(totalDistance)} meters</span>
                </div>

                <ul className="tbt-list" id="tbt-list-ul" style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '0.4rem', paddingRight: '4px' }}>
                  {steps.map((step, idx) => {
                    const stepVisited = simActive && shortestPath.indexOf(simState?.nodeId) > idx;
                    const stepActive = simActive && simState?.nodeId === shortestPath[idx];
                    
                    return (
                      <li 
                        key={step.key} 
                        className="tbt-step"
                        style={{ 
                          opacity: stepVisited ? 0.45 : 1,
                          borderLeft: stepActive ? `4px solid #0066FF` : 'none',
                          paddingLeft: stepActive ? '0.6rem' : '0.25rem',
                          backgroundColor: stepActive ? '#F0F4FF' : 'transparent',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <span className="tbt-step-icon" style={{ marginTop: '0.15rem' }}>
                          {getTurnIcon(step.turnType)}
                        </span>
                        <div className="tbt-step-text">
                          <p style={{ fontWeight: stepActive ? '700' : '500', margin: 0, fontSize: '0.78rem' }}>{step.text}</p>
                          <span className="tbt-step-distance" style={{ fontWeight: '600', color: stepActive ? '#0066FF' : '#6B7280', fontSize: '0.68rem' }}>({step.distance} meters walk)</span>
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
      <div className="map-view-panel" id="campus-leaflet-map-container" style={{ position: 'relative' }}>
        
        {/* Floating instruction guide shown when simulation/movement is active */}
        {simActive && steps[activeStepIndex] && (
          <div 
            id="floating-navigation-guide"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              backgroundColor: '#05195E',
              color: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              border: '2px solid #FFD700',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{
              backgroundColor: '#FFD700',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {getTurnIcon(steps[activeStepIndex].turnType)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '9px', color: '#FFD700', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px' }}>Directional Guide</div>
              <p style={{ fontSize: '11px', fontWeight: '800', margin: 0, lineHeight: 1.25, color: '#FFFFFF' }}>{steps[activeStepIndex].text}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '40px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '800', color: '#FFD700', display: 'block' }}>{steps[activeStepIndex].distance}m</span>
              <span style={{ fontSize: '8px', color: '#CCCCCC', display: 'block' }}>to turn</span>
            </div>
          </div>
        )}

        {/* State Toggle for Live Map vs Offline SVG Campus Schematic */}
        <div style={{
          position: 'absolute',
          top: simActive ? '80px' : '15px',
          right: '15px',
          zIndex: 999,
          display: 'flex',
          gap: '6px',
          backgroundColor: theme === 'dark' ? '#121522' : '#FFFFFF',
          padding: '4px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1.5px solid var(--border-color)',
          pointerEvents: 'auto',
          transition: 'all 0.3s'
        }}>
          <button
            onClick={() => setMapViewStyle('leaflet')}
            style={{
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mapViewStyle === 'leaflet' ? '#0066FF' : 'transparent',
              color: mapViewStyle === 'leaflet' ? '#FFFFFF' : (theme === 'dark' ? '#9099b2' : '#1F2937'),
              transition: 'all 0.2s'
            }}
          >
            🗺️ Live Map
          </button>
          <button
            onClick={() => setMapViewStyle('schematic')}
            style={{
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mapViewStyle === 'schematic' ? '#0066FF' : 'transparent',
              color: mapViewStyle === 'schematic' ? '#FFFFFF' : (theme === 'dark' ? '#9099b2' : '#1F2937'),
              transition: 'all 0.2s'
            }}
          >
            📐 Blueprint (Offline)
          </button>
        </div>

        {/* Offline Warning Badge */}
        {!isOnline && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: '9px',
            fontWeight: 'bold',
            padding: '3px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 999,
            textTransform: 'uppercase'
          }}>
            📡 Offline Mode: GCTU local blueprint loaded
          </div>
        )}

        {/* Real-time map coordinate overlay */}
        <div className="gps-map-telemetry" id="gps-mapping-telemetry-panel" style={{ zIndex: 90 }}>
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
            <span className="telemetry-val" style={{ color: gpsActive ? "#FFD700" : "#FF5252" }}>
              {gpsActive ? (simActive ? "MOVING" : "STANDBY") : "STANDBY"}
            </span>
          </div>
        </div>

        {mapViewStyle === 'schematic' ? (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: theme === 'dark' ? '#0b0d18' : '#f8fafc',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {/* Grid background effect */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: theme === 'dark' 
                ? 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)' 
                : 'radial-gradient(rgba(5, 25, 94, 0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none'
            }} />

            {/* Scale Vector Graphic representation */}
            <svg 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              style={{
                width: '100%',
                height: '100%',
                padding: '10% 8% 6% 8%', // Elegant padding margins inside canvas
                boxSizing: 'border-box'
              }}
            >
              {/* Draw Campus Walkway Connections (Edges) */}
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
                    stroke={theme === 'dark' ? '#1e253c' : '#e2e8f0'}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="1,1"
                  />
                );
              })}

              {/* Draw Dijkstra Route Active Polyline segments */}
              {shortestPath.length > 1 && shortestPath.map((nodeId, idx) => {
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
                      stroke="#0066FF"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      opacity="0.3"
                    />
                    <line
                      x1={`${from.x}%`}
                      y1={`${from.y}%`}
                      x2={`${to.x}%`}
                      y2={`${to.y}%`}
                      stroke="#0055ff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {/* Small Junction Hub connector circles */}
              {Object.keys(GRAPH_NODES).map(id => {
                const node = GRAPH_NODES[id];
                if (node.type !== "junction") return null;
                const pos = getSvgCoordinates(id);
                return (
                  <circle
                    key={`sch-junc-${id}`}
                    cx={`${pos.x}%`}
                    cy={`${pos.y}%`}
                    r="1.2"
                    fill={theme === 'dark' ? '#1e293b' : '#cbd5e1'}
                  />
                );
              })}

              {/* Active User GPS Tracer dot indicator */}
              {gpsActive && gpsCoordinates && (() => {
                const pos = mapToSvg(gpsCoordinates[0], gpsCoordinates[1]);
                return (
                  <g key="sch-gps-tracer">
                    <circle
                      cx={`${parseFloat(pos.x)}%`}
                      cy={`${parseFloat(pos.y)}%`}
                      r="4"
                      fill="#0066ff"
                      opacity="0.3"
                      className="animate-ping"
                    />
                    <circle
                      cx={`${parseFloat(pos.x)}%`}
                      cy={`${parseFloat(pos.y)}%`}
                      r="1.8"
                      fill="#0066ff"
                      stroke="#ffffff"
                      strokeWidth="0.6"
                    />
                  </g>
                );
              })()}
            </svg>

            {/* Interactive labels and emojis positioned absolutely over map coordinates */}
            {Object.keys(GRAPH_NODES).map(id => {
              const node = GRAPH_NODES[id];
              if (node.type !== "building" && id !== 'gate') return null;
              const pos = getSvgCoordinates(id);
              const isSelectedStart = id === startId;
              const isSelectedEnd = id === endId;
              const details = BUILDING_LIST.find(b => b.id === id);
              const emoji = id === 'gate' ? '🚪' : (details?.emoji || "🏫");
              const shortName = id === 'gate' ? 'Main Gate' : (details?.shortName || node.name);

              return (
                <div
                  key={`sch-bubble-${id}`}
                  onClick={() => {
                    if (simActive) return;
                    setEndId(id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: simActive ? 'not-allowed' : 'pointer',
                    zIndex: isSelectedStart || isSelectedEnd ? 99 : 10,
                    pointerEvents: 'auto'
                  }}
                >
                  <div style={{
                    backgroundColor: isSelectedStart ? '#10B981' : isSelectedEnd ? '#FFD700' : (theme === 'dark' ? '#121522' : '#FFFFFF'),
                    border: isSelectedStart ? '2px solid #047857' : isSelectedEnd ? '2px solid #D97706' : '1.5px solid #3B82F6',
                    borderRadius: '50%',
                    width: isSelectedStart || isSelectedEnd ? '34px' : '28px',
                    height: isSelectedStart || isSelectedEnd ? '34px' : '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isSelectedStart || isSelectedEnd ? '1.1rem' : '0.9rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}>
                    {emoji}
                  </div>

                  <span style={{
                    fontSize: '9px',
                    fontWeight: isSelectedStart || isSelectedEnd ? '800' : '600',
                    color: isSelectedStart ? '#10B981' : isSelectedEnd ? (theme === 'dark' ? '#FFD700' : '#B45309') : (theme === 'dark' ? '#ededf5' : '#1F2937'),
                    marginTop: '2px',
                    padding: '1px 4px',
                    backgroundColor: theme === 'dark' ? 'rgba(10,12,20,0.85)' : 'rgba(255,255,255,0.85)',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    pointerEvents: 'none'
                  }}>
                    {shortName}
                  </span>
                </div>
              );
            })}

            {/* Bottom mini status bar info overlay */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              backgroundColor: theme === 'dark' ? 'rgba(18,21,34,0.9)' : 'rgba(255,255,255,0.9)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '10px',
              color: theme === 'dark' ? '#9099b2' : '#475569',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#10B981', borderRadius: '50%' }} />
              <strong>Offline-Ready Blueprint</strong>
            </div>

          </div>
        ) : (
          <MapContainer 
            center={defaultCenter} 
            zoom={defaultCenter ? 18 : 17} 
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            {/* CartoDB tiles: Light_all for light mode, Dark_all for dark mode */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={theme === 'dark' 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
            />

            {/* Sync map view coordinates */}
            <MapController center={mapCenter} zoom={mapZoom} active={active} />

            {/* Double layered Polyline for beautiful vector route path (Uber style) */}
            {polylinePositions.length > 0 && (
              <>
                {/* Outer boundary shadow halo */}
                <Polyline 
                  positions={polylinePositions} 
                  color="#000000" 
                  weight={9}
                  opacity={0.16}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Core active routing line */}
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

            {/* Distance and KM Badge displayed at route center */}
            {polylinePositions.length > 0 && (
              <Marker 
                position={polylinePositions[Math.floor(polylinePositions.length / 2)]} 
                icon={L.divIcon({
                  html: `
                    <div style="
                      background-color: #000000;
                      color: #FFFFFF;
                      padding: 4px 8px;
                      border-radius: 20px;
                      font-size: 10px;
                      font-weight: 800;
                      font-family: system-ui, sans-serif;
                      border: 1.5px solid #FFD700;
                      box-shadow: 0 4px 8px rgba(0,0,0,0.25);
                      white-space: nowrap;
                      display: flex;
                      align-items: center;
                      gap: 3px;
                    ">
                      ⚡️ ${(totalDistance / 1000).toFixed(2)} km (${Math.round(totalDistance)}m)
                    </div>
                  `,
                  className: 'custom-path-midpoint-badge',
                  iconSize: [110, 24],
                  iconAnchor: [55, 12]
                })}
              />
            )}

            {/* START MARKER PIN */}
            {polylinePositions.length > 0 && (
              <Marker 
                position={polylinePositions[0]} 
                icon={getStartLIcon(GRAPH_NODES[startId].name)}
                zIndexOffset={100}
              />
            )}

            {/* END MARKER PIN */}
            {polylinePositions.length > 0 && (
              <Marker 
                position={polylinePositions[polylinePositions.length - 1]} 
                icon={getEndLIcon(GRAPH_NODES[endId].name)}
                zIndexOffset={200}
              />
            )}

            {/* Main campus Gate marker - hide when it's the active start or destination */}
            {startId !== 'gate' && endId !== 'gate' && (
              <Marker 
                position={[GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]} 
                icon={getGateLIcon()}
              >
                <Popup>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>🚪 GCTU Main Campus Entrance</div>
                  <div style={{ fontSize: '0.72rem', color: '#666' }}>Entrance along J.A. Kufuor Avenue, Tesano, Accra.</div>
                </Popup>
              </Marker>
            )}

            {/* Minimal Building Markers to avoid clutter */}
            {BUILDING_LIST.map(building => {
              // Hide minimal flag if building is currently active in routing (handled by specific START/DEST tags)
              if (building.id === startId || building.id === endId) return null;

              return (
                <Marker 
                  key={building.id}
                  position={[building.lat, building.lng]}
                  icon={getMinimalBuildingLIcon(building.emoji)}
                >
                  <Popup>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#05195E' }}>{building.name}</span>
                      <span className="category-badge" style={{ fontSize: '0.62rem', alignSelf: 'flex-start', margin: '0.1rem 0' }}>{building.category}</span>
                      <p style={{ fontSize: '0.75rem', color: '#555', margin: '0.2rem 0' }}>{building.desc}</p>
                      <button 
                        style={{ 
                          marginTop: '0.25rem',
                          backgroundColor: '#05195E',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '0.3rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
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

            {/* GPS Dot simulator */}
            {gpsActive && gpsCoordinates && (
              <Marker 
                position={gpsCoordinates} 
                icon={getGPSLIcon()}
                zIndexOffset={500}
              >
                <Popup>
                  <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textAlign: 'center' }}>
                    📡 {simActive ? "Simulating GPS walking route..." : "User Live Simulated GPS Dot"}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'monospace', textAlign: 'center' }}>
                    [{gpsCoordinates[0].toFixed(5)}, {gpsCoordinates[1].toFixed(5)}]
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
