import React from "react";
import { useLocation } from "react-router-dom";
import ResearchViewerLegacy from "./ResearchViewerLegacy.jsx";
import CommandCenterNextPage from "./CommandCenterNextPage.jsx";

// Preserve Research Viewer v0 at its existing URL. The new Command Center is an experimental
// Projection over the same live sources and is opt-in via /research-viewer?mode=command.
export default function ResearchViewerV0Page() {
  const { search } = useLocation();
  const mode = new URLSearchParams(search).get("mode");
  return mode === "command" ? <CommandCenterNextPage /> : <ResearchViewerLegacy />;
}
