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
import WatchControl2029 from "./followCenter2029/WatchControl2029.jsx";

// 🔔 WatchButton — הרכיב הקנוני היחיד של מנוע-המשפך (subscription_funnel_law).
// חוקי-ברזל: (1) אותו רכיב בכל מקום, רק ה-topic משתנה · (2) כל Follow שומר source · (3) משפט-הסבר
// «מה מקבלים» · (4) Follow קודם; guest מקבל identity verification בלבד; channel opt-in רק אחרי account ·
// (7) מצב gate לתחתית-תוכן. אין רכיב-מעקב אחר.
//   props: topic (חובה) · source (מאיפה) · explainer (משפט «מה מקבלים») · label · heading (כותרת-אזור) · gate (אזור-מעקב מובחן) · compact
//   paletteMode: כפיית פלטה ('light'/'dark') כדי להתאים לצבע-הסביבה (למשל בתחתית פוסט נעול-כהה) — ברירת-מחדל: פלטת-האתר.
//   icon: אייקון מוביל (ברירת-מחדל 🔔; בתחתית-פוסט 📁/✍️ כדי להבחין קטגוריה מכתב) · ghost: מצב-מתאר (מילוי שקוף) להבחנה ויזואלית בין שתי פעולות סמוכות.
const blankView = (key) => ({ key, following: false, busy: false, justFollowed: false, showReg: false, pushOn: false, pushMsg: "", loadFailed: false, toggleError: "", known: false });
// One controller, with instance-scoped I/O. A supplied adapter never falls back to live I/O.
const DEFAULT_FOLLOW_IO = Object.freeze({
  read: getNotificationPrefs,
  toggle: watchToggle,
  track: (detail) => trackConversion("follow", detail),
});

