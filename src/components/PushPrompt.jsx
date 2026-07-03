import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { PUSH_CONFIGURED, pushSupported, pushPermission, enablePush } from "../lib/push.js";
import { installOfferActive, isStandalone } from "../lib/install.js";
import { track, appMeta } from "../lib/tracking.js";

// הודעת Push פשוטה — "לקבל עדכונים מהאתר?" עם כן/לא. בלי שערים/נושאים (הרשמה כללית).
// מופיע רק אם הוגדר VITE_VAPID_PUBLIC_KEY, הדפדפן תומך, הרשות עדיין 'default',
// ולא נדחה לאחרונה. פס תחתון עדין. ⚠️ פוש עובד רק בכרום/אנדרואיד ובאייפון-מותקן
// (iOS 16.4+ ב-standalone) — לכן מותקן מקבל את הבקשה מוקדם יותר (אין באנר-התקנה מתחרה).
// כל שלב נמדד ל-visitor_events (section='push') כדי שהמשפך יהיה גלוי בדשבורד.
const KEY = "sod_push_prompt";
const SNOOZE_DAYS = 14;

// snooze במקום חסימה-לתמיד: "לא עכשיו" דוחה ל-14 יום, לא קובר לצמיתות (תיקון: פעם
// אחת "לא עכשיו" חסמה את הבקשה לנצח על אותו מכשיר).
function pushSnoozed() {
  try { const t = +localStorage.getItem(KEY); return !!t && Date.now() - t < SNOOZE_DAYS * 86400000; }
  catch { return true; } // אין localStorage → לא מציקים
}
function snoozePush() { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* noop */ } }

export default function PushPrompt() {
  const cc = chromeColors(useThemeMode());
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!PUSH_CONFIGURED || !pushSupported()) return;
    if (pushPermission() !== "default") return;       // כבר אישר/חסם → לא מנדנדים
    if (pushSnoozed()) return;                         // נדחה לאחרונה → מחכים
    // תיאום עם הצעת ההתקנה (install.js): קודם התקנה, פוש אחר כך. כל עוד הצעת
    // ההתקנה פעילה — דוחים ובודקים שוב. מותקן (standalone) → אין התנגשות, מציגים מהר.
    let t;
    const tryShow = () => {
      if (pushPermission() !== "default") return;      // נפתר בינתיים
      if (installOfferActive()) { t = setTimeout(tryShow, 8000); return; }
      setShow(true);
      track("push", null, "offer", appMeta());         // 📊 הבקשה הוצגה בפועל
    };
    t = setTimeout(tryShow, isStandalone() ? 2500 : 6000);
    return () => clearTimeout(t);
  }, []);

  // "לא עכשיו" — נמדד ואז נדחה ל-14 יום (לא חסימה קבועה)
  const dismiss = () => { track("push", null, "prompt_dismiss", appMeta()); snoozePush(); setShow(false); };

  async function allow() {
    setBusy(true);
    track("push", null, "prompt_accept", appMeta());   // לחצו "כן, אשמח"
    let res;
    try { res = await enablePush({ userId: user?.id || null, topics: [] }); }
    catch { res = { ok: false, reason: "error" }; }
    // enabled = נרשם בפועל · denied = הדפדפן חסם/סירב (מפריד "רצה" מ"קיבל")
    track("push", null, res?.ok ? "enabled" : "denied", { ...appMeta(), reason: res?.reason || null });
    setBusy(false);
    snoozePush(); setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", insetInline: 0, bottom: 0, zIndex: 300, direction: "rtl",
      background: cc.bgScrolled || cc.bg, borderTop: `1px solid ${cc.borderGold}`,
      backdropFilter: "blur(14px)", boxShadow: "0 -8px 30px rgba(0,0,0,0.35)",
      padding: "12px 16px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700 }}>
          🔔 לקבל עדכונים מהאתר?
        </span>
        <span style={{ color: cc.muted, fontFamily: F.body, fontSize: 13 }}>נודיע לכם כשעולה משהו חדש — בלי הצפה.</span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          <button onClick={allow} disabled={busy} style={{
            cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 999, padding: "8px 20px",
            background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00",
            fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
          }}>{busy ? "רגע…" : "כן, אשמח"}</button>
          <button onClick={dismiss} style={{
            cursor: "pointer", border: `1px solid ${cc.border}`, borderRadius: 999, padding: "8px 16px",
            background: "transparent", color: cc.muted, fontFamily: F.heading, fontSize: 13.5, whiteSpace: "nowrap",
          }}>לא עכשיו</button>
        </div>
      </div>
    </div>
  );
}
