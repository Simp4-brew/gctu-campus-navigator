import { formatDistance } from "../../lib/geo.js";

function TelemetryRow({ label, value, className = "" }) {
  return (
    <div className="telemetry-row">
      <span>{label}</span>
      <span className={`telemetry-val ${className}`.trim()}>{value}</span>
    </div>
  );
}

/* Small read-out over the map: centre, tracking mode, and live GPS
   quality while real GPS is running. */
export default function MapTelemetry({ center, tracking, simulating, liveGps }) {
  const trackingLabel = tracking ? (simulating ? "MOVING" : "LIVE") : "STANDBY";

  return (
    <div className="gps-map-telemetry" id="gps-mapping-telemetry-panel">
      <TelemetryRow label="Center Lat:" value={center[0].toFixed(5)} />
      <TelemetryRow label="Center Lng:" value={center[1].toFixed(5)} />
      <TelemetryRow
        label="GPS Tracking:"
        value={trackingLabel}
        className={tracking ? "gps-on" : "gps-off"}
      />

      {liveGps.active && (
        <>
          <TelemetryRow
            label="Fix Accuracy:"
            value={
              liveGps.accuracy === null
                ? "waiting…"
                : `±${Math.round(liveGps.accuracy)}m`
            }
          />
          <TelemetryRow
            label="Off Route:"
            value={liveGps.offRoute === null ? "—" : formatDistance(liveGps.offRoute)}
          />
          <TelemetryRow
            label="Remaining:"
            value={
              liveGps.remaining === null ? "—" : `${Math.round(liveGps.remaining)}m`
            }
          />
        </>
      )}
    </div>
  );
}
