import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

const Arrow = () => <svg className="bm-flow-arrow" viewBox="0 0 48 12" aria-hidden="true" focusable="false">
  <path className="bm-flow-line" d="M46 6H4" />
  <path d="M10 1 4 6l6 5" />
</svg>;

/**
 * Teaching illustration: letters → method → result. It only lays out values the lesson already has
 * (the sample expression, the method label, the registry result); it performs no calculation.
 */
export default function BeitMidrashLessonFlow({ expression, methodLabel, result }) {
  const letters = [...String(expression || "")].filter((char) => char.trim());
  return <figure className="bm-flow" aria-label={`${expression}: דרך ${methodLabel} אל התוצאה`}>
    <ol className="bm-flow-letters" aria-label="אותיות הדוגמה">
      {letters.map((letter, index) => <li key={`${letter}:${index}`} style={{ "--bm-i": index }}>{letter}</li>)}
    </ol>
    <Arrow />
    <div className="bm-flow-method">
      <span aria-hidden="true"><NavigationIcon2029 name="tools" /></span>
      <strong>{methodLabel}</strong>
    </div>
    <Arrow />
    <output className="bm-flow-result" aria-label="תוצאת הדוגמה">{result ?? "—"}</output>
  </figure>;
}
