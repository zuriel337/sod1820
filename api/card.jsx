// תמונת שיתוף דינמית (Open Graph) — נוצרת on-the-fly דרך @vercel/og.
// כשמשתפים /number/358 או /topic/... → og.js מצביע על /api/card?... והרובוט
// מקבל תמונה 1200×630 עם המספר/המילה הגדולים + מה שווה לו + כיתוב ויראלי.
//
// פרמטרים:
//   n  = מספר (למשל 358) — מוצג ענק, ומתחתיו הביטויים השווים לו.
//   w  = מילה/ביטוי להבליט (למשל "משיח") — מוצג ענק, ומתחתיו "= n".
//   t  = כותרת חופשית (לטופיקים) — מחליפה את ברירת המחדל.
//   sub= שורת-משנה חופשית (אם רוצים לעקוף את השליפה האוטומטית).

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

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
    // ייחוד + העדפת ביטויים קצרים ומשמעותיים, עד 3
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

  // כיתוב ויראלי בתחתית
  const teaser = heroIsNumber
    ? `מה המספר ${n} אומר עליך?`
    : w
    ? `מה מסתתר ב"${w}"?`
    : 'מה המספרים אומרים עליך?';

  const font = await fetch(new URL('./_assets/heebo-800.ttf', import.meta.url)).then((r) =>
    r.arrayBuffer()
  );

  // התאמת גודל הגופן לאורך הגיבור
  const heroSize = hero.length <= 4 ? 320 : hero.length <= 8 ? 200 : hero.length <= 14 ? 120 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 38%, #1a1340 0%, #0b0820 45%, #05030d 100%)',
          fontFamily: 'Heebo',
          direction: 'rtl',
          position: 'relative',
        }}
      >
        {/* מסגרת זהב עדינה */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '28px',
            right: '28px',
            bottom: '28px',
            border: '2px solid rgba(212,175,55,0.45)',
            borderRadius: '24px',
            display: 'flex',
          }}
        />

        {/* מותג עליון */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#d4af37',
            fontSize: '34px',
            letterSpacing: '2px',
            marginBottom: '10px',
          }}
        >
          <span>✦</span>
          <span>סוד 1820</span>
          <span>✦</span>
        </div>

        {/* הגיבור — מספר/מילה ענקיים */}
        <div
          style={{
            display: 'flex',
            fontSize: `${heroSize}px`,
            fontWeight: 800,
            color: '#ffe9a8',
            lineHeight: 1,
            textShadow: '0 0 40px rgba(212,175,55,0.55)',
            padding: '4px 24px',
          }}
        >
          {hero}
        </div>

        {/* שורת המשנה — מה שווה לו */}
        {sub ? (
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              color: '#ffffff',
              marginTop: '26px',
              maxWidth: '1000px',
              textAlign: 'center',
            }}
          >
            {sub}
          </div>
        ) : null}

        {/* כיתוב ויראלי + קריאה לפעולה */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '46px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', fontSize: '40px', color: '#d4af37', fontWeight: 800 }}>
            {teaser}
          </div>
          <div style={{ display: 'flex', fontSize: '30px', color: '#b9b3d6' }}>
            היכנסו לגלות · sod1820.co.il
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Heebo', data: font, weight: 800, style: 'normal' }],
    }
  );
}
