import fs from 'node:fs';
import { validateReplay } from './replay-gate.mjs';
const data = JSON.parse(fs.readFileSync(process.argv[2]));
const result = validateReplay(data, { functional: true });
if (data.extensionInjection?.delay !== 2000 || !data.extensionInjection?.failure) result.errors.push('Required delayed/failed-extension experiment missing');
for (const [route, value] of Object.entries(data.routes)) for (const sample of value.samples) {
  if (!(sample.ready < sample.lastRestEnd - 2000)) result.errors.push(`${route}: extensions blocked primary content`);
  if (route === '/world' && sample.reads.filter(r => r.intentionalFailure).length !== 6) result.errors.push('World trace failure injection incomplete');
}
result.valid = result.errors.length === 0;
console.log(JSON.stringify(result, null, 2)); process.exitCode = result.valid ? 0 : 1;
