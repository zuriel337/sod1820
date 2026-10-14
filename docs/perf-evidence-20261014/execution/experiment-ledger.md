# Isolated changes and evidence

Rows describe each change's evidence; timings from different rows are not added. Safety fixes and test-only commits do not claim a speed saving. Final acceptance uses the matched combined tree and separate hosted data.

| Runtime commit | Change | Evidence / retained reason |
|---|---|---|
| `15fb1e83` | Responsive matchMedia | `matchmedia-rpc-complete.json` versus `baseline-rpc-complete.json`: Post task −147ms; bootstrap CPU-delta CI [−219,−22], same text. READY ranges overlap; no independent READY claim. |
| `c43c6faa`, `44dd9824` | Remove font wait / Noto-only preload | Reused previously completed `8fd9c701` / `ef8a51ad` experiments; own `early-primary-rpc-complete.json` measures the resulting stack. The two reused font changes are a pair, not two additive savings. |
| `e2a209b7` | Head primary reads | `early-primary-rpc-complete.json`: primary initiation ~210ms versus ~3.6–4.6s; shared canonical reader/auth/abort/error tests. Initial Home availability churn remained visible and was fixed next. ≥400ms READY target is not inferred from request initiation. |
| `2b97b058` | Independent Home primary cards | `home-once-rpc-complete.json` versus early-primary: 61→59 reads; timing change inside noise, retained for deterministic removal of duplicate/churn work. |
| `73a3eabe` | Lazy World post projection | Reuses `c642d448`; existing isolation experiment and `lazy-arrivals-rpc-complete.json` (combined with next row). No per-row timing sum. |
| `c7039326` | Installed arrivals v2 | Live catalog/anon permission proof; no v3; `lazy-arrivals-rpc-complete.json` shows deterministic removal of failed v3 probe on each surface. Source proof/paging tests retained. |
| `e8c3a2cf` | Immediate abort/concurrent handoff | Correctness only; seven early-read tests. Original default Supabase fetch retained when no 2029 head map exists. |
| `aa626181` | Bounded Home card columns/body | `narrow-home-rpc-complete.json` versus `narrow-home-before-union.json`: matched fixture union, zero metadata differences, 582534→74717 response bytes. No fixed-delay replay timing gain claimed. |
| `6cc20ed6` | Reserve trail | Corrected `trail-desktop-before/after.json`: seven matched samples, same source/text, zero errors/misses; CLS .17936→.07815. |
| `6b0e40b9` | Hidden local World story reads | `world-hidden-before/after.json`: 61→55 reads; exact same existing visibility predicate, content reappears and reads when expanded. No independent READY improvement beyond noise claimed. |
| `1f2f4758` | World primary before extensions | `world-primary-before-enrichment.json` and `world-extension-failure.json`: source-first READY6025→4789ms; identical read hashes/links; six intentional trace failures cannot block admitted public source. |
| `647331c4` | Lazy preview snapshot | `lazy-preview-byte-budget.json` / `post-lazy-preview-data.json`: ordinary reading chunk −74035 raw bytes; fallback data retained; timing difference inside noise. |
| `568c783b` | Lazy admitted golden executors | `post-lazy-golden-executors.json`: same functions/args, existing admission, one fewer ordinary-reading resource; 37 focused tests including golden packs. Small timing change is inside noise, not a claimed READY win. |

Shared constants, exact-preview metadata, bounded capture, replay/extension CI, SQL drafts and fixture updates are separately committed as enforcement or review evidence. The SQL draft was never executed. `combined-after.json` is an intermediate full-stack measurement; `combined-final.json` includes the last byte boundaries. Physical-device/Israel and signed-in full content acceptance are still open.
