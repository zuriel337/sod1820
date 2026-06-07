import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

const WP_API = 'https://sod1820.co.il/wp-json/wp/v2/posts';
const MISSING = [7,12,14,15,16,18,20,24];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  let total = 0;
  for (const page of MISSING) {
    console.log(`📥 דף ${page}...`);
    try {
      const res = await fetch(
        `${WP_API}?per_page=50&page=${page}&_fields=id,title,date,slug,link,jetpack_featured_media_url`,
        { headers: { 'User-Agent': 'SOD1820-Sync/1.0' }, signal: AbortSignal.timeout(30000) }
      );
      if (!res.ok) { console.warn(`⚠️ ${res.status}`); await sleep(2000); continue; }
      const posts = await res.json();
      const rows = posts.map(p => ({
        wp_id: p.id,
        title: p.title?.rendered ?? '',
        content: '',
        excerpt: '',
        image_url: p.jetpack_featured_media_url ?? null,
        date: p.date,
        slug: p.slug,
        link: p.link,
        author: '',
        categories: [],
      }));
      const { error } = await supabase.from('posts').upsert(rows, { onConflict: 'wp_id' });
      if (error) { console.error('❌', error.message); continue; }
      total += rows.length;
      console.log(`  ✓ ${rows.length} (סה"כ: ${total})`);
    } catch(e) { console.warn(`⚠️ timeout`); }
    await sleep(1000);
  }
  console.log(`\n✅ ${total} פוסטים חסרים הושלמו`);
}
run().catch(console.error);
