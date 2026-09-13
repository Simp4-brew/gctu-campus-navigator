import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom ships no geolocation implementation. NavigationPanel guards on its
// absence, but stubbing it keeps the "no GPS support" branch from firing in
// tests that are not about GPS at all.
if (!navigator.geolocation) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
      getCurrentPosition: vi.fn(),
    },
  });
}

// Leaflet measures its container on mount; jsdom reports every element as
// 0x0, which makes the real map throw. Tests mock react-leaflet instead, but
// this keeps anything that slips through from blowing up.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
// This jsdom build exposes a localStorage object without working methods (it
// warns about `--localstorage-file` on start-up). HelpDesk reads the stored
// admin token during its first render, so give the tests a real in-memory
// implementation and reset it between them.
class MemoryStorage {
  #entries = new Map();

  get length() {
    return this.#entries.size;
  }
  key(index) {
    return [...this.#entries.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#entries.has(String(key)) ? this.#entries.get(String(key)) : null;
  }
  setItem(key, value) {
    this.#entries.set(String(key), String(value));
  }
  removeItem(key) {
    this.#entries.delete(String(key));
  }
  clear() {
    this.#entries.clear();
  }
}

for (const name of ["localStorage", "sessionStorage"]) {
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
