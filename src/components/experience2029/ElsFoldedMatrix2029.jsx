import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { useMatrixDrag } from "./useMatrixDrag.js";
import { clampInt, splitHitLabel, splitMarkMap, splitRowStartFor } from "../../lib/elsSplitMatrix.js";
import { fitCellPx, letterPx } from "../../lib/elsMatrixZoom.js";
import "./elsSplitMatrix2029.css";

const errors = {
  "results-changed": "המופע או החיפוש השתנו. הציר מוצג שוב במטריצה הרגילה.",
  "window-unavailable": "אי אפשר לשנות את הרוחב למופע הזה.",
  "window-failed": "הרוחב החדש לא נטען. אפשר לנסות שוב.",
  timeout: "הטעינה לא הסתיימה בזמן. אפשר לנסות שוב.",
};

const FOLD_COLS = 121;   // the widest column window the lens returns; wider rows are paged sideways

const rowHeight = el => {
  const first = el.querySelector(".els29-native-matrix-row");
  return first?.nextElementSibling
    ? first.nextElementSibling.getBoundingClientRect().top - first.getBoundingClientRect().top
    : first?.getBoundingClientRect().height || 1;
};

// Research mode only. Exact divisors of the axis skip put whole rows between its letters.
// The engine provides both the rendered window and its identity for local discovery.
export default function ElsFoldedMatrix2029({ state, option, windowSize, focusHitId, busy, response, onRequest, onExit, onAxis }) {
  const axisHitId = state?.axis?.hitId || null, scope = state?.scope || null;
  const axisLength = Number(state?.axis?.length) || 5;
  const zoom = Number(state?.ui?.zoom) || 1;
  const extraRows = { small: 0, medium: 12, large: 28 }[windowSize] || 0;
  const rowCount = clampInt(Math.ceil((axisLength - 1) * option.k / option.m) + 8 + extraRows, 15, 61, 15);
  const colCount = clampInt(option.width, 3, FOLD_COLS, 11);
  const initialFocus = focusHitId || axisHitId;
  const [view, setView] = useState({ focus: initialFocus, rowStart: null, colStart: null, rowCount, colCount });
  const [lastWindow, setLastWindow] = useState(null);
  const [pendingSeq, setPendingSeq] = useState(null);
  const [notice, setNotice] = useState("");
  const [boxWidth, setBoxWidth] = useState(0);
  const seqRef = useRef(0), requestRef = useRef(null), scrollRef = useRef(null);
  const scrollAnchor = useRef(null), lastScrollTop = useRef(0);
  const { dragRef, ...dragHandlers } = useMatrixDrag(scrollRef);
  const pending = pendingSeq !== null;

  const send = (next, anchor = null) => {
    const { focus, rowStart, colStart, rowCount, colCount } = next;
    const key = JSON.stringify([axisHitId, scope, option.width, initialFocus, focus, rowStart, colStart, rowCount, colCount]);
    const previous = requestRef.current;
    const id = previous?.key === key ? previous.id : crypto.randomUUID();
    const foldSeq = ++seqRef.current;
    requestRef.current = { key, id, foldSeq, axisHitId, scope, width: option.width, initialFocus };
    if (anchor || previous?.id !== id) scrollAnchor.current = anchor && { ...anchor, id };
    setView(next);
    setPendingSeq(foldSeq);
    setNotice("");
    onRequest({
      foldSeq, foldWindowId: id, axisHitId, scope, width: option.width, initialFocus, rowCount, colCount,
      ...(Number.isInteger(rowStart) ? { r0: rowStart } : {}),
      bands: [{ hitId: focus || axisHitId, ...(Number.isInteger(colStart) ? { c0: colStart } : {}) }],
    });
  };
  const marksKey = JSON.stringify([state?.ui?.hideMain, state?.ui?.findingRadius, (state?.findings || []).map(word => [
    word.t, word.color, word.hits?.filter(hit => hit.selected && hit.verified).map(hit => hit.hitId),
    word.sourceHits?.filter(hit => hit.selected).map(hit => hit.hitId),
  ])]);
  const data = lastWindow?.target?.axisHitId === axisHitId && lastWindow.target.scope === scope && lastWindow.width === option.width && lastWindow.target.initialFocus === initialFocus
    ? lastWindow : null;
  const band = data?.bands?.[0];
  useEffect(() => {
    if (!axisHitId || busy) return;
    const previous = requestRef.current;
    const sameLayout = previous?.axisHitId === axisHitId && previous.scope === scope && previous.width === option.width && previous.initialFocus === initialFocus;
    if (!sameLayout) send({ focus: initialFocus, rowStart: null, colStart: null, rowCount, colCount });
    else if (view.rowCount !== rowCount && data && band) {
      const el = scrollRef.current;
      const height = el ? rowHeight(el) : 1;
      const visibleRow = (el?.scrollTop || 0) / height;
      const rowStart = clampInt(data.r0 + visibleRow + ((el?.clientHeight || 0) / height - rowCount) / 2,
        0, Math.max(0, data.totalRows - rowCount));
      send({ ...view, rowCount, rowStart, colStart: band.c0 }, { row: data.r0 + visibleRow, left: el?.scrollLeft || 0 });
    } else send({ ...view, rowCount, colCount });
  }, [axisHitId, scope, option.width, initialFocus, busy, rowCount, marksKey]);
  useEffect(() => {
    const target = response?.target, request = requestRef.current;
    if (!request || target?.foldWindowId !== request.id || target.foldSeq !== request.foldSeq) return;
    setPendingSeq(null);
    if (!response.ok) { setNotice(errors[response.reason] || errors["window-failed"]); return; }
    setNotice("");
    setLastWindow(response);
  }, [response]);
  useEffect(() => {
    if (pendingSeq === null) return;
    const timer = setTimeout(() => { setPendingSeq(null); setNotice(errors.timeout); }, 20000);
    return () => clearTimeout(timer);
  }, [pendingSeq]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setBoxWidth(Math.round(el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [Boolean(data)]);
  const markAt = useMemo(() => (band ? splitMarkMap(band) : new Map()), [band]);
  const byId = useMemo(() => new Map((data?.hits || []).map(hit => [hit.hitId, hit])), [data?.hits]);
  const width = data?.width || option.width;
  const layoutKey = band ? [width, data.r0, data.r1, band.c0, band.c1, band.hitId].join(":") : "";
  const cols = band?.rows?.[0]?.length || 1;
  // Same rules as the classic matrix: cell from the available width (zoom multiplies it), letter = cell - 5px.
  const viewportWidth = typeof window === "undefined" ? 800 : window.innerWidth || 800;
  const cellPx = fitCellPx(Math.min(cols, 18), boxWidth - 24, zoom, viewportWidth, { min: 18 });

  // Page through the corpus while keeping the overlapping rows under the pointer in the same place.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !band) return;
    const anchor = scrollAnchor.current;
    if (anchor?.id === data.target.foldWindowId) {
      el.scrollTop = (anchor.row - data.r0) * rowHeight(el);
      el.scrollLeft = anchor.left;
      scrollAnchor.current = null;
    } else {
      const cells = Array.from(el.querySelectorAll("[data-focused-hit]"));
      if (cells.length) {
        const viewport = el.getBoundingClientRect();
        const rects = cells.map(cell => cell.getBoundingClientRect());
        const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
        const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
        const x = right - left > el.clientWidth ? (rects[0].left + rects[0].right) / 2 : (left + right) / 2;
        const y = bottom - top > el.clientHeight ? (rects[0].top + rects[0].bottom) / 2 : (top + bottom) / 2;
        el.scrollLeft += x - viewport.left - el.clientWidth / 2;
        el.scrollTop += y - viewport.top - el.clientHeight / 2;
      } else {
        el.scrollTop = 0;
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      }
    }
    lastScrollTop.current = el.scrollTop;
  }, [layoutKey, data?.target?.foldWindowId, zoom, cellPx]);

  const jump = hitId => {
    const hit = byId.get(hitId); if (!hit) return;
    send({ ...view, focus: hitId, colStart: null, rowStart: splitRowStartFor([hit, byId.get(axisHitId)].filter(Boolean), view.rowCount, data.totalRows) });
  };
  const rowStep = Math.max(1, Math.floor(view.rowCount / 2));
  const moveRows = (delta, el = scrollRef.current) => {
    if (!data || !band || busy || pending || notice) return false;
    const rowStart = clampInt(data.r0 + delta, 0, Math.max(0, data.totalRows - view.rowCount), 0);
    if (rowStart === data.r0) return false;
    const anchor = el && { row: data.r0 + el.scrollTop / rowHeight(el), left: el.scrollLeft };
    send({ ...view, rowStart, colStart: band.c0 }, anchor);
    return true;
  };
  const moveCols = delta => band && send({ ...view, rowStart: data.r0, colStart: clampInt(band.c0 + delta, 0, Math.max(0, width - view.colCount), 0) });
  const beyondViewport = (el, direction) => direction < 0 ? el.scrollTop <= 1 : el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
  const stepAtEdge = (el, dir) => dir !== 0 && beyondViewport(el, dir) && moveRows(dir * rowStep, el);
  const controlsDisabled = pending || busy || Boolean(notice);

  return <section className="els29-fold" aria-label="מטריצה ברוחב שורה אחר" data-fold-width={width}>
    <header className="els29-fold-toolbar">
      <strong>{focusHitId ? "חלון ממצא" : `רווח ${option.between}`} · רוחב {width.toLocaleString("he-IL")}</strong>
      {band ? <div className="els29-fold-nav" role="group" aria-label="ניווט במטריצה">
        <button type="button" aria-label="שורות קודמות" disabled={controlsDisabled || data.r0 <= 0} onClick={() => moveRows(-rowStep, null)}>▲</button>
        <button type="button" aria-label="שורות הבאות" disabled={controlsDisabled || data.r1 >= data.totalRows - 1} onClick={() => moveRows(rowStep, null)}>▼</button>
        {width > cols ? <>
          <button type="button" aria-label="עמודות ימינה" disabled={controlsDisabled || band.c0 <= 0} onClick={() => moveCols(-Math.max(1, Math.floor(view.colCount / 2)))}>▶</button>
          <button type="button" aria-label="עמודות שמאלה" disabled={controlsDisabled || band.c1 >= width - 1} onClick={() => moveCols(Math.max(1, Math.floor(view.colCount / 2)))}>◀</button>
        </> : null}
        <small>שורות <bdi dir="ltr">{data.r0}–{data.r1}</bdi> · עמודות <bdi dir="ltr">{band.c0}–{band.c1}</bdi></small>
      </div> : null}
      {data?.hits?.length > 1 ? <select className="els29-fold-jump" aria-label="מעבר לממצא" value={view.focus || axisHitId} disabled={controlsDisabled} onChange={event => jump(event.target.value)}>
        {data.hits.map(hit => <option key={hit.hitId} value={hit.hitId}>{splitHitLabel(hit)} · עמודה {hit.colMin}{hit.colMax !== hit.colMin ? `–${hit.colMax}` : ""}{hit.axis ? " · ציר" : ""}</option>)}
      </select> : null}
      <button type="button" onClick={onExit}>{focusHitId ? "חזרה לציר הראשי" : "חזרה לרוחב הרגיל"}</button>
    </header>
    {pending && !band ? <CanonicalProgress compact title="פורס את המטריצה ברוחב החדש" phase="פורס את אותו טקסט בשורות חדשות" onCancel={onExit} /> : null}
    {notice ? <div className="els29-fold-feedback"><span role="alert">{notice}</span><button type="button" onClick={() => send(view)}>נסה שוב</button></div> : null}
    {band ? <div ref={scrollRef} className="els29-native-matrix-scroll els29-fold-scroll" role="region" tabIndex={0}
      aria-label={`מטריצה ברוחב ${width}, עמודות ${band.c0} עד ${band.c1}`}
      aria-busy={pending}
      {...dragHandlers}
      onScroll={event => {
        const el = event.currentTarget;
        const dir = Math.sign(el.scrollTop - lastScrollTop.current);
        lastScrollTop.current = el.scrollTop;
        if (dir) stepAtEdge(el, dir);
      }}
      onWheel={event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) stepAtEdge(event.currentTarget, Math.sign(event.deltaY)); }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const moves = { ArrowUp: [0, -110], ArrowDown: [0, 110], ArrowLeft: [-110, 0], ArrowRight: [110, 0],
          PageUp: [0, -event.currentTarget.clientHeight], PageDown: [0, event.currentTarget.clientHeight] };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        if (!stepAtEdge(event.currentTarget, Math.sign(move[1]))) event.currentTarget.scrollBy(move[0], move[1]);
      }}>
        <div className="els29-native-matrix is-research" style={{ "--els29-cols": cols, "--els29-cell": `${cellPx}px`, "--els29-font": `${letterPx(cellPx)}px` }}>
          {band.rows.map((line, r) => <div className="els29-native-matrix-row" key={r}>
            {Array.from(line).map((letter, c) => {
              const mark = markAt.get(`${r}-${c}`);
              const start = mark?.start && mark.start[0] === r && mark.start[1] === c;
              const axisAction = mark?.axis ? onAxis : undefined;
              return <span key={c} className={`els29-native-cell${mark ? (mark.axis ? " is-axis" : " is-finding") : ""}${start ? " is-start" : ""}`}
                data-focused-hit={mark?.hitId === band.hitId ? "" : undefined}
                aria-hidden={axisAction && start ? undefined : true}
                aria-label={axisAction && start ? "פתח פעולות לציר" : undefined}
                role={axisAction && start ? "button" : undefined} tabIndex={axisAction && start ? 0 : undefined}
                onClick={axisAction ? () => { if (!dragRef.current.moved) axisAction(); } : undefined} onKeyDown={axisAction && start ? event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    axisAction();
                  }
                } : undefined}
                style={mark && !mark.axis && mark.color ? { "--els29-mark": mark.color } : undefined}>{letter === " " ? " " : letter}</span>;
            })}
          </div>)}
        </div>
    </div> : null}
  </section>;
}
