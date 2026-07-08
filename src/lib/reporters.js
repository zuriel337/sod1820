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
        .select("slug,code,display_name,avatar_url,wa_names");
      const m = new Map();
      (data || []).forEach(c => {
        const name = (c.display_name || "").trim();
        if (!name) return;
        const entry = { slug: c.code || c.slug, avatar: c.avatar_url || null, name };
        m.set(name, entry);
        // כינויים — שם-וואטסאפ שונה (למשל «OPOC1 OPOC1» → צבי) ממופה לאותו דף/תמונה/שם קנוני.
        (Array.isArray(c.wa_names) ? c.wa_names : []).forEach(alias => {
          const a = (alias || "").trim();
          if (a && !m.has(a)) m.set(a, entry);
        });
      });
      return m;
    } catch { return new Map(); }
  })();
  return _cache;
}
