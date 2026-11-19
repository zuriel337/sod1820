import React, { useEffect, useState } from "react";
import { canonicalProgressPercent } from "../../lib/canonicalProgressModel.js";
import "./researchActivity2029.css";

// Compact research indicator attached to the bottom bar (preview, ZURIEL 19.11.2026).
// A projection only: it reads the one in-memory operation of the existing ResearchProvider
// (research.elsResearchOperation.task). No task store, persistence or polling of its own; the
// 1 s tick only redraws the elapsed time while the operation runs. The percent comes from the
// canonical progress model (real rows/terms) and is otherwise indeterminate.
// `lab` shows a simulated, clearly marked operation in a lab build only (VITE_LAB_SIMULATED_RESEARCH=1).

const STATUS_LABEL = { RUNNING: "סורק", PARTIAL: "הושלם חלקית", COMPLETE: "הושלם", FAILED: "לא הושלם", CANCELLED: "נעצר" };

function elapsedLabel(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds} שנ׳` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

let simulatedStartedAt = 0; // one simulated operation per page load, so the time keeps running across bar/expansion mounts

function useSimulatedTask(enabled) {
  const [task, setTask] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    if (!simulatedStartedAt) simulatedStartedAt = Date.now() - 41000;
    const startedAt = simulatedStartedAt;
    const terms = ["משיח", "בן דוד", "ישועה", "גאולה", "אליהו", "ציון", "ירושלים", "קץ"];
    let rows = 3;
    setTask({ id: "lab", kind: "els_terms", status: "RUNNING", startedAt, simulated: true, origin: { term: "משיח" }, plan: { terms }, rows: Array(rows).fill({}), phase: "בודק מונח 4 מתוך 8 · ספר בראשית" });
    const id = setInterval(() => {
      rows = rows >= terms.length - 1 ? 3 : rows + 1;
      setTask((t) => t && { ...t, rows: Array(rows).fill({}), phase: `בודק מונח ${rows + 1} מתוך ${terms.length} · ספר בראשית` });
    }, 4000);
    return () => clearInterval(id);
  }, [enabled]);
  return task;
}

export default function ResearchActivity2029({ task: realTask = null, lab = false, onOpen, placement = "bar" }) {
  const simulated = useSimulatedTask(lab && !realTask);
  const task = realTask || simulated;
  const running = task?.status === "RUNNING";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!task) return null;
  const total = Array.isArray(task.plan?.terms) ? task.plan.terms.length : null;
  const current = Array.isArray(task.rows) ? task.rows.length : null;
  const percent = canonicalProgressPercent({ current, total });
  const elapsed = (task.finishedAt || now) - (task.startedAt || now);
  const status = STATUS_LABEL[task.status] || task.status;
  const term = task.origin?.term || "";
  // The wrapper keeps the indicator out of the bar's own button row (the bar styles its direct buttons as dock entries).
  return (<div className={`sod29-research-activity-wrap is-${placement}`}>
    <button type="button" className={`sod29-research-activity is-${placement}${running ? " is-running" : ""}`} onClick={onOpen}
      data-research-activity={task.status} data-simulated={task.simulated ? "true" : undefined}
      aria-label={`מחקר צופן · ${term} · ${status} · ${task.phase || ""} · ${elapsedLabel(elapsed)}. פתיחת הפירוט והחזרה לתוצאה`}>
      <span className="sod29-research-activity-line" aria-hidden="true">
        <b>{running ? "סורק" : status}</b>
        <bdi>{term}</bdi>
        <span className="sod29-research-activity-phase">{task.phase}</span>
        <time>{elapsedLabel(elapsed)}</time>
        {task.simulated ? <em>מדומה</em> : null}
      </span>
      <span className={`sod29-research-activity-meter${percent == null ? " is-indeterminate" : ""}`} role="progressbar"
        aria-label={task.phase || status} aria-valuemin={percent == null ? undefined : 0} aria-valuemax={percent == null ? undefined : 100}
        aria-valuenow={percent == null ? undefined : Math.round(percent)} style={percent == null ? undefined : { "--ra-progress": `${percent}%` }}><i /></span>
    </button>
    <span className="sod29-research-activity-live" role="status" aria-live="polite">{`מחקר צופן · ${status} · ${task.phase || ""}`}</span>
  </div>);
}
