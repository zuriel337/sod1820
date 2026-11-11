import React, { useState, useSyncExternalStore } from "react";
import { installMenuKind, requestInstall, subscribeInstallOffer, suppressInstallSuggestion, INSTALL_ACCEPTED_DAYS } from "../../lib/installOffer2029.js";

// The explicit, person-initiated app install inside the bottom bar's "עוד" panel (functional only; the panel's look is unchanged and
// uses the frame's existing section/heading/action styles). It works after the automatic suggestion was dismissed: Android uses the
// browser's own offer (installOffer2029 keeps it), iOS gets the manual steps, the installed app says so. Desktop and browsers with no
// offer get nothing, so there is never a dead install button. No new install system, store, network request or telemetry.

const STATUS = {
  pending: "חלון ההתקנה של הדפדפן פתוח…",
  accepted: "האפליקציה הותקנה. אפשר לפתוח אותה ממסך הבית.",
  dismissed: "ההתקנה לא הושלמה. אפשר להתקין גם מתפריט הדפדפן.",
  unavailable: "הדפדפן לא מציע כרגע התקנה. אפשר להתקין מתפריט הדפדפן.",
};

export function MoreInstallView({ kind, outcome = null, stepsOpen = false, onInstall, onToggleSteps }) {
  if (!kind && !outcome) return null;
  return <section aria-label="אפליקציית סוד 1820" data-more-install={kind || "done"}>
    <h3>אפליקציית סוד 1820</h3>
    {kind === "installed" ? <p>האפליקציה מותקנת במכשיר הזה.</p> : null}
    {kind === "native" && outcome !== "pending" ? <div className="sod29-panel-actions-grid">
      <button className="sod29-action primary" type="button" onClick={onInstall}>התקנת האפליקציה</button>
    </div> : null}
    {kind === "ios-manual" ? <div className="sod29-panel-actions-grid">
      <button className="sod29-action" type="button" onClick={onToggleSteps} aria-expanded={stepsOpen} aria-controls="sod29-more-install-steps">
        {stepsOpen ? "סגירת ההוראות" : "איך מתקינים באייפון"}
      </button>
    </div> : null}
    {outcome && STATUS[outcome] ? <p role="status">{STATUS[outcome]}</p> : null}
    {kind === "ios-manual" && stepsOpen ? <ol id="sod29-more-install-steps">
      <li>לחצו על כפתור השיתוף בסרגל של Safari.</li>
      <li>גללו ובחרו «הוסף למסך הבית».</li>
      <li>אשרו ב«הוסף» — סוד 1820 יופיע במסך הבית.</li>
    </ol> : null}
  </section>;
}

const serverKind = () => null;
export default function MoreInstall2029() {
  const kind = useSyncExternalStore(subscribeInstallOffer, installMenuKind, serverKind);
  const [outcome, setOutcome] = useState(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const install = async () => {
    setOutcome("pending");
    const result = await requestInstall();
    if (result === "accepted") suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS);
    setOutcome(result || "unavailable");
  };
  return <MoreInstallView kind={kind} outcome={outcome} stepsOpen={stepsOpen} onInstall={install} onToggleSteps={() => setStepsOpen(open => !open)} />;
}
