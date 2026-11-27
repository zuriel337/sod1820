// The one public activity reader (research_pulse_2029, TI) with a window that adapts (ZURIEL 21.11.2026):
// the shortest window (24h -> 7d -> 30d) that has real lists above the privacy floor is shown, and named.
// No zero is invented and no empty block is drawn; nothing here is a person count (TI v10).
import { supabase } from "./supabase.js";

export const PULSE_WINDOWS = Object.freeze([[24, "היממה האחרונה", "יממה"], [168, "השבוע האחרון", "שבוע"], [720, "החודש האחרון", "חודש"]]);
const cache = new Map();

export function readResearchPulse(hours) {
  if (!cache.has(hours)) {
    cache.set(hours, supabase.rpc("research_pulse_2029", { p_hours: hours }).then(({ data, error }) => {
      // PGRST202/404 (reader not applied yet) or 42501: the caller shows "unavailable", never an old-wall fallback.
      if (error) throw error;
      return data;
    }).catch(error => { cache.delete(hours); throw error; }));
  }
  return cache.get(hours);
}

export function pulseUsable(d) {
  return Boolean(d && d.version === 1 && d.state !== "refreshing");
}

export function pulseRich(d) {
  if (!pulseUsable(d)) return false;
  // d.computed is only a masked total (never a list of values), so it does not make a window "rich"
  return Boolean(d.numbers?.length || d.content?.length || d.phrases?.length);
}

// First window with real lists; otherwise the widest usable one (its totals/crawlers/added are still real).
export async function readAdaptivePulse(read = readResearchPulse) {
  let widest = null;
  for (const [hours, label] of PULSE_WINDOWS) {
    let d;
    try { d = await read(hours); } catch { continue; }
    if (!pulseUsable(d)) continue;
    widest = { data: d, hours, label };
    if (pulseRich(d)) return widest;
  }
  return widest;
}

export const pulseCount = n => Number.isSafeInteger(n) && n > 0 ? n.toLocaleString("he-IL") : null;
