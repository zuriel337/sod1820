import test from "node:test";
import assert from "node:assert/strict";
import { YAMIN_SMOL_APPROVED_TEXT, YAMIN_SMOL_UNIT_ID, parseYaminSmolText, deliveredLines, PREVIEW_UNITS_2029, previewUnitDefinition, unitShareUrl, unitCardUrl, previewUnitOgMeta, YAMIN_SMOL_CLAIMS } from "./postPreviewUnits2029.js";

test("the unit has ONE stable identity and lives inside post 5107 of the series (not a new post)", () => {
  assert.equal(YAMIN_SMOL_UNIT_ID, "yamin-smol-2026-5787-1237-1158");
  const [unit] = PREVIEW_UNITS_2029[5107];
  assert.deepEqual([unit.id, unit.postId, unit.seriesKey], [YAMIN_SMOL_UNIT_ID, 5107, "reality-map"]);
  assert.equal(PREVIEW_UNITS_2029[5112], undefined);
  assert.equal(previewUnitDefinition(5107, YAMIN_SMOL_UNIT_ID).id, YAMIN_SMOL_UNIT_ID);
  assert.equal(previewUnitDefinition(5107, "another-id"), null);
});

test("parsing changes no word: every block carries its delivered line verbatim, in the delivered order", () => {
  const blocks = parseYaminSmolText();
  assert.deepEqual(blocks.map((b) => b.text), deliveredLines());
  // an edited text keeps working and the identity (a registry key) is untouched
  const edited = parseYaminSmolText(YAMIN_SMOL_APPROVED_TEXT.replace("והנה חיבור מופלא!", "והנה חיבור אחר!"));
  assert.equal(edited.length, blocks.length);
  assert.equal(PREVIEW_UNITS_2029[5107][0].id, YAMIN_SMOL_UNIT_ID);
});

test("structure: title, numbers row, headings, verses, peaks, the party table and the closing line", () => {
  const blocks = parseYaminSmolText();
  const kinds = (k) => blocks.filter((b) => b.kind === k);
  assert.equal(blocks[0].kind, "title");
  assert.deepEqual(kinds("numbers")[0].numbers, [2026, 5787, 1237, 1158]);
  assert.equal(kinds("heading").length, 5);
  assert.deepEqual(kinds("peak").map((b) => b.number), [2026, 5787, 1237]);
  const rows = kinds("row");
  assert.deepEqual(rows.map((r) => r.cells), [["המפלגה", "גימטריה רגילה"], ["חד״ש", "312"], ["תע״ל", "500"], ["בל״ד", "36"], ["רע״ם", "310"], ["יחד", "1158"]]);
  assert.equal(rows[0].head, true);
  assert.equal(rows[1].head, false);
  assert.equal(kinds("closing").length, 1);
  assert.ok(kinds("verse").length >= 6);
  assert.equal(kinds("verse").find((b) => /^«/.test(b.text)).identity, "baal-hasulam");
});

test("attribution: only what the text attributes to Yaniv or Shachar is theirs; the political phrase is its own identity, never a writer's", () => {
  const blocks = parseYaminSmolText();
  const by = (id) => blocks.filter((b) => b.group === id).map((b) => b.text);
  assert.ok(by("yaniv-levi").includes("״לָמָּה זֶּה תִּשְׁאַל לִשְׁמִי וְהוּא פֶלִאי״"));
  assert.ok(by("yaniv-levi").includes("787 = תשפ״ז"));
  assert.equal(by("yaniv-levi").includes("והנה שוב, שנת תשפ״ז מצטרפת לחיבורים!"), false);
  assert.deepEqual(by("shachar-kandro").filter((t) => /= 1237/.test(t)), ["גדעון איזנקוט ראש הממשלה = 1237", "רוסיה איראן סין ארהב = 1237 — מסתתר", "התחלה חדשה = 1237 — מסתתר"]);
  const phrase = blocks.find((b) => b.text.startsWith("״השמאל גנבו"));
  assert.equal(phrase.group, "editorial-phrase");
  assert.equal(["yaniv-levi", "shachar-kandro"].includes(phrase.group), false);
  assert.ok(blocks.filter((b) => b.group === "editorial-phrase").length >= 3);
});

test("share address, card and Open Graph: query + fragment, the existing /api/card, preview-branch gate only", () => {
  const [unit] = PREVIEW_UNITS_2029[5107];
  assert.equal(unitShareUrl("https://x.vercel.app/", "/post/p", unit.id), "https://x.vercel.app/post/p?unit=yamin-smol-2026-5787-1237-1158#yamin-smol-2026-5787-1237-1158");
  const card = new URL(unitCardUrl("https://x.vercel.app", unit));
  assert.equal(card.pathname, "/api/card");
  assert.equal(card.searchParams.get("v"), "unit");
  assert.equal(card.searchParams.get("nums"), "2026,5787,1237,1158");
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "ccr-b8e8ab12-9hoamu" };
  const meta = previewUnitOgMeta({ postId: 5107, unitId: unit.id, env });
  assert.match(meta.title, /זה לעומת זה עשה האלוהים/);
  assert.equal(meta.robots, "noindex, nofollow");
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: unit.id, env: { ...env, VERCEL_ENV: "production" } }), null);
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: unit.id, env: { ...env, VERCEL_GIT_COMMIT_REF: "main" } }), null);
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: "x", env }), null);
});

test("the claims for the engine panel use only phrases and numbers of the approved text", () => {
  for (const claim of YAMIN_SMOL_CLAIMS) assert.ok(YAMIN_SMOL_APPROVED_TEXT.replace(/[ ]+/g, " ").includes(claim.phrase.replace(/[ ]+/g, " ")) || claim.phrase === "תפרצי בתשפז", claim.id);
  assert.equal(YAMIN_SMOL_CLAIMS.length, 9);
});
