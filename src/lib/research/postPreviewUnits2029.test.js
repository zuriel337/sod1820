import test from "node:test";
import assert from "node:assert/strict";
import { YAMIN_SMOL_TEXT_20261112 } from "./fixtures/yaminSmolText20261112.js";
import { YAMIN_SMOL_APPROVED_TEXT, parseFieldLine, YAMIN_SMOL_UNIT_ID, parseYaminSmolText, deliveredLines, PREVIEW_UNITS_2029, previewUnitDefinition, unitShareUrl, unitCardUrl, previewUnitOgMeta, YAMIN_SMOL_CLAIMS, YAMIN_SMOL_SOURCES } from "./postPreviewUnits2029.js";

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
  const edited = parseYaminSmolText(YAMIN_SMOL_APPROVED_TEXT.replace("זהו מספר השנה העברית תשפ״ז.", "זו השנה העברית תשפ״ז."));
  assert.equal(edited.length, blocks.length);
  assert.equal(PREVIEW_UNITS_2029[5107][0].id, YAMIN_SMOL_UNIT_ID);
});

test("the 16.11.2026 text: the title, the by-lines, the system voice in the ✦ mark, and no bracketed note", () => {
  const lines = deliveredLines();
  assert.equal(lines.some((l) => /^\[|\]$/.test(l)), false);
  assert.equal(lines[0], "ימין ושמאול תפרצי מדהים!!! רמזים חזקים ביותר");
  assert.deepEqual(lines.filter((l) => /^מאת:/.test(l)), ["מאת: יניב לוי", "מאת: יצחק שחר קנדרו"]);
  assert.deepEqual(lines.filter((l) => /^✦ .* ✦$/.test(l)), ["✦ אנחנו רואים שהשנה הזאת בסימן של פריצה של השמאל ✦", "✦ אנחנו רואים שהמציאות מדברת ✦"]);
  assert.equal(lines.some((l) => /דבר המערכת|המערכת:/.test(l)), false, "the system voice is never labelled as the system");
  assert.equal(lines[lines.length - 1], "ומכאן עולה רמז יפה לאחדות ישראל.");
});

test("structure: title, numbers row, by-lines, plain headings, the verse, the connection lines, Shachar's lines, the party table with Baal HaSulam", () => {
  const blocks = parseYaminSmolText();
  const kinds = (k) => blocks.filter((b) => b.kind === k);
  assert.equal(blocks[0].kind, "title");
  assert.equal(blocks[1].kind, "numbers", "the numbers row follows the title directly: no subtitle is invented");
  assert.deepEqual(kinds("numbers")[0].numbers, [2026, 5787, 1237, 566, 1158]);
  assert.deepEqual(kinds("heading").map((b) => b.text), ["חיבור ראשון — 2026", "חיבור שני — 5787", "ארבע המפלגות הערביות", "ומהו הסוד של שישים ריבוא?"]);
  assert.deepEqual(kinds("closing").map((b) => b.text), ["✦ אנחנו רואים שהשנה הזאת בסימן של פריצה של השמאל ✦", "✦ אנחנו רואים שהמציאות מדברת ✦"]);
  assert.equal(kinds("kicker").length, 0);
  const fields = kinds("claim").map((b) => parseFieldLine(b.text)).filter(Boolean);
  assert.deepEqual(fields.map((c) => [c.label, c.value]), [["הביטוי", "ימין ושמאול תפרצי"], ["השיטה", "מילוי"], ["התוצאה", "2026"], ["הביטוי", "תפרצי בתשפז"], ["השיטה", "ריבוע"], ["התוצאה", "5787"]]);
  assert.deepEqual(kinds("claim").filter((b) => !parseFieldLine(b.text)).map((b) => b.text), ["גדעון איזנקוט ראש הממשלה = 1237", "רוסיה איראן סין ארהב = 1237 מסתתר", "התחלת הגאולה = 1237", "התגלות = 1237", "מתן כהנא = 566", "משיח בן יוסף = 566"]);
  assert.equal(parseFieldLine("השיטה: מילוי").number, null);
  assert.equal(parseFieldLine("זהו משפט: רגיל"), null);
  const rows = kinds("row");
  assert.deepEqual(rows.map((r) => r.cells), [["ראשי תיבות", "ערך"], ["חד״ש", "312"], ["תע״ל", "500"], ["בל״ד", "36"], ["רע״ם", "310"], ["סך הכול", "1158"]]);
  assert.equal(rows.slice(1, 5).reduce((sum, r) => sum + Number(r.cells[1]), 0), Number(rows[5].cells[1]), "the four party values add up to the stated total");
  assert.deepEqual(kinds("verse").map((b) => b.text), ["״כִּי יָמִין וּשְׂמֹאול תִּפְרֹצִי״", "«״שבאמת אין בעולם יותר מנשמה אחת״»"]);
  assert.deepEqual(kinds("verse").map((b) => b.identity), ["scripture", "baal-hasulam"]);
  assert.equal(blocks.find((b) => b.text === "מאת: יניב לוי").kind, "p");
});

