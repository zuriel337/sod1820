import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import BookFullscreenButton2029 from "../components/books2029/BookFullscreenButton2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  SEFER_YETZIRAH_DEPTHS,
  SEFER_YETZIRAH_LETTER_GROUPS,
  SEFER_YETZIRAH_READING_GATES,
  SEFER_YETZIRAH_SCENE_MODES,
  SEFER_YETZIRAH_SOURCE,
  SEFER_YETZIRAH_VOLUME_LAYERS,
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

function SourcePanel({ page, onPage }) {
  const fullscreenRef = useRef(null);
  const [draft, setDraft] = useState(String(page));
  const pdfUrl = `${SEFER_YETZIRAH_SOURCE.pdfUrl}#page=${page}&view=FitH`;

  useEffect(() => setDraft(String(page)), [page]);

  const submit = event => {
    event.preventDefault();
    onPage(Math.min(SEFER_YETZIRAH_SOURCE.pdfPages, Math.max(1, Number(draft) || 1)));
  };

  return <aside ref={fullscreenRef} id="yetzirah29-source" className="yetzirah29-source book-fullscreen29-target" aria-labelledby="yetzirah29-source-title">
    <header>
      <div><span>הספר פתוח תמיד</span><h2 id="yetzirah29-source-title">עמוד PDF {page}</h2></div>
      <BookFullscreenButton2029 targetRef={fullscreenRef} fallbackHref={pdfUrl} controls="yetzirah29-source" />
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
  if (mode === "letters" || mode === "gates") return <div className="yetzirah29-scene-legend is-letters">
    {SEFER_YETZIRAH_LETTER_GROUPS.map(group => <article key={group.id} style={{ "--node-color": group.color }}><span>{group.count}</span><div><strong>{group.label}</strong><b>{group.letters}</b><small>{group.role}</small></div></article>)}
  </div>;
  return <div className="yetzirah29-scene-legend is-osn">
    {[{ id: "world", title: "עולם", text: "מרחב וחומר" }, { id: "year", title: "שנה", text: "זמן ומחזור" }, { id: "soul", title: "נפש", text: "אדם וחישה" }].map(item => <button type="button" key={item.id} className={activeNode === item.id ? "is-active" : ""} onClick={() => onSelect(item.id)}><strong>{item.title}</strong><small>{item.text}</small></button>)}
  </div>;
}

function SpatialStage({ mode, onMode, activeNode, onNode }) {
  const meta = SEFER_YETZIRAH_SCENE_MODES.find(item => item.id === mode);
  return <section className="yetzirah29-spatial" aria-labelledby="yetzirah29-spatial-title">
    <header>
      <div><span>הספר נעשה מרחב</span><h2 id="yetzirah29-spatial-title">{meta.label}</h2><p>{meta.description}</p></div>
      <nav aria-label="בחירת מבנה תלת־ממדי">{SEFER_YETZIRAH_SCENE_MODES.map(item => <button type="button" key={item.id} className={mode === item.id ? "is-active" : ""} aria-pressed={mode === item.id} onClick={() => onMode(item.id)}><b>{item.short}</b><span>{item.label}</span></button>)}</nav>
    </header>
    <div className="yetzirah29-stage">
      <SpatialErrorBoundary>
        <Suspense fallback={<div className="yetzirah29-stage-loading" role="status">בונה את המרחב…</div>}>
          <SeferYetzirahScene2029 mode={mode} activeId={activeNode} onSelect={onNode} />
        </Suspense>
      </SpatialErrorBoundary>
      <div className="yetzirah29-stage-hint">גררו לסיבוב · גלגלו להתקרבות · לחצו על נקודה</div>
    </div>
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

function VolumeMap({ onPage }) {
  return <section className="yetzirah29-volume" aria-labelledby="yetzirah29-volume-title">
    <header><span>לא ספר שטוח — כרך מרובה קולות</span><h2 id="yetzirah29-volume-title">חמש שכבות בתוך 220 עמודים</h2></header>
    <ol>{SEFER_YETZIRAH_VOLUME_LAYERS.map((layer, index) => <li key={layer.pages}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.title}</strong><p>{layer.detail}</p></div><button type="button" onClick={() => onPage(Number(layer.pages.match(/\d+/)?.[0] || 1))}>PDF {layer.pages}</button></li>)}</ol>
  </section>;
}

export default function SeferYetzirahWorld2029Page() {
  const [page, setPage] = useState(requestedPage);
  const [activeGateId, setActiveGateId] = useState(requestedGate);
  const activeGate = SEFER_YETZIRAH_READING_GATES.find(gate => gate.id === activeGateId) || SEFER_YETZIRAH_READING_GATES[0];
  const [mode, setMode] = useState(activeGate.mode);
  const [activeNode, setActiveNode] = useState(() => activeGate.mode === "sefirot" ? "beginning" : activeGate.mode === "osn" ? "world" : "");

  useEffect(() => {
    applySeo({ title: `ספר יצירה · ${activeGate.title}`, description: "ספר יצירה כמרחב תלת־ממדי: עשר ספירות, כ״ב אותיות, רל״א שערים, מקור מלא ופירוש עברי.", path: "/2029/control", noindex: true });
  }, [activeGate.title]);

  const openPage = nextPage => {
    setPage(nextPage);
    replaceReadingUrl(nextPage, activeGateId);
  };

  const chooseGate = gate => {
    setActiveGateId(gate.id);
    setPage(gate.page);
    setMode(gate.mode);
    setActiveNode(gate.mode === "sefirot" ? "beginning" : gate.mode === "osn" ? "world" : "");
    replaceReadingUrl(gate.page, gate.id);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("yetzirah29-reading")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  return <Sod2029Shell wide surface="books" symbol="✦" eyebrow="ספר יצירה · עולם קריאה" title="ספר יצירה" description="המקור, הפירושים והמבנים המרחביים בתוך קורא אחד.">
    <main className="yetzirah29" dir="rtl">
      <section className="yetzirah29-hero" aria-labelledby="yetzirah29-title">
        <div><span>{SEFER_YETZIRAH_SOURCE.attribution}</span><h1 id="yetzirah29-title">האותיות נעשות<br /><em>מרחב חי</em></h1><p>קוראים את דברי הספר, פותחים את הפירוש ומסובבים ביד את מבנה הספירות, האותיות והשערים.</p></div>
        <aside><strong>עולם הספר</strong><p>הספר אינו צריך להמתין למחשבון. המבנים מוצגים מתוך הכרך עצמו, וכל פירוש חוזר לעמוד המקור.</p></aside>
      </section>

      <section className="yetzirah29-metrics" aria-label="מספרי היסוד של ספר יצירה">
        {[['10','ספירות בלימה','עשרה עומקים'],['22','אותיות יסוד','3 · 7 · 12'],['231','שערים','זוגות אותיות'],['32','נתיבות','10 + 22'],['220','עמודי מקור','כרך מלא']].map(item => <article key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span><small>{item[2]}</small></article>)}
      </section>

      <SpatialStage mode={mode} onMode={nextMode => { setMode(nextMode); setActiveNode(nextMode === "sefirot" ? "beginning" : nextMode === "osn" ? "world" : ""); }} activeNode={activeNode} onNode={setActiveNode} />

      <div className="yetzirah29-layout">
        <div className="yetzirah29-story">
          <ReadingMap activeId={activeGateId} onSelect={chooseGate} />
          <GateReader gate={activeGate} onSource={openPage} />
          <VolumeMap onPage={openPage} />
        </div>
        <SourcePanel page={page} onPage={openPage} />
      </div>
    </main>
  </Sod2029Shell>;
}
