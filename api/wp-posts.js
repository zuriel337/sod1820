export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? '47';
  const perPage  = searchParams.get('per_page') ?? '10';
  const page     = searchParams.get('page') ?? '1';

  const wpUrl = `https://sod1820.co.il/wp-json/wp/v2/posts` +
    `?categories=${category}&per_page=${perPage}&page=${page}&_embed=1` +
    `&_fields=id,title,date,slug,link,excerpt,_embedded`;

  const wpRes = await fetch(wpUrl, {
    headers: { 'User-Agent': 'SOD1820-Bot/1.0' },
  });

  if (!wpRes.ok) {
    return new Response(JSON.stringify({ error: `WP ${wpRes.status}` }), {
      status: wpRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data  = await wpRes.json();
  const total = wpRes.headers.get('X-WP-Total') ?? '0';
  const pages = wpRes.headers.get('X-WP-TotalPages') ?? '1';

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-WP-Total': total,
      'X-WP-TotalPages': pages,
    },
  });
}
