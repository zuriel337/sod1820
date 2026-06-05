import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const WP_API = 'https://sod1820.co.il/wp-json/wp/v2/posts';
const CATEGORY_ID = 47;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sync() {
  console.log('📥 מוריד פוסטים מ-WordPress קטגוריה', CATEGORY_ID, '...');

  const rows = [];
  let page = 1, totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(
      `${WP_API}?categories=${CATEGORY_ID}&per_page=100&page=${page}&_embed=1`
    );
    if (!res.ok) { console.error('WP error', res.status); break; }
    totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
    const data = await res.json();
    console.log(`  עמוד ${page}/${totalPages} — ${data.length} פוסטים`);

    for (const p of data) {
      rows.push({
        wp_id: p.id,
        title: p.title?.rendered ?? '',
        content: p.content?.rendered ?? '',
        excerpt: p.excerpt?.rendered ?? '',
        image_url: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
        date: p.date,
        slug: p.slug,
        link: p.link,
        author: p._embedded?.author?.[0]?.name ?? '',
        categories: (p._embedded?.['wp:term'] ?? [])
          .flat()
          .filter(t => t.taxonomy === 'category')
          .map(t => t.name),
      });
    }
    page++;
  }

  if (!rows.length) { console.log('לא נמצאו פוסטים.'); return; }

  console.log(`\n📤 שומר ${rows.length} פוסטים ל-Supabase...`);
  const { error } = await supabase
    .from('posts')
    .upsert(rows, { onConflict: 'wp_id' });

  if (error) { console.error('שגיאת Supabase:', error.message); process.exit(1); }
  console.log(`✅ סונכרנו ${rows.length} פוסטים בהצלחה!`);
}

sync();
