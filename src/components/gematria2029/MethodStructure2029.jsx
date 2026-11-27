// The mathematical structure of a gematria method, drawn from the canonical engine trace ONLY (ZURIEL 27.11.2026, one display for every consumer).
// It renders a model projected by projectGematriaTrace (which fails closed on any trace the engine did not verify); it never calculates a step of a method.
// The only arithmetic printed is the plain re-addition of the engine's own numbers, shown ONLY when it equals the engine's own total (the same rule as GematriaShowcase2029).
//   CUMULATIVE_PREFIX   a prefix triangle: one per word when the engine resets at each word (ריבוע), one for the whole phrase when it continues (משולש מילה), read from the end in the reverse triangle
//   POSITION_WEIGHTED   letter value × position = contribution, per word
//   ADJACENT_DIFFERENCE the chain of letter values with the difference of every adjacent pair, per word
//   LETTER_LEDGER / SUBSTITUTION_LEDGER   the running ledger (a squared value or a substituted letter shown as the engine gave it)
import React from "react";
import HebrewGlyph2029 from "./HebrewGlyph2029.jsx";

const num = (v) => v != null && v !== "" && Number.isFinite(Number(v));
const sum = (values) => values.reduce((a, v) => a + Number(v), 0);
const fmt = (n) => Number(n).toLocaleString("en-US");

/** "a + b + c = total", only when the engine's own numbers really add up to the engine's own total. */
function SumLine({ values, total, label = null, quiet = false }) {
  if (!num(total)) return null;
  const adds = values.length > 1 && values.every(num) && sum(values) === Number(total);
  return <p className={`sod29-ms-sum${quiet ? " is-quiet" : ""}`} dir="ltr" tabIndex={adds && values.length > 5 ? 0 : undefined}>
    {label ? <small dir="rtl">{label}</small> : null}
    {adds ? values.map((v, i) => <React.Fragment key={i}>{i ? <span className="sod29-ms-op">+</span> : null}<span>{fmt(v)}</span></React.Fragment>) : null}
    {adds ? <span className="sod29-ms-op">=</span> : null}
    <b>{fmt(total)}</b>
  </p>;
}

/** The composition of a composite method: operands and result are the engine's own numbers; printed only when the operation really gives the engine's result. */
export function EquationLine({ values, operator, total }) {
  if (!values.every(num) || !num(total)) return null;
  const ok = operator === "diff" ? values.length === 2 && Number(values[0]) - Number(values[1]) === Number(total) : sum(values) === Number(total);
  if (!ok) return null;
  const op = operator === "diff" ? "−" : "+";
  return <p className="sod29-ms-sum" dir="ltr">{values.map((v, i) => <React.Fragment key={i}>{i ? <span className="sod29-ms-op">{op}</span> : null}<span>{fmt(v)}</span></React.Fragment>)}<span className="sod29-ms-op">=</span><b>{fmt(total)}</b></p>;
}

function Word({ group, children, total = group.subtotal, values = null }) {
  return <section className="sod29-ms-word" aria-label={`המילה ${group.label}`}>
    <h4>{group.label}</h4>
    {children}
    {values ? <SumLine values={values} total={total} label="סכום המילה" /> : null}
  </section>;
}

function PrefixTriangle({ group, size }) {
  // The engine's source positions tell the direction: the letter added at each step is the last one of the prefix, or the first one when the triangle is read from the end.
  const reversed = group.rows.length > 1 && Number(group.rows[0].position) > Number(group.rows.at(-1).position);
  // A real triangle: row k holds the first k letters (tiles), centred, so the rows widen from the apex down; the engine's prefix value sits at the row's end.
  return <ol className="sod29-ms-triangle" style={{ "--ms-n": size }}>
    {group.rows.map((row) => {
      const letters = [...row.prefix];
      const added = row.source?.base_value;
      return <li key={row.id} aria-label={`קידומת ${row.prefix}: ${row.value}`}>
        <b className="sod29-ms-value" dir="ltr">{fmt(row.value)}</b>
        <span className="sod29-ms-tiles" dir="rtl" aria-hidden="true">
          {letters.map((ch, k) => <i key={k} className={`sod29-ms-tile${k === (reversed ? 0 : letters.length - 1) ? " is-new" : ""}`}><HebrewGlyph2029 text={ch} /></i>)}
        </span>
        <span className="sod29-ms-added" dir="ltr">{num(added) ? `+${fmt(added)}` : ""}</span>
      </li>;
    })}
  </ol>;
}

function CumulativePrefix({ model }) {
  const resets = model.semantics?.per_word_reset === true;
  const words = model.groups.map((group) => ({ group, values: group.rows.map((r) => r.value) }));
  return <div className="sod29-ms" data-ms="prefix-triangle" data-ms-scope={resets ? "per-word" : "phrase"}>
    {words.map(({ group, values }) => <Word key={group.id} group={group} values={values} total={resets ? group.subtotal : model.result}>
      <PrefixTriangle group={group} size={group.rows.length} />
    </Word>)}
    {resets && model.groups.length > 1 ? <SumLine values={model.groups.map((g) => g.subtotal)} total={model.result} label="סכום המילים" /> : null}
  </div>;
}

