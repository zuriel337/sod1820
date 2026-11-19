import React from "react";
import {
  ELS_MATRIX_PROFILE,
  normalizeElsMatrixProfile,
} from "../../lib/research/els2029MatrixMode.js";

const OPTIONS = Object.freeze([
  Object.freeze({
    key: ELS_MATRIX_PROFILE.GUIDED,
    label: "גילוי מודרך",
    title: "כותבים סיפור אחד והמערכת בונה סביבו חיפוש מקומי ומוגבל",
  }),
  Object.freeze({
    key: ELS_MATRIX_PROFILE.RESEARCH,
    label: "מחקר",
    title: "אותה מטריצה עם שכבות מחקר מתקדמות לפי הצורך",
  }),
  Object.freeze({
    key: ELS_MATRIX_PROFILE.CLASSIC,
    label: "קלאסי",
    title: "המטריצה הישירה והמוכרת — 2D ידני ומהיר",
  }),
]);

export default function ElsMatrixProfileSwitch({
  profile = ELS_MATRIX_PROFILE.GUIDED,
  onChange,
  disabled = false,
  ariaLabel = "מצב מטריצה",
  // Public visitors get Research and Classic; Guided discovery stays with the administrator.
  allowed = null,
}) {
  const active = normalizeElsMatrixProfile(profile);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-els-matrix-profile-switch="v1"
      data-profile={active.toLowerCase()}
      className="els29-profile-switch"
    >
      {OPTIONS.filter((option) => !allowed || allowed.includes(option.key)).map((option) => {
        const selected = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            className={selected ? "sod29-action primary" : "sod29-action"}
            aria-pressed={selected}
            aria-description={option.key === ELS_MATRIX_PROFILE.CLASSIC ? "מצב חופשי" : undefined}
            data-els-matrix-profile={option.key.toLowerCase()}
            disabled={disabled}
            title={option.title}
            onClick={() => {
              if (disabled || selected) return;
              onChange?.(option.key);
            }}
          >
            <span>{option.label}</span>
            {option.key === ELS_MATRIX_PROFILE.CLASSIC ? <span className="els29-profile-free" lang="en" dir="ltr" aria-hidden="true">FREE</span> : null}
          </button>
        );
      })}
    </div>
  );
}
