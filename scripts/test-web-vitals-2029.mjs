import assert from "node:assert/strict";
import {
  WEB_VITALS_VERSION,
  buildWebVitalsSnapshot,
  createClsState,
  createInpState,
  rateWebVital,
} from "../src/lib/webVitalsCore.js";

assert.equal(WEB_VITALS_VERSION, 1);

// CLS: shifts within <1s gaps and <5s window accumulate; later window stands alone.
{
  const cls = createClsState();
  cls.add({ value: 0.04, startTime: 100, hadRecentInput: false, sources: ["main.hero"] });
  cls.add({ value: 0.05, startTime: 850, hadRecentInput: false, sources: ["main.hero", "section.async"] });
  cls.add({ value: 0.99, startTime: 1200, hadRecentInput: true, sources: ["button"] });
  cls.add({ value: 0.03, startTime: 2100, hadRecentInput: false, sources: ["footer"] });
  assert.deepEqual(cls.snapshot(), {
    cls: 0.09,
    cls_shift_sources: ["main.hero", "section.async"],
  });
}

// A 5s boundary resets the session window even when individual shifts are small.
{
  const cls = createClsState();
  cls.add({ value: 0.07, startTime: 0, hadRecentInput: false });
  cls.add({ value: 0.02, startTime: 900, hadRecentInput: false });
  cls.add({ value: 0.08, startTime: 5000, hadRecentInput: false });
  assert.equal(cls.snapshot().cls, 0.09);
}

// INP: unique interactionId, max duration per interaction, 98th-percentile outlier rule.
{
  const inp = createInpState();
  for (let i = 1; i <= 49; i += 1) inp.add({ interactionId: i, duration: i });
  assert.deepEqual(inp.snapshot(), { inp_ms: 49, interaction_count: 49 });

  inp.add({ interactionId: 50, duration: 500 });
  // 50 interactions => discard one highest outlier; next-highest is 49ms.
  assert.deepEqual(inp.snapshot(), { inp_ms: 49, interaction_count: 50 });

  // Duplicate entries for one interaction keep the longest duration only.
  inp.add({ interactionId: 10, duration: 120 });
  assert.equal(inp.snapshot().interaction_count, 50);
  assert.equal(inp.snapshot().inp_ms, 120);
}

// Thresholds + aggregate snapshot remain explicit and null-safe.
{
  assert.equal(rateWebVital("cls", 0.1), "good");
  assert.equal(rateWebVital("cls", 0.1001), "needs_improvement");
  assert.equal(rateWebVital("lcp_ms", 4001), "poor");
  assert.equal(rateWebVital("inp_ms", null), null);

  const cls = createClsState();
  const inp = createInpState();
  cls.add({ value: 0.01234, startTime: 10, hadRecentInput: false, sources: ["img.hero"] });
  inp.add({ interactionId: 1, duration: 180.4 });
  const snap = buildWebVitalsSnapshot({ clsState: cls, inpState: inp, lcpMs: 2200.26, fcpMs: 900, ttfbMs: 410 });
  assert.equal(snap.cls, 0.0123);
  assert.equal(snap.lcp_ms, 2200.3);
  assert.equal(snap.inp_ms, 180.4);
  assert.equal(snap.ratings.cls, "good");
  assert.equal(snap.ratings.lcp, "good");
  assert.equal(snap.ratings.inp, "good");
}

console.log("G3 2029 Web Vitals core: PASS");
