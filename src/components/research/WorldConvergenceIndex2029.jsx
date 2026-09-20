import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  WORLD_CONVERGENCE_LAYERS_2029,
  WORLD_CONVERGENCE_SORTS_2029,
  WORLD_CONVERGENCE_STATES_2029,
  fetchWorldConvergenceIndex2029,
  fetchWorldConvergenceRawDetail2029,
  filterWorldConvergenceIndex2029,
  sortWorldConvergenceIndex2029,
} from "../../lib/research/worldConvergenceIndex2029.js";

const PAGE = 60;

const STATE_LABELS = Object.freeze({
  pass: "PASS",
  mixed: "MIXED",
  needs_check: "NEEDS CHECK",
  unverified: "UNVERIFIED",
});

const LAYER_LABELS = Object.freeze({
  topic: "Approved / Legacy Topic",
  research: "Research Relation",
  candidate: "Research Candidate",
});

function count(object, key) {
  return Number(object?.[key] || 0);
}

function profileSummary(row) {
  const profile = row?.profile || {};
  const parts = [];
  if (row?.state) parts.push(STATE_LABELS[row.state] || row.state);
  if (Number.isFinite(profile.independentEvidence)) parts.push(String(profile.independentEvidence) + " קבוצות ראיה עצמאיות");
  if (profile.provenanceCount) parts.push(String(profile.provenanceCount) + " provenance");
  if (profile.curation) parts.push("curation: " + profile.curation);
  return parts.join(" · ");
}

