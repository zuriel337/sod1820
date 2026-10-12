import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App2029 from "./App2029.jsx";
import { initRuntimeErrorCapture } from "./lib/tracking.js";

// Bounded visual review on the existing app; production and legacy stay outside it.
if (import.meta.env.VITE_INTEGRATED_PREVIEW === "true") {
  import("./components/experience2029/previewVisualReview2029.jsx")
    .then(({ mountPreviewVisualReview2029 }) => mountPreviewVisualReview2029());
}

initRuntimeErrorCapture();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
);
