// Traffic Intelligence v12 (ZURIEL: video measurement, decision (b) of the measurement root-cause document, 24.11.2026): the video_2029 entry of the one
// public action family list (readingActionSpec). Same mechanism as story_2029 (measurementFamilies2029.js): it is not part of the code every page
// loads. The shared external-video player registers it on the first click (registerVideoSpec2029), and the public request worker carries it from build
// time (public-reading-deploy/transport.js). The same entry is in ingest_event v_spec (consolidated package supabase/proposed/ingest-event-app-health-20261126).
// Bounded fields only: the provider token (youtube | vimeo), the integer provider error code and whole seconds of waiting. No video id, title, link or text.
// Self-contained: serialized into the request worker by toString().
import { registerMeasurementFamilies2029 } from "./measurementFamilies2029.js";
export function readingVideoSpec() {
  return { video_2029: { events: ["play_requested", "player_ready", "embed_refused", "watch_opened"], fields: { provider: "token", code: "int", wait_s: "int" } } };
}

// Called by the player module on its first use. Idempotent; it joins the one family list without replacing any family.
export function registerVideoSpec2029(scope = globalThis) {
  return registerMeasurementFamilies2029(readingVideoSpec(), scope).length === 0;
}
