import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  WORLD_CONVERGENCE_LAYERS,
  WORLD_CONVERGENCE_SORTS,
  compareWorldConvergenceItems,
  filterWorldConvergenceCatalogItems,
} from "../../lib/research/worldConvergenceCatalog.js";

const PAGE_SIZE = 60;

const clean = (value) => value == null ? "" : String(value).trim();

const VERIFICATION_LABELS = Object.freeze({
  match: "אומת",
  mismatch: "אי־התאמה",
  method_unknown: "שיטה לא זמינה",
  not_tested: "טרם נבדק",
});

const LAYER_LABELS = Object.freeze({
  curated: "מאושר",
  candidate: "מועמד",
  research: "Research",
  cross_core: "Cross/Core",
  raw: "Raw",
});

function profileWhy(item) {
  const p = item?.profile || {};
  const lines = [];
  if (p.decisionChanging) lines.push("יש כאן סתירה/אי־התאמה או מועמד לתיקון שיכול לשנות החלטה.");
  if (p.verification === "match") lines.push("לפחות חבר אחד במוקד נושא verification=match מפורש.");
  if (p.independentEvidenceGroups != null) lines.push(`${p.independentEvidenceGroups} קבוצות ראיה עצמאיות דווחו במקור המחקרי.`);
  if (p.provenanceCount) lines.push(`${p.provenanceCount} הפניות provenance ייחודיות נשמרו.`);
  if (p.humanCuration === "approved") lines.push("קיים Topic/Convergence מאושר ב-Human Gate.");
  if (p.recommendations?.includes("strong")) lines.push("Research Candidate קיים סומן strong; זהו אות מחקרי, לא Truth.");
  if (p.sourceNative?.meter != null) lines.push(`meter_score legacy=${p.sourceNative.meter} משמש רק שובר שוויון בתוך משפחת Topic.`);
  return lines.length ? lines : ["המוקד מוצג לפי פרופיל prominence שקוף; אין כאן ציון אמת אוניברסלי."];
}

function profileMetric(label, value) {
  return <span className="sod29-conv-rank-metric"><small>{label}</small><strong>{value}</strong></span>;
}

function memberTitle(member) {
  if (member.memberType === "curated") return "Topic מאושר";
  if (member.memberType === "candidate") return "Research Candidate";
  return "Research Relation";
}

