import React from "react";
import { calcGem } from "../../lib/gematriaCore.js";
import { numberPageHref } from "../../lib/research/numberPageAddress.js";

export default function ElsAxisResearch2029({ state, pending, onSource }) {
  const axis = state?.verification?.state === "MATCH" && state.axis;
  const term = axis && state.term ? state.termRaw || state.term : "";
  const value = term ? calcGem(state.term) : 0;
  return <section id="els29-axis-view" className="els29-axis-research" aria-label="פעולות לציר">
    {term && !pending ? <>
      <h3><bdi>{term}</bdi></h3>
      <p>{state.scope === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{axis.skip}</bdi> · {axis.direction === "back" ? "לאחור" : "קדימה"}</p>
      <dl><dt>גימטריה רגילה</dt><dd><bdi>{value}</bdi></dd></dl>
      <div className="els29-axis-actions">
        <a href={numberPageHref(term)} target="_blank" rel="noopener noreferrer">חישוב הביטוי בשיטות נוספות</a>
        <a href={numberPageHref(value)} target="_blank" rel="noopener noreferrer">דף המספר {value}</a>
        <button type="button" onClick={onSource}>הצג את פסוק תחילת הציר</button>
      </div>
    </> : <p>{pending ? "ממתינים לאימות הציר." : "בחרו מופע מאומת כדי לראות את הגימטריה ופעולות הציר."}</p>}
  </section>;
}