export default function WorldConvergenceIndex2029({
  enabled = false,
  researchProjection = null,
  researchLoading = false,
}) {
  const [state, setState] = useState({ loading: false, projection: null, error: null });
  const [filters, setFilters] = useState({
    query: "",
    layer: "all",
    state: "all",
    contributor: "all",
    value: "",
    sort: "recommended",
  });
  const [shown, setShown] = useState(PAGE);
  const [rawOpen, setRawOpen] = useState(false);
  const [rawState, setRawState] = useState({ loading: false, detail: null, error: null });

  useEffect(() => {
    let alive = true;
    if (!enabled || researchLoading || !researchProjection) {
      setState((prev) => ({ ...prev, loading: Boolean(enabled && researchLoading) }));
      return () => { alive = false; };
    }
    setState({ loading: true, projection: null, error: null });
    fetchWorldConvergenceIndex2029({ researchProjection })
      .then((projection) => {
        if (alive) setState({ loading: false, projection, error: null });
      })
      .catch((error) => {
        if (alive) setState({ loading: false, projection: null, error });
      });
    return () => { alive = false; };
  }, [enabled, researchProjection, researchLoading]);

  const filtered = useMemo(() => {
    const rows = filterWorldConvergenceIndex2029(state.projection?.rows || [], filters);
    return sortWorldConvergenceIndex2029(rows, filters.sort);
  }, [state.projection, filters]);

  const contributors = useMemo(() => (
    Object.entries(state.projection?.byContributor || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name)
  ), [state.projection]);

  useEffect(() => {
    setShown(PAGE);
  }, [filters.query, filters.layer, filters.state, filters.contributor, filters.value, filters.sort]);

  useEffect(() => {
    let alive = true;
    const n = Number(filters.value);
    if (!enabled || !rawOpen || !Number.isSafeInteger(n)) {
      setRawState({ loading: false, detail: null, error: null });
      return () => { alive = false; };
    }
    setRawState({ loading: true, detail: null, error: null });
    fetchWorldConvergenceRawDetail2029(n)
      .then((detail) => {
        if (alive) setRawState({ loading: false, detail, error: null });
      })
      .catch((error) => {
        if (alive) setRawState({ loading: false, detail: null, error });
      });
    return () => { alive = false; };
  }, [enabled, rawOpen, filters.value]);

  if (!enabled) return null;

  const projection = state.projection;
  const visible = filtered.slice(0, shown);
  const topicCount = count(projection?.byLayer, "topic");
  const researchCount = count(projection?.byLayer, "research");
  const candidateCount = count(projection?.byLayer, "candidate");
  const needsAttention = count(projection?.byState, "mixed") + count(projection?.byState, "needs_check");
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <section className="sod29-section sod29-world-convergence-2029" aria-label="Convergence 2029 Human Gate">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">HUMAN GATE · CONVERGENCE 2029</div>
          <h2>כל ההתכנסויות — לפי מצב המחקר</h2>
          <p className="sod29-muted">
            שכבת עבודה אחת מעל בעלי־הבית הקיימים. Rank Profile מסביר למה פריט מופיע קודם;
            הוא אינו ציון אמת ואינו משנה אימות, אישור, קנוניות, פרסום או פרטיות.
          </p>
        </div>
        <span className="sod29-chip">{projection?.total ?? "—"}</span>
      </div>

      <div className="sod29-world-convergence-summary">
        <span><b>{topicCount}</b>Approved / Topics</span>
        <span><b>{researchCount}</b>Research Relations</span>
        <span><b>{candidateCount}</b>Pending Candidates</span>
        <span className={needsAttention ? "is-attention" : ""}><b>{needsAttention}</b>דורש החלטה / תיקון</span>
      </div>

      <div className="sod29-world-convergence-boundary">
        <strong>גבול אמת:</strong> {projection?.truthBoundary || "Rank is presentation only."}
        <br />
        <strong>Raw:</strong> {projection?.rawBoundary || "Legacy equality buckets stay internal."}
      </div>

      <div className="sod29-world-convergence-filters">
        <label className="is-wide">
          <span>חיפוש</span>
          <input
            value={filters.query}
            onChange={(e) => setFilter("query", e.target.value)}
            placeholder="חפש ביטוי, מקור, חוקר או Explain‑Why…"
          />
        </label>
        <label>
          <span>שכבה</span>
          <select value={filters.layer} onChange={(e) => setFilter("layer", e.target.value)}>
            {Object.entries(WORLD_CONVERGENCE_LAYERS_2029).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
          </select>
        </label>
        <label>
          <span>מצב</span>
          <select value={filters.state} onChange={(e) => setFilter("state", e.target.value)}>
            {Object.entries(WORLD_CONVERGENCE_STATES_2029).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
          </select>
        </label>
        <label>
          <span>חוקר / מקור</span>
          <select value={filters.contributor} onChange={(e) => setFilter("contributor", e.target.value)}>
            <option value="all">הכול</option>
            {contributors.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>מספר</span>
          <input
            inputMode="numeric"
            value={filters.value}
            onChange={(e) => setFilter("value", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="למשל 1820"
          />
        </label>
        <label>
          <span>סדר / Lens</span>
          <select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
            {Object.entries(WORLD_CONVERGENCE_SORTS_2029).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
          </select>
        </label>
      </div>

      <div className="sod29-world-convergence-toolbar">
        <span className="sod29-muted">
          {state.loading ? "מחבר את שכבות המחקר…" : String(filtered.length) + " תוצאות לפי הסינון הנוכחי"}
        </span>
        <button
          type="button"
          className={"sod29-action" + (rawOpen ? " is-active" : "")}
          disabled={!Number.isSafeInteger(Number(filters.value))}
          onClick={() => setRawOpen((value) => !value)}
        >
          {rawOpen ? "סגור Raw" : "Raw / Cross לעוגן הזה"}
        </button>
      </div>

      {state.error ? (
        <div className="sod29-world-convergence-state">שכבת Convergence 2029 לא נטענה. לא נחליף נתונים חסרים בדירוג מומצא.</div>
      ) : null}

      {!state.loading && !state.error && projection && !visible.length ? (
        <div className="sod29-world-convergence-state">לא נמצאו התכנסויות בסינון הזה.</div>
      ) : null}

      {visible.length ? (
        <div className="sod29-world-convergence-list">
          {visible.map((row, index) => (
            <article className={"sod29-world-convergence-row state-" + row.state} key={row.id}>
              <div className="sod29-world-convergence-rank" aria-label={"מיקום תצוגה " + String(index + 1)}>
                {index + 1}
              </div>
              <div className="sod29-world-convergence-copy">
                <div className="sod29-world-convergence-meta">
                  <span>{LAYER_LABELS[row.layer] || row.layer}</span>
                  <span className={"state-" + row.state}>{STATE_LABELS[row.state] || row.state}</span>
                  {row.contributor ? <span>{row.contributor}</span> : null}
                  {row.numbers?.slice(0, 4).map((n) => <span className="is-number" key={n}>{n}</span>)}
                </div>
                <strong>{row.label}</strong>
                {row.summary ? <p>{row.summary}</p> : null}
                <small>{profileSummary(row)}</small>
                <details>
                  <summary>למה זה מדורג כאן?</summary>
                  <ul>{row.explainWhy?.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <code>{row.sourceRef}</code>
                </details>
              </div>
              <div className="sod29-world-convergence-actions">
                {row.href ? <Link className="sod29-action" to={row.href}>פתח</Link> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {shown < filtered.length ? (
        <div className="sod29-world-convergence-more">
          <button className="sod29-action primary" type="button" onClick={() => setShown((value) => value + PAGE}>
            הצג עוד
          </button>
        </div>
      ) : null}

      {rawOpen ? (
        <div className="sod29-world-convergence-raw">
          <div>
            <div className="sod29-kicker">RAW DISCOVERY · INTERNAL</div>
            <h3>חומר מנוע סביב {filters.value || "העוגן"}</h3>
            <p>נטען רק לעוגן מספרי מפורש. group size / match count הם Signal בלבד — לא Rank מחקרי.</p>
          </div>
          {rawState.loading ? <div className="sod29-muted">טוען Raw לעוגן…</div> : null}
          {rawState.error ? <div className="sod29-world-convergence-state">Raw לא זמין לעוגן הזה.</div> : null}
          {rawState.detail ? (
            <>
              <div className="sod29-world-convergence-raw-grid">
                {rawState.detail.methods.map((method, index) => (
                  <div className="sod29-card" key={(method.method || "method") + ":" + String(index)}>
                    <div className="sod29-kicker">{method.method || "שיטה"}</div>
                    <h3>{method.group_size ?? 0} ביטויים</h3>
                    <p>{(method.phrases || []).slice(0, 8).join(" · ")}</p>
                  </div>
                ))}
              </div>
              <small className="sod29-muted">{rawState.detail.boundary}</small>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
