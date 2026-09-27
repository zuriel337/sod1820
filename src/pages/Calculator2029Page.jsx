import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import MethodLens2029 from "../components/gematria2029/MethodLens2029.jsx";
import CalculatorCompare2029 from "../components/gematria2029/CalculatorCompare2029.jsx";
import CalculatorOpening2029 from "../components/gematria2029/CalculatorOpening2029.jsx";
import { emit } from "../lib/events.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { buildCalculator2029FastPreview } from "../lib/research/calculator2029FastPreview.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import {
  buildCalculationSelection,
  calculationAvailabilityLabel,
  splitCalculatorMethods,
} from "../lib/research/calculator2029Model.js";
import {
  buildCalculatorShareUrl,
  makeCalculatorShareId,
  parseCalculatorShareState,
  pickVerifiedShareDiscovery,
} from "../lib/research/calculator2029Viral.js";
import { applySeo } from "../lib/seo.js";
import "./calculator2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const CALCULATOR_2029_AUTO_COMPUTE_DEBOUNCE_MS = 240;

function traceSteps(finding) {
  const raw = finding?.projection?.dimensions?.trace?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((step) => {
    if (typeof step === "string") return step;
    if (!step || typeof step !== "object") return "";
    return clean(step.label || step.description || step.expression || step.token || step.word || step.step);
  }).filter(Boolean);
}

function eventProps(selection, extra = {}) {
  return {
    expression: selection?.expression || null,
    method: selection?.methodKey || null,
    value: selection?.resultValue ?? null,
    ...extra,
  };
}

