import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// 🌱 דרגת-חוקר — עדשה על research_level_of(uid), עם cache ברמת-מודול כדי שאותו חוקר
// לא ייקרא שוב בכל תג (פורום עם 20 כרטיסים = ~מספר-חוקרים קריאות, לא 20). מקור-אמת אחד לדרגה.
const _cache = new Map();    // uid → level | null
const _pending = new Map();  // uid → Promise

export function getResearcherLevel(uid) {
  if (!uid || !supabase) return Promise.resolve(null);
  if (_cache.has(uid)) return Promise.resolve(_cache.get(uid));
  if (_pending.has(uid)) return _pending.get(uid);
  const p = supabase.rpc("research_level_of", { p_user: uid })
    .then(({ data }) => { const v = data || null; _cache.set(uid, v); _pending.delete(uid); return v; })
    .catch(() => { _cache.set(uid, null); _pending.delete(uid); return null; });
  _pending.set(uid, p);
  return p;
}

export function useResearcherLevel(uid) {
  const [level, setLevel] = useState(() => (uid && _cache.has(uid) ? _cache.get(uid) : null));
  useEffect(() => {
    let alive = true;
    if (!uid) { setLevel(null); return; }
    if (_cache.has(uid)) { setLevel(_cache.get(uid)); return; }
    getResearcherLevel(uid).then((v) => { if (alive) setLevel(v); });
    return () => { alive = false; };
  }, [uid]);
  return level;
}
