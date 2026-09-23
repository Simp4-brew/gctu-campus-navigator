import { Compass, Landmark, MessageSquare } from "lucide-react";

/* The app's three tabs. The header shows `emoji label`; the mobile
   bottom bar shows `Icon` above the label. */
export const TABS = [
  { id: "campus", label: "Campus", emoji: "🏫", Icon: Landmark },
  { id: "navigate", label: "Navigate", emoji: "🧭", Icon: Compass },
  { id: "help", label: "Help Desk", emoji: "💬", Icon: MessageSquare },
];
