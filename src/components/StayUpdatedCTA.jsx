import React, { useState } from "react";
import { C, F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { subscribeEmail } from "../lib/supabase.js";
import { trackSubscribe, trackConversion } from "../lib/marketing.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";

// "הישאר מעודכן" — קריאה פסיבית (המשתמש לוחץ) → בחירת ערוץ (פוש/מייל).
// בלי popup אוטומטי ובלי בקשת הרשאה בכניסה — הרשאת Push רק כשבוחרים בה.
// variant: "home" (קריאה ראשית) | "footer" (עדין). source נשמר ל-subscribers.
export default function StayUpdatedCTA({ variant = "home" }) {
  const cc = chromeColors(useThemeMode());
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");   // "" | "email" | "push"
  const [err, setErr] = useState("");

  const source = variant === "footer" ? "footer-stay" : "home-stay";
  const pushReady = PUSH_CONFIGURED && pushSupported();

  async function chooseEmail(e) {
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

  // ===== מסך בחירת ערוץ (overlay) =====
  const chooser = open && (
    <div onClick={() => !busy && setOpen(false)} style={{
      position: "fixed", inset: 0, zIndex: 9998, direction: "rtl",
      background: "rgba(3,2,8,0.72)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 420, width: "100%", background: cc.dropBg || "#241c12",
        border: `1px solid ${cc.borderGold}`, borderRadius: 16, padding: "28px 24px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        {done ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✦</div>
            <div style={{ color: cc.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>
              {done === "push" ? "מעולה! תקבל התראות כשיֵצא חדש 🔔" : "אתה בפנים! נעדכן אותך כשיֵצא חדש 🙏"}
            </div>
            <button onClick={() => { setOpen(false); }} style={{ marginTop: 18, cursor: "pointer", border: "none", borderRadius: 999, padding: "10px 28px", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>סגור</button>
          </>
        ) : (
          <>
            <div style={{ color: cc.goldBright, fontFamily: F.regal, fontSize: 20, fontWeight: 800, marginBottom: 18 }}>איך תרצה לקבל עדכונים?</div>
            {pushReady && (
              <button onClick={choosePush} disabled={busy} style={{
                width: "100%", cursor: busy ? "wait" : "pointer", border: `1px solid ${cc.borderGold}`, borderRadius: 12,
                padding: "14px", marginBottom: 10, background: "rgba(212,175,55,0.12)", color: cc.goldBright,
                fontFamily: F.heading, fontSize: 15, fontWeight: 700,
              }}>🔔 התראות בדפדפן <span style={{ color: cc.goldLight, fontWeight: 400, fontSize: 12.5 }}>(המומלץ — עדכונים מיידיים)</span></button>
            )}
            <form onSubmit={chooseEmail} style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="📧 האימייל שלך" dir="ltr"
                style={{ flex: "1 1 180px", minWidth: 160, padding: "12px 14px", borderRadius: 10, background: cc.surface || "#0d0a0e", border: `1px solid ${cc.border}`, color: cc.goldLight, fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none" }} />
              <button type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 10, padding: "12px 22px", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>{busy ? "רגע…" : "עדכנו אותי"}</button>
            </form>
            {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12.5, marginTop: 10 }}>{err}</div>}
            <div style={{ color: cc.muted, fontFamily: F.body, fontSize: 11.5, marginTop: 12 }}>חינם · אפשר לבטל בכל רגע</div>
          </>
        )}
      </div>
    </div>
  );

  // ===== פוטר — שדה מייל ישיר (בלי מודאל) =====
  if (variant === "footer") {
    return (
      <div style={{ textAlign: "center", padding: "18px 16px 8px", direction: "rtl" }}>
        {done ? (
          <div style={{ color: cc.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>✦ אתם בפנים! תודה 🙏</div>
        ) : (
          <>
            <div style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, marginBottom: 9 }}>
              📬 קבלו עדכון כשמתפרסמים תכנים חדשים
            </div>
            <form onSubmit={chooseEmail} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 420, margin: "0 auto" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך" dir="ltr"
                style={{ flex: "1 1 200px", minWidth: 170, padding: "11px 14px", borderRadius: 10, background: cc.surface || "#0d0a0e", border: `1px solid ${cc.border}`, color: cc.goldLight, fontFamily: F.body, fontSize: 14.5, textAlign: "center", outline: "none" }} />
              <button type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 10, padding: "11px 24px", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>{busy ? "רגע…" : "הצטרפו"}</button>
            </form>
            {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
            <div style={{ color: cc.muted, fontFamily: F.body, fontSize: 11, marginTop: 7 }}>חינם · אפשר לבטל בכל רגע</div>
          </>
        )}
      </div>
    );
  }

  // ===== עמוד הבית — קריאה ראשית =====
  return (
    <div style={{ textAlign: "center", direction: "rtl" }}>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,27px)", fontWeight: 800, marginBottom: 10 }}>
        אל תפספס את מה שנכנס למערכת
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 480, margin: "0 auto 20px" }}>
        בכל שבוע מתווספים תכנים חדשים, חיפושי גימטריה, תגליות ועדכונים. בחר את הדרך שנוחה לך להישאר מחובר.
      </p>
      <button onClick={() => setOpen(true)} style={{
        cursor: "pointer", border: "none", borderRadius: 999, padding: "14px 40px",
        background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
        fontFamily: F.heading, fontWeight: 800, fontSize: 17, boxShadow: "0 6px 26px rgba(212,175,55,0.4)",
      }}>הישאר מעודכן</button>
      {chooser}
    </div>
  );
}
