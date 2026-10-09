import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { parseElsHitKey } from "../../lib/elsJourney.js";
import { findingColorChoices, nextFindingColor, projectFindingColor } from "./elsFindingColors2029.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import TzofenEmbed from "../TzofenEmbed.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import ElsSavePanel2029 from "./ElsSavePanel2029.jsx";
import { useSystemToolDock2029 } from "./SystemToolDock2029.jsx";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function MatrixSnapshot({ state, onLetterClick, selectedLetterIndex, selectedFinding, visible, classicGlyphs, depthView, readingView }) {
  const palette = use2029Palette("research_lab");
  const matrix = state?.matrix;
  const geometry = state?.geometry;
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0, left: 0, top: 0, moved: false });

  useEffect(() => {
    const el = scrollRef.current;
    const axis = state?.axis;
    if (!visible || !el?.clientWidth || !el?.clientHeight || !axis?.hitId) return;
    const first = el.querySelector(`[data-els-index="${Number(axis.start)}"]`);
    const step = axis.direction === "back" ? -Number(axis.skip) : Number(axis.skip);
    const last = el.querySelector(`[data-els-index="${Number(axis.start) + step * (Number(axis.length) - 1)}"]`);
    if (!first || !last) return;
    const viewport = el.getBoundingClientRect();
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    const left = Math.min(a.left, b.left);
    const right = Math.max(a.right, b.right);
    const top = Math.min(a.top, b.top);
    const bottom = Math.max(a.bottom, b.bottom);
    el.scrollLeft += (left + right) / 2 - viewport.left - el.clientWidth / 2;
    // Keep the whole axis in view when it fits; show the start and reading direction of long axes.
    el.scrollTop += bottom - top <= el.clientHeight - 24
      ? (top + bottom) / 2 - viewport.top - el.clientHeight / 2
      : axis.direction === "back"
        ? a.bottom - viewport.top - el.clientHeight + 24
        : a.top - viewport.top - 24;
    // Presentation only: marking, inspection and panel changes preserve manual panning.
  }, [visible, readingView, state?.scope, state?.term, state?.axis?.hitId, state?.axis?.length, geometry?.r0, geometry?.r1, geometry?.c0, geometry?.cw]);

  const markMap = useMemo(() => {
    const map = new Map();
    for (const mark of matrix?.marks || []) map.set(Number(mark.i), mark.type === "finding" ? { ...mark, color: projectFindingColor(mark.color, palette) } : mark);
    return map;
  }, [matrix?.marks, palette]);
  const sourceMap = useMemo(() => new Map((matrix?.sourceMarks || []).map((mark) => [Number(mark.i), {
    ...mark, type: "source", color: projectFindingColor(mark.color, palette),
  }])), [matrix?.sourceMarks, palette]);

  const activeFinding = useMemo(() => {
    if (!selectedFinding) return { indices: new Set((matrix?.marks || []).filter((mark) => mark.type === "main").map((mark) => Number(mark.i))), color: palette.matrix.axis };
    if (selectedFinding.scope !== state?.scope || selectedFinding.axisHitId !== state?.axis?.hitId) return null;
    const finding = state?.findings?.find((item) => item.t === selectedFinding.term);
    const hit = [...(finding?.hits || []), ...(finding?.sourceHits || [])].find((item) => item.hitId === selectedFinding.hitId && item.shown && item.withinRadius !== false && (item.verified || item.kind === "source-sequence"));
    const anchor = hit && parseElsHitKey(hit.hitId);
    if (!anchor || !Number.isInteger(anchor.start) || !Number.isInteger(anchor.skip) || anchor.skip < 1) return null;
    // Project only the selected engine-owned occurrence. No search or recoloring request.
    return { indices: new Set(Array.from(finding.t, (_, offset) => anchor.start + anchor.dir * anchor.skip * offset)), color: projectFindingColor(finding.color, palette) };
  }, [selectedFinding, state?.scope, state?.axis?.hitId, state?.findings, matrix?.marks, palette]);

  const heatMap = useMemo(() => new Map((matrix?.heat?.cells || [])
    .map((cell) => [Number(cell.i), clamp(Number(cell.strength) || 0, 0, 1)])), [matrix?.heat]);
  const niqqudMap = useMemo(() => new Map((matrix?.niqqud?.cells || [])
    .map((cell) => [Number(cell.i), String(cell.marks || "")])), [matrix?.niqqud]);

  const markSummary = useMemo(() => {
    let axis = 0;
    let findings = 0;
    for (const mark of matrix?.marks || []) {
      if (mark?.type === "main") axis += 1;
      else if (mark?.type === "finding") findings += 1;
    }
    return { axis, findings };
  }, [matrix?.marks]);

  const stopDrag = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    try { if (el?.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    el?.classList.remove("is-dragging");
    setTimeout(() => { dragRef.current.moved = false; }, 0);
  };

  const onPointerDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };

  };

  const onPointerMove = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag.active || drag.pointerId !== event.pointerId) return;
    if (event.buttons === 0) { stopDrag(event); return; }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4 && !drag.moved) {
      drag.moved = true;
      // Capture only a real drag; capturing pointerdown retargets ordinary letter clicks.
      try { el.setPointerCapture(event.pointerId); } catch { /* noop */ }
      el.classList.add("is-dragging");
    }
    el.scrollLeft = drag.left - dx;
    el.scrollTop = drag.top - dy;
  };

  if (!matrix?.rows?.length || !geometry) {
    const candidate = state?.status === "candidate";
    const empty = state?.status === "empty";
    const title = candidate
      ? "נמצא מועמד שעדיין לא אומת"
      : empty
        ? "אין כרגע מופע מאומת להצגה"
        : "חפשו מילה קצרה כדי לפתוח את המטריצה";
    const body = candidate
      ? "המטריצה תיפתח רק אחרי שהמופע יקבל MATCH מהמנוע הקנוני."
      : empty
        ? "זה אינו קובע שהמונח לא קיים. למצב הזה אין סמכות שלילית; אפשר לשנות את החיפוש או לפתוח את הכלים הקלאסיים."
        : "החיפוש רץ באותו מנוע ELS קנוני. כאן מוצגת רק הקרנה חדשה של אותה תוצאה.";
    return <div className="els29-native-empty" data-els-native-state={state?.status || "idle"}>
      <div className="els29-native-empty-orb">✦</div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>;
  }

  const summaryId = "els29-native-matrix-summary";
  const zoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
  const cellPx = clamp(Math.round(26 * zoom), 16, 54);
  const fit = Boolean(state?.ui?.fit);

  return <div
    ref={scrollRef}
    className={`els29-native-matrix-scroll${depthView ? " is-depth-view" : ""}`}
    role="region"
    tabIndex={0}
    aria-label={`מטריצת ELS עבור ${state.termRaw || state.term || "המונח הפעיל"}`}
    aria-describedby={summaryId}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={stopDrag}
    onPointerCancel={stopDrag}
    onKeyDown={(event) => {
      const moves = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] };
      const move = moves[event.key];
      if (!move || event.target !== event.currentTarget) return;
      event.preventDefault();
      event.currentTarget.scrollBy({ left: move[0], top: move[1] });
    }}
  >
    <span id={summaryId} className="els29-native-sr-only">
      {state.termRaw || state.term || "מונח פעיל"} · דילוג {state?.axis?.skip ?? "לא ידוע"} · כיוון {directionLabel(state?.axis?.direction)} · {markSummary.axis} אותיות ציר מסומנות · {markSummary.findings} אותיות ממצאים מסומנות. אפשר להשתמש בכפתור "מקור הממצא" כדי לקרוא את הפסוקים במקלדת.
    </span>
    {readingView ? <p className="els29-native-reading-note" dir="rtl">
      רצף המקור בשורות רחבות · {state?.axis?.direction === "back" ? "קוראים את הסימון משמאל לימין, מלמטה למעלה" : "קוראים את הסימון מימין לשמאל, מלמעלה למטה"}
    </p> : null}
    <div
      className={`els29-native-matrix${fit ? " is-fit" : ""}${readingView ? " is-reading" : ""}${classicGlyphs ? " is-classic-glyphs" : ""}${depthView ? " is-depth" : ""}${state?.ui?.niqqud ? " is-niqqud" : ""}`}
      aria-hidden="true"
      style={{ "--els29-cols": matrix.cw || geometry.cw || 1, "--els29-cell": `${cellPx}px` }}
    >
      {matrix.rows.map((row, rowOffset) => {
        const chars = Array.from(row);
        return <div className="els29-native-matrix-row" key={`r-${rowOffset}`}>
          {chars.map((letter, colOffset) => {
            const absoluteRow = Number(matrix.r0 ?? geometry.r0 ?? 0) + rowOffset;
            const absoluteCol = Number(matrix.c0 ?? geometry.c0 ?? 0) + colOffset;
            const index = absoluteRow * Number(matrix.S ?? geometry.S ?? 0) + absoluteCol;
            const sourceMark = sourceMap.get(index);
            const mark = markMap.get(index) || sourceMark;
            const active = !!mark && activeFinding?.indices.has(index);
            const heat = mark ? 0 : heatMap.get(index) || 0;
            const classes = [
              "els29-native-cell",
              mark?.type === "main" ? "is-axis" : "",
              mark?.type === "finding" ? "is-finding" : "",
              sourceMark ? "is-source-text" : "",
              mark?.start ? "is-start" : "",
              active ? "is-active-finding" : "",
              selectedLetterIndex === index ? "is-selected" : "",
              heat > 0 ? "is-heat" : "",
            ].filter(Boolean).join(" ");
            return <span
              key={index}
              className={classes}
              data-els-index={index}
              title={sourceMark ? `רצף מקור: ${sourceMark.term} · הצג פסוק` : "הצג מקור ופסוק"}
              onClick={() => {
                if (dragRef.current.moved) return;
                onLetterClick?.({ index, letter, mark });
              }}
              style={{
                ...(["finding", "source"].includes(mark?.type) && mark?.color ? { "--els29-mark": mark.color } : {}),
                ...(active ? { "--els29-active-mark": activeFinding.color, "--els29-mark": activeFinding.color } : {}),
                ...(heat > 0 ? { "--els29-heat": `${Math.round(heat * 72)}%` } : {}),
              }}
            >{letter === " " ? "\u00a0" : letter + (niqqudMap.get(index) || "")}</span>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

function MatrixControls({ state, onControl, onContext, busy }) {
  const active = !busy && state?.status === "ok" && state?.verification?.state === "MATCH";
  const cross = Boolean(state?.search?.results?.items?.length);
  const count = Number(cross ? state.search.zones : state?.occurrence?.count) || 0;
  const index = Number(cross ? state.search.zoneIndex : state?.occurrence?.index) || 0;
  const current = count ? index + 1 : 0;
  const move = (delta) => cross
    ? onControl("meeting-select", { setId: state.search.results.id, index: (index + delta + count) % count })
    : onControl(delta < 0 ? "occurrence-prev" : "occurrence-next");
  const zoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
  const fit = Boolean(state?.ui?.fit);

  return <div className="els29-native-controls" role="group" aria-label="שליטה במטריצת ELS">
    <div className="els29-native-occ-controls">
      <button type="button" disabled={!active || count < 2} onClick={() => move(-1)} aria-label={cross ? "מפגש קודם" : "מופע קודם"}>‹</button>
      <span>{count ? <>{cross ? "מפגש " : ""}<bdi>{current}/{count}</bdi></> : "—"}</span>
      <button type="button" disabled={!active || count < 2} onClick={() => move(1)} aria-label={cross ? "מפגש הבא" : "מופע הבא"}>›</button>
    </div>
    <div className="els29-native-view-controls">
      <button type="button" disabled={!active} onClick={() => onControl("zoom-out")} aria-label="הקטן מטריצה">−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" disabled={!active} onClick={() => onControl("zoom-in")} aria-label="הגדל מטריצה">+</button>
      <button type="button" disabled={!active} aria-pressed={fit} onClick={() => onControl("fit-toggle")}>
        {fit ? "גודל חופשי" : "התאם למסך"}
      </button>
      <button type="button" disabled={!active} aria-pressed={!state?.ui?.hideMain} onClick={() => onControl("axis-visibility")}>סימון הציר</button>
    </div>
  </div>;
}

function LineExplorer({ result, findings, onAddFinding, addingFinding }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const stripRef = useRef(null);
  const cells = result.cells || [];
  const words = result.scan?.words || [];
  const selected = words.find((word) => word.term === selectedTerm);
  const highlighted = useMemo(() => {
    const offsets = new Set();
    for (const match of selected?.matches || []) {
      for (let index = match.at; index < match.at + match.length; index++) offsets.add(index);
    }
    return offsets;
  }, [selected]);

  useEffect(() => {
    const strip = stripRef.current;
    const target = strip?.querySelector(selected ? ".is-word" : ".is-main");
    if (!strip || !target) return;
    const viewport = strip.getBoundingClientRect();
    const cell = target.getBoundingClientRect();
    // Move only this strip. scrollIntoView can also pan the matrix or the document.
    strip.scrollLeft += cell.left + cell.width / 2 - viewport.left - strip.clientWidth / 2;
  }, [result.hitId, selected]);

  return <div className="els29-native-source-list" data-experience-capability="els-line-inspection">
    <strong>לאורך הציר · {result.word}</strong>
    <small>{result.target?.kind === "source-sequence" ? "רצף המקור" : `דילוג ${result.skip}`} · {directionLabel(result.direction)} · עד 80 אותיות לפני ואחרי</small>
    <div ref={stripRef} className="els29-native-line-scroll" tabIndex={0} role="region" aria-label={`רצף הציר של ${result.word}`}>
      <div className="els29-native-line-cells" dir="rtl">
        {cells.map((cell, offset) => <span key={cell.i}
          className={`${cell.main ? "is-main" : ""}${highlighted.has(offset) ? " is-word" : ""}`}
        >{cell.letter}</span>)}
      </div>
    </div>
    <small>המילה שבחרתם מודגשת. גללו לצדדים כדי לקרוא את המשך הרצף.</small>
    <div className="els29-native-hit-actions">
      {selected ? <button type="button" onClick={() => setSelectedTerm(null)}>חזור למילת הציר</button> : null}
    </div>
    {result.scan ? <>
      <small>מילים מהמאגר הקיים שמופיעות ברצף · מועמדות לבדיקה</small>
      <div className="els29-native-line-words" aria-label="מילים מזוהות לאורך הציר">
        {words.map((word) => {
          const added = findings.some((finding) => finding.t === word.term);
          return <div key={word.term} className="els29-native-line-word">
            <button type="button" aria-pressed={selectedTerm === word.term} onClick={() => setSelectedTerm(word.term)}
              aria-label={`סמן את ${word.label} ברצף`}>
              <b>{word.label}</b><small>{word.matches.length} ברצף</small>
            </button>
            <button type="button" disabled={addingFinding || added || findings.length >= 12} onClick={() => onAddFinding(word.term)}
              aria-label={`הוסף את ${word.label} לממצאים`}>{added ? "נוסף" : "הוסף"}</button>
          </div>;
        })}
      </div>
      {!words.length ? <p className="els29-native-muted">לא זוהו מילים נוספות מהמאגר ברצף הזה. אפשר להמשיך לקרוא את האותיות או לבדוק מופע אחר.</p> : null}
      {result.scan.truncated ? <small>הרשימה חלקית: הוצגה תקרת המילים או המופעים של הסריקה.</small> : null}
      <small>הסימון מציג התאמה ברצף. הוספה לממצאים מפעילה את הבדיקה הרגילה לפני הצגה במטריצה.</small>
    </> : null}
  </div>;
}

function SourceLens({ lensResult, findings, onAddLineFinding, addingFinding }) {
  if (!lensResult) return <p className="els29-native-muted">לחצו על אות במטריצה כדי לראות את המקור שלה, או השתמשו ב״מקור הממצא״ לקריאה נגישה של פסוקי הציר.</p>;
  if (lensResult.ok === false) return <p className="els29-native-muted">המקור לא זמין לתא הזה במצב הנוכחי.</p>;

  if (lensResult.lens === "letter-context") {
    return <div className="els29-native-source-card">
      <div className="els29-native-source-letter">{lensResult.letter || "א"}</div>
      <div>
        <strong>{lensResult?.location?.ref || lensResult?.verse?.ref || "מקור"}</strong>
        <p>{lensResult?.verse?.text || "טקסט הפסוק נטען מהמנוע הקנוני."}</p>
      </div>
    </div>;
  }

  if (lensResult.lens === "line-context") {
    return <LineExplorer key={lensResult.hitId} result={lensResult} findings={findings}
      onAddFinding={onAddLineFinding} addingFinding={addingFinding} />;
  }
  if (lensResult.lens === "verse-context") {
    const verses = Array.isArray(lensResult.verses) ? lensResult.verses : [];
    return <div className="els29-native-source-list">
      <strong>{lensResult?.span?.fromRef === lensResult?.span?.toRef
        ? lensResult?.span?.fromRef
        : `${lensResult?.span?.fromRef || ""} → ${lensResult?.span?.toRef || ""}`}</strong>
      {verses.map((verse) => <p key={verse.verseIndex}><b>{verse.ref}</b> · {verse.text}</p>)}
      {lensResult.truncated ? <small>מוצג חלק מטווח הפסוקים הארוך.</small> : null}
    </div>;
  }
  return null;
}

function SearchProgress({ operation, onCancel }) {
  const [now, setNow] = useState(Date.now());
  const pending = ["searching", "verifying"].includes(operation?.status);
  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [pending, operation?.requestId]);
  if (!pending) return null;
  const elapsed = Math.max(operation.elapsedMs || 0, now - (operation.startedAt || now), 0) / 1000;
  const progress = operation.progress;
  const remaining = progress?.completed >= 8 && progress.completed < progress.total && progress.phaseElapsedMs >= 500
    ? Math.ceil(progress.phaseElapsedMs / progress.completed * (progress.total - progress.completed) / 1000) : null;
  return <div className="els29-native-progress" aria-label={operation.kind === "findings" ? "התקדמות חיפוש משני" : "התקדמות החיפוש"}>
    <div role="status"><strong>{operation.status === "verifying" ? "בודק את המופעים שנמצאו…" : progress?.phase === "cross" ? "סורק מפגשים סביב הצירים…" : "מחפש…"}</strong>
      <small>עברו {elapsed.toFixed(1)} שניות · {remaining === null ? "זמן הסיום עדיין לא ידוע" : `הערכה: עוד כ־${remaining} שניות לסריקת הצירים`}</small>
      {progress?.total > 0 ? <><progress max={progress.total} value={progress.completed} aria-label="מיקומי ציר שנבדקו" /><small>נבדקו {progress.completed} מתוך {progress.total} מיקומי ציר בסריקה הזאת</small></> : null}
    </div>
    <button type="button" onClick={onCancel}>{operation.kind === "findings" ? "בטל חיפוש משני" : "בטל חיפוש"}</button>
  </div>;
}

function CrossResultsRail({ state, pending, outcome, visible, onSelect }) {
  const [sort, setSort] = useState("rank");
  const [minSkip, setMinSkip] = useState("");
  const [maxSkip, setMaxSkip] = useState("");
  const results = state?.search?.results;
  const items = ["empty", "error"].includes(outcome) ? [] : (results?.items || []).filter((item) => item.available);
  useEffect(() => { setMinSkip(""); setMaxSkip(""); }, [results?.id]);
  const shown = items.filter((item) => (!minSkip || item.skip >= Number(minSkip)) && (!maxSkip || item.skip <= Number(maxSkip)));
  shown.sort((a, b) => sort === "skip" ? a.skip - b.skip || a.index - b.index : sort === "distance" ? a.distance - b.distance || a.index - b.index : a.index - b.index);
  return <div className="els29-native-workrail els29-native-results" hidden={!visible} aria-label="רשימת מפגשי ההצלבה" aria-busy={pending}>
    <strong>{pending ? "מחפש מפגשים…" : items.length ? `${items.length} מפגשי הצלבה` : "תוצאות הצלבה"}</strong>
    {items.length ? <>
      <p className="els29-native-muted">{state.search.crossA} × {state.search.crossB}</p>
      {state.search.coverage?.truncated ? <small>סריקה מוגבלת: נבדקו {state.search.coverage.scanned} מתוך {state.search.coverage.available} מיקומי הציר שנמצאו; מוצגים עד 24 מפגשים.</small> : null}
      <details><summary>מיון וסינון</summary>
      <label>מיון <select aria-label="מיון מפגשי ההצלבה" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="rank">סדר המנוע</option><option value="skip">דילוג: מקטן לגדול</option><option value="distance">מרחק מהציר</option>
      </select></label>
      <div className="els29-native-results-filter">
        <label>דילוג מ־<input aria-label="דילוג מינימלי בתוצאות" type="number" min="2" value={minSkip} onChange={(event) => setMinSkip(event.target.value)} /></label>
        <label>עד<input aria-label="דילוג מרבי בתוצאות" type="number" min="2" value={maxSkip} onChange={(event) => setMaxSkip(event.target.value)} /></label>
      </div>
      <small>מציג {shown.length} מתוך {items.length} בחיפוש המוגבל הזה. בחירת מפגש פותחת את הציר ובודקת את הממצאים.</small>
      </details>
      {shown.map((item) => <button type="button" key={item.index} className="els29-native-result" disabled={pending}
        aria-label={`פתח מפגש ${item.index + 1}`} aria-pressed={state.search.zoneIndex === item.index}
        onClick={() => onSelect("meeting-select", { setId: results.id, index: item.index })}>
        <b>{item.index + 1}. {item.axis} · דילוג {item.skip}</b>
        <span>{item.terms.join(" · ")}</span><small>{item.book} · מרחק בחיפוש {item.distance} תאים</small>
        <small>הערכת המנוע: {item.stars}/5</small>
        {item.sourceSequence ? <small>כולל התאמה ברצף המקור, ללא דילוג</small> : null}
      </button>)}
      {!shown.length ? <p>אין מפגשים בטווח הדילוגים הזה.</p> : null}
      {items.length === 1 ? <p className="els29-native-muted">נמצא מפגש אחד בחלון הזה. אפשר להגדיל את חלון החיפוש ולחפש שוב.</p> : null}
    </> : <p className="els29-native-muted">{outcome === "empty" ? "לא נמצא מפגש בחיפוש האחרון. אפשר להגדיל את החלון או לשנות מרחק ולחפש שוב." : "פתחו „הצלבה בין צירים” וחפשו שני מונחים כדי לקבל רשימה ממוספרת."}</p>}
  </div>;
}

function FindingsRail({ activeTool, state, selected, lensResult, lensPending, operation, searchPending, onCancel, onScan, onSource, onSelectTarget, onAxisControl, onAddLineFinding, onFindingsChange, onFindingControl }) {
  const palette = use2029Palette("research_lab");
  const colorChoices = findingColorChoices(palette);
  const findings = Array.isArray(state?.findings) ? state.findings : [];
  const verified = state?.status === "ok" && state?.verification?.state === "MATCH";
  const showN = clamp(Math.round(Number(state?.ui?.showN) || 1), 1, 15);
  const radius = state?.ui?.findingRadius ?? null;
  const [draft, setDraft] = useState("");
  const [expandedFinding, setExpandedFinding] = useState(null);
  const railScrollRef = useRef(null);
  const inspectionRef = useRef(null);
  const findingPending = ["searching", "verifying"].includes(operation?.status);
  const pending = searchPending || findingPending;
  const allHits = (finding) => [...(finding?.hits || []), ...(finding?.sourceHits || [])];
  const eligible = (finding) => allHits(finding).filter((hit) => (hit.verified || hit.kind === "source-sequence") && hit.shown && hit.withinRadius !== false);
  const selectedFinding = selected?.term ? findings.find((finding) => finding.t === selected.term) : null;
  const selectedHit = eligible(selectedFinding).find((hit) => hit.hitId === selected?.hitId);
  const selectionValid = selected && selected.scope === state?.scope && selected.axisHitId === state?.axis?.hitId && selectedFinding && (selectedHit || findingPending);
  const target = selectionValid ? { term: selected.term, hitId: selected.hitId, ...(selectedHit?.kind === "source-sequence" ? { kind: "source-sequence" } : {}) } : { hitId: state?.axis?.hitId };
  const targetLabel = selectionValid ? selected.term : state?.termRaw || state?.term || "הציר הראשי";
  const targetReady = verified && !!target.hitId;

  useEffect(() => {
    if (selected && !selectionValid) {
      onSelectTarget(null);
    }
  }, [selected, selectionValid, onSelectTarget]);

  useLayoutEffect(() => {
    if (!lensResult || !railScrollRef.current || !inspectionRef.current) return;
    const rail = railScrollRef.current;
    const box = rail.getBoundingClientRect();
    const result = inspectionRef.current.getBoundingClientRect();
    rail.scrollTop = clamp(rail.scrollTop + result.top - box.top - 8, 0, rail.scrollHeight - rail.clientHeight);
  }, [lensResult]);

  const selectTarget = (term, hitId) => {
    onSelectTarget(term ? { term, hitId, scope: state.scope, axisHitId: state.axis.hitId } : null);
  };
  const projected = () => findings.map((finding) => ({ t: finding.t, color: finding.color }));
  const addFinding = () => {
    const term = clean(draft);
    if (!term || !verified || pending || findings.length >= 12) return;
    onFindingsChange([...projected(), { t: term, color: nextFindingColor(findings, palette) }]);
    setDraft("");
  };
  const removeFinding = (index) => onFindingsChange(projected().filter((_, itemIndex) => itemIndex !== index));
  const changeFindingColor = (index, color) => onFindingsChange(projected().map((finding, itemIndex) => itemIndex === index ? { ...finding, color } : finding));

  return <div className="els29-native-unified-rail" hidden={activeTool === "results"}>
    <div ref={railScrollRef} className="els29-native-rail-scroll" hidden={activeTool === "research"}>
      <label className="els29-native-secondary-label" htmlFor="els29-secondary-term">חיפוש משני במטריצה</label>
      <div className="els29-native-finding-add">
        <input id="els29-secondary-term" value={draft} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFinding(); } }}
          disabled={!verified || pending || findings.length >= 12} maxLength={26}
          placeholder={verified ? "כתבו מילה נוספת…" : "התחילו בחיפוש ראשי"} aria-label="חיפוש משני במטריצה" />
        <button type="button" aria-label="חפש במטריצה" onClick={addFinding} disabled={!verified || pending || !clean(draft) || findings.length >= 12}>{pending ? "מחפש…" : "חפש"}</button>
      </div>
      <SearchProgress operation={operation} onCancel={onCancel} />
      <div className="els29-native-secondary-status" role="status" aria-live="polite" aria-busy={pending}>
        {searchPending ? "ממתין לסיום החיפוש הראשי…" : operation?.status === "searching" ? "מחפש את המילה במטריצה…" : operation?.status === "verifying" ? "בודק את המופעים שנמצאו…" : operation?.status === "error" ? operation.message || "החיפוש לא הושלם. נסו שוב." : operation?.status === "done" ? "החיפוש הושלם. הממצאים מופיעים ברשימה." : "החיפוש מתבצע סביב הציר הראשי הנוכחי."}
      </div>
      <label className="els29-native-radius">
        <span>מרחק מרבי מהציר הראשי</span>
        <select aria-label="מרחק מרבי מהציר הראשי" value={radius === null ? "all" : radius} disabled={!verified || pending}
          onChange={(event) => onAxisControl("finding-radius", event.target.value === "all" ? null : Number(event.target.value))}>
          <option value="all">כל המרחקים בחלון</option>
          {[0, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100].map((value) => <option key={value} value={value}>{value === 0 ? "נוגע בציר · 0 תאים" : `עד ${value} תאים`}</option>)}
        </select>
      </label>
      <div className="els29-native-rail-head"><strong>ממצאים במטריצה</strong><small>{findings.length}/12 משניים</small></div>
      <div className="els29-native-findings">
        {verified ? <div className={`els29-native-finding-group is-primary${!selectionValid ? " is-selected" : ""}`} style={{ "--els29-mark": palette.matrix.axis }} data-experience-capability="els-axis-actions">
          <button type="button" className="els29-native-finding-select" aria-label={`בחר ציר לסריקה: ${state.termRaw || state.term}`}
            aria-pressed={!selectionValid} disabled={searchPending} onClick={() => selectTarget("", state.axis.hitId)}>
            <i className="els29-native-color-dot" aria-hidden="true" />
            <span><b>{state.termRaw || state.term}</b><small>ציר ראשי · דילוג {state.axis?.skip}</small><small>מופע {(state.occurrence?.index || 0) + 1}/{state.occurrence?.count || 1}</small></span>
          </button>
        </div> : <p className="els29-native-muted">אחרי החיפוש הראשי יופיעו כאן הציר והממצאים שלו.</p>}
        {findings.map((finding, index) => {
          const hits = eligible(finding);
          const firstHit = hits[0];
          const chosen = selectionValid && selected.term === finding.t;
          const displayHit = chosen ? selectedHit : firstHit;
          const displayColor = projectFindingColor(finding.color, palette);
          const hasVerified = (finding.hits || []).some((hit) => hit.verified);
          return <div className={`els29-native-finding-group${chosen ? " is-selected" : ""}`} style={{ "--els29-mark": displayColor }} key={finding.t}>
            <div className="els29-native-finding">
              <button type="button" className="els29-native-finding-select" aria-label={`בחר ציר לסריקה: ${finding.t}`} aria-pressed={!!chosen}
                disabled={!firstHit || pending} onClick={() => selectTarget(finding.t, firstHit.hitId)}>
                <i className="els29-native-color-dot" style={{ "--els29-mark": displayColor }} aria-hidden="true" />
                <span><b>{finding.t}</b><small>מוצגים {hits.length} · {finding.inWindow || 0} בחלון</small>
                  {displayHit ? <small>{displayHit.kind === "source-sequence" ? "רצף מקור, ללא דילוג" : `דילוג ${displayHit.skip}`} · מרחק {displayHit.axisDistance} תאים</small> : <small>{hasVerified || finding.plainTextCount ? "אין מופע מוצג בטווח שנבחר" : pending ? "מחפש…" : "אין מופע מאומת להצגה"}</small>}
                </span>
              </button>
              <button type="button" aria-label={`מופעים וצבע של ${finding.t}`} title="מופעים, צבע ופעולות" aria-expanded={expandedFinding === finding.t}
                aria-controls={`els29-finding-extra-${index}`} onClick={() => setExpandedFinding((term) => term === finding.t ? null : finding.t)}>⋯</button>
            </div>
            {chosen && selectedHit && hits.length > 1 ? <label className="els29-native-selected-occurrence">מופע לסריקה
              <select aria-label={`מופע לסריקה של ${finding.t}`} disabled={pending} value={selectedHit.hitId} onChange={(event) => selectTarget(finding.t, event.target.value)}>
                {hits.map((hit, hitIndex) => <option key={hit.hitId} value={hit.hitId}>מופע {hitIndex + 1} · {hit.kind === "source-sequence" ? "רצף מקור" : `דילוג ${hit.skip}`} · מרחק {hit.axisDistance}</option>)}
              </select>
            </label> : null}
            <div className="els29-native-finding-extra" id={`els29-finding-extra-${index}`} hidden={expandedFinding !== finding.t}>
              <div className="els29-native-finding-actions">
                <button type="button" disabled={pending || index === 0} aria-label={`העלה את ${finding.t}`} onClick={() => onFindingControl(finding.t, "move-up")}>↑</button>
                <button type="button" disabled={pending || index === findings.length - 1} aria-label={`הורד את ${finding.t}`} onClick={() => onFindingControl(finding.t, "move-down")}>↓</button>
                <button type="button" disabled={pending} onClick={() => removeFinding(index)} aria-label={`מחק את המילה ${finding.t} וכל מופעיה`}>מחק</button>
              </div>
              {allHits(finding).map((hit, hitIndex) => <div className="els29-native-hit-actions" key={hit.hitId || `${hit.revision}:${hit.candidateIndex}`}>
                <label><input type="checkbox" disabled={pending} checked={hit.selected ?? hit.shown} onChange={() => onFindingControl(finding.t, "toggle-hit", hit.hitId, hit)} />
                  <span><b>מופע {hitIndex + 1} · {hit.shown ? (hit.verified || hit.kind === "source-sequence" ? "מוצג" : "בבדיקה") : hit.withinRadius === false ? "מחוץ לטווח" : "מוסתר"}</b>
                    <small>{hit.kind === "source-sequence" ? `רצף מקור · מרחק ${hit.axisDistance} תאים` : hit.verified ? `דילוג ${hit.skip} · מרחק ${hit.axisDistance} תאים` : "מועמד לבדיקה"}</small></span>
                </label>
              </div>)}
              {finding.hitsTruncated ? <small>מוצגים עד 64 מופעים. הרשימה המלאה בכלים הקלאסיים.</small> : null}
              <div className="els29-native-system-colors" role="group" aria-label={`צבע הממצא ${finding.t}`}>
                {colorChoices.map((choice) => <button type="button" key={choice.label} aria-label={`צבע ${choice.label} לממצא ${finding.t}`} disabled={pending} aria-pressed={displayColor === choice.color}
                  onClick={() => changeFindingColor(index, choice.stored)} style={{ "--els29-mark": choice.color }}><i aria-hidden="true" /><span>{choice.label}</span>{displayColor === choice.color ? " ✓" : ""}</button>)}
              </div>
            </div>
          </div>;
        })}
      </div>
      {lensPending || lensResult ? <details ref={inspectionRef} key={lensResult?.target?.nativeSeq || "pending"} className="els29-native-inline-inspection" open>
        <summary>{lensResult?.lens === "line-context" ? "תוצאות סריקת הציר" : lensPending ? "טוען…" : "מקור ופסוק"}</summary>
        {lensPending ? <p role="status">טוען את הציר הנבחר…</p> : <SourceLens lensResult={lensResult} findings={findings} onAddLineFinding={onAddLineFinding} addingFinding={pending} />}
      </details> : null}
      <details className="els29-native-findings-options"><summary>אפשרויות תצוגת ממצאים</summary>
        <label className="els29-native-proximity"><span>מופעים להצגה לכל מילה <output>{showN}</output></span>
          <input type="range" min="1" max="15" step="1" value={showN} aria-label="מופעים לכל ממצא" disabled={!verified || pending}
            onChange={(event) => onAxisControl("finding-count", Number(event.target.value))} />
        </label>
      </details>
    </div>
    <div className="els29-native-scan-action" hidden={activeTool === "research"}>
      <small>הציר הנבחר: <b>{targetLabel}</b></small>
      <button type="button" aria-label="סרוק לאורך הציר הנבחר" disabled={!targetReady || lensPending || pending} onClick={() => onScan(target)}>{lensPending ? "טוען…" : "סרוק לאורך הציר הנבחר"}</button>
      <button type="button" aria-label="מקור הממצא הנבחר" disabled={!targetReady || lensPending || pending} onClick={() => onSource(target)}>מקור ופסוק</button>
    </div>
  </div>;
}

export default function ElsNativeClassic2029({ initialSeed = "", matrix = null }) {
  const palette = use2029Palette("research_lab");
  const { user } = useAuth();
  const [query, setQuery] = useState(clean(initialSeed));
  // The iframe source stays stable after mount. User-initiated searches travel through native-search,
  // so changing a term/scope never creates a second engine instance or remounts the canonical one.
  const [engineSeed] = useState(() => clean(initialSeed));
  const [engineState, setEngineState] = useState(null);
  const engineStateRef = useRef(null);
  const [classicOpen, setClassicOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(() => window.matchMedia("(min-width:981px)").matches ? "findings" : null);
  const [panelPinned, setPanelPinned] = useState(true);
  const [heightExpanded, setHeightExpanded] = useState(false);
  const [classicGlyphs, setClassicGlyphs] = useState(false);
  const [depthView, setDepthView] = useState(false);
  const [shortSkipView, setShortSkipView] = useState("reading");
  const toolRailRef = useRef(null);
  const panelRef = useRef(null);
  const queryRef = useRef(null);
  const panelTriggerRef = useRef(null);
  const toolActionsRef = useRef(null);
  const openTool = (tool, trigger) => {
    if (trigger) panelTriggerRef.current = trigger;
    setClassicOpen(false);
    setActiveTool(tool);
    if (trigger) requestAnimationFrame(() => {
      if (window.matchMedia("(max-width:980px)").matches) panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      panelRef.current?.querySelector('[aria-label="סגור כלי מטריצה"]')?.focus({ preventScroll: true });
    });
  };
  const closeTool = () => {
    setActiveTool(null);
    panelTriggerRef.current?.focus({ preventScroll: true });
  };
  toolActionsRef.current = {
    search: () => {
      setClassicOpen(false);
      queryRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      queryRef.current?.querySelector("input")?.focus({ preventScroll: true });
    },
    select: (tool, trigger) => activeTool === tool && !classicOpen && window.matchMedia("(min-width:981px)").matches ? closeTool() : openTool(tool, trigger),
  };
  const dockProjection = useMemo(() => ({
    surface: "els",
    actions: [
      { id: "search", label: "חיפוש בצופן", shortLabel: "חיפוש", icon: "search", controls: "els29-query", onSelect: () => toolActionsRef.current.search() },
      ...[["findings", "סריקה וממצאים", "סריקה", "els"], ["results", "תוצאות", "תוצאות", "posts"], ["research", "שמירה", "שמירה", "books"]].map(([id, label, shortLabel, icon]) => ({
        id, label, shortLabel, icon, expanded: !classicOpen && activeTool === id,
        controls: "els29-context-panel", onSelect: (trigger) => toolActionsRef.current.select(id, trigger),
      })),
    ],
  }), [activeTool, classicOpen]);
  const hasSystemDock = useSystemToolDock2029(dockProjection);
  useEffect(() => {
    if (!activeTool || classicOpen) return;
    const onKey = (event) => {
      if (event.target.closest?.('[role="dialog"]')) return;
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setActiveTool(null);
        panelTriggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onOutside = (event) => {
      if (window.matchMedia("(max-width:980px)").matches || event.target.closest?.(".sod29-command-island")) return;
      if (panelPinned || panelRef.current?.contains(event.target) || toolRailRef.current?.contains(event.target)) return;
      setActiveTool(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [activeTool, classicOpen, panelPinned]);
  const [notice, setNotice] = useState("");
  const [accountRequired, setAccountRequired] = useState(false);
  const [operations, setOperations] = useState({ search: null, findings: null });
  const [controlRequest, setControlRequest] = useState(null);
  const controlSeqRef = useRef(0);
  const [searchRequest, setSearchRequest] = useState(null);
  const [cancelRequest, setCancelRequest] = useState(null);
  const searchSeqRef = useRef(0);
  const [findingsRequest, setFindingsRequest] = useState(null);
  const findingsSeqRef = useRef(0);
  const [findingControlRequest, setFindingControlRequest] = useState(null);
  const [contextRequest, setContextRequest] = useState(null);
  const [saveRequest, setSaveRequest] = useState(null);
  const [savePending, setSavePending] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [workspaceRequest, setWorkspaceRequest] = useState(null);
  const actionSeqRef = useRef(0);
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossTerm, setCrossTerm] = useState("");
  const [crossRadius, setCrossRadius] = useState(18);
  const [windowSize, setWindowSize] = useState("small");
  const crossRadiusDraftRef = useRef({ edited: false, revision: 0, submitted: null });
  const [lensRequest, setLensRequest] = useState(null);
  const lensSeqRef = useRef(0);
  const [lensResult, setLensResult] = useState(null);
  const [lensPending, setLensPending] = useState(false);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  useEffect(() => {
    if (!matrix) return;
    setQuery(matrix.search_term || "");setClassicOpen(false);setLoadError(null);
    setSearchRequest(null);setFindingsRequest(null);setOperations({ search: null, findings: null });
    setSaveResult(null);
    const view = matrix.positions?.view || {};
    setClassicGlyphs(view.classicGlyphs === true);setHeightExpanded(view.heightExpanded === true);
    setShortSkipView(view.shortSkipView === "columns" ? "columns" : "reading");
  }, [matrix?.id]);

  const activeScope = engineState?.scope === "tanakh" ? "tanakh" : "torah";

  const resetReadContext = () => {
    ++lensSeqRef.current;
    setLensRequest(null);
    setLensResult(null);
    setLensPending(false);
    setSelectedLetterIndex(null);
  };
  const selectFinding = (selection) => {
    setSelectedFinding(selection);
    resetReadContext();
  };

  const requestSearch = (kind, payload = {}) => {
    resetReadContext();
    setLoadError(null);
    setNotice("");
    setAccountRequired(false);
    setClassicOpen(false);
    ++findingsSeqRef.current;
    const seq = ++searchSeqRef.current;
    setOperations({ search: { kind: "search", searchKind: kind, requestId: seq, status: "searching", startedAt: Date.now(), previousAxis: engineStateRef.current?.axis?.hitId }, findings: null });
    setActiveTool(kind === "cross" ? "results" : "findings");
    setSearchRequest({ kind, windowSize, ...payload, seq });
  };

  const requestFindingsChange = (findings, { preserveRead = false } = {}) => {
    if (!Array.isArray(findings)) return;
    const previousTerms = (engineStateRef.current?.findings || []).map((finding) => finding.t);
    const membershipChanged = findings.length !== previousTerms.length || findings.some((finding) => !previousTerms.includes(finding.t));
    if (membershipChanged && !preserveRead) resetReadContext();
    const seq = ++findingsSeqRef.current;
    if (membershipChanged) setOperations((current) => ({ ...current, findings: { kind: "findings", requestId: seq, status: "searching", startedAt: Date.now() } }));
    setFindingsRequest({ findings, seq });
  };

  const handleOperation = (operation) => {
    const kind = operation?.kind;
    if (kind !== "search" && kind !== "findings") return;
    const expected = kind === "search" ? searchSeqRef.current : findingsSeqRef.current;
    if (operation.requestId !== expected) return;
    setOperations((current) => ({ ...current, [kind]: { ...current[kind], ...operation, startedAt: current[kind]?.startedAt || Date.now() - (operation.elapsedMs || 0) } }));
    if (kind === "search" && operation.status === "error") setNotice(operation.message || "החיפוש לא הושלם. נסו שוב.");
    if (kind === "search" && operation.status === "empty") setNotice("לא נמצאו מופעים בסריקה הזאת. אפשר לשנות את המונח ולנסות שוב.");
  };

  const submit = (event) => {
    event?.preventDefault?.();
    if (crossOpen) { submitCross(); return; }
    const term = clean(query);
    if (term.length < 2) {
      setNotice("כתבו לפחות שתי אותיות.");
      return;
    }
    requestSearch("regular", { term, scope: activeScope });
  };

  const switchScope = (scope) => {
    if (crossOpen) { submitCross(scope); return; }
    const term = clean(query) || clean(engineState?.termRaw || engineState?.term);
    if (term.length < 2) {
      setNotice("בחרו מונח ואז עברו בין תורה לכל התנ״ך.");
      return;
    }
    requestSearch("regular", { term, scope });
  };

  const submitCross = (scope = activeScope) => {
    const axis = clean(query) || clean(engineState?.termRaw || engineState?.term);
    const term = clean(crossTerm);
    if (axis.length < 2 || term.length < 2) {
      setNotice("להצלבה צריך שני מונחים של לפחות שתי אותיות.");
      return;
    }
    crossRadiusDraftRef.current.submitted = { value: crossRadius, revision: crossRadiusDraftRef.current.revision };
    requestSearch("cross", { axis, term, scope, radius: crossRadius });
  };

  const handleEngineState = (next) => {
    const previous = engineStateRef.current;
    if (previous?.axis?.hitId !== next?.axis?.hitId || previous?.scope !== next?.scope || previous?.term !== next?.term || next?.status !== "ok") {
      resetReadContext();
      if (previous?.axis?.hitId !== next?.axis?.hitId || previous?.scope !== next?.scope || previous?.term !== next?.term) {
        ++findingsSeqRef.current;
        setOperations((current) => ({ ...current, findings: null }));
      }
    }
    if (next?.termRaw && (next.termRaw !== previous?.termRaw || next?.search?.crossA !== previous?.search?.crossA)) setQuery(next.search?.mode === "cross-simple" ? next.search.crossA : next.termRaw);
    if (next?.ui?.windowRequested !== previous?.ui?.windowRequested && ["small", "medium", "large"].includes(next?.ui?.windowRequested)) setWindowSize(next.ui.windowRequested);
    const canonicalRadius = Number(next?.search?.crossRadius);
    if (Number.isInteger(canonicalRadius) && canonicalRadius >= 2 && canonicalRadius <= 20) {
      const draft = crossRadiusDraftRef.current;
      const submitted = draft.submitted;
      if (submitted?.value === canonicalRadius) {
        if (submitted.revision === draft.revision) {
          setCrossRadius(canonicalRadius);
          draft.edited = false;
        }
        draft.submitted = null;
      } else if (!draft.edited && canonicalRadius !== previous?.search?.crossRadius) {
        setCrossRadius(canonicalRadius);
      }
    }
    engineStateRef.current = next;
    setEngineState(next);
  };

  const requestControl = (action, value) => {
    if (!action) return;
    if (action === "occurrence-prev" || action === "occurrence-next" || action === "meeting-select") {
      resetReadContext();
      ++findingsSeqRef.current;
      setOperations((current) => ({ ...current, findings: null }));
    }
    if (action === "finding-radius" || action === "finding-count") resetReadContext();
    setControlRequest({ action, ...(value === undefined ? {} : { value }), seq: ++controlSeqRef.current });
  };

  const requestLens = (lens, target = {}) => {
    // A native reading/scan action always reveals its native result, even after compatibility tools.
    setClassicOpen(false);
    openTool("findings");
    const seq = ++lensSeqRef.current;
    setLensResult(null);
    setLensPending(true);
    setLensRequest({ lens, target: { ...target, nativeSeq: seq } });
  };

  const handleLens = (result) => {
    if (result?.target?.nativeSeq !== lensSeqRef.current) return;
    setLensResult(result);
    setLensPending(false);
  };
  const requestFindingControl = (term, action, hitId, hit = {}) => {
    resetReadContext();
    setFindingControlRequest({ term, action, hitId, axisHitId: engineStateRef.current?.axis?.hitId, candidateIndex: hit.candidateIndex, revision: hit.revision, seq: ++actionSeqRef.current });
  };
  const requestContext = (delta) => {
    resetReadContext();
    setContextRequest({ delta, seq: ++actionSeqRef.current });
  };
  const requestSave = (draft) => {
    if (!draft) { setActiveTool("research"); return; }
    if (savePending) return;
    setSaveResult(null);setSavePending(true);
    setSaveRequest({ ...draft, seq: ++actionSeqRef.current, axisHitId: engineStateRef.current?.axis?.hitId,
      view: { classicGlyphs, heightExpanded, shortSkipView } });
  };

  const addLineFinding = (term) => {
    const findings = engineStateRef.current?.findings || [];
    if (!term || ["searching", "verifying"].includes(operations.findings?.status) || ["searching", "verifying"].includes(operations.search?.status) || findings.length >= 12 || findings.some((finding) => finding.t === term)) return;
    // Append through the existing canonical editor. Preserve the read-only line inspector:
    // adding a term does not change its axis, corpus or selected occurrence.
    requestFindingsChange([...findings.map((finding) => ({ t: finding.t, color: finding.color })), { t: term, color: nextFindingColor(findings, palette) }], { preserveRead: true });
  };

  const handleLetterClick = ({ index }) => {
    setSelectedLetterIndex(index);
    requestLens("letter-context", { i: index });
  };

  const matrixActive = !loadError && engineState?.status === "ok" && engineState?.verification?.state === "MATCH";
  const searchPending = ["searching", "verifying"].includes(operations.search?.status);
  // Reading layout is only available for a complete, contiguous short-skip window.
  // CSS wraps the existing indexed cells; canonical geometry and crossing scans stay unchanged.
  const shortSkip = matrixActive && engineState.search?.mode === "regular" && engineState.matrix?.S >= 2
    && engineState.matrix.S <= 8 && engineState.matrix.c0 === 0 && engineState.matrix.cw === engineState.matrix.S;
  const readingView = shortSkip && shortSkipView === "reading";
  const previousResult = matrixActive && operations.search?.previousAxis === engineState?.axis?.hitId
    && ["searching", "verifying", "empty", "error", "cancelled"].includes(operations.search?.status);
  const matrixStatus = previousResult
    ? searchPending ? "הממצא הקודם · החיפוש החדש מתבצע…"
      : operations.search.status === "error" ? "הממצא הקודם · החיפוש החדש לא הושלם"
        : operations.search.status === "cancelled" ? "הממצא הקודם · החיפוש החדש בוטל"
          : "הממצא הקודם · לא נמצאה תוצאה בחיפוש החדש"
    : matrixActive ? "מטריצה פעילה" : "ELS 2029";
  const cancelOperation = (kind) => {
    const operation = operations[kind];
    if (!["searching", "verifying"].includes(operation?.status)) return;
    resetReadContext();
    setCancelRequest({ kind, requestId: operation.requestId, seq: ++actionSeqRef.current });
    if (kind === "search") { ++searchSeqRef.current; setSearchRequest(null); setNotice("החיפוש בוטל."); }
    else { ++findingsSeqRef.current; setFindingsRequest(null); }
    setOperations((current) => ({ ...current, [kind]: { ...current[kind], status: "cancelled" } }));
  };
  const advancedCrossActive = matrixActive && !["regular", "cross-simple"].includes(engineState?.search?.mode);
  const changeWindowSize = (size) => {
    setWindowSize(size);
    if (!matrixActive || advancedCrossActive) return;
    const current = engineStateRef.current;
    if (current.search?.mode === "cross-simple") requestSearch("cross", { axis: current.search.crossA, term: current.search.crossB, scope: current.scope, radius: current.search.crossRadius, windowSize: size });
    else requestSearch("regular", { term: current.termRaw || current.term, scope: current.scope, windowSize: size });
  };

  return <section className={`els29-native-classic${heightExpanded ? " is-height-expanded" : ""}`} data-els-native-classic="v4"
    style={{ "--els29-canvas": palette.matrix.surface, "--els29-letter-ink": palette.matrix.ink, "--els29-frame": palette.matrix.frame, "--els29-axis": palette.matrix.axis, "--els29-mark-ink": palette.matrix.onMark }}>
    <form id="els29-query" ref={queryRef} className="els29-native-query" onSubmit={submit} aria-label="חיפוש ELS">
      <label>
        <span>מונח</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={40}
          placeholder="למשל: משיח"
          autoComplete="off"
        />
      </label>
      <div className="els29-native-scope" aria-label="היקף החיפוש">
        <button
          type="button"
          className={activeScope === "torah" ? "is-active" : ""}
          aria-pressed={activeScope === "torah"}
          onClick={() => switchScope("torah")}
        >תורה</button>
        <button
          type="button"
          className={activeScope === "tanakh" ? "is-active" : ""}
          aria-pressed={activeScope === "tanakh"}
          onClick={() => switchScope("tanakh")}
        >כל התנ״ך</button>
      </div>
      <button className="els29-native-search" type="submit" disabled={searchPending}>{searchPending ? "מחפש…" : crossOpen ? "מצא מפגש" : "חפש"}</button>
      <button
        className={`els29-native-cross-toggle${crossOpen ? " is-active" : ""}`}
        type="button"
        aria-expanded={crossOpen}
        onClick={() => { if (crossOpen && operations.search?.searchKind === "cross") cancelOperation("search"); setCrossOpen((value) => !value); }}
      >הצלבה בין צירים</button>
      <button className="els29-native-more" type="button" onClick={() => { cancelOperation("search"); cancelOperation("findings"); setClassicOpen((value) => !value); }}>
        {classicOpen ? "חזור למטריצה" : "כל הכלים"}
      </button>

      {crossOpen ? <div className="els29-native-cross-row" data-els-native-cross="simple">
        <label>
          <span>מונח שני</span>
          <input
            value={crossTerm}
            onChange={(event) => setCrossTerm(event.target.value)}
            maxLength={40}
            placeholder="למשל: דוד"
            autoComplete="off"
          />
        </label>
        <label className="els29-native-cross-distance">
          <span>מרחק מרבי מהציר בהצלבה <output>{crossRadius} תאים</output></span>
          <input type="range" min="2" max="20" step="1" value={crossRadius}
            aria-label="מרחק מרבי מהציר בהצלבה"
            onChange={(event) => {
              crossRadiusDraftRef.current.edited = true;
              crossRadiusDraftRef.current.revision += 1;
              setCrossRadius(Number(event.target.value));
            }} />
        </label>
      </div> : null}
    </form>

    <SearchProgress operation={operations.search} onCancel={() => cancelOperation("search")} />
    {notice ? <div className="els29-native-notice" role="status">{notice}{accountRequired ? <> · <a href="/login">כניסה לחשבון</a></> : null}</div> : null}

    <div className={`els29-native-layout${classicOpen ? " is-classic-open" : ""}${panelPinned ? " is-panel-pinned" : ""}${hasSystemDock ? " has-system-dock" : ""}`}>
      <>
        <div className="els29-native-stage-column" hidden={classicOpen}>
        <main className="els29-native-stage" hidden={classicOpen} aria-busy={searchPending}>
          <div className="els29-native-stage-head">
            <div>
              <small className="els29-native-matrix-status" role="status">{matrixStatus}</small>
              <h3>{engineState?.termRaw || engineState?.term || "הצופן הקלאסי"}</h3>
            </div>
            <div className="els29-native-stage-status">
              <span>{scopeLabel(engineState?.scope)}</span>
              {engineState?.axis?.skip != null ? <span>דילוג <bdi>{engineState.axis.direction === "back" ? "−" : ""}{engineState.axis.skip}</bdi></span> : null}
              {shortSkip ? <label className="els29-native-window-size">תצוגה
                <select aria-label="תצוגת דילוג קטן" value={shortSkipView} onChange={(event) => setShortSkipView(event.target.value)}>
                  <option value="reading">רצף רחב</option><option value="columns">עמודות הדילוג</option>
                </select>
              </label> : null}
              {engineState?.search?.zones ? <span>מפגש {engineState.search.zoneIndex + 1}/{engineState.search.zones}</span> : engineState?.occurrence?.count ? <span>מופע {(engineState.occurrence.index || 0) + 1}/{engineState.occurrence.count}</span> : null}
              <button type="button" className="els29-native-niqqud" aria-pressed={!!engineState?.ui?.niqqud} disabled={!matrixActive}
                title="הוסף ניקוד מנתוני התורה; בשאר התנ״ך האותיות נשארות ללא ניקוד" onClick={() => requestControl("niqqud-toggle")}>ניקוד</button>
              <label className="els29-native-window-size">{engineState?.ui?.windowRequested === "legacy" ? "החיפוש הבא" : "חלון חיפוש"}
                <select aria-label="גודל חלון החיפוש" value={windowSize} disabled={searchPending || advancedCrossActive || ["searching", "verifying"].includes(operations.findings?.status)}
                  title={advancedCrossActive ? "את חלון ההצלבה המתקדמת משנים בכלים המתקדמים" : "שינוי הגודל מפעיל חיפוש חדש באותם מונחים"}
                  onChange={(event) => changeWindowSize(event.target.value)}>
                  <option value="small">קטן · מהיר</option><option value="medium">רגיל</option><option value="large">גדול</option>
                </select>
              </label>
              {engineState?.ui?.windowRequested === "small" && (["medium", "large"].includes(engineState?.ui?.windowSize) || engineState?.ui?.ctxR > 1)
                ? <small>החלון הורחב כדי להכיל את הציר והמרחק</small> : null}
              {matrixActive && engineState?.ui?.windowRequested === "legacy" ? <small>מוצג החלון המקורי</small> : null}
              {engineState?.ui?.niqqud && activeScope === "tanakh" ? <span>ניקוד לתורה בלבד</span> : null}
            </div>
          </div>
          <MatrixControls state={engineState} onControl={requestControl} onContext={requestContext} busy={searchPending || ["searching", "verifying"].includes(operations.findings?.status)} />
          <MatrixSnapshot state={engineState} onLetterClick={handleLetterClick} selectedLetterIndex={selectedLetterIndex} selectedFinding={selectedFinding} visible={!classicOpen} classicGlyphs={classicGlyphs} depthView={depthView} readingView={readingView} />
        </main>
        <footer className="els29-native-bottom-controls" role="group" aria-label="תצוגת המטריצה">
          <button type="button" aria-pressed={heightExpanded} onClick={() => setHeightExpanded((value) => !value)}>
            {heightExpanded ? "חזור לגובה הרגיל" : "הגדל גובה ב־50%"}
          </button>
          <button type="button" aria-label="התאם מטריצה למסך" aria-pressed={!!engineState?.ui?.fit}
            disabled={!matrixActive || searchPending || ["searching", "verifying"].includes(operations.findings?.status)} onClick={() => requestControl("fit-toggle")}>התאמה למסך</button>
          <button type="button" aria-pressed={!!engineState?.ui?.heat} disabled={!matrixActive}
            title="צפיפות סביב אותיות הציר והממצאים המאומתים" onClick={() => requestControl("heat-toggle")}>מפת חום</button>
          <button type="button" aria-label="סימון הציר הראשי" aria-pressed={!engineState?.ui?.hideMain}
            disabled={!matrixActive} onClick={() => requestControl("axis-visibility")}>
            {engineState?.ui?.hideMain ? "הצג ציר" : "סימון הציר"}
          </button>
          <button type="button" aria-pressed={classicGlyphs} onClick={() => setClassicGlyphs((value) => !value)}>אותיות קלאסיות</button>
          <button type="button" aria-pressed={depthView} disabled={!matrixActive} title="הבלטת האותיות, הציר והממצאים" onClick={() => setDepthView((value) => !value)}>תצוגת עומק</button>
          {depthView ? <small>תצוגת עומק של אותה מטריצה.</small> : null}
          {engineState?.ui?.heat ? <small>מפת החום מציגה צפיפות סביב האותיות המסומנות.</small> : null}
        </footer>
        </div>
        <div className="els29-native-toolstrip" ref={toolRailRef} hidden={classicOpen || hasSystemDock} role="group" aria-label="כלי המטריצה">
          {[["findings", "סריקה וממצאים", "els"], ["results", "תוצאות", "posts"], ["research", "שמירה", "books"]].map(([tool, label, icon]) => <button
            type="button" key={tool} aria-label={label} title={label}
            aria-expanded={activeTool === tool} aria-controls="els29-context-panel"
            onClick={(event) => activeTool === tool && !classicOpen ? closeTool() : openTool(tool, event.currentTarget)}
          ><NavigationIcon2029 name={icon} /><small>{tool === "findings" ? "סריקה" : label}</small></button>)}
        </div>
        <div ref={panelRef} className="els29-native-panel-wrap" hidden={classicOpen || !activeTool}>
        <ContextualInspector2029 id="els29-context-panel" className="els29-native-context-panel" ariaLabel="כלי ELS והקשר המטריצה">
          <header className="els29-native-panel-head">
            <strong>{activeTool === "research" ? "שמירה והמשך מחקר" : activeTool === "results" ? "תוצאות הצלבה" : "סריקה וממצאים"}</strong>
            <button type="button" className="els29-native-pin" aria-pressed={panelPinned} onClick={() => setPanelPinned((value) => !value)}>{panelPinned ? "בטל הצמדה" : "הצמד"}</button>
            <button type="button" onClick={closeTool} aria-label="סגור כלי מטריצה" title="סגור את הסרגל">×</button>
          </header>
        <CrossResultsRail state={engineState} pending={searchPending || ["searching", "verifying"].includes(operations.findings?.status)}
          outcome={operations.search?.status} visible={activeTool === "results"} onSelect={requestControl} />
        <ElsSavePanel2029 visible={activeTool === "research"} state={engineState} matrix={matrix} user={user}
          pending={savePending} busy={searchPending || ["searching", "verifying"].includes(operations.findings?.status)} result={saveResult}
          onSave={requestSave} onWorkspace={() => setWorkspaceRequest({ seq: ++actionSeqRef.current })}
          onAccount={() => { setAccountRequired(true);setNotice("שמירה פרטית זמינה לאחר התחברות לחשבון."); }} />
        <FindingsRail
          selected={selectedFinding}
          onCancel={() => cancelOperation("findings")}
          activeTool={activeTool}
          state={engineState}
          lensResult={lensResult}
          lensPending={lensPending}
          operation={operations.findings}
          searchPending={searchPending}
          onSelectTarget={selectFinding}
          onScan={(target) => requestLens("line-context", { ...target, scan: true })}
          onSource={(target) => requestLens("verse-context", target)}
          onAxisControl={requestControl}
          onAddLineFinding={addLineFinding}
          onFindingControl={requestFindingControl}
          onFindingsChange={requestFindingsChange}
        />
        </ContextualInspector2029>
        </div>
      </>

      <div className={classicOpen ? "els29-classic-fallback is-open" : "els29-classic-fallback"}>
        <TzofenEmbed
          seed={engineSeed || undefined}
          matrix={matrix}
          full={classicOpen}
          hiddenBridge
          experience2029
          engineOnly={!classicOpen}
          showResearchBusWhenHiddenBridge
          onState={handleEngineState}
          onOperation={handleOperation}
          onGate={() => { setClassicOpen(false); setOperations({ search: null, findings: null }); setAccountRequired(true); setNotice("פעולה זו זמינה דרך החשבון באתר."); }}
          onOnboardingRequired={() => { setClassicOpen(false); setNotice("התחילו במילה קצרה, ואז בדקו את המקור והמילים שסביבה."); }}
          lensRequest={lensRequest}
          onLens={handleLens}
          controlRequest={controlRequest}
          searchRequest={searchRequest}
          cancelRequest={cancelRequest}
          findingsRequest={findingsRequest}
          findingControlRequest={findingControlRequest}
          contextRequest={contextRequest}
          saveRequest={saveRequest}
          onSaveResult={(result) => { if (result.requestId !== saveRequest?.seq) return;setSavePending(false);setSaveResult(result); }}
          onLoadError={(error) => { setLoadError(error);setNotice("לא הצלחנו לשחזר את המיקום השמור. אפשר לנסות חיפוש חדש; הצופן המקורי נשאר שמור."); }}
          workspaceRequest={workspaceRequest}
          onWorkspaceAdded={() => setNotice("הממצא נוסף לתיק המחקר שלך.")}
        />
      </div>
    </div>
  </section>;
}
