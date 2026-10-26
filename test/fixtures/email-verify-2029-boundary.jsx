import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import { use2029Palette } from "../../src/lib/palette.js";
import WatchButton from "../../src/components/WatchButton.jsx";
import EmailVerify from "../../src/components/EmailVerify.jsx";
import "../../src/components/experience2029/systemFrame2029.css";

// Real canonical components and native-frame focus baseline; transport is intercepted by the browser test.
const TOPIC = "author:בדיקה";
window.__emailVerifyBoundary = { verified: 0 };
function Review() {
  const palette = use2029Palette();
  const mode = new URLSearchParams(location.search).get("mode") || "watch";
  const io = useMemo(() => ({ read: async () => ({ topics: [TOPIC], channels: [] }), toggle: async () => ({ ok: true }), track: () => {} }), []);
  const tokens = {
    "--s29-ink": palette.ink, "--s29-muted": palette.inkSoft, "--s29-line": palette.border,
    "--s29-line-strong": palette.borderStrong, "--s29-panel": palette.card, "--s29-panel-soft": palette.cardSoft,
    "--s29-accent": palette.accent, "--s29-accent-text": palette.accentText, "--s29-accent-btn": palette.accentBtn,
    "--s29-on-accent": palette.onAccent, "--s29-focus-ring": palette.focusRing, "--s29-discovery": palette.accentDiscovery,
    "--s29-type-micro": "14px", "--s29-type-ui": "16px", "--s29-type-small": "16px", "--s29-type-body": "18px",
  };
  return <main dir="rtl" className="sod29-root native-frame" style={{ ...tokens, background: palette.pageBg, color: palette.ink, padding: 16, minHeight: "100vh" }}>
    {mode === "watch" ? <WatchButton variant="2029" topic={TOPIC} source="email-boundary-fixture" noPush followIO={io} />
      : <EmailVerify variant={mode === "legacy" ? undefined : "2029"}
        source={mode === "optout" ? "site" : "follow:email-boundary-fixture"}
        subscribeToUpdates={mode === "optout" ? false : undefined}
        onVerified={() => { window.__emailVerifyBoundary.verified++; }} />}
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Review /></AuthProvider></BrowserRouter>);
