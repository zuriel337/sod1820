# עשרת העומקים — אב־טיפוס למרחב לימוד

BEFORE · GPT → ZURIEL · YETZIRAH_DEPTHS_LIVE_PROTOTYPE_20261028

Base `efb9f720dcfc014e26116fca3cac15aebd2e95d3`, clean verified Books Preview. User explicitly approved the proposed visual prototype after reporting responsive/product shortcomings. Bounded live coordination read verified with dedicated read-only connection; old relevant scopes reconciled with release records and no active overlapping writer found. Local BEFORE, not a live ledger write. Current site main remains `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

Scope: existing SeferYetzirahWorld2029Page variant `experience=depths`, using the existing source panel, source-bound depth model and model renderer. One desktop workbench, adaptive mobile model/explanation/source views, five source-derived pair steps and meaningful direct inspection, existing palette/type/source identities. This is the user's reviewable prototype; retain established reader experience and other twelve-model acceptance. No canonical contract rewrite until visual adoption. No other books, Legacy, SystemFrame, World/Post, main/Production, DB/RLS/permissions, source content or engine changes.

## IMPLEMENTED — reviewable prototype, not whole-book acceptance

Branch: `codex/yetzirah-depths-live-prototype-20261028`. Entry: `/2029/control?surface=sefer-yetzirah-world&experience=depths`. The established URL without this query variant retains the existing twelve-structure reader. No new route, reader store, palette, typography contract, or provider was introduced.

- Desktop: one synchronized workbench, 60% exploration / 40% source by default; source share adjustable between 32% and 48%.
- Phone/tablet: explicit model / explanation / source views, a visible source-page thumbnail, preserved component selection and source return. Leaving the model unmounts its GPU context; returning resumes only a previously user-opened model. Refresh never starts GPU.
- Five source pairs, with direct counterpart selection, pair isolation, initial camera reset and optional reduced-motion-aware rotation. Only the six actual spatial directions receive spatial coordinates. Beginning/end and good/evil remain conceptual reading pairs; no fictitious fourth/fifth axes.
- Existing source component, stable identities and source data reused. Source bound to physical PDF page 53. Invalid component deep links show an explicit message and leave source available rather than silently displaying a different component.
- Explicit source opening/return reanchors the native viewer even if its internal page has moved while the React source page remains unchanged; ordinary selection does not repeatedly reload the same source.
- Camera framing adapts to aspect ratio; selected labels remain readable at narrow widths. Ordinary twelve-model renderer defaults are retained.

## Actual source image and native PDF

The narrow inline Chromium native PDF plugin was visually observed painting a thin slice despite reporting a successfully loaded document. Fullscreen displayed the actual scan correctly. Therefore this prototype's mobile source view displays a derivative of **actual physical page 53**; its existing fullscreen button and external original link still open the original 220-page PDF. Desktop retains the original native PDF iframe. This does not claim that all 220 pages have image derivatives, nor that mobile inline-PDF painting is solved globally.

Source PDF SHA-256: `2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a`.

Derivative: `public/book-data/sefer-yetzirah-page53-preview.webp`, 637 × 900 pixels, 106,468 bytes, SHA-256 `39562d3ee1025dad73f72fcf4d2c83b6743ce7fabf9b451164336b9ed78dfae8`.

Reproduction (provide the original verified PDF at a local path):

```sh
pdftoppm -f 53 -l 53 -singlefile -scale-to 900 -png SOURCE.pdf /tmp/sefer-yetzirah-page53-preview
convert /tmp/sefer-yetzirah-page53-preview.png -quality 82 public/book-data/sefer-yetzirah-page53-preview.webp
SEFER_YETZIRAH_SOURCE_PDF=SOURCE.pdf node --test test/yetzirah-depths-live-prototype-2029.browser.test.mjs
```

No source text, geometry relationships, canonical engine result or original PDF was changed. This image is a source derivative, not an AI reconstruction.

## Verification and boundaries

- Static Books: 344/344 passed, no skips.
- Prototype Chromium: six widths (320/390/768/1024/1440/1920) in parchment, plus light/dark at 320/390/1440: twelve viewport/theme combinations. Source/selection/refresh/return, pair focus, conceptual pairs, horizontal overflow, explicit GPU, dynamic reduced motion, GPU loss and unavailable fallback covered.
- Actual verified source PDF is served in the 390 and 1440 parchment cases; native PDF viewer must report 220 pages and the physical page 53, not merely an iframe URL. Other theme/width cases deliberately abort PDF requests. Supabase reader responses are fixtures, not live data acceptance. Original PDF fullscreen is captured separately from the mobile source image.
- Existing twelve-model browser smoke: all twelve models at 320/light passed. Existing Books-to-Yetzirah reader entry test passed. This is a regression smoke, not a fresh full 108-combination acceptance claim.
- Language 3/3, integrated Preview Auth Guard 4/4, normal and Preview Build 2029, built graph/weight, hard isolation, cheap hardening and Legacy Production Lock passed. Normal eager gzip JS 379,579 bytes; Preview 376,882 bytes. Budgets and tests were not relaxed.
- Chromium uses SwiftShader, not a physical phone or hardware-GPU performance certification. No Safari/device claim. No canonical engine run. Whole-book completion and canonical adoption of the prototype are not claimed.

Final local screenshots are in `yetzirah-depths-live-prototype-20261028/`: desktop, mobile model, mobile full source image, and native-PDF fullscreen. Browser tests wait for the actual native page before source screenshots. The desktop native-PDF screenshot uses its real viewport: a full-page screenshot was observed resetting the plugin during capture-induced resizing, and is not evidence of the displayed physical page.

## AFTER / handoff

GPT → ZURIEL · owner: existing Books reader / Experience Governance · isolated prototype only. Fresh bounded live coordination recheck found no overlapping active task in the relevant recent scope; stable parent remote remains `efb9f720dcfc014e26116fca3cac15aebd2e95d3`. No integration into the stable Books branch. No main, Production, aliases, DB/RLS, grants or contract adoption. The local writing scope is released at delivery. The authorized connector is read-only: **no live BEFORE/AFTER write or live release is claimed**. This document is the passive handoff for the authorized coordinator.
