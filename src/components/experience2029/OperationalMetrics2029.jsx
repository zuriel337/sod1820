import React, { useEffect, useMemo, useState } from "react";
import { getGaInsights, getVercelInsights, getSearchConsole } from "../../lib/visits.js";
import { get2029Analytics } from "../../lib/analytics2029.js";
import { SPEED_MIN_SAMPLES, speedAttention, speedBuildLabel, speedFixState, speedMetricRows, speedReadTimes } from "../../lib/speedCentre2029.js";
import { current_state_20261117 as consolidationNow } from "../../../docs/reviews/unified-performance-consolidation-20261031.json";

const number = v => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("he-IL", { maximumFractionDigits: 3 });
const clock = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const ago = hours => hours == null ? "" : hours < 1 / 60 ? "עכשיו" : hours < 1 ? `לפני ${Math.round(hours * 60)} דקות` : `לפני ${Math.round(hours * 10) / 10} שעות`;
const share = v => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "—" : `${(Number(v) * 100).toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`;
const sumOf = (rows, key) => Array.isArray(rows) && rows.length ? rows.reduce((total, row) => total + (Number(row?.[key]) || 0), 0) : null;
// A provider day ("20261118" from GA4, "2026-11-18" from Search Console) as the day it measured — the data window, not the moment of reading.
const providerDay = v => { const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(String(v ?? "")); return m ? `${m[3]}/${m[2]}/${m[1]}` : null; };
const providerWindow = (first, last, note) => providerDay(first) && providerDay(last) ? `טווח הנתונים: ${providerDay(first)}–${providerDay(last)} (${note})` : "הספק לא החזיר טווח נתונים";
const RATING = { good: "טוב", needs: "בינוני", poor: "גרוע", few: "מעט דגימות", unknown: "אין נתון" };
const LEVEL = { critical: "דחוף", warn: "לתשומת לב", info: "מידע" };
const SURFACE = { home: "דף הבית", post: "פוסטים", community: "קהילה", other: "שאר הדפים" };
const DEVICE = { mobile: "נייד", desktop: "מחשב", unknown: "לא ידוע" };
const ARTICLE_FIRST = { none: "בלי מאמר במסמך", served: "המאמר הוגש במסמך", adopted: "המאמר אומץ", replaced: "המאמר הוחלף", unknown: "לא ידוע" };
const MEASURE = { field: "מדידת גולשים", lab: "בדיקת מעבדה", budget: "תקציב קוד", none: "בלי מדידה" };
const WINDOWS = [[24, "24 שעות"], [168, "7 ימים"], [672, "28 ימים"]];

function MetricsCard({ title, state, children }) {
  return <section className="sod29-card" aria-label={title}>
    <h3>{title}</h3>
    {state.loading ? <p role="status">קורא את המקור…</p>
      : state.error ? <p role="alert">קריאת המקור נכשלה. לא מוצגת מדידה של אפס.</p>
      : state.data?.collecting === false ? <p>החיבור מוגדר, אבל אין איסוף: האתר אינו טוען את רכיב המדידה של הספק, ולכן הספק לא החזיר נתונים. אין בכך מדידה של אפס.</p>
      : state.data?.configured === false ? <p>החיבור אינו מוגדר בשרת. {state.data.missing === "VERCEL_API_TOKEN" ? "נדרש מפתח קריאה של Vercel בהגדרות השרת." : "יש להשלים את הגדרת הספק הקיימת."}</p>
      : state.data ? children(state.data, state) : <p>לא התקבל מידע מהמקור.</p>}
  </section>;
}

// The speed centre and the existing provider readers, lazily, only for a verified administrator in /2029/control. It owns no collector,
// store or cache: the speed part reads admin_2029_analytics (Traffic Intelligence, incl. the speed watch's heartbeat and open findings) and
// the performance consolidation map; Google Analytics, Vercel and Search Console are read only when "מדידה וגוגל" is opened.
export default function OperationalMetrics2029({ principal, refreshToken = 0, providersOpen = false }) {
  return principal ? <OperationalMetricsBody key={principal} principal={principal} refreshToken={refreshToken} providersOpen={providersOpen}/> : null;
}

