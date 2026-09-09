// GCTU Campus Navigator Nodes and Buildings Data
// Location: Tesano, Accra, Ghana

export const BUILDING_LIST = [
  {
    id: "admin",
    name: "Main Administration Building",
    shortName: "Admin Block",
    category: "Administration",
    emoji: "🏛",
    lat: 5.595919,
    lng: -0.222668,
    desc: "Central hub for university management, registry, and administrative offices.",
    facts: [
      "Founded in 1973 during GCTU's telecom college era",
      "Houses the Vice Chancellor's and Registrar's offices",
      "Main student services registry point",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpBxy8n45i5wtu4lFCbirea__eB3yQbDVzOfd9E4VfAQ&s=10",
  },
  {
    id: "blockC",
    name: "Classroom Block C (Great Hall)",
    shortName: "Great Hall",
    category: "Academic",
    emoji: "🎓",
    lat: 5.595541,
    lng: -0.223642,
    desc: "A historic multipurpose hall hosting graduation ceremonies, matriculations, and major academic lectures.",
    facts: [
      "Seats up to 1,500 students and visitors",
      "Host of the annual GCTU Debate Championships",
      "Excellent acoustics for campus and cultural gatherings",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSU8hX7miQA0b-gGw7JYBHMKtvJsUfPvRoO4b25Pt4jGA&s=10",
  },
  {
    id: "blockB",
    name: "Classroom Block B (COLT)",
    shortName: "COLT Block",
    category: "Academic",
    emoji: "💻",
    lat: 5.595981,
    lng: -0.223744,
    desc: "The Centre for Online Learning and Teaching (COLT) and modern technology-integrated lecture rooms.",
    facts: [
      "Equipped with interactive smartboards and projection tools",
      "Central hub for campus online exams & virtual teaching",
      "High-speed fiber-optic Wi-Fi coverage of 100 Mbps",
    ],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/d/de/Ashesi_Campus_2013-11-20_-074.jpg",
  },
  {
    id: "blockG",
    name: "Classroom Block G (SGSR)",
    shortName: "SGSR Block",
    category: "Academic",
    emoji: "📚",
    lat: 5.5966,
    lng: -0.223736,
    desc: "The School of Graduate Studies and Research (SGSR) complex and research labs.",
    facts: [
      "Dedicated graduate study spaces and research carrels",
      "Hosts international research symposiums",
      "Equipped with professional thesis defense conference rooms",
    ],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/d/de/Ashesi_Campus_2013-11-20_-074.jpg",
  },
  {
    id: "focis",
    name: "Faculty of Computing (FoCIS)",
    shortName: "FoCIS",
    category: "Faculty",
    emoji: "🖥",
    lat: 5.595541,
    lng: -0.223733,
    desc: "The premier faculty for Computer Science, Information Technology, and Software Engineering studies.",
    facts: [
      "Equipped with standard graphics and programming labs",
      "Home of the active GCTU Robotics and AI Innovation Club",
      "Features professional certification labs from Cisco and Huawei",
    ],
    image:
      "https://site.gctu.edu.gh/wp-content/uploads/2022/05/focis-handing-over4.jpg",
  },
  {
    id: "eng",
    name: "Faculty of Engineering",
    shortName: "Engineering",
    category: "Faculty",
    emoji: "⚙️",
    lat: 5.596133,
    lng: -0.222994,
    desc: "Practical labs for telecommunications, electronics, microwave, and mobile engineering systems.",
    facts: [
      "Houses specialized mobile network testing simulators",
      "Strong collaborative ties with major African telecom carriers",
      "Practical engineering workshop and fabrication yard",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSd5ef9Te-jJrC3cvRowo6EtERSG5RI3Frpv7Kjm4HvXQ&s=10",
  },
  {
    id: "hospital",
    name: "School Hospital",
    shortName: "Hospital",
    category: "Health",
    emoji: "🏥",
    lat: 5.596644,
    lng: -0.223433,
    desc: "24/7 campus clinic supplying outpatient treatments, wellness clinics, and emergency medical focus.",
    facts: [
      "Staffed with resident medical officers & nurse practitioners",
      "In-house laboratory, diagnostic room, and drug dispensary",
      "Free medical insurance cover scheme for all current students",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQM57XxKPdyIi42DfU5za9pG6NXordI0vSwlNeSlRFeGw&s=10",
  },
  {
    id: "cafe",
    name: "Campus Cafeteria",
    shortName: "Cafeteria",
    category: "Welfare",
    emoji: "🍽",
    lat: 5.596141,
    lng: -0.22314,
    desc: "Hearty campus diner serving traditional Ghanaian foods like Jollof, Fufu, Banku, and Waakye.",
    facts: [
      "Strict food safety and health certification credentials",
      "Includes a spacious outdoor pergola recreation seating",
      "Unrivaled social convergence center during midday breaks",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzgBpBaK4q5Ws_U4_bRiIPVrnRsgYbMuiaY-9KLSEEMA&s=10",
  },
  {
    id: "onny_aud",
    name: "Florence Onny Auditorium",
    shortName: "Auditorium",
    category: "Events",
    emoji: "🎭",
    lat: 5.595879,
    lng: -0.222871,
    desc: "A fully air-conditioned auditorium for lectures, seminars, and student association events.",
    facts: [
      "Fitted with state-of-the-art surround sound and projections",
      "Named after GCTU's legendary pioneer registrar",
      "Regularly hosts tech pitch events and guest industry seminars",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRemSr6aQOV81XDH3keirqeHybIa5XHqSwXEkx38PI8QA&s=10",
  },
  {
    id: "library",
    name: "GCTU Central Library",
    shortName: "School Library",
    category: "Academic",
    emoji: "📖",
    lat: 5.596388,
    lng: -0.2231,
    desc: "The digital and physical knowledge sanctuary of GCTU, housing over 50,000 tech books, journals, and silent collective research labs.",
    facts: [
      "Over 50,000 engineering and computer science science volumes",
      "High-speed 24/7 digital e-library subscription portal",
      "Features quiet individual study space and dynamic collaborative rooms",
    ],
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOeHDcXUCIuBbwHAPguF814iFTZONukunJ1SaVOTJP6A&s=10",
  },
];

// Graph Nodes of GCTU Campus
// Includes both building points and strategic path junctions for robust routing
//
// UPDATE (defense-day fix): FoCIS, Block C, Florence Onny Auditorium,
// Library, and Engineering coordinates below were replaced with real
// Google Maps-verified positions after the previous estimated coordinates
// caused inaccurate turn-by-turn directions. FoCIS and Block C are
// confirmed to be directly adjacent (a genuine 1-2 min walk), which is
// why a direct edge was added between them in GRAPH_EDGES below.
export const GRAPH_NODES = {
  // Buildings
  admin: {
    id: "admin",
    name: "Main Administration Building",
    lat: 5.595919,
    lng: -0.222668,
    type: "building",
  },
  blockC: {
    id: "blockC",
    name: "Classroom Block C",
    lat: 5.595541,
    lng: -0.223642,
    type: "building",
  },
  blockB: {
    id: "blockB",
    name: "Classroom Block B (COLT)",
    lat: 5.595981,
    lng: -0.223744,
    type: "building",
  },
  blockG: {
    id: "blockG",
    name: "Classroom Block G (SGSR)",
    lat: 5.5966,
    lng: -0.223736,
    type: "building",
  },
  focis: {
    id: "focis",
    name: "Faculty of Computing (FoCIS)",
    lat: 5.595541,
    lng: -0.223733,
    type: "building",
  },
  eng: {
    id: "eng",
    name: "Faculty of Engineering",
    lat: 5.596133,
    lng: -0.222994,
    type: "building",
  },
  hospital: {
    id: "hospital",
    name: "School Hospital",
    lat: 5.596644,
    lng: -0.223433,
    type: "building",
  },
  cafe: {
    id: "cafe",
    name: "Campus Cafeteria",
    lat: 5.596141,
    lng: -0.22314,
    type: "building",
  },
  onny_aud: {
    id: "onny_aud",
    name: "Florence Onny Auditorium",
    lat: 5.595879,
    lng: -0.222871,
    type: "building",
  },
  library: {
    id: "library",
    name: "GCTU Central Library",
    lat: 5.596388,
    lng: -0.2231,
    type: "building",
  },

  // Junctions
  gate: {
    id: "gate",
    name: "Main Campus Gate",
    lat: 5.595452,
    lng: -0.222366,
    type: "junction",
  },
  junc_center: {
    id: "junc_center",
    name: "Central Circle Path",
    lat: 5.596433,
    lng: -0.223177,
    type: "junction",
  },
  junc_north: {
    id: "junc_north",
    name: "North Walkway Intersection",
    lat: 5.596953,
    lng: -0.223643,
    type: "junction",
  },
  junc_west: {
    id: "junc_west",
    name: "West Block C/B walkway",
    lat: 5.596252,
    lng: -0.223718,
    type: "junction",
  },
  junc_east: {
    id: "junc_east",
    name: "East FoCIS/Engineering path",
    lat: 5.596604,
    lng: -0.222856,
    type: "junction",
  },
};

// Real campus boundary polygon (OSM way 357120833), [lat, lng] pairs.
// Not currently rendered, but kept here for the schematic bounding box
// below and for anyone who wants to draw the outline later.
export const CAMPUS_BOUNDARY = [
  [5.5966633, -0.2249438],
  [5.5972784, -0.2236526],
  [5.5974116, -0.223373],
  [5.5973302, -0.2233241],
  [5.5973996, -0.2231497],
  [5.5956394, -0.2222604],
  [5.5947151, -0.2233889],
];

// Graph Edges/Walkways (undirected)
export const GRAPH_EDGES = [
  { from: "gate", to: "admin" },
  { from: "admin", to: "junc_center" },
  { from: "admin", to: "onny_aud" },

  { from: "junc_center", to: "cafe" },
  { from: "junc_center", to: "blockC" },
  { from: "junc_center", to: "eng" },
  { from: "junc_center", to: "onny_aud" },

  { from: "blockC", to: "junc_west" },
  { from: "junc_west", to: "blockB" },
  { from: "blockB", to: "blockG" },

  { from: "blockG", to: "junc_north" },
  { from: "junc_north", to: "cafe" },
  { from: "junc_north", to: "hospital" },
  { from: "junc_north", to: "focis" },

  { from: "focis", to: "junc_east" },
  { from: "eng", to: "junc_east" },
  { from: "junc_east", to: "onny_aud" },
  { from: "hospital", to: "focis" },

  { from: "cafe", to: "focis" },
  { from: "cafe", to: "blockB" },
  { from: "cafe", to: "eng" },
  { from: "onny_aud", to: "eng" },
  { from: "library", to: "junc_center" },
  { from: "library", to: "blockC" },
  { from: "admin", to: "library" },

  // Direct FoCIS <-> Block C walkway (verified adjacent on Google Maps)
  { from: "focis", to: "blockC" },

  // Direct Hospital <-> western walkway junction
  { from: "hospital", to: "junc_west" },
];
