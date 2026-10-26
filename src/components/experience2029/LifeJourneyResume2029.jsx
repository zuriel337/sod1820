import React, { useRef, useState } from "react";
import { buildLifeJourneySaveCheckpointPatch, canSaveLifeJourneyContext, isLifeJourneyPathReceipt, LIFE_JOURNEY_2029_HREF } from "../../lib/research/lifeJourneyPersonContext.js";
import "./life-journey-resume-2029.css";

function operationMessage(error) {
  if (/preview_read_only/i.test([error?.error, error?.message, typeof error === "string" ? error : ""].filter(Boolean).join(" "))) return "התצוגה הזאת לקריאה בלבד. נקודת ההמשך לא נשמרה לחשבון.";
  if (error?.error === "revision_conflict") return "המסע עודכן במקום אחר. נסו לשמור שוב.";
  if (error?.error === "authentication_required") return "יש להתחבר מחדש כדי לשמור את המסע.";
  return "הפעולה לא הושלמה. אפשר לנסות שוב; נקודת ההמשך לא אושרה.";
}

export default function LifeJourneyResume2029({ research, personRef, readOnly = false, onResume }) {
  const [operation, setOperation] = useState(null);
  const [notice, setNotice] = useState(null);
  const inFlight = useRef(false);
  const latest = isLifeJourneyPathReceipt(research.pathResume?.latest, personRef) ? research.pathResume.latest : null;
  const busy = Boolean(operation || research.pathResume?.loading);
  const save = async () => {
    if (readOnly || inFlight.current || !research.saveCurrentResearchPath) return;
    if (!canSaveLifeJourneyContext(research.context, personRef)) {
      setNotice({ state: "error", text: "המסלול הפעיל שייך להקשר אחר. שמרו אותו לפני פתיחת נקודת המשך למסע החיים." });
      return;
    }
    inFlight.current = true; setOperation("save"); setNotice(null);
    try {
      const started = research.continueResearchPath?.({ kind: "person_life", mode: "organic", surface: "life_journey_2029", href: LIFE_JOURNEY_2029_HREF, label: "מסע חיים פרטי", reason: "explicit_person_save" });
      if (!started?.ok) throw new Error("context_unavailable");
      const checkpoint = buildLifeJourneySaveCheckpointPatch(started.context, personRef);
      if (checkpoint && !research.updateResearchContext?.(checkpoint)) throw new Error("context_unavailable");
      const result = await research.saveCurrentResearchPath({ href: LIFE_JOURNEY_2029_HREF, label: "מסע חיים פרטי", surface: "life_journey_2029" });
      setNotice(isLifeJourneyPathReceipt(result, personRef, started.context)
        ? { state: "success", text: "נקודת ההמשך נשמרה לחשבון." }
        : { state: "error", text: operationMessage(result) });
    } catch (error) { setNotice({ state: "error", text: operationMessage(error) }); }
    finally { inFlight.current = false; setOperation(null); }
  };
  const resume = async () => {
    if (readOnly || inFlight.current || !latest || !research.resumeResearchPath) return;
    inFlight.current = true; setOperation("resume"); setNotice(null);
    const previous = research.context;
    try {
      const result = await research.resumeResearchPath(latest.path_id);
      if (!isLifeJourneyPathReceipt(result, personRef)) {
        if (result?.ok) research.setResearchContext?.(previous);
        setNotice({ state: "error", text: operationMessage(result) });
        return;
      }
      onResume?.(result);
      setNotice({ state: "success", text: "חזרנו לנקודת ההמשך השמורה." });
    } catch (error) { setNotice({ state: "error", text: operationMessage(error) }); }
    finally { inFlight.current = false; setOperation(null); }
  };
  return <section className="life-journey-resume" aria-label="שמירה והמשך של מסע החיים">
    <div><h3>להמשיך מכאן גם בפעם הבאה</h3><p>נקודת ההמשך שומרת את בחירת האנשים, התצוגה והממצאים. פרטי הלידה שייכים לפרופיל הפרטי הקיים.</p></div>
    <div className="life-journey-resume__actions">
      <button type="button" disabled={readOnly || busy || !research.saveCurrentResearchPath} onClick={save}>{operation === "save" ? "שומר נקודת המשך…" : "שמור נקודת המשך"}</button>
      {latest ? <button type="button" disabled={readOnly || busy || !research.resumeResearchPath} onClick={resume}>{operation === "resume" ? "פותח את המסע…" : "המשך מהמסע השמור"}</button> : null}
    </div>
    {readOnly ? <p>בתצוגה הזאת שמירה ושחזור מהחשבון ועדכון פרופיל חסומים. מפות הלידה המחושבות זמינות עד רענון.</p> : <p>מפות הלידה הזמניות אינן נכללות בשמירה; אפשר לחשב אותן מחדש במפורש אחרי החזרה.</p>}
    {notice ? <p role={notice.state === "error" ? "alert" : "status"} data-save-state={notice.state}>{notice.text}</p> : null}
  </section>;
}
