import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

const WP_API = 'https://sod1820.co.il/wp-json/wp/v2/posts';

async function run() {
  let page = 1, totalPages = 1, total = 0;

  while (page <= totalPages) {
    console.log(`📥 מביא דף ${page}/${totalPages}...`);
    const res = await fetch(
      `${WP_API}?per_page=100&page=${page}&_embed=1`,
      { headers: { 'User-Agent': 'SOD1820-Sync/1.0' }, signal: AbortSignal.timeout(30000) }
    );
    if (!res.ok) { console.error(`שגיאה ${res.status}`); break; }

    totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
    const posts = await res.json();

    const rows = posts.map(p => ({
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
    }));

    const { error } = await supabase
      .from('posts')
      .upsert(rows, { onConflict: 'wp_id' });

    if (error) { console.error('❌ Supabase:', error.message); process.exit(1); }

    total += rows.length;
    console.log(`  ✓ נשמרו ${rows.length} פוסטים (סה"כ: ${total})`);
    page++;
  }

  console.log(`\n✅ סנכרון הושלם — ${total} פוסטים`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
