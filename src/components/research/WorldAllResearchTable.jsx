import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { filterWorldAllResearchRows } from "../../lib/research/worldAllResearchProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 120;

function AccessLabel({ value }) {
  if (value === "private") return <span className="sod29-world-all-research-access">private · גלוי לך</span>;
  if (value === "public_candidate") return <span className="sod29-world-all-research-access">public_candidate</span>;
  return <span className="sod29-world-all-research-access">{value || "גישה לא צוינה"}</span>;
}

function VerificationLabel({ row }) {
  // Explicit verification_state always outranks the legacy engine_verified boolean —
  // an explicit mismatch must never render as a verified checkmark.
  if (row.verification === "mismatch") return <span className="sod29-world-all-research-warn">אי־התאמה</span>;
  if (row.verification === "match") return <span className="sod29-world-all-research-ok">אומת במנוע</span>;
  if (row.verification === "legacy_signal") return <span className="sod29-world-all-research-muted">סימון ישן · לא אומת במפורש</span>;
  return <span className="sod29-world-all-research-muted">לא נבדק / לא חל</span>;
}

export default function WorldAllResearchTable({ state }) {
  const projection = state?.projection || null;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [kind, setKind] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [contributor, setContributor] = useState("all");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => filterWorldAllResearchRows(projection?.rows || [], {
    query, family, kind, access, status, verification, contributor,
  }), [projection, query, family, kind, access, status, verification, contributor]);

  if (!state?.enabled) return null;

  return <section className="sod29-section sod29-world-all-research" id="world-all-research" aria-label="כל חומר המחקר">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">HUMAN GATE · ALL RESEARCH</div>
        <h2>כל חומר המחקר על השולחן</h2>
        <p className="sod29-muted">אין כאן הסתרה לפי privacy_scope. אם החשבון שלך מורשה לקרוא רשומה, היא מופיעה כאן; privacy/status נשארים רק כתוויות שאפשר לסנן אחר כך.</p>
      </div>
      {projection ? <span className="sod29-chip">{projection.loaded} נטענו{projection.total !== projection.loaded ? " / " + projection.total : ""}</span> : null}
    </div>

    {state.loading ? <div className="sod29-world-all-research-state">טוען את כל Research OS המורשה לחשבון שלך…</div> : null}
    {state.error ? <div className="sod29-world-all-research-state">לא הצלחנו לקרוא את חומר המחקר. לא נחליף אותו ברשימה ציבורית מצומצמת.</div> : null}

    {projection ? <>
      <div className="sod29-world-all-research-summary">
        <span><b>{projection.total}</b> כל השכבות</span>
        <span><b>{projection.sourceTotals.research_object || 0}</b> Research Objects</span>
        <span><b>{projection.sourceTotals.source_message || 0}</b> מקורות / הודעות</span>
        <span><b>{projection.sourceTotals.contribution || 0}</b> תרומות מחקר</span>
        <span><b>{projection.sourceTotals.topic || 0}</b> Topics</span>
        <span><b>{projection.byAccess.private || 0}</b> private · גלויים לך</span>
      </div>

      {projection.truncated ? <div className="sod29-world-all-research-state">המאגר גדול מגבול הקריאה הנוכחי; מוצג כל מה שנטען והמצב מסומן כחלקי.</div> : null}

      <div className="sod29-world-all-research-filters">
        <label className="is-wide"><span>חיפוש בכל החומר</span><input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="טקסט, חוקר, מספר, מקור, source_ref…" /></label>
        <label><span>שכבה</span><select value={family} onChange={(e) => { setFamily(e.target.value); setShown(PAGE); }}><option value="all">כל השכבות</option>{Object.keys(projection.byFamily).sort().map((v) => <option value={v} key={v}>{v} · {projection.byFamily[v]}</option>)}</select></label>
        <label><span>סוג</span><select value={kind} onChange={(e) => { setKind(e.target.value); setShown(PAGE); }}><option value="all">כל הסוגים</option>{Object.keys(projection.byKind).sort().map((v) => <option value={v} key={v}>{v} · {projection.byKind[v]}</option>)}</select></label>
        <label><span>גישה</span><select value={access} onChange={(e) => { setAccess(e.target.value); setShown(PAGE); }}><option value="all">הכול · בלי הסתרה</option>{Object.keys(projection.byAccess).sort().map((v) => <option value={v} key={v}>{v} · {projection.byAccess[v]}</option>)}</select></label>
        <label><span>מצב</span><select value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }}><option value="all">כל המצבים</option>{Object.keys(projection.byStatus).sort().map((v) => <option value={v} key={v}>{v} · {projection.byStatus[v]}</option>)}</select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => { setVerification(e.target.value); setShown(PAGE); }}><option value="all">כל מצבי האימות</option>{Object.keys(projection.byVerification).sort().map((v) => <option value={v} key={v}>{v} · {projection.byVerification[v]}</option>)}</select></label>
        <label><span>חוקר / תורם</span><select value={contributor} onChange={(e) => { setContributor(e.target.value); setShown(PAGE); }}><option value="all">כל החוקרים</option>{Object.entries(projection.byContributor).sort((a,b) => b[1]-a[1]).map(([v,count]) => <option value={v} key={v}>{v} · {count}</option>)}</select></label>
      </div>

      <div className="sod29-world-all-research-count">מוצגים {Math.min(rows.length, shown)} מתוך {rows.length} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.slice(0, shown).map((row) => <article className="sod29-world-all-research-row" key={row.id}>
          <div className="sod29-world-all-research-row-head">
            <div className="sod29-world-all-research-tags">
              <span>{row.family}</span>
              <span>{row.kind}</span>
              {row.access ? <AccessLabel value={row.access} /> : null}
              <span>{row.status}</span>
              {row.mediaClass ? <span>{row.mediaClass}</span> : null}
            </div>
            <VerificationLabel row={row} />
          </div>

          {row.mediaUrl ? <img className="sod29-world-all-research-media" src={row.mediaUrl} loading="lazy" alt="" /> : null}
          <strong>{row.statement}</strong>
          {row.secondary && row.secondary !== row.statement ? <p className="sod29-world-all-research-secondary">{row.secondary}</p> : null}

          <div className="sod29-world-all-research-meta">
            {row.contributor ? <span>חוקר · {row.contributor}</span> : <span>חוקר לא צוין</span>}
            {row.value != null ? <span>ערך · {row.value}</span> : null}
            {row.source ? <span>מקור · {row.source}</span> : null}
            {row.createdAt ? <span>נוסף למחקר · {new Date(row.createdAt).toLocaleDateString("he-IL")}</span> : null}
          </div>

          {row.spatialCluster ? <div className="sod29-world-all-research-cluster">מחקר מרחבי · {row.spatialCluster}</div> : null}
          {row.sourceRef ? <code className="sod29-world-all-research-ref">{row.sourceRef}</code> : null}

          {row.href ? <div className="sod29-actions">
            {row.href.startsWith("/") ? <Link className="sod29-action" to={row.href}>פתח ←</Link> : <a className="sod29-action" href={row.href} target="_blank" rel="noreferrer">פתח מקור ↗</a>}
          </div> : null}
        </article>)}
      </div>

      {!rows.length ? <div className="sod29-world-all-research-state">אין פריטים במסנן הזה. אפס מסננים כדי לחזור לכל החומר.</div> : null}
      {shown < rows.length ? <div className="sod29-actions"><button className="sod29-action primary" type="button" onClick={() => setShown((n) => n + PAGE)}>הצג עוד {Math.min(PAGE, rows.length - shown)}</button></div> : null}

      <div className="sod29-world-all-research-boundary">{clean(projection.truthBoundary)}</div>
    </> : null}
  </section>;
}
