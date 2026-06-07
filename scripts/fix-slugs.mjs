import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket;
const sb = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);
const { data } = await sb.from('posts').select('wp_id,slug').like('slug', '%d7%');
console.log(`מתקן ${data.length} slugs...`);
for (const p of data) {
  await sb.from('posts').update({ slug: decodeURIComponent(p.slug) }).eq('wp_id', p.wp_id);
}
console.log('✅ הושלם');