const CalculatorFastCore2029 = React.memo(function CalculatorFastCore2029({
  seedExpression = "",
  resetToken = 0,
  inputRef,
  profile,
  selectedKey,
  onTypingStart,
  onSettleExpression,
  onChooseMethod,
}) {
  const [draft, setDraft] = useState(seedExpression);
  const [showAll, setShowAll] = useState(false);
  const settleTimerRef = useRef(null);
  const typingBurstRef = useRef(false);

  useEffect(() => {
    setDraft(seedExpression || "");
    setShowAll(false);
    typingBurstRef.current = false;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
  }, [resetToken]);

  useEffect(() => () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
  }, []);

  const fastPreview = useMemo(
    () => buildCalculator2029FastPreview(draft),
    [draft]
  );
  const canonicalSettled = clean(profile.expression) === clean(draft)
    && Array.isArray(profile.rows)
    && profile.rows.length > 0
    && !profile.loading;
  const displayRows = canonicalSettled
    ? profile.rows
    : (fastPreview?.methods || []);
  const methods = useMemo(() => splitCalculatorMethods(displayRows), [displayRows]);

  const handleDraftChange = (value) => {
    const next = String(value ?? "");
    setDraft(next);

    if (!typingBurstRef.current) {
      typingBurstRef.current = true;
      onTypingStart?.();
    }

    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    const phrase = clean(next);
    if (!phrase) {
      typingBurstRef.current = false;
      onSettleExpression?.("");
      return;
    }

    settleTimerRef.current = window.setTimeout(() => {
      typingBurstRef.current = false;
      onSettleExpression?.(phrase);
    }, CALCULATOR_2029_AUTO_COMPUTE_DEBOUNCE_MS);
  };

  return (
    <>
      <CalculatorFastCore2029
        seedExpression={expression}
        resetToken={fastResetToken}
        inputRef={inputRef}
        profile={profile}
        selectedKey={selectedKey}
        onTypingStart={beginFastTyping}
        onSettleExpression={settleFastExpression}
        onChooseMethod={chooseMethod}
      />

      {selection ? (
        <section className="sod29-calc2029-inspector" data-calculation-selection={selection.methodKey}>
          <header>
            <div>
              <span>הגילוי שלך</span>
              <strong>{selection.expression} · {selection.methodLabel}</strong>
              <small>{selection.resultValue != null ? "= " + selection.resultValue : calculationAvailabilityLabel(selectedMethod)}</small>
            </div>
            <div className="sod29-calc2029-selection-value">{selection.resultValue ?? "—"}</div>
          </header>

          <div className="sod29-calc2029-actions">
            <button type="button" onClick={loadTrace} disabled={selection.resultValue == null}>
              {trace.finding ? "סגור חישוב" : trace.loading ? "טוען…" : "איך מחשבים?"}
            </button>
            <Link to={"/beit-midrash/" + encodeURIComponent(selection.methodKey)}>למד את השיטה</Link>
            <button type="button" onClick={openNumber} disabled={selection.resultValue == null}>פתח מספר</button>
            <button type="button" onClick={openHeichal}>חקור בהיכל</button>
            <button type="button" onClick={() => setShowCompare((value) => !value)} aria-expanded={showCompare}>
              {showCompare ? "סגור השוואה" : "השווה"}
            </button>
            <button type="button" onClick={() => setShowOpening((value) => !value)} aria-expanded={showOpening}>
              {showOpening ? "סגור פתיחה" : "ראה פתיחה"}
            </button>
            <button type="button" className="is-raziel" onClick={openRaziel} disabled={selection.resultValue == null}>
              ✦ רזיאל · תסביר לי
            </button>
          </div>

          {trace.error ? <div className="sod29-calc2029-trace is-error">הסבר החישוב לא זמין כרגע לשילוב הזה.</div> : null}
          {trace.finding ? (
            <div className="sod29-calc2029-trace">
              <div>
                <span>חישוב קנוני · {selection.methodLabel}</span>
                <strong>{selection.expression} → {selection.resultValue}</strong>
              </div>
              {steps.length ? (
                <div className="sod29-calc2029-trace-steps">
                  {steps.map((step, index) => <span key={step + ":" + index}>{step}</span>)}
                </div>
              ) : <small>המנוע החזיר Trace מאומת ללא צעדים טקסטואליים להצגה.</small>}
            </div>
          ) : null}

          {showCompare ? <CalculatorCompare2029 selectionA={selection} onClose={() => setShowCompare(false)} /> : null}

          <CalculatorOpening2029
            selection={selection}
            open={showOpening}
            onClose={() => setShowOpening(false)}
          />

          <MethodLens2029
            selection={selection}
            autoOpen={sharedState.isShared}
            onOpened={() => emit("calculator_2029", "method_opened", { props: eventProps(selection) })}
            onProjection={handleLensProjection}
            onOpenExpression={(item) => {
              if (!item?.phrase || selection.resultValue == null) return;
              const href = numberExpressionFocusHref(selection.resultValue, {
                expression: item.phrase,
                method: selection.methodKey,
              });
              if (href) navigate(href);
            }}
          />

          {shareUrl ? (
            <section className="sod29-calc2029-share" aria-label="שיתוף התוצאה" data-share-url={shareUrl}>
              <div>
                <span>שתף את הגילוי</span>
                <strong>{selection.expression} = {selection.resultValue}</strong>
                <small>{selection.methodLabel}{shareDiscovery ? " · " + shareDiscovery.phrase + " = " + shareDiscovery.value : ""}</small>
              </div>
              <ShareActions
                type="gematria_result"
                url={shareUrl}
                title={`${selection.expression} = ${selection.resultValue} · ${selection.methodLabel} · מה מסתתר בשם שלך?`}
                channels={["native", "whatsapp", "telegram", "copy"]}
                force
                onShare={(channel) => emit("calculator_2029", "share_created", {
                  props: eventProps(selection, { share_id: shareId, channel, has_discovery: Boolean(shareDiscovery) }),
                })}
              />
            </section>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function CalculatorBody() {
  return (
    <Sod2029Shell
      wide
      surface="number"
      symbol="∑"
      eyebrow="ONE GEMATRIA ENGINE · ONE DISCOVERY PATH"
      title="מה מסתתר בשם שלך?"
      description="חשב דרך המנוע הקנוני, בחר תוצאה, גלה קשרים אמיתיים, שאל את רזיאל ושתף קישור חי."
    >
      <CalculatorExperience />
    </Sod2029Shell>
  );
}

export default function Calculator2029Page() {
  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה 2029 · SOD1820",
      description: "חשבו שם, מילה או ביטוי דרך מנוע הגימטריה הקנוני של SOD1820 ופתחו מסע גילוי.",
      path: "/2029/gematria",
      noindex: true,
    });
  }, []);

  return <CalculatorBody />;
}
