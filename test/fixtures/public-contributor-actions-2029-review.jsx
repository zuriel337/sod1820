import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import ResearchProvider from "../../src/lib/research/ResearchProvider.jsx";
import { PublicContributor2029View } from "../../src/pages/PublicContributor2029Page.jsx";
import { withPublicContributorPerson2029 } from "../../src/components/contributor2029/publicContributorPerson2029.js";
import { sourceCatalogFixtureView } from "../../src/components/contributor2029/publicSourceCatalog2029Fixtures.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import { use2029Palette } from "../../src/lib/palette.js";
import { setThemePreset } from "../../src/lib/themeMode.js";
setThemePreset(new URLSearchParams(location.search).get("theme") || "dark");
function Review() {
  const P = use2029Palette();
  const view = sourceCatalogFixtureView();
  const style = { background: P.pageBg, minHeight: "100vh", "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body };
  for (const [key, value] of Object.entries(TYPE_SCALE_V2)) style[`--s29-type-${key}`] = `${value.fontSize}px`;
  return <main style={style}><PublicContributor2029View view={withPublicContributorPerson2029(view, { kind: "author" })} /></main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><ResearchProvider><Review /></ResearchProvider></AuthProvider></BrowserRouter>);
