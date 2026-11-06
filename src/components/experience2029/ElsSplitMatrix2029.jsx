import React, { useEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import {
  SPLIT_LIMITS, clampInt, splitHitLabel, splitResponseMatches, splitMarkMap, splitRowStartFor, splitSuggestion,
  splitTableRows, splitWindowRequest, toggleSplitBand,
} from "../../lib/elsSplitMatrix.js";
import "./elsSplitMatrix2029.css";

const errors = {
  "results-changed": "המופע או החיפוש השתנו. פתחו את התצוגה מחדש.",
  "window-unavailable": "אי אפשר להציג חלון שורות עבור המופע הזה.",
  "window-failed": "התצוגה לא נטענה. אפשר לנסות שוב.",
  timeout: "הטעינה לא הסתיימה בזמן. הפעולה בוטלה; אפשר לנסות שוב.",
};

// Research-only "split matrix": the same axis matrix, read as several narrow column bands over one shared row window.
// It only projects occurrences the canonical engine already verified; it never searches, ranks by meaning or saves anything.
export default function ElsSplitMatrix2029({ state, visible, busy, response, onRequest }) {
  const axisHitId = state?.axis?.hitId || null, scope = state?.scope || null;
  const identity = axisHitId ? `${scope}|${state?.term}|${axisHitId}` : "";
  const [view, setView] = useState({ open: false, bands: [], rowStart: null, rowCount: 15, colCount: 5, columnStarts: {} });
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const seqRef = useRef(0), requestRef = useRef(null), identityRef = useRef(identity);
  const send = next => {
    const request = splitWindowRequest({ axisHitId, scope, bands: next.bands, rowStart: next.rowStart, rowCount: next.rowCount, colCount: next.colCount, columnStarts: next.columnStarts, seq: ++seqRef.current });
    requestRef.current = request; setView(next); setPending(true); setNotice(""); onRequest(request);
  };
  const open = () => { if (axisHitId && !busy) send({ open: true, bands: [axisHitId], rowStart: null, rowCount: 15, colCount: 5, columnStarts: {} }); };
  const close = () => { requestRef.current = null; setView(current => ({ ...current, open: false })); setPending(false); };

  // A different search, scope or axis invalidates the view: nothing from the previous matrix may remain on screen.
  useEffect(() => {
    if (identityRef.current === identity) return;
    identityRef.current = identity; requestRef.current = null; setData(null); setPending(false); setNotice("");
    setView({ open: false, bands: [], rowStart: null, rowCount: 15, colCount: 5, columnStarts: {} });
  }, [identity]);
  useEffect(() => { if (!visible && view.open) close(); }, [visible]);
  useEffect(() => {
    if (!response || !requestRef.current || !splitResponseMatches(response, requestRef.current)) return;
    setPending(false);
    if (!response.ok) { setNotice(errors[response.reason] || errors["window-failed"]); return; }
    setData(response);
  }, [response]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { setPending(false); setNotice(errors.timeout); }, 20000);
    return () => clearTimeout(timer);
  }, [pending, seqRef.current]);

  const rows = useMemo(() => splitTableRows(data?.hits || []), [data?.hits]);
  const suggestion = useMemo(() => (data && view.bands.length <= 1 ? splitSuggestion(data.hits, axisHitId, view.colCount) : null), [data, view.bands.length, axisHitId, view.colCount]);
  const byId = useMemo(() => new Map((data?.hits || []).map(hit => [hit.hitId, hit])), [data?.hits]);
  const showOnly = (hitId) => {
    const hit = byId.get(hitId); if (!hit || !data) return;
    const bands = toggleSplitBand(view.bands, axisHitId, hitId);
    const shown = bands.map(id => byId.get(id)).filter(Boolean);
    const focus = bands.includes(hitId) ? [hit, ...shown.filter(item => item.hitId !== hitId)] : shown;
    const span = focus.length ? Math.max(...focus.map(item => item.rowMax)) - Math.min(...focus.map(item => item.rowMin)) + 1 : 0;
    const rowCount = clampInt(Math.max(view.rowCount, span + 2), SPLIT_LIMITS.minRows, SPLIT_LIMITS.maxRows, view.rowCount);
    send({ ...view, bands, rowCount, rowStart: splitRowStartFor(focus, rowCount, data.totalRows), columnStarts: Object.fromEntries(Object.entries(view.columnStarts).filter(([key]) => key !== hitId)) });
  };
  const moveRows = delta => data && send({ ...view, rowStart: clampInt(data.r0 + delta, 0, Math.max(0, data.totalRows - view.rowCount), 0) });
  const moveCols = (hitId, delta, band) => send({ ...view, columnStarts: { ...view.columnStarts, [hitId]: clampInt(band.c0 + delta, 0, Math.max(0, data.S - view.colCount), 0) }, rowStart: data.r0 });
  const resize = delta => data && send({ ...view, rowCount: clampInt(view.rowCount + 2 * delta, SPLIT_LIMITS.minRows, SPLIT_LIMITS.maxRows, 15),
    colCount: clampInt(view.colCount + 2 * delta, SPLIT_LIMITS.minCols, SPLIT_LIMITS.maxCols, 5), rowStart: data.r0, columnStarts: {} });

  return <section className="els29-split" aria-label="תצוגת שורות מפוצלת" hidden={!visible}>
    <header className="els29-split-head">
      <strong>תצוגת שורות מפוצלת <em className="els29-research-badge">מצב מחקר</em></strong>
      <button type="button" disabled={!axisHitId || busy} aria-expanded={view.open} onClick={() => (view.open ? close() : open())}>{view.open ? "סגור תצוגה" : "פתח תצוגת שורות"}</button>
    </header>
    {!axisHitId ? <p className="els29-split-note">בחרו מופע מאומת במטריצה כדי להפריד את השורות.</p>
      : !view.open ? <p className="els29-split-note">מציג את אותה מטריצה בפסים צרים על אותן שורות, כדי לקרוא יחד ממצאים שרחוקים זה מזה במטריצה הרחבה. קריאה בלבד — אין חיפוש חדש ואין שינוי בממצאים.</p> : null}
    {pending ? <CanonicalProgress compact title="טוען חלון שורות" phase="קורא את אותיות החלון מהמנוע הקנוני" onCancel={close} /> : null}
    {notice ? <p role="alert" className="els29-split-note">{notice}</p> : null}
    {view.open && data ? <div className="els29-split-body">
      <div className="els29-split-table" role="table" aria-label="ממצאים מאומתים במטריצה">
        <div role="row" className="els29-split-row is-head"><span role="columnheader">מונח</span><span role="columnheader">מופעים</span><span role="columnheader">דילוג</span><span role="columnheader">התחלה</span><span role="columnheader"><span className="els29-native-sr-only">פעולה</span></span></div>
        {rows.map(hit => <div role="row" key={hit.hitId} className={`els29-split-row${view.bands.includes(hit.hitId) ? " is-shown" : ""}`}>
          <span role="cell">{splitHitLabel(hit)}{hit.axis ? " · ציר" : ""}</span><span role="cell">{hit.count}</span><span role="cell" dir="ltr">{hit.signedSkip}</span><span role="cell" dir="ltr">{hit.start}</span>
          <span role="cell"><button type="button" aria-pressed={view.bands.includes(hit.hitId)} disabled={pending || hit.axis} onClick={() => showOnly(hit.hitId)}>{hit.axis ? "מוצג" : view.bands.includes(hit.hitId) ? "הסתר" : "הצג"}</button></span>
        </div>)}
        {rows.length <= 1 ? <p className="els29-split-note">לא נמצא ממצא מאומת נוסף בחלון המחקר הנוכחי. זו בדיקה מקומית בלבד — אין להסיק ממנה שאין מופע בכל התורה.</p> : null}
      </div>
      {suggestion ? <p className="els29-split-suggest" role="note"><strong>המלצה:</strong> «{suggestion.term}» נמצא ומאומת, אך רחוק {suggestion.gap.toLocaleString("he-IL")} עמודות מהציר. להציג אותו בפס נפרד על אותן שורות?{" "}
        <button type="button" disabled={pending} onClick={() => showOnly(suggestion.hitId)}>הפרד</button></p> : null}
      <div className="els29-split-bands">
        <div className="els29-split-rowctl" aria-label="תנועה בשורות">
          <button type="button" aria-label="שורות קודמות" disabled={pending || data.r0 <= 0} onClick={() => moveRows(-Math.max(1, Math.floor(view.rowCount / 2)))}>▲</button>
          <button type="button" aria-label="שורות הבאות" disabled={pending || data.r1 >= data.totalRows - 1} onClick={() => moveRows(Math.max(1, Math.floor(view.rowCount / 2)))}>▼</button>
          <button type="button" aria-label="הקטן חלון" disabled={pending || view.colCount <= SPLIT_LIMITS.minCols} onClick={() => resize(-1)}>−</button>
          <button type="button" aria-label="הגדל חלון" disabled={pending || view.colCount >= SPLIT_LIMITS.maxCols} onClick={() => resize(1)}>＋</button>
        </div>
        {data.bands.map((band, index) => { const markAt = splitMarkMap(band); return <figure className="els29-split-band" key={band.hitId} data-axis={band.axis ? "true" : undefined}>
          <figcaption><strong>{splitHitLabel(byId.get(band.hitId) || band)}</strong><small>עמודות <bdi dir="ltr">{band.c0}–{band.c1}</bdi> · שורות <bdi dir="ltr">{data.r0}–{data.r1}</bdi></small><small>הממצא בשורות <bdi dir="ltr">{band.rowMin}–{band.rowMax}</bdi> · בעמודה <bdi dir="ltr">{band.colMin}{band.colMax !== band.colMin ? `–${band.colMax}` : ""}</bdi></small></figcaption>
          <div className="els29-split-grid" style={{ "--els29-split-cols": band.rows[0]?.length || 1 }} role="img" aria-label={`פס ${splitHitLabel(band)} בעמודות ${band.c0} עד ${band.c1}`}>
            {band.rows.map((line, r) => Array.from(line).map((letter, c) => {
              const mark = markAt.get(`${r}-${c}`);
              const start = mark?.start && mark.start[0] === r && mark.start[1] === c;
              return <span key={`${r}-${c}`} className={`els29-split-cell${mark ? (mark.axis ? " is-axis" : " is-finding") : ""}${start ? " is-start" : ""}`}
                style={mark?.color ? { "--els29-split-mark": mark.color } : undefined}>{letter === " " ? "\u00a0" : letter}</span>;
            }))}
          </div>
          <div className="els29-split-colctl">
            <button type="button" aria-label="עמודות ימינה" disabled={pending || band.c0 <= 0} onClick={() => moveCols(band.hitId, -1, band)}>▶</button>
            <button type="button" aria-label="עמודות שמאלה" disabled={pending || band.c1 >= data.S - 1} onClick={() => moveCols(band.hitId, 1, band)}>◀</button>
          </div>
          {index === 0 && data.bands.length > 1 ? <small className="els29-split-gap" aria-hidden="true">⋯ {data.S.toLocaleString("he-IL")} עמודות במטריצה</small> : null}
        </figure>; })}
      </div>
      <p className="els29-split-note">רוחב המטריצה {data.S.toLocaleString("he-IL")} עמודות · {data.totalRows.toLocaleString("he-IL")} שורות. הצבעים הם הממצאים שנבחרו בחיפוש; אין כאן ציון או הוכחה חדשים.</p>
    </div> : null}
  </section>;
}
