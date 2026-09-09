import React from "react";
import { Link, useParams } from "react-router-dom";
import EntityHubPreviewPageFunctional from "./EntityHubPreviewPageFunctional.jsx";
import VisualEnvironment from "../components/VisualEnvironment.jsx";
import ResearchIcon from "../components/ResearchIcon.jsx";
import SignatureResearchIcon from "../components/SignatureResearchIcon.jsx";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { ENVIRONMENT, LAYOUT, MOTION, RADIUS, SPACE, TYPE_SCALE, VISUAL_ASSET_STATE } from "../lib/designTokens.js";
import "./EntityHubObservatory.css";
import "./EntityHubVisualFoundation.css";
import "./EntityHubIconNorthStar.css";

const researchDoors = [
  { label: "סקירה", href: "#entity-hub-live" }, { label: "קשרים", to: "/cross" },
  { label: "שיטות", href: "#entity-hub-live" }, { label: "מקורות", href: "#entity-hub-live" },
  { label: "מסעות", href: "/journey-preview-1237.html" },
];
const iconNorthStar = [
  ["research", "מחקר", "research"], ["graph", "קשרים", "connection"], ["journey", "מסע", "intelligence"], ["spatial", "מרחב", "intelligence"],
  ["scan", "סריקה", "research"], ["time", "זמן", "connection"], ["layers", "שכבות", "research"], ["source", "מקורות", "heritage"],
  ["gallery", "גלריה", "connection"], ["dna", "DNA", "intelligence"], ["cipher", "צופן", "research"], ["globe", "עולם", "connection"],
  ["signal", "אות", "research"], ["raziel", "רזיאל", "intelligence"], ["portal", "שער", "intelligence"], ["spark", "גילוי", "heritage"],
];
const signatureNorthStar = [
  ["research", "Research", "research"], ["graph", "Connections", "connection"], ["journey", "Journey", "intelligence"], ["spatial", "Spatial", "intelligence"],
  ["dna", "DNA", "intelligence"], ["gallery", "Gallery", "connection"], ["raziel", "Raziel", "intelligence"], ["portal", "Portal", "intelligence"],
];

