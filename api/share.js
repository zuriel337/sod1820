// דף-נחיתה לשיתוף חידוש. סורקי וואטסאפ/פייסבוק (שלא מריצים JS) מקבלים
// תגיות Open Graph מלאות עם תמונת כרטיס דינמית; גולש אנושי מנותב ליעד האמיתי.
// נגיש דרך /i/:id (rewrite ב-vercel.json).

import { fetchInsight, humanDestination, clip, escapeHtml, SITE } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const insight = await fetchInsight(id);

  // אין חידוש תקף → הפניה לבית המדרש
  if (!insight) {
    return Response.redirect(`${SITE}/beit-midrash`, 302);
  }

  const shareUrl = `${SITE}/i/${encodeURIComponent(insight.id)}`;
  const ogImage = `${SITE}/api/og?id=${encodeURIComponent(insight.id)}`;
  const dest = humanDestination(insight);

  const title = clip(insight.title, 110) || 'חידוש מאומת · סוד1820';
  const descSrc = insight.body || insight.proof || 'חידוש מאומת מבית המדרש של סוד1820 — השפה האלוקית של היקום.';
  const desc = clip(descSrc, 180);

  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t} · סוד1820</title>
<link rel="canonical" href="${escapeHtml(dest)}" />
<meta name="description" content="${d}" />

<meta property="og:site_name" content="SOD1820" />
<meta property="og:locale" content="he_IL" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${escapeHtml(shareUrl)}" />
<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />

<meta http-equiv="refresh" content="0; url=${escapeHtml(dest)}" />
<script>location.replace(${JSON.stringify(dest)});</script>
</head>
<body style="background:#07050E;color:#f6e27a;font-family:sans-serif;text-align:center;padding:40px">
<p>פותח את החידוש… <a href="${escapeHtml(dest)}" style="color:#e8c840">המשך ←</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
