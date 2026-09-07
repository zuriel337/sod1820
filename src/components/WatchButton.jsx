import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { getNotificationPrefs } from "../lib/supabase.js";
import { watchToggle } from "../lib/commandCenter.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";
import { normalizeFollowTopic, watchContinuation, assertWatchResult, requireVerifiedEmailSession } from "../lib/watchContinuation.js";
import EmailVerify from "./EmailVerify.jsx";

// subscription_funnel_law v18: one component, one continuation, every variant.
// This UI does NOT repair identity claims or authorize an email delivery channel.
// Those server-side release gates are tracked under SHARED_FOLLOW_SIGNUP_COMPLETION_V1.
function RegistrationDialog({ onClose, onVerified, source, P }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); previousFocus?.focus?.(); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={ref} aria-label="אימות מייל להמשך המעקב"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); onClose(); } }}
      onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}
      style={{ direction: "rtl", width: "min(440px, calc(100vw - 24px))", boxSizing: "border-box",
        maxHeight: "85vh", overflowY: "auto", padding: 20, borderRadius: 16,
        border: `1px solid ${P.border}`, background: P.card, color: P.ink }}>
      <button type="button" onClick={onClose} aria-label="סגירת האימות"
        style={{ float: "left", padding: 8, border: "none", background: "transparent", color: P.ink, cursor: "pointer" }}>✕</button>
      <h2 style={{ fontFamily: F.heading, fontSize: 18, margin: "0 0 12px" }}>להמשך שמירת המעקב</h2>
      <p style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>מאמתים את המייל לחשבון. בחירת ערוץ עדכונים היא פעולה נפרדת.</p>
      <EmailVerify source={`follow:${source}`} cta="שלחו לי קוד" onVerified={onVerified} />
    </dialog>, document.body
  );
}

