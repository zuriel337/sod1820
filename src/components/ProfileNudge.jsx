import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";
import { getProfileNudges } from "../lib/commandCenter.js";

// 🔔 פופ-אפ נדנודי-זהות — צף, למשתמש מחובר: «בחר שם-תצוגה» · «חבר וואטסאפ» · ועוד סוגים.
// מקור יחיד: getProfileNudges (עמיד-לעתיד — נדנוד חדש = שורה שם). לחיצה פותחת את המודול המתאים
// באזור-האישי. מכבד floating_ui_yields_law (מוסתר כשהמגירה פתוחה). לא מציק: מופיע אחרי השהיה,
// ובלחיצת ✕ נדחה ל-7 ימים (per-nudge). בלי חשבון — לא מופיע כלל.
const SNOOZE_DAYS = 7;
const KEY = "sod_profile_nudge_snooze_v1";
const readSnooze = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const snooze = (id) => { try { const s = readSnooze(); s[id] = Date.now(); localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ } };
const isSnoozed = (id) => { const t = readSnooze()[id]; return t && (Date.now() - t) < SNOOZE_DAYS * 864e5; };

export default function ProfileNudge() {
  const { user, profile } = useAuth();
  const { isOpen, open } = useUserCenter();
  const [nudge, setNudge] = useState(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!user || !profile) { setNudge(null); setShown(false); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const list = await getProfileNudges({ profile });
        const next = (list || []).find(n => n && n.id && !isSnoozed(n.id));
        if (alive && next) { setNudge(next); setShown(true); }
      } catch { /* noop */ }
    }, 6000); // «בקרוב» — אחרי שהמשתמש התמקם בדף
    return () => { alive = false; clearTimeout(t); };
  }, [user, profile]);

  const dismiss = useCallback(() => { if (nudge) snooze(nudge.id); setShown(false); }, [nudge]);
  const act = useCallback(() => { if (nudge) { open(nudge.module); setShown(false); } }, [nudge, open]);

  if (!nudge || !shown || isOpen) return null;
  return (
    <div role="status" style={{
      position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, bottom: "calc(18px + env(safe-area-inset-bottom,0px))",
      zIndex: 3500, display: "flex", justifyContent: "center", pointerEvents: "none", padding: "0 12px",
    }}>
      <div dir="rtl" style={{
        pointerEvents: "auto", maxWidth: 430, width: "100%", display: "flex", alignItems: "center", gap: 10,
        background: "rgba(22,24,32,.97)", border: "1px solid rgba(201,162,75,.55)", borderRadius: 14,
        padding: "11px 13px", boxShadow: "0 8px 30px rgba(0,0,0,.42)", color: "#f3ead2",
        animation: "sodNudgeIn .35s ease",
      }}>
        <style>{`@keyframes sodNudgeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
        <span style={{ fontSize: 20, flex: "none" }}>{nudge.icon}</span>
        <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, fontWeight: 600 }}>{nudge.text}</span>
        <button onClick={act} style={{ flex: "none", cursor: "pointer", background: "rgba(201,162,75,.95)", color: "#1b1400",
          border: "none", borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>{nudge.cta}</button>
        <button onClick={dismiss} aria-label="סגור" title="אל תציג שוב בקרוב" style={{ flex: "none", cursor: "pointer",
          background: "none", border: "none", color: "#b9b09a", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>✕</button>
      </div>
    </div>
  );
}
