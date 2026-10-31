import React from "react";
import StoryViewer from "./StoryViewer.jsx";
import CoreOrGeulaStoryColumn, { MergedStoriesRail as CoreMergedStoriesRail, LandingDiscoveryStories as CoreLandingDiscoveryStories } from "./OrGeulaStoryColumnCore.jsx";

// Existing Legacy entry: same canonical rail/reader, same static viewer.
// The 2029 Companion injects its on-demand viewer into this one implementation.
export { BRAND_OR_GEULA, BRAND_TZOFON } from "./OrGeulaStoryColumnCore.jsx";
export function MergedStoriesRail(props) { return <CoreMergedStoriesRail {...props} Viewer={StoryViewer} />; }
export function LandingDiscoveryStories(props) { return <CoreLandingDiscoveryStories {...props} Viewer={StoryViewer} />; }
export default function OrGeulaStoryColumn(props) { return <CoreOrGeulaStoryColumn {...props} Viewer={StoryViewer} />; }
