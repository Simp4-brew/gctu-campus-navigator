import { startApi } from "./api-server.js";

/* =========================================================
   One API server for the whole integration run.

   Starting and stopping a server per test file left a window
   where one file's shutdown overlapped the next file's
   start-up, and the second file connected to a socket that
   was about to close. Vitest runs this once before any API
   test file and tears it down after the last one.
========================================================= */

let stop;

export async function setup() {
  stop = await startApi();
}

export async function teardown() {
  if (stop) stop();
}
