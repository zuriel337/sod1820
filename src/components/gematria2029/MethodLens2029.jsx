import React, { useEffect, useMemo, useState } from "react";
import { fetchMethodLens2029, methodLensDeterministicNote } from "../../lib/research/methodLens2029.js";
import "./methodLens2029.css";

export default function MethodLens2029({ selection, compact = false, onOpenExpression = null } = {}) {
  const [requestedKey, setRequestedKey] = useState("");
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const [showDependent, setShowDependent] = useState(false);
  const key = selection ? [selection.expression, selection.methodKey, selection.resultValue, selection.dbColumn].join("::") : "";

  useEffect(() => {
    setRequestedKey("");
    setState({ loading: false, data: null, error: null });
    setShowDependent(false);
  }, [key]);

  useEffect(() => {
    if (!selection || !requestedKey || requestedKey !== key) return undefined;
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchMethodLens2029(selection)
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (alive) setState({ loading: false, data: null, error }); });
    return () => { alive = false; };
  }, [selection, requestedKey, key]);

  const data = state.data;
  const items = Array.isArray(data?.items) ? data.items : [];
  const primary = useMemo(() => items.filter((item) => !item?.relation?.dependent), [items]);
  const dependent = useMemo(() => items.filter((item) => item?.relation?.dependent), [items]);

  if (!selection || selection.resultValue == null || !selection.dbColumn) return null;

  if (!requestedKey) {
    return <section className="sod29-method-lens is-idle" data-method-lens="idle">
      <div>
        <span>METHOD LENS</span>
        <strong>מה יש בתוך {selection.methodLabel || selection.methodKey} = {selection.resultValue}?</strong>
        <small>הביטויים עצמם · מאגר מאומת · נרמול מנוע · בלי AI</small>
      </div>
      <button type="button" onClick={() => setRequestedKey(key)}>פתח את השיטה</button>
    </section>;
  }

  return <section className={"sod29-method-lens" + (compact ? " is-compact" : "")} data-method-lens="evidence" aria-busy={state.loading}>
    <header>
      <div>
        <span>METHOD LENS · EVIDENCE FIRST</span>
        <strong>{selection.methodLabel || selection.methodKey} = {selection.resultValue}</strong>
        <small>{selection.expression} · המידע עצמו, לא סיכום AI</small>
      </div>
      {data?.counts ? <div className="sod29-method-lens-counts">
        <b>{data.counts.independentVisible ?? 0}<small>גלויים</small></b>
        <b>{data.counts.dependent ?? 0}<small>תלויים</small></b>
        <b>{data.counts.raw ?? 0}<small>raw</small></b>
      </div> : null}
    </header>

    {state.loading ? <div className="sod29-method-lens-state">פותח התאמות מאומתות ומנרמל יחסים…</div> : null}
    {state.error ? <div className="sod29-method-lens-state is-error">Method Lens לא זמין כרגע. החישוב עצמו נשאר תקין.</div> : null}
    {data && !items.length ? <div className="sod29-method-lens-state">אין כרגע ביטוי נוסף מאומת בשיטה ובערך האלה.</div> : null}

    {primary.length ? <div className="sod29-method-lens-list" role="list">
      {primary.map((item) => <article key={item.phrase} role="listitem">
        <button type="button" onClick={() => onOpenExpression?.(item)} disabled={!onOpenExpression}>
          <strong>{item.phrase}</strong>
          <span>{selection.methodLabel || selection.methodKey} = {item.value}</span>
        </button>
        <div className="sod29-method-lens-badges">
          <em>מאומת</em>
          {item.relation?.effectiveIndependentGroups > 1 ? <em>{item.relation.effectiveIndependentGroups} משפחות עצמאיות</em> : null}
          {item.world ? <em>{item.world}</em> : null}
        </div>
        <small>{methodLensDeterministicNote(item)}</small>
      </article>)}
    </div> : null}

    {dependent.length ? <>
      <button className="sod29-method-lens-dependent-toggle" type="button" onClick={() => setShowDependent((value) => !value)} aria-expanded={showDependent}>
        {showDependent ? "הסתר קשרים תלויים" : "הצג גם " + dependent.length + " קשרים תלויים"}
      </button>
      {showDependent ? <div className="sod29-method-lens-list is-dependent" role="list">
        {dependent.map((item) => <article key={item.phrase} role="listitem">
          <button type="button" onClick={() => onOpenExpression?.(item)} disabled={!onOpenExpression}>
            <strong>{item.phrase}</strong>
            <span>{selection.methodLabel || selection.methodKey} = {item.value}</span>
          </button>
          <div className="sod29-method-lens-badges"><em>תלוי</em><em>מאומת</em></div>
          <small>{methodLensDeterministicNote(item)}</small>
        </article>)}
      </div> : null}
    </> : null}

    {data ? <footer>מקור: {data.source} · נרמול משנה הצגה/משקל, לא מוחק ראיות.</footer> : null}
  </section>;
}
