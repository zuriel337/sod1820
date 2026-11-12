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

export function ClaimRow({ claim, skipEngine, readProfile }) {
  const [check, setCheck] = useState({ state: HINT_STATES.unchecked });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    if (skipEngine) { setCheck({ state: HINT_STATES.unchecked }); return undefined; }
    checkSourceHint({ expression: claim.phrase, stated: claim.number, methodText: claim.methodText, readProfile }).then((result) => { if (live) setCheck(result); });
    return () => { live = false; };
  }, [claim.phrase, claim.number, claim.methodText, skipEngine, readProfile]);
  const state = check.state;
  const stateLabel = SEMANTIC_LEGEND.find((item) => item.key === state)?.label;
  return <div className="sod29-source-unit-hint" data-engine-state={state}>
    <span>{claim.phrase}</span>
    <b>{claim.number}</b>
    {claim.methodText ? <small>{claim.methodText}</small> : null}
    <button type="button" className="sod29-engine" data-engine={state} aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={`מצב בדיקה במנוע: ${stateLabel}`}>
      <span aria-hidden="true">{symbol(state)}</span><span>{stateLabel}</span>
    </button>
    {open ? <p className="sod29-engine-detail" role="note">
      {state === HINT_STATES.verified ? `נבדק במנוע בשיטת ${check.method?.label || "רגילה"}: ${check.value}. אימות חישוב אינו אימות פרשנות.` : null}
      {state === HINT_STATES.mismatch ? `במקור נכתב ${check.claimed}; המנוע (שיטת ${check.method?.label || "רגילה"}) נותן ${check.value}. שני הערכים נשמרים.${check.otherMethods?.length ? ` המספר הנטען יוצא בשיטות: ${check.otherMethods.join(", ")} — השיטה לא צוינה במקור.` : ""}` : null}
      {state === HINT_STATES.unchecked && check.reason === "method_not_a_single_engine_method" ? `השיטה שנכתבה במקור (״${check.methodText}״) אינה שיטה בודדת במנוע, ולכן לא נבדקה. המספר מוצג כפי שנכתב.` : null}
      {state === HINT_STATES.unchecked && check.reason === "expression_not_readable_by_engine" ? "המנוע לא קורא את הניסוח כפי שנכתב (למשל אותיות מרווחות), ולכן לא נבדק. הניסוח לא תוקן בשקט; המספר מוצג כפי שנכתב." : null}
      {state === HINT_STATES.unchecked && !["method_not_a_single_engine_method", "expression_not_readable_by_engine"].includes(check.reason) ? "הביטוי טרם נבדק במנוע. זה מצב ניטרלי: המספר מוצג כפי שנכתב במקור." : null}
    </p> : null}
  </div>;
}

// source = { id, demo, writerName, writerHref, groupLabel, dateIso, text, claims:[{phrase,number,methodText}], href, skipEngine }
// (the single-claim form {phrase, number} of the first prototype still works)
export default function PostExternalSourceUnit2029({ source, readProfile = null }) {
  if (!source?.text && !source?.phrase && !(source?.claims || []).length) return null;
  const claims = source.claims?.length ? source.claims : source.phrase && source.number != null ? [{ phrase: source.phrase, number: source.number, methodText: source.methodText || null }] : [];
  return <aside className="sod29-source-unit" data-source-unit={source.id || ""} data-writer-slug={source.writerSlug || ""} aria-label={`מקור חיצוני: ${source.writerName || ""}`}>
    <header>
      <strong>{source.writerHref ? <a href={source.writerHref}>{source.writerName}</a> : source.writerName}</strong>
      {source.groupLabel ? <span>{source.groupLabel}</span> : null}
      {source.dateIso ? <time dateTime={source.dateIso}>{dateLabel(source.dateIso)}</time> : null}
      {source.demo ? <span className="sod29-source-unit-demo">נתוני הדגמה</span> : null}
    </header>
    {source.text ? <blockquote lang="he">{source.text}</blockquote> : null}
    {claims.map((claim) => <ClaimRow key={`${claim.phrase}|${claim.number}`} claim={claim} skipEngine={source.skipEngine} readProfile={readProfile} />)}
    <footer>{source.href ? <a href={source.href}>למקור המדויק ←</a> : null}</footer>
  </aside>;
}
