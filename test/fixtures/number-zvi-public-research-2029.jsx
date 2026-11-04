import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import NumberZviPublicResearch2029 from "../../src/components/number2029/NumberZviPublicResearch2029.jsx";
import { resolve2029Palette } from "../../src/lib/palette.js";
import { TYPEFACE, TYPE_SCALE_V2 } from "../../src/lib/designTokens.js";
import "../../src/components/experience2029/systemFrame2029.css";
import "../../src/components/number2029/numberLivingWorld2029.css";
import "../../src/components/research/WorldZviApprovedFindings2029.css";

// All content and identities are synthetic. The actual reader's privacy and
// source filters are verified separately in focused unit tests.
const fixture = { calls: [], principal: "guest", fail: false };
window.__numberZviFixture = fixture;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clientFactory = () => ({ role: "anon" });
const row = (n, title, extra = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  title, kindLabel: "טענת מחקר", contributor: "כותב לדוגמה", status: "approved",
  findingHref: `/world?finding=00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  sourceHref: `/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A00000000-0000-4000-8000-000000000101#source-occurrence-00000000-0000-4000-8000-000000000101`,
  ...extra,
});
async function reader({ client, value, cursor }) {
  fixture.calls.push({ role: client.role, value, cursor: cursor || null, principal: fixture.principal });
  const forValue = (n, title, extra = {}) => row(n, title, { claimedNumber: value, ...extra });
  if (value === 224) {
    await wait(900);
    return { rows: [forValue(224, "תוצאה ממתינה לחשבון הקודם")], hasMore: false, nextCursor: null };
  }
  if (value === 999 && fixture.fail) throw new Error("synthetic reader error");
  await wait(100);
  if (value === 0) return { rows: [forValue(0, "אפס מפורש")], hasMore: false, nextCursor: null };
  if (value === 999) return { rows: [forValue(999, "ניסיון חוזר הצליח")], hasMore: false, nextCursor: null };
  if (cursor) return { rows: [forValue(3, "ממצא בדיקה שלישי")], hasMore: false, nextCursor: null };
  return {
    rows: [
      forValue(1, "ממצא בדיקה ראשון"),
      forValue(2, "OCR בדיקה", { ocrNeedsReview: true }),
      forValue(8, "כתובת מומצאת לא תוצג", { findingHref: "https://example.invalid/anything" }),
      forValue(97, "מספר אחר לא יוצג", { claimedNumber: 787 }),
      forValue(98, "מועמד לא להציג", { status: "candidate" }),
      forValue(99, "מידע פרטי לא להציג", { privacy_scope: "private" }),
    ],
    hasMore: true, nextCursor: { id: "00000000-0000-4000-8000-000000000002", createdAt: "2026-10-29T12:00:00Z" },
    omittedUnavailable: true, omittedForReview: true,
  };
}

const preset = localStorage.getItem("number-zvi-fixture-theme") || "light";
const palette = resolve2029Palette(preset);
const style = {
  "--s29-page": palette.pageBg, "--s29-panel": palette.card,
  "--s29-panel-soft": palette.card, "--s29-line": palette.border,
  "--s29-line-strong": palette.borderStrong, "--s29-ink": palette.ink,
  "--s29-muted": palette.inkSoft, "--s29-accent-text": palette.accentText,
  "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body,
  "--s29-font-display": TYPEFACE.display, "--s29-type-micro": `${TYPE_SCALE_V2.micro.fontSize}px`,
  "--s29-type-ui": `${TYPE_SCALE_V2.ui.fontSize}px`, "--s29-type-small": `${TYPE_SCALE_V2.small.fontSize}px`,
  "--s29-type-body": `${TYPE_SCALE_V2.body.fontSize}px`, "--s29-type-title": `${TYPE_SCALE_V2.title.fontSize}px`,
};
function App() {
  const [value, setValue] = useState(786);
  const [principal, setPrincipal] = useState("guest");
  return <main className="sod29-root surface-number" dir="rtl" style={style}>
    <div aria-label="בקרת בדיקה">
      {[786, 224, 0, 999].map((n) => <button key={n} type="button" data-test={`number-${n}`} onClick={() => setValue(n)}>{n}</button>)}
      {["guest", "user", "admin"].map((name) => <button key={name} type="button" data-test={`principal-${name}`} onClick={() => { fixture.principal = name; setPrincipal(name); }}>{name}</button>)}
      <span data-test="principal">{principal}</span><span data-test="current-value">{value}</span>
    </div>
    <NumberZviPublicResearch2029 value={value} reader={reader} clientFactory={clientFactory} />
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><App /></BrowserRouter>);
