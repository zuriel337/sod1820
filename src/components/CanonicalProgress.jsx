import React, { useEffect, useMemo, useRef, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import {
  canonicalProgressPercent,
  canonicalProgressTier,
} from "../lib/canonicalProgressModel.js";
import "./canonicalProgress.css";

export const DEFAULT_CANONICAL_PROGRESS_COPY = Object.freeze({
  systemWorking: "המערכת עובדת עכשיו",
  noRealPercent: "אין אחוז אמיתי לדווח — מציגים שלב חי במקום לנחש.",
  completedPercent: (value) => `${value}% הושלמו לפי נתוני הפעולה.`,
  stepsDone: (done, total) => `${done}/${total} שלבים הושלמו`,
  whatHappens: "מה קורה עכשיו",
  operationalStages: "שלבי פעולה מדווחים · לא חשיבה פנימית",
  runningSafe: "הפעולה עדיין רצה. יוצגו כאן רק שלבים שהמנוע או ה־workflow יודעים לדווח עליהם באמת.",
  meantime: "בינתיים",
  longWaitLead: "העבודה ממשיכה — לא צריך לבהות במסך ריק.",
  waitingContext: "אפשר להמשיך לעיין במה שכבר הושלם. תוכן שמופיע בזמן ההמתנה מסומן כהקשר בלבד ואינו מתחזה לתוצאה שעדיין מחושבת.",
  minimize: "הקטן והמשך ברקע",
  cancel: "בטל פעולה",
});

function elapsedLabel(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} שנ׳`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((step, index) => {
      if (typeof step === "string") return { id: `step-${index}`, label: step, state: "pending" };
      if (!step || !step.label) return null;
      const state = ["done", "active", "pending"].includes(step.state) ? step.state : "pending";
      return { id: step.id || `step-${index}`, label: String(step.label), state };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeEngagement(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      if (typeof item === "string") return { id: `engage-${index}`, title: item, detail: null };
      if (!item || !item.title) return null;
      return {
        id: item.id || `engage-${index}`,
        title: String(item.title),
        detail: item.detail ? String(item.detail) : null,
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * Canonical user-facing presence for work that takes perceptible time.
 *
 * Truth boundary:
 * - Percentage is rendered only when the caller supplies real progress/current+total.
 * - Unknown duration stays indeterminate. Never derive a fake percent from elapsed time.
 * - "What is happening" is caller-supplied operational stage copy, not model chain-of-thought.
 * - Long-wait engagement is contextual waiting content, never presented as the pending result.
 */
export default function CanonicalProgress({
  title = "עובדים על זה",
  detail = null,
  phase = null,
  progress = null,
  current = null,
  total = null,
  steps = [],
  engagement = [],
  expectedLong = false,
  compact = false,
  onCancel = null,
  onMinimize = null,
  className = "",
  copy = null,
}) {
  const palette = usePalette();
  const t = useMemo(() => ({ ...DEFAULT_CANONICAL_PROGRESS_COPY, ...(copy || {}) }), [copy]);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - startedAt.current);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const percent = useMemo(
    () => canonicalProgressPercent({ progress, current, total }),
    [progress, current, total]
  );
  const normalizedSteps = useMemo(() => normalizeSteps(steps), [steps]);
  const normalizedEngagement = useMemo(() => normalizeEngagement(engagement), [engagement]);

  const tier = canonicalProgressTier({ elapsedMs: elapsed, expectedLong, compact });

  const showExplain = tier === "explain" || tier === "engage";
  const showEngagement = tier === "engage";

  const style = {
    "--cp-panel": palette.card,
    "--cp-panel-soft": palette.cardSoft,
    "--cp-line": palette.border,
    "--cp-line-strong": palette.borderStrong,
    "--cp-accent": palette.accent,
    "--cp-accent-text": palette.accentText,
    "--cp-ink": palette.ink,
    "--cp-muted": palette.inkSoft,
    "--cp-glow": palette.glow,
    "--cp-on-accent": palette.onAccent,
    "--cp-accent-btn": palette.accentBtn,
    "--cp-progress": percent == null ? "38%" : `${Math.max(0, Math.min(100, percent))}%`,
    fontFamily: F.body,
  };

  return (
    <section
      className={`sod-canonical-progress tier-${tier}${className ? ` ${className}` : ""}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-progress-kind={percent == null ? "indeterminate" : "determinate"}
    >
      <div className="sod-canonical-progress-head">
        <div className="sod-canonical-progress-presence" aria-hidden="true">
          <i />
          <i />
          <span>◌</span>
        </div>
        <div className="sod-canonical-progress-copy">
          <small>{phase || t.systemWorking}</small>
          <strong>{title}</strong>
          {detail ? <p>{detail}</p> : null}
        </div>
        <time aria-hidden="true">{elapsedLabel(elapsed)}</time>
      </div>

      <div
        className={`sod-canonical-progress-meter${percent == null ? " is-indeterminate" : ""}`}
        role="progressbar"
        aria-label={phase || title}
        aria-valuemin={percent == null ? undefined : 0}
        aria-valuemax={percent == null ? undefined : 100}
        aria-valuenow={percent == null ? undefined : Math.round(percent)}
      >
        <i />
      </div>

      <div className="sod-canonical-progress-meta">
        {percent == null
          ? <span>{t.noRealPercent}</span>
          : <span>{t.completedPercent(Math.round(percent))}</span>}
        {normalizedSteps.length ? <span>{t.stepsDone(normalizedSteps.filter((step) => step.state === "done").length, normalizedSteps.length)}</span> : null}
      </div>

      {showExplain ? <div className="sod-canonical-progress-explain">
        <div className="sod-canonical-progress-section-title">
          <span>{t.whatHappens}</span>
          <small>{t.operationalStages}</small>
        </div>
        {normalizedSteps.length ? <ol className="sod-canonical-progress-steps">
          {normalizedSteps.map((step) => <li className={`is-${step.state}`} key={step.id}>
            <span aria-hidden="true">{step.state === "done" ? "✓" : step.state === "active" ? "●" : "○"}</span>
            <b>{step.label}</b>
          </li>)}
        </ol> : <p className="sod-canonical-progress-safe-copy">
          {t.runningSafe}
        </p>}
      </div> : null}

      {showEngagement ? <div className="sod-canonical-progress-engagement">
        <div className="sod-canonical-progress-section-title">
          <span>{t.meantime}</span>
          <small>{t.longWaitLead}</small>
        </div>
        {normalizedEngagement.length ? <div className="sod-canonical-progress-engagement-grid">
          {normalizedEngagement.map((item) => <div key={item.id}>
            <strong>{item.title}</strong>
            {item.detail ? <p>{item.detail}</p> : null}
          </div>)}
        </div> : <p className="sod-canonical-progress-safe-copy">
          {t.waitingContext}
        </p>}
      </div> : null}

      {(onCancel || onMinimize) ? <div className="sod-canonical-progress-actions">
        {onMinimize ? <button type="button" onClick={onMinimize}>{t.minimize}</button> : null}
        {onCancel ? <button type="button" onClick={onCancel}>{t.cancel}</button> : null}
      </div> : null}
    </section>
  );
}
