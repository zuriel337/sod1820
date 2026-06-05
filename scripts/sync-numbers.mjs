import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function extractNumbers(text = '') {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ');
  return [...new Set(plain.match(/\b\d{1,5}\b/g) ?? [])]
    .map(Number)
    .filter(n => n > 0)
    .sort((a, b) => a - b);
}

async function run() {
  console.log('📥 מוריד 10 פוסטים מקטגוריה 47...');

  const res = await fetch(
    'https://sod1820.co.il/wp-json/wp/v2/posts' +
    '?categories=47&per_page=10&page=1&_embed=1' +
    '&_fields=id,title,date,slug,link,excerpt,_embedded'
  );

  if (!res.ok) throw new Error(`WP error ${res.status}`);
  const posts = await res.json();
  console.log(`  ✓ התקבלו ${posts.length} פוסטים`);

  const rows = posts.map(p => {
    const title   = p.title?.rendered ?? '';
    const excerpt = p.excerpt?.rendered ?? '';
    const nums    = extractNumbers(title + ' ' + excerpt);

    console.log(`  [${p.id}] ${title.replace(/<[^>]*>/g,'')} → מספרים: ${nums.join(', ') || '—'}`);

    return {
      wp_id:     p.id,
      title,
      excerpt,
      content:   '',
      image_url: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
      date:      p.date,
      slug:      p.slug,
      link:      p.link,
      author:    p._embedded?.author?.[0]?.name ?? '',
      categories: ['תיעוד'],
    };
  });

  console.log('\n📤 שומר ל-Supabase...');
  const { error } = await supabase
    .from('posts')
    .upsert(rows, { onConflict: 'wp_id' });

  if (error) throw error;
  console.log(`✅ נשמרו ${rows.length} פוסטים!`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
