import React, { useEffect, useState, useCallback } from "react";
import { F } from "../theme.js";
import { controlTone, usePalette, PALETTES } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { getNotificationPrefs } from "../lib/supabase.js";
import { watchToggle } from "../lib/commandCenter.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";
import EmailVerify from "./EmailVerify.jsx";

// 🔔 WatchButton — הרכיב הקנוני היחיד של מנוע-המשפך (subscription_funnel_law).
// לוגיקת המעקב נשארת בבעלות ה-Funnel. הקובץ הזה רק מנרמל את שכבת-ההצגה:
// variant בוחר תפקיד סמנטי; dark/light/lab מגיעים מ-canonical_colors_law v2 דרך usePalette.
export default function WatchButton({ topic, source = "unknown", explainer = "", label = "עקוב אחרי הנושא הזה", followLabel = null, heading = "רוצה לדעת כשיש חדש?", gate = false, compact = false, paletteMode = null, icon = "🔔", ghost = false, checkbox = false, noPush = false, variant = null }) {
  const auto = usePalette();
  const P = paletteMode ? (PALETTES[paletteMode] || auto) : auto;
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const pushReady = PUSH_CONFIGURED && pushSupported();
  const idObj = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };

  const primary = controlTone(P, "primary");
  const secondary = controlTone(P, "secondary");
  const ghostTone = controlTone(P, "ghost");
  const disabledTone = controlTone(P, "disabled");

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
    setFollowing(next);
    try {
      await watchToggle(topic, source, next, user?.id ? null : getVisitorId());
      if (next) { setJustFollowed(true); try { trackConversion("follow", { source, topic }); } catch { /* noop */ } }
      else setJustFollowed(false);
    } catch { setFollowing(!next); }
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

  const toneStyle = (tone, extra = {}) => ({
    background: tone.background,
    color: tone.color,
    border: `1px solid ${tone.border}`,
    ...extra,
  });

  // mini נשאר variant זעיר, אבל אינו מחזיק יותר purple/white מקומי.
  if (variant === "mini") {
    const miniTone = busy ? disabledTone : (following ? primary : ghostTone);
    return (
      <button onClick={toggle} disabled={busy} aria-pressed={following}
        title={following ? "עוקב — לחצו לביטול" : (explainer || "עקבו אחרי מימד חמש")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, cursor: busy ? "wait" : "pointer",
          ...toneStyle(miniTone), borderRadius: 999, padding: "4px 10px",
          fontFamily: F.ui, fontWeight: 800, fontSize: 11, lineHeight: 1,
          opacity: following ? 1 : 0.78, transition: "opacity .2s, background .2s, color .2s, border-color .2s",
        }}>
        <span aria-hidden style={{ fontSize: 11 }}>✓</span>
        <span>{following ? (followLabel || "עוקב") : (label || "מעקב")}</span>
      </button>
    );
  }

  const buttonTone = busy ? disabledTone : (following ? secondary : (ghost ? ghostTone : primary));
  const btn = {
    cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 40, padding: compact ? "7px 15px" : "9px 20px", borderRadius: 999,
    fontFamily: F.ui, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
    ...toneStyle(buttonTone),
  };

  if (checkbox) {
    const rowTone = busy ? disabledTone : (following ? secondary : ghostTone);
    const markTone = busy ? disabledTone : (following ? primary : secondary);
    return (
      <button onClick={toggle} disabled={busy} role="checkbox" aria-checked={following}
        title={following ? "בטל מעקב" : explainer || label}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", cursor: busy ? "wait" : "pointer",
          ...toneStyle(rowTone), borderRadius: 10, padding: "9px 13px", textAlign: "start", direction: "rtl", minHeight: 44 }}>
        <span aria-hidden style={{ flex: "0 0 auto", width: 21, height: 21, borderRadius: 6,
          border: `2px solid ${markTone.border}`, background: following ? markTone.background : "transparent",
          color: following ? markTone.color : "transparent", display: "grid", placeItems: "center",
          fontSize: 13, fontWeight: 900, transition: "all .15s ease" }}>✓</span>
        <span style={{ flex: 1, minWidth: 0, color: rowTone.color, fontFamily: F.ui, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {icon} {label}
        </span>
        {following && <span style={{ flex: "0 0 auto", color: P.inkSoft, fontFamily: F.body, fontSize: 11 }}>עוקב</span>}
      </button>
    );
  }

  // התנהגות Funnel נשארת כפי שהייתה; רק הכפתור צורך secondary role.
  const pushOffer = !noPush && justFollowed && following && pushReady && !pushOn && (
    <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: gate ? "center" : "flex-start" }}>
      <span style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5 }}>📱 רוצה גם התראה מיידית?</span>
      <button onClick={turnOnPush} style={{ cursor: "pointer", ...toneStyle(secondary), borderRadius: 999, padding: "5px 13px", fontFamily: F.ui, fontSize: 12.5, fontWeight: 800 }}>הפעל התראות</button>
    </div>
  );
  const pushDone = pushMsg && <div style={{ marginTop: 7, color: P.inkSoft, fontFamily: F.ui, fontSize: 12 }}>{pushMsg}</div>;

  const regCta = !user && justFollowed && following && (
    <div style={{ marginTop: 11, background: P.card, border: `1px dashed ${P.borderStrong || P.border}`, borderRadius: 12, padding: "12px 14px", textAlign: gate ? "center" : "start" }}>
      {!showReg ? (
        <>
          <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 13.5, fontWeight: 800 }}>🔑 שמור את המעקב שלך</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, margin: "3px 0 9px" }}>הירשם בקליק (מייל בלבד) — כדי שהמעקב יישמר לחשבון שלך ותקבל התראה כשמתפרסם משהו חדש.</div>
          <button onClick={() => setShowReg(true)} style={{ ...toneStyle(primary), cursor: "pointer", borderRadius: 999, padding: compact ? "7px 15px" : "9px 20px", minHeight: 40, fontFamily: F.ui, fontWeight: 800, fontSize: 13.5 }}>✉️ הירשם לשמירת המעקב</button>
        </>
      ) : (
        <EmailVerify source={`follow:${source}`} cta="שלחו לי קוד" onVerified={() => { setShowReg(false); setJustFollowed(false); }} />
      )}
    </div>
  );

  if (gate) {
    return (
      <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${P.border}`, textAlign: "center", direction: "rtl" }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 18px", maxWidth: 460, margin: "0 auto" }}>
          {!following ? (
            <>
              <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 16.5, fontWeight: 800, marginBottom: 3 }}>🔔 {heading}</div>
              {explainer && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, marginBottom: 12 }}>{explainer}</div>}
              <button onClick={toggle} disabled={busy} style={btn}>{icon} {label}</button>
            </>
          ) : (
            <>
              <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 16, fontWeight: 800 }}>✓ אתה במעקב</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>{explainer || "נעדכן אותך כשמתפרסם משהו חדש."}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={toggle} disabled={busy} style={{ ...toneStyle(busy ? disabledTone : ghostTone), cursor: busy ? "wait" : "pointer", borderRadius: 999, padding: "7px 15px", minHeight: 40, fontFamily: F.ui, fontSize: 12, fontWeight: 800 }}>ביטול מעקב</button>
              </div>
              {regCta}{pushOffer}{pushDone}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl" }}>
      <button onClick={toggle} disabled={busy} aria-pressed={following}
        title={following ? "לחצו לביטול" : explainer || label} style={btn}>
        {icon} {following ? (followLabel || "עוקבים ✓") : label}
      </button>
      {!following && explainer && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{explainer}</div>}
      {regCta}{pushOffer}{pushDone}
    </div>
  );
}
