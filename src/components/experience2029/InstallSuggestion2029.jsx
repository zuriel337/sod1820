import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { guestNewsletterRoute2029 } from "./useGuestNewsletterInvite2029.js";
import { INSTALL_ACCEPTED_DAYS, INSTALL_DISMISS_DAYS, installSuggestionSuppressed, requestInstall, suppressInstallSuggestion } from "../../lib/installOffer2029.js";
import "./installSuggestion2029.css";

// Invitation to install the app, as the Legacy site offered it: on Android as
// soon as the browser offers installation (after a short settle), on iOS after
// a few seconds with the manual "add to home screen" steps. Non-modal,
// dismissible for 14 days, one per visit, never over a dialog or while someone
// is typing or selecting. The mount renders this only when there is something
// to suggest.
export const INSTALL_SUGGESTION_DELAY_MS = Object.freeze({ native: 3000, "ios-manual": 8000 });
const RETRY_MS = 15000;
const MAX_RETRIES = 4;

export function installSuggestionBlocked(doc = document, win = window) {
  return Boolean(doc.querySelector('[role=dialog],[aria-modal=true]'))
    || Boolean(doc.activeElement?.matches?.("input,textarea,select,[contenteditable=true]"))
    || String(win.getSelection?.() || "").trim() !== "";
}

export function InstallSuggestionView({ kind = "native", helpOpen = false, onInstall, onToggleHelp, onDismiss }) {
  const ios = kind === "ios-manual";
  return <aside className="sod29-install" role="region" aria-label="התקנת האפליקציה" dir="rtl" data-install-suggestion={kind}>
    <img src={BRAND_LOCKUP_NAV_2029.src} alt="" width="40" height="40" />
    <div className="sod29-install-copy">
      <strong>התקינו את סוד 1820</strong>
      <small>{ios ? "הוסיפו למסך הבית — גישה מהירה, בלי חנות אפליקציות." : "אפליקציה במסך הבית — פתיחה מהירה, בלי לחפש בדפדפן."}</small>
    </div>
    {ios
      ? <button type="button" className="sod29-install-go" onClick={onToggleHelp} aria-expanded={helpOpen}>איך מתקינים?</button>
      : <button type="button" className="sod29-install-go" onClick={onInstall}>התקנה</button>}
    <button type="button" className="sod29-install-close" onClick={onDismiss} aria-label="לא עכשיו">×</button>
    {ios && helpOpen && <p className="sod29-install-help">לחצו על כפתור השיתוף (⬆️), גללו ובחרו «הוסף למסך הבית», ואשרו.</p>}
  </aside>;
}

export default function InstallSuggestion2029({ kind = "native" }) {
  const { pathname } = useLocation();
  const eligible = guestNewsletterRoute2029(pathname);
  const [shown, setShown] = useState(false);
  const [finished, setFinished] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!eligible || finished) { setShown(false); return undefined; }
    let attempts = 0, timer;
    const attempt = () => {
      if (installSuggestionSuppressed()) { setFinished(true); return; }
      if (installSuggestionBlocked()) {
        // A dialog (for example the newsletter invitation) means one invitation per visit is already used.
        if (document.querySelector('[role=dialog],[aria-modal=true]')) { setFinished(true); return; }
        if (++attempts <= MAX_RETRIES) timer = setTimeout(attempt, RETRY_MS);
        return;
      }
      setShown(true);
    };
    timer = setTimeout(attempt, INSTALL_SUGGESTION_DELAY_MS[kind] ?? INSTALL_SUGGESTION_DELAY_MS.native);
    return () => clearTimeout(timer);
  }, [eligible, finished, kind]);

  if (!shown || !eligible || finished) return null;
  const dismiss = () => { suppressInstallSuggestion(INSTALL_DISMISS_DAYS); setFinished(true); };
  const install = async () => {
    const outcome = await requestInstall();
    suppressInstallSuggestion(outcome === "accepted" ? INSTALL_ACCEPTED_DAYS : INSTALL_DISMISS_DAYS);
    setFinished(true);
  };
  return <InstallSuggestionView kind={kind} helpOpen={helpOpen} onInstall={install} onToggleHelp={() => setHelpOpen(open => !open)} onDismiss={dismiss} />;
}
