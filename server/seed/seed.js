// Run with: node server/seed/seed.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../db.js';

import Building from '../models/Building.js';
import GraphNode from '../models/GraphNode.js';
import GraphEdge from '../models/GraphEdge.js';
import Faq from '../models/Faq.js';
import Contact from '../models/Contact.js';

import { BUILDING_LIST, GRAPH_NODES, GRAPH_EDGES } from '../../src/data/buildings.js';

// Extra metadata layered on top of BUILDING_LIST (rooms + search aliases),
// keyed by the building's existing `id` so coordinates/IDs stay in sync
// with what NavigationPanel.jsx and CampusHome.jsx already expect.
const BUILDING_EXTRAS = {
  admin: {
    aliases: ["Admin Block", "Administration"],
    rooms: [
      { name: "Eva von Hirsch Auditorium", floor: "Ground Floor", desc: "Main administration auditorium for ceremonies and briefings." },
      { name: "Vice-Chancellor's Board Room", floor: "Upper Floor", desc: "Executive meeting room for university leadership." }
    ]
  },
  blockC: {
    aliases: ["Great Hall", "Block C"],
    rooms: [
      { name: "Great Hall", floor: "Ground Floor", capacity: 1500, desc: "Multipurpose hall for graduation and major events." },
      { name: "Student Hostels", floor: "Upper Floors", desc: "On-campus student residential housing." }
    ]
  },
  blockB: {
    aliases: ["COLT", "Block B"],
    rooms: [
      { name: "Centre for Online Teaching and Learning (COLT)", floor: "Ground Floor", desc: "Online learning and virtual exam hub." }
    ]
  },
  blockG: {
    aliases: ["SGSR", "Block G", "Room G6"],
    rooms: [
      { name: "School of Graduate Studies and Research (SGSR)", floor: "Ground Floor", desc: "Graduate studies administration and research labs." },
      { name: "Room G6", floor: "Ground Floor", desc: "Lecture/seminar room." }
    ]
  },
  focis: {
    aliases: ["FoCIS", "Faculty of Computing", "Computing"],
    rooms: [
      { name: "Computing Labs", floor: "Multiple Floors", desc: "Programming, networking, and AI/robotics labs." }
    ]
  },
  eng: {
    aliases: ["Engineering Faculty", "Forecourt"],
    rooms: [
      { name: "Telecom & Electronics Workshop", floor: "Ground Floor", desc: "Practical engineering labs near the Forecourt." }
    ]
  },
  hospital: {
    aliases: ["Clinic", "School Hospital"],
    rooms: [
      { name: "Outpatient & Dispensary", floor: "Ground Floor", desc: "24/7 outpatient treatment and drug dispensary." }
    ]
  },
  cafe: {
    aliases: ["Cafeteria", "Dining Hall"],
    rooms: []
  },
  onny_aud: {
    aliases: ["Florence Onny Auditorium", "Florence Onny Hall"],
    rooms: [
      { name: "Florence Onny Hall", floor: "Ground Floor", desc: "Specialized event space within the auditorium complex." }
    ]
  },
  library: {
    aliases: ["Central Library", "School Library"],
    rooms: [
      { name: "Silent Study Rooms", floor: "Upper Floor", desc: "Quiet individual study spaces." },
      { name: "Collaborative Research Rooms", floor: "Ground Floor", desc: "Group research and discussion rooms." }
    ]
  }
};

// Merge BUILDING_LIST (source of truth for ids/coords) with extras (rooms/aliases)
const ENRICHED_BUILDINGS = BUILDING_LIST.map(b => ({
  ...b,
  aliases: BUILDING_EXTRAS[b.id]?.aliases || [],
  rooms: BUILDING_EXTRAS[b.id]?.rooms || []
}));

const FAQS = [
  {
    faqId: "faq-wifi",
    category: "IT & Connectivity",
    question: "How do I connect to the GCTU Student Wi-Fi?",
    answer: "Select the 'GCTU-STUDENTS' network on your device. When the routing page appears, log in using your GCTU Student Portal ID and the default password provided at the admissions office. For IT support, visit the FOCIS computer labs."
  },
  {
    faqId: "faq-clinic",
    category: "Health & Welfare",
    question: "Where is the School Clinic located and what are the hours?",
    answer: "The School Hospital/Clinic is situated in the north sector, immediately adjacent to Classroom Block G (SGSR). It operates 24/7 for emergencies, consultation, and dispensary services, and is completely free of charge upon presenting a valid student ID."
  },
  {
    faqId: "faq-portal",
    category: "Academic Records",
    question: "How do I access my GCTU Digital Student Portal?",
    answer: "Go to portal.gctu.edu.gh in your browser. Enter your registered index number as username and the temporary password sent to your email. You can view your grades, register for courses, and print your fees transcripts here."
  },
  {
    faqId: "faq-deadlines",
    category: "Academic Records",
    question: "How can I check academic registration deadlines?",
    answer: "Filing and registry deadlines are published on the electronic board at the Main Administration Building foyer. You can also view current university circulars under the 'Announcements' tab on the general website gctu.edu.gh."
  },
  {
    faqId: "faq-admissions",
    category: "Admissions",
    question: "Where do I go for admissions enquiries?",
    answer: "Visit the Main Admissions Office in the Main Administration Building. Bring your application reference number and any required documents for verification by the registry staff."
  },
  {
    faqId: "faq-hostel",
    category: "Hostels & Accommodation",
    question: "How do I find my way to the student hostels?",
    answer: "Student hostels are located on the upper floors of Classroom Block C, the same building as the Great Hall. Use the campus navigator and search 'Block C' or 'Great Hall' to get directions."
  },
  {
    faqId: "faq-it-helpdesk",
    category: "IT & Connectivity",
    question: "Where is the IT helpdesk if my issue isn't resolved by Wi-Fi troubleshooting?",
    answer: "The IT/CIT directorate is located on the floor of the Main Administration Building. You can also visit the FoCIS computing labs for hands-on technical support during weekday working hours."
  }
];

const CONTACTS = [
  { dept: "Main Admissions Office", phone: "+233 302 200 233" },
  { dept: "Academic Affairs Helpdesk", phone: "+233 302 221 234" },
  { dept: "FoCIS CS/IT Dean's office", phone: "+233 302 251 543" },
  { dept: "Engineering Faculty Admin", phone: "+233 302 251 654" },
  { dept: "School Clinic Emergency Line", phone: "+233 244 567 890" }
];

async function seed() {
  await connectDB();

  console.log('Clearing existing collections...');
  await Promise.all([
    Building.deleteMany({}),
    GraphNode.deleteMany({}),
    GraphEdge.deleteMany({}),
    Faq.deleteMany({}),
    Contact.deleteMany({})
  ]);

  console.log('Seeding buildings...');
  await Building.insertMany(ENRICHED_BUILDINGS);

  console.log('Seeding graph nodes...');
  await GraphNode.insertMany(Object.values(GRAPH_NODES));

  console.log('Seeding graph edges...');
  await GraphEdge.insertMany(GRAPH_EDGES);

  console.log('Seeding FAQs...');
  await Faq.insertMany(FAQS);

  console.log('Seeding contacts...');
  await Contact.insertMany(CONTACTS);

  console.log('Seed complete.');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
