import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App2029 from "./App2029.jsx";
import { initRuntimeErrorCapture } from "./lib/tracking.js";
import { installAppRecovery2029 } from "./lib/appRecovery2029.js";
import "./lib/homeAtmospherePreload2029.js";
import "./lib/installOffer2029.js";

// Bounded visual review on the existing app; production and legacy stay outside it.
if (import.meta.env.VITE_INTEGRATED_PREVIEW === "true") {
  import("./components/experience2029/previewVisualReview2029.jsx")
    .then(({ mountPreviewVisualReview2029 }) => mountPreviewVisualReview2029());
}

initRuntimeErrorCapture();
// A lazy chunk that disappears after a new deployment reloads once (guarded per entry build) instead of blanking the app.
// The entry's own URL identifies the build; the worker/bootstrap handshake is not involved.
installAppRecovery2029({ entryKey: import.meta.url });

const root = createRoot(document.getElementById("root"));
const startupMark = name => { try { performance.mark(`sod2029:${name}`); } catch { /* optional local measurement */ } };
async function warmLocalFonts() {
  startupMark("font-warm-start");
  if (!document.fonts?.load) { startupMark("font-warm-settled"); return; }
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
    startupMark("font-warm-settled");
  }
}

// Local fonts are preloaded by 2029.html. Warming is progressive: a missing or
// slow font cannot hold routing, data admission or the first usable application.
// Existing font-display/fallbacks remain; combined browser acceptance checks CLS.
void warmLocalFonts().catch(() => {});
startupMark("render-requested");
root.render(
  <StrictMode>
    <App2029 />
  </StrictMode>,
);
