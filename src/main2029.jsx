import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App2029 from "./App2029.jsx";
import { initRuntimeErrorCapture } from "./lib/tracking.js";
import { startEarlyContent2029 } from "./lib/earlyContent2029.js";

// Bounded visual review on the existing app; production and legacy stay outside it.
if (import.meta.env.VITE_INTEGRATED_PREVIEW === "true") {
  import("./components/experience2029/previewVisualReview2029.jsx")
    .then(({ mountPreviewVisualReview2029 }) => mountPreviewVisualReview2029());
}

initRuntimeErrorCapture();
if (import.meta.env.VITE_INTEGRATED_PREVIEW !== "true") startEarlyContent2029(window.location.pathname);

const root = createRoot(document.getElementById("root"));
// Text paints in the fallback face and swaps (font-display: swap); the first render never waits for font files.
root.render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
);
