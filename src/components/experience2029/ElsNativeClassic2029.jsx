import React, { useEffect, useMemo, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { findingColorChoices, projectFindingColor } from "./elsFindingColors2029.js";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import TzofenEmbed from "../TzofenEmbed.jsx";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function MatrixSnapshot({ state, onLetterClick, selectedLetterIndex, visible }) {
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
  }, [visible, state?.scope, state?.term, state?.axis?.hitId, state?.axis?.length, geometry?.r0, geometry?.r1, geometry?.c0, geometry?.cw]);

  const markMap = useMemo(() => {
    const map = new Map();
    for (const mark of matrix?.marks || []) map.set(Number(mark.i), mark.type === "finding" ? { ...mark, color: projectFindingColor(mark.color, palette) } : mark);
    return map;
  }, [matrix?.marks, palette]);

  const heatMap = useMemo(() => new Map((matrix?.heat?.cells || [])
    .map((cell) => [Number(cell.i), clamp(Number(cell.strength) || 0, 0, 1)])), [matrix?.heat]);

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
    className="els29-native-matrix-scroll"
    role="region"
    tabIndex={0}
    aria-label={`מטריצת ELS עבור ${state.termRaw || state.term || "המונח הפעיל"}`}
    aria-describedby={summaryId}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={stopDrag}
    onPointerCancel={stopDrag}
  >
    <span id={summaryId} className="els29-native-sr-only">
      {state.termRaw || state.term || "מונח פעיל"} · דילוג {state?.axis?.skip ?? "לא ידוע"} · כיוון {directionLabel(state?.axis?.direction)} · {markSummary.axis} אותיות ציר מסומנות · {markSummary.findings} אותיות ממצאים מסומנות. אפשר להשתמש בכפתור "מקור הממצא" כדי לקרוא את הפסוקים במקלדת.
    </span>
    <div
      className={`els29-native-matrix${fit ? " is-fit" : ""}`}
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
            const mark = markMap.get(index);
            const heat = mark ? 0 : heatMap.get(index) || 0;
            const classes = [
              "els29-native-cell",
              mark?.type === "main" ? "is-axis" : "",
              mark?.type === "finding" ? "is-finding" : "",
              mark?.start ? "is-start" : "",
              selectedLetterIndex === index ? "is-selected" : "",
              heat > 0 ? "is-heat" : "",
            ].filter(Boolean).join(" ");
            return <span
              key={index}
              className={classes}
              data-els-index={index}
              title="הצג מקור ופסוק"
              onClick={() => {
                if (dragRef.current.moved) return;
                onLetterClick?.({ index, letter, mark });
              }}
              style={{
                ...(mark?.type === "finding" && mark?.color ? { "--els29-mark": mark.color } : {}),
                ...(heat > 0 ? { "--els29-heat": `${Math.round(heat * 72)}%` } : {}),
              }}
            >{letter === " " ? "\u00a0" : letter}</span>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

function MatrixControls({ state, onControl, onContext }) {
  const active = state?.status === "ok" && state?.verification?.state === "MATCH";
  const count = Number(state?.occurrence?.count) || 0;
  const current = count ? (Number(state?.occurrence?.index) || 0) + 1 : 0;
  const zoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
  const fit = Boolean(state?.ui?.fit);

  return <div className="els29-native-controls" role="group" aria-label="שליטה במטריצת ELS">
    <div className="els29-native-occ-controls">
      <button type="button" disabled={!active || count < 2} onClick={() => onControl("occurrence-prev")} aria-label="מופע קודם">‹</button>
      <span>{count ? `${current} / ${count}` : "—"}</span>
      <button type="button" disabled={!active || count < 2} onClick={() => onControl("occurrence-next")} aria-label="מופע הבא">›</button>
    </div>
    <div className="els29-native-view-controls">
      <button type="button" disabled={!active} onClick={() => onControl("zoom-out")} aria-label="הקטן מטריצה">−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" disabled={!active} onClick={() => onControl("zoom-in")} aria-label="הגדל מטריצה">+</button>
      <button type="button" disabled={!active} aria-pressed={fit} onClick={() => onControl("fit-toggle")}>
        {fit ? "גודל חופשי" : "התאם למסך"}
      </button>
      <button type="button" disabled={!active} aria-pressed={!state?.ui?.hideMain} onClick={() => onControl("axis-visibility")}>סימון הציר</button>
      <button type="button" disabled={!active || state?.ui?.ctxR <= 1} onClick={() => onContext(-1)}>צמצם חלון</button>
      <button type="button" disabled={!active || state?.ui?.ctxR >= 8} onClick={() => onContext(1)}>הרחב חלון</button>
    </div>
  </div>;
}

