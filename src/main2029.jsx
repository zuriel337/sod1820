import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App2029 from "./App2029.jsx";
import { prepareRuntimeErrorCapture2029 } from "./lib/runtimeErrorCollector2029.js";
import { prepareWebVitals2029 } from "./lib/webVitals2029.js";

// Bounded visual review on the existing app; production and legacy stay outside it.
if (import.meta.env.VITE_INTEGRATED_PREVIEW === "true") {
  import("./components/experience2029/previewVisualReview2029.jsx")
    .then(({ mountPreviewVisualReview2029 }) => mountPreviewVisualReview2029());
}

// Begin memory-only observation before React paints. The existing fx_analytics
// effect in App2029 authorizes emission only after the production switch resolves.
prepareWebVitals2029();
prepareRuntimeErrorCapture2029();

const root = createRoot(document.getElementById("root"));
// Text paints in the fallback face and swaps (font-display: swap); the first render never waits for font files.
root.render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
);