export default function WorldConvergenceCatalog({ state }) {
  const projection = state?.projection || null;
  const [filters, setFilters] = useState({
    query: "",
    number: "",
    layer: "all",
    verification: "all",
    contributor: "all",
    attention: "all",
    sort: "attention",
  });
  const [shown, setShown] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    if (!projection?.items) return [];
    const filtered = filterWorldConvergenceCatalogItems(projection.items, filters);
    return [...filtered].sort((a, b) => compareWorldConvergenceItems(a, b, filters.sort));
  }, [projection, filters]);

  if (!state?.enabled) return null;

  const reviewCount = projection?.items?.filter((item) => item.profile?.decisionChanging).length || 0;
  const verifiedCount = projection?.items?.filter((item) => item.profile?.verification === "match").length || 0;
  const curatedCount = projection?.items?.filter((item) => item.profile?.humanCuration === "approved").length || 0;

  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setShown(PAGE_SIZE);
  };

  return (
    <section className="sod29-section sod29-conv-rank-section" aria-label="Convergence 2029">
      <div className="sod29-conv-rank-head">
        <div>
          <div className="sod29-kicker">HUMAN GATE · CONVERGENCE 2029</div>
          <h2>כל ההתכנסויות · לפי פרופיל מחקרי</h2>
          <p>
            Topic, Candidate ו־Research Relation מתכנסים כאן לאותו מוקד בלי להעתיק אמת.
            הראנק מסדר תשומת־לב בלבד: אימות, עצמאות, provenance, סתירות ואוצרות נשארים ממדים נפרדים.
          </p>
        </div>
        <div className="sod29-conv-rank-summary">
          {profileMetric("מוקדים", projection?.total ?? "—")}
          {profileMetric("חברים", projection?.memberCount ?? "—")}
          {profileMetric("דורש הכרעה", reviewCount)}
          {profileMetric("מאומת", verifiedCount)}
          {profileMetric("מאושר", curatedCount)}
        </div>
      </div>

      {state?.loading ? <div className="sod29-muted">בונה projection מאוחד…</div> : null}
      {state?.error ? <div className="sod29-note">הקטלוג לא נטען במלואו. המערכת לא משלימה נתונים חסרים בהשערה.</div> : null}

      {projection ? <>
        <div className="sod29-conv-rank-capabilities">
          <span className={projection.capabilities?.curated ? "is-ready" : "is-missing"}>Topics</span>
          <span className={projection.capabilities?.research ? "is-ready" : "is-missing"}>Research</span>
          <span className={projection.capabilities?.candidates ? "is-ready" : "is-missing"}>Candidates</span>
          <span className={projection.capabilities?.crossCore ? "is-ready" : "is-missing"}>Cross/Core · adapter pending</span>
          <span className={projection.capabilities?.rawLegacy ? "is-ready" : "is-internal"}>Raw · פנימי / כבוי</span>
        </div>

        <div className="sod29-conv-rank-filters">
          <label>
            <span>חיפוש</span>
            <input value={filters.query} onChange={(e) => update("query", e.target.value)} placeholder="ביטוי, מקור, מספר…" />
          </label>
          <label>
            <span>מספר</span>
            <input inputMode="numeric" value={filters.number} onChange={(e) => update("number", e.target.value.replace(/[^0-9-]/g, ""))} placeholder="1820" />
          </label>
          <label>
            <span>שכבה</span>
            <select value={filters.layer} onChange={(e) => update("layer", e.target.value)}>
              <option value="all">כל השכבות הבשלות</option>
              <option value="curated">{WORLD_CONVERGENCE_LAYERS.curated.short}</option>
              <option value="candidate">{WORLD_CONVERGENCE_LAYERS.candidate.short}</option>
              <option value="research">{WORLD_CONVERGENCE_LAYERS.research.short}</option>
            </select>
          </label>
          <label>
            <span>אימות</span>
            <select value={filters.verification} onChange={(e) => update("verification", e.target.value)}>
              <option value="all">הכול</option>
              <option value="match">אומת</option>
              <option value="mismatch">אי־התאמה</option>
              <option value="not_tested">טרם נבדק</option>
            </select>
          </label>
          <label>
            <span>תשומת לב</span>
            <select value={filters.attention} onChange={(e) => update("attention", e.target.value)}>
              <option value="all">הכול</option>
              <option value="review">דורש הכרעה</option>
              <option value="verified">מאומת</option>
              <option value="curated">מאושר</option>
            </select>
          </label>
          <label>
            <span>חוקר / מקור</span>
            <select value={filters.contributor} onChange={(e) => update("contributor", e.target.value)}>
              <option value="all">כולם</option>
              {(projection.contributors || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <span>סדר</span>
            <select value={filters.sort} onChange={(e) => update("sort", e.target.value)}>
              {Object.entries(WORLD_CONVERGENCE_SORTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>

        <div className="sod29-conv-rank-results-head">
          <strong>{rows.length} מוקדים מתאימים</strong>
          <span>Rank ≠ Truth · mismatch יכול לעלות למעלה כי הוא משנה החלטה</span>
        </div>

        <div className="sod29-conv-rank-list">
          {rows.slice(0, shown).map((item, index) => {
            const p = item.profile || {};
            const values = item.values || [];
            return <article key={item.id} className={`sod29-conv-rank-card ${p.decisionChanging ? "is-review" : ""}`}>
              <div className="sod29-conv-rank-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="sod29-conv-rank-main">
                <div className="sod29-conv-rank-title-row">
                  <div>
                    <span className="sod29-conv-rank-band">{p.prominenceBand}</span>
                    <h3>{item.title}</h3>
                  </div>
                  {values.length ? <div className="sod29-conv-rank-values">{values.slice(0, 5).map((v) => <b key={v}>{v}</b>)}</div> : null}
                </div>
                {item.summary ? <p>{item.summary}</p> : null}

                <div className="sod29-conv-rank-badges">
                  {(item.layers || []).map((layer) => <span key={layer}>{LAYER_LABELS[layer] || layer}</span>)}
                  <span>{VERIFICATION_LABELS[p.verification] || p.verification || "ללא verification"}</span>
                  {p.independentEvidenceGroups != null ? <span>{p.independentEvidenceGroups} קבוצות עצמאיות</span> : null}
                  {p.provenanceCount ? <span>{p.provenanceCount} provenance</span> : null}
                  {p.humanCuration ? <span>{p.humanCuration}</span> : null}
                </div>

                <details className="sod29-conv-rank-why">
                  <summary>למה זה מדורג כאן?</summary>
                  <ul>
                    {profileWhy(item).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </details>

                <details className="sod29-conv-rank-members">
                  <summary>{item.members.length} שכבות / חברים במוקד</summary>
                  <div>
                    {item.members.map((member) => <div key={member.id} className="sod29-conv-rank-member">
                      <strong>{memberTitle(member)}</strong>
                      <span>{member.label}</span>
                      {member.verificationState ? <small>{VERIFICATION_LABELS[member.verificationState] || member.verificationState}</small> : null}
                      {member.reviewReason ? <small>{member.reviewReason}</small> : null}
                    </div>)}
                  </div>
                </details>
              </div>
              <div className="sod29-conv-rank-action">
                {item.href ? <Link className="sod29-chip" to={item.href}>פתח ←</Link> : <span className="sod29-muted">ללא יעד</span>}
              </div>
            </article>;
          })}
        </div>

        {shown < rows.length ? <button type="button" className="sod29-button ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>הצג עוד</button> : null}

        <div className="sod29-conv-rank-boundary">
          <strong>גבול 2029</strong>
          <span>{projection.truthBoundary}</span>
          <span>Cross/Core הגלובלי לא נקרא מה־view החי עד שיהיה adapter מהיר; Raw legacy נשאר פנימי וכבוי כברירת מחדל.</span>
        </div>
      </> : null}
    </section>
  );
}
