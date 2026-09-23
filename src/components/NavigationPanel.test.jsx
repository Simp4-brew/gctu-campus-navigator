import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      // Used while following the walk demo's moving marker.
      getBounds: () => ({ pad: () => ({ contains: () => true }) }),
      panTo: vi.fn(),
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
  // Expected value derived independently of getDistance: a 3D chord-to-arc
  // calculation on the same 6371km sphere gives 27.4973m for
  // School Hospital -> Campus Cafeteria.
  it("returns the great-circle distance between two campus points", () => {
    const metres = getDistance(GRAPH_NODES.hospital, GRAPH_NODES.cafe);

    expect(metres).toBeCloseTo(27.5, 1);
  });

  it("computes the walking route distance for a selected start and destination", () => {
    const route = findDijkstraPath("hospital", "blockG");

    // School Hospital -> Classroom Block G (SGSR), along the campus path graph
    // (hospital > focis > cafe > eng > junc_sgsr > blockG), checked
    // against an independent Dijkstra: 183.55m.
    expect(route.distance).toBeCloseTo(183.55, 1);
    expect(route.path.length).toBeGreaterThan(1);
    expect(route.path[0]).toBe("hospital");
    expect(route.path[route.path.length - 1]).toBe("blockG");
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

    // --- first selection: Main Campus Gate -> School Hospital ---
    fireEvent.change(start, { target: { value: "gate" } });
    fireEvent.change(destination, { target: { value: "hospital" } });

    await waitFor(() => expect(drawnRoute()).not.toBeNull());

    const firstRoute = drawnRoute();

    expect(firstRoute.length).toBeGreaterThan(1);
    // The line starts at the chosen start marker and ends at the chosen
    // destination marker.
    expect(firstRoute[0]).toEqual([GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]);
    expect(firstRoute[firstRoute.length - 1]).toEqual([
      GRAPH_NODES.hospital.lat,
      GRAPH_NODES.hospital.lng,
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
      target: { value: "hospital" },
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

/* =========================================================
   Walk demo
========================================================= */

describe("Walk demo simulation", () => {
  it("walks the selected route, locks the route controls, and arrives", async () => {
    vi.useFakeTimers();

    try {
      renderPanel();

      fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "gate" } });
      fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "admin" } });

      fireEvent.click(screen.getByRole("button", { name: /walk demo/i }));

      expect(screen.getByText(/active walking simulation/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /stop demo/i })).toBeInTheDocument();
      // The route cannot change mid-walk.
      expect(screen.getByLabelText(/start/i)).toBeDisabled();
      expect(screen.getByLabelText(/destination/i)).toBeDisabled();
      // The floating turn guide shows the current step.
      expect(document.getElementById("floating-navigation-guide")).toBeInTheDocument();

      // Gate -> Admin is ~133m at 7m/s of demo time.
      await act(async () => {
        vi.advanceTimersByTime(25000);
      });

      expect(screen.getByText(/arrived! welcome/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /walk demo/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/start/i)).not.toBeDisabled();
      expect(document.getElementById("floating-navigation-guide")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses to simulate when start and destination are the same", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    renderPanel();

    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: /walk demo/i }));

    expect(alertSpy).toHaveBeenCalled();
    expect(screen.queryByText(/active walking simulation/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/start/i)).not.toBeDisabled();

    alertSpy.mockRestore();
  });
});

/* =========================================================
   Places inside buildings
========================================================= */

describe("Places inside buildings", () => {
  it("routes to the host building's entrance and ends with an indoor step", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "gate" } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "library" } });

    // The Library is on the Admin block's first floor, so the line ends at Admin.
    const route = drawnRoute();
    expect(route[route.length - 1]).toEqual([GRAPH_NODES.admin.lat, GRAPH_NODES.admin.lng]);

    expect(
      screen.getByText(
        "Enter the Main Administration Building and take the stairs to the First Floor for the GCTU Central Library.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("(indoors · First Floor)")).toBeInTheDocument();
  });

  it("gives a ground-floor place an in-building instruction without stairs", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "onny_aud" } });

    expect(
      screen.getByText(
        "Enter the Classroom Block G (SGSR). The Florence Onny Auditorium is on the Ground Floor.",
      ),
    ).toBeInTheDocument();
  });

  it("labels places inside a building in the destination list", () => {
    renderPanel();

    const options = [...screen.getByLabelText(/destination/i).options].map((o) => o.textContent);

    expect(options).toContain("📖 GCTU Central Library (in Admin Block)");
    expect(options).toContain("🎭 Florence Onny Auditorium (in SGSR Block)");
  });
});

/* =========================================================
   Spoken announcements
========================================================= */

describe("Spoken announcements", () => {
  let spoken;

  beforeEach(() => {
    spoken = [];
    window.speechSynthesis = {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [],
      speak: (utterance) => spoken.push(utterance.text),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  });

  afterEach(() => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it("speaks inside the Walk Demo tap (unlocking speech on iPhone) and on arrival", async () => {
    vi.useFakeTimers();

    try {
      renderPanel();

      fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "gate" } });
      fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "library" } });
      fireEvent.click(screen.getByRole("button", { name: /walk demo/i }));

      // Spoken synchronously during the click, before any timer runs.
      expect(spoken).toEqual(["Starting navigation to GCTU Central Library."]);

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(spoken[1]).toBe(
        "You have arrived. Enter the Main Administration Building and take the stairs to the First Floor for the GCTU Central Library.",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

/* =========================================================
   Minimise / expand the route planner
========================================================= */

describe("Route planner minimise and expand", () => {
  it("minimises to a summary of the route and expands back to the full planner", () => {
    renderPanel();

    const toggle = screen.getByRole("button", { name: /minimize/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    // Minimised: the planner controls are gone, the route is summarised.
    expect(screen.queryByLabelText(/destination/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Main Campus Gate → Faculty of Computing \(FoCIS\)/),
    ).toBeInTheDocument();

    const expand = screen.getByRole("button", { name: /expand/i });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expand);

    // Expanded again: the route can be planned.
    expect(screen.getByLabelText(/start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /minimize/i })).toBeInTheDocument();
  });
});

describe("School Clinic next to FoCIS", () => {
  it("routes Block C to the clinic through FoCIS in under 50m", () => {
    const route = findDijkstraPath("blockC", "hospital");

    expect(route.path).toEqual(["blockC", "focis", "hospital"]);
    expect(route.distance).toBeLessThan(50);
  });

  it("tells walkers from COLT to make a sharp right at FoCIS for the clinic", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/start/i), { target: { value: "blockB" } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: "hospital" } });

    expect(
      screen.getByText(
        "Make a sharp right turn at Faculty of Computing (FoCIS) toward School Hospital.",
      ),
    ).toBeInTheDocument();
  });
});
