import React, { useMemo, useState } from "react";
import { projectEntryExamples } from "../../lib/research/heichalEntryExamples.js";
import "./heichalEntry.css";

const SKIP_KEY = "sod-heichal-examples";
const readSkipped = () => { try { return localStorage.getItem(SKIP_KEY) === "skipped"; } catch { return false; } };
const writeSkipped = (skipped) => { try { if (skipped) localStorage.setItem(SKIP_KEY, "skipped"); else localStorage.removeItem(SKIP_KEY); } catch { /* a per-viewer convenience only */ } };

// Two approved entry examples. The first is open and static on first sight (no animation, no engine run, no network).
// The second appears only after an explicit click. Exploring an example is an explicit action handed to the caller,
// which uses the existing exact-expression path (Research Context + canonical resolver); nothing is calculated here
// beyond the canonical per-letter function used to render the arithmetic.
export default function HeichalEntryExamples({ onExplore, busy = false, error = null }) {
  const examples = useMemo(() => projectEntryExamples(), []);
  const [skipped, setSkipped] = useState(readSkipped);
  const [secondShown, setSecondShown] = useState(false);
  if (!examples.length) return null;

  const first = examples.find((item) => item.activation === "static") || examples[0];
  const second = examples.find((item) => item.activation === "explicit") || null;
  const visible = [first, ...(secondShown && second ? [second] : [])];
  const skip = (next) => { setSkipped(next); writeSkipped(next); };

  if (skipped) {
    return (
      <section className="sod29-section heichal-entry-examples is-skipped" data-experience-capability="heichal-entry-examples" aria-label="דוגמאות">
        <button type="button" className="sod29-action" onClick={() => skip(false)}>הצג דוגמאות</button>
      </section>
    );
  }

  return (
    <section className="sod29-section heichal-entry-examples" data-experience-capability="heichal-entry-examples" aria-label="דוגמאות להתחלה">
      <div className="heichal-entry-head">
        <div className="sod29-kicker">{secondShown ? "שתי דוגמאות" : "דוגמה ראשונה"} · {first.method}</div>
        <button type="button" className="sod29-action heichal-entry-skip" onClick={() => skip(true)}>דלג על הדוגמאות</button>
      </div>

      <div className="heichal-entry-example-list" aria-live="polite">
        {visible.map((example) => (
          <article className="heichal-entry-example" key={example.key} data-example={example.key}>
            <header>
              <h2>{example.title} <span className="heichal-entry-total">= {example.total}</span></h2>
              <span className="sod29-chip">{example.factLabel}</span>
            </header>
            <div className="heichal-entry-rows">
              {example.rows.map((row) => (
                <div className="heichal-entry-row" key={row.expression}>
                  <div className="heichal-entry-sum" dir="auto">
                    <strong>{row.expression}</strong>
                    {row.words.length > 1 ? <span> = {row.words.map((word) => word.value).join(" + ")}</span> : null}
                    <span> = {row.total}</span>
                  </div>
                  <ul className="heichal-entry-letters" aria-label={"אות אחר אות: " + row.expression}>
                    {row.words.flatMap((word, wi) => word.letters.map((item, li) => (
                      <li key={wi + "-" + li}><span>{item.letter}</span><small>{item.value}</small></li>
                    )))}
                  </ul>
                </div>
              ))}
            </div>
            {example.interpretation ? (
              <figure className="heichal-entry-interpretation" data-kind="interpretation">
                <figcaption><span className="sod29-chip">פרשנות מיוחסת ל{example.interpretation.attributedTo}</span> <span className="sod29-muted">{example.interpretation.status}</span></figcaption>
                <blockquote dir="auto">{example.interpretation.text}</blockquote>
              </figure>
            ) : <p className="sod29-muted heichal-entry-note">זו עובדה חשבונית בלבד; משמעות אינה נקבעת כאן.</p>}
            <div className="sod29-actions">
              <button type="button" className="sod29-action primary" disabled={busy} onClick={() => onExplore?.(example.exploreExpression)}>
                {busy ? "פותח את המחקר…" : "חקור את ״" + example.exploreExpression + "״ בהיכל"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!secondShown && second ? (
        <div className="sod29-actions">
          <button type="button" className="sod29-action" onClick={() => setSecondShown(true)}>הדוגמה הבאה</button>
        </div>
      ) : null}
      {error ? <div className="sod29-state error" role="status">{error}</div> : null}
    </section>
  );
}
