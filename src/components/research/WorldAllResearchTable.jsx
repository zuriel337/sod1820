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

const QUALITY_LABELS = Object.freeze({
  rated: "יש נתון איכות",
  high: "איכות גבוהה · 70 ומעלה",
  medium: "איכות בינונית · 40–69",
  low: "איכות נמוכה · מתחת ל־40",
  unrated: "אין נתון איכות",
});

const SORT_LABELS = Object.freeze({
  strength: "החזקים תחילה",
  quality: "איכות הראיות",
  newest: "החדשים ביותר",
});

const CONTINUATION_LABELS = Object.freeze({
  already_connected: "כבר מחובר לעץ",
  ready: "מוכן ליישום מבוקר",
  clustered: "אשכול כפילות מאושר",
  blocked_missing_target: "חסום · חסר יעד",
  needs_review: "עדיין דורש בדיקה",
  set_aside: "הושם בצד",
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
  return ref ? ref.replace(/#.*$/u, "") : clean(occurrence?.id);
}

function initialReviewFilters() {
  if (typeof window === "undefined") return {
    finding: "", contributorId: "", contributorLabel: "", sort: "strength", strength: "all", recommendation: "all",
  };
  const params = new URLSearchParams(window.location.search);
  const sort = clean(params.get("sort"));
  const strength = clean(params.get("strength"));
  const recommendation = clean(params.get("recommendation"));
  return {
    finding: clean(params.get("finding")),
    contributorId: clean(params.get("contributorId")),
    contributorLabel: clean(params.get("contributorLabel")),
    sort: Object.hasOwn(SORT_LABELS, sort) ? sort : "strength",
    strength: ["חזק", "בינוני", "חלש"].includes(strength) ? strength : "all",
    recommendation: ["מתאים לעץ", "דורש בדיקה", "כפילות", "דורש מקור", "שיוך זהות לא פתור", "דורש OCR או תמלול", "לא מתאים"].includes(recommendation)
      ? recommendation : "all",
  };
}

function triageClass(value) {
  if (value === "מתאים לעץ") return "is-ready";
  if (value === "לא מתאים") return "is-blocked";
  if (value === "כפילות") return "is-duplicate";
  return "is-review";
}

function continuationClass(value) {
  if (["already_connected", "ready"].includes(value)) return "is-ready";
  if (value === "clustered") return "is-duplicate";
  if (["blocked_missing_target", "set_aside"].includes(value)) return "is-blocked";
  return "is-review";
}

function treeTargetLabel(match) {
  const type = match?.type === "number" ? "מספר" : match?.type === "topic" ? "נושא" : match?.type === "book" ? "ספר" : "יעד";
  return `${type} · ${clean(match?.label || match?.key)}`;
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
  const initial = useMemo(initialReviewFilters, []);
  const [query, setQuery] = useState(initial.finding);
  const [finding, setFinding] = useState(initial.finding);
  const [kind, setKind] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [contributor, setContributor] = useState("all");
  const [contributorId] = useState(initial.contributorId);
  const [tree, setTree] = useState("all");
  const [meter, setMeter] = useState("all");
  const [sort, setSort] = useState(initial.sort);
  const [strength, setStrength] = useState(initial.strength);
  const [recommendation, setRecommendation] = useState(initial.recommendation);
  const [continuation, setContinuation] = useState("all");
  const [quality, setQuality] = useState("all");
  const [topic, setTopic] = useState("all");
  const [source, setSource] = useState("all");
  const [retryKey, setRetryKey] = useState(0);
  const [review, setReview] = useState({ loading: false, loadingMore: false, error: null, projection: null, page: null });
  const requestRef = useRef(0);

  const filters = useMemo(() => ({
    query, finding, kind, access, status, verification, contributor, contributorId, tree, meter,
    sort, strength, recommendation, continuation, quality, topic, source,
  }), [query, finding, kind, access, status, verification, contributor, contributorId, tree, meter, sort, strength, recommendation, continuation, quality, topic, source]);

  const resetFilters = () => {
    setQuery("");
    setFinding("");
    setKind("all");
    setAccess("all");
    setStatus("all");
    setVerification("all");
    setContributor("all");
    setTree("all");
    setMeter("all");
    setSort("strength");
    setStrength("all");
    setRecommendation("all");
    setContinuation("all");
    setQuality("all");
    setTopic("all");
    setSource("all");
  };

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
        <h2>{contributorId ? `הממצאים המובילים של ${initial.contributorLabel || "התורם הנבחר"}` : "הממצאים המובילים"}</h2>
        <p className="sod29-muted">ברירת המחדל היא סדר דוח המיון: החזקים תחילה. חוזק החיבור, איכות הראיות, עצמאות המקורות, האימות והפרסום מוצגים בנפרד ואינם ציון אמת.</p>
      </div>
      {projection && review.page ? <span className="sod29-chip">{rows.length} מתוך {review.page.totalFiltered}</span> : null}
    </div>

    {review.loading ? <div className="sod29-world-all-research-state">טוען את 40 הממצאים הראשונים…</div> : null}
    {review.error ? <div className="sod29-world-all-research-state">הממצאים לא נטענו כרגע. <button className="sod29-action" type="button" onClick={() => setRetryKey((value) => value + 1)}>נסה שוב</button></div> : null}

    {projection ? <>
      <div className="sod29-world-all-research-summary">
        <span><b>{projection.triageSnapshot?.matchedCards || 0}</b> כרטיסים מדוח המיון</span>
        <span><b>{projection.triageSnapshot?.recommendationCounts?.["מתאים לעץ"] || 0}</b> המלצות עץ בדוח 22.10</span>
        <span><b>{projection.triageSnapshot?.strengthCounts?.["חזק"] || 0}</b> ממצאים חזקים</span>
        <span><b>{projection.treeMatchedResearchOccurrences || 0}</b> רשומות מחוברות ליעד קיים בעץ</span>
        <span><b>{projection.meteredResearchOccurrences || 0}</b> רשומות עם מד יעד זמין</span>
        {projection.duplicateProjection?.groups ? <span><b>{projection.duplicateProjection.groups}</b> אשכולות מאוחדים</span> : null}
        <span><b>{projection.triageSnapshot?.untriagedLiveCards || 0}</b> חדשים שטרם מוינו בדוח</span>
      </div>

      {projection.triageSnapshot?.strongContinuation ? <div className="sod29-world-all-research-summary">
        <span><b>{projection.triageSnapshot.strongContinuation.alreadyConnected}</b> חזקים שכבר מחוברים</span>
        <span><b>{projection.triageSnapshot.strongContinuation.readyForImplementation}</b> מוכנים ליישום מבוקר</span>
        <span><b>{projection.triageSnapshot.strongContinuation.clusteredDuplicates}</b> כפילויות תקינות לתצוגת אשכול</span>
        <span><b>{projection.triageSnapshot.strongContinuation.correctedDuplicateClassifications}</b> סיווגי כפילות שתוקנו</span>
        <span><b>{projection.triageSnapshot.strongContinuation.blockedMissingTarget}</b> חסומים עד יצירת יעד</span>
        <span><b>{projection.triageSnapshot.strongContinuation.needsReview}</b> עדיין דורשים בדיקה</span>
        <span><b>{projection.triageSnapshot.strongContinuation.setAside}</b> הושמו בצד</span>
      </div> : null}

      {projection.truncated ? <div className="sod29-world-all-research-state">המאגר גדול מגבול הקריאה הנוכחי; מוצג כל מה שנטען והמצב מסומן כחלקי.</div> : null}
      <div className="sod29-world-all-research-state">דוח המיון מ־22.10.2026 נשמר כנקודת ייחוס. החלטות ההמשך מ־26.10.2026 מוצגות מעליו בנפרד. הטקסט, ההרשאות, מצב הפרסום, המקורות והיעדים נקראים עכשיו מהמערכת; שכבת המיון אינה משנה אותם.</div>

      <div className="sod29-world-all-research-filters">
        <label className="is-wide"><span>חיפוש בממצאים</span><input value={query} onChange={(e) => { setQuery(e.target.value); setFinding(""); }} placeholder="טקסט, מזהה, חוקר, מספר או מקור…" /></label>
        <label><span>סדר</span><select value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>חוזק</span><select value={strength} onChange={(e) => setStrength(e.target.value)}><option value="all">כל רמות החוזק</option>{Object.entries(projection.byTriageStrength || {}).map(([value, count]) => <option value={value} key={value}>{value} · {count}</option>)}</select></label>
        <label><span>המלצת מיון</span><select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}><option value="all">כל ההמלצות</option>{Object.entries(projection.byTriageRecommendation || {}).map(([value, count]) => <option value={value} key={value}>{value} · {count}</option>)}</select></label>
        <label><span>החלטת המשך</span><select value={continuation} onChange={(e) => setContinuation(e.target.value)}><option value="all">כל החלטות ההמשך</option>{Object.entries(projection.byContinuationState || {}).map(([value, count]) => <option value={value} key={value}>{humanLabel(CONTINUATION_LABELS, value, "מצב המשך נוסף")} · {count}</option>)}</select></label>
        <label><span>איכות ראיות</span><select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="all">עם ובלי נתון</option>{Object.entries(QUALITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>נושא בעץ</span><select value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">כל הנושאים</option>{(projection.topicOptions || []).map((option) => <option value={option.value} key={option.value}>{option.label} · {option.count}</option>)}</select></label>
        <label><span>מקור</span><select value={source} onChange={(e) => setSource(e.target.value)}><option value="all">כל המקורות</option>{(projection.sourceOptions || []).map((option) => <option value={option.value} key={option.value}>{option.label} · {option.count}</option>)}</select></label>
        <label><span>סוג</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">כל הסוגים</option>{Object.keys(projection.byKind).sort().map((v) => <option value={v} key={v}>{humanLabel(KIND_LABELS, v, "סוג מחקר נוסף")} · {projection.byKind[v]}</option>)}</select></label>
        <label><span>גישה · מנהל</span><select value={access} onChange={(e) => setAccess(e.target.value)}><option value="all">הכול · בלי הסתרה בתוך הרשאת החשבון</option>{Object.keys(projection.byAccess).sort().map((v) => <option value={v} key={v}>{humanLabel(ACCESS_LABELS, v, "היקף גישה נוסף")} · {projection.byAccess[v]}</option>)}</select></label>
        <label><span>מצב פרסום / ממשל</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">כל המצבים</option>{Object.keys(projection.byStatus).sort().map((v) => <option value={v} key={v}>{humanLabel(STATUS_LABELS, v, "מצב פנימי")} · {projection.byStatus[v]}</option>)}</select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => setVerification(e.target.value)}><option value="all">כל מצבי האימות</option>{Object.keys(projection.byVerification).sort().map((v) => <option value={v} key={v}>{humanLabel(VERIFICATION_LABELS, v, "מצב אימות נוסף")} · {projection.byVerification[v]}</option>)}</select></label>
        <label><span>ייחוס / תורם</span><select value={contributor} onChange={(e) => setContributor(e.target.value)}><option value="all">כל הייחוסים</option>{Object.entries(projection.byContributor).sort((a,b) => b[1]-a[1]).map(([v,count]) => <option value={v} key={v}>{contributorLabel(v)} · {count}</option>)}</select></label>
        <label><span>חיבור לעץ · מנהל</span><select value={tree} onChange={(e) => setTree(e.target.value)}>
          <option value="all">הכול</option><option value="matched">מחוברים ליעד קיים</option><option value="unmatched">ממתין לשיוך · מנהל בלבד</option>
        </select></label>
        <label><span>מד יעד</span><select value={meter} onChange={(e) => setMeter(e.target.value)}>
          <option value="all">עם ובלי מד</option><option value="metered">יש מד זמין</option><option value="unmetered">עדיין אין מד</option>
        </select></label>
        <button className="sod29-action sod29-world-all-research-reset" type="button" onClick={resetFilters}>אפס מסננים</button>
      </div>

      <div className="sod29-world-all-research-count">מוצגים {rows.length} מתוך {review.page?.totalFiltered || 0} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.map((row) => {
          const rating = row.linkedTopicRating || null;
          const ratingNumbers = rating?.numbers?.length ? rating.numbers : row.values;
          const highlightNumbers = rating?.highlightNumbers?.length ? rating.highlightNumbers : row.values;
          const triage = row.triage || null;
          const treeTargets = Array.isArray(row.treeMatches) ? row.treeMatches : [];
          const representativeId = triage?.displayRepresentativeId || triage?.recommendedKeepId || null;
          const representativeHref = representativeId
            ? `/world?admin=1&finding=${encodeURIComponent(representativeId)}#finding-${encodeURIComponent(representativeId)}`
            : null;
          const keepHref = triage?.recommendedKeepId
            ? `/world?admin=1&finding=${encodeURIComponent(triage.recommendedKeepId)}#finding-${encodeURIComponent(triage.recommendedKeepId)}`
            : null;
          const proposedTreeTargets = triage?.proposedTreeTargets?.length
            ? triage.proposedTreeTargets
            : triage?.proposedTreeTarget ? [triage.proposedTreeTarget] : [];
          return <article className="sod29-world-all-research-row" id={`finding-${row.sourceId}`} key={row.id}>
          <div className="sod29-world-all-research-row-head">
            <div className="sod29-world-all-research-tags">
              <span>{triage?.rank ? `סדר דוח · #${triage.rank}` : "טרם דורג בדוח"}</span>
              <span>{humanLabel(FAMILY_LABELS, row.family, "שכבת מחקר")}</span>
              <span>{row.typeLabel || humanLabel(KIND_LABELS, row.kind, "ממצא מחקר")}</span>
              {row.access ? <AccessLabel value={row.access} /> : null}
              {row.mediaClass ? <span>{humanLabel(MEDIA_LABELS, row.mediaClass, "מדיה")}</span> : null}
            </div>
            <VerificationLabel row={row} />
          </div>

          <div className="sod29-world-finding-measures" aria-label="מדדי ממצא נפרדים">
            <div><small>חוזק החיבור</small><strong>{triage?.strength || "טרם דורג"}</strong></div>
            <div><small>איכות הראיות</small><strong>{row.evidenceQuality?.label || "אין נתון"}</strong></div>
            <div><small>מקורות עצמאיים</small><strong>{row.independentSourceCount || "אין נתון"}</strong></div>
            <div><small>מצב בדיקה</small><strong>{humanLabel(VERIFICATION_LABELS, row.verification, "מצב נוסף")}</strong></div>
            <div><small>מצב פרסום / ממשל</small><strong>{humanLabel(STATUS_LABELS, row.status, "לא צוין")}</strong></div>
          </div>

          <div className={`sod29-world-triage-recommendation ${triageClass(triage?.recommendation)}`}>
            <small>המלצת המיון</small>
            <strong>{triage?.recommendation || "טרם מוין בדוח"}</strong>
          </div>

          {triage?.continuationState ? <div className={`sod29-world-triage-recommendation ${continuationClass(triage.continuationState)}`}>
            <span><small>החלטת המשך · 26.10.2026</small><strong>{triage.continuationLabel || humanLabel(CONTINUATION_LABELS, triage.continuationState, "מצב המשך")}</strong></span>
            <small>{triage.continuationReason}</small>
          </div> : null}

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

          <details className="sod29-world-all-research-duplicates sod29-world-ranking-why">
            <summary>למה הממצא נמצא במקום הזה?</summary>
            <div>
              <p>{triage?.evidenceReason || "הממצא נוסף אחרי נקודת החיתוך של הדוח ולכן טרם קיבל הכרעת מיון."}</p>
              {triage?.historicalRecommendation ? <p>בדוח 22.10 ההמלצה הייתה „{triage.historicalRecommendation}”; החלטת ההמשך מוצגת בנפרד ואינה משנה את הרשומה החיה.</p> : null}
              {row.researchStrength?.reasons?.length ? <ul>{row.researchStrength.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
              <small>חוזק, איכות ראיות, מספר מקורות, אימות ופרסום נשארים צירים נפרדים. אף אחד מהם אינו ציון אמת.</small>
            </div>
          </details>

          <DuplicateOccurrences row={row} />

          {representativeHref ? <div className="sod29-world-semantic-duplicate">
            <strong>כפילות סמנטית שסומנה בדוח</strong>
            <p>כל הרשומות והמקורות נשמרים. הנוסח הארוך/המלא שנבחר כנציג התצוגה הוא <code dir="ltr">{representativeId}</code>.</p>
            {triage.recommendedKeepId && triage.recommendedKeepId !== representativeId ? <p>מצביע השמירה מדוח 22.10 נשאר <code dir="ltr">{triage.recommendedKeepId}</code>; הוא אינו מחליף את נציג התצוגה המלא יותר.</p> : null}
            {triage.duplicateIds?.length ? <small>מזהים קשורים: {triage.duplicateIds.join(" · ")}</small> : null}
            <div className="sod29-actions">
              <a className="sod29-action" href={representativeHref}>פתח את נציג התצוגה ←</a>
              {keepHref && keepHref !== representativeHref ? <a className="sod29-action" href={keepHref}>פתח את מצביע השמירה ←</a> : null}
            </div>
          </div> : null}

          {triage?.relatedFindingIds?.length ? <div className="sod29-world-semantic-duplicate">
            <strong>ממצאים קשורים · אינם כפילות</strong>
            <small>{triage.relatedFindingIds.join(" · ")}</small>
          </div> : null}

          {row.attributionLabel ? <div className="sod29-world-all-research-cluster">{safeVisibleText(row.attributionLabel, "ייחוס המקור לא הוכרע")}</div> : null}
          {row.spatialCluster ? <div className="sod29-world-all-research-cluster">קיים אשכול מחקר מרחבי</div> : null}

          {row.family === "research_object" ? <div className="sod29-world-all-research-cluster">
            <strong>{rating ? `מד החיבור לעץ · יעד מדויק · ${rating.title}` : "מד החיבור לעץ · אין נתון"}</strong>
            <p>{rating
              ? "זהו המד של הנושא המדויק בעץ, לא מד של הממצא ולא ציון אמת. איכות היעד המוצגת כאן נפרדת מאיכות הראיות של הממצא."
              : "אין לממצא מד יעד זמין. הוא נשאר ללא נתון ואינו מקבל ציון אפס מומצא."}</p>
            <ConvergenceRatings2029
              quality={rating?.quality ?? null}
              meterScore={rating?.meterScore ?? null}
              highlightNumbers={highlightNumbers || []}
              numbers={ratingNumbers || []}
              popover
            />
            {rating?.href ? <Link className="sod29-action" to={rating.href}>פתח את יעד העץ ←</Link> : null}
            {proposedTreeTargets.length ? <details className="sod29-world-all-research-duplicates" open={proposedTreeTargets.length > 1}>
              <summary>יעדי העץ שהומלצו · {proposedTreeTargets.length}</summary>
              <ul>{proposedTreeTargets.map((target) => <li key={target}><code dir="ltr">{target}</code></li>)}</ul>
            </details> : null}
            {treeTargets.length ? <details className="sod29-world-all-research-duplicates">
              <summary>כל החיבורים המתועדים לעץ · {treeTargets.length}</summary>
              <ul>{treeTargets.map((match, targetIndex) => <li key={`${match.type}:${match.key}:${targetIndex}`}>{treeTargetLabel(match)}</li>)}</ul>
            </details> : <p>ממתין לשיוך · מידע למנהל בלבד.</p>}
          </div> : null}

          <div className="sod29-world-source-locator">
            <strong>מקור וכתובת מדויקת</strong>
            <code dir="ltr">{row.sourceRef || "אין source locator"}</code>
            <div className="sod29-actions">
              <a className="sod29-action" href={row.canonicalFindingHref}>קישור ישיר לממצא</a>
              {row.sourceHref ? <a className="sod29-action" href={row.sourceHref} target="_blank" rel="noreferrer">פתח מקור ↗</a> : null}
              {row.href ? row.href.startsWith("/") ? <Link className="sod29-action" to={row.href}>פתח יעד מספר ←</Link> : <a className="sod29-action" href={row.href} target="_blank" rel="noreferrer">פתח יעד ↗</a> : null}
            </div>
            {!row.sourceHref ? <small>למקור הזה אין כתובת Web מאומתת; המזהה המדויק נשמר בלי להמציא קישור.</small> : null}
          </div>
        </article>;
        })}
      </div>

      {!review.loading && !review.error && !rows.length ? <div className="sod29-world-all-research-state">אין פריטים במסנן הזה. אפס מסננים כדי לחזור לכל החומר.</div> : null}
      {review.page?.hasMore ? <div className="sod29-actions"><button className="sod29-action primary" type="button" disabled={review.loadingMore} onClick={loadMore}>{review.loadingMore ? "טוען…" : `הצג עוד ${PAGE}`}</button></div> : null}

      <div className="sod29-world-all-research-boundary">{clean(projection.truthBoundary)}</div>
    </> : null}
  </section>;
}
