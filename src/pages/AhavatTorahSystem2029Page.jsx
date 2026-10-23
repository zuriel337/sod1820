import React, { useEffect, useMemo, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  AHAVAT_TORAH_FINDINGS,
  AHAVAT_TORAH_PIPELINE,
  AHAVAT_TORAH_SECTIONS,
  AHAVAT_TORAH_SOURCE,
  AHAVAT_TORAH_TRUTH_STATES,
  sectionForPage,
} from "../data/ahavatTorahSystem2029.js";
import { applySeo } from "../lib/seo.js";
import "./ahavatTorahSystem2029.css";

function requestedPage() {
  if (typeof window === "undefined") return 6;
  const value = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(value) && value >= 1 && value <= AHAVAT_TORAH_SOURCE.pdfPages ? value : 6;
}

function replaceSelectionInUrl(page, findingId) {
  const next = new URL(window.location.href);
  next.searchParams.set("page", String(page));
  if (findingId) next.searchParams.set("finding", findingId);
  else next.searchParams.delete("finding");
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

function StatusPill({ status }) {
  const state = AHAVAT_TORAH_TRUTH_STATES[status];
  return <span className={`ahavat29-status-pill is-${state.tone}`} title={state.description}>{state.label}</span>;
}

function SourcePanel({ page, contextLabel }) {
  const pdfUrl = `${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`;
  return <aside id="ahavat29-source" className="ahavat29-source" aria-labelledby="ahavat29-source-title">
    <header>
      <div><span>המקור נשאר פתוח</span><h2 id="ahavat29-source-title">עמוד PDF {page}</h2></div>
      <b>{contextLabel}</b>
    </header>
    <div className="ahavat29-pdf-frame">
      <iframe key={page} src={pdfUrl} title={`${AHAVAT_TORAH_SOURCE.title}, עמוד PDF ${page}`} loading="eager" />
    </div>
    <dl>
      <div><dt>זהות מקור</dt><dd>{AHAVAT_TORAH_SOURCE.identity}</dd></div>
      <div><dt>מחבר</dt><dd>{AHAVAT_TORAH_SOURCE.author}</dd></div>
      <div><dt>דפוס</dt><dd>{AHAVAT_TORAH_SOURCE.imprint}</dd></div>
      <div><dt>מעמד</dt><dd>עד מקור · לא פרסום ממצא</dd></div>
    </dl>
    <nav aria-label="קישורי מקור">
      <a href={pdfUrl} target="_blank" rel="noreferrer">פתח PDF בעמוד {page} ↗</a>
      <a href={AHAVAT_TORAH_SOURCE.catalogUrl} target="_blank" rel="noreferrer">רשומת HebrewBooks ↗</a>
    </nav>
    <p>מספר העמוד הוא מראה־מקום ל־PDF. הסברים ומיפויים במסך מסומנים בנפרד ואינם חלק מנוסח הספר.</p>
  </aside>;
}

function OrbitMap({ selectedId, onSelect }) {
  return <section className="ahavat29-map" aria-labelledby="ahavat29-map-title">
    <header>
      <div><span>מפת המקור</span><h2 id="ahavat29-map-title">שמונה אזורים · ספר אחד</h2></div>
      <p>בחר אזור כדי לפתוח את עמוד ההתחלה שלו ולקרוא הסבר עכשווי לצד המקור.</p>
    </header>
    <div className="ahavat29-orbit" role="group" aria-label="אזורי ספר אהבת תורה">
      <div className="ahavat29-orbit-core"><small>מקור אחד</small><strong>אהבת<br />תורה</strong><span>99 עמודים</span></div>
      <i className="ahavat29-orbit-ring is-one" aria-hidden="true" />
      <i className="ahavat29-orbit-ring is-two" aria-hidden="true" />
      {AHAVAT_TORAH_SECTIONS.map((section, index) => <button
        type="button"
        key={section.id}
        className={selectedId === section.id ? "is-active" : ""}
        style={{ "--i": index, "--section-color": section.color }}
        aria-pressed={selectedId === section.id}
        onClick={() => onSelect(section)}
      >
        <span>{section.index}</span><strong>{section.shortTitle}</strong><small>עמ׳ {section.range[0]}–{section.range[1]}</small>
      </button>)}
    </div>
  </section>;
}

function SectionReader({ section, onPage }) {
  return <article className="ahavat29-reader" aria-labelledby="ahavat29-reader-title">
    <header>
      <span style={{ "--section-color": section.color }}>{section.index}</span>
      <div><small>עמודי PDF {section.range[0]}–{section.range[1]}</small><h2 id="ahavat29-reader-title">{section.title}</h2></div>
      <StatusPill status={section.status} />
    </header>
    <p className="ahavat29-reader-lead">{section.description}</p>
    <section>
      <span>הסבר קריאה עכשווי</span>
      <p>{section.guide}</p>
      <small>הסבר זה נוצר כשכבת ניווט מסייעת. הוא אינו ציטוט מן הספר ואינו ממצא קנוני.</small>
    </section>
    <footer>
      <button type="button" onClick={() => onPage(section.page)}>פתח את עמוד ההתחלה במקור</button>
      <span>{section.range[1] - section.range[0] + 1} עמודים באזור</span>
    </footer>
  </article>;
}

function FindingCard({ finding, active, onSelect }) {
  return <button type="button" className={active ? "is-active" : ""} onClick={() => onSelect(finding)} aria-pressed={active}>
    <header><span>{finding.dataset}</span><StatusPill status={finding.status} /></header>
    <strong className="ahavat29-finding-value">{finding.value}</strong>
    <h3>{finding.title}</h3>
    <p>{finding.sourceNote}</p>
    <footer><span>עמ׳ {finding.pages.join(" / ")}</span><b>הצג מקור ←</b></footer>
  </button>;
}

export default function AhavatTorahSystem2029Page() {
  const [page, setPage] = useState(requestedPage);
  const initialFinding = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("finding") || "";
  const [findingId, setFindingId] = useState(initialFinding);
  const selectedSection = useMemo(() => sectionForPage(page), [page]);
  const selectedFinding = AHAVAT_TORAH_FINDINGS.find(finding => finding.id === findingId) || null;

  useEffect(() => {
    applySeo({
      title: `אהבת תורה · מערכת מקור ומחקר · עמוד ${page}`,
      description: "תצוגת Preview מוגנת לספר אהבת תורה: מקור PDF, מפת הספר וממצאים במעמדים נפרדים.",
      path: "/2029/control",
      noindex: true,
    });
  }, [page]);

  const selectSection = section => {
    setPage(section.page);
    setFindingId("");
    replaceSelectionInUrl(section.page, "");
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("ahavat29-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const selectFinding = finding => {
    setPage(finding.page);
    setFindingId(finding.id);
    replaceSelectionInUrl(finding.page, finding.id);
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("ahavat29-finding-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const openPage = nextPage => {
    setPage(nextPage);
    replaceSelectionInUrl(nextPage, findingId);
    document.getElementById("ahavat29-source")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <Sod2029Shell
    title="אהבת תורה"
    eyebrow="ספרים ומקורות · מערכת מחקר"
    description="המקור, מבנה הספר והממצאים נשארים מחוברים — בלי לערבב את מעמד האמת שלהם."
    status="Preview מוגן · קריאה בלבד"
    surface="books"
    symbol={<NavigationIcon2029 name="books" />}
    introVariant="none"
    wide
  >
    <main className="ahavat29" data-preview-only="true" data-publication-effect="none" data-source-identity={AHAVAT_TORAH_SOURCE.identity}>
      <section className="ahavat29-intro" aria-labelledby="ahavat29-title">
        <div>
          <span>ר׳ פנחס זלמן הורוויץ · תרס״ה</span>
          <h1 id="ahavat29-title">ספר עתיק הופך<br /><em>למרחב מחקר חי</em></h1>
          <p>לא רק PDF ולא רשימת מספרים: מקור קבוע, מפה של הספר, הסבר נפרד וממצאים שאפשר לבחון בעמוד שבו נולדו.</p>
        </div>
        <aside><strong>שלב ראשון</strong><p>המערכת מציגה חלקים אמיתיים מן הספר. אין כאן פרסום ציבורי, שינוי אמת או כתיבה למסד.</p></aside>
      </section>

      <section className="ahavat29-metrics" aria-label="מצב מערכת אהבת תורה">
        <article><strong>99</strong><span>עמודי מקור</span><small>PDF אחד וזהות מקור אחת</small></article>
        <article><strong>8</strong><span>אזורי ספר</span><small>מפת קריאה רציפה</small></article>
        <article><strong>13</strong><span>מאגרי בדיקה</span><small>סגורים, חלקיים ופתוחים</small></article>
        <article className="is-locked"><strong>0</strong><span>ממצאים ציבוריים</span><small>Preview בלבד</small></article>
      </section>

      <div className="ahavat29-layout">
        <div className="ahavat29-story">
          <OrbitMap selectedId={selectedSection.id} onSelect={selectSection} />
          <div id="ahavat29-reader"><SectionReader section={selectedSection} onPage={openPage} /></div>

          <section className="ahavat29-findings" aria-labelledby="ahavat29-findings-title">
            <header><div><span>חלונות ראשונים לחומר</span><h2 id="ahavat29-findings-title">ארבעה ממצאים · ארבעה מצבי בדיקה</h2></div><p>הכרטיס פותח את עמוד המקור. הצבע מתאר את מצב העדות, לא את מידת העניין.</p></header>
            <div>{AHAVAT_TORAH_FINDINGS.map(finding => <FindingCard key={finding.id} finding={finding} active={finding.id === findingId} onSelect={selectFinding} />)}</div>
          </section>

          {selectedFinding ? <article id="ahavat29-finding-detail" className="ahavat29-finding-detail" aria-labelledby="ahavat29-finding-detail-title">
            <header><div><span>{selectedFinding.dataset} · עמוד {selectedFinding.page}</span><h2 id="ahavat29-finding-detail-title">{selectedFinding.title}</h2></div><StatusPill status={selectedFinding.status} /></header>
            <div className="ahavat29-equation"><strong>{selectedFinding.value}</strong><span>{selectedFinding.formula}</span></div>
            <section><span>מה אפשר לומר כרגע?</span><p>{selectedFinding.explanation}</p></section>
            <footer><span>מעמד חישוב: {selectedFinding.calculation}</span><button type="button" onClick={() => openPage(selectedFinding.page)}>חזרה לעמוד המקור</button></footer>
          </article> : null}

          <section className="ahavat29-pipeline" aria-labelledby="ahavat29-pipeline-title">
            <header><span>המערכת שאנחנו בונים</span><h2 id="ahavat29-pipeline-title">מהמקור ועד מוצר שאפשר לסמוך עליו</h2></header>
            <ol>{AHAVAT_TORAH_PIPELINE.map(step => <li key={step.index} className={`is-${step.state}`}><span>{step.index}</span><strong>{step.title}</strong><b>{step.value}</b><small>{step.label}</small></li>)}</ol>
            <p>הצינור אינו מקצר דרך: מיפוי מלא אינו שווה לתעתיק מלא; תעתיק אינו שווה לאימות; ואימות אינו שווה לפרסום.</p>
          </section>

          <footer className="ahavat29-legend" aria-label="מקרא מצבי אמת">
            {Object.entries(AHAVAT_TORAH_TRUTH_STATES).map(([key, state]) => <span key={key} className={`is-${state.tone}`} title={state.description}>{state.label}</span>)}
          </footer>
        </div>

        <SourcePanel page={page} contextLabel={selectedFinding?.dataset || selectedSection.shortTitle} />
      </div>
    </main>
  </Sod2029Shell>;
}

