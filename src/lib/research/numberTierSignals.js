// Read-only client of the EXISTING public convergence_meter(p_n) reader: which Gold/Diamond entities
// (designated by ZURIEL, golden_entity_law v4) match a number. Cached in memory with a short TTL; at most
// a few concurrent calls. Missing/failed results are returned as null, never as zero.
import { supabase } from "../supabase.js";
import { tierCounts } from "../ratings2029.js";
import { runtimeOff } from "../runtimeSwitches2029.js";

const TTL = 300000;
const cache = new Map(); // number -> { ts, promise }
let active = 0;
const waiting = [];

function slot() {
  return new Promise((resolve) => {
    const go = () => { active += 1; resolve(() => { active -= 1; const next = waiting.shift(); if (next) next(); }); };
    if (active < 3) go(); else waiting.push(go);
  });
}

function fetchOne(value) {
  const hit = cache.get(value);
  if (hit && Date.now() - hit.ts < TTL) return hit.promise;
  const promise = (async () => {
    if (!supabase) return null;
    if (await runtimeOff("fx_tier_signals")) { cache.delete(value); return null; }   // owner switch: no request
    const release = await slot();
    try {
      const { data, error } = await supabase.rpc("convergence_meter", { p_n: value });
      if (error) throw error;
      return data && typeof data === "object" ? { anchor: data.anchor || null, entities: Array.isArray(data.entities) ? data.entities : [] } : null;
    } catch (_) {
      cache.delete(value);
      return null;
    } finally { release(); }
  })();
  cache.set(value, { ts: Date.now(), promise });
  return promise;
}

export async function fetchNumberTierSignals(numbers = []) {
  const payloads = await Promise.all(numbers.map(fetchOne));
  return tierCounts(payloads.filter(Boolean));
}
