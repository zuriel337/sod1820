import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WorldMapShell2029 from "../../src/components/research/WorldMapShell2029.jsx";
import {
  buildWorldMapFixtureProjection, createFixtureRelationOpener, WORLD_MAP_FIXTURE_CANDIDATES,
  WORLD_MAP_FIXTURE_LAYERS, WORLD_MAP_FIXTURE_NOTICE, WORLD_MAP_FIXTURE_TARGETS,
} from "../../src/lib/research/worldMapFixture2029.js";
import { use2029Palette } from "../../src/lib/palette.js";
import { setThemePreset } from "../../src/lib/themeMode.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";

// Fixture-only preview. No reader, no network: relations come from the synthetic opener.
const params = new URLSearchParams(location.search);
if (params.get("theme")) setThemePreset(params.get("theme"));

function Review() {
  const P = use2029Palette();
  const projection = useMemo(() => buildWorldMapFixtureProjection({ treeRelationsAvailable: params.get("tree") !== "unavailable" }), []);
  const opener = useMemo(() => params.get("opener") === "none" ? null : createFixtureRelationOpener(params.get("scenario") || "ok"), []);
  const style = { background: P.pageBg, color: P.ink, minHeight: "100vh", padding: 16, boxSizing: "border-box",
    "--s29-font-ui": TYPEFACE.ui, "--s29-ink": P.ink, "--s29-muted": P.inkSoft, "--s29-panel": P.card, "--s29-panel-soft": P.cardSoft,
    "--s29-line": P.border, "--s29-line-strong": P.borderStrong, "--s29-accent-text": P.accentText, "--s29-accent-secondary": P.accentSecondary,
    "--s29-discovery": P.accentDiscovery, "--s29-warm-accent": P.warmAccent, "--s29-focus-ring": P.focusRing };
  for (const [key, value] of Object.entries(TYPE_SCALE_V2)) style[`--s29-type-${key}`] = `${value.fontSize}px`;
  return <main className="sod29-root surface-world" style={style}>
    <WorldMapShell2029 projection={projection} layersByNode={WORLD_MAP_FIXTURE_LAYERS} relationTargets={WORLD_MAP_FIXTURE_TARGETS}
      candidates={WORLD_MAP_FIXTURE_CANDIDATES} openRelations={opener} fixtureNotice={WORLD_MAP_FIXTURE_NOTICE} />
  </main>;
}

createRoot(document.getElementById("root")).render(<BrowserRouter><Review /></BrowserRouter>);
