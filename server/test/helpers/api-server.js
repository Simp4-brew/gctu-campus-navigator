import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/* =========================================================
   Shared boot helper for the integration tests.

   Reuses an API server the developer already has running;
   otherwise starts one and shuts it down afterwards.

   Readiness is decided by /api/health, never by a bare TCP
   check: a server that is shutting down keeps its socket in
   LISTENING for a moment, and trusting that would hand the
   tests a connection that dies on the first request.
========================================================= */

export const PORT = Number(process.env.PORT) || 5000;
export const API = `http://localhost:${PORT}`;

const SERVER_ENTRY = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "index.js",
);

async function healthy() {
  try {
    const res = await fetch(`${API}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealthy(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await healthy()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }

  return false;
}

export async function startApi({ timeoutMs = 90000 } = {}) {
  // Already serving? Use it, and leave it running when we are done.
  if (await healthy()) return () => {};

  const child = spawn(process.execPath, [SERVER_ENTRY], { stdio: "ignore" });

  if (!(await waitForHealthy(timeoutMs))) {
    child.kill();
    throw new Error(
      `API did not become healthy on ${API} within ${timeoutMs}ms`,
    );
  }

  return () => child.kill();
}
