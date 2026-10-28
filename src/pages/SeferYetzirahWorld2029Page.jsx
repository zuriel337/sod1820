import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import BookFullscreenButton2029 from "../components/books2029/BookFullscreenButton2029.jsx";
import BookReadingLayout2029 from "../components/books2029/BookReadingLayout2029.jsx";
import StructureCatalog, { isSupportedStructure } from "../components/books2029/SeferYetzirahStructureCatalog2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  SEFER_YETZIRAH_COMMENTATORS,
  SEFER_YETZIRAH_DEPTHS,
  SEFER_YETZIRAH_LETTER_GROUPS,
  SEFER_YETZIRAH_LETTERS,
  SEFER_YETZIRAH_PAGE_ATLAS,
  SEFER_YETZIRAH_READING_GATES,
  SEFER_YETZIRAH_SCENE_MODES,
  SEFER_YETZIRAH_SOURCE,
  SEFER_YETZIRAH_VOLUME_LAYERS,
  getSeferYetzirahGateNumber,
} from "../data/seferYetzirahWorld2029.js";
import { applySeo } from "../lib/seo.js";
import "./seferYetzirahWorld2029.css";

const SeferYetzirahScene2029 = lazy(() => import("../components/books2029/SeferYetzirahScene2029.jsx"));

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="yetzirah29-stage-loading" role="status">המודל התלת־ממדי אינו זמין במכשיר הזה. מפת המבנה והפירוש המלאים נשארים פתוחים מתחתיו.</div>;
    return this.props.children;
  }
}

function requestedPage() {
  if (typeof window === "undefined") return 155;
  const page = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(page) && page >= 1 && page <= SEFER_YETZIRAH_SOURCE.pdfPages ? page : 155;
}

function requestedGate() {
  if (typeof window === "undefined") return SEFER_YETZIRAH_READING_GATES[0].id;
  const value = new URLSearchParams(window.location.search).get("gate");
  return SEFER_YETZIRAH_READING_GATES.some(gate => gate.id === value) ? value : SEFER_YETZIRAH_READING_GATES[0].id;
}