export default function WatchButton({ topic, source = "unknown", explainer = "", label = "עקוב אחרי הנושא הזה", followLabel = null, heading = "רוצה לדעת כשיש חדש?", gate = false, compact = false, paletteMode = null, icon = "🔔", ghost = false, checkbox = false, noPush = false, variant = null, followIO = null, onVerifyIdentity = null }) {
  const auto = usePalette();
  const P = paletteMode ? (PALETTES[paletteMode] || auto) : auto;
  const { user } = useAuth();
  const [view, setView] = useState(() => blankView(""));
  const pushReady = PUSH_CONFIGURED && pushSupported();
  const idObj = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };
  // Principal+topic scope: results that resolve after the account or topic changed must not touch the new scope.
  const io = followIO ?? DEFAULT_FOLLOW_IO;
  const ioScope = useRef({ io, version: 0 });
  if (ioScope.current.io !== io) ioScope.current = { io, version: ioScope.current.version + 1 };
  const scopeKey = `${user?.id || "guest"}|${topic || ""}|${ioScope.current.version}`;
  const scopeRef = useRef(scopeKey);
  const busyRef = useRef(false);
  const loadSeqRef = useRef(0);
  const mutationRef = useRef(0);
  scopeRef.current = scopeKey;

  // State belongs to the scope that produced it; a different account/topic renders as unknown on the very first
  // render (no flash of the previous account's follow state) instead of waiting for an effect to clear it.
  const v = view.key === scopeKey ? view : blankView(scopeKey);
  const { following, busy, justFollowed, showReg, pushOn, pushMsg, loadFailed, toggleError, known } = v;
  const patch = useCallback((key, p) => setView(prev => ({ ...(prev.key === key ? prev : blankView(key)), ...p })), []);

  useEffect(() => { busyRef.current = false; mutationRef.current += 1; }, [scopeKey]);

  const load = useCallback((clearOperationError = false) => {
    if (!topic) return;
    const key = scopeKey;
    const seq = ++loadSeqRef.current;
    const mutation = mutationRef.current;
    patch(key, { loadFailed: false, known: false });
    // The initial/verify read must not overwrite a toggle that started or completed after it was requested.
    const current = () => scopeRef.current === key && loadSeqRef.current === seq && mutationRef.current === mutation;
    Promise.resolve().then(() => io.read(idObj))
      .then(p => {
        if (!current()) return;
        patch(key, { following: includesFollowSubject(p?.topics, topic), pushOn: !!p?.channels?.includes("push"), known: true, loadFailed: false,
          ...(clearOperationError === true ? { toggleError: "" } : {}) });
      })
      .catch(() => { if (current()) patch(key, { loadFailed: true }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, user?.id, io]);
  useEffect(() => { load(); }, [load]);

  async function toggle() {
    // Toggling is gated until the saved state is known, so a click can never invert a guess.
    if (!topic || busyRef.current || !known) return;
    const key = scopeKey;
    busyRef.current = true;
    mutationRef.current += 1;
    const next = !following;
    patch(key, { busy: true, toggleError: "", following: next });
    let ack = null;
    try { ack = await io.toggle(topic, source, next, user?.id ? null : getVisitorId()); } catch { ack = null; }
    if (scopeRef.current !== key) return; // scope changed mid-flight; the scope effect already cleared busy
    busyRef.current = false;
    mutationRef.current += 1;
    if (!ack) {
      // No acknowledgment: the outcome is unknown, so show the prior state, say we did not get confirmation, and re-read.
      patch(key, { busy: false, following: !next, known: false, justFollowed: false, showReg: false, toggleError: "לא קיבלנו אישור שהמעקב עודכן. בדקו את המצב ונסו שוב." });
      load();
      return;
    }
    patch(key, next ? { busy: false, justFollowed: true } : { busy: false, justFollowed: false });
    if (next) { try { io.track?.({ source, topic }); } catch { /* noop */ } }
  }

  async function turnOnPush() {
    // Follow v19: guest Follow never turns into channel consent. Identity first.
    if (!pushReady || !user?.id) return;
    const key = scopeKey;
    patch(key, { pushMsg: "" });
    const r = await enablePush({ userId: user.id, topics: [] });
    if (scopeRef.current !== key) return;
    if (r?.ok) { patch(key, { pushOn: true, pushMsg: "✓ ההתראות המיידיות הופעלו" }); try { trackConversion("push_enabled", { source }); } catch { /* noop */ } }
    else patch(key, { pushMsg: r?.reason === "denied" ? "הדפדפן חסם התראות" : "לא ניתן להפעיל כרגע" });
  }

  if (!topic) return null;

  // One visible, announced error + retry for every variant. Unknown state is never presented as a saved/unsaved fact.
  const unknownMsg = toggleError || (loadFailed ? "לא ניתן לאמת את מצב המעקב כרגע." : "");
  const retry = (color, size) => (loadFailed || toggleError) && !busy
    ? <button type="button" onClick={load} style={{ marginInlineStart: 8, minHeight: 44, minWidth: 44, cursor: "pointer", background: "transparent", border: "none", color, fontFamily: F.heading, fontSize: size, fontWeight: 800, textDecoration: "underline" }}>נסו שוב</button>
    : null;
  const locked = busy || !known;

  // Design V2 presentation through the existing variant seam. The shared controller owns I/O and scope guards;
  // the view receives authoritative completion facts separately from the saved follow value.
  if (variant === "2029") {
    // A saved read may resume identity without being a newly confirmed mutation.
    const savedFollowKnown = known && following && !busy && !loadFailed && !toggleError;
    return <WatchControl2029 following={following} busy={busy} known={known} loadFailed={loadFailed} toggleError={toggleError}
      confirmed={savedFollowKnown && justFollowed} identityRequired={savedFollowKnown && !user?.id}
      signedIn={!!user?.id} showReg={showReg} pushOn={pushOn} pushMsg={pushMsg} pushOffered={!noPush && pushReady} label={label} followLabel={followLabel} explainer={explainer}
      onToggle={toggle} onRetry={() => load(true)} onTurnOnPush={turnOnPush}
      onVerifyIdentity={() => typeof onVerifyIdentity === "function" ? onVerifyIdentity() : patch(scopeKey, { showReg: true })}
      identitySlot={<EmailVerify source={`follow:${source}`} cta="שלחו לי קוד" onVerified={() => patch(scopeKey, { showReg: false, justFollowed: false })} />} />;
  }

  // ✓ וריאנט mini — «וי קטן» עדין למשטחי-מדיה כהים (למשל בתוך נגן-הShorts). כמעט-שקוף כשלא-עוקב,
  //   מתמלא בסגול כשעוקב. אותו מנוע-מעקב קנוני (watchToggle/getNotificationPrefs), רק תצוגה זעירה.
  if (variant === "mini") {
    return (
      <>
      <button onClick={toggle} disabled={locked} aria-pressed={following} aria-busy={(!known && !loadFailed) || busy || undefined}
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
      {unknownMsg && <span role="alert" style={{ display: "inline-flex", alignItems: "center", marginInlineStart: 6, color: "#fff", fontFamily: F.heading, fontSize: 11.5 }}>{unknownMsg}{retry("#fff", 11.5)}</span>}
      </>
    );
  }

  const gold = P.accentText, soft = P.glow || "rgba(212,175,55,0.15)";

  const outline = following || ghost;
  const btn = {
    cursor: locked ? (loadFailed ? "not-allowed" : "wait") : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 44, padding: compact ? "7px 15px" : "9px 20px", borderRadius: 999,
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
      <button onClick={toggle} disabled={locked} role="checkbox" aria-checked={following} aria-busy={(!known && !loadFailed) || busy || undefined}
        title={toggleError || (following ? "בטל מעקב" : explainer || label)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", cursor: locked ? (loadFailed ? "not-allowed" : "wait") : "pointer",
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
      {unknownMsg && <div role="alert" style={{ marginTop: 4, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>{unknownMsg}{retry(gold, 12)}</div>}
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
  const statusNote = unknownMsg && (
    <div role="alert" style={{ marginTop: 7, color: P.accentDim, fontFamily: F.heading, fontSize: 12, textAlign: gate ? "center" : "start" }}>
      {unknownMsg}{retry(gold, 12)}
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
          <button onClick={() => typeof onVerifyIdentity === "function" ? onVerifyIdentity() : patch(scopeKey, { showReg: true })} style={{ ...btn, background: P.accentBtn, color: P.onAccent || "#1a0e00", border: "1px solid transparent" }}>✉️ אימות חשבון</button>
        </>
      ) : (
        <EmailVerify source={`follow:${source}`} cta="שלחו לי קוד" onVerified={() => patch(scopeKey, { showReg: false, justFollowed: false })} />
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
              <button onClick={toggle} disabled={locked} aria-busy={(!known && !loadFailed) || busy || undefined} style={btn}>{icon} {label}</button>
              {statusNote}
            </>
          ) : (
            <>
              <div style={{ color: gold, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>✓ אתה במעקב</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>{explainer || "נעדכן אותך כשמתפרסם משהו חדש."}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={toggle} disabled={locked} style={{ ...btn, background: "transparent", color: P.accentDim, border: `1px solid ${P.border}`, fontSize: 12 }}>ביטול מעקב</button>
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
      <button onClick={toggle} disabled={locked} aria-pressed={following} aria-busy={(!known && !loadFailed) || busy || undefined}
        title={following ? "לחצו לביטול" : explainer || label} style={btn}>
        {icon} {following ? (followLabel || "עוקבים ✓") : label}
      </button>
      {!following && explainer && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{explainer}</div>}
      {statusNote}{regCta}{pushOffer}{pushDone}
    </div>
  );
}
