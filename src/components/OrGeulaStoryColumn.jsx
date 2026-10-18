import React from "react";
import StoryViewer from "./StoryViewer.jsx";
import { registerStaticStoryViewer } from "./experience2029/storyViewerRegistry2029.js";
import CoreOrGeulaStoryColumn, { MergedStoriesRail as CoreMergedStoriesRail, LandingDiscoveryStories as CoreLandingDiscoveryStories } from "./OrGeulaStoryColumnCore.jsx";

// Legacy-facing entry of the story rail (src/legacy/legacy.jsx): the canonical StoryViewer is bound statically, exactly as it was loaded before.
// The 2029 shortcut does not come through here: it binds the on-demand viewer (./experience2029/OrGeulaSourceShortcut2029.jsx), so that the
// shell does not carry the viewer. The implementation lives in ./OrGeulaStoryColumnCore.jsx.
registerStaticStoryViewer(StoryViewer);   // the 2029 shell inside this build opens the viewer that is already here
export { BRAND_OR_GEULA, BRAND_TZOFON } from "./OrGeulaStoryColumnCore.jsx";
export const MergedStoriesRail = (props) => <CoreMergedStoriesRail {...props} Viewer={StoryViewer} />;
export const LandingDiscoveryStories = (props) => <CoreLandingDiscoveryStories {...props} Viewer={StoryViewer} />;
export default function OrGeulaStoryColumn(props) {
  return <CoreOrGeulaStoryColumn {...props} Viewer={StoryViewer} />;
}