/** value × position = contribution: a staircase, the step of each letter is its own position in the word (the engine's `position`). */
function PositionWeighted({ model }) {
  return <div className="sod29-ms" data-ms="position-weighted">
    {model.groups.map((group) => <Word key={group.id} group={group} values={group.rows.map((r) => r.value)}>
      <ol className="sod29-ms-stairs" style={{ "--ms-n": group.rows.length }}>{group.rows.map((row) => <li key={row.id} style={{ "--ms-step": Math.max(0, Number(row.position) - 1) }}>
        <i className="sod29-ms-tile is-new"><HebrewGlyph2029 text={row.token} /></i>
        <span className="sod29-ms-calc"><span dir="ltr">{fmt(row.baseValue)} × {row.position}</span><b dir="ltr">= {fmt(row.value)}</b></span></li>)}</ol>
    </Word>)}
    {model.groups.length > 1 ? <SumLine values={model.groups.map((g) => g.subtotal)} total={model.result} label="סכום המילים" /> : null}
  </div>;
}

/** The chain of one word: every letter with its value, and between neighbours the engine's difference. */
function AdjacentDifference({ model }) {
  return <div className="sod29-ms" data-ms="adjacent-difference">
    {model.groups.map((group) => {
      const letters = group.rows.map((row) => row.token.split(" ↔ "));
      const chain = group.rows.length ? [{ letter: letters[0][0], value: group.rows[0].left }, ...group.rows.map((row, i) => ({ letter: letters[i][1], value: row.right, diff: row.value }))] : [];
      const single = !group.rows[0]?.left && group.rows.length === 1;
      return <Word key={group.id} group={group} values={group.rows.map((r) => r.value)}>
        {single ? <p className="sod29-ms-note">{group.rows[0].text}</p> : <ol className="sod29-ms-chain">{chain.map((node, i) => <li key={i}>
          {node.diff != null ? <span className="sod29-ms-diff" dir="ltr" aria-label={`הפרש ${node.diff}`}>{fmt(node.diff)}</span> : null}
          <span className="sod29-ms-card"><b><HebrewGlyph2029 text={node.letter} /></b><small dir="ltr">{num(node.value) ? fmt(node.value) : ""}</small></span>
        </li>)}</ol>}
      </Word>;
    })}
    {model.groups.length > 1 ? <SumLine values={model.groups.map((g) => g.subtotal)} total={model.result} label="סכום המילים" /> : null}
  </div>;
}

/** The ledger: one tile per letter (the letter, the letter it was replaced by when the method replaces, the value the engine gave it, the engine's running sum). */
function Ledger({ model }) {
  // The engine gives a running subtotal for every letter and no total per word, so none is calculated here: the tiles end at the engine's own result.
  return <div className="sod29-ms" data-ms={model.kind === "SUBSTITUTION_LEDGER" ? "substitution-ledger" : "letter-ledger"}>
    {model.groups.map((group) => <Word key={group.id} group={group}>
      <ol className="sod29-ms-ledger">{group.rows.map((row) => {
        const squared = row.source?.transform === "square" && num(row.source.base_value) && Number(row.source.base_value) ** 2 === Number(row.value);
        return <li key={row.id} className="sod29-ms-ledger-tile">
          <span className="sod29-ms-letter"><HebrewGlyph2029 text={row.token} />{row.transformed && row.transformed !== row.token ? <em> ← <HebrewGlyph2029 text={row.transformed} /></em> : null}</span>
          {squared ? <small dir="ltr">{fmt(row.source.base_value)}²</small> : null}
          <b dir="ltr">{fmt(row.value)}</b>
          <small dir="ltr">Σ {fmt(row.subtotal)}</small></li>;
      })}</ol>
    </Word>)}
  </div>;
}

/** Whether this model has a structure view (so a caller can keep its own step list only as the secondary reading). */
export const drawsStructure = (model) => Boolean(model && model.state === "ready" && !model.components?.length && model.groups?.length
  && ["CUMULATIVE_PREFIX", "POSITION_WEIGHTED", "ADJACENT_DIFFERENCE", "LETTER_LEDGER", "SUBSTITUTION_LEDGER"].includes(model.kind));

/** The structure view for a verified, ready model; null for a kind (or a composite) it does not draw, so the caller keeps its own display. */
export default function MethodStructure2029({ model }) {
  if (!model || model.state !== "ready" || model.components?.length || !model.groups?.length) return null;
  if (model.kind === "CUMULATIVE_PREFIX") return <CumulativePrefix model={model} />;
  if (model.kind === "POSITION_WEIGHTED") return <PositionWeighted model={model} />;
  if (model.kind === "ADJACENT_DIFFERENCE") return <AdjacentDifference model={model} />;
  if (model.kind === "LETTER_LEDGER" || model.kind === "SUBSTITUTION_LEDGER") return <Ledger model={model} />;
  return null;
}
