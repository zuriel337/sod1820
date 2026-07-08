// 👤 מרשם הכתבים — ממפה שם-כתב (credit בעדכוני הוואטסאפ) → דף הכתב הקנוני (ContributorPage).
// עץ אחד: אין דף-כתב מקביל — פשוט קישור לדף הקיים ב-/community/researcher/:slug.
// נטען פעם אחת ונשמר במטמון (module-level) כדי שהטיקר/מרכז השידורים לא יריצו שאילתה פר-פריט.
import { supabase } from "./supabase.js";

let _cache = null;

export function loadReporters() {
  if (_cache) return _cache;
  _cache = (async () => {
    if (!supabase) return new Map();
    try {
      const { data } = await supabase.from("contributors")
        .select("slug,code,display_name,avatar_url");
      const m = new Map();
      (data || []).forEach(c => {
        const name = (c.display_name || "").trim();
        if (name) m.set(name, { slug: c.code || c.slug, avatar: c.avatar_url || null });
      });
      return m;
    } catch { return new Map(); }
  })();
  return _cache;
}
