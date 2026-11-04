# Public reading release — configuration proposed, never activated

Task PUBLIC_READING_RELEASE_CONFIGURATION_20261101. Base cf1f8f1a35eb90c10a3a84a310f8616b2121f965.
One deployment-scoped projection of the existing availability resolver; no DB flag mutation,
new capability authority, content store, engine, public identity or automatic publication.

| Scope | Exact proposed state |
|---|---|
| Home `/`, World, public Posts (both approved address families), Number, phrase, gallery, `/gematria` | Open anonymous reading |
| Topic, public writer, verified public video deep links | Same existing public readers and publication boundaries |
| Map, privacy | Open |
| Account/login/OAuth/personal, community writing, mail signup, Journey, Raziel, ELS, Heichal, Books, control/review surfaces | Closed in this launch profile |
| Public calculation | Existing canonical engine only; ordinary calculation does not publish |
| Legacy | Root build, CORE_PUBLIC_LAUNCH_2029=false, root vercel.json and current live deployment preserved |

Compile **2029 only** with `VITE_PUBLIC_READING_RELEASE=public-reading-20261101`.
`__SOD_2029_BUILD__` must be true: the profile cannot affect a Legacy build, including
when a stray release env variable is present. All broad Preview bypass switches are false.
The existing hook, route boundary, server metadata and XML receive the same explicit
profile. Auth uses a separate ephemeral anonymous SDK storage key, never a saved Legacy
account/session. This is a deployment restriction, not a substitute for RLS on the shared API.
Shared API Auth/RLS/flags and Legacy callers remain exactly as before; a user opening
Supabase directly is governed by those existing server policies, not by this website's UI.

The protected review build uses the existing compiler and pre-entry read-only worker.
It denies research-run/A3, AI, private writes, credit RPCs and mail/Auth mutations.
Public reviewed STABLE readers remain available. Default old Preview behavior is preserved.
No first-load app code runs before its guard controls the page. Production must retain an
equivalent verified transport boundary, canonical origin checks, and reject mutations.

## Exact activation delta for review

1. Freeze one source SHA and protected deployment ID after the tests; record them below
   in the acceptance README. No merge or Production action is part of this task.
2. Separately obtain ZURIEL's **2029 Production cutover** approval naming SHA and deployment
   ID, as AGENTS.md requires. The existing legacy-production-lock remains unchanged and passes.
3. Review the dedicated deployment build/adapter change: use this 2029-only profile with
   the root public routes and canonical Post address split; no `/` → `/2029` redirect.
   Keep the Legacy root project configuration as the rollback artifact. The existing
   Preview builder and API adapters currently reject Production; **do not promote this
   Preview or treat changing its env to `production` as a deployment plan**. A separately
   approved activation change is still required to those guards, bound to exact artifacts.
4. Production document adapter must reuse `api/og.js` with the trusted internal profile,
   never accept profile selection from a request. Use the same merged 2029 document and
   genuine HTTP 404/503 handling. Replace Preview-only noindex headers/robots only on the
   explicitly approved canonical Production target. Index only published eligible pages;
   calculation/share queries, private/closed/unknown routes remain noindex.
5. XML reuses `api/sitemap.js` with the same internal profile, including `/gematria` and
   `/gallery`, existing eligible Numbers/phrases/topics/writers/videos and both Post URL
   families. A sitemap entry is not evidence that Google indexed it.
6. HTML/API/identity/worker remain no-store. Hashed assets: private immutable cache in
   protected review; Production asset policy may become public immutable on accepted
   deployment only. Never copy protection grants/cookies into Git or another project.
7. No site_flags changes, Auth configuration edits, migrations, model charges, production
   data writes, Cardcom changes or opening large systems are required for this reading scope.

This is an explicit configuration and activation checklist, not a claim that a Production
artifact was built, accepted or released. Production adapter/guard approval and recovery
acceptance are real remaining prerequisites; the protected Preview alone cannot close them.

## Deployment rollback versus data restore

Before any future cutover, re-read aliases of `sod1820.co.il`, `www.sod1820.co.il`,
`sod1820.vercel.app`. The last observed approved live Legacy is
`dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2` / d1837efcf5a978d10a514010f3695680f231e116.
AGENTS' older literal pin is historical; never restore over a later approved Legacy ticker.
Return only to the freshly verified approved deployment/aliases with separate authorization.
A website rollback changes code/traffic, not database rows or media objects.

The launch profile performs no product data writes, and no migrations are proposed here.
That reduces rollback coupling but is **not** evidence of a recoverable data backup.
A separate consistent database backup + actual media object backup must be restored and
verified in an egress-disabled disposable environment before claiming disaster recovery.
