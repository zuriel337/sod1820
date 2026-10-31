# Functional unified Preview — work in progress

Product base: c2f2e9948dd119c96b69e377b33be2eb2a886efb (product parent 63e6882c). Evidence-only 070ddbc2 was not used as a product base.

BEFORE: dd6f964c-58fb-4996-98d6-e3fb0666cfaa. Separate product branch gpt/2029-functional-unified-preview-20261031. No main merge or Production deployment.

Current changes are under test and have NOT been accepted as a complete site. Exact private-hint-image 12-path delta ecba3e7ae7c9085a9e8b71608f75ceebbe13e3a0 applies cleanly; no whole historical branch imported. Client tests and isolated PostgreSQL private-media tests pass. Existing Preview guard negatives remain green. Home left Companion/context rail is hidden by explicit user instruction while the shared living ribbon and Now reader remain.

ELS manifest: 165 identical, 9 adapted, 4 excluded; see els-preservation-audit.json. Live Google, Facebook and email providers enabled; signup is not disabled. Preview OAuth callback allowlist still requires exact verification. Live Person function derives identity from auth.uid and denies anon; the functional Preview transport is being connected to those existing permissions.

Shared changes are PREPARE ONLY pending a precise reviewed proposal, tests, rollback and separate user approval: private hint media migration/Edge update; ai-analyze client/server contract update; any Auth redirect configuration amendment if needed. No shared schema/Edge/Auth config was changed.

Fable has 2 COMPLETE jobs / 2 distinct provider batches created 2026-10-30 with cost-log references. The historical one-trial authorization cannot be claimed unused. The pricing view reports zero, which is not proof of zero provider cost. No new paid run was started.
