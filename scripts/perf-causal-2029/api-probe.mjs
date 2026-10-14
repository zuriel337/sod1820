// Bounded sequential anonymous GETs. No product writes, RPCs or stored response bodies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { SUPABASE_URL, SUPABASE_ANON } from '../../src/lib/supabasePublicConfig.js';
import { entryPrimaryReads2029, postReadUrl } from '../../src/lib/postReadQueries2029.js';
const exec = promisify(execFile);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sod-perf-causal-api-'));
const query = p => postReadUrl(SUPABASE_URL, entryPrimaryReads2029(p)[0]);
const endpoints = { trivial: `${SUPABASE_URL}/rest/v1/galleries?select=id&limit=1`, home: query('/'), world: query('/world'), post: query('/post/seventh-to-tenth-sefirot-2027') };
const sequence = Array.from({ length: 5 }, (_, round) => Object.entries(endpoints).map(([label, url]) => ({ label, url, round }))).flat();
const rows = [];
function argv(item, mode, i) {
  const bodyFile = path.join(temp, `${mode}-${i}.body`), headerFile = path.join(temp, `${mode}-${i}.headers`);
  const fmt = `{"mode":"${mode}","label":"${item.label}","round":${item.round},"status":%{http_code},"http":"%{http_version}","dns":%{time_namelookup},"tcp":%{time_connect},"tls":%{time_appconnect},"ttfb":%{time_starttransfer},"total":%{time_total},"downloadBytes":%{size_download},"newConnections":%{num_connects}}\n`;
  return { bodyFile, headerFile, args: ['--silent', '--show-error', '--compressed', '--http2', '--max-time', '15', '-H', `apikey: ${SUPABASE_ANON}`, '-H', `Authorization: Bearer ${SUPABASE_ANON}`, '-H', 'Accept-Profile: public', '--output', bodyFile, '--dump-header', headerFile, '--write-out', fmt, item.url] };
}
function collect(metadata, item, files) {
  const body = fs.readFileSync(files.bodyFile), headers = fs.readFileSync(files.headerFile, 'utf8');
  const parsed = JSON.parse(body);
  if (metadata.status !== 200 || !Array.isArray(parsed) || !parsed.length || parsed.length > (item.label === 'home' ? 21 : 1)) throw new Error(`${item.label}: wrong status/content bounds`);
  rows.push({ ...metadata, url: item.url, decodedBytes: body.length, rows: parsed.length,
    bodyHash: createHash('sha256').update(body).digest('hex'),
    identity: item.label === 'world' || item.label === 'post' ? parsed.map(r => ({ id: r.id, slug: r.slug })) : null,
    serverTiming: headers.match(/^server-timing:\s*(.*)$/im)?.[1]?.trim() ?? null,
    server: headers.match(/^server:\s*(.*)$/im)?.[1]?.trim() ?? null });
  fs.unlinkSync(files.bodyFile); fs.unlinkSync(files.headerFile);
}
try {
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i], files = argv(item, 'fresh-connection', i);
    const { stdout } = await exec('curl', files.args, { maxBuffer: 1024 * 1024 });
    collect(JSON.parse(stdout.trim()), item, files);
  }
  const files = sequence.map((item, i) => argv(item, 'reused-connection', i));
  const args = files.flatMap((f, i) => i ? ['--next', ...f.args] : f.args);
  const { stdout } = await exec('curl', args, { maxBuffer: 1024 * 1024 });
  stdout.trim().split('\n').forEach((line, i) => collect(JSON.parse(line), sequence[i], files[i]));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
const output = { method: 'Live anon GET, HTTP2, sequential 40 total requests; fresh curl connection versus reused curl connection; inherited agent proxy; not Israel/browser/production field evidence', rows };
fs.writeFileSync('docs/perf-causal-evidence-20261014/api-transport.json', JSON.stringify(output, null, 2) + '\n');
for (const mode of ['fresh-connection', 'reused-connection']) for (const label of Object.keys(endpoints)) {
  const s = rows.filter(r => r.mode === mode && r.label === label), v = s.map(r => r.ttfb * 1000).sort((a, b) => a - b);
  console.log(mode, label, 'TTFB median/range ms', v[2], v[0], v.at(-1), 'newConnections', s.map(r => r.newConnections));
}
