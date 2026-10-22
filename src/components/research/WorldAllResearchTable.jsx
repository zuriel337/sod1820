import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWorldFindingReviewPage } from "../../lib/research/worldFindingReviewClient.js";
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
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [contributor, setContributor] = useState("all");
  const [tree, setTree] = useState("all");
  const [meter, setMeter] = useState("all");
  const [retryKey, setRetryKey] = useState(0);
  const [review, setReview] = useState({ loading: false, loadingMore: false, error: null, projection: null, page: null });
  const requestRef = useRef(0);

  const filters = useMemo(() => ({
    query, kind, access, status, verification, contributor, tree, meter,
  }), [query, kind, access, status, verification, contributor, tree, meter]);

  useEffect(() => {
    if (!state?.enabled) return undefined;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setReview((current) => ({
      ...current,
      loading: true,
      loadingMore: false,
      error: null,
      page: null,
      projection: current.projection ? { ...current.projection, rows: [] } : null,
    }));
    const timer = setTimeout(() => {
      fetchWorldFindingReviewPage({ filters, offset: 0, signal: controller.signal })
        .then((result) => {
          if (requestRef.current !== requestId) return;
          setReview({ loading: false, loadingMore: false, error: null, projection: result.projection, page: result.page });
        })
        .catch((error) => {
          if (error?.name === "AbortError" || requestRef.current !== requestId) return;
          setReview((current) => ({ ...current, loading: false, loadingMore: false, error }));
        });
    }, query ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state?.enabled, filters, retryKey]);

  const loadMore = async () => {
    if (!review.page?.hasMore || review.loading || review.loadingMore) return;
    const requestId = ++requestRef.current;
    setReview((current) => ({ ...current, loadingMore: true, error: null }));
    try {
      const result = await fetchWorldFindingReviewPage({ filters, offset: review.page.nextOffset });
      if (requestRef.current !== requestId) return;
      setReview((current) => ({
        loading: false,
        loadingMore: false,
        error: null,
        projection: {
          ...result.projection,
          rows: [...(current.projection?.rows || []), ...(result.projection?.rows || [])],
        },
        page: result.page,
      }));
    } catch (error) {
      if (requestRef.current !== requestId) return;
      setReview((current) => ({ ...current, loadingMore: false, error }));
    }
  };

  const projection = review.projection;
  const rows = projection?.rows || [];

  if (!state?.enabled) return null;

  return <section className="sod29-section sod29-world-all-research" id="world-all-research" aria-label="ממצאים לבדיקה">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">שער אנושי · ממצאים לבדיקה</div>
        <h2>הממצאים המובילים</h2>
        <p className="sod29-muted">הממצאים מסודרים לפי חוזק החיבור והאיכות שלהם. ליד כל ממצא מופיע המד הקיים, כדי שתוכל להחליט מה ראוי לקדם לעץ.</p>
      </div>
      {projection && review.page ? <span className="sod29-chip">{rows.length} מתוך {review.page.totalFiltered}</span> : null}
    </div>

    {review.loading ? <div className="sod29-world-all-research-state">טוען את 40 הממצאים הראשונים…</div> : null}
    {review.error ? <div className="sod29-world-all-research-state">הממצאים לא נטענו כרגע. <button className="sod29-action" type="button" onClick={() => setRetryKey((value) => value + 1)}>נסה שוב</button></div> : null}

    {projection ? <>
      <div className="sod29-world-all-research-summary">
        <span><b>{projection.sourceTotals.research_object || 0}</b> ממצאי מחקר</span>
        <span><b>{projection.byAccess.private || 0}</b> פרטי · גלוי לך</span>
        <span><b>{projection.treeMatchedResearchOccurrences || 0}</b> רשומות מחוברות ליעד קיים בעץ</span>
        <span><b>{projection.meteredResearchOccurrences || 0}</b> רשומות עם מד יעד זמין</span>
        {projection.duplicateProjection?.groups ? <span><b>{projection.duplicateProjection.groups}</b> אשכולות מאוחדים</span> : null}
      </div>

      {projection.truncated ? <div className="sod29-world-all-research-state">המאגר גדול מגבול הקריאה הנוכחי; מוצג כל מה שנטען והמצב מסומן כחלקי.</div> : null}

      <div className="sod29-world-all-research-filters">
        <label className="is-wide"><span>חיפוש בממצאים</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="טקסט, חוקר, מספר או מקור…" /></label>
        <label><span>סוג</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">כל הסוגים</option>{Object.keys(projection.byKind).sort().map((v) => <option value={v} key={v}>{humanLabel(KIND_LABELS, v, "סוג מחקר נוסף")} · {projection.byKind[v]}</option>)}</select></label>
        <label><span>גישה</span><select value={access} onChange={(e) => setAccess(e.target.value)}><option value="all">הכול · בלי הסתרה</option>{Object.keys(projection.byAccess).sort().map((v) => <option value={v} key={v}>{humanLabel(ACCESS_LABELS, v, "היקף גישה נוסף")} · {projection.byAccess[v]}</option>)}</select></label>
        <label><span>מצב</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">כל המצבים</option>{Object.keys(projection.byStatus).sort().map((v) => <option value={v} key={v}>{humanLabel(STATUS_LABELS, v, "מצב פנימי")} · {projection.byStatus[v]}</option>)}</select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => setVerification(e.target.value)}><option value="all">כל מצבי האימות</option>{Object.keys(projection.byVerification).sort().map((v) => <option value={v} key={v}>{humanLabel(VERIFICATION_LABELS, v, "מצב אימות נוסף")} · {projection.byVerification[v]}</option>)}</select></label>
        <label><span>ייחוס / תורם</span><select value={contributor} onChange={(e) => setContributor(e.target.value)}><option value="all">כל הייחוסים</option>{Object.entries(projection.byContributor).sort((a,b) => b[1]-a[1]).map(([v,count]) => <option value={v} key={v}>{contributorLabel(v)} · {count}</option>)}</select></label>
        <label><span>חיבור לעץ</span><select value={tree} onChange={(e) => setTree(e.target.value)}>
          <option value="all">הכול</option><option value="matched">מחוברים ליעד קיים</option><option value="unmatched">עדיין ללא יעד</option>
        </select></label>
        <label><span>מד יעד</span><select value={meter} onChange={(e) => setMeter(e.target.value)}>
          <option value="all">עם ובלי מד</option><option value="metered">יש מד זמין</option><option value="unmetered">עדיין אין מד</option>
        </select></label>
      </div>

      <div className="sod29-world-all-research-count">מוצגים {rows.length} מתוך {review.page?.totalFiltered || 0} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.map((row, index) => {
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
            <strong>{rating ? `מד החיבור לעץ · ${rating.title}` : "מד החיבור לעץ · עדיין אין יעד עם מד"}</strong>
            <p>{rating
              ? "זהו המד של הנושא בעץ שאליו הממצא מחובר. הוא עוזר בהשוואה, אך אינו מחליט מה נכון או מה יפורסם."
              : "לממצא הזה עדיין אין מד זמין. הוא נשאר בתור לבדיקה ולא מקבל ציון אפס."}</p>
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

      {!review.loading && !review.error && !rows.length ? <div className="sod29-world-all-research-state">אין פריטים במסנן הזה. אפס מסננים כדי לחזור לכל החומר.</div> : null}
      {review.page?.hasMore ? <div className="sod29-actions"><button className="sod29-action primary" type="button" disabled={review.loadingMore} onClick={loadMore}>{review.loadingMore ? "טוען…" : `הצג עוד ${PAGE}`}</button></div> : null}

      <div className="sod29-world-all-research-boundary">{clean(projection.truthBoundary)}</div>
    </> : null}
  </section>;
}
