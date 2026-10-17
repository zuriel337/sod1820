// Version every change to timing, readiness or layout-shift semantics.
export const MEASUREMENT_PROFILE = Object.freeze({
  version: 'cold-replay-v3',
  requestClock: 'controller-monotonic-calibrated-browser-epoch-v1',
  readiness: 'home-visible-primary-v3-world-post-rendered-v2',
  cls: 'max-session-window-1s-gap-5s-span-observed-lab-window-v1',
  observation: 'primary-current-network-quiet-500ms-plus-1000ms-v2',
  collection: 'immutable-read-snapshot-with-pending-response-count-v1',
});

// Calibrate before navigation, never from a response handler. Keep the tightest
// round trip and its uncertainty; browser absolute time survives hard navigation.
export async function calibrateRequestClock(page, now = () => performance.now()) {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const before = now();
    const epoch = await page.evaluate(() => performance.timeOrigin + performance.now());
    const after = now();
    samples.push({ offsetMs: epoch - (before + after) / 2, uncertaintyMs: (after - before) / 2 });
  }
  const calibration = samples.sort((a, b) => a.uncertaintyMs - b.uncertaintyMs)[0];
  return { ...calibration, epochNow: () => now() + calibration.offsetMs };
}

export function documentTime(epoch, timeOrigin) {
  if (!Number.isFinite(epoch) || !Number.isFinite(timeOrigin)) throw new Error('Invalid measurement clock');
  return epoch - timeOrigin;
}

// Response handlers may still append during collection/teardown. Never expose
// their mutable epoch-stamped array as a finalized document-clock sample.
export function snapshotReads(reads, timeOrigin) {
  return reads.map(read => ({ ...read, start: documentTime(read.start, timeOrigin) }));
}
