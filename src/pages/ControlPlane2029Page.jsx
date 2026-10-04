import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { getCommandCenter, getOperationalTrace, getOperationalTraceList, getSystemHealth, getVideoMapHealth } from "../lib/visits.js";
import { getAdminAttentionFeed, getAdminNotificationChannels, getAdminRetentionPreview, getPendingAdminSuggestions, getAdminBuildIdentity, getAdminReleaseStatus, getCurrentAdminWorkLog } from "../lib/admin/controlPlaneReads.js";
import { CONTROL_VIEWS, emptySource, numeric, readAdminSource, resolveControlView } from "../lib/admin/controlPlaneProjection.js";
import { createVisibleRefresh, dueRefreshKeys } from "../lib/admin/controlPlaneRefresh.js";
import { buildIdentity, sameVersion } from "../lib/admin/releaseProjection.js";
import { AdminMetric as Metric, AdminSources2029, MetricSourceContext, SourceState, SourceStamp } from "../components/experience2029/AdminSource2029.jsx";

const ResourceSimulator2029 = lazy(() => import("../components/experience2029/ResourceSimulator2029.jsx"));
const AdminAttention2029 = lazy(() => import("../components/experience2029/AdminOperations2029.jsx").then(m => ({ default: m.AdminAttention2029 })));
const AdminMedia2029 = lazy(() => import("../components/experience2029/AdminOperations2029.jsx").then(m => ({ default: m.AdminMedia2029 })));
const AdminCleanup2029 = lazy(() => import("../components/experience2029/AdminCleanup2029.jsx"));
const AdminRelease2029 = lazy(() => import("../components/experience2029/AdminRelease2029.jsx"));
const CLIENT_BUILD = buildIdentity(typeof __SOD_ADMIN_BUILD__ === "undefined" ? {} : __SOD_ADMIN_BUILD__);

const READERS = {
  health: () => getSystemHealth(), traces: () => getOperationalTraceList(7, 100), videoMap: () => getVideoMapHealth(),
  command: () => getCommandCenter(), suggestions: getPendingAdminSuggestions, retention: getAdminRetentionPreview,
  notify: getAdminNotificationChannels,
  attention: getAdminAttentionFeed,
  release: getAdminReleaseStatus, build: getAdminBuildIdentity, worklog: getCurrentAdminWorkLog,
};
const initialSources = () => Object.fromEntries(Object.keys(READERS).map(k => [k, emptySource()]));
const VIEW_SOURCES = { attention: ["health", "command", "suggestions", "attention"], monitor: ["health", "traces", "videoMap"], media: ["health", "videoMap", "traces"], cleanup: ["health", "retention"], simulation: ["health"], budget: ["health", "notify"], release: ["release", "worklog"] };

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const num = v => numeric(v) == null ? "לא ידוע" : n(v).toLocaleString("he-IL");
const cost = v => numeric(v) == null ? "—" : `₪${n(v).toFixed(4)}`;
const mib = v => numeric(v) == null ? "—" : `${(n(v) / 1048576).toLocaleString("he-IL", { maximumFractionDigits: 1 })} MiB`;
const gib = v => numeric(v) == null ? "—" : `${(n(v) / 1073741824).toLocaleString("he-IL", { maximumFractionDigits: 2 })} GiB`;
const pct = v => numeric(v) == null ? "—" : `${(n(v) * 100).toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`;
const when = v => v ? new Date(v).toLocaleString("he-IL") : "—";
const certainty = v => v === "exact" ? "מדויק" : v === "estimated" ? "הערכה" : v === "not_billable" ? "לא לחיוב" : "לא ידוע";

function TraceRow({ row, active, open }) {
  return <button type="button" className={`sod29-row${active ? " active" : ""}`}
    onClick={() => open(row.trace_id)} aria-pressed={active}
    style={{ width: "100%", textAlign: "start", cursor: "pointer" }}>
    <div>
      <strong>{row.capability || "interaction"} · {row.surface || "surface"}</strong>
      <small>{when(row.started_at)} · {row.outcome || "תוצאה לא נמסרה"} · {num(row.span_count)} spans</small>
    </div>
    <div className="sod29-actions">
      <span className="sod29-chip">{cost(row.linked_ai_cost_ils)}</span>
      <span className="sod29-chip">{certainty(row.cost_certainty)}</span>
    </div>
  </button>;
}

