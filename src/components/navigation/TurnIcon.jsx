import {
  Navigation,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowUpLeft,
  ArrowLeft,
  CornerDownRight,
  CornerDownLeft,
  DoorOpen,
} from "lucide-react";

const ICONS = {
  depart: Navigation,
  straight: ArrowUp,
  "slight-right": ArrowUpRight,
  right: ArrowRight,
  "sharp-right": CornerDownRight,
  "slight-left": ArrowUpLeft,
  left: ArrowLeft,
  "sharp-left": CornerDownLeft,
  indoor: DoorOpen,
};

/* Arrow matching a turn-by-turn step's turnType. */
export default function TurnIcon({ turnType, size = 15 }) {
  const type = ICONS[turnType] ? turnType : "straight";
  const Icon = ICONS[type];

  return <Icon size={size} className={`turn-icon-${type}`} aria-hidden="true" />;
}
