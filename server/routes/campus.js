import express from "express";

import Building from "../models/Building.js";
import GraphEdge from "../models/GraphEdge.js";
import GraphNode from "../models/GraphNode.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { textSearch } from "../utils/textSearch.js";

const router = express.Router();

// GET /api/buildings
router.get(
  "/buildings",
  asyncHandler(async (req, res) => {
    res.json(await Building.find().sort({ name: 1 }));
  }),
);

// GET /api/buildings/search?q=COLT - text search across name, aliases, rooms.
// Declared before /buildings/:id so "search" is not read as an id.
router.get(
  "/buildings/search",
  asyncHandler(async (req, res) => {
    res.json(await textSearch(Building, req.query.q));
  }),
);

// GET /api/buildings/:id
router.get(
  "/buildings/:id",
  asyncHandler(async (req, res) => {
    const building = await Building.findOne({ id: req.params.id });
    if (!building) return res.status(404).json({ error: "Building not found" });
    res.json(building);
  }),
);

// GET /api/graph -> { nodes: { [id]: node }, edges: [{ from, to }] }
router.get(
  "/graph",
  asyncHandler(async (req, res) => {
    const [nodeList, edges] = await Promise.all([
      GraphNode.find().lean(),
      GraphEdge.find().select("from to -_id").lean(),
    ]);

    const nodes = Object.fromEntries(
      nodeList.map(({ id, name, lat, lng, type }) => [id, { id, name, lat, lng, type }]),
    );

    res.json({ nodes, edges });
  }),
);

export default router;
