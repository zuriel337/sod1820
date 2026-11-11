// An external public source shown inside a Post (ZURIEL 12.11.2026, section C): writer, date, phrase, number and an exact link.
// It is a DISPLAY unit. It reads nothing private, never changes the source's text, and shows an engine state only from the engine:
//   unchecked → one small neutral symbol (no ✓, no repeated warning sentences) with detail on demand;
//   verified  → ✓ only after the method and the result were really checked;  mismatch → both values, clearly distinct.
// `source.demo` marks sample data (used while the intake session has not published a source): it is labelled as a demonstration.
import React, { useEffect, useState } from "react";
import { checkSourceHint, HINT_STATES } from "../../lib/research/postSourceHintCheck2029.js";
import { SEMANTIC_LEGEND } from "../../lib/research/postSemanticDesign2029.js";

const symbol = (key) => SEMANTIC_LEGEND.find((item) => item.key === key)?.symbol || "";
const dateLabel = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t)).replace(/\//g, ".") : "";
};

export default function PostExternalSourceUnit2029({ source, readProfile = null }) {
  const [check, setCheck] = useState({ state: HINT_STATES.unchecked });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    if (source?.skipEngine) { setCheck({ state: HINT_STATES.unchecked }); return undefined; }
    checkSourceHint({ expression: source?.phrase, stated: source?.number, readProfile }).then((result) => { if (live) setCheck(result); });
    return () => { live = false; };
  }, [source?.phrase, source?.number, source?.skipEngine, readProfile]);
  if (!source?.text && !source?.phrase) return null;
  const state = check.state;
  const stateLabel = SEMANTIC_LEGEND.find((item) => item.key === state)?.label;
  return <aside className="sod29-source-unit" data-source-unit={source.id || ""} data-engine-state={state} aria-label={`מקור חיצוני: ${source.writerName || ""}`}>
    <header>
      <strong>{source.writerHref ? <a href={source.writerHref}>{source.writerName}</a> : source.writerName}</strong>
      {source.groupLabel ? <span>{source.groupLabel}</span> : null}
      {source.dateIso ? <time dateTime={source.dateIso}>{dateLabel(source.dateIso)}</time> : null}
      {source.demo ? <span className="sod29-source-unit-demo">נתוני הדגמה</span> : null}
    </header>
    {source.text ? <blockquote lang="he">{source.text}</blockquote> : null}
    {source.phrase && source.number != null ? <div className="sod29-source-unit-hint">
      <span>{source.phrase}</span>
      <b>{source.number}</b>
      <button type="button" className="sod29-engine" data-engine={state} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        aria-label={`מצב בדיקה במנוע: ${stateLabel}`}>
        <span aria-hidden="true">{symbol(state)}</span><span>{stateLabel}</span>
      </button>
    </div> : null}
    {open ? <p className="sod29-engine-detail" role="note">
      {state === HINT_STATES.verified ? `נבדק במנוע בשיטת ${check.method?.label || "רגילה"}: ${check.value}. אימות חישוב אינו אימות פרשנות.` : null}
      {state === HINT_STATES.mismatch ? `במקור נכתב ${check.claimed}; המנוע (שיטת ${check.method?.label || "רגילה"}) נותן ${check.value}. שני הערכים נשמרים.` : null}
      {state === HINT_STATES.unchecked ? "הביטוי טרם נבדק במנוע. זה מצב ניטרלי: המספר מוצג כפי שנכתב במקור." : null}
    </p> : null}
    <footer>{source.href ? <a href={source.href}>למקור המדויק ←</a> : null}</footer>
  </aside>;
}
