/* =========================================================
   Geometry helpers for campus-scale coordinates ([lat, lng]
   pairs and { lat, lng } nodes). Pure functions, no React.
========================================================= */

const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEG_LAT = 111320;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function isLatLngPair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

/* Great-circle distance in metres between two { lat, lng } points
   (Haversine formula). Returns 0 when either point is missing. */
export function getDistance(node1, node2) {
  if (!node1 || !node2) {
    return 0;
  }

  const lat1 = toRadians(node1.lat);
  const lat2 = toRadians(node2.lat);
  const deltaLat = toRadians(node2.lat - node1.lat);
  const deltaLng = toRadians(node2.lng - node1.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* "850m" below a kilometre, "1.2km" above it. */
export function formatDistance(metres) {
  return metres > 1000
    ? `${(metres / 1000).toFixed(1)}km`
    : `${Math.round(metres)}m`;
}

/* Over a campus-sized area (a few hundred metres) lat/lng can be
   treated as a flat metre grid, which is good enough for snapping
   a GPS fix onto the route. */
function toMeters(point, origin) {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(toRadians(origin[0]));

  return {
    x: (point[1] - origin[1]) * metersPerDegLng,
    y: (point[0] - origin[0]) * METERS_PER_DEG_LAT,
  };
}

/* Snap a position onto the closest point of a polyline. Returns which
   segment it landed on, how far off-route it is, how far along the
   route it has travelled, and the route's total length. */
export function projectOntoRoute(position, routePoints) {
  if (!isLatLngPair(position) || !routePoints || routePoints.length < 2) {
    return null;
  }

  const origin = routePoints[0];
  const target = toMeters(position, origin);

  let best = null;
  let distanceAlong = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = toMeters(routePoints[i], origin);
    const b = toMeters(routePoints[i + 1], origin);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segmentLength = Math.hypot(dx, dy);

    // Clamp the projection to the segment so the fix snaps to an
    // endpoint rather than to an imaginary extension of the path.
    let t = 0;

    if (segmentLength > 0) {
      t =
        ((target.x - a.x) * dx + (target.y - a.y) * dy) /
        (segmentLength * segmentLength);
      t = Math.max(0, Math.min(1, t));
    }

    const offRoute = Math.hypot(
      target.x - (a.x + dx * t),
      target.y - (a.y + dy * t),
    );

    if (best === null || offRoute < best.offRoute) {
      best = {
        segmentIndex: i,
        offRoute,
        distanceAlong: distanceAlong + segmentLength * t,
      };
    }

    distanceAlong += segmentLength;
  }

  return best ? { ...best, routeLength: distanceAlong } : null;
}
