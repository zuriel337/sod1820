// The ONE place the left Companion is mounted again — PREVIEW ONLY, on a "מפת המציאות" Post (ZURIEL 12.11.2026, section 10).
// SystemFrame2029 only renders this when useCompanionPreview2029 says it is active (preview build flag + series Post + desktop width);
// everywhere else the Companion stays unmounted as ZURIEL decided on 1.11.2026. It replaces the context rail, never adds a second one.
import React from "react";
const CompanionPanel2029 = React.lazy(() => import("./CompanionPanel2029.jsx"));
export default function CompanionPreviewMount2029(props) {
  return <React.Suspense fallback={null}><CompanionPanel2029 {...props} /></React.Suspense>;
}
