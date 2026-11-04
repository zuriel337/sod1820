import React from "react";
import { Link } from "react-router-dom";
import { relationStatusCopy } from "../../lib/research/worldMapViewModel2029.js";
import { publicContextLabel } from "../experience2029/razielSessionSeam2029.js";

const LAYER_SECTIONS = Object.freeze([
  ["calculation", "חישוב (מנוע רשום)"],
  ["oneZeroDerivation", "נגזרת אחד־ואפס"],
  ["interpretation", "פרשנות"],
]);

function Ref({ children }) {
  return <code dir="ltr" className="wm29-ref">{children}</code>;
}
function TechnicalDetails({ refs = [] }) {
  const values = [...new Set(refs.filter((ref) => ref != null && String(ref).trim()).map(String))];
  return values.length ? <details><summary>פרטי מקור</summary>{values.map((value) => <p key={value}><Ref>{value}</Ref></p>)}</details> : null;
}
function readableLabel(value, fallback) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label || /^(?:uf1|node|channel_updates|world-material|edge|fixture|governance):/i.test(label)
    || /^(?:topic|post|source|finding|occurrence|tree|candidate|relation|related|mentions|unknown)$/i.test(label)) return fallback;
  return publicContextLabel(label, 120) || fallback;
}
const STAGE_HE = Object.freeze({ candidate: "מועמד", finding: "ממצא", evidence: "ראיה", claim: "טענה", interpretation: "פרשנות" });
const GOVERNANCE_HE = Object.freeze({ candidate: "מועמד", approved: "מאושר", canonical: "קנוני", published: "פורסם", rejected: "נדחה", draft: "טיוטה" });
const VERIFICATION_HE = Object.freeze({
  match: "אומת", mismatch: "נמצאה אי־התאמה", not_tested: "טרם נבדק", method_unknown: "שיטת הבדיקה אינה ידועה",
  partial: "בדיקה חלקית", partial_needs_review: "בדיקה חלקית — דורשת עיון",
  partial_match_with_mismatch: "בדיקה חלקית עם אי־התאמה", partial_match_with_mismatches: "בדיקה חלקית עם אי־התאמות",
  legacy_signal: "סימון היסטורי — נדרש בירור", trace_unavailable: "בדיקת האימות אינה זמינה", trace_error: "בדיקת האימות נכשלה",
});
const axisHe = (map, value, fallback) => map[String(value ?? "").trim().toLowerCase()] || fallback;
function Href({ href, children }) {
  if (!href) return <span>{children}</span>;
  return href.startsWith("/") ? <Link to={href}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}
function Time({ times }) {
  const rows = [["occurredAt", "אירע"], ["publishedAt", "פורסם"], ["updatedAt", "עודכן"]].filter(([key]) => times?.[key]);
  return rows.length ? <dl className="wm29-facts">{rows.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{times[key]}</dd></div>)}</dl> : null;
}

// Layers are separate sections. A missing layer says "not loaded", never "none".
function Layers({ layers, humanReadable = false }) {
  return <section className="wm29-layers" aria-label="שכבות חישוב ופרשנות">
    {LAYER_SECTIONS.map(([key, title]) => {
      const rows = layers?.[key];
      return <div key={key} className={`wm29-layer wm29-layer-${key}`} data-layer={key}>
        <h4>{title}</h4>
        {rows?.length ? <ul>{rows.map((row, index) => <li key={`${row.label}:${index}`}>
          <strong>{humanReadable ? readableLabel(row.label, "פרט מחקר") : row.label}</strong>: <bdi>{humanReadable ? readableLabel(String(row.value ?? ""), "אין נתון") : row.value}</bdi>
          {row.basis ? <small>{humanReadable ? readableLabel(row.basis, "הבסיס שמור בפרטי המקור") : row.basis}</small> : null}
          {humanReadable ? <TechnicalDetails refs={[row.basis]} /> : null}
        </li>)}</ul> : <p className="wm29-muted">לא נטען בתצוגה זו.</p>}
      </div>;
    })}
  </section>;
}

function RelationPanel({ target, relation, onOpen, disabled, humanReadable = false }) {
  const status = relation?.status || (target ? "idle" : "unavailable");
  const count = relation?.relations?.length || 0;
  return <section className="wm29-relations" aria-label="קשרי עץ מתועדים">
    <h4>קשרי עץ מתועדים</h4>
    {target && status === "idle" ? <button type="button" onClick={onOpen} disabled={disabled}>פתיחת קשרים מתועדים</button> : null}
    {target && (status === "partial" || status === "failed") ? <button type="button" onClick={onOpen}>נסו לפתוח שוב</button> : null}
    <p role="status" className={`wm29-relation-status wm29-relation-${status}`} data-relation-status={status}>{relationStatusCopy(status, count)}</p>
    {count ? <ul>{relation.relations.map((row) => <li key={row.edgeRef}>
      {humanReadable ? <>
        {readableLabel(row.fromLabel, "מקור מתועד")} · קשר מתועד · {readableLabel(row.toLabel, "יעד מתועד")}
        <TechnicalDetails refs={[row.edgeRef, row.fromNodeId, row.toNodeId, row.relationType]} />
      </> : <>{row.fromLabel || row.fromNodeId} · {row.relationType} · {row.toLabel || row.toNodeId} <Ref>{row.edgeRef}</Ref></>}
    </li>)}</ul> : null}
  </section>;
}