function replaceReadingUrl(page, gate) {
  const next = new URL(window.location.href);
  next.searchParams.set("surface", "sefer-yetzirah-world");
  next.searchParams.set("page", String(page));
  next.searchParams.set("gate", gate);
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

function defaultNodeForMode(mode, commentatorId = "chachmoni") {
  if (mode === "sefirot") return "beginning";
  if (mode === "osn") return "world";
  if (mode === "commentaries") return commentatorId;
  return "";
}

function SourcePanel({ page, onPage, onReturn, hasStructure }) {
  const fullscreenRef = useRef(null);
  const [draft, setDraft] = useState(String(page));
  const pdfUrl = `${SEFER_YETZIRAH_SOURCE.pdfUrl}#page=${page}&view=FitH`;

  useEffect(() => setDraft(String(page)), [page]);

  const submit = event => {
    event.preventDefault();
    const number = Number(draft);
    onPage(Math.min(SEFER_YETZIRAH_SOURCE.pdfPages, Math.max(1, Number.isFinite(number) ? Math.trunc(number) || 1 : 1)));
  };

  return <aside ref={fullscreenRef} tabIndex={-1} id="yetzirah29-source" className="yetzirah29-source book-fullscreen29-target" aria-labelledby="yetzirah29-source-title">
    <header>
      <div><span>הספר פתוח תמיד</span><h2 id="yetzirah29-source-title">עמוד PDF {page}</h2></div>
      {hasStructure && <button className="yetzirah29-return" type="button" onClick={onReturn}>חזרה למבנה הנבחר</button>}<BookFullscreenButton2029 targetRef={fullscreenRef} fallbackHref={pdfUrl} controls="yetzirah29-source" />
    </header>
    <div className="yetzirah29-pdf" data-book-pdf-frame><iframe key={page} src={pdfUrl} title={`${SEFER_YETZIRAH_SOURCE.title}, עמוד ${page}`} loading="eager" /></div>
    <form className="yetzirah29-page-nav" onSubmit={submit} aria-label="מעבר בין 220 עמודי הספר">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>הקודם</button>
      <label><span>עמוד</span><input value={draft} min="1" max="220" inputMode="numeric" onChange={event => setDraft(event.target.value)} /></label>
      <span>מתוך 220</span>
      <button type="submit">עבור</button>
      <button type="button" disabled={page >= 220} onClick={() => onPage(page + 1)}>הבא</button>
    </form>
    <dl data-book-reader-secondary>
      <div><dt>ספר</dt><dd>{SEFER_YETZIRAH_SOURCE.shortTitle}</dd></div>
      <div><dt>כרך</dt><dd>תשעה פירושים</dd></div>
      <div><dt>מהדורה</dt><dd>ווארשא</dd></div>
      <div><dt>זהות מקור</dt><dd>{SEFER_YETZIRAH_SOURCE.identity}</dd></div>
    </dl>
    <a href={pdfUrl} target="_blank" rel="noreferrer" data-book-reader-secondary>פתח את עמוד {page} בחלון נפרד ↗</a>
  </aside>;
}

function SceneLegend({ mode, activeNode, onSelect }) {
  if (mode === "sefirot") return <div className="yetzirah29-scene-legend is-depths">
    {SEFER_YETZIRAH_DEPTHS.map(node => <button type="button" key={node.id} className={activeNode === node.id ? "is-active" : ""} style={{ "--node-color": node.color }} onClick={() => onSelect(node.id)}><span />{node.label}<small>{node.axis}</small></button>)}
  </div>;
  if (mode === "letters" || mode === "gates") return <>
    <div className="yetzirah29-scene-legend is-letters">
      {SEFER_YETZIRAH_LETTER_GROUPS.map(group => <article key={group.id} style={{ "--node-color": group.color }}><span>{group.count}</span><div><strong>{group.label}</strong><b>{group.letters}</b><small>{group.role}</small></div></article>)}
    </div>
    <div className="yetzirah29-letter-picker" aria-label="בחרו אות ופתחו מקור">{SEFER_YETZIRAH_LETTERS.map(letter => <button type="button" key={letter.letter} aria-pressed={activeNode === letter.letter} onClick={() => onSelect(letter.letter)}>{letter.letter}</button>)}</div>
  </>;
  if (mode === "commentaries") return <div className="yetzirah29-scene-legend is-commentaries">
    {SEFER_YETZIRAH_COMMENTATORS.map(commentator => <button type="button" key={commentator.id} className={activeNode === commentator.id ? "is-active" : ""} style={{ "--node-color": commentator.color }} onClick={() => onSelect(commentator.id)}><strong>{commentator.name}</strong><span>{commentator.author}</span><small>PDF {commentator.pages}</small></button>)}
  </div>;
  return <div className="yetzirah29-scene-legend is-osn">
    {[{ id: "world", title: "עולם", text: "מרחב וחומר" }, { id: "year", title: "שנה", text: "זמן ומחזור" }, { id: "soul", title: "נפש", text: "אדם וחישה" }].map(item => <button type="button" key={item.id} className={activeNode === item.id ? "is-active" : ""} onClick={() => onSelect(item.id)}><strong>{item.title}</strong><small>{item.text}</small></button>)}
  </div>;
}

function SpatialStage({ mode, onMode, activeNode, onNode }) {
  const meta = SEFER_YETZIRAH_SCENE_MODES.find(item => item.id === mode);
  const [opened, setOpened] = useState(false);
  const startRef = useRef(null);
  useEffect(() => { const close = () => setOpened(false); document.addEventListener("yetzirah-model-explicit-activation", close); return () => document.removeEventListener("yetzirah-model-explicit-activation", close); }, []);
  const toggle = () => { if (opened) { setOpened(false); startRef.current?.focus(); } else { document.dispatchEvent(new CustomEvent("yetzirah-model-explicit-activation", { detail: "existing-sefer-stage" })); setOpened(true); } };
  return <section className="yetzirah29-spatial" aria-labelledby="yetzirah29-spatial-title">
    <header>
      <div><span>הספר נעשה מרחב</span><h2 id="yetzirah29-spatial-title">{meta.label}</h2><p>{meta.description}</p></div>
      <nav aria-label="בחירת מבנה תלת־ממדי">{SEFER_YETZIRAH_SCENE_MODES.map(item => <button type="button" key={item.id} className={mode === item.id ? "is-active" : ""} aria-pressed={mode === item.id} onClick={() => onMode(item.id)}><b>{item.short}</b><span>{item.label}</span></button>)}</nav>
    </header>
    <button ref={startRef} type="button" aria-expanded={opened} onClick={toggle}>{opened ? "סגור את המבנה התלת־ממדי" : "פתח את המבנה התלת־ממדי"}</button>
    <p>ייצוג של מבנה הספר: המיקום, הצבעים והתאורה הם בחירות המחשה. {mode === "sefirot" ? "כל קו מחבר זוג עומקים המופיע ברשימה; רק רום ותחת, מזרח ומערב, צפון ודרום הם כיווני מרחב." : "הקווים והצורות הם בחירות המחשה."} בחירת רכיב פותחת את המקור המתאים.</p>
    {opened ? <div className="yetzirah29-stage">
      <SpatialErrorBoundary>
        <Suspense fallback={<div className="yetzirah29-stage-loading" role="status">בונה את המרחב…</div>}>
          <SeferYetzirahScene2029 mode={mode} activeId={activeNode} onSelect={onNode} />
        </Suspense>
      </SpatialErrorBoundary>
      <div className="yetzirah29-stage-hint">גררו לסיבוב · גלגלו להתקרבות · לחצו על נקודה</div>
    </div> : null}
    <SceneLegend mode={mode} activeNode={activeNode} onSelect={onNode} />
  </section>;
}

function GateReader({ gate, onSource }) {
  return <article id="yetzirah29-reading" className="yetzirah29-reading" aria-labelledby="yetzirah29-reading-title">
    <header><span>{gate.index}</span><div><small>שער קריאה · PDF {gate.page}</small><h2 id="yetzirah29-reading-title">{gate.title}</h2></div><b>{gate.focus}</b></header>
    <blockquote><span>דברי הספר</span><p>{gate.source}</p><a href={`${SEFER_YETZIRAH_SOURCE.pdfUrl}#page=${gate.page}&view=FitH`} target="_blank" rel="noreferrer">פתח את העמוד המקורי ↗</a></blockquote>
    <section><span>פירוש עברי</span><p>{gate.explanation}</p></section>
    <footer><button type="button" onClick={() => onSource(gate.page)}>הצג את עמוד {gate.page} בקורא</button><small>{gate.sourceRef}</small></footer>
  </article>;
}

function ReadingMap({ activeId, onSelect }) {
  return <section className="yetzirah29-map" aria-labelledby="yetzirah29-map-title">
    <header><div><span>פירוש רציף למבנה הספר</span><h2 id="yetzirah29-map-title">שנים־עשר שערי קריאה</h2></div><p>כל שער מחבר נוסח מקור, פירוש בעברית ומבנה מרחבי. הבחירה פותחת גם את עמוד ה־PDF המתאים.</p></header>
    <div>{SEFER_YETZIRAH_READING_GATES.map(gate => <button type="button" key={gate.id} className={activeId === gate.id ? "is-active" : ""} onClick={() => onSelect(gate)}><span>{gate.index}</span><strong>{gate.title}</strong><b>{gate.focus}</b><small>PDF {gate.page}</small></button>)}</div>
  </section>;
}

function CommentaryAtlas({ page, activeCommentatorId, onCommentator, onPage }) {
  const activePage = SEFER_YETZIRAH_PAGE_ATLAS[page - 1];
  const activeCommentator = SEFER_YETZIRAH_COMMENTATORS.find(item => item.id === activeCommentatorId) || SEFER_YETZIRAH_COMMENTATORS[0];
  return <section className="yetzirah29-atlas" aria-labelledby="yetzirah29-atlas-title">
    <header><div><span>כל הכרך · כל הקולות</span><h2 id="yetzirah29-atlas-title">אטלס 220 העמודים</h2></div><p>בחרו מפרש כדי לראות את מקומו בכרך. כל ריבוע פותח מיד את עמוד המקור ומציג את תפקידו במהלך הספר.</p></header>
    <div className="yetzirah29-commentator-tabs" aria-label="תשעת המפרשים">
      {SEFER_YETZIRAH_COMMENTATORS.map(commentator => <button type="button" key={commentator.id} className={activeCommentator.id === commentator.id ? "is-active" : ""} aria-pressed={activeCommentator.id === commentator.id} style={{ "--node-color": commentator.color }} onClick={() => onCommentator(commentator)}><strong>{commentator.name}</strong><small>{commentator.pages}</small></button>)}
    </div>
    <article className="yetzirah29-commentator-card" style={{ "--node-color": activeCommentator.color }}>
      <span>קול {activeCommentator.name}</span><h3>{activeCommentator.author}</h3><p>{activeCommentator.guide}</p><dl><div><dt>צורה בכרך</dt><dd>{activeCommentator.form}</dd></div><div><dt>טווח כניסה</dt><dd>PDF {activeCommentator.pages}</dd></div></dl>
    </article>
    <div className="yetzirah29-page-grid" aria-label="מפת 220 עמודי המקור">
      {SEFER_YETZIRAH_PAGE_ATLAS.map(item => {
        const inRange = item.page >= activeCommentator.start && item.page <= activeCommentator.end;
        const className = [item.page === page ? "is-active" : "", item.isAnchor ? "is-anchor" : "", inRange ? "is-in-range" : ""].filter(Boolean).join(" ");
        return <button type="button" key={item.page} className={className} style={{ "--page-color": item.color }} aria-label={`עמוד ${item.page}: ${item.title}`} title={`${item.page} · ${item.title}`} onClick={() => onPage(item.page)}>{item.page}</button>;
      })}
    </div>
    <article className="yetzirah29-page-card" style={{ "--page-color": activePage.color }}><span>PDF {activePage.page}</span><h3>{activePage.title}</h3><p>{activePage.guide}</p><button type="button" onClick={() => onPage(activePage.page)}>פתח במקור</button></article>
  </section>;
}

function LetterLaboratory({ onPage, onSpatial }) {
  const [first, setFirst] = useState("א");
  const [second, setSecond] = useState("ב");
  const firstMeta = SEFER_YETZIRAH_LETTERS.find(item => item.letter === first);
  const secondMeta = SEFER_YETZIRAH_LETTERS.find(item => item.letter === second);
  const gateNumber = getSeferYetzirahGateNumber(first, second);
  const chooseLetter = letter => {
    if (!first || second) { setFirst(letter); setSecond(""); }
    else if (letter !== first) setSecond(letter);
    onSpatial(letter);
  };
  return <section className="yetzirah29-letter-lab" aria-labelledby="yetzirah29-letter-lab-title">
    <header><div><span>אות · מספר · שער</span><h2 id="yetzirah29-letter-lab-title">מעבדת כ״ב האותיות</h2></div><p>הערך המספרי הוא גימטריה רגילה; מספר השער הוא מקום הזוג בתוך 231 הזוגות האפשריים. כך אפשר לראות את החשבון בלי להפוך אותו להוכחה של הטקסט.</p></header>
    <div className="yetzirah29-letter-picker" aria-label="בחירת שתי אותיות">
      {SEFER_YETZIRAH_LETTERS.map(item => <button type="button" key={item.letter} className={item.letter === first || item.letter === second ? "is-active" : ""} style={{ "--letter-color": item.color }} aria-pressed={item.letter === first || item.letter === second} onClick={() => chooseLetter(item.letter)}><strong>{item.letter}</strong><small>{item.value}</small></button>)}
    </div>
    <div className="yetzirah29-letter-result">
      <article><span>הזוג שנבחר</span><strong>{first}{second || "·"}</strong><small>{firstMeta?.group}{secondMeta ? ` · ${secondMeta.group}` : " · בחרו אות שנייה"}</small></article>
      <article><span>גימטריה רגילה</span><strong>{firstMeta?.value || 0}{secondMeta ? ` + ${secondMeta.value} = ${firstMeta.value + secondMeta.value}` : ""}</strong><small>ערכי האותיות המקובלים</small></article>
      <article><span>שער בתוך הרשת</span><strong>{gateNumber ? `${gateNumber} / 231` : "—"}</strong><small>{gateNumber ? "זוג בלתי־חוזר אחד ברשת" : "נדרשות שתי אותיות שונות"}</small></article>
    </div>
    <footer><p>{firstMeta?.role}{secondMeta && secondMeta.groupId !== firstMeta?.groupId ? ` · החיבור פוגש גם את שכבת ${secondMeta.group}.` : ""}</p><button type="button" onClick={() => onPage(203)}>פתח את לוח רל״א השערים במקור</button></footer>
  </section>;
}

function VolumeMap({ onPage }) {
  return <section className="yetzirah29-volume" aria-labelledby="yetzirah29-volume-title">
    <header><span>לא ספר שטוח — כרך מרובה קולות</span><h2 id="yetzirah29-volume-title">חמש שכבות בתוך 220 עמודים</h2></header>
    <ol>{SEFER_YETZIRAH_VOLUME_LAYERS.map((layer, index) => <li key={layer.pages}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.title}</strong><p>{layer.detail}</p></div><button type="button" onClick={() => onPage(Number(layer.pages.match(/\d+/)?.[0] || 1))}>PDF {layer.pages}</button></li>)}</ol>
  </section>;
}

