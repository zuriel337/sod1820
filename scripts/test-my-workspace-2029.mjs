import assert from "node:assert/strict";
import fs from "node:fs";

const frame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const css = fs.readFileSync("src/components/experience2029/myWorkspace2029.css", "utf8");

for (const label of [
  "המרחב האישי שלי",
  "החשבון שלי",
  "הדף שלי",
  "המחקר שלי",
  "ההתקדמות שלי",
  "הודעות ועדכונים",
  "מסע החיים שלי",
  "הרמזים שלי",
  "התרומות שלי",
  "הקרדיטים שלי",
  "הצפנים שלי",
  "החיבור לרזיאל",
]) assert.match(frame, new RegExp(label));

assert.match(frame, /go\("\/2029\/journey"\)/);
assert.match(frame, /data-workspace-section="research"/);
assert.match(frame, /שמירה · חזרה מדויקת/);
assert.match(frame, /בבנייה/);

// Native 2029 workspace must not import or route into the legacy UserCenter as its target UI.
assert.doesNotMatch(frame, /UserCenter/);
assert.doesNotMatch(frame, /goto?\("\/profile/);

// Old five-world taxonomy was historical and must not reappear as the native home.
for (const legacy of ["העולם שלי", "המעבדה שלי", "הסוכן האישי", "הקהילה שלי", "היצירה שלי"]) {
  assert.doesNotMatch(frame, new RegExp(legacy));
}

assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
assert.match(css, /\.sod29-workspace-core-grid/);
assert.match(css, /@media\(max-width:640px\)/);

console.log("My Workspace 2029 native home contract: PASS");
