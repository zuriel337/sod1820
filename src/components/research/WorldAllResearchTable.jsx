import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { filterWorldAllResearchRows } from "../../lib/research/worldAllResearchProjection.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "../experience2029/ConvergenceRatings2029.jsx";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 40;

const FAMILY_LABELS = Object.freeze({
  research_object: "ממצאי מחקר",
  source_message: "מקורות / הודעות",
  contribution: "תרומות מחקר",
  topic: "נושאים",
});

const KIND_LABELS = Object.freeze({
  fact: "ממצא מסוג עובדה",
  relation: "קשר מחקרי",
  observation: "תצפית",
  hypothesis: "השערה",
  question: "שאלת מחקר",
  source_message: "הודעת מקור",
  contribution: "תרומת מחקר",
  topic: "נושא",
});

const ACCESS_LABELS = Object.freeze({
  private: "פרטי · גלוי לך",
  public_candidate: "מועמד לציבור · טרם פורסם",
  public: "ציבורי",
  shared: "משותף",
});

const STATUS_LABELS = Object.freeze({
  candidate: "מועמד",
  approved: "מאושר",
  canonical: "קנוני",
  published: "פורסם",
  draft: "טיוטה",
  rejected: "נדחה",
  reject: "נדחה",
  idea: "רעיון",
  discussion: "דיון",
});

const VERIFICATION_LABELS = Object.freeze({
  match: "אומת",
  mismatch: "נמצאה אי־התאמה",
  partial_needs_review: "בדיקה חלקית · דורש סקירה",
  method_unknown: "השיטה אינה זמינה לבדיקה",
  not_tested: "טרם נבדק",
  not_applicable: "לא חל",
  legacy_signal: "סימון ישן · לא אומת במפורש",
});

const MEDIA_LABELS = Object.freeze({
  image: "תמונה",
  media: "מדיה",
  linked_media: "מדיה מקושרת",
  video: "וידאו",
});

function humanLabel(map, value, fallback = "אחר") {
  return map[clean(value)] || fallback;
}

function contributorLabel(value) {
  const text = clean(value);
  if (!text) return "ייחוס לא צוין";
  if (/[א-ת]/.test(text)) return text;
  if (/^ZURIEL$/i.test(text)) return "צוריאל";
  if (/^(?:GPT|CLAUDE)$/i.test(text)) return "מערכת המחקר";
  return "תווית ייחוס לא פתורה";
}

