import React from "react";
import { useNavigate } from "react-router-dom";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";

// Same operation, projected locally or inside the existing global Workspace. No poller.
export default function ElsResearchActivity2029({ onOpenResult = null, selecting = false }) {
  const { elsResearchOperation: operation } = useResearch();
  const navigate = useNavigate();
  const task = operation?.task;
  if (!task) return null;
  const running = task.status === "RUNNING";
  const back = () => navigate("/code?mode=research", { state: { elsResearchReturnTaskId: task.id } });
  return <section className="sod29-matrix-reading-activity" aria-label="מעקב מחקר ללא AI" data-els-research-task={task.status}>
    <strong>מחקר מונחים · ללא AI</strong>
    <p>מופע המוצא: <bdi>{task.origin.term}</bdi> · דילוג <bdi>{task.origin.skip}</bdi> · {task.origin.dir === -1 ? "לאחור" : "קדימה"}</p>
    <p>{task.plan.scope === "torah" ? "תורה" : "תנ״ך"} · דילוגים <bdi>{task.plan.skipMin}–{task.plan.skipMax}</bdi> · {task.plan.terms.length} מונחים · עד {task.plan.pageSize} מופעים לכל מונח. זה חיפוש בטקסט, לא רק בחלון המטריצה.</p>
    {running ? <CanonicalProgress key={task.id} compact title="המחקר ממשיך גם במעבר בין דפי האתר"
      phase={task.phase} current={task.rows.length} total={task.plan.terms.length}
      onCancel={operation.cancel} copy={{ cancel: "עצור מחקר" }} /> : <p role="status">{task.phase}</p>}
    <p>המעקב והתוצאות זמניים בלשונית הזאת. רענון או סגירת האתר מפסיקים את המעקב. לא מופעל מודל ולא מחויבים טוקני AI.</p>
    {task.status === "CANCELLED" || task.status === "PARTIAL" ? <p>הבקשות הבאות לא יישלחו. בקשה שכבר הגיעה לשרת עשויה להסתיים; אין להסיק שלא קיימים ממצאים נוספים.</p> : null}
    <div>
      <button type="button" className="sod29-action" onClick={back}>חזור למופע ולתוצאות המחקר</button>
      {!running ? <button type="button" className="sod29-action" onClick={() => {
        if (window.confirm("למחוק את תוצאת המחקר הזמנית מהמעקב? המטריצה והשיחות לא יימחקו.")) operation.clear();
      }}>נקה תוצאה זמנית</button> : null}
    </div>
    <p>החזרה פותחת את מופע המוצא המדויק. היא אינה משחזרת זום או סימונים ידניים שלא נשמרו.</p>
    {onOpenResult ? task.rows.map((row, index) => <details key={`${task.id}:${index}`}>
      <summary><bdi>{row.term}</bdi> · {row.state === "FAILED" ? "הבדיקה לא הושלמה" : `${row.count} מופעים נטענו`}{row.truncated ? " · יש תוצאות נוספות שלא נטענו" : ""}</summary>
      {row.error ? <p>{row.error}</p> : null}
      <p>פתיחת מופע מפעילה אימות במנוע הקנוני. היא אינה מפעילה AI.</p>
      {(row.projection?.occurrences || []).map(hit => <button type="button" className="sod29-action" key={hit.occurrenceId}
        disabled={selecting} onClick={() => onOpenResult(hit, row.projection, task.plan.scope)}>
        <bdi>{row.term}</bdi> · דילוג <bdi>{hit.skip}</bdi> · {hit.dir === -1 ? "לאחור" : "קדימה"} · מיקום <bdi>{hit.start + 1}</bdi>
      </button>)}
    </details>) : <p>{task.rows.length} מתוך {task.plan.terms.length} דפי בדיקה חזרו. פתחו את המחקר לצפייה בתוצאות.</p>}
  </section>;
}
