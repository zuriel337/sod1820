import React, { useEffect, useState, useCallback } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { getNotificationPrefs } from "../lib/supabase.js";
import { watchToggle } from "../lib/commandCenter.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";

// 🔔 WatchButton — הרכיב הקנוני היחיד של מנוע-המשפך (subscription_funnel_law).
// חוקי-ברזל: (1) אותו רכיב בכל מקום, רק ה-topic משתנה · (2) כל Follow שומר source · (3) משפט-הסבר
// «מה מקבלים» · (4) Follow קודם, ערוץ אח"כ (escalation: אחרי Follow → הצעת Push, לא לפני) ·
// (7) מצב gate לתחתית-תוכן. אין רכיב-מעקב אחר.
//   props: topic (חובה) · source (מאיפה) · explainer (משפט «מה מקבלים») · label · heading (כותרת-אזור) · gate (אזור-מעקב מובחן) · compact
export default function WatchButton({ topic, source = "unknown", explainer = "", label = "עקוב אחרי הנושא הזה", heading = "רוצה לדעת כשיש חדש?", gate = false, compact = false }) {
  const P = usePalette();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);   // להצגת escalation מיד אחרי Follow
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const pushReady = PUSH_CONFIGURED && pushSupported();
  const idObj = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };

  const load = useCallback(() => {
    if (!topic) return;
    getNotificationPrefs(idObj)
      .then(p => { setFollowing(!!p?.topics?.includes(topic)); setPushOn(!!p?.channels?.includes("push")); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, user?.id]);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (!topic || busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);   // אופטימי
    try {
      await watchToggle(topic, source, next, user?.id ? null : getVisitorId());
      if (next) { setJustFollowed(true); try { trackConversion("follow", { source, topic }); } catch { /* noop */ } }
      else setJustFollowed(false);
    } catch { setFollowing(!next); }   // כשל → חזרה
    finally { setBusy(false); }
  }

  async function turnOnPush() {
    if (!pushReady) return;
    setPushMsg("");
    const r = await enablePush({ userId: user?.id || null, topics: [] });
    if (r?.ok) { setPushOn(true); setPushMsg("✓ ההתראות המיידיות הופעלו"); try { trackConversion("push_enabled", { source }); } catch { /* noop */ } }
    else setPushMsg(r?.reason === "denied" ? "הדפדפן חסם התראות" : "לא ניתן להפעיל כרגע");
  }

  if (!topic) return null;
  const gold = P.accentText, soft = P.glow || "rgba(212,175,55,0.15)";

  const btn = {
    cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 40, padding: compact ? "7px 15px" : "9px 20px", borderRadius: 999,
    fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
    border: `1px solid ${following ? P.accent : "transparent"}`,
    background: following ? soft : P.accentBtn, color: following ? gold : (P.onAccent || "#1a0e00"),
  };

  // הצעת-Push אחרי Follow (חוק #4: הפעולה הבאה בלבד) — רק אם הופעל עכשיו, יש תמיכה, ועוד לא פעיל
  const pushOffer = justFollowed && following && pushReady && !pushOn && (
    <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: gate ? "center" : "flex-start" }}>
      <span style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5 }}>📱 רוצה גם התראה מיידית?</span>
      <button onClick={turnOnPush} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${P.accent}`, color: gold, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>הפעל התראות</button>
    </div>
  );
  const pushDone = pushMsg && <div style={{ marginTop: 7, color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>{pushMsg}</div>;

  // ── אזור-מעקב קנוני (מובחן משיתוף, Value-First, שפה אחידה בכל האתר) ──
  if (gate) {
    return (
      <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${P.border}`, textAlign: "center", direction: "rtl" }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 18px", maxWidth: 460, margin: "0 auto" }}>
          {!following ? (
            <>
              <div style={{ color: gold, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, marginBottom: 3 }}>🔔 {heading}</div>
              {explainer && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, marginBottom: 12 }}>{explainer}</div>}
              <button onClick={toggle} disabled={busy} style={btn}>🔔 {label}</button>
            </>
          ) : (
            <>
              <div style={{ color: gold, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>✓ אתה במעקב</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>{explainer || "נעדכן אותך כשמתפרסם משהו חדש."}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={toggle} disabled={busy} style={{ ...btn, background: "transparent", color: P.accentDim, border: `1px solid ${P.border}`, fontSize: 12 }}>ביטול מעקב</button>
              </div>
              {pushOffer}{pushDone}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── מצב כפתור אינליין ──
  return (
    <div style={{ direction: "rtl" }}>
      <button onClick={toggle} disabled={busy} aria-pressed={following}
        title={following ? "לחצו לביטול" : explainer || label} style={btn}>
        🔔 {following ? "עוקבים ✓" : label}
      </button>
      {!following && explainer && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{explainer}</div>}
      {pushOffer}{pushDone}
    </div>
  );
}
