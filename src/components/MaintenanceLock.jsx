import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { getSiteFlags } from "../lib/supabase.js";
import {
  isNumberReviewPreviewRuntime2029,
  isValidNumberReviewFlag2029,
  projectNumberReviewFlag2029,
} from "../lib/numberReviewPreview2029.js";
import { LOGO_URL } from "../theme.js";

// ===== מצב-יכולת קנוני (site_flags_lock_law v3) =====
// ONE CAPABILITY → ONE STATE → MANY PROJECTIONS.
// כל route / tile / feed / post-footer / locale צורך את אותו resolver. אין נוסחת blocked מקומית.
// mode ב-DB: 'all' = כולם חסומים (חוץ מאדמין) · 'anon' = משתמשים רשומים עוברים.

const DEFAULT_MSG = "🔒 האזור נעול זמנית לצורך שדרוגים · חוזרים בקרוב";
let numberPreviewAutomaticRetry = null;

function numberPreviewNavigationIdentity() {
  if (typeof window === "undefined") return "server";
  return JSON.stringify([
    typeof window.history?.state?.key === "string" ? window.history.state.key : "",
    window.location?.pathname || "",
    window.location?.search || "",
    window.location?.hash || "",
  ]);
}

function readNumberPreviewFlagFreshOnce() {
  const identity = numberPreviewNavigationIdentity();
  if (numberPreviewAutomaticRetry?.identity === identity) return numberPreviewAutomaticRetry.promise;
  const promise = getSiteFlags({ fresh: true }).catch(() => ({}));
  numberPreviewAutomaticRetry = { identity, promise };
  return promise;
}

export function MaintenanceLock({
  message,
  showLogin = false,
  alternatives = false,
  homeHref = "/",
  onRetry = null,
  retrying = false,
}) {
  return (
    <div className="mlock" role="status" aria-live="polite">
      <style>{`
        .mlock{min-height:72vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
          text-align:center;padding:48px 22px;direction:rtl;
          font-family:'Heebo','Assistant',system-ui,sans-serif;}
        .mlock img{width:88px;height:88px;border-radius:20px;margin-bottom:22px;
          box-shadow:0 12px 36px rgba(0,0,0,.5);}
        .mlock h1{font-size:clamp(20px,5vw,28px);font-weight:800;margin:0 0 12px;color:#f0dc9a;line-height:1.4;}
        .mlock p{font-size:15.5px;line-height:1.95;max-width:470px;margin:0 auto;color:#cdbf9f;}
        .mlock .sub{font-size:13.5px;margin-top:18px;}
        .mlock a{color:#e8c84a;font-weight:800;text-decoration:none;}
        .mlock a:hover{text-decoration:underline;}
        .mlock a.mlock-cta{display:inline-block;margin-top:20px;background:#e8c84a;color:#1a0e00;
          font-weight:800;font-size:15px;padding:11px 30px;border-radius:999px;}
        .mlock a.mlock-cta:hover{text-decoration:none;filter:brightness(1.06);}
        .mlock button.mlock-retry{margin-top:20px;background:transparent;color:#e8c84a;border:1px solid currentColor;
          font:800 15px 'Heebo','Assistant',system-ui,sans-serif;padding:10px 26px;border-radius:999px;cursor:pointer;}
        .mlock button.mlock-retry:disabled{cursor:wait;opacity:.6;}
        @media (prefers-color-scheme:light){
          .mlock h1{color:#6d4e0b;} .mlock p{color:#33260a;} .mlock a{color:#8a5a0a;}
          .mlock a.mlock-cta{background:#8a5a0a;color:#fff;}
        }
        :root[data-theme="light"] .mlock h1{color:#6d4e0b;}
        :root[data-theme="light"] .mlock p{color:#33260a;}
        :root[data-theme="light"] .mlock a{color:#8a5a0a;}
        :root[data-theme="light"] .mlock a.mlock-cta{background:#8a5a0a;color:#fff;}
        :root[data-theme="dark"] .mlock h1{color:#f0dc9a;}
        :root[data-theme="dark"] .mlock p{color:#cdbf9f;}
        :root[data-theme="dark"] .mlock a{color:#e8c84a;}
        :root[data-theme="dark"] .mlock a.mlock-cta{background:#e8c84a;color:#1a0e00;}
      `}</style>
      <img src={LOGO_URL} alt="סוד 1820" />
      <h1>{message || DEFAULT_MSG}</h1>
      {showLogin ? (
        <>
          <p>ההרשמה חינם ולוקחת חצי דקה — והיא פותחת גם שמירת מחקר, מועדפים והתראות על רמזים חדשים.</p>
          <Link className="mlock-cta" to="/login">✨ התחברות / הרשמה חינם</Link>
        </>
      ) : (
        <p>אנחנו משדרגים את המערכת כדי לשרת אתכם טוב יותר. האזור הזה יחזור לפעול בקרוב — תודה על הסבלנות.</p>
      )}
      {alternatives && !showLogin && (
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginTop:20}}>
          <Link className="mlock-cta" to="/gematria">🧮 למחשבון הגימטריה</Link>
          <Link className="mlock-cta" to="/code">🔠 לדילוגי אותיות</Link>
        </div>
      )}
      {onRetry && (
        <button className="mlock-retry" type="button" onClick={onRetry} disabled={retrying}>
          {retrying ? "בודקים שוב…" : "בדיקה חוזרת"}
        </button>
      )}
      <div className="sub"><Link to={homeHref}>← לעמוד הבית</Link></div>
    </div>
  );
}