function LineExplorer({ result, findings, onScan, onAddFinding }) {
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
    <small>דילוג {result.skip} · {directionLabel(result.direction)} · עד 80 אותיות לפני ואחרי</small>
    <div ref={stripRef} className="els29-native-line-scroll" tabIndex={0} role="region" aria-label={`רצף הציר של ${result.word}`}>
      <div className="els29-native-line-cells" dir="rtl">
        {cells.map((cell, offset) => <span key={cell.i}
          className={`${cell.main ? "is-main" : ""}${highlighted.has(offset) ? " is-word" : ""}`}
        >{cell.letter}</span>)}
      </div>
    </div>
    <small>המילה שבחרתם מודגשת. גללו לצדדים כדי לקרוא את המשך הרצף.</small>
    <div className="els29-native-hit-actions">
      <button type="button" onClick={onScan}>{result.scan ? "סרוק שוב את הרצף" : "סרוק שורה · מילים לאורך הציר"}</button>
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
            <button type="button" disabled={added || findings.length >= 12} onClick={() => onAddFinding(word.term)}
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

function SourceLens({ lensResult, findings, onScanLine, onAddLineFinding }) {
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
      onScan={onScanLine} onAddFinding={onAddLineFinding} />;
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

function FindingsRail({ activeTool, state, lensResult, onAxisVerse, onAxisLine, onAxisScan, onAxisControl, onScanLine, onAddLineFinding, onOpenClassic, onFindingsChange, onFindingControl, onFindingLens, onSave, onWorkspace }) {
  const palette = use2029Palette("research_lab");
  const colorChoices = findingColorChoices(palette);
  const findings = Array.isArray(state?.findings) ? state.findings : [];
  const verified = state?.verification?.state === "MATCH";
  const showN = clamp(Math.round(Number(state?.ui?.showN) || 1), 1, 15);
  const [draft, setDraft] = useState("");

  const projected = () => findings.map((finding) => ({ t: finding.t, color: finding.color }));

  const addFinding = () => {
    const term = clean(draft);
    if (!term || !verified || findings.length >= 12) return;
    onFindingsChange?.([...projected(), { t: term, color: colorChoices[findings.length % colorChoices.length].stored }]);
    setDraft("");
  };

  const removeFinding = (index) => {
    onFindingsChange?.(projected().filter((_, itemIndex) => itemIndex !== index));
  };

  const changeFindingColor = (index, color) => {
    onFindingsChange?.(projected().map((finding, itemIndex) =>
      itemIndex === index ? { ...finding, color } : finding
    ));
  };

  return <div className="els29-native-workrail">
    <div className="els29-native-rail-section" hidden={activeTool !== "source"}>
      <small>הממצא הפעיל</small>
      <strong>{state?.termRaw || state?.term || "עדיין לא נבחר מונח"}</strong>
      <div className="els29-native-meta-grid">
        <span><b>{verified ? "מאומת" : state?.status === "candidate" ? "מועמד" : "ממתין"}</b><small>מצב</small></span>
        <span><b>{state?.axis?.skip ?? "—"}</b><small>דילוג</small></span>
        <span><b>{directionLabel(state?.axis?.direction)}</b><small>כיוון</small></span>
        <span><b>{state?.occurrence?.count ?? "—"}</b><small>מופעים</small></span>
      </div>
    </div>

    <div className="els29-native-rail-section" hidden={activeTool !== "source" && activeTool !== "scan"}>
      <div className="els29-native-rail-head"><strong>{activeTool === "scan" ? "מילים לאורך הציר" : "מקור ופסוק"}</strong></div>
      <SourceLens lensResult={lensResult} findings={findings} onScanLine={onScanLine} onAddLineFinding={onAddLineFinding} />
      <button className="sod29-action" type="button" hidden={activeTool === "scan"} disabled={!verified || !state?.axis?.hitId} onClick={onAxisVerse}>
        מקור הממצא
      </button>
      <button className="sod29-action" type="button" hidden={activeTool === "scan"} disabled={!verified} onClick={onAxisLine}>רצף ומילים לאורך הציר</button>
      <button className="sod29-action" type="button" hidden={activeTool !== "scan"} disabled={!verified || !state?.axis?.hitId} onClick={onAxisScan}>סרוק מילים לאורך הציר הראשי</button>
    </div>

    <div className="els29-native-rail-section" hidden={activeTool !== "findings"}>
      <div className="els29-native-rail-head"><strong>ממצאים במטריצה</strong><small>{findings.length}/12</small></div>
      {verified ? <div className="els29-native-axis-entry" data-experience-capability="els-axis-actions">
        <small>הציר המרכזי</small>
        <strong>{state.termRaw || state.term}</strong>
        <small>דילוג {state.axis?.skip} · מופע {(state.occurrence?.index || 0) + 1} מתוך {state.occurrence?.count || 1}</small>
        <div className="els29-native-hit-actions">
          <button type="button" onClick={onAxisLine}>רצף ומילים לאורך הציר</button>
          <button type="button" onClick={onAxisVerse}>פסוקי הציר</button>
          <button type="button" aria-pressed={!state.ui?.hideMain} onClick={() => onAxisControl("axis-visibility")}>
            {state.ui?.hideMain ? "הצג סימון ציר" : "הסתר סימון ציר"}
          </button>
        </div>
      </div> : null}
      <label className="els29-native-proximity">
        <span>מד קרבה · מופעים לכל ממצא <output>{showN}</output></span>
        <input type="range" min="1" max="15" step="1" value={showN}
          aria-label="מופעים לכל ממצא" disabled={!verified}
          onChange={(event) => onAxisControl("finding-count", Number(event.target.value))} />
        <small>מספר המופעים הקרובים המוצגים מכל ממצא. מרחק ההצלבה נקבע בחיפוש.</small>
      </label>
      <div className="els29-native-finding-add">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addFinding();
            }
          }}
          disabled={!verified || findings.length >= 12}
          maxLength={26}
          placeholder={verified ? "הוסף מילה למטריצה…" : "נדרש מופע מאומת"}
          aria-label="ממצא חדש למטריצה"
        />
        <button type="button" onClick={addFinding} disabled={!verified || !clean(draft) || findings.length >= 12}>הוסף</button>
      </div>

      {findings.length ? <div className="els29-native-findings">
        {findings.map((finding, index) => {
          const displayColor = projectFindingColor(finding.color, palette);
          const firstShownHit = (finding.hits || []).find((hit) => hit.shown && hit.verified);
          return <div className="els29-native-finding-group" key={finding.t}><div className="els29-native-finding">
            <i className="els29-native-color-dot" style={{ "--els29-mark": displayColor }} aria-hidden="true" />
            <span><b>{finding.t}</b><small>{finding.inWindow || 0} מועמדים בחלון · {finding.shown?.length || 0} מוצגים ומאומתים</small>
              {firstShownHit && Number.isFinite(firstShownHit.axisDistance) ? <small>דילוג {firstShownHit.skip} · מרחק מהציר הראשי {firstShownHit.axisDistance} תאים</small> : null}
            </span>
            <button className="els29-native-finding-remove" type="button" onClick={() => removeFinding(index)} aria-label={`מחק את המילה ${finding.t} וכל מופעיה`} title="מחק מילה שלמה">×</button>
          </div>
            <div className="els29-native-hit-actions">
              <button type="button" disabled={!firstShownHit}
                onClick={() => onFindingLens(finding.t, firstShownHit.hitId, "line-context", true)}>
                סרוק מילים לאורך הציר של {finding.t}
              </button>
            </div>
            <details className="els29-native-hit-details">
              <summary>מופעים של {finding.t} · הצגה והסתרה</summary>
              <p className="els29-native-muted">כיבוי מופע אחד משאיר את שאר המופעים.</p>
              <div className="els29-native-hit-actions">
                <button type="button" disabled={index === 0} onClick={() => onFindingControl(finding.t, "move-up")}>העלה</button>
                <button type="button" disabled={index === findings.length - 1} onClick={() => onFindingControl(finding.t, "move-down")}>הורד</button>
              </div>
              {(finding.hits || []).map((hit, hitIndex) => <div className="els29-native-hit-actions" key={`${hit.revision}:${hit.candidateIndex}`}>
                <label><input type="checkbox" checked={hit.shown} onChange={() => onFindingControl(finding.t, "toggle-hit", hit.hitId, hit)} />
                  <span><b>מופע {hitIndex + 1} · {hit.shown ? (hit.verified ? "מוצג" : "נבחר · טרם אומת") : "מוסתר"}</b><small>{hit.verified ? `דילוג ${hit.skip} · ${directionLabel(hit.direction)}` : "מועמד — יוצג במטריצה לאחר אימות"}</small>
                    {hit.verified && Number.isFinite(hit.axisDistance) ? <small>מרחק מהציר הראשי · {hit.axisDistance} תאים</small> : null}
                  </span>
                </label>
                <button type="button" disabled={!hit.shown || !hit.verified} onClick={() => onFindingLens(finding.t, hit.hitId)}>מקור</button>
                <button type="button" disabled={!hit.shown || !hit.verified} onClick={() => onFindingLens(finding.t, hit.hitId, "line-context", true)}>רצף ומילים</button>
              </div>)}
              {!finding.hits?.length ? <p className="els29-native-muted">עדיין אין מופעים מאומתים לבחירה.</p> : null}
              {finding.hitsTruncated ? <p className="els29-native-muted">מוצגים 64 מופעים מאומתים. הרשימה המלאה בכלים הקלאסיים.</p> : null}
            </details>
            <details className="els29-native-hit-details">
              <summary>צבע הממצא</summary>
              <div className="els29-native-system-colors" role="group" aria-label={`צבע הממצא ${finding.t}`}>
                {colorChoices.map((choice) => <button type="button" key={choice.label} aria-label={`צבע ${choice.label} לממצא ${finding.t}`} aria-pressed={displayColor === choice.color} title={choice.label}
                  onClick={() => changeFindingColor(index, choice.stored)} style={{ "--els29-mark": choice.color }}><i aria-hidden="true" /><span>{choice.label}</span>{displayColor === choice.color ? " ✓" : ""}</button>)}
              </div>
            </details>
          </div>;
        })}
      </div> : <p className="els29-native-muted">הוסיפו מילה כדי לראות אם ואיפה היא מופיעה בחלון המטריצה הנוכחי.</p>}
    </div>

    <div className="els29-native-rail-section" hidden={activeTool !== "research"}>
      <strong>שמירה והמשך מחקר</strong>
      <div className="els29-native-hit-actions">
        <button type="button" disabled={!verified} onClick={onSave}>שמור מטריצה</button>
        <button type="button" disabled={!verified} onClick={onWorkspace}>הוסף למחקר</button>
        <button type="button" onClick={onOpenClassic}>שמירות ושיתוף</button>
      </div>
      <p className="els29-native-muted">הצלבות מתקדמות, שמירה, תמונה, שיתוף, סרט, ניקוד וכל כלי שעוד לא הועבר ל־2029 נשאר זמין באותו כלי קלאסי.</p>
      <button className="sod29-action" type="button" onClick={onOpenClassic}>פתח את כל הכלים הקלאסיים</button>
    </div>
  </div>;
}

