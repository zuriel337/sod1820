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

  // ===== פוטר — דסקטופ: פרוס על הרוחב (טקסט מימין, טופס משמאל) · נייד: ממורכז =====
  if (variant === "footer") {
    return (
      <div className="sucta-foot">
        <style>{`
          .sucta-foot { max-width: 980px; margin: 0 auto; padding: 9px 24px 12px; direction: rtl;
            display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: nowrap; }
          .sucta-txt { text-align: right; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sucta-side { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
          .sucta-form { display: flex; gap: 7px; flex-wrap: nowrap; align-items: center; }
          .sucta-input { width: 190px; padding: 8px 12px; border-radius: 9px; font-size: 13.5px; text-align: center; outline: none; }
          .sucta-btn { padding: 8px 20px; border-radius: 9px; font-weight: 800; font-size: 13.5px; white-space: nowrap; border: none; }
          .sucta-note { color: ${cc.muted}; font-family: ${F.body}; font-size: 10.5px; white-space: nowrap; }
          @media (max-width: 760px) {
            .sucta-foot { flex-direction: column; text-align: center; gap: 9px; padding: 12px 16px 22px; flex-wrap: wrap; }
            .sucta-txt { text-align: center; white-space: normal; }
            .sucta-side { flex-direction: column; align-items: center; width: 100%; }
            .sucta-form { justify-content: center; width: 100%; }
            .sucta-input { flex: 1 1 auto; width: auto; min-width: 0; }
          }
        `}</style>
        {done ? (
          <div style={{ width: "100%", textAlign: "center", color: cc.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>✦ {successMsg}</div>
        ) : (
          <>
            <div className="sucta-txt">
              <span style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: "#1faa55" }}>●</span> מערכת חיה — מתעדכנת באופן שוטף
              </span>
            </div>
            <div className="sucta-side">
              <form onSubmit={submitEmail} className="sucta-form">
                <input className="sucta-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך" dir="ltr"
                  style={{ background: cc.surface || "#0d0a0e", border: `1px solid ${cc.border}`, color: cc.goldLight, fontFamily: F.body }} />
                <button className="sucta-btn" type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: F.heading }}>{busy ? "רגע…" : "הצטרפו"}</button>
                <span className="sucta-note">
                  חינם
                  {pushReady && (
                    <>
                      {" · "}
                      <button onClick={choosePush} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: "none", border: "none", padding: 0, color: "inherit", fontFamily: F.body, fontSize: 10.5, textDecoration: "underline", textUnderlineOffset: 2 }}>
                        התראות
                      </button>
                    </>
                  )}
                </span>
              </form>
            </div>
            {err && <div style={{ width: "100%", textAlign: "center", color: "#e0857a", fontFamily: F.body, fontSize: 12 }}>{err}</div>}
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
