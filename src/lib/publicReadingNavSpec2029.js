// S4/S5 (27.11.2026): three closed families added to the one public action family list WITHOUT growing the code every page loads (same mechanism as video_2029):
// they are registered on first use by the lazy modules, and the public request worker carries them from build time (public-reading-deploy/transport.js).
// Tokens and bounded integers only: no expression, term, address, identity or text. The same entries are in the proposed ingest_event allow-list
// (supabase/proposed/measurement-allowlist-20261127). Self-contained: serialized into the request worker by toString().
import { registerMeasurementFamilies2029 } from "./measurementFamilies2029.js";
export function readingNavSpec() {
  return {
    item_2029: { events: ["view"], fields: { kind: "token", item_ref: "token" } },
    nav_2029: { events: ["number_link_open", "panel_open", "panel_close", "search_submit", "share_bar_open", "media_play", "gallery_open"],
      fields: { from_surface: "token", target_surface: "token", panel: "token", section: "token", outcome: "token", provider: "token", count: "int" } },
    calc_outcome_2029: { events: ["ai_analysis_result", "compute_failed", "compute_empty", "equals_preview_shown", "equals_preview_all_opened"],
      fields: { surface: "token", method: "token", reason: "token", count: "int" } },
  };
}
export function registerNavSpec2029(scope = globalThis) {
  return registerMeasurementFamilies2029(readingNavSpec(), scope).length === 0;
}
