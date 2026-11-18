import React, { useMemo, useState } from "react";
import { joinElsDiscovery, filterElsJointRows, sortElsJointRows, countElsJointRows, prepareElsReadingAddition } from "../../lib/research/elsJointDiscovery.js";
import { elsLexiconWindowKey, prepareElsLexiconAdditions } from "../../lib/research/elsLexiconResearch.js";
import "./elsJointDiscovery2029.css";

// The joint list of the matrix discovery and the Fable reading (ZURIEL 18.11.2026). Presentation only: rows come from
// joinElsDiscovery over results that already exist; adding goes through the engine's findings update, which verifies again.
const PAGE = 20;
const KINDS = [["els", "ELS בלבד"], ["rare", "לא צפוי במקרה"], ["all", "הכול, כולל טקסט"]];
const SOURCES = [["all", "כל המקורות"], ["engine", "מנוע"], ["fable", "Fable"], ["both", "שניהם"]];
const SORTS = [["axis", "קרבה לציר"], ["rare", "נדירות (E)"], ["length", "אורך"]];
const chance = E => E === null ? null : E < 0.001 ? E.toExponential(1) : E < 10 ? E.toPrecision(2) : Math.round(E).toString();

function describe(row) {
  const dir = row.dir < 0 ? "לאחור" : "קדימה";
  const where = row.distance === null ? "" : row.distance === 0 ? " · חוצה את הציר" : row.distance === 1 ? " · צמוד לציר" : ` · ${row.distance} תאים מהציר`;
  return `${row.kind === "source" ? "טקסט רגיל · " : ""}דילוג ${row.skip} · ${dir}${where}`;
}

/**
 * The container: state = the engine state, runs = the discovery panel's completed runs ({ words, language }: { key, mode, data }),
 * projection = the Fable reading projection, onFindingsChange = the host's findings update, onShow = focus a Fable finding on the matrix.
 */
export default function ElsJointDiscovery2029({ state, runs = {}, projection = null, visible = true, busy = false, color, onFindingsChange, onShow, selectedKey }) {
  const [notice, setNotice] = useState("");
  const key = elsLexiconWindowKey(state);
  const all = Object.values(runs || {}).filter(run => run?.data);
  const fresh = all.filter(run => run.key === key && !!key);
  const axis = state?.axis && state.term ? { term: state.term, skip: state.axis.skip, dir: state.axis.direction === "back" ? -1 : 1, start: state.axis.start } : null;
  const axisKey = axis ? `${axis.term}:${axis.skip}:${axis.dir}:${axis.start}` : "";
  const rows = useMemo(() => joinElsDiscovery({ runs: fresh, projection, axis, width: state?.geometry?.S ?? axis?.skip ?? null, scope: state?.scope }),
    [runs, key, projection, axisKey, state?.geometry?.S, state?.scope]);
  const isAdded = row => {
    const finding = state?.findings?.find(f => f.t === row.term);
    return [...(finding?.hits || []), ...(finding?.sourceHits || [])].some(hit => hit.hitId === row.hitId && hit.selected && (row.kind === "source" || hit.verified));
  };
  const add = row => {
    if (busy) { setNotice("התוספת הקודמת עדיין באימות. המתינו לסיומה ואז הוסיפו את הבאה."); return; }
    const prepared = row.engine ? prepareElsLexiconAdditions(state, row.engine.data, [row.engine.item], color) : prepareElsReadingAddition(state, row.fable, color);
    if (prepared.error) {
      setNotice(prepared.error === "limit" ? "במטריצה כבר 24 מילים, וזו התקרה. הסירו מילה מרשימת הממצאים ואז הוסיפו."
        : prepared.error === "outside" ? "אפשר להוסיף רק ממצא שכולו בחלון התצוגה. הזיזו את המטריצה אליו או הגדילו את החלון."
        : "הגילוי אינו מתאר עוד את המטריצה שעל המסך. הפעילו סריקה חדשה ואז הוסיפו.");
      return;
    }
    onFindingsChange?.(prepared.findings); setNotice(`${row.label} נשלח לאימות במנוע. מה שכבר מסומן במטריצה נשאר; רק מה שיאומת יתווסף.`);
  };
  if (!visible) return null;
  return <ElsJointDiscoveryList rows={rows} current={fresh.length === all.length} busy={busy} isAdded={isAdded} onAdd={add} notice={notice}
    onShow={onShow ? row => onShow(row.fable.key) : null} selectedKey={selectedKey} hasDiscovery={fresh.length > 0} hasReading={!!projection?.findings?.length} />;
}

