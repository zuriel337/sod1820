// Runs the legacy findAll in a worker thread so a runaway query can be terminated (timeout behaviour).
import { parentPort, workerData } from 'node:worker_threads';
import { loadLegacy } from './legacy.mjs';
const { letters, scope } = workerData;
const lg = loadLegacy(letters, scope);
parentPort.postMessage({ ready: true, sha: lg.sourceSha });
parentPort.on('message', ({ term, cap }) => {
  const t0 = performance.now(); const r = lg.findAll(term, cap); const ms = performance.now() - t0;
  parentPort.postMessage({ ms, capped: r.capped, hits: r.hits.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start })) });
});
