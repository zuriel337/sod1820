import fs from 'node:fs';
import {serve} from '../perf-execution-2029/serve.mjs';
await serve(new URL('../../dist/',import.meta.url).pathname,4173);
console.log('Isolated static 2029 preview listening on loopback 4173');
fs.writeFileSync(process.env.RUNNER_TEMP+'/sod-ci-preview.ready','ready');
