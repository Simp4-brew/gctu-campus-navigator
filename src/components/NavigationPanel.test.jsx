import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GRAPH_NODES } from "../data/buildings";

// react-leaflet mounts a real Leaflet map, which measures its container. jsdom
// reports every element as 0x0, so the real MapContainer throws on mount. We
// swap the whole module for plain divs that record the props we assert on.
vi.mock("react-leaflet", () => {
  const passthrough = (testId) =>
    function Stub({ children, ...props }) {
      return (
        <div data-testid={testId} data-props={JSON.stringify(props)}>
          {children}
        </div>
      );
    };

  return {
    MapContainer: function MapContainer({ center, zoom, children }) {
      return (
        <div
          data-testid="map-container"
          data-center={JSON.stringify(center)}
          data-zoom={String(zoom)}
        >
          {children}
        </div>
      );
    },
    TileLayer: function TileLayer(props) {
      return <div data-testid="tile-layer" data-url={props.url} />;
    },
    Marker: passthrough("marker"),
    Popup: passthrough("popup"),
    Polyline: passthrough("polyline"),
    Circle: passthrough("circle"),
    // MapController calls this on every render; the component only ever uses
    // the imperative methods below.
    useMap: () => ({
      setView: vi.fn(),
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
      getZoom: () => 18,
      getCenter: () => ({ lat: 5.5966, lng: -0.2234 }),
      invalidateSize: vi.fn(),
    }),
  };
});

import NavigationPanel, {
  getDistance,
  findDijkstraPath,
} from "./NavigationPanel";

// Real centroid of the GCTU Tesano campus boundary, mirrored from
// NavigationPanel's defaultCenter.
const DEFAULT_CENTER = [5.5966, -0.2234];

function renderPanel(props = {}) {
  return render(
    <NavigationPanel
      presetDestination={null}
      clearPresetDestination={vi.fn()}
      theme="light"
      active={true}
      {...props}
    />,
  );
}

// The drawn route is the blue Polyline; the component renders a black shadow
// line underneath it with identical positions, so either one reports the path.
function drawnRoute() {
  const lines = screen.queryAllByTestId("polyline");
  if (lines.length === 0) return null;
  return JSON.parse(lines[0].dataset.props).positions;
}

/* =========================================================
   UT-01
========================================================= */

describe("UT-01  Render the Live Map view with the default centre coordinates", () => {
  it("loads the map at the campus centre with its tile layer and markers, without error", () => {
    renderPanel();

    const map = screen.getByTestId("map-container");

    // Map tiles load: the container mounted and a tile layer is inside it.
    expect(map).toBeInTheDocument();
    expect(map).toContainElement(screen.getAllByTestId("tile-layer")[0]);

    // Centred on the default campus coordinates at the campus zoom level.
    expect(JSON.parse(map.dataset.center)).toEqual(DEFAULT_CENTER);
    expect(map.dataset.zoom).toBe("18");

    // Campus markers render for the buildings.
    expect(screen.getAllByTestId("marker").length).toBeGreaterThan(0);
  });
});

/* =========================================================
   UT-02
========================================================= */

describe("UT-02  Compute route distance between two selected campus points", () => {
  // Expected value derived independently of getDistance: an equirectangular
  // projection and a 3D chord-to-arc calculation on the same 6371km sphere
  // both give 45.4528m for School Hospital -> GCTU Central Library.
  it("returns the great-circle distance between two campus points", () => {
    const metres = getDistance(GRAPH_NODES.hospital, GRAPH_NODES.library);

    expect(metres).toBeCloseTo(45.45, 1);
  });

  it("computes the walking route distance for a selected start and destination", () => {
    const route = findDijkstraPath("hospital", "onny_aud");

    // School Hospital -> Florence Onny Auditorium, along the campus path graph
    // (hospital > junc_north > cafe > eng > onny_aud).
    expect(Math.round(route.distance)).toBe(184);
    expect(route.path.length).toBeGreaterThan(1);
    expect(route.path[0]).toBe("hospital");
    expect(route.path[route.path.length - 1]).toBe("onny_aud");
  });

  it("returns zero distance when a point is missing", () => {
    expect(getDistance(null, GRAPH_NODES.library)).toBe(0);
  });
});

/* =========================================================
   IT-01
========================================================= */

describe("IT-01  Route Planner start/destination selection triggers the map to redraw the path", () => {
  it("draws the route line between the two chosen markers and redraws it on a new selection", async () => {
    renderPanel();

    const start = screen.getByLabelText(/start/i);
    const destination = screen.getByLabelText(/destination/i);

    // --- first selection: Main Campus Gate -> GCTU Central Library ---
    fireEvent.change(start, { target: { value: "gate" } });
    fireEvent.change(destination, { target: { value: "library" } });

    await waitFor(() => expect(drawnRoute()).not.toBeNull());

    const firstRoute = drawnRoute();

    expect(firstRoute.length).toBeGreaterThan(1);
    // The line starts at the chosen start marker and ends at the chosen
    // destination marker.
    expect(firstRoute[0]).toEqual([GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]);
    expect(firstRoute[firstRoute.length - 1]).toEqual([
      GRAPH_NODES.library.lat,
      GRAPH_NODES.library.lng,
    ]);

    // --- change the destination: the map must redraw to the new marker ---
    fireEvent.change(destination, { target: { value: "eng" } });

    await waitFor(() => {
      const redrawn = drawnRoute();
      expect(redrawn[redrawn.length - 1]).toEqual([
        GRAPH_NODES.eng.lat,
        GRAPH_NODES.eng.lng,
      ]);
    });

    expect(drawnRoute()).not.toEqual(firstRoute);
  });
});

/* =========================================================
   IT-03
========================================================= */

describe("IT-03  Switching to the offline (blueprint) rendering mode keeps the selected route", () => {
  it("keeps the drawn route when the app loses the network and the map falls back to offline tiles", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/start/i), {
      target: { value: "gate" },
    });
    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: "library" },
    });

    await waitFor(() => expect(drawnRoute()).not.toBeNull());

    const routeWhileOnline = drawnRoute();

    // Drop the network. The service worker takes over tile delivery and serves
    // the blueprint placeholder in place of live map tiles (see IT-04).
    await act(async () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    // The rendering mode changed underneath it, but the route survives intact.
    expect(drawnRoute()).toEqual(routeWhileOnline);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();

    await act(async () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    expect(drawnRoute()).toEqual(routeWhileOnline);
  });
});
