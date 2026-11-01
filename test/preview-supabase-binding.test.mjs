import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../src/lib/supabase.js', import.meta.url);

test('Supabase candidate binding is preview-configurable and fail-closed', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const CANONICAL_SUPABASE_URL = 'https:\/\/linswmnnkjxvweumprav\.supabase\.co'/u);
  assert.match(source, /VITE_SUPABASE_URL/u);
  assert.match(source, /VITE_SUPABASE_PUBLISHABLE_KEY/u);
  assert.match(source, /\^https:\\\/\\\/\[a-z0-9\]\{20\}\\\.supabase\\\.co\$/u);
  assert.match(source, /\^sb_publishable_/u);
  assert.match(source, /previewSupabaseUrlAllowed && previewSupabaseKeyAllowed/u);
  assert.doesNotMatch(source, /VITE_SUPABASE_(?:SERVICE|SECRET)/u);
});
