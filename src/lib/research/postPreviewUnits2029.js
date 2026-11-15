// A PREVIEW unit of the flagship series (ZURIEL 12.11.2026): "זה לעומת זה עשה האלוהים — ימין ושמאול תפרצי", a NEW independent unit inside the
// Elections post 5107. Hierarchy: series "מפת המציאות" → post 5107 → this unit → its numbers, sources, images and links. It is NOT a new post.
//
// What this file is: the approved body of the unit, kept WORD FOR WORD as delivered (the single constant below), a deterministic parser that
// turns it into blocks without changing a character of the words, the unit's stable identity, and the pure helpers that build its share
// URL and card address. What it is NOT: a store, a publication path or a parallel content system. Writing a unit into posts.content is a DB
// write and needs ZURIEL's separate approval, so this unit is shown ONLY in a build that sets VITE_REALITY_MAP_PREVIEW (the protected
// Preview) and nowhere else. The identity below never changes when the text is edited: it is the key, not a hash of the content.
import { realityMapPreviewEnabled } from "./realityMap2029.js";
import { publicPostUnitHref } from "../publicPostUrls.js";

export const YAMIN_SMOL_UNIT_ID = "yamin-smol-2026-5787-1237-1158";

// The approved text, exactly as delivered by ZURIEL on 17.11.2026 (clear, graded wording inspired by ASD-STE100, in the SOD1820 spiritual voice; it replaces the
// 12.11.2026 wording). The bracketed notes of that delivery ("here the canonical component appears") are not text: they are the places of the existing
// canonical components (the method trace under each result, the editor's "+ gematria" item) and are not part of the words. Do not reword, reorder or "fix" it.
// The text exists in a build ONLY when the protected-preview flag is on (a static condition the bundler folds away otherwise), so an ordinary or
// public build carries none of it. Outside a bundler (node tests) `import.meta.env` is undefined and the text is present for the tests.
const PREVIEW_BUILD = typeof import.meta.env === "undefined" || import.meta.env.VITE_REALITY_MAP_PREVIEW === "true";
export const YAMIN_SMOL_APPROVED_TEXT = !PREVIEW_BUILD ? "" : `ימין ושמאול תפרצי

2026 · 5787 · 1237 · 1158

המקור

בספר ישעיהו, פרק נ״ד, פסוק ג׳, נאמר:

״כִּי יָמִין וּשְׂמֹאול תִּפְרֹצִי״

יניב לוי הציג שני חיבורים מספריים המבוססים על הביטוי הזה.

חיבור ראשון — 2026

הביטוי: ימין ושמאול תפרצי

השיטה: מילוי

התוצאה: 2026

זהו גם מספר השנה הלועזית המתוארת בפוסט.

חיבור שני — 5787

הביטוי: תפרצי בתשפז

השיטה: ריבוע

התוצאה: 5787

זהו מספר השנה העברית תשפ״ז.

מה הקשר בין החיבורים?

שני החישובים מתייחסים לאותו ציר רעיוני.

החיבור הראשון מציג את השנה הלועזית. החיבור השני מציג את השנה העברית.

ההתאמה המספרית נבדקת באמצעות המנוע. המשמעות הרוחנית של ההתאמה היא פרשנות.

המשך המחקר — 1237

המספר 1237 מופיע בפוסט באמצעות ביטויים, פסוקים ומקורות שונים.

יניב לוי ויצחק שחר קנדרו הביאו חיבורים נפרדים סביב המספר.

לכל חיבור יש לשמור את הביטוי, השיטה, תוצאת הבדיקה והייחוס למקור.

חיבור נוסף — 1158

ארבעה ראשי תיבות של מפלגות מופיעים בחישוב:

ראשי תיבות| ערך
חד״ש| 312
תע״ל| 500
בל״ד| 36
רע״ם| 310
סך הכול| 1158

גם הביטוי ״שש מאות אלף״ שווה 1158 בגימטריה רגילה.

חשוב להבחין: 1158 הוא סכום ערכי ראשי התיבות. הוא אינו הערך הרגיל של המשפט ״ארבע המפלגות הערביות״.

המסר

החיבורים מצטרפים להתבוננות על ימין ושמאל, פירוד ואחדות.

הפסוק מתאר פריצה והתרחבות.

בקריאה הרוחנית של הפוסט, הוא מזמין מחשבה על האפשרות לצאת מגבולות הפירוד ולגלות אחדות.`;

