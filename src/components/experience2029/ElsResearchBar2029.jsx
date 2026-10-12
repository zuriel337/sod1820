import React from "react";

const clean = (value) => String(value ?? "").trim();

const STATE_LABEL = Object.freeze({
  MATCH: "אומת מול המנוע הקנוני",
  VERIFYING: "מאמת מול המנוע הקנוני…",
  CONTEXT_REQUIRED: "ממתין לבחירת מופע",
});

function verificationLabel(replay) {
  if (STATE_LABEL[replay?.state]) return STATE_LABEL[replay.state];
  return replay?.state ? `אימות: ${replay.state}` : STATE_LABEL.CONTEXT_REQUIRED;
}

/**
 * Research bottom bar: context and action (left) · typed verification state and mode (right).
 * Same bottom-bar structure as the approved Home bar; the Raziel orb at the physical center is the shared
 * frame's own dock, so it is not duplicated here. Bound only to actions ELS supports today.
 * It renders existing state and fires existing callbacks; it never searches, verifies or promotes a result.
 */
export default function ElsResearchBar2029({
  subjectLabel,
  locator,
  replay,
  razielAvailable,
  onRaziel,
  onLibrary,
  onMine,
  profileSwitch,
}) {
  const verified = replay?.state === "MATCH";
  const term = clean(subjectLabel);
  return <footer
    className="els29-rbar"
    data-els-research-bar="v1"
    role="contentinfo"
    aria-label="סרגל מחקר ELS"
  >
    <div className="els29-rbar-ctx">
      <button type="button" className="sod29-action primary els29-rbar-btn" onClick={onLibrary}>
        הצפנים הציבוריים
      </button>
      <button type="button" className="sod29-action els29-rbar-btn els29-rbar-secondary" onClick={onMine}>
        הצפנים שלי
      </button>
      <span className="els29-rbar-where">
        אתם ב<b>מחקר ELS</b>
        {term ? <> · <b>{term}</b></> : null}
        {clean(locator) ? <> · <bdi>{clean(locator)}</bdi></> : null}
      </span>
    </div>

    <div className="els29-rbar-state">
      <span
        className="els29-rbar-verify"
        data-state={verified ? "ready" : "building"}
        aria-live="polite"
      >
        <i aria-hidden="true" />{verificationLabel(replay)}
      </span>
      <button
        type="button"
        className={razielAvailable ? "sod29-action primary els29-rbar-btn" : "sod29-action els29-rbar-btn"}
        data-els-raziel-entry={razielAvailable ? "context-ready" : "building"}
        disabled={!razielAvailable}
        title={razielAvailable
          ? "פתח את רזיאל עם context של המופע המאומת"
          : "רזיאל יקבל context רק אחרי אימות מדויק של מופע"}
        onClick={() => { if (razielAvailable) onRaziel?.(); }}
      >
        {razielAvailable ? "✦ רזיאל על הממצא" : "✦ רזיאל · ממתין למופע"}
      </button>
      {profileSwitch}
    </div>
  </footer>;
}
