import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

import { isLatLngPair } from "../../lib/geo.js";

/* =========================================================
   Drives the Leaflet camera. Renders nothing.

   - Not tracking: fit the whole route once per route (keyed on
     routeKey), or centre on `center` when there is no route.
   - Tracking (GPS or walk demo): centre once, then pan only when
     the marker drifts out of the inner 70% of the viewport.
   - Re-measure the container whenever the tab becomes active.
========================================================= */

export default function MapController({
  center,
  zoom,
  active,
  fitPoints,
  followGps,
  routeKey,
}) {
  const map = useMap();

  const fittedRouteRef = useRef(null);
  const hasCenteredOnGpsRef = useRef(false);

  /* ROUTE OVERVIEW FIT
     Keyed on routeKey so picking a new destination refits; a plain
     boolean would fit once and then ignore every later route change. */
  useEffect(() => {
    if (followGps) {
      return;
    }

    if (fitPoints && fitPoints.length > 1) {
      if (fittedRouteRef.current !== routeKey) {
        map.fitBounds(L.latLngBounds(fitPoints), {
          padding: [60, 60],
          animate: true,
        });
        fittedRouteRef.current = routeKey;
      }
      return;
    }

    fittedRouteRef.current = null;

    if (isLatLngPair(center)) {
      map.setView(center, zoom || 18, { animate: true });
    }
  }, [center, zoom, fitPoints, followGps, routeKey, map]);

  /* LIVE TRACKING
     Calling setView on every fix keeps the marker nailed to the exact
     centre pixel, so the dot looks frozen while the world scrolls under
     it. Letting the marker travel across the viewport is what makes the
     movement visible. */
  useEffect(() => {
    if (!followGps) {
      fittedRouteRef.current = null;
      hasCenteredOnGpsRef.current = false;
      return;
    }

    if (!isLatLngPair(center)) {
      return;
    }

    const target = L.latLng(center[0], center[1]);

    if (!hasCenteredOnGpsRef.current) {
      map.setView(target, zoom || 18, { animate: true });
      hasCenteredOnGpsRef.current = true;
      return;
    }

    // pad(-0.3) = inner 70% of the viewport. Outside that, nudge the map.
    if (!map.getBounds().pad(-0.3).contains(target)) {
      map.panTo(target, { animate: true, duration: 0.6 });
    }
  }, [center, zoom, followGps, map]);

  /* The panel is hidden with CSS while another tab is showing, so
     Leaflet measured a 0x0 box. Re-measure once the tab is visible. */
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