export default function ElsNativeClassic2029({ initialSeed = "" }) {
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
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const panelInteractedRef = useRef(false);
  const toolRailRef = useRef(null);
  const panelRef = useRef(null);
  const panelTriggerRef = useRef(null);
  const openTool = (tool, trigger) => {
    panelInteractedRef.current = true;
    if (trigger) panelTriggerRef.current = trigger;
    setActiveTool(tool);
  };
  const closeTool = () => {
    setActiveTool(null);
    panelTriggerRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!activeTool || classicOpen) return;
    if (panelInteractedRef.current) panelRef.current?.querySelector('[aria-label="סגור כלי מטריצה"]')?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setActiveTool(null);
        panelTriggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onOutside = (event) => {
      if ((panelPinned && window.matchMedia("(min-width:981px)").matches) || panelRef.current?.contains(event.target) || toolRailRef.current?.contains(event.target)) return;
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
  const [controlRequest, setControlRequest] = useState(null);
  const controlSeqRef = useRef(0);
  const [searchRequest, setSearchRequest] = useState(null);
  const searchSeqRef = useRef(0);
  const [findingsRequest, setFindingsRequest] = useState(null);
  const findingsSeqRef = useRef(0);
  const [findingControlRequest, setFindingControlRequest] = useState(null);
  const [contextRequest, setContextRequest] = useState(null);
  const [actionRequest, setActionRequest] = useState(null);
  const [workspaceRequest, setWorkspaceRequest] = useState(null);
  const actionSeqRef = useRef(0);
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossTerm, setCrossTerm] = useState("");
  const [crossRadius, setCrossRadius] = useState(18);
  const crossRadiusDraftRef = useRef({ edited: false, revision: 0, submitted: null });
  const [lensRequest, setLensRequest] = useState(null);
  const lensSeqRef = useRef(0);
  const [lensResult, setLensResult] = useState(null);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(null);

  const activeScope = engineState?.scope === "tanakh" ? "tanakh" : "torah";

  const resetReadContext = () => {
    ++lensSeqRef.current;
    setLensRequest(null);
    setLensResult(null);
    setSelectedLetterIndex(null);
  };

  const requestSearch = (kind, payload = {}) => {
    resetReadContext();
    setNotice("");
    setClassicOpen(false);
    setSearchRequest({ kind, ...payload, seq: ++searchSeqRef.current });
  };

  const requestFindingsChange = (findings) => {
    if (!Array.isArray(findings)) return;
    const previousTerms = (engineStateRef.current?.findings || []).map((finding) => finding.t);
    if (findings.length !== previousTerms.length || findings.some((finding, index) => finding.t !== previousTerms[index])) resetReadContext();
    setFindingsRequest({ findings, seq: ++findingsSeqRef.current });
  };

  const submit = (event) => {
    event?.preventDefault?.();
    const term = clean(query);
    if (term.length < 2) {
      setNotice("כתבו לפחות שתי אותיות.");
      return;
    }
    requestSearch("regular", { term, scope: activeScope });
  };

  const switchScope = (scope) => {
    const term = clean(query) || clean(engineState?.termRaw || engineState?.term);
    if (term.length < 2) {
      setNotice("בחרו מונח ואז עברו בין תורה לכל התנ״ך.");
      return;
    }
    requestSearch("regular", { term, scope });
  };

  const submitCross = () => {
    const axis = clean(query) || clean(engineState?.termRaw || engineState?.term);
    const term = clean(crossTerm);
    if (axis.length < 2 || term.length < 2) {
      setNotice("להצלבה צריך שני מונחים של לפחות שתי אותיות.");
      return;
    }
    crossRadiusDraftRef.current.submitted = { value: crossRadius, revision: crossRadiusDraftRef.current.revision };
    requestSearch("cross", { axis, term, scope: activeScope, radius: crossRadius });
  };

  const handleEngineState = (next) => {
    const previous = engineStateRef.current;
    if (previous?.axis?.hitId !== next?.axis?.hitId || previous?.scope !== next?.scope || previous?.term !== next?.term || next?.status !== "ok") {
      resetReadContext();
    }
    if (next?.termRaw && next.termRaw !== previous?.termRaw) setQuery(next.termRaw);
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
    if (action === "occurrence-prev" || action === "occurrence-next") {
      resetReadContext();
    }
    setControlRequest({ action, ...(value === undefined ? {} : { value }), seq: ++controlSeqRef.current });
  };

  const requestLens = (lens, target = {}) => {
    // A native reading/scan action always reveals its native result, even after compatibility tools.
    setClassicOpen(false);
    const tool = target.scan === true ? "scan" : "source";
    openTool(tool, toolRailRef.current?.querySelector(`[aria-label="${tool === "scan" ? "סריקה" : "מקור"}"]`));
    const seq = ++lensSeqRef.current;
    setLensResult(null);
    setLensRequest({ lens, target: { ...target, nativeSeq: seq } });
  };

  const handleLens = (result) => {
    if (result?.target?.nativeSeq !== lensSeqRef.current) return;
    setLensResult(result);
  };
  const requestFindingControl = (term, action, hitId, hit = {}) => {
    resetReadContext();
    setFindingControlRequest({ term, action, hitId, axisHitId: engineStateRef.current?.axis?.hitId, candidateIndex: hit.candidateIndex, revision: hit.revision, seq: ++actionSeqRef.current });
  };
  const requestContext = (delta) => {
    resetReadContext();
    setContextRequest({ delta, seq: ++actionSeqRef.current });
  };
  const requestSave = () => {
    setClassicOpen(true);
    setActionRequest({ action: "save", seq: ++actionSeqRef.current });
  };

  const addLineFinding = (term) => {
    const findings = engineStateRef.current?.findings || [];
    if (!term || findings.length >= 12 || findings.some((finding) => finding.t === term)) return;
    // Append through the existing canonical editor. Preserve the read-only line inspector:
    // adding a term does not change its axis, corpus or selected occurrence.
    setFindingsRequest({ findings: [...findings.map((finding) => ({ t: finding.t, color: finding.color })), { t: term }], seq: ++findingsSeqRef.current });
  };

  const handleLetterClick = ({ index }) => {
    setSelectedLetterIndex(index);
    requestLens("letter-context", { i: index });
  };

  const requestAxisVerse = () => {
    if (!engineState?.axis?.hitId) return;
    setSelectedLetterIndex(null);
    requestLens("verse-context", { hitId: engineState.axis.hitId });
  };
  const requestAxisScan = () => {
    if (!engineState?.axis?.hitId) return;
    requestLens("line-context", { hitId: engineState.axis.hitId, scan: true });
  };
  const matrixActive = engineState?.status === "ok" && engineState?.verification?.state === "MATCH";

  return <section className={`els29-native-classic${heightExpanded ? " is-height-expanded" : ""}`} data-els-native-classic="v4">
    <form className="els29-native-query" onSubmit={submit} aria-label="חיפוש ELS">
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
      <button className="els29-native-search" type="submit">חפש</button>
      <button
        className={`els29-native-cross-toggle${crossOpen ? " is-active" : ""}`}
        type="button"
        aria-expanded={crossOpen}
        onClick={() => setCrossOpen((value) => !value)}
      >הצלבה</button>
      <button className="els29-native-more" type="button" onClick={() => setClassicOpen((value) => !value)}>
        {classicOpen ? "חזור לתצוגת 2029" : "כל הכלים"}
      </button>

      {crossOpen ? <div className="els29-native-cross-row" data-els-native-cross="simple">
        <label>
          <span>מונח שני</span>
          <input
            value={crossTerm}
            onChange={(event) => setCrossTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCross();
              }
            }}
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
        <button className="els29-native-cross-run" type="button" onClick={submitCross}>מצא מפגש</button>
      </div> : null}
    </form>

    {notice ? <div className="els29-native-notice" role="status">{notice}</div> : null}

    <div className={`els29-native-layout${classicOpen ? " is-classic-open" : ""}${panelPinned ? " is-panel-pinned" : ""}`}>
      <>
        <div className="els29-native-stage-column" hidden={classicOpen}>
        <main className="els29-native-stage" hidden={classicOpen}>
          <div className="els29-native-stage-head">
            <div>
              <small>{engineState?.status === "ok" ? "מטריצה פעילה" : "ELS 2029"}</small>
              <h3>{engineState?.termRaw || engineState?.term || "הצופן הקלאסי"}</h3>
            </div>
            <div className="els29-native-stage-status">
              <span>{scopeLabel(engineState?.scope)}</span>
              {engineState?.axis?.skip != null ? <span>דילוג {engineState.axis.skip}</span> : null}
              {engineState?.occurrence?.count ? <span>מופע {(engineState.occurrence.index || 0) + 1}/{engineState.occurrence.count}</span> : null}
            </div>
          </div>
          <MatrixControls state={engineState} onControl={requestControl} onContext={requestContext} />
          <MatrixSnapshot state={engineState} onLetterClick={handleLetterClick} selectedLetterIndex={selectedLetterIndex} visible={!classicOpen} />
        </main>
        <footer className="els29-native-bottom-controls" role="group" aria-label="תצוגת המטריצה">
          <button type="button" aria-pressed={heightExpanded} onClick={() => setHeightExpanded((value) => !value)}>
            {heightExpanded ? "חזור לגובה הרגיל" : "הגדל גובה ב־50%"}
          </button>
          <button type="button" aria-label="התאם מטריצה למסך" aria-pressed={!!engineState?.ui?.fit}
            disabled={!matrixActive} onClick={() => requestControl("fit-toggle")}>התאמה למסך</button>
          <button type="button" aria-pressed={!!engineState?.ui?.heat} disabled={!matrixActive}
            title="צפיפות סביב אותיות הציר והממצאים המאומתים" onClick={() => requestControl("heat-toggle")}>מפת חום</button>
          <button type="button" aria-label="סימון הציר הראשי" aria-pressed={!engineState?.ui?.hideMain}
            disabled={!matrixActive} onClick={() => requestControl("axis-visibility")}>
            {engineState?.ui?.hideMain ? "הצג ציר" : "סימון הציר"}
          </button>
          <button type="button" disabled={!matrixActive} onClick={requestAxisScan}>סרוק ציר ראשי</button>
          {engineState?.ui?.heat ? <small>מפת החום מציגה צפיפות סביב האותיות המסומנות.</small> : null}
        </footer>
        </div>
        <div className="els29-native-toolstrip" ref={toolRailRef} hidden={classicOpen} role="group" aria-label="כלי המטריצה">
          {[["source", "מקור", "¶"], ["findings", "ממצאים", "+"], ["scan", "סריקה", "⌕"], ["research", "שמירה", "◇"]].map(([tool, label, icon]) => <button
            type="button" key={tool} aria-label={label} title={label}
            aria-expanded={activeTool === tool} aria-controls="els29-context-panel"
            disabled={tool === "scan" && !matrixActive}
            onClick={(event) => activeTool === tool && !classicOpen ? closeTool() : tool === "scan" ? requestAxisScan() : openTool(tool, event.currentTarget)}
          ><span aria-hidden="true">{icon}</span><small>{label}</small></button>)}
        </div>
        <div ref={panelRef} className={`els29-native-panel-wrap${sheetExpanded ? " is-sheet-expanded" : ""}`} hidden={classicOpen || !activeTool}>
        <ContextualInspector2029 id="els29-context-panel" className="els29-native-context-panel" ariaLabel="כלי ELS והקשר המטריצה">
          <header className="els29-native-panel-head">
            <strong>{activeTool === "source" ? "מקור ופסוק" : activeTool === "findings" ? "ממצאים במטריצה" : activeTool === "scan" ? "סריקת מילים בציר" : "שמירה והמשך מחקר"}</strong>
            <button type="button" className="els29-native-sheet-size" aria-expanded={sheetExpanded} onClick={() => setSheetExpanded((value) => !value)}>{sheetExpanded ? "צמצם" : "הרחב"}</button>
            <button type="button" className="els29-native-pin" aria-pressed={panelPinned} onClick={() => setPanelPinned((value) => !value)}>{panelPinned ? "בטל הצמדה" : "הצמד"}</button>
            <button type="button" onClick={closeTool} aria-label="סגור כלי מטריצה" title="סגור את הסרגל">×</button>
          </header>
        <FindingsRail
          activeTool={activeTool}
          state={engineState}
          lensResult={lensResult}
          onAxisVerse={requestAxisVerse}
          onAxisLine={() => requestLens("line-context", { hitId: engineState?.axis?.hitId })}
          onAxisScan={requestAxisScan}
          onAxisControl={requestControl}
          onScanLine={() => requestLens("line-context", { term: lensResult?.target?.term, hitId: lensResult?.hitId, scan: true })}
          onAddLineFinding={addLineFinding}
          onFindingLens={(term, hitId, lens = "verse-context", scan = false) => requestLens(lens, { term, hitId, ...(scan ? { scan: true } : {}) })}
          onFindingControl={requestFindingControl}
          onSave={requestSave}
          onWorkspace={() => setWorkspaceRequest({ seq: ++actionSeqRef.current })}
          onOpenClassic={() => setClassicOpen(true)}
          onFindingsChange={requestFindingsChange}
        />
        </ContextualInspector2029>
        </div>
      </>

      <div className={classicOpen ? "els29-classic-fallback is-open" : "els29-classic-fallback"}>
        <TzofenEmbed
          seed={engineSeed || undefined}
          full={classicOpen}
          hiddenBridge
          engineOnly={!classicOpen}
          showResearchBusWhenHiddenBridge
          onState={handleEngineState}
          onGate={() => setClassicOpen(true)}
          onOnboardingRequired={() => setClassicOpen(true)}
          lensRequest={lensRequest}
          onLens={handleLens}
          controlRequest={controlRequest}
          searchRequest={searchRequest}
          findingsRequest={findingsRequest}
          findingControlRequest={findingControlRequest}
          contextRequest={contextRequest}
          actionRequest={actionRequest}
          workspaceRequest={workspaceRequest}
          onWorkspaceAdded={() => setNotice("הממצא נוסף לתיק המחקר שלך.")}
        />
      </div>
    </div>
  </section>;
}
