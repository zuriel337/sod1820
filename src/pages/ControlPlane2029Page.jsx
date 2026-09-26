import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { getOperationalTrace, getOperationalTraceList, getSystemHealth } from "../lib/visits.js";

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const num = v => n(v).toLocaleString("he-IL");
const cost = v => v == null ? "—" : `₪${n(v).toFixed(4)}`;
const when = v => v ? new Date(v).toLocaleString("he-IL") : "—";
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
      <small>{when(row.started_at)} · {row.outcome || "open"} · {row.span_count || 0} spans</small>
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
  const { loading: authLoading, isAdmin } = useAuth();
  const [state, setState] = useState({ loading: true, health: null, traces: [], error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ loading: false, data: null, error: null });

  const load = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: null }));
    try {
      const [health, traces] = await Promise.all([getSystemHealth(), getOperationalTraceList(7, 100)]);
      setState({ loading: false, health, traces, error: null });
      setSelectedId(current => current || traces?.[0]?.trace_id || null);
    } catch (error) {
      setState({ loading: false, health: null, traces: [], error });
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  useEffect(() => {
    if (!isAdmin || !selectedId) {
      setDetail({ loading: false, data: null, error: null });
      return;
    }
    let alive = true;
    setDetail({ loading: true, data: null, error: null });
    getOperationalTrace(selectedId)
      .then(data => alive && setDetail({ loading: false, data, error: null }))
      .catch(error => alive && setDetail({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [isAdmin, selectedId]);

  const health = state.health || {};
  const usage = health.usage || {};
  const db = health.db || {};
  const media = health.media || {};
  const rollup = detail.data?.rollup || {};
  const spans = Array.isArray(detail.data?.spans) ? detail.data.spans : [];
  const selected = useMemo(() => state.traces.find(row => row.trace_id === selectedId) || null, [state.traces, selectedId]);

  if (authLoading) return <div aria-label="טוען" style={{ minHeight: "100vh" }} />;
  if (!isAdmin) return <Navigate replace to="/2029" />;

  return <Sod2029Shell
    title="Control Plane"
    eyebrow="2029 · INTERNAL"
    description="בריאות, עלות ו־No Black Box במקום אחד — מהאגרגציה אל root trace ו־spans."
    status="ADMIN · READ ONLY"
    surface="admin"
    symbol="⌁"
    wide
  >
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">SYSTEM HEALTH</div><h2>מה דורש תשומת לב עכשיו</h2>
          <div className="sod29-muted">המסך מקרין owners חיים; הוא אינו מקור אמת חדש.</div></div>
        <div className="sod29-actions"><button className="sod29-action" type="button" onClick={load} disabled={state.loading}>{state.loading ? "מרענן…" : "רענן"}</button></div>
      </div>
      {state.error ? <FrameState kind="error" title="לא ניתן לקרוא את מצב המערכת">{String(state.error?.message || state.error)}</FrameState> : null}
      <div className="sod29-grid">
        <Metric label="AI · 7 ימים" value={usage.ai_cost_usd_7d == null ? "—" : `$${n(usage.ai_cost_usd_7d).toFixed(3)}`} note={`בסיס: ${usage.ai_cost_basis || "UNKNOWN"}`} />
        <Metric label="DB connections" value={`${num(db.connections)} / ${num(db.max_connections)}`} note={`idle tx: ${num(db.idle_in_transaction)}`} />
        <Metric label="Media objects" value={num(media.storage_object_count ?? media.migration_queue_objects)} note="aggregate קיים" />
        <Metric label="Traces · 7 ימים" value={num(state.traces.length)} note="לחיצה פותחת spans ועלות" />
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NO BLACK BOX</div><h2>Root traces</h2>
        <div className="sod29-muted">עלות לא ידועה נשארת לא ידועה; אין חיבור מומצא בין אגרגציות.</div></div></div>
      {state.loading ? <FrameState kind="loading" title="טוען traces" /> :
        state.traces.length ? <div className="sod29-list">{state.traces.map(row =>
          <TraceRow key={row.trace_id} row={row} active={row.trace_id === selectedId} open={setSelectedId} />
        )}</div> : <FrameState kind="empty" title="אין traces בטווח הזה">אין root traces להצגה בשבעת הימים האחרונים.</FrameState>}
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
