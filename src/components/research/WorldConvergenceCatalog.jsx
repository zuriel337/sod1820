import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  WORLD_CONVERGENCE_LANES,
  WORLD_CONVERGENCE_LENSES,
  buildWorldConvergenceCatalog,
} from "../../lib/research/worldConvergenceCatalog.js";

const PAGE = 60;

function VerificationBadge({ row }) {
  if (row.decisionChangingNegative) return <span className="sod29-world-catalog-badge is-alert">דורש בדיקה</span>;
  if (row.verificationState === "match") return <span className="sod29-world-catalog-badge is-ok">אומת</span>;
  if (row.verificationState === "legacy_verified_only") return <span className="sod29-world-catalog-badge">legacy verified</span>;
  if (row.lane === "approved") return <span className="sod29-world-catalog-badge">מאושר</span>;
  if (row.lane === "raw") return <span className="sod29-world-catalog-badge is-raw">Raw</span>;
  return <span className="sod29-world-catalog-badge">לא נבדק</span>;
}

function laneLabel(row) {
  if (row.lane === "approved") return "התכנסות מאושרת";
  if (row.lane === "candidate") return "מועמד Human Gate";
  if (row.lane === "research") return "Research Relation";
  return "Raw Discovery";
}

function CatalogRow({ row }) {
  const body = <>
    <div className="sod29-world-catalog-rank" aria-label={`מיקום ${row.displayRank} בעדשה`}>#{row.displayRank}</div>
    <div className="sod29-world-catalog-copy">
      <div className="sod29-world-catalog-meta">
        <span>{laneLabel(row)}</span>
        <VerificationBadge row={row} />
        {row.values?.slice(0, 4).map((value) => <span key={value}>{value}</span>)}
      </div>
      <strong>{row.label}</strong>
      {row.summary ? <p>{row.summary}</p> : null}
      <div className="sod29-world-catalog-profile">
        {row.independence?.groups != null ? <span>עצמאות · {row.independence.groups}</span> : null}
        {row.provenance?.present ? <span>מקור · יש</span> : <span>מקור · חסר</span>}
        {row.signals?.meter != null ? <span>meter · {row.signals.meter}</span> : null}
        {row.signals?.confidence != null ? <span>confidence · {row.signals.confidence}</span> : null}
        {row.dependency?.memberCount > 1 ? <span>קבוצת תלות · {row.dependency.memberCount}</span> : null}
      </div>
      <details className="sod29-world-catalog-why">
        <summary>למה זה כאן?</summary>
        <ul>{row.explainWhy.map((line, index) => <li key={index}>{line}</li>)}</ul>
      </details>
    </div>
    <div className="sod29-world-catalog-open">{row.href ? "פתח ←" : "Trace"}</div>
  </>;

  return row.href
    ? <Link className={`sod29-world-catalog-ranked-row lane-${row.lane}`} to={row.href}>{body}</Link>
    : <div className={`sod29-world-catalog-ranked-row lane-${row.lane}`}>{body}</div>;
}

