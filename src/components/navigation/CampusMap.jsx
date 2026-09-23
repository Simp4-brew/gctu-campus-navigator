import { memo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
} from "react-leaflet";

import { BUILDING_LIST, GRAPH_NODES } from "../../data/buildings.js";
import { PLACES_INSIDE } from "../../lib/routing.js";
import MapController from "./MapController.jsx";
import {
  buildingIcon,
  distanceBadgeIcon,
  endIcon,
  gateIcon,
  gpsIcon,
  startIcon,
} from "./mapIcons.js";

// Real centroid of GCTU's Tesano campus boundary (see CAMPUS_BOUNDARY in
// buildings.js).
export const DEFAULT_CENTER = [5.5966, -0.2234];
export const DEFAULT_ZOOM = 18;

const ROUTE_STYLE = { lineCap: "round", lineJoin: "round" };

/* Building markers only depend on which buildings are the route's ends,
   so they are memoised: the walk demo re-renders the map ten times a
   second and the popups should not be rebuilt each time.
   Places inside a building (e.g. the Library) get no marker of their own;
   they are listed in their building's popup instead. */
const BuildingMarkers = memo(function BuildingMarkers({
  startNodeId,
  endNodeId,
  onSetDestination,
}) {
  return BUILDING_LIST.map((building) => {
    if (
      building.insideBuilding ||
      building.id === startNodeId ||
      building.id === endNodeId
    ) {
      return null;
    }

    const inside = PLACES_INSIDE[building.id] ?? [];

    return (
      <Marker
        key={building.id}
        position={[building.lat, building.lng]}
        icon={buildingIcon(building.emoji)}
      >
        <Popup>
          <div className="popup-building-content">
            <span className="popup-building-name">{building.name}</span>

            <span className="category-badge popup-category-badge">
              {building.category}
            </span>

            <p className="popup-building-desc">{building.desc}</p>

            {inside.length > 0 && (
              <div className="popup-inside">
                <span className="popup-inside-label">Inside this building</span>
                {inside.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className="popup-inside-place"
                    onClick={() => onSetDestination(place.id)}
                  >
                    {place.emoji} {place.name} · {place.floor}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="popup-set-destination-btn"
              onClick={() => onSetDestination(building.id)}
            >
              Set Destination
            </button>
          </div>
        </Popup>
      </Marker>
    );
  });
});

export default function CampusMap({
  active,
  mapCenter,
  route,
  startId,
  endId,
  tracking,
  simulating,
  gpsPosition,
  gpsAccuracy,
  showAccuracy,
  onSetDestination,
}) {
  const { points, distance, key: routeKey, path, startName, endName } = route;
  const hasRoute = points.length > 1;

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={true}
      className="leaflet-map-fill"
    >
      <TileLayer
        // OpenStreetMap's standard tiles need no API key. CARTO's free
        // basemaps now stamp "API KEY REQUIRED" across every tile. OSM has
        // no dark style, so dark mode inverts these tiles in CSS instead
        // (see body.dark .leaflet-tile-pane in NavigationPanel.css).
        //
        // Requested with CORS (OSM allows it): a plain cross-origin <img>
        // yields an opaque status-0 response the service worker never
        // caches, which left the map with no tiles offline.
        crossOrigin="anonymous"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <MapController
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        active={active}
        routeKey={routeKey}
        // Follow the marker during the walk demo too, not only live GPS.
        followGps={tracking}
        fitPoints={!tracking && hasRoute ? points : null}
      />

      {hasRoute && (
        <>
          {/* Shadow underneath, then the route itself. */}
          <Polyline
            positions={points}
            color="#000000"
            weight={9}
            opacity={0.16}
            {...ROUTE_STYLE}
          />
          <Polyline
            positions={points}
            color="#0055FF"
            weight={5}
            opacity={0.95}
            {...ROUTE_STYLE}
          />

          <Marker
            position={points[Math.floor(points.length / 2)]}
            icon={distanceBadgeIcon(distance)}
          />
        </>
      )}

      {points.length > 0 && (
        <Marker position={points[0]} icon={startIcon(startName)} zIndexOffset={100} />
      )}

      {points.length > 0 && (
        <Marker
          position={points[points.length - 1]}
          icon={endIcon(endName)}
          zIndexOffset={200}
        />
      )}

      {startId !== "gate" && endId !== "gate" && GRAPH_NODES.gate && (
        <Marker
          position={[GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]}
          icon={gateIcon()}
        >
          <Popup>
            <div className="popup-title">🚪 GCTU Main Campus Entrance</div>
            <div className="popup-subtitle">
              Entrance along J.A. Kufuor Avenue, Tesano, Accra.
            </div>
          </Popup>
        </Marker>
      )}

      <BuildingMarkers
        startNodeId={path[0]}
        endNodeId={path[path.length - 1]}
        onSetDestination={onSetDestination}
      />

      {showAccuracy && gpsPosition && gpsAccuracy > 0 && (
        <Circle
          center={gpsPosition}
          radius={gpsAccuracy}
          pathOptions={{
            color: "#0066ff",
            weight: 1,
            fillColor: "#0066ff",
            fillOpacity: 0.12,
          }}
        />
      )}

      {tracking && gpsPosition && (
        <Marker position={gpsPosition} icon={gpsIcon()} zIndexOffset={500}>
          <Popup>
            <div className="popup-gps-title">
              📡 {simulating ? "Walking simulation GPS" : "Live device GPS"}
            </div>
            <div className="popup-gps-coords">
              [{gpsPosition[0].toFixed(6)}, {gpsPosition[1].toFixed(6)}]
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