export default function SeferYetzirahWorld2029Page() {
  const [page, setPage] = useState(requestedPage);
  const scrollTimer = useRef(null);
  const scrollEpoch = useRef(0);
  const scrollTarget = useRef("");
  useEffect(() => {
    const cancel = () => { scrollEpoch.current += 1; clearTimeout(scrollTimer.current); };
    const onFocus = event => { if (event.target?.id !== scrollTarget.current) cancel(); };
    document.addEventListener("pointerdown", cancel, true);
    document.addEventListener("keydown", cancel, true);
    document.addEventListener("wheel", cancel, { capture: true, passive: true });
    document.addEventListener("focusin", onFocus, true);
    return () => { cancel(); document.removeEventListener("pointerdown", cancel, true); document.removeEventListener("keydown", cancel, true); document.removeEventListener("wheel", cancel, true); document.removeEventListener("focusin", onFocus, true); };
  }, []);
  const moveTo = id => {
    clearTimeout(scrollTimer.current); scrollTarget.current = id; const epoch = ++scrollEpoch.current; let attempts = 0;
    const settle = () => { if (epoch !== scrollEpoch.current) return; const target = document.getElementById(id); if (!target) return; const rect = target.getBoundingClientRect(); if (attempts === 0 || rect.top < 0 || rect.top > window.innerHeight / 3) target.scrollIntoView({ behavior: "auto", block: "start" }); if (attempts++ === 0) target.focus({ preventScroll: true }); if (attempts < 8) scrollTimer.current = setTimeout(settle, 100); };
    requestAnimationFrame(settle);
  };
  const [structureId, setStructureId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("structure") || "");
  const [componentId, setComponentId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("component") || "");
  const [relationId, setRelationId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("relation") || "");
  const [readingLayout, setReadingLayout] = useState("balanced");
  const [activeGateId, setActiveGateId] = useState(requestedGate);
  const activeGate = SEFER_YETZIRAH_READING_GATES.find(gate => gate.id === activeGateId) || SEFER_YETZIRAH_READING_GATES[0];
  const [mode, setMode] = useState(activeGate.mode);
  const [activeCommentatorId, setActiveCommentatorId] = useState("chachmoni");
  const [activeNode, setActiveNode] = useState(() => defaultNodeForMode(activeGate.mode));

  useEffect(() => {
    applySeo({ title: `ספר יצירה · ${activeGate.title}`, description: "ספר יצירה כמרחב תלת־ממדי: עשר ספירות, כ״ב אותיות, רל״א שערים, מקור מלא ופירוש עברי.", path: "/2029/control", noindex: true });
  }, [activeGate.title]);

  const updateStructureUrl = (structure, component) => {
    const next = new URL(window.location.href);
    if (structure) next.searchParams.set("structure", structure); else next.searchParams.delete("structure");
    if (component) next.searchParams.set("component", component); else next.searchParams.delete("component");
    window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
  };
  const chooseRelation = id => { setRelationId(id || ""); const next = new URL(window.location.href); if (id) next.searchParams.set("relation", id); else next.searchParams.delete("relation"); window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`); };
  const chooseStructure = (id, first) => { const component = first?.stable_id || ""; setStructureId(id); setComponentId(component); chooseRelation(null); updateStructureUrl(id, component); if (first?.source?.pdf_page) openPage(first.source.pdf_page); moveTo("yetzirah29-structure-learning"); };
  const chooseComponent = id => { setComponentId(id); updateStructureUrl(structureId, id); };
  const openStructureSource = payload => {
    openPage(payload.source.pdf_page);
    moveTo("yetzirah29-source");
  };
  const openPage = nextPage => {
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > SEFER_YETZIRAH_SOURCE.pdfPages) return;
    setPage(nextPage);
    replaceReadingUrl(nextPage, activeGateId);
  };

  const chooseGate = gate => {
    setActiveGateId(gate.id);
    setPage(gate.page);
    setMode(gate.mode);
    setActiveNode(defaultNodeForMode(gate.mode, activeCommentatorId));
    replaceReadingUrl(gate.page, gate.id);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("yetzirah29-reading")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  const chooseCommentator = commentator => {
    setActiveCommentatorId(commentator.id);
    setMode("commentaries");
    setActiveNode(commentator.id);
    openPage(commentator.start);
  };

  const chooseSceneNode = id => {
    setActiveNode(id);
    if (mode === "commentaries") {
      const commentator = SEFER_YETZIRAH_COMMENTATORS.find(item => item.id === id);
      if (commentator) { setActiveCommentatorId(id); openPage(commentator.start); }
    } else if (mode === "sefirot") openPage(53);
    else if (mode === "letters") openPage(65);
    else if (mode === "gates") openPage(203);
    else if (mode === "osn") openPage(190);
  };

  return <Sod2029Shell wide surface="books" symbol="✦" eyebrow="ספר יצירה · עולם קריאה" title="ספר יצירה" description="המקור, הפירושים והמבנים המרחביים בתוך קורא אחד.">
    <main className="yetzirah29" dir="rtl">
      <section className="yetzirah29-hero" aria-labelledby="yetzirah29-title">
        <div><span>{SEFER_YETZIRAH_SOURCE.attribution}</span><h1 id="yetzirah29-title">האותיות נעשות<br /><em>מרחב חי</em></h1><p>קוראים את דברי הספר, פותחים את הפירוש ומסובבים ביד את מבנה הספירות, האותיות והשערים.</p><nav className="books29-entry-actions" aria-label="דרכי קריאה בספר יצירה"><a href="#yetzirah29-source">קרא את הספר</a><a href="#yetzirah29-spatial-title">גלה את המבנים</a></nav></div>
        <aside><strong>עולם הספר</strong><p>הספר אינו צריך להמתין למחשבון. המבנים מוצגים מתוך הכרך עצמו, וכל פירוש חוזר לעמוד המקור.</p></aside>
      </section>

      <section className="yetzirah29-metrics" aria-label="מספרי היסוד של ספר יצירה">
        {[['10','ספירות בלימה','עשרה עומקים'],['22','אותיות יסוד','3 · 7 · 12'],['231','שערים','זוגות אותיות'],['32','נתיבות','10 + 22'],['220','עמודי מקור','כרך מלא']].map(item => <article key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span><small>{item[2]}</small></article>)}
      </section>

      <SpatialStage mode={mode} onMode={nextMode => { setMode(nextMode); setActiveNode(defaultNodeForMode(nextMode, activeCommentatorId)); }} activeNode={activeNode} onNode={chooseSceneNode} />
      <StructureCatalog onPage={openPage} structureId={structureId} componentId={componentId} relationId={relationId} onStructure={chooseStructure} onComponent={chooseComponent} onRelation={chooseRelation} onOpenSource={openStructureSource} />

      <BookReadingLayout2029 mode={readingLayout} onMode={setReadingLayout} />
      <div className="yetzirah29-layout books29-reading-layout" data-reading-layout={readingLayout}>
        <div className="yetzirah29-story">
          <ReadingMap activeId={activeGateId} onSelect={chooseGate} />
          <GateReader gate={activeGate} onSource={openPage} />
          <CommentaryAtlas page={page} activeCommentatorId={activeCommentatorId} onCommentator={chooseCommentator} onPage={openPage} />
          <LetterLaboratory onPage={openPage} onSpatial={letter => { setMode("gates"); setActiveNode(letter); }} />
          <VolumeMap onPage={openPage} />
        </div>
        <SourcePanel page={page} onPage={openPage} hasStructure={isSupportedStructure(structureId)} onReturn={async () => { if (document.fullscreenElement) await document.exitFullscreen(); moveTo("yetzirah29-structure-learning"); }} />
      </div>
    </main>
  </Sod2029Shell>;
}
