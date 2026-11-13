// The fixed gematria showcase of the Post family (ZURIEL 13.11.2026): a compact, delicate panel that is OPEN in front of the reader's eyes under a focal number.
// A thin gold hairline, a small method label, the expression and its result, then for each word a quiet sapphire card: its letters (with the engine's
// own running totals, or the spelled-out letter for "מילוי"), the sum line of those values and the word's total, and finally the equation of the words.
// PRESENTATION ONLY: it renders a model projected from the canonical Method Trace (projectGematriaTrace, which fails closed); it never calculates a step
// of the method. The only arithmetic shown is the plain re-addition of the engine's own numbers, printed ONLY when it equals the engine's own total.
// FIXED RULE: centred like a tower; a row of letters / a sum line / the equation is ALWAYS one line — on a narrow screen it scrolls sideways.
import React from "react";

const sum = (values) => values.reduce((a, v) => a + Number(v), 0);
const isNum = (v) => v != null && v !== "" && Number.isFinite(Number(v));

export default function GematriaShowcase2029({ model, expression }) {
  if (!model || model.state !== "ready") return null;
  const groups = Array.isArray(model.groups) ? model.groups : [];
  if (!groups.length || model.components?.length) return null;

  // each word's total: the engine's word subtotal, or (running-ledger kinds) the difference of the engine's running totals
  let carry = 0;
  const words = groups.map((group) => {
    const last = group.rows.at(-1);
    let total = isNum(group.subtotal) ? Number(group.subtotal) : (isNum(last?.subtotal) ? Number(last.subtotal) - carry : null);
    if (isNum(last?.subtotal)) carry = Number(last.subtotal);
    const values = group.rows.map((row) => row.value);
    const sumLine = total != null && values.every(isNum) && values.length > 1 && sum(values) === total ? values : null;
    return { group, total, sumLine };
  });
  const totals = words.map((w) => w.total);
  const equation = words.length > 1 && totals.every(isNum) && sum(totals) === Number(model.result);
  let order = 0;

  return <section className="sod29-gx" dir="rtl" data-gx="ready" aria-label={`פירוט החישוב: ${expression}`}>
    <span className="sod29-gx-step">פלאי המספרים · שיטת {String(model.methodLabel || "").replace(/^שיטת\s+/, "")}</span>
    <h4 className="sod29-gx-expr">{expression}</h4>
    <b className="sod29-gx-big" dir="ltr">{model.result}</b>
    <p className="sod29-gx-lead">כך נבנה החישוב</p>
    {words.map(({ group, total, sumLine }) => <div className="sod29-gx-word" key={group.id}>
      <p className="sod29-gx-word-label">{group.label}</p>
      <ol className="sod29-gx-letters" tabIndex={0} aria-label={`אותיות ${group.label} — אפשר לגלול הצידה`}>
        {group.rows.map((row) => <li key={row.id} style={{ "--i": order++ }}>
          <i>{row.token}</i>
          {row.transformed && row.transformed !== row.token ? <em>{row.transformed}</em> : null}
          <small>{row.value}</small>
        </li>)}
      </ol>
      {total != null ? <p className="sod29-gx-sum" dir="ltr" tabIndex={sumLine && sumLine.length > 4 ? 0 : undefined}>
        {sumLine ? <>{sumLine.map((v, i) => <React.Fragment key={i}>{i ? <span className="sod29-gx-op">+</span> : null}<span>{v}</span></React.Fragment>)}<span className="sod29-gx-op">=</span></> : null}
        <b className="sod29-gx-total">{total}</b></p> : null}
    </div>)}
    {equation ? <p className="sod29-gx-eq" dir="ltr">{totals.map((v, i) => <React.Fragment key={i}>{i ? <span className="sod29-gx-op">+</span> : null}<span>{v}</span></React.Fragment>)}<span className="sod29-gx-op">=</span><span>{model.result}</span></p> : null}
    <p className="sod29-gx-ok"><span aria-hidden="true">✓</span> אומת מול מנוע הגימטריה הקנוני</p>
  </section>;
}
