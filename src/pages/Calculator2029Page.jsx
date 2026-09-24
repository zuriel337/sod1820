import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import MethodLens2029 from "../components/gematria2029/MethodLens2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import {
  buildCalculationSelection,
  calculationAvailabilityLabel,
  splitCalculatorMethods,
} from "../lib/research/calculator2029Model.js";
import { applySeo } from "../lib/seo.js";
import "./calculator2029.css";

const clean = (value) => value == null ? "" : String(value).trim();

function traceSteps(finding) {
  const raw = finding?.projection?.dimensions?.trace?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((step) => {
    if (typeof step === "string") return step;
    if (!step || typeof step !== "object") return "";
    return clean(step.label || step.description || step.expression || step.token || step.word || step.step);
  }).filter(Boolean);
}

function CalculatorBody() {
  const navigate = useNavigate();
  const research = useResearch();
  const [expression, setExpression] = useState("");
  const [profile, setProfile] = useState({ loading: false, rows: [], error: null, expression: "" });
  const [selectedKey, setSelectedKey] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [trace, setTrace] = useState({ loading: false, finding: null, error: null, key: null });

  useEffect(() => {
    const phrase = clean(expression);
    if (!phrase) {
      setProfile({ loading: false, rows: [], error: null, expression: "" });
      setSelectedKey(null);
      setTrace({ loading: false, finding: null, error: null, key: null });
      return undefined;
    }

    let alive = true;
    const timer = window.setTimeout(() => {
      setProfile((current) => ({ ...current, loading: true, error: null, expression: phrase }));
      fetchNumberMethodProfile(phrase)
        .then((rows) => {
          if (!alive) return;
          const list = Array.isArray(rows) ? rows : [];
          setProfile({ loading: false, rows: list, error: null, expression: phrase });
          setSelectedKey((current) => list.some((row) => row.methodKey === current) ? current : list[0]?.methodKey || null);
        })
        .catch((error) => {
          if (alive) setProfile({ loading: false, rows: [], error, expression: phrase });
        });
    }, 220);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [expression]);

  const methods = useMemo(() => splitCalculatorMethods(profile.rows), [profile.rows]);
  const selectedMethod = useMemo(() => (
    methods.all.find((row) => row.methodKey === selectedKey) || methods.all[0] || null
  ), [methods, selectedKey]);
  const selection = useMemo(() => (
    selectedMethod ? buildCalculationSelection(profile.expression || expression, selectedMethod) : null
  ), [profile.expression, expression, selectedMethod]);

  const chooseMethod = (method) => {
    setSelectedKey(method.methodKey);
    setTrace({ loading: false, finding: null, error: null, key: null });
    const next = buildCalculationSelection(profile.expression || expression, method);
    if (!next) return;
    research.updateResearchContext?.({
      subject: {
        id: String(next.resultValue ?? next.expression),
        type: next.resultValue != null ? "number" : "phrase",
        label: next.expression,
        href: next.resultValue != null
          ? numberExpressionFocusHref(next.resultValue, { expression: next.expression, method: next.methodKey })
          : "/2029/gematria",
      },
      selection: {
        entityId: next.resultValue != null ? String(next.resultValue) : next.expression,
        entityType: next.resultValue != null ? "number" : "phrase",
        expression: next.expression,
        method: next.methodKey,
        resultValue: next.resultValue,
        focusKind: "calculation",
      },
      lens: "gematria",
      dimensions: { calculationSelection: true, source: "calculator-2029" },
    });
  };

  const loadTrace = async () => {
    if (!selection || selection.resultValue == null) return;
    const key = selection.expression + "::" + selection.methodKey;
    if (trace.key === key && (trace.finding || trace.error)) {
      setTrace({ loading: false, finding: null, error: null, key: null });
      return;
    }
    setTrace({ loading: true, finding: null, error: null, key });
    try {
      const finding = await fetchGematriaMethodTrace(selection.methodKey, selection.expression);
      setTrace({ loading: false, finding, error: null, key });
    } catch (error) {
      setTrace({ loading: false, finding: null, error, key });
    }
  };

  const openNumber = () => {
    if (!selection || selection.resultValue == null) return;
    const href = numberExpressionFocusHref(selection.resultValue, {
      expression: selection.expression,
      method: selection.methodKey,
    });
    if (href) navigate(href);
  };

  const openHeichal = () => {
    if (!selection) return;
    research.updateResearchContext?.({
      subject: {
        id: String(selection.resultValue ?? selection.expression),
        type: selection.resultValue != null ? "number" : "phrase",
        label: selection.expression,
        href: selection.resultValue != null
          ? numberExpressionFocusHref(selection.resultValue, { expression: selection.expression, method: selection.methodKey })
          : "/2029/gematria",
      },
      selection: {
        entityId: String(selection.resultValue ?? selection.expression),
        entityType: selection.resultValue != null ? "number" : "phrase",
        expression: selection.expression,
        method: selection.methodKey,
        resultValue: selection.resultValue,
        focusKind: "calculation",
      },
      lens: "heichal",
      dimensions: { calculationSelection: true, focusOrigin: "calculator-2029" },
    });
    navigate("/heichal");
  };

  const steps = traceSteps(trace.finding);

  return (
    <Sod2029Shell
      wide
      surface="calculator"
      symbol="∑"
      eyebrow="ONE GEMATRIA ENGINE · INSTANT CALCULATION"
      title="מחשבון גימטריה 2029"
      description="מקלידים ורואים תוצאות מיד. כל השיטות מגיעות מהמנוע הקנוני; עומק נפתח רק אחרי בחירה."
    >
      <section className="sod29-calc2029" data-experience-surface="calculator-2029">
        <div className="sod29-calc2029-command">
          <label htmlFor="calculator-2029-input">מילה או ביטוי</label>
          <input
            id="calculator-2029-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            placeholder="הקלידו מילה או ביטוי…"
            dir="rtl"
            autoComplete="off"
            spellCheck="false"
          />
          <div className="sod29-calc2029-command-meta">
            <span>אין כפתור “חשב”</span>
            <span>אין AI בזמן הקלדה</span>
            <span>Registry + fn_method_profile</span>
          </div>
        </div>

        {!clean(expression) ? (
          <div className="sod29-calc2029-empty">
            <strong>כתוב ביטוי — השיטות יופיעו כאן.</strong>
            <span>הליבה נשארת מהירה. Trace, Number, Heichal ורזיאל נפתחים רק אחרי בחירת תוצאה.</span>
          </div>
        ) : null}

        {profile.loading ? <div className="sod29-calc2029-status">מחשב דרך המנוע הקנוני…</div> : null}
        {profile.error ? <div className="sod29-calc2029-status is-error">לא ניתן לקבל כרגע את פרופיל השיטות.</div> : null}

        {methods.all.length ? (
          <section className="sod29-calc2029-results" aria-label="תוצאות גימטריה">
            <header>
              <div>
                <span>CORE METHODS</span>
                <strong>{methods.core.length} מול העין · {methods.all.length} זמינות</strong>
              </div>
              {methods.rest.length ? (
                <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>
                  {showAll ? "צמצם" : "כל " + methods.all.length + " השיטות"}
                </button>
              ) : null}
            </header>

            <div className="sod29-calc2029-grid">
              {methods.core.map((method) => {
                const active = method.methodKey === selectedMethod?.methodKey;
                const unavailable = calculationAvailabilityLabel(method);
                return (
                  <button
                    type="button"
                    key={method.methodKey}
                    className={active ? "is-active" : ""}
                    onClick={() => chooseMethod(method)}
                    aria-pressed={active}
                  >
                    <span>{method.label}</span>
                    <strong>{method.computedValue ?? "—"}</strong>
                    {unavailable ? <small>{unavailable}</small> : null}
                  </button>
                );
              })}
            </div>

            {showAll ? (
              <div className="sod29-calc2029-all" aria-label="כל השיטות">
                {methods.rest.map((method) => {
                  const active = method.methodKey === selectedMethod?.methodKey;
                  const unavailable = calculationAvailabilityLabel(method);
                  return (
                    <button
                      type="button"
                      key={method.methodKey}
                      className={active ? "is-active" : ""}
                      onClick={() => chooseMethod(method)}
                      aria-pressed={active}
                    >
                      <span>{method.label}</span>
                      <strong>{method.computedValue ?? "—"}</strong>
                      {unavailable ? <small>{unavailable}</small> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {selection ? (
          <section className="sod29-calc2029-inspector" data-calculation-selection={selection.methodKey}>
            <header>
              <div>
                <span>CALCULATION SELECTION</span>
                <strong>{selection.expression} · {selection.methodLabel}</strong>
                <small>{selection.resultValue != null ? "= " + selection.resultValue : calculationAvailabilityLabel(selectedMethod)}</small>
              </div>
              <div className="sod29-calc2029-selection-value">{selection.resultValue ?? "—"}</div>
            </header>

            <div className="sod29-calc2029-actions">
              <button type="button" onClick={loadTrace} disabled={selection.resultValue == null}>
                {trace.finding ? "סגור Trace" : trace.loading ? "טוען Trace…" : "איך מחשבים?"}
              </button>
              <Link to={"/beit-midrash/" + encodeURIComponent(selection.methodKey)}>למד את השיטה</Link>
              <button type="button" onClick={openNumber} disabled={selection.resultValue == null}>פתח מספר</button>
              <button type="button" onClick={openHeichal}>פתח בהיכל</button>
              <button
                type="button"
                className="is-premium"
                disabled
                title="רזיאל לניתוח גימטריה הוא יכולת Premium. אין קריאת AI לפני entitlement server-side."
              >
                ✦ רזיאל · Premium
              </button>
            </div>

            {trace.error ? <div className="sod29-calc2029-trace is-error">Trace לא זמין כרגע לשילוב הזה.</div> : null}
            {trace.finding ? (
              <div className="sod29-calc2029-trace">
                <div>
                  <span>TRACE · {selection.methodLabel}</span>
                  <strong>{selection.expression} → {selection.resultValue}</strong>
                </div>
                {steps.length ? (
                  <div className="sod29-calc2029-trace-steps">
                    {steps.map((step, index) => <span key={step + ":" + index}>{step}</span>)}
                  </div>
                ) : <small>המנוע החזיר Trace מאומת ללא צעדים טקסטואליים להצגה.</small>}
              </div>
            ) : null}

            <MethodLens2029
              selection={selection}
              onOpenExpression={(item) => {
                if (!item?.phrase || selection.resultValue == null) return;
                const href = numberExpressionFocusHref(selection.resultValue, {
                  expression: item.phrase,
                  method: selection.methodKey,
                });
                if (href) navigate(href);
              }}
            />
          </section>
        ) : null}
      </section>
    </Sod2029Shell>
  );
}

export default function Calculator2029Page() {
  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה 2029 · SOD1820",
      description: "מחשבון גימטריה מהיר על המנוע הקנוני של SOD1820.",
      path: "/2029/gematria",
      robots: "noindex,nofollow",
    });
  }, []);

  return <CalculatorBody />;
}
