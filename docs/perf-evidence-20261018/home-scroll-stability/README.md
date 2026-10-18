# Home scroll stability — exact-build evidence

## Scope and source

- Baseline: `gpt/perf-unified-candidate-20261018@8f78c0c7ced835849a816a815abf05a7247ceead`.
- Product fix: `f75912dea3b5810b08ed24367f309b9946722ce3` on `gpt/perf-home-scroll-stability-20261018`.
- Product source scope: `2029.html`, `src/components/experience2029/sod2029.css`, and `src/components/experience2029/useSettledBox2029.js` only.
- `index.html` is byte-for-byte unchanged from the baseline. No Legacy, route, data, flag, CI, deployment, or production file was changed.

The baseline had four horizontal clipping ancestors around Home: `html`, `body`, `#root`, and `.sod29-root`. The shell also made `.sod29-root` the nested vertical scroll container. When a failed Home area above the viewport released unused reserved height, exact scroll compensation preserved the reading marker but Chromium still reported CLS, and the System Frame header scrolled out of its viewport-sticky position.

The fix keeps the horizontal overflow guard on `html` and removes only the redundant inner clipping from the 2029 document and `.sod29-root`. The settled-box hook now keeps the full reserve while it is visible, while the person is scrolling, or while scroll restoration holds the page. Once the box is entirely above the viewport and the person is idle, it caps the reserve at 160 px and compensates the measured displacement in the same task. A box below the viewport remains capped immediately. Retry, loading, empty/error content, and the next entry's full remembered reserve are preserved.

## Reproduction and result

`run-shell-matrix.mjs` serves an exact built 2029 tree on loopback under the repository's native network isolation. It uses deterministic geometry and checks widths 320, 390, 1440, and 1920 in dark, light, and parchment themes. The matrix deliberately applies the same above-viewport 900 px to 160 px reserve change and exact compensation on both builds.

| Width | Baseline CLS | Candidate CLS | Reading marker delta | Horizontal overflow | Header top, baseline → candidate |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 320 | 0.1250 | 0 | 0 px | 0 px | -560 px → 0 px |
| 390 | 0.0831 | 0 | 0 px | 0 px | -560 px → 0 px |
| 1440 | 0.0434 | 0 | 0 px | 0 px | -560 px → 0 px |
| 1920 | 0.0275 | 0 | 0 px | 0 px | -560 px → 0 px |

The values were identical across all three themes. The candidate passed all 12 matrix cells with these unchanged gates:

- reserve exactly 160 px;
- CLS at most 0.001;
- reading-marker displacement at most 1 px;
- horizontal overflow at most 1 px;
- sticky header top at most 1 px from the viewport top;
- desktop sidebar remains inside the frame;
- exact dark/light/parchment theme projection.

Raw receipts:

- [`baseline-8f78c0c7.json`](./baseline-8f78c0c7.json)
- [`candidate-f75912de.json`](./candidate-f75912de.json)

## Regression gates

- `test/home-settled-box-2029.test.mjs` plus `test/home-settled-box-dom-2029.test.mjs`: 53/53 passed in Chromium. These cover the 160 px cap, activity delay, restoration hold, measured compensation, no CLS, retry, and a negative control on the old hook.
- `test/scroll-return-2029.test.mjs`: 26/26 passed in Chromium. These cover repeated return entries, failures/empty results above the reading place, exact anchor return, user scroll cancellation, and the old-hook negative control.
- Home readiness, retry, scroll-anchor, scroll-restoration, and evidence-runner suites: 75/75 passed.
- System Frame, 2029 isolation, cheap-hardening, and control-plane gates passed.
- Full Legacy + 2029 build passed. The 2029 bundle budget passed 5/5.

The exact candidate matrix can be repeated with:

```sh
PERF_CHROME=/path/to/chrome node scripts/ci-isolation/run.mjs -- \
  node docs/perf-evidence-20261018/home-scroll-stability/run-shell-matrix.mjs \
  --dist /path/to/exact-2029-dist \
  --sha f75912dea3b5810b08ed24367f309b9946722ce3 \
  --expect candidate --out candidate.json
```

## Limits

This is a deterministic loopback shell and geometry proof in Chromium. It is not a real-corpus or hosted-preview speed measurement and makes no LCP, network, or data-query improvement claim. The available public fixture did not contain the complete Home data/snapshot set, so no missing input was replaced with empty or invented data. Firefox, Safari, a physical phone, authenticated flows, and a hosted post-fix preview were not measured.