test("attribution: the by-lines are the unit's own wording; no writer group is opened by the machinery (a group needs the exact opening line of the writer's message text)", () => {
  const blocks = parseYaminSmolText();
  assert.equal(blocks.some((b) => b.group), false);
});

test("attribution rules still work for a text that opens a group (the 12.11.2026 fixture): only what the text attributes to Yaniv or Shachar is theirs", () => {
  const blocks = parseYaminSmolText(YAMIN_SMOL_TEXT_20261112);
  const by = (id) => blocks.filter((b) => b.group === id).map((b) => b.text);
  assert.ok(by("yaniv-levi").includes("״לָמָּה זֶּה תִּשְׁאַל לִשְׁמִי וְהוּא פֶלִאי״"));
  assert.ok(by("yaniv-levi").includes("787 = תשפ״ז"));
  assert.equal(by("yaniv-levi").includes("והנה שוב, שנת תשפ״ז מצטרפת לחיבורים!"), false);
  assert.deepEqual(by("shachar-kandro").filter((t) => /= 1237/.test(t)), ["גדעון איזנקוט ראש הממשלה = 1237", "רוסיה איראן סין ארהב = 1237 — מסתתר", "התחלה חדשה = 1237 — מסתתר"]);
  const phrase = blocks.find((b) => b.text.startsWith("״השמאל גנבו"));
  assert.equal(phrase.group, "editorial-phrase");
  assert.equal(["yaniv-levi", "shachar-kandro"].includes(phrase.group), false);
  assert.equal(blocks.filter((b) => b.kind === "heading").length, 5);
  assert.deepEqual(blocks.filter((b) => b.kind === "peak").map((b) => b.number), [2026, 5787, 1237]);
  assert.equal(blocks.find((b) => b.kind === "kicker").text, "מפת המציאות | עוד גילוי שמצטרף לסיפור הבחירות");
});

test("share address, card and Open Graph: query + fragment, the existing /api/card, preview-branch gate only", () => {
  const [unit] = PREVIEW_UNITS_2029[5107];
  assert.equal(unitShareUrl("https://x.vercel.app/", "/post/p", unit.id), "https://x.vercel.app/post/p?unit=yamin-smol-2026-5787-1237-1158#yamin-smol-2026-5787-1237-1158");
  const card = new URL(unitCardUrl("https://x.vercel.app", unit));
  assert.equal(card.pathname, "/api/card");
  assert.equal(card.searchParams.get("v"), "unit");
  assert.equal(card.searchParams.get("nums"), "2026,5787,1237,566,1158");
  const env = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "ccr-b8e8ab12-9hoamu" };
  const meta = previewUnitOgMeta({ postId: 5107, unitId: unit.id, env });
  assert.match(meta.title, /ימין ושמאול תפרצי/);
  assert.equal(meta.robots, "noindex, nofollow");
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: unit.id, env: { ...env, VERCEL_ENV: "production" } }), null);
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: unit.id, env: { ...env, VERCEL_GIT_COMMIT_REF: "main" } }), null);
  assert.equal(previewUnitOgMeta({ postId: 5107, unitId: "x", env }), null);
});

test("the claims for the engine panel use only phrases and numbers of the approved text", () => {
  for (const claim of YAMIN_SMOL_CLAIMS) assert.ok(YAMIN_SMOL_APPROVED_TEXT.replace(/[ ]+/g, " ").includes(claim.phrase.replace(/[ ]+/g, " ")), claim.id);
  assert.deepEqual(YAMIN_SMOL_CLAIMS.map((c) => [c.id, c.number]), [["c2026", 2026], ["c5787", 5787], ["c1158", 1158]]);
  assert.deepEqual(YAMIN_SMOL_SOURCES.map((s) => s.slug), ["yaniv-levi"], "Shachar's words are not read or shown by the unit");
  assert.equal(YAMIN_SMOL_CLAIMS.find((c) => c.id === "c2026").methodText, "מילוי");
  assert.equal(YAMIN_SMOL_CLAIMS.find((c) => c.id === "c5787").methodText, "ריבוע");
});