function OperationalMetricsBody({ principal, refreshToken, providersOpen }) {
  const [hours, setHours] = useState(24);
  const [ownRefresh, setOwnRefresh] = useState(0);
  const [rum, setRum] = useState({ loading: true, startedAt: Date.now() });
  const [providers, setProviders] = useState({});
  const [, setTick] = useState(0);

  // The speed reader: every refresh (this section's, the page's "רענן", a new window) really reads the source again. The previous reading
  // stays on screen, named as previous, until the new one answers; a failed refresh keeps it and says so.
  useEffect(() => {
    const controller = new AbortController();
    setRum(current => ({ ...current, loading: true, error: false, startedAt: Date.now() }));
    Promise.resolve().then(() => get2029Analytics({ hours, signal: controller.signal, expectedUserId: principal })).then(data => {
      if (controller.signal.aborted) return;
      if (!data || data.error) throw new Error("source_unavailable");
      setRum({ loading: false, data, readAt: new Date().toISOString(), hours });
    }).catch(() => {
      if (!controller.signal.aborted) setRum(current => ({ ...current, loading: false, error: true, failedAt: new Date().toISOString() }));
    });
    return () => controller.abort();
  }, [principal, hours, refreshToken, ownRefresh]);

  // Operation Visibility Law: a live counter while the source is read.
  useEffect(() => {
    if (!rum.loading) return undefined;
    const id = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(id);
  }, [rum.loading]);

  useEffect(() => {
    if (!providersOpen) return undefined;
    const controller = new AbortController(), options = { signal: controller.signal, expectedUserId: principal };
    const reads = { ga: () => getGaInsights(28, options), vercel: () => getVercelInsights(30, options), gsc: () => getSearchConsole(90, options) };
    setProviders(Object.fromEntries(Object.keys(reads).map(key => [key, { loading: true }])));
    for (const [key, read] of Object.entries(reads)) Promise.resolve().then(read).then(data => {
      if (controller.signal.aborted) return;
      if (!data || data.error) throw new Error("source_unavailable");
      setProviders(current => ({ ...current, [key]: { loading: false, data, readAt: new Date().toISOString() } }));
    }).catch(() => {
      if (!controller.signal.aborted) setProviders(current => ({ ...current, [key]: { loading: false, error: true } }));
    });
    return () => controller.abort();
  }, [principal, providersOpen, refreshToken]);

  const now = Date.now();
  const w = rum.data?.web_vitals || null;
  const fixes = Array.isArray(consolidationNow?.fixes) ? consolidationNow.fixes : [];
  const attention = useMemo(() => speedAttention({ read: rum, now, fixes }), [rum, fixes, now]);
  const rows = useMemo(() => speedMetricRows(w), [w]);
  const times = speedReadTimes(rum, now);
  const elapsed = rum.loading && rum.startedAt ? Math.max(0, Math.round((now - rum.startedAt) / 1000)) : 0;
  const rumState = rum.loading && !rum.data ? { loading: true } : rum.error && !rum.data ? { error: true } : { data: rum.data };

  return <>
    <section className="sod29-section" data-experience-capability="speed-centre" aria-label="מהירות וביצועים">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">SPEED · מרכז הבקרה</div><h2>מהירות וביצועים</h2>
          <p className="sod29-muted">מדידת פתיחת דף אצל גולשים אמיתיים (RUM של האתר), לא CrUX ולא מעבר פנימי בין דפים. נתון חסר, ישן או כשל אינם אפס ואינם "תקין".</p></div>
        <div className="sod29-actions" role="group" aria-label="חלון המדידה">
          {WINDOWS.map(([value, label]) => <button key={value} type="button" className="sod29-chip" aria-pressed={hours === value} onClick={() => setHours(value)} data-speed-window={value}>{label}</button>)}
          <button type="button" className="sod29-action" onClick={() => setOwnRefresh(value => value + 1)} disabled={rum.loading} data-speed-refresh="true">{rum.loading ? `קורא… ${elapsed} שניות` : "רענן מדידה"}</button>
        </div>
      </div>

      <p className="sod29-muted" role="status" data-speed-read-times="true">
        {rum.loading ? <>קורא את המקור ({elapsed} שניות). </> : null}
        {rum.error ? <>הקריאה האחרונה נכשלה ב־{clock(rum.failedAt)}. </> : null}
        {times.readAt ? <>המקור נקרא: {clock(times.readAt)}{rum.loading || rum.error ? " (קריאה קודמת)" : ""} · </> : null}
        {times.latestSampleAt ? <>המדידה האחרונה בתוכו: {clock(times.latestSampleAt)} ({ago(times.latestSampleHours)}) · </> : rum.data ? <>זמן המדידה האחרונה לא זמין · </> : null}
        {rum.data ? <>חלון: {times.hours ? `${number(times.hours)} שעות` : "—"} ({clock(times.windowFrom)} עד {clock(times.windowTo)}) · {number(times.samples)} דגימות{times.withContext != null ? `, מהן ${number(times.withContext)} עם גרסה ומכשיר` : ""}</> : null}
      </p>
      <p className="sod29-muted">רענון מוצלח של המסך מוכיח שהמקור נקרא, לא שהנתונים בתוכו טריים: לכן שני הזמנים מוצגים בנפרד.</p>

      <div aria-label="מה דורש תשומת לב" data-speed-attention={attention.length}>
        <h3>מה דורש תשומת לב</h3>
        {rum.loading && !rum.data ? <p role="status">קורא את המקור…</p>
          : attention.length ? <div className="sod29-list">{attention.map(item => <div className="sod29-row" key={item.key} data-speed-attention-item={item.key} data-level={item.level}>
            <div><strong>{item.title}</strong>{item.detail ? <small>{item.detail}</small> : null}</div>
            <div className="sod29-actions"><span className="sod29-chip">{LEVEL[item.level]}</span></div>
          </div>)}</div>
          : <p>אין כרגע ממצא פתוח במקורות שנקראו. זה מצב המדידה בחלון הזה, לא הבטחה.</p>}
      </div>

      {rum.data ? <>
        <h3>המצב שנמדד עכשיו · p75</h3>
        {!w ? <p>המקור לא החזיר מדדי מהירות.</p> : <div className="sod29-grid" data-speed-metrics="true">
          {rows.map(row => <div className="sod29-card" key={row.key} data-speed-metric={row.key} data-rating={row.rating}>
            <div className="sod29-kicker">{row.label} · {row.name}</div>
            <h3 dir="ltr">{row.p75 == null ? "—" : row.ms ? `${number(Math.round(row.p75))} ms` : number(Math.round(row.p75 * 1000) / 1000)}</h3>
            <p><span className="sod29-chip">{RATING[row.rating]}</span> {row.goodPct != null ? <>· {number(row.goodPct)}% מהדגימות בטווח "טוב"</> : null}</p>
            <p className="sod29-muted">{row.samples != null ? `${number(row.samples)} דגימות למדד הזה` : "מספר הדגימות למדד לא זמין"}{!row.enough ? ` (פחות מ־${SPEED_MIN_SAMPLES}: תצפית בלבד)` : ""} · טוב עד {row.ms ? `${number(row.good)} ms` : row.good}, גרוע מעל {row.ms ? `${number(row.poor)} ms` : row.poor}</p>
          </div>)}
        </div>}

        <WatchBlock watch={w?.watch} />
        {w ? <FreshnessBlock fresh={w.post_document_freshness} /> : null}

        <details data-speed-breakdowns="true">
          <summary>פירוט: סוג דף, מכשיר, גרסה, המאמר במסמך, ההמתנה לשרת והדפים עם הכי הרבה מדידות</summary>
          <p className="sod29-muted">כל קבוצה היא תצפית באותו חלון. השוואה בין קבוצות אינה הוכחת לפני/אחרי: תמהיל הדפים, המכשירים והזמנים שונה.</p>
          <Breakdown title="לפי סוג דף" rows={w?.by_surface} keyName="surface" labels={SURFACE} />
          <Breakdown title="לפי מכשיר" rows={w?.by_device} keyName="device" labels={DEVICE} />
          <Breakdown title="לפי גרסה (קובץ הכניסה של הבנייה, לא Git SHA)" rows={w?.by_build} keyName="build"
            label={row => { const b = speedBuildLabel(row.build, consolidationNow?.build_evidence); return `${row.build === "unknown" ? "" : row.build + " · "}${b.label}${row.mobile_samples != null ? ` · נייד ${number(row.mobile_samples)} / מחשב ${number(row.desktop_samples)}` : ""}`; }} />
          <Breakdown title="פוסטים: המאמר במסמך הראשון" rows={w?.by_article_first} keyName="article_first" labels={ARTICLE_FIRST} />
          <NavTiming nav={w?.nav_timing_p75} />
          <div><h4>הדפים עם הכי הרבה מדידות</h4>
            {Array.isArray(w?.routes_by_samples) && w.routes_by_samples.length ? w.routes_by_samples.map(r => <div className="sod29-row" key={r.path}>
              <div><strong><bdi>{r.path}</bdi></strong><small dir="ltr">LCP {number(r.lcp_p75_ms && Math.round(r.lcp_p75_ms))} ms · CLS {number(r.cls_p75 && Math.round(r.cls_p75 * 1000) / 1000)} · TTFB {number(r.ttfb_p75_ms && Math.round(r.ttfb_p75_ms))} ms</small></div>
              <div className="sod29-actions"><span className="sod29-chip">{number(r.samples)} דגימות</span></div>
            </div>) : <p className="sod29-muted">לא זמין מהמקור.</p>}
          </div>
        </details>
      </> : rum.error ? <p role="alert">קריאת המקור נכשלה. לא מוצגת מדידה של אפס.</p> : null}

      <FixesBlock state={consolidationNow} />

      <details>
        <summary>איך לקרוא הוכחה כאן</summary>
        <ul>
          <li><strong>מדידת גולשים</strong>: פתיחת דף אמיתית באתר החי (Web Vitals של האתר). השוואת לפני/אחרי תקפה רק בחלונות שאינם חופפים, באותה קבוצה (סוג דף ומכשיר) ועם מספיק דגימות לכל מדד. חלון 24 שעות וחלון 7 ימים חופפים, ולכן אינם השוואה.</li>
          <li><strong>בדיקת מעבדה</strong>: אותו קוד בנוי, אותה רשת ומעבד מואטים, מספר ריצות קבוע. מראה כיוון, לא את מה שגולשים חווים.</li>
          <li><strong>תקציב קוד ומניעת נסיגה</strong>: בדיקות הבנייה (scripts/test-2029-shell-budget.mjs על הבנייה הרגילה ועל תוצר הפרסום) שמונעות גדילה של הקוד שכל דף טוען.</li>
          <li><strong>הוכחת פריסה</strong>: הקומיט שמוגש באתר החי נקרא מהמסמך עצמו; תיקון נחשב "באתר" רק אם הוא חלק מהקומיט הזה.</li>
        </ul>
      </details>
    </section>

    {providersOpen ? <section className="sod29-section" data-experience-capability="existing-traffic-provider-readers">
      <h2>מדידה וגוגל</h2>
      <p className="sod29-muted">כל מקור מוצג בנפרד ובטווח שלו. נתוני Google ו־Vercel אינם הוכחת זהות אנושית. נתון חסר או כשל אינם אפס.</p>
      <div className="sod29-grid">
        <MetricsCard title="Google Analytics · 28 ימים" state={providers.ga || { loading: true }}>{(d, s) => <>
          <p>משתמשים (totalUsers): {number(d.totals?.users)} · ביקורים (sessions): {number(d.totals?.sessions)} · צפיות בדפים: {number(d.totals?.views)}</p>
          <p>ביקורים מעורבים: {number(d.totals?.engagedSessions)} · שיעור מעורבות: {share(d.totals?.engagementRate)} · משתמשים פעילים כעת: {number(d.realtime)}</p>
          <p className="sod29-muted">{providerWindow(d.daily?.[0]?.key, d.daily?.at?.(-1)?.key, "היום נכלל עד כה, חלקי")} · נקרא מ־Google: {clock(s.readAt)}</p>
          {d.channels?.length ? <details><summary>ערוצי הגעה (GA4)</summary>{d.channels.slice(0, 8).map(c => <p key={c.key}><bdi>{c.key}</bdi> · {number(c.value)}</p>)}</details> : null}
          <p className="sod29-muted">מקור: GA4_MEASURED. הנתונים נשמרים כפי שנמדדו אצל Google, בנפרד מהמדידה של האתר; אין לחבר את המספרים.</p>
        </>}</MetricsCard>
        <MetricsCard title="Vercel Analytics · 30 ימים" state={providers.vercel || { loading: true }}>{(d, s) => <>
          <p>מבקרים שנמדדו: {number(d.totals?.visitors)} · צפיות: {number(d.totals?.pageviews)}</p>
          <p className="sod29-muted">נקרא מ־Vercel: {clock(s.readAt)}</p>
        </>}</MetricsCard>
        <MetricsCard title={`פעילות באתר · ${number(rum.data?.meta?.hours ?? hours)} שעות`} state={rumState}>{d => {
          const t = d.identified_traffic;
          if (!t) return <p>חיבור הביקורים והחשבונות טרם הופעל במסד.</p>;
          return <>
            <p>צפיות: {number(t.summary?.views)} · ביקורים: {number(t.summary?.sessions)} · דפדפנים: {number(t.summary?.browsers)} · חשבונות: {number(t.summary?.accounts)} · פעולות: {number(t.summary?.actions)}</p>
            <p className="sod29-muted">הדוח כולל את האירועים החדשים מאז הפעלת החיבור. דפדפן אינו אדם מזוהה; שיוך לחשבון נקבע בזמן הפעולה. אין חיבור בדיעבד של פעילות אורח לחשבון. שעות לפי ישראל.</p>
            {!t.first_event && <p>עדיין אין אירועים בחיבור החדש בטווח הזה.</p>}
            {t.summary?.unidentified_events > 0 && <p>אירועים ללא מזהה דפדפן או חשבון: {number(t.summary.unidentified_events)}. הם אינם נספרים כדפדפנים.</p>}
            <details><summary>דפים שנצפו</summary>{t.pages?.map(p => <p key={p.page_path}><bdi>{p.page_path}</bdi> · {number(p.views)} צפיות</p>)}</details>
            <details><summary>מקורות הגעה ופעולות</summary>
              {t.arrivals?.map(a => <p key={a.source}><bdi>{a.source}</bdi> · {number(a.sessions)} ביקורים</p>)}
              {t.actions?.map(a => <p key={`${a.surface}/${a.event_type}`}><bdi>{a.surface} / {a.event_type}</bdi> · {number(a.count)}</p>)}
            </details>
            <details><summary>פירוט פעילות למנהל</summary>
              <p className="sod29-muted">עד 100 רשומות פעילות אחרונות. חשבונות ודפדפני אורחים מוצגים בנפרד, ולכן אין לחבר אותם למספר אנשים.</p>
              {t.visitors?.map(v => <div className="sod29-row" key={v.audience}><div>
                <strong>{v.account_id ? v.account_name || "חשבון מחובר" : "דפדפן אורח"}</strong>
                <small><bdi>{v.audience}</bdi></small>
                <p>{number(v.views)} צפיות · {number(v.actions)} פעולות · {number(v.sessions)} ביקורים · {number(Math.round(v.engaged_ms / 1000))} שניות פעילות</p>
                {v.pages?.map(p => <small key={p.page_path}><bdi>{p.page_path}</bdi> · {number(p.views)}</small>)}
              </div></div>)}
            </details>
          </>;
        }}</MetricsCard>
        <MetricsCard title="Google Search Console · 90 ימים" state={providers.gsc || { loading: true }}>{(d, s) => <>
          <p>קליקים: {number(sumOf(d.timeline, "clicks"))} · חשיפות: {number(sumOf(d.timeline, "impressions"))} · ימים עם נתונים: {number(d.timeline?.length)}</p>
          <p className="sod29-muted">{providerWindow(d.timeline?.[0]?.date, d.timeline?.at?.(-1)?.date, "Google מפרסם את הנתונים באיחור של יומיים־שלושה")} · חיפוש באינטרנט (Web) בלבד בקריאה הזו · נקרא מ־Google: {clock(s.readAt)}</p>
          {d.queries?.length ? <details><summary>שאילתות מובילות</summary>{d.queries.slice(0, 10).map(q => <p key={q.key}><bdi>{q.key}</bdi> · {number(q.clicks)} קליקים · {number(q.impressions)} חשיפות</p>)}</details> : null}
          {d.pages?.length ? <details><summary>דפים מובילים</summary>{d.pages.slice(0, 10).map(p => <p key={p.key}><bdi dir="ltr">{p.key}</bdi> · {number(p.clicks)} קליקים</p>)}</details> : null}
          <p className="sod29-muted">הופעה בדוח חיפוש או במפת האתר אינה הוכחה לכיסוי כל הכתובות.</p>
          {d.indexing?.inspections?.map(item => <div className="sod29-row" key={item.path}>
            <div><strong dir="ltr">{item.path}</strong><small>{item.state === "measured" ? item.coverageState || item.verdict : "בדיקת האינדוקס לא הושלמה מול Google"}</small></div>
          </div>)}
          {d.indexing?.sitemaps?.state === "measured" ? <p>מפות שנמצאו בנכס: {number(d.indexing.sitemaps.rows.length)}</p> : <p>קבלת מפת האתר מול Google טרם אומתה.</p>}
          <p className="sod29-muted">בדיקת אינדוקס מוגבלת לשלוש הכתובות המוצגות; אינה בקשת אינדוקס או קבלה של כל המלאי. נבדק מול Google: {clock(d.indexing?.checkedAt)}</p>
        </>}</MetricsCard>
      </div>
    </section> : null}
  </>;
}

