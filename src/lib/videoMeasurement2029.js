// Loaded on demand by ExternalVideoFacade2029 (dynamic import on the first click), never part of the shell. Registers the video_2029 family and emits
// through the existing emit() / ingest_event path: no new collector, no table, no identity (the measurement envelope stays the public one).
import { emit } from "./events.js";
import { registerVideoSpec2029 } from "./publicReadingVideoSpec2029.js";

const PROVIDERS = new Set(["youtube", "vimeo"]);
const whole = (n, max) => (Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : 0);

export function emitVideo2029(eventType, { provider, code = null, waitSeconds = null } = {}) {
  if (!PROVIDERS.has(provider)) return false;
  registerVideoSpec2029();
  const props = { provider };
  if (code != null) props.code = whole(Number(code), 1000);
  if (waitSeconds != null) props.wait_s = whole(waitSeconds, 3600);
  emit("video_2029", eventType, { props });
  return true;
}
