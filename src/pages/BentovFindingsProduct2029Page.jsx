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

const ENGINE_STATUS_META = Object.freeze({
  verified: Object.freeze({
    label: "עבר בדיקת מנוע",
    short: "מנוע מאומת",
    description: "הממצא מתאים לבדיקה חישובית או מבנית והתוצאה הקיימת עברה את המנוע הקנוני.",
  }),
  not_applicable: Object.freeze({
    label: "מנוע לא רלוונטי",
    short: "לא חל",
    description: "זהו ממצא טקסטואלי, השוואתי או פרשני; היעדר בדיקת מנוע אינו כשל ואינו חוסר אימות.",
  }),
});

const THEMES = Object.freeze([
  "תודעה ותנועה מחזורית",
  "הגוף כמערכת מתנודדת",
  "גלים, תדר ותפיסה",
  "זמן כחוויה משתנה",
  "קוהרנטיות בין מערכות",
  "תצפית פנימית ומדידה",
]);

// Read-only aggregate inventory from the canonical candidate set (2026-10-23).
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
// `verifiedPages` is the audited PDF window that was written canonically;
// `page` preserves the pre-write locator so the review delta remains visible.
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

// Read-only canonical snapshot verified after the bounded metadata write on
// 2026-10-23. The interactive controls below remain local Preview controls;
// this aggregate does not publish, promote or change access for any finding.
const PREVIEW_REVIEW_DECISION = Object.freeze({
  reviewed: 33,
  fidelityApproved: 33,
  humanApproved: 33,
  canonicalFidelityStored: 33,
  verifiedExact: 23,
  reconstructedMultiLocus: 10,
  publicFindings: 0,
  verdict: "complete",
  effect: "canonical_readonly_snapshot",
});

const CANONICAL_FIDELITY_LANES = Object.freeze({
  exact: Object.freeze({
    count: 23,
    title: "נאמנות מדויקת",
    description: "הממצא נתמך בעוגן מקור מדויק שנבדק מול עד ה־PDF ונשמר במטא־דאטה הקנוני.",
    action: "הכרעת הנאמנות שמורה. אין צורך בבדיקת מקור נוספת לפני החלטת הפרסום הנפרדת.",
    summary: "עוגן יחיד ומדויק",
    metrics: Object.freeze([
      { value: 23, label: "מדויקים" },
      { value: 23, label: "שמורים בקנוני" },
      { value: 0, label: "ציבוריים" },
    ]),
  }),
  multi_locus: Object.freeze({
    count: 10,
    title: "נאמנות רב־מוקדית",
    description: "הממצא נשען על יותר ממוקד אחד בעד המקור, והחיבור ביניהם תועד עם טקסט PDF בר־חיפוש.",
    action: "הכרעת הנאמנות שמורה. בשער הפרסום יש להציג לקורא את כל מוקדי המקור ולא לצמצם אותם לעמוד יחיד.",
    summary: "כמה מוקדי מקור מתועדים",
    metrics: Object.freeze([
      { value: 10, label: "רב־מוקדיים" },
      { value: 10, label: "שמורים בקנוני" },
      { value: 0, label: "ציבוריים" },
    ]),
  }),
});

// Read-only structural cohort counts from the protected candidate inventory
// (2026-10-22). Cohorts intentionally overlap where declared; the union of the
// 5 engine-verified rows and 12 procedure rows is 15 because 2 rows belong to both.
const FIDELITY_WORK_QUEUE = Object.freeze({
  complex: Object.freeze({
    count: 15,
    title: "בדיקת נאמנות מורכבת",
    description: "ממצאים עם חישוב מנוע או מבנה הליכי צריכים בדיקה של האופרנדים, השלבים והקשר המקור — לא רק תוצאה נכונה.",
    action: "ההשוואה הושלמה ותיקוני האיתור והנאמנות נשמרו בקנוני; הפרסום נשאר מסלול נפרד.",
    metrics: Object.freeze([
      { value: 5, label: "עברו מנוע" },
      { value: 12, label: "מבני הליך" },
      { value: 2, label: "חפיפה" },
      { value: 15, label: "חבילות ביקורת" },
    ]),
  }),
  textual: Object.freeze({
    count: 18,
    title: "בדיקת נאמנות טקסטואלית",
    description: "ממצאי פרוזה והשוואת־מקורות אינם זקוקים למנוע, אבל עדיין חייבים להיבדק מול הנוסח, ההקשר וגבולות הטענה במקור.",
    action: "ההשוואה הושלמה והכרעות הנאמנות נשמרו בקנוני; הפרסום נשאר מסלול נפרד.",
    metrics: Object.freeze([
      { value: 18, label: "בדיקות טקסטואליות" },
      { value: 18, label: "חבילות ביקורת" },
      { value: 33, label: "החלטות שמורות במסד" },
    ]),
  }),
});

const FIDELITY_STRUCTURE_TOTALS = Object.freeze({
  derivations: 0,
  mediaRefs: 33,
  recordedIntegrity: 33,
});

const LOCATOR_STATUS_META = Object.freeze({
  confirmed: Object.freeze({ label: "איתור נשאר מדויק", short: "מדויק", action: "לא נדרש שינוי באיתור הקנוני" }),
  expanded: Object.freeze({ label: "טווח המקור הורחב", short: "הורחב", action: "הטווח המורחב נשמר באיתור הקנוני" }),
  correction: Object.freeze({ label: "האיתור תוקן", short: "תוקן", action: "האיתור המתוקן נשמר בקנוני" }),
});