export default function WatchButton({ topic, source = "unknown", explainer = "", label = "עקוב אחרי הנושא הזה", followLabel = null,
  heading = "רוצה לדעת כשיש חדש?", gate = false, compact = false, paletteMode = null, icon = "🔔", ghost = false,
  checkbox = false, noPush = false, variant = null }) {
  const auto = usePalette();
  const P = PALETTES[paletteMode || (variant === "mini" ? "dark" : "")] || auto;
  const { user, loading: authLoading } = useAuth();
  const canonicalTopic = normalizeFollowTopic(topic);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [justFollowed, setJustFollowed] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const scope = useRef(0);
  const pushReady = PUSH_CONFIGURED && pushSupported();

  useEffect(() => {
    const current = ++scope.current;
    let alive = true;
    setFollowing(false); setLoadingPrefs(true); setJustFollowed(false); setMessage(""); setError("");
    if (authLoading || !canonicalTopic) { setLoadingPrefs(false); return () => { alive = false; }; }
    const identity = user?.id ? { userId: user.id } : { visitorId: getVisitorId() };
    getNotificationPrefs(identity).then(p => {
      if (!alive || current !== scope.current) return;
      setFollowing(!!p?.topics?.includes(canonicalTopic));
      setPushOn(!!p?.channels?.includes("push"));
    }).catch(() => { if (alive) setError("לא הצלחנו לטעון את המעקב כרגע"); })
      .finally(() => { if (alive) setLoadingPrefs(false); });
    return () => { alive = false; };
  }, [canonicalTopic, user?.id, authLoading]);

  // A different subject must not inherit an open registration dialog.
  useEffect(() => { setShowReg(false); }, [canonicalTopic]);

  async function toggle() {
    if (!canonicalTopic || pending.current || loadingPrefs || authLoading) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    const current = scope.current;
    const next = !following;
    try {
      const result = await watchToggle(canonicalTopic, source, next, user?.id ? null : getVisitorId());
      assertWatchResult(result, canonicalTopic, next); // helper currently swallows RPC errors: never show false success
      if (current !== scope.current) return;
      setFollowing(next); setJustFollowed(next);
      if (!next) setShowReg(false);
      try { trackConversion(next ? "follow" : "unfollow", { source, topic: canonicalTopic }); } catch { /* analytics cannot block persistence */ }
    } catch {
      if (current === scope.current) setError("המעקב לא נשמר כרגע — אפשר לנסות שוב");
    } finally { pending.current = false; setBusy(false); }
  }

  async function turnOnPush() {
    if (!user?.id || !pushReady || pending.current) return;
    pending.current = true; setBusy(true); setMessage(""); setError("");
    try {
      const result = await enablePush({ userId: user.id, topics: [] });
      if (!result?.ok) throw new Error("push not enabled");
      setPushOn(true); setMessage("✓ הרשמת הדפדפן להתראות נשמרה");
      try { trackConversion("push_enabled", { source, topic: canonicalTopic }); } catch { /* noop */ }
    } catch { setError("לא ניתן להפעיל התראות בדפדפן כרגע"); }
    finally { pending.current = false; setBusy(false); }
  }

  async function confirmRegistration(data) {
    requireVerifiedEmailSession(data);
    // Readback only. Never bypass RLS or take a guest row using an exposed visitor ID.
    // Keep the verified form open with retry if the canonical identity bridge did not complete.
    const prefs = await getNotificationPrefs({ userId: data.user.id });
    if (!prefs?.topics?.includes(canonicalTopic)) throw new Error("Follow identity link not confirmed");
    setFollowing(true); setJustFollowed(false); setShowReg(false);
    setMessage("✓ המעקב נמצא בחשבון. ערוץ העדכונים נבחר בנפרד.");
  }

  const nextStep = watchContinuation({ following, userId: user?.id, authLoading,
    justFollowed, noPush, pushReady, pushOn });
  if (!canonicalTopic) return null;
  const gold = P.accentText, soft = P.glow || "rgba(212,175,55,0.15)";
  const disabled = busy || loadingPrefs || authLoading;
  const outline = following || ghost;
  const btn = { cursor: disabled ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 40, padding: compact ? "7px 15px" : "9px 20px", borderRadius: 999, fontFamily: F.heading,
    fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", border: `1px solid ${outline ? P.accent : "transparent"}`,
    background: following ? soft : (ghost ? "transparent" : P.accentBtn), color: outline ? gold : (P.onAccent || "#1a0e00") };

  // All visual variants select a control, then render the SAME continuation below.
  let control;
  if (variant === "mini") {
    control = <button type="button" onClick={toggle} disabled={disabled} aria-pressed={following}
      title={following ? "עוקב — לחצו לביטול" : (explainer || label)}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: disabled ? "wait" : "pointer",
        background: following ? "rgba(132,88,255,.9)" : "rgba(255,255,255,.10)",
        border: `1px solid ${following ? "rgba(190,165,255,.8)" : "rgba(255,255,255,.28)"}`,
        color: "#fff", borderRadius: 999, padding: "4px 10px", fontFamily: F.heading, fontWeight: 800,
        fontSize: 11, lineHeight: 1, opacity: following ? 1 : 0.5, transition: "opacity .2s, background .2s" }}>
      <span aria-hidden="true">✓</span><span>{following ? (followLabel || "עוקב") : label}</span>
    </button>;
  } else if (checkbox) {
    control = <button type="button" onClick={toggle} disabled={disabled} role="checkbox" aria-checked={following}
      title={following ? "בטל מעקב" : explainer || label}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", cursor: disabled ? "wait" : "pointer",
        background: following ? soft : "transparent", border: `1px solid ${following ? P.accent : P.border}`,
        borderRadius: 10, padding: "9px 13px", textAlign: "start", direction: "rtl", minHeight: 44 }}>
      <span aria-hidden="true" style={{ color: following ? gold : P.inkSoft }}>{following ? "☑" : "☐"}</span>
      <span style={{ flex: 1, minWidth: 0, color: following ? gold : P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>{icon} {label}</span>
      {following && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>עוקב</span>}
    </button>;
  } else if (gate) {
    control = <>
      <div style={{ color: gold, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, marginBottom: 6 }}>{following ? "✓ הנושא במעקב" : `🔔 ${heading}`}</div>
      {!following && explainer && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, marginBottom: 12 }}>{explainer}</div>}
      <button type="button" onClick={toggle} disabled={disabled} aria-pressed={following} style={btn}>{following ? "ביטול מעקב" : `${icon} ${label}`}</button>
    </>;
  } else {
    control = <>
      <button type="button" onClick={toggle} disabled={disabled} aria-pressed={following}
        title={following ? "לחצו לביטול" : explainer || label} style={btn}>{icon} {following ? (followLabel || "עוקבים ✓") : label}</button>
      {!following && explainer && <span style={{ display: "block", color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{explainer}</span>}
    </>;
  }

  const continuation = <>
    {nextStep === "register" && <span style={{ display: "block", marginTop: 7 }}>
      {variant !== "mini" && <span style={{ display: "block", color: P.inkSoft, fontFamily: F.body, fontSize: 12, marginBottom: 4 }}>הנושא נשמר למבקר הזה; עדכונים במייל עדיין לא הופעלו.</span>}
      <button type="button" onClick={() => setShowReg(true)} aria-haspopup="dialog"
        style={{ cursor: "pointer", background: "transparent", border: "none", padding: "4px 0", color: gold,
          fontFamily: F.heading, fontSize: variant === "mini" ? 11 : 13, fontWeight: 800, textDecoration: "underline" }}>להמשך שמירת המעקב</button>
    </span>}
    {nextStep === "push" && <span style={{ display: "block", marginTop: 7 }}>
      <button type="button" disabled={busy} onClick={turnOnPush} style={btn}>הפעל התראות דפדפן</button>
    </span>}
    {message && <span role="status" style={{ display: "block", color: P.inkSoft, fontFamily: F.body, fontSize: 12, marginTop: 7 }}>{message}</span>}
    {error && <span role="alert" style={{ display: "block", color: P.ink, fontFamily: F.body, fontSize: 12, marginTop: 7 }}>{error}</span>}
    {/* Keep mounted through auth-state changes, until verified readback succeeds or the user closes it. */}
    {showReg && <RegistrationDialog source={source} onClose={() => setShowReg(false)} onVerified={confirmRegistration} P={P} />}
  </>;
  return <span dir="rtl" data-follow-variant={variant || (checkbox ? "checkbox" : gate ? "gate" : "inline")}
    style={{ display: "block", ...(gate ? { marginTop: 30, padding: 18, textAlign: "center", border: `1px solid ${P.border}`, borderRadius: 14, background: P.card } : {}) }}>
    {control}{continuation}
  </span>;
}