function WatchBlock({ watch }) {
  const STATUS = { ok: "לא נמצאה נסיגה", regression: "נמצאה נסיגה", measurement_gap: "המדידה הפסיקה", insufficient_samples: "מעט מדי דגימות להחלטה" };
  return <details data-speed-watch={watch?.status || "missing"}>
    <summary>בדיקת הנסיגות השעתית: {watch ? `${STATUS[watch.status] || watch.status} · רצה ב־${clock(watch.computed_at || watch.checked_at)}` : "עדיין לא רצה או שהמקור לא מחזיר אותה"}</summary>
    <p className="sod29-muted">רצה פעם בשעה בתוך בדיקת הבריאות הקיימת (fn_health_watch → fn_web_vitals_watch). משווה את 24 השעות האחרונות לשבעת הימים שלפניהן, לכל סוג דף, ומדווחת רק עם 20 דגימות לפחות בחלון הנוכחי ו־40 בקודם. ממצא נרשם פעם אחת בהמלצות המערכת (system_suggestions) ומתעדכן; דחייה משתיקה אותו 30 יום.</p>
    {Array.isArray(watch?.groups) ? <div className="sod29-list">{["all", "home", "post", "community"].map(group => {
      const cur = watch.groups.find(g => g.group === group && g.window === "current"), base = watch.groups.find(g => g.group === group && g.window === "baseline");
      if (!cur && !base) return null;
      return <div className="sod29-row" key={group}><div><strong>{group === "all" ? "כל האתר" : SURFACE[group]}</strong>
        <small dir="ltr">LCP {number(cur?.lcp_p75_ms)} / {number(base?.lcp_p75_ms)} ms · CLS {number(cur?.cls_p75)} / {number(base?.cls_p75)} · INP {number(cur?.inp_p75_ms)} / {number(base?.inp_p75_ms)} ms</small>
        <small>עכשיו / קודם · {number(cur?.samples)} / {number(base?.samples)} דגימות</small></div></div>;
    })}</div> : null}
  </details>;
}

