import TurnIcon from "./TurnIcon.jsx";

/* Floating card over the map showing the current turn-by-turn step. */
export default function NavigationGuide({ step }) {
  if (!step) {
    return null;
  }

  return (
    <div
      id="floating-navigation-guide"
      className="floating-navigation-guide"
      role="status"
      aria-live="polite"
    >
      <div className="floating-guide-icon-box">
        <TurnIcon turnType={step.turnType} />
      </div>

      <div className="floating-guide-text">
        <div className="floating-guide-label">Directional Guide</div>
        <p className="floating-guide-instruction">{step.text}</p>
      </div>

      <div className="floating-guide-distance">
        <span className="floating-guide-distance-value">{step.distance}m</span>
        <span className="floating-guide-distance-label">to turn</span>
      </div>
    </div>
  );
}
