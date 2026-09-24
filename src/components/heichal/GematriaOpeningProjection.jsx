import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useGematriaOpeningOperation from "../../lib/research/useGematriaOpeningOperation.js";
import { OPENING_TOTAL_STATUS } from "../../lib/research/gematriaOpeningOperation.js";
import { beitMidrashMethodHref, buildOpeningWordGroups, openingTotalStatusLabel } from "./gematriaOpeningPresentation.js";
import "./gematriaOpeningProjection.css";

// HEICHAL_GEMATRIA_OPENING_UI_WIRING_V1 -- 2029 Heichal projection of the per-word prefix opening
// operation. This component computes nothing: it only shapes/labels whatever
// useGematriaOpeningOperation (-> gematriaOpeningOperation.js -> fn_method_profile) returns. It
// never writes back into Research Context -- the opening total is a DERIVED_OPERATION, never
// independent evidence, so it must not overwrite the calculator-owned selection.method/resultValue.
export default function GematriaOpeningProjection({ expression, initialMethodKey = null }) {
  const { loading, result, error } = useGematriaOpeningOperation(expression);
  const methodRows = result?.methodRows || [];
  const [selectedKey, setSelectedKey] = useState(initialMethodKey || null);

  useEffect(() => {
    setSelectedKey(initialMethodKey || null);
  }, [expression, initialMethodKey]);

  const selectedRow = useMemo(() => (
    methodRows.find((row) => row.methodKey === selectedKey) || methodRows[0] || null
  ), [methodRows, selectedKey]);

  const wordGroups = useMemo(() => buildOpeningWordGroups(result, selectedRow), [result, selectedRow]);

  if (!expression) return null;

  return (
    <section className="sod29-section sod29-opening-projection" data-experience-capability="heichal-gematria-opening">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">GEMATRIA OPENING · DERIVED OPERATION</div>
          <h2>פתיחת "{expression}" לפי קידומות מילה</h2>
          <div className="sod29-muted">כל מילה נפתחת לקידומות של אותיותיה שלה; הערך לכל קידומת מגיע מהמנוע הקנוני, וסך השיטה הוא סכום הקידומות -- לא זהות שיטה עצמאית חדשה.</div>
        </div>
        {loading ? <span className="sod29-chip">טוען פתיחה…</span> : null}
      </div>

      {error ? <div className="sod29-state error">הפתיחה נכשלה: {String(error?.message || error)}</div> : null}

      {!loading && !error && !methodRows.length ? (
        <div className="sod29-state">אין עדיין שיטות זמינות לפתיחה של הביטוי הזה.</div>
      ) : null}

      {methodRows.length ? <>
        <div className="sod29-opening-method-row" role="tablist" aria-label="בחר שיטה לפתיחה">
          {methodRows.map((row) => (
            <button
              type="button"
              role="tab"
              key={row.methodKey}
              aria-selected={row.methodKey === selectedRow?.methodKey}
              className={`sod29-chip sod29-opening-method-chip${row.methodKey === selectedRow?.methodKey ? " is-active" : ""}`}
              onClick={() => setSelectedKey(row.methodKey)}
            >
              <span>{row.label}</span>
              <b>{row.total != null ? row.total : openingTotalStatusLabel(row.totalStatus)}</b>
            </button>
          ))}
        </div>

        {selectedRow ? <>
          <div className="sod29-opening-word-groups">
            {wordGroups.map((group) => (
              <div className="sod29-opening-word-group" key={group.wordIndex}>
                <div className="sod29-opening-word-label">{group.word}</div>
                <div className="sod29-opening-fragment-row">
                  {group.fragments.map((fragment) => (
                    <span
                      key={`${group.wordIndex}:${fragment.prefixIndex}`}
                      className={`sod29-opening-fragment${fragment.coverageStatus ? ` is-${fragment.coverageStatus}` : ""}`}
                      title={fragment.text}
                    >
                      <small>{fragment.text}</small>
                      <b>{fragment.display}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sod29-divider" />

          <div className="sod29-opening-total-row">
            <div>
              <span className="sod29-muted">{'סה"כ · '}{selectedRow.label}</span>
              <strong>{selectedRow.total != null ? selectedRow.total : "—"}</strong>
              {selectedRow.totalStatus !== OPENING_TOTAL_STATUS.COMPLETE ? (
                <small className="sod29-opening-total-status">{openingTotalStatusLabel(selectedRow.totalStatus)}</small>
              ) : null}
            </div>
            {beitMidrashMethodHref(selectedRow.methodKey) ? (
              <Link className="sod29-action" to={beitMidrashMethodHref(selectedRow.methodKey)}>למד את השיטה ↗</Link>
            ) : null}
          </div>
        </> : null}
      </> : null}
    </section>
  );
}