// Post document freshness (ZURIEL 17.11.2026): what the database watch confirmed about the CDN purges of changed Posts. Absent = the reader
// does not report it (not active in the database); null = active, the watch has not run yet. Counts are the last 24 hours.
function FreshnessBlock({ fresh }) {
  const STATUS = { ok: "כל הניקויים אושרו", idle: "לא היו שינויים בפוסטים", purge_failed: "ניקוי נכשל", not_configured: "הניקוי אינו מוגדר" };
  const state = fresh === undefined ? "inactive" : fresh === null ? "missing" : fresh.status || "unknown";
  return <details data-post-freshness={state}>
    <summary>עדכניות פוסטים שנשמרו ב־CDN: {fresh === undefined ? "לא פעילה במסד (המקור לא מחזיר אותה)" : fresh === null ? "הבדיקה עוד לא רצה"
      : `${STATUS[fresh.status] || fresh.status} · רצה ב־${clock(fresh.computed_at)}`}</summary>
    <p className="sod29-muted">כל שינוי בפוסט (עריכה, פרסום, הסתרה, מחיקה, שינוי כתובת) נרשם במסד באותה פעולה ומבקש מחיקה של העותקים השמורים שלו. במשך 20 דקות מהשינוי שכבת הקצה בונה את הפוסט מחדש ולא מעותק, ואם רשימת השינויים לא נקראה ב־5 השניות האחרונות היא לא משתמשת בשום עותק. עותק חי 6 דקות לכל היותר. הבדיקה רצה כל 15 דקות בתוך בדיקת הבריאות הקיימת.</p>
    {fresh ? <div className="sod29-list">
      <div className="sod29-row"><div><strong>שינויים בפוסטים ב־24 שעות</strong><small>השינוי האחרון: {fresh.last_change_at ? clock(fresh.last_change_at) : "—"}</small></div>
        <div className="sod29-actions"><span className="sod29-chip" data-post-freshness-changes="true">{number(fresh.changes_24h)}</span></div></div>
      <div className="sod29-row"><div><strong>ניקויים שאושרו / נכשלו / ממתינים</strong><small>ניקוי שנכשל נוסה שוב פעם אחת ({number(fresh.purges_retried)} ניסיונות חוזרים)</small></div>
        <div className="sod29-actions"><span className="sod29-chip" dir="ltr" data-post-freshness-purges="true">{number(fresh.purges_ok)} / {number(fresh.purges_failed)} / {number(fresh.purges_pending)}</span></div></div>
      <div className="sod29-row"><div><strong>שינויים בלי ניקוי</strong><small>{fresh.purge_configured === false ? "מפתח הניקוי לא מוגדר במסד" : "שינויים שהניקוי שלהם לא אושר"}</small></div>
        <div className="sod29-actions"><span className="sod29-chip">{number(fresh.unpurged_24h)}</span></div></div>
    </div> : null}
  </details>;
}

