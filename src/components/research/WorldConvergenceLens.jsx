import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  WORLD_CONVERGENCE_ATTENTION,
  WORLD_CONVERGENCE_FILTER_DEFAULTS,
  WORLD_CONVERGENCE_SORTS,
  buildWorldConvergenceLensProjection,
  filterWorldConvergenceRows,
  orderWorldConvergenceRows,
} from "../../lib/research/worldConvergenceLensProjection.js";
import "./world-convergence-lens.css";

const PAGE = 60;

const LAYER_LABELS = {
  all: "כל השכבות",
  topic_history: "Topics מאושרים / היסטוריים",
  research_relation: "Research Relations",
};

const VERIFICATION_LABELS = {
  all: "כל מצבי האימות",
  match: "מאומת",
  mismatch: "Mismatch",
  not_tested: "טרם נבדק",
  method_unknown: "שיטה לא זמינה",
  not_applicable: "לא חל",
};

const layerLabel = (row) => row.layer === "topic_history" ? "Topic / composition" : "Research relation";

function optionsFrom(counts, fallback = "לא צוין") {
  return Object.keys(counts || {}).filter(Boolean).sort((a, b) => {
    if (a === fallback) return 1;
    if (b === fallback) return -1;
    return a.localeCompare(b, "he");
  });
}

function dateLabel(value) {
  if (!value) return null;
  try { return new Date(value).toLocaleDateString("he-IL"); } catch (_) { return null; }
}

function Stat({ label, value, detail = null }) {
  return <div className="sod29-conv-stat">
    <strong>{value}</strong>
    <span>{label}</span>
    {detail ? <small>{detail}</small> : null}
  </div>;
}

