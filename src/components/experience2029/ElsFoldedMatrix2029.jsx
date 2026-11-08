import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
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

// Research mode only. The SAME text re-flowed into rows of another width: narrower (S/k) puts k-1 rows between consecutive axis letters,
// wider (S*m) puts m axis letters in one row. Letters, positions and verification are the engine's; this view only reads them through the
// read-only lens. Cells follow the engine zoom and the letter follows the cell, exactly like the classic matrix.
export default function ElsFoldedMatrix2029({ state, option, busy, response, onRequest, onExit }) {
  const axisHitId = state?.axis?.hitId || null, scope = state?.scope || null;
  const axisLength = Number(state?.axis?.length) || 5;
  const zoom = Number(state?.ui?.zoom) || 1;
  const rowsFor = () => clampInt(Math.ceil((axisLength - 1) * option.k / option.m) + 8, 15, 61, 15);
  const colsFor = () => clampInt(option.width, 3, FOLD_COLS, 11);
  const [view, setView] = useState({ focus: axisHitId, rowStart: null, colStart: null, rowCount: rowsFor(), colCount: colsFor() });
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [boxWidth, setBoxWidth] = useState(0);
  const seqRef = useRef(0), requestRef = useRef(null), scrollRef = useRef(null);
  const send = next => {
    const request = {
      foldSeq: ++seqRef.current, axisHitId, scope, width: option.width,
      rowCount: next.rowCount, colCount: next.colCount,
      ...(Number.isInteger(next.rowStart) ? { r0: next.rowStart } : {}),
      bands: [{ hitId: next.focus || axisHitId, ...(Number.isInteger(next.colStart) ? { c0: next.colStart } : {}) }],
    };
    requestRef.current = request; setView(next); setPending(true); setNotice(""); onRequest(request);
  };
  // A new width (or a new axis) re-flows the whole matrix from the axis; nothing from the previous layout stays on screen.
  useEffect(() => {
    if (!axisHitId || busy) return;
    send({ focus: axisHitId, rowStart: null, colStart: null, rowCount: rowsFor(), colCount: colsFor() });
  }, [axisHitId, option.width]);
  useEffect(() => {
    if (!response || !requestRef.current || !(response.target?.foldSeq === requestRef.current.foldSeq && response.target?.axisHitId === requestRef.current.axisHitId && response.target?.scope === requestRef.current.scope)) return;
    setPending(false);
    if (!response.ok) { setNotice(errors[response.reason] || errors["window-failed"]); return; }
    setData(response);
  }, [response]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { setPending(false); setNotice(errors.timeout); }, 20000);
    return () => clearTimeout(timer);
  }, [pending]);
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

  const band = data?.bands?.[0];
  const markAt = useMemo(() => (band ? splitMarkMap(band) : new Map()), [band]);
  const byId = useMemo(() => new Map((data?.hits || []).map(hit => [hit.hitId, hit])), [data?.hits]);
  const width = data?.width || option.width;
  const cols = band?.rows?.[0]?.length || 1;
  // Same rules as the classic matrix: cell from the available width (zoom multiplies it), letter = cell - 5px.
  const viewportWidth = typeof window === "undefined" ? 800 : window.innerWidth || 800;
  const cellPx = fitCellPx(Math.min(cols, 18), boxWidth - 24, zoom, viewportWidth, { min: 18 });

  // Centre on the axis after every new layout and every zoom, as the classic engine does.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !band) return;
    const cells = Array.from(el.querySelectorAll(".is-axis"));
    if (!cells.length) { el.scrollLeft = el.scrollWidth - el.clientWidth; el.scrollTop = 0; return; }
    const viewport = el.getBoundingClientRect();
    let rects = cells.map(cell => cell.getBoundingClientRect());
    const spreadX = Math.max(...rects.map(r => r.right)) - Math.min(...rects.map(r => r.left));
    const spreadY = Math.max(...rects.map(r => r.bottom)) - Math.min(...rects.map(r => r.top));
    // A wide layout can put the axis letters further apart than the screen: then start at the first letter instead of the empty middle.
    if (spreadX > el.clientWidth || spreadY > el.clientHeight) rects = [rects[0]];
    el.scrollLeft += (Math.min(...rects.map(r => r.left)) + Math.max(...rects.map(r => r.right))) / 2 - viewport.left - el.clientWidth / 2;
    el.scrollTop += (Math.min(...rects.map(r => r.top)) + Math.max(...rects.map(r => r.bottom))) / 2 - viewport.top - el.clientHeight / 2;
  }, [band, zoom, cellPx]);

  const jump = hitId => {
    const hit = byId.get(hitId); if (!hit) return;
    send({ ...view, focus: hitId, colStart: null, rowStart: splitRowStartFor([hit, byId.get(axisHitId)].filter(Boolean), view.rowCount, data.totalRows) });
  };
  const moveRows = delta => data && send({ ...view, rowStart: clampInt(data.r0 + delta, 0, Math.max(0, data.totalRows - view.rowCount), 0) });
  const moveCols = delta => band && send({ ...view, rowStart: data.r0, colStart: clampInt(band.c0 + delta, 0, Math.max(0, width - view.colCount), 0) });
  const explain = option.m > 1
    ? `בכל שורה ${option.perRow.toLocaleString("he-IL")} אותיות של הציר`
    : `בין כל שתי אותיות של הציר יש ${option.between.toLocaleString("he-IL")} שורות`;

  return <section className="els29-fold" aria-label="מטריצה ברוחב שורה אחר" data-fold-width={width}>
    <header className="els29-split-head">
      <strong>רוחב שורה {width.toLocaleString("he-IL")} <em className="els29-research-badge">מצב מחקר</em></strong>
      <button type="button" onClick={onExit}>חזרה לרוחב הרגיל</button>
    </header>
    <p className="els29-split-note">{explain} · אותו טקסט בדיוק, רק הפריסה השתנתה.</p>
    {pending ? <CanonicalProgress compact title="פורס את המטריצה ברוחב החדש" phase="פורס את אותו טקסט בשורות חדשות" onCancel={onExit} /> : null}
    {notice ? <p role="alert" className="els29-split-note">{notice}</p> : null}
    {band ? <>
      <label className="els29-fold-jump">מעבר לממצא
        <select value={view.focus || axisHitId} disabled={pending} onChange={event => jump(event.target.value)}>
          {(data.hits || []).map(hit => <option key={hit.hitId} value={hit.hitId}>{splitHitLabel(hit)} · עמודה {hit.colMin}{hit.colMax !== hit.colMin ? `–${hit.colMax}` : ""}{hit.axis ? " · ציר" : ""}</option>)}
        </select>
      </label>
      <div className="els29-fold-nav">
        <button type="button" aria-label="שורות קודמות" disabled={pending || data.r0 <= 0} onClick={() => moveRows(-Math.max(1, Math.floor(view.rowCount / 2)))}>▲</button>
        <small>שורות <bdi dir="ltr">{data.r0}–{data.r1}</bdi> · עמודות <bdi dir="ltr">{band.c0}–{band.c1}</bdi> מתוך {width.toLocaleString("he-IL")}</small>
        <button type="button" aria-label="שורות הבאות" disabled={pending || data.r1 >= data.totalRows - 1} onClick={() => moveRows(Math.max(1, Math.floor(view.rowCount / 2)))}>▼</button>
        {width > cols ? <>
          <button type="button" aria-label="עמודות ימינה" disabled={pending || band.c0 <= 0} onClick={() => moveCols(-Math.max(1, Math.floor(view.colCount / 2)))}>▶</button>
          <button type="button" aria-label="עמודות שמאלה" disabled={pending || band.c1 >= width - 1} onClick={() => moveCols(Math.max(1, Math.floor(view.colCount / 2)))}>◀</button>
        </> : null}
      </div>
      <div ref={scrollRef} className="els29-native-matrix-scroll els29-fold-scroll" role="region" tabIndex={0} aria-label={`מטריצה ברוחב ${width}, עמודות ${band.c0} עד ${band.c1}`}>
        <div className="els29-native-matrix" aria-hidden="true" style={{ "--els29-cols": cols, "--els29-cell": `${cellPx}px`, "--els29-font": `${letterPx(cellPx)}px` }}>
          {band.rows.map((line, r) => <div className="els29-native-matrix-row" key={r}>
            {Array.from(line).map((letter, c) => {
              const mark = markAt.get(`${r}-${c}`);
              const start = mark?.start && mark.start[0] === r && mark.start[1] === c;
              return <span key={c} className={`els29-native-cell${mark ? (mark.axis ? " is-axis" : " is-finding") : ""}${start ? " is-start" : ""}`}
                style={mark && !mark.axis && mark.color ? { "--els29-mark": mark.color } : undefined}>{letter === " " ? " " : letter}</span>;
            })}
          </div>)}
        </div>
      </div>
    </> : null}
  </section>;
}
