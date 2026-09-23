import "dotenv/config";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { connectDB } from "../db.js";

import Building from "../models/Building.js";
import GraphNode from "../models/GraphNode.js";
import GraphEdge from "../models/GraphEdge.js";
import Faq from "../models/Faq.js";
import Contact from "../models/Contact.js";

import {
  BUILDING_LIST,
  GRAPH_NODES,
  GRAPH_EDGES,
} from "../../src/data/buildings.js";
import { FAQS, CONTACTS } from "../../src/data/helpdesk.js";

const BUILDING_EXTRAS = {
  admin: {
    aliases: ["Admin Block", "Administration"],
    rooms: [
      {
        name: "Eva von Hirsch Auditorium",
        floor: "Ground Floor",
        desc: "Main administration auditorium for ceremonies and briefings.",
      },
      {
        name: "Vice-Chancellor's Board Room",
        floor: "Upper Floor",
        desc: "Executive meeting room for university leadership.",
      },
    ],
  },
  blockC: {
    aliases: ["Great Hall", "Block C"],
    rooms: [
      {
        name: "Great Hall",
        floor: "Ground Floor",
        capacity: 1500,
        desc: "Multipurpose hall for graduation and major events.",
      },
      {
        name: "Student Hostels",
        floor: "Upper Floors",
        desc: "On-campus student residential housing.",
      },
    ],
  },
  blockB: {
    aliases: ["COLT", "Block B"],
    rooms: [
      {
        name: "Centre for Online Teaching and Learning (COLT)",
        floor: "Ground Floor",
        desc: "Online learning and virtual exam hub.",
      },
    ],
  },
  blockG: {
    aliases: ["SGSR", "Block G", "Room G6"],
    rooms: [
      {
        name: "School of Graduate Studies and Research (SGSR)",
        floor: "Ground Floor",
        desc: "Graduate studies administration and research labs.",
      },
      { name: "Room G6", floor: "Ground Floor", desc: "Lecture/seminar room." },
    ],
  },
  focis: {
    aliases: ["FoCIS", "Faculty of Computing", "Computing"],
    rooms: [
      {
        name: "Computing Labs",
        floor: "Multiple Floors",
        desc: "Programming, networking, and AI/robotics labs.",
      },
    ],
  },
  eng: {
    aliases: ["Engineering Faculty", "Forecourt"],
    rooms: [
      {
        name: "Telecom & Electronics Workshop",
        floor: "Ground Floor",
        desc: "Practical engineering labs near the Forecourt.",
      },
    ],
  },
  hospital: {
    aliases: ["Clinic", "School Hospital"],
    rooms: [
      {
        name: "Outpatient & Dispensary",
        floor: "Ground Floor",
        desc: "24/7 outpatient treatment and drug dispensary.",
      },
    ],
  },
  cafe: { aliases: ["Cafeteria", "Dining Hall"], rooms: [] },
  onny_aud: {
    aliases: ["Florence Onny Auditorium", "Florence Onny Hall"],
    rooms: [
      {
        name: "Florence Onny Hall",
        floor: "Ground Floor",
        desc: "Specialized event space within the auditorium complex.",
      },
    ],
  },
  library: {
    aliases: ["Central Library", "School Library"],
    rooms: [
      {
        name: "Silent Study Rooms",
        floor: "Upper Floor",
        desc: "Quiet individual study spaces.",
      },
      {
        name: "Collaborative Research Rooms",
        floor: "Ground Floor",
        desc: "Group research and discussion rooms.",
      },
    ],
  },
};

const ENRICHED_BUILDINGS = BUILDING_LIST.map((b) => ({
  ...b,
  aliases: BUILDING_EXTRAS[b.id]?.aliases || [],
  rooms: BUILDING_EXTRAS[b.id]?.rooms || [],
}));

export async function seedDatabase() {
  const alreadyConnected = mongoose.connection.readyState === 1;
  if (!alreadyConnected) {
    await connectDB();
  }

  console.log("Clearing existing collections...");
  await Promise.all([
    Building.deleteMany({}),
    GraphNode.deleteMany({}),
    GraphEdge.deleteMany({}),
    Faq.deleteMany({}),
    Contact.deleteMany({}),
  ]);

  console.log("Seeding buildings...");
  await Building.insertMany(ENRICHED_BUILDINGS);

  console.log("Seeding graph nodes...");
  await GraphNode.insertMany(Object.values(GRAPH_NODES));

  console.log("Seeding graph edges...");
  await GraphEdge.insertMany(GRAPH_EDGES);

  console.log("Seeding FAQs...");
  await Faq.insertMany(FAQS);

  console.log("Seeding contacts...");
  await Contact.insertMany(CONTACTS);

  console.log("Seed complete.");
}

// Run only when invoked directly (npm run seed), not when imported. Comparing
// against a hand-built `file://${argv[1]}` string never matches on Windows
// (backslashes, drive letter) or for paths with spaces (%20), which made the
// seed script exit silently without seeding anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(() => mongoose.connection.close())
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
