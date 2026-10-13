import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePublicEntry } from '../scripts/prepare-public-entry.mjs';

test('deployment root uses native graph while legacy deep links retain their independent graph', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sod-public-entry-'));
  const native = '<head></head><script type="module" src="/assets/2029-native.js"></script>';
  const legacy = '<meta name="google-site-verification" content="public-verification" /><meta property="og:title" content="SOD1820" /><script type="module" src="/assets/index-legacy.js"></script>';
  try {
    await writeFile(join(dir, 'index.html'), legacy);
    await assert.rejects(preparePublicEntry(dir));
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), legacy);
    await writeFile(join(dir, '2029.html'), native);
    await preparePublicEntry(dir);
    await preparePublicEntry(dir);
    const root = await readFile(join(dir, 'index.html'), 'utf8');
    assert.match(root, /2029-native\.js/);
    assert.doesNotMatch(root, /index-legacy\.js/);
    assert.match(root, /google-site-verification/);
    assert.match(root, /og:title/);
    assert.equal(await readFile(join(dir, 'legacy.html'), 'utf8'), legacy);
    assert.equal(await readFile(join(dir, '2029.html'), 'utf8'), native);
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
    assert.match(config.buildCommand, /prepare-public-entry\.mjs/);
    assert.equal(config.rewrites.find(row => row.source === '/(.*)' && !row.has)?.destination, '/legacy.html');
    assert.equal(config.redirects.find(row => row.source === '/index.html')?.destination, '/');
    const social = config.rewrites.findIndex(row => row.source === '/(.*)' && JSON.stringify(row.has).includes('facebookexternalhit'));
    for (const source of ['/post/(.*)', '/video/(.*)']) {
      assert.ok(social < config.rewrites.findIndex(row => row.source === source && !row.has));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
