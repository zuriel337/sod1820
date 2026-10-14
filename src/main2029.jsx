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

const root = createRoot(document.getElementById("root"));
async function warmLocalFonts() {
  if (!document.fonts?.load) return;
  let timeout;
  try {
    await Promise.race([
      Promise.allSettled([
        document.fonts.load('400 16px "Noto Sans Hebrew"', "אבג"),
        document.fonts.load('700 16px "Noto Sans Hebrew"', "אבג"),
        document.fonts.load('700 16px Rubik', "אבג"),
        document.fonts.load('700 16px Rubik', "1237"),
      ]),
      new Promise((resolve) => { timeout = window.setTimeout(resolve, 1500); }),
    ]);
  } finally {
    window.clearTimeout(timeout);
  }
}

warmLocalFonts().catch(() => {}).finally(() => root.render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
));
