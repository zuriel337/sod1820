import React, { useEffect, useMemo, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import { applySeo } from "../lib/seo.js";
import "./bentovFindingsProduct2029.css";

const TOTAL_FINDINGS = 33;

const KIND_META = Object.freeze({
  observation: { label: "תצפית", short: "ת", count: 17 },
  hypothesis: { label: "השערה", short: "ה", count: 6 },
  claim: { label: "טענה עובדתית", short: "ע", count: 5 },
  relation: { label: "קשר", short: "ק", count: 5 },
});

const THEMES = Object.freeze([
  "תודעה ותנועה מחזורית",
  "הגוף כמערכת מתנודדת",
  "גלים, תדר ותפיסה",
  "זמן כחוויה משתנה",
  "קוהרנטיות בין מערכות",
  "תצפית פנימית ומדידה",
]);

// Read-only aggregate inventory from the canonical candidate set (2026-10-22).
// It intentionally contains no statements, quotations, record ids or private metadata.
const SOURCE_WINDOWS = Object.freeze([
  { page: 7, findings: 1 },
  { page: 32, findings: 2 },
  { page: 37, findings: 1 },
  { page: 39, findings: 1 },
  { page: 50, findings: 1 },
  { page: 58, findings: 1 },
  { page: 64, findings: 3 },
  { page: 65, findings: 2 },
  { page: 66, findings: 5 },
  { page: 67, findings: 4 },
  { page: 70, findings: 2 },
  { page: 77, findings: 1 },
  { page: 79, findings: 4 },
  { page: 87, findings: 1 },
  { page: 92, findings: 1 },
  { page: 98, findings: 1 },
  { page: 99, findings: 1 },
  { page: 109, findings: 1 },
]);

// Private witness review, reduced to aggregate locator outcomes. No candidate
// statement, quote, row id or finding key is embedded in the Preview bundle.
// `verifiedPages` is the audited PDF window; `page` above remains the locator
// currently stored in the protected research inventory.
const LOCATOR_AUDIT_BY_STORED_PAGE = Object.freeze({
  7: { confirmed: 0, expanded: 0, correction: 1, verifiedPages: "8" },
  32: { confirmed: 0, expanded: 0, correction: 2, verifiedPages: "33–35" },
  37: { confirmed: 0, expanded: 0, correction: 1, verifiedPages: "38" },
  39: { confirmed: 0, expanded: 0, correction: 1, verifiedPages: "40" },
  50: { confirmed: 1, expanded: 0, correction: 0, verifiedPages: "50" },
  58: { confirmed: 0, expanded: 1, correction: 0, verifiedPages: "57–58" },
  64: { confirmed: 0, expanded: 0, correction: 3, verifiedPages: "65" },
  65: { confirmed: 0, expanded: 0, correction: 2, verifiedPages: "66" },
  66: { confirmed: 1, expanded: 0, correction: 4, verifiedPages: "66–68" },
  67: { confirmed: 0, expanded: 0, correction: 4, verifiedPages: "68" },
  70: { confirmed: 0, expanded: 0, correction: 2, verifiedPages: "71" },
  77: { confirmed: 0, expanded: 1, correction: 0, verifiedPages: "77–78" },
  79: { confirmed: 0, expanded: 4, correction: 0, verifiedPages: "38–42, 79–80" },
  87: { confirmed: 0, expanded: 1, correction: 0, verifiedPages: "87–89" },
  92: { confirmed: 0, expanded: 1, correction: 0, verifiedPages: "92–93" },
  98: { confirmed: 0, expanded: 0, correction: 1, verifiedPages: "99" },
  99: { confirmed: 0, expanded: 0, correction: 1, verifiedPages: "100–101" },
  109: { confirmed: 1, expanded: 0, correction: 0, verifiedPages: "109" },
});

const LOCATOR_AUDIT_TOTALS = Object.freeze({
  reviewed: 33,
  confirmed: 3,
  expanded: 8,
  correction: 22,
});

// Read-only structural cohort counts from the protected candidate inventory
// (2026-10-22). Cohorts intentionally overlap where declared; the union of the
// 5 engine matches and 12 procedure rows is 15 because 2 rows belong to both.
const FIDELITY_WORK_QUEUE = Object.freeze({
  complex: Object.freeze({
    count: 15,
    title: "בדיקת נאמנות מורכבת",
    description: "ממצאים עם חישוב מנוע או מבנה הליכי צריכים בדיקה של האופרנדים, השלבים והקשר המקור — לא רק תוצאה נכונה.",
    action: "אחרי תיקון האיתור: להשוות את כל המבנה לעד המקור ולתעד החלטה אנושית.",
    metrics: Object.freeze([
      { value: 5, label: "התאמות מנוע" },
      { value: 12, label: "מבני הליך" },
      { value: 2, label: "חפיפה" },
    ]),
  }),
  applicability: Object.freeze({
    count: 18,
    title: "הכרעת תחולת השער",
    description: "ממצאי פרוזה והשוואת־מקורות ללא התאמת מנוע או מבנה הליכי. היעדר סטטוס אינו כשל ואינו אישור.",
    action: "לקבוע לכל ממצא אם שער חילוץ מורכב חל; רק אז לבחור לא־חל, מלא או חלקי לפי הראיות.",
    metrics: Object.freeze([
      { value: 18, label: "ממצאים להכרעה" },
      { value: 0, label: "החלטות שמורות" },
    ]),
  }),
});

const FIDELITY_STRUCTURE_TOTALS = Object.freeze({
  derivations: 0,
  mediaRefs: 0,
  recordedIntegrity: 0,
});

const LOCATOR_STATUS_META = Object.freeze({
  confirmed: Object.freeze({ label: "איתור מדויק", short: "מדויק", action: "להשוות את מלוא ההקשר לעד המקור" }),
  expanded: Object.freeze({ label: "טווח מקור מורחב", short: "הרחבה", action: "לעדכן את טווח העמודים לפני הכרעת נאמנות" }),
  correction: Object.freeze({ label: "איתור דורש תיקון", short: "תיקון", action: "לתקן את האיתור השמור לפני כל הכרעה" }),
});

const REVIEW_CHECKS = Object.freeze([
  Object.freeze({ key: "locator", label: "איתור", description: "האזור המדויק בעד המקור זוהה ונבדק." }),
  Object.freeze({ key: "witness", label: "עד מקור", description: "הטענה הושוותה להקשר המלא, לא רק לשורה בודדת." }),
  Object.freeze({ key: "structure", label: "מבנה", description: "אופרנדים, שלבים והפניות נבדקו כאשר הם חלים." }),
  Object.freeze({ key: "fidelity", label: "נאמנות", description: "התקבלה החלטה אנושית: מלא, חלקי או לא חל." }),
  Object.freeze({ key: "humanGate", label: "שער אנושי", description: "המלצת הביקורת מוכנה להכרעת צוריאל." }),
]);

const FINDING_SOURCE_INDEXES = Object.freeze(SOURCE_WINDOWS.flatMap((source, sourceIndex) => (
  Array(source.findings).fill(sourceIndex)
)));

const DEMO_STATEMENTS = Object.freeze([
  "מפת מושגים המחברת בין תנודה, תפיסה וחוויית זמן.",
  "רכיב הדגמה לבחינת היחס בין תנועה מחזורית לבין תחושת רצף.",
  "נקודת מחקר אפשרית על הגוף כמערכת של קצבים מקוננים.",
  "קשר מוצע בין קוהרנטיות פיזית לבין שינוי במצב הקשב.",
  "שאלת בדיקה על האופן שבו מודל חזותי מסביר חוויה סובייקטיבית.",
  "הבחנה מוצעת בין תיאור מטפורי, השערה וטענה הניתנת לאימות.",
]);

const KIND_SEQUENCE = Object.freeze([
  ...Array(17).fill("observation"),
  ...Array(6).fill("hypothesis"),
  ...Array(5).fill("claim"),
  ...Array(5).fill("relation"),
]);

const FINDINGS = Object.freeze(KIND_SEQUENCE.map((kind, index) => {
  const sourceIndex = FINDING_SOURCE_INDEXES[index];
  const sourceWindow = SOURCE_WINDOWS[sourceIndex];
  const sourceOffset = FINDING_SOURCE_INDEXES.slice(0, index).filter(value => value === sourceIndex).length;
  const sourceAudit = LOCATOR_AUDIT_BY_STORED_PAGE[sourceWindow.page];
  const locatorStatus = sourceOffset < sourceAudit.confirmed
    ? "confirmed"
    : sourceOffset < sourceAudit.confirmed + sourceAudit.expanded ? "expanded" : "correction";
  const angle = (index / TOTAL_FINDINGS) * Math.PI * 2 - Math.PI / 2;
  const radius = index % 3 === 0 ? 42 : index % 3 === 1 ? 35 : 28;
  return Object.freeze({
    id: `demo-${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    kind,
    theme: THEMES[index % THEMES.length],
    statement: DEMO_STATEMENTS[index % DEMO_STATEMENTS.length],
    sourceId: `source-${sourceIndex + 1}`,
    source: `חלון מקור ${sourceIndex + 1} מתוך 18`,
    page: sourceWindow.page,
    verifiedPages: sourceAudit.verifiedPages,
    locatorStatus,
    reviewLane: index < FIDELITY_WORK_QUEUE.complex.count ? "complex" : "applicability",
    match: index < 5 ? "match" : "not_applicable",
    verification: "לא הוצהר",
    governance: "מועמד לביקורת",
    access: "לא ציבורי",
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  });
}));

const SOURCES = Object.freeze(SOURCE_WINDOWS.map((source, index) => ({
  id: `source-${index + 1}`,
  label: `איתור שמור ${source.page}`,
  page: source.page,
  findings: source.findings,
  audit: LOCATOR_AUDIT_BY_STORED_PAGE[source.page],
})));

function locatorAuditLabel(audit) {
  const parts = [];
  if (audit.confirmed) parts.push(`${audit.confirmed} מדויק`);
  if (audit.expanded) parts.push(`${audit.expanded} הורחב`);
  if (audit.correction) parts.push(`${audit.correction} לתיקון`);
  return parts.join(" · ");
}

function FindingMap({ findings, selectedId, onSelect }) {
  return <div className="bentov29-map" aria-label="מפה אינטראקטיבית של ממצאי ההדגמה">
    <div className="bentov29-orbit orbit-a" aria-hidden="true" />
    <div className="bentov29-orbit orbit-b" aria-hidden="true" />
    <div className="bentov29-orbit orbit-c" aria-hidden="true" />
    <div className="bentov29-map-visual" aria-hidden="true">
      <img src="/2029/books/bentov/bentov-consciousness-map.webp" alt="" decoding="async" />
    </div>
    {findings.map(item => <button
      key={item.id}
      type="button"
      className={`bentov29-node kind-${item.kind}${selectedId === item.id ? " is-selected" : ""}`}
      style={{ "--node-x": `${item.x}%`, "--node-y": `${item.y}%`, "--node-delay": `${(item.number % 8) * -0.38}s` }}
      onClick={() => onSelect(item.id)}
      aria-label={`ממצא ${item.number}: ${KIND_META[item.kind].label}`}
      aria-pressed={selectedId === item.id}
      title={`${KIND_META[item.kind].label} · ${item.theme}`}
    >
      <span>{item.number}</span>
    </button>)}
    <div className="bentov29-map-core" aria-hidden="true">
      <strong>33</strong>
      <span>ממצאים</span>
    </div>
  </div>;
}

function FindingDetail({ finding, marked, onToggleMark }) {
  const meta = KIND_META[finding.kind];
  return <aside className="bentov29-detail" aria-live="polite" aria-labelledby="bentov29-detail-title">
    <div className="bentov29-detail-topline">
      <span className={`bentov29-kind kind-${finding.kind}`}>{meta.short}</span>
      <span>{meta.label} · ממצא {finding.number}</span>
      <span className="bentov29-demo-pill">נוסח הדגמה</span>
    </div>
    <h2 id="bentov29-detail-title">{finding.theme}</h2>
    <p className="bentov29-statement">{finding.statement}</p>

    <div className="bentov29-source-card">
      <span>חלון מקור מן המלאי המוגן</span>
      <strong>{finding.source} · איתור שמור עמ׳ {finding.page}</strong>
      <small>האיתור השמור עבר ביקורת PDF נפרדת ומוצג במסלול המקורות. הנוסח והשיוך לנקודת ההדגמה אינם ציטוט או הכרעה מאומתת.</small>
    </div>

    <dl className="bentov29-axes">
      <div><dt>קליטה</dt><dd>נקלט במאגר העבודה</dd></div>
      <div><dt>התאמה</dt><dd>{finding.match === "match" ? "התאמה לבדיקה" : "לא רלוונטי למסלול ההתאמה"}</dd></div>
      <div><dt>אימות</dt><dd>{finding.verification}</dd></div>
      <div><dt>ממשל</dt><dd>{finding.governance}</dd></div>
      <div><dt>גישה</dt><dd>{finding.access}</dd></div>
    </dl>

    <button type="button" className="bentov29-local-action" onClick={onToggleMark} aria-pressed={marked}>
      <NavigationIcon2029 name={marked ? "check" : "spark"} />
      {marked ? "סומן בתצוגה" : "סמן להמשך בדיקה"}
    </button>
    <small className="bentov29-local-note">הסימון זמני במכשיר ואינו נשמר, מאשר או מפרסם דבר.</small>
  </aside>;
}

function SourceRail({ selectedSource, onSelect }) {
  return <section className="bentov29-sources" aria-labelledby="bentov29-sources-title">
    <div className="bentov29-section-label">מסלול המקורות</div>
    <h2 id="bentov29-sources-title">18 נקודות עיגון</h2>
    <p>האיתור השמור מוצג מול חלון ה־PDF שנמצא בביקורת. תוכן המועמדים נשאר מחוץ לחבילת ההדגמה.</p>
    <div className="bentov29-source-list">
      {SOURCES.map((source, index) => <button
        type="button"
        key={source.id}
        className={selectedSource === source.id ? "is-selected" : ""}
        onClick={() => onSelect(source.id)}
      >
        <span className="bentov29-source-index">{String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>{source.label}</strong>
          <small>בדיקת PDF: עמ׳ {source.audit.verifiedPages}</small>
          <small>{locatorAuditLabel(source.audit)} · {source.findings} {source.findings === 1 ? "ממצא" : "ממצאים"}</small>
        </span>
      </button>)}
    </div>
  </section>;
}

function FidelityWorkQueue({ selectedLane, onSelectLane }) {
  const selected = FIDELITY_WORK_QUEUE[selectedLane];
  return <section className="bentov29-fidelity" aria-labelledby="bentov29-fidelity-title" data-fidelity-effect="assessment-only">
    <header>
      <div>
        <div className="bentov29-section-label">תור העבודה הבא · נתוני מבנה בלבד</div>
        <h2 id="bentov29-fidelity-title">מבדיקת עמודים לבדיקת נאמנות</h2>
      </div>
      <span>אין סיווג אוטומטי ל־complete או partial</span>
    </header>

    <div className="bentov29-fidelity-layout">
      <div className="bentov29-fidelity-lanes" role="group" aria-label="בחירת קבוצת עבודה לבדיקת נאמנות">
        {Object.entries(FIDELITY_WORK_QUEUE).map(([key, lane], index) => <button
          type="button"
          key={key}
          className={selectedLane === key ? "is-selected" : ""}
          onClick={() => onSelectLane(key)}
          aria-pressed={selectedLane === key}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{lane.count}</strong>
          <b>{lane.title}</b>
          <small>{key === "complex" ? "5 מנוע + 12 הליך − 2 חופפים" : "ללא מנוע וללא מבנה הליכי"}</small>
        </button>)}
      </div>

      <article className="bentov29-fidelity-detail" aria-live="polite">
        <div><span>קבוצת עבודה</span><strong>{selected.title}</strong></div>
        <p>{selected.description}</p>
        <div className="bentov29-fidelity-metrics">
          {selected.metrics.map(metric => <span key={metric.label}><b>{metric.value}</b><small>{metric.label}</small></span>)}
        </div>
        <div className="bentov29-fidelity-action"><span>פעולה נדרשת</span><p>{selected.action}</p></div>
      </article>

      <aside className="bentov29-structure-gaps" aria-label="פערי מבנה נוכחיים">
        <div className="bentov29-section-label">פערי תיעוד מבניים</div>
        <dl>
          <div><dt>Derivation מובנה</dt><dd>{FIDELITY_STRUCTURE_TOTALS.derivations}</dd></div>
          <div><dt>עוגני מדיה</dt><dd>{FIDELITY_STRUCTURE_TOTALS.mediaRefs}</dd></div>
          <div><dt>החלטת נאמנות שמורה</dt><dd>{FIDELITY_STRUCTURE_TOTALS.recordedIntegrity}</dd></div>
        </dl>
        <small>אפס אינו אומר שכל שדה נדרש לכל ממצא; הוא אומר שאין בסיס שמור להחלטה אוטומטית.</small>
      </aside>
    </div>
  </section>;
}

function ReviewWorkbench({ findings, selectedId, onSelect, progress, locatorDecisions, onLocatorDecision, onApproveAllLocators, onResetAllLocators, onToggleCheck, onReset }) {
  const [queueFilter, setQueueFilter] = useState("all");
  const selected = findings.find(item => item.id === selectedId) || findings[0];
  const completed = progress[selected.id] || new Set();
  const locatorMeta = LOCATOR_STATUS_META[selected.locatorStatus];
  const lane = FIDELITY_WORK_QUEUE[selected.reviewLane];
  const filtered = findings.filter(item => {
    if (queueFilter === "all") return true;
    if (queueFilter === "complex" || queueFilter === "applicability") return item.reviewLane === queueFilter;
    return item.locatorStatus === queueFilter;
  });
  const locallyCompleted = findings.filter(item => (progress[item.id]?.size || 0) === REVIEW_CHECKS.length).length;
  const resolvedLocators = findings.filter(item => locatorDecisions[item.id] && locatorDecisions[item.id] !== "pending").length;
  const locatorDecision = locatorDecisions[selected.id] || "pending";
  const filterOptions = [
    { key: "all", label: "הכול", count: 33 },
    { key: "correction", label: "תיקון", count: 22 },
    { key: "expanded", label: "הרחבה", count: 8 },
    { key: "confirmed", label: "מדויק", count: 3 },
    { key: "complex", label: "נאמנות מורכבת", count: 15 },
    { key: "applicability", label: "הכרעת תחולה", count: 18 },
  ];

  return <section className="bentov29-review" aria-labelledby="bentov29-review-title" data-review-effect="local-only" data-locator-approval="preview-test-only">
    <header>
      <div>
        <div className="bentov29-section-label">שלבים 02–05 · מעטפת עבודה פרטית</div>
        <h2 id="bentov29-review-title">שולחן הכרעה ל־33 תיקי ממצא</h2>
        <p>כך עוברים מאיתור שנבדק להחלטה שניתנת לביקורת. הקודים כאן הם קודי תצוגה בלבד—לא מזהי מסד ולא תוכן מועמד.</p>
      </div>
      <div className="bentov29-review-local">
        <strong>{resolvedLocators} / 33</strong>
        <span>הכרעות איתור מקומיות</span>
        <small>{locallyCompleted} תיקים השלימו גם את כל מסלול הבדיקה</small>
        <small>אינם נשמרים ואינם משנים סטטוס אמת</small>
        <div className="bentov29-review-local-actions">
          <button type="button" onClick={onApproveAllLocators}>אשר את כל 33 בתצוגה</button>
          <button type="button" onClick={onResetAllLocators}>אפס הכול</button>
        </div>
      </div>
    </header>

    <div className="bentov29-review-filters" role="group" aria-label="סינון תיקי העבודה">
      {filterOptions.map(option => <button
        type="button"
        key={option.key}
        className={queueFilter === option.key ? "is-active" : ""}
        onClick={() => setQueueFilter(option.key)}
        aria-pressed={queueFilter === option.key}
      >{option.label} <b>{option.count}</b></button>)}
    </div>

    <div className="bentov29-review-layout">
      <div className="bentov29-review-queue" aria-label={`${filtered.length} תיקי עבודה מוצגים`}>
        {filtered.map(item => {
          const itemProgress = progress[item.id]?.size || 0;
          return <button
            type="button"
            key={item.id}
            className={`${selected.id === item.id ? "is-selected" : ""} status-${item.locatorStatus}`}
            onClick={() => onSelect(item.id)}
            aria-pressed={selected.id === item.id}
          >
            <span>B-{String(item.number).padStart(2, "0")}</span>
            <i>{LOCATOR_STATUS_META[item.locatorStatus].short}</i>
            <b>{itemProgress}/{REVIEW_CHECKS.length}</b>
          </button>;
        })}
      </div>

      <article className="bentov29-review-card" aria-live="polite">
        <div className="bentov29-review-card-head">
          <div><span>תיק הדגמה</span><strong>B-{String(selected.number).padStart(2, "0")}</strong></div>
          <span className={`status-${selected.locatorStatus}`}>{locatorMeta.label}</span>
        </div>
        <div className="bentov29-review-context">
          <div><span>חלון מקור</span><strong>{selected.source}</strong></div>
          <div><span>איתור שמור</span><strong>עמ׳ {selected.page}</strong></div>
          <div><span>בדיקת PDF</span><strong>עמ׳ {selected.verifiedPages}</strong></div>
          <div><span>מסלול</span><strong>{lane.title}</strong></div>
        </div>
        <div className={`bentov29-review-instruction status-${selected.locatorStatus}`}>
          <span>הפעולה הראשונה</span>
          <p>{locatorMeta.action}</p>
        </div>
        <fieldset className="bentov29-locator-decision">
          <legend>הכרעת איתור מקומית</legend>
          <p>הבחירה מדגימה את החלטת המבקר בלבד. היא אינה מתקנת את האיתור הקנוני ואינה נשלחת למסד.</p>
          <div role="group" aria-label={`הכרעת איתור לתיק B-${String(selected.number).padStart(2, "0")}`}>
            <button
              type="button"
              className={locatorDecision === "accept" ? "is-selected" : ""}
              onClick={() => onLocatorDecision(selected.id, "accept")}
              aria-pressed={locatorDecision === "accept"}
            >{selected.locatorStatus === "confirmed" ? "מאשר את האיתור" : `מאשר חלון PDF ${selected.verifiedPages}`}</button>
            <button
              type="button"
              className={locatorDecision === "recheck" ? "is-selected is-recheck" : ""}
              onClick={() => onLocatorDecision(selected.id, "recheck")}
              aria-pressed={locatorDecision === "recheck"}
            >מחזיר לבדיקה נוספת</button>
            <button
              type="button"
              className={locatorDecision === "pending" ? "is-selected is-pending" : ""}
              onClick={() => onLocatorDecision(selected.id, "pending")}
              aria-pressed={locatorDecision === "pending"}
            >משאיר פתוח</button>
          </div>
        </fieldset>
        <div className="bentov29-review-checks" role="group" aria-label={`מסלול בדיקה לתיק B-${String(selected.number).padStart(2, "0")}`}>
          {REVIEW_CHECKS.map((check, index) => {
            const checked = completed.has(check.key);
            return <button
              type="button"
              key={check.key}
              className={checked ? "is-complete" : ""}
              onClick={() => onToggleCheck(selected.id, check.key)}
              aria-pressed={checked}
            >
              <span>{checked ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <strong>{check.label}</strong>
              <small>{check.description}</small>
            </button>;
          })}
        </div>
        <div className="bentov29-review-foot">
          <span>{completed.size === REVIEW_CHECKS.length ? "מוכן בהדמיה למסירת ביקורת" : `${REVIEW_CHECKS.length - completed.size} בדיקות נותרו בהדמיה`}</span>
          <button type="button" onClick={() => onReset(selected.id)} disabled={!completed.size}>איפוס תיק</button>
        </div>
      </article>

      <aside className="bentov29-review-boundary">
        <div className="bentov29-section-label">גבול האמת</div>
        <h3>מה ההדמיה אינה עושה</h3>
        <ul>
          <li><span>01</span>אינה קוראת נוסח פרטי או ציטוט.</li>
          <li><span>02</span>אינה שומרת תיקון איתור.</li>
          <li><span>03</span>אינה קובעת `fidelity_status`.</li>
          <li><span>04</span>אינה מאשרת ממשל או גישה.</li>
          <li><span>05</span>אינה מפרסמת ממצא.</li>
        </ul>
        <strong>השלב האמיתי הבא</strong>
        <p>להפיק חבילת הכרעה פרטית מתוך עד המקור, להעביר ביקורת אנושית, ורק אחר כך לתכנן כתיבה קנונית.</p>
      </aside>
    </div>
  </section>;
}

function PublicationReadiness() {
  const gates = [
    { label: "קליטה", value: "33 / 33", detail: "המועמדים קיימים במאגר המוגן", state: "complete" },
    { label: "ביקורת מקור", value: "33 / 33", detail: "כל האיתורים נבדקו מול ה־PDF", state: "complete" },
    { label: "איתור מוכן", value: "3 / 33", detail: "30 דורשים תיקון או הרחבת טווח", state: "current" },
    { label: "נאמנות שמורה", value: "0 / 33", detail: "לא קיימת החלטת complete / partial", state: "closed" },
    { label: "הכרעה אנושית", value: "0 / 33", detail: "טרם הוצגה חבילת החלטה מלאה", state: "closed" },
    { label: "גישה ציבורית", value: "0 / 33", detail: "שער הפרסום והתשתית נשארים סגורים", state: "locked" },
  ];
  return <section className="bentov29-readiness" aria-labelledby="bentov29-readiness-title" data-publication-readiness="blocked">
    <header>
      <div>
        <div className="bentov29-section-label">תמונת מוכנות · ללא פרסום</div>
        <h2 id="bentov29-readiness-title">איפה המוצר עומד מול שער ציבורי</h2>
      </div>
      <span>BLOCKED · Human Gate</span>
    </header>
    <div className="bentov29-readiness-grid">
      {gates.map((gate, index) => <article key={gate.label} className={`is-${gate.state}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{gate.label}</strong>
        <b>{gate.value}</b>
        <small>{gate.detail}</small>
      </article>)}
    </div>
    <div className="bentov29-readiness-verdict">
      <div><span>מסקנה</span><strong>המוצר מוכן לביקורת פרטית—לא לפרסום.</strong></div>
      <p>אפשר לבנות את חבילת ההכרעה ולהדגים את תהליך העבודה עכשיו. שמירה קנונית, שינוי הרשאות ופתיחה לציבור דורשים הוראה נפרדת לסשן המרכזי ותשתית מאושרת.</p>
    </div>
  </section>;
}

export default function BentovFindingsProduct2029Page() {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(FINDINGS[0].id);
  const [selectedSource, setSelectedSource] = useState(SOURCES[0].id);
  const [markedIds, setMarkedIds] = useState(() => new Set());
  const [fidelityLane, setFidelityLane] = useState("complex");
  const [reviewProgress, setReviewProgress] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, new Set(REVIEW_CHECKS.map(check => check.key))]),
  ));
  const [locatorDecisions, setLocatorDecisions] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, "accept"]),
  ));

  useEffect(() => {
    applySeo({
      title: "מפת הממצאים · בנטוב · הדמיית מוצר",
      description: "הדמיית מוצר אינטראקטיבית לקריאה, חקירה וביקורת של ממצאי ספר.",
      path: "/2029/control",
      noindex: true,
    });

    if (window.location.hash === "#bentov29-review-title") {
      window.requestAnimationFrame(() => {
        document.getElementById("bentov29-review-title")?.scrollIntoView({ block: "start" });
      });
    }
  }, []);

  const visibleFindings = useMemo(
    () => filter === "all" ? FINDINGS : FINDINGS.filter(item => item.kind === filter),
    [filter],
  );
  const selected = FINDINGS.find(item => item.id === selectedId) || FINDINGS[0];
  const marked = markedIds.has(selected.id);

  const selectSource = sourceId => {
    setSelectedSource(sourceId);
    const matching = FINDINGS.find(item => item.sourceId === sourceId);
    if (matching) setSelectedId(matching.id);
  };

  const selectFinding = findingId => {
    const finding = FINDINGS.find(item => item.id === findingId);
    if (!finding) return;
    setSelectedId(findingId);
    setSelectedSource(finding.sourceId);
  };

  const selectFilter = nextFilter => {
    setFilter(nextFilter);
    if (nextFilter === "all" || selected.kind === nextFilter) return;
    const firstMatch = FINDINGS.find(item => item.kind === nextFilter);
    if (firstMatch) selectFinding(firstMatch.id);
  };

  const toggleMarked = () => {
    setMarkedIds(current => {
      const next = new Set(current);
      if (next.has(selected.id)) next.delete(selected.id);
      else next.add(selected.id);
      return next;
    });
  };

  const toggleReviewCheck = (findingId, checkKey) => {
    setReviewProgress(current => {
      const nextChecks = new Set(current[findingId] || []);
      if (nextChecks.has(checkKey)) nextChecks.delete(checkKey);
      else nextChecks.add(checkKey);
      return { ...current, [findingId]: nextChecks };
    });
  };

  const resetReview = findingId => {
    setReviewProgress(current => ({ ...current, [findingId]: new Set() }));
    setLocatorDecisions(current => ({ ...current, [findingId]: "pending" }));
  };

  const setLocatorDecision = (findingId, decision) => {
    setLocatorDecisions(current => ({ ...current, [findingId]: decision }));
  };

  const approveAllLocators = () => {
    setLocatorDecisions(Object.fromEntries(FINDINGS.map(finding => [finding.id, "accept"])));
    setReviewProgress(Object.fromEntries(
      FINDINGS.map(finding => [finding.id, new Set(REVIEW_CHECKS.map(check => check.key))]),
    ));
  };

  const resetAllLocators = () => {
    setLocatorDecisions({});
    setReviewProgress({});
  };

  return <Sod2029Shell
    title="מפת הממצאים"
    eyebrow="ספרים 2029 · הדמיית מוצר"
    description="מחוויית קריאה למרחב מחקר חזותי: מקורות, ממצאים, קשרים ומצב אמון — באותו מסך."
    status="Preview · קריאה בלבד"
    surface="books"
    symbol={<NavigationIcon2029 name="books" />}
    introVariant="compact"
    wide
  >
    <main className="bentov29" data-preview-data="synthetic" data-publication-effect="none">
      <section className="bentov29-hero" aria-labelledby="bentov29-title">
        <div className="bentov29-hero-copy">
          <div className="bentov29-kicker"><span /> יצחק בנטוב · מסע קצר אל התודעה הגבוהה</div>
          <h1 id="bentov29-title">מפת הממצאים</h1>
          <p>אב־טיפוס פעיל שממחיש איך הספר יהפוך ממסמך סגור למרחב שניתן לראות, לסנן, לפתוח ולחקור בעברית.</p>
          <div className="bentov29-notice" role="note">
            <strong>הדמיית מוצר — לא חומר שפורסם.</strong>
            <span>המספרים, עמודי המקור והספירות משקפים את תמונת העבודה; נוסחי הממצאים והקשרים במפה הם הדגמת ממשק בלבד.</span>
          </div>
        </div>
        <img className="bentov29-hero-image" src="/2029/books/bentov/bentov-consciousness-map.webp" alt="המחשה אמנותית של דמות אנושית בתוך שדות גליים ומעגלי תודעה" fetchPriority="high" />
      </section>

      <section className="bentov29-metrics" aria-label="תמונת מצב">
        <article><strong>33</strong><span>מועמדים שנקלטו</span><small>חומר עבודה, לא ציבורי</small></article>
        <article><strong>5</strong><span>התאמות לבדיקה</span><small>match</small></article>
        <article><strong>28</strong><span>לא רלוונטיים להתאמה</span><small>not_applicable</small></article>
        <article><strong>33</strong><span>איתורים נבדקו</span><small>מול עד ה־PDF הפרטי</small></article>
        <article className="is-confirmed"><strong>3</strong><span>מדויקים כפי שנשמרו</span><small>locator confirmed</small></article>
        <article className="is-expanded"><strong>8</strong><span>דורשים טווח רחב</span><small>locator expanded</small></article>
        <article className="is-correction"><strong>22</strong><span>דורשים תיקון</span><small>locator correction</small></article>
        <article className="is-attention"><strong>33</strong><span>נאמנות לא נרשמה</span><small>נדרשת בדיקת תחולה, לא כשל אוטומטי</small></article>
        <article className="is-locked"><strong>0</strong><span>ציבוריים</span><small>שער הפרסום נשאר סגור</small></article>
      </section>

      <section className="bentov29-workspace" aria-label="סביבת חקירת הממצאים">
        <SourceRail selectedSource={selectedSource} onSelect={selectSource} />

        <div className="bentov29-stage">
          <header className="bentov29-stage-head">
            <div>
              <div className="bentov29-section-label">מרחב קשרים</div>
              <h2>המפה החיה של הספר</h2>
            </div>
            <span>{visibleFindings.length} מוצגים</span>
          </header>
          <div className="bentov29-filters" role="group" aria-label="סינון לפי סוג ממצא">
            <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => selectFilter("all")}>הכול <b>33</b></button>
            {Object.entries(KIND_META).map(([key, meta]) => <button
              type="button"
              key={key}
              className={`${filter === key ? "is-active" : ""} kind-${key}`}
              onClick={() => selectFilter(key)}
            >{meta.label} <b>{meta.count}</b></button>)}
          </div>
          <FindingMap findings={visibleFindings} selectedId={selectedId} onSelect={selectFinding} />
          <div className="bentov29-legend" aria-label="מקרא">
            {Object.entries(KIND_META).map(([key, meta]) => <span key={key} className={`kind-${key}`}><i />{meta.label}</span>)}
          </div>
        </div>

        <FindingDetail finding={selected} marked={marked} onToggleMark={toggleMarked} />
      </section>

      <section className="bentov29-verification" aria-labelledby="bentov29-verification-title" data-live-inventory="aggregate-only">
        <header>
          <div>
            <div className="bentov29-section-label">מפת אימות · נתוני מצאי בלבד</div>
            <h2 id="bentov29-verification-title">מה כבר קיים ומה עדיין חוסם התקדמות</h2>
          </div>
          <span>אין כאן נוסחי ממצאים או ציטוטים</span>
        </header>
        <div className="bentov29-verification-chain">
          <article className="is-complete"><span>01</span><strong>קליטת חומר</strong><b>33 / 33</b><small>לכל מועמד קיימים נוסח, ראיה ואיתור שמור במאגר המוגן.</small></article>
          <article className="is-complete"><span>02</span><strong>ביקורת איתור PDF</strong><b>{LOCATOR_AUDIT_TOTALS.reviewed} / 33</b><small>3 מדויקים, 8 דורשים הרחבת טווח ו־22 דורשים תיקון.</small></article>
          <article className="is-current"><span>03</span><strong>נאמנות חילוץ</strong><b>0 / 33</b><small>לא נרשם סטטוס; תיקוני האיתור קודמים להכרעת מלא או חלקי.</small></article>
          <article className="is-closed"><span>04</span><strong>ביקורת ופרסום</strong><b><span className="bentov29-numeric-value">0</span><span className="bentov29-value-label">ציבוריים</span></b><small>נשאר סגור עד ביקורת אנושית וחוזה פרסום נפרד.</small></article>
        </div>
        <div className="bentov29-audit-summary" aria-label="סיכום ביקורת איתורי המקור">
          <span className="is-confirmed"><b>{LOCATOR_AUDIT_TOTALS.confirmed}</b><small>איתורים מדויקים</small></span>
          <span className="is-expanded"><b>{LOCATOR_AUDIT_TOTALS.expanded}</b><small>איתורים להרחבת טווח</small></span>
          <span className="is-correction"><b>{LOCATOR_AUDIT_TOTALS.correction}</b><small>איתורים לתיקון</small></span>
        </div>
        <div className="bentov29-page-map" aria-label="מפת איתורים שמורים מול בדיקת PDF">
          {SOURCES.map(source => <span key={source.id} className={source.audit.correction ? "is-correction" : source.audit.expanded ? "is-expanded" : "is-confirmed"}>
            <b>שמור {source.page}</b>
            <small>PDF {source.audit.verifiedPages}</small>
            <em>{locatorAuditLabel(source.audit)}</em>
          </span>)}
        </div>
      </section>

      <FidelityWorkQueue selectedLane={fidelityLane} onSelectLane={setFidelityLane} />

      <ReviewWorkbench
        findings={FINDINGS}
        selectedId={selectedId}
        onSelect={selectFinding}
        progress={reviewProgress}
        locatorDecisions={locatorDecisions}
        onLocatorDecision={setLocatorDecision}
        onApproveAllLocators={approveAllLocators}
        onResetAllLocators={resetAllLocators}
        onToggleCheck={toggleReviewCheck}
        onReset={resetReview}
      />

      <PublicationReadiness />

      <section className="bentov29-next" aria-labelledby="bentov29-next-title">
        <div>
          <div className="bentov29-section-label">השרשרת מכאן</div>
          <h2 id="bentov29-next-title">כך ההדמיה הופכת למוצר אמיתי</h2>
        </div>
        <ol>
          <li><span>01</span><strong>חבילת הכרעה פרטית</strong><small>לאגד לכל ממצא עד מקור, הקשר, מבנה והמלצת נאמנות</small></li>
          <li><span>02</span><strong>אישור תיקוני איתור</strong><small>22 תיקונים ו־8 הרחבות לפני כתיבה קנונית</small></li>
          <li><span>03</span><strong>הכרעת נאמנות אנושית</strong><small>complete, partial או לא חל—לפי הראיות ולא לפי ברירת מחדל</small></li>
          <li><span>04</span><strong>תכנון שער פרסום</strong><small>רק אחרי החלטת תוכן, חוזה הרשאה ו־RLS מאושרים</small></li>
        </ol>
      </section>
    </main>
  </Sod2029Shell>;
}
