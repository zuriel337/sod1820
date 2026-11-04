import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { getOperationalTrace, getOperationalTraceList, getSystemHealth, getVideoMapHealth } from "../lib/visits.js";
const OperationalMetrics2029 = React.lazy(() => import("../components/experience2029/OperationalMetrics2029.jsx"));

const n = v => v == null || typeof v === "boolean" || typeof v === "string" && !v.trim() ? NaN : Number(v);
const num = v => Number.isFinite(n(v)) ? n(v).toLocaleString("he-IL") : "—";
const cost = v => !Number.isFinite(n(v)) ? "—" : `₪${n(v).toFixed(4)}`;
const mib = v => !Number.isFinite(n(v)) ? "—" : `${(n(v) / 1048576).toLocaleString("he-IL", { maximumFractionDigits: 1 })} MiB`;
const gib = v => !Number.isFinite(n(v)) ? "—" : `${(n(v) / 1073741824).toLocaleString("he-IL", { maximumFractionDigits: 2 })} GiB`;
const pct = v => !Number.isFinite(n(v)) ? "—" : `${(n(v) * 100).toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`;
const when = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleString("he-IL") : "—";
const activeLabel = v => v === true ? "פעיל" : v === false ? "לא פעיל" : "לא נבדק";
const certainty = v => v === "exact" ? "מדויק" : v === "estimated" ? "הערכה" : v === "not_billable" ? "לא לחיוב" : "לא ידוע";

function Metric({ label, value, note }) {
  return <div className="sod29-card">
    <div className="sod29-kicker">{label}</div>
    <h3>{value}</h3>
    {note ? <p className="sod29-muted">{note}</p> : null}
  </div>;
}

function TraceRow({ row, active, open }) {
  return <button type="button" className={`sod29-row${active ? " active" : ""}`}
    onClick={() => open(row.trace_id)} aria-pressed={active}
    style={{ width: "100%", textAlign: "start", cursor: "pointer" }}>
    <div>
      <strong>{row.capability || "interaction"} · {row.surface || "surface"}</strong>
      <small>{when(row.started_at)} · {row.outcome || "לא נבדק"} · {num(row.span_count)} spans</small>
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
  const auth = useAuth();
  // A new verified identity gets a fresh view before it can render the prior
  // identity's trace selection, rather than waiting for a passive effect.
  return <ControlPlaneBody key={`${auth.user?.id || "guest"}:${auth.isAdmin === true}:${auth.loading === true}`} auth={auth} />;
}

