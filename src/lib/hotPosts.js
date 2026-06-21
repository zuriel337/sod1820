import { useState, useEffect } from "react";
import { getHotPostsLive } from "./supabase.js";

// 🔥 קבוצת ה-slugs של הפוסטים ה"חמים" השבוע — דגל בלבד (בלי לחשוף כמות צפיות).
// מקור אחד (hot_posts_live) לכל הרשימות, שאילתה אחת. סף min = כמה צפיות שבועיות נדרשות.
export function useHotPostSlugs({ days = 7, min = 5, limit = 40 } = {}) {
  const [set, setSet] = useState(() => new Set());
  useEffect(() => {
    let live = true;
    getHotPostsLive({ days, limit })
      .then(rows => { if (live) setSet(new Set((rows || []).filter(r => (r.views || 0) >= min).map(r => r.slug))); })
      .catch(() => {});
    return () => { live = false; };
  }, [days, min, limit]);
  return set;
}
