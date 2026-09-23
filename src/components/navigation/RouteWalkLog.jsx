import TurnIcon from "./TurnIcon.jsx";

/* Turn-by-turn list for the planned route. While the walk demo runs,
   steps already walked are marked visited and the current one active. */
export default function RouteWalkLog({ route, simulating, currentNodeId }) {
  const { path, steps, distance } = route;

  // A place inside the start building has only its indoor step.
  if (steps.length === 0) {
    return null;
  }

  const currentNodeIndex = simulating ? path.indexOf(currentNodeId) : -1;

  return (
    <div className="route-summary-card compact" id="route-path-summary">
      <div className="route-summary-title compact-title">
        <span className="route-summary-heading">🚶 Route Walk Log</span>

        <span className="route-distance-pill compact-pill" id="route-meters-span">
          {Math.round(distance)} meters
        </span>
      </div>

      <ul className="tbt-list compact-list" id="tbt-list-ul">
        {steps.map((step, index) => {
          const visited = currentNodeIndex > index;
          const current = currentNodeIndex === index;

          return (
            <li
              key={step.key}
              className={`tbt-step ${visited ? "visited" : ""} ${current ? "active" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <span className="tbt-step-icon">
                <TurnIcon turnType={step.turnType} />
              </span>

              <div className="tbt-step-text">
                <p className={`tbt-step-instruction ${current ? "active" : ""}`}>
                  {step.text}
                </p>

                <span className={`tbt-step-distance ${current ? "active" : ""}`}>
                  {step.indoor ? `(indoors · ${step.floor})` : `(${step.distance} meters walk)`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