export default function WorldConvergenceCatalog({ state, onLoadRaw }) {
  const [lens, setLens] = useState("balanced");
  const [lane, setLane] = useState("all");
  const [verification, setVerification] = useState("all");
  const [contributor, setContributor] = useState("all");
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const [includeRaw, setIncludeRaw] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const projection = useMemo(() => buildWorldConvergenceCatalog(state?.payload || {}, {
    lens,
    filters: { lane, verification, contributor, query, value, includeRaw },
  }), [state?.payload, lens, lane, verification, contributor, query, value, includeRaw]);

  const contributors = useMemo(() => [...new Set((state?.payload?.layers?.relations || [])
    .map((row) => String(row?.contributor || "").trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, "he")), [state?.payload]);

  if (!state?.enabled) return null;

  const toggleRaw = async () => {
    const next = !includeRaw;
    setIncludeRaw(next);
    if (next && !state?.payload?.raw?.included) await onLoadRaw?.();
    if (!next && lane === "raw") setLane("all");
  };

  return <section className="sod29-section sod29-world-convergence-catalog-2029" id="world-all-convergences" aria-label="כל ההתכנסויות — Human Gate">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">HUMAN GATE · CONVERGENCE CATALOG 2029</div>
        <h2>כל ההתכנסויות — מסודרות למחקר</h2>
        <p className="sod29-muted">
          אותו עולם, בלי טבלת־על חדשה: מאושרות, מועמדים ויחסי מחקר מתכנסים כאן לפי עדשת תצוגה שקופה.
          Raw Discovery נשאר חומר מנוע פנימי ואינו מגדיל חוזק מחקר.
        </p>
      </div>
      <span className="sod29-chip">{projection.filteredCount} במסנן</span>
    </div>

    {state.loading && !state.payload ? <div className="sod29-world-catalog-state">טוען את קטלוג המחקר…</div> : null}
    {state.error && !state.payload ? <div className="sod29-world-catalog-state is-error">הקטלוג לא זמין כרגע. לא נחליף אותו בחומר מומצא.</div> : null}

    {state.payload ? <>
      <div className="sod29-world-catalog-totals">
        <span>מאושרות · {state.payload.totals?.topics ?? 0}</span>
        <span>מועמדים · {state.payload.totals?.candidates ?? 0}</span>
        <span>Research Relations · {state.payload.totals?.relations ?? 0}</span>
        <span>Raw · {state.payload.totals?.raw == null ? "סגור" : state.payload.totals.raw}</span>
      </div>

      <div className="sod29-world-catalog-lenses" role="group" aria-label="עדשת דירוג">
        {WORLD_CONVERGENCE_LENSES.map((item) => <button
          type="button"
          key={item.key}
          className={`sod29-world-stream-filter${lens === item.key ? " is-active" : ""}`}
          aria-pressed={lens === item.key}
          onClick={() => { setLens(item.key); setShown(PAGE); }}
        >{item.label}</button>)}
      </div>

      <div className="sod29-world-catalog-controls is-2029">
        <label><span>חיפוש</span><input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="ביטוי, מקור, חוקר…" /></label>
        <label><span>מספר</span><input type="number" value={value} onChange={(e) => { setValue(e.target.value); setShown(PAGE); }} placeholder="1820" /></label>
        <label><span>שכבה</span><select value={lane} onChange={(e) => { setLane(e.target.value); setShown(PAGE); }}>
          {WORLD_CONVERGENCE_LANES.filter((item) => item.key !== "raw" || includeRaw).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => { setVerification(e.target.value); setShown(PAGE); }}>
          <option value="all">הכול</option><option value="match">אומת</option><option value="mismatch">אי־התאמה</option><option value="not_tested">לא נבדק</option>
        </select></label>
        <label><span>חוקר</span><select value={contributor} onChange={(e) => { setContributor(e.target.value); setShown(PAGE); }}>
          <option value="all">הכול</option>{contributors.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <button type="button" className={`sod29-action${includeRaw ? " primary" : ""}`} onClick={toggleRaw} disabled={state.loadingRaw}>
          {state.loadingRaw ? "פותח Raw…" : includeRaw ? "Raw פתוח" : "פתח Raw Discovery"}
        </button>
      </div>

      <div className="sod29-world-catalog-rank-note">{projection.disclaimer}</div>

      {projection.rows.length ? <div className="sod29-world-catalog-ranked-list">
        {projection.rows.slice(0, shown).map((row) => <CatalogRow key={row.id} row={row} />)}
      </div> : <div className="sod29-world-catalog-state">אין פריטים במסנן הזה.</div>}

      {projection.rows.length > shown ? <div className="sod29-world-catalog-more">
        <button type="button" className="sod29-action primary" onClick={() => setShown((n) => n + PAGE)}>הצג עוד</button>
      </div> : null}

      {includeRaw && state.payload.raw?.hasMore ? <div className="sod29-world-catalog-more">
        <button type="button" className="sod29-action" disabled={state.loadingRaw} onClick={() => onLoadRaw?.({ append: true })}>טען עוד Raw</button>
      </div> : null}
    </> : null}
  </section>;
}
