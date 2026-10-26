import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import PersonJourney from "../../src/components/PersonJourney.jsx";
import LifeJourneyCapabilities2029 from "../../src/components/experience2029/LifeJourneyCapabilities2029.jsx";
import ResearchProvider, { useResearch } from "virtual:life-journey-research.jsx";
import "../../src/components/experience2029/sod2029.css";
import "../../src/components/experience2029/sod2029-closed.css";
import "../../src/components/experience2029/systemFrame2029.css";
import { DESIGN_V2_PALETTES } from "../../src/lib/palette.js";
import { LAYOUT, RADIUS, TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import { buildLifeJourneyExactReturnPatch } from "../../src/lib/research/lifeJourneyPersonContext.js";

function FixtureBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  if (location.pathname.startsWith("/2029/number/")) {
    const value = location.pathname.split("/").filter(Boolean).at(-1);
    return <main data-experience-surface="number-2029-fixture">
      <h1>דף המספר {value}</h1>
      <button type="button" onClick={() => {
        const target = research.context?.returnTo;
        const patch = buildLifeJourneyExactReturnPatch(research.context);
        if (!target?.href || !patch) return;
        research.updateResearchContext?.(patch);
        navigate(target.href);
      }}>חזרה מדויקת למסע החיים</button>
    </main>;
  }
  return <PersonJourney variant="2029" CapabilitySurface={LifeJourneyCapabilities2029} />;
}

// Same token projection as SystemFrame2029.shellStyle: real Design V2 palettes, type scale and typefaces.
function frameStyle(palette) {
  return {
    "--s29-page": palette.pageBg,
    "--s29-panel": palette.card,
    "--s29-panel-soft": palette.cardSoft,
    "--s29-panel-grad": palette.cardGrad,
    "--s29-line": palette.border,
    "--s29-line-strong": palette.borderStrong,
    "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accentText,
    "--s29-accent-secondary": palette.accentSecondary,
    "--s29-discovery": palette.accentDiscovery,
    "--s29-focus-ring": palette.focusRing,
    "--s29-warm-accent": palette.warmAccent,
    "--s29-brand-sapphire": palette.brandSapphire,
    "--s29-brand-gold": palette.brandGold,
    "--s29-brand-glow": palette.brandGlow,
    "--s29-hero": palette.heroNum,
    "--s29-ink": palette.ink,
    "--s29-muted": palette.inkSoft,
    "--s29-glow": palette.glow,
    "--s29-on-accent": palette.onAccent,
    "--s29-accent-btn": palette.accentBtn,
    "--s29-radius": `${RADIUS.xl}px`,
    "--s29-control-min": `${LAYOUT.controlMinHeight}px`,
    "--s29-font-ui": TYPEFACE.ui,
    "--s29-font-body": TYPEFACE.body,
    "--s29-font-display": TYPEFACE.display,
    "--s29-font-numeric": TYPEFACE.numeric,
    "--s29-type-micro": `${TYPE_SCALE_V2.micro.fontSize}px`,
    "--s29-type-ui": `${TYPE_SCALE_V2.ui.fontSize}px`,
    "--s29-type-small": `${TYPE_SCALE_V2.small.fontSize}px`,
    "--s29-type-body": `${TYPE_SCALE_V2.body.fontSize}px`,
    "--s29-type-lead": `${TYPE_SCALE_V2.lead.fontSize}px`,
    "--s29-type-title": `${TYPE_SCALE_V2.title.fontSize}px`,
    "--s29-type-display": `${TYPE_SCALE_V2.display.fontSize}px`,
    fontFamily: TYPEFACE.body,
    minHeight: "100vh",
    padding: "16px",
  };
}

function Fixture() {
  const [theme, setTheme] = React.useState("light");
  window.__setLifeJourneyTheme = setTheme;
  const palette = DESIGN_V2_PALETTES[theme];
  return <div className="sod29-root closed-shell native-frame surface-journey" data-fixture-theme={theme} data-frame-theme-mode={palette.mode} data-frame-theme-preset={theme} style={frameStyle(palette)}>
    <aside className="sod29-sidebar" aria-hidden="true" />
    <div className="sod29-main"><div className="sod29-main-stage"><main className="sod29-content">
      <BrowserRouter><ResearchProvider><FixtureBody /></ResearchProvider></BrowserRouter>
    </main></div></div>
  </div>;
}

createRoot(document.getElementById("root")).render(<Fixture />);
