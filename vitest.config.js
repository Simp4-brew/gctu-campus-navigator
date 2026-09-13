import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts on purpose: the app config pulls in the
// tailwind plugin and a dev-server proxy that the test run has no use for.
//
// Two projects, because Table 4.2 spans two worlds: the React unit/integration
// cases need a DOM, while IT-02 drives the real Express API and MongoDB Atlas
// and must run in plain Node.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(process.cwd(), ".") },
        },
        test: {
          name: "ui",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.js"],
          css: false,
          include: ["src/**/*.{test,spec}.{js,jsx}"],
        },
      },
      {
        test: {
          name: "api",
          environment: "node",
          globals: true,
          include: ["server/**/*.{test,spec}.js"],
          // Boots one Express server for the whole API run and stops it at
          // the end, so no file can start while another is shutting down.
          globalSetup: ["./server/test/helpers/global-setup.js"],
          // Atlas handshakes over a network that blocks DNS TXT take ~10s, and
          // the server boots before the first request can land.
          testTimeout: 30000,
          hookTimeout: 120000,
          // One server on port 5000; the API cases must not race each other.
          fileParallelism: false,
          sequence: { concurrent: false },
        },
      },
    ],
  },
});