export default function WorldConvergenceLens({ state }) {
  const projection = useMemo(
    () => state?.projection ? buildWorldConvergenceLensProjection(state.projection) : null,
    [state?.projection]
  );
  const [filters, setFilters] = useState(WORLD_CONVERGENCE_FILTER_DEFAULTS);
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    if (!projection) return [];
    return orderWorldConvergenceRows(
      filterWorldConvergenceRows(projection.rows, filters),
      filters.sort
    );
  }, [projection, filters]);

  if (!state?.enabled) return null;

  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setVisible(PAGE);
  };

  const z = projection?.zviCoverage;
  const shown = filtered.slice(0, visible);

  return <section className="sod29-section sod29-conv-lens" aria-label="Convergence 2029 Human Gate">
    <div className="sod29-conv-head">
      <div>
        <div className="sod29-kicker">HUMAN GATE · CONVERGENCE 2029</div>
        <h2>כל ההתכנסויות · Ranked Lens</h2>
        <p>
          מסך אחד מעל אותם מקורות־אמת: Topic היסטורי/מאושר + Research Relation.
          הסדר רב־ממדי ושקוף; אין כאן “ציון אמת” אחד.
        </p>
      </div>
      <div className="sod29-conv-boundary">
        <strong>Rank ≠ Truth</strong>
        <span>mismatch · verification · governance · provenance · curation · recency</span>
      </div>
    </div>

    {state.loading ? <div className="sod29-conv-loading">בונה את עדשת ההתכנסויות מתוך החומר שכבר הותר לסשן הזה…</div> : null}
    {state.error ? <div className="sod29-conv-error">העדשה לא נטענה. חומר חסר אינו מוחלף בחומר אחר.</div> : null}

    {projection ? <>
      <div className="sod29-conv-stats">
        <Stat label="במסלול ההתכנסות" value={projection.total} detail="לא כולל Raw legacy buckets" />
        <Stat label="Topics מאושרים" value={projection.approvedTopics} />
        <Stat label="Relations מחקריות" value={projection.researchRelations} />
        <Stat label="Relations מאומתות" value={projection.verifiedRelations} />
        <Stat label="דורש החלטה" value={projection.decisionChanging} detail="סתירה / mismatch / negative" />
        <Stat label="רב־מקור" value={projection.multiSource} />
      </div>

      {z ? <div className="sod29-conv-zvi">
        <div>
          <span className="sod29-kicker">ZVI · FULL CORPUS COVERAGE</span>
          <strong>{z.linkedSources} / {z.totalSources} מקורות כבר מחוברים למחקר</strong>
          <small>
            {z.unlinkedSources} עדיין ללא Research Object · מתוכם {z.exactDuplicateOccurrences} חזרות מדויקות ·{" "}
            {z.uniqueUnlinked} מקורות ייחודיים נשארו לסינון
          </small>
        </div>
        <div className="sod29-conv-zvi-buckets">
          {Object.entries(z.buckets).sort((a,b) => b[1]-a[1]).map(([key, count]) =>
            <span key={key}><b>{count}</b>{key}</span>
          )}
        </div>
      </div> : null}

      <div className="sod29-conv-controls">
        <label className="sod29-conv-search">
          <span>חיפוש</span>
          <input
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="מספר, ביטוי, מקור, חוקר, Batch…"
          />
        </label>
        <label><span>שכבה</span><select value={filters.layer} onChange={(e) => update("layer", e.target.value)}>
          {Object.entries(LAYER_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label><span>מיקוד</span><select value={filters.attention} onChange={(e) => update("attention", e.target.value)}>
          {Object.entries(WORLD_CONVERGENCE_ATTENTION).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label><span>אימות</span><select value={filters.verification} onChange={(e) => update("verification", e.target.value)}>
          {Object.entries(VERIFICATION_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label><span>סטטוס</span><select value={filters.status} onChange={(e) => update("status", e.target.value)}>
          <option value="all">כל הסטטוסים</option>
          {optionsFrom(projection.byStatus).map((value) => <option value={value} key={value}>{value}</option>)}
        </select></label>
        <label><span>חוקר</span><select value={filters.contributor} onChange={(e) => update("contributor", e.target.value)}>
          <option value="all">כל החוקרים</option>
          {optionsFrom(projection.byContributor).map((value) => <option value={value} key={value}>{value}</option>)}
        </select></label>
        <label><span>Batch</span><select value={filters.batch} onChange={(e) => update("batch", e.target.value)}>
          <option value="all">כל ה־Batches</option>
          {optionsFrom(projection.byBatch, "לא צוין").filter((value) => value !== "לא צוין").map((value) => <option value={value} key={value}>{value}</option>)}
        </select></label>
        <label><span>סדר</span><select value={filters.sort} onChange={(e) => update("sort", e.target.value)}>
          {Object.entries(WORLD_CONVERGENCE_SORTS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
      </div>

      <div className="sod29-conv-resultbar">
        <strong>{filtered.length}</strong>
        <span>פריטים במסנן</span>
        <small>המיקום # הוא סדר התצוגה הנוכחי בלבד.</small>
      </div>

      {!shown.length ? <div className="sod29-conv-empty">אין התכנסויות במסנן הזה.</div> : null}

      <div className="sod29-conv-list">
        {shown.map((row, index) => <article className={`sod29-conv-row${row.decisionChanging ? " is-attention" : ""}`} key={row.id}>
          <div className="sod29-conv-rank" title="מיקום בתצוגה הנוכחית — לא ציון אמת">#{index + 1}</div>
          <div className="sod29-conv-body">
            <div className="sod29-conv-meta">
              <span>{layerLabel(row)}</span>
              <span className={`sod29-conv-class${row.decisionChanging ? " is-attention" : ""}`}>{row.classification}</span>
              {row.value != null ? <b>{row.value}</b> : null}
              {row.batchKey ? <span>{row.batchKey}</span> : null}
            </div>
            <h3>{row.label}</h3>
            {row.summary ? <p>{row.summary}</p> : null}
            <div className="sod29-conv-chips">
              <span>verification: {row.verification}</span>
              <span>status: {row.status}</span>
              {row.provenanceCount ? <span>{row.provenanceCount} provenance</span> : null}
              {row.contributor ? <span>{row.contributor}</span> : null}
              {row.meterScore != null ? <span>meter {row.meterScore}</span> : null}
              {row.quality != null ? <span>quality {row.quality}</span> : null}
              {dateLabel(row.createdAt) ? <span>{dateLabel(row.createdAt)}</span> : null}
            </div>
            <details className="sod29-conv-why">
              <summary>למה הוא כאן?</summary>
              <ul>{row.explainWhy.map((line) => <li key={line}>{line}</li>)}</ul>
              {row.sourceRef ? <code>{row.sourceRef}</code> : null}
            </details>
          </div>
          <div className="sod29-conv-open">
            {row.href ? <Link to={row.href}>פתח ←</Link> : <span>ללא יעד ישיר</span>}
          </div>
        </article>)}
      </div>

      {visible < filtered.length ? <button className="sod29-conv-more" type="button" onClick={() => setVisible((v) => v + PAGE)}>
        הצג עוד {Math.min(PAGE, filtered.length - visible)}
      </button> : null}

      <div className="sod29-conv-foot">
        <p>{projection.truthBoundary}</p>
        <p>{projection.rawDiscoveryBoundary}</p>
        <p>
          Cross-Method/Core-Axis נשאר contextual לפי מספר/עוגן. הוא לא נטען כפיד גלובלי כדי למנוע
          raw-volume inflation ולעמוד ב־dependency-before-rank.
        </p>
      </div>
    </> : null}
  </section>;
}
