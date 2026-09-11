import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20260911_phrase_indexability_contract_v1.sql', 'utf8');
const sitemap = readFileSync('api/sitemap.js', 'utf8');
const entityPage = readFileSync('src/pages/EntityPage.jsx', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');

test('phrase indexability extends the existing lifecycle/provenance tree, not a new score registry', () => {
  assert.match(migration, /create or replace function public\.sitemap_phrases\(\)/i);
  assert.match(migration, /create or replace function public\.is_phrase_indexable\(p_phrase text\)/i);
  assert.match(migration, /is_verified\s*=\s*true/i);
  assert.match(migration, /is_published\s*=\s*true/i);
  assert.match(migration, /node_id is not null/i);
  assert.match(migration, /dna_status in \('core','dna'\)/i);
  assert.match(migration, /cardinality\(g\.source_wp_ids\)/i);
  assert.doesNotMatch(migration, /search_count|page_views|traffic|random|ai_score/i);
});

test('addressable phrase pages publish only through the canonical phrase admission decision', () => {
  assert.match(entityPage, /rpc\("is_phrase_indexable", \{ p_phrase: decoded \}\)/);
  assert.match(entityPage, /setPhraseRobots\(false\)/);
  assert.match(entityPage, /const admitted = !error && data === true/);
  assert.match(entityPage, /if \(!admitted\) clearEntityJsonLd\(\)/);
  assert.match(sitemap, /rest\/v1\/rpc\/sitemap_phrases/);
  assert.match(sitemap, /\/number\/['"]? \+ encodeURIComponent\(phrase\)/);
});

test('Google Discover large-image preview permission is present without claiming Discover inclusion', () => {
  assert.match(indexHtml, /<meta name="googlebot" content="max-image-preview:large" \/>/);
});
