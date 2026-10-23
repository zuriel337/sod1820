import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import {
  buildJourneyPromotion,
  buildJourneyRestore,
  journeyAnchorMatches,
  journeySnapshotMatches,
  parseElsHitKey,
} from "../../lib/elsJourney.js";
import { findingColorChoices, nextFindingColor, projectFindingColor } from "./elsFindingColors2029.js";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import TzofenEmbed from "../TzofenEmbed.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { savedMatrixCanReanchor, savedMatrixMatchesAxis } from "../../lib/elsSavedMatrix.js";
import ElsSavePanel2029 from "./ElsSavePanel2029.jsx";
import { projectVerseWords, projectPresentation } from "./elsPresentation2029.js";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MOBILE_WORKSPACE_QUERY = "(max-width:980px), (pointer:coarse) and (hover:none)";
const isMobileWorkspace = () => window.matchMedia(MOBILE_WORKSPACE_QUERY).matches;

function MatrixSnapshot({ state, onLetterClick, onZoomChange, selectedLetterIndex, selectedFinding, visible, classicGlyphs, verseHighlight, presentation, presentationPlan, readingView }) {
  const palette = use2029Palette("research_lab");
  const matrix = state?.matrix;
  const geometry = state?.geometry;
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0, left: 0, top: 0, moved: false });
  const pinchRef = useRef(null);
  const zoomChangeRef = useRef(onZoomChange);
  zoomChangeRef.current = onZoomChange;

  useEffect(() => {
    const el = scrollRef.current;
    if (visible && el && state?.status === "ready") {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
      el.scrollTop = 0;
      return;
    }
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
  }, [visible, readingView, state?.status, state?.scope, state?.term, state?.axis?.hitId, state?.axis?.length, geometry?.r0, geometry?.r1, geometry?.c0, geometry?.cw]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!visible || !el) return undefined;
    const distance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
    const startPinch = (event) => {
      if (event.touches.length !== 2) return;
      const startDistance = distance(event.touches);
      if (!Number.isFinite(startDistance) || startDistance <= 0) return;
      event.preventDefault();
      const baseZoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
      pinchRef.current = { startDistance, baseZoom, liveZoom: baseZoom };
      dragRef.current.moved = true;
      el.classList.add("is-pinching");
    };
    const movePinch = (event) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const liveZoom = clamp(pinch.baseZoom * distance(event.touches) / pinch.startDistance, 0.5, 2.8);
      pinch.liveZoom = liveZoom;
      const grid = el.querySelector(".els29-native-matrix");
      if (!grid) return;
      const midpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midpointY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      const rect = grid.getBoundingClientRect();
      grid.style.transformOrigin = `${midpointX - rect.left}px ${midpointY - rect.top}px`;
      grid.style.transform = `scale(${liveZoom / pinch.baseZoom})`;
    };
    const finishPinch = (event) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches?.length >= 2) return;
      const grid = el.querySelector(".els29-native-matrix");
      if (grid) {
        grid.style.transform = "";
        grid.style.transformOrigin = "";
      }
      pinchRef.current = null;
      el.classList.remove("is-pinching");
      dragRef.current.suppressClickUntil = Date.now() + 400;
      if (Math.abs(pinch.liveZoom - pinch.baseZoom) > 0.03) zoomChangeRef.current?.(pinch.liveZoom);
      window.setTimeout(() => { dragRef.current.moved = false; }, 400);
    };
    el.addEventListener("touchstart", startPinch, { passive: false });
    el.addEventListener("touchmove", movePinch, { passive: false });
    el.addEventListener("touchend", finishPinch, { passive: false });
    el.addEventListener("touchcancel", finishPinch, { passive: false });
    return () => {
      el.removeEventListener("touchstart", startPinch);
      el.removeEventListener("touchmove", movePinch);
      el.removeEventListener("touchend", finishPinch);
      el.removeEventListener("touchcancel", finishPinch);
      const grid = el.querySelector(".els29-native-matrix");
      if (grid) { grid.style.transform = ""; grid.style.transformOrigin = ""; }
      el.classList.remove("is-pinching");
      pinchRef.current = null;
    };
  }, [visible, state?.axis?.hitId, state?.ui?.zoom]);

  const markMap = useMemo(() => {
    const map = new Map();
    for (const mark of matrix?.marks || []) map.set(Number(mark.i), mark.type === "finding" ? { ...mark, color: projectFindingColor(mark.color, palette) } : mark);
    return map;
  }, [matrix?.marks, palette]);
  const sourceMap = useMemo(() => new Map((matrix?.sourceMarks || []).map((mark) => [Number(mark.i), {
    ...mark, type: "source", color: projectFindingColor(mark.color, palette),
  }])), [matrix?.sourceMarks, palette]);
  const findingTargetMap = useMemo(() => {
    const targets = new Map();
    for (const finding of state?.findings || []) {
      const color = projectFindingColor(finding.color, palette);
      for (const hit of [...(finding.hits || []), ...(finding.sourceHits || [])]) {
        if (!hit?.shown || hit.withinRadius === false || (!hit.verified && hit.kind !== "source-sequence")) continue;
        const anchor = parseElsHitKey(hit.hitId);
        if (!anchor || !Number.isInteger(anchor.start) || !Number.isInteger(anchor.skip) || anchor.skip < 1) continue;
        for (let offset = 0; offset < Array.from(finding.t).length; offset += 1) {
          const index = anchor.start + anchor.dir * anchor.skip * offset;
          const entries = targets.get(index) || [];
          entries.push({ term: finding.t, hitId: hit.hitId, hit, finding, color });
          targets.set(index, entries);
        }
      }
    }
    return targets;
  }, [state?.findings, palette]);

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
    className="els29-native-matrix-scroll"
    role="region"
    tabIndex={0}
    aria-label={state?.status === "ready" ? "טקסט התורה מבראשית, ללא צופן נבחר" : `מטריצת ELS עבור ${state.termRaw || state.term || "המונח הפעיל"}`}
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
      {state?.status === "ready" ? "תחילת ספר בראשית ברצף אותיות, ללא צופן או ממצא נבחר." : `${state.termRaw || state.term || "מונח פעיל"} · דילוג ${state?.axis?.skip ?? "לא ידוע"} · כיוון ${directionLabel(state?.axis?.direction)} · ${markSummary.axis} אותיות ציר מסומנות · ${markSummary.findings} אותיות ממצאים מסומנות. אפשר להשתמש בכפתור מקור הממצא כדי לקרוא את הפסוקים במקלדת.`}
    </span>
    {readingView ? <p className="els29-native-reading-note" dir="rtl">
      רצף המקור בשורות רחבות · {state?.axis?.direction === "back" ? "קוראים את הסימון משמאל לימין, מלמטה למעלה" : "קוראים את הסימון מימין לשמאל, מלמעלה למטה"}
    </p> : null}
    <div
      className={`els29-native-matrix${fit ? " is-fit" : ""}${readingView ? " is-reading" : ""}${classicGlyphs ? " is-classic-glyphs" : ""}${state?.ui?.niqqud ? " is-niqqud" : ""}`}
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
            const revealAt = presentationPlan.earliest.get(index);
            const concealed = presentation && revealAt != null && revealAt > presentation.index;
            const sourceMark = concealed ? null : sourceMap.get(index);
            const mark = concealed ? null : markMap.get(index) || sourceMark;
            const verseParity = verseHighlight?.parity.get(index);
            const active = !!mark && activeFinding?.indices.has(index);
            const heat = mark ? 0 : heatMap.get(index) || 0;
            const classes = [
              "els29-native-cell",
              verseParity != null ? "is-verse-word" : "",
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
              data-verse-word={verseParity}
              data-present-concealed={concealed ? "true" : undefined}
              title={sourceMark ? `רצף מקור: ${sourceMark.term} · הצג פסוק` : "הצג מקור ופסוק"}
              onClick={(event) => {
                if (dragRef.current.moved || Date.now() < (dragRef.current.suppressClickUntil || 0)) return;
                const targets = mark?.type === "finding" ? findingTargetMap.get(index) || [] : [];
                const findingTarget = targets.find((target) => target.hitId === selectedFinding?.hitId)
                  || targets.find((target) => target.color === mark?.color)
                  || targets[0]
                  || null;
                onLetterClick?.({
                  index,
                  letter,
                  mark,
                  findingTarget,
                  point: { x: event.clientX, y: event.clientY },
                });
              }}
              style={{
                ...(verseParity != null ? { "--els29-verse-color": palette.matrix.findings[verseParity === 0 ? 1 : 4].color } : {}),
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

function FindingActionMenu({ action, researchProfile, pending, journeyBusy, onClose, onScan, onSource, onPromote, onDetails, onHide }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const first = dialog?.querySelector("button:not(:disabled)");
    first?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [action?.finding?.t, action?.hit?.hitId]);

  if (!action) return null;
  const { finding, hit, point } = action;
  const target = { term: finding.t, hitId: hit.hitId, ...(hit.kind === "source-sequence" ? { kind: "source-sequence" } : {}) };
  const style = { "--els29-menu-x": `${point.x}px`, "--els29-menu-y": `${point.y}px`, "--els29-mark": action.color };
  return <div className="els29-native-finding-menu-layer" onPointerDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={`פעולות על ${finding.t}`}
      className="els29-native-finding-menu" style={style} data-els-finding-menu-profile={researchProfile ? "research" : "classic"}>
      <header>
        <i aria-hidden="true" />
        <span><small>{researchProfile ? "ממצא במחקר" : "ממצא במטריצה"}</small><strong>{finding.t}</strong></span>
        <button type="button" onClick={onClose} aria-label="סגור פעולות ממצא">×</button>
      </header>
      <p>{hit.kind === "source-sequence" ? "רצף מקור ללא דילוג" : `דילוג ${hit.skip}`} · מרחק {hit.axisDistance} תאים מהציר הראשי</p>
      <div className="els29-native-finding-menu-main" role="group" aria-label={`פעולות מהירות על ${finding.t}`}>
        <button type="button" className="is-primary" disabled={pending} onClick={() => { onClose();onScan(target); }}>המשך הציר</button>
        <button type="button" disabled={pending} onClick={() => { onClose();onSource(target); }}>מקור ופסוק</button>
        {researchProfile ? <button type="button" className="is-research" disabled={pending || journeyBusy || !hit.verified}
          onClick={() => { onClose();onPromote(finding, hit.hitId); }}>הפוך לציר ראשי</button> : null}
        <button type="button" onClick={() => { onClose();onDetails(finding.t); }}>פרטים ועריכה</button>
      </div>
      <details>
        <summary>אפשרויות נוספות</summary>
        <button type="button" disabled={pending} onClick={() => { onClose();onHide(finding.t, hit); }}>הסתר מופע זה מהמטריצה</button>
        <small>מחיקה, שינוי צבע ובחירת מופעים נוספים זמינים ב״פרטים ועריכה״.</small>
      </details>
    </section>
  </div>;
}

function SavedMatrixLoadProgress({ matrix, state }) {
  const phase = state?.status === "ready"
    ? "מאתר את הציר השמור במקור…"
    : state?.verification?.state && state.verification.state !== "MATCH"
      ? "מאמת את המופע והעוגנים…"
      : "משחזר את הציר, הממצאים והמקור…";
  return <section className="els29-native-saved-loading" role="status" aria-live="polite" aria-busy="true" data-els-saved-loading="true">
    <div>
      <span aria-hidden="true">✦</span>
      <strong>פותח את {matrix?.title || matrix?.search_term || "הצופן השמור"}</strong>
      <small>{phase}</small>
      <progress aria-label="טעינת הצופן השמור" />
      <small>אין צורך לחפש מחדש. המסך ייפתח אוטומטית על המטריצה שנשמרה.</small>
    </div>
  </section>;
}

function MatrixControls({ state, onControl, onContext, busy }) {
  const active = !busy && state?.status === "ok" && state?.verification?.state === "MATCH";
  const cross = Boolean(state?.search?.results?.items?.length);
  const count = Number(cross ? state.search.zones : state?.search?.occurrences?.total ?? state?.occurrence?.count) || 0;
  const index = Number(cross ? state.search.zoneIndex : state?.search?.occurrences ? state.search.occurrences.selectedOrdinal - 1 : state?.occurrence?.index) || 0;
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
      <small>מילים משפת התנ״ך ומהמחקר הזמין, בשני כיווני הקריאה · מועמדות לבדיקה בלבד</small>
      <div className="els29-native-line-words" aria-label="מילים מזוהות לאורך הציר">
        {words.map((word) => {
          const added = findings.some((finding) => finding.t === word.term);
          return <div key={word.term} className="els29-native-line-word">
            <button type="button" aria-pressed={selectedTerm === word.term} onClick={() => setSelectedTerm(word.term)}
              aria-label={`סמן את ${word.label} ברצף`}>
              <b>{word.label}</b><small>{word.matches.length} ברצף{word.matches.some(match => match.direction === -1) ? " · גם בקריאה הפוכה" : ""}</small>
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

function SourceLens({ lensResult, findings, onAddLineFinding, onOpenFinding, addingFinding, onHighlightVerse, verseHighlight }) {
  if (!lensResult) return <p className="els29-native-muted">לחצו על אות במטריצה כדי לראות את המקור שלה, או השתמשו ב״מקור הממצא״ לקריאה נגישה של פסוקי הציר.</p>;
  if (lensResult.ok === false) return <p className="els29-native-muted">{lensResult.lens === "matrix-candidates" ? "אי אפשר לסרוק את המטריצה לפני שהציר הראשי אומת." : "המקור לא זמין לתא הזה במצב הנוכחי."}</p>;

  if (lensResult.lens === "matrix-candidates") {
    const items = Array.isArray(lensResult.items) ? [...lensResult.items] : [];
    if (lensResult.ranking?.contract !== "els_research_candidate_ranking_v1") items.sort((a, b) => Number(a.distance) - Number(b.distance) || String(a.term).localeCompare(String(b.term), "he"));
    const lexiconCounts = lensResult.lexicon?.counts;
    return <div className="els29-native-source-list els29-native-matrix-candidates" data-experience-capability="els-all-matrix-findings">
      <strong>ממצאים קרובים עם המשך · {items.length}</strong>
      <small>הקרובים תמיד ראשונים. באותו מרחק ניתנת קדימות לממצא מאומת, למחקר גלוי, למונח יסוד מבוקר וליותר המשכים; „אמת והוסף” עדיין מפעיל אימות קנוני.</small>
      <small>המילון נבנה בעת הלחיצה משפת התנ״ך, מהמחקר הגלוי ומהממצאים שכבר אומתו.</small>
      {lexiconCounts ? <small>{lexiconCounts.total} מונחים זמינים · {lexiconCounts.corpus} מהקורפוס · {lexiconCounts.research} מהמחקר{lensResult.lexicon?.fallback ? " · מקור הפסוקים לא נטען ולכן הרשימה חלקית" : ""}</small> : null}
      <div className="els29-native-line-words els29-native-candidate-list" role="region" tabIndex={0} aria-label="ממצאים קרובים עם המשך, מהקרוב לרחוק">
        {items.map((item) => {
          const addedFinding = findings.find((finding) => finding.t === item.term);
          const openHit = [...(addedFinding?.hits || []), ...(addedFinding?.sourceHits || [])]
            .find((hit) => (hit.verified || hit.kind === "source-sequence") && hit.shown && hit.withinRadius !== false);
          const added = Boolean(addedFinding);
          const label = item.label || item.term;
          const rankNote = Array.isArray(item.ranking?.reasons) ? item.ranking.reasons.slice(0, 2).join(" · ") : "";
          return <div key={item.term} className="els29-native-line-word">
            {openHit ? <button type="button" className="els29-native-discovered-term"
              onClick={() => onOpenFinding({ term: item.term, hitId: openHit.hitId, ...(openHit.kind === "source-sequence" ? { kind: "source-sequence" } : {}) })}
              aria-label={`פתח את המשך הציר של ${label}`}>
              <b>{label}</b><small>מרחק {item.distance} תאים{rankNote ? ` · ${rankNote}` : ""} · לחצו להמשך הציר</small>
            </button> : <div className="els29-native-discovered-term"><b>{label}</b><small>מרחק {item.distance} תאים{rankNote ? ` · ${rankNote}` : ""} · {added ? "האימות עדיין נמשך" : `המשך: ${(item.continuations || []).slice(0, 3).map((word) => word.label || word.term).join(" · ")}`}</small></div>}
            <button type="button" disabled={addingFinding || (added ? !openHit : findings.length >= 12)}
              onClick={() => openHit
                ? onOpenFinding({ term: item.term, hitId: openHit.hitId, ...(openHit.kind === "source-sequence" ? { kind: "source-sequence" } : {}) })
                : onAddLineFinding(item.term)}
              aria-label={openHit ? `הצג את המשך הציר של ${label}` : `הוסף את ${label} מהמטריצה לממצאים`}>
              {openHit ? "המשך הציר" : added ? "מאמת…" : "אמת והוסף"}
            </button>
          </div>;
        })}
      </div>
      {!items.length ? <p className="els29-native-muted">לא נמצאו בחלון הזה ממצאים קרובים שיש להם המשך ציר מוכר.</p> : null}
      {lensResult.truncated ? <small>נבדקו {lensResult.scanned} מועמדים בעלי קדימות מחקרית מתוך {lensResult.available}. הרשימה המוצגת עדיין מסודרת מהקרוב לרחוק.</small> : null}
      {findings.length >= 12 && items.some((item) => !findings.some((finding) => finding.t === item.term))
        ? <small>אפשר לראות את כל הרשימה, אך במטריצה פעילה נשמרים עד 12 ממצאים משניים. הסירו ממצא כדי לאמת ולהוסיף אחר.</small> : null}
    </div>;
  }

  if (lensResult.lens === "letter-context") {
    return <div className="els29-native-source-card">
      <div className="els29-native-source-letter">{lensResult.letter || "א"}</div>
      <div>
        <strong>{lensResult?.location?.ref || lensResult?.verse?.ref || "מקור"}</strong>
        <p>{lensResult?.verse?.text || "טקסט הפסוק נטען מהמנוע הקנוני."}</p>
        <button type="button" aria-pressed={verseHighlight?.from === lensResult?.verse?.from} onClick={() => onHighlightVerse(lensResult.verse)}>הדגש פסוק</button>
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
      {verses.map((verse) => <div key={verse.verseIndex}><p><b>{verse.ref}</b> · {verse.text}</p><button type="button" aria-label={`הדגש פסוק ${verse.ref}`} aria-pressed={verseHighlight?.from === verse.from} onClick={() => onHighlightVerse(verse)}>הדגש פסוק</button></div>)}
      {lensResult.truncated ? <small>מוצג חלק מטווח הפסוקים הארוך.</small> : null}
    </div>;
  }
  return null;
}

const STRUCTURE_PRESETS = Object.freeze({
  quick: { minLength: 4, maxLength: 8, maxDistance: 12, minMembers: 2, types: ["parallel", "motif", "corridor", "intersection", "cluster"] },
  broad: { minLength: 4, maxLength: 10, maxDistance: 40, minMembers: 2, types: ["parallel", "motif", "corridor", "intersection", "cluster"] },
  deep: { minLength: 5, maxLength: 12, maxDistance: 80, minMembers: 3, types: ["parallel", "motif", "corridor", "intersection", "cluster"] },
});
const STRUCTURE_TYPE_OPTIONS = Object.freeze([
  ["parallel", "מקבילות"], ["motif", "מוטיב חוזר"], ["corridor", "מסדרון ומה שבאמצע"], ["intersection", "חציות"], ["cluster", "אשכולות"],
]);
const STRUCTURE_ROLE_LABEL = Object.freeze({ parallel: "מקבילה", motif: "מופע חוזר", boundary: "גבול המסדרון", inside: "באמצע", intersection: "חוצה", cluster: "באשכול" });
const STRUCTURE_GUIDANCE = Object.freeze({
  parallel: { why: "כמה ממצאים נעים באותו חוק גיאומטרי ביחס לציר הראשי.", next: "אמתו את הקבוצה, ואז פתחו מקור והמשך ציר לכל ממצא כדי לבדוק אם גם ההקשר מתחבר." },
  motif: { why: "אותו רצף אותיות חזר בכמה צירים נפרדים באותו חלון. החזרה ראויה לבדיקה, אך אינה מוכיחה קשר לסיפור.", next: "אמתו והציגו את המילה, עברו בין המופעים וקראו את המשך הציר של כל אחד." },
  corridor: { why: "ממצא מקביל יוצר גבול שני, והמילים שביניהם יוצרות אזור מחקר משותף.", next: "אמתו את הקבוצה ובדקו תחילה את שני הגבולות, אחר כך את המילים שבאמצע." },
  intersection: { why: "הממצאים חולקים תא ממשי עם הציר הראשי ולא רק נמצאים לידו.", next: "אמתו את הקבוצה ופתחו את המקור כדי לבדוק אם החיתוך נשאר משמעותי גם בקריאת הפסוקים." },
  cluster: { why: "כמה מועמדים מרוכזים באותו אזור במטריצה.", next: "אמתו רק את המילים הרלוונטיות, ואז השוו לסריקה רחבה יותר; צפיפות לבדה אינה חוזק סטטיסטי." },
});

function StructuralPriorityRail({ visible, state, lensResult, lensPending, busy, onRun, onScanAxis, onAddGroup, onOpenFinding }) {
  const findings = Array.isArray(state?.findings) ? state.findings : [];
  const verified = state?.status === "ok" && state?.verification?.state === "MATCH";
  const result = lensResult?.lens === "structure-priority" ? lensResult : null;
  const items = result?.ok && Array.isArray(result.items) ? result.items : [];
  const groups = result?.ok && Array.isArray(result.groups) ? result.groups : [];
  const axisTerm = result?.axis?.term || state?.termRaw || state?.term || "הציר הראשי";
  const axisSkip = result?.axis?.skip || state?.axis?.skip;
  const pending = lensPending || busy;
  const [plan, setPlan] = useState(STRUCTURE_PRESETS.quick);
  const choosePreset = (name) => setPlan({ ...STRUCTURE_PRESETS[name] });
  const updateNumber = (key, value) => setPlan((current) => {
    const next = { ...current, [key]: Number(value) };
    if (key === "minLength" && next.maxLength < next.minLength) next.maxLength = next.minLength;
    if (key === "maxLength" && next.minLength > next.maxLength) next.minLength = next.maxLength;
    return next;
  });
  const toggleType = (type) => setPlan((current) => {
    const selected = current.types.includes(type) ? current.types.filter((item) => item !== type) : [...current.types, type];
    return { ...current, types: selected.length ? selected : current.types };
  });
  const existing = new Set(findings.map((finding) => finding.t));

  return <div className="els29-native-workrail els29-native-structures" hidden={!visible}
    aria-label="מבנים וקשרים במטריצה" aria-busy={lensPending} data-experience-capability="els-structural-priority">
    <section className="els29-native-structure-intro">
      <span>ציר המחקר הנוכחי</span>
      <strong>{axisTerm}{axisSkip ? <> · דילוג <bdi>{axisSkip}</bdi></> : null}</strong>
      {result?.axis?.notable ? <small className="els29-native-structure-badge">דילוג מסודר: {result.axis.notable.tag}</small> : null}
      <p>בחרו פעם אחת מה לחפש. הסריקה מחזירה משפחות של מקבילות, מוטיבים חוזרים, מסדרונות, חציות ואשכולות — לא רשימת מילים שצריך לפתוח אחת־אחת.</p>
      <small>זו תוכנית בדיקה בתוך החלון המוצג — לא הוכחה ולא ציון אמת. כל קבוצה עוברת אימות קנוני אחד לפני הצגה במטריצה.</small>
      <div className="els29-native-structure-presets" role="group" aria-label="תבניות סריקת מבנים">
        <button type="button" aria-pressed={plan.maxDistance === 12 && plan.minLength === 4} onClick={() => choosePreset("quick")}>מהיר</button>
        <button type="button" aria-pressed={plan.maxDistance === 40 && plan.minLength === 4} onClick={() => choosePreset("broad")}>רחב</button>
        <button type="button" aria-pressed={plan.maxDistance === 80 && plan.minLength === 5} onClick={() => choosePreset("deep")}>עמוק</button>
      </div>
      <details className="els29-native-structure-settings">
        <summary>הגדרות הסריקה</summary>
        <div className="els29-native-structure-fields">
          <label>מינימום אותיות<select aria-label="מינימום אותיות" value={plan.minLength} onChange={(event) => updateNumber("minLength", event.target.value)}>
            {[3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value}</option>)}
          </select></label>
          <label>מקסימום אותיות<select aria-label="מקסימום אותיות" value={plan.maxLength} onChange={(event) => updateNumber("maxLength", event.target.value)}>
            {[4, 5, 6, 7, 8, 10, 12, 16].map((value) => <option key={value} value={value}>{value}</option>)}
          </select></label>
          <label>מרחק מרבי מהציר<select aria-label="מרחק מרבי מהציר" value={plan.maxDistance} onChange={(event) => updateNumber("maxDistance", event.target.value)}>
            <option value={12}>קרוב · 12 תאים</option><option value={30}>בינוני · 30 תאים</option><option value={40}>רחב · 40 תאים</option><option value={80}>עמוק · 80 תאים</option><option value={120}>מרבי · 120 תאים</option>
          </select></label>
          <label>מינימום ממצאים בקבוצה<select aria-label="מינימום ממצאים בקבוצה" value={plan.minMembers} onChange={(event) => updateNumber("minMembers", event.target.value)}>
            {[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
          </select></label>
        </div>
        <fieldset className="els29-native-structure-types"><legend>סוגי המבנים</legend>
          {STRUCTURE_TYPE_OPTIONS.map(([type, label]) => <label key={type}><input type="checkbox" checked={plan.types.includes(type)} onChange={() => toggleType(type)} />{label}</label>)}
        </fieldset>
        <small>הטווח נשאר מוגבל למטריצה הפעילה. „עמוק” אינו מפעיל סדרות דילוג או חוקי מספרים חדשים.</small>
      </details>
      <div className="els29-native-structure-actions" role="group" aria-label="פעולות מבנה על הציר הראשי">
        <button type="button" className="is-primary" disabled={!verified || pending}
          onClick={() => onRun({ hitId: state?.axis?.hitId, structurePlan: plan })}>{lensPending ? "סורק את התוכנית…" : result ? "סרוק את התוכנית מחדש" : "סרוק מבנים בעדיפות"}</button>
        <button type="button" disabled={!verified || pending}
          onClick={() => onScanAxis({ hitId: state?.axis?.hitId })}>בדוק את המשך הציר</button>
      </div>
    </section>
    {lensPending ? <p role="status" className="els29-native-muted">סורק את החלון המוצג ומסדר את הקשרים המבניים…</p> : null}
    {result?.ok === false ? <p role="status" className="els29-native-muted">אי אפשר לסרוק מבנים לפני שהציר הראשי אומת.</p> : null}
    {result?.ok ? <>
      <div className="els29-native-structure-summary">
        <strong>קבוצות שנמצאו · {groups.length}</strong>
        <small>{result.structurePlan?.minLength}–{result.structurePlan?.maxLength} אותיות · עד {result.structurePlan?.maxDistance} תאים · לפחות {result.structurePlan?.minMembers} ממצאים בקבוצה.</small>
        <small>הסדר כאן נפרד מרשימת „הקרובים”: משפחת המבנה קודמת, אחריה עדות מחקרית קיימת, ורק אז מרחק.</small>
      </div>
      <div className="els29-native-line-words els29-native-structure-list" role="region" tabIndex={0} aria-label="קבוצות מבניות לפי סדר עדיפות">
        {groups.map((group, index) => {
          const members = Array.isArray(group.members) ? group.members : [];
          const room = Math.max(0, 12 - findings.length);
          const groupTerms = [...new Set(members.map((member) => member.term))];
          const addable = groupTerms.filter((term) => !existing.has(term)).slice(0, room);
          const allAdded = groupTerms.length > 0 && groupTerms.every((term) => existing.has(term));
          const guidance = STRUCTURE_GUIDANCE[group.kind] || STRUCTURE_GUIDANCE.cluster;
          return <article key={`${group.kind}-${group.label}-${index}`} className="els29-native-structure-group" data-structure-kind={group.kind}>
            <header><div><strong>{group.label}</strong><small>{group.description}</small></div><bdi>{members.length}</bdi></header>
            <div className="els29-native-structure-members" aria-label={`ממצאי ${group.label}`}>
              {members.map((member, memberIndex) => <span key={`${member.term}-${member.role}-${member.occurrenceOrdinal || memberIndex}`} className={existing.has(member.term) ? "is-added" : ""}>
                <b>{member.label || member.term}</b><small>{STRUCTURE_ROLE_LABEL[member.role] || "במבנה"}{member.occurrenceOrdinal ? ` ${member.occurrenceOrdinal}` : ""} · מרחק {member.distance}</small>
              </span>)}
            </div>
            <div className="els29-native-structure-guidance"><p><strong>למה לבדוק:</strong> {guidance.why}</p><p><strong>הצעד הבא:</strong> {guidance.next}</p></div>
            <button type="button" disabled={pending || (!addable.length && !(group.kind === "motif" && allAdded))}
              onClick={() => group.kind === "motif" && allAdded ? onOpenFinding(groupTerms[0]) : onAddGroup(addable)}
              aria-label={group.kind === "motif" && allAdded ? `פתח את הממצא החוזר ${groupTerms[0]}` : `אמת והצג את קבוצת ${group.label}`}>
              {pending ? "מאמת קבוצה…" : group.kind === "motif" && allAdded ? "פתח את הממצא החוזר" : allAdded ? "הקבוצה כבר במטריצה" : !room ? "הסירו ממצא כדי להוסיף קבוצה" : `אמת והצג קבוצה · ${addable.length}`}
            </button>
          </article>;
        })}
      </div>
      {!groups.length ? <p className="els29-native-muted">נמצאו {items.length} מועמדים יחידים, אך אף קבוצה לא עמדה בתוכנית. נסו מרחק רחב יותר או מינימום קטן יותר לקבוצה.</p> : null}
      {result.truncated ? <small>הרשימה הגיעה לתקרת הבטיחות. מוצגות הקבוצות הראשונות לפי סדר העדיפות שנקבע מראש.</small> : null}
      {result.lexicon?.fallback ? <small>מקור הפסוקים לא נטען, ולכן הסריקה השתמשה במילון המחקר הזמין בלבד.</small> : null}
    </> : null}
  </div>;
}

function SearchProgress({ operation, onCancel, reduction = null, onReduce }) {
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
  const phaseLabel = operation.status === "verifying" || progress?.phase === "verify"
    ? "מאמת את המופעים מול המנוע הקנוני…"
    : progress?.phase === "cross"
      ? "סורק מפגשים סביב הצירים…"
      : progress?.phase === "findings"
        ? "מאתר את המילה בחלון המטריצה…"
        : progress?.phase === "discover"
          ? "סורק מועמדים בקורפוס…"
          : "מכין את החיפוש…";
  const progressLabel = progress?.phase === "cross" ? "מיקומי ציר שנבדקו" : "מועמדים שנבדקו ואומתו";
  const remaining = progress?.completed >= 8 && progress.completed < progress.total && progress.phaseElapsedMs >= 500
    ? Math.ceil(progress.phaseElapsedMs / progress.completed * (progress.total - progress.completed) / 1000) : null;
  return <div className="els29-native-progress" aria-label={operation.kind === "findings" ? "התקדמות חיפוש משני" : "התקדמות החיפוש"}>
    <div><strong role="status" aria-live="polite">{phaseLabel}</strong>
      <small aria-hidden="true">עברו {elapsed.toFixed(1)} שניות · {remaining === null ? "זמן הסיום עדיין לא ידוע" : `הערכה: עוד כ־${remaining} שניות לסריקת הצירים`}</small>
      {progress?.total > 0 ? <><progress max={progress.total} value={progress.completed} aria-label={progressLabel} /><small>נבדקו {progress.completed} מתוך {progress.total} בסריקה הזאת</small></>
        : <progress aria-label={phaseLabel} />}
      {elapsed >= 8 ? <small>הסריקה עדיין פעילה והמונה ממשיך להתעדכן. אפשר להמתין גם לחיפוש ארוך או לעצור בלי לאבד את המטריצה הקודמת.</small> : null}
    </div>
    <span className="els29-native-progress-actions">
      {elapsed >= 8 && reduction && onReduce ? <button type="button" onClick={onReduce}>{reduction.label}</button> : null}
      <button type="button" onClick={onCancel}>{operation.kind === "findings" ? "בטל חיפוש משני" : "בטל חיפוש"}</button>
    </span>
  </div>;
}

function LensProgress({ request, progress, onCancel, reduction = null, onReduce }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!request) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [request?.target?.nativeSeq]);
  if (!request) return null;
  const elapsed = Math.max(0, now - (request.startedAt || now)) / 1000;
  const label = request.lens === "structure-priority"
    ? progress?.phase === "groups" ? "בונה את קבוצות המבנים וההמלצות…" : progress?.phase === "candidates" ? "סורק את מונחי התורה בחלון המוצג…" : "טוען את מילון התורה ומכין סריקת מבנים…"
    : request.lens === "result-triage"
      ? progress?.completed ? "ממיין את כל התוצאות ומחפש המשכים מדויקים…" : "טוען את שפת התורה ומכין מיון תוצאות…"
    : request.lens === "matrix-candidates"
      ? "בודק ממצאים קרובים ואת המשך הצירים…"
      : request.lens === "line-context" && request.target?.scan
        ? "קורא את המשך הציר ומזהה מילים…"
        : ["verse-context", "letter-context"].includes(request.lens)
          ? "טוען את המקור והפסוק…"
          : "מכין את תוצאת המחקר…";
  return <div className="els29-native-progress" aria-label="התקדמות בדיקת הממצא">
    <div><strong role="status" aria-live="polite">{label}</strong>
      <small aria-hidden="true">עברו {elapsed.toFixed(1)} שניות · הבדיקה עדיין פעילה</small>
      {progress?.total > 0 ? <><progress max={progress.total} value={progress.completed} aria-label={label} /><small>{progress.completed} מתוך {progress.total} מונחים נבדקו</small></> : <progress aria-label={label} />}
      {elapsed >= 8 ? <small>אפשר להמשיך להמתין או לעצור. עצירה אינה משנה את הציר, הממצאים או המטריצה.</small> : null}
    </div>
    <span className="els29-native-progress-actions">
      {elapsed >= 8 && reduction && onReduce ? <button type="button" onClick={onReduce}>{reduction.label}</button> : null}
      <button type="button" onClick={onCancel}>עצור בדיקה</button>
    </span>
  </div>;
}

function ResultTriageSummary({ result, pending }) {
  if (pending) return <div className="els29-native-triage-summary" role="status"><strong>ממיין את התוצאות…</strong><small>בודק המשך מדויק, מילים נוספות על אותו ציר וסימני מבנה. אפשר לעצור בלי לשנות את המטריצה.</small></div>;
  if (!result?.ok) return null;
  const recommended = (result.items || []).filter((item) => item.tier === "recommended");
  return <div className="els29-native-triage-summary" data-els-result-triage={result.contract}>
    <strong>{recommended.length ? `${recommended.length} תוצאות שכדאי לפתוח קודם` : "המיון הושלם"}</strong>
    <small>זהו סדר עדיפות לבדיקה, לא ציון אמת. כל התוצאות נשארות זמינות.</small>
    {result.lexicon?.fallback ? <small>שפת המקור לא נטענה במלואה ולכן בדיקת ההמשך חלקית.</small> : null}
  </div>;
}

function ResultTriageNote({ row }) {
  if (!row) return null;
  const extensions = (row.signals || []).flatMap((signal) => signal.extensions || []);
  return <>
    <small className={`els29-native-triage-rank is-${row.tier}`}>{row.tier === "recommended" ? `מומלץ לפתוח קודם · מקום ${row.rank}` : row.tier === "inspect" ? `מעניין לבדיקה · מקום ${row.rank}` : `זמין לבדיקה · מקום ${row.rank}`}</small>
    <small>{(row.reasons || []).slice(0, 3).join(" · ")}</small>
    {extensions.length ? <small>הרחבות: {[...new Set(extensions.map((item) => item.label || item.term))].slice(0, 3).join(" · ")}</small> : null}
  </>;
}

function RegularResultsRail({ state, pending, operation, visible, onSelect, onRetry, onContinue, triageResult, triagePending }) {
  const results = state?.search?.occurrences;
  const blocked = pending || ["empty", "error", "cancelled"].includes(operation?.status);
  const items = blocked ? [] : results?.items || [];
  const triage = triageResult?.kind === "regular" && triageResult?.setId === results?.id && Number(triageResult?.page) === Number(results?.page) ? triageResult : null;
  const triageByKey = new Map((triage?.items || []).map((item) => [item.key, item]));
  const orderedItems = triage ? [...items].sort((a, b) => (triageByKey.get(a.hitId)?.rank || Number.MAX_SAFE_INTEGER) - (triageByKey.get(b.hitId)?.rank || Number.MAX_SAFE_INTEGER)) : items;
  return <div className="els29-native-workrail els29-native-results" hidden={!visible} aria-label="רשימת תוצאות החיפוש" aria-busy={pending}>
    <strong>{pending ? "מחפש מופעים…" : items.length ? `${results.total} מופעים מאומתים` : "תוצאות החיפוש"}</strong>
    <p className="els29-native-muted">{items.length ? state?.termRaw || state?.term : operation?.payload?.term || state?.termRaw || state?.term} · {scopeLabel(items.length ? state?.scope : operation?.payload?.scope || state?.scope)}</p>
    {items.length ? <>
      <small>בחרו מופע לפתיחת המטריצה שלו. מוצגים רק מופעים שעברו אימות.</small>
      {results.capped ? <small>הסריקה מוגבלת; זאת רשימת המופעים שנמצאו בסריקה הזאת, ולא כל המופעים האפשריים.</small> : null}
      {results.ordered?.completeThrough >= 2 ? <small>הושלמה סריקה בשני הכיוונים בדילוגים 2–{results.ordered.completeThrough}. הדילוגים שמעבר לכך עדיין חלקיים.</small> : null}
      {results.ordered?.error ? <small role="status">סריקת הדילוגים הקטנים לא הושלמה. אפשר להמשיך אותה כאן.</small> : null}
      <ResultTriageSummary result={triage} pending={triagePending} />
      {!results.ordered || results.ordered.error || results.ordered.hasMore || results.ordered.max < 500 ? <button type="button" disabled={pending} onClick={() => onContinue(results.id)}>
        {results.ordered?.hasMore ? `המשך מופעים בדילוגים ${results.ordered.min}–${results.ordered.max}` : results.ordered?.error ? "נסה שוב סריקת דילוגים" : `המשך סריקה מסודרת עד דילוג ${Math.min(500,(results.ordered?.max || 0)+50)}`}
      </button> : <small>הסריקה המסודרת הושלמה עד דילוג 500. מעבר לכך מוצגים ממצאי הסריקה המוגבלת.</small>}
      <div className="els29-native-results-pages" role="group" aria-label="עמודי תוצאות">
        <button type="button" disabled={results.page === 0} onClick={() => onSelect("occurrence-page", { setId: results.id, page: results.page - 1 })}>עמוד קודם</button>
        <span>עמוד <bdi>{results.page + 1} / {Math.ceil(results.total / results.pageSize)}</bdi></span>
        <button type="button" disabled={(results.page + 1) * results.pageSize >= results.total} onClick={() => onSelect("occurrence-page", { setId: results.id, page: results.page + 1 })}>עמוד הבא</button>
      </div>
      <div className="els29-native-result-list" role="region" aria-label="תוצאות מדורגות לפתיחה">
        {orderedItems.map((item) => <button type="button" key={item.hitId} className="els29-native-result" data-triage-tier={triageByKey.get(item.hitId)?.tier || undefined} aria-label={`פתח מופע ${item.ordinal}`} aria-pressed={state.axis?.hitId === item.hitId}
          onClick={() => onSelect("occurrence-select", { setId: results.id, index: item.index, hitId: item.hitId })}>
          <b>{item.ordinal}. דילוג <bdi>{item.direction === "back" ? "−" : ""}{item.skip}</bdi></b>
          <span>{item.ref || item.book}</span><small>{directionLabel(item.direction)}</small>
          <ResultTriageNote row={triageByKey.get(item.hitId)} />
        </button>)}
      </div>
    </> : <p role="status">{pending ? "התוצאות יופיעו כאן בסיום החיפוש והאימות." : operation?.status === "error" ? operation.message || "החיפוש או האימות לא הושלמו. נסו שוב." : operation?.status === "cancelled" ? "החיפוש בוטל." : operation?.status === "empty" ? "לא נמצאו מופעים מאומתים בסריקה הזאת. אפשר לשנות מונח או היקף ולנסות שוב." : "חפשו מונח כדי לראות כאן את המופעים שלו."}</p>}
    {["error", "empty", "cancelled"].includes(operation?.status) ? <button type="button" onClick={onRetry}>נסה שוב</button> : null}
  </div>;
}

function CrossResultsRail({ state, pending, outcome, visible, onSelect, onContinue, onRetry, triageResult, triagePending }) {
  const [sort, setSort] = useState("rank");
  const [page, setPage] = useState(0);
  const [minSkip, setMinSkip] = useState("");
  const [maxSkip, setMaxSkip] = useState("");
  const results = state?.search?.results;
  const items = pending || ["empty", "error", "cancelled"].includes(outcome) ? [] : (results?.items || []).filter((item) => item.available);
  const triage = triageResult?.kind === "cross" && triageResult?.setId === results?.id ? triageResult : null;
  const triageByKey = new Map((triage?.items || []).map((item) => [String(item.key), item]));
  useEffect(() => { setMinSkip(""); setMaxSkip(""); }, [results?.id]);
  useEffect(() => { setPage(0); }, [results?.id, sort, minSkip, maxSkip]);
  const shown = items.filter((item) => (!minSkip || item.skip >= Number(minSkip)) && (!maxSkip || item.skip <= Number(maxSkip)));
  shown.sort((a, b) => sort === "skip" ? a.skip - b.skip || a.index - b.index : sort === "distance" ? a.distance - b.distance || a.index - b.index
    : triage ? (triageByKey.get(String(a.index))?.rank || Number.MAX_SAFE_INTEGER) - (triageByKey.get(String(b.index))?.rank || Number.MAX_SAFE_INTEGER) : a.index - b.index);
  return <div className="els29-native-workrail els29-native-results" hidden={!visible} aria-label="רשימת מפגשי ההצלבה" aria-busy={pending}>
    <strong>{pending ? "מחפש מפגשים…" : items.length ? `${items.length} מפגשי הצלבה` : "תוצאות הצלבה"}</strong>
    {items.length ? <>
      <p className="els29-native-muted">{state.search.crossA} × {state.search.crossB}</p>
      {state.search.coverage?.truncated ? <small>סריקה מוגבלת: נבדקו {state.search.coverage.scanned} מתוך {state.search.coverage.available} מיקומי הציר שנמצאו. רשימת הצירים עצמה עשויה להיות חלקית.</small> : null}
      <ResultTriageSummary result={triage} pending={triagePending} />
      <details><summary>מיון וסינון</summary>
      <label>מיון <select aria-label="מיון מפגשי ההצלבה" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="rank">{triage ? "עדיפות לבדיקה" : "סדר המנוע"}</option><option value="skip">דילוג: מקטן לגדול</option><option value="distance">מרחק מהציר</option>
      </select></label>
      <div className="els29-native-results-filter">
        <label>דילוג מ־<input aria-label="דילוג מינימלי בתוצאות" type="number" min="2" value={minSkip} onChange={(event) => setMinSkip(event.target.value)} /></label>
        <label>עד<input aria-label="דילוג מרבי בתוצאות" type="number" min="2" value={maxSkip} onChange={(event) => setMaxSkip(event.target.value)} /></label>
      </div>
      <small>מציג {shown.length} מתוך {items.length} בחיפוש המוגבל הזה. בחירת מפגש פותחת את הציר ובודקת את הממצאים.</small>
      </details>
      {state.search.coverage?.canContinue ? <button type="button" disabled={pending} onClick={() => onContinue(results.id)}>המשך סריקת צירים</button> : null}
      {shown.length > 40 ? <div className="els29-native-results-pages" role="group" aria-label="עמודי מפגשים">
        <button type="button" disabled={page===0} onClick={() => setPage(value=>value-1)}>מפגשים קודמים</button>
        <span>עמוד {page+1} / {Math.ceil(shown.length/40)}</span>
        <button type="button" disabled={(page+1)*40>=shown.length} onClick={() => setPage(value=>value+1)}>מפגשים נוספים</button>
      </div> : null}
      <div className="els29-native-result-list" role="region" aria-label="מפגשים מדורגים לפתיחה">
        {shown.slice(page*40,(page+1)*40).map((item) => <button type="button" key={item.index} className="els29-native-result" data-triage-tier={triageByKey.get(String(item.index))?.tier || undefined} disabled={pending}
          aria-label={`פתח מפגש ${item.index + 1}`} aria-pressed={state.search.zoneIndex === item.index}
          onClick={() => onSelect("meeting-select", { setId: results.id, index: item.index })}>
          <b>{item.index + 1}. {item.axis} · דילוג {item.skip}</b>
          <span>{item.terms.join(" · ")}</span><small>{item.book} · מרחק בחיפוש {item.distance} תאים</small>
          <small>הערכת המנוע: {item.stars}/5</small>
          {item.sourceSequence ? <small>כולל התאמה ברצף המקור, ללא דילוג</small> : null}
          <ResultTriageNote row={triageByKey.get(String(item.index))} />
        </button>)}
      </div>
      {!shown.length ? <p>אין מפגשים בטווח הדילוגים הזה.</p> : null}
      {items.length === 1 ? <p className="els29-native-muted">נמצא מפגש אחד בחלון הזה. אפשר להגדיל את חלון החיפוש ולחפש שוב.</p> : null}
    </> : <p className="els29-native-muted">{outcome === "empty" ? "לא נמצא מפגש בחיפוש האחרון. אפשר להגדיל את החלון או לשנות מרחק ולחפש שוב." : outcome === "error" ? "ההצלבה או האימות לא הושלמו. נסו שוב." : outcome === "cancelled" ? "החיפוש בוטל." : pending ? "מפגשים מאומתים יופיעו כאן בסיום החיפוש." : "פתחו „הצלבה בין צירים” וחפשו שני מונחים כדי לקבל רשימה ממוספרת."}</p>}
    {["error", "cancelled"].includes(outcome) ? <button type="button" onClick={onRetry}>נסה שוב הצלבה</button> : null}
  </div>;
}

function FindingsRail({ onHighlightVerse, verseHighlight, activeTool, state, selected, lensResult, lensPending, operation, searchPending, onCancel, onScan, onSource, onDiscover, onSelectTarget, onAxisControl, onAddLineFinding, onFindingsChange, onFindingControl, researchProfile, canReplacePrimary, journeyBusy, onPromote, openDetails }) {
  const palette = use2029Palette("research_lab");
  const colorChoices = findingColorChoices(palette);
  const findings = Array.isArray(state?.findings) ? state.findings : [];
  const verified = state?.status === "ok" && state?.verification?.state === "MATCH";
  const showN = clamp(Math.round(Number(state?.ui?.showN) || 1), 1, 15);
  const radius = state?.ui?.findingRadius ?? null;
  const [draft, setDraft] = useState("");
  const [expandedFinding, setExpandedFinding] = useState(null);
  const railScrollRef = useRef(null);
  const workspaceRef = useRef(null);
  const findingPending = ["searching", "verifying"].includes(operation?.status);
  const pending = searchPending || findingPending;
  const allHits = (finding) => [...(finding?.hits || []), ...(finding?.sourceHits || [])];
  const eligible = (finding) => allHits(finding).filter((hit) => (hit.verified || hit.kind === "source-sequence") && hit.shown && hit.withinRadius !== false);
  const selectedFinding = selected?.term ? findings.find((finding) => finding.t === selected.term) : null;
  const selectedHit = eligible(selectedFinding).find((hit) => hit.hitId === selected?.hitId);
  const selectionValid = selected && selected.scope === state?.scope && selected.axisHitId === state?.axis?.hitId && selectedFinding && (selectedHit || findingPending);
  const selectedPromotionHit = selectedHit?.verified
    ? selectedHit
    : (selectedFinding?.hits || []).find((hit) => hit.verified && hit.shown && hit.withinRadius !== false);
  const target = selectionValid ? { term: selected.term, hitId: selected.hitId, ...(selectedHit?.kind === "source-sequence" ? { kind: "source-sequence" } : {}) } : { hitId: state?.axis?.hitId };
  const targetLabel = selectionValid ? selected.term : state?.termRaw || state?.term || "הציר הראשי";
  const targetReady = verified && !!target.hitId;
  const primaryTerm = state?.termRaw || state?.term || "הציר הראשי";
  const replacementCandidates = canReplacePrimary ? findings.map((finding) => ({
    finding,
    hit: eligible(finding).find((hit) => hit.verified),
  })).filter((candidate) => candidate.hit) : [];

  useEffect(() => {
    if (selected && !selectionValid) {
      onSelectTarget(null);
    }
  }, [selected, selectionValid, onSelectTarget]);

  useLayoutEffect(() => {
    if (!selectionValid || !workspaceRef.current) return;
    workspaceRef.current.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [selectionValid, selected?.term, selected?.hitId]);

  useLayoutEffect(() => {
    if (!openDetails?.term) return;
    const index = findings.findIndex((finding) => finding.t === openDetails.term);
    if (index < 0) return;
    setExpandedFinding(openDetails.term);
    const frame = requestAnimationFrame(() => {
      document.getElementById(`els29-finding-extra-${index}`)?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [openDetails?.seq, openDetails?.term]);

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

  return <div className="els29-native-unified-rail" hidden={activeTool === "results" || activeTool === "structures"}>
    <div ref={railScrollRef} className="els29-native-rail-scroll" hidden={activeTool === "research"}>
      <section ref={workspaceRef} className="els29-native-finding-workspace" aria-label="סביבת הממצא הנבחר">
        <header>
          <span>{selectionValid ? "ממצא נבחר" : "ציר המחקר הנוכחי"}</span>
          <strong>{targetLabel}</strong>
          <small>{selectionValid
            ? researchProfile
              ? "אפשר לסרוק את הרצף המדויק, לפתוח את המקור או לחקור ממנו כציר ראשי."
              : "אפשר לקרוא את המשך הציר המדויק, לפתוח את המקור או לערוך את הממצא."
            : "החיפוש והסריקה נשענים על הציר הראשי המאומת."}</small>
        </header>
        <div className="els29-native-target-actions" role="group" aria-label={`פעולות מחקר על ${targetLabel}`}>
          <button type="button" aria-label={researchProfile ? "סרוק לאורך הציר הנבחר" : "קרא את המשך הציר הנבחר"} disabled={!targetReady || lensPending || pending} onClick={() => onScan(target)}>
            {lensPending ? "טוען…" : researchProfile ? selectionValid ? "סרוק בתוך הממצא" : "סרוק לאורך הציר" : "המשך הציר"}
          </button>
          <button type="button" aria-label="מקור הממצא הנבחר" disabled={!targetReady || lensPending || pending} onClick={() => onSource(target)}>מקור ופסוק</button>
          {researchProfile && selectionValid ? <button type="button" className="is-promote" aria-label="הפוך לציר ראשי"
            disabled={pending || journeyBusy || !selectedPromotionHit?.hitId}
            onClick={() => onPromote(selectedFinding, selectedPromotionHit.hitId)}>חקור מתוך הממצא</button> : null}
        </div>
        {researchProfile && selectionValid ? <small className="els29-native-exact-return-note">הממצא יהפוך לציר הראשי; החזרה המדויקת לציר הנוכחי תישמר.</small> : null}
        <div className="els29-native-matrix-search">
          <label className="els29-native-secondary-label" htmlFor="els29-secondary-term">חיפוש מילה בכל המטריצה</label>
          <div className="els29-native-finding-add">
            <input id="els29-secondary-term" value={draft} onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFinding(); } }}
              disabled={!verified || pending || findings.length >= 12} maxLength={26}
              placeholder={verified ? "כתבו מילה נוספת…" : "התחילו בחיפוש ראשי"} aria-label="חיפוש משני במטריצה" />
            <button type="button" aria-label="חפש במטריצה" onClick={addFinding} disabled={!verified || pending || !clean(draft) || findings.length >= 12}>{pending ? "מחפש…" : "חפש"}</button>
          </div>
          <SearchProgress operation={operation} onCancel={onCancel} />
          <div className="els29-native-secondary-status" role="status" aria-live="polite" aria-busy={pending}>
            {searchPending ? "ממתין לסיום החיפוש הראשי…" : operation?.status === "searching" ? "מחפש את המילה במטריצה…" : operation?.status === "verifying" ? "בודק את המופעים שנמצאו…" : operation?.status === "error" ? operation.message || "החיפוש לא הושלם. נסו שוב." : operation?.status === "done" ? "החיפוש הושלם. הממצאים מופיעים ברשימה." : "החיפוש מתבצע במטריצה הנוכחית."}
          </div>
          {researchProfile ? <>
            <button type="button" className="els29-native-discover-all" aria-label="מצא ממצאים קרובים עם המשך"
              disabled={!verified || pending || lensPending} onClick={() => onDiscover({ hitId: state.axis.hitId })}>
              {lensPending ? "בודק המשכי צירים…" : "מצא קרובים עם המשך"}
            </button>
            <small className="els29-native-discover-note">זמין לכל צופה במצב מחקר. מתחיל רק בלחיצה, מציג רק ממצאים עם המשך ואינו משנה את הצופן השמור.</small>
          </> : null}
          <label className="els29-native-radius">
            <span>מרחק מרבי מהציר הראשי</span>
            <select aria-label="מרחק מרבי מהציר הראשי" value={radius === null ? "all" : radius} disabled={!verified || pending}
              onChange={(event) => onAxisControl("finding-radius", event.target.value === "all" ? null : Number(event.target.value))}>
              <option value="all">כל המרחקים בחלון</option>
              {[0, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100].map((value) => <option key={value} value={value}>{value === 0 ? "נוגע בציר · 0 תאים" : `עד ${value} תאים`}</option>)}
            </select>
          </label>
        </div>
        {lensPending || lensResult ? <details key={lensResult?.target?.nativeSeq || "pending"} className="els29-native-inline-inspection" open>
          <summary>{lensResult?.lens === "matrix-candidates" ? "ממצאים קרובים עם המשך" : lensResult?.lens === "line-context" ? (lensResult.scan ? "תוצאות סריקת הציר" : "המשך הציר") : lensPending ? "טוען…" : "מקור ופסוק"}</summary>
          {lensPending ? <p role="status">טוען את הציר הנבחר…</p> : <SourceLens onHighlightVerse={onHighlightVerse} verseHighlight={verseHighlight} lensResult={lensResult} findings={findings} onAddLineFinding={onAddLineFinding}
            onOpenFinding={(findingTarget) => { selectTarget(findingTarget.term, findingTarget.hitId);onScan(findingTarget); }} addingFinding={pending} />}
        </details> : null}
      </section>
      <div className="els29-native-rail-head"><strong>ממצאים במטריצה</strong><small>{findings.length}/12 משניים</small></div>
      <div className="els29-native-findings" role="region" tabIndex={0} aria-label="רשימת הממצאים במטריצה">
        {verified ? <div className={`els29-native-finding-group is-primary${!selectionValid ? " is-selected" : ""}`} style={{ "--els29-mark": palette.matrix.axis }} data-experience-capability="els-axis-actions">
          <div className="els29-native-finding">
            <button type="button" className="els29-native-finding-select" aria-label={`בחר ציר לסריקה: ${primaryTerm}`}
              aria-pressed={!selectionValid} disabled={searchPending} onClick={() => selectTarget("", state.axis.hitId)}>
              <i className="els29-native-color-dot" aria-hidden="true" />
              <span><b>{primaryTerm}</b><small>ציר ראשי · דילוג {state.axis?.skip}</small><small>מופע {state.search?.occurrences?.selectedOrdinal || (state.occurrence?.index || 0) + 1}/{state.search?.occurrences?.total || state.occurrence?.count || 1}</small></span>
            </button>
            {canReplacePrimary ? <button type="button" aria-label={`פעולות הציר הראשי ${primaryTerm}`} title="החלפת הציר הראשי"
              aria-expanded={expandedFinding === "__primary__"} aria-controls="els29-primary-axis-actions"
              onClick={() => setExpandedFinding((term) => term === "__primary__" ? null : "__primary__")}>⋯</button> : null}
          </div>
          {canReplacePrimary ? <div className="els29-native-finding-extra els29-native-axis-replacement" id="els29-primary-axis-actions" hidden={expandedFinding !== "__primary__"}>
            <strong>החלפת הציר הראשי</strong>
            <p>כדי למחוק את „{primaryTerm}” צריך לבחור ציר חלופי. לאחר האימות ייפתח חלון השמירה, והציר הישן יוסר מאותו צופן.</p>
            {replacementCandidates.length ? replacementCandidates.map(({ finding, hit }) => <button type="button" key={finding.t}
              disabled={pending || journeyBusy} aria-label={`החלף את הציר הראשי ${primaryTerm} ב־${finding.t}`}
              onClick={() => { setExpandedFinding(null);onPromote(finding, hit.hitId); }}>החלף ב־{finding.t}</button>)
              : <small>עדיין אין ממצא מאומת שיכול להחליף את הציר. חפשו או בחרו ממצא אחר תחילה.</small>}
          </div> : null}
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
              {allHits(finding).filter(hit => !hit.selectedOnly).map((hit, hitIndex) => <div className="els29-native-hit-actions" key={hit.hitId || `${hit.revision}:${hit.candidateIndex}`}>
                <label><input type="checkbox" disabled={pending} checked={hit.selected ?? hit.shown} onChange={() => onFindingControl(finding.t, "toggle-hit", hit.hitId, hit)} />
                  <span><b>מופע {hit.ordinal || hitIndex + 1} · {hit.shown ? (hit.verified || hit.kind === "source-sequence" ? "מוצג" : "בבדיקה") : hit.withinRadius === false && (hit.verified || hit.kind === "source-sequence") ? "מחוץ לטווח" : "מוסתר"}</b>
                    <small>{hit.kind === "source-sequence" ? `רצף מקור · מרחק ${hit.axisDistance} תאים` : hit.verified ? `דילוג ${hit.skip} · מרחק ${hit.axisDistance} תאים` : "מועמד לבדיקה"}</small></span>
                </label>
              </div>)}
              {finding.pageTotal > 1 ? <div className="els29-native-results-pages" role="group" aria-label={`עמודי מופעים של ${finding.t}`}>
                <button type="button" disabled={pending || finding.page === 0} onClick={() => onFindingControl(finding.t, "page", null, {revision:finding.revision || 0,candidateIndex:finding.page-1})}>מופעים קודמים</button>
                <span>עמוד {finding.page + 1} / {finding.pageTotal} · {finding.available} בטווח</span>
                <button type="button" disabled={pending || finding.page + 1 >= finding.pageTotal} onClick={() => onFindingControl(finding.t, "page", null, {revision:finding.revision || 0,candidateIndex:finding.page+1})}>מופעים נוספים</button>
              </div> : null}
              <div className="els29-native-system-colors" role="group" aria-label={`צבע הממצא ${finding.t}`}>
                {colorChoices.map((choice) => <button type="button" key={choice.label} aria-label={`צבע ${choice.label} לממצא ${finding.t}`} disabled={pending} aria-pressed={displayColor === choice.color}
                  onClick={() => changeFindingColor(index, choice.stored)} style={{ "--els29-mark": choice.color }}><i aria-hidden="true" /><span>{choice.label}</span>{displayColor === choice.color ? " ✓" : ""}</button>)}
              </div>
            </div>
          </div>;
        })}
      </div>
      <details className="els29-native-findings-options"><summary>אפשרויות תצוגת ממצאים</summary>
        <label className="els29-native-proximity"><span>מופעים להצגה לכל מילה <output>{showN}</output></span>
          <input type="range" min="1" max="15" step="1" value={showN} aria-label="מופעים לכל ממצא" disabled={!verified || pending}
            onChange={(event) => onAxisControl("finding-count", Number(event.target.value))} />
        </label>
      </details>
    </div>
  </div>;
}

export default function ElsNativeClassic2029({ initialSeed = "", matrix = null, active = true, researchProfile = true, researchLoad = null, researchProbe = null, onResearchProbeResult, onResearchLoadError, onSearchStart, onSaved, onDeleteSaved, formsPreviewRequest = null, onFormsPreviewResult }) {
  const palette = use2029Palette("research_lab");
  const { user, isAdmin } = useAuth();
  const compactMobile = useMediaQuery(MOBILE_WORKSPACE_QUERY);
  const [query, setQuery] = useState(clean(initialSeed));
  // The iframe source stays stable after mount. User-initiated searches travel through native-search,
  // so changing a term/scope never creates a second engine instance or remounts the canonical one.
  const [engineSeed] = useState(() => clean(initialSeed));
  const [engineState, setEngineState] = useState(null);
  const engineStateRef = useRef(null);
  const [classicOpen, setClassicOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(() => isMobileWorkspace() ? null : "findings");
  const [heightExpanded, setHeightExpanded] = useState(false);
  const [classicGlyphs, setClassicGlyphs] = useState(false);
  const [verseRead, setVerseRead] = useState(false);
  const verseReadRef = useRef(false);
  const [verseHighlight, setVerseHighlight] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const cameraStageRef = useRef(null);
  const [cameraFullscreen, setCameraFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setCameraFullscreen(document.fullscreenElement === cameraStageRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const presentationPlan = useMemo(() => projectPresentation(engineState), [engineState]);
  const activePresentation = active && !classicOpen && presentation?.key === presentationPlan.key ? presentation : null;
  useEffect(() => {
    if (presentation && (!activePresentation || presentation.index >= presentationPlan.steps.length - 1)) {
      setPresentation((current) => !activePresentation ? null : current?.auto ? { ...current, auto: false } : current);
    }
    if (!activePresentation?.auto || activePresentation.index >= presentationPlan.steps.length - 1) return;
    const timer = setTimeout(() => setPresentation((current) => current?.key === presentationPlan.key
      ? { ...current, index: Math.min(current.index + 1, presentationPlan.steps.length - 1) } : null), activePresentation.seconds * 1000);
    return () => clearTimeout(timer);
  }, [activePresentation, presentationPlan.key, presentationPlan.steps.length]);
  useEffect(() => {
    if (!activePresentation && document.fullscreenElement === cameraStageRef.current) document.exitFullscreen?.().catch(() => {});
  }, [Boolean(activePresentation)]);
  const toggleCameraFullscreen = async () => {
    try {
      if (document.fullscreenElement === cameraStageRef.current) await document.exitFullscreen();
      else if (cameraStageRef.current?.requestFullscreen) await cameraStageRef.current.requestFullscreen();
      else setNotice("מסך מלא אינו זמין בדפדפן הזה; אפשר להמשיך בהצגה בתוך העמוד.");
    } catch { setNotice("מסך מלא אינו זמין כרגע; אפשר להמשיך בהצגה בתוך העמוד."); }
  };
  const highlightVerse = (verse) => {
    const projected = projectVerseWords(verse);
    if (!projected) { setVerseHighlight(null); setNotice("אין כרגע התאמה מלאה בין מילות הפסוק לאותיות המטריצה."); return; }
    verseReadRef.current = true;setVerseRead(true);setVerseHighlight(projected);
  };
  const toggleVerseRead = () => {
    const enabled = !verseReadRef.current;
    verseReadRef.current = enabled;setVerseRead(enabled);
    if (!enabled) setVerseHighlight(null);
    else if (lensResult?.ok && lensResult.lens === "letter-context") highlightVerse(lensResult.verse);
  };
  const [shortSkipView, setShortSkipView] = useState("reading");
  const panelRef = useRef(null);
  const panelTriggerRef = useRef(null);
  const openTool = (tool, trigger) => {
    if (trigger) panelTriggerRef.current = trigger;
    setClassicOpen(false);
    setActiveTool(tool);
    if (trigger) requestAnimationFrame(() => {
      const mobile = isMobileWorkspace();
      if (mobile) panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      if (!mobile) panelRef.current?.querySelector('[aria-label="סגור כלי מטריצה"]')?.focus({ preventScroll: true });
    });
  };
  const closeTool = () => {
    setActiveTool(null);
    panelTriggerRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!active || !activeTool || classicOpen) return;
    const onKey = (event) => {
      if (event.target.closest?.('[role="dialog"]')) return;
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setActiveTool(null);
        panelTriggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [active, activeTool, classicOpen]);
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [workspaceRequest, setWorkspaceRequest] = useState(null);
  const actionSeqRef = useRef(0);
  const [journeyLoad, setJourneyLoad] = useState(null);
  const [journeyPending, setJourneyPending] = useState(null);
  const journeyPendingRef = useRef(null);
  const [journeyTrail, setJourneyTrail] = useState([]);
  // UI-only compare-and-swap intent for the opened row. Canonical ELS identity
  // still comes exclusively from the mounted engine and is re-verified server-side.
  const [savedAxisReplacement, setSavedAxisReplacement] = useState(null);
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossTerm, setCrossTerm] = useState("");
  const [crossRadius, setCrossRadius] = useState(18);
  const [windowSize, setWindowSize] = useState("small");
  const crossRadiusDraftRef = useRef({ edited: false, revision: 0, submitted: null });
  const [lensRequest, setLensRequest] = useState(null);
  const lensSeqRef = useRef(0);
  const [lensResult, setLensResult] = useState(null);
  const [lensPending, setLensPending] = useState(false);
  const [lensProgress, setLensProgress] = useState(null);
  // Ephemeral presentation of an engine-owned result page. It is neither ELS state nor a store;
  // keeping it separate lets the ranked list survive opening one result and returning to the rail.
  const [resultTriage, setResultTriage] = useState(null);
  const resultTriageKeyRef = useRef(null);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [findingMenu, setFindingMenu] = useState(null);
  const [findingDetailsRequest, setFindingDetailsRequest] = useState(null);
  useEffect(() => { setFindingMenu(null); }, [matrix?.id, researchLoad, engineState?.axis?.hitId, classicOpen]);
  useEffect(() => {
    if (!matrix) return;
    setQuery(matrix.search_term || "");setClassicOpen(false);setLoadError(null);
    setSearchRequest(null);setFindingsRequest(null);setOperations({ search: null, findings: null });
    setSaveResult(null);
    setResultTriage(null);resultTriageKeyRef.current = null;
    setDeleteConfirm(false);setDeletePending(false);setDeleteError(false);
    const view = matrix.positions?.view || {};
    setClassicGlyphs(view.classicGlyphs === true);setHeightExpanded(view.heightExpanded === true);
    setShortSkipView(view.shortSkipView === "columns" ? "columns" : "reading");
    setJourneyLoad(null);setJourneyPending(null);journeyPendingRef.current = null;setJourneyTrail([]);setSavedAxisReplacement(null);
  }, [matrix?.id]);
  useEffect(() => {
    if (!researchLoad) return;
    setResultTriage(null);resultTriageKeyRef.current = null;
    setJourneyLoad(null);setJourneyPending(null);journeyPendingRef.current = null;setJourneyTrail([]);setSavedAxisReplacement(null);
  }, [researchLoad]);

  const activeScope = engineState?.scope === "tanakh" ? "tanakh" : "torah";
  const resetReadContext = () => {
    const seq = ++lensSeqRef.current;
    if (lensPending && lensRequest?.lens === "result-triage") resultTriageKeyRef.current = null;
    setLensRequest(lensPending ? { lens: "cancel", target: { nativeSeq: seq }, cancelled: true } : null);
    setLensResult(null);
    setLensProgress(null);
    setLensPending(false);
    setSelectedLetterIndex(null);
    setVerseHighlight(null);setPresentation(null);
  };
  const selectFinding = (selection) => {
    setActiveTool("findings");
    setSelectedFinding(selection);
    resetReadContext();
  };

  const requestSearch = (kind, payload = {}) => {
    onSearchStart?.();
    resetReadContext();
    setLoadError(null);
    setNotice("");
    setAccountRequired(false);
    setSavedAxisReplacement(null);
    setResultTriage(null);resultTriageKeyRef.current = null;
    setClassicOpen(false);
    ++findingsSeqRef.current;
    const seq = ++searchSeqRef.current;
    const requestedWindowSize = payload.windowSize || windowSize;
    const trackedPayload = { ...payload, windowSize: requestedWindowSize };
    setOperations({ search: { kind: "search", searchKind: kind, requestId: seq, status: "searching", startedAt: Date.now(), previousAxis: engineStateRef.current?.axis?.hitId, payload: trackedPayload }, findings: null });
    setActiveTool("results");
    setSearchRequest({ kind, ...trackedPayload, seq });
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
    if (kind === "search" && ["done", "empty", "error", "cancelled"].includes(operation.status)) {
      openTool("results");
      requestAnimationFrame(() => {
        if (isMobileWorkspace()) panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
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
    const pendingJourney = journeyPendingRef.current;
    const journeyComplete = pendingJourney?.kind === "return"
      ? journeySnapshotMatches(next, pendingJourney.snapshot)
      : journeyAnchorMatches(next, pendingJourney?.target);
    if (pendingJourney && journeyComplete) {
      if (pendingJourney.kind === "promote") {
        setJourneyTrail((current) => [...current, pendingJourney.returnStep]);
        setNotice(pendingJourney.saveAfterPromote
          ? `הממצא ${pendingJourney.targetLabel} הפך לציר הראשי. שמרו כדי להסיר את ${pendingJourney.returnStep.label} מאותו צופן.`
          : `הממצא ${pendingJourney.targetLabel} הפך לציר הראשי. אפשר לחזור בדיוק לציר הקודם.`);
        if (pendingJourney.saveAfterPromote) setActiveTool("research");
      } else {
        setJourneyTrail(pendingJourney.nextTrail);
        setNotice(`חזרתם בדיוק לציר ${pendingJourney.targetLabel}.`);
      }
      journeyPendingRef.current = null;
      setJourneyPending(null);
    }
  };

  const requestControl = (action, value) => {
    if (!action) return;
    if (action === "occurrence-prev" || action === "occurrence-next" || action === "meeting-select" || action === "occurrence-select") {
      resetReadContext();
      ++findingsSeqRef.current;
      setOperations((current) => ({ ...current, findings: null }));
    }
    if (action === "finding-radius" || action === "finding-count") resetReadContext();
    setControlRequest({ action, ...(value === undefined ? {} : { value }), seq: ++controlSeqRef.current });
    if (["occurrence-select", "meeting-select"].includes(action)) requestAnimationFrame(() => {
      setActiveTool("findings");
      if (isMobileWorkspace()) cameraStageRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };

  const requestLens = (lens, target = {}) => {
    // A native reading/scan action always reveals its native result, even after compatibility tools.
    setClassicOpen(false);
    openTool(lens === "structure-priority" ? "structures" : lens === "result-triage" ? "results" : "findings");
    const seq = ++lensSeqRef.current;
    setLensResult(null);
    setLensProgress(null);
    setLensPending(true);
    setLensRequest({ lens, target: { ...target, nativeSeq: seq }, startedAt: Date.now() });
  };

  const cancelLens = () => {
    if (lensRequest?.lens === "result-triage") resultTriageKeyRef.current = null;
    const seq = ++lensSeqRef.current;
    setLensRequest({ lens: "cancel", target: { nativeSeq: seq }, cancelled: true });
    setLensProgress(null);
    setLensPending(false);
    setNotice("הבדיקה נעצרה. המטריצה והממצאים נשמרו כפי שהיו.");
  };

  const lensReduction = lensRequest?.lens === "structure-priority" && Number(lensRequest.target?.structurePlan?.maxDistance) > 12
    ? { label: "המשך בטווח קרוב" }
    : null;
  const reduceLens = () => {
    if (!lensReduction || !lensRequest) return;
    const { lens, target } = lensRequest;
    cancelLens();
    requestLens(lens, { ...target, structurePlan: { ...target.structurePlan, maxDistance: 12 } });
  };

  const handleLens = (result) => {
    if (result?.target?.nativeSeq !== lensSeqRef.current) return;
    if (result?.type === "lens-progress") { setLensProgress(result.progress || null); return; }
    if (result?.lens === "result-triage") {
      if (!result?.ok) resultTriageKeyRef.current = null;
      setResultTriage(result?.ok ? result : null);
      setLensResult(null);
    } else setLensResult(result);
    setLensProgress(null);
    setLensPending(false);
    if (result?.ok && result.lens === "letter-context" && verseReadRef.current) highlightVerse(result.verse);
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
    setSaveRequest({ ...draft, replaceSavedAxis: activeSavedAxisReplacement, seq: ++actionSeqRef.current, axisHitId: engineStateRef.current?.axis?.hitId,
      view: { classicGlyphs, heightExpanded, shortSkipView } });
  };

  const deleteOpenedMatrix = async () => {
    if (!matrix?.id || !isAdmin || !onDeleteSaved || deletePending) return;
    setDeletePending(true);setDeleteError(false);
    try {
      await onDeleteSaved(matrix);
    } catch {
      setDeletePending(false);setDeleteError(true);
    }
  };

  const promoteFinding = (finding, hitId) => {
    if (!researchProfile || journeyPendingRef.current) return;
    const current = engineStateRef.current;
    const promotion = buildJourneyPromotion(current, finding, {
      hitId,
      scope: current?.scope,
      view: { mode: "research" },
    });
    if (!promotion.ok) {
      setNotice("אי אפשר להפוך את הממצא לציר בלי מופע מאומת ומוצג.");
      return;
    }
    const ownsOpenedRecord = matrix?.id && (isAdmin || matrix.owner_user_id === user?.id);
    const replacingOpenedAxis = ownsOpenedRecord && (
      savedMatrixMatchesAxis(matrix, current)
      || savedMatrixCanReanchor(matrix, current)
      || (savedAxisReplacement?.recordId === matrix.id && journeyAnchorMatches(current, savedAxisReplacement.target))
    );
    const pending = {
      kind: "promote",
      target: promotion.target,
      targetLabel: finding.t,
      saveAfterPromote: Boolean(replacingOpenedAxis),
      returnStep: {
        snapshot: promotion.snapshot,
        label: promotion.snapshot.term,
        hitId: promotion.snapshot.axis.hitId,
      },
    };
    setSavedAxisReplacement(replacingOpenedAxis ? {
      recordId: matrix.id,
      expected: {
        term: matrix.search_term,
        scope: matrix.scope || "torah",
        skip: matrix.skip_distance ?? null,
        direction: matrix.direction ?? null,
        startIndex: matrix.start_index ?? null,
      },
      previousTerm: matrix.search_term,
      target: promotion.target,
      targetTerm: finding.t,
      targetHitId: promotion.target.hitId,
    } : null);
    journeyPendingRef.current = pending;
    setJourneyPending(pending);
    setJourneyLoad(promotion.loadItem);
    setNotice(`פותח את ${finding.t} כציר ראשי ומאמת את המופע המדויק…`);
  };

  const returnToPreviousAxis = () => {
    if (journeyPendingRef.current || !journeyTrail.length) return;
    const returnStep = journeyTrail.at(-1);
    const restored = buildJourneyRestore(returnStep.snapshot);
    if (!restored.ok) {
      setNotice("החזרה המדויקת אינה זמינה לצעד הזה; הציר הנוכחי נשאר ללא שינוי.");
      return;
    }
    const pending = {
      kind: "return",
      target: restored.target,
      targetLabel: returnStep.label,
      snapshot: returnStep.snapshot,
      nextTrail: journeyTrail.slice(0, -1),
    };
    journeyPendingRef.current = pending;
    setSavedAxisReplacement(null);
    setJourneyPending(pending);
    setJourneyLoad(restored.loadItem);
    setNotice(`חוזר לציר ${returnStep.label} ומאמת את העוגן המדויק…`);
  };

  const handleJourneyLoadError = (error) => {
    if (journeyPendingRef.current) {
      journeyPendingRef.current = null;
      setJourneyPending(null);
      setLoadError(null);
      setNotice("המעבר המדויק לא הושלם. הציר והממצאים הקודמים נשארו ללא שינוי.");
      return;
    }
    setLoadError(error);
    if (researchLoad) onResearchLoadError?.(error);
    setNotice(researchLoad
      ? "לא הצלחנו למצוא או לאמת מופע בדילוג שביקשתם. אפשר לשנות דילוג או מונח ולנסות שוב."
      : "לא הצלחנו לשחזר את המיקום השמור. אפשר לנסות חיפוש חדש; הצופן המקורי נשאר שמור.");
  };

  const addLineFinding = (term) => {
    const findings = engineStateRef.current?.findings || [];
    if (!term || ["searching", "verifying"].includes(operations.findings?.status) || ["searching", "verifying"].includes(operations.search?.status) || findings.length >= 12 || findings.some((finding) => finding.t === term)) return;
    // Append through the existing canonical editor. Preserve the read-only line inspector:
    // adding a term does not change its axis, corpus or selected occurrence.
    requestFindingsChange([...findings.map((finding) => ({ t: finding.t, color: finding.color })), { t: term, color: nextFindingColor(findings, palette) }], { preserveRead: true });
  };

  const addStructureGroup = (terms) => {
    const findings = engineStateRef.current?.findings || [];
    if (!Array.isArray(terms) || ["searching", "verifying"].includes(operations.findings?.status) || ["searching", "verifying"].includes(operations.search?.status) || findings.length >= 12) return;
    const existing = new Set(findings.map((finding) => finding.t));
    const additions = [...new Set(terms.map(clean).filter((term) => term && !existing.has(term)))].slice(0, 12 - findings.length);
    if (!additions.length) return;
    const next = findings.map((finding) => ({ t: finding.t, color: finding.color }));
    for (const term of additions) next.push({ t: term, color: nextFindingColor(next, palette) });
    // One canonical findings update verifies the whole selected structure; there is no parallel
    // group store and no term is promoted merely because it belonged to the proposed structure.
    requestFindingsChange(next, { preserveRead: true });
  };

  const revealFindingDetails = (term) => {
    setClassicOpen(false);
    setActiveTool("findings");
    setFindingDetailsRequest({ term, seq: ++actionSeqRef.current });
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" }));
  };

  const handleLetterClick = ({ index, findingTarget, point }) => {
    setSelectedLetterIndex(index);
    if (findingTarget) {
      selectFinding({ term: findingTarget.term, hitId: findingTarget.hitId, scope: engineStateRef.current?.scope, axisHitId: engineStateRef.current?.axis?.hitId });
      setFindingMenu({ ...findingTarget, point });
      return;
    }
    setFindingMenu(null);
    requestLens("letter-context", { i: index });
  };

  const matrixActive = !loadError && engineState?.status === "ok" && engineState?.verification?.state === "MATCH";
  const activeSavedAxisReplacement = savedAxisReplacement && savedAxisReplacement.recordId === matrix?.id
    && journeyAnchorMatches(engineState, savedAxisReplacement.target) ? savedAxisReplacement : null;
  const canReplaceSavedPrimary = Boolean(matrix?.id && !activeSavedAxisReplacement
    && (isAdmin || matrix.owner_user_id === user?.id)
    && (savedMatrixMatchesAxis(matrix, engineState) || savedMatrixCanReanchor(matrix, engineState)));
  const savedMatrixReady = Boolean(matrix?.id && matrixActive && engineState?.provenance?.editId === matrix.id);
  const [loadedSavedMatrixId, setLoadedSavedMatrixId] = useState(null);
  useEffect(() => { setLoadedSavedMatrixId(null); }, [matrix?.id]);
  useEffect(() => { if (savedMatrixReady) setLoadedSavedMatrixId(matrix.id); }, [savedMatrixReady, matrix?.id]);
  const savedLoadPending = Boolean(matrix?.id && loadedSavedMatrixId !== matrix.id && !savedMatrixReady && !loadError);
  // On phones, one contextual research workspace belongs directly below a verified matrix.
  // Findings are its default view; Results and Save replace its content in the same page region.
  const mobileInlineWorkspace = compactMobile && matrixActive && !classicOpen;
  const visibleTool = (!researchProfile && activeTool === "structures" ? "findings" : activeTool) || (mobileInlineWorkspace ? "findings" : null);
  const inlineFindings = mobileInlineWorkspace && visibleTool === "findings";
  const searchPending = ["searching", "verifying"].includes(operations.search?.status);
  useLayoutEffect(() => {
    if (!compactMobile || classicOpen || visibleTool !== "results" || !["done", "empty", "error", "cancelled"].includes(operations.search?.status)) return;
    const frame = requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [compactMobile, classicOpen, visibleTool, operations.search?.status]);
  const presentedSavedMatrixRef = useRef(null);
  useLayoutEffect(() => {
    if (!compactMobile || !savedMatrixReady || presentedSavedMatrixRef.current === matrix?.id) return;
    presentedSavedMatrixRef.current = matrix.id;
    const frame = requestAnimationFrame(() => cameraStageRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [compactMobile, savedMatrixReady, matrix?.id]);
  // Reading layout is only available for a complete, contiguous short-skip window.
  // CSS wraps the existing indexed cells; canonical geometry and crossing scans stay unchanged.
  const shortSkip = matrixActive && engineState.search?.mode === "regular" && engineState.matrix?.S >= 2
    && engineState.matrix.S <= 8 && engineState.matrix.c0 === 0 && engineState.matrix.cw === engineState.matrix.S;
  const readingView = shortSkip && shortSkipView === "reading";
  const resultsAreCross = operations.search ? ["cross", "cross-continue"].includes(operations.search.searchKind) : Boolean(engineState?.search?.zones);
  const resultView = resultsAreCross ? engineState?.search?.results : engineState?.search?.occurrences;
  const resultTriageKey = resultView?.id ? `${resultsAreCross ? "cross" : "regular"}:${resultView.id}:${resultsAreCross ? 0 : resultView.page || 0}` : null;
  const resultTriagePending = lensPending && lensRequest?.lens === "result-triage";
  useEffect(() => {
    if (!researchProfile || visibleTool !== "results" || operations.search?.status !== "done" || !matrixActive || !resultTriageKey || lensPending) return;
    const matches = resultTriage?.ok && resultTriage.kind === (resultsAreCross ? "cross" : "regular") && resultTriage.setId === resultView.id
      && (resultsAreCross || Number(resultTriage.page) === Number(resultView.page));
    if (matches || resultTriageKeyRef.current === resultTriageKey) return;
    resultTriageKeyRef.current = resultTriageKey;
    requestLens("result-triage", { kind: resultsAreCross ? "cross" : "regular", setId: resultView.id, ...(resultsAreCross ? {} : { page: resultView.page }) });
  }, [researchProfile, visibleTool, operations.search?.status, matrixActive, resultTriageKey, lensPending, resultTriage?.setId, resultTriage?.page]);
  const previousResult = matrixActive && operations.search?.previousAxis === engineState?.axis?.hitId
    && ["searching", "verifying", "empty", "error", "cancelled"].includes(operations.search?.status);
  const matrixStatus = engineState?.status === "ready" ? "בראשית · מוכן לחיפוש" : previousResult
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
  const searchReduction = (() => {
    const operation = operations.search;
    if (!operation || !["regular", "cross"].includes(operation.searchKind)) return null;
    if (operation.payload?.scope === "tanakh") return { type: "scope", label: "המשך בתורה" };
    if (operation.searchKind === "cross" && Number(operation.payload?.radius) > 8) return { type: "radius", label: "צמצם מרחק ל־8" };
    if (operation.searchKind === "cross" && operation.payload?.windowSize !== "small") return { type: "window", label: "עבור לחלון קטן" };
    return null;
  })();
  const reduceSearch = () => {
    const operation = operations.search;
    if (!operation || !searchReduction) return;
    const payload = { ...operation.payload };
    if (searchReduction.type === "scope") payload.scope = "torah";
    if (searchReduction.type === "radius") { payload.radius = 8; setCrossRadius(8); }
    if (searchReduction.type === "window") { payload.windowSize = "small"; setWindowSize("small"); }
    cancelOperation("search");
    requestSearch(operation.searchKind, payload);
  };

  return <section className={`els29-native-classic${heightExpanded ? " is-height-expanded" : ""}`} data-els-native-classic="v4" aria-busy={savedLoadPending || searchPending}
    style={{ "--els29-canvas": palette.matrix.surface, "--els29-letter-ink": palette.matrix.ink, "--els29-frame": palette.matrix.frame, "--els29-axis": palette.matrix.axis, "--els29-mark-ink": palette.matrix.onMark }}>
    {savedLoadPending ? <SavedMatrixLoadProgress matrix={matrix} state={engineState} /> : null}
    <form id="els29-query" className="els29-native-query" onSubmit={submit} aria-label="חיפוש ELS" hidden={savedLoadPending}>
      <div className="els29-native-search-mode" role="group" aria-label="סוג החיפוש">
        <button type="button" aria-pressed={!crossOpen} onClick={() => { if (crossOpen && ["cross", "cross-continue"].includes(operations.search?.searchKind)) cancelOperation("search"); setCrossOpen(false); }}>חיפוש רגיל</button>
        <button className="els29-native-cross-toggle" type="button" aria-pressed={crossOpen} aria-expanded={crossOpen}
          onClick={() => { if (crossOpen && ["cross", "cross-continue"].includes(operations.search?.searchKind)) cancelOperation("search"); setCrossOpen(value => !value); }}>הצלבה בין צירים</button>
      </div>
      <div className="els29-native-query-terms">
      <label>
        <span>{crossOpen ? "מונח ראשון" : "מונח"}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={40}
          placeholder="למשל: משיח"
          autoComplete="off"
        />
      </label>
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
      </div> : null}
      {!crossOpen && (clean(query).split(/\s+/).length > 1 || clean(query).replace(/[^א-ת]/g, "").length >= 7) ? <div className="els29-native-search-coach" role="note">
        <span>אפשר לחפש את הביטוי בשלמותו, או לבדוק מפגש בין שתי מילים קצרות.</span>
        <button type="button" onClick={() => {
          const [first, ...rest] = clean(query).split(/\s+/);
          if (rest.length) { setQuery(first); setCrossTerm(rest.join(" ")); }
          setCrossOpen(true);
        }}>{clean(query).split(/\s+/).length > 1 ? "פצל והצלב" : "פתח חיפוש מוצלב"}</button>
      </div> : null}
      </div>
      <div className="els29-native-query-options">
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
      {crossOpen ? <>
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
      </> : null}
      <div className="els29-native-query-actions">
        <button className="els29-native-search" type="submit" disabled={searchPending}>{searchPending ? "מחפש…" : crossOpen ? "חפש הצלבה" : "חפש"}</button>
        <button className="els29-native-more" type="button" onClick={() => { cancelOperation("search"); cancelOperation("findings"); setClassicOpen(value => !value); }}>{classicOpen ? "חזור למטריצה" : "כל הכלים"}</button>
      </div>
      </div>
    </form>

    {!savedLoadPending ? <SearchProgress operation={operations.search} reduction={searchReduction} onReduce={reduceSearch} onCancel={() => cancelOperation("search")} /> : null}
    {!savedLoadPending && lensPending ? <LensProgress request={lensRequest} progress={lensProgress} reduction={lensReduction} onReduce={reduceLens} onCancel={cancelLens} /> : null}
    {!savedLoadPending && notice ? <div className="els29-native-notice" role="status">{notice}{accountRequired ? <> · <a href="/login">כניסה לחשבון</a></> : null}</div> : null}
    {!savedLoadPending && researchProfile && (journeyTrail.length || journeyPending) ? <div className="els29-native-notice" data-els-c02-journey="v1">
      <span>מסלול צירים · {journeyTrail.length} צעדי חזרה שמורים</span>
      <button type="button" disabled={!!journeyPending || !journeyTrail.length} onClick={returnToPreviousAxis}>
        {journeyPending?.kind === "return" ? "חוזר לציר הקודם…" : `חזור בדיוק ל־${journeyTrail.at(-1)?.label || "ציר הקודם"}`}
      </button>
    </div> : null}
    {matrix?.id && !savedLoadPending ? <section className="els29-native-saved-manager is-actions-only" aria-label="ניהול הצופן השמור">
      <div className="els29-native-saved-actions">
        <button type="button" className="sod29-action primary" aria-label="פתח שמירת שינויים" onClick={(event) => openTool("research", event.currentTarget)}>
          שמור שינויים
        </button>
        {isAdmin && onDeleteSaved ? !deleteConfirm ? <button type="button" className="sod29-action" onClick={() => { setDeleteConfirm(true);setDeleteError(false); }}>מחק צופן</button>
          : <span className="els29-native-delete-confirm" role="group" aria-label="אישור מחיקת הצופן">
            <b>המחיקה קבועה. למחוק?</b>
            <button type="button" disabled={deletePending} onClick={deleteOpenedMatrix}>{deletePending ? "מוחק…" : "כן, מחק לצמיתות"}</button>
            <button type="button" disabled={deletePending} onClick={() => setDeleteConfirm(false)}>ביטול</button>
          </span> : null}
      </div>
      {deleteError ? <small role="alert">המחיקה לא הושלמה. הצופן נשאר שמור.</small> : null}
    </section> : null}

    <div className={`els29-native-layout${classicOpen ? " is-classic-open" : ""}${visibleTool && !classicOpen && !savedLoadPending ? " has-inspector" : ""}`}>
      <>
        <div ref={cameraStageRef} className="els29-native-stage-column" hidden={classicOpen || savedLoadPending}>
        <main className="els29-native-stage" hidden={classicOpen || savedLoadPending} aria-busy={searchPending}>
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
              {engineState?.search?.zones ? <span>מפגש {engineState.search.zoneIndex + 1}/{engineState.search.zones}</span> : engineState?.occurrence?.count ? <span>מופע {engineState.search?.occurrences?.selectedOrdinal || (engineState.occurrence.index || 0) + 1}/{engineState.search?.occurrences?.total || engineState.occurrence.count}</span> : null}
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
          <MatrixSnapshot state={engineState} onLetterClick={matrixActive ? handleLetterClick : null} onZoomChange={(value) => requestControl("zoom-set", value)} selectedLetterIndex={selectedLetterIndex} selectedFinding={selectedFinding} visible={!classicOpen} classicGlyphs={classicGlyphs} verseHighlight={verseHighlight} presentation={activePresentation} presentationPlan={presentationPlan} readingView={readingView} />
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
          <button type="button" aria-label="הדגש פסוק במטריצה" aria-pressed={verseRead} disabled={!matrixActive} onClick={toggleVerseRead}>הדגש פסוק</button>
          <button type="button" aria-pressed={!!activePresentation} disabled={!matrixActive || searchPending || !presentationPlan.steps.length}
            onClick={() => setPresentation(activePresentation ? null : { key: presentationPlan.key, index: -1, auto: false, seconds: 3 })}>מצב מצלמה</button>
          {verseRead ? <small role="status">{verseHighlight ? `${verseHighlight.ref} — המילים מודגשות לסירוגין בתכלת ובכתום.` : "געו באות במטריצה כדי להדגיש את הפסוק שלה."}</small> : null}
          {engineState?.ui?.heat ? <small>מפת החום מציגה צפיפות סביב האותיות המסומנות.</small> : null}
        </footer>
        {activePresentation ? <section className="els29-native-presenter" aria-label="מצב מצלמה" onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation();setPresentation(null); }
        }}>
          <p role="status"><bdi>{activePresentation.index + 1} / {presentationPlan.steps.length}</bdi> · {presentationPlan.steps[activePresentation.index]?.label || "מוכן — לחצו הבא להצגת הציר הראשי"}</p>
          <div>
            <button type="button" disabled={activePresentation.index < 0} onClick={() => setPresentation((current) => ({ ...current, index: current.index - 1, auto: false }))}>הקודם</button>
            <button type="button" disabled={activePresentation.index >= presentationPlan.steps.length - 1} onClick={() => setPresentation((current) => ({ ...current, index: current.index + 1, auto: false }))}>הבא</button>
            <label>שניות לכל ממצא <select aria-label="שניות לכל ממצא" value={activePresentation.seconds} onChange={(event) => setPresentation((current) => ({ ...current, seconds: Number(event.target.value) }))}>
              {[1, 2, 3, 5, 10].map((seconds) => <option key={seconds} value={seconds}>{seconds}</option>)}
            </select></label>
            <button type="button" aria-pressed={activePresentation.auto} onClick={() => setPresentation((current) => ({ ...current, auto: !current.auto,
              index: current.index >= presentationPlan.steps.length - 1 ? -1 : current.index }))}>{activePresentation.auto ? "השהה הצגה" : "הצגה אוטומטית"}</button>
            <button type="button" onClick={toggleCameraFullscreen}>{cameraFullscreen ? "צא ממסך מלא" : "מסך מלא"}</button>
            <button type="button" onClick={() => setPresentation(null)}>סיים הצגה</button>
          </div>
          <small>מציג את הציר ואחריו את הממצאים, אחד אחרי השני. אפשר להקליט באמצעות כלי צילום המסך במכשיר.</small>
        </section> : null}
        </div>
        {!compactMobile ? <div className="els29-native-toolstrip" hidden={classicOpen || savedLoadPending} role="group" aria-label="כלי המטריצה">
          {[["findings", "סריקה וממצאים", "els"], ...(researchProfile ? [["structures", "מבנים וקשרים", "dna"]] : []), ["results", "תוצאות", "posts"], ["research", "שמירה", "books"]].map(([tool, label, icon]) => <button
            type="button" key={tool} aria-label={label} title={label}
            aria-expanded={visibleTool === tool} aria-controls="els29-context-panel"
            onClick={(event) => visibleTool === tool && !classicOpen ? closeTool() : openTool(tool, event.currentTarget)}
          ><NavigationIcon2029 name={icon} /><small>{tool === "findings" ? "סריקה" : tool === "structures" ? "מבנים" : label}</small></button>)}
        </div> : null}
        <div ref={panelRef} className="els29-native-panel-wrap"
          data-mobile-inline-workspace={mobileInlineWorkspace ? "true" : undefined}
          data-mobile-inline-findings={inlineFindings ? "true" : undefined}
          hidden={classicOpen || savedLoadPending || !visibleTool}>
        <ContextualInspector2029 id="els29-context-panel" className="els29-native-context-panel" ariaLabel="כלי ELS והקשר המטריצה">
          <header className="els29-native-panel-head">
            <strong>{compactMobile && matrixActive ? "סביבת המחקר" : visibleTool === "research" ? "שמירה והמשך מחקר" : visibleTool === "structures" ? "מבנים בעדיפות" : visibleTool === "results" ? (resultsAreCross ? "תוצאות הצלבה" : "תוצאות החיפוש") : "סריקה וממצאים"}</strong>
            {!compactMobile ? <button type="button" onClick={closeTool} aria-label="סגור כלי מטריצה" title="סגור את החלונית">×</button> : null}
          </header>
          {compactMobile ? <nav className="els29-native-context-nav" aria-label="תצוגות סביבת המחקר">
            <button type="button" aria-label="סריקה וממצאים" aria-pressed={visibleTool === "findings"} onClick={() => openTool("findings")}>ממצאים</button>
            {researchProfile ? <button type="button" aria-label="מבנים וקשרים" aria-pressed={visibleTool === "structures"} onClick={() => openTool("structures")}>מבנים</button> : null}
            <button type="button" aria-label="תוצאות" aria-pressed={visibleTool === "results"} onClick={() => openTool("results")}>תוצאות</button>
            <button type="button" className="is-action" aria-label="שמירה" aria-pressed={visibleTool === "research"} onClick={() => openTool("research")}>שמור</button>
          </nav> : null}
        <CrossResultsRail onContinue={setId => requestSearch("cross-continue", {setId, scope:activeScope})} onRetry={() => requestSearch(operations.search?.searchKind || "cross", operations.search?.payload || {})} state={engineState} pending={searchPending || ["searching", "verifying"].includes(operations.findings?.status)}
          outcome={operations.search?.status} visible={visibleTool === "results" && resultsAreCross} onSelect={requestControl}
          triageResult={researchProfile ? resultTriage : null} triagePending={researchProfile && resultTriagePending} />
        <RegularResultsRail onContinue={setId => requestSearch("continue", {setId, term:engineState?.termRaw || engineState?.term, scope:activeScope})} state={engineState} pending={searchPending} operation={operations.search} visible={visibleTool === "results" && !resultsAreCross}
          onSelect={requestControl} onRetry={() => requestSearch(operations.search?.searchKind || "regular", operations.search?.payload || { term: query, scope: activeScope })}
          triageResult={researchProfile ? resultTriage : null} triagePending={researchProfile && resultTriagePending} />
        {researchProfile ? <StructuralPriorityRail visible={visibleTool === "structures"} state={engineState} lensResult={lensResult} lensPending={lensPending}
          busy={searchPending || ["searching", "verifying"].includes(operations.findings?.status)}
          onRun={(target) => requestLens("structure-priority", target)}
          onScanAxis={(target) => requestLens("line-context", { ...target, scan: true })}
          onAddGroup={addStructureGroup} onOpenFinding={revealFindingDetails} /> : null}
        <ElsSavePanel2029 visible={visibleTool === "research"} state={engineState} matrix={matrix} user={user} isAdmin={isAdmin} replacement={activeSavedAxisReplacement}
          pending={savePending} busy={!!journeyPending || searchPending || ["searching", "verifying"].includes(operations.findings?.status)} result={saveResult}
          onSave={requestSave} onWorkspace={() => setWorkspaceRequest({ seq: ++actionSeqRef.current })}
          onAccount={() => { setAccountRequired(true);setNotice("שמירה פרטית זמינה לאחר התחברות לחשבון."); }} />
        <FindingsRail
          onHighlightVerse={highlightVerse} verseHighlight={verseHighlight}
          selected={selectedFinding}
          onCancel={() => cancelOperation("findings")}
          activeTool={visibleTool}
          state={engineState}
          lensResult={lensResult}
          lensPending={lensPending}
          operation={operations.findings}
          searchPending={searchPending}
          onSelectTarget={selectFinding}
          onScan={(target) => requestLens("line-context", { ...target, scan: researchProfile })}
          onSource={(target) => requestLens("verse-context", target)}
          onDiscover={(target) => requestLens("matrix-candidates", target)}
          onAxisControl={requestControl}
          onAddLineFinding={addLineFinding}
          onFindingControl={requestFindingControl}
          onFindingsChange={requestFindingsChange}
          researchProfile={researchProfile}
          canReplacePrimary={canReplaceSavedPrimary}
          journeyBusy={!!journeyPending}
          onPromote={promoteFinding}
          openDetails={findingDetailsRequest}
        />
        </ContextualInspector2029>
        </div>
      </>

      <FindingActionMenu
        action={findingMenu}
        researchProfile={researchProfile}
        pending={searchPending || ["searching", "verifying"].includes(operations.findings?.status) || lensPending}
        journeyBusy={!!journeyPending}
        onClose={() => setFindingMenu(null)}
        onScan={(target) => requestLens("line-context", { ...target, scan: researchProfile })}
        onSource={(target) => requestLens("verse-context", target)}
        onPromote={promoteFinding}
        onDetails={revealFindingDetails}
        onHide={(term, hit) => requestFindingControl(term, "toggle-hit", hit.hitId, hit)}
      />

      <div className={classicOpen ? "els29-classic-fallback is-open" : "els29-classic-fallback"}>
        <TzofenEmbed
          seed={engineSeed || undefined}
          matrix={matrix}
          journeyLoad={journeyLoad || researchLoad}
          exactSkipProbe={researchProbe}
          onExactSkipProbeResult={onResearchProbeResult}
          formsPreviewRequest={formsPreviewRequest}
          onFormsPreviewResult={onFormsPreviewResult}
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
          onSaveResult={(result) => { if (result.requestId !== saveRequest?.seq) return;setSavePending(false);setSaveResult(result);if (result.ok) { setSavedAxisReplacement(null);onSaved?.(result.row); } }}
          onLoadError={handleJourneyLoadError}
          workspaceRequest={workspaceRequest}
          onWorkspaceAdded={() => setNotice("הממצא נוסף לתיק המחקר שלך.")}
        />
      </div>
    </div>
  </section>;
}
