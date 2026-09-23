import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GRAPH_NODES } from "../data/buildings.js";
import { planRoute } from "../lib/routing.js";
import { useLiveGps } from "./useLiveGps.js";
import { useWalkSimulation } from "./useWalkSimulation.js";

/* =========================================================
   useWalkSimulation
========================================================= */

describe("useWalkSimulation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const routeNodes = () =>
    planRoute("gate", "admin").path.map((id) => GRAPH_NODES[id]);

  it("walks the marker along the route and announces arrival", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useWalkSimulation(onMove));

    act(() => result.current.start(routeNodes()));

    // Starts on the first node.
    expect(result.current.active).toBe(true);
    expect(result.current.position).toEqual([GRAPH_NODES.gate.lat, GRAPH_NODES.gate.lng]);
    expect(result.current.status.status).toBe("Starting simulation...");

    // One second in (7m at 5x walking pace): partway along, between the nodes.
    act(() => vi.advanceTimersByTime(1000));

    const [lat] = result.current.position;
    expect(lat).toBeGreaterThan(GRAPH_NODES.gate.lat);
    expect(lat).toBeLessThan(GRAPH_NODES.admin.lat);
    expect(result.current.status.status).toBe("Heading to: Main Administration Building");

    // Gate -> Admin is ~62m, so 10 more seconds is well past arrival.
    act(() => vi.advanceTimersByTime(10000));

    expect(result.current.active).toBe(false);
    expect(result.current.position).toEqual([GRAPH_NODES.admin.lat, GRAPH_NODES.admin.lng]);
    expect(result.current.status.status).toBe("Arrived! Welcome to your destination!");
    expect(result.current.status.remainingDist).toBe(0);
    expect(onMove).toHaveBeenLastCalledWith([GRAPH_NODES.admin.lat, GRAPH_NODES.admin.lng]);
  });

  it("stops cleanly and does not keep moving afterwards", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useWalkSimulation(onMove));

    act(() => result.current.start(routeNodes()));
    act(() => result.current.stop());

    const calls = onMove.mock.calls.length;
    act(() => vi.advanceTimersByTime(5000));

    expect(result.current.active).toBe(false);
    expect(result.current.status).toBeNull();
    expect(onMove.mock.calls.length).toBe(calls);
  });
});

/* =========================================================
   useLiveGps
========================================================= */

describe("useLiveGps", () => {
  let onFix;
  let onError;

  beforeEach(() => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    navigator.geolocation.watchPosition = vi.fn((success, error) => {
      onFix = success;
      onError = error;
      return 7;
    });
    navigator.geolocation.clearWatch = vi.fn();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const route = planRoute("gate", "library");
  const fix = (lat, lng, accuracy = 5) => ({ coords: { latitude: lat, longitude: lng, accuracy } });

  const renderGps = (onMove = vi.fn()) =>
    renderHook(() =>
      useLiveGps({ routePoints: route.points, stepCount: route.steps.length, onMove }),
    );

  it("snaps each fix onto the route and reports progress", () => {
    const onMove = vi.fn();
    const { result } = renderGps(onMove);

    act(() => result.current.start());
    expect(result.current.active).toBe(true);

    // Standing exactly on the second route node.
    const node = GRAPH_NODES[route.path[1]];
    act(() => onFix(fix(node.lat, node.lng, 8)));

    expect(result.current.position).toEqual([node.lat, node.lng]);
    expect(result.current.accuracy).toBe(8);
    expect(result.current.offRoute).toBeLessThan(0.5);
    expect(result.current.remaining).toBeGreaterThan(0);
    expect(result.current.remaining).toBeLessThan(route.distance);
    expect(onMove).toHaveBeenCalledWith([node.lat, node.lng]);
  });

  it("stops tracking and clears the watch when permission is denied", () => {
    const { result } = renderGps();

    act(() => result.current.start());
    act(() => onError({ code: 1, PERMISSION_DENIED: 1, message: "denied" }));

    expect(window.alert).toHaveBeenCalledWith("Location permission denied: denied");
    expect(result.current.active).toBe(false);
    expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it("keeps tracking through a transient timeout", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderGps();

    act(() => result.current.start());
    act(() => onError({ code: 3, PERMISSION_DENIED: 1, message: "timeout" }));

    expect(result.current.active).toBe(true);
  });

  it("refuses to start outside a secure context", () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    const { result } = renderGps();

    act(() => result.current.start());

    expect(result.current.active).toBe(false);
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });
});
