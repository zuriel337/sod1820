// Traffic Intelligence v12 (ZURIEL 24.11.2026): the story_2029 entry of the one public action family list (readingActionSpec).
// Speed Law: it is not part of the code every page loads. The story surface registers it when it loads (registerStorySpec2029),
// and the public request worker carries it from build time (public-reading-deploy/transport.js). The same entry is in ingest_event v_spec.
// Self-contained: serialized into the request worker by toString().
import { registerMeasurementFamilies2029 } from "./measurementFamilies2029.js";
export function readingStorySpec() {
  return { story_2029: { events: ["impression", "viewer_open", "item_view", "next", "prev", "close", "complete"],
    fields: { content_world: "token", entry_surface: "token", item_ref: "token", index: "int", dwell_ms: "int" } } };
}

// Called by the story surface module on load. Idempotent; it joins the one family list without replacing any family
// (measurementFamilies2029.js). The page then measures story_2029 through the same emit/validators.
export function registerStorySpec2029(scope = globalThis) {
  return registerMeasurementFamilies2029(readingStorySpec(), scope).length === 0;
}
