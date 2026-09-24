import React, { useEffect, useMemo, useState } from "react";
import { fetchNumberMethodProfile } from "../../lib/research/numberCoreProjection.js";
import { getRelationCandidate } from "../../lib/supabase.js";
import {
  buildCalculationSelection,
  calculationAvailabilityLabel,
  normalizeCalculatorMethods,
} from "../../lib/research/calculator2029Model.js";

const clean = (value) => value == null ? "" : String(value).trim();

function relationSummary(relation) {
  const parts = relation?.engine_signal_components || {};
  const raw = Number.isFinite(Number(parts.raw_independent_group_count)) ? Number(parts.raw_independent_group_count) : null;
  const effective = Number.isFinite(Number(parts.effective_independent_group_count)) ? Number(parts.effective_independent_group_count) : null;
  return {
    raw,
    effective,
    collapsed: raw != null && effective != null && effective < raw,
    confidence: clean(relation?.confidence) || null,
    priority: clean(relation?.research_priority) || null,
  };
}

export default function CalculatorCompare2029({ selectionA, onClose = null } = {}) {
  const [expressionB, setExpressionB] = useState("");
  const [profileB, setProfileB] = useState({ loading: false, rows: [], error: null, expression: "" });
  const [methodBKey, setMethodBKey] = useState(null);
  const [relationState, setRelationState] = useState({ loading: false, data: null, error: null });
  const [showDerivedSum, setShowDerivedSum] = useState(false);

  useEffect(() => {
    const phrase = clean(expressionB);
    setRelationState({ loading: false, data: null, error: null });
    setShowDerivedSum(false);
    if (!phrase) {
      setProfileB({ loading: false, rows: [], error: null, expression: "" });
      setMethodBKey(null);
      return undefined;
    }

    let alive = true;
    const timer = window.setTimeout(() => {
      setProfileB((current) => ({ ...current, loading: true, error: null, expression: phrase }));
      fetchNumberMethodProfile(phrase)
        .then((rows) => {
          if (!alive) return;
          const normalized = normalizeCalculatorMethods(rows);
          setProfileB({ loading: false, rows: normalized, error: null, expression: phrase });
          setMethodBKey((current) => normalized.some((row) => row.methodKey === current) ? current : normalized[0]?.methodKey || null);
        })
        .catch((error) => {
          if (alive) setProfileB({ loading: false, rows: [], error, expression: phrase });
        });
    }, 220);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [expressionB]);

  const methodsB = useMemo(() => normalizeCalculatorMethods(profileB.rows), [profileB.rows]);
  const methodB = useMemo(
    () => methodsB.find((row) => row.methodKey === methodBKey) || methodsB[0] || null,
    [methodsB, methodBKey],
  );
  const selectionB = useMemo(
    () => methodB ? buildCalculationSelection(profileB.expression || expressionB, methodB) : null,
    [profileB.expression, expressionB, methodB],
  );

  const aValue = selectionA?.resultValue;
  const bValue = selectionB?.resultValue;
  const bothComputed = aValue != null && bValue != null && Number.isFinite(Number(aValue)) && Number.isFinite(Number(bValue));
  const equal = bothComputed && Number(aValue) === Number(bValue);
  const derivedSum = bothComputed ? Number(aValue) + Number(bValue) : null;
  const relation = relationState.data;
  const normalized = relationSummary(relation);

  const checkCrossing = async () => {
    if (!equal || !selectionA?.expression || !selectionB?.expression) return;
    setRelationState({ loading: true, data: null, error: null });
    try {
      const data = await getRelationCandidate(selectionA.expression, selectionB.expression);
      setRelationState({ loading: false, data, error: null });
    } catch (error) {
      setRelationState({ loading: false, data: null, error });
    }
  };

  if (!selectionA) return null;

  return (
    <section className="sod29-calc-compare" data-experience-capability="calculator-compare-2029" data-ai-used="false">
      <header>
        <div>
          <span>COMPARE · CANONICAL VALUES</span>
          <strong>השוואה / הצלבה</strong>
          <small>שני חישובים קנוניים. בדיקת הקשר מופעלת רק בלחיצה מפורשת.</small>
        </div>
        {onClose ? <button type="button" onClick={onClose} aria-label="סגור השוואה">×</button> : null}
      </header>

      <div className="sod29-calc-compare-grid">
        <article className="is-a">
          <span>A · הבחירה הפעילה</span>
          <strong>{selectionA.expression}</strong>
          <small>{selectionA.methodLabel} = {selectionA.resultValue ?? "—"}</small>
        </article>

        <article className="is-b">
          <label htmlFor="calculator-compare-b">B · ביטוי להשוואה</label>
          <input
            id="calculator-compare-b"
            value={expressionB}
            onChange={(event) => setExpressionB(event.target.value)}
            placeholder="הקלד ביטוי שני…"
            dir="rtl"
          />
          {profileB.loading ? <small>מחשב דרך fn_method_profile…</small> : null}
          {profileB.error ? <small className="is-error">לא ניתן לחשב כרגע.</small> : null}
          {methodsB.length ? (
            <select value={methodB?.methodKey || ""} onChange={(event) => setMethodBKey(event.target.value)} aria-label="בחר שיטה לביטוי B">
              {methodsB.map((method) => (
                <option key={method.methodKey} value={method.methodKey}>
                  {method.label} · {(method.computedValue ?? calculationAvailabilityLabel(method)) || "—"}
                </option>
              ))}
            </select>
          ) : null}
          {selectionB ? <strong className="sod29-calc-compare-b-result">{selectionB.methodLabel} = {selectionB.resultValue ?? "—"}</strong> : null}
        </article>
      </div>

      {bothComputed ? (
        <div className={"sod29-calc-compare-outcome" + (equal ? " is-crossing" : "")}>
          {equal ? (
            <>
              <span>CROSSING</span>
              <strong>{selectionA.expression} = {selectionB.expression} = {aValue}</strong>
              <small>{selectionA.methodLabel} ↔ {selectionB.methodLabel}</small>
              <button type="button" onClick={checkCrossing} disabled={relationState.loading}>
                {relationState.loading ? "מנרמל תלות…" : "בדוק הצלבה במנוע"}
              </button>
            </>
          ) : (
            <>
              <span>COMPARE</span>
              <strong>{aValue} ≠ {bValue}</strong>
              <small>אלה שני חישובים שונים. אין כאן שוויון.</small>
            </>
          )}
        </div>
      ) : null}

      {relationState.error ? <div className="sod29-calc-compare-relation is-error">מנוע היחסים לא זמין כרגע.</div> : null}
      {relation ? (
        <div className="sod29-calc-compare-relation">
          <span>DEPENDENCY-NORMALIZED RELATION</span>
          <strong>{normalized.effective ?? 0} משפחות עצמאיות{normalized.raw != null ? " מתוך " + normalized.raw + " raw" : ""}</strong>
          {normalized.collapsed ? <small>המנוע איחד ראיות תלויות; הן לא נספרות פעמיים.</small> : <small>לא זוהתה קריסת משפחות נוספת בקשר הזה.</small>}
          {normalized.confidence ? <em>{normalized.confidence}</em> : null}
          {normalized.priority ? <em>{normalized.priority}</em> : null}
        </div>
      ) : null}

      {bothComputed ? (
        <div className="sod29-calc-derived">
          <button type="button" onClick={() => setShowDerivedSum((value) => !value)} aria-expanded={showDerivedSum}>
            {showDerivedSum ? "הסתר חיבור" : "חבר כתוצאה נגזרת"}
          </button>
          {showDerivedSum ? (
            <div>
              <span>DERIVED_OPERATION · SUM</span>
              <strong>{aValue} + {bValue} = {derivedSum}</strong>
              <small>סכום של שתי תוצאות קנוניות; לא שיטת גימטריה חדשה ולא ראיה עצמאית.</small>
            </div>
          ) : null}
        </div>
      ) : null}

      <footer>Compare ≠ Crossing ≠ Derived Operation · ללא AI וללא נוסחאות גימטריה מקומיות.</footer>
    </section>
  );
}
