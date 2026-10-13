import { readFile, writeFile } from 'node:fs/promises';
import { planAvatarBackfill } from './g3-community-foundation-runtime/avatarBackfill.mjs';

const [identityPath, sourcePath, reportPath, ...extra] = process.argv.slice(2);
if (!identityPath || !sourcePath || !reportPath || extra.length) {
  throw new Error('Usage: node scripts/plan-openweb-avatar-backfill.mjs identity-map.json authorized-avatar-export.json output-report.json (offline; no DB writes)');
}
const [identities, sourceAvatars] = await Promise.all([identityPath, sourcePath].map(async path => JSON.parse(await readFile(path, 'utf8'))));
const report = planAvatarBackfill(identities, sourceAvatars);
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
process.stdout.write(JSON.stringify({ mode: report.mode, summary: report.summary, unmatched_source_count: report.unmatched_source_count }) + '\n');
