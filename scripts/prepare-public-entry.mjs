import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Vercel may serve the physical index before SPA rewrites. Publish the native
// document there and retain the independent legacy document for its routes.
export async function preparePublicEntry(directory = 'dist') {
  const root = resolve(directory);
  const native = await readFile(resolve(root, '2029.html'), 'utf8');
  const index = await readFile(resolve(root, 'index.html'), 'utf8');
  if (!/src="\/assets\/2029-[^"]+\.js"/.test(native)) throw new Error('Native build entry is missing');
  if (/src="\/assets\/index-[^"]+\.js"/.test(index)) {
    await copyFile(resolve(root, 'index.html'), resolve(root, 'legacy.html'));
  } else {
    const legacy = await readFile(resolve(root, 'legacy.html'), 'utf8');
    if (!index.includes(native.match(/<script[^>]+src="\/assets\/2029-[^"]+\.js"[^>]*>/)[0]) || !/src="\/assets\/index-[^"]+\.js"/.test(legacy)) {
      throw new Error('Independent legacy build entry is missing');
    }
  }
  const legacy = await readFile(resolve(root, 'legacy.html'), 'utf8');
  // Keep the existing public domain verification and root share metadata, never
  // legacy scripts, styles, manifests or UI. Deep pages retain their own OG route.
  const metadata = legacy.match(/<meta\s+(?:name="(?:google-site-verification|facebook-domain-verification|twitter:[^"]+)"|property="og:[^"]+")[^>]*>|<link\s+rel="canonical"[^>]*>/g) || [];
  await writeFile(resolve(root, 'index.html'), native.replace('</head>', metadata.join('\n') + '\n</head>'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await preparePublicEntry(process.argv[2]);
  console.log('Public root prepared; independent legacy document retained.');
}
