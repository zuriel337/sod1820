import React from "react";
import { Link } from "react-router-dom";
import { relationStatusCopy } from "../../lib/research/worldMapViewModel2029.js";

const LAYER_SECTIONS = Object.freeze([
  ["calculation", "חישוב (מנוע רשום)"],
  ["oneZeroDerivation", "נגזרת אחד־ואפס"],
  ["interpretation", "פרשנות"],
]);

function Href({ href, children }) {
  if (!href) return <span>{children}</span>;
  return href.startsWith("/") ? <Link to={href}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}
function Time({ times }) {
  const rows = [["occurredAt", "אירע"], ["publishedAt", "פורסם"], ["updatedAt", "עודכן"]].filter(([key]) => times?.[key]);
  return rows.length ? <dl className="wm29-facts">{rows.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{times[key]}</dd></div>)}</dl> : null;
}

// Layers are separate sections. A missing layer says "not loaded", never "none".
function Layers({ layers }) {
  return <section className="wm29-layers" aria-label="שכבות חישוב ופרשנות">
    {LAYER_SECTIONS.map(([key, title]) => {
      const rows = layers?.[key];
      return <div key={key} className={`wm29-layer wm29-layer-${key}`} data-layer={key}>
        <h4>{title}</h4>
        {rows?.length ? <ul>{rows.map((row, index) => <li key={`${row.label}:${index}`}>
          <strong>{row.label}</strong>: <bdi>{row.value}</bdi>
          {row.basis ? <small>{row.basis}</small> : null}
        </li>)}</ul> : <p className="wm29-muted">לא נטען בתצוגה זו.</p>}
      </div>;
    })}
  </section>;
}

function RelationPanel({ target, relation, onOpen, disabled }) {
  const status = relation?.status || (target ? "idle" : "unavailable");
  const count = relation?.relations?.length || 0;
  return <section className="wm29-relations" aria-label="קשרי עץ מתועדים">
    <h4>קשרי עץ מתועדים</h4>
    {target && status === "idle" ? <button type="button" onClick={onOpen} disabled={disabled}>פתיחת קשרים מתועדים</button> : null}
    {target && (status === "partial" || status === "failed") ? <button type="button" onClick={onOpen}>נסו לפתוח שוב</button> : null}
    <p role="status" className={`wm29-relation-status wm29-relation-${status}`} data-relation-status={status}>{relationStatusCopy(status, count)}</p>
    {count ? <ul>{relation.relations.map((row) => <li key={row.edgeRef}>
      {row.fromLabel || "פריט"} · {row.relationType} · {row.toLabel || "פריט"}
    </li>)}</ul> : null}
  </section>;
}

export default function WorldSourceInspector2029({
  detail, layers, relation, relationTarget, onOpenRelations, relationsDisabled, candidates = [],
  onClose, asSheet = false, expanded = false, onToggleExpanded, headingRef,
}) {
  const open = Boolean(detail);
  const sheetProps = asSheet ? { role: "dialog", "aria-modal": "false", "aria-labelledby": "wm29-inspector-title" } : { role: "complementary", "aria-labelledby": "wm29-inspector-title" };
  return <aside className="wm29-inspector" data-open={open} data-sheet={asSheet || undefined} data-expanded={expanded || undefined} {...sheetProps}
    hidden={asSheet && !open}>
    {asSheet ? <button type="button" className="wm29-sheet-handle" aria-expanded={expanded} onClick={onToggleExpanded}>
      <span aria-hidden="true" className="wm29-sheet-grip" />{expanded ? "כיווץ הפרטים" : "הרחבת הפרטים"}
    </button> : null}
    <header className="wm29-inspector-head">
      <h3 id="wm29-inspector-title" ref={headingRef} tabIndex={-1}>{detail ? detail.title : "פרטי מקור"}</h3>
      {open ? <button type="button" className="wm29-close" onClick={onClose} aria-label="סגירת חלונית הפרטים">✕</button> : null}
    </header>
    {!detail ? <p className="wm29-muted">בחרו מקור, הופעה או ממצא בקנבס כדי לראות את פרטיו. כל שכבה מוצגת בנפרד.</p> : <div className="wm29-inspector-body">
      <p className="wm29-kind"><span className={`wm29-swatch wm29-node-${detail.kind}`} aria-hidden="true" />{detail.kindLabel}</p>
      {detail.kind !== "tree" ? <p className="wm29-boundary">{detail.boundary}</p> : null}

      {detail.kind === "source" ? <>
        <dl className="wm29-facts">
          {detail.contributor?.label ? <div><dt>כותב</dt><dd><Href href={detail.contributor.href}>{detail.contributor.label}</Href></dd></div> : null}
          {detail.publisher?.label ? <div><dt>מפרסם</dt><dd>{detail.publisher.label}</dd></div> : null}
          {detail.href ? <div><dt>קריאה במקור</dt><dd><Href href={detail.href}>פתיחת המקור</Href></dd></div> : null}
        </dl>
        <p className="wm29-counts">{detail.occurrences.length} הופעות · {detail.findings.length} ממצאים נשענים על המקור. הם אינם מקורות נוספים.</p>
        {detail.tags.length ? <p className="wm29-tags">{detail.tags.map((tag) => <span key={tag.key} className="wm29-tag">{tag.kind} · {tag.label}</span>)}<small>{detail.tagNote}</small></p> : null}
      </> : null}

      {detail.kind === "occurrence" ? <>
        <dl className="wm29-facts">

          {detail.locator ? <div><dt>מיקום</dt><dd>{detail.locator}</dd></div> : null}
          {detail.href ? <div><dt>קריאה</dt><dd><Href href={detail.href}>פתיחת ההופעה</Href></dd></div> : null}
        </dl>
        <Time times={detail.times} />
      </> : null}

      {detail.kind === "finding" ? <>
        <dl className="wm29-facts">

          {detail.stage ? <div><dt>שלב</dt><dd>{detail.stage}</dd></div> : null}
          {detail.verificationState ? <div><dt>אימות</dt><dd>{detail.verificationState}</dd></div> : null}
          {detail.publicationState ? <div><dt>פרסום</dt><dd>{detail.publicationState}</dd></div> : null}
          {detail.href ? <div><dt>קריאה</dt><dd><Href href={detail.href}>פתיחת הממצא</Href></dd></div> : null}
        </dl>
        <Layers layers={layers} />
        <RelationPanel target={relationTarget} relation={relation} onOpen={onOpenRelations} disabled={relationsDisabled} />
        {candidates.length ? <section className="wm29-candidates" aria-label="הצעות שאינן קשרי עץ">
          <h4>הצעות — אינן קשרי עץ</h4>
          <ul>{candidates.map((candidate) => <li key={candidate.candidateRef}>{candidate.label}<small>{candidate.basis} · הצעה לעיון, שאינה קשר מתועד בעץ.</small></li>)}</ul>
        </section> : null}
      </> : null}

      {detail.kind === "tree" ? <p>קשר מתועד בעץ.</p> : null}
    </div>}
  </aside>;
}
