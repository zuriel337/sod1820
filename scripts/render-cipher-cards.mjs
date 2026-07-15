// מרנדר כרטיסי-שיתוף סטטיים לצפנים → public/cipher-cards/<id>.png (מהיר ואמין לוואטסאפ/פייסבוק,
// במקום /api/card הדינמי שנוטה להיכשל בתצוגה-מקדימה). הרצה: node scripts/render-cipher-cards.mjs
import fs from "fs";
import path from "path";
import React from "react";
import satori from "satori";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public", "cipher-cards");
fs.mkdirSync(OUT, { recursive: true });

const h = (t, p, ...k) => React.createElement(t, p, ...k);
const rev = (s) => {
  if (!s) return s;
  const g = []; let i = 0;
  const ok = (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 46 || c === 47 || c === 58;
  while (i < s.length) {
    if (ok(s.charCodeAt(i))) { let j = i; while (j < s.length && ok(s.charCodeAt(j))) j++; g.push({ t: "a", v: s.slice(i, j) }); i = j; }
    else { let j = i; while (j < s.length && !ok(s.charCodeAt(j))) j++; g.push({ t: "h", v: s.slice(i, j) }); i = j; }
  }
  return g.reverse().map(x => x.t === "a" ? x.v : x.v.split("").reverse().join("")).join("");
};
const font = fs.readFileSync(path.join(ROOT, "api/_assets/heebo-800.ttf"));
const lb = fs.readFileSync(path.join(ROOT, "api/_assets/logo.png"));
const logo = "data:image/png;base64," + Buffer.from(lb).toString("base64");

async function card({ hero, sub, teaser }) {
  const W = 1200, H = 630, hasSub = !!sub;
  const heroSize = hero.length <= 4 ? (hasSub ? 236 : 300) : hero.length <= 8 ? (hasSub ? 168 : 196) : hero.length <= 14 ? (hasSub ? 108 : 120) : hero.length <= 22 ? 84 : 62;
  const subSize = sub.length <= 16 ? 52 : sub.length <= 26 ? 42 : 34;
  const tree = h("div", { style: { width: W + "px", height: H + "px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 38%, #1a1340 0%, #0b0820 45%, #05030d 100%)", fontFamily: "Heebo", position: "relative" } },
    h("img", { src: logo, width: 104, height: 104, style: { display: "block", marginBottom: "2px", objectFit: "contain" } }),
    h("div", { style: { display: "flex", alignItems: "center", gap: "14px", color: "#d4af37", fontSize: "34px", letterSpacing: "6px", marginBottom: "8px" } }, h("span", null, rev("סוד 1820"))),
    h("div", { style: { display: "flex", fontSize: heroSize + "px", fontWeight: 800, color: "#ffe9a8", lineHeight: 1.12, padding: "4px 24px", maxWidth: (W - 120) + "px", textAlign: "center" } }, rev(hero)),
    h("div", { style: { display: "flex", fontSize: subSize + "px", color: "#f3ead0", marginTop: "32px", whiteSpace: "nowrap" } }, rev(sub)),
    h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", marginTop: "46px", gap: "8px" } },
      h("div", { style: { display: "flex", fontSize: "40px", color: "#d4af37", fontWeight: 800 } }, rev(teaser)),
      h("div", { style: { display: "flex", fontSize: "30px", color: "#b9b3d6" } }, rev("חפש את שמך בתורה") + " · sod1820.co.il")));
  return sharp(Buffer.from(await satori(tree, { width: W, height: H, fonts: [{ name: "Heebo", data: font, weight: 800, style: "normal" }] }))).png().toBuffer();
}

const CARDS = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", ".cipher-cards.json"), "utf-8"));
for (const c of CARDS) {
  const buf = await card({ hero: c.hero, sub: c.sub, teaser: c.teaser });
  fs.writeFileSync(path.join(OUT, c.id + ".png"), buf);
  console.log("wrote", c.id + ".png", "(" + c.hero + ")");
}
