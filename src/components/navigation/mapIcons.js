import L from "leaflet";

/* =========================================================
   LEAFLET ICON CACHE

   react-leaflet calls setIcon() whenever a Marker's icon prop
   changes identity. Building a fresh L.divIcon on each render
   rebuilt every marker's DOM on every walk-demo tick (10x a
   second), restarting the GPS pulse animation each time, so
   every icon is created once per distinct key and reused.
========================================================= */

const iconCache = new Map();

function cachedDivIcon(key, options) {
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon(options));
  }

  return iconCache.get(key);
}

export const startIcon = (name) =>
  cachedDivIcon(`start:${name}`, {
    html: `
      <div class="leaflet-start-pin-wrapper">
        <div class="leaflet-start-pin-label">🟢 START: ${name}</div>
        <div class="leaflet-start-pin-dot"></div>
      </div>
    `,
    className: "uber-start-pin",
    iconSize: [120, 42],
    iconAnchor: [60, 36],
  });

export const endIcon = (name) =>
  cachedDivIcon(`end:${name}`, {
    html: `
      <div class="leaflet-end-pin-wrapper">
        <div class="leaflet-end-pin-label">📍 DEST: ${name}</div>
        <div class="leaflet-end-pin-dot"></div>
      </div>
    `,
    className: "uber-end-pin",
    iconSize: [120, 42],
    iconAnchor: [60, 36],
  });

export const buildingIcon = (emoji) =>
  cachedDivIcon(`building:${emoji}`, {
    html: `<div class="leaflet-minimal-building-icon">${emoji}</div>`,
    className: "custom-leaflet-building-minimal-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export const gateIcon = () =>
  cachedDivIcon("gate", {
    html: `<div class="leaflet-gate-icon">🚪</div>`,
    className: "custom-leaflet-gate-icon",
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5],
  });

export const gpsIcon = () =>
  cachedDivIcon("gps", {
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

export const distanceBadgeIcon = (metres) =>
  cachedDivIcon(`distance:${metres}`, {
    html: `
      <div class="leaflet-distance-badge">
        ⚡ ${(metres / 1000).toFixed(2)} km (${Math.round(metres)}m)
      </div>
    `,
    className: "custom-path-midpoint-badge",
    iconSize: [110, 24],
    iconAnchor: [55, 12],
  });
