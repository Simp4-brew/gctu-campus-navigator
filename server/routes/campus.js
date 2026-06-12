import express from 'express';
import Building from '../models/Building.js';
import GraphNode from '../models/GraphNode.js';
import GraphEdge from '../models/GraphEdge.js';

const router = express.Router();

// GET /api/buildings
router.get('/buildings', async (req, res) => {
  try {
    const buildings = await Building.find().sort({ name: 1 });
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buildings/search?q=COLT  -> text search across name, aliases, rooms
router.get('/buildings/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const results = await Building.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buildings/:id
router.get('/buildings/:id', async (req, res) => {
  try {
    const building = await Building.findOne({ id: req.params.id });
    if (!building) return res.status(404).json({ error: 'Building not found' });
    res.json(building);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graph -> { nodes: {...}, edges: [...] }
router.get('/graph', async (req, res) => {
  try {
    const nodesArr = await GraphNode.find();
    const edges = await GraphEdge.find().select('from to -_id');

    const nodes = {};
    nodesArr.forEach(n => {
      nodes[n.id] = { id: n.id, name: n.name, lat: n.lat, lng: n.lng, type: n.type };
    });

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