function ControlPlaneBody({ auth }) {
  const { user, loading: authLoading, isAdmin } = auth;
  const principal = user?.id || null;
  const scope = useRef({ principal, isAdmin });
  scope.current = { principal, isAdmin };
  const requestVersion = useRef(0);
  const [state, setState] = useState({ loading: true, health: null, videoMap: null, traces: [], healthError: null, videoError: null, traceError: null, traceLoading: true, traceVersion: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [detail, setDetail] = useState({ loading: false, data: null, error: null });

  const load = useCallback(async () => {
    if (!principal || !isAdmin) return;
    const version = ++requestVersion.current;
    const valid = () => requestVersion.current === version && scope.current.principal === principal && scope.current.isAdmin;
    setState({ loading: true, health: null, videoMap: null, traces: [], healthError: null, videoError: null, traceError: null, traceLoading: true, traceVersion: version });
    setDetail({ loading: false, data: null, error: null });
    const reads = [
      ["health", getSystemHealth],
      ["videoMap", getVideoMapHealth],
      ["traces", () => getOperationalTraceList(7, 100)],
    ];
    await Promise.allSettled(reads.map(async ([kind, read]) => {
      try {
        const value = await read();
        if (!valid()) return;
        if (kind === "traces") {
          if (!Array.isArray(value)) throw new Error("לא התקבלה רשימת traces תקינה");
          setState(current => ({ ...current, traces: value, traceLoading: false, traceVersion: version }));
          setSelectedId(current => value.some(row => row.trace_id === current) ? current : value[0]?.trace_id || null);
        } else {
          if (!value || typeof value !== "object" || Array.isArray(value) || !Number.isFinite(Date.parse(value.generated_at))) throw new Error("לא התקבלה דגימת מצב תקינה");
          setState(current => ({ ...current, [kind]: value }));
        }
      } catch (error) {
        if (!valid()) return;
        const key = kind === "health" ? "healthError" : kind === "videoMap" ? "videoError" : "traceError";
        setState(current => ({ ...current, [key]: error, ...(kind === "traces" ? { traceLoading: false, traces: [], traceVersion: version } : {}) }));
        if (kind === "traces") setSelectedId(null);
      }
    }));
    if (valid()) setState(current => ({ ...current, loading: false }));
  }, [principal, isAdmin]);

  useEffect(() => {
    if (!authLoading && isAdmin && principal) load();
    return () => { requestVersion.current++; };
  }, [authLoading, isAdmin, principal, load]);

  useEffect(() => {
    if (!isAdmin || !principal || !selectedId || state.traceLoading || state.traceError) {
      setDetail({ loading: false, data: null, error: null });
      return;
    }
    let alive = true;
    setDetail({ loading: true, data: null, error: null });
    getOperationalTrace(selectedId)
      .then(data => alive && scope.current.principal === principal && scope.current.isAdmin && setDetail({ loading: false, data, error: null }))
      .catch(error => alive && scope.current.principal === principal && scope.current.isAdmin && setDetail({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [isAdmin, principal, selectedId, state.traceLoading, state.traceError, state.traceVersion]);

  const health = state.health || {};
  const usage = health.usage || {};
  const db = health.db || {};
  const jobs = Array.isArray(health.cron) ? health.cron : null;
  const security = health.security || {};
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

  if (authLoading) return <main role="status" aria-label="אימות חשבון המנהל" dir="rtl" className="sod29-section" style={{ minHeight: "100vh" }}><p>מאמתים את חשבון המנהל…</p></main>;
  if (!isAdmin || !principal) return <Navigate replace to="/2029" />;

  return <Sod2029Shell
    title="Control Plane"
    eyebrow="2029 · INTERNAL"
    description="בריאות, עלות ו־No Black Box במקום אחד — מהאגרגציה אל root trace ו־spans."
    status="ADMIN · READ ONLY"
    surface="control"
    symbol={<NavigationIcon2029 name="tools" />}
    wide
  >
    <section className="sod29-section">
      <button className="sod29-action" type="button" aria-expanded={metricsOpen} onClick={()=>setMetricsOpen(open=>!open)}>
        {metricsOpen ? "סגירת מדידה וגוגל" : "מדידה וגוגל"}
      </button>
      {metricsOpen ? <React.Suspense fallback={<p role="status">פותח את קוראי המדידה…</p>}><OperationalMetrics2029 principal={principal}/></React.Suspense> : null}
    </section>
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">SYSTEM HEALTH</div><h2>מה דורש תשומת לב עכשיו</h2>
          <div className="sod29-muted">המסך מקרין owners חיים; הוא אינו מקור אמת חדש.</div></div>
        <div className="sod29-actions"><button className="sod29-action" type="button" onClick={load} disabled={state.loading}>{state.loading ? "מרענן…" : "רענן"}</button></div>
      </div>
      {state.healthError ? <FrameState kind="error" title="לא ניתן לקרוא את מצב המערכת">{String(state.healthError?.message || state.healthError)}</FrameState> : null}
      <p className="sod29-muted">דגימת מצב: {when(health.generated_at)}. כל מקטע מוצג לפי הקריאה שלו; נתון חסר אינו מדידה של אפס.</p>
      <div className="sod29-grid">
        <Metric label="AI · 7 ימים" value={usage.ai_cost_usd_7d == null ? "—" : `$${n(usage.ai_cost_usd_7d).toFixed(3)}`} note={`בסיס: ${usage.ai_cost_basis || "UNKNOWN"}`} />
        <Metric label="DB connections" value={`${num(db.connections)} / ${num(db.max_connections)}`} note={`idle tx: ${num(db.idle_in_transaction)}`} />
        <Metric label="Media objects" value={num(media.storage?.total_objects ?? media.storage_object_count ?? media.migration_queue_objects)} note="aggregate קיים" />
        <Metric label="Traces מוצגים" value={state.traceLoading || state.traceError ? "—" : num(state.traces.length)} note="עד 100 משבעת הימים האחרונים; זו רשימה מוגבלת, לא ספירה כוללת. לחיצה פותחת spans ועלות." />
      </div>
    </section>

    <section className="sod29-section" data-experience-capability="operational-health-summary">
      <div className="sod29-section-head"><div><div className="sod29-kicker">תזמון ואבטחה</div><h2>הסיכומים הקיימים של השרת</h2><p className="sod29-muted">מצב ריצות והתראות, לקריאה בלבד. סיכום זה אינו קבלת הרשאות S2 או אישור פרסום.</p></div></div>
      <div className="sod29-grid">
        <Metric label="התראות שטרם טופלו" value={num(security.unacked)} note={`24 שעות: ${num(security.recent_24h)}`} />
        <Metric label="משימות בתצלום" value={jobs ? num(jobs.length) : "—"} note="לא ספירה של כל תהליכי הרקע; מציג רק את בחירת הקורא הקיים" />
      </div>
      {jobs ? jobs.length ? <div className="sod29-list">{jobs.map(job => <div className="sod29-row" key={job.job_name}>
        <div><strong>{job.job_name}</strong><small>ריצה אחרונה: {when(job.last_run_at)}</small></div>
        <div className="sod29-actions"><span className="sod29-chip">{activeLabel(job.active)}</span><span className="sod29-chip">{job.last_status || "לא נבדק"}</span><span className="sod29-chip">כשלים ב־24 שעות: {num(job.failures_24h)}</span></div>
      </div>)}</div> : <p className="sod29-muted">הקורא החזיר רשימה ריקה. אין בכך הוכחה שאין תהליכי רקע אחרים.</p> : <p className="sod29-muted">לא התקבל מידע על המשימות.</p>}
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
          label="Observed · המדידה האחרונה"
          value={mib(egressLatest.storage_get_bytes)}
          note={`snapshot: ${when(usage.storage_egress_observed_latest_at)} · מצב: ${egressGuard.state || "לא נבדק"}. נתון ישן אינו תעבורה נוכחית.`}
        />
        <Metric
          label="Observed · 24 שעות"
          value={mib(usage.storage_egress_observed_24h_bytes)}
          note={`WARN ${mib(egressGuard.warn_24h_bytes)} · CRITICAL ${mib(egressGuard.critical_24h_bytes)}`}
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
        />
        <Metric
          label="Provider · מחזור נוכחי"
          value={usage.supabase_cached_egress == null ? "UNKNOWN" : gib(usage.supabase_cached_egress)}
          note={`בסיס: ${usage.supabase_cached_egress_basis || "UNKNOWN"} · לא נגזר מ־OBSERVED`}
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
      </div> : <FrameState kind="empty" title="אין מדידות תעבורה ב־24 השעות האחרונות">{usage.storage_egress_observed_latest_at ? `קיימת מדידה קודמת מ־${when(usage.storage_egress_observed_latest_at)}. היא אינה מדידה עדכנית.` : "לא התקבל תאריך של מדידה קודמת."} מצב הספק נשאר לא ידוע; התראה פעילה אינה מחליפה את אוסף המדידות.</FrameState>}
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">VIDEO MAP · 2029</div><h2>וידאו — מיפוי, Google ועלות</h2>
          <div className="sod29-muted">Projection אחד מעל Posts · WhatsApp · Home Videos · Stories. המיפוי הדטרמיניסטי אינו צורך טוקנים.</div></div>
        <div className="sod29-actions">
          <span className="sod29-chip">{`cron: ${activeLabel(videoCron.active)}`}</span>
          <span className="sod29-chip">{videoCron.schedule || "—"}</span>
        </div>
      </div>
      {state.videoError ? <FrameState kind="error" title="לא ניתן לקרוא את מצב הווידאו">הנתונים אינם ידועים; אין בכך הוכחה שהמשימה כבויה או שאין פעילות.</FrameState> : null}
      <p className="sod29-muted">דגימת וידאו: {when(videoMap.generated_at)}</p>
      <div className="sod29-grid">
        <Metric label="Video assets" value={num(videoSummary.unique_assets)} note={`${num(videoSummary.placements)} placements · ${num(videoSummary.duplicate_assets)} assets כפולים`} />
        <Metric label="Google Video" value={num(videoSummary.google_indexable_assets)} note={`${num(videoSummary.generic_google_pages)} דפי /video fallback`} />
        <Metric label="Backlog ערוצים" value={num(videoMap.channel_enrichment?.pending)} note={`אור הגאולה: ${num(videoChannels["or-geula"]?.pending)} · תורת הרמז: ${num(videoChannels["torat-haremez"]?.pending)}`} />
        <Metric label="Video AI · 7 ימים" value={`${num(videoAi.input_tokens_7d)} + ${num(videoAi.output_tokens_7d)} tok`}
          note={`Anthropic · ${videoMap.ai_policy?.metadata_model || "—"} · ~${cost(videoAi.estimated_cost_ils_7d)}`} />
      </div>
      <div className="sod29-list">
        <div className="sod29-row"><div><strong>Projection owner</strong><small>{videoMap.owners?.projection || "—"}</small></div><span className="sod29-chip">0 tokens</span></div>
        <div className="sod29-row"><div><strong>Metadata worker</strong><small>{videoMap.owners?.enrichment_worker || "—"} · {videoMap.ai_policy?.metadata_provider || "—"}</small></div><span className="sod29-chip">{num(videoAi.calls_7d)} calls / 7d</span></div>
        <div className="sod29-row"><div><strong>STT</strong><small>{videoMap.ai_policy?.stt_provider || "—"} · {videoMap.ai_policy?.stt_model || "—"}</small></div><span className="sod29-chip">{videoMap.ai_policy?.stt_runs_from_cron === true ? "cron" : videoMap.ai_policy?.stt_runs_from_cron === false ? "ידני בלבד" : "לא נבדק"}</span></div>
        <div className="sod29-row"><div><strong>2029 storage</strong><small>{videoMap.owners?.storage_2029 || "—"}</small></div><span className="sod29-chip">{num(videoSummary.native_2029_storage_assets)} native</span></div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NO BLACK BOX</div><h2>Root traces</h2>
        <div className="sod29-muted">עלות לא ידועה נשארת לא ידועה; אין חיבור מומצא בין אגרגציות.</div></div></div>
      {state.traceLoading ? <FrameState kind="loading" title="טוען traces" /> :
        state.traceError ? <FrameState kind="error" title="לא ניתן לקרוא traces כרגע">מצב הנתונים לא ידוע; אין בכך הוכחה שאין traces.</FrameState> :
        state.traces.length ? <div className="sod29-list">{state.traces.map(row =>
          <TraceRow key={row.trace_id} row={row} active={row.trace_id === selectedId} open={setSelectedId} />
        )}</div> : <FrameState kind="empty" title="רשימת ה־traces שהתקבלה ריקה">הקריאה המוגבלת לשבעת הימים האחרונים הסתיימה בהצלחה ללא פריטים.</FrameState>}
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">TRACE DRILL-DOWN</div><h2>{selected?.capability || "בחר trace"}</h2>
          <div className="sod29-muted">{selectedId || "לחץ על root trace כדי לראות את עץ הביצוע."}</div></div>
        {detail.data ? <div className="sod29-actions">
          <span className="sod29-chip">{rollup.span_count ?? spans.length} spans</span>
          <span className="sod29-chip">{cost(rollup.known_cost_ils)}</span>
          <span className="sod29-chip">{rollup.has_unknown_cost ? "יש עלות לא ידועה" : "עלות ידועה"}</span>
        </div> : null}
      </div>
      {detail.loading ? <FrameState kind="loading" title="פותח trace" /> : null}
      {detail.error ? <FrameState kind="error" title="לא ניתן לפתוח trace">{String(detail.error?.message || detail.error)}</FrameState> : null}
      {!detail.loading && !detail.error && detail.data ? <>
        <div className="sod29-grid">
          <Metric label="Outcome" value={detail.data?.trace?.outcome || "open"} note={detail.data?.trace?.surface || "—"} />
          <Metric label="Known cost" value={cost(rollup.known_cost_ils)} note={rollup.has_unknown_cost ? "קיימים spans עם UNKNOWN" : "ללא UNKNOWN ב־rollup"} />
          <Metric label="Linked AI calls" value={num(rollup.linked_ai_calls)} note="ai_token_log / agent_token_costs" />
        </div>
        <div className="sod29-list">{spans.map(span => <SpanRow key={span.span_id} span={span} />)}</div>
      </> : null}
    </section>
  </Sod2029Shell>;
}
