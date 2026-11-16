// The ONE display of a gematria finding inside a unit of the Post family (ZURIEL 16.11.2026): every claim trace of the approved text AND every gematria item the
// editor adds renders HERE, from canonical engine data (loadUnitTrace → fetchNumberMethodProfile / fetchGematriaMethodTrace → projectGematriaTrace). It owns NO
// calculation, NO copy of a value or a letter breakdown, NO HTML and NO CSS of its own per item: a change to the shared components below (the Method Trace stages and
// the Post-family showcase) or to their tokens changes every gematria in every unit at once.
//   peak     — the number, big (the same Post control: data-gem opens the Number window)
//   full     — the canonical Method Trace stage (TraceFamilyStage2029 / SpatialMethodStage2029, the Beit Midrash / Number page family)
//   letters  — the Post-family showcase: letters and words, the sum line and the equation (GematriaShowcase2029)
//   compact  — one line: expression = number (method)
// A source's claim is shown NEXT TO the engine's result (never replaced by it); an unreadable trace says so and invents no step.
import React, { useEffect, useRef, useState } from "react";
import { loadUnitTrace } from "../../lib/research/unitGematriaTrace2029.js";
import { ATTRIBUTION_GROUPS } from "../../lib/research/postPreviewUnits2029.js";
import { HINT_STATES } from "../../lib/research/postSourceHintCheck2029.js";
import { GX_DISPLAYS } from "../../lib/research/postUnitBody2029.js";
import GematriaShowcase2029 from "./GematriaShowcase2029.jsx";
import SpatialMethodStage2029 from "../gematria2029/SpatialMethodStage2029.jsx";
import { TraceFamilyStage2029 } from "../gematria2029/MethodTraceExplanation2029.jsx";
import { use2029Shell } from "./Sod2029Shell.jsx";

const byLabel = (by) => (by === "editorial" || !by ? "בנוסח העריכה" : `בדברי ${(ATTRIBUTION_GROUPS.find((g) => g.identity === by) || {}).label?.replace(/^דברי\s+/, "") || by}`);

function GapNote({ state, stated }) {
  if (!state.gap) return null;
  const { claimed, engine, state: verdict } = state.gap;
  return <p className="sod29-ugx-gap" data-gap-state={verdict} role="status">
    המקור טען <b dir="ltr">{claimed}</b> · המנוע (שיטת {state.methodLabel}) נותן <b dir="ltr">{engine}</b> — {verdict === HINT_STATES.verified ? "✓ מאושר" : "≠ אי־התאמה, שני הערכים נשמרים"}
    {verdict === HINT_STATES.mismatch && state.otherMethods?.length ? <small> · {claimed} מתקבל בשיטות: {state.otherMethods.join(", ")}</small> : null}
  </p>;
}

// the display, from a LOADED canonical state (pure presentation)
export function GematriaView2029({ state, phrase, display = "letters", stated = null }) {
  const shell = use2029Shell();
  const open = () => shell?.openNumber?.({ type: "number", id: String(state.value) });
  const num = <span data-gem={String(state.value)} role="button" tabIndex={0} aria-label={`בדוק את המספר ${state.value}`} onClick={open}>{state.value}</span>;
  if (display === "peak") return <div className="sod29-ugx-peak"><p data-sod-role="peak" data-sod-align="center">{num}</p><small>{phrase} · שיטת {state.methodLabel}</small><GapNote state={state} stated={stated} /></div>;
  if (display === "compact") return <p className="sod29-ugx-compact"><span dir="rtl">{phrase}</span> = {num} <small>(שיטת {state.methodLabel})</small><GapNote state={state} stated={stated} /></p>;
  const heavy = state.model.components?.length;
  return <div className="sod29-ugx-trace">
    {display === "full"
      ? (heavy ? <SpatialMethodStage2029 expression={phrase} methodKey={state.methodKey} trace={state.trace} expectedValue={state.value} depth="S2" /> : <TraceFamilyStage2029 model={state.model} depth="S2" />)
      : (heavy ? <SpatialMethodStage2029 expression={phrase} methodKey={state.methodKey} trace={state.trace} expectedValue={state.value} depth="S2" /> : <GematriaShowcase2029 model={state.model} expression={phrase} />)}
    <GapNote state={state} stated={stated} />
    <p className="sod29-pu-trace-links"><button type="button" onClick={open}>פתח בדף המספר</button></p>
  </div>;
}

// one gematria item of a unit: loads lazily (near the screen) or at once (`eager`, the editor's own previews)
export default function UnitGematria2029({ item, align = null, eager = false, onState = null }) {
  const [state, setState] = useState({ phase: "idle" });
  const hostRef = useRef(null);
  const key = `${item.phrase}|${item.methodKey}|${item.stated ?? ""}`;
  useEffect(() => {
    let live = true;
    setState({ phase: "idle" });
    const load = () => { setState({ phase: "loading" }); loadUnitTrace({ phrase: item.phrase, methodKey: item.methodKey, stated: item.stated ?? null }).then((next) => { if (live) { setState(next); onState?.(next); } }); };
    const node = hostRef.current;
    if (eager || !node || typeof IntersectionObserver === "undefined") { load(); return () => { live = false; }; }
    const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); load(); } }, { rootMargin: "300px 0px" });
    observer.observe(node);
    return () => { live = false; observer.disconnect(); };
  }, [key, eager]);
  return <section className="sod29-ugx" ref={hostRef} dir="rtl" data-ugx={item.display} data-align={align || "center"} data-ugx-state={state.phase} aria-label={`גימטריה: ${item.phrase}`}>
    {item.by ? <small className="sod29-ugx-by">{byLabel(item.by)}</small> : null}
    {state.phase === "loading" || state.phase === "idle" ? <p role="status" className="sod29-pu-sources-note">פותח את חישוב המנוע…</p> : null}
    {state.phase === "unavailable" ? <p role="status" className="sod29-pu-sources-note" data-ugx-unavailable>חישוב המנוע אינו זמין כרגע ל״{item.phrase}״ בשיטה {item.methodKey}. לא הומצאו צעדים.</p> : null}
    {state.phase === "ready" ? <GematriaView2029 state={state} phrase={item.phrase} display={item.display} stated={item.stated ?? null} /> : null}
    {item.note ? <small className="sod29-ugx-note">{item.note}</small> : null}
  </section>;
}
export { GX_DISPLAYS };
