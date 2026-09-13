import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   SERVICE WORKER HARNESS

   public/sw.js is a classic worker script: it runs against a
   global `self` and registers listeners as a side effect. We
   execute the real file inside a fake worker scope so the
   tests exercise the shipped code rather than a copy of it.
========================================================= */

const SW_SOURCE = readFileSync(
  resolve(process.cwd(), "public/sw.js"),
  "utf-8",
);

// Minimal stand-in for the CacheStorage API.
function createCacheStorage() {
  const caches = new Map();

  const open = async (name) => {
    if (!caches.has(name)) caches.set(name, new Map());
    const store = caches.get(name);

    return {
      addAll: async (urls) => {
        for (const url of urls) store.set(urlOf(url), `cached:${url}`);
      },
      put: async (request, response) => {
        store.set(urlOf(request), response);
      },
      match: async (request) => store.get(urlOf(request)),
    };
  };

  return {
    stores: caches,
    open,
    keys: async () => [...caches.keys()],
    delete: async (name) => caches.delete(name),
    match: async (request) => {
      for (const store of caches.values()) {
        const hit = store.get(urlOf(request));
        if (hit) return hit;
      }
      return undefined;
    },
  };
}

// The page the worker controls. A real CacheStorage keys entries by absolute
// URL, so the relative paths in ASSETS_TO_CACHE resolve against this origin.
const ORIGIN = "https://gctu-navigator.app";

const urlOf = (request) =>
  new URL(typeof request === "string" ? request : request.url, ORIGIN).href;

function loadServiceWorker({ network }) {
  const listeners = {};

  const self = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };

  const caches = createCacheStorage();

  // Responses the worker builds itself (the offline tile placeholder).
  class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.headers = new Map(Object.entries(init.headers ?? {}));
    }
  }

  // Run the real worker source against the fake scope.
  const factory = new Function(
    "self",
    "caches",
    "fetch",
    "Response",
    "console",
    `${SW_SOURCE}\n return null;`,
  );

  factory(self, caches, network, Response, { log: () => {} });

  // Drive a lifecycle/fetch event and hand back what the worker did.
  const dispatch = async (type, event) => {
    let waited;
    let responded;

    await listeners[type]({
      ...event,
      waitUntil: (promise) => {
        waited = promise;
      },
      respondWith: (promise) => {
        responded = promise;
      },
    });

    if (waited) await waited;
    return responded ? await responded : undefined;
  };

  return { self, caches, dispatch };
}

// Every request fails, exactly as it would with the network off.
const offlineNetwork = () =>
  vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

/* =========================================================
   IT-04
========================================================= */

describe("IT-04  Load the app with no network connection", () => {
  let worker;

  beforeEach(async () => {
    // First visit, online: the worker installs and caches the app shell.
    worker = loadServiceWorker({ network: offlineNetwork() });
    await worker.dispatch("install", {});
  });

  it("caches the app shell and the blueprint map data on install", async () => {
    const store = worker.caches.stores.get("gctu-navigator-v2");

    expect(store).toBeDefined();
    expect(worker.self.skipWaiting).toHaveBeenCalled();

    // The shell: entry point, app root and the campus blueprint geometry the
    // offline map is drawn from.
    const cached = [...store.keys()];

    expect(cached).toContain(`${ORIGIN}/index.html`);
    expect(cached).toContain(`${ORIGIN}/`);
    expect(cached).toContain(`${ORIGIN}/src/main.jsx`);
    expect(cached).toContain(`${ORIGIN}/src/App.jsx`);
    expect(cached).toContain(`${ORIGIN}/src/data/buildings.js`);
    expect(cached).toContain(`${ORIGIN}/src/components/NavigationPanel.jsx`);
  });

  it("serves the cached shell from cache when the network is unreachable", async () => {
    // Reload with no connection at all.
    const response = await worker.dispatch("fetch", {
      request: { url: `${ORIGIN}/index.html`, method: "GET" },
    });

    expect(response).toBe("cached:/index.html");
  });

  it("serves the blueprint placeholder for map tiles it cannot fetch", async () => {
    const response = await worker.dispatch("fetch", {
      request: {
        url: "https://a.basemaps.cartocdn.com/light_all/18/1/1.png",
        method: "GET",
      },
    });

    expect(response).toBeDefined();
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.body).toContain("Map Offline");
  });

  it("claims open clients and drops stale caches on activate", async () => {
    await worker.caches.open("gctu-navigator-v1");
    await worker.dispatch("activate", {});

    expect(await worker.caches.keys()).toEqual(["gctu-navigator-v2"]);
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });
});
