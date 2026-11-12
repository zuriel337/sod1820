// "הקשר" of the ACTIVE unit, inside the left panel (preview): the unit's identity, proven added-time, its numbers and where each number
// occurs in this Post (units and videos), and the canonical references an editor chose. Reading only; it follows the active unit and never
// changes the reader's tab. A number opens the existing Number window (exact return to the post); an occurrence opens its unit anchor,
// or the video from its start when the time is unknown (no second is invented).
import React, { useSyncExternalStore } from "react";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { getPostUnitState, subscribePostUnits } from "../../lib/research/postUnitStore2029.js";
import { occurrencesForNumber } from "../../lib/research/postVideoReferences2029.js";
import { SEMANTIC_LEGEND, resolveUnitMessage } from "../../lib/research/postSemanticDesign2029.js";
import { PROVEN_POST_SOURCE_UPDATES, orderedSourceUpdates, addedDateLabel, plainDayLabel } from "../../lib/research/postSourceUpdates2029.js";
import { videoReferencesForPost } from "../../lib/research/postVideoReferences2029.js";

// The panel adapts to the CHARACTER of the Post, derived from facts the Post carries (never from an id list):
//   live timeline    the Post has proven content updates (an event that keeps growing): the panel leads with the update timeline;
//   numeric research the Post is a rich body of numbers around one event: the panel leads with the map of its numbers.
export const companionCharacterOf = (postId) => (PROVEN_POST_SOURCE_UPDATES[Number(postId)] || []).length ? "timeline" : "research";

// number -> { value, units:[keys], videos:n } across the Post's units, most-shared first.
export function numberMapOf(units, postId) {
  const map = new Map();
  for (const unit of units) for (const value of unit.numbers) {
    const row = map.get(value) || { value, units: [] };
    row.units.push(unit.key);
    map.set(value, row);
  }
  const videos = videoReferencesForPost(postId).flatMap((v) => v.occurrences.map((o) => o.number));
  return [...map.values()].map((row) => ({ ...row, videos: videos.filter((n) => n === row.value).length }))
    .sort((a, b) => b.videos - a.videos || b.units.length - a.units.length || a.value - b.value);
}

const symbol = (key) => SEMANTIC_LEGEND.find((item) => item.key === key)?.symbol || "";

export default function UnitContextPanel2029() {
  const shell = use2029Shell();
  const state = useSyncExternalStore(subscribePostUnits, getPostUnitState, getPostUnitState);
  const unit = state.units.find((u) => u.key === state.activeKey) || null;
  if (!unit) return null;
  const postHref = unit.anchor.split("#")[0];
  const occurrences = unit.numbers.flatMap((n) => occurrencesForNumber(state.postId, n, { postHref }));
  const jump = (event, key) => {
    event.preventDefault();
    const node = document.querySelector(`[data-sod-unit="${CSS.escape(key)}"]`) || document.getElementById(key);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const character = companionCharacterOf(state.postId);
  const timeline = character === "timeline" ? orderedSourceUpdates([...(PROVEN_POST_SOURCE_UPDATES[Number(state.postId)] || [])]) : [];
  const numberMap = character === "research" ? numberMapOf(state.units, state.postId) : [];
  return <section className="sod29-unit-context" data-unit-context={unit.key} data-companion-character={character} aria-label="היחידה הפעילה">
    {character === "timeline" ? <div className="sod29-companion-timeline" data-companion-section="timeline">
      <small>ציר העדכונים · מהחדש לישן</small>
      <ol>{timeline.map((entry) => {
        const message = resolveUnitMessage(state.postId, entry.targetId);
        const date = addedDateLabel(entry), event = plainDayLabel(entry.eventDate);
        return <li key={entry.id} className={entry.targetId === state.activeKey ? "is-active" : ""}>
          <a href={`${postHref}#${encodeURIComponent(entry.targetId)}`} onClick={(e) => jump(e, entry.targetId)}>
            <b>{message || entry.label}</b>
            <span>{date ? <>{symbol("added")} {date}</> : null}{event ? <> · {symbol("event")} {event}</> : null}</span>
          </a>
        </li>;
      })}</ol>
    </div> : null}
    {character === "research" ? <div className="sod29-companion-numbermap" data-companion-section="number-map">
      <small>מפת המספרים בפוסט · {numberMap.length}</small>
      <p>{numberMap.slice(0, 16).map((row) => <button key={row.value} type="button" title={`מופיע ב־${row.units.length} יחידות${row.videos ? " · יש מופע בסרטון" : ""}`}
        onClick={() => shell.openNumber?.({ type: "number", id: String(row.value) })}>{row.value}{row.units.length > 1 ? <sup>{row.units.length}</sup> : null}</button>)}</p>
    </div> : null}
    <small>היחידה הפעילה</small>
    <strong>{unit.title || unit.key}</strong>
    <p className="sod29-unit-context-meta">
      {unit.added ? <span>{symbol("added")} {unit.added.label ? `נוסף ${unit.added.label}` : "נוסף לפוסט"}</span> : null}
      {unit.eventDate ? <span>{symbol("event")} {unit.eventDate}</span> : null}
      {unit.message ? <span>{symbol("peak")} {unit.message}</span> : null}
    </p>
    {unit.numbers.length ? <p className="sod29-unit-context-numbers" aria-label="מספרים ביחידה">
      {unit.numbers.slice(0, 8).map((n) => <button key={n} type="button" onClick={() => shell.openNumber?.({ type: "number", id: String(n) })}>{n}</button>)}
    </p> : null}
    {occurrences.length ? <ul className="sod29-unit-context-occ" aria-label="מופעי המספר בפוסט">
      {occurrences.map((o) => <li key={o.id}>
        <b>{o.number}</b> <span>{o.text}</span> <small>{o.natureLabel}</small>
        {o.unitHref ? <a href={o.unitHref} onClick={(e) => jump(e, o.unitId)}>ליחידה ←</a> : null}
        <a href={o.videoOpenHref} target="_blank" rel="noreferrer">{o.timeKnown ? "לסרטון בקטע ←" : "לסרטון (זמן הקטע אינו ידוע) ←"}</a>
      </li>)}
    </ul> : null}
    {unit.references.length ? <p className="sod29-unit-context-refs">{unit.references.map((r) => <a key={r.ref} href={r.href}>{r.kind}: {r.ref.split(":").slice(1).join(":")}</a>)}</p> : null}
  </section>;
}
