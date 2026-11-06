import React, { useEffect, useState } from "react";
import "./elsOperationMeter2029.css";

// Operation Visibility Law (ZURIEL 6.11.2026): no operation runs without a live, always-on-screen indicator.
// The meter is attached to the screen (fixed), reports the real phase the host knows about, and never invents a
// percentage: it shows an indeterminate bar, the phase and the seconds elapsed. It renders nothing when idle.
export default function ElsOperationMeter2029({ phase = null, slowAfterSeconds = 12 }) {
  const busy = Boolean(phase);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) { setSeconds(0); return undefined; }
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  if (!busy) return null;
  return <div className="els29-op-meter" role="status" aria-live="polite" data-els-operation-meter="v1">
    <span className="els29-op-meter-bar" aria-hidden="true" />
    <strong>{phase}</strong>
    <small>{seconds < slowAfterSeconds ? `${seconds} שנ׳` : `${seconds} שנ׳ · לוקח יותר מהרגיל, העבודה ממשיכה`}</small>
  </div>;
}
