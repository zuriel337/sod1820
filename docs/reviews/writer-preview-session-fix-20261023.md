# Writer Preview API access fix

The signed-in personal profile could show the generic area-load failure even though its document was accessible. All five writer API adapters explicitly used `credentials: "omit"`. On a Vercel-protected Preview this removes the same-origin deployment-access cookie, so fetch follows the protection login redirect and receives HTML instead of the API JSON. The same defect affected the writer overview, rank, message capability and curation adapters.

Change those relative same-origin requests to `credentials: "same-origin"`. Public handlers still use their existing anonymous Supabase clients. Private handlers still require a verified Bearer JWT and enforce existing RLS/ownership/Origin checks. Cookies alone grant no account data; no auth provider, protection setting, database policy or visual component changes.

A new real Chromium regression uses the actual five adapters and a local HTTP protection gate with an HttpOnly cookie. It reproduces the old HTML redirect, verifies the corrected reads/local fixture mutations, verifies cookie-only private access returns 401, keeps public rank/overview free of session Authorization, and blocks a switched account before a request. Every external browser request is blocked. No live account or product mutation is used.

Base `b3224d8f06fd684db43155cacbad132dfef7b13d`; branch `claude/2029-writer-preview-session-fix-20261023`. Exact head/Preview supplied with delivery. The screenshot's full deployment URL was requested because its address is truncated; the local reproduction proves the defect and fix, not the exact response on that unknown URL. Ordinary requests to the known latest Preview reached Vercel SSO. No bypass link or protection change was attempted.

Coordination: live relevant ownership checked, no independent active overlapping writer found. A local BEFORE exists in `work/writer-preview-session-before.txt`. Passive live work-log writing remains blocked by the prior automatic approval rejection; no retry or indirect write was used. Handoff is reported to ZURIEL pending authorized journal recording. No merge/main/Production.

Validation: real protected-gate browser regression PASS (old redirect reproduced; seven adapter flows succeed; cookie-only 401; switched principal refused). Four direct-file Node suites PASS **36 contained cases**; `npm run build:2029` PASS; private built-app regression PASS **10 flows**, no JS errors; `git diff --check` PASS. Private regression uses local fixtures and no live writes.
