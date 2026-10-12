import React from "react";
import { HEBREW_LETTER_NAMES_ENGINE_DEFAULT } from "../../lib/spatial/hebrewLetterAnatomy.js";

// Presentation of the canonical letter ledger (gematria_method_trace). It only lays out
// token / contribution / running subtotal the engine returned; it never derives a value.
export default function CalculatorLedgerCard2029({
  tag = "",
  expression = "",
  methodLabel = "",
  value = null,
  ledgerState = null,
  tone = "a",
  children = null,
}) {
  const steps = ledgerState?.ledger?.steps || [];
  const max = steps.reduce((top, step) => Math.max(top, step.value), 1);
  return (
    <article className={`sod29-calcpro-ledgercard is-${tone}`} aria-label={`פירוק ${methodLabel || ""}`}>
      <header>
        <div>
          {tag ? <span>{tag}</span> : null}
          <b>{methodLabel || "—"}</b>
          {expression ? <small>{expression}</small> : null}
        </div>
        <strong className="sod29-calcpro-ledger-value">{value ?? "—"}</strong>
      </header>
      {children}
      <div className="sod29-calcpro-ledger-table" role="table">
        <div className="sod29-calcpro-ledger-head" role="row">
          <span />
          <span>שם האות</span>
          <span>ערך</span>
          <span>תרומה</span>
          <span>סכום</span>
        </div>
        {ledgerState?.loading ? <div className="sod29-calcpro-ledger-state">טוען את הפירוק מהמנוע…</div> : null}
        {ledgerState?.error ? <div className="sod29-calcpro-ledger-state">הפירוק לא זמין כרגע לשיטה הזאת.</div> : null}
        {steps.map((step, index) => (
          <div className="sod29-calcpro-ledger-row" role="row" key={step.token + ":" + index}>
            <b>{step.token}</b>
            <span>{HEBREW_LETTER_NAMES_ENGINE_DEFAULT[step.token] || ""}</span>
            <span className="sod29-calcpro-ledger-bar" aria-hidden="true"><i style={{ width: Math.max(3, (step.value / max) * 100) + "%" }} /></span>
            <em>+{step.value}</em>
            <strong>{step.running ?? ""}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