const REVIEW_CHECKS = Object.freeze([
  Object.freeze({ key: "locator", label: "איתור", description: "האזור המדויק בעד המקור זוהה ונבדק." }),
  Object.freeze({ key: "witness", label: "עד מקור", description: "הטענה הושוותה להקשר המלא, לא רק לשורה בודדת." }),
  Object.freeze({ key: "structure", label: "מבנה", description: "אופרנדים, שלבים והפניות נבדקו כאשר הם חלים." }),
  Object.freeze({ key: "fidelity", label: "נאמנות", description: "התקבלה החלטה אנושית: מלא, חלקי, אי־התאמה או לא חל." }),
  Object.freeze({ key: "humanGate", label: "שער אנושי", description: "המלצת הביקורת מוכנה להכרעת צוריאל." }),
]);

const FIDELITY_VERDICT_META = Object.freeze({
  complete: Object.freeze({ label: "מלא", description: "הנוסח, ההקשר והמבנה נתמכים במלואם בעד המקור." }),
  partial: Object.freeze({ label: "חלקי", description: "חלק מן הממצא נתמך, אך נדרש צמצום או תיקון לפני ממשל." }),
  mismatch: Object.freeze({ label: "אי־התאמה", description: "עד המקור אינו תומך בניסוח הנוכחי של הממצא." }),
  not_applicable: Object.freeze({ label: "לא חל", description: "אין בממצא טענת מקור שניתן להכריע לגביה; מצב נדיר שאינו קשור לתחולת מנוע." }),
  needs_evidence: Object.freeze({ label: "חסרות ראיות", description: "אין עדיין בסיס מספיק להכרעה; הממצא נשאר פתוח." }),
});

const PUBLICATION_CHECKS = Object.freeze([
  Object.freeze({ key: "public_copy", label: "נוסח ציבורי", description: "הניסוח העברי ברור, מדויק ואינו חושף חומר עבודה פרטי." }),
  Object.freeze({ key: "source_display", label: "הצגת מקור", description: "הקורא יקבל את כל עוגני המקור הנדרשים, ובממצא רב־מוקדי את כולם." }),
  Object.freeze({ key: "attribution", label: "ייחוס", description: "הספר, המחבר וההבחנה בין דברי המקור לבין פרשנות מוצגים במפורש." }),
  Object.freeze({ key: "privacy", label: "פרטיות", description: "אין בנוסח, בראיות או במטא־דאטה מידע פרטי שאסור להציג." }),
  Object.freeze({ key: "accessibility", label: "נגישות", description: "הכותרת, התקציר, מבנה הקריאה והחלופה החזותית מוכנים לקורא." }),
]);

const PUBLICATION_DECISION_META = Object.freeze({
  ready_for_publication: Object.freeze({ label: "מוכן להחלטת פרסום", description: "חבילת התצוגה עברה את חמש בדיקות הפרסום; עדיין לא פורסם דבר." }),
  needs_public_copy: Object.freeze({ label: "נדרש ניסוח ציבורי", description: "המחקר תקין, אך הנוסח לקורא עדיין דורש עריכה." }),
  hold: Object.freeze({ label: "בהשהיה", description: "הממצא נשמר כמועמד ואינו מתקדם כרגע." }),
  exclude: Object.freeze({ label: "לא לפרסום", description: "הממצא יישאר בחומר המחקר ולא יוצג בספרייה הציבורית." }),
});

const EVIDENCE_REQUIREMENTS = Object.freeze({
  shared: Object.freeze([
    Object.freeze({ key: "witness_window", label: "חלון עד המקור", description: "העמודים שנבדקו כוללים את הקטע הרלוונטי במלואו." }),
    Object.freeze({ key: "locator_reconciliation", label: "יישוב האיתור", description: "הפער בין האיתור השמור לחלון ה־PDF תועד והוכרע." }),
    Object.freeze({ key: "surrounding_context", label: "הקשר מסביב", description: "נבדקו ההקשר שלפני הקטע וההקשר שאחריו." }),
    Object.freeze({ key: "claim_scope", label: "גבולות הממצא", description: "ברור מה המקור תומך בו ומה אינו טוען." }),
  ]),
  complex: Object.freeze({ key: "structured_trace", label: "עקבה מבנית", description: "האופרנדים, השלבים וההפניות הושוו לעד המקור." }),
  textual: Object.freeze({ key: "source_fidelity_rationale", label: "נימוק נאמנות למקור", description: "תועד כיצד הנוסח וההקשר במקור תומכים בממצא או מגבילים אותו." }),
});

function evidenceRequirementsFor(finding) {
  return [...EVIDENCE_REQUIREMENTS.shared, EVIDENCE_REQUIREMENTS[finding.reviewLane]];
}

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
    reviewLane: index < FIDELITY_WORK_QUEUE.complex.count ? "complex" : "textual",
    publicationFidelity: index < PREVIEW_REVIEW_DECISION.verifiedExact ? "exact" : "multi_locus",
    engineStatus: index < 5 ? "verified" : "not_applicable",
    fidelityStatus: "הכרעה שמורה בקנוני",
    governance: "מועמד להחלטת פרסום",
    access: "לא ציבורי",
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  });
}));

