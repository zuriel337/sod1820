// G3_RELIABILITY_PRECLOSE — עץ-תקריות-ריצה אחד, פרטי ומוגבל, בדפדפן.
// window.error + unhandledrejection + ErrorBoundary מתכנסים לאותו capture ולאותו track("runtime_error", …)
// הקיים (→ events דרך ingest_event). אין store חדש. הלוגיקה טהורה ובלי imports כדי שתיבדק ב-node.
// פרטיות: מסירים query/hash מכל URL/נתיב, מסתירים אימיילים/טוקנים/מספרים ארוכים, וחותכים כל שדה.
// מוגבל: dedupe לפי טביעת-אצבע, תקרה לדקה ולסשן. לעולם לא זורק ולא משנה התנהגות גלישה.

export const RUNTIME_ERROR_LIMITS = Object.freeze({
  perSession: 10,   // סה"כ דיווחים לטעינת-דף
  perMinute: 3,     // קצב
  perFingerprint: 1 // אותה שגיאה מדווחת פעם אחת בלבד
});

export const RUNTIME_ERROR_FIELD_LIMITS = Object.freeze({ message: 240, name: 80, source: 160, route: 160, stack: 600 });

const IGNORED = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection/i;

// URL → origin-less path בלי query/hash. כל דבר אחר נחתך.
export function sanitizeRoute(value, max = RUNTIME_ERROR_FIELD_LIMITS.route) {
  let s = String(value ?? "");
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
  s = s.split(/[?#]/)[0];
  return s.slice(0, max);
}

// טקסט חופשי (הודעת שגיאה / stack) → בלי PII/סודות. הסדר חשוב: URLs קודם, אחר כך אימיילים/טוקנים.
export function sanitizeText(value, max = RUNTIME_ERROR_FIELD_LIMITS.message) {
  let s = String(value ?? "");
  s = s.replace(/https?:\/\/[^\s"'<>)]+/gi, (u) => sanitizeRoute(u) || "[url]");
  s = s.replace(/[?&][\w.%-]+=[^\s&"'<>)]*/g, "");
  s = s.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]");
  s = s.replace(/\b(?:eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*|[A-Za-z0-9_-]{32,})\b/g, "[token]");
  s = s.replace(/\b\d{7,}\b/g, "[num]");
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

// meta מותר אך ורק מ-allowlist; שום payload חופשי לא עובר.
export function buildIncidentMeta(message, meta = {}) {
  const L = RUNTIME_ERROR_FIELD_LIMITS;
  const out = { message: sanitizeText(message || "unknown", L.message) };
  if (meta.name) out.name = sanitizeText(meta.name, L.name);
  if (meta.source) out.source = sanitizeRoute(meta.source, L.source);
  if (Number.isFinite(meta.line)) out.line = meta.line;
  if (Number.isFinite(meta.col)) out.col = meta.col;
  if (meta.component_stack) out.component_stack = sanitizeText(meta.component_stack, L.stack);
  return out;
}

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
      const msg = sanitizeText(message || "unknown", RUNTIME_ERROR_FIELD_LIMITS.message);
      if (IGNORED.test(msg)) return false;
      const fp = fingerprint(kind, msg, meta.source);
      if (seen.has(fp)) return false;
      if (total >= RUNTIME_ERROR_LIMITS.perSession) return false;
      const t = now();
      if (t - windowStart >= 60000) { windowStart = t; inWindow = 0; }
      if (inWindow >= RUNTIME_ERROR_LIMITS.perMinute) return false;
      seen.add(fp); total++; inWindow++;
      report(kind, msg, buildIncidentMeta(msg, meta));
      return true;
    } catch { return false; }
  };
}

// capture משותף לכל שלושת המקורות (window.error · unhandledrejection · ErrorBoundary) — תקרה אחת.
let shared = null;
export function getSharedCapture(report, win = typeof window !== "undefined" ? window : null) {
  if (shared) return shared;
  shared = createRuntimeErrorCapture((kind, message, meta) => {
    const route = sanitizeRoute(win?.location?.pathname ?? "");
    report("runtime_error", route || null, kind, meta);
  });
  return shared;
}
export function _resetSharedCaptureForTests() { shared = null; installed = false; }

let installed = false;

// report(section, slug, eventType, meta) — מוזרק (track) כדי לא לייבא supabase לתוך הליבה הטהורה.
export function installRuntimeErrorCapture(report, win = typeof window !== "undefined" ? window : null) {
  if (installed || !win?.addEventListener) return false;
  installed = true;
  const capture = getSharedCapture(report, win);
  win.addEventListener("error", (e) => {
    // שגיאות טעינת משאב (img/script) מגיעות בלי e.message — מדווחים רק שגיאות JS.
    if (!e || !e.message) return;
    capture("window_error", e.message, {
      name: e.error?.name || "Error",
      source: e.filename || "",
      line: e.lineno ?? null,
      col: e.colno ?? null,
    });
  });
  win.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason;
    capture("unhandled_rejection", r?.message ?? (typeof r === "string" ? r : "unhandled rejection"), {
      name: r?.name || "Rejection",
    });
  });
  return true;
}
