# עשרת העומקים — חתך מוצר מלוטש

BEFORE · GPT → ZURIEL · YETZIRAH_DEPTHS_POLISHED_PRODUCT_20261028

Approved task: deepen the reviewed Ten Depths prototype into a polished, source-bound learning example before adopting its presentation canonically or extending it to other books. Base `7be35aaeaf9f357a9d6fabf53bbbc26ec7c62061`; branch `codex/yetzirah-depths-polished-product-20261028`; current remote main independently checked at `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

Dedicated canonical read-only connection verified (`supabase_read_only_user`, `transaction_read_only=on`). Bounded live current-scope queries found no overlapping runtime writer. Existing contract-only claim has no overlap and its files are excluded. Experience v10 / Design V2 / Source identity own semantics; Books spatial addendum 1.1 is applied as the user's binding requirement, without importing or activating its branch.

Write scope: existing DepthsLearningWorkspace2029 and its scoped stylesheet; optional learning-only renderer behavior in YetzirahModelCanvas; existing SeferYetzirahWorld2029 SourcePanel prototype options; source-derived page53 image assets if required; focused tests and this handoff/evidence. No change to source units/relations, other books, ordinary reader behavior, shared frame/palette/design contracts, DB/RLS, main or Production. Existing reader and fullscreen primitive reused. Preview deployment is separately authorized by the user; it will use the established static read-only Preview builder, not normal Git auto-build flags.

Local BEFORE only. The authorized connector cannot write live coordination records; no live BEFORE/AFTER or live claim is fabricated.

## Implemented learning example

The entry remains `/2029/control?surface=sefer-yetzirah-world&experience=depths`. This is the reviewed Ten Depths variant on the existing book page, not another product reader. The ordinary twelve-structure page is preserved. No global contract is adopted or changed by this example.

The user story is: open the existing book experience → load existing validated source models from actual book JSON → choose a pair/component or follow a five-station companion guide → explicitly open the learning-only Three renderer → inspect the same physical source page, enlarge the actual scan or focus its paragraph → open and navigate the original PDF → return to the selected component.

- Free exploration and a five-station guided route follow source order: beginning/end, good/evil, up/down, east/west, north/south.
- The two conceptual pairs use selectable DOM reading cards, not invented physical axes. In guided mode the spatial stations reveal two, four, then six actual directional components. Switching to free exploration restores all six. The ten source components and five source relations remain unchanged.
- Learning-only camera changes are bounded and user-interruptible. OS/frame reduced motion removes travel and automatic rotation. Keyboard zoom, pair isolation, initial view and direct component alternatives remain available without dragging. No WebGL starts on initial page load or refresh.
- A visible Hebrew encoding legend maps selected component, counterpart and other directions to the same palette roles used by the renderer. Halos and a ground reference grid are explicitly editorial orientation aids, not additional source structures, measurements or verified results. The new graphics do not appear in the ordinary twelve-model renderer mode.
- The single workbench retains adjustable desktop 60% exploration / 40% source and mobile model/explanation/source views. The original page photo is shown alongside desktop learning, with the native PDF available in existing fullscreen/external-original actions. Its mobile thumbnail remains visible without starting GPU.
- The source photo supports whole-page view, bounded paragraph focus, readable high-resolution enlargement and a focusable keyboard/touch scroll region. Native fullscreen is reanchored on entry so a stale internal plugin page cannot silently replace the requested physical PDF page. Hidden scanned-page PDF frames are lazy-loaded; reading the photo does not require rendering WebGL.

## Source-image provenance and exact locus

Original source PDF has 220 physical pages; original SHA-256 remains `2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a`.

Physical PDF page **53**, printed page label **49**, was freshly rendered and read visually. Its central upper paragraph begins with the ten sefirot and enumerates the five depth pairs. The shared paragraph crop is `(x=610, y=400, width=555, height=235)` in the 1591 × 2250 source image. This is **one paragraph locus shared by all ten components**, not ten independently verified word boxes. The surrounding printed commentators remain visible in whole-page view and are not merged into new quotations.

New image: `public/book-data/sefer-yetzirah-page53-reading.webp`, 413,076 bytes, SHA-256 `2b7d6ab4c0f7d62878d4d9e4885347e59a639e70cde653cddd539256c3ff674c`.

```sh
pdftoppm -f 53 -l 53 -singlefile -scale-to 2250 -png SOURCE.pdf /tmp/yetzirah-depths-page53-hq
convert /tmp/yetzirah-depths-page53-hq.png -quality 86 public/book-data/sefer-yetzirah-page53-reading.webp
SEFER_YETZIRAH_SOURCE_PDF=SOURCE.pdf YETZIRAH_SCREEN_DIR=/tmp/yetzirah-depths-polished node --test test/yetzirah-depths-live-prototype-2029.browser.test.mjs
```

The SVG focus window and page outline frame those original pixels; no generative reconstruction, invented transcription, source-data correction, numeric balancing, new engine or canonical verification was performed. Companion station text is explicitly labelled **הסבר נלווה**. The photo is **דברי הספר · צילום המקור**. Technical/provenance details remain in source details, not the primary introduction.

## Verification protocol

Static Books tests include the original corpus/identity guards and three new guide/locus/derivative checks. The browser matrix covers parchment at 320/390/768/1024/1440/1920 plus light/dark at 320/390/1440: twelve contexts total. Actual verified PDF bytes, not just iframe URLs, are served for all nine 320/390/1440 × light/parchment/dark contexts; the three extra-width contexts deliberately abort PDF transport. Native viewer assertions check 220 pages and the actual selected physical page after next, previous and explicit-page entry.

The browser also checks component → source → return, deep-link refresh, source crop and high-resolution image readiness, keyboard-equivalent camera zoom, guided two/four/six reveal, close/reopen boundaries, no horizontal overflow, dynamic OS/frame motion, camera travel cancellation, unavailable WebGL and lost GPU context. Supabase responses in the local harness are bounded read fixtures; no live database/auth/write acceptance is implied. Static book assets are the actual branch assets. Chromium uses SwiftShader, not a physical mobile device or a hardware-GPU benchmark.

Ordinary reader regression is deliberately separate: all twelve existing models are exercised at 320/light, plus the existing Books-entry test. This is not a claim of a fresh 108-combination acceptance for the other models.

Final delivery records the completed results, source/viewport screenshots and exact pushed SHA separately. Tests/budgets/guards are not weakened to pass. No claim of whole-book exhaustion, engine verification, canonical integration, physical-device/Safari testing or approved global design adoption.

## Completed acceptance and AFTER

| Boundary | Outcome | Evidence |
|---|---|---|
| Source/model data → reading | PASS | 347/347 Books Node tests, no skip; five source pairs and ten components preserved |
| UI → source → return | PASS | 12 viewport/preset contexts; nine actual-PDF contexts with native 220-page viewer and physical pages 53 → 54 → 53 → direct 52 → selected source 53 |
| Reading image/crop | PASS | Verified original pixels, whole-page locus, high-resolution enlargement; fresh network PDF read SHA matches the original |
| Model interactions | PASS | Guided 2/4/6 reveal, free mode, counterpart, zoom, isolate, reset, source selection and reload without GPU |
| Accessibility/failure | PASS in Chromium | Dynamic reduced motion interrupts camera travel; no-WebGL/context-loss retain source and DOM reading actions; no horizontal document overflow |
| Ordinary reader | PASS | All twelve existing models at 320/light, separate Books entry test; no claim of a new 108-context sweep |
| Gates | PASS | Language 3/3, Auth Guard 4/4, normal/Preview Build2029, graph/weight, hard isolation, cheap hardening, Legacy Production Lock |

Eager compressed JS: normal 379,579 bytes; Preview 376,875 bytes. Prototype browser file 3/3, ordinary twelve-model browser file 1/1, reader-entry browser file 1/1. All completed without skipped tests. Matrix/runtime logs were reviewed; screenshots are checked into `yetzirah-depths-polished-product-20261028/`. The native PDF screenshot is 390/dark (its scratch filename historically included “parchment”, which is not used as evidence metadata).

Known boundaries: this is one finished implementation slice for human visual review, not a declaration that the entire Sefer Yetzirah corpus or all spatial models are complete. Reading is available without engine verification; no canonical engine was run. Browser services are fixtures locally except real PDF bytes and branch assets; the hosted Preview receives its own separate real-network smoke check before delivery. Hardware/mobile/Safari acceptance and a canonical global design-contract adoption remain outside this slice. Guide mode itself is session-local; stable component/source deep links survive reload, which never auto-starts GPU.

Handoff: GPT → ZURIEL · existing Experience/Books owner · **TESTED / BRANCH_READY**, with isolated commit/push verified at delivery. Base `7be35aaeaf9f357a9d6fabf53bbbc26ec7c62061`; exactly one continuation commit for the product, guide, source derivative, acceptance and evidence. Current live scope recheck returned no overlapping runtime writer. The local active writing scope is released after push/clean/remote verification. Dedicated connector remains read-only: no live AFTER or live release record was written or claimed. No main/Production/Legacy/DB/RLS/permissions/shared-frame or canonical-contract changes; no integration into the unified Books branch.
