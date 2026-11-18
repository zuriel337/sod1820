// Actions inside a Post, measured in the existing public action family entry_2029 (traffic_intelligence_law v11; ZURIEL 18.11.2026).
// No new family, store or database change: entry_2029 admits any lowercase event token with the closed field list of readingActionSpec().
// Only the kind of action and the kind of target leave the browser: never the Post, the unit's text, the number, the source address or an
// account id (the database stamps the verified account itself). Wired 18.11.2026 (ZURIEL "תחבר את ספירת הלחיצות בפוסטים"): the Post page
// and its units load this module with import() on the click itself, never statically (Speed Law §3), so it costs the reader nothing until an
// action happens (docs/reviews/analytics-google-seo-closure-20261118/README.md §13).
import { emit } from "./events.js";

export const POST_UNIT_ACTIONS = Object.freeze({
  post_number_open: "number",        // a /number/<n> link inside the Post body
  post_source_open: "source",        // "למקור המדויק" of an external source unit
  post_source_check_open: "source",  // the engine-check state of a source unit opened
  post_writer_open: "writer",        // a source writer's page
  post_media_open: "media",          // an evidence video or full media source
});

export function postUnitAction2029(action) {
  const target = POST_UNIT_ACTIONS[action];
  if (!target) return false;
  emit("entry_2029", action, { props: { entry_surface: "post", action_id: action, target_surface: target } });
  return true;
}
