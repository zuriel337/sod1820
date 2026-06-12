// כלי-עזר משותפים לפונקציות ה-Edge של השיתוף (קבצים עם _ אינם נחשפים כ-routes).
// אנו קוראים את החידוש דרך Supabase REST עם מפתח ה-anon (ציבורי ממילא).

export const SITE = 'https://sod1820.co.il';
const SUPA_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// מושך חידוש בודד (רק פעיל ומאושר — space=core) לפי id.
export async function fetchInsight(id) {
  if (!id) return null;
  const cols =
    'id,title,body,proof,related_numbers,related_phrases,source_ref,source_type,origin,has_1820';
  const url =
    `${SUPA_URL}/rest/v1/insights?id=eq.${encodeURIComponent(id)}` +
    `&is_active=eq.true&space=eq.core&select=${cols}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

// יעד הניווט לגולש אנושי: אם החידוש מקושר לפוסט — לפוסט; אחרת לבית המדרש.
// base = מקור ההגשה בפועל (דומיין ה-Vercel הנוכחי או sod1820.co.il לאחר העברה).
export function humanDestination(insight, base = SITE) {
  const ref = insight?.source_ref;
  if (typeof ref === 'string' && ref.trim()) {
    const v = ref.trim();
    if (/^https?:\/\//.test(v)) return v;
    if (v.startsWith('/')) return `${base}${v}`;
    const numeric = /^\d+$/.test(v);
    const isPost = !insight.source_type || insight.source_type === 'post';
    if (!(numeric && !isPost) && !/\s/.test(v) && v.length <= 200) {
      return `${base}/${v.replace(/^\/+/, '')}`;
    }
  }
  return `${base}/beit-midrash`;
}

export function clip(str, max) {
  const s = (str || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

export function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
