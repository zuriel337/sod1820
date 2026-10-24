import React, { useId } from "react";
import { useOptionalRazielSession2029 } from "../../lib/research/RazielSessionProvider2029.jsx";
import { RAZIEL_VIEW_MODES, RAZIEL_VIEW_MODE_META, normalizeRazielViewMode } from "../../lib/research/razielViewMode2029.js";
import "./razielViewMode2029.css";

// כללי | נוף | מתפרע — one compact toggle group shared by every Raziel projection. The choice lives in the single
// Raziel session (RazielSessionProvider2029), so opening Raziel from another surface or navigating keeps it.
// Separate axis from fast/deep: this never selects a model or provider. "נוף" and "מתפרע" are labelled as experiments.
export default function RazielViewModeSelector2029() {
  const session = useOptionalRazielSession2029();
  const hintId = useId();
  if (!session || typeof session.setViewMode !== "function") return null;
  const current = normalizeRazielViewMode(session.viewMode);
  const hint = RAZIEL_VIEW_MODE_META[current].hint;
  return (
    <div className="sod29-raziel-viewmode" role="group" aria-label="מצב התבוננות של רזיאל" data-raziel-view-mode={current}>
      {RAZIEL_VIEW_MODES.map((mode) => {
        const meta = RAZIEL_VIEW_MODE_META[mode];
        const pressed = mode === current;
        return (
          <button
            key={mode}
            type="button"
            className="sod29-raziel-viewmode-option"
            aria-pressed={pressed}
            aria-describedby={pressed && hint ? hintId : undefined}
            data-raziel-view-mode-option={mode}
            onClick={() => session.setViewMode(mode)}
          >
            <span>{meta.label}</span>
            {meta.experimental ? <>{" "}<small className="sod29-raziel-viewmode-badge">ניסוי</small></> : null}
          </button>
        );
      })}
      {hint ? <small id={hintId} className="sod29-raziel-viewmode-hint" role="status">{hint}</small> : null}
    </div>
  );
}
