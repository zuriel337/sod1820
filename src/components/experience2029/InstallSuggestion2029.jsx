import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { guestNewsletterRoute2029 } from "./useGuestNewsletterInvite2029.js";
import { INSTALL_ACCEPTED_DAYS, INSTALL_DISMISS_DAYS, installSuggestionSuppressed, requestInstall, suppressInstallSuggestion } from "../../lib/installOffer2029.js";
import "./installSuggestion2029.css";

// Quiet invitation to install the app (Android Chrome only; the mount renders
// this only while the browser offers installation). Non-modal, dismissible,
// one per visit, never over a dialog or while someone is typing or selecting.
export const INSTALL_SUGGESTION_DELAY_MS = 45000;
const RETRY_MS = 15000;
const MAX_RETRIES = 4;

export function installSuggestionBlocked(doc = document, win = window) {
  return Boolean(doc.querySelector('[role=dialog],[aria-modal=true]'))
    || Boolean(doc.activeElement?.matches?.("input,textarea,select,[contenteditable=true]"))
    || String(win.getSelection?.() || "").trim() !== "";
}

export function InstallSuggestionView({ onInstall, onDismiss }) {
  return <aside className="sod29-install" role="region" aria-label="התקנת האפליקציה" dir="rtl" data-install-suggestion="android">
    <img src={BRAND_LOCKUP_NAV_2029.src} alt="" width="40" height="40" />
    <div className="sod29-install-copy">
      <strong>סוד 1820 כאפליקציה</strong>
      <small>פתיחה מהירה מהמסך הראשי</small>
    </div>
    <button type="button" className="sod29-install-go" onClick={onInstall}>התקנה</button>
    <button type="button" className="sod29-install-close" onClick={onDismiss} aria-label="לא עכשיו">×</button>
  </aside>;
}

export default function InstallSuggestion2029() {
  const { pathname } = useLocation();
  const eligible = guestNewsletterRoute2029(pathname);
  const [shown, setShown] = useState(false);
  const [finished, setFinished] = useState(false);

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
    timer = setTimeout(attempt, INSTALL_SUGGESTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible, finished]);

  if (!shown || !eligible || finished) return null;
  const dismiss = () => { suppressInstallSuggestion(INSTALL_DISMISS_DAYS); setFinished(true); };
  const install = async () => {
    const outcome = await requestInstall();
    suppressInstallSuggestion(outcome === "accepted" ? INSTALL_ACCEPTED_DAYS : INSTALL_DISMISS_DAYS);
    setFinished(true);
  };
  return <InstallSuggestionView onInstall={install} onDismiss={dismiss} />;
}
