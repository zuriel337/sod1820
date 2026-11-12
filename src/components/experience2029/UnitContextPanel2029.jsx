// "הקשר" of the ACTIVE unit, inside the left panel (preview): the unit's identity, proven added-time, its numbers and where each number
// occurs in this Post (units and videos), and the canonical references an editor chose. Reading only; it follows the active unit and never
// changes the reader's tab. A number opens the existing Number window (exact return to the post); an occurrence opens its unit anchor,
// or the video from its start when the time is unknown (no second is invented).
import React, { useSyncExternalStore } from "react";
import { use2029Shell } from "./Sod2029Shell.jsx";
import { getPostUnitState, subscribePostUnits } from "../../lib/research/postUnitStore2029.js";
import { occurrencesForNumber } from "../../lib/research/postVideoReferences2029.js";
import { SEMANTIC_LEGEND } from "../../lib/research/postSemanticDesign2029.js";

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
  return <section className="sod29-unit-context" data-unit-context={unit.key} aria-label="היחידה הפעילה">
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
