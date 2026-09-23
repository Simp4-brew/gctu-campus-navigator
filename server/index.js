import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

import { connectDB } from "./db.js";
import adminRoutes from "./routes/admin.js";
import campusRoutes from "./routes/campus.js";
import helpdeskRoutes from "./routes/helpdesk.js";
import ticketRoutes from "./routes/tickets.js";

const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- API ---------------- */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", campusRoutes);
app.use("/api", helpdeskRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);

// Keep every /api response JSON. Without this, an unknown route got
// Express's HTML error page, which the client's res.json() cannot parse.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* ---------------- Built frontend ----------------
   After `npm run build`, this one server also serves the app, so
   `npm start` runs the whole system on a single port (same origin, no
   proxy). In development Vite serves the frontend instead. */

if (fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  app.use(
    express.static(DIST_DIR, {
      // Hashed asset files never change; index.html and sw.js must not be
      // cached so a new deploy is picked up.
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // Client-side routes all load the single-page app.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

/* ---------------- Errors ---------------- */

// Malformed JSON bodies arrive here as 400s; anything else is a 500 whose
// details are logged, not sent to the client.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
  }

  res
    .status(status)
    .json({ error: status < 500 ? err.message : "Internal server error" });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
