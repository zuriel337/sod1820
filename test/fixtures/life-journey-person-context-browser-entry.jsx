import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import PersonJourney from "../../src/components/PersonJourney.jsx";
import LifeJourneyCapabilities2029 from "../../src/components/experience2029/LifeJourneyCapabilities2029.jsx";
import ResearchProvider, { useResearch } from "virtual:life-journey-research.jsx";
import { buildLifeJourneyExactReturnPatch } from "../../src/lib/research/lifeJourneyPersonContext.js";

const palettes = {
  light: { page: "#f7f4ec", panel: "#ffffff", soft: "#faf7ef", ink: "#1c211f", muted: "#655f52", line: "#ded6c5", accent: "#765b17", onAccent: "#ffffff" },
  parchment: { page: "#e9e0d0", panel: "#f9f1e3", soft: "#f1e6d4", ink: "#241d16", muted: "#6e6254", line: "#d1c2ad", accent: "#855f18", onAccent: "#ffffff" },
  dark: { page: "#07111a", panel: "#101d27", soft: "#15242f", ink: "#edf3f5", muted: "#a8b4bc", line: "#2a3b47", accent: "#d1a63c", onAccent: "#12100a" },
};

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

function Fixture() {
  const [theme, setTheme] = React.useState("light");
  window.__setLifeJourneyTheme = setTheme;
  const palette = palettes[theme];
  const style = {
    minHeight: "100vh",
    padding: "16px",
    background: palette.page,
    color: palette.ink,
    "--s29-panel": palette.panel,
    "--s29-panel-soft": palette.soft,
    "--s29-ink": palette.ink,
    "--s29-muted": palette.muted,
    "--s29-line": palette.line,
    "--s29-line-strong": palette.accent,
    "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accent,
    "--s29-accent-btn": palette.accent,
    "--s29-on-accent": palette.onAccent,
    "--s29-glow": palette.accent,
  };
  return <div className="sod29-root" data-fixture-theme={theme} data-frame-theme-preset={theme} style={style}>
    <BrowserRouter><ResearchProvider><FixtureBody /></ResearchProvider></BrowserRouter>
  </div>;
}

createRoot(document.getElementById("root")).render(<Fixture />);