function safeVisibleText(value, fallback = null) {
  const text = clean(value);
  if (!text) return fallback;
  if (!/[A-Za-z]/.test(text)) return text;
  const hebrew = text
    .replace(/[A-Za-z][A-Za-z0-9_.:/#()'’-]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[א-ת]/.test(hebrew) ? hebrew : fallback;
}

function AccessLabel({ value }) {
  return <span className="sod29-world-all-research-access">
    {humanLabel(ACCESS_LABELS, value, "היקף גישה לא צוין")}
  </span>;
}

function VerificationLabel({ row }) {
  const label = humanLabel(VERIFICATION_LABELS, row.verification, "מצב אימות לא ידוע");
  if (row.verification === "mismatch") return <span className="sod29-world-all-research-warn">{label}</span>;
  if (row.verification === "match") return <span className="sod29-world-all-research-ok">{label}</span>;
  return <span className="sod29-world-all-research-muted">{label}</span>;
}

function occurrenceSourceKey(occurrence) {
  const ref = clean(occurrence?.sourceRef);
  return ref ? ref.replace(/#(?:batch|a)\d+$/i, "") : clean(occurrence?.id);
}

function DuplicateOccurrences({ row }) {
  const occurrences = Array.isArray(row?.occurrences) ? row.occurrences : [];
  if (occurrences.length < 2) return null;

  const sourceCount = new Set(occurrences.map(occurrenceSourceKey).filter(Boolean)).size;
  const canonicalText = clean(row.originalStatement || row.statement);

  return <details className="sod29-world-all-research-duplicates">
    <summary>
      <span>נמצא ב־{occurrences.length} הופעות</span>
      <small>{sourceCount} {sourceCount === 1 ? "מקור" : "מקורות"} · הנוסח המלא ביותר מוצג למעלה</small>
    </summary>
    <ol>
      {occurrences.map((occurrence, index) => {
        const variant = clean(occurrence.originalStatement || occurrence.statement);
        return <li key={occurrence.id || `${occurrence.sourceRef || "source"}:${index}`}>
          <div className="sod29-world-all-research-occurrence-head">
            <strong>{safeVisibleText(occurrence.sourceLabel, "מקור מחקר")}</strong>
            {occurrence.createdAt ? <span>{bilingualDateLabel(occurrence.createdAt)}</span> : null}
          </div>
          <div className="sod29-world-all-research-occurrence-meta">
            <span>ייחוס · {contributorLabel(occurrence.contributor)}</span>
            {occurrence.sourceRef ? <code className="sod29-world-all-research-ref" dir="ltr">{occurrence.sourceRef}</code> : null}
          </div>
          {variant && variant !== canonicalText
            ? <p>{safeVisibleText(variant, "גרסת מקור שמורה")}</p>
            : null}
        </li>;
      })}
    </ol>
  </details>;
}

export default function WorldAllResearchTable({ state }) {
  const projection = state?.projection || null;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("research_object");
  const [kind, setKind] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [contributor, setContributor] = useState("all");
  const [tree, setTree] = useState("all");
  const [meter, setMeter] = useState("all");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => filterWorldAllResearchRows(projection?.rows || [], {
    query, family, kind, access, status, verification, contributor, tree, meter,
  }), [projection, query, family, kind, access, status, verification, contributor, tree, meter]);

  if (!state?.enabled) return null;

  return <section className="sod29-section sod29-world-all-research" id="world-all-research" aria-label="ממצאים לבדיקה">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">שער אנושי · ממצאים לבדיקה</div>
        <h2>החזקים תחילה</h2>
        <p className="sod29-muted">כל הממצאים המורשים לחשבון שלך מוצגים מהחזקים לחלשים: תחילה אימות מפורש, אחריו חיבור מדויק לעץ, ואז מד ההתכנסות והאיכות הקיימים של יעד ה־Topic. המד עוזר לסקור; הוא אינו ציון אמת ואינו מכניס ממצא לעץ.</p>
      </div>
      {projection ? <span className="sod29-chip">{projection.loaded} נטענו{projection.total !== projection.loaded ? " / " + projection.total : ""}</span> : null}
    </div>

    {state.loading ? <div className="sod29-world-all-research-state">טוען את כל חומר המחקר המורשה לחשבון שלך…</div> : null}
    {state.error ? <div className="sod29-world-all-research-state">לא הצלחנו לקרוא את חומר המחקר. לא נחליף אותו ברשימה ציבורית מצומצמת.</div> : null}

    {projection ? <>
      <div className="sod29-world-all-research-summary">
        <span><b>{projection.total}</b> כל השכבות</span>
        <span><b>{projection.sourceTotals.research_object || 0}</b> ממצאי מחקר</span>
        <span><b>{projection.sourceTotals.source_message || 0}</b> מקורות / הודעות</span>
        <span><b>{projection.sourceTotals.contribution || 0}</b> תרומות מחקר</span>
        <span><b>{projection.sourceTotals.topic || 0}</b> נושאים</span>
        <span><b>{projection.byAccess.private || 0}</b> פרטי · גלוי לך</span>
        <span><b>{projection.treeMatchedResearchOccurrences || 0}</b> רשומות מחוברות ליעד קיים בעץ</span>
        <span><b>{projection.meteredResearchOccurrences || 0}</b> רשומות עם מד יעד זמין</span>
        {projection.duplicateProjection?.groups ? <span><b>{projection.duplicateProjection.groups}</b> אשכולות מאוחדים</span> : null}
      </div>

      {projection.truncated ? <div className="sod29-world-all-research-state">המאגר גדול מגבול הקריאה הנוכחי; מוצג כל מה שנטען והמצב מסומן כחלקי.</div> : null}

      <div className="sod29-world-all-research-filters">
        <label className="is-wide"><span>חיפוש בכל החומר</span><input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="טקסט, חוקר, מספר או מקור…" /></label>
        <label><span>שכבה</span><select value={family} onChange={(e) => { setFamily(e.target.value); setShown(PAGE); }}><option value="all">כל השכבות</option>{Object.keys(projection.byFamily).sort().map((v) => <option value={v} key={v}>{humanLabel(FAMILY_LABELS, v, "שכבה נוספת")} · {projection.byFamily[v]}</option>)}</select></label>
        <label><span>סוג</span><select value={kind} onChange={(e) => { setKind(e.target.value); setShown(PAGE); }}><option value="all">כל הסוגים</option>{Object.keys(projection.byKind).sort().map((v) => <option value={v} key={v}>{humanLabel(KIND_LABELS, v, "סוג מחקר נוסף")} · {projection.byKind[v]}</option>)}</select></label>
        <label><span>גישה</span><select value={access} onChange={(e) => { setAccess(e.target.value); setShown(PAGE); }}><option value="all">הכול · בלי הסתרה</option>{Object.keys(projection.byAccess).sort().map((v) => <option value={v} key={v}>{humanLabel(ACCESS_LABELS, v, "היקף גישה נוסף")} · {projection.byAccess[v]}</option>)}</select></label>
        <label><span>מצב</span><select value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }}><option value="all">כל המצבים</option>{Object.keys(projection.byStatus).sort().map((v) => <option value={v} key={v}>{humanLabel(STATUS_LABELS, v, "מצב פנימי")} · {projection.byStatus[v]}</option>)}</select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => { setVerification(e.target.value); setShown(PAGE); }}><option value="all">כל מצבי האימות</option>{Object.keys(projection.byVerification).sort().map((v) => <option value={v} key={v}>{humanLabel(VERIFICATION_LABELS, v, "מצב אימות נוסף")} · {projection.byVerification[v]}</option>)}</select></label>
        <label><span>ייחוס / תורם</span><select value={contributor} onChange={(e) => { setContributor(e.target.value); setShown(PAGE); }}><option value="all">כל הייחוסים</option>{Object.entries(projection.byContributor).sort((a,b) => b[1]-a[1]).map(([v,count]) => <option value={v} key={v}>{contributorLabel(v)} · {count}</option>)}</select></label>
        <label><span>חיבור לעץ</span><select value={tree} onChange={(e) => { setTree(e.target.value); setShown(PAGE); }}>
          <option value="all">הכול</option><option value="matched">מחוברים ליעד קיים</option><option value="unmatched">עדיין ללא יעד</option>
        </select></label>
        <label><span>מד יעד</span><select value={meter} onChange={(e) => { setMeter(e.target.value); setShown(PAGE); }}>
          <option value="all">עם ובלי מד</option><option value="metered">יש מד זמין</option><option value="unmetered">עדיין אין מד</option>
        </select></label>
      </div>

      <div className="sod29-world-all-research-count">מוצגים {Math.min(rows.length, shown)} מתוך {rows.length} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.slice(0, shown).map((row, index) => {
          const rating = row.linkedTopicRating || null;
          const ratingNumbers = rating?.numbers?.length ? rating.numbers : row.values;
          const highlightNumbers = rating?.highlightNumbers?.length ? rating.highlightNumbers : row.values;
          return <article className="sod29-world-all-research-row" key={row.id}>
          <div className="sod29-world-all-research-row-head">
            <div className="sod29-world-all-research-tags">
              {row.family === "research_object" ? <span>סדר חוזק · #{index + 1}</span> : null}
              <span>{humanLabel(FAMILY_LABELS, row.family, "שכבת מחקר")}</span>
              <span>{row.typeLabel || humanLabel(KIND_LABELS, row.kind, "ממצא מחקר")}</span>
              {row.access ? <AccessLabel value={row.access} /> : null}
              <span>{humanLabel(STATUS_LABELS, row.status, "מצב פנימי")}</span>
              {row.mediaClass ? <span>{humanLabel(MEDIA_LABELS, row.mediaClass, "מדיה")}</span> : null}
              {row.researchStrength?.label ? <span>{row.researchStrength.label}</span> : null}
            </div>
            <VerificationLabel row={row} />
          </div>

          {row.mediaUrl ? <img className="sod29-world-all-research-media" src={row.mediaUrl} loading="lazy" alt="" /> : null}
          <strong>{safeVisibleText(row.statement, "ממצא מחקר")}</strong>
          {row.secondary && row.secondary !== row.statement ? <p className="sod29-world-all-research-secondary">{safeVisibleText(row.secondary, null)}</p> : null}
          {row.contextLine ? <p className="sod29-world-all-research-secondary">{safeVisibleText(row.contextLine, null)}</p> : null}

          <div className="sod29-world-all-research-meta">
            <span>ייחוס · {contributorLabel(row.contributor)}</span>
            {row.value != null ? <span>ערך · {row.value}</span> : null}
            <span>מקור · {safeVisibleText(row.sourceLabel, "מקור מחקר")}</span>
            {row.createdAt ? <span>נוסף למחקר · {bilingualDateLabel(row.createdAt)}</span> : null}
          </div>

          <DuplicateOccurrences row={row} />

          {row.attributionLabel ? <div className="sod29-world-all-research-cluster">{safeVisibleText(row.attributionLabel, "ייחוס המקור לא הוכרע")}</div> : null}
          {row.spatialCluster ? <div className="sod29-world-all-research-cluster">קיים אשכול מחקר מרחבי</div> : null}

          {row.family === "research_object" ? <div className="sod29-world-all-research-cluster">
            <strong>{rating ? `מד יעד העץ · ${rating.title}` : "מד יעד העץ · עדיין אין יעד Topic עם מד"}</strong>
            <p>{rating
              ? "האיכות והחוזק שייכים ליעד בעץ שאליו הממצא חובר, ולא לממצא עצמו. גם ממצא פרטי או מועמד נשאר גלוי כאן לפי הרשאת החשבון."
              : "הממצא נשאר ברשימה ובסדר המחקרי גם בלי מד; חסר מד אינו נחשב לציון אפס."}</p>
            <ConvergenceRatings2029
              quality={rating?.quality ?? null}
              meterScore={rating?.meterScore ?? null}
              highlightNumbers={highlightNumbers || []}
              numbers={ratingNumbers || []}
              popover
            />
            {rating?.href ? <Link className="sod29-action" to={rating.href}>פתח את יעד העץ ←</Link> : null}
            {row.researchStrength?.reasons?.length ? <details className="sod29-world-all-research-duplicates">
              <summary>למה הממצא נמצא במיקום הזה?</summary>
              <ul>{row.researchStrength.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </details> : null}
          </div> : null}

          {row.href ? <div className="sod29-actions">
            {row.href.startsWith("/") ? <Link className="sod29-action" to={row.href}>פתח ←</Link> : <a className="sod29-action" href={row.href} target="_blank" rel="noreferrer">פתח מקור ↗</a>}
          </div> : null}
        </article>;
        })}
      </div>

      {!rows.length ? <div className="sod29-world-all-research-state">אין פריטים במסנן הזה. אפס מסננים כדי לחזור לכל החומר.</div> : null}
      {shown < rows.length ? <div className="sod29-actions"><button className="sod29-action primary" type="button" onClick={() => setShown((n) => n + PAGE)}>הצג עוד {Math.min(PAGE, rows.length - shown)}</button></div> : null}

      <div className="sod29-world-all-research-boundary">{clean(projection.truthBoundary)}</div>
    </> : null}
  </section>;
}
