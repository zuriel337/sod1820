import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import "./maamarEstherInternalMap2029.css";

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("he");
}

async function loadInternalMap(url, signal) {
  const response = await fetch(url, { credentials: "same-origin", signal });
  if (!response.ok) throw new Error(`Internal map unavailable (${response.status})`);
  return response.json();
}

function searchableUnit(unit) {
  return normalizeSearch([
    unit.source_focus,
    unit.source_quote,
    unit.question,
    unit.conclusion,
    unit.companion_explanation,
    ...(unit.cited_sources || []),
    ...(unit.people || []),
    ...(unit.concepts || []),
  ].filter(Boolean).join(" "));
}

function UnitTags({ label, items }) {
  if (!items?.length) return null;
  return <div className="maamar-map29-tags"><span>{label}</span><div>{items.map(item => <small key={item}>{item}</small>)}</div></div>;
}

export default function MaamarEstherInternalMap2029({ mapUrl, currentPage, onOpenPage }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [chapterId, setChapterId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: "" });
    loadInternalMap(mapUrl, controller.signal)
      .then(data => setState({ loading: false, data, error: "" }))
      .catch(error => {
        if (error?.name !== "AbortError") setState({ loading: false, data: null, error: "המפה הפנימית אינה זמינה כרגע." });
      });
    return () => controller.abort();
  }, [mapUrl]);

  const units = state.data?.units || [];
  const chapters = state.data?.chapters || [];
  const currentUnit = useMemo(() => units.find(unit => unit.id === selectedId)
    || units.find(unit => Number(unit.pdf_page) === Number(currentPage))
    || units[0]
    || null, [currentPage, selectedId, units]);

  useEffect(() => {
    if (!selectedId && currentUnit) setSelectedId(currentUnit.id);
  }, [currentUnit, selectedId]);

  useEffect(() => {
    if (!chapterId && currentUnit) setChapterId(currentUnit.chapter_id);
  }, [chapterId, currentUnit]);

  useEffect(() => {
    if (!units.length) return;
    setSelectedId(current => {
      const selected = units.find(unit => unit.id === current);
      if (Number(selected?.pdf_page) === Number(currentPage)) return current;
      return units.find(unit => Number(unit.pdf_page) === Number(currentPage))?.id || current;
    });
  }, [currentPage, units]);

  const normalizedQuery = normalizeSearch(deferredQuery);
  const visibleUnits = useMemo(() => units.filter(unit => {
    if (!normalizedQuery && chapterId && unit.chapter_id !== chapterId) return false;
    if (!normalizedQuery) return true;
    return searchableUnit(unit).includes(normalizedQuery);
  }), [chapterId, normalizedQuery, units]);

  const chapterUnits = useMemo(() => units.filter(unit => unit.chapter_id === currentUnit?.chapter_id), [currentUnit?.chapter_id, units]);
  const currentIndex = chapterUnits.findIndex(unit => unit.id === currentUnit?.id);
  const previousUnit = currentIndex > 0 ? chapterUnits[currentIndex - 1] : null;
  const nextUnit = currentIndex >= 0 && currentIndex < chapterUnits.length - 1 ? chapterUnits[currentIndex + 1] : null;

  const selectUnit = unit => {
    setSelectedId(unit.id);
    setChapterId(unit.chapter_id);
    onOpenPage(unit.pdf_page);
  };

  if (state.loading) return <section className="maamar-map29" aria-live="polite"><p>פותח את המפה הפנימית צמודת־המקור…</p></section>;
  if (state.error) return <section className="maamar-map29" role="alert"><p>{state.error}</p></section>;
  if (!state.data || !currentUnit) return null;

  return <section className="maamar-map29" aria-labelledby="maamar-map29-title">
    <header className="maamar-map29-heading">
      <div>
        <span>הסבר נלווה · מיפוי פנימי</span>
        <h3 id="maamar-map29-title">מהלך אחר מהלך בתוך „מאמר אסתר”</h3>
        <p>{state.data.mapping_note}</p>
      </div>
      <div className="maamar-map29-coverage" aria-label="כיסוי המפה">
        <strong>{state.data.coverage.internal_units}</strong><span>יחידות</span>
        <strong>{state.data.coverage.mapped_pdf_pages}/84</strong><span>עמודי מקור</span>
      </div>
    </header>

    <label className="maamar-map29-search" htmlFor="maamar-map29-search-input">
      <span>חיפוש לפי פסוק, דמות, מקור או מושג</span>
      <input id="maamar-map29-search-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="למשל: מרדכי, מדרש, תענית" />
    </label>

    <nav className="maamar-map29-chapters" aria-label="פרקי מאמר אסתר">
      {chapters.map(chapter => <button
        type="button"
        key={chapter.id}
        className={chapter.id === currentUnit.chapter_id && !normalizedQuery ? "is-active" : ""}
        aria-pressed={chapter.id === currentUnit.chapter_id && !normalizedQuery}
        onClick={() => {
          setQuery("");
          setChapterId(chapter.id);
          const first = units.find(unit => unit.chapter_id === chapter.id);
          if (first) selectUnit(first);
        }}
      >
        <strong>{chapter.title}</strong><small>PDF {chapter.from}–{chapter.to} · {chapter.unit_ids.length} יחידות</small>
      </button>)}
    </nav>

    <div className="maamar-map29-workspace">
      <aside className="maamar-map29-units" aria-label={normalizedQuery ? "תוצאות חיפוש במפה" : `יחידות ${currentUnit.chapter_title}`}>
        <small>{normalizedQuery ? `${visibleUnits.length} תוצאות` : `${visibleUnits.length} יחידות בחטיבה`}</small>
        <div>{visibleUnits.map(unit => <button
          type="button"
          key={unit.id}
          className={unit.id === currentUnit.id ? "is-active" : ""}
          aria-pressed={unit.id === currentUnit.id}
          onClick={() => selectUnit(unit)}
        >
          <span>PDF {unit.pdf_page} · {unit.sequence_on_page}</span>
          <strong>{unit.source_focus}</strong>
        </button>)}</div>
      </aside>

      <article className="maamar-map29-unit" aria-live="polite">
        <header>
          <span>הסבר נלווה · {currentUnit.chapter_title} · PDF {currentUnit.pdf_page}</span>
          <h4>{currentUnit.source_focus}</h4>
          <button type="button" onClick={() => onOpenPage(currentUnit.pdf_page)}>פתח את עמוד {currentUnit.pdf_page} בדברי הספר</button>
        </header>

        {currentUnit.source_quote ? <blockquote><span>דברי הספר</span>{currentUnit.source_quote}</blockquote> : null}

        <section><h5>הפסוק או מאמר חז״ל</h5><p>{currentUnit.source_focus}</p></section>
        <section><h5>הקושיה</h5><p>{currentUnit.question}</p></section>
        <UnitTags label="המקורות שהמחבר מביא" items={currentUnit.cited_sources} />
        <section><h5>שלבי המהלך</h5><ol>{currentUnit.argument_steps.map((step, index) => <li key={`${currentUnit.id}-step-${index}`}>{step}</li>)}</ol></section>
        <section><h5>התשובה או המסקנה</h5><p>{currentUnit.conclusion}</p></section>
        <section className="maamar-map29-simple"><h5>הסבר עברי פשוט</h5><p>{currentUnit.companion_explanation}</p></section>
        <UnitTags label="דמויות" items={currentUnit.people} />
        <UnitTags label="מושגים" items={currentUnit.concepts} />

        <details className="maamar-map29-extraction">
          <summary>פרטי המקור</summary>
          <p><strong>עוגן:</strong> PDF {currentUnit.pdf_page} · <code>{currentUnit.source_anchor}</code></p>
          <p><strong>טקסט חילוץ · לא תחליף ל־PDF:</strong> {currentUnit.extraction_anchor}</p>
          <p>לא סומן „מאומת במנוע”. ה־PDF הצמוד הוא המקור המחייב.</p>
        </details>

        <nav className="maamar-map29-unit-nav" aria-label="מעבר בין יחידות באותו פרק">
          <button type="button" disabled={!previousUnit} onClick={() => previousUnit && selectUnit(previousUnit)}>→ היחידה הקודמת</button>
          <button type="button" disabled={!nextUnit} onClick={() => nextUnit && selectUnit(nextUnit)}>היחידה הבאה ←</button>
        </nav>
      </article>
    </div>
  </section>;
}
