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

// Minimal stand-in for the CacheStorage API. URLs listed in `missing` fail
// to cache, the way a 404 does.
function createCacheStorage({ missing = [] } = {}) {
  const caches = new Map();

  const open = async (name) => {
    if (!caches.has(name)) caches.set(name, new Map());
    const store = caches.get(name);

    return {
      add: async (url) => {
        if (missing.includes(url)) throw new TypeError(`404 ${url}`);
        store.set(urlOf(url), `cached:${url}`);
      },
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

function loadServiceWorker({ network, missing }) {
  const listeners = {};

  const self = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };

  const caches = createCacheStorage({ missing });

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

/* =========================================================
   Install resilience and API freshness
========================================================= */

// A network response the worker can inspect and clone.
const networkResponse = (body) => ({
  status: 200,
  body,
  clone() {
    return this;
  },
});

describe("Service worker install and API caching", () => {
  it("still installs when an app-shell asset is missing", async () => {
    // A production build has no /src/* files; those requests 404.
    const worker = loadServiceWorker({
      network: offlineNetwork(),
      missing: ["/src/main.jsx", "/src/App.jsx"],
    });

    await worker.dispatch("install", {});

    const cached = [...worker.caches.stores.get("gctu-navigator-v2").keys()];
    expect(cached).toContain(`${ORIGIN}/index.html`);
    expect(cached).not.toContain(`${ORIGIN}/src/main.jsx`);
    expect(worker.self.skipWaiting).toHaveBeenCalled();
  });

  it("serves API data from the network ahead of a stale cached copy", async () => {
    const network = vi.fn(() => Promise.resolve(networkResponse("fresh")));
    const worker = loadServiceWorker({ network });
    const request = { url: `${ORIGIN}/api/faqs`, method: "GET" };

    const cache = await worker.caches.open("gctu-navigator-v2");
    await cache.put(request, networkResponse("stale"));

    const response = await worker.dispatch("fetch", { request });

    expect(response.body).toBe("fresh");
  });

  it("falls back to cached API data when offline", async () => {
    const worker = loadServiceWorker({ network: offlineNetwork() });
    const request = { url: `${ORIGIN}/api/faqs`, method: "GET" };

    const cache = await worker.caches.open("gctu-navigator-v2");
    await cache.put(request, networkResponse("cached faqs"));

    const response = await worker.dispatch("fetch", { request });

    expect(response.body).toBe("cached faqs");
  });
});

describe("Service worker page freshness", () => {
  it("serves the latest page from the network, so a new deploy shows on the next load", async () => {
    const network = vi.fn(() => Promise.resolve(networkResponse("new deploy")));
    const worker = loadServiceWorker({ network });
    const request = { url: `${ORIGIN}/`, method: "GET", mode: "navigate" };

    const cache = await worker.caches.open("gctu-navigator-v2");
    await cache.put(request, networkResponse("old deploy"));

    const response = await worker.dispatch("fetch", { request });

    expect(response.body).toBe("new deploy");
  });

  it("falls back to the cached app shell for any page when offline", async () => {
    const worker = loadServiceWorker({ network: offlineNetwork() });
    await worker.dispatch("install", {});

    const response = await worker.dispatch("fetch", {
      request: { url: `${ORIGIN}/some/page`, method: "GET", mode: "navigate" },
    });

    expect(response).toBe("cached:/index.html");
  });
});
