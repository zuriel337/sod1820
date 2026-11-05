import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WorldMapShell2029 from "../../src/components/research/WorldMapShell2029.jsx";
import { buildPublicWorldContentProjectionV1 } from "../../src/lib/research/publicWorldContentProjectionV1.js";
import { universalFindingId } from "../../src/lib/research/universalFinding.js";
import { resolve2029Palette } from "../../src/lib/palette.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import "../../src/components/experience2029/systemFrame2029.css";

const params = new URLSearchParams(location.search);
const preset = params.get("theme") || "light";
const palette = resolve2029Palette(preset);
const source = "channel_updates:e720a119-00e7-4e27-8c8a-d8671ae7b474";
const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const fid = (id) => universalFindingId({ kind: "research-object", sourceIdentity: { researchObjectId: id }, subjectKey: id });
const projection = buildPublicWorldContentProjectionV1({
  sources: [{ sourceRef: source, title: "מקור מחקר לדוגמה", contributor: { slug: "fixture", label: "צבי", href: null } }],
  occurrences: [{ occurrenceRef: "fixture:occ:1", sourceRef: source, locator: "#raw-internal-location", href: "/world?source=one" }],
  findings: [
    { findingRef: fid(first), sourceRefs: [source], href: `/world?finding=${first}`, stage: "claim", verificationState: "match", publicationState: "approved" },
    { findingRef: fid(second), sourceRefs: [source], href: `/world?finding=${second}`, stage: null, verificationState: null, publicationState: "canonical" },
  ],
  treeRelations: [{ findingRef: fid(first), targetRef: "node:00000000-0000-4000-8000-000000000099", edgeRef: "edge:fixture-raw-1" }],
});
const style = {
  background: palette.pageBg, color: palette.ink, minHeight: "100vh", padding: 12, boxSizing: "border-box",
  "--s29-page": palette.pageBg, "--s29-panel": palette.card, "--s29-panel-soft": palette.cardSoft,
  "--s29-line": palette.border, "--s29-line-strong": palette.borderStrong, "--s29-ink": palette.ink,
  "--s29-muted": palette.inkSoft, "--s29-accent-text": palette.accentText, "--s29-focus-ring": palette.focusRing,
  "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body, "--s29-font-display": TYPEFACE.display,
};
for (const [key, value] of Object.entries(TYPE_SCALE_V2)) style[`--s29-type-${key}`] = `${value.fontSize}px`;
createRoot(document.getElementById("root")).render(
  <BrowserRouter><main className="sod29-root surface-world" style={style}>
    <WorldMapShell2029 projection={projection} humanReadable={params.get("human") === "1"}
      findingLabelsByRef={{ [fid(first)]: "אור ושבת", [fid(second)]: "00000000-0000-4000-8000-000000000002" }} />
  </main></BrowserRouter>,
);
