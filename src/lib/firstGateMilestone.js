import { useEffect, useState } from "react";

// Temporary 2029 bridge projection. One milestone, multiple surfaces.
// Human Gate ZURIEL: first gate opens 21.09.2026.
export const FIRST_GATE_TARGET_ISO = "2026-09-21T20:00:00+03:00";
export const FIRST_GATE_TARGET = new Date(FIRST_GATE_TARGET_ISO).getTime();
export const FIRST_GATE_HOME_HASH = "first-gate-2029";

export function getFirstGateParts(now = Date.now()) {
  const diff = Math.max(0, FIRST_GATE_TARGET - now);
  return {
    open: diff <= 0,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function useFirstGateCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return getFirstGateParts(now);
}

export function firstGateHref() {
  return `/#${FIRST_GATE_HOME_HASH}`;
}
