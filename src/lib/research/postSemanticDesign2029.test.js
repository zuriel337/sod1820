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

test("the unit record keeps design, message and references in ONE record; a main message needs words; nothing outside the flag is read", async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const { writeLocalUnitChoice, resolveUnitMessage, readLocalUnitChoices, subscribeUnitChoices } = await import("./postSemanticDesign2029.js");
  let notified = 0;
  const off = subscribeUnitChoices(() => { notified += 1; });
  writeLocalUnitChoice(5107, "knesset-sworn-1234-1011", { message: "1437 = משיח הויה", primary: true, align: "center", refs: [{ kind: "number", ref: "number:1437", href: "/number/1437", mode: "highlight" }] });
  assert.equal(resolveUnitMessage(5107, "knesset-sworn-1234-1011"), "1437 = משיח הויה");
  assert.equal(notified, 1);
  assert.equal(readLocalUnitChoices(5107)["knesset-sworn-1234-1011"].refs.length, 1);
  // not flagged primary → no main message; primary without words → dropped
  writeLocalUnitChoice(5107, "u2", { message: "טיוטה", primary: false });
  assert.equal(resolveUnitMessage(5107, "u2"), null);
  writeLocalUnitChoice(5107, "u3", { primary: true });
  assert.equal(readLocalUnitChoices(5107).u3, undefined);
  // back to automatic removes the record entirely
  writeLocalUnitChoice(5107, "knesset-sworn-1234-1011", { align: "auto", peak: "auto", message: "", primary: false, refs: [] });
  assert.equal(readLocalUnitChoices(5107)["knesset-sworn-1234-1011"], undefined);
  off();
  delete globalThis.localStorage;
});
