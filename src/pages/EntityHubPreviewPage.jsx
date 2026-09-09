import React from "react";
import { Link, useParams } from "react-router-dom";
import EntityHubPreviewPageFunctional from "./EntityHubPreviewPageFunctional.jsx";
import VisualEnvironment from "../components/VisualEnvironment.jsx";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import {
  ENVIRONMENT,
  LAYOUT,
  MOTION,
  RADIUS,
  SPACE,
  TYPE_SCALE,
  VISUAL_ASSET_STATE,
} from "../lib/designTokens.js";
import "./EntityHubObservatory.css";
import "./EntityHubVisualFoundation.css";

const researchDoors = [
  { label: "סקירה", href: "#entity-hub-live" },
  { label: "קשרים", to: "/cross" },
  { label: "שיטות", href: "#entity-hub-live" },
  { label: "מקורות", href: "#entity-hub-live" },
  { label: "מסעות", href: "/journey-preview-1237.html" },
];

export default function EntityHubPreviewPage() {
  const { type = "number", key = "1237" } = useParams();
  const label = decodeURIComponent(String(key || "1237"));
  const isNumber = type === "number";
  const P = usePalette();
  const environmentRole = P.mode === "dark"
    ? ENVIRONMENT.DARK_OBSERVATORY
    : ENVIRONMENT.LIGHT_CELESTIAL;

  // W0.5 Golden Case: existing Projection consumes the canonical palette +
  // Visual Foundation token families. CSS keeps composition, not ownership.
  const visualFoundationVars = {
    "--vf-font-ui": F.ui,
    "--vf-font-body": F.body,
    "--vf-font-numeric": F.numeric,
    "--vf-space-2": `${SPACE[2]}px`,
    "--vf-space-3": `${SPACE[3]}px`,
    "--vf-space-4": `${SPACE[4]}px`,
    "--vf-space-6": `${SPACE[6]}px`,
    "--vf-radius-sm": `${RADIUS.sm}px`,
    "--vf-radius-md": `${RADIUS.md}px`,
    "--vf-radius-lg": `${RADIUS.lg}px`,
    "--vf-radius-xl": `${RADIUS.xl}px`,
    "--vf-radius-pill": `${RADIUS.pill}px`,
    "--vf-control-min": `${LAYOUT.controlMinHeight}px`,
    "--vf-focus-width": `${LAYOUT.focusRingWidth}px`,
    "--vf-focus-offset": `${LAYOUT.focusRingOffset}px`,
    "--vf-motion-fast": `${MOTION.duration.fast}ms`,
    "--vf-motion-normal": `${MOTION.duration.normal}ms`,
    "--vf-ease": MOTION.easing.standard,
    "--vf-body-size": `${TYPE_SCALE.body.fontSize}px`,
    "--vf-body-line": TYPE_SCALE.body.lineHeight,
    "--obs-ink": P.ink,
    "--obs-muted": P.inkSoft,
    "--obs-line": P.border,
    "--obs-blue": P.accent,
    "--obs-gold": P.accentText,
    "--obs-focus": P.accent,
  };

  return <div className="entity-hub-observatory" dir="rtl" style={visualFoundationVars}>
    <VisualEnvironment
      role={environmentRole}
      assetState={VISUAL_ASSET_STATE.CANONICAL_FALLBACK}
      focalPosition="50% 36%"
      className="obs-environment"
    />

    <div className="obs-shell">
      <header className="obs-top">
        <a className="obs-brand" href="/">SOD1820<small>ONE REALITY · MANY DOORS</small></a>
        <div className="obs-search" aria-hidden="true">חפש ישות, מספר, נושא, מקור או מסע…</div>
        <nav className="obs-nav" aria-label="ניווט ראשי">
          <a href="/">בית</a><a href="/research">מחקר</a><a href="/book">ספרים</a><a href="/gallery">גלריה</a>
        </nav>
      </header>

      <section className="obs-hero" aria-labelledby="obs-title">
        <div className="obs-orbits" aria-hidden="true">
          <i className="obs-orbit obs-o1"/><i className="obs-orbit obs-o2"/><i className="obs-orbit obs-o3"/>
          <b className="obs-dot obs-d1"/><b className="obs-dot obs-d2"/><b className="obs-dot obs-d3"/>
        </div>
        <div className="obs-hero-content">
          <div className="obs-truth">
            <span>{isNumber ? "ישות מספר" : `ישות ${type}`}</span>
            <span>Research Context</span>
            <span className="gold">Golden Case</span>
          </div>
          <div className="obs-eyebrow">UNIVERSAL ENTITY HUB · RESEARCH OBSERVATORY</div>
          <div className="obs-number" aria-label={label}>{label}</div>
          <h1 id="obs-title">{isNumber ? "מספר אחד · מציאות מחקרית אחת" : "ישות אחת · מציאות מחקרית אחת"}</h1>
          <p>הקשרים, המקורות, השיטות, הזמן והמסעות נפתחים סביב אותה זהות. שכבת העיצוב אינה מקור אמת: הנתונים והפעולות ממשיכים להגיע מה־Projection והכלים הקנוניים שמתחת.</p>
          <div className="obs-hero-actions">
            <a className="primary" href="#entity-hub-live">פתח את ה־Hub החי ↓</a>
            {isNumber ? <Link to={`/number/${encodeURIComponent(label)}`}>דף המספר הקיים</Link> : null}
            <Link to="/cross">◎ מצא קשר</Link>
          </div>
        </div>
      </section>

      <nav className="obs-ribbon" aria-label="דלתות מחקר">
        {researchDoors.map((door, index) => door.to
          ? <Link className={index === 0 ? "active" : ""} key={door.label} to={door.to}>{door.label}</Link>
          : <a className={index === 0 ? "active" : ""} key={door.label} href={door.href}>{door.label}</a>)}
      </nav>

      <div className="obs-contract-strip">
        <span>FOUNDATION → PROJECTION → EXPERIENCE</span>
        <span>W0.5 tokens · semantic palette · contextual environment</span>
        <span>Human Gate preserved</span>
      </div>
    </div>

    <div id="entity-hub-live" className="obs-live" aria-label="שכבת המחקר החיה">
      <div className="obs-live-label"><b>LIVE RESEARCH COMPOSITION</b><span>הפונקציונליות של #328 נשמרת כאן בשלמותה; ה־Observatory הוא מעטפת Projection בלבד.</span></div>
      <EntityHubPreviewPageFunctional />
    </div>
  </div>;
}
