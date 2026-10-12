import { publicProvenPostSourceUpdate } from "./research/postSourceUpdates2029.js";
// Pure rules for the Home main item (no network): which tags are numbers and what counts as a REAL update.
const DAY = 86400000;
export const UPDATE_WINDOW_DAYS = 14;

export function postNumbers(tags) {
  const out = [];
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag))) { const n = Number(tag); if (!out.includes(n)) out.push(n); }
  }
  return out;
}

/** Home consumes the same certified source revision as Companion/World. */
export function realUpdate(row, now = Date.now()) {
  const event = publicProvenPostSourceUpdate(row);
  if (!event) return null;
  const time = Date.parse(event.at);
  if (!Number.isFinite(time) || time > now || now - time > UPDATE_WINDOW_DAYS * DAY) return null;
  return { ...event, key: `feed:${event.eventKey}` };
}