export function ElsJointDiscoveryList({ rows = [], current = true, busy = false, isAdded, onAdd, onShow, selectedKey, notice = "", hasDiscovery = false, hasReading = false }) {
  const [kind, setKind] = useState("els"), [source, setSource] = useState("all"), [sort, setSort] = useState("axis"), [page, setPage] = useState(0);
  const counts = useMemo(() => countElsJointRows(rows), [rows]);
  const shown = useMemo(() => sortElsJointRows(filterElsJointRows(rows, { kind, source }), sort), [rows, kind, source, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE)), at = Math.min(page, pages - 1);
  const slice = shown.slice(at * PAGE, at * PAGE + PAGE);
  const pick = setter => value => { setter(value); setPage(0); };
  return <section className="els29-joint-discovery" aria-label="רשימת הממצאים המשותפת">
    <h3>ממצאים · רשימה משותפת <small>{shown.length}{shown.length !== rows.length ? ` מתוך ${rows.length}` : ""}</small></h3>
    {!rows.length ? <p>{hasDiscovery || hasReading ? "לא נמצאו ממצאים בסינון הזה." : "הריצו את סריקת המנוע (שלב 1), ואם תרצו את Fable (שלב 2). מה ששניהם מצאו יופיע כאן ברשימה אחת."}</p> : <>
      <div className="els29-joint-filters" role="group" aria-label="סינון לפי סוג">
        {KINDS.map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => pick(setKind)(id)}>{label}</button>)}
      </div>
      <div className="els29-joint-filters" role="group" aria-label="סינון לפי מקור">
        {SOURCES.map(([id, label]) => <button key={id} type="button" aria-pressed={source === id} data-joint-source={id} onClick={() => pick(setSource)(id)}>
          {label}{id === "all" ? "" : ` · ${counts[id]}`}</button>)}
      </div>
      <label className="els29-joint-sort">מיון <select aria-label="מיון הרשימה המשותפת" value={sort} onChange={event => pick(setSort)(event.target.value)}>
        {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
    </>}
    {!current && rows.some(row => row.engine) ? <p role="note">חלק מתוצאות הגילוי שייכות לחלון קודם. סרקו שוב לפני הוספה.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {slice.length ? <ul>{slice.map(row => {
      const added = isAdded?.(row) === true, fableOnly = !row.engine;
      const canAdd = !added && !busy && (row.engine ? current : row.fable?.visibility === "full");
      return <li key={row.key} data-joint-row={row.key} data-joint-source={row.source} data-selected={selectedKey && row.fable?.key === selectedKey ? "true" : undefined}>
        <div className="els29-joint-copy">
          <strong><bdi>{row.label}</bdi></strong>
          {row.label !== row.term ? <small>רצף האותיות: <bdi>{row.term}</bdi></small> : null}
          <small>{describe(row)}</small>
          <span className="els29-joint-chips">
            {row.engine ? <span className="is-engine">מנוע</span> : null}
            {row.fable ? <span className="is-fable">Fable</span> : null}
            <span className={row.verified ? "is-verified" : "is-candidate"}>{row.verified ? "מאומת במנוע" : "מועמד · ייבדק בהוספה"}</span>
            {row.E !== null ? <span className={row.E < 1 ? "is-rare" : "is-chance"} title="מספר המופעים הצפוי במקרה באותו דילוג בכל התורה">E {chance(row.E)}</span> : null}
          </span>
        </div>
        <div className="els29-joint-actions">
          {row.fable && onShow ? <button type="button" disabled={row.fable.visibility === "outside" || row.fable.visibility === "mismatch"} aria-pressed={selectedKey === row.fable.key}
            aria-label={`הצג במטריצה: ${row.label}`} onClick={() => onShow(row)}>{row.fable.visibility === "outside" ? "מחוץ לחלון" : "הצג"}</button> : null}
          <button type="button" className="is-primary" disabled={!canAdd} aria-label={added ? `${row.label} כבר במטריצה` : `הוסף למטריצה: ${row.label}`}
            title={fableOnly && row.fable?.visibility !== "full" ? "אפשר להוסיף רק ממצא שכולו בחלון התצוגה" : undefined} onClick={() => onAdd?.(row)}>{added ? "במטריצה" : "הוסף"}</button>
        </div>
      </li>;
    })}</ul> : null}
    {shown.length > PAGE ? <nav aria-label="עמודי הרשימה המשותפת"><button type="button" disabled={at === 0} onClick={() => setPage(at - 1)}>הקודם</button>
      <span>עמוד {at + 1} מתוך {pages}</span><button type="button" disabled={at + 1 >= pages} onClick={() => setPage(at + 1)}>הבא</button></nav> : null}
    {rows.length ? <p className="els29-joint-legend">מאומת: האותיות נמצאות במקום שנטען והמנוע הקנוני אישר. מועמד מהגילוי נבדק במנוע כשמוסיפים אותו. E הוא מספר המופעים הצפוי במקרה באותו דילוג בכל התורה; E קטן מ־1 אינו משמעות.</p> : null}
  </section>;
}
