// Speed centre projection (ZURIEL 17.11.2026, /2029/control "מהירות וביצועים"). Pure functions over what the existing readers already return:
// admin_2029_analytics (Traffic Intelligence; web_vitals incl. the speed watch heartbeat and open findings) and the performance consolidation
// map (docs/reviews/unified-performance-consolidation-20261031.json, current_state_20261117). It owns no collector, store, threshold policy
// or decision: Google's published Web Vitals thresholds come from the reader when present (the same numbers as fallbacks), and the system
// only observes, explains and suggests. A missing or failed source is never shown as zero or as "fine".
export const SPEED_MIN_SAMPLES = 20;          // the same floor the speed watch uses before it speaks about a window
export const SPEED_SAMPLE_STALE_HOURS = 6;    // no sample for this long while the site has visitors = a measurement gap
export const SPEED_WATCH_STALE_HOURS = 2;     // the watch runs hourly inside the 15-minute health watch
export const POST_FRESHNESS_STALE_MINUTES = 45;   // the post document freshness watch runs every 15 minutes inside the same health watch

export const SPEED_METRICS = Object.freeze([
  { key: "lcp", label: "LCP", name: "התוכן הראשי מופיע", p75: "lcp_ms", ms: true, good: ["lcp_good_max_ms", 2500], poor: ["lcp_poor_above_ms", 4000] },
  { key: "inp", label: "INP", name: "תגובה ללחיצה", p75: "inp_ms", ms: true, good: ["inp_good_max_ms", 200], poor: ["inp_poor_above_ms", 500] },
  { key: "cls", label: "CLS", name: "קפיצות בדף", p75: "cls", ms: false, good: ["cls_good_max", 0.1], poor: ["cls_poor_above", 0.25] },
  { key: "fcp", label: "FCP", name: "משהו ראשון מופיע", p75: "fcp_ms", ms: true, good: ["fcp_good_max_ms", 1800], poor: ["fcp_poor_above_ms", 3000] },
  { key: "ttfb", label: "TTFB", name: "המתנה לשרת", p75: "ttfb_ms", ms: true, good: ["ttfb_good_max_ms", 800], poor: ["ttfb_poor_above_ms", 1800] },
]);

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const num = value => (finite(value) ? Number(value) : null);
const time = value => (value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null);
const hoursSince = (at, now) => (time(at) == null ? null : (now - time(at)) / 3600e3);
const minutesSince = (at, now) => (time(at) == null ? null : Math.round((now - time(at)) / 60e3));
// Findings that mean a measurement or a protection stopped working, not a slower number.
const CRITICAL_FINDINGS = new Set(["web_vitals_measurement_gap", "post_document_purge_failed"]);

/** good / needs / poor against the thresholds, or unknown without a value. */
export function speedRating(value, good, poor) {
  if (!finite(value)) return "unknown";
  const v = Number(value);
  return v <= good ? "good" : v > poor ? "poor" : "needs";
}

/** One row per metric: p75, its own sample count, the good share and the rating; "few" when the metric has fewer samples than the floor. */
export function speedMetricRows(webVitals) {
  const t = webVitals?.thresholds || {};
  return SPEED_METRICS.map(metric => {
    const good = num(t[metric.good[0]]) ?? metric.good[1];
    const poor = num(t[metric.poor[0]]) ?? metric.poor[1];
    const p75 = num(webVitals?.p75?.[metric.p75]);
    const samples = num(webVitals?.sample_counts?.[metric.key]);
    const goodPct = num(webVitals?.good_rate_pct?.[metric.key]);
    const enough = samples == null ? (num(webVitals?.samples) ?? 0) >= SPEED_MIN_SAMPLES : samples >= SPEED_MIN_SAMPLES;
    return { ...metric, good, poor, p75, samples, goodPct, enough, rating: enough ? speedRating(p75, good, poor) : "few" };
  });
}

/** The build a sample came from, named only by verified evidence (the map's build_evidence); anything else stays unknown. */
export function speedBuildLabel(build, evidence = []) {
  if (!build || build === "unknown") return { known: false, label: "לא ידוע (דגימה בלי שדה גרסה)" };
  const row = (Array.isArray(evidence) ? evidence : []).find(item => item?.build === build);
  return row ? { known: true, label: `${row.sha?.slice(0, 9) || "?"} · ${row.deployment || "?"}`, row } : { known: false, label: "גרסה שאין לה ראיה מאומתת" };
}

/** What a fix has proved, in the order the centre shows it: merged, deployed, verified live, measured (field / lab / budget). */
export function speedFixState(fix) {
  const deployed = fix?.deployed === true;
  const live = fix?.live_verified === "yes";
  const kind = fix?.measurement?.kind || "none";
  const group = !fix?.merged ? "open" : !deployed ? "merged" : kind === "field" ? "measured" : "awaiting";
  return {
    group, merged: Boolean(fix?.merged), deployed, live, measurement: kind,
    label: group === "open" ? "לא מוזג" : group === "merged" ? "מוזג, לא נפרס" : group === "measured" ? "באתר, נמדד אצל גולשים"
      : "באתר, ממתין למדידת השפעה",
  };
}

/**
 * What needs attention now, most serious first. A failed read, an absent metric, a stale sample, a watch that stopped and an open finding are
 * all attention — none of them is "ok".
 */
