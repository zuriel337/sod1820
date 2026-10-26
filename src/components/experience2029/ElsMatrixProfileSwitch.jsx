import React from "react";
import {
  ELS_MATRIX_PROFILE,
  normalizeElsMatrixProfile,
} from "../../lib/research/els2029MatrixMode.js";

const OPTIONS = Object.freeze([
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
  profile = ELS_MATRIX_PROFILE.RESEARCH,
  onChange,
  disabled = false,
  ariaLabel = "מצב מטריצה",
}) {
  const active = normalizeElsMatrixProfile(profile);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-els-matrix-profile-switch="v1"
      data-profile={active.toLowerCase()}
      className="sod29-actions"
      style={{ flexWrap: "wrap", gap: 8 }}
    >
      {OPTIONS.map((option) => {
        const selected = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            className={selected ? "sod29-action primary" : "sod29-action"}
            aria-pressed={selected}
            data-els-matrix-profile={option.key.toLowerCase()}
            disabled={disabled}
            title={option.title}
            onClick={() => {
              if (disabled || selected) return;
              onChange?.(option.key);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
