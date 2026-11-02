# Public launch useful loading — 2026-11-02

Task PUBLIC_LAUNCH_USEFUL_LOADING_20261102. Product base/origin verified at 1bd9fe91c874f6ce578934afb45f9c9257891040; continuing the existing isolated public-reading release branch. Passive BEFORE c09d8bea-565c-4775-a510-cacb69107462. Runtime acceptance is pending; this is a remotely saved implementation checkpoint.

Measured baseline diagnostic (one run, not a before/after claim): mobile primary Home DOM 6.207s, driver 6.946s. Home code admission starts after the PublicPostAddress/Post dependency chain (Home fetch ~4.293s, primary API ~5.502s). World→Number: drawer ~1.902s; Number body/canonical methods ~7.399s; driver 8.319s. Complete entity projection hides canonical methods already read independently. Phrase Back re-reads the same method profile: mobile ~1s, desktop ~0.7s, before driver polling completes.

Changes under acceptance:
- Overlap existing public-profile Post code admission with Home code; retain WordPress ?p= document adaptation and first-Post preparation; no speculative Post data read.
- Present canonical Number identity/calculation independently of material projection. Material pending/failure stays explicit, with retry and reserved geometry. Context/root/reader guards prevent old focus/data from appearing after navigation or identity change.
- Reuse already completed canonical method rows for at most 30 seconds, expression/reader scoped, bounded in memory; reader changes/logout invalidate old handles. Retry bypasses reuse, canceled readers cannot save responses, reads do not extend freshness. No personal information or pending promise is cached.
- Restore the inert public-findings button inside the Number source section before approach admission. Its own read is explicit-click-only. This fixes the existing SSR placement test without changing or weakening it; generic source reads remain approach-admitted.

No change to product data, shared server/DB/Auth/RLS/flags, Legacy, root default, production guards, credits, public locks, URLs or model access. Production artifact, full Isolation/A3 and real database/media recovery remain separately tracked launch work, not presumed passed by this checkpoint.
