// GCTU Help Desk knowledge base and support hotlines.
// Single source for both the database seed (server/seed/seed.js) and the
// Help Desk's offline fallback when the API cannot be reached.

export const FAQS = [
  {
    faqId: "faq-wifi",
    category: "IT & Connectivity",
    question: "How do I connect to the GCTU Student Wi-Fi?",
    answer:
      "Select the 'GCTU-STUDENTS' network on your device. When the routing page appears, log in using your GCTU Student Portal ID and the default password provided at the admissions office. For IT support, visit the FOCIS computer labs.",
  },
  {
    faqId: "faq-clinic",
    category: "Health & Welfare",
    question: "Where is the School Clinic located and what are the hours?",
    answer:
      "The School Clinic is located next to FOCIS. It operates 24/7 for emergencies, consultation, and dispensary services, and is completely free of charge upon presenting a valid student ID.",
  },
  {
    faqId: "faq-portal",
    category: "Academic Records",
    question: "How do I access my GCTU Digital Student Portal?",
    answer:
      "Go to portal.gctu.edu.gh in your browser. Enter your registered index number as username and the temporary password sent to your email. You can view your grades, register for courses, and print your fees transcripts here.",
  },
  {
    faqId: "faq-deadlines",
    category: "Academic Records",
    question: "How can I check academic registration deadlines?",
    answer:
      "Filing and registry deadlines are published on the electronic board at the Main Administration Building foyer. You can also view current university circulars under the 'Announcements' tab on the general website gctu.edu.gh.",
  },
  {
    faqId: "faq-admissions",
    category: "Admissions",
    question: "Where do I go for admissions enquiries?",
    answer:
      "Visit the Main Admissions Office in the Main Administration Building. Bring your application reference number and any required documents for verification by the registry staff.",
  },
  {
    faqId: "faq-hostel",
    category: "Hostels & Accommodation",
    question: "How do I find my way to the student hostels?",
    answer:
      "The hostel is located on the forecourt, precisely at the campus hostels area.",
  },
  {
    faqId: "faq-it-helpdesk",
    category: "IT & Connectivity",
    question:
      "Where is the IT helpdesk if my issue isn't resolved by Wi-Fi troubleshooting?",
    answer:
      "The IT/CIT directorate is located on the floor of the Main Administration Building. You can also visit the FoCIS computing labs for hands-on technical support during weekday working hours.",
  },
];

export const CONTACTS = [
  { dept: "Main Admissions Office", phone: "+233 302 200 233" },
  { dept: "Academic Affairs Helpdesk", phone: "+233 302 221 234" },
  { dept: "FoCIS CS/IT Dean's office", phone: "+233 302 251 543" },
  { dept: "Engineering Faculty Admin", phone: "+233 302 251 654" },
  { dept: "School Clinic Emergency Line", phone: "+233 244 567 890" },
];
