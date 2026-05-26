// GCTU Campus Navigator Nodes and Buildings Data
// Location: Tesano, Accra, Ghana

export const BUILDING_LIST = [
  { 
    id: "admin", 
    name: "Main Administration Building", 
    shortName: "Admin Block", 
    category: "Administration", 
    emoji: "🏛",
    lat: 5.6012, 
    lng: -0.2285,
    desc: "Central hub for university management, registry, and administrative offices.",
    facts: [
      "Founded in 1973 during GCTU's telecom college era",
      "Houses the Vice Chancellor's and Registrar's offices",
      "Main student services registry point"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3a/University_of_Ghana_Administration_Block_%281%29.jpg"
  },
  { 
    id: "blockC", 
    name: "Classroom Block C (Great Hall)", 
    shortName: "Great Hall", 
    category: "Academic", 
    emoji: "🎓",
    lat: 5.6015, 
    lng: -0.2291,
    desc: "A historic multipurpose hall hosting graduation ceremonies, matriculations, and major academic lectures.",
    facts: [
      "Seats up to 1,500 students and visitors",
      "Host of the annual GCTU Debate Championships",
      "Excellent acoustics for campus and cultural gatherings"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Great_Hall_of_the_University_of_Ghana.jpg"
  },
  { 
    id: "blockB", 
    name: "Classroom Block B (COLT)", 
    shortName: "COLT Block", 
    category: "Academic", 
    emoji: "💻",
    lat: 5.6018, 
    lng: -0.2292,
    desc: "The Centre for Online Learning and Teaching (COLT) and modern technology-integrated lecture rooms.",
    facts: [
      "Equipped with interactive smartboards and projection tools",
      "Central hub for campus online exams & virtual teaching",
      "High-speed fiber-optic Wi-Fi coverage of 100 Mbps"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/d/de/Ashesi_Campus_2013-11-20_-074.jpg"
  },
  { 
    id: "blockG", 
    name: "Classroom Block G (SGSR)", 
    shortName: "SGSR Block", 
    category: "Academic", 
    emoji: "📚",
    lat: 5.6023, 
    lng: -0.2290,
    desc: "The School of Graduate Studies and Research (SGSR) complex and research labs.",
    facts: [
      "Dedicated graduate study spaces and research carrels",
      "Hosts international research symposiums",
      "Equipped with professional thesis defense conference rooms"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/d/de/Ashesi_Campus_2013-11-20_-074.jpg"
  },
  { 
    id: "focis", 
    name: "Faculty of Computing (FoCIS)", 
    shortName: "FoCIS", 
    category: "Faculty", 
    emoji: "🖥",
    lat: 5.6022, 
    lng: -0.2279,
    desc: "The premier faculty for Computer Science, Information Technology, and Software Engineering studies.",
    facts: [
      "Equipped with standard graphics and programming labs",
      "Home of the active GCTU Robotics and AI Innovation Club",
      "Features professional certification labs from Cisco and Huawei"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Computer_lab_at_Ashesi_University.jpg"
  },
  { 
    id: "eng", 
    name: "Faculty of Engineering", 
    shortName: "Engineering", 
    category: "Faculty", 
    emoji: "⚙️",
    lat: 5.6017, 
    lng: -0.2278,
    desc: "Practical labs for telecommunications, electronics, microwave, and mobile engineering systems.",
    facts: [
      "Houses specialized mobile network testing simulators",
      "Strong collaborative ties with major African telecom carriers",
      "Practical engineering workshop and fabrication yard"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Ashesi_Engineering_Building.jpg"
  },
  { 
    id: "hospital", 
    name: "School Hospital", 
    shortName: "Hospital", 
    category: "Health", 
    emoji: "🏥",
    lat: 5.6025, 
    lng: -0.2282,
    desc: "24/7 campus clinic supplying outpatient treatments, wellness clinics, and emergency medical focus.",
    facts: [
      "Staffed with resident medical officers & nurse practitioners",
      "In-house laboratory, diagnostic room, and drug dispensary",
      "Free medical insurance cover scheme for all current students"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/9/90/Ridge_Hospital_Accra.jpg"
  },
  { 
    id: "cafe", 
    name: "Campus Cafeteria", 
    shortName: "Cafeteria", 
    category: "Welfare", 
    emoji: "🍽",
    lat: 5.6019, 
    lng: -0.2285,
    desc: "Hearty campus diner serving traditional Ghanaian foods like Jollof, Fufu, Banku, and Waakye.",
    facts: [
      "Strict food safety and health certification credentials",
      "Includes a spacious outdoor pergola recreation seating",
      "Unrivaled social convergence center during midday breaks"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Unilag_Cafeteria_01.jpg"
  },
  { 
    id: "onny_aud", 
    name: "Florence Onny Auditorium", 
    shortName: "Auditorium", 
    category: "Events", 
    emoji: "🎭",
    lat: 5.6013, 
    lng: -0.2281,
    desc: "A fully air-conditioned auditorium for lectures, seminars, and student association events.",
    facts: [
      "Fitted with state-of-the-art surround sound and projections",
      "Named after GCTU's legendary pioneer registrar",
      "Regularly hosts tech pitch events and guest industry seminars"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ab/International_Conference_Centre%2C_Accra.jpg"
  },
  { 
    id: "library", 
    name: "GCTU Central Library", 
    shortName: "School Library", 
    category: "Academic", 
    emoji: "📖",
    lat: 5.6014, 
    lng: -0.2287,
    desc: "The digital and physical knowledge sanctuary of GCTU, housing over 50,000 tech books, journals, and silent collective research labs.",
    facts: [
      "Over 50,000 engineering and computer science science volumes",
      "High-speed 24/7 digital e-library subscription portal",
      "Features quiet individual study space and dynamic collaborative rooms"
    ],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Balme_Library_of_the_University_of_Ghana.jpg"
  }
];

// Graph Nodes of GCTU Campus
// Includes both building points and strategic path junctions for robust routing
export const GRAPH_NODES = {
  // Buildings
  admin: { id: "admin", name: "Main Administration Building", lat: 5.6012, lng: -0.2285, type: "building" },
  blockC: { id: "blockC", name: "Classroom Block C", lat: 5.6015, lng: -0.2291, type: "building" },
  blockB: { id: "blockB", name: "Classroom Block B (COLT)", lat: 5.6018, lng: -0.2292, type: "building" },
  blockG: { id: "blockG", name: "Classroom Block G (SGSR)", lat: 5.6023, lng: -0.2290, type: "building" },
  focis: { id: "focis", name: "Faculty of Computing (FoCIS)", lat: 5.6022, lng: -0.2279, type: "building" },
  eng: { id: "eng", name: "Faculty of Engineering", lat: 5.6017, lng: -0.2278, type: "building" },
  hospital: { id: "hospital", name: "School Hospital", lat: 5.6025, lng: -0.2282, type: "building" },
  cafe: { id: "cafe", name: "Campus Cafeteria", lat: 5.6019, lng: -0.2285, type: "building" },
  onny_aud: { id: "onny_aud", name: "Florence Onny Auditorium", lat: 5.6013, lng: -0.2281, type: "building" },
  library: { id: "library", name: "GCTU Central Library", lat: 5.6014, lng: -0.2287, type: "building" },
  
  // Junctions
  gate: { id: "gate", name: "Main Campus Gate", lat: 5.6008, lng: -0.2285, type: "junction" },
  junc_center: { id: "junc_center", name: "Central Circle Path", lat: 5.6016, lng: -0.2285, type: "junction" },
  junc_north: { id: "junc_north", name: "North Walkway Intersection", lat: 5.6022, lng: -0.2285, type: "junction" },
  junc_west: { id: "junc_west", name: "West Block C/B walkway", lat: 5.6016, lng: -0.2291, type: "junction" },
  junc_east: { id: "junc_east", name: "East FoCIS/Engineering path", lat: 5.6019, lng: -0.2279, type: "junction" }
};

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
  { from: "admin", to: "library" }
];
