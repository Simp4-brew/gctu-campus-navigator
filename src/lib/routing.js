/* =========================================================
   Campus routing: Dijkstra's shortest path over the walkway
   graph, plus turn-by-turn instructions for the result.
   Pure functions, no React.
========================================================= */

import { BUILDING_LIST, GRAPH_NODES, GRAPH_EDGES } from "../data/buildings.js";
import { getDistance } from "./geo.js";

/* Undirected adjacency list: node id -> neighbour ids, in edge order. */
function buildAdjacency(edges) {
  const adjacency = new Map();

  const link = (from, to) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  };

  for (const { from, to } of edges) {
    link(from, to);
    link(to, from);
  }

  return adjacency;
}

// Built once: scanning the full edge list for every visited node was
// O(V * E); a lookup table makes each neighbour query O(degree).
const CAMPUS_ADJACENCY = buildAdjacency(GRAPH_EDGES);

/* Shortest walking route between two node ids.
   Returns { path: [nodeIds], distance: metres }. The path is empty when
   either id is unknown or the nodes are not connected. */
export function findDijkstraPath(
  startId,
  endId,
  nodes = GRAPH_NODES,
  adjacency = CAMPUS_ADJACENCY,
) {
  if (!nodes[startId] || !nodes[endId]) {
    return { path: [], distance: 0 };
  }

  if (startId === endId) {
    return { path: [startId], distance: 0 };
  }

  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(nodes));

  for (const id of unvisited) {
    distances[id] = Infinity;
    previous[id] = null;
  }

  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Linear scan for the closest unvisited node: with ~15 nodes this is
    // faster in practice than maintaining a priority queue.
    let currentId = null;

    for (const id of unvisited) {
      if (currentId === null || distances[id] < distances[currentId]) {
        currentId = id;
      }
    }

    if (distances[currentId] === Infinity || currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (!unvisited.has(neighborId)) continue;

      const alternative =
        distances[currentId] + getDistance(nodes[currentId], nodes[neighborId]);

      if (alternative < distances[neighborId]) {
        distances[neighborId] = alternative;
        previous[neighborId] = currentId;
      }
    }
  }

  if (previous[endId] === null) {
    return { path: [], distance: 0 };
  }

  const path = [];

  for (let current = endId; current !== null; current = previous[current]) {
    path.unshift(current);
  }

  return { path, distance: distances[endId] };
}

/* Node ids -> [lat, lng] pairs, skipping any unknown id. */
export function pathToLatLngs(path, nodes = GRAPH_NODES) {
  return path
    .map((nodeId) => nodes[nodeId])
    .filter(Boolean)
    .map((node) => [node.lat, node.lng]);
}

/* Compass bearing in degrees from one node to another. */
function bearing(from, to) {
  return (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
}

/* Turn category from the change in heading (degrees, -180..180).
   Positive is clockwise, i.e. a right turn. */
function classifyTurn(difference) {
  const magnitude = Math.abs(difference);

  if (magnitude < 22) return "straight";

  const side = difference > 0 ? "right" : "left";

  if (magnitude < 65) return `slight-${side}`;
  if (magnitude < 125) return side;

  return `sharp-${side}`;
}

const INSTRUCTIONS = {
  depart: (from, to) => `Depart from ${from} and head directly toward ${to}.`,
  straight: (from, to) => `Continue straight past ${from} toward ${to}.`,
  "slight-right": (from, to) => `Bear slightly right at ${from} toward ${to}.`,
  right: (from, to) => `Turn right at ${from} and walk toward ${to}.`,
  "sharp-right": (from, to) =>
    `Make a sharp right turn at ${from} toward ${to}.`,
  "slight-left": (from, to) => `Bear slightly left at ${from} toward ${to}.`,
  left: (from, to) => `Turn left at ${from} and proceed toward ${to}.`,
  "sharp-left": (from, to) => `Make a sharp left turn at ${from} toward ${to}.`,
};

/* One instruction per path segment: { key, from, to, text, turnType,
   distance }. The first segment departs; every later one compares its
   heading with the previous segment's to decide the turn. */
export function generateTurnByTurn(path, nodes = GRAPH_NODES) {
  if (!path || path.length < 2) {
    return [];
  }

  const directions = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = nodes[path[i]];
    const toNode = nodes[path[i + 1]];
    const previousNode = i > 0 ? nodes[path[i - 1]] : null;

    if (!fromNode || !toNode || (i > 0 && !previousNode)) {
      continue;
    }

    let turnType = "depart";

    if (previousNode) {
      let difference =
        bearing(fromNode, toNode) - bearing(previousNode, fromNode);

      while (difference < -180) difference += 360;
      while (difference > 180) difference -= 360;

      turnType = classifyTurn(difference);
    }

    directions.push({
      key: i,
      from: fromNode.name,
      to: toNode.name,
      text: INSTRUCTIONS[turnType](fromNode.name, toNode.name),
      turnType,
      distance: Math.round(getDistance(fromNode, toNode)),
    });
  }

  return directions;
}

/* =========================================================
   Places inside buildings (first step of indoor navigation)

   Some destinations are not separate buildings: the Florence
   Onny Auditorium is inside the Graduate block, the Library on
   the first floor of the Admin block. They carry
   `insideBuilding` and `floor`; routes go to the host
   building's entrance and finish with an indoor instruction.
========================================================= */

const PLACES = Object.fromEntries(BUILDING_LIST.map((place) => [place.id, place]));

/* Places located inside each building, keyed by the host building id. */
export const PLACES_INSIDE = BUILDING_LIST.reduce((inside, place) => {
  if (place.insideBuilding) {
    (inside[place.insideBuilding] ??= []).push(place);
  }
  return inside;
}, {});

/* The graph node a place is reached at, and its host building if any. */
export function resolvePlace(placeId) {
  const place = PLACES[placeId];

  if (place?.insideBuilding) {
    return { nodeId: place.insideBuilding, place, host: PLACES[place.insideBuilding] };
  }

  return { nodeId: placeId, place: place ?? GRAPH_NODES[placeId] ?? null, host: null };
}

export function placeName(placeId) {
  return PLACES[placeId]?.name ?? GRAPH_NODES[placeId]?.name ?? placeId;
}

function indoorStep(key, place, host) {
  const upstairs = place.floor && !/ground/i.test(place.floor);

  return {
    key,
    from: host.name,
    to: place.name,
    text: upstairs
      ? `Enter the ${host.name} and take the stairs to the ${place.floor} for the ${place.name}.`
      : `Enter the ${host.name}. The ${place.name} is on the ${place.floor}.`,
    turnType: "indoor",
    distance: 0,
    floor: place.floor,
    indoor: true,
  };
}

/* Everything the UI needs about the route between two places
   (building ids, the gate, or places inside buildings). */
export function planRoute(startId, endId) {
  const start = resolvePlace(startId);
  const end = resolvePlace(endId);

  const { path, distance } = findDijkstraPath(start.nodeId, end.nodeId);
  const steps = generateTurnByTurn(path);

  if (end.host && path.length > 0) {
    steps.push(indoorStep(steps.length, end.place, end.host));
  }

  return {
    path,
    distance,
    steps,
    points: pathToLatLngs(path),
    key: path.join(">"),
    startName: placeName(startId),
    endName: placeName(endId),
  };
}