function Breakdown({ title, rows, keyName, labels = {}, label }) {
  return <div><h4>{title}</h4>
    {Array.isArray(rows) && rows.length ? rows.map(row => <div className="sod29-row" key={row[keyName]}>
      <div><strong>{label ? label(row) : labels[row[keyName]] || <bdi>{row[keyName]}</bdi>}</strong>
        <small dir="ltr">LCP {number(row.lcp_p75_ms)} ms · CLS {number(row.cls_p75)} · INP {number(row.inp_p75_ms)} ms · FCP {number(row.fcp_p75_ms)} ms · TTFB {number(row.ttfb_p75_ms)} ms</small>
        <small>{row.lcp_good_pct != null ? `LCP טוב ב־${number(row.lcp_good_pct)}% · ` : ""}{row.cls_good_pct != null ? `CLS טוב ב־${number(row.cls_good_pct)}% · ` : ""}{clock(row.first_at)} עד {clock(row.latest_at)}</small></div>
      <div className="sod29-actions"><span className="sod29-chip">{number(row.samples)} דגימות{row.samples < SPEED_MIN_SAMPLES ? " · תצפית בלבד" : ""}</span></div>
    </div>) : <p className="sod29-muted">לא זמין מהמקור (החלק המורחב של admin_2029_analytics).</p>}
  </div>;
}

