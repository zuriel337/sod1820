import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { getMyLinkedPhones } from "../commandCenter.js";

// 🟢 useWaLink — סטטוס חיבור-הוואטסאפ של המשתמש המחובר, מקור-אמת יחיד לכל מקום שמציג אותו
//    (נקודה על האווטאר + צ'יפ במגירה). מטמון ברמת-מודול לפי user.id כדי לא לשלוף פעמיים.
//    רענון חי: מאזין ל-window event 'sod:wa-changed' (נפלט אחרי חיבור/ניתוק בפאנל).
let _cache = null, _cacheUid = null, _inflight = null;

function fetchLinks(uid) {
  if (_cache && _cacheUid === uid) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = getMyLinkedPhones().then(rows => {
      const v = (rows || []).filter(r => r.verified_at);
      _cache = { linked: v.length > 0, phone: v[0]?.phone || null };
      _cacheUid = uid; _inflight = null;
      return _cache;
    }).catch(() => { _inflight = null; return { linked: false, phone: null }; });
  }
  return _inflight;
}

export function useWaLink() {
  const { user } = useAuth();
  const uid = user?.id || null;
  const [state, setState] = useState(
    _cache && _cacheUid === uid ? { ..._cache, loading: false, hasUser: !!uid } : { linked: false, phone: null, loading: !!uid, hasUser: !!uid }
  );
  useEffect(() => {
    let alive = true;
    if (!uid) { setState({ linked: false, phone: null, loading: false, hasUser: false }); return; }
    const run = () => fetchLinks(uid).then(r => { if (alive) setState({ ...r, loading: false, hasUser: true }); });
    run();
    const onChange = () => { _cache = null; _inflight = null; run(); };
    window.addEventListener("sod:wa-changed", onChange);
    return () => { alive = false; window.removeEventListener("sod:wa-changed", onChange); };
  }, [uid]);
  return state; // { linked, phone, loading, hasUser }
}

// 🟢 נקודת-סטטוס קטנה על פינת האווטאר — ירוק=מחובר · אפור=מנותק. לא-אינטראקטיבית (ויזואלית בלבד;
//    הפעולה חיה בצ'יפ שבמגירה). מוצגת רק למשתמש מחובר לחשבון (לאורח אין סטטוס-וואטסאפ).
export function WaDot({ size = 13, ring = "#fff" }) {
  const { hasUser, loading, linked } = useWaLink();
  if (!hasUser || loading) return null;
  return (
    <span aria-hidden title={linked ? "וואטסאפ מחובר" : "וואטסאפ לא מחובר"} style={{
      position: "absolute", bottom: -1, insetInlineEnd: -1, width: size, height: size, borderRadius: "50%",
      background: linked ? "#25D366" : "#9aa2b1", border: `2px solid ${ring}`,
      display: "grid", placeItems: "center", pointerEvents: "none", boxSizing: "border-box",
    }}>
      {linked && <span style={{ fontSize: size * 0.52, lineHeight: 1, color: "#fff", fontWeight: 900 }}>✓</span>}
    </span>
  );
}
