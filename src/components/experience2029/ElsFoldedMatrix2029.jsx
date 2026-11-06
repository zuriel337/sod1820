import React, { useEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { clampInt, splitHitLabel, splitMarkMap, splitRowStartFor } from "../../lib/elsSplitMatrix.js";
import "./elsSplitMatrix2029.css";

const errors = {
  "results-changed": "המופע או החיפוש השתנו. הציר מוצג שוב במטריצה הרגילה.",
  "window-unavailable": "אי אפשר לקפל את המטריצה למופע הזה.",
  "window-failed": "הקיפול לא נטען. אפשר לנסות שוב.",
  timeout: "הטעינה לא הסתיימה בזמן. אפשר לנסות שוב.",
};

// Research mode only. The same text re-flowed into rows of width S/k ("folding"): k-1 rows now sit between consecutive axis letters
// and everything moves with it. Letters, positions and verification are the engine's; this view only reads them through the lens.
export default function ElsFoldedMatrix2029({ state, option, busy, response, onRequest, onExit }) {
  const axisHitId = state?.axis?.hitId || null, scope = state?.scope || null;
  const axisLength = Number(state?.axis?.length) || 5;
  const defaultRows = clampInt((axisLength - 1) * option.k + 7, 15, 61, 15);
  const [view, setView] = useState({ focus: axisHitId, rowStart: null, colStart: null, rowCount: defaultRows, colCount: 11 });
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const seqRef = useRef(0), requestRef = useRef(null);
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
    send({ focus: axisHitId, rowStart: null, colStart: null, rowCount: clampInt((axisLength - 1) * option.k + 7, 15, 61, 15), colCount: view.colCount });
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

  const band = data?.bands?.[0];
  const markAt = useMemo(() => (band ? splitMarkMap(band) : new Map()), [band]);
  const byId = useMemo(() => new Map((data?.hits || []).map(hit => [hit.hitId, hit])), [data?.hits]);
  const width = data?.width || option.width;
  const jump = hitId => {
    const hit = byId.get(hitId); if (!hit) return;
    send({ ...view, focus: hitId, colStart: null, rowStart: splitRowStartFor([hit, byId.get(axisHitId)].filter(Boolean), view.rowCount, data.totalRows) });
  };
  const moveRows = delta => data && send({ ...view, rowStart: clampInt(data.r0 + delta, 0, Math.max(0, data.totalRows - view.rowCount), 0) });
  const moveCols = delta => band && send({ ...view, rowStart: data.r0, colStart: clampInt(band.c0 + delta, 0, Math.max(0, width - view.colCount), 0) });

  return <section className="els29-fold" aria-label="מטריצה מקופלת" data-fold-width={width}>
    <header className="els29-split-head">
      <strong>מטריצה מקופלת <em className="els29-research-badge">מצב מחקר</em></strong>
      <button type="button" onClick={onExit}>חזרה למטריצה הרגילה</button>
    </header>
    <p className="els29-split-note">אותו טקסט בשורות של {width.toLocaleString("he-IL")} אותיות: בין כל שתי אותיות של הציר יש {option.between.toLocaleString("he-IL")} שורות. הכול זז יחד; האותיות והממצאים הם של המנוע, רק הפריסה השתנתה.</p>
    {pending ? <CanonicalProgress compact title="מקפל את המטריצה" phase="פורס את אותו טקסט בשורות חדשות" onCancel={onExit} /> : null}
    {notice ? <p role="alert" className="els29-split-note">{notice}</p> : null}
    {band ? <>
      <label className="els29-fold-jump">מעבר לממצא
        <select value={view.focus || axisHitId} disabled={pending} onChange={event => jump(event.target.value)}>
          {(data.hits || []).map(hit => <option key={hit.hitId} value={hit.hitId}>{splitHitLabel(hit)} · עמודה {hit.colMin}{hit.colMax !== hit.colMin ? `–${hit.colMax}` : ""}{hit.axis ? " · ציר" : ""}</option>)}
        </select>
      </label>
      <div className="els29-split-bands">
        <div className="els29-split-rowctl" aria-label="תנועה בשורות">
          <button type="button" aria-label="שורות קודמות" disabled={pending || data.r0 <= 0} onClick={() => moveRows(-Math.max(1, Math.floor(view.rowCount / 2)))}>▲</button>
          <button type="button" aria-label="שורות הבאות" disabled={pending || data.r1 >= data.totalRows - 1} onClick={() => moveRows(Math.max(1, Math.floor(view.rowCount / 2)))}>▼</button>
        </div>
        <figure className="els29-split-band" style={{ margin: 0 }}>
          <figcaption><small>עמודות <bdi dir="ltr">{band.c0}–{band.c1}</bdi> מתוך {width.toLocaleString("he-IL")} · שורות <bdi dir="ltr">{data.r0}–{data.r1}</bdi></small></figcaption>
          <div className="els29-split-grid" style={{ "--els29-split-cols": band.rows[0]?.length || 1 }} role="img" aria-label={`מטריצה מקופלת, עמודות ${band.c0} עד ${band.c1}`}>
            {band.rows.map((line, r) => Array.from(line).map((letter, c) => {
              const mark = markAt.get(`${r}-${c}`);
              const start = mark?.start && mark.start[0] === r && mark.start[1] === c;
              return <span key={`${r}-${c}`} className={`els29-split-cell${mark ? (mark.axis ? " is-axis" : " is-finding") : ""}${start ? " is-start" : ""}`}
                style={mark?.color ? { "--els29-split-mark": mark.color } : undefined}>{letter === " " ? " " : letter}</span>;
            }))}
          </div>
          <div className="els29-split-colctl">
            <button type="button" aria-label="עמודות ימינה" disabled={pending || band.c0 <= 0} onClick={() => moveCols(-Math.max(1, Math.floor(view.colCount / 2)))}>▶</button>
            <button type="button" aria-label="עמודות שמאלה" disabled={pending || band.c1 >= width - 1} onClick={() => moveCols(Math.max(1, Math.floor(view.colCount / 2)))}>◀</button>
          </div>
        </figure>
      </div>
    </> : null}
  </section>;
}
