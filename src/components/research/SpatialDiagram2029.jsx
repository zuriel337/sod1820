import React, { useId } from "react";

function CubeGlyph({ gradientId }) {
  return <g className="sod29-spatial-diagram-shape" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
    <path d="M320 76 466 151 320 226 174 151Z" fill={`url(#${gradientId})`} />
    <path d="m174 151 146 75v116l-146-75Z" fill="color-mix(in srgb, currentColor 15%, transparent)" />
    <path d="m466 151-146 75v116l146-75Z" fill="color-mix(in srgb, currentColor 28%, transparent)" />
    <path d="M320 226v116M174 151v116l146 75 146-75V151" fill="none" />
  </g>;
}

function IcosahedronGlyph({ gradientId, starred = false }) {
  return <g className="sod29-spatial-diagram-shape" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M320 54 461 151 407 309H233L179 151Z" fill={`url(#${gradientId})`} />
    <path d="m320 54-87 255 228-158H179l228 158Z" fill="none" />
    <path d="M179 151 320 225l141-74M233 309l87-84 87 84" fill="none" opacity=".75" />
    {starred ? <path d="m320 28 34 92 99-27-61 81 82 60-104-5-10 101-40-93-40 93-10-101-104 5 82-60-61-81 99 27Z" fill="none" strokeDasharray="8 7" opacity=".78" /> : null}
  </g>;
}

function CompoundGlyph({ gradientId, octagon = false }) {
  return <g className="sod29-spatial-diagram-shape" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
    {octagon
      ? <><path d="m240 61 160 0 113 113v80L400 335H240l-113-81v-80Z" fill={`url(#${gradientId})`} />
        <path d="m320 100 105 76-40 124H255l-40-124Z" fill="color-mix(in srgb, currentColor 16%, transparent)" />
        <path d="M127 174 320 217 513 174M240 61l80 156 80-156M240 335l80-118 80 118" fill="none" opacity=".72" /></>
      : <><path d="M320 45 480 138 448 315H192l-32-177Z" fill={`url(#${gradientId})`} />
        <path d="m320 91 93 54-18 103-75 64-75-64-18-103Z" fill="color-mix(in srgb, currentColor 18%, transparent)" />
        <path d="M320 91v221M227 145l168 103M413 145 245 248" fill="none" opacity=".76" /></>}
  </g>;
}

export function spatialDiagramTemplate(shapeIdentity) {
  if (shapeIdentity === "icosahedron") return "icosahedron";
  if (shapeIdentity === "sixty-face-star") return "star";
  if (String(shapeIdentity || "").includes("pentagon-octagon")) return "octagon-compound";
  if (String(shapeIdentity || "").includes("cube-pentagon-triangles")) return "cube-pentagon-triangles";
  if (String(shapeIdentity || "").startsWith("compound:")) return "compound";
  return "cube";
}

export default function SpatialDiagram2029({ shapeIdentity, value, form, title, operation }) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `spatial-gradient-${rawId}`;
  const template = spatialDiagramTemplate(shapeIdentity);
  return <figure className="sod29-spatial-diagram" data-template={template}>
    <svg viewBox="0 0 640 360" role="img" aria-labelledby={`${rawId}-title ${rawId}-desc`}>
      <title id={`${rawId}-title`}>שרטוט מפוענח: {title}</title>
      <desc id={`${rawId}-desc`}>{form}, ערך {value}. השרטוט הוא המחשה נתונית ואינו תמונת מקור.</desc>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--s29-spatial-diagram-gold, #c99a39)" stopOpacity=".82" />
          <stop offset="1" stopColor="var(--s29-spatial-diagram-teal, #2d8278)" stopOpacity=".28" />
        </linearGradient>
        <radialGradient id={`${gradientId}-field`} cx="50%" cy="43%" r="67%">
          <stop offset="0" stopColor="var(--s29-spatial-diagram-glow, #d8b66d)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--s29-spatial-diagram-glow, #d8b66d)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="360" rx="24" fill={`url(#${gradientId}-field)`} />
      <g opacity=".2" stroke="currentColor" strokeWidth="1">
        <path d="M40 300h560M70 260h500M110 220h420" />
        <circle cx="320" cy="185" r="146" fill="none" strokeDasharray="5 9" />
      </g>
      {template === "icosahedron" ? <IcosahedronGlyph gradientId={gradientId} /> : null}
      {template === "star" ? <IcosahedronGlyph gradientId={gradientId} starred /> : null}
      {template === "compound" || template === "cube-pentagon-triangles" ? <CompoundGlyph gradientId={gradientId} /> : null}
      {template === "octagon-compound" ? <CompoundGlyph gradientId={gradientId} octagon /> : null}
      {template === "cube" ? <CubeGlyph gradientId={gradientId} /> : null}
      <g className="sod29-spatial-diagram-value" textAnchor="middle">
        <text x="320" y="193" direction="ltr">{value}</text>
        <text x="320" y="216" className="sod29-spatial-diagram-form">{form}</text>
      </g>
      {operation ? <text x="320" y="338" textAnchor="middle" direction="ltr" className="sod29-spatial-diagram-operation">{operation}</text> : null}
    </svg>
    <figcaption><span>שרטוט מפוענח</span><small>המחשה נתונית · לא תמונת מקור</small></figcaption>
  </figure>;
}
