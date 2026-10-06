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

assert.match(page,/INTRO_VIDEO = null/,"intro video must fail closed until exact canonical asset is selected");
assert.match(app,/path="\/melech-hamisparim\/718"/);

const rewrite = (vercel.rewrites || []).find((item) => item.source === "/melech-hamisparim/718" && !Array.isArray(item.has));
assert.ok(rewrite,"campaign must use isolated 2029 document");
assert.equal(rewrite.destination,"/2029.html");

const header = (vercel.headers || []).find((item) => item.source === "/melech-hamisparim/718");
assert.ok(header,"campaign route needs explicit robots policy");
assert.ok((header.headers || []).some((item) => item.key === "X-Robots-Tag" && /noindex/.test(item.value)),"campaign must be noindex");

console.log("TikTok מלך המספרים 718 landing regression: PASS");
