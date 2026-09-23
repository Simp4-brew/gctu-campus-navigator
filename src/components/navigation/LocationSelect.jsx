import { BUILDING_LIST } from "../../data/buildings.js";

const SHORT_NAMES = Object.fromEntries(BUILDING_LIST.map((b) => [b.id, b.shortName]));

/* Start / destination picker: the Main Gate plus every building.
   The gate is offered on both sides because swapping a route that
   starts at the gate makes the gate the destination. */
export default function LocationSelect({ id, label, icon, value, onChange, disabled }) {
  return (
    <div className="select-group">
      <label htmlFor={id} className="select-label">
        {label}
      </label>

      <div className="select-wrapper">
        <span className="select-icon">{icon}</span>

        <select
          id={id}
          className="custom-select route-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="gate">🚪 Main Campus Gate</option>

          {BUILDING_LIST.map((building) => (
            <option key={building.id} value={building.id}>
              {building.emoji} {building.name}
              {building.insideBuilding ? ` (in ${SHORT_NAMES[building.insideBuilding]})` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
