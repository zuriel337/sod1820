// תמונת שיתוף דינמית (Open Graph) — נוצרת on-the-fly דרך @vercel/og.
// כשמשתפים /number/358 או /topic/... → og.js מצביע על /api/card?... והרובוט
// מקבל תמונה 1200×630 עם המספר/המילה הגדולים + מה שווה לו + כיתוב ויראלי.
//
// חשוב: קובץ זה הוא .js (לא .jsx) — Vercel מזהה רק .js/.ts כפונקציות, ולכן
// בונים את העץ עם React.createElement במקום JSX (אחרת הפונקציה לא נפרסת
// והבקשה נופלת ל-index.html → og:image שבור).
//
// פרמטרים:
//   n  = מספר (למשל 358) — מוצג ענק, ומתחתיו הביטויים השווים לו.
//   w  = מילה/ביטוי להבליט (למשל "משיח") — מוצג ענק, ומתחתיו "= n".
//   t  = כותרת חופשית (לטופיקים) — מחליפה את ברירת המחדל.
//   sub= שורת-משנה חופשית (אם רוצים לעקוף את השליפה האוטומטית).

import React from 'react';
import { ImageResponse } from '@vercel/og';

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
async function topPhrases(n) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/gematria_words?ragil=eq.${n}&is_verified=eq.true&visibility_tier=lte.1&select=phrase&limit=40`,
      { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } }
    );
    const rows = await r.json();
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    const out = [];
    rows
      .map((x) => (x.phrase || '').trim())
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

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const nRaw = searchParams.get('n');
  const w = (searchParams.get('w') || '').trim();
  const t = (searchParams.get('t') || '').trim();
  const subParam = (searchParams.get('sub') || '').trim();
  const n = nRaw && /^\d+$/.test(nRaw) ? parseInt(nRaw, 10) : null;

  // המילה/המספר הגדול במרכז
  const hero = w || (n != null ? String(n) : 'סוד 1820');
  const heroIsNumber = !w && n != null;

  // שורת המשנה: "מה שווה למספר" או "= n"
  let sub = subParam;
  if (!sub) {
    if (w && n != null) {
      sub = `שווה ל־${n}`;
    } else if (heroIsNumber) {
      const phrases = await topPhrases(n);
      sub = phrases.length ? phrases.join('  ·  ') : 'מרכז ההתכנסות';
    } else if (t) {
      sub = t;
    }
  }

  // כיתוב ויראלי בתחתית (ניתן לעקיפה דרך cap=)
  const cap = (searchParams.get('cap') || '').trim();
  const teaser = cap
    ? cap
    : heroIsNumber
    ? `מה המספר ${n} יודע עליך?`
    : w
    ? `מה מסתתר ב"${w}"?`
    : 'מה המספרים יודעים עליך?';

  const font = await fetch(new URL('./_assets/heebo-800.ttf', import.meta.url)).then((r) =>
    r.arrayBuffer()
  );

  // התאמת גודל הגופן לאורך הגיבור (כולל כותרות פוסט/טופיק ארוכות — מתכווץ וגולש נקי)
  const heroSize = hero.length <= 4 ? 320 : hero.length <= 8 ? 200 : hero.length <= 14 ? 120
                 : hero.length <= 22 ? 88 : hero.length <= 34 ? 66 : 52;
  // גודל שורת הגימטריה — שורה אחת תמיד (מתכווץ לפי אורך)
  const subSize = sub.length <= 16 ? 52 : sub.length <= 26 ? 42 : sub.length <= 38 ? 34 : sub.length <= 52 ? 27 : 22;

  const tree = h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 38%, #1a1340 0%, #0b0820 45%, #05030d 100%)',
        fontFamily: 'Heebo',
        position: 'relative',
      },
    },
    // מסגרת זהב עדינה
    h('div', {
      style: {
        position: 'absolute',
        top: '28px',
        left: '28px',
        right: '28px',
        bottom: '28px',
        border: '2px solid rgba(212,175,55,0.45)',
        borderRadius: '24px',
        display: 'flex',
      },
    }),
    // כתר + מותג עליון
    h('div', { style: { display: 'flex', fontSize: '56px', marginBottom: '2px' } }, '👑'),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          color: '#d4af37',
          fontSize: '34px',
          letterSpacing: '6px',
          marginBottom: '8px',
        },
      },
      h('span', null, '✦'),
      h('span', null, rev('סוד 1820')),
      h('span', null, '✦')
    ),
    // הגיבור — מספר/מילה ענקיים (מספרים לא הופכים, רק מילות עברית)
    h(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: `${heroSize}px`,
          fontWeight: 800,
          color: '#ffe9a8',
          lineHeight: 1.12,
          textShadow: '0 0 40px rgba(212,175,55,0.55)',
          padding: '4px 24px',
          maxWidth: '1080px',
          textAlign: 'center',
        },
      },
      heroIsNumber ? hero : rev(hero)
    ),
    // שורת המשנה — מה שווה לו
    sub
      ? h(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: `${subSize}px`,
              color: '#f3ead0',
              marginTop: '24px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            },
          },
          rev(sub)
        )
      : null,
    // כיתוב ויראלי + קריאה לפעולה
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '46px',
          gap: '8px',
        },
      },
      h('div', { style: { display: 'flex', fontSize: '40px', color: '#d4af37', fontWeight: 800 } }, rev(teaser)),
      h('div', { style: { display: 'flex', fontSize: '30px', color: '#b9b3d6' } }, rev('תתחילו לגלות') + ' · sod1820.co.il')
    )
  );

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Heebo', data: font, weight: 800, style: 'normal' }],
  });
}
