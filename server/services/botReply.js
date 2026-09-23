/* =========================================================
   Help-desk auto-responder: a keyword rule table. The first
   rule whose keywords appear in the ticket's subject or
   message decides the reply. It is rule-based, not AI.
========================================================= */

const DEFAULT_REPLY =
  "Thank you for contacting GCTU Help Desk. We have received your query. An academic officer from your faculty will contact you shortly.";

const RULES = [
  {
    keywords: ["wi-fi", "wifi", "internet"],
    reply:
      "Hi! For campus Wi-Fi troubles, please ensure you are in range of the GCTU-STUDENTS routers located around COLT block and Administration. Clear your phone cache or visit the CIT directorate floor in the Administration building to renew your access.",
  },
  {
    keywords: ["clinic", "sick", "hospital", "health"],
    reply:
      "Hello. If you require medical attention, you may walk straight into the GCTU School Clinic located next to FOCIS. Ensure you carry your GCTU Student ID card. For absolute medical emergencies, please dial our direct line at +233 244 567 890.",
  },
  {
    keywords: ["portal", "grade", "exam"],
    reply:
      "Greetings! Digital Student Portal logins are managed by Academic registry. If you are locked out or see incorrect transcripts, please write directly to registry@gctu.edu.gh with your index number and an image of your receipt.",
  },
  {
    keywords: ["fees", "money", "pay", "bank"],
    reply:
      "Hi! Tuition payments are validated through EcoBank or Consolidated Bank Ghana (CBG) partners. Once deposited, ensure you bring your physical deposit slip to the finance counter at the Admin block to obtain your receipt.",
  },
];

export function getBotReply({ subject = "", message = "" }) {
  const text = `${message} ${subject}`.toLowerCase();
  const rule = RULES.find(({ keywords }) => keywords.some((word) => text.includes(word)));

  return rule ? rule.reply : DEFAULT_REPLY;
}
