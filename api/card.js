// תמונת שיתוף דינמית (Open Graph) — נוצרת on-the-fly דרך @vercel/og.
// כשמשתפים /number/358 או /topic/... → og.js מצביע על /api/card?... והרובוט
// מקבל תמונה 1200×630 עם המספר/המילה הגדולים + מה שווה לו + כיתוב ויראלי.
//
// הקובץ הוא .js ובונה את העץ עם React.createElement במקום JSX, כך שאין תלות בשלב המרת JSX בבניית הפונקציה.
//
// כל טקסט מה-query (w / t / sub / cap) וכל ביטוי שנשלף מהמסד עובר דרך cardText (_card-text.js) לפני הרינדור:
// רק תווים שיש להם גליף בפונט המוטמע (Heebo) נשארים, והשאר מוחלף במפריד «·». תו בלי גליף גורם ל-@vercel/og
// לטעון פונט/אימוג'י חלופי מהרשת (fonts.googleapis.com / twemoji) בלי timeout — כך נתקעו 5 בקשות עד 300 שניות.
// בנוסף, תקרת הזמן של הרינדור נאכפת ב-public-reading-deploy/api/card.js (card-deadline.js): ImageResponse מרנדר
// בזמן קריאת ה-body, ולכן ה-handler עצמו חוזר מיד גם כשהרינדור תקוע.
//
// פרמטרים:
//   n  = מספר (למשל 358) — מוצג ענק, ומתחתיו הביטויים השווים לו.
//   w  = מילה/ביטוי להבליט (למשל "משיח") — מוצג ענק, ומתחתיו "= n".
//   t  = כותרת חופשית (לטופיקים) — מחליפה את ברירת המחדל.
//   sub= שורת-משנה חופשית (אם רוצים לעקוף את השליפה האוטומטית).
//   v=unit + nums=2026,5787,1237,1158 = כרטיס יחידה (כחול־רויאל וזהב): t כותרת, sub שורת משנה, nums ארבעה מספרים, cap כיתוב.

import React from 'react';
import { ImageResponse } from '@vercel/og';
import { cardText, glyphCoverage } from './_card-text.js';

export const config = { runtime: 'edge' };

const h = (tag, props, ...kids) => React.createElement(tag, props, ...kids);