function NavTiming({ nav }) {
  if (!nav) return <div><h4>ההמתנה לשרת (TTFB) לפי חלקים</h4><p className="sod29-muted">לא זמין מהמקור.</p></div>;
  const parts = [["redirect_ms", "הפניות"], ["worker_ms", "Service Worker"], ["dns_ms", "DNS"], ["connect_ms", "התחברות"], ["wait_ms", "המתנה לתשובת השרת"], ["download_ms", "הורדת המסמך"]];
  return <div><h4>ההמתנה לשרת (TTFB) לפי חלקים · p75</h4>
    <p className="sod29-muted">{number(nav.samples)} דגימות עם הפירוט. כל חלק הוא p75 בפני עצמו, ולכן הסכום אינו ה־TTFB. חציון ההמתנה לשרת: {number(nav.wait_p50_ms)} ms.</p>
    <div className="sod29-grid">{parts.map(([key, name]) => <div className="sod29-card" key={key}><div className="sod29-kicker">{name}</div><h3 dir="ltr">{nav[key] == null ? "—" : `${number(nav[key])} ms`}</h3></div>)}</div>
  </div>;
}

function FixesBlock({ state }) {
  const fixes = Array.isArray(state?.fixes) ? state.fixes : [];
  if (!fixes.length) return <div><h3>תיקוני המהירות</h3><p className="sod29-muted">רשימת התיקונים המאוחדת לא נטענה.</p></div>;
  const groups = [["measured", "באתר, ונמדד אצל גולשים"], ["awaiting", "באתר, ממתין למדידת השפעה"], ["merged", "מוזג, עוד לא נפרס"], ["open", "לא מוזג"]];
  const withState = fixes.map(fix => ({ fix, state: speedFixState(fix) }));
  return <div data-speed-fixes={fixes.length}>
    <h3>תיקוני המהירות: מה באתר ומה הוכח</h3>
    <p className="sod29-muted">מקור: docs/reviews/unified-performance-consolidation-20261031 (בדיקת מצב מ־{clock(state.checked_at)} מול main {String(state.main || "").slice(0, 9)} והפריסה החיה). התיעוד ב־work_log הוא הפניה לראיות; המצב נקבע מהקוד, הפריסה והמדידות.</p>
    {groups.map(([group, title]) => {
      const list = withState.filter(item => item.state.group === group);
      return list.length ? <details key={group} open={group !== "measured"} data-speed-fix-group={group}>
        <summary>{title} · {list.length}</summary>
        {list.map(({ fix, state: s }) => <details className="sod29-row" key={fix.id} data-speed-fix={fix.id}>
          <summary><strong>{fix.title_he || fix.id}</strong> <span className="sod29-chip">{s.label}</span>{s.live ? <span className="sod29-chip">אומת בחי</span> : null}<span className="sod29-chip">{MEASURE[s.measurement] || s.measurement}</span></summary>
          <p>{fix.problem}</p>
          <p className="sod29-muted">מקור: {[...(fix.source?.prs || []).map(n => `#${n}`), ...(fix.source?.task_keys || [])].join(" · ") || "—"}{fix.source?.merged_via_pr ? ` · שולב דרך #${fix.source.merged_via_pr}` : ""}{fix.merge_commit ? ` · ${String(fix.merge_commit).slice(0, 9)}` : ""}</p>
          {Array.isArray(fix.code_now) && fix.code_now.length ? <p className="sod29-muted" dir="ltr">{fix.code_now.join(" · ")}</p> : null}
          <p className="sod29-muted">{fix.deployed === true ? `נפרס${fix.deployed_in ? ` (${fix.deployed_in})` : ""}` : fix.deployed === false ? "לא נפרס" : "פריסה לא ידועה"} · {fix.live_verified === "yes" ? `אומת בחי: ${fix.live_evidence || ""}` : "לא אומת בחי"}</p>
          {fix.measurement && fix.measurement.kind !== "none" ? <p className="sod29-muted">{MEASURE[fix.measurement.kind] || fix.measurement.kind}: {fix.measurement.before || "—"} → {fix.measurement.after || "—"} · {fix.measurement.conditions || "תנאים לא תועדו"}{fix.measurement.source ? ` · ${fix.measurement.source}` : ""}</p> : <p className="sod29-muted">אין מדידת לפני/אחרי.</p>}
          {Array.isArray(fix.guard) && fix.guard.length ? <p className="sod29-muted" dir="ltr">מגן: {fix.guard.join(" · ")}</p> : <p className="sod29-muted">אין בדיקה שמגינה מפני חזרה.</p>}
          {fix.open ? <p>חסר: {fix.open}{fix.next_owner ? ` · בעלים להמשך: ${fix.next_owner}` : ""}</p> : null}
        </details>)}
      </details> : null;
    })}
  </div>;
}
