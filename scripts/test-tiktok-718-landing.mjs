import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),"utf8");

const page = read("src/pages/Campaign718Page2029.jsx");
const app = read("src/App2029.jsx");
const vercel = JSON.parse(read("vercel.json"));
const brand = read("src/lib/brandAssets2029.js");

assert.match(page,/BRAND_LOCKUP_2029/);
assert.equal(page.includes("/logo.png"),false,"campaign must not bypass Brand Core");
assert.match(brand,/sod1820_primary_lockup_v2_transparent_candidate\.png/);

for(const required of [
  "captureArrivalSource",
  "captureAcquisition",
  "signupAttribution",
  "newsletter-signup",
  "fn_method_value",
  "שביעי באוקטובר",
  "חדשות",
  "התשובה",
  "gapfill-718",
  "tiktok-melech-hamisparim-718",
]){
  assert.match(page,new RegExp(required),"missing campaign requirement: "+required);
}

assert.match(page,/DClJVGBMCs0/,"campaign must use the Human-Gate-selected YouTube asset from the main SOD1820 post");
assert.equal(page.includes("INTRO_VIDEO = null"),false,"intro video asset is now explicitly selected");
assert.match(page,/1820 הוא המספר שממנו התחיל הסוד/);
assert.match(page,/שם הוי״ה מופיע בתורה 1,820 פעמים/);
assert.match(page,/למדו על הסוד/);
assert.match(page,/FaI8Nq95NMrCvZheSrW6Ql/,"campaign must reuse the canonical WhatsApp group");
assert.match(page,/whatsapp_join/,"WhatsApp join must be measured in the existing campaign telemetry tree");
assert.match(app,/path="\/melech-hamisparim\/718"/);

const shortRedirect = (vercel.redirects || []).find((item) => item.source === "/tiktok/melech");
assert.ok(shortRedirect,"TikTok campaign must expose the stable /tiktok/melech entry");
assert.match(shortRedirect.destination,/\/melech-hamisparim\/718\?/);
assert.match(shortRedirect.destination,/utm_source=tiktok/);

const rewrite = (vercel.rewrites || []).find((item) => item.source === "/melech-hamisparim/718" && !Array.isArray(item.has));
assert.ok(rewrite,"campaign must use isolated 2029 document");
assert.equal(rewrite.destination,"/2029.html");

const header = (vercel.headers || []).find((item) => item.source === "/melech-hamisparim/718");
assert.ok(header,"campaign route needs explicit robots policy");
assert.ok((header.headers || []).some((item) => item.key === "X-Robots-Tag" && /noindex/.test(item.value)),"campaign must be noindex");

console.log("TikTok מלך המספרים 718 landing regression: PASS");