export default function EntityHubPreviewPage() {
  const { type = "number", key = "1237" } = useParams();
  const label = decodeURIComponent(String(key || "1237"));
  const isNumber = type === "number";
  const P = usePalette();
  const environmentRole = P.mode === "dark" ? ENVIRONMENT.DARK_OBSERVATORY : ENVIRONMENT.LIGHT_CELESTIAL;
  const visualFoundationVars = {
    "--vf-font-ui": F.ui, "--vf-font-body": F.body, "--vf-font-numeric": F.numeric,
    "--vf-space-2": `${SPACE[2]}px`, "--vf-space-3": `${SPACE[3]}px`, "--vf-space-4": `${SPACE[4]}px`, "--vf-space-6": `${SPACE[6]}px`,
    "--vf-radius-sm": `${RADIUS.sm}px`, "--vf-radius-md": `${RADIUS.md}px`, "--vf-radius-lg": `${RADIUS.lg}px`, "--vf-radius-xl": `${RADIUS.xl}px`, "--vf-radius-pill": `${RADIUS.pill}px`,
    "--vf-control-min": `${LAYOUT.controlMinHeight}px`, "--vf-focus-width": `${LAYOUT.focusRingWidth}px`, "--vf-focus-offset": `${LAYOUT.focusRingOffset}px`,
    "--vf-motion-fast": `${MOTION.duration.fast}ms`, "--vf-motion-normal": `${MOTION.duration.normal}ms`, "--vf-ease": MOTION.easing.standard,
    "--vf-body-size": `${TYPE_SCALE.body.fontSize}px`, "--vf-body-line": TYPE_SCALE.body.lineHeight,
    "--obs-ink": P.ink, "--obs-muted": P.inkSoft, "--obs-line": P.border, "--obs-focus": P.accent,
  };

  return <div className="entity-hub-observatory" dir="rtl" style={visualFoundationVars}>
    <VisualEnvironment role={environmentRole} assetState={VISUAL_ASSET_STATE.CANONICAL_FALLBACK} focalPosition="50% 36%" className="obs-environment" />
    <div className="obs-shell">
      <header className="obs-top">
        <a className="obs-brand" href="/" aria-label="SOD1820 — בית"><img src="/crown.png" alt="" className="obs-brand-mark" /><span>SOD1820<small>ONE REALITY · MANY DOORS</small></span></a>
        <div className="obs-search" aria-hidden="true">חפש ישות, מספר, נושא, מקור או מסע…</div>
        <nav className="obs-nav" aria-label="ניווט ראשי"><a href="/">בית</a><a href="/research">מחקר</a><a href="/book">ספרים</a><a href="/gallery">גלריה</a></nav>
      </header>
      <section className="obs-hero" aria-labelledby="obs-title">
        <div className="obs-orbits" aria-hidden="true"><i className="obs-orbit obs-o1"/><i className="obs-orbit obs-o2"/><i className="obs-orbit obs-o3"/><b className="obs-dot obs-d1"/><b className="obs-dot obs-d2"/><b className="obs-dot obs-d3"/></div>
        <div className="obs-hero-content">
          <div className="obs-truth"><span>{isNumber ? "ישות מספר" : `ישות ${type}`}</span><span>Research Context</span><span className="gold">Golden Case</span></div>
          <div className="obs-eyebrow">UNIVERSAL ENTITY HUB · LIVING MIDNIGHT BLUE</div><div className="obs-number" aria-label={label}>{label}</div>
          <h1 id="obs-title">{isNumber ? "מספר אחד · מציאות מחקרית אחת" : "ישות אחת · מציאות מחקרית אחת"}</h1>
          <p>Research Blue לפעולה, Cyan לקשרים, Indigo לרזיאל ולשכבת intelligence, וזהב רק כחתימת מורשת.</p>
          <div className="obs-hero-actions"><a className="primary" href="#entity-hub-live">פתח את ה־Hub החי ↓</a>{isNumber ? <Link to={`/number/${encodeURIComponent(label)}`}>דף המספר הקיים</Link> : null}<Link to="/cross">מצא קשר</Link></div>
        </div>
      </section>

      <section className="obs-signature-zone" aria-labelledby="obs-signature-title">
        <div className="obs-icon-heading"><div><span>SIGNATURE ICONS · TIER B</span><h2 id="obs-signature-title">Signature 2028 — לרגעים שבהם החוויה צריכה נוכחות</h2></div><p>אותו capability glyph, אבל עם חומריות, halo, depth ו־ambient motion. לא לכל כפתור.</p></div>
        <div className="obs-signature-grid">{signatureNorthStar.map(([name,text,tone]) => <div className="obs-signature-card" key={name}><SignatureResearchIcon name={name} tone={tone} label={text}/><strong>{text}</strong><small>{tone === "intelligence" ? "INDIGO INTELLIGENCE" : tone === "connection" ? "CYAN CONNECTION" : "RESEARCH AZURE"}</small></div>)}</div>
      </section>

      <section className="obs-icon-north-star" aria-labelledby="obs-icon-title">
        <div className="obs-icon-heading"><div><span>FUNCTIONAL ICONS · TIER A</span><h2 id="obs-icon-title">Research Future — מהיר, חד, לכלי העבודה</h2></div><p>SVG קל לניווט, controls, mobile, tables ו־dense research.</p></div>
        <div className="obs-icon-grid">{iconNorthStar.map(([name,text,tone]) => <div className="obs-icon-card" key={name}><ResearchIcon name={name} tone={tone} size={27}/><span>{text}</span></div>)}</div>
      </section>

      <nav className="obs-ribbon" aria-label="דלתות מחקר">{researchDoors.map((door,index) => door.to ? <Link className={index===0?"active":""} key={door.label} to={door.to}>{door.label}</Link> : <a className={index===0?"active":""} key={door.label} href={door.href}>{door.label}</a>)}</nav>
      <div className="obs-contract-strip"><span>FOUNDATION → PROJECTION → EXPERIENCE</span><span>Tier A functional → Tier B signature → future spatial only when meaningful</span><span>Human Gate preserved</span></div>
    </div>
    <div id="entity-hub-live" className="obs-live" aria-label="שכבת המחקר החיה"><div className="obs-live-label"><b>LIVE RESEARCH COMPOSITION</b><span>הפונקציונליות הקיימת נשמרת; שכבות האייקונים הן Projection בלבד.</span></div><EntityHubPreviewPageFunctional /></div>
  </div>;
}