// satori מרנדר שמאל-לימין בלבד — עברית נראית הפוכה.
// הפתרון: להפוך את המחרוזת לפני העברה, אז satori "מתקן" אותה.
// לוגיקה: היפוך תווים + שמירת ספרות/ASCII קריאות בסדרן.
const rev = (s) => {
  if (!s) return s;
  // מפצלים ל-segments: עברית (כולל רווחים/פיסוק) ו-ASCII
  const segs = [];
  let i = 0;
  while (i < s.length) {
    // ASCII ברצף (אותיות לטיניות, ספרות, נקודות כגון URL) — שומרים כמות שהן
    const isAsciiAlnum = (c) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || c === 0x2E || c === 0x2F || c === 0x3A;
    if (isAsciiAlnum(s.charCodeAt(i))) {
      let j = i;
      while (j < s.length && isAsciiAlnum(s.charCodeAt(j))) j++;
      segs.push({ t: 'a', v: s.slice(i, j) });
      i = j;
    } else {
      // עברית + רווחים + פיסוק — הכל עד ה-ASCII הבא
      let j = i;
      while (j < s.length && !isAsciiAlnum(s.charCodeAt(j))) j++;
      segs.push({ t: 'h', v: s.slice(i, j) });
      i = j;
    }
  }
  // היפוך סדר ה-segments + היפוך תווים בתוך כל segment עברי
  return segs.reverse().map(sg => sg.t === 'a' ? sg.v : sg.v.split('').reverse().join('')).join('');
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// שליפת כמה ביטויים מאומתים ששווים למספר (בשיטת רגיל = היסוד) — הקצרים/החזקים קודם.
async function topPhrases(n, has) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/gematria_words?ragil=eq.${n}&is_verified=eq.true&is_published=eq.true&visibility_tier=lte.1&select=phrase&limit=40`,
      // DEF-015: bounded read - a hung Supabase request must not hold the render until the platform's 300 s limit.
      { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }, signal: AbortSignal.timeout(4000) }
    );
    const rows = await r.json();
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    const out = [];
    rows
      .map((x) => cardText(x.phrase, has))
      .filter(Boolean)
      .sort((a, b) => a.length - b.length)
      .forEach((p) => {
        if (!seen.has(p) && p.length <= 16) {
          seen.add(p);
          out.push(p);
        }
      });
    return out.slice(0, 3);
  } catch {
    return [];
  }
}

// 🚀 נכסים כבדים (פונט + לוגו) נטענים פעם אחת לכל isolate ונשמרים בזיכרון בין קריאות חמות.
//    לפני כן הם נמשכו-מחדש וה-base64 של הלוגו קודד מאפס בכל רינדור — בזבוז CPU שחזר על עצמו
//    בכל בקשה. עכשיו הקידוד היקר קורה רק בקריאה הראשונה של כל isolate (Fluid Active CPU).
let _fontPromise;
function loadFont() {
  if (!_fontPromise) {
    // DEF-015: bounded, and a failed or timed-out load is forgotten so the next request retries instead of inheriting a dead promise.
    _fontPromise = fetch(new URL('./_assets/heebo-800.ttf', import.meta.url), { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer())
      .catch((error) => { _fontPromise = undefined; throw error; });
  }
  return _fontPromise;
}

// מה הפונט המוטמע יכול לצייר — נקרא פעם אחת לכל isolate מה-cmap של קובץ הפונט עצמו (לא רשימה כתובה ביד).
let _coverage;
const coverageOf = (font) => (_coverage = _coverage || glyphCoverage(font));

let _logoPromise;
function loadLogo() {
  if (!_logoPromise) {
    _logoPromise = fetch(new URL('./_assets/logo.png', import.meta.url), { signal: AbortSignal.timeout(8000) })
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return 'data:image/png;base64,' + btoa(bin);
      })
      .catch(() => { _logoPromise = undefined; return null; });
  }
  return _logoPromise;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  // הפונט נטען ראשון: ממנו נגזר אילו תווים מותר לשלוח לרינדור (ראו _card-text.js).
  const font = await loadFont();
  const has = coverageOf(font);
  const text = (name) => cardText(searchParams.get(name), has);
  const nRaw = searchParams.get('n');
  const w = text('w');
  const t = text('t');
  const subParam = text('sub');
  const n = nRaw && /^\d+$/.test(nRaw) ? parseInt(nRaw, 10) : null;
  // 👑 כרטיס יחידה בסדרת "מפת המציאות" (כחול־רויאל וזהב): כותרת + עד חמישה מספרים. אותו מנגנון כרטיס, אותו פונט ואותו סינון תווים.
  if ((searchParams.get('v') || '') === 'unit') {
    const nums = (searchParams.get('nums') || '').split(',').map((x) => x.trim()).filter((x) => /^\d{1,6}$/.test(x)).slice(0, 5);
    const title = t || w || 'סוד 1820';
    const subLine = subParam;
    const capLine = text('cap') || 'מפת המציאות';
    const titleSize = title.length <= 20 ? 88 : title.length <= 34 ? 70 : 54;
    const gold = '#e6c35c';
    const unitTree = h('div', { style: { width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo', position: 'relative',
        background: 'radial-gradient(circle at 50% 18%, #1d3a8a 0%, #11235f 42%, #070f33 100%)' } },
      h('div', { style: { display: 'flex', color: gold, fontSize: '30px', letterSpacing: '5px', marginBottom: '14px' } }, rev('סוד 1820') + '  ·  ' + rev(capLine)),
      h('div', { style: { display: 'flex', fontSize: `${titleSize}px`, fontWeight: 800, color: '#fff3c4', lineHeight: 1.12, textShadow: '0 0 36px rgba(230,195,92,0.5)', padding: '4px 40px', maxWidth: '1100px', textAlign: 'center' } }, rev(title)),
      subLine ? h('div', { style: { display: 'flex', fontSize: '40px', color: '#bcd0ff', marginTop: '18px', textAlign: 'center', maxWidth: '1060px' } }, rev(subLine)) : null,
      nums.length ? h('div', { style: { display: 'flex', flexDirection: 'row-reverse', gap: '18px', marginTop: '44px' } },
        ...nums.map((n) => h('div', { style: { display: 'flex', fontSize: '58px', fontWeight: 800, color: '#fff3c4', padding: '6px 30px', borderRadius: '999px', border: `3px solid ${gold}`, background: 'rgba(8,18,58,0.72)' } }, n))) : null,
      h('div', { style: { display: 'flex', fontSize: '28px', color: '#9fb4e8', marginTop: '40px' } }, rev('פוסט הבחירות') + ' · sod1820.co.il'));
    return new ImageResponse(unitTree, { width: 1200, height: 630, fonts: [{ name: 'Heebo', data: font, weight: 800, style: 'normal' }] });
  }
  // 📸 פורמט סטורי (אינסטגרם/וואטסאפ) — 1080×1920 לאורך; ברירת מחדל 1200×630.
  const story = (searchParams.get('format') || '') === 'story';
  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;

  // 👑 Royal card, new logo (ZURIEL 18.11.2026): the brand lockup v2 (src/lib/brandAssets2029.js, _assets/logo.png is a resize-only,
  // uncropped derivative), navy and gold like the logo and the top bar. One structure for every kind:
  //   logo · kind label · the finding (big) · detail chips · gold invitation line · footer (site + "open the finding").
  // Kind (k): calc | number | els | finding | page — given by the caller; otherwise inferred (n alone → number, w with n → calc).
  const kindParam = (searchParams.get('k') || '').trim();
  const heroIsNumber = !w && n != null;
  const kind = ['calc', 'number', 'els', 'finding', 'page'].includes(kindParam) ? kindParam
    : heroIsNumber ? 'number' : (searchParams.get('sig') || '') === 'finding' ? 'finding'
    : (searchParams.get('sig') || '') === 'els' ? 'els' : (w && n != null) ? 'calc' : 'page';
  const KIND_LABEL = { calc: 'ממצא במחשבון', number: 'דף המספר', els: 'ממצא בצופן התנ״כי', finding: 'ממצא · מקור · מחקר', page: 'סוד 1820' };
  // Invitations already used on the site; "what does the number know about you" is gone (the site says: testimony, not prophecy).
  const KIND_HOOK = { calc: 'מה מסתתר בשם שלך?', number: 'איזה פסוק שווה למספר שלך?', els: 'חפשו את השם שלכם בתורה',
    finding: 'ממצא · מקור · מחקר', page: 'חשב · גלה · שתף' };

  // The finding: a word with its value ("w = n"), a number, or a title.
  const hero = w || (n != null ? String(n) : 'סוד 1820');
  const heroValue = w && n != null ? String(n) : null;

  // Detail chips: an explicit sub (split on " · "), the phrases equal to a number, or a title.
  let chips = [];
  if (subParam) chips = subParam.split(/\s*·\s*/).filter(Boolean);
  else if (heroIsNumber) {
    const phrases = await topPhrases(n, has);
    chips = phrases.length ? phrases : ['מרכז ההתכנסות'];
  } else if (t) chips = [t];
  chips = chips.slice(0, 3).map((c) => c.slice(0, 40));

  const hook = text('cap') || KIND_HOOK[kind];
  const openLabel = kind === 'page' ? 'לכניסה לאתר ‹' : 'לפתיחת הממצא ‹';

  const logoDataUri = await loadLogo();
  const logoSize = story ? 220 : 124;
  const gold = '#e3be5a';
  const ink = '#fff3d0';
  const heroLen = hero.length + (heroValue ? heroValue.length + 3 : 0);
  const heroSize = heroIsNumber ? (hero.length <= 4 ? 150 : hero.length <= 8 ? 120 : 90)
    : heroLen <= 10 ? 96 : heroLen <= 16 ? 80 : heroLen <= 24 ? 64 : heroLen <= 34 ? 52 : 42;

  const chip = (c, i) => h('div', { key: i, style: { display: 'flex', color: ink, fontSize: '30px', padding: '6px 22px', borderRadius: '999px',
    border: `2px solid ${gold}`, background: 'rgba(9,18,58,0.75)' } }, rev(c));

  const tree = h(
    'div',
    { style: { width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #1b2f7a 0%, #0d1a4a 45%, #060c26 100%)', fontFamily: 'Heebo', position: 'relative' } },
    // The full lockup, never cropped (logo_integrity / brand core). No emoji stand-in: a missing logo leaves the kind label as the brand line.
    logoDataUri
      ? h('img', { src: logoDataUri, width: logoSize, height: logoSize, style: { position: 'absolute', top: story ? 90 : 18, left: (W - logoSize) / 2, objectFit: 'contain' } })
      : null,
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: story ? 0 : 40, maxWidth: `${W - 120}px` } },
      h('div', { style: { display: 'flex', color: gold, fontSize: '30px', letterSpacing: '4px' } }, rev(KIND_LABEL[kind])),
      h('div', { style: { display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '8px' } },
        h('div', { style: { display: 'flex', color: ink, fontSize: `${heroSize}px`, fontWeight: 800, lineHeight: 1.1, textAlign: 'center', textShadow: '0 0 36px rgba(227,190,90,0.45)' } },
          heroIsNumber ? hero : rev(hero)),
        heroValue ? h('div', { style: { display: 'flex', color: gold, fontSize: `${Math.round(heroSize * 0.9)}px` } }, '=') : null,
        heroValue ? h('div', { style: { display: 'flex', color: ink, fontSize: `${Math.round(heroSize * 1.1)}px`, fontWeight: 800 } }, heroValue) : null),
      chips.length ? h('div', { style: { display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', marginTop: '18px' } },
        ...chips.map(chip)) : null),
    h('div', { style: { position: 'absolute', bottom: story ? 260 : 70, display: 'flex', color: gold, fontSize: story ? '52px' : '40px', fontWeight: 800 } }, rev(hook)),
    h('div', { style: { position: 'absolute', bottom: story ? 120 : 24, display: 'flex', width: `${W - 100}px`, justifyContent: 'space-between', color: gold, fontSize: story ? '36px' : '26px' } },
      h('div', { style: { display: 'flex' } }, 'sod1820.co.il'),
      h('div', { style: { display: 'flex' } }, rev(openLabel)))
  );

  return new ImageResponse(tree, {
    width: W,
    height: H,
    fonts: [{ name: 'Heebo', data: font, weight: 800, style: 'normal' }],
  });
}
