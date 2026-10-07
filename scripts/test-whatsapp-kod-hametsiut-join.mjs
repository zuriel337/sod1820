import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const page = read("src/pages/WhatsAppWelcome2029Page.jsx");
const app = read("src/App2029.jsx");
const join = read("src/pages/JoinPage.jsx");
const vercel = JSON.parse(read("vercel.json"));
const brand = read("src/lib/brandAssets2029.js");

assert.match(page, /BRAND_LOCKUP_2029/);
assert.match(page, /האתר בבנייה · אתם נכנסים לפני כולם/);
assert.match(page, /הסרטון שמתפוצץ ברשת/);
assert.match(page, /0524acef-077d-49f8-9be5-5dad2c8fe538\.mp4/);
assert.match(page, /רשמו אותי לעדכון הראשון/);
assert.match(page, /שלחו רמזים למערכת/);
assert.match(page, /מסע החיים/);
assert.match(page, /חיפוש בתורה/);
assert.match(page, /מחקר עם בינה מלאכותית/);
assert.match(page, /https:\/\/www\.tiktok\.com\/@sod_1820/);
assert.match(page, /VITE_WHATSAPP_CHANNEL/);
assert.match(page, /newsletter-signup/);
assert.match(page, /signupAttribution\(\)/);
assert.match(page, /source: CAMPAIGN/);
assert.match(page, /source: "whatsapp"/);
assert.match(page, /back: "\/early-access"/);

assert.doesNotMatch(page, /קוד המציאות/);
assert.doesNotMatch(page, /Calculator|2029\/gematria|fn_method_value|buildCalculator2029FastPreview/);

assert.match(app, /WhatsAppWelcome2029Page/);
assert.match(app, /path="\/early-access"/);
assert.doesNotMatch(app, /path="\/whatsapp\/kod-hametsiut" element=\{<WhatsAppWelcome2029Page/);

const legacyRedirect = (vercel.redirects || []).find((item) => item.source === "/whatsapp/kod-hametsiut");
assert.ok(legacyRedirect, "old circulated WhatsApp link must remain valid");
assert.equal(legacyRedirect.destination, "/early-access");
assert.equal(legacyRedirect.permanent, false);

const rewrite = (vercel.rewrites || []).find((item) => item.source === "/early-access");
assert.ok(rewrite, "neutral public entry must be served by the isolated 2029 document");
assert.equal(rewrite.destination, "/2029.html");

const header = (vercel.headers || []).find((item) => item.source === "/early-access");
assert.ok(header, "early access landing needs explicit robots policy");
assert.ok((header.headers || []).some((item) => item.key === "X-Robots-Tag" && /noindex/.test(item.value)));

assert.doesNotMatch(join, /kod-hametsiut|קוד המציאות|isKodReality/);
assert.match(brand, /sod1820_primary_lockup_v2_transparent_candidate\.png/);

console.log("2029 early access welcome landing regression: PASS");
