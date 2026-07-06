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

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
