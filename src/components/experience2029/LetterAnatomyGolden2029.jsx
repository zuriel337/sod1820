import React from "react";
import { buildWordLetterAnatomySpecs } from "../../lib/spatial/hebrewLetterAnatomy.js";

export default function LetterAnatomyGolden2029({ expression="אופק אדנק", value=1237, mode="full" }) {
  const specs=buildWordLetterAnatomySpecs(expression);
  return <section className="sod29-letter-anatomy" dir="rtl" data-mode={mode} aria-label={`אנטומיית אותיות — ${expression}`}>
    <header><small>צופן בתרבות · תיק 001</small><h2>{expression}</h2></header>
    <div className="sod29-letter-anatomy__word" role="list">
      {specs.map((s,i)=><span className="sod29-letter-anatomy__letter" role="listitem" key={`${i}-${s.letter.codepoint}`}>
        <b aria-hidden="true">{s.letter.codepoint}</b>
        <span className="sod29-letter-anatomy__inside">{s.expansions[0].spelling.slice(1)}</span>
        <span className="sr-only">{s.a11y.list_alternative}</span>
      </span>)}
    </div>
    <div className="sod29-letter-anatomy__result" aria-label={`תוצאת המנוע ${value}`}><span>מילוי</span><strong>{value}</strong></div>
  </section>;
}