const SOURCES = Object.freeze(SOURCE_WINDOWS.map((source, index) => ({
  id: `source-${index + 1}`,
  label: `איתור לפני ביקורת ${source.page}`,
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
  const engineMeta = ENGINE_STATUS_META[finding.engineStatus];
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
      <strong>{finding.source} · עוגן קנוני PDF {finding.verifiedPages}</strong>
      <small>עמ׳ {finding.page} הוא האיתור שלפני הביקורת; העוגן הקנוני שמעליו משקף את התיקון או ההרחבה שנשמרו. נוסח ההדגמה אינו ציטוט.</small>
    </div>

    <dl className="bentov29-axes">
      <div><dt>קליטה</dt><dd>נקלט במאגר העבודה</dd></div>
      <div data-engine-status={finding.engineStatus}><dt>בדיקת מנוע</dt><dd>{engineMeta.label}</dd></div>
      <div><dt>נאמנות למקור</dt><dd>{finding.fidelityStatus}</dd></div>
      <div><dt>ממשל</dt><dd>{finding.governance}</dd></div>
      <div><dt>גישה</dt><dd>{finding.access}</dd></div>
    </dl>

    <div className="bentov29-source-card" data-engine-explanation={finding.engineStatus}>
      <span>למה זה מצב המנוע?</span>
      <strong>{engineMeta.short}</strong>
      <small>{engineMeta.description}</small>
    </div>

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
    <p>האיתור שלפני הביקורת מוצג מול העוגן הקנוני שנשמר. תוכן המועמדים נשאר מחוץ לחבילת ההדגמה.</p>
    <div className="bentov29-source-list">
      {SOURCES.map((source, index) => <button
        type="button"
        key={source.id}
        className={selectedSource === source.id ? "is-selected" : ""}
        onClick={() => onSelect(source.id)}
      >
        <span className="bentov29-source-index">{String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>עוגן קנוני {source.audit.verifiedPages}</strong>
          <small>לפני הביקורת: עמ׳ {source.page}</small>
          <small>{locatorAuditLabel(source.audit)} · {source.findings} {source.findings === 1 ? "ממצא" : "ממצאים"}</small>
        </span>
      </button>)}
    </div>
  </section>;
}

function FidelityWorkQueue({ selectedLane, onSelectLane }) {
  const selected = CANONICAL_FIDELITY_LANES[selectedLane];
  return <section className="bentov29-fidelity" aria-labelledby="bentov29-fidelity-title" data-fidelity-effect="canonical-readonly-summary">
    <header>
      <div>
        <div className="bentov29-section-label">מצב קנוני · נתוני מבנה בלבד</div>
        <h2 id="bentov29-fidelity-title">33 הכרעות נאמנות שמורות</h2>
      </div>
      <span>23 מדויקות · 10 רב־מוקדיות</span>
    </header>

    <div className="bentov29-fidelity-layout">
      <div className="bentov29-fidelity-lanes" role="group" aria-label="בחירת קבוצת עבודה לבדיקת נאמנות">
        {Object.entries(CANONICAL_FIDELITY_LANES).map(([key, lane], index) => <button
          type="button"
          key={key}
          className={selectedLane === key ? "is-selected" : ""}
          onClick={() => onSelectLane(key)}
          aria-pressed={selectedLane === key}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{lane.count}</strong>
          <b>{lane.title}</b>
          <small>{lane.summary}</small>
        </button>)}
      </div>

      <article className="bentov29-fidelity-detail" aria-live="polite">
        <div><span>קבוצת עבודה</span><strong>{selected.title}</strong></div>
        <p>{selected.description}</p>
        <div className="bentov29-fidelity-metrics">
          {selected.metrics.map(metric => <span key={metric.label}><b>{metric.value}</b><small>{metric.label}</small></span>)}
        </div>
        <div className="bentov29-fidelity-action"><span>השלב הבא</span><p>{selected.action}</p></div>
        <div className="bentov29-fidelity-action">
          <span>מהי הכרעת נאמנות?</span>
          <p>השוואה בין ניסוח הממצא לבין עד המקור: הנוסח, ההקשר, טווח העמודים וגבולות הטענה. זו אינה בדיקת מנוע ואינה החלטת פרסום.</p>
        </div>
      </article>

      <aside className="bentov29-structure-gaps" aria-label="מצב התיעוד הקנוני">
        <div className="bentov29-section-label">מה נשמר בקנוני</div>
        <dl>
          <div><dt>Derivation מובנה</dt><dd>{FIDELITY_STRUCTURE_TOTALS.derivations}</dd></div>
          <div><dt>עוגני עד PDF</dt><dd>{FIDELITY_STRUCTURE_TOTALS.mediaRefs}</dd></div>
          <div><dt>החלטת נאמנות שמורה</dt><dd>{FIDELITY_STRUCTURE_TOTALS.recordedIntegrity}</dd></div>
        </dl>
        <small>זהו צילום מצב מצרפי בקריאה בלבד. 33 הממצאים נשארו מועמדים מוגנים; שום ממצא לא פורסם.</small>
      </aside>
    </div>
  </section>;
}

function ReviewWorkbench({ findings, selectedId, onSelect, progress, locatorDecisions, fidelityDecisions, evidenceProgress, onLocatorDecision, onFidelityDecision, onToggleEvidence, onApproveAllLocators, onResetAllLocators, onToggleCheck, onReset }) {
  const [queueFilter, setQueueFilter] = useState("all");
  const selected = findings.find(item => item.id === selectedId) || findings[0];
  const completed = progress[selected.id] || new Set();
  const locatorMeta = LOCATOR_STATUS_META[selected.locatorStatus];
  const lane = FIDELITY_WORK_QUEUE[selected.reviewLane];
  const filtered = findings.filter(item => {
    if (queueFilter === "all") return true;
    if (queueFilter === "complex" || queueFilter === "textual") return item.reviewLane === queueFilter;
    if (queueFilter === "engine_verified") return item.engineStatus === "verified";
    if (queueFilter === "engine_not_applicable") return item.engineStatus === "not_applicable";
    return item.locatorStatus === queueFilter;
  });
  const locallyCompleted = findings.filter(item => (progress[item.id]?.size || 0) === REVIEW_CHECKS.length).length;
  const resolvedLocators = findings.filter(item => locatorDecisions[item.id] && locatorDecisions[item.id] !== "pending").length;
  const locatorDecision = locatorDecisions[selected.id] || "pending";
  const fidelityDecision = fidelityDecisions[selected.id] || "needs_evidence";
  const evidenceRequirements = evidenceRequirementsFor(selected);
  const selectedEvidence = evidenceProgress[selected.id] || new Set();
  const evidenceComplete = evidenceRequirements.every(requirement => selectedEvidence.has(requirement.key));
  const readyEvidencePackets = findings.filter(item => {
    const recorded = evidenceProgress[item.id] || new Set();
    return evidenceRequirementsFor(item).every(requirement => recorded.has(requirement.key));
  }).length;
  const fidelityTotals = Object.fromEntries(Object.keys(FIDELITY_VERDICT_META).map(key => [
    key,
    findings.filter(item => (fidelityDecisions[item.id] || "needs_evidence") === key).length,
  ]));
  const decidedFidelity = TOTAL_FINDINGS - fidelityTotals.needs_evidence;
  const filterOptions = [
    { key: "all", label: "הכול", count: 33 },
    { key: "correction", label: "תיקון", count: 22 },
    { key: "expanded", label: "הרחבה", count: 8 },
    { key: "confirmed", label: "מדויק", count: 3 },
    { key: "engine_verified", label: "עברו מנוע", count: 5 },
    { key: "engine_not_applicable", label: "מנוע לא חל", count: 28 },
    { key: "complex", label: "נאמנות מורכבת", count: 15 },
    { key: "textual", label: "נאמנות טקסטואלית", count: 18 },
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
        <small>{decidedFidelity} / 33 הכרעות נאמנות בפריוויו</small>
        <small>{readyEvidencePackets} / 33 חבילות ראיות מוכנות מקומית</small>
        <small>{locallyCompleted} תיקים סומנו כהשלמת מסלול ההדגמה</small>
        <small>אינם נשמרים ואינם משנים סטטוס אמת</small>
        <div className="bentov29-review-local-actions">
          <button type="button" onClick={onApproveAllLocators}>החל אישור 33/33 בתצוגה</button>
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

    <div className="bentov29-fidelity-verdict-summary" aria-label="סיכום הכרעות נאמנות מקומיות">
      {Object.entries(FIDELITY_VERDICT_META).map(([key, meta]) => <span key={key} className={`is-${key}`}>
        <b>{fidelityTotals[key]}</b>
        <small>{meta.label}</small>
      </span>)}
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
          <div data-engine-status={selected.engineStatus}><span>בדיקת מנוע</span><strong>{ENGINE_STATUS_META[selected.engineStatus].label}</strong></div>
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
        <fieldset className="bentov29-evidence-packet" data-evidence-effect="local-only">
          <legend>חבילת ראיות פרטית · {selectedEvidence.size}/{evidenceRequirements.length}</legend>
          <p>הסימונים מאשרים רק שהראיה נבדקה בסביבה הפרטית. נוסח המקור, ציטוטים ומזהי מסד אינם נכנסים לחבילת הפריוויו.</p>
          <div className="bentov29-evidence-target">
            <span>יעד הבדיקה</span>
            <strong>עמ׳ {selected.verifiedPages}</strong>
            <small>{selected.reviewLane === "complex" ? "נדרש גם תיעוד מבני" : "נדרש נימוק נאמנות למקור"}</small>
          </div>
          <div className="bentov29-evidence-list" role="group" aria-label={`חבילת ראיות לתיק B-${String(selected.number).padStart(2, "0")}`}>
            {evidenceRequirements.map((requirement, index) => {
              const checked = selectedEvidence.has(requirement.key);
              return <button
                type="button"
                key={requirement.key}
                className={checked ? "is-complete" : ""}
                onClick={() => onToggleEvidence(selected.id, requirement.key)}
                aria-pressed={checked}
              >
                <span>{checked ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <strong>{requirement.label}</strong>
                <small>{requirement.description}</small>
              </button>;
            })}
          </div>
          <div className={`bentov29-evidence-gate${evidenceComplete ? " is-ready" : ""}`} role="status">
            <strong>{evidenceComplete ? "חבילת הראיות מוכנה להכרעה מקומית" : `${evidenceRequirements.length - selectedEvidence.size} ראיות עדיין חסרות`}</strong>
            <small>{evidenceComplete ? "עדיין לא נשמר דבר ולא נפתח שער ממשל." : "עד להשלמה ניתן להשאיר רק ‘חסרות ראיות’."}</small>
          </div>
        </fieldset>
        <fieldset className="bentov29-fidelity-decision" data-fidelity-decision-effect="local-only">
          <legend>הכרעת נאמנות מקומית</legend>
          <p>סימון שלב בדיקה אינו הכרעת נאמנות. בחר תוצאה רק לפי עד המקור; בדיקת מנוע, נאמנות למקור וסטטוס פרסום נשארים צירים נפרדים.</p>
          <div role="group" aria-label={`הכרעת נאמנות לתיק B-${String(selected.number).padStart(2, "0")}`}>
            {Object.entries(FIDELITY_VERDICT_META).map(([key, meta]) => <button
              type="button"
              key={key}
              className={`${fidelityDecision === key ? "is-selected" : ""} is-${key}`}
              onClick={() => onFidelityDecision(selected.id, key)}
              aria-pressed={fidelityDecision === key}
              disabled={key !== "needs_evidence" && !evidenceComplete}
            >
              <strong>{meta.label}</strong>
              <small>{meta.description}</small>
            </button>)}
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
          <li><span>02</span>אינה משנה את תיקוני האיתור שכבר נשמרו.</li>
          <li><span>03</span>אינה משנה את `fidelity_status` הקנוני.</li>
          <li><span>04</span>אינה מאשרת ממשל או גישה.</li>
          <li><span>05</span>אינה מפרסמת ממצא.</li>
        </ul>
        <strong>השלב האמיתי הבא</strong>
        <p>לבנות שער ביקורת פרסום נפרד שמציג את 33 ההכרעות הקנוניות, בלי לפתוח הרשאות ובלי להפוך מועמד לחומר ציבורי.</p>
      </aside>
    </div>
  </section>;
}

function PublicationDecisionGate({ findings, selectedId, onSelect, decisions, checks, onDecision, onToggleCheck, onModelComplete, onReset }) {
  const selected = findings.find(item => item.id === selectedId) || findings[0];
  const selectedChecks = checks[selected.id] || new Set();
  const allChecksComplete = PUBLICATION_CHECKS.every(check => selectedChecks.has(check.key));
  const decision = decisions[selected.id] || "hold";
  const totals = Object.fromEntries(Object.keys(PUBLICATION_DECISION_META).map(key => [
    key,
    findings.filter(item => (decisions[item.id] || "hold") === key).length,
  ]));
  const fullyChecked = findings.filter(item => (
    PUBLICATION_CHECKS.every(check => (checks[item.id] || new Set()).has(check.key))
  )).length;
  const exactReady = findings.filter(item => item.publicationFidelity === "exact" && decisions[item.id] === "ready_for_publication").length;
  const multiReady = findings.filter(item => item.publicationFidelity === "multi_locus" && decisions[item.id] === "ready_for_publication").length;
  const fidelityLane = CANONICAL_FIDELITY_LANES[selected.publicationFidelity];

  return <section className="bentov29-publication-gate" aria-labelledby="bentov29-publication-gate-title" data-publication-decision-effect="local-only">
    <header>
      <div>
        <div className="bentov29-section-label">שלב 06 · שער החלטת פרסום בפריוויו</div>
        <h2 id="bentov29-publication-gate-title">כך 33 הממצאים הופכים לחבילת ספר לציבור</h2>
        <p>המסך מדגים את החלטת העורך אחרי שהמקור והנאמנות כבר נשמרו. כל הסימונים כאן מקומיים בלבד: אין כתיבה למסד, אין שינוי הרשאות ואין פרסום.</p>
      </div>
      <div className="bentov29-publication-actions">
        <strong>{totals.ready_for_publication} / 33</strong>
        <span>מוכנים להחלטה בהדמיה</span>
        <small>{fullyChecked} חבילות עם 5/5 בדיקות מקומיות</small>
        <div>
          <button type="button" onClick={onModelComplete}>הצג מוצר מלא 33/33</button>
          <button type="button" onClick={onReset}>אפס הדמיה</button>
        </div>
      </div>
    </header>

    <div className="bentov29-publication-summary" aria-label="סיכום שער החלטת הפרסום">
      <article><span>01</span><strong>נאמנות מדויקת</strong><b>{exactReady} / 23</b><small>עוגן יחיד מוצג לקורא</small></article>
      <article><span>02</span><strong>נאמנות רב־מוקדית</strong><b>{multiReady} / 10</b><small>כל מוקדי המקור מוצגים לקורא</small></article>
      <article><span>03</span><strong>נדרש ניסוח</strong><b>{totals.needs_public_copy}</b><small>נשאר במסלול העריכה</small></article>
      <article className="is-locked"><span>04</span><strong>גישה ציבורית חיה</strong><b>0 / 33</b><small>לא נפתחה בפריוויו</small></article>
    </div>

    <div className="bentov29-publication-layout">
      <div className="bentov29-publication-queue" aria-label="33 תיקי החלטת פרסום">
        {findings.map(item => {
          const itemDecision = decisions[item.id] || "hold";
          const itemChecks = checks[item.id] || new Set();
          return <button
            type="button"
            key={item.id}
            className={`${selected.id === item.id ? "is-selected" : ""} is-${itemDecision}`}
            onClick={() => onSelect(item.id)}
            aria-pressed={selected.id === item.id}
          >
            <span>B-{String(item.number).padStart(2, "0")}</span>
            <i>{item.publicationFidelity === "exact" ? "מדויק" : "רב־מוקדי"}</i>
            <b>{itemChecks.size}/{PUBLICATION_CHECKS.length}</b>
          </button>;
        })}
      </div>

      <article className="bentov29-publication-card" aria-live="polite">
        <div className="bentov29-publication-card-head">
          <div><span>תיק תצוגה</span><strong>B-{String(selected.number).padStart(2, "0")}</strong></div>
          <span>{fidelityLane.title}</span>
        </div>
        <div className="bentov29-publication-context">
          <div><span>מצב אמת</span><strong>candidate / public_candidate</strong></div>
          <div><span>נאמנות קנונית</span><strong>{selected.publicationFidelity === "exact" ? "verified_exact" : "רב־מוקדית מתועדת"}</strong></div>
          <div><span>תצוגת מקור</span><strong>{selected.publicationFidelity === "exact" ? "עוגן מדויק" : "כל מוקדי המקור"}</strong></div>
          <div><span>גישה</span><strong>לא ציבורי</strong></div>
        </div>

        <fieldset className="bentov29-publication-checks">
          <legend>בדיקות חבילת הפרסום · {selectedChecks.size}/{PUBLICATION_CHECKS.length}</legend>
          <p>הבדיקות שייכות להצגה לקורא, לא לאימות המחקר שכבר הושלם.</p>
          <div role="group" aria-label={`בדיקות פרסום לתיק B-${String(selected.number).padStart(2, "0")}`}>
            {PUBLICATION_CHECKS.map((check, index) => {
              const checked = selectedChecks.has(check.key);
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
        </fieldset>

        <fieldset className="bentov29-publication-decision">
          <legend>החלטת פרסום מקומית</legend>
          <p>״מוכן להחלטת פרסום״ מתאר את החבילה בלבד. הוא אינו משנה מצב קנוני ואינו פותח גישה.</p>
          <div role="group" aria-label={`החלטת פרסום לתיק B-${String(selected.number).padStart(2, "0")}`}>
            {Object.entries(PUBLICATION_DECISION_META).map(([key, meta]) => <button
              type="button"
              key={key}
              className={`${decision === key ? "is-selected" : ""} is-${key}`}
              onClick={() => onDecision(selected.id, key)}
              aria-pressed={decision === key}
              disabled={key === "ready_for_publication" && !allChecksComplete}
            >
              <strong>{meta.label}</strong>
              <small>{meta.description}</small>
            </button>)}
          </div>
        </fieldset>
      </article>

      <aside className="bentov29-publication-boundary">
        <div className="bentov29-section-label">מה רואים בסוף</div>
        <h3>חבילת קריאה, לא שורת מסד</h3>
        <ol>
          <li><span>01</span><div><strong>כותרת ותקציר בעברית</strong><small>נוסח ציבורי נפרד מחומר העבודה.</small></div></li>
          <li><span>02</span><div><strong>מפת תודעה מרחבית</strong><small>כניסה חזותית לנושאים ולקשרים.</small></div></li>
          <li><span>03</span><div><strong>כרטיס ממצא עם מקור</strong><small>הבחנה בין מקור, ממצא ופרשנות.</small></div></li>
          <li><span>04</span><div><strong>מסלול חקירה בספר</strong><small>מעבר בין 33 הממצאים בלי לחשוף מידע פרטי.</small></div></li>
        </ol>
        <div className="bentov29-publication-lock" role="status">
          <strong>0 ממצאים ציבוריים</strong>
          <small>הדגמת ההחלטה הושלמה בפריוויו בלבד. מעבר אמיתי דורש שער כתיבה והרשאה נפרד.</small>
        </div>
      </aside>
    </div>
  </section>;
}

function PublicationReadiness() {
  const gates = [
    { label: "קליטה", value: "33 / 33", detail: "המועמדים קיימים במאגר המוגן", state: "complete" },
    { label: "בדיקת מנוע", value: "5 / 5", detail: "כל הממצאים המתאימים למנוע עברו; ב־28 האחרים המנוע אינו חל", state: "complete" },
    { label: "ביקורת מקור", value: "33 / 33", detail: "כל האיתורים נבדקו מול ה־PDF", state: "complete" },
    { label: "איתור קנוני", value: "33 / 33", detail: "22 תיקונים, 8 הרחבות ו־3 איתורים שלא דרשו שינוי נשמרו", state: "complete" },
    { label: "נאמנות מדויקת", value: "23 / 33", detail: "עוגן מקור מדויק נשמר לכל אחד מהממצאים", state: "complete" },
    { label: "נאמנות רב־מוקדית", value: "10 / 33", detail: "כל מוקדי המקור נשמרו עם עד PDF בר־חיפוש", state: "complete" },
    { label: "נאמנות שמורה", value: "33 / 33", detail: "כל ההחלטות קיימות במסד הקנוני", state: "complete" },
    { label: "הכרעה אנושית", value: "33 / 33", detail: "אישור בעלים התקבל לכל חבילת הביקורת", state: "complete" },
    { label: "ביקורת פרסום", value: "33 / 33", detail: "המסלול המלא מודגם מקומית; ההחלטות אינן נשמרות", state: "current" },
    { label: "גישה ציבורית", value: "0 / 33", detail: "שער הפרסום והתשתית נשארים סגורים", state: "locked" },
  ];
  return <section className="bentov29-readiness" aria-labelledby="bentov29-readiness-title" data-publication-readiness="blocked">
    <header>
      <div>
        <div className="bentov29-section-label">תמונת מוכנות · ללא פרסום</div>
        <h2 id="bentov29-readiness-title">איפה המוצר עומד מול שער ציבורי</h2>
      </div>
      <span>NEXT · Access implementation</span>
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
      <div><span>מסקנה</span><strong>הכתיבה הקנונית הושלמה—הפרסום עדיין סגור.</strong></div>
      <p>33 החלטות הנאמנות שמורות, ושער ביקורת הפרסום כבר מודגם כאן ל־23 מדויקות ול־10 רב־מוקדיות. השלב הבא האמיתי הוא תכנון כתיבה והרשאת קריאה ציבורית; שינוי הרשאות ופתיחה לציבור לא בוצעו.</p>
    </div>
  </section>;
}

export default function BentovFindingsProduct2029Page() {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(FINDINGS[0].id);
  const [selectedSource, setSelectedSource] = useState(SOURCES[0].id);
  const [markedIds, setMarkedIds] = useState(() => new Set());
  const [fidelityLane, setFidelityLane] = useState("exact");
  const [reviewProgress, setReviewProgress] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, new Set(REVIEW_CHECKS.map(check => check.key))]),
  ));
  const [locatorDecisions, setLocatorDecisions] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, "accept"]),
  ));
  const [fidelityDecisions, setFidelityDecisions] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, PREVIEW_REVIEW_DECISION.verdict]),
  ));
  const [evidenceProgress, setEvidenceProgress] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, new Set(evidenceRequirementsFor(finding).map(requirement => requirement.key))]),
  ));
  const [publicationDecisions, setPublicationDecisions] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, "ready_for_publication"]),
  ));
  const [publicationChecks, setPublicationChecks] = useState(() => Object.fromEntries(
    FINDINGS.map(finding => [finding.id, new Set(PUBLICATION_CHECKS.map(check => check.key))]),
  ));

  useEffect(() => {
    applySeo({
      title: "מפת הממצאים · בנטוב · הדמיית מוצר",
      description: "הדמיית מוצר אינטראקטיבית לקריאה, חקירה וביקורת של ממצאי ספר.",
      path: "/2029/control",
      noindex: true,
    });

    if (["#bentov29-review-title", "#bentov29-publication-gate-title"].includes(window.location.hash)) {
      window.requestAnimationFrame(() => {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
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
    setFidelityDecisions(current => ({ ...current, [findingId]: "needs_evidence" }));
    setEvidenceProgress(current => ({ ...current, [findingId]: new Set() }));
  };

  const setLocatorDecision = (findingId, decision) => {
    setLocatorDecisions(current => ({ ...current, [findingId]: decision }));
  };

  const setFidelityDecision = (findingId, decision) => {
    if (!FIDELITY_VERDICT_META[decision]) return;
    const finding = FINDINGS.find(item => item.id === findingId);
    const recorded = evidenceProgress[findingId] || new Set();
    const evidenceComplete = finding && evidenceRequirementsFor(finding).every(requirement => recorded.has(requirement.key));
    if (decision !== "needs_evidence" && !evidenceComplete) return;
    setFidelityDecisions(current => ({ ...current, [findingId]: decision }));
  };

  const toggleEvidence = (findingId, requirementKey) => {
    const finding = FINDINGS.find(item => item.id === findingId);
    if (!finding || !evidenceRequirementsFor(finding).some(requirement => requirement.key === requirementKey)) return;
    const next = new Set(evidenceProgress[findingId] || []);
    if (next.has(requirementKey)) next.delete(requirementKey);
    else next.add(requirementKey);
    setEvidenceProgress(current => ({ ...current, [findingId]: next }));
    const remainsComplete = evidenceRequirementsFor(finding).every(requirement => next.has(requirement.key));
    if (!remainsComplete) setFidelityDecisions(decisions => ({ ...decisions, [findingId]: "needs_evidence" }));
  };

  const approveAllLocators = () => {
    setLocatorDecisions(Object.fromEntries(FINDINGS.map(finding => [finding.id, "accept"])));
    setFidelityDecisions(Object.fromEntries(FINDINGS.map(finding => [finding.id, PREVIEW_REVIEW_DECISION.verdict])));
    setEvidenceProgress(Object.fromEntries(
      FINDINGS.map(finding => [finding.id, new Set(evidenceRequirementsFor(finding).map(requirement => requirement.key))]),
    ));
    setReviewProgress(Object.fromEntries(
      FINDINGS.map(finding => [finding.id, new Set(REVIEW_CHECKS.map(check => check.key))]),
    ));
  };

  const resetAllLocators = () => {
    setLocatorDecisions({});
    setFidelityDecisions({});
    setEvidenceProgress({});
    setReviewProgress({});
  };

  const setPublicationDecision = (findingId, decision) => {
    if (!PUBLICATION_DECISION_META[decision]) return;
    const recorded = publicationChecks[findingId] || new Set();
    if (decision === "ready_for_publication" && !PUBLICATION_CHECKS.every(check => recorded.has(check.key))) return;
    setPublicationDecisions(current => ({ ...current, [findingId]: decision }));
  };

  const togglePublicationCheck = (findingId, checkKey) => {
    if (!PUBLICATION_CHECKS.some(check => check.key === checkKey)) return;
    const next = new Set(publicationChecks[findingId] || []);
    if (next.has(checkKey)) next.delete(checkKey);
    else next.add(checkKey);
    setPublicationChecks(current => ({ ...current, [findingId]: next }));
    if (!PUBLICATION_CHECKS.every(check => next.has(check.key))) {
      setPublicationDecisions(current => ({ ...current, [findingId]: "needs_public_copy" }));
    }
  };

  const modelCompletePublicationReview = () => {
    setPublicationChecks(Object.fromEntries(
      FINDINGS.map(finding => [finding.id, new Set(PUBLICATION_CHECKS.map(check => check.key))]),
    ));
    setPublicationDecisions(Object.fromEntries(
      FINDINGS.map(finding => [finding.id, "ready_for_publication"]),
    ));
  };

  const resetPublicationReview = () => {
    setPublicationChecks({});
    setPublicationDecisions(Object.fromEntries(FINDINGS.map(finding => [finding.id, "hold"])));
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

      <section className="bentov29-metrics" aria-label="תמונת מצב" data-engine-fidelity-contract="separate">
        <article><strong>33</strong><span>מועמדים שנקלטו</span><small>חומר עבודה, לא ציבורי</small></article>
        <article data-engine-status="verified"><strong>5</strong><span>עברו בדיקת מנוע</span><small>5 מתוך 5 שבהם מנוע רלוונטי</small></article>
        <article data-engine-status="not_applicable"><strong>28</strong><span>מנוע לא רלוונטי</span><small>לא כשל ולא חוסר אימות</small></article>
        <article><strong>33</strong><span>איתורים נבדקו</span><small>מול עד ה־PDF הפרטי</small></article>
        <article className="is-confirmed"><strong>3</strong><span>נשארו מדויקים</span><small>לא נדרש שינוי איתור</small></article>
        <article className="is-expanded"><strong>8</strong><span>טווחים הורחבו</span><small>נשמרו בקנוני</small></article>
        <article className="is-correction"><strong>22</strong><span>איתורים תוקנו</span><small>נשמרו בקנוני</small></article>
        <article className="is-confirmed"><strong>23</strong><span>נאמנות מדויקת</span><small>verified_exact</small></article>
        <article className="is-expanded"><strong>10</strong><span>נאמנות רב־מוקדית</span><small>כל מוקדי המקור שמורים</small></article>
        <article className="is-confirmed"><strong>33</strong><span>הכרעות שמורות</span><small>33/33 במסד הקנוני</small></article>
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
          <article className="is-complete" data-engine-status="summary"><span>01</span><strong>בדיקת מנוע</strong><b>5 / 5</b><small>כל הממצאים המתאימים למנוע עברו. ב־28 האחרים מנוע אינו חל.</small></article>
          <article className="is-complete"><span>02</span><strong>קליטת חומר</strong><b>33 / 33</b><small>לכל מועמד קיימים נוסח, ראיה ואיתור שמור במאגר המוגן.</small></article>
          <article className="is-complete"><span>03</span><strong>איתור PDF קנוני</strong><b>{LOCATOR_AUDIT_TOTALS.reviewed} / 33</b><small>3 נשארו מדויקים, 8 טווחים הורחבו ו־22 איתורים תוקנו.</small></article>
          <article className="is-complete"><span>04</span><strong>נאמנות למקור</strong><b>33 / 33</b><small>23 מדויקות ו־10 רב־מוקדיות נשמרו במסד הקנוני.</small></article>
          <article className="is-closed"><span>05</span><strong>ביקורת ופרסום</strong><b><span className="bentov29-numeric-value">0</span><span className="bentov29-value-label">ציבוריים</span></b><small>נשאר סגור עד החלטת פרסום, חוזה הרשאה ותשתית גישה נפרדת.</small></article>
        </div>
        <div className="bentov29-audit-summary" aria-label="סיכום ביקורת איתורי המקור">
          <span className="is-confirmed"><b>{LOCATOR_AUDIT_TOTALS.confirmed}</b><small>נשארו מדויקים</small></span>
          <span className="is-expanded"><b>{LOCATOR_AUDIT_TOTALS.expanded}</b><small>טווחים הורחבו</small></span>
          <span className="is-correction"><b>{LOCATOR_AUDIT_TOTALS.correction}</b><small>איתורים תוקנו</small></span>
        </div>
        <div className="bentov29-page-map" aria-label="מפת איתורים לפני הכתיבה מול העוגנים הקנוניים">
          {SOURCES.map(source => <span key={source.id} className={source.audit.correction ? "is-correction" : source.audit.expanded ? "is-expanded" : "is-confirmed"}>
            <b>לפני {source.page}</b>
            <small>עוגן קנוני PDF {source.audit.verifiedPages}</small>
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
        fidelityDecisions={fidelityDecisions}
        evidenceProgress={evidenceProgress}
        onLocatorDecision={setLocatorDecision}
        onFidelityDecision={setFidelityDecision}
        onToggleEvidence={toggleEvidence}
        onApproveAllLocators={approveAllLocators}
        onResetAllLocators={resetAllLocators}
        onToggleCheck={toggleReviewCheck}
        onReset={resetReview}
      />

      <PublicationDecisionGate
        findings={FINDINGS}
        selectedId={selectedId}
        onSelect={selectFinding}
        decisions={publicationDecisions}
        checks={publicationChecks}
        onDecision={setPublicationDecision}
        onToggleCheck={togglePublicationCheck}
        onModelComplete={modelCompletePublicationReview}
        onReset={resetPublicationReview}
      />

      <PublicationReadiness />

      <section className="bentov29-next" aria-labelledby="bentov29-next-title">
        <div>
          <div className="bentov29-section-label">השרשרת מכאן</div>
          <h2 id="bentov29-next-title">כך ההדמיה הופכת למוצר אמיתי</h2>
        </div>
        <ol>
          <li><span>01</span><strong>חבילת הכרעה פרטית</strong><small>הושלמה ל־33/33 ממצאים מול המקור והמקורות המשלימים</small></li>
          <li><span>02</span><strong>אישור אנושי</strong><small>התקבל ל־33/33 בתוך הפריוויו המבודד</small></li>
          <li><span>03</span><strong>כתיבה קנונית</strong><small>הושלמה ואומתה: 22 תיקונים, 8 הרחבות ו־33 הכרעות נאמנות</small></li>
          <li><span>04</span><strong>ביקורת פרסום</strong><small>מודלה בפריוויו ל־23 מדויקים ול־10 רב־מוקדיים; עדיין 0 ציבוריים</small></li>
        </ol>
      </section>
    </main>
  </Sod2029Shell>;
}
