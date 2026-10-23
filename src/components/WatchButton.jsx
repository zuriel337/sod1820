import React, { useEffect, useState, useCallback, useRef } from "react";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { getNotificationPrefs } from "../lib/supabase.js";
import { watchToggle } from "../lib/commandCenter.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";
import { includesFollowSubject } from "../lib/followIdentity.js";
import EmailVerify from "./EmailVerify.jsx";

// 🔔 WatchButton — הרכיב הקנוני היחיד של מנוע-המשפך (subscription_funnel_law).
// חוקי-ברזל: (1) אותו רכיב בכל מקום, רק ה-topic משתנה · (2) כל Follow שומר source · (3) משפט-הסבר
// «מה מקבלים» · (4) Follow קודם; guest מקבל identity verification בלבד; channel opt-in רק אחרי account ·
// (7) מצב gate לתחתית-תוכן. אין רכיב-מעקב אחר.
//   props: topic (חובה) · source (מאיפה) · explainer (משפט «מה מקבלים») · label · heading (כותרת-אזור) · gate (אזור-מעקב מובחן) · compact
//   paletteMode: כפיית פלטה ('light'/'dark') כדי להתאים לצבע-הסביבה (למשל בתחתית פוסט נעול-כהה) — ברירת-מחדל: פלטת-האתר.
//   icon: אייקון מוביל (ברירת-מחדל 🔔; בתחתית-פוסט 📁/✍️ כדי להבחין קטגוריה מכתב) · ghost: מצב-מתאר (מילוי שקוף) להבחנה ויזואלית בין שתי פעולות סמוכות.
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const pushReady = PUSH_CONFIGURED && pushSupported();
  const idObj = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };
  // Principal+topic scope: results that resolve after the account or topic changed must not touch the new scope.
  const scopeKey = `${user?.id || "guest"}|${topic || ""}`;
  const scopeRef = useRef(scopeKey);
  const busyRef = useRef(false);
  scopeRef.current = scopeKey;

  // Scope-aware reset: a different account/topic starts from unknown, never inherits the previous state.
  useEffect(() => {
    busyRef.current = false;
    setFollowing(false); setBusy(false); setJustFollowed(false); setShowReg(false);
    setPushOn(false); setPushMsg(""); setLoadFailed(false); setToggleError("");
  }, [scopeKey]);

  const load = useCallback(() => {
    if (!topic) return;
    const key = scopeKey;
    setLoadFailed(false);
    getNotificationPrefs(idObj)
      .then(p => {
        if (scopeRef.current !== key) return;
        setFollowing(includesFollowSubject(p?.topics, topic));
        setPushOn(!!p?.channels?.includes("push"));
      })
      .catch(() => { if (scopeRef.current === key) setLoadFailed(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, user?.id]);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (!topic || busyRef.current) return;
    const key = scopeKey;
    busyRef.current = true;
    setBusy(true);
    setToggleError("");
    const next = !following;
    setFollowing(next);
    let ack = null;
    try { ack = await watchToggle(topic, source, next, user?.id ? null : getVisitorId()); } catch { ack = null; }
    if (scopeRef.current !== key) return; // scope changed mid-flight; the reset effect already cleared busy
    busyRef.current = false;
    setBusy(false);
    if (!ack) {
      // No acknowledgment from the canonical RPC: roll back and say so, never a false success.
      setFollowing(!next);
      setToggleError(next ? "לא הצלחנו לשמור את המעקב. נסו שוב." : "לא הצלחנו לבטל את המעקב. נסו שוב.");
      return;
    }
    if (next) { setJustFollowed(true); try { trackConversion("follow", { source, topic }); } catch { /* noop */ } }
    else setJustFollowed(false);
  }

  async function turnOnPush() {
    // Follow v19: guest Follow never turns into channel consent. Identity first.
    if (!pushReady || !user?.id) return;
    setPushMsg("");
    const r = await enablePush({ userId: user.id, topics: [] });
    if (r?.ok) { setPushOn(true); setPushMsg("✓ ההתראות המיידיות הופעלו"); try { trackConversion("push_enabled", { source }); } catch { /* noop */ } }
    else setPushMsg(r?.reason === "denied" ? "הדפדפן חסם התראות" : "לא ניתן להפעיל כרגע");
  }

  if (!topic) return null;

  // ✓ וריאנט mini — «וי קטן» עדין למשטחי-מדיה כהים (למשל בתוך נגן-הShorts). כמעט-שקוף כשלא-עוקב,
  //   מתמלא בסגול כשעוקב. אותו מנוע-מעקב קנוני (watchToggle/getNotificationPrefs), רק תצוגה זעירה.
  if (variant === "mini") {
    return (
      <button onClick={toggle} disabled={busy} aria-pressed={following}
        title={toggleError || (following ? "עוקב — לחצו לביטול" : (explainer || "עקבו אחרי מימד חמש"))}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, cursor: busy ? "wait" : "pointer",
          background: following ? "rgba(132,88,255,.9)" : "rgba(255,255,255,.10)",
          border: `1px solid ${following ? "rgba(190,165,255,.8)" : "rgba(255,255,255,.28)"}`,
          color: "#fff", borderRadius: 999, padding: "4px 10px",
          fontFamily: F.heading, fontWeight: 800, fontSize: 11, lineHeight: 1,
          opacity: following ? 1 : 0.5, transition: "opacity .2s, background .2s",
        }}>
        <span aria-hidden style={{ fontSize: 11 }}>✓</span>
        <span>{following ? (followLabel || "עוקב") : (label || "מעקב")}</span>
      </button>
    );
  }

  const gold = P.accentText, soft = P.glow || "rgba(212,175,55,0.15)";

  const outline = following || ghost;
  const btn = {
    cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 40, padding: compact ? "7px 15px" : "9px 20px", borderRadius: 999,
    fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
    border: `1px solid ${outline ? P.accent : "transparent"}`,
    background: following ? soft : (ghost ? "transparent" : P.accentBtn),
    color: outline ? gold : (P.onAccent || "#1a0e00"),
  };

  // ☑️ וריאנט צ'קבוקס — «דשבורד מעקב» קטן: שורה עם וי לכל נושא (קטגוריה/כתב), בלי פוש.
  // אותו מנוע-מעקב קנוני (getNotificationPrefs/watchToggle), רק תצוגה כצ'קבוקס.
  if (checkbox) {
    return (
      <>
      <button onClick={toggle} disabled={busy} role="checkbox" aria-checked={following}
        title={toggleError || (following ? "בטל מעקב" : explainer || label)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", cursor: busy ? "wait" : "pointer",
          background: following ? soft : "transparent", border: `1px solid ${following ? P.accent : P.border}`,
          borderRadius: 10, padding: "9px 13px", textAlign: "start", direction: "rtl", minHeight: 44 }}>
        <span aria-hidden style={{ flex: "0 0 auto", width: 21, height: 21, borderRadius: 6,
          border: `2px solid ${following ? P.accent : P.border}`, background: following ? P.accent : "transparent",
          color: following ? (P.onAccent || "#1a0e00") : "transparent", display: "grid", placeItems: "center",
          fontSize: 13, fontWeight: 900, transition: "all .15s ease" }}>✓</span>
        <span style={{ flex: 1, minWidth: 0, color: following ? gold : P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {icon} {label}
        </span>
        {following && <span style={{ flex: "0 0 auto", color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>עוקב</span>}
      </button>
      {(toggleError || loadFailed) && <div role="alert" style={{ marginTop: 4, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>{toggleError || "לא ניתן לאמת את מצב המעקב כרגע."}</div>}
      </>
    );
  }

  // Channel opt-in מוצע רק למשתמש מחובר. guest מקבל identity step בלבד.
  const pushOffer = !!user?.id && !noPush && justFollowed && following && pushReady && !pushOn && (
    <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: gate ? "center" : "flex-start" }}>
      <span style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5 }}>📱 רוצה גם התראה מיידית?</span>
      <button onClick={turnOnPush} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${P.accent}`, color: gold, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>הפעל התראות</button>
    </div>
  );
  const statusNote = (toggleError || loadFailed) && (
    <div role="alert" style={{ marginTop: 7, color: P.accentDim, fontFamily: F.heading, fontSize: 12, textAlign: gate ? "center" : "start" }}>
      {toggleError || "לא ניתן לאמת את מצב המעקב כרגע."}
      {loadFailed && !toggleError && <button onClick={load} style={{ marginInlineStart: 8, cursor: "pointer", background: "transparent", border: "none", color: gold, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "underline" }}>נסו שוב</button>}
    </div>
  );
  const pushDone = pushMsg && <div style={{ marginTop: 7, color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>{pushMsg}</div>;

  // 🔑 guest → verified identity. ה-Follow כבר נשמר; אימות החשבון רק קושר אותו לזהות הקנונית.
  // אין כאן Email/Push consent אוטומטי.
  const regCta = !user && justFollowed && following && (
    <div style={{ marginTop: 11, background: P.card, border: `1px dashed ${P.accent}`, borderRadius: 12, padding: "12px 14px", textAlign: gate ? "center" : "start" }}>
      {!showReg ? (
        <>
          <div style={{ color: gold, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>🔑 שמור את המעקב שלך</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, margin: "3px 0 9px" }}>אמת את החשבון כדי לקשור את המעקב לזהות שלך. ערוצי מייל/Push נבחרים בנפרד ורק בהסכמה.</div>
          <button onClick={() => setShowReg(true)} style={{ ...btn, background: P.accentBtn, color: P.onAccent || "#1a0e00", border: "1px solid transparent" }}>✉️ אימות חשבון</button>
        </>
      ) : (
        <EmailVerify source={`follow:${source}`} cta="שלחו לי קוד" onVerified={() => { setShowReg(false); setJustFollowed(false); }} />
      )}
    </div>
  );

  // ── אזור-מעקב קנוני (מובחן משיתוף, Value-First, שפה אחידה בכל האתר) ──
  if (gate) {
    return (
      <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${P.border}`, textAlign: "center", direction: "rtl" }}>
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 18px", maxWidth: 460, margin: "0 auto" }}>
          {!following ? (
            <>
              <div style={{ color: gold, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, marginBottom: 3 }}>🔔 {heading}</div>
              {explainer && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, marginBottom: 12 }}>{explainer}</div>}
              <button onClick={toggle} disabled={busy} style={btn}>{icon} {label}</button>
              {statusNote}
            </>
          ) : (
            <>
              <div style={{ color: gold, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>✓ אתה במעקב</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>{explainer || "נעדכן אותך כשמתפרסם משהו חדש."}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={toggle} disabled={busy} style={{ ...btn, background: "transparent", color: P.accentDim, border: `1px solid ${P.border}`, fontSize: 12 }}>ביטול מעקב</button>
              </div>
              {statusNote}{regCta}{pushOffer}{pushDone}
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
        {icon} {following ? (followLabel || "עוקבים ✓") : label}
      </button>
      {!following && explainer && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{explainer}</div>}
      {statusNote}{regCta}{pushOffer}{pushDone}
    </div>
  );
}
