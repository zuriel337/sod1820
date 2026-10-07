import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const page = read("src/pages/JoinPage.jsx");
const vercel = JSON.parse(read("vercel.json"));

assert.match(page, /campaign === "kod-hametsiut"/);
assert.match(page, /קוד המציאות · WHATSAPP/);
assert.match(page, /הקישור עבר אליכם\. המחקר מתחיל כאן\./);
assert.match(page, /source: isKodReality \? "whatsapp-kod-hametsiut" : "join"/);
assert.match(page, /signupAttribution\(\)/);
assert.match(page, /newsletter-signup/);
assert.match(page, /הצטרפו לעדכונים/);
assert.match(page, /רוצים לראות את האתר עכשיו\? היכנסו לסוד 1820/);
assert.match(page, /!isKodReality && <div/);

const route = (vercel.redirects || []).find((item) => item.source === "/whatsapp/kod-hametsiut");
assert.ok(route, "stable WhatsApp channel entry must exist");
assert.equal(route.permanent, false);
assert.match(route.destination, /^\/join\?/);
assert.match(route.destination, /src=wa-kod-hametsiut/);
assert.match(route.destination, /utm_medium=group_share/);
assert.match(route.destination, /utm_campaign=kod-hametsiut/);

console.log("WhatsApp קוד המציאות join landing regression: PASS");
