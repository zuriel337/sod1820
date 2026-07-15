// 🖼️ QA לכרטיסי-השיתוף (api/card.js) — מרנדר מדגם מקרים ל-PNG כדי לבדוק ויזואלית
// שאין צמידות/דריסה/גלישה לפני פריסה. הרצה: node scripts/preview-cards.mjs
// ⚠️ המבנה כאן חייב לשקף את api/card.js — אם משנים שם layout, לעדכן גם כאן.
// דורש: react, satori, sharp (כבר ב-node_modules). פלט: scripts/.card-preview/*.png
import fs from 'fs';
import path from 'path';
import React from 'react';
import satori from 'satori';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'scripts', '.card-preview');
fs.mkdirSync(OUT, { recursive: true });

const h = (t, p, ...k) => React.createElement(t, p, ...k);
const rev = (s) => {
  if (!s) return s;
  const segs = []; let i = 0;
  const ok = (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 46 || c === 47 || c === 58;
  while (i < s.length) {
    if (ok(s.charCodeAt(i))) { let j = i; while (j < s.length && ok(s.charCodeAt(j))) j++; segs.push({ t: 'a', v: s.slice(i, j) }); i = j; }
    else { let j = i; while (j < s.length && !ok(s.charCodeAt(j))) j++; segs.push({ t: 'h', v: s.slice(i, j) }); i = j; }
  }
  return segs.reverse().map(x => x.t === 'a' ? x.v : x.v.split('').reverse().join('')).join('');
};

const font = fs.readFileSync(path.join(ROOT, 'api/_assets/heebo-800.ttf'));
const lb = fs.readFileSync(path.join(ROOT, 'api/_assets/logo.png'));
const logo = 'data:image/png;base64,' + Buffer.from(lb).toString('base64');

// —— חייב לשקף את api/card.js ——
function heroSizeOf(hero, hasSub) {
  return hero.length <= 4 ? (hasSub ? 236 : 300)
    : hero.length <= 8 ? (hasSub ? 168 : 196)
    : hero.length <= 14 ? (hasSub ? 108 : 120)
    : hero.length <= 22 ? 84
    : hero.length <= 34 ? 62 : 50;
}
const subSizeOf = (sub) => sub.length <= 16 ? 52 : sub.length <= 26 ? 42 : sub.length <= 38 ? 34 : sub.length <= 52 ? 27 : 22;

async function render({ hero, heroIsNumber = false, sub = '', teaser, signature }) {
  const W = 1200, H = 630, hasSub = !!sub, heroSize = heroSizeOf(hero, hasSub), subSize = subSizeOf(sub);
  const tree = h('div', { style: { width: W + 'px', height: H + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 38%, #1a1340 0%, #0b0820 45%, #05030d 100%)', fontFamily: 'Heebo', position: 'relative' } },
    h('div', { style: { position: 'absolute', top: '28px', left: '28px', right: '28px', bottom: '28px', border: '2px solid rgba(212,175,55,0.45)', borderRadius: '24px', display: 'flex' } }),
    h('img', { src: logo, width: 104, height: 104, style: { display: 'block', marginBottom: '2px', objectFit: 'contain' } }),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', color: '#d4af37', fontSize: '34px', letterSpacing: '6px', marginBottom: '8px' } }, h('span', null, rev('סוד 1820'))),
    h('div', { style: { display: 'flex', fontSize: heroSize + 'px', fontWeight: 800, color: '#ffe9a8', lineHeight: 1.12, padding: '4px 24px', maxWidth: (W - 120) + 'px', textAlign: 'center' } }, heroIsNumber ? hero : rev(hero)),
    hasSub ? h('div', { style: { display: 'flex', fontSize: subSize + 'px', color: '#f3ead0', marginTop: '32px', whiteSpace: 'nowrap', textAlign: 'center' } }, rev(sub)) : null,
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '46px', gap: '8px' } },
      h('div', { style: { display: 'flex', fontSize: '40px', color: '#d4af37', fontWeight: 800 } }, rev(teaser)),
      h('div', { style: { display: 'flex', fontSize: '30px', color: '#b9b3d6' } }, rev(signature) + ' · sod1820.co.il')));
  return sharp(Buffer.from(await satori(tree, { width: W, height: H, fonts: [{ name: 'Heebo', data: font, weight: 800, style: 'normal' }] }))).png().toBuffer();
}

// מדגם מקרי-קצה
const CASES = [
  { name: 'number-1820', hero: '1820', heroIsNumber: true, sub: 'משיח טבת עשירי · שמחת תורה', teaser: 'מה המספר 1820 יודע עליך?', signature: 'מה מסתתר בשם שלך?' },
  { name: 'number-358', hero: '358', heroIsNumber: true, sub: 'משיח · נחש', teaser: 'מה המספר 358 יודע עליך?', signature: 'מה מסתתר בשם שלך?' },
  { name: 'name-david', hero: 'דוד', sub: 'דוד = 14 · אהבה = 14', teaser: 'מה מסתתר ב"דוד"?', signature: 'מה מסתתר בשם שלך?' },
  { name: 'name-long', hero: 'יהושפט', sub: 'יהושפט = 410 · קדוש = 410', teaser: 'מה מסתתר ב"יהושפט"?', signature: 'מה מסתתר בשם שלך?' },
  { name: 'cipher', hero: 'תורה קדשה', sub: 'צופן דילוג · דילוג 10065', teaser: 'מה מסתתר ב"תורה קדשה"?', signature: 'חפש את שמך בתורה' },
  { name: 'topic-long', hero: 'משיח טבת עשירי', sub: '1820 · 776', teaser: 'מה מסתתר ב"משיח טבת עשירי"?', signature: 'חפש את שמך בתורה' },
];

const buffers = [];
for (const c of CASES) {
  const buf = await render(c);
  fs.writeFileSync(path.join(OUT, c.name + '.png'), buf);
  buffers.push({ name: c.name, buf });
}
// גיליון-מגע אחד (2 עמודות) לבדיקה מהירה
const cols = 2, tw = 600, th = 315, rows = Math.ceil(buffers.length / cols);
const sheet = sharp({ create: { width: tw * cols, height: th * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } });
const composites = await Promise.all(buffers.map(async (b, i) => ({
  input: await sharp(b.buf).resize(tw, th).png().toBuffer(),
  left: (i % cols) * tw, top: Math.floor(i / cols) * th,
})));
await sheet.composite(composites).png().toFile(path.join(OUT, '_contact-sheet.png'));
console.log('rendered', buffers.length, 'cards →', OUT);
