import React from "react";
import CoreOrGeulaStoryColumn from "../OrGeulaStoryColumnCore.jsx";
import StoryViewerOnDemand2029 from "./StoryViewerOnDemand2029.jsx";

// The 2029 Companion's public-source shortcut: the same canonical rail and reader as ../OrGeulaStoryColumn.jsx, with the story viewer
// requested when a story is opened instead of with the shell. Legacy consumers keep the static viewer through ../OrGeulaStoryColumn.jsx.
export default function OrGeulaSourceShortcut2029(props) {
  return <CoreOrGeulaStoryColumn {...props} Viewer={StoryViewerOnDemand2029} />;
}
