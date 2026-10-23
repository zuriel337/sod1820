import React, { useId } from "react";

function compactNumber(value) {
  if (!Number.isFinite(value)) return "אין נתון";
  return Number(value).toPrecision(9).replace(/0+$/, "").replace(/\.$/, "");
}

export function constantDiagramTemplate(kind) {
  return kind === "powers-balance" ? "powers-balance" : "constant-orbit";
}

function ConstantOrbit({ gradientId }) {
  return <g className="sod29-constant-diagram-glyph">
    <circle cx="222" cy="174" r="94" fill={`url(#${gradientId})`} />
    <circle cx="222" cy="174" r="64" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 9" />
    <path d="M222 80c86 22 146 67 191 137" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="413" cy="217" r="14" fill="currentColor" />
    <text x="222" y="193" textAnchor="middle">e</text>
    <text x="413" y="224" textAnchor="middle" className="sod29-constant-diagram-node">π</text>
  </g>;
}

function PowersBalance({ gradientId }) {
  return <g className="sod29-constant-diagram-glyph">
    <path d="M145 238 245 89l100 149Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeWidth="3" />
    <path d="M295 238 395 89l100 149Z" fill="color-mix(in srgb, currentColor 15%, transparent)" stroke="currentColor" strokeWidth="3" />
    <path d="M245 89 295 238M395 89 345 238" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 8" opacity=".7" />
    <text x="228" y="193" textAnchor="middle">π</text>
    <text x="412" y="193" textAnchor="middle">e</text>
  </g>;
}

export default function ConstantDiagram2029({ diagramKind, title, expression, actual, comparison, absoluteError, relation }) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `constant-gradient-${rawId}`;
  const template = constantDiagramTemplate(diagramKind);
  const relationMark = relation === "exact" ? "=" : "≈";
  return <figure className="sod29-constant-diagram" data-template={template}>
    <svg viewBox="0 0 640 360" role="img" aria-labelledby={`${rawId}-title ${rawId}-desc`}>
      <title id={`${rawId}-title`}>שרטוט השוואה: {title}</title>
      <desc id={`${rawId}-desc`}>{expression}. תוצאה {compactNumber(actual)}, ערך השוואה {compactNumber(comparison)}, פער מוחלט {compactNumber(absoluteError)}. {relation === "exact" ? "שוויון מדויק" : "קירוב שאינו שוויון"}.</desc>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--s29-constant-diagram-gold, #c99a39)" stopOpacity=".72" />
          <stop offset="1" stopColor="var(--s29-constant-diagram-violet, #7661b7)" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <g opacity=".18" stroke="currentColor" fill="none">
        <circle cx="320" cy="174" r="145" strokeDasharray="4 10" />
        <path d="M72 285h496M102 305h436" />
      </g>
      {template === "powers-balance" ? <PowersBalance gradientId={gradientId} /> : <ConstantOrbit gradientId={gradientId} />}
      <g className="sod29-constant-diagram-relation" textAnchor="middle">
        <text x="320" y="69">{relationMark}</text>
        <text x="320" y="332" direction="ltr">δ {compactNumber(absoluteError)}</text>
      </g>
    </svg>
    <figcaption><span>השוואה מחושבת</span><small>{relation === "exact" ? "שוויון מדויק" : "קירוב · לא שוויון"}</small></figcaption>
  </figure>;
}
