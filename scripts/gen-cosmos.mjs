// מחולל רקע חללי — מרכז כהה, כוכבים בצדדים, זוהר זהב+סגול (תואם שער הזהב)
const W = 1600, H = 900, CX = W/2, CY = H/2, MAXR = Math.hypot(CX, CY);
let stars = "";
const rnd = (a,b) => a + Math.random()*(b-a);
for (let i=0; i<420; i++) {
  const x = Math.random()*W, y = Math.random()*H;
  const d = Math.hypot(x-CX, y-CY) / MAXR;          // 0 מרכז → 1 קצה
  // צפיפות/בהירות עולה לכיוון הקצוות; כמעט אין כוכבים במרכז
  if (Math.random() > 0.12 + d*1.05) continue;
  const r = (d < 0.45 ? rnd(0.3,0.8) : rnd(0.5,1.7)) * (Math.random()<0.08 ? 2.1 : 1);
  const o = (0.10 + d*0.65) * rnd(0.5,1);
  const tint = Math.random()<0.18 ? "#f6e27a" : (Math.random()<0.12 ? "#b9a7ff" : "#ffffff");
  stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${tint}" opacity="${o.toFixed(2)}"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="base" cx="50%" cy="46%" r="75%">
    <stop offset="0%" stop-color="#0a0714"/>
    <stop offset="45%" stop-color="#080513"/>
    <stop offset="100%" stop-color="#05040d"/>
  </radialGradient>
  <radialGradient id="goldTop" cx="50%" cy="0%" r="60%">
    <stop offset="0%" stop-color="#d4af37" stop-opacity="0.22"/>
    <stop offset="55%" stop-color="#7a5e12" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="purpleBottom" cx="50%" cy="108%" r="62%">
    <stop offset="0%" stop-color="#3d1f5c" stop-opacity="0.4"/>
    <stop offset="55%" stop-color="#2a1640" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="goldL" cx="8%" cy="32%" r="38%">
    <stop offset="0%" stop-color="#caa030" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="goldR" cx="93%" cy="72%" r="40%">
    <stop offset="0%" stop-color="#7a1320" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="centerDark" cx="50%" cy="48%" r="58%">
    <stop offset="0%" stop-color="#04030a" stop-opacity="0.96"/>
    <stop offset="42%" stop-color="#05040d" stop-opacity="0.8"/>
    <stop offset="78%" stop-color="#05040d" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#05040d" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#base)"/>
<rect width="${W}" height="${H}" fill="url(#goldTop)"/>
<rect width="${W}" height="${H}" fill="url(#purpleBottom)"/>
<rect width="${W}" height="${H}" fill="url(#goldL)"/>
<rect width="${W}" height="${H}" fill="url(#goldR)"/>
<g>${stars}</g>
<rect width="${W}" height="${H}" fill="url(#centerDark)"/>
</svg>`;
import { writeFileSync } from "fs";
writeFileSync("public/cosmos-bg.svg", svg);
console.log("wrote public/cosmos-bg.svg", svg.length, "bytes");
