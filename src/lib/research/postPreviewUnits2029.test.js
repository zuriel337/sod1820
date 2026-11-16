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

test("the 17.11.2026 text: no bracketed note of the delivery is part of the words, and every sentence is its own short line", () => {
  const lines = deliveredLines();
  assert.equal(lines.some((l) => /^\[|\]$/.test(l)), false);
  assert.equal(lines[0], "ימין ושמאול תפרצי");
  assert.equal(lines[lines.length - 1], "בקריאה הרוחנית של הפוסט, הוא מזמין מחשבה על האפשרות לצאת מגבולות הפירוד ולגלות אחדות.");
});

test("structure: title, numbers row, plain headings, the verse, the labelled lines of each connection, the party table", () => {
  const blocks = parseYaminSmolText();
  const kinds = (k) => blocks.filter((b) => b.kind === k);
  assert.equal(blocks[0].kind, "title");
  assert.equal(blocks[1].kind, "numbers", "the numbers row follows the title directly: no subtitle is invented");
  assert.deepEqual(kinds("numbers")[0].numbers, [2026, 5787, 1237, 1158]);
  assert.deepEqual(kinds("heading").map((b) => b.text), ["המקור", "חיבור ראשון — 2026", "חיבור שני — 5787", "מה הקשר בין החיבורים?", "המשך המחקר — 1237", "חיבור נוסף — 1158", "ומהו הסוד של שישים ריבוא?", "המסר"]);
  assert.equal(kinds("kicker").length, 0);
  assert.equal(kinds("peak").length, 0);
  const claims = kinds("claim").map((b) => parseFieldLine(b.text));
  assert.deepEqual(claims.map((c) => [c.label, c.value]), [["הביטוי", "ימין ושמאול תפרצי"], ["השיטה", "מילוי"], ["התוצאה", "2026"], ["הביטוי", "תפרצי בתשפז"], ["השיטה", "ריבוע"], ["התוצאה", "5787"]]);
  assert.deepEqual(claims.filter((c) => c.label === "התוצאה").map((c) => c.number), [2026, 5787]);
  assert.equal(parseFieldLine("השיטה: מילוי").number, null);
  assert.equal(parseFieldLine("זהו משפט: רגיל"), null);
  const rows = kinds("row");
  assert.deepEqual(rows.map((r) => r.cells), [["ראשי תיבות", "ערך"], ["חד״ש", "312"], ["תע״ל", "500"], ["בל״ד", "36"], ["רע״ם", "310"], ["סך הכול", "1158"]]);
  assert.equal(rows[0].head, true);
  assert.equal(rows[1].head, false);
  assert.equal(rows.slice(1, 5).reduce((sum, r) => sum + Number(r.cells[1]), 0), Number(rows[5].cells[1]), "the four party values add up to the stated total");
  assert.deepEqual(kinds("verse").map((b) => b.text), ["״כִּי יָמִין וּשְׂמֹאול תִּפְרֹצִי״", "«״שבאמת אין בעולם יותר מנשמה אחת״»"]);
  assert.deepEqual(kinds("verse").map((b) => b.identity), ["scripture", "baal-hasulam"], "the Baal HaSulam quotation keeps its own identity and is a protected source");
  assert.equal(blocks.some((b) => /שחר/.test(b.text) && b.group === "shachar-kandro"), false);
  // sentences that end with a mark, or that carry a colon, stay paragraphs
  assert.equal(blocks.find((b) => b.text.startsWith("חשוב להבחין:")).kind, "p");
  assert.equal(blocks.find((b) => b.text === "זהו גם מספר השנה הלועזית המתוארת בפוסט.").kind, "p");
});

test("attribution: the new text opens no writer group (the public messages hold the 1237 connections only), so no line is locked as a writer's words", () => {
  const blocks = parseYaminSmolText();
  assert.equal(blocks.some((b) => b.group), false);
  assert.equal(blocks.find((b) => b.text.startsWith("יניב לוי הציג")).identity, "editorial");
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
  assert.equal(card.searchParams.get("nums"), "2026,5787,1237,1158");
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
