import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import {
  buildJourneyPromotion,
  buildJourneyResearchTarget,
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
import { projectElsResearchPackageGuide } from "../../lib/research/elsResearchPackageGuide.js";
import {
  ELS_CIPHER_DISCOVERY_PLAN_CONTRACT,
  prepareElsRelationshipResearchPlan,
  projectElsGuidedOccurrenceCoverage,
} from "../../lib/research/elsAutomaticResearchPlan.js";
import ElsSavePanel2029 from "./ElsSavePanel2029.jsx";
import { projectVerseWords, projectPresentation } from "./elsPresentation2029.js";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MOBILE_WORKSPACE_QUERY = "(max-width:980px), (pointer:coarse) and (hover:none)";
const isMobileWorkspace = () => window.matchMedia(MOBILE_WORKSPACE_QUERY).matches;
const safeResearchAxis = (value) => {
  const term = String(value || "").normalize("NFKD").replace(/[\u0591-\u05C7]/g, "").replace(/[^א-ת\s]/g, " ").trim().replace(/\s+/g, " ");
  const length = term.replace(/\s/g, "").length;
  return length >= 3 && length <= 12 ? term : "";
};
const safeResearchContextTerms = (value) => {
  const rows = [], seen = new Set();
  for (const item of Array.isArray(value) ? value.slice(0, 12) : []) {
    const term = String(item?.term || "").normalize("NFKD").replace(/[\u0591-\u05C7]/g, "").replace(/[^א-ת\s]/g, " ").trim().replace(/\s+/g, " ");
    const canonical = term.replace(/\s/g, "");
    if (canonical.length < 2 || canonical.length > 24 || seen.has(canonical)) continue;
    seen.add(canonical);
    rows.push({ term, mode: item?.mode === "exact_phrase" ? "exact_phrase" : "term", required: item?.required === true, split: item?.split === true });
  }
  return rows;
};
const safeDiscoveryGoal = (value) => value?.primaryAxes === 1 && value?.connectedSupports === 2
  && value?.sourceSequence === "WHEN_AVAILABLE" && value?.resultPolicy === "ONE_BEST_STRUCTURE"
  ? { primaryAxes: 1, connectedSupports: 2, sourceSequence: "WHEN_AVAILABLE", resultPolicy: "ONE_BEST_STRUCTURE" }
  : null;
const researchContextKey = (rows, goal = null) => `${safeResearchContextTerms(rows).map((row) => `${row.term}:${row.mode}:${Number(row.split)}`).join("|")}${safeDiscoveryGoal(goal) ? "#verified-pair" : ""}`;
const emptyGuidedOccurrenceRun = (key = null) => ({ key, approvedBatches: 1, inspections: [], failure: null });

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

function SourceLens({ lensResult, findings, onAddLineFinding, onAddGroup, onOpenFinding, onExploreAxis, onExpand, onResume, addingFinding, onHighlightVerse, verseHighlight }) {
  if (!lensResult) return <p className="els29-native-muted">לחצו על אות במטריצה כדי לראות את המקור שלה, או השתמשו ב״מקור הממצא״ לקריאה נגישה של פסוקי הציר.</p>;
  if (lensResult.ok === false) return <p className="els29-native-muted">{lensResult.lens === "matrix-candidates"
    ? ["focused-core-candidate-limit", "focused-core-probe-limit"].includes(lensResult.reason)
      ? "האזור הממוקד עבר את תקציב הבטיחות. פתח ציר ממוקד יותר ונסה שוב. לא הוצגה תוצאה חלקית."
      : "אי אפשר לסרוק את המטריצה לפני שהציר הראשי אומת."
    : "המקור לא זמין לתא הזה במצב הנוכחי."}</p>;

  if (lensResult.lens === "matrix-candidates") {
    const items = Array.isArray(lensResult.items) ? [...lensResult.items] : [];
    if (lensResult.ranking?.contract !== "els_research_candidate_ranking_v1") items.sort((a, b) => Number(a.distance) - Number(b.distance) || String(a.term).localeCompare(String(b.term), "he"));
    const lexiconCounts = lensResult.lexicon?.counts;
    const compactCount = items.filter((item) => item.geometry?.stage === "A").length;
    const groups = Array.isArray(lensResult.groups) ? lensResult.groups : [];
    const focused = lensResult.scanMode === "focused";
    const suggestion = lensResult.axisSuggestion;
    const contextCoverage = lensResult.contextCoverage?.contract === "els_research_context_coverage_v1" ? lensResult.contextCoverage : null;
    const existing = new Set(findings.map((finding) => finding.t));
    const topicalSourceItems = items.filter((item) => item.sourceContext?.axisTopic);
    const neighborhoodItems = items.filter((item) => !item.sourceContext?.axisTopic);
    const sections = [
      ["source-context", "פסוקי מקור באותו הקשר"],
      ["parallel", "מקבילות צמודות לציר"],
      ["intersection", "חציות הנוגעות בציר"],
      ["compact-nearby", "רצפים סמוכים ללא פער"],
      ["spaced", "שלב ב׳ · מבנים עם פערים"],
    ].map(([band, label]) => ({ band, label, items: band === "source-context" ? topicalSourceItems : neighborhoodItems.filter((item) => item.neighborhood?.band === band) })).filter((section) => section.items.length);
    const renderItem = (item) => {
      const addedFinding = findings.find((finding) => finding.t === item.term);
      const openHit = [...(addedFinding?.hits || []), ...(addedFinding?.sourceHits || [])]
        .find((hit) => (hit.verified || hit.kind === "source-sequence") && hit.shown && hit.withinRadius !== false);
      const added = Boolean(addedFinding);
      const label = item.label || item.term;
      const rankNote = Array.isArray(item.ranking?.reasons) ? item.ranking.reasons.slice(0, 3).join(" · ") : "";
      const geometryNote = item.geometry ? `${item.geometry.stage === "A" ? "שלב א׳" : "שלב ב׳"} · ${item.geometry.relationLabel}` : "";
      const continuations = (item.continuations || []).slice(0, 3).map((word) => word.label || word.term);
      const verses = Array.isArray(item.source?.verses) ? item.source.verses.filter((verse) => verse?.text).slice(0, 3) : [];
      const verificationNote = item.sourceContext?.axisTopic ? "פסוק מקור באותו הקשר" : item.status === "SOURCE_EXACT" ? "רצף מקור מדויק" : item.status === "VERIFIED" ? "מופע ELS מאומת" : "מועמד מקומי";
      return <div key={`${item.neighborhood?.band || "candidate"}-${item.term}`} className="els29-native-line-word" data-geometry-stage={item.geometry?.stage || undefined}>
        {openHit ? <button type="button" className="els29-native-discovered-term"
          onClick={() => onOpenFinding({ term: item.term, hitId: openHit.hitId, ...(openHit.kind === "source-sequence" ? { kind: "source-sequence" } : {}) })}
          aria-label={`פתח את המשך הציר של ${label}`}>
          <b>{label}</b><small>{geometryNote ? `${geometryNote} · ` : ""}מרחק {item.distance} תאים{rankNote ? ` · ${rankNote}` : ""} · לחצו להמשך הציר</small>
        </button> : <div className="els29-native-discovered-term"><b>{label}</b><small>{geometryNote ? `${geometryNote} · ` : ""}מרחק {item.distance} תאים{rankNote ? ` · ${rankNote}` : ""} · {added ? "האימות עדיין נמשך" : continuations.length ? `המשך אפשרי: ${continuations.join(" · ")}` : "ממצא מקומי; אינו תלוי בהמשך נוסף"}</small></div>}
        <button type="button" disabled={addingFinding || (added ? !openHit : findings.length >= 12)}
          onClick={() => openHit
            ? onOpenFinding({ term: item.term, hitId: openHit.hitId, ...(openHit.kind === "source-sequence" ? { kind: "source-sequence" } : {}) })
            : onAddLineFinding(item.term)}
          aria-label={openHit ? `הצג את המשך הציר של ${label}` : `הוסף את ${label} מהמטריצה לממצאים`}>
          {openHit ? "המשך הציר" : added ? "מאמת…" : "אמת והוסף"}
        </button>
        {focused ? <div className="els29-native-core-proof">
          <small><b>{verificationNote}</b> · דילוג <bdi>{item.skip}</bdi>{item.direction === "back" ? " · קריאה אחורה" : " · קריאה קדימה"}</small>
          {item.sourceContext?.axisTopic ? <small>מילת הנושא <b>{(item.sourceContext.matchedTerms || [item.term]).join(" · ")}</b> נמצאה ברצף המקור של פסוק שהציר עובר בו{item.sourceContext.occurrenceCount > 1 ? ` · ${item.sourceContext.occurrenceCount} מופעים` : ""}.</small> : null}
          {item.skipMeta?.label ? <small>{item.skipMeta.label}</small> : null}
          {verses.map((verse) => <p key={`${item.term}-${verse.ref}`}><b>{verse.ref}</b> · {verse.text}</p>)}
        </div> : null}
      </div>;
    };
    return <div className="els29-native-source-list els29-native-matrix-candidates" data-experience-capability="els-all-matrix-findings" data-package-state={lensResult.partial ? "partial-verified" : "complete"}>
      <strong>{focused ? "ליבת הציר" : "חבילת סביבת הציר"} · {items.length}{lensResult.partial ? " · טיוטה מאומתת" : ""}</strong>
      {lensResult.partial ? <div className="els29-native-partial-package" role="status">
        <span>הבדיקה נעצרה, אך התוצאות שכבר עברו אימות נשמרו. מועמדים שלא אומתו אינם מוצגים.</span>
        {lensResult.resume?.available ? <button type="button" disabled={addingFinding} onClick={() => onResume?.(lensResult.target)}>המשך מאותה נקודה</button> : null}
      </div> : null}
      <small>{focused ? `נסרק האזור הממוקד סביב הציר: ${lensResult.focus?.rowPad || 12} שורות ו־${lensResult.focus?.colRadius || 15} עמודות, ברצף המקור ובדילוגים S−1, S, S+1.` : "זוהי הרחבה יזומה לחלון המטריצה המלא."}</small>
      <small>{focused ? `${lensResult.verification?.verified || 0} מופעי ELS אומתו · ${lensResult.verification?.sourceExact || 0} רצפי מקור מדויקים.` : `${compactCount} ממצאים בשלב א׳ · ${Math.max(0, items.length - compactCount)} בשלב ב׳.`} זהו סדר בדיקה, לא ציון אמת.</small>
      {contextCoverage?.requested?.length ? <section className="els29-native-context-coverage" aria-label="כיסוי מונחי ההקשר">
        <strong>ההקשר שביקשתם</strong>
        {contextCoverage.found?.length ? <small>נמצא ואומת בטווח: <b>{contextCoverage.found.map((item) => item.label || item.term).join(" · ")}</b></small> : null}
        {contextCoverage.complete && contextCoverage.notSeenInFocusedRange?.length ? <small>עדיין לא נראה בטווח הממוקד: <b>{contextCoverage.notSeenInFocusedRange.map((item) => item.label || item.term).join(" · ")}</b>. זו אינה קביעה שהמונח אינו קיים מחוץ לטווח.</small> : null}
        {!contextCoverage.complete ? <small>הבדיקה עדיין חלקית; מונחים שלא הופיעו עוד אינם מסומנים כחסרים.</small> : null}
      </section> : null}
      <small>המילון נגזר משפת התנ״ך הקנונית, מביטויים ומתבניות שנים. צפנים שמורים אינם מזינים את הגילוי.</small>
      {lexiconCounts ? <small>{lexiconCounts.total} מונחים זמינים · {lexiconCounts.corpus} מילים · {lexiconCounts.phrases || 0} ביטויים · {lexiconCounts.years || 0} שנות Basic · {lexiconCounts.research} מהמחקר{lensResult.lexicon?.fallback ? " · מקור הפסוקים לא נטען ולכן הרשימה חלקית" : ""}</small> : null}
      {suggestion ? <section className="els29-native-axis-suggestion" aria-label="ציר מחקר סמוך מוצע">
        <span>נמצא מרכז מחקר סמוך</span><strong>{suggestion.label || suggestion.term}</strong>
        <small>{suggestion.reason} · מרחק {suggestion.distance} תאים. המעבר יתבצע רק בלחיצה ויישמר מסלול חזרה מדויק.</small>
        <button type="button" disabled={addingFinding} onClick={() => onExploreAxis({ ...suggestion, axisHitId: lensResult.target?.hitId, band: suggestion.neighborhood?.band })}
          aria-label={`חקור מתוך הציר המוצע ${suggestion.label || suggestion.term}`}>חקור מתוך הציר המוצע</button>
      </section> : null}
      {groups.length ? <section className="els29-native-neighborhood-groups" aria-label="חבילות מחקר מקומיות">
        <strong>חבילות מקומיות שנמצאו</strong>
        {groups.slice(0, 3).map((group, index) => {
          const terms = [...new Set((group.members || []).map((member) => member.term))];
          const addable = terms.filter((term) => !existing.has(term)).slice(0, Math.max(0, 12 - findings.length));
          return <article key={`${group.kind}-${group.label}-${index}`}><div><b>{group.label}</b><small>{group.description} · {terms.length} ממצאים</small></div>
            <button type="button" disabled={addingFinding || !addable.length} onClick={() => onAddGroup(addable)} aria-label={`אמת את חבילת ${group.label}`}>
              {addable.length ? `אמת חבילה · ${addable.length}` : "כבר במטריצה"}
            </button></article>;
        })}
      </section> : null}
      <div className="els29-native-line-words els29-native-candidate-list" role="region" tabIndex={0} aria-label="חבילת סביבת הציר לפי סדר עדיפות">
        {sections.map((section) => <section key={section.band} className="els29-native-candidate-section" data-neighborhood-band={section.band}>
          <header><strong>{section.label}</strong><small>{section.items.length}</small></header>
          {section.items.map(renderItem)}
        </section>)}
      </div>
      {focused && onExpand ? <button type="button" className="els29-native-expand-core" disabled={addingFinding}
        onClick={() => onExpand({ hitId: lensResult.target?.hitId, researchBundle: lensResult.target?.researchBundle === true, depth: "expanded",
          ...(lensResult.target?.contextTerms?.length ? { contextTerms: lensResult.target.contextTerms } : {}) })}>הרחב עוד טבעת</button> : null}
      {!items.length ? <p className="els29-native-muted">לא נמצאו בחלון הזה מילים או מבנים מקומיים מוכרים. אפשר להגדיל את חלון המטריצה ולסרוק שוב.</p> : null}
      {lensResult.truncated ? <small>נבדקו {lensResult.scanned} מועמדים מקומיים מתוך {lensResult.available}. מוצגת חבילה מוגבלת לפי מבנה וקרבה; היתר לא הוכרזו כחסרים.</small> : null}
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

function RelationshipResearchPlanner({ axisTerm, scope, disabled, onSearchPair }) {
  const [primaryTerm, setPrimaryTerm] = useState(axisTerm || "");
  const [secondTerm, setSecondTerm] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [plan, setPlan] = useState(null);
  const [selectedPairId, setSelectedPairId] = useState(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setPrimaryTerm(axisTerm || "");
    setPlan(null);
    setSelectedPairId(null);
    setNotice("");
  }, [axisTerm]);
  const edit = (setter) => (event) => {
    setter(event.target.value);
    setPlan(null);
    setSelectedPairId(null);
    setNotice("");
  };
  const buildPlan = () => {
    const next = prepareElsRelationshipResearchPlan({ primaryTerm, secondTerm, additionalTerms, scope });
    if (next.error) {
      setPlan(null);
      setSelectedPairId(null);
      setNotice(next.error);
      return;
    }
    setPlan(next);
    setSelectedPairId(next.pairs[0]?.id || null);
    setNotice(`${next.pairs.length} זוגות מוכנים. בחרו זוג אחד להפעלה.`);
  };
  const selectedPair = plan?.pairs.find((pair) => pair.id === selectedPairId) || null;
  const runSelectedPair = () => {
    if (!selectedPair || !plan) return;
    onSearchPair({ ...selectedPair, scope: plan.scope, radius: plan.radius });
    setNotice(`הזוג ${selectedPair.axis} × ${selectedPair.term} נשלח לחיפוש המוצלב הקנוני.`);
  };

  return <section className="els29-native-relationship-plan" data-els-relationship-research="v1" aria-label="מחקר קשרים">
    <header><strong>מחקר קשרים</strong><small>ציר ראשי מול שם משפחה, אדם או ציר נוסף</small></header>
    <p>המערכת מכינה רק את הציר הראשי מול כל יעד שכתבתם — לא את כל השמות מול כולם. כל זוג מופעל בנפרד ורק בלחיצה.</p>
    <div className="els29-native-relationship-fields">
      <label><span>שם או ציר ראשי</span><input value={primaryTerm} onChange={edit(setPrimaryTerm)} maxLength={80} autoComplete="off" /></label>
      <label><span>שם משפחה או ציר שני</span><input value={secondTerm} onChange={edit(setSecondTerm)} maxLength={80} autoComplete="off" placeholder="לדוגמה: כהן" /></label>
      <label className="is-wide"><span>שמות נוספים לבדיקה — אחד בשורה</span><textarea value={additionalTerms} onChange={edit(setAdditionalTerms)} rows={3} maxLength={500} placeholder="לדוגמה: שם של ילד או קשר נוסף" /></label>
    </div>
    <button type="button" className="els29-native-relationship-build" disabled={disabled} onClick={buildPlan}>הכן זוגות לחיפוש</button>
    <small>טיוטת השמות אינה נשמרת ואינה נכנסת לכתובת. רק הזוג שבחרתם נשלח למנוע בלחיצה; אין מיזוג זהויות או חיפוש אוטומטי של בני משפחה.</small>
    {notice ? <p role="status" className="els29-native-relationship-notice">{notice}</p> : null}
    {plan ? <fieldset className="els29-native-relationship-pairs">
      <legend>בחרו זוג אחד לסריקה</legend>
      {plan.pairs.map((pair) => <label key={pair.id}>
        <input type="radio" name="els-relationship-pair" checked={selectedPairId === pair.id} onChange={() => setSelectedPairId(pair.id)} />
        <span><strong><bdi>{pair.axis}</bdi> × <bdi>{pair.term}</bdi></strong><small>{pair.reason} · טווח קרוב עד {plan.radius} תאים</small></span>
      </label>)}
      <button type="button" className="is-primary" disabled={disabled || !selectedPair} onClick={runSelectedPair}>חפש את הזוג הנבחר</button>
    </fieldset> : null}
  </section>;
}

function MatrixDiscoveryResults({ result, pending = false, findings = [], onAddGroup, onOpenFinding, heading = "מילים וממצאים שכדאי לבדוק", description = "" }) {
  if (pending && !result) return <section className="els29-native-discovery-results" aria-live="polite">
    <header><strong>סורק את הממצאים סביב המופע הפתוח…</strong><small>הסריקה מקומית ומוגבלת למטריצה הפעילה; אין טעינה של אוצר המילים הרחב.</small></header>
  </section>;
  if (!result) return null;
  if (result.ok === false) return <section className="els29-native-discovery-results" role="status">
    <header><strong>סריקת סביבת המופע לא הושלמה</strong><small>מופעי הציר נשארו זמינים ולא השתנו.</small></header>
  </section>;
  const items = Array.isArray(result.items) ? result.items : [];
  const rawPatterns = Array.isArray(result.rawPatterns) ? result.rawPatterns : [];
  const groups = Array.isArray(result.groups) ? result.groups.filter((group) => group.kind !== "motif").slice(0, 4) : [];
  const existing = new Set(findings.map((finding) => finding.t));
  const discoveryBundle = result.discoveryBundle?.contract === "els_cipher_discovery_plan_v1" ? result.discoveryBundle : null;
  const languageInspection = result.languageInspection?.contract === "els_matrix_language_inspection_v1"
    && result.languageInspection?.status === "CANDIDATE_INPUT" ? result.languageInspection : null;
  const selectedPair = discoveryBundle?.status === "VERIFIED_PAIR" ? discoveryBundle.selected : null;
  const selectedTerms = (selectedPair?.supports || []).map((support) => support.term);
  const addableSelectedTerms = selectedTerms.filter((term) => !existing.has(term)).slice(0, Math.max(0, 12 - findings.length));
  const renderRow = (item) => {
    const added = existing.has(item.term);
    const contextItem = item.kind === "context" || item.kind === "context-motif";
    return <article className="els29-native-structure-row" key={`${item.kind}-${item.term}`}>
      <div className="els29-native-structure-copy"><b>{item.label || item.term}</b>
        <span>{item.length} אותיות · {contextItem ? "נמצא בחבילת ההקשר" : `חזר ${item.occurrenceCount} פעמים באזור`}</span>
        <small>{item.matrixStage === "A" ? "שלב א׳ · ללא פער בתצוגה" : `שלב ב׳ · מרווח קבוע פי ${item.gapScale}`} · דילוג {item.skip} · מרחק {item.distance} תאים{item.contextVariant ? ` · כתיב חסר של ${item.contextVariant.source}` : ""}</small>
      </div>
      <button type="button" disabled={pending || (!added && findings.length >= 12)} onClick={() => added ? onOpenFinding?.(item.term) : onAddGroup?.([item.term])}>{added ? "פתח במטריצה" : "אמת והצג"}</button>
    </article>;
  };
  const evidence = <>
    {!items.length ? <p className="els29-native-muted">לא נמצא באזור מונח הנתמך בשפת המחקר או בחבילת ההקשר. הדפוסים הגולמיים נשמרו לבדיקה מתקדמת ואינם מוצגים כמילים.</p> : null}
    <div className="els29-native-line-words els29-native-structure-list" role="region" tabIndex={0} aria-label="תגליות במטריצה לפי סדר עדיפות">
      {items.map(renderRow)}
    </div>
    {rawPatterns.length ? <details className="els29-native-structure-settings" data-els-raw-patterns="advanced">
      <summary>דפוסים גולמיים חוזרים · {rawPatterns.length} מוצגים מתוך {result.availableRawPatterns || rawPatterns.length}</summary>
      <small>אלה רצפי אותיות שחזרו בגאומטריה, אך אינם נתמכים כרגע כמילים בשפת המחקר. הם אינם נדחקים לפני מונחים מוכרים ונפתחים רק לבדיקה מתקדמת.</small>
      <div className="els29-native-line-words els29-native-structure-list" role="region" tabIndex={0} aria-label="דפוסים גולמיים לבדיקה מתקדמת">
        {rawPatterns.map(renderRow)}
      </div>
    </details> : null}
    {groups.length ? <div className="els29-native-structure-list" aria-label="קבוצות שנבנו מן הגילוי המקומי">
      {groups.map((group, index) => {
        const terms = [...new Set((group.members || []).map((member) => member.term))];
        const addable = terms.filter((term) => !existing.has(term)).slice(0, Math.max(0, 12 - findings.length));
        return <article key={`${group.kind}-${group.label}-${index}`} className="els29-native-structure-group" data-structure-kind={group.kind}>
          <header><div><strong>{group.label}</strong><small>{group.description}</small></div><bdi>{terms.length}</bdi></header>
          <button type="button" disabled={pending || !addable.length} onClick={() => onAddGroup?.(addable)}>{addable.length ? `אמת והצג קבוצה · ${addable.length}` : "הקבוצה כבר במטריצה"}</button>
        </article>;
      })}
    </div> : null}
    {result.truncated ? <small>הוצגו התוצאות הראשונות לפי תקציב הבטיחות. אפשר לעבור לסריקה הרחבה רק אם יש לכך צורך מחקרי.</small> : null}
  </>;

  return <section className="els29-native-discovery-results" data-els-matrix-discovery={result.contract}>
    <header><strong>{discoveryBundle ? "חבילת גילוי אחת" : `${heading} · ${items.length}`}</strong>
      {description ? <small>{description}</small> : null}
      <small>{result.languageMatches?.length || 0} מילים נתמכות בשפת המחקר · {result.contextMatches?.length || 0} התאמות להקשר · שלב א׳ {result.stageCounts?.A || 0} · שלב ב׳ {result.stageCounts?.B || 0}.</small>
      <small>{result.vocabularyTermsChecked || 0} מונחי הקשר נבדקו.</small>
      <small>נסרקו {result.budget?.matrixPathsChecked || 0} קווי מפה באזור תחום; אוצר המילים הגדול לא נטען.</small>
      {languageInspection ? <small data-els-language-inspection="candidate-ready">מפת שפה תחומה מוכנה · {languageInspection.coverage?.returnedRays || 0} קווים קרובים · לא בוצעה קריאת AI. האותיות קנוניות; החלוקה למילים והמשמעות עדיין אינן מאומתות.</small> : null}</header>
    {selectedPair ? <article className="els29-native-discovery-bundle" data-els-discovery-bundle="verified-pair">
      <header><span>הצופן המוביל לבדיקה</span><strong><bdi>{result.axis?.term}</bdi> + {(selectedPair.supports || []).map((support) => <bdi key={support.term}>{support.label || support.term}</bdi>)}</strong></header>
      <p>{selectedPair.relation?.label}</p>
      <ul>{(selectedPair.reasons || []).map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <div className="els29-native-discovery-supports">{(selectedPair.supports || []).map((support) => <span key={support.term}>
        <b>{support.label || support.term}</b><small>מאומת · {support.matrixStage === "A" ? "ללא פער בתצוגה" : "מבנה מקומי"} · {support.ref || "מקור זמין במטריצה"}</small>
      </span>)}</div>
      <small>נבחר מתוך {discoveryBundle.consideredPairs} זוגות בתחום המקומי. הדילוג המספרי אינו תנאי בחירה.</small>
      <button type="button" disabled={pending || !addableSelectedTerms.length} onClick={() => onAddGroup?.(addableSelectedTerms)}>{addableSelectedTerms.length ? "הצג את שניהם במטריצה" : "שני הממצאים כבר במטריצה"}</button>
      {discoveryBundle.alternatives?.length ? <details><summary>חלופות מאומתות · {discoveryBundle.alternatives.length}</summary>
        {(discoveryBundle.alternatives || []).map((pair) => <p key={pair.supports.map((support) => support.term).join("-")}><b>{pair.supports.map((support) => support.label || support.term).join(" + ")}</b> · {pair.relation?.label}</p>)}
      </details> : null}
    </article> : discoveryBundle ? <article className="els29-native-discovery-bundle is-empty" role="status" data-els-discovery-bundle="bounded-empty">
      <header><span>החיפוש המקומי הושלם</span><strong>עדיין אין זוג מאומת להצגה כצופן מוביל</strong></header>
      <p>{discoveryBundle.status === "NO_CANDIDATE_PAIR" ? "סיבת העצירה: שני מונחים מחוברים לא זוהו בתוך גבולות המטריצה הפעילה." : "סיבת העצירה: הזוגות המקומיים לא עברו אימות קנוני מלא."}</p>
      <small>זו תוצאה מוגבלת לאזור שנבדק, לא הוכחה שאין קשר במקום אחר. אפשר לבדוק את חומר הגלם תחת „מתקדם”.</small>
    </article> : null}
    {discoveryBundle ? <details className="els29-native-structure-settings els29-native-discovery-evidence" data-els-discovery-evidence="advanced">
      <summary>מתקדם · כל הממצאים באזור</summary>{evidence}
    </details> : evidence}
  </section>;
}

function StructuralPriorityRail({ visible, state, lensResult, lensPending, busy, onRun, onScanAxis, onSearchPair, onAddGroup, onOpenFinding }) {
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
    aria-label="כלי מחקר מתקדמים" aria-busy={lensPending} data-experience-capability="els-structural-priority" data-els-advanced-tools="v1">
    <section className="els29-native-structure-intro">
      <span>ציר המחקר הנוכחי</span>
      <strong>{axisTerm}{axisSkip ? <> · דילוג <bdi>{axisSkip}</bdi></> : null}</strong>
      {result?.axis?.notable ? <small className="els29-native-structure-badge">דילוג מסודר: {result.axis.notable.tag}</small> : null}
      <p>הגילוי המקומי והמהיר כבר מופיע בחבילת המחקר של המופע הפעיל. כאן נמצאות רק פעולות יזומות להרחבה, למבנים ולהצלבת צירים.</p>
      <small>שום כלי מתקדם אינו מתחיל לבד. כל תוצאה נשארת מועמדת עד לחיצה על „אמת והצג”.</small>
      <details className="els29-native-structure-settings els29-native-broad-scan">
        <summary>סריקה מילונית רחבה · מתקדם ואיטי</summary>
        <p>הפעולה הזאת עשויה לטעון ולבדוק עשרות אלפי מונחים. היא לעולם אינה מתחילה לבד ומתאימה רק לחיפוש מחקרי מפורש מעבר לגילוי המקומי.</p>
        <div className="els29-native-structure-presets" role="group" aria-label="תבניות סריקת מבנים רחבה">
          <button type="button" aria-pressed={plan.maxDistance === 12 && plan.minLength === 4} onClick={() => choosePreset("quick")}>מהיר</button>
          <button type="button" aria-pressed={plan.maxDistance === 40 && plan.minLength === 4} onClick={() => choosePreset("broad")}>רחב</button>
          <button type="button" aria-pressed={plan.maxDistance === 80 && plan.minLength === 5} onClick={() => choosePreset("deep")}>עמוק</button>
        </div>
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
        <small>הטווח נשאר מוגבל למטריצה הפעילה. „עמוק” אינו מפעיל סדרות דילוג או חוקי מספרים חדשים, אך הוא עדיין כבד יותר מן הגילוי המקומי.</small>
        <div className="els29-native-structure-actions" role="group" aria-label="פעולות סריקה מילונית מתקדמת">
          <button type="button" className="is-primary" disabled={!verified || pending}
            onClick={() => onRun({ hitId: state?.axis?.hitId, structurePlan: plan })}>{lensPending ? "סורק את התוכנית…" : result ? "סרוק את התוכנית מחדש" : "סרוק מבנים בעדיפות"}</button>
          <button type="button" disabled={!verified || pending} onClick={() => onScanAxis({ hitId: state?.axis?.hitId })}>בדוק את המשך הציר במילון</button>
        </div>
      </details>
      <details className="els29-native-structure-settings"><summary>חיפוש מוצלב וציר נוסף</summary>
        <RelationshipResearchPlanner axisTerm={verified ? axisTerm : ""} scope={state?.scope} disabled={!verified || pending} onSearchPair={onSearchPair} />
      </details>
    </section>
    {lensPending ? <p role="status" className="els29-native-muted">קורא את אזור המטריצה ומסדר את מה שהתגלה…</p> : null}
    {result?.ok === false ? <p role="status" className="els29-native-muted">אי אפשר לסרוק מבנים לפני שהציר הראשי אומת.</p> : null}
    {result?.ok ? <>
      <div className="els29-native-structure-summary">
        <strong>קבוצות שנמצאו · {groups.length}</strong>
        <small>{result.structurePlan?.minLength}–{result.structurePlan?.maxLength} אותיות · עד {result.structurePlan?.maxDistance} תאים · לפחות {result.structurePlan?.minMembers} ממצאים בקבוצה.</small>
        <small>הסדר משותף לכל סביבת המחקר: קודם קבוצות שלמות ללא פער, אחריהן קבוצות שלב ב׳; בתוך כל שלב משפחת המבנה, עדות קיימת ומרחק.</small>
      </div>
      <div className="els29-native-line-words els29-native-structure-list" role="region" tabIndex={0} aria-label="קבוצות מבניות לפי סדר עדיפות">
        {groups.map((group, index) => {
          const members = Array.isArray(group.members) ? group.members : [];
          const room = Math.max(0, 12 - findings.length);
          const groupTerms = [...new Set(members.map((member) => member.term))];
          const addable = groupTerms.filter((term) => !existing.has(term)).slice(0, room);
          const allAdded = groupTerms.length > 0 && groupTerms.every((term) => existing.has(term));
          const guidance = STRUCTURE_GUIDANCE[group.kind] || STRUCTURE_GUIDANCE.cluster;
          return <article key={`${group.kind}-${group.label}-${index}`} className="els29-native-structure-group" data-structure-kind={group.kind} data-geometry-stage={group.stage || undefined}>
            <header><div><strong>{group.label}</strong><small>{group.stage === "A" ? "שלב א׳ · כל חברי הקבוצה ללא פער בתצוגה" : `שלב ב׳ · ${group.compactMembers || 0}/${members.length} חברים ללא פער`}</small><small>{group.description}</small></div><bdi>{members.length}</bdi></header>
            <div className="els29-native-structure-members" aria-label={`ממצאי ${group.label}`}>
              {members.map((member, memberIndex) => <span key={`${member.term}-${member.role}-${member.occurrenceOrdinal || memberIndex}`} className={existing.has(member.term) ? "is-added" : ""}>
                <b>{member.label || member.term}</b><small>{member.geometry?.stage === "A" ? "ללא פער" : "עם פער"} · {STRUCTURE_ROLE_LABEL[member.role] || "במבנה"}{member.occurrenceOrdinal ? ` ${member.occurrenceOrdinal}` : ""} · מרחק {member.distance}</small>
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
  const label = request.lens === "matrix-discovery"
    ? progress?.phase === "matrix" ? "קורא את קווי המפה סביב הציר…"
      : progress?.phase === "context" ? "בודק את חבילת ההקשר הקטנה בתוך המפה…"
        : "מסדר מוטיבים וקבוצות שנמצאו…"
    : request.lens === "structure-priority"
    ? progress?.phase === "groups" ? "בונה את קבוצות המבנים וההמלצות…" : progress?.phase === "candidates" ? "סורק את מונחי התורה בחלון המוצג…" : "טוען את מילון התורה ומכין סריקת מבנים…"
    : request.lens === "cross-third-axis"
      ? progress?.phase === "third-axis-verify" ? "מאמת את הציר השלישי במפגשים שנמצאו…" : "מחפש את הציר השלישי בתוך מפגשי ההצלבה…"
    : request.lens === "research-target-compare"
      ? progress?.phase === "verify" ? `מאמת יחד את יעדי המחקר${progress?.current ? ` · ${progress.current}` : ""}…` : "משחזר את ההמשכים המדויקים מתוך התוצאות…"
    : request.lens === "research-target"
      ? progress?.phase === "verify" ? "מאמת את הביטוי המורחב מול המנוע הקנוני…" : "משחזר את ההמשך המדויק מתוך התוצאה…"
    : request.lens === "neighborhood-target"
      ? progress?.phase === "verify" ? "מאמת את הציר הסמוך מול המנוע הקנוני…" : "משחזר את מרכז המחקר מתוך סביבת הציר…"
    : request.lens === "result-triage"
      ? progress?.phase === "context" ? "בודק את מונחי ההקשר סביב כל מופע של הציר…" : progress?.completed ? "ממיין את כל התוצאות ומחפש המשכים מדויקים…" : "טוען את שפת התורה ומכין מיון תוצאות…"
    : request.lens === "matrix-candidates"
      ? progress?.phase === "lexicon-language" ? "קורא את פסוקי המקור ובונה את שפת המחקר…"
        : progress?.phase?.startsWith("lexicon-freeze-") ? "מסיים ומקבע את מילון המחקר…"
        : progress?.phase?.startsWith("lexicon-materialize-") ? "מרכיב את מילון המועמדים לסריקה…"
        : progress?.phase?.startsWith("lexicon-") ? "טוען את שפת התורה ומכין את מילון המחקר…"
        : progress?.phase === "core" ? "סורק את ליבת הציר ברצף ובדילוגים S−1, S, S+1…"
        : progress?.phase === "collect" ? "מכין את הממצאים שנמצאו למיון…"
        : progress?.phase === "rank" ? "ממיין את ממצאי הליבה ובונה חבילה מגוונת…"
        : progress?.phase?.startsWith("verify") ? "מאמת את מועמדי ליבת הציר מול המנוע הקנוני…"
          : progress?.phase === "sources" ? "מצרף את פסוקי המקור לחבילה…"
            : "מרחיב את חלון המטריצה לבקשתך…"
      : request.lens === "line-context" && request.target?.scan
        ? "קורא את המשך הציר ומזהה מילים…"
        : ["verse-context", "letter-context"].includes(request.lens)
          ? "טוען את המקור והפסוק…"
          : "מכין את תוצאת המחקר…";
  const unitLabel = progress?.phase === "matrix" ? "קווי מפה נבדקו"
    : request.lens === "matrix-discovery" && progress?.phase === "context" ? "מונחי הקשר נבדקו"
    : progress?.phase === "lexicon-language" ? "פסוקים נקראו"
    : progress?.phase?.startsWith("lexicon-freeze-") ? "ערכי שפה הוכנו"
    : progress?.phase?.startsWith("lexicon-materialize-") ? "ערכי מועמדים עובדו"
    : progress?.phase === "core" ? "נקודות מוצא נסרקו"
    : progress?.phase === "collect" ? "מועמדים הוכנו"
    : progress?.phase === "rank" ? "צעדי מיון הושלמו"
    : progress?.phase === "verify" ? "מועמדים אומתו"
    : progress?.phase === "third-axis-scan" ? "מפגשים נבדקו"
    : progress?.phase === "third-axis-verify" ? "מופעי ציר שלישי אומתו"
    : progress?.phase === "verify-prepare" ? "רשימת האימות הוכנה"
    : progress?.phase === "sources" ? "מקורות צורפו"
    : progress?.phase === "context" ? "מופעי ציר נבדקו מול ההקשר"
    : "פריטים נבדקו";
  return <div className="els29-native-progress" aria-label="התקדמות בדיקת הממצא">
    <div><strong role="status" aria-live="polite">{label}</strong>
      <small aria-hidden="true">עברו {elapsed.toFixed(1)} שניות · הבדיקה עדיין פעילה</small>
      {progress?.total > 0 ? <><progress max={progress.total} value={progress.completed} aria-label={label} /><small>{progress.completed} מתוך {progress.total} · {unitLabel}</small></> : <progress aria-label={label} />}
      {Number.isSafeInteger(progress?.verified) ? <small><b>{progress.verified}</b> תוצאות כבר אומתו ונשמרו בטיוטת החבילה</small> : null}
      {progress?.resumed ? <small>הבדיקה ממשיכה מנקודת העצירה המאומתת.</small> : null}
      {elapsed >= 8 ? <small>אפשר להמשיך להמתין או לעצור. עצירה אינה משנה את הציר, הממצאים או המטריצה.</small> : null}
    </div>
    <span className="els29-native-progress-actions">
      {elapsed >= 8 && reduction && onReduce ? <button type="button" onClick={onReduce}>{reduction.label}</button> : null}
      <button type="button" onClick={onCancel}>עצור בדיקה</button>
    </span>
  </div>;
}

function ResultTriageSummary({ result, pending, total, visibleCount }) {
  if (pending) return <div className="els29-native-triage-summary" role="status"><strong>ממיין את התוצאות…</strong><small>בודק מילים צמודות לפני ואחרי הממצא, מילים נוספות על אותו ציר וסימני מבנה. אפשר לעצור בלי לשנות את המטריצה.</small></div>;
  if (!result?.ok) return null;
  const requested = result.contextCoverage?.requested || [];
  return <div className="els29-native-triage-summary" data-els-result-triage={result.contract} data-els-geometry-contract={result.geometryContract || undefined}>
    <strong>סדר פתיחה למופעי הציר</strong>
    <small>הציר המדויק נמצא ב־{Number(total) || Number(result.available) || visibleCount || 0} מקומות מאומתים; בעמוד הזה מוצגים {visibleCount || 0}. אלה נקודות פתיחה בלבד — לא מספר המילים, המבנים או הפסוקים שנמצאים סביבן.</small>
    <small>{requested.length ? `המיון בדק סביב כל מופע את ההקשר שביקשתם: ${requested.map((item) => item.label || item.term).join(" · ")}. ` : ""}רצף מדויק לפני או אחרי הממצא וגאומטריה ללא פער מקבלים קדימות. זהו סדר עדיפות לבדיקה, לא ציון אמת.</small>
    {result.lexicon?.fallback ? <small>שפת המקור לא נטענה במלואה ולכן בדיקת ההמשך חלקית.</small> : null}
  </div>;
}

function SavedResearchBundles({ result }) {
  const bundles = Array.isArray(result?.savedBundles) ? result.savedBundles : [];
  if (!bundles.length) return null;
  return <section className="els29-native-saved-bundles" aria-label="צפני מחקר ציבוריים מוכנים" data-els-research-bundle={result.bundleContract}>
    <header><strong>צפני מחקר ציבוריים שכבר מוכנים</strong><small>אותו מקור ציבורי, משוחזר מהעוגנים השמורים ומדורג לפי גאומטריה חיה.</small></header>
    {bundles.map((bundle) => <a key={`${bundle.href || bundle.term}-${bundle.skip}`} href={bundle.href || undefined} aria-label={`פתח חבילת מחקר ${bundle.title}`}>
      <b>{bundle.rank}. {bundle.title}</b>
      <small>שלב א׳ · {bundle.compactFindings}/{bundle.selectedFindings} ממצאים ללא פער · דילוג ציר {bundle.skip}</small>
      <small>{(bundle.reasons || []).join(" · ")}</small>
    </a>)}
  </section>;
}

function collectResultResearchTargets(result) {
  const byKey = new Map();
  for (const target of result?.researchTargets || []) {
    const key = String(target?.key || "");
    if (!key || !target?.term || byKey.has(key)) continue;
    const findings = Array.isArray(target.findings) && target.findings.length
      ? target.findings.filter((finding) => finding?.term).slice(0, 6)
      : [{ baseTerm: target.baseTerm, term: target.term, label: target.label || target.term, gain: target.gain }];
    byKey.set(key, { ...target, key, findings, kind: result.kind, setId: result.setId, page: result.page });
  }
  if (!byKey.size) for (const row of result?.items || []) {
    const findings = [], seen = new Set();
    for (const signal of row.signals || []) for (const extension of signal.targetable === false ? [] : signal.extensions || []) {
      if (!extension?.term || seen.has(extension.term)) continue;
      seen.add(extension.term); findings.push({ ...extension, baseTerm: signal.term });
    }
    const preferred = findings[0];
    if (!preferred) continue;
    byKey.set(String(row.key), { kind: result.kind, setId: result.setId, page: result.page, key: String(row.key), baseTerm: preferred.baseTerm,
      term: preferred.term, label: preferred.label || preferred.term, gain: preferred.gain, rank: row.rank, skip: Number(row.skip), direction: row.direction || null,
      ref: row.ref || null, findings: findings.slice(0, 6), findingCount: findings.length, reasons: row.reasons || [] });
  }
  return [...byKey.values()].slice(0, 8);
}

function researchTargetSkipLabel(target) {
  const skip = Number(target?.skip);
  if (!Number.isInteger(skip) || skip < 1) return null;
  return `${target.direction === "back" ? "−" : ""}${Math.abs(skip)}`;
}

function ResearchTargetComparison({ result, pending, onOpen }) {
  if (pending || result?.lens !== "research-target-compare") return null;
  if (!result.ok) return <p role="status">השוואת היעדים לא הושלמה. התוצאות והמטריצה לא השתנו.</p>;
  const rows = Array.isArray(result.rows) ? result.rows : [];
  return <section className="els29-native-research-comparison" aria-label="השוואת חבילות מחקר" data-els-research-comparison={result.contract}>
    <header><strong>{result.verified} חבילות מחקר אומתו יחד</strong><small>כל חבילה מייצגת מופע אחר של הציר. הסדר מבוסס על רצף מדויק ועדיפות הבדיקה שכבר חושבה; זו השוואת מחקר, לא ציון אמת או טענה סטטיסטית.</small></header>
    {rows.map((row, index) => <article key={`${row.key}-${row.term}`} data-comparison-status={row.status} data-comparison-term={row.term}>
      <span>{index + 1}</span><div><b>{row.label}</b>
        <small>{row.status === "VERIFIED" ? `אומת · ${researchTargetSkipLabel(row) ? `דילוג ${researchTargetSkipLabel(row)} · ` : ""}המשך מדויק של ${row.gain || 0} אותיות · מקורו בהמלצה ${row.rank || "—"}` : "לא עבר אימות; אינו זמין לפתיחה"}</small>
        {(row.findings || []).length ? <small>ממצאים סביב המופע: {row.findings.slice(0, 4).map((finding) => finding.label || finding.term).join(" · ")}</small> : null}
        {(row.reasons || []).length ? <small>{row.reasons.slice(0, 2).join(" · ")}</small> : null}</div>
      {row.status === "VERIFIED" ? <button type="button" aria-label={`פתח חבילת מחקר ${row.label}`} onClick={() => onOpen(row)}>פתח חבילת מחקר</button> : null}
    </article>)}
    {result.failed ? <small>{result.failed} יעדים לא עברו אימות ונשארו מחוץ למטריצה.</small> : null}
  </section>;
}

function ResultResearchTargets({ result, comparisonResult, pending, onOpen, onCompare }) {
  const targets = collectResultResearchTargets(result);
  if (!targets.length) return null;
  return <section className="els29-native-research-targets" aria-label="חבילות מחקר לפי מופע הציר" data-els-research-targets="els_research_bundle_v1">
    <header><strong>חבילות מחקר לפי מופע הציר</strong><small>כל מופע של הציר מוצג פעם אחת בלבד. בתוך כל חבילה מרוכזים כמה המשכים שנמצאו סביב אותו ציר מדויק.</small></header>
    {targets.length >= 2 ? <button type="button" className="is-compare" aria-label={`השווה את ${Math.min(3, targets.length)} חבילות המחקר`} disabled={pending} onClick={() => onCompare(targets.slice(0, 3))}>
      <b>השווה את {Math.min(3, targets.length)} חבילות המחקר</b><small>המערכת תאמת מופעים שונים ותראה מה כדאי לפתוח קודם.</small>
    </button> : null}
    <ResearchTargetComparison result={comparisonResult} pending={pending} onOpen={onOpen} />
    <ul className="els29-native-research-target-list" aria-label="מופעי ציר שונים">
      {targets.map((target) => <li key={target.key}><button type="button" disabled={pending} onClick={() => onOpen(target)}>
          <b>{target.label}</b>
          <small>{researchTargetSkipLabel(target) ? `דילוג ${researchTargetSkipLabel(target)} · ` : ""}{target.ref ? `${target.ref} · ` : ""}מופע מדורג {target.rank}</small>
          <small>ממצאים סביבו: {(target.findings || []).slice(0, 4).map((finding) => finding.label || finding.term).join(" · ")}</small>
        </button></li>)}
    </ul>
  </section>;
}

function ResultTriageNote({ row }) {
  if (!row) return null;
  const extensions = (row.signals || []).flatMap((signal) => signal.extensions || []);
  const contextCoverage = row.contextCoverage;
  return <>
    <small className={`els29-native-triage-rank is-${row.tier}`}>{row.tier === "recommended" ? `מומלץ לפתוח קודם · מקום ${row.rank}` : row.tier === "inspect" ? `מעניין לבדיקה · מקום ${row.rank}` : `זמין לבדיקה · מקום ${row.rank}`}</small>
    <small>{(row.reasons || []).slice(0, 3).join(" · ")}</small>
    {contextCoverage?.found?.length ? <small>הקשר שנראה בטווח: <b>{contextCoverage.found.map((item) => item.label || item.term).join(" · ")}</b></small> : null}
    {contextCoverage?.requested?.length && !contextCoverage.found?.length ? <small>מונחי ההקשר עדיין לא נראו בטווח הממוקד של המופע; הם ייבדקו שוב באימות החבילה.</small> : null}
    {extensions.length ? <small>הרחבות: {[...new Set(extensions.map((item) => item.label || item.term))].slice(0, 3).join(" · ")}</small> : null}
  </>;
}

function ActiveResearchBundle({ bundle, lensResult, pending, onBack }) {
  if (!bundle) return null;
  const packageResult = lensResult?.lens === "matrix-candidates" && lensResult?.target?.researchBundle === true ? lensResult : null;
  const items = packageResult?.items || [];
  const compact = items.filter((item) => item.geometry?.stage === "A").length;
  const groups = packageResult?.groups || [];
  const guide = projectElsResearchPackageGuide(packageResult);
  return <section className="els29-native-active-bundle" data-els-research-bundle="els_research_bundle_v1">
    <header><span>חבילת מחקר · המלצה {bundle.rank || "—"}</span><strong>{bundle.label}</strong></header>
    <small>{(bundle.reasons || []).slice(0, 3).join(" · ")}</small>
    {pending ? <small role="status">המטריצה נפתחה; כעת נאספים הממצאים הקרובים והמשכי הצירים לאותה חבילה…</small>
      : packageResult ? <><small role="status">{packageResult.scanMode === "focused"
        ? `ליבת החבילה מוכנה: ${packageResult.verification?.verified || 0} מופעי ELS מאומתים · ${packageResult.verification?.sourceExact || 0} רצפי מקור · ${groups.length} קבוצות מבנה.`
        : `ההרחבה מוכנה: ${compact} ממצאים בשלב א׳ ללא פער · ${Math.max(0, items.length - compact)} בשלב ב׳ · ${groups.length} קבוצות מבנה.`}</small>
        {groups.length ? <small>מבנים מובילים: {groups.slice(0, 3).map((group) => group.label).join(" · ")}</small> : null}</>
        : <small>המטריצה פתוחה על העוגן המדויק. אפשר להמשיך בחיפוש ידני או לחזור לשלוש ההמלצות.</small>}
    {guide ? <section className="els29-native-package-guide" aria-label="מה חבילת המחקר אומרת">
      <strong>מה נמצא בפועל</strong>
      {guide.facts.length ? <ul>{guide.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p>לא נוספו ממצאים מאומתים בחבילה המצומצמת.</p>}
      <p><b>מה לבדוק קודם:</b> {guide.inspectFirst}</p>
      <p><b>הצעד הבא:</b> {guide.next}</p>
      <small>{guide.boundary}</small>
    </section> : null}
    <button type="button" disabled={pending} onClick={onBack}>{bundle.fromAdvanced ? "חזור לתוכנית המטרות" : bundle.fromExtension ? "חזור בדיוק לתוצאות" : "חזור להמלצות ולכל התוצאות"}</button>
  </section>;
}

function GuidedOccurrenceCoverage({ coverage, failure, onContinue, onRetry, onOpen }) {
  if (!coverage) return null;
  const checked = coverage.coverage?.inspectedCount || 0;
  const scheduled = coverage.coverage?.scheduledCount || 0;
  const recommendation = coverage.recommendation;
  return <section className="els29-native-discovery-results" data-els-guided-coverage={coverage.contract} aria-live="polite">
    <header><strong>בדיקת המופעים המובילים</strong><small>המנוע בודק קודם עד ארבעה מופעים לפי ההקשר והמבנה, בלי להעדיף מספר דילוג בולט.</small></header>
    {failure ? <><p>הבדיקה נעצרה במופע הנוכחי ולא הוסקה מסקנה מן המופעים שטרם נבדקו.</p>
      <button type="button" onClick={onRetry}>נסה שוב את המופע</button></> : recommendation ? <>
      <strong>נמצא צופן מוביל לבדיקה</strong>
      <p><b>{recommendation.supports.map((support) => support.label || support.term).join(" × ")}</b> · {recommendation.relation.label}</p>
      <small>מופע {recommendation.occurrence.ordinal} · דילוג <bdi>{recommendation.occurrence.direction === "back" || recommendation.occurrence.direction === -1 ? "−" : ""}{recommendation.occurrence.skip}</bdi>{recommendation.occurrence.ref ? ` · ${recommendation.occurrence.ref}` : ""}</small>
      <button type="button" onClick={() => onOpen(recommendation.occurrence)}>פתח את המופע המוביל</button>
    </> : coverage.status === "INSPECTING" ? <p role="status">נבדקו {checked} מתוך {scheduled} מופעים בגל הזה. בודק כעת את מופע {coverage.nextOccurrence?.ordinal || checked + 1}…</p>
      : coverage.status === "AWAITING_CONTINUATION" ? <>
        <p>ארבעת המופעים הראשונים נבדקו ולא נמצא בהם עדיין זוג מאומת בעל גיאומטריה חזקה.</p>
        <small>שאר המופעים לא הוכרזו כחסרים. אפשר לאשר גל אחד נוסף של עד ארבעה מופעים.</small>
        <button type="button" onClick={onContinue}>בדוק עוד עד 4 מופעים</button>
      </> : <>
        <p>הבדיקה המוגבלת הסתיימה בלי המלצה חזקה.</p>
        <small>{coverage.coverage?.remainingUnscheduledCount ? `${coverage.coverage.remainingUnscheduledCount} מופעים נשארו מחוץ לתקציב ואינם ראיה שלילית.` : "לא מוצגת ערימת ממצאים חלשים; אפשר לעבור לבדיקה ידנית."}</small>
      </>}
  </section>;
}

function RegularResultsRail({ state, pending, operation, visible, onSelect, onRetry, onOpenResearchTarget, onCompareResearchTargets, comparisonResult, researchTargetPending, triageResult, triagePending, discoveryResult, discoveryPending, guidedCoverage, guidedFailure, onContinueGuided, onRetryGuided, onOpenGuided, onAddDiscovery, onOpenDiscovery }) {
  const results = state?.search?.occurrences;
  const blocked = pending || ["empty", "error", "cancelled"].includes(operation?.status);
  const items = blocked ? [] : results?.items || [];
  const triage = triageResult?.kind === "regular" && triageResult?.setId === results?.id && Number(triageResult?.page) === Number(results?.page) ? triageResult : null;
  const triageByKey = new Map((triage?.items || []).map((item) => [item.key, item]));
  const orderedItems = triage ? [...items].sort((a, b) => (triageByKey.get(a.hitId)?.rank || Number.MAX_SAFE_INTEGER) - (triageByKey.get(b.hitId)?.rank || Number.MAX_SAFE_INTEGER)) : items;
  const discovery = discoveryResult?.target?.hitId === state?.axis?.hitId ? discoveryResult : null;
  return <div className="els29-native-workrail els29-native-results" hidden={!visible} aria-label="רשימת תוצאות החיפוש" aria-busy={pending}>
    <strong>{pending ? "מחפש מופעים…" : items.length ? `${results.total} מופעים מדויקים של הציר` : "תוצאות החיפוש"}</strong>
    <p className="els29-native-muted">{items.length ? state?.termRaw || state?.term : operation?.payload?.term || state?.termRaw || state?.term} · {scopeLabel(items.length ? state?.scope : operation?.payload?.scope || state?.scope)}</p>
    {items.length ? <>
      <small>אלו המקומות שבהם הציר עצמו נמצא. הממצאים סביב המופע הפתוח מוצגים בנפרד מיד אחרי סדר הפתיחה.</small>
      {results.capped ? <small>הסריקה מוגבלת; זאת רשימת המופעים שנמצאו בסריקה הזאת, ולא כל המופעים האפשריים.</small> : null}
      <ResultTriageSummary result={triage} pending={triagePending} total={results.total} visibleCount={items.length} />
      <strong>מופעי הציר המדויק · {items.length} בעמוד הזה מתוך {results.total}</strong>
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
      <GuidedOccurrenceCoverage coverage={guidedCoverage} failure={guidedFailure} onContinue={onContinueGuided} onRetry={onRetryGuided} onOpen={onOpenGuided} />
      <MatrixDiscoveryResults result={discovery} pending={discoveryPending} findings={state?.findings || []}
        onAddGroup={onAddDiscovery} onOpenFinding={onOpenDiscovery} heading="מילים והקשרים סביב המופע הנבחר"
        description="זוהי הסריקה המקומית והמהירה של המטריצה הפעילה. היא שייכת לחבילת המחקר ואינה משנה את מספר מופעי הציר." />
      <SavedResearchBundles result={triage} />
      <ResultResearchTargets result={triage} comparisonResult={comparisonResult} pending={pending || triagePending || researchTargetPending} onOpen={onOpenResearchTarget} onCompare={onCompareResearchTargets} />
    </> : <p role="status">{pending ? "התוצאות יופיעו כאן בסיום החיפוש והאימות." : operation?.status === "error" ? operation.message || "החיפוש או האימות לא הושלמו. נסו שוב." : operation?.status === "cancelled" ? "החיפוש בוטל." : operation?.status === "empty" ? "לא נמצאו מופעים מאומתים בסריקה הזאת. אפשר לשנות מונח או היקף ולנסות שוב." : "חפשו מונח כדי לראות כאן את המופעים שלו."}</p>}
    {["error", "empty", "cancelled"].includes(operation?.status) ? <button type="button" onClick={onRetry}>נסה שוב</button> : null}
  </div>;
}

function CrossThirdAxisResearch({ state, results, busy, pending, result, onRun, onSelectMeeting }) {
  const [term, setTerm] = useState("");
  const [meetingScope, setMeetingScope] = useState("selected");
  useEffect(() => { setMeetingScope("selected"); }, [results?.id]);
  const selectedIndex = Number(state?.search?.zoneIndex) || 0;
  const currentResult = result?.target?.setId === results?.id ? result : null;
  const submit = (event) => {
    event.preventDefault();
    const requested = clean(term);
    if (!requested || pending || busy) return;
    onRun({ setId: results.id, term: requested, meetingScope, meetingIndex: selectedIndex, maxDistance: 18 });
  };
  return <section className="els29-native-third-axis" aria-label="חיפוש ציר שלישי בתוך מפגשי ההצלבה" data-els-third-axis="v1">
    <header><strong>הוסף ציר שלישי למפגש</strong><small>החיפוש נשאר בתוך מפגש מאומת — לא מתחיל שוב סריקה של כל התורה.</small></header>
    <form onSubmit={submit}>
      <label><span>המילה או השם השלישי</span><input value={term} onChange={(event) => setTerm(event.target.value)} maxLength={26} autoComplete="off" placeholder="לדוגמה: שם נוסף" /></label>
      <fieldset><legend>איפה לבדוק</legend>
        <label><input type="radio" name="els-third-axis-scope" checked={meetingScope === "selected"} onChange={() => setMeetingScope("selected")} />במפגש הפתוח · {selectedIndex + 1}</label>
        <label><input type="radio" name="els-third-axis-scope" checked={meetingScope === "all"} onChange={() => setMeetingScope("all")} />בכל המפגשים המאומתים</label>
      </fieldset>
      <button type="submit" disabled={busy || pending || !clean(term)}>{pending ? "מחפש ציר שלישי…" : "מצא ציר שלישי"}</button>
    </form>
    {currentResult?.ok === false ? <p role="status" className="els29-native-muted">{currentResult.reason === "invalid-term" ? "כתבו לפחות שתי אותיות." : currentResult.reason === "results-changed" ? "תוצאות ההצלבה השתנו. הפעילו את החיפוש על הרשימה הנוכחית." : "חיפוש הציר השלישי לא הושלם. המפגשים הקיימים נשמרו."}</p> : null}
    {currentResult?.ok ? <div className="els29-native-third-axis-results" data-els-third-axis-contract={currentResult.contract}>
      <strong>{currentResult.items?.length ? `${currentResult.items.length} מפגשים משולשים מאומתים` : "לא נמצא ציר שלישי בטווח הזה"}</strong>
      <small>נבדקו {currentResult.searchedMeetings} מפגשים, עד {currentResult.maxDistance} תאים מכל אחד משני הצירים. התוצאה אינה טענה על מקומות מחוץ לחלונות האלה.</small>
      {(currentResult.items || []).map((item) => <article key={item.key}>
        <div><b>{item.axis} × {(item.terms || []).join(" · ")} × {item.label || item.thirdTerm}</b>
          <small>מפגש {item.meetingIndex + 1} · {item.status === "SOURCE_EXACT" ? "רצף מקור מדויק" : `דילוג ${item.skip}`} · מרחק מרבי {item.maxDistance} תאים</small>
          <small>{item.ref} · {directionLabel(item.direction)}</small>
        </div>
        <button type="button" disabled={busy} onClick={() => onSelectMeeting("meeting-select", { setId: results.id, index: item.meetingIndex })}>פתח את המפגש</button>
      </article>)}
    </div> : null}
  </section>;
}

function CrossResultsRail({ state, pending, outcome, visible, onSelect, onContinue, onRetry, onFindThirdAxis, thirdAxisResult, thirdAxisPending, onOpenResearchTarget, onCompareResearchTargets, comparisonResult, researchTargetPending, triageResult, triagePending }) {
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
      <CrossThirdAxisResearch state={state} results={results} busy={pending} pending={thirdAxisPending} result={thirdAxisResult} onRun={onFindThirdAxis} onSelectMeeting={onSelect} />
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
      <ResultResearchTargets result={triage} comparisonResult={comparisonResult} pending={pending || triagePending || researchTargetPending} onOpen={onOpenResearchTarget} onCompare={onCompareResearchTargets} />
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

function FindingsRail({ onHighlightVerse, verseHighlight, activeTool, state, selected, lensResult, lensPending, operation, searchPending, onCancel, onScan, onSource, onDiscover, onSelectTarget, onAxisControl, onAddLineFinding, onAddGroup, onExploreAxis, onFindingsChange, onFindingControl, researchProfile, canReplacePrimary, journeyBusy, onPromote, openDetails, researchBundle, onBackToResults }) {
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
      <ActiveResearchBundle bundle={researchBundle} lensResult={lensResult} pending={lensPending} onBack={onBackToResults} />
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
            <button type="button" className="els29-native-discover-all" aria-label="בנה חבילת סביבת הציר"
              disabled={!verified || pending || lensPending} onClick={() => onDiscover({ hitId: state.axis.hitId })}>
              {lensPending ? "בונה את סביבת הציר…" : "בנה חבילת סביבת הציר"}
            </button>
            <small className="els29-native-discover-note">זמין לכל צופה במצב מחקר. מתחיל רק בלחיצה ומסדר מקבילות, חציות, רצפים, ביטויים ושנים סביב הציר — בלי לשנות את הצופן השמור.</small>
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
          <summary>{lensResult?.lens === "matrix-candidates" ? "חבילת סביבת הציר" : lensResult?.lens === "line-context" ? (lensResult.scan ? "תוצאות סריקת הציר" : "המשך הציר") : lensPending ? "טוען…" : "מקור ופסוק"}</summary>
          {lensPending ? <p role="status">טוען את הציר הנבחר…</p> : <SourceLens onHighlightVerse={onHighlightVerse} verseHighlight={verseHighlight} lensResult={lensResult} findings={findings} onAddLineFinding={onAddLineFinding}
            onAddGroup={onAddGroup} onExploreAxis={onExploreAxis}
            onExpand={(expandTarget) => onDiscover(expandTarget)}
            onResume={(resumeTarget) => onDiscover({ hitId: resumeTarget?.hitId || state.axis.hitId, resume: true })}
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

export default function ElsNativeClassic2029({ initialSeed = "", matrix = null, active = true, researchProfile = true, researchLoad = null, researchProbe = null, onResearchProbeResult, onResearchLoadError, onReturnToResearchPlan, onSearchStart, onSaved, onDeleteSaved, formsPreviewRequest = null, onFormsPreviewResult, onLanguageInspection }) {
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
  const crossSearchOpen = researchProfile && crossOpen;
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
  // The bounded matrix-first projection belongs to the selected occurrence in the Results rail.
  // It is not another engine/store and may never outlive or mutate the engine-owned axis identity.
  const [resultDiscovery, setResultDiscovery] = useState(null);
  const resultDiscoveryKeyRef = useRef(null);
  // A bounded queue over reports from the existing matrix-discovery lens. This is ephemeral
  // presentation progress only: it is not ELS state, persistence or another result bundle.
  const [guidedOccurrenceRun, setGuidedOccurrenceRun] = useState({ key: null, approvedBatches: 1, inspections: [], failure: null });
  const [researchBundle, setResearchBundle] = useState(null);
  const pendingResearchBundleRef = useRef(null);
  const [activeResearchContext, setActiveResearchContext] = useState(null);
  const researchCommandRef = useRef(null);
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
    setResultDiscovery(null);resultDiscoveryKeyRef.current = null;
    setGuidedOccurrenceRun(emptyGuidedOccurrenceRun());
    setResearchBundle(null);pendingResearchBundleRef.current = null;
    setActiveResearchContext(null);researchCommandRef.current = null;
    setDeleteConfirm(false);setDeletePending(false);setDeleteError(false);
    const view = matrix.positions?.view || {};
    setClassicGlyphs(view.classicGlyphs === true);setHeightExpanded(view.heightExpanded === true);
    setShortSkipView(view.shortSkipView === "columns" ? "columns" : "reading");
    setJourneyLoad(null);setJourneyPending(null);journeyPendingRef.current = null;setJourneyTrail([]);setSavedAxisReplacement(null);
  }, [matrix?.id]);
  useEffect(() => {
    if (!researchLoad) return;
    if (researchLoad.researchCommand === true) return;
    setResultTriage(null);resultTriageKeyRef.current = null;
    setResultDiscovery(null);resultDiscoveryKeyRef.current = null;
    setGuidedOccurrenceRun(emptyGuidedOccurrenceRun());
    if (researchLoad.researchBundle === true) {
      const bundle = { contract: "els_research_bundle_v1", kind: "advanced-plan", label: researchLoad.term,
        expectedHitId: researchLoad.hitId, status: "opening", fromAdvanced: true, contextTerms: safeResearchContextTerms(researchLoad.contextTerms) };
      setResearchBundle(bundle);pendingResearchBundleRef.current = bundle;
    } else { setResearchBundle(null);pendingResearchBundleRef.current = null; }
    const contextTerms = safeResearchContextTerms(researchLoad.contextTerms), discoveryGoal = safeDiscoveryGoal(researchLoad.discoveryGoal);
    setActiveResearchContext(contextTerms.length || discoveryGoal ? { anchor: researchLoad.term, contextTerms, discoveryGoal } : null);
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
    setResultDiscovery(null);resultDiscoveryKeyRef.current = null;
    setGuidedOccurrenceRun(emptyGuidedOccurrenceRun());
    setResearchBundle(null);pendingResearchBundleRef.current = null;
    setClassicOpen(false);
    ++findingsSeqRef.current;
    const seq = ++searchSeqRef.current;
    const requestedWindowSize = payload.windowSize || windowSize;
    const contextTerms = safeResearchContextTerms(payload.contextTerms), discoveryGoal = safeDiscoveryGoal(payload.discoveryGoal);
    const trackedPayload = { ...payload, ...(contextTerms.length ? { contextTerms } : {}), ...(discoveryGoal ? { discoveryGoal } : {}), windowSize: requestedWindowSize };
    setActiveResearchContext(contextTerms.length || discoveryGoal ? { anchor: clean(payload.term || payload.axis), contextTerms, discoveryGoal } : null);
    setOperations({ search: { kind: "search", searchKind: kind, requestId: seq, status: "searching", startedAt: Date.now(), previousAxis: engineStateRef.current?.axis?.hitId, payload: trackedPayload }, findings: null });
    setActiveTool("results");
    const { contextTerms: _contextTerms, discoveryGoal: _discoveryGoal, ...enginePayload } = trackedPayload;
    setSearchRequest({ kind, ...enginePayload, seq });
  };

  useEffect(() => {
    if (researchLoad?.researchCommand !== true || researchLoad.contract !== "els_anchor_context_request_v1" || researchCommandRef.current === researchLoad.researchNonce) return;
    const term = safeResearchAxis(researchLoad.term), contextTerms = safeResearchContextTerms(researchLoad.contextTerms), discoveryGoal = safeDiscoveryGoal(researchLoad.discoveryGoal);
    if (!term) return;
    researchCommandRef.current = researchLoad.researchNonce;
    setQuery(term);
    requestSearch("regular", { term, scope: researchLoad.scope === "tanakh" ? "tanakh" : "torah", contextTerms, ...(discoveryGoal ? { discoveryGoal } : {}) });
    requestAnimationFrame(() => cameraStageRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [researchLoad?.researchNonce]);

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
    if (crossSearchOpen) { submitCross(); return; }
    const term = clean(query);
    if (term.length < 2) {
      setNotice("כתבו לפחות שתי אותיות.");
      return;
    }
    requestSearch("regular", { term, scope: activeScope });
  };

  const switchScope = (scope) => {
    if (crossSearchOpen) { submitCross(scope); return; }
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

  const startRelationshipCross = (pair) => {
    const axis = clean(pair?.axis), term = clean(pair?.term);
    if (axis.length < 2 || term.length < 2) {
      setNotice("אי אפשר להתחיל מחקר קשרים בלי שני צירים תקינים.");
      return;
    }
    const scope = pair?.scope === "tanakh" ? "tanakh" : "torah";
    const radius = clamp(Number(pair?.radius) || 18, 2, 20);
    setQuery(axis);
    setCrossTerm(term);
    setCrossOpen(true);
    setCrossRadius(radius);
    crossRadiusDraftRef.current.submitted = { value: radius, revision: crossRadiusDraftRef.current.revision };
    requestSearch("cross", { axis, term, scope, radius });
  };

  const handleEngineState = (next) => {
    const previous = engineStateRef.current;
    if (previous?.axis?.hitId !== next?.axis?.hitId || previous?.scope !== next?.scope || previous?.term !== next?.term || next?.status !== "ok") {
      resetReadContext();
      if (previous?.axis?.hitId !== next?.axis?.hitId || previous?.scope !== next?.scope || previous?.term !== next?.term) {
        ++findingsSeqRef.current;
        setOperations((current) => ({ ...current, findings: null }));
        setResultDiscovery(null);resultDiscoveryKeyRef.current = null;
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
    const pendingBundle = pendingResearchBundleRef.current;
    if (pendingBundle && next?.status === "ok" && next?.verification?.state === "MATCH"
      && (!pendingBundle.expectedHitId || pendingBundle.expectedHitId === next?.axis?.hitId)) {
      pendingResearchBundleRef.current = null;
      setResearchBundle({ ...pendingBundle, axisHitId: next.axis.hitId, status: "ready" });
      requestAnimationFrame(() => requestLens("matrix-candidates", { hitId: next.axis.hitId, researchBundle: true,
        ...(pendingBundle.contextTerms?.length ? { contextTerms: pendingBundle.contextTerms } : {}) }));
    }
    const pendingJourney = journeyPendingRef.current;
    const journeyComplete = pendingJourney?.kind === "return"
      ? journeySnapshotMatches(next, pendingJourney.snapshot)
      : pendingJourney?.kind === "target"
        ? journeyAnchorMatches(next, pendingJourney.target) && (next?.termRaw || next?.term) === pendingJourney.targetTerm
        : journeyAnchorMatches(next, pendingJourney?.target);
    if (pendingJourney && journeyComplete) {
      if (pendingJourney.kind === "promote") {
        setJourneyTrail((current) => [...current, pendingJourney.returnStep]);
        setNotice(pendingJourney.saveAfterPromote
          ? `הממצא ${pendingJourney.targetLabel} הפך לציר הראשי. שמרו כדי להסיר את ${pendingJourney.returnStep.label} מאותו צופן.`
          : `הממצא ${pendingJourney.targetLabel} הפך לציר הראשי. אפשר לחזור בדיוק לציר הקודם.`);
        if (pendingJourney.saveAfterPromote) setActiveTool("research");
      } else if (pendingJourney.kind === "target") {
        setJourneyTrail((current) => [...current, pendingJourney.returnStep]);
        setNotice(`יעד המחקר ${pendingJourney.targetLabel} אומת ונפתח. החבילה נאספת סביב המטריצה המדויקת.`);
        setActiveTool("findings");
      } else {
        setJourneyTrail(pendingJourney.nextTrail);
        setNotice(`חזרתם בדיוק לציר ${pendingJourney.targetLabel}.`);
        if (pendingJourney.destination === "results") {
          pendingResearchBundleRef.current = null;
          setResearchBundle(null);
          setActiveTool("results");
        }
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
      if (["occurrence-select", "meeting-select"].includes(action) && researchProfile && resultTriage?.ok) {
        const key = action === "occurrence-select" ? value?.hitId : String(value?.index);
        const row = resultTriage.items?.find((item) => String(item.key) === String(key));
        const resultItem = action === "meeting-select"
          ? engineStateRef.current?.search?.results?.items?.find((item) => item.index === value?.index)
          : engineStateRef.current?.search?.occurrences?.items?.find((item) => item.hitId === value?.hitId);
        if (row) {
          const bundle = { contract: "els_research_bundle_v1", kind: resultTriage.kind, setId: resultTriage.setId, key: row.key,
            rank: row.rank, label: action === "meeting-select" ? `${row.axis || resultItem?.axis || "מפגש"} · ${(row.terms || resultItem?.terms || []).join(" · ")}`
              : `${engineStateRef.current?.termRaw || engineStateRef.current?.term || "ממצא"} · מופע ${row.ordinal || resultItem?.ordinal || ""}`,
            reasons: row.reasons || [], expectedHitId: value?.hitId || resultItem?.hitId || null, status: "opening",
            contextTerms: safeResearchContextTerms(activeResearchContext?.contextTerms) };
          pendingResearchBundleRef.current = bundle;setResearchBundle(bundle);
        } else if (activeResearchContext?.contextTerms?.length) {
          const bundle = { contract: "els_research_bundle_v1", kind: resultsAreCross ? "cross" : "regular", label: clean(engineStateRef.current?.termRaw || engineStateRef.current?.term || "ממצא"),
            reasons: ["מופע של הציר שנבחר בתוכנית ההקשר"], expectedHitId: value?.hitId || resultItem?.hitId || null, status: "opening",
            contextTerms: safeResearchContextTerms(activeResearchContext.contextTerms) };
          pendingResearchBundleRef.current = bundle;setResearchBundle(bundle);
        } else { pendingResearchBundleRef.current = null;setResearchBundle(null); }
      } else if (["occurrence-prev", "occurrence-next"].includes(action)) {
        pendingResearchBundleRef.current = null;setResearchBundle(null);
      }
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
    const resultsDiscovery = lens === "matrix-discovery" && target.surface === "results";
    openTool(resultsDiscovery || ["result-triage", "research-target", "research-target-compare", "cross-third-axis"].includes(lens) ? "results" : ["structure-priority", "matrix-discovery"].includes(lens) ? "structures" : "findings");
    const seq = ++lensSeqRef.current;
    if (!resultsDiscovery && !(lens === "matrix-candidates" && target.resume === true && lensResult?.partial)) setLensResult(null);
    setLensProgress(null);
    setLensPending(true);
    setLensRequest({ lens, target: { ...target, nativeSeq: seq }, startedAt: Date.now() });
  };

  const cancelLens = () => {
    if (lensRequest?.lens === "result-triage") resultTriageKeyRef.current = null;
    if (["research-target", "neighborhood-target"].includes(lensRequest?.lens)) { pendingResearchBundleRef.current = null;setResearchBundle(null); }
    const seq = ++lensSeqRef.current;
    setLensRequest({ lens: "cancel", target: { nativeSeq: seq }, cancelled: true });
    const retainedVerified = lensRequest?.lens === "matrix-candidates" && lensResult?.partial ? lensResult.items?.length || 0 : 0;
    setLensProgress(null);
    setLensPending(false);
    setNotice(retainedVerified
      ? `הבדיקה נעצרה. ${retainedVerified} תוצאות מאומתות נשמרו בטיוטת החבילה ואפשר להמשיך מאותה נקודה.`
      : "הבדיקה נעצרה. המטריצה והממצאים נשמרו כפי שהיו.");
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

  const beginVerifiedResearchTarget = (result) => {
    const sourceTarget = result?.target?.term ? result.target : result;
    const prepared = buildJourneyResearchTarget(engineStateRef.current, {
      ...sourceTarget,
      term: result?.label || result?.term,
      hitId: result?.hitId,
      scope: result?.scope,
    }, { view: { mode: "research" } });
    if (!prepared.ok) {
      setResearchBundle(null);pendingResearchBundleRef.current = null;
      setNotice("יעד המחקר אומת, אבל לא ניתן היה להכין מעבר מדויק מהמטריצה הנוכחית.");
      return;
    }
    const bundle = {
      contract: "els_research_bundle_v1",
      kind: sourceTarget?.kind,
      setId: sourceTarget?.setId,
      key: sourceTarget?.key,
      rank: sourceTarget?.rank,
      label: result?.label || sourceTarget?.label || result?.term,
      reasons: sourceTarget?.reasons || [],
      expectedHitId: prepared.target.hitId,
      status: "opening",
      fromExtension: true,
      contextTerms: safeResearchContextTerms(activeResearchContext?.contextTerms),
    };
    const pending = {
      kind: "target",
      target: prepared.target,
      targetTerm: prepared.loadItem.term,
      targetLabel: bundle.label,
      returnStep: { snapshot: prepared.snapshot, label: prepared.snapshot.term, hitId: prepared.snapshot.axis.hitId },
    };
    pendingResearchBundleRef.current = bundle;setResearchBundle(bundle);
    journeyPendingRef.current = pending;setJourneyPending(pending);setJourneyLoad(prepared.loadItem);
    setNotice(`הביטוי ${bundle.label} אומת. פותח את המטריצה המדויקת…`);
  };

  const handleLens = (result) => {
    if (result?.target?.nativeSeq !== lensSeqRef.current) return;
    if (result?.type === "lens-progress") {
      setLensProgress(result.progress || null);
      if (result.progress?.draft?.lens === "matrix-candidates") setLensResult(result.progress.draft);
      return;
    }
    if (result?.lens === "matrix-discovery" && result?.target?.surface === "results") {
      const guidedKey = result?.target?.guidedOccurrenceCoverage === true ? String(result.target.guidedCoverageKey || "") : "";
      if (!guidedKey || result?.target?.hitId === engineStateRef.current?.axis?.hitId) setResultDiscovery(result);
      if (guidedKey) setGuidedOccurrenceRun((current) => {
        if (current.key !== guidedKey || current.inspections.some((row) => row?.target?.hitId === result?.target?.hitId)) return current;
        if (!result?.ok) return { ...current, failure: { hitId: result?.target?.hitId || null, reason: result?.reason || "scan-failed" } };
        return { ...current, failure: null, inspections: [...current.inspections, result] };
      });
    } else if (result?.lens === "result-triage") {
      if (!result?.ok) resultTriageKeyRef.current = null;
      setResultTriage(result?.ok ? result : null);
      setLensResult(null);
    } else if (["research-target", "neighborhood-target"].includes(result?.lens)) {
      setLensResult(null);
      if (!result?.ok) {
        setResearchBundle(null);pendingResearchBundleRef.current = null;
        setNotice(result?.reason === "target-changed"
          ? result?.lens === "neighborhood-target" ? "סביבת הציר השתנתה. בנו שוב את החבילה לפני מעבר לציר סמוך." : "התוצאות השתנו. הפעילו שוב את בדיקת ההמשך."
          : result?.lens === "neighborhood-target" ? "הציר הסמוך לא עבר אימות קנוני ולכן לא נפתח." : "המשך הציר לא עבר אימות קנוני ולכן לא נפתח.");
      } else beginVerifiedResearchTarget(result);
    } else setLensResult(result);
    setLensProgress(null);
    setLensPending(false);
    if (result?.ok && result.lens === "letter-context" && verseReadRef.current) highlightVerse(result.verse);
  };
  const openResearchTarget = (target) => {
    const backgroundDiscovery = lensPending && lensRequest?.lens === "matrix-discovery" && lensRequest?.target?.surface === "results";
    if (!researchProfile || !target?.term || journeyPendingRef.current || (lensPending && !backgroundDiscovery)) return;
    if (target.status === "VERIFIED" && target.hitId) {
      if (backgroundDiscovery) {
        const seq = ++lensSeqRef.current;
        setLensRequest({ lens: "cancel", target: { nativeSeq: seq }, cancelled: true });
        setLensProgress(null);setLensPending(false);
      }
      beginVerifiedResearchTarget(target);
      return;
    }
    setResearchBundle({ contract: "els_research_bundle_v1", label: target.label || target.term, rank: target.rank, reasons: target.reasons || [], fromExtension: true, status: "verifying" });
    setNotice(`מאמת את הביטוי המורחב ${target.label || target.term} לפני פתיחת המטריצה…`);
    requestLens("research-target", target);
  };
  const openNeighborhoodAxis = (target) => {
    if (!researchProfile || !target?.term || !target?.axisHitId || journeyPendingRef.current || lensPending) return;
    const label = target.label || target.term;
    setResearchBundle({ contract: "els_research_bundle_v1", label, rank: null,
      reasons: [target.reason || "מרכז מחקר סמוך בחבילת סביבת הציר"], fromExtension: true, status: "verifying" });
    setNotice(`מאמת את ${label} כציר מחקר סמוך לפני המעבר…`);
    requestLens("neighborhood-target", target);
  };
  const compareResearchTargets = (targets) => {
    const backgroundDiscovery = lensPending && lensRequest?.lens === "matrix-discovery" && lensRequest?.target?.surface === "results";
    if (!researchProfile || !Array.isArray(targets) || targets.length < 2 || journeyPendingRef.current || (lensPending && !backgroundDiscovery)) return;
    const selected = targets.slice(0, 4);
    setNotice(`מאמת יחד את ${selected.length} יעדי המחקר המובילים…`);
    requestLens("research-target-compare", {
      kind: selected[0].kind,
      setId: selected[0].setId,
      ...(selected[0].kind === "regular" ? { page: selected[0].page } : {}),
      targets: selected.map(({ key, baseTerm, term, label, gain, rank, reasons }) => ({ key, baseTerm, term, label, gain, rank, reasons })),
    });
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

  const returnToPreviousAxis = (destination = "axis") => {
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
      destination,
    };
    journeyPendingRef.current = pending;
    setSavedAxisReplacement(null);
    setJourneyPending(pending);
    setJourneyLoad(restored.loadItem);
    setNotice(`חוזר לציר ${returnStep.label} ומאמת את העוגן המדויק…`);
  };

  const handleJourneyLoadError = (error) => {
    if (journeyPendingRef.current) {
      if (journeyPendingRef.current.kind === "target") { pendingResearchBundleRef.current = null;setResearchBundle(null);setActiveTool("results"); }
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
  const activeContextKey = researchContextKey(activeResearchContext?.contextTerms, activeResearchContext?.discoveryGoal);
  const resultTriageKey = resultView?.id ? `${resultsAreCross ? "cross" : "regular"}:${resultView.id}:${resultsAreCross ? 0 : resultView.page || 0}:${activeContextKey}` : null;
  const resultTriagePending = lensPending && lensRequest?.lens === "result-triage";
  const guidedOccurrenceEnabled = !resultsAreCross && Boolean(activeResearchContext?.discoveryGoal);
  const resultDiscoveryKey = !resultsAreCross && resultView?.id && engineState?.axis?.hitId
    ? `${resultView.id}:${engineState.axis.hitId}:${activeContextKey}` : null;
  const resultDiscoveryPending = lensPending && lensRequest?.lens === "matrix-discovery" && lensRequest?.target?.surface === "results"
    && lensRequest?.target?.hitId === engineState?.axis?.hitId;
  useEffect(() => {
    const inspection = researchProfile
      && resultDiscovery?.ok
      && resultDiscovery?.target?.surface === "results"
      && resultDiscovery?.target?.hitId === engineState?.axis?.hitId
      && (resultDiscovery?.target?.contextKey || "") === activeContextKey
      && resultDiscovery?.languageInspection?.contract === "els_matrix_language_inspection_v1"
      && resultDiscovery?.languageInspection?.status === "CANDIDATE_INPUT"
      ? resultDiscovery.languageInspection
      : null;
    onLanguageInspection?.(inspection);
  }, [researchProfile, resultDiscovery, activeContextKey, engineState?.axis?.hitId, onLanguageInspection]);
  useEffect(() => {
    if (!researchProfile || visibleTool !== "results" || operations.search?.status !== "done" || !matrixActive || !resultTriageKey || lensPending) return;
    const matches = resultTriage?.ok && resultTriage.kind === (resultsAreCross ? "cross" : "regular") && resultTriage.setId === resultView.id
      && (resultsAreCross || Number(resultTriage.page) === Number(resultView.page)) && (resultTriage.target?.contextKey || "") === activeContextKey;
    if (matches || resultTriageKeyRef.current === resultTriageKey) return;
    resultTriageKeyRef.current = resultTriageKey;
    requestLens("result-triage", { kind: resultsAreCross ? "cross" : "regular", setId: resultView.id, ...(resultsAreCross ? {} : { page: resultView.page }),
      contextKey: activeContextKey, ...(activeResearchContext?.contextTerms?.length ? { contextTerms: activeResearchContext.contextTerms } : {}) });
  }, [researchProfile, visibleTool, operations.search?.status, matrixActive, resultTriageKey, lensPending, resultTriage?.setId, resultTriage?.page, activeContextKey]);
  useEffect(() => {
    const triageReady = resultTriage?.ok && resultTriage.kind === "regular" && resultTriage.setId === resultView?.id
      && Number(resultTriage.page) === Number(resultView?.page) && (resultTriage.target?.contextKey || "") === activeContextKey;
    if (!researchProfile || guidedOccurrenceEnabled || visibleTool !== "results" || resultsAreCross || operations.search?.status !== "done" || !matrixActive
      || !resultDiscoveryKey || !triageReady || lensPending) return;
    const discoveryReady = resultDiscovery?.target?.hitId === engineState.axis.hitId
      && resultDiscovery?.target?.surface === "results" && (resultDiscovery?.target?.contextKey || "") === activeContextKey;
    if (discoveryReady || resultDiscoveryKeyRef.current === resultDiscoveryKey) return;
    resultDiscoveryKeyRef.current = resultDiscoveryKey;
    requestLens("matrix-discovery", { hitId: engineState.axis.hitId, surface: "results", contextKey: activeContextKey, minLength: 4, maxLength: 10,
      ...(activeResearchContext?.contextTerms?.length ? { contextTerms: activeResearchContext.contextTerms } : {}),
      ...(activeResearchContext?.discoveryGoal ? { discoveryGoal: activeResearchContext.discoveryGoal } : {}) });
  }, [researchProfile, guidedOccurrenceEnabled, visibleTool, resultsAreCross, operations.search?.status, matrixActive, resultDiscoveryKey, lensPending,
    resultTriage?.setId, resultTriage?.page, resultDiscovery?.target?.hitId, activeContextKey, engineState?.axis?.hitId]);
  const guidedTriageReady = guidedOccurrenceEnabled && resultTriage?.ok && resultTriage.kind === "regular"
    && resultTriage.setId === resultView?.id && Number(resultTriage.page) === Number(resultView?.page)
    && (resultTriage.target?.contextKey || "") === activeContextKey;
  const guidedCoverageKey = guidedTriageReady ? `${resultView.id}:${resultView.page || 0}:${activeContextKey}` : null;
  useEffect(() => {
    setGuidedOccurrenceRun((current) => current.key === guidedCoverageKey ? current : emptyGuidedOccurrenceRun(guidedCoverageKey));
  }, [guidedCoverageKey]);
  const guidedCoverage = useMemo(() => {
    if (!guidedCoverageKey || guidedOccurrenceRun.key !== guidedCoverageKey) return null;
    return projectElsGuidedOccurrenceCoverage({
      plan: { contract: ELS_CIPHER_DISCOVERY_PLAN_CONTRACT },
      occurrences: resultView?.items || [],
      triageItems: resultTriage?.items || [],
      inspections: guidedOccurrenceRun.inspections,
      approvedBatches: guidedOccurrenceRun.approvedBatches,
      resultSetId: resultView?.id,
    });
  }, [guidedCoverageKey, guidedOccurrenceRun, resultView?.id, resultView?.items, resultTriage?.items]);
  useEffect(() => {
    const next = guidedCoverage?.nextOccurrence;
    if (!researchProfile || visibleTool !== "results" || operations.search?.status !== "done" || !matrixActive
      || guidedOccurrenceRun.failure || guidedCoverage?.status !== "INSPECTING" || !next || lensPending || journeyPendingRef.current) return;
    requestLens("matrix-discovery", {
      hitId: next.hitId,
      setId: resultView.id,
      page: resultView.page,
      surface: "results",
      guidedOccurrenceCoverage: true,
      guidedCoverageKey,
      contextKey: activeContextKey,
      minLength: 4,
      maxLength: 10,
      ...(activeResearchContext?.contextTerms?.length ? { contextTerms: activeResearchContext.contextTerms } : {}),
      discoveryGoal: activeResearchContext.discoveryGoal,
    });
  }, [researchProfile, visibleTool, operations.search?.status, matrixActive, lensPending, guidedCoverage?.status,
    guidedCoverage?.nextOccurrence?.hitId, guidedOccurrenceRun.failure, guidedCoverageKey, resultView?.id, resultView?.page, activeContextKey]);
  const continueGuidedOccurrenceCoverage = () => setGuidedOccurrenceRun((current) => current.key === guidedCoverageKey
    ? { ...current, approvedBatches: Math.min(2, current.approvedBatches + 1), failure: null } : current);
  const retryGuidedOccurrenceCoverage = () => setGuidedOccurrenceRun((current) => current.key === guidedCoverageKey
    ? { ...current, failure: null } : current);
  const openGuidedOccurrence = (occurrence) => {
    if (!occurrence || occurrence.index == null || !resultView?.id) return;
    const report = guidedOccurrenceRun.inspections.find((row) => row?.target?.hitId === occurrence.hitId);
    if (report) setResultDiscovery(report);
    requestControl("occurrence-select", { setId: resultView.id, index: occurrence.index, hitId: occurrence.hitId });
  };
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
        <span><strong>חיפוש חדש</strong>{researchProfile ? " · בחרו ציר יחיד או הצלבה" : ""}</span>
        {researchProfile ? <>
          <button type="button" aria-pressed={!crossSearchOpen} onClick={() => { if (crossSearchOpen && ["cross", "cross-continue"].includes(operations.search?.searchKind)) cancelOperation("search"); setCrossOpen(false); }}>חיפוש רגיל</button>
          <button className="els29-native-cross-toggle" type="button" aria-pressed={crossSearchOpen} aria-expanded={crossSearchOpen}
            onClick={() => { if (crossSearchOpen && ["cross", "cross-continue"].includes(operations.search?.searchKind)) cancelOperation("search"); setCrossOpen(value => !value); }}>הצלבה בין צירים</button>
        </> : null}
      </div>
      <div className="els29-native-query-terms">
      <label>
        <span>{crossSearchOpen ? "מונח ראשון" : "מונח"}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={40}
          placeholder="למשל: משיח"
          autoComplete="off"
        />
      </label>
      {crossSearchOpen ? <div className="els29-native-cross-row" data-els-native-cross="simple">
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
      {researchProfile && !crossSearchOpen && (clean(query).split(/\s+/).length > 1 || clean(query).replace(/[^א-ת]/g, "").length >= 7) ? <div className="els29-native-search-coach" role="note">
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
      {crossSearchOpen ? <>
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
        <button className="els29-native-search" type="submit" disabled={searchPending}>{searchPending ? "מחפש…" : crossSearchOpen ? "חפש הצלבה" : "חפש"}</button>
        <button className="els29-native-more" type="button"
          aria-label={classicOpen ? (researchProfile ? "חזור לגילוי צופן" : "חזור למטריצה") : (researchProfile ? "מצב קלאסי" : "כל הכלים")}
          onClick={() => { cancelOperation("search"); cancelOperation("findings"); setClassicOpen(value => !value); }}>
          {classicOpen ? (researchProfile ? "חזור לגילוי צופן" : "חזור למטריצה") : (researchProfile ? "מצב קלאסי" : "כל הכלים")}
        </button>
      </div>
      </div>
    </form>

    {!savedLoadPending ? <SearchProgress operation={operations.search} reduction={searchReduction} onReduce={reduceSearch} onCancel={() => cancelOperation("search")} /> : null}
    {!savedLoadPending && lensPending ? <LensProgress request={lensRequest} progress={lensProgress} reduction={lensReduction} onReduce={reduceLens} onCancel={cancelLens} /> : null}
    {!savedLoadPending && notice ? <div className="els29-native-notice" role="status">{notice}{accountRequired ? <> · <a href="/login">כניסה לחשבון</a></> : null}</div> : null}
    {!savedLoadPending && researchProfile && (journeyTrail.length || journeyPending) ? <div className="els29-native-notice" data-els-c02-journey="v1">
      <span>מסלול צירים · {journeyTrail.length} צעדי חזרה שמורים</span>
      <button type="button" disabled={!!journeyPending || !journeyTrail.length} onClick={() => returnToPreviousAxis()}>
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
          {(researchProfile
            ? [["results", "ציר ומופעים", "posts"], ["findings", "חבילת מחקר", "els"], ["structures", "מתקדם", "dna"], ["research", "שמירה", "books"]]
            : [["findings", "סריקה וממצאים", "els"], ["results", "תוצאות", "posts"], ["research", "שמירה", "books"]]
          ).map(([tool, label, icon]) => <button
            type="button" key={tool} aria-label={label} title={label}
            aria-expanded={visibleTool === tool} aria-controls="els29-context-panel"
            onClick={(event) => visibleTool === tool && !classicOpen ? closeTool() : openTool(tool, event.currentTarget)}
          ><NavigationIcon2029 name={icon} /><small>{label}</small></button>)}
        </div> : null}
        <div ref={panelRef} className="els29-native-panel-wrap"
          data-mobile-inline-workspace={mobileInlineWorkspace ? "true" : undefined}
          data-mobile-inline-findings={inlineFindings ? "true" : undefined}
          hidden={classicOpen || savedLoadPending || !visibleTool}>
        <ContextualInspector2029 id="els29-context-panel" className="els29-native-context-panel" ariaLabel="כלי ELS והקשר המטריצה">
          <header className="els29-native-panel-head">
            <strong>{researchProfile
              ? compactMobile && matrixActive ? "גילוי צופן" : visibleTool === "research" ? "שמירה והמשך מחקר" : visibleTool === "structures" ? "כלים מתקדמים" : visibleTool === "results" ? (resultsAreCross ? "צירים ומפגשי הצלבה" : "חבילת המחקר · ציר ומופעים") : "חבילת המחקר · ממצאים ומקור"
              : visibleTool === "research" ? "שמירה" : visibleTool === "results" ? "תוצאות החיפוש" : "סריקה וממצאים"}</strong>
            {!compactMobile ? <button type="button" onClick={closeTool} aria-label="סגור כלי מטריצה" title="סגור את החלונית">×</button> : null}
          </header>
          {compactMobile ? <nav className="els29-native-context-nav" aria-label={researchProfile ? "תצוגות גילוי צופן" : "כלי המטריצה הקלאסית"}>
            <button type="button" aria-label={researchProfile ? "ציר ומופעים" : "תוצאות"} aria-pressed={visibleTool === "results"} onClick={() => openTool("results")}>{researchProfile ? "ציר ומופעים" : "תוצאות"}</button>
            <button type="button" aria-label={researchProfile ? "חבילת מחקר" : "סריקה וממצאים"} aria-pressed={visibleTool === "findings"} onClick={() => openTool("findings")}>{researchProfile ? "מחקר" : "ממצאים"}</button>
            {researchProfile ? <button type="button" aria-label="מתקדם" aria-pressed={visibleTool === "structures"} onClick={() => openTool("structures")}>מתקדם</button> : null}
            <button type="button" className="is-action" aria-label="שמירה" aria-pressed={visibleTool === "research"} onClick={() => openTool("research")}>שמור</button>
          </nav> : null}
        <CrossResultsRail onContinue={setId => requestSearch("cross-continue", {setId, scope:activeScope})} onRetry={() => requestSearch(operations.search?.searchKind || "cross", operations.search?.payload || {})} state={engineState} pending={searchPending || ["searching", "verifying"].includes(operations.findings?.status)}
          outcome={operations.search?.status} visible={visibleTool === "results" && resultsAreCross} onSelect={requestControl}
          onFindThirdAxis={(target) => requestLens("cross-third-axis", target)}
          thirdAxisResult={lensResult?.lens === "cross-third-axis" ? lensResult : null}
          thirdAxisPending={lensPending && lensRequest?.lens === "cross-third-axis"}
          onOpenResearchTarget={openResearchTarget}
          onCompareResearchTargets={compareResearchTargets} comparisonResult={lensResult?.lens === "research-target-compare" ? lensResult : null}
          researchTargetPending={lensPending && ["research-target", "research-target-compare"].includes(lensRequest?.lens)}
          triageResult={researchProfile ? resultTriage : null} triagePending={researchProfile && resultTriagePending} />
        <RegularResultsRail state={engineState} pending={searchPending} operation={operations.search} visible={visibleTool === "results" && !resultsAreCross}
          onSelect={requestControl} onRetry={() => requestSearch(operations.search?.searchKind || "regular", operations.search?.payload || { term: query, scope: activeScope })}
          onOpenResearchTarget={openResearchTarget}
          onCompareResearchTargets={compareResearchTargets} comparisonResult={lensResult?.lens === "research-target-compare" ? lensResult : null}
          researchTargetPending={lensPending && ["research-target", "research-target-compare"].includes(lensRequest?.lens)}
          triageResult={researchProfile ? resultTriage : null} triagePending={researchProfile && resultTriagePending}
          discoveryResult={researchProfile && (resultDiscovery?.target?.contextKey || "") === activeContextKey ? resultDiscovery : null} discoveryPending={researchProfile && resultDiscoveryPending}
          guidedCoverage={researchProfile ? guidedCoverage : null} guidedFailure={guidedOccurrenceRun.failure}
          onContinueGuided={continueGuidedOccurrenceCoverage} onRetryGuided={retryGuidedOccurrenceCoverage} onOpenGuided={openGuidedOccurrence}
          onAddDiscovery={addStructureGroup} onOpenDiscovery={revealFindingDetails} />
        {researchProfile ? <StructuralPriorityRail visible={visibleTool === "structures"} state={engineState} lensResult={lensResult} lensPending={lensPending}
          busy={searchPending || ["searching", "verifying"].includes(operations.findings?.status)}
          onRun={(target) => requestLens("structure-priority", target)}
          onScanAxis={(target) => requestLens("line-context", { ...target, scan: true })}
          onSearchPair={startRelationshipCross}
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
          onAddGroup={addStructureGroup}
          onExploreAxis={openNeighborhoodAxis}
          onFindingControl={requestFindingControl}
          onFindingsChange={requestFindingsChange}
          researchProfile={researchProfile}
          canReplacePrimary={canReplaceSavedPrimary}
          journeyBusy={!!journeyPending}
          onPromote={promoteFinding}
          openDetails={findingDetailsRequest}
          researchBundle={researchProfile ? researchBundle : null}
          onBackToResults={() => {
            if (researchBundle?.fromAdvanced) { pendingResearchBundleRef.current = null;setResearchBundle(null);onReturnToResearchPlan?.(); }
            else if (researchBundle?.fromExtension && journeyTrail.length) returnToPreviousAxis("results");
            else { pendingResearchBundleRef.current = null;setResearchBundle(null);openTool("results"); }
          }}
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
          journeyLoad={journeyLoad || (researchLoad?.researchCommand === true ? null : researchLoad)}
          exactSkipProbe={researchProbe}
          onExactSkipProbeResult={onResearchProbeResult}
          formsPreviewRequest={formsPreviewRequest}
          onFormsPreviewResult={onFormsPreviewResult}
          full={classicOpen}
          hiddenBridge
          experience2029
          engineOnly={!classicOpen}
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