export default function WorldSourceInspector2029({
  detail, layers, relation, relationTarget, onOpenRelations, relationsDisabled, candidates = [],
  onClose, asSheet = false, expanded = false, onToggleExpanded, headingRef, humanReadable = false,
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
      <p className="wm29-kind"><span className={`wm29-swatch wm29-node-${detail.kind}`} aria-hidden="true" />{detail.kindLabel} {!humanReadable ? <Ref>{detail.ref}</Ref> : null}</p>
      {humanReadable ? <TechnicalDetails refs={[detail.ref]} /> : null}
      <p className="wm29-boundary">{detail.boundary}</p>

      {detail.kind === "source" ? <>
        <dl className="wm29-facts">
          {detail.contributor?.label ? <div><dt>{humanReadable ? "מקור משויך ל" : "כותב"}</dt><dd><Href href={detail.contributor.href}>{humanReadable ? readableLabel(detail.contributor.label, "שיוך לא צוין") : detail.contributor.label}</Href></dd></div> : null}
          {detail.publisher?.label ? <div><dt>מפרסם</dt><dd>{humanReadable ? readableLabel(detail.publisher.label, "מפרסם לא צוין") : detail.publisher.label}</dd></div> : null}
          {detail.href ? <div><dt>קריאה במקור</dt><dd><Href href={detail.href}>פתיחת המקור</Href></dd></div> : null}
        </dl>
        <p className="wm29-counts">{detail.occurrences.length} הופעות · {detail.findings.length} ממצאים נשענים על המקור. הם אינם מקורות נוספים.</p>
        {detail.tags.length ? <p className="wm29-tags">{detail.tags.map((tag) => <span key={tag.key} className="wm29-tag">{tag.kind} · {humanReadable ? readableLabel(tag.label, tag.kind) : tag.label}</span>)}<small>{detail.tagNote}</small></p> : null}
      </> : null}

      {detail.kind === "occurrence" ? <>
        <dl className="wm29-facts">
          <div><dt>מקור אב</dt><dd>{humanReadable ? <>המקור המקושר<TechnicalDetails refs={[detail.parentSourceRef]} /></> : <Ref>{detail.parentSourceRef}</Ref>}</dd></div>
          {detail.locator ? <div><dt>מיקום</dt><dd>{humanReadable ? <>{readableLabel(detail.locator, "המיקום שמור בפרטי המקור")}<TechnicalDetails refs={[detail.locator]} /></> : detail.locator}</dd></div> : null}
          {detail.href ? <div><dt>קריאה</dt><dd><Href href={detail.href}>פתיחת ההופעה</Href></dd></div> : null}
        </dl>
        <Time times={detail.times} />
      </> : null}

      {detail.kind === "finding" ? <>
        <dl className="wm29-facts">
          <div><dt>נשען על מקור</dt><dd>{humanReadable ? <>מקור מתועד<TechnicalDetails refs={detail.sourceRefs} /></> : detail.sourceRefs.map((ref) => <Ref key={ref}>{ref}</Ref>)}</dd></div>
          {humanReadable ? <>
            <div><dt>שלב</dt><dd>{axisHe(STAGE_HE, detail.stage, "לא צוין")}</dd></div>
            <div><dt>אימות</dt><dd>{axisHe(VERIFICATION_HE, detail.verificationState, "מצב האימות אינו ידוע")}</dd></div>
            <div><dt>פרסום</dt><dd>{axisHe(GOVERNANCE_HE, detail.publicationState, "מצב הפרסום לא צוין")}</dd></div>
          </> : <>
            {detail.stage ? <div><dt>שלב</dt><dd>{detail.stage}</dd></div> : null}
            {detail.verificationState ? <div><dt>אימות</dt><dd>{detail.verificationState}</dd></div> : null}
            {detail.publicationState ? <div><dt>פרסום</dt><dd>{detail.publicationState}</dd></div> : null}
          </>}
          {detail.href ? <div><dt>קריאה</dt><dd><Href href={detail.href}>פתיחת הממצא</Href></dd></div> : null}
        </dl>
        <Layers layers={layers} humanReadable={humanReadable} />
        <RelationPanel target={relationTarget} relation={relation} onOpen={onOpenRelations} disabled={relationsDisabled} humanReadable={humanReadable} />
        {candidates.length ? <section className="wm29-candidates" aria-label="הצעות שאינן קשרי עץ">
          <h4>הצעות — אינן קשרי עץ</h4>
          <ul>{candidates.map((candidate) => <li key={candidate.candidateRef}>{humanReadable ? readableLabel(candidate.label, "הצעה לבדיקה") : candidate.label}<small>{humanReadable ? "הצעה בלבד; אין קשר עץ מתועד." : <>{candidate.basis} · אין edgeRef או החלטה ממשלית, ולכן לא מצויר על הקנבס.</>}</small>{humanReadable ? <TechnicalDetails refs={[candidate.candidateRef, candidate.basis]} /> : null}</li>)}</ul>
        </section> : null}
      </> : null}

      {detail.kind === "tree" ? <section className="wm29-evidence" aria-label="אסמכתת הקשר">
        <h4>אסמכתת הקשר</h4>
        {humanReadable ? <TechnicalDetails refs={detail.evidence.flatMap((row) => [row.edgeRef, row.governanceRef])} /> : <ul>{detail.evidence.map((row) => <li key={`${row.edgeRef}:${row.governanceRef}`}>
          {row.edgeRef ? <>edge <Ref>{row.edgeRef}</Ref></> : null}
          {row.governanceRef ? <>החלטה ממשלית <Ref>{row.governanceRef}</Ref></> : null}
        </li>)}</ul>}
      </section> : null}
    </div>}
  </aside>;
}
