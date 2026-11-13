// The fixed gematria showcase panel of the Post family (ZURIEL 13.11.2026: "something fixed for all posts", in the style of the "שבילי שפה" panels):
// a rounded dark panel with a thin gold hairline, a method pill, each word as a row of letter chips (the letter and its running total), the
// equation of the word subtotals as tiles, and ONE large glowing gold result with a short caption. PRESENTATION ONLY: it renders a model already
// projected from the canonical Method Trace (projectGematriaTrace) — it never calculates, re-derives or invents a step. Letters rise once in order
// (finite, reduced-motion aware); there is no looping animation. FIXED RULE (ZURIEL 13.11.2026): everything is centred like a tower, and a row of
// letters / the equation is ALWAYS a single line — on a narrow screen it scrolls sideways instead of wrapping.
import React from "react";

const sum = (values) => values.reduce((a, v) => a + Number(v), 0);

export default function GematriaShowcase2029({ model, expression }) {
  if (!model || model.state !== "ready") return null;
  const groups = Array.isArray(model.groups) ? model.groups : [];
  if (!groups.length || model.components?.length) return null;
  const subtotals = groups.map((g) => g.subtotal);
  const equation = groups.length > 1 && subtotals.every((v) => Number.isFinite(Number(v))) && sum(subtotals) === Number(model.result);
  let order = 0;
  return <section className="sod29-gx" dir="rtl" data-gx="ready" aria-label={`פירוט החישוב: ${expression}`}>
    <span className="sod29-gx-step">{model.methodLabel}</span>
    <h4 className="sod29-gx-expr">{expression}</h4>
    {groups.map((group) => <div className="sod29-gx-word" key={group.id}>
      <p className="sod29-gx-word-label">{group.label}{group.subtotal != null ? <> · <b>{group.subtotal}</b></> : null}</p>
      <ol className="sod29-gx-letters" tabIndex={0} aria-label={`אותיות ${group.label} וסכום מצטבר — אפשר לגלול הצידה`}>
        {group.rows.map((row) => <li key={row.id} style={{ "--i": order++ }}>
          <i>{row.token}</i>
          <small>{row.value}</small>
        </li>)}
      </ol>
    </div>)}
    {equation ? <div className="sod29-gx-eq" dir="ltr">
      {groups.map((g, i) => <React.Fragment key={g.id}>{i ? <span className="sod29-gx-plus">+</span> : null}<span className="sod29-gx-tile">{g.subtotal}</span></React.Fragment>)}
      <span className="sod29-gx-plus">=</span>
    </div> : null}
    <b className="sod29-gx-big" dir="ltr">{model.result}</b>
    {model.instruction ? <p className="sod29-gx-cap">{model.instruction}</p> : null}
  </section>;
}
