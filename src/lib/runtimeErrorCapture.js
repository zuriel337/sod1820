// G3_RELIABILITY_RUNTIME_CORE_V1 — לכידת שגיאות-ריצה גלובליות בדפדפן.
// אין כאן store חדש: מדווחים דרך track("runtime_error", …) הקיים (אותו surface של ErrorBoundary),
// שכותב ל-events דרך ingest_event. הלוגיקה כאן טהורה ובלי imports כדי שתיבדק ב-node.
// מוגבל: dedupe לפי טביעת-אצבע, תקרה לדקה ולסשן. לעולם לא זורק ולא משנה התנהגות גלישה.

export const RUNTIME_ERROR_LIMITS = Object.freeze({
  perSession: 10,   // סה"כ דיווחים לטעינת-דף
  perMinute: 3,     // קצב
  perFingerprint: 1 // אותה שגיאה מדווחת פעם אחת בלבד
});

const IGNORED = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection/i;

export function fingerprint(kind, message, source) {
  return `${kind}|${String(message || "").slice(0, 160)}|${String(source || "").slice(0, 120)}`;
}

export function createRuntimeErrorCapture(report, now = () => Date.now()) {
  const seen = new Set();
  let total = 0;
  let windowStart = 0;
  let inWindow = 0;

  return function capture(kind, message, meta = {}) {
    try {
      const msg = String(message || "unknown").slice(0, 320);
      if (IGNORED.test(msg)) return false;
      const fp = fingerprint(kind, msg, meta.source);
      if (seen.has(fp)) return false;
      if (total >= RUNTIME_ERROR_LIMITS.perSession) return false;
      const t = now();
      if (t - windowStart >= 60000) { windowStart = t; inWindow = 0; }
      if (inWindow >= RUNTIME_ERROR_LIMITS.perMinute) return false;
      seen.add(fp); total++; inWindow++;
      report(kind, msg, meta);
      return true;
    } catch { return false; }
  };
}

let installed = false;

// report(section, slug, eventType, meta) — מוזרק (track) כדי לא לייבא supabase לתוך הליבה הטהורה.
export function installRuntimeErrorCapture(report, win = typeof window !== "undefined" ? window : null) {
  if (installed || !win?.addEventListener) return false;
  installed = true;
  const capture = createRuntimeErrorCapture((kind, message, meta) => {
    const route = win.location?.pathname ?? null;
    report("runtime_error", route, kind, { message, ...meta });
  });
  win.addEventListener("error", (e) => {
    // שגיאות טעינת משאב (img/script) מגיעות בלי e.message — מדווחים רק שגיאות JS.
    if (!e || !e.message) return;
    capture("window_error", e.message, {
      name: String(e.error?.name || "Error").slice(0, 80),
      source: String(e.filename || "").slice(0, 200),
      line: e.lineno ?? null,
      col: e.colno ?? null,
    });
  });
  win.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason;
    capture("unhandled_rejection", r?.message ?? (typeof r === "string" ? r : "unhandled rejection"), {
      name: String(r?.name || "Rejection").slice(0, 80),
    });
  });
  return true;
}
