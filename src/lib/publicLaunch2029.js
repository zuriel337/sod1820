import { PUBLIC_READING_RELEASE } from "./publicReadingRelease2029.js";
// ZURIEL emergency production lock, 2026-10-22:
// canonical Production remains Legacy. Explicit /2029 preview routes may continue,
// but canonical Legacy entries must never hand off to 2029 without a new exact
// SHA + deployment-id Human Gate approval and a separately reviewed lock change.
export const CORE_PUBLIC_LAUNCH_2029 = false;

// The release candidate's protected Preview is a public-reading acceptance
// environment. This scoped build restriction never opens shared capabilities.
export const PUBLIC_LAUNCH_READ_ONLY_PREVIEW = import.meta.env?.VITE_PUBLIC_LAUNCH_READ_ONLY_PREVIEW === "true"
  || PUBLIC_READING_RELEASE;

export function publicLaunchActionsLocked(isAdmin) {
  return PUBLIC_LAUNCH_READ_ONLY_PREVIEW && !(PUBLIC_READING_RELEASE && isAdmin === true);
}
