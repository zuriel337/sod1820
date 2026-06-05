import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Vercel API proxy — accessible from Codespace
const API_BASE = 'https://sod1820.vercel.app/api/wp-posts';

function extractNumbers(text = '') {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  return [...new Set(plain.match(/\b\d{1,5}\b/g) ?? [])]
    .map(Number)
    .filter(n => n > 0)
    .sort((a, b) => a - b);
}

async function findCategory(nameQuery) {
  console.log(`🔍 מחפש קטגוריה "${nameQuery}"...`);
  const res = await fetch(
    `https://sod1820.co.il/wp-json/wp/v2/categories?search=${encodeURIComponent(nameQuery)}&per_page=5`
  ).catch(() => null);

  if (res?.ok) {
    const cats = await res.json();
    if (cats.length) {
      console.log(`  נמצאו: ${cats.map(c => `${c.name} (${c.id})`).join(', ')}`);
      return cats[0].id;
    }
  }
  return null;
}

async function syncCategory(categoryId, categoryName) {
  console.log(`\n📥 סורק קטגוריה ${categoryName} (${categoryId}), 10 פוסטים ראשונים...`);

  const res = await fetch(`${API_BASE}?category=${categoryId}&per_page=10&page=1`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

  const posts = await res.json();
  console.log(`  ✓ התקבלו ${posts.length} פוסטים`);

  const rows = posts.map(p => {
    const title   = p.title?.rendered ?? '';
    const excerpt = p.excerpt?.rendered ?? '';
    const nums    = extractNumbers(title + ' ' + excerpt);

    console.log(`  [${p.id}] ${title.replace(/<[^>]*>/g, '').trim().slice(0, 50)} → מספרים: ${nums.slice(0, 8).join(', ') || '—'}`);

    return {
      wp_id:      p.id,
      title,
      excerpt,
      content:    '',
      image_url:  p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
      date:       p.date,
      slug:       p.slug,
      link:       p.link,
      author:     p._embedded?.author?.[0]?.name ?? '',
      categories: [categoryName],
    };
  });

  console.log(`\n📤 שומר ${rows.length} פוסטים ל-Supabase...`);
  const { error } = await supabase
    .from('posts')
    .upsert(rows, { onConflict: 'wp_id' });

  if (error) throw error;
  console.log(`✅ נשמרו ${rows.length} פוסטים בהצלחה!`);
  return rows.length;
}

async function run() {
  // נסה למצוא קטגוריה "תיעוד אירועים" דרך ה-API — אם לא נגיש, נשתמש ב-47
  let catId = await findCategory('תיעוד').catch(() => null);
  const catName = catId ? 'תיעוד אירועים' : 'תיעוד';
  if (!catId) {
    console.log('  לא נמצאה קטגוריה — משתמש ב-47 (ברירת מחדל)');
    catId = 47;
  }

  await syncCategory(catId, catName);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