// 🔒 טיזר-נעילה קומפקטי — לסקציות מוטמעות (עמוד הבית וכד'), לא מסך שלם.
export function LockTeaser({ message, showLogin = false }) {
  return (
    <div dir="rtl" style={{
      maxWidth: 560, margin: "18px auto", textAlign: "center",
      background: "linear-gradient(170deg, rgba(24,17,9,.92), rgba(10,7,3,.92))",
      border: "1px solid rgba(232,200,74,.45)", borderRadius: 18, padding: "26px 20px",
      fontFamily: "'Heebo','Assistant',system-ui,sans-serif",
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#f0dc9a", lineHeight: 1.6 }}>{message || DEFAULT_MSG}</div>
      {showLogin && (
        <>
          <div style={{ marginTop: 8, fontSize: 13.5, color: "#cdbf9f", lineHeight: 1.8 }}>
            ההרשמה חינם ולוקחת חצי דקה — ופותחת את הזרם, שמירת מחקר והתראות על רמזים חדשים.
          </div>
          <Link to="/login" style={{
            display: "inline-block", marginTop: 14, background: "#e8c84a", color: "#1a0e00",
            fontWeight: 800, fontSize: 14.5, padding: "10px 26px", borderRadius: 999, textDecoration: "none",
          }}>✨ התחברות / הרשמה חינם</Link>
        </>
      )}
    </div>
  );
}

// hook בסיסי לשליפת דגל בודד. זהו reader בלבד; סמנטיקת-הגישה נפתרת ב-useFeatureState.
export function useSiteFlag(flag) {
  const [attempt, setAttempt] = useState(0);
  const [st, setSt] = useState({ loading: true, lock: null, canRetry: false, retrying: false });
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let alive = true;
    const numberPreview = flag === "lock_number" && isNumberReviewPreviewRuntime2029();
    if (attempt > 0) setSt(previous => ({ ...previous, canRetry: false, retrying: true }));
    (async () => {
      let flags = await getSiteFlags(attempt > 0 ? { fresh: true } : undefined);
      let lock = flags?.[flag] || null;
      let validNumberGate = flag !== "lock_number" || isValidNumberReviewFlag2029(flag, lock);

      // The exact Number review Preview gets one automatic fresh read when its
      // required canonical row was absent or malformed. A manual retry starts a
      // new fresh attempt, but never loops in the background.
      if (numberPreview && attempt === 0 && !validNumberGate) {
        flags = await readNumberPreviewFlagFreshOnce();
        lock = flags?.[flag] || null;
        validNumberGate = isValidNumberReviewFlag2029(flag, lock);
      }

      if (!alive) return;
      const safeLock = flag === "lock_number" && !validNumberGate ? null : lock;
      setSt({
        loading: false,
        lock: projectNumberReviewFlag2029(flag, safeLock),
        canRetry: numberPreview && !validNumberGate,
        retrying: false,
      });
    })().catch(() => {
      if (alive) setSt({ loading: false, lock: null, canRetry: numberPreview, retrying: false });
    });
    return () => { alive = false; };
  }, [flag, attempt]);
  return { ...st, retry };
}

// pure resolver — מקור יחיד לכל נוסחת availability/access.
// שפה/locale אינה פרמטר בכוונה: לפי content_translation_law v2 היא Projection בלבד.
export function resolveFeatureState(lock, { user = null, isAdmin = false, requireFlag = false } = {}) {
  // A named launch gate must exist explicitly before it can open, including to
  // admins. The server capability gate also denies unknown flags.
  if (!lock && requireFlag) {
    return {
      enabled: true, mode: "all", blocked: true, allowed: false,
      adminBypass: false, registeredBypass: false,
      publicState: "closed", viewerState: "closed",
      message: DEFAULT_MSG, showLogin: false, status: "building",
    };
  }
  const enabled = !!lock?.enabled;
  const mode = lock?.mode || "all";
  const adminBypass = !!isAdmin;
  const registeredBypass = enabled && mode === "anon" && !!user;
  const blocked = enabled && !adminBypass && !registeredBypass;
  const publicState = !enabled ? "open" : mode === "anon" ? "registered_only" : "closed";
  const viewerState = adminBypass && enabled ? "admin_bypass" : registeredBypass ? "registered_bypass" : publicState;

  return {
    enabled,
    mode,
    blocked,
    allowed: !blocked,
    adminBypass,
    registeredBypass,
    publicState,
    viewerState,
    message: lock?.message || DEFAULT_MSG,
    showLogin: blocked && mode === "anon",
    // semantic status for cards/nav; translated copy is downstream, not truth here.
    status: !enabled ? "active" : mode === "anon" ? "registered_only" : "building",
  };
}

// canonical hook for every feature-controlled surface.
export function useFeatureState(flag, { requireFlag = false } = {}) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { loading, lock, canRetry, retrying, retry } = useSiteFlag(flag);
  return useMemo(() => ({
    flag,
    loading: loading || authLoading,
    lock,
    canRetry,
    retrying,
    retry,
    ...resolveFeatureState(lock, { user, isAdmin, requireFlag }),
  }), [flag, loading, authLoading, lock, canRetry, retrying, retry, user, isAdmin, requireFlag]);
}

// עטיפה ברמת-הראוט. כל לוגיקת access מגיעה מה-resolver הקנוני — אין נוסחה מקומית.
export default function Locked({ flag, children, requireFlag = false, homeHref = "/" }) {
  const state = useFeatureState(flag, { requireFlag });
  if (state.loading) return null;
  if (state.blocked) return <MaintenanceLock
    message={state.message}
    showLogin={state.showLogin}
    homeHref={homeHref}
    onRetry={state.canRetry ? state.retry : null}
    retrying={state.retrying}
  />;
  return children;
}
