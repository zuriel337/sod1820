import React from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalRazielSession2029 } from "./RazielSessionMount2029.jsx";
import { selectElsMatrixReadingActivity } from "../../lib/research/elsMatrixReadingActivity.js";

// A small view inside the existing Companion/sheet, never another fixed bar or poller.
export default function ElsMatrixReadingActivity2029() {
  const session = useOptionalRazielSession2029();
  const navigate = useNavigate();
  const activity = selectElsMatrixReadingActivity(session);
  if (!activity) return null;
  return <section className="sod29-matrix-reading-activity" aria-label="מעקב סריקת מטריצה" data-reading-activity={activity.phase}>
    <strong role="status">{activity.label}</strong>
    <p>{activity.axis.term} · דילוג <bdi>{activity.axis.skip}</bdi> · {activity.axis.dir === -1 ? "לאחור" : "קדימה"}</p>
    {activity.minutes != null ? <small>{activity.active ? "חלפו" : "משך מדווח"} {activity.minutes} דקות</small> : null}
    {activity.active ? <p>אפשר להמשיך לגלוש באתר. הספק אינו מדווח אחוז התקדמות; שיחת רזיאל תפוסה בזמן המעקב.</p> : null}
    {activity.fixture ? <small>דוגמת בדיקה — לא קריאת AI חיה</small> : null}
    {activity.saved ? <small>תוצאה מהשיחה השמורה — לא סריקה חדשה</small> : null}
    <div>
      <button type="button" className="sod29-action" onClick={() => navigate("/code?mode=classic", { state: { elsReadingReturnTurnId: activity.turnId } })}>חזור למטריצה של הסריקה</button>
      {activity.active ? <button type="button" className="sod29-action" disabled={!activity.canCancel}
        onClick={() => session.cancelActiveTurn?.()}>בקש ביטול סריקה</button> : null}
    </div>
  </section>;
}