// Identity groups INSIDE the text. Only a line the text itself attributes to a writer is attributed to that writer (nothing is put in
// anyone's mouth). Everything else is the site's editorial wording; scripture and Baal HaSulam keep their own identity.
const ATTRIBUTION = Object.freeze([
  // A writer's group opens on the exact line below and closes on the `to` line. The 17.11.2026 text contains none of these lines, so it opens no group:
  // the public messages of Yaniv Levi and Yitzhak Shachar Kandro that the unit reads hold the 1237 connections only, so the text's statement that Yaniv
  // presented the first two connections stays EDITORIAL wording until its source is confirmed (then a group can be added here).
  Object.freeze({ identity: "yaniv-levi", label: "דברי יניב לוי", from: "יניב לוי הביא רמז יפה מן הפסוק:", to: "787 = תשפ״ז" }),
  Object.freeze({ identity: "shachar-kandro", label: "דברי יצחק שחר קנדרו", from: "גם יצחק שחר קנדרו הביא רמזים סביב הכנסת והמספר 1237:", to: "אלה חיבורים שהביא שחר, וכל אחד מהם פותח כיוון נוסף להתבוננות." }),
  Object.freeze({ identity: "editorial-phrase", label: "ניסוח פרשני שהועלה ברצף הרמזים", from: "ולצידם מצטרף גם הביטוי:", to: "זהו ניסוח פרשני שהועלה בתוך רצף הרמזים, ולא קביעה על תוצאות הבחירות." }),
]);

const HEADING = /^(✨|👑|✦|📜)\s+(.+)$/u;
const NUMBERS_ROW = /^\d{3,5}(?:\s·\s\d{3,5})+$/u;
const VERSE = /^(?:«״.+״»|״[^״]+״)$/u;
// "הביטוי: …" / "השיטה: …" / "התוצאה: …" — the three labelled lines of a connection (a data line of the "claim" kind; the label and the value are re-read from the text)
const FIELD = /^(הביטוי|השיטה|התוצאה):\s*(.+)$/u;
export function parseFieldLine(text) {
  const match = FIELD.exec(String(text).trim());
  if (!match) return null;
  const value = match[2].trim();
  return { label: match[1], value, number: /^\d{3,5}$/.test(value) ? Number(value) : null };
}
// a short title line of a section: no sentence mark at its end, no colon, no quotation, no table, no equation
const isPlainHeading = (line) => line.length <= 40 && !/[.!,;:׃]$/.test(line) && !/[:|=]/.test(line) && !/^(?:״|«)/.test(line) && !/^\d+$/.test(line) && !NUMBERS_ROW.test(line);

// → [{ kind, text, identity, group? , cells? }]  `text` is the delivered line, untouched.
export function parseYaminSmolText(text = YAMIN_SMOL_APPROVED_TEXT) {
  const lines = String(text).split("\n").map((line) => line.trim()).filter((line) => line.length);
  // a text that marks its section titles with a symbol (✨ 👑 ✦ 📜) uses only those; a text with none uses its short title lines (no sentence mark, no colon)
  const plainHeadings = !lines.some((line) => HEADING.test(line));
  const blocks = [];
  let active = null;
  let tableOpen = false;
  lines.forEach((line, index) => {
    const start = ATTRIBUTION.find((a) => a.from === line);
    if (start) active = start;
    const current = active;
    const identityOf = (kind) => current ? current.identity : kind === "verse" ? "scripture" : "editorial";
    const previous = blocks[blocks.length - 1];
    let block;
    if (line === "---") { block = { kind: "rule", text: line }; tableOpen = false; }
    else if (index === 0) block = { kind: "title", text: line };
    else if (index === 1 && !NUMBERS_ROW.test(line)) block = { kind: "subtitle", text: line };
    else if (NUMBERS_ROW.test(line)) block = { kind: "numbers", text: line, numbers: line.split(" · ").map(Number) };
    else if (previous && previous.kind === "numbers" && /\s\|\s/.test(line)) block = { kind: "kicker", text: line };
    else if (/^(✨|👑|✦|📜)\s.+\s\1$/u.test(line)) block = { kind: "closing", text: line };
    else if (HEADING.test(line)) block = { kind: "heading", text: line };
    else if (line.includes("|") && !line.startsWith("מקורות")) block = { kind: "row", text: line, cells: line.split("|").map((c) => c.trim()), head: !tableOpen };
    else if (FIELD.test(line)) block = { kind: "claim", text: line };
    else if (/^\d{3,4}$/.test(line)) block = { kind: "peak", text: line, number: Number(line) };
    else if (/^(?:״|«״)/.test(line) && /(?:״|״»)(?:\s=\s\d+)?$/.test(line) && line.length < 90) {
      block = /=\s\d+$/.test(line) ? { kind: "claim", text: line } : { kind: "verse", text: line };
    } else if (/=\s?\d/.test(line) && line.length < 80) block = { kind: "claim", text: line };
    else if (plainHeadings && isPlainHeading(line)) block = { kind: "heading", text: line };
    else block = { kind: "p", text: line };
    if (block.kind === "row") tableOpen = true; else if (block.kind !== "rule") tableOpen = false;
    if (block.kind === "verse" && /^«/.test(line)) block.identity = "baal-hasulam";
    else block.identity = block.kind === "rule" ? "editorial" : identityOf(block.kind);
    if (current && block.kind !== "rule") block.group = current.identity;
    blocks.push(block);
    if (current && current.to === line) active = null;
  });
  return blocks;
}
export const ATTRIBUTION_GROUPS = ATTRIBUTION;

