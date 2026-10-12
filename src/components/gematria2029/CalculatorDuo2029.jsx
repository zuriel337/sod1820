import React, { useEffect, useMemo, useState } from "react";
import { getRelationCandidate } from "../../lib/supabase.js";
import { useCalculatorRow, useMethodLedger } from "../../lib/research/useCalculatorRow.js";
import { buildCalculationSelection } from "../../lib/research/calculator2029Model.js";
import { isReportableValue } from "../../lib/research/calculator2029Input.js";
import CalculatorLedgerCard2029 from "./CalculatorLedgerCard2029.jsx";

const clean = (value) => value == null ? "" : String(value).trim();
const squash = (value) => clean(value).replace(/\s+/g, "");
const fmt = (value) => Number(value).toLocaleString("en-US");

// Advanced two-row mode: each row has its own expression and method, both resolved by the
// canonical engine. Equality, crossing and the derived sum are operations over two engine
// results; nothing here is a new Gematria method or independent evidence.
export default function CalculatorDuo2029({ expressionA = "", selectionA = null, ledgerA = null, compositeRows = [] }) {
  const rowB = useCalculatorRow(expressionA);
  const [touchedB, setTouchedB] = useState(false);
  const [methodBKey, setMethodBKey] = useState(null);
  const [relation, setRelation] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!touchedB && expressionA !== rowB.draft) rowB.setDraft(expressionA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressionA, touchedB]);

  const methodsB = useMemo(
    () => (rowB.canonicalSettled ? rowB.hebrewRows.filter((row) => isReportableValue(row.computedValue)) : []),
    [rowB.canonicalSettled, rowB.hebrewRows],
  );

  useEffect(() => {
    if (!methodsB.length) return;
    if (methodsB.some((row) => row.methodKey === methodBKey)) return;
    const preferred = methodsB.find((row) => row.methodKey === "מילוי" && row.methodKey !== selectionA?.methodKey)
      || methodsB.find((row) => row.methodKey !== selectionA?.methodKey)
      || methodsB[0];
    setMethodBKey(preferred.methodKey);
  }, [methodsB, methodBKey, selectionA?.methodKey]);

  const methodB = methodsB.find((row) => row.methodKey === methodBKey) || null;
  const selectionB = useMemo(
    () => (methodB ? buildCalculationSelection(rowB.profile.expression, methodB) : null),
    [methodB, rowB.profile.expression],
  );
  const ledgerB = useMethodLedger(selectionB);

  const aValue = selectionA?.resultValue;
  const bValue = selectionB?.resultValue;
  const bothComputed = isReportableValue(aValue) && isReportableValue(bValue);
  const equal = bothComputed && Number(aValue) === Number(bValue);
  const sameExpression = clean(selectionA?.expression) === clean(selectionB?.expression);
  const crossingEligible = equal && !sameExpression;
  const sum = bothComputed ? Number(aValue) + Number(bValue) : null;

  const composite = useMemo(() => {
    if (!bothComputed || !sameExpression) return null;
    const wanted = new Set([
      squash(selectionA.methodLabel + "+" + selectionB.methodLabel),
      squash(selectionB.methodLabel + "+" + selectionA.methodLabel),
    ]);
    return compositeRows.find((row) => wanted.has(squash(row.label)) && Number(row.computedValue) === sum) || null;
  }, [bothComputed, sameExpression, selectionA, selectionB, compositeRows, sum]);

  useEffect(() => {
    setRelation({ loading: false, data: null, error: null });
  }, [selectionA?.expression, selectionA?.methodKey, selectionB?.expression, selectionB?.methodKey]);

  const checkCrossing = async () => {
    if (!crossingEligible) return;
    setRelation({ loading: true, data: null, error: null });
    try {
      const data = await getRelationCandidate(selectionA.expression, selectionB.expression);
      setRelation({ loading: false, data, error: null });
    } catch (error) {
      setRelation({ loading: false, data: null, error });
    }
  };

  const parts = relation.data?.engine_signal_components || {};
  const effective = Number.isFinite(Number(parts.effective_independent_group_count)) ? Number(parts.effective_independent_group_count) : null;
  const raw = Number.isFinite(Number(parts.raw_independent_group_count)) ? Number(parts.raw_independent_group_count) : null;

  if (!selectionA) return null;

  return (
    <section className="sod29-calcpro-duo" data-experience-capability="calculator-duo-2029" data-ai-used="false">
      <div className="sod29-calcpro-duo-cards">
        <CalculatorLedgerCard2029
          tag="שורה 1"
          tone="a"
          expression={selectionA.expression}
          methodLabel={selectionA.methodLabel}
          value={aValue}
          ledgerState={ledgerA}
        />
        <CalculatorLedgerCard2029
          tag="שורה 2"
          tone="b"
          expression={selectionB?.expression || ""}
          methodLabel={selectionB?.methodLabel || ""}
          value={bValue}
          ledgerState={ledgerB}
        >
          <div className="sod29-calcpro-duo-inputs">
            <input
              value={rowB.draft}
              onChange={(event) => { setTouchedB(true); rowB.setDraft(event.target.value); }}
              placeholder="ביטוי שני…"
              dir="auto"
              aria-label="ביטוי לשורה 2"
            />
            <select value={methodBKey || ""} onChange={(event) => setMethodBKey(event.target.value)} aria-label="שיטה לשורה 2" disabled={!methodsB.length}>
              {methodsB.map((method) => (
                <option key={method.methodKey} value={method.methodKey}>{method.label} · {fmt(method.computedValue)}</option>
              ))}
            </select>
          </div>
        </CalculatorLedgerCard2029>
      </div>

      {bothComputed ? (
        <div className={`sod29-calcpro-compare${equal ? " is-equal" : ""}`}>
          <div className="sod29-calcpro-compare-eq">
            <span>{fmt(aValue)}</span>
            <b>{equal ? "=" : "≠"}</b>
            <span>{fmt(bValue)}</span>
          </div>
          <small>
            {crossingEligible
              ? "ערך זהה בשני ביטויים שונים. בדיקת הצלבה רצה רק בלחיצה."
              : equal ? "אותו ביטוי אינו נספר כהצלבה עם עצמו."
                : sameExpression ? "שתי שיטות על אותו ביטוי." : "שני חישובים שונים."}
          </small>
          {crossingEligible ? (
            <button type="button" onClick={checkCrossing} disabled={relation.loading}>
              {relation.loading ? "מנרמל תלות…" : "בדוק הצלבה במנוע"}
            </button>
          ) : null}
        </div>
      ) : null}

      {relation.error ? <p className="sod29-calcpro-relation">מנוע היחסים לא זמין כרגע.</p> : null}
      {relation.data ? (
        <p className="sod29-calcpro-relation">
          {effective ?? 0} משפחות עצמאיות{raw != null ? ` מתוך ${raw} גולמיות` : ""}. ראיות תלויות לא נספרות פעמיים.
        </p>
      ) : null}

      {bothComputed ? (
        <div className="sod29-calcpro-derived">
          <div>
            <small>פעולה נגזרת · לא שיטה חדשה ולא ראיה עצמאית</small>
            <strong><span>{fmt(aValue)}</span> + <span>{fmt(bValue)}</span> = {fmt(sum)}</strong>
          </div>
          {composite ? <div className="sod29-calcpro-derived-match">זהה לשיטה המורכבת <b>{composite.label} = {fmt(composite.computedValue)}</b> מהמנוע</div> : null}
        </div>
      ) : null}
    </section>
  );
}
