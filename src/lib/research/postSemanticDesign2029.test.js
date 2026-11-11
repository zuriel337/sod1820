import test from "node:test";
import assert from "node:assert/strict";
import { classifyText, isDisplaySize, SEMANTIC_LEGEND, annotatePostSource, readLocalUnitChoices } from "./postSemanticDesign2029.js";

test("smart centering: titles, numbers, verses and peak moments centre; long text stays readable", () => {
  assert.deepEqual(classifyText({ tag: "h2", text: "ממשלת משיח בן דוד = 1234" }), { role: "title", align: "center" });
  assert.deepEqual(classifyText({ tag: "p", text: "1234", styleText: "font-size:clamp(2.4rem,10vw,4.5rem);font-weight:900" }), { role: "peak", align: "center" });
  assert.deepEqual(classifyText({ tag: "p", text: "77.7%" }), { role: "number", align: "center" });
  assert.equal(classifyText({ tag: "p", text: "״כִּי שִׁבְעָתַיִם יֻקַּם קָיִן, וְלֶמֶךְ שִׁבְעִים וְשִׁבְעָה״" }).role, "verse");
  assert.equal(classifyText({ tag: "p", text: "״על אדום אשליך נעלי״" }).role, "verse");
  const long = "בסרטון שרשר מציג את הנעליים שלו ואומר שיש לו שישים ושש זוגות. האמירה הזאת מצטרפת לחיבור המספרי בן דוד שווה שישים ושש.";
  assert.deepEqual(classifyText({ tag: "p", text: long, authoredCenter: true }), { role: "prose", align: "start" });
  assert.equal(classifyText({ tag: "p", text: "מקורות: תאריך הלידה — ערוץ כנסת" }).role, "source");
  assert.deepEqual(classifyText({ tag: "p", text: "כותרת קצרה", authoredCenter: true }), { role: "short", align: "center" });
  assert.deepEqual(classifyText({ tag: "p", text: "", hasMedia: true }), { role: "media", align: "center" });
  assert.equal(classifyText({ tag: "p", text: "   " }).role, null);
});

test("display size needs a real large font size", () => {
  assert.equal(isDisplaySize("font-size:clamp(2.4rem,10vw,4.5rem)"), true);
  assert.equal(isDisplaySize("font-size:36px"), true);
  assert.equal(isDisplaySize("font-size:1.08rem"), false);
  assert.equal(isDisplaySize(""), false);
});

test("one legend: added/event/source time axes and the three engine states are distinct, the unchecked state is neutral", () => {
  const keys = SEMANTIC_LEGEND.map((item) => item.key);
  assert.deepEqual(keys, ["added", "event", "source", "peak", "unchecked", "verified", "mismatch"]);
  assert.equal(new Set(SEMANTIC_LEGEND.map((item) => item.symbol)).size, SEMANTIC_LEGEND.length);
  assert.match(SEMANTIC_LEGEND.find((item) => item.key === "unchecked").detail, /ניטרלי/);
  assert.match(SEMANTIC_LEGEND.find((item) => item.key === "verified").detail, /אינו אימות פרשנות/);
});

test("no DOM, no change: the stored HTML passes through, and preview-local choices degrade to empty", () => {
  assert.equal(annotatePostSource("<p>שלום</p>", { postId: 5107 }), "<p>שלום</p>");
  assert.deepEqual(readLocalUnitChoices(5107), {});
});