// Every delivered line, in order, as plain text: the proof that parsing changed no word.
export const deliveredLines = (text = YAMIN_SMOL_APPROVED_TEXT) => String(text).split("\n").map((l) => l.trim()).filter((l) => l.length);

// Claims the unit makes, for the ENGINE panel (display only: the approved words stay as delivered; a claim's state comes only from the engine).
export const YAMIN_SMOL_CLAIMS = Object.freeze(!PREVIEW_BUILD ? [] : [
  Object.freeze({ id: "c2026", phrase: "ימין ושמאול תפרצי", number: 2026, methodText: "מילוי" }),
  Object.freeze({ id: "c5787", phrase: "תפרצי בתשפז", number: 5787, methodText: "ריבוע" }),
  Object.freeze({ id: "c1158", phrase: "שש מאות אלף", number: 1158, methodText: null }),
]);

// The unit's two gematria images: PRIVATE inbox uploads (bucket submission-inbox, not public). They are bound here only as canonical
// references; nothing fetches or shows them until ZURIEL confirms they are the intended images and approves their publication.
export const YAMIN_SMOL_IMAGES = Object.freeze(!PREVIEW_BUILD ? [] : [
  Object.freeze({ id: "img-1", ref: "channel_updates:94cab26c-02cb-4eb3-ae32-61fee950dfea", state: "awaiting_publication_approval" }),
  Object.freeze({ id: "img-2", ref: "channel_updates:9fd28f82-5619-4161-9840-c957842d99fd", state: "awaiting_publication_approval" }),
]);

// Public group messages (read through the existing public reader), shown as SEPARATE identities with their own words.
export const YAMIN_SMOL_SOURCES = Object.freeze(!PREVIEW_BUILD ? [] : [
  Object.freeze({ slug: "yaniv-levi", channel: "gilui-yomi", id: "channel_updates:6d40048f-b429-4208-bb34-ad36ff4ba907" }),
  Object.freeze({ slug: "shachar-kandro", channel: "gilui-yomi", id: "channel_updates:8d30aba8-e510-443b-9de0-456df8875a22" }),
]);

export const PREVIEW_UNITS_2029 = Object.freeze(!PREVIEW_BUILD ? {} : {
  5107: Object.freeze([Object.freeze({
    id: YAMIN_SMOL_UNIT_ID,
    postId: 5107,
    seriesKey: "reality-map",
    // The unit's own title/numbers, as they stand in the approved text and in ZURIEL's instruction.
    title: "ימין ושמאול תפרצי",
    subtitle: "הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר",
    numbers: Object.freeze([2026, 5787, 1237, 1158]),
    // Proposal for the unit's MAIN MESSAGE in "עכשיו": the closing line of the approved text, decoration removed. Never applied by itself:
    // the editor pre-fills it and ZURIEL flags it as the main message (or changes it) before it reaches "עכשיו".
    suggestedMainMessage: "ימין ושמאול תפרצי — לצאת מגבולות הפירוד ולגלות אחדות",
  })]),
});

export const previewUnitsFor = (postId) => realityMapPreviewEnabled() ? (PREVIEW_UNITS_2029[Number(postId)] || []) : [];
export const previewUnitIdsFor = (postId) => previewUnitsFor(postId).map((unit) => unit.id);
// Registry lookup that ignores the build flag (for tests and for server code that applies its own gate).
export const previewUnitDefinition = (postId, unitId) => (PREVIEW_UNITS_2029[Number(postId)] || []).find((unit) => unit.id === unitId) || null;

// ---- share address, card and Open Graph (pure) ---------------------------------------------------------------------------
// A unit link carries the unit as a QUERY parameter as well as the fragment: a fragment never reaches a server or a crawler, a query does.
export function unitShareUrl(origin, postPath, unitId) {
  return publicPostUnitHref(postPath, unitId, { origin });
}
// Card address on the EXISTING /api/card, variant "unit": title + the four numbers.
export function unitCardUrl(origin, unit) {
  const p = new URLSearchParams({ v: "unit", t: unit.title, sub: unit.subtitle.split(" — ")[0], nums: unit.numbers.join(","), cap: "מפת המציאות" });
  return `${String(origin || "").replace(/\/$/, "")}/api/card?${p.toString()}`;
}
// Open Graph meta of a unit link, only for the exact preview branch's Preview (server-side gate; the flag exists only in the browser build).
export const REALITY_MAP_PREVIEW_BRANCH_NAME = "ccr-b8e8ab12-9hoamu";
export function previewUnitOgMeta({ postId, unitId, env = {}, origin = "https://sod1820.co.il" } = {}) {
  if (env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== REALITY_MAP_PREVIEW_BRANCH_NAME) return null;
  const unit = previewUnitDefinition(postId, String(unitId || ""));
  if (!unit) return null;
  return { title: `${unit.title} — ${unit.subtitle}`, description: `${unit.numbers.join(" · ")} — יחידה בסדרת מפת המציאות, בתוך פוסט הבחירות.`, image: unitCardUrl(origin, unit), robots: "noindex, nofollow" };
}
