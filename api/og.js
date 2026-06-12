// כרטיס תמונה דינמי (1200×630) לחידוש — בעיצוב הזהב-מלכותי של סוד1820.
// משמש כ-og:image בשיתופים (וואטסאפ/פייסבוק מציגים תצוגה מקדימה).
import { ImageResponse } from '@vercel/og';
import { fetchInsight, clip } from './_lib.js';

export const config = { runtime: 'edge' };

// יוצר עץ-אלמנטים בסגנון JSX בלי לתלות ב-React (Satori מקבל את המבנה הזה).
function h(type, props, ...children) {
  const kids = children.flat().filter(c => c !== null && c !== undefined && c !== false);
  return { type, key: null, props: { ...(props || {}), children: kids.length <= 1 ? kids[0] : kids } };
}

// טוען גופן עברי (Heebo) כ-TTF דרך Google Fonts.
async function loadFont(weight) {
  const api = `https://fonts.googleapis.com/css2?family=Heebo:wght@${weight}`;
  const css = await (await fetch(api)).text();
  const m = css.match(/src:\s*url\((.+?)\)\s*format\(['"]?(?:opentype|truetype)['"]?\)/);
  if (!m) throw new Error('font url not found');
  return (await fetch(m[1])).arrayBuffer();
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const insight = await fetchInsight(searchParams.get('id'));

  const title = clip(insight?.title, 120) || 'חידוש מאומת · סוד1820';
  const numbers = Array.isArray(insight?.related_numbers) ? insight.related_numbers.slice(0, 4) : [];
  const has1820 = !!insight?.has_1820;

  const titleSize = title.length <= 38 ? 62 : title.length <= 72 ? 50 : 40;

  let fonts;
  try {
    const [reg, bold] = await Promise.all([loadFont(400), loadFont(800)]);
    fonts = [
      { name: 'Heebo', data: reg, weight: 400, style: 'normal' },
      { name: 'Heebo', data: bold, weight: 800, style: 'normal' },
    ];
  } catch {
    fonts = [];
  }

  const tree = h('div', {
    style: {
      width: '1200px', height: '630px', display: 'flex', position: 'relative',
      flexDirection: 'column', padding: '60px 70px', direction: 'rtl',
      fontFamily: 'Heebo',
      background: 'linear-gradient(135deg, #07050E 0%, #140f0c 55%, #1a0e00 100%)',
      color: '#f6e27a',
    },
  },
    // מסגרת זהב פנימית
    h('div', { style: { position: 'absolute', top: '24px', left: '24px', right: '24px', bottom: '24px', border: '2px solid rgba(212,175,55,0.38)', borderRadius: '20px', display: 'flex' } }),
    // סימן מים 1820
    h('div', { style: { position: 'absolute', bottom: '-70px', left: '40px', fontSize: '380px', fontWeight: 800, color: 'rgba(212,175,55,0.06)', display: 'flex' } }, '1820'),

    // תוכן
    h('div', { style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', justifyContent: 'space-between' } },
      // כותרת עליונה: סמל מאומת
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        h('div', { style: { width: '64px', height: '64px', borderRadius: '999px', background: 'linear-gradient(145deg,#f6e27a,#d4af37)', color: '#1a0e00', fontSize: '40px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✓'),
        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', { style: { fontSize: '26px', fontWeight: 800, color: '#f6e27a', display: 'flex' } }, 'חידוש מאומת'),
          h('div', { style: { fontSize: '18px', color: '#8a7a5e', display: 'flex' } }, 'נוצר ע״י AI · בית המדרש של סוד1820'),
        ),
      ),

      // כותרת החידוש
      h('div', { style: { display: 'flex', fontSize: `${titleSize}px`, fontWeight: 800, lineHeight: 1.32, color: '#e8c840', maxWidth: '980px' } }, title),

      // תחתית: מספרים + מותג
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
        (numbers.length || has1820) ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
          numbers.length ? h('div', { style: { display: 'flex', fontSize: '30px', fontWeight: 800, color: '#f6e27a', letterSpacing: '1px' } }, numbers.join('  ·  ')) : null,
          has1820 ? h('div', { style: { display: 'flex', alignItems: 'center', background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.38)', borderRadius: '999px', padding: '6px 18px', fontSize: '22px', fontWeight: 800, color: '#f6e27a' } }, '1820 ✦') : null,
        ) : null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(212,175,55,0.18)', paddingTop: '20px' } },
          h('div', { style: { display: 'flex', fontSize: '30px', fontWeight: 800, color: '#f6e27a' } }, 'סוד1820'),
          h('div', { style: { display: 'flex', fontSize: '24px', color: '#d4af37', fontWeight: 800 } }, 'כי לה׳ המלוכה'),
        ),
      ),
    ),
  );

  return new ImageResponse(tree, {
    width: 1200, height: 630,
    fonts: fonts.length ? fonts : undefined,
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' },
  });
}
