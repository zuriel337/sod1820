# Mobile performance diagnosis before source fixes

Base remote4e6239c6d26e00b70ee10b341529491bd5b0b43c. BEFORE2004bcf6-a0e5-48bf-9684-3a45ad0368a7. Native actual protected deployment cnporwdqk; actual SDK/Service Worker, no mocked responses/interception.390px, CDP150ms/1.6Mbps/CPU4,600ms post-primary observation. One exploratory CPU-profiled first/repeat pair, not final statistical acceptance.

First primary-ready timings: Home6845ms, Post1211ms, World3641ms, World→Number8664ms, Number→milui4315ms. Full first31531ms; repeat12965ms. Max step CLS first0.028175/repeat0.033814 (<0.1). The older post1.081→2.090s regression used a bandwidth-queue snapshot model, not this native server; native does not establish a current2.090s constant or reproduce that exact regression. Keep the original model evidence.

Measured milui3928 waterfall: identity lookup starts1479ms into the click step; missing identity falls back to label (~265+221ms). Independent reads start~1985ms. Research rows finish~2650ms; only then numeric lookup/dossier/journey/neighbors start. Registry and phrase-node reads start~2973ms only after the entire numeric tuple. The page blocks its existing complete primary projection on these reads. No server request dominates alone; observed longest individual read650ms. ~2180ms browser TaskDuration includes600ms observation, so it is not additive to4315ms. Input dispatch/render time precedes requests and must remain measured, not called backend time.

Home includes below-fold plane source construction: requests and the post2029ReadingProjection chunk (~58kB) are loaded during entry, along with other Home shell modules. This is separate from shared Now/ticker and from the river already admitted on approach. The story is below the primary cards. Defer its mounted reader and its code using the existing approach hook, retaining the exact reserved story height/fragment and every source link. Do not defer shared updates.

Fixes to test: overlap existing independent canonical Number lenses with research rows (only the already-opted-in parallelNumberReads path), overlap family metadata with sibling reads, retain full output/error/RLS admission and source-exhaustive500 limit. Do not create a new engine or cache. Defer the below-fold Home story, including direct fragment/focus/scroll admission and failure/retry/cancellation acceptance.

No claim that reducing request count improves latency. No live product writes, models, DB/shared server changes or personal-data caching. Final comparable runs follow after build and exactSHA Preview.
