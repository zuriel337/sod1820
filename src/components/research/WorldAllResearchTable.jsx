import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { filterWorldAllResearchRows } from "../../lib/research/worldAllResearchProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 120;

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
        <div className="sod29-kicker">שער אנושי · כל המחקר</div>
        <h2>כל חומר המחקר על השולחן</h2>
        <p className="sod29-muted">כל רשומה שהחשבון שלך מורשה לקרוא נשארת נגישה כאן. הגישה, הממשל והאימות אינם משתנים בגלל עצם ההצגה.</p>
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
      </div>

      <div className="sod29-world-all-research-count">מוצגים {Math.min(rows.length, shown)} מתוך {rows.length} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.slice(0, shown).map((row) => <article className="sod29-world-all-research-row" key={row.id}>
          <div className="sod29-world-all-research-row-head">
            <div className="sod29-world-all-research-tags">
              <span>{humanLabel(FAMILY_LABELS, row.family, "שכבת מחקר")}</span>
              <span>{row.typeLabel || humanLabel(KIND_LABELS, row.kind, "ממצא מחקר")}</span>
              {row.access ? <AccessLabel value={row.access} /> : null}
              <span>{humanLabel(STATUS_LABELS, row.status, "מצב פנימי")}</span>
              {row.mediaClass ? <span>{humanLabel(MEDIA_LABELS, row.mediaClass, "מדיה")}</span> : null}
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
            {row.createdAt ? <span>נוסף למחקר · {new Date(row.createdAt).toLocaleDateString("he-IL")}</span> : null}
          </div>

          {row.attributionLabel ? <div className="sod29-world-all-research-cluster">{safeVisibleText(row.attributionLabel, "ייחוס המקור לא הוכרע")}</div> : null}
          {row.spatialCluster ? <div className="sod29-world-all-research-cluster">קיים אשכול מחקר מרחבי</div> : null}

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
