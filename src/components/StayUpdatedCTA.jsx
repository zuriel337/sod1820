import React, { useState } from "react";
import { C, F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { subscribeEmail } from "../lib/supabase.js";
import { trackSubscribe, trackConversion } from "../lib/marketing.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";

// "הישאר מעודכן" — מייל הוא הקריאה הראשית והישירה (שדה גלוי, בלי מודאל).
// Push = אופציה משנית קטנה מתחת (רק אם מוגדר VAPID). בלי popup אוטומטי.
// variant: "home" (קריאה ראשית) | "footer" (עדין). source נשמר ל-subscribers.
export default function StayUpdatedCTA({ variant = "home" }) {
  const cc = chromeColors(useThemeMode());
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");   // "" | "email" | "push"
  const [err, setErr] = useState("");

  const source = variant === "footer" ? "footer-stay" : "home-stay";
  const pushReady = PUSH_CONFIGURED && pushSupported();

  async function submitEmail(e) {
    e?.preventDefault?.();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין כתובת אימייל תקינה"); return; }
    setBusy(true);
    try {
      await subscribeEmail({ email: email.trim(), source });
      trackSubscribe({ source });
      setDone("email");
    } catch { setErr("משהו השתבש — נסו שוב בעוד רגע"); }
    setBusy(false);
  }

  async function choosePush() {
    setErr(""); setBusy(true);
    const r = await enablePush({ userId: user?.id || null, topics: [] });
    setBusy(false);
    if (r.ok) { trackConversion("push_enabled", { source }); setDone("push"); }
    else setErr(r.reason === "denied" ? "הדפדפן חסם התראות — אפשר לאשר בהגדרות" : "לא ניתן להפעיל התראות כרגע");
  }

  const successMsg = done === "push" ? "מעולה! תקבלו התראות כשיֵצא חדש 🔔" : "אתם בפנים! נעדכן אתכם כשיֵצא חדש 🙏";

  // ===== פוטר — מרכזי ונקי (כמו עמוד הבית), רספונסיבי בנייד =====
  if (variant === "footer") {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 16px 8px", textAlign: "center", direction: "rtl" }}>
        {done ? (
          <div style={{ color: cc.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>✦ {successMsg}</div>
        ) : (
          <>
            <div style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: "#1faa55" }}>●</span> מערכת חיה — מתעדכנת באופן שוטף
            </div>
            <div style={{ color: cc.muted, fontFamily: F.body, fontSize: 12.5, margin: "4px 0 12px" }}>
              תכנים חדשים, חיפושים ותגליות מתווספים באופן קבוע.
            </div>
            <form onSubmit={submitEmail} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 420, margin: "0 auto" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך" dir="ltr"
                style={{ flex: "1 1 220px", minWidth: 180, padding: "11px 14px", borderRadius: 10, background: cc.surface || "#0d0a0e", border: `1px solid ${cc.border}`, color: cc.goldLight, fontFamily: F.body, fontSize: 14.5, textAlign: "center", outline: "none" }} />
              <button type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 10, padding: "11px 26px", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>{busy ? "רגע…" : "הצטרפו"}</button>
            </form>
            {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
            <div style={{ color: cc.muted, fontFamily: F.body, fontSize: 11, marginTop: 8 }}>חינם · אפשר לבטל בכל רגע</div>
          </>
        )}
      </div>
    );
  }

  // ===== עמוד הבית — מייל כקריאה ראשית ישירה =====
  return (
    <div style={{ textAlign: "center", direction: "rtl" }}>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,27px)", fontWeight: 800, marginBottom: 10 }}>
        אל תפספסו את מה שנכנס למערכת
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 480, margin: "0 auto 18px" }}>
        בכל שבוע מתווספים תכנים חדשים, חיפושי גימטריה, תגליות ועדכונים. השאירו מייל — ותהיו תמיד מעודכנים.
      </p>

      {done ? (
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>✦ {successMsg}</div>
      ) : (
        <>
          <form onSubmit={submitEmail} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלכם" dir="ltr"
              style={{ flex: "1 1 240px", minWidth: 200, padding: "13px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.goldLight, fontFamily: F.body, fontSize: 16, textAlign: "center", outline: "none" }} />
            <button type="submit" disabled={busy} style={{
              cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 12, padding: "13px 34px",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
              fontFamily: F.heading, fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", boxShadow: "0 6px 26px rgba(212,175,55,0.4)",
            }}>{busy ? "רושם…" : "עדכנו אותי"}</button>
          </form>
          {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 12 }}>חינם · אימות חד-פעמי · אפשר לבטל בכל רגע</div>
          {pushReady && (
            <button onClick={choosePush} disabled={busy} style={{ marginTop: 16, cursor: "pointer", background: "none", border: "none", color: C.goldDim, fontFamily: F.heading, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3 }}>
              🔔 או קבלו התראות מיידיות בדפדפן
            </button>
          )}
        </>
      )}
    </div>
  );
}
