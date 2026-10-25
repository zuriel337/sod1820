import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import { use2029Palette } from "../../src/lib/palette.js";
import WatchButton from "../../src/components/WatchButton.jsx";

// Test-only: the REAL WatchButton variant 2029 with a saved guest follow, so the REAL EmailVerify identity slot renders.
// Follow I/O is an instance fake; every external request is blocked or answered by the test harness (no mail, no OTP, no write).
const TOPIC = "author:בדיקה";
const tokens = (p) => ({
  "--s29-ink": p.ink, "--s29-muted": p.inkSoft, "--s29-line": p.border, "--s29-line-strong": p.borderStrong, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft,
  "--s29-accent": p.accent, "--s29-accent-text": p.accentText, "--s29-accent-btn": p.accentBtn, "--s29-on-accent": p.onAccent, "--s29-focus-ring": p.focusRing,
  "--s29-discovery": p.accentDiscovery, "--s29-font-ui": "Rubik, Arial, sans-serif", "--s29-type-micro": "14px", "--s29-type-ui": "16px", "--s29-type-small": "16px", "--s29-type-body": "18px",
});
function Review() {
  const palette = use2029Palette();
  const io = useMemo(() => ({ read: async () => ({ topics: [TOPIC], channels: [] }), toggle: async () => ({ ok: true }), track: () => {} }), []);
  return <main dir="rtl" style={{ ...tokens(palette), background: palette.pageBg, color: palette.ink, padding: 16, minHeight: "100vh" }}>
    <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 16 }}>
      <WatchButton variant="2029" topic={TOPIC} source="identity-slot-fixture" label="מעקב בדיקה" noPush followIO={io} />
    </div>
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Review /></AuthProvider></BrowserRouter>);
