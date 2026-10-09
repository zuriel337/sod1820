import React from "react";
import { researchPathHref } from "../../lib/research/researchPathRuntime.js";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";

// Local reading projection of the shared Path. Workspace owns save/resume UI.
export default function NumberPathContinuation2029({ active, selectionLabel, steps = [], onContinue, onOpenStep, onWorkspace, onSourceReturn, error }) {
  return <section className="sod29-section" aria-label="המסע שלי" data-number-path-continuation>
    <h2>{active ? "להמשיך מהבחירה הזו" : "לאן הבחירה הזו מובילה?"}</h2>
    <p>{selectionLabel}</p>
    <p>{active ? "בחרו ביטוי, שיטה או חיבור נוסף, והוסיפו אותו לאותו מסע." : "אפשר להתחיל כאן מסע, לחזור למקור ולהמשיך לגלות."}</p>
    <div className="sod29-actions">
      <button type="button" className="sod29-action primary" onClick={onContinue}>{active ? "הוסף את הבחירה למסע" : "התחל מסע מהבחירה"}</button>
      <button type="button" className="sod29-action" onClick={onWorkspace}>שמירה וחידוש</button>
      {onSourceReturn ? <button type="button" className="sod29-action" onClick={onSourceReturn}>חזרה למקור שנבחר בטופיק</button> : null}
    </div>
    {error ? <p role="status">{error}</p> : null}
    {steps.length ? <details>
      <summary>הצעדים שבחרתי · {steps.length}</summary>
      <ol>{steps.map((step, index) => <li key={index}>
        <button type="button" className="sod29-action" onClick={() => onOpenStep(index)} disabled={!researchPathHref(step.href)}>
          {step.selection?.expression || step.label_key || step.entity_ref}
          {step.selection?.method ? ` · ${canonicalMethodPublicLabel({ method_key: step.selection.method })}` : ""}
          {step.selection?.crossingPartner ? ` · ${step.selection.crossingPartner}` : ""}
          {!researchPathHref(step.href) ? " · המקור אינו זמין לפתיחה" : ""}
        </button>
      </li>)}</ol>
    </details> : null}
    <small>השמירה בחשבון היא פרטית. הקריאה והבחירה זמינות גם בלי רזיאל.</small>
  </section>;
}
