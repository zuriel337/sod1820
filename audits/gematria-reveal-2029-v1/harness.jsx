// AUDIT-ONLY harness. Fixture values below are TEST FIXTURE VALUES, not canonical live verification.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GematriaReveal2029 from "../../src/components/gematria2029/GematriaReveal2029.jsx";
import { PALETTES } from "../../src/lib/palette.js";

const L = PALETTES.lab;
const vars = {
  "--s29-page": L.pageBg, "--s29-panel": L.card, "--s29-panel-soft": L.cardSoft, "--s29-line": L.border,
  "--s29-line-strong": L.borderStrong, "--s29-ink": L.ink, "--s29-muted": L.inkSoft, "--s29-accent": L.accent,
};
const selection = { expression: "שביעי באוקטובר", methodKey: "רגיל", methodLabel: "רגיל", resultValue: 718 };
const letters = [["ש",300],["ב",2],["י",10],["ע",70],["י",10],["ב",2],["א",1],["ו",6],["ק",100],["ט",9],["ו",6],["ב",2],["ר",200]];
let run = 0;
const steps = letters.map(([token, c]) => ({ scope: "letter", token, contribution: c, running_subtotal: (run += c) }));
const finding = { projection: { dimensions: { trace: { input: selection.expression, methodKey: selection.methodKey, result: 718, steps } } } };

function App() {
  const [trace, setTrace] = useState({ loading: false, finding: null, error: null, key: null });
  return (
    <div style={{ ...vars, minHeight: "100vh", background: L.pageBg, color: L.ink, padding: "24px 16px", boxSizing: "border-box", fontFamily: "system-ui, 'Noto Sans Hebrew', sans-serif" }}>
      <GematriaReveal2029 selection={selection} trace={trace}
        onToggleTrace={() => setTrace(t => t.finding ? { ...t, finding: null } : { ...t, finding })} />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
