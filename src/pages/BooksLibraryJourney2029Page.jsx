import React, { useEffect, useMemo, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { applySeo } from "../lib/seo.js";
import { loadBookLibraryJourney } from "../lib/research/bookLibraryJourneyProjection.js";
import "./booksLibraryJourney2029.css";

const FILTERS = Object.freeze([
  { key: "all", label: "כל הספרים" },
  { key: "active", label: "מחקר פעיל" },
  { key: "waiting", label: "טרם הופעל" },
  { key: "tanakh", label: "ספרי תנ״ך" },
]);

const PIPELINE = Object.freeze([
  ["identity", "זהות"],
  ["source", "מקור"],
  ["research", "מחקר"],
  ["verification", "אימות"],
  ["spatial", "מרחב"],
  ["publication", "ציבורי"],
]);

const numberHe = value => Number(value || 0).toLocaleString("he-IL");

function BookPipeline({ status }) {
  return <ol className="books-journey29-pipeline" aria-label="מסלול הספר מתחילתו ועד החלטת פרסום">
    {PIPELINE.map(([key, label]) => <li key={key} data-complete={status[key]?.complete ? "true" : "false"}>
      <i aria-hidden="true" />
      <span>{label}</span>
    </li>)}
  </ol>;
}

function LibraryUniverse({ summary }) {
  const nodes = [
    { key: "active", label: "מחקר פעיל", value: summary.activeResearch },
    { key: "waiting", label: "טרם הופעל", value: summary.awaitingResearch },
    { key: "source", label: "מקור קיים", value: summary.sourcesAvailable },
    { key: "spatial", label: "מוכן למרחב", value: summary.spatialReady },
  ];
  return <section className="books-journey29-universe" aria-labelledby="books-journey-universe-title">
    <div className="books-journey29-universe-copy">
      <div className="sod29-kicker">כל הספרים · תמונה אחת</div>
      <h2 id="books-journey-universe-title">הספרייה כעולם מחקר חי</h2>
      <p>גם ספר שלא אומת נשאר נראה. הצבע, המסלול והטקסט מספרים מה קיים, מה נחקר ומה עוד מחכה לעבודה.</p>
      <span className="sod29-chip">פריוויו בלבד · ללא שינוי חומר</span>
    </div>
    <div className="books-journey29-orbit-stage" aria-label="מפת מצב מרחבית של כל הספרים">
      <div className="books-journey29-plane" aria-hidden="true" />
      <div className="books-journey29-ring ring-a" aria-hidden="true" />
      <div className="books-journey29-ring ring-b" aria-hidden="true" />
      <div className="books-journey29-core">
        <span>ספרים במערכת</span>
        <strong>{numberHe(summary.total)}</strong>
        <small>זהות אינה אימות</small>
      </div>
      {nodes.map((node, index) => <div className="books-journey29-orbit-node" data-kind={node.key} data-index={index} key={node.key}>
        <strong>{numberHe(node.value)}</strong>
        <span>{node.label}</span>
      </div>)}
    </div>
  </section>;
}

function BookCard({ book, selected, onSelect }) {
  return <button
    type="button"
    className="books-journey29-book"
    data-family={book.family}
    data-active={book.active ? "true" : "false"}
    aria-pressed={selected}
    onClick={() => onSelect(book.slug)}
  >
    <div className="books-journey29-book-object" aria-hidden="true">
      <i />
      <span>{book.active ? "מחקר" : "מקור"}</span>
    </div>
    <div className="books-journey29-book-copy">
      <span>{book.family === "tanakh" ? "ספר תנ״ך" : "ספר מחקר"}</span>
      <strong>{book.label}</strong>
      <small>{book.status.research.labelHe}</small>
    </div>
    <BookPipeline status={book.status} />
  </button>;
}

function BookInspector({ book }) {
  if (!book) return null;
  return <aside className="books-journey29-inspector" aria-live="polite">
    <div className="sod29-kicker">הספר שבחרת</div>
    <h2>{book.label}</h2>
    <p>{book.description}</p>
    <BookPipeline status={book.status} />
    <div className="books-journey29-status-list">
      {PIPELINE.map(([key, label]) => <div key={key} data-complete={book.status[key].complete ? "true" : "false"}>
        <span>{label}</span>
        <strong>{book.status[key].labelHe}</strong>
      </div>)}
    </div>
    {book.coverage.length ? <div className="books-journey29-coverage">
      <strong>מה כבר ידוע</strong>
      {book.coverage.map(item => <div key={item.key}><span>{item.labelHe}</span><b>{item.valueHe}</b></div>)}
    </div> : <div className="sod29-state">עדיין אין מפת כיסוי מחקרית. הספר נשאר במוצר ומסומן בגלוי כטרם נחקר.</div>}
    <div className="books-journey29-next">
      <span>השלב הבא</span>
      <strong>{book.nextActionHe}</strong>
    </div>
  </aside>;
}

function BooksJourneyScreen({ packet }) {
  const [filter, setFilter] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState(packet.items[0]?.slug || "");
  const visible = useMemo(() => packet.items.filter(book => {
    if (filter === "active") return book.active;
    if (filter === "waiting") return !book.active;
    if (filter === "tanakh") return book.family === "tanakh";
    return true;
  }), [filter, packet.items]);
  const selected = visible.find(book => book.slug === selectedSlug) || visible[0] || null;

  return <div className="books-journey29" data-publication-effect="none">
    <LibraryUniverse summary={packet.summary} />

    <section className="sod29-section books-journey29-map" aria-labelledby="books-journey-map-title">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מפת הספרים</div>
          <h2 id="books-journey-map-title">כל ספר נשאר נראה, בכל מצב</h2>
          <p className="sod29-muted">המסלול אינו ציון אמת. הוא מפריד בין קליטה, מקור, מחקר, אימות, תכנון מרחבי והחלטת פרסום.</p>
        </div>
        <span className="sod29-chip">{numberHe(visible.length)} מוצגים</span>
      </div>
      <div className="books-journey29-filters" role="group" aria-label="סינון הספרייה">
        {FILTERS.map(item => <button type="button" key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>
      <div className="books-journey29-workspace">
        <div className="books-journey29-shelf" aria-label="כל הספרים במצב הנבחר">
          {visible.map(book => <BookCard key={book.id} book={book} selected={selected?.slug === book.slug} onSelect={setSelectedSlug} />)}
        </div>
        <BookInspector book={selected} />
      </div>
      {packet.partial ? <div className="sod29-state warn">מוצג חלון חלקי בלבד. לא הומצאו ספרים עבור הרשומות שלא חזרו מן הקורא.</div> : null}
    </section>

    <section className="sod29-section books-journey29-roadmap" aria-labelledby="books-journey-roadmap-title">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מהתחלה ועד מוצר</div><h2 id="books-journey-roadmap-title">המסלול הקבוע לכל ספר</h2></div></div>
      <div className="books-journey29-roadmap-grid">
        {PIPELINE.map(([key, label], index) => <article key={key}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{label}</strong>
          <p>{[
            "זהות עברית אחת לספר בלי כפילויות.",
            "מקור, מהדורה ועדות נשמרים בנפרד.",
            "מפת מבנה וממצאים בלי להמציא שלמות.",
            "בדיקה נקודתית של טענות ומראי־מקום.",
            "מבנה חזותי ו־3D על בסיס החומר הקיים.",
            "החלטה אנושית נפרדת אם ומה לפרסם.",
          ][index]}</p>
        </article>)}
      </div>
    </section>
  </div>;
}

export default function BooksLibraryJourney2029Page() {
  const [state, setState] = useState({ phase: "loading", packet: null });

  useEffect(() => {
    applySeo({
      title: "כל הספרים · מסע מחקר",
      description: "פריוויו פנימי של כל הספרים ומצב תהליך המחקר שלהם.",
      path: "/2029/control",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    let active = true;
    loadBookLibraryJourney()
      .then(packet => active && setState({ phase: "ready", packet }))
      .catch(() => active && setState({ phase: "error", packet: null }));
    return () => { active = false; };
  }, []);

  const shellProps = {
    title: "מסע כל הספרים",
    eyebrow: "2029 · פריוויו · כל הספרים",
    description: "מוצר אחד שמראה את כל הספרים, גם כשהחומר עדיין לא אומת.",
    status: "קריאה בלבד · ללא פרסום",
    surface: "books",
    symbol: <NavigationIcon2029 name="books" />,
    introVariant: "compact",
    wide: true,
  };

  if (state.phase === "loading") return <Sod2029Shell {...shellProps}><FrameState kind="loading" title="בונה את מפת כל הספרים">קורא זהויות ומצבים בלבד, בלי לשנות את החומר.</FrameState></Sod2029Shell>;
  if (state.phase === "error") return <Sod2029Shell {...shellProps}><FrameState kind="error" title="הספרייה אינה זמינה לקריאה">לא מוצגים נתוני דמה ולא מורחבות הרשאות כדי למלא את המסך.</FrameState></Sod2029Shell>;
  if (!state.packet?.items?.length) return <Sod2029Shell {...shellProps}><FrameState title="אין ספרים זמינים">הקורא לא החזיר זהויות ספר מורשות.</FrameState></Sod2029Shell>;

  return <Sod2029Shell {...shellProps}><BooksJourneyScreen packet={state.packet} /></Sod2029Shell>;
}

