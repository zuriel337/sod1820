import { useEffect, useRef } from "react";
import { track } from "./tracking.js";
import { sessionId } from "./identity.js";

// 🎬 Canonical Story Event Taxonomy — instrumentation helper (design v1, approved by Zuriel 2026-08-14).
//   Single source of truth = the EXISTING track()/visitor_events(+events). No new table/engine.
//   Adds meta.content_world + meta.surface + advance + session_ms. Keeps section per-world (back-compat).
//   Events: story_impression · story_open · story_view · story_next · story_prev · story_close ·
//           story_complete · story_share(≡ enriched share_story). story_open ≠ story_view.

// content_world mapping (approved OQ2): section → content world. Keep consistent everywhere.
const SECTION_WORLD = { "or-geula": "OR_GEULA", "tzofon": "CIPHERS", "dim5": "DIM5" };
export const contentWorld = (section) => SECTION_WORLD[section] || null;

// canonical emit — wraps existing track(); injects content_world into meta. section unchanged (back-compat).
export function storyEvent(section, storyId, type, extra = {}) {
  const cw = contentWorld(section);
  const meta = { ...extra };
  if (cw) meta.content_world = cw;
  // strip undefined for a clean payload
  for (const k of Object.keys(meta)) if (meta[k] === undefined) delete meta[k];
  try { track(section, storyId != null ? String(storyId) : null, type, meta); } catch { /* noop */ }
}

export const storyOpen = (section, storyId, m = {}) => storyEvent(section, storyId, "story_open", m);

// QUALIFIED IMPRESSION (approved amendment): ≥50% visible for ≥1s (enforced by useQualifiedImpression),
//   deduped once per (story_id, surface, session). This is an *impression*, NOT a confirmed view.
const seenImpression = new Set();
export function storyImpression(section, storyId, { surface, entry, index } = {}) {
  const key = `${sessionId() || "s"}:${surface || "?"}:${storyId}`;
  if (seenImpression.has(key)) return;    // dedupe per (story_id, surface, session)
  seenImpression.add(key);
  storyEvent(section, storyId, "story_impression", { surface, entry, index });
}

// Hook: fire `onImpression` once when the element is ≥threshold visible for ≥dwellMs. Dedupe is in
//   storyImpression, so re-fires are harmless. onImpression should be stable (useCallback) in callers.
export function useQualifiedImpression(onImpression, { threshold = 0.5, dwellMs = 1000 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer = null, fired = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= threshold) {
          if (!timer && !fired) timer = setTimeout(() => {
            fired = true; timer = null;
            try { onImpression && onImpression(); } catch { /* noop */ }
            io.disconnect();
          }, dwellMs);
        } else if (timer) { clearTimeout(timer); timer = null; }
      }
    }, { threshold: [threshold] });
    io.observe(el);
    return () => { if (timer) clearTimeout(timer); io.disconnect(); };
  }, [onImpression, threshold, dwellMs]);
  return ref;
}
