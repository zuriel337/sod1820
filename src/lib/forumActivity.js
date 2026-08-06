import { useState, useEffect } from "react";
import { getLatestForumActivity } from "./contributions.js";
import { seenCutoff, markSeenKey } from "./crossesNew.js";

// 🔴 מקור-אמת קנוני יחיד ל«פעילות חדשה בפורום» — hook אחד ש-Footer/Navbar/צ'אט/פיד קוראים.
//    כשמישהו מגיב → תרומה מאושרת חדשה → hasNew=true בכל המשטחים. כניסה ל-/forum → markForumSeen()
//    → הנקודה נעלמת בכולם בו-זמנית (whats_new_law, פר-משתמש). הוספת משטח חדש = שורה אחת.
const KEY = "forum";

// cache משותף קצר — Footer+Navbar+צ'אט באותו עמוד = fetch אחד, לא שלושה.
let _cache = null, _at = 0, _inflight = null;
function fetchLatest() {
  if (_cache && Date.now() - _at < 45000) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = getLatestForumActivity()
    .then(d => { _cache = d; _at = Date.now(); _inflight = null; return d; })
    .catch(() => { _inflight = null; return _cache; });
  return _inflight;
}

export function markForumSeen() {
  markSeenKey(KEY, new Date().toISOString());
  try { window.dispatchEvent(new Event("sod:forum-seen")); } catch { /* noop */ }
}

export function useForumActivity() {
  const [st, setSt] = useState({ hasNew: false, wasReply: false, ts: null });
  useEffect(() => {
    let alive = true;
    fetchLatest().then(d => {
      if (!alive || !d) return;
      const cutoff = seenCutoff(KEY);
      const hasNew = !!(d.created_at && new Date(d.created_at) > new Date(cutoff));
      setSt({ hasNew, wasReply: !!d.parent_id, ts: d.created_at || null });
    });
    // כניסה ל-/forum מסמנת «נראה» → מנקה מיד את הנקודה בכל המשטחים
    const onSeen = () => { if (alive) setSt(s => ({ ...s, hasNew: false })); };
    window.addEventListener("sod:forum-seen", onSeen);
    return () => { alive = false; window.removeEventListener("sod:forum-seen", onSeen); };
  }, []);
  return st;
}