function SpanRow({ span }) {
  const effectiveCost = span.effective_cost_ils ?? span.cost_ils;
  const effectiveCertainty = span.effective_cost_certainty || span.cost_certainty || "unknown";
  return <div className="sod29-row">
    <div>
      <strong>{span.name || span.kind}</strong>
      <small>{[span.kind, span.provider, span.model, span.outcome, span.output_use].filter(Boolean).join(" · ")}</small>
    </div>
    <div className="sod29-actions">
      <span className="sod29-chip">{span.duration_ms == null ? "—" : `${num(span.duration_ms)}ms`}</span>
      <span className="sod29-chip">{cost(effectiveCost)}</span>
      <span className="sod29-chip">{certainty(effectiveCertainty)}</span>
    </div>
  </div>;
}

export default function ControlPlane2029Page() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [sources, setSources] = useState(initialSources);
  const requestIds = useRef({});
  const pendingKeys = useRef(new Set());
  const refreshAttempts = useRef({});
  const latestSources = useRef(sources);
  latestSources.current = sources;
  const [refreshSeconds, setRefreshSeconds] = useState(120);
  const [refreshState, setRefreshState] = useState("waiting");
  const [params, setParams] = useSearchParams();
  const view = resolveControlView(params.get("view"));
  const setView = useCallback(id => setParams(current => { const next = new URLSearchParams(current); next.set("view", id); return next; }, { replace: true }), [setParams]);
  const [now, setNow] = useState(Date.now);
  const state = {
    health: sources.health.data, videoMap: sources.videoMap.data, traces: sources.traces.data || [],
    error: sources.health.error, readAt: sources.health.readAt,
    loading: ["health", "videoMap", "traces"].some(k => sources[k].status === "loading"),
  };
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ loading: false, data: null, error: null });

  const loadSources = useCallback(async keys => {
    if (!isAdmin || authLoading) return;
    await Promise.all([...new Set(keys)].filter(k => READERS[k] && !pendingKeys.current.has(k)).map(async key => {
      pendingKeys.current.add(key);
      const id = (requestIds.current[key] || 0) + 1;
      requestIds.current[key] = id;
      setSources(s => ({ ...s, [key]: { ...s[key], status: "loading", error: null } }));
      const source = await readAdminSource(READERS[key]);
      if (requestIds.current[key] !== id) return;
      pendingKeys.current.delete(key);
      refreshAttempts.current[key] = { at: Date.now(), failures: source.status === "error" ? (refreshAttempts.current[key]?.failures || 0) + 1 : 0 };
      setSources(s => ({ ...s, [key]: source }));
      if (key === "traces" && source.status === "ready") setSelectedId(current => current || source.data?.[0]?.trace_id || null);
    }));
  }, [isAdmin, authLoading, user?.id]);
  const load = useCallback(() => loadSources([...VIEW_SOURCES[view], "build"]), [loadSources, view]);

  useEffect(() => {
    setSources(initialSources());
    setSelectedId(null);
    refreshAttempts.current = {};
    return () => { for (const key of Object.keys(READERS)) requestIds.current[key] = (requestIds.current[key] || 0) + 1; pendingKeys.current.clear(); refreshAttempts.current = {}; };
  }, [authLoading, isAdmin, user?.id]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      const missing = [...VIEW_SOURCES[view], "build"].filter(k => sources[k].status === "idle");
      if (missing.length) loadSources(missing);
    }
  }, [authLoading, isAdmin, view, sources, loadSources]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (!isAdmin || authLoading || !refreshSeconds) { setRefreshState("manual"); return; }
    return createVisibleRefresh({ doc: document, win: window, intervalMs: refreshSeconds * 1000, onState: setRefreshState,
      run: () => loadSources(dueRefreshKeys([...VIEW_SOURCES[view], "build"], latestSources.current, refreshAttempts.current, Date.now(), refreshSeconds * 1000)) });
  }, [isAdmin, authLoading, user?.id, refreshSeconds, view, loadSources]);

  useEffect(() => {
    if (authLoading || !isAdmin || !selectedId || view !== "monitor") {
      setDetail({ loading: false, data: null, error: null });
      return;
    }
    let alive = true;
    setDetail({ loading: true, data: null, error: null });
    getOperationalTrace(selectedId)
      .then(data => alive && setDetail({ loading: false, data, error: null, readAt: new Date().toISOString() }))
      .catch(error => alive && setDetail({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [authLoading, isAdmin, selectedId, view, user?.id, sources.traces.readAt]);

  const health = state.health || {};
  const usage = health.usage || {};
  const db = health.db || {};
  const media = health.media || {};
  const deliveryRisk = media.delivery_risk || {};
  const dedupe = media.dedupe_latest || {};
  const egressLatest = usage.storage_egress_observed_latest || {};
  const egressTraffic = egressLatest.traffic_classes || {};
  const egressGuard = usage.storage_egress_guard || {};
  const providerHistory = usage.supabase_egress_historical_exact || {};
  const egressHistory = Array.isArray(usage.storage_egress_observed_history_24h) ? usage.storage_egress_observed_history_24h : [];
  const videoMap = state.videoMap || {};
  const videoSummary = videoMap.summary || {};
  const videoAi = videoMap.ai || {};
  const videoCron = videoMap.cron || {};
  const videoChannels = videoMap.channel_enrichment?.by_channel || {};
  const rollup = detail.data?.rollup || {};
  const spans = Array.isArray(detail.data?.spans) ? detail.data.spans : [];
  const selected = useMemo(() => state.traces.find(row => row.trace_id === selectedId) || null, [state.traces, selectedId]);

  if (authLoading) return <div aria-label="טוען" style={{ minHeight: "100vh" }} />;
  if (!user) return <Sod2029Shell title="מרכז הניהול הפרטי של SOD1820" eyebrow="גישה פרטית" surface="admin" status="נדרשת כניסה"><section className="sod29-section"><p>הכניסה דורשת את חשבון הניהול שלך באתר. אחרי ההתחברות פתח שוב את הקישור הזה כדי לחזור למרכז הניהול.</p><a className="sod29-action" href="/login">התחבר לחשבון האתר ←</a></section></Sod2029Shell>;
  if (!isAdmin) return <Navigate replace to="/2029" />;

  return <Sod2029Shell
    title="מרכז הניהול"
    eyebrow="2029 · INTERNAL"
    description="החלטות, מקורות, העלאות, ניקוי, תקציב וגרסאות — מעל המנגנונים הקיימים של SOD1820."
    status="ADMIN · READ ONLY"
    surface="admin"
    symbol="⌁"
    wide
  >
    <div className="sod29-admin-toolbar">
      <label htmlFor="admin-refresh-interval">רענון נתוני הלשונית הפתוחה
        <select id="admin-refresh-interval" value={refreshSeconds} onChange={event => setRefreshSeconds(Number(event.target.value))}>
          <option value={120}>אוטומטי — כל שתי דקות</option><option value={300}>אוטומטי — כל חמש דקות</option><option value={0}>ידני בלבד</option>
        </select>
      </label>
      <span role="status">{{ waiting: "רענון אוטומטי פעיל", refreshing: "בודק מקורות…", paused: "מושהה כשהלשונית ברקע", offline: "מושהה ללא חיבור לרשת", manual: "רענון ידני" }[refreshState]}</span>
      <button className="sod29-action" type="button" onClick={load}>רענן עכשיו</button>
      <small className="sod29-muted">רק מקורות הלשונית הזו וזהות הגרסה נקראים. כשמקור נכשל, ניסיונות אוטומטיים שלו מתרווחים עד 15 דקות.</small>
    </div>
    {sources.build.status === "ready" && sameVersion(CLIENT_BUILD.sha, sources.build.data?.identity?.sha) === "different" ? <aside className="sod29-admin-alert warning" role="status">
      גרסה אחרת זמינה בכתובת הזו. <button className="sod29-action" type="button" onClick={() => window.location.reload()}>טען את הגרסה החדשה</button>
    </aside> : null}
    <div className="sod29-actions sod29-admin-tabs" role="tablist" aria-label="תצוגת מרכז הניהול">
      {CONTROL_VIEWS.map((tab, index) =>
        <button key={tab.id} id={`control-tab-${tab.id}`} className="sod29-action" role="tab" type="button"
          aria-selected={view === tab.id} aria-controls={`control-panel-${tab.id}`} tabIndex={view === tab.id ? 0 : -1}
          onClick={() => setView(tab.id)} onKeyDown={event => {
            let target;
            if (event.key === "ArrowLeft") target = CONTROL_VIEWS[(index + 1) % CONTROL_VIEWS.length].id;
            else if (event.key === "ArrowRight") target = CONTROL_VIEWS[(index + CONTROL_VIEWS.length - 1) % CONTROL_VIEWS.length].id;
            else if (event.key === "Home") target = CONTROL_VIEWS[0].id;
            else if (event.key === "End") target = CONTROL_VIEWS.at(-1).id;
            if (target) { event.preventDefault(); setView(target); document.getElementById(`control-tab-${target}`)?.focus(); }
          }}>{tab.label}</button>
      )}
    </div>
    <AdminSources2029 sources={sources} now={now} onRefresh={loadSources} />
    {view !== "monitor" ? <section role="tabpanel" id={`control-panel-${view}`} aria-labelledby={`control-tab-${view}`}>
      {state.error && ["simulation", "budget"].includes(view) ? <FrameState kind="error" title="נתוני המעקב אינם זמינים">הסימולציה עדיין זמינה עם הנחות ידניות. {String(state.error?.message || state.error)}</FrameState> : null}
      <Suspense fallback={<FrameState kind="loading" title="טוען סימולטור" />}>
        {view === "attention" ? <AdminAttention2029 sources={sources} onRefresh={loadSources} now={now} /> : null}
        {view === "media" ? <AdminMedia2029 sources={sources} onRefresh={loadSources} onTrace={id => { setSelectedId(id); setView("monitor"); }} /> : null}
        {view === "cleanup" ? <AdminCleanup2029 source={sources.retention} healthSource={sources.health} onRefresh={load} /> : null}
        {view === "release" ? <AdminRelease2029 source={sources.release} worklogSource={sources.worklog} clientBuild={CLIENT_BUILD} onRefresh={load} /> : null}
        {view === "simulation" || view === "budget" ? <ResourceSimulator2029 health={state.health} healthReadAt={state.readAt} onRefresh={load} refreshing={state.loading} viewMode={view} notificationSource={sources.notify} healthSource={sources.health} /> : null}
      </Suspense>
    </section> : <div role="tabpanel" id="control-panel-monitor" aria-labelledby="control-tab-monitor">
    <MetricSourceContext.Provider value={{ source: sources.health, name: "health" }}>
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">SYSTEM HEALTH</div><h2>מה דורש תשומת לב עכשיו</h2>
          <div className="sod29-muted">המסך מקרין owners חיים; הוא אינו מקור אמת חדש.</div></div>
        <div className="sod29-actions"><button className="sod29-action" type="button" onClick={load} disabled={state.loading}>{state.loading ? "מרענן…" : "רענן"}</button></div>
      </div>
      {state.error ? <FrameState kind="error" title="לא ניתן לקרוא את מצב המערכת">{String(state.error?.message || state.error)}</FrameState> : null}
      <div className="sod29-grid">
        <Metric label="AI · 7 ימים" value={numeric(usage.ai_cost_usd_7d) == null ? "—" : `$${n(usage.ai_cost_usd_7d).toFixed(3)}`} note={`בסיס: ${usage.ai_cost_basis || "UNKNOWN"}`} basis={usage.ai_cost_basis || "UNKNOWN"} />
        <Metric label="DB connections" value={`${num(db.connections)} / ${num(db.max_connections)}`} note={`idle tx: ${num(db.idle_in_transaction)}`} />
        <Metric label="Media objects" value={num(media.storage?.total_objects ?? media.storage_object_count ?? media.migration_queue_objects)} note="aggregate קיים" />
        <Metric label="Traces · 7 ימים" value={num(state.traces.length)} note="לחיצה פותחת spans ועלות" source={sources.traces} name="traces" />
      </div>
    </section>

    <section className="sod29-section" data-experience-capability="storage-egress-health">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">MEDIA / EGRESS</div>
          <h2>מה יוצא החוצה — ומה אנחנו באמת יודעים</h2>
          <div className="sod29-muted">
            OBSERVED = bytes שנראו ב־Storage logs. Provider Cached Egress הוא חשבון Supabase ונשאר UNKNOWN עד חיבור מקור provider מורשה.
          </div>
        </div>
        <div className="sod29-actions">
          <span className="sod29-chip">{egressGuard.state || "NO_HOURLY_DATA"}</span>
          <span className="sod29-chip">{usage.storage_egress_observed_basis || "UNKNOWN"}</span>
        </div>
      </div>
      <div className="sod29-grid">
        <Metric
          label="Observed · שעה אחרונה"
          value={mib(egressLatest.storage_get_bytes)}
          note={`snapshot: ${when(usage.storage_egress_observed_latest_at)}`}
          basis={usage.storage_egress_observed_basis || "UNKNOWN"} measuredAt={usage.storage_egress_observed_latest_at}
        />
        <Metric
          label="Observed · 24 שעות"
          value={mib(usage.storage_egress_observed_24h_bytes)}
          note={`WARN ${mib(egressGuard.warn_24h_bytes)} · CRITICAL ${mib(egressGuard.critical_24h_bytes)}`}
          basis={usage.storage_egress_observed_basis || "UNKNOWN"} measuredAt={usage.storage_egress_observed_latest_at}
        />
        <Metric
          label="Bot share"
          value={pct(egressTraffic.bot_share)}
          note={`דפדפנים ${mib(egressTraffic.human_or_browser_bytes)} · bots ${mib(egressTraffic.bot_bytes)}`}
        />
        <Metric
          label="Public video"
          value={`${num(deliveryRisk.public_video_objects)} · ${gib(deliveryRisk.public_video_bytes)}`}
          note={`no-cache: ${num(deliveryRisk.public_video_no_cache)} · >50MB: ${num(deliveryRisk.public_over_50mb)}`}
        />
        <Metric
          label="Video thumbnails"
          value={num(deliveryRisk.channel_video_missing_thumb)}
          note="חסרים ב־channel_updates · יצירה בבקאנד בלבד"
        />
        <Metric
          label="Duplicate candidates"
          value={dedupe.duplicate_groups == null ? "—" : `${num(dedupe.duplicate_groups)} groups · ${gib(dedupe.redundant_candidate_bytes)}`}
          note={dedupe.classification ? `${dedupe.classification} · video ${gib(dedupe.redundant_video_candidate_bytes)} · אין מחיקה אוטומטית` : "ETag+size snapshot עדיין לא קיים"}
        />
        <Metric
          label="Provider · מחזור קודם"
          value={providerHistory.cached_egress_gb == null ? "—" : `${n(providerHistory.cached_egress_gb).toFixed(3)} GB cached`}
          note={providerHistory.cycle_start ? `${providerHistory.cycle_start} → ${providerHistory.cycle_end} · EXACT_BILLING_HISTORY` : "אין היסטוריה מתועדת"}
          basis="EXACT_BILLING_HISTORY" measuredAt={providerHistory.cycle_end}
        />
        <Metric
          label="Provider · מחזור נוכחי"
          value={usage.supabase_cached_egress == null ? "UNKNOWN" : gib(usage.supabase_cached_egress)}
          note={`בסיס: ${usage.supabase_cached_egress_basis || "UNKNOWN"} · לא נגזר מ־OBSERVED`}
          basis={usage.supabase_cached_egress_basis || "UNKNOWN"}
        />
      </div>
      {Array.isArray(egressLatest.root_causes) && egressLatest.root_causes.length ? (
        <div className="sod29-actions" aria-label="גורמי egress שנצפו">
          {egressLatest.root_causes.map((cause) => <span key={cause} className="sod29-chip">{cause}</span>)}
        </div>
      ) : null}
      {egressHistory.length ? <div className="sod29-list" aria-label="היסטוריית egress ב־24 שעות">
        {egressHistory.slice(-8).reverse().map((row, index) => <div className="sod29-row" key={`${row.at || "row"}:${index}`}>
          <div><strong>{when(row.at)}</strong><small>OBSERVED_STORAGE_LOGS</small></div>
          <div className="sod29-actions">
            <span className="sod29-chip">{mib(row.bytes)}</span>
            <span className="sod29-chip">bots {pct(row.bot_share)}</span>
            {n(row.burst_files) > 1 ? <span className="sod29-chip">{num(row.burst_files)} MP4 burst</span> : null}
          </div>
        </div>)}
      </div> : sources.health.status === "ready" ? <FrameState kind="empty" title="אין עדיין hourly snapshots">ה־dead-man יופעל אחרי observation ראשון; עד אז provider usage נשאר UNKNOWN.</FrameState> : <SourceState source={sources.health} name="health" onRetry={() => loadSources(["health"])} />}
    </section>

    <MetricSourceContext.Provider value={{ source: sources.videoMap, name: "videoMap" }}>
    <section className="sod29-section">
      <SourceState source={sources.videoMap} name="videoMap" onRetry={() => loadSources(["videoMap"])} />
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">VIDEO MAP · 2029</div><h2>וידאו — מיפוי, Google ועלות</h2>
          <div className="sod29-muted">Projection אחד מעל Posts · WhatsApp · Home Videos · Stories. המיפוי הדטרמיניסטי אינו צורך טוקנים.</div></div>
        <div className="sod29-actions">
          <span className="sod29-chip">{typeof videoCron.active === "boolean" ? videoCron.active ? "cron פעיל" : "cron לא פעיל" : "מצב cron לא ידוע"}</span>
          <span className="sod29-chip">{videoCron.schedule || "—"}</span>
        </div>
      </div>
      <div className="sod29-grid">
        <Metric label="Video assets" value={num(videoSummary.unique_assets)} note={`${num(videoSummary.placements)} placements · ${num(videoSummary.duplicate_assets)} assets כפולים`} />
        <Metric label="Google Video" value={num(videoSummary.google_indexable_assets)} note={`${num(videoSummary.generic_google_pages)} דפי /video fallback`} />
        <Metric label="Backlog ערוצים" value={num(videoMap.channel_enrichment?.pending)} note={`אור הגאולה: ${num(videoChannels["or-geula"]?.pending)} · תורת הרמז: ${num(videoChannels["torat-haremez"]?.pending)}`} />
        <Metric label="Video AI · 7 ימים" value={`${num(videoAi.input_tokens_7d)} + ${num(videoAi.output_tokens_7d)} tok`}
          note={`Anthropic · ${videoMap.ai_policy?.metadata_model || "—"} · ~${cost(videoAi.estimated_cost_ils_7d)}`} basis={videoAi.cost_basis || "UNKNOWN"} />
      </div>
      <div className="sod29-list">
        <div className="sod29-row"><div><strong>Projection owner</strong><small>{videoMap.owners?.projection || "—"}</small></div><span className="sod29-chip">{num(videoMap.ai_policy?.deterministic_mapping_tokens)} tokens</span></div>
        <div className="sod29-row"><div><strong>Metadata worker</strong><small>{videoMap.owners?.enrichment_worker || "—"} · {videoMap.ai_policy?.metadata_provider || "—"}</small></div><span className="sod29-chip">{num(videoAi.calls_7d)} calls / 7d</span></div>
        <div className="sod29-row"><div><strong>STT</strong><small>{videoMap.ai_policy?.stt_provider || "—"} · {videoMap.ai_policy?.stt_model || "—"}</small></div><span className="sod29-chip">{typeof videoMap.ai_policy?.stt_runs_from_cron === "boolean" ? videoMap.ai_policy.stt_runs_from_cron ? "cron" : "ידני בלבד" : "לא ידוע"}</span></div>
        <div className="sod29-row"><div><strong>2029 storage</strong><small>{videoMap.owners?.storage_2029 || "—"}</small></div><span className="sod29-chip">{num(videoSummary.native_2029_storage_assets)} native</span></div>
      </div>
    </section>
    </MetricSourceContext.Provider>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NO BLACK BOX</div><h2>Root traces</h2>
        <div className="sod29-muted">עלות לא ידועה נשארת לא ידועה; אין חיבור מומצא בין אגרגציות.</div></div></div>
      <SourceState source={sources.traces} name="traces" onRetry={() => loadSources(["traces"])} />
      {sources.traces.status === "loading" ? <FrameState kind="loading" title="טוען traces" /> : sources.traces.status === "ready" ?
        state.traces.length ? <div className="sod29-list">{state.traces.map(row =>
          <TraceRow key={row.trace_id} row={row} active={row.trace_id === selectedId} open={setSelectedId} />
        )}</div> : <FrameState kind="empty" title="אין traces בטווח הזה">אין root traces להצגה בשבעת הימים האחרונים.</FrameState> : null}
      <SourceStamp source={sources.traces} name="traces" />
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">TRACE DRILL-DOWN</div><h2>{selected?.capability || "בחר trace"}</h2>
          <div className="sod29-muted">{selectedId || "לחץ על root trace כדי לראות את עץ הביצוע."}</div></div>
        {detail.data ? <div className="sod29-actions">
          <span className="sod29-chip">{rollup.span_count ?? spans.length} spans</span>
          <span className="sod29-chip">{cost(rollup.known_cost_ils)}</span>
          <span className="sod29-chip">{typeof rollup.has_unknown_cost === "boolean" ? rollup.has_unknown_cost ? "יש עלות לא ידועה" : "ללא עלות לא ידועה לפי המקור" : "שלמות העלות לא ידועה"}</span>
        </div> : null}
      </div>
      {detail.loading ? <FrameState kind="loading" title="פותח trace" /> : null}
      {detail.error ? <FrameState kind="error" title="לא ניתן לפתוח trace">{String(detail.error?.message || detail.error)}</FrameState> : null}
      {!detail.loading && !detail.error && detail.data ? <>
        <MetricSourceContext.Provider value={{ source: { status: "ready", data: detail.data, readAt: detail.readAt }, name: "trace" }}><div className="sod29-grid">
          <Metric label="Outcome" value={detail.data?.trace?.outcome || "לא ידוע"} note={detail.data?.trace?.surface || "—"} />
          <Metric label="Known cost" value={cost(rollup.known_cost_ils)} note={rollup.has_unknown_cost ? "קיימים spans עם UNKNOWN" : "עלות שנמסרה ב־rollup"} basis={selected?.cost_certainty === "exact" ? "EXACT" : selected?.cost_certainty === "estimated" ? "ESTIMATED" : "UNKNOWN"} />
          <Metric label="Linked AI calls" value={num(rollup.linked_ai_calls)} note="ai_token_log / agent_token_costs" />
        </div></MetricSourceContext.Provider>
        <div className="sod29-list">{spans.map(span => <SpanRow key={span.span_id} span={span} />)}</div>
        <SourceStamp source={{ status: "ready", data: detail.data, readAt: detail.readAt }} name="trace" />
      </> : null}
    </section>
    </MetricSourceContext.Provider>
    </div>}
  </Sod2029Shell>;
}
