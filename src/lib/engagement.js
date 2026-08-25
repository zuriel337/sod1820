// ===== מדידת מעורבות ברמת-עמוד (Engagement Time v1) =====
// event_type='engagement' על ה-pipeline הקיים (public.events / RPC ingest_event) — בלי טבלה חדשה,
// בלי RPC חדש, בלי endpoint חדש. אושר ע"י צוריאל (ENGAGEMENT_TIME_V1_IMPLEMENTATION, 25.8.2026),
// על בסיס אודיט read-only קודם (work_log actor=CLAUDE task=ENGAGEMENT_TIME_V1_READONLY_FOUNDATION_AUDIT).
//
// חוזה סמנטי (engagement_version=1, idle_threshold_ms=20000):
//   visible_ms — רק זמן שבו document.visibilityState==='visible'. רקע לא נספר.
//   engaged_ms — תת-קבוצה של visible_ms: רק כשהמשתמש היה פעיל (scroll/pointer/מקלדת/touch)
//                בתוך IDLE_THRESHOLD_MS האחרונות. tab-open ≠ engaged, scroll ≠ engagement.
//   max_scroll_pct — high-water mark בלבד, נוסחה זהה ל-UpdatesBar.jsx: (scrollY+innerHeight)/scrollHeight.
//                    עומק-גלילה אינו הוכחת-קריאה.
//
// Page lifecycle (תיקון-חובה של צוריאל):
//   route change / pagehide  → flush סופי + סגירת ה-page-instance.
//   visibilitychange:hidden  → checkpoint מקומי בלבד (משהה צבירה) — לא שולח כלום, לא סוגר.
//   visibilitychange:visible → ממשיך לצבור על אותו page-instance (טוטלים מצטברים, לא מתאפסים).
// אין heartbeat תקופתי-רשתי ב-v1: checkpoint ארוך-סשן נדחה בכוונה (ר' work_log) כדי לא להכניס
// dedupe/סכימה מורכבת מעבר למה שנדרש — v1 = flush אחד לכל page-instance, לכל היותר.
//
// Delivery: route_change (הדף עדיין פתוח) → supabase.rpc('ingest_event', …) הרגיל, זהה ל-events.js.
//           pagehide (הדף עשוי להיסגר) → navigator.sendBeacon אל אותו RPC (אומת ידנית ב-curl:
//           apikey ב-query-string + Content-Type: application/json בגוף = מספיק, בלי Authorization
//           header — sendBeacon לא יכול לצרף headers מותאמים, רק Content-Type דרך סוג ה-Blob),
//           עם נפילה ל-fetch(...,{keepalive:true}) (precedent חי: marketing.js sendCAPI) אם
//           sendBeacon לא זמין/נכשל. אותו RPC בדיוק — אין endpoint חדש.
//
// בוטים: isBot() (events.js, מקור-אמת = cookie vb מה-middleware) נבדק פעם אחת ביצירת ה-tracker —
// בוט לא מקבל טיימר/listeners בכלל (חיסכון), וגם אם משהו יחמוק — ingest_event עצמו מפיל בוטים
// לפני insert (guard קיים, לא נגעתי בו). אפס לוגיקת-בוט חדשה — שימוש חוזר מלא ב-isBot().
import { supabase, SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";
import { getSodId, appContext, sessionId } from "./identity.js";
import { isBot } from "./events.js";

export const ENGAGEMENT_VERSION = 1;
export const IDLE_THRESHOLD_MS = 20000;
const TICK_MS = 1000;
const SCROLL_THROTTLE_MS = 200;
const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc/ingest_event?apikey=${SUPABASE_ANON}`;

// ── ליבה טהורה, נטולת-דפדפן (ניתנת-לבדיקה ב-Node בלי DOM) ───────────────────
// לא נוגעת ב-document/window/navigator — כל הזמן מוזרק דרך now().
export function createEngagementState({ now = Date.now, idleThresholdMs = IDLE_THRESHOLD_MS } = {}) {
  let visibleMs = 0, engagedMs = 0, maxScrollPct = 0;
  let lastActivityAt = now();
  let visible = true;
  let flushed = false;
  return {
    setVisible(v) { visible = !!v; if (visible) lastActivityAt = now(); },
    recordActivity() { lastActivityAt = now(); },
    recordScroll(pct) { if (Number.isFinite(pct) && pct > maxScrollPct) maxScrollPct = pct; },
    // deltaMs = פרק-הזמן שחלף (בדיקות מזריקות ערך קבוע; בדפדפן זה TICK_MS האמיתי).
    tick(deltaMs = TICK_MS) {
      if (flushed || !visible) return;
      visibleMs += deltaMs;
      if (now() - lastActivityAt < idleThresholdMs) engagedMs += deltaMs;
    },
    snapshot() {
      return {
        visible_ms: Math.round(visibleMs),
        engaged_ms: Math.round(engagedMs),
        max_scroll_pct: Math.max(0, Math.min(100, Math.round(maxScrollPct))),
      };
    },
    // guard יחיד למניעת כפל-ספירה: הקריאה הראשונה "זוכה", כל קריאה נוספת = no-op (מחזירה null).
    flush() {
      if (flushed) return null;
      flushed = true;
      return this.snapshot();
    },
    get isFlushed() { return flushed; },
  };
}

function currentScrollPct(doc, win) {
  try {
    const denom = (doc.documentElement && doc.documentElement.scrollHeight) || 1;
    return ((win.scrollY + win.innerHeight) / denom) * 100;
  } catch { return 0; }
}

// ── שכבת-חיווט לדפדפן — DI-מלא כדי שבדיקות יוכלו לעקוף document/window/navigator/timers ──
export function createPageEngagementTracker(path, deps = {}) {
  const {
    now = () => Date.now(),
    idleThresholdMs = IDLE_THRESHOLD_MS,
    tickMs = TICK_MS,
    setIntervalFn = (typeof window !== "undefined" ? window.setInterval.bind(window) : null),
    clearIntervalFn = (typeof window !== "undefined" ? window.clearInterval.bind(window) : null),
    doc = (typeof document !== "undefined" ? document : null),
    win = (typeof window !== "undefined" ? window : null),
    sendFn = defaultSend,
    isBotFn = isBot,
    getSodIdFn = getSodId,
    sessionIdFn = sessionId,
    appContextFn = appContext,
  } = deps;

  const state = createEngagementState({ now, idleThresholdMs });
  let timer = null;
  let botSkip = false;
  try { botSkip = !!isBotFn(); } catch { botSkip = false; }
  const canWire = !botSkip && doc && win && setIntervalFn && clearIntervalFn;

  function startTick() {
    if (timer || !canWire) return;
    timer = setIntervalFn(() => state.tick(tickMs), tickMs);
  }
  function stopTick() {
    if (timer) { clearIntervalFn(timer); timer = null; }
  }

  let lastScrollAt = 0;
  function onScroll() {
    const t = now();
    if (t - lastScrollAt < SCROLL_THROTTLE_MS) return;
    lastScrollAt = t;
    state.recordScroll(currentScrollPct(doc, win));
    state.recordActivity();
  }
  const onActivity = () => state.recordActivity();
  function onVisibilityChange() {
    const nowVisible = doc.visibilityState === "visible";
    state.setVisible(nowVisible);
    if (nowVisible) startTick(); else stopTick();
  }

  if (canWire) {
    if (doc.visibilityState === "visible") startTick();
    doc.addEventListener("visibilitychange", onVisibilityChange);
    win.addEventListener("scroll", onScroll, { passive: true });
    win.addEventListener("pointerdown", onActivity);
    win.addEventListener("keydown", onActivity);
    win.addEventListener("touchstart", onActivity, { passive: true });
  }

  function cleanupListeners() {
    stopTick();
    if (!canWire) return;
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    win.removeEventListener("scroll", onScroll);
    win.removeEventListener("pointerdown", onActivity);
    win.removeEventListener("keydown", onActivity);
    win.removeEventListener("touchstart", onActivity);
  }

  // flush(reason) — אידמפוטנטי (guard בתוך state.flush). קריאה שנייה על אותו tracker = no-op.
  function flush(reason) {
    const snap = state.flush();
    cleanupListeners();
    if (!snap) return null;               // כבר נשלח (route_change+pagehide race וכו')
    let bot = false;
    try { bot = !!isBotFn(); } catch { bot = false; }
    if (bot) return null;                 // הגנה כפולה — גם אם botSkip הראשוני היה שגוי
    const payload = {
      p_sod_id: getSodIdFn(),
      p_surface: "page",
      p_event_type: "engagement",
      p_path: path,
      p_session_id: sessionIdFn(),
      p_app_context: appContextFn(),
      p_is_bot: false,
      p_props: {
        ...snap,
        flush_reason: reason,
        engagement_version: ENGAGEMENT_VERSION,
        idle_threshold_ms: idleThresholdMs,
      },
    };
    try { sendFn(payload, reason); } catch { /* לעולם לא שובר גלישה */ }
    return payload;
  }

  return { path, flush, _state: state, _onScroll: onScroll, _onActivity: onActivity, _onVisibilityChange: onVisibilityChange };
}

// ── תעבורה בפועל (לא נוגעת בליבה) ──────────────────────────────────────────
function postViaBeaconOrFetch(payload) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(RPC_URL, blob)) return;
    }
  } catch { /* נופלים ל-fetch */ }
  try {
    fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // נשלח גם אם המשתמש עוזב את הדף (precedent: marketing.js sendCAPI)
    }).catch(() => {});
  } catch { /* לעולם לא שובר גלישה */ }
}

function defaultSend(payload, reason) {
  if (reason === "route_change") {
    // הדף עדיין פתוח — אין דחיפות; אותו נתיב בדיוק כמו events.js emit().
    if (!supabase) return;
    try { supabase.rpc("ingest_event", payload).then(() => {}).catch(() => {}); }
    catch { /* ignore */ }
  } else {
    // pagehide — הדף עשוי להיסגר תוך-כדי; דורש מסירה-מובטחת-אחרי-עזיבה.
    postViaBeaconOrFetch(payload);
  }
}

// ── סינגלטון מודול-רמה: page-instance פעיל אחד. route change סוגר את הקודם. ──
let activeTracker = null;

export function startPageEngagement(path, deps) {
  if (activeTracker) activeTracker.flush("route_change");
  activeTracker = createPageEngagementTracker(path, deps);
  return activeTracker;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (activeTracker) activeTracker.flush("pagehide");
  });
}
