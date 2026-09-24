import React, { useMemo } from "react";
import { useGematriaOpeningOperation } from "../../lib/research/useGematriaOpeningOperation.js";
import "./calculatorOpening2029.css";

const STATUS_HE = Object.freeze({
  executed: "בוצע",
  context_required: "דורש הקשר",
  unavailable: "לא זמין",
  access_filtered: "דורש הרשאה",
  engine_error: "שגיאת מנוע",
  complete: "מלא",
  partial: "חלקי",
  error_partial: "חלקי · שגיאה",
});

const clean = (value) => value == null ? "" : String(value).trim();

function groupFragments(result, row) {
  const words = Array.isArray(result?.words) ? result.words : [];
  const values = Array.isArray(row?.fragmentValues) ? row.fragmentValues : [];
  return words.map((word, wordIndex) => ({
    word,
    fragments: values.filter((item) => Number(item?.wordIndex) === wordIndex),
  })).filter((group) => group.fragments.length);
}

export default function CalculatorOpening2029({ selection, open = false, onClose } = {}) {
  const expression = clean(selection?.expression);
  const methodKey = clean(selection?.methodKey);
  const state = useGematriaOpeningOperation(expression, { enabled: Boolean(open && expression && methodKey) });

  const methodRow = useMemo(() => (
    (state.result?.methodRows || []).find((row) => clean(row?.methodKey) === methodKey) || null
  ), [state.result, methodKey]);

  const groups = useMemo(() => groupFragments(state.result, methodRow), [state.result, methodRow]);

  if (!open) return null;

  return (
    <section
      className="sod29-calc-opening"
      data-experience-capability="calculator-gematria-opening"
      aria-label="פתיחת שיטה"
    >
      <header>
        <div>
          <span>OPENING · DERIVED_OPERATION</span>
          <strong>{selection?.methodLabel || methodKey} · {expression}</strong>
          <small>פירוק מצטבר מתוך אותו מנוע קנוני · לא שיטת גימטריה חדשה ולא ראיה עצמאית</small>
        </div>
        <button type="button" onClick={onClose} aria-label="סגור פתיחה">×</button>
      </header>

      {state.loading ? <div className="sod29-calc-opening-state">פותח את הביטוי דרך המנוע הקנוני…</div> : null}
      {state.error ? <div className="sod29-calc-opening-state is-error">הפתיחה לא זמינה כרגע.</div> : null}

      {!state.loading && !state.error && !methodRow ? (
        <div className="sod29-calc-opening-state">
          לשיטה הזאת אין כרגע תוצאת Opening זמינה. לא מוצג 0 מומצא.
        </div>
      ) : null}

      {methodRow ? (
        <>
          <div className="sod29-calc-opening-summary">
            <div>
              <span>השיטה הפעילה</span>
              <strong>{methodRow.label || selection?.methodLabel || methodKey}</strong>
            </div>
            <div>
              <span>סטטוס</span>
              <strong>{STATUS_HE[methodRow.totalStatus] || methodRow.totalStatus || "—"}</strong>
            </div>
            <div>
              <span>סה״כ נגזר</span>
              <strong>{methodRow.total == null ? "—" : methodRow.total}</strong>
            </div>
            <div>
              <span>כיסוי</span>
              <strong>{methodRow.coveredFragmentCount || 0}/{state.result?.verification?.fragmentCount || 0}</strong>
            </div>
          </div>

          <div className="sod29-calc-opening-words">
            {groups.map((group) => (
              <article key={group.word}>
                <header>
                  <span>מילה</span>
                  <strong>{group.word}</strong>
                </header>
                <div>
                  {group.fragments.map((fragment) => (
                    <div className="sod29-calc-opening-fragment" key={String(fragment.wordIndex) + ":" + String(fragment.prefixIndex) + ":" + fragment.text}>
                      <span>{fragment.text}</span>
                      <strong>{fragment.value == null ? "—" : fragment.value}</strong>
                      <small>{STATUS_HE[fragment.coverageStatus] || fragment.coverageStatus || "—"}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <footer>
            <span>DERIVED_OPERATION</span>
            <small>
              {state.result?.provenance?.note
                || "הסכום נגזר מערכי fragment קנוניים ואינו זהות של שיטה חדשה."}
            </small>
          </footer>
        </>
      ) : null}
    </section>
  );
}
