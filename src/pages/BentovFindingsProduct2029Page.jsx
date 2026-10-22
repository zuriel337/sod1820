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
  label: `עמוד ${source.page}`,
  page: source.page,
  findings: source.findings,
})));

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
      <span>חלון מקור מן המלאי האמיתי</span>
      <strong>{finding.source} · עמ׳ {finding.page}</strong>
      <small>מספר העמוד משקף את מפת המקורות; הנוסח והשיוך לנקודת ההדגמה אינם ציטוט או הכרעה מאומתת.</small>
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
    <p>עמודי המקור והספירות משקפים את המלאי הקיים. תוכן המועמדים נשאר מחוץ לחבילת ההדגמה.</p>
    <div className="bentov29-source-list">
      {SOURCES.map((source, index) => <button
        type="button"
        key={source.id}
        className={selectedSource === source.id ? "is-selected" : ""}
        onClick={() => onSelect(source.id)}
      >
        <span className="bentov29-source-index">{String(index + 1).padStart(2, "0")}</span>
        <span><strong>{source.label}</strong><small>עמ׳ {source.page} · {source.findings} ממצאים</small></span>
      </button>)}
    </div>
  </section>;
}

export default function BentovFindingsProduct2029Page() {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(FINDINGS[0].id);
  const [selectedSource, setSelectedSource] = useState(SOURCES[0].id);
  const [markedIds, setMarkedIds] = useState(() => new Set());

  useEffect(() => {
    applySeo({
      title: "מפת הממצאים · בנטוב · הדמיית מוצר",
      description: "הדמיית מוצר אינטראקטיבית לקריאה, חקירה וביקורת של ממצאי ספר.",
      path: "/2029/control",
      noindex: true,
    });
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
        <article><strong>18</strong><span>הפניות מקור</span><small>source references</small></article>
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
          <article className="is-complete"><span>01</span><strong>קליטה ומראי מקום</strong><b>33 / 33</b><small>לכל מועמד קיימים נוסח, ראיה והפניית עמוד במאגר המוגן.</small></article>
          <article className="is-complete"><span>02</span><strong>מצב בדיקת מנוע</strong><b>33 / 33</b><small>5 התאמות ו־28 שאינם רלוונטיים למסלול חישובי.</small></article>
          <article className="is-current"><span>03</span><strong>בדיקת נאמנות חילוץ</strong><b>0 / 33</b><small>לא נרשם סטטוס; צריך להכריע תחולה ואז מלא או חלקי.</small></article>
          <article className="is-closed"><span>04</span><strong>ביקורת ופרסום</strong><b>0 ציבוריים</b><small>נשאר סגור עד ביקורת אנושית וחוזה פרסום נפרד.</small></article>
        </div>
        <div className="bentov29-page-map" aria-label="פיזור הממצאים לפי עמוד מקור">
          {SOURCES.map(source => <span key={source.id}><b>עמ׳ {source.page}</b><small>{source.findings} {source.findings === 1 ? "ממצא" : "ממצאים"}</small></span>)}
        </div>
      </section>

      <section className="bentov29-next" aria-labelledby="bentov29-next-title">
        <div>
          <div className="bentov29-section-label">השרשרת מכאן</div>
          <h2 id="bentov29-next-title">כך ההדמיה הופכת למוצר אמיתי</h2>
        </div>
        <ol>
          <li><span>01</span><strong>בדיקת תחולת נאמנות</strong><small>להחליט לכל מועמד אם שער החילוץ המורכב חל עליו</small></li>
          <li><span>02</span><strong>השלמת נאמנות</strong><small>לרשום complete או partial רק לפי ראיות המקור</small></li>
          <li><span>03</span><strong>ביקורת אנושית</strong><small>הכרעה נפרדת לכל ממצא, בלי פרסום אוטומטי</small></li>
          <li><span>04</span><strong>שער פרסום קנוני</strong><small>רק לאחר חוזה, הרשאה ו־RLS מאושרים</small></li>
        </ol>
      </section>
    </main>
  </Sod2029Shell>;
}