export function speedAttention({ read = {}, now = Date.now(), fixes = [] } = {}) {
  const items = [];
  const add = (level, key, title, detail = "") => items.push({ level, key, title, detail });
  if (read.error) add("critical", "source", "קריאת המדידות נכשלה", "לא מוצגת מדידה של אפס. אפשר לרענן; אם זה חוזר, המקור (admin_2029_analytics) אינו זמין.");
  const w = read.data?.web_vitals;
  if (!read.error && read.data && !w) add("warn", "no-vitals", "המקור לא החזיר מדדי מהירות");
  if (w) {
    const samples = num(w.samples) ?? 0;
    if (samples === 0) add("warn", "no-samples", "אין דגימות מהירות בחלון הזה", "אין כאן הוכחה למהירות טובה או גרועה.");
    else if (samples < SPEED_MIN_SAMPLES) add("info", "few-samples", `רק ${samples} דגימות בחלון`, "מעט מדי כדי לקבוע מצב; מוצג כתצפית בלבד.");
    const since = hoursSince(w.latest_sample_at, now);
    if (since != null && since > SPEED_SAMPLE_STALE_HOURS) add("warn", "stale-sample", `המדידה האחרונה מלפני ${Math.round(since)} שעות`, "ייתכן שהאיסוף נעצר. חוסר מדידה אינו מהירות תקינה.");
    if (w.latest_sample_at === undefined) add("info", "reader-old", "המקור עוד לא מחזיר זמן מדידה וחלוקות", "החלק המורחב של admin_2029_analytics לא זמין; מוצגים רק הנתונים הבסיסיים.");
    const watch = w.watch;
    if (w.latest_sample_at !== undefined && !watch) add("warn", "watch-missing", "בדיקת הנסיגות עוד לא רצה", "fn_web_vitals_watch רצה פעם בשעה בתוך בדיקת הבריאות הקיימת.");
    if (watch) {
      const age = hoursSince(watch.computed_at || watch.checked_at, now);
      if (age != null && age > SPEED_WATCH_STALE_HOURS) add("warn", "watch-stale", `בדיקת הנסיגות לא רצה ${Math.round(age)} שעות`, "הבדיקה אמורה לרוץ פעם בשעה. נתון שלא התעדכן אינו מצב תקין.");
    }
    const open = Array.isArray(w.watch_open) ? w.watch_open : [];
    for (const finding of open) {
      add(CRITICAL_FINDINGS.has(finding.detector) ? "critical" : "warn", `finding-${finding.id}`, finding.title || "ממצא פתוח של בדיקת המהירות", finding.reason || "");
    }
    // Post document freshness (ZURIEL 17.11.2026): the database watch confirms every purge the CDN was asked for. Absent = the reader does not
    // report it (not active in the database); null = active but the watch has not run yet. A failed purge is attention even after its
    // suggestion was dismissed, but is not listed twice while that suggestion is open.
    const fresh = w.post_document_freshness;
    if (fresh === null) add("warn", "freshness-missing", "בדיקת עדכניות הפוסטים עוד לא רצה", "fn_post_document_freshness_watch רצה כל 15 דקות בתוך בדיקת הבריאות הקיימת.");
    else if (fresh && typeof fresh === "object") {
      const minutes = minutesSince(fresh.computed_at, now);
      if (minutes != null && minutes > POST_FRESHNESS_STALE_MINUTES) add("warn", "freshness-stale", `בדיקת עדכניות הפוסטים לא רצה ${minutes} דקות`, "היא אמורה לרוץ כל 15 דקות. נתון שלא התעדכן אינו מצב תקין.");
      const failed = num(fresh.purges_failed) ?? 0;
      if (failed > 0 && !open.some(f => f.detector === "post_document_purge_failed"))
        add("critical", "freshness-failed", `ניקוי המטמון נכשל ב־${failed} שינויי פוסטים ב־24 השעות האחרונות`, "שכבת הקצה עדיין לא מגישה עותק של פוסט שהשתנה במשך 20 דקות, אבל הניקוי המהיר לא עובד.");
      if (fresh.purge_configured === false && (num(fresh.changes_24h) ?? 0) > 0 && !open.some(f => f.detector === "post_document_purge_not_configured"))
        add("warn", "freshness-not-configured", "ניקוי המטמון בשינוי פוסט אינו מוגדר", "אין מפתח ניקוי במסד; הגולשים מוגנים בשכבת הקצה (20 דקות) ובתפוגה (6 דקות).");
    }
    for (const row of speedMetricRows(w)) if (row.enough && row.rating === "poor") add("warn", `poor-${row.key}`, `${row.label} p75 במצב גרוע`, `${row.name}: ${row.p75} לעומת סף "גרוע" ${row.poor}.`);
    const cov = w.context_coverage;
    if (cov && samples > 0 && finite(cov.build) && Number(cov.build) / samples < 0.5)
      add("info", "coverage", `רק ${Math.round((100 * Number(cov.build)) / samples)}% מהדגימות נושאות גרסה ומכשיר`, "דגימות ישנות (לפני 16.11.2026 בערב) נשארות 'לא ידוע'.");
  }
  const awaiting = (Array.isArray(fixes) ? fixes : []).filter(fix => speedFixState(fix).group === "awaiting").length;
  if (awaiting) add("info", "awaiting", `${awaiting} תיקונים באתר ממתינים למדידת השפעה אצל גולשים`, "יש להם הוכחת פריסה או בדיקת מעבדה, אבל עוד לא מדידת שטח לפני/אחרי.");
  const rank = { critical: 0, warn: 1, info: 2 };
  return items.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** The read's own times, kept apart: when the screen read the source, and when the newest measurement inside it was taken. */
export function speedReadTimes(read, now = Date.now()) {
  const w = read?.data?.web_vitals;
  return {
    readAt: read?.readAt || null,
    latestSampleAt: w?.latest_sample_at || null,
    latestSampleHours: hoursSince(w?.latest_sample_at, now),
    windowFrom: read?.data?.meta?.from || null,
    windowTo: read?.data?.meta?.to || null,
    hours: num(read?.data?.meta?.hours),
    samples: num(w?.samples),
    withContext: num(w?.context_coverage?.build),
  };
}
