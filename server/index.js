import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

import campusRoutes from "./routes/campus.js";
import ticketRoutes from "./routes/tickets.js";
import helpdeskRoutes from "./routes/helpdesk.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", campusRoutes);
app.use("/api", helpdeskRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Keep every /api response JSON. Without these, an unknown route or a
// malformed JSON body gets Express's HTML error page (with a stack trace
// outside production), which the client's res.json() cannot parse.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res
    .status(status)
    .json({ error: status < 500 ? err.message : "Internal server error" });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
