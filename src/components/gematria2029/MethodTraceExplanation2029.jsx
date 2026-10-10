import React, { useState } from "react";
import { methodMechanicalDefinition } from "../../lib/research/beitMidrashMethodDefinition.js";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";
import { projectGematriaTrace } from "../../lib/research/gematriaTracePresentation.js";
import HebrewGlyph2029 from "./HebrewGlyph2029.jsx";

export function TraceBreakdown2029({ model }) {
  if (model.state !== "ready") return null;
  if (model.components.length) return <div className="sod29-method-components">
    <p className="sod29-method-equation" dir="ltr">{model.components.map((c) => c.value).join(model.operator === "diff" ? " − " : " + ")} = {model.result}</p>
    {model.components.map((component) => <details key={component.id}>
      <summary>{component.label} <b>{component.value}</b></summary>
      <TraceBreakdown2029 model={component.detail} />
    </details>)}
  </div>;
  return <div className="sod29-method-trace-groups">
    {model.groups.map((group) => <section key={group.id}>
      <h4>{group.label}{group.subtotal != null ? ` · סכום המילה: ${group.subtotal}` : ""}</h4>
      <ol>{group.rows.map((row) => <li key={row.id}>{row.text}</li>)}</ol>
    </section>)}
  </div>;
}

export function TraceFamilyStage2029({ model, depth = "S2" }) {
  const [selected, setSelected] = useState(0);
  const rows = model.groups.flatMap((group) => group.rows.map((row) => ({ ...row, word: group.label })));
  const focus = rows[Math.min(selected, rows.length - 1)];
  return <section className="sod29-spatial-method-stage is-trace-family" dir="rtl" data-experience-capability="spatial-method-stage"
    data-method-key={model.methodKey} data-depth={depth} data-method-visual={model.kind} data-state="ready">
    <div className="sod29-spatial-method-stage__head">
      <div><span>{model.methodLabel}</span><strong>{model.expression}</strong><small>{model.instruction}</small></div>
      <div className="sod29-spatial-method-stage__result"><small>תוצאה</small><b>{model.result}</b></div>
    </div>
    {model.components.length ? <TraceBreakdown2029 model={model} /> : <>
      <div className="sod29-method-step-list" aria-label="בחירת צעד בחישוב">
        {rows.map((row, index) => <button key={row.id} type="button" aria-pressed={selected === index}
          onClick={() => setSelected(index)} className={selected === index ? "is-focus" : ""}>
          <span>{row.prefix || <HebrewGlyph2029 text={row.token} />}</span>
          {row.transformed && row.transformed !== row.token ? <span>← <HebrewGlyph2029 text={row.transformed} /></span> : null}
          <b>{row.value}</b>
          <small>{row.subtotal != null ? `סכום ${row.subtotal}` : row.position != null ? `מיקום ${row.position}` : row.word}</small>
        </button>)}
      </div>
      {focus ? <div className="sod29-method-step-focus" aria-live="polite">
        <p>{focus.text}</p>
        <div><button type="button" disabled={selected === 0} onClick={() => setSelected((i) => i - 1)}>הצעד הקודם</button>
          <span>{selected + 1} / {rows.length}</span>
          <button type="button" disabled={selected >= rows.length - 1} onClick={() => setSelected((i) => i + 1)}>הצעד הבא</button></div>
      </div> : null}
    </>}
  </section>;
}

export default function MethodTraceExplanation2029({ method, methods = [], expression, trace, loading = false }) {
  const labels = new Map(methods.map((item) => [item.methodKey, canonicalMethodPublicLabel({ method_key: item.methodKey, display_label: item.displayLabel })]));
  const definition = methodMechanicalDefinition({}, method, labels);
  const contextual = method.executionKind === "context_activated";
  const model = projectGematriaTrace(trace, { expression, methodKey: method.methodKey, expectedValue: method.computedValue });
  return <div className="sod29-method-explanation">
    <section><h3>מה השיטה עושה</h3><p>{definition.what}</p></section>
    {contextual ? <p role="status">כדי להשתמש בשיטה צריך לבחור במקור אות שסומנה כרבתי. בחירת ביטוי בלבד אינה מספיקה.</p> : <section>
      <h3>נסו עם הביטוי שבחרתם</h3>
      <ol className="sod29-method-lesson">
        <li>הביטוי נשאר <strong>{expression}</strong>. בחירת שיטה משנה את דרך החישוב.</li>
        <li>{model.instruction || "פתחו את פירוט החישוב כדי לראות את תרומת האותיות לפי כללי השיטה."}</li>
        <li>{model.state === "ready" ? <>התוצאה בביטוי הזה: <strong>{model.result}</strong>. אפשר לחזור ללשונית חישוב ולבחור צעד בהמחשה.</> : loading ? "צעדי החישוב נטענים…" : "פירוט מאומת אינו זמין כרגע. אפשר לבחור שוב את השיטה ולנסות מחדש."}</li>
      </ol>
      <TraceBreakdown2029 model={model} />
    </section>}
    {definition.structure ? <section><h3>מבנה השיטה</h3><p>{definition.structure}</p></section> : null}
    {definition.dependencies.length ? <section><h3>קשר לשיטות אחרות</h3><ul>{definition.dependencies.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
    {trace?.semantics?.final_letter_sensitive ? <p>הצורה הסופית של האות משפיעה על החישוב בשיטה הזאת.</p> : null}
    {definition.interpretation ? <section><h3>פרשנות השיטה</h3><p>{definition.interpretation}</p><small>זהו הסבר פרשני, נפרד מהחישוב המספרי.</small></section> : null}
    <details className="sod29-method-provenance"><summary>פרטי הגדרת השיטה</summary><p>שיטה: {method.methodKey} · גרסה: {method.definitionVersion ?? "לא נמסרה"}</p>
      <p>{definition.familyLabel}</p></details>
  </div>;
}
