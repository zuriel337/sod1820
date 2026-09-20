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
  research_candidate: "Pending Candidates",
};

const VERIFICATION_LABELS = {
  all: "כל מצבי האימות",
  match: "מאומת",
  mismatch: "Mismatch",
  not_tested: "טרם נבדק",
  method_unknown: "שיטה לא זמינה",
  not_applicable: "לא חל",
  partial_needs_review: "התאמה חלקית · דורש סקירה",
  legacy_signal: "סימון legacy (לא מאומת)",
  review_required: "דורש בדיקה",
};

const layerLabel = (row) => row.layer === "topic_history"
  ? "Topic / composition"
  : row.layer === "research_candidate"
    ? "Research candidate"
    : "Research relation";

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

// Source Inspector: full source wording, contributor, source timestamp and a media LINK
// only (never an auto-loaded image element) — opening the original media is always an
// explicit user action.
function SourceOccurrence({ item }) {
  return <li className="sod29-conv-source">
    <div className="sod29-conv-source-head">
      <code>{item.baseRef}</code>
      {!item.resolved ? <span className="sod29-conv-source-missing">מקור לא נמצא בחומר שכבר נטען לסשן</span> : null}
    </div>
    {item.resolved ? <>
      {item.statement ? <p>{item.statement}</p> : null}
      {item.body ? <p className="sod29-conv-source-body">{item.body}</p> : null}
      <div className="sod29-conv-source-meta">
        {item.contributor ? <span>{item.contributor}</span> : null}
        {dateLabel(item.createdAt) ? <span>{dateLabel(item.createdAt)}</span> : null}
      </div>
      {item.mediaUrl ? <a className="sod29-conv-media-link" href={item.mediaUrl} target="_blank" rel="noreferrer">
        קישור מדיה מקורית ←
      </a> : null}
      {item.mediaRef ? <span className="sod29-conv-media-ref">
        הפניית מדיה מוגנת (לא קישור חיצוני): <code>{item.mediaRef}</code>
      </span> : null}
    </> : null}
  </li>;
}

// Dependency family members: each family stays one list row, but every member is
// inspectable here with its OWN id/label/verification/sourceRef(s)/contributor/status —
// no member borrows verification from a sibling.
function DependencyMembers({ dependency }) {
  if (!dependency || dependency.memberCount <= 1) return null;
  return <div className="sod29-conv-inspector-block sod29-conv-members">
    <span className="sod29-kicker">משפחת Dependency · {dependency.memberCount} חברים</span>
    <ul>
      {dependency.members.map((member) => <li key={member.id}>
        <b>{member.label}</b>
        <span>verification: {member.verification}</span>
        {member.engineVerificationStateRaw ? <span>engine: {member.engineVerificationStateRaw}</span> : null}
        <span>status: {member.status}</span>
        {member.contributor ? <span>{member.contributor}</span> : null}
        <code>{member.sourceRefs.join(" · ")}</code>
      </li>)}
    </ul>
  </div>;
}

// Source/Member Inspector — exact, not just first sourceRef: full provenance refs,
// resolved source occurrences, raw engine/scope verification states, the full dependency
// family, and (for Research Candidates) shared_sources/warnings/generatedBy kept separate
// from contributor. Progressive UI: nested under its own <details>, closed by default.
function RowInspector({ row }) {
  return <div className="sod29-conv-inspector">
    <div className="sod29-conv-inspector-block">
      <span className="sod29-kicker">כל הפניות המקור ({row.sourceRefs.length})</span>
      <ul className="sod29-conv-refs">{row.sourceRefs.map((ref) => <li key={ref}><code>{ref}</code></li>)}</ul>
    </div>
    {row.resolvedSources?.length ? <div className="sod29-conv-inspector-block">
      <span className="sod29-kicker">Source Inspector · ניסוח מלא</span>
      <ul className="sod29-conv-sources">{row.resolvedSources.map((item) => <SourceOccurrence item={item} key={item.baseRef} />)}</ul>
    </div> : null}
    {row.engineVerificationStateRaw || row.scopeVerificationStates?.length ? <div className="sod29-conv-inspector-block sod29-conv-scopes">
      <span className="sod29-kicker">מצבי אימות גולמיים · engine + scoped</span>
      <ul>
        {row.engineVerificationStateRaw ? <li>engine_detail: {row.engineVerificationStateRaw}</li> : null}
        {(row.scopeVerificationStates || []).map((entry) => <li key={entry.key}>{entry.key}: {entry.state}</li>)}
      </ul>
    </div> : null}
    <DependencyMembers dependency={row.dependency} />
    {row.layer === "research_candidate" ? <div className="sod29-conv-inspector-block sod29-conv-candidate-detail">
      <span className="sod29-kicker">Research Candidate · מקורות משותפים ואזהרות</span>
      {row.generatedBy ? <div>נוצר על־ידי (agent): {row.generatedBy}</div> : null}
      {row.sharedSources?.length
        ? <div>{row.sharedSources.length} shared_sources (לא עדות עצמאית):
            <ul className="sod29-conv-shared-sources">
              {row.sharedSources.map((entry) => <li key={entry.baseSource || entry.members.join(",")}>
                <code>{entry.baseSource || "ללא base_source"}</code>
                {entry.members.length ? <span> · {entry.members.length} members</span> : null}
              </li>)}
            </ul>
          </div>
        : <div>אין shared_sources מתועדים.</div>}
      {row.warnings?.length ? <ul>{row.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
    </div> : null}
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
        <Stat label="Candidates פתוחים" value={projection.pendingCandidates} />
        <Stat label="Relations מאומתות" value={projection.verifiedRelations} />
        <Stat label="דורש החלטה" value={projection.decisionChanging} detail="סתירה / mismatch / negative" />
        <Stat label="רב־הפניה" value={projection.multiTrace} detail="לא בהכרח ראיות עצמאיות" />
      </div>

      {projection.candidateError ? <div className="sod29-conv-error">
        שכבת Research Candidates לא נטענה; שאר ההתכנסויות נשארות זמינות. {projection.candidateError}
      </div> : null}

      {z ? <div className="sod29-conv-zvi">
        <div>
          <span className="sod29-kicker">ZVI · FULL CORPUS COVERAGE</span>
          <strong>{z.linkedSources} / {z.totalSources} Source Artifacts (פריטי מקור) כבר מקושרים ל־Research Object</strong>
          <small>
            {z.unlinkedSources} Source Artifacts עדיין ללא Research Object מקושר · מתוכם {z.exactDuplicateOccurrences} חזרות מדויקות ·{" "}
            {z.uniqueUnlinked} Source Artifacts ייחודיים (compound: טקסט+מדיה) נשארו לסינון. זו ספירת מלאי מקורות/Media
            Lineage, ולא ספירת Findings.
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
          <option value="all">{VERIFICATION_LABELS.all}</option>
          {optionsFrom(projection.byVerification).map((value) => <option value={value} key={value}>{VERIFICATION_LABELS[value] || value}</option>)}
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
              {row.recommendation ? <span>candidate: {row.recommendation}</span> : null}
            </div>
            <h3>{row.label}</h3>
            {row.summary ? <p>{row.summary}</p> : null}
            <div className="sod29-conv-chips">
              <span>verification: {row.verification}</span>
              <span>status: {row.status}</span>
              {row.provenanceCount ? <span>{row.provenanceCount} provenance refs</span> : null}
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
            <details className="sod29-conv-inspector-toggle">
              <summary>Source/Member Inspector · פרטים מלאים</summary>
              <RowInspector row={row} />
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
