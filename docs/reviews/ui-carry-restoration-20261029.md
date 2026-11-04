# UI carry restoration — dated evidence

This review records a bounded source comparison from 29 October 2026 against
`b9121d1f191b9510b96a6c0dcfa337058c8c8396`. The canonical product plan remains
`public.project_codex.id=37`; section 12.5 supplies the 17 surface names. This
file and [the source receipt](ui-carry-receipt-20261029.json) are dated evidence,
not a replacement plan or owner. The Preview builder injects the actual final
build SHA and branch into the emitted receipt; this source does not guess them.

## Current restoration

The source under review restores a compact header theme chooser and the existing
community surface. Community Preview admits bounded public feed/context reads,
offers date ordering and search within loaded rows, and links to the original
OpenWeb conversation instead of embedding it in the read-only Preview. Expanded
filters, full-archive search and replies/counts are not accepted. This is partial
community reading, not a full community, permission or backend acceptance.

## Carry evidence and remaining comparison

- The older World, ELS, hints, personal area, Journey, community and Raziel
  handoff SHAs listed in the receipt are ancestors of the base. Ancestry is
  evidence of commit history, not proof of runtime acceptance or deployment.
- The five specified Zvi commits are patch-equivalent; the checked
  `eb50c21f..989b8eda` range has 31 equivalent patches. The long source branch
  itself was not accepted as a whole.
- Books `40382ae`, `76bf32d` and `7882f8a`, hint image UI `ecba3e7`, Posts
  metrics `10e4a9e`, the performance handoff `f19f7cf` and ELS handoff
  `b24dc6c` are not ancestors. Their semantic carry remains unverified: that
  observation alone does not establish that their work is missing. ELS has newer
  29 October branches; neither a branch date nor `b24dc6c` establishes the latest
  accepted source. Check current handoffs and ownership before further work.
- The 17-surface inventory in the JSON differentiates route presence,
  integration evidence and outstanding acceptance. It is not a claim that all
  surfaces were reviewed end to end or are ready for production.

## Verification and boundaries

Both Legacy and 2029 builds, the built graph (48,362 bytes recovered), lazy
Raziel adapter/Research Plan, isolation, System Frame, cheap hardening, Legacy
lock and Preview auth/closed-projection gates passed. Node tests passed:
656 Raziel, 43 Community contracts, and 13 Preview mock/auth contracts.

Synthetic Chromium regressions passed: personal replies 3/3, Community/Person
19/19, message actions 26/26. These do not establish live DB/RLS behavior.
The separate personal-replies pending-account-switch case needs SQL export and
was not run; account switching during message actions was exercised.

The restoration harness passed 24/24: 18 width/theme combinations and six
Community cases (320/390/1440, normal and cold hash entry with a delayed feed).
It checked Tab/blur, Escape/refocus, outside click, theme persistence, header
geometry, lazy history and no external OpenWeb/SSO. Hosted smoke is recorded
in the canonical plan's dated append and task AFTER at the final SHA.
Only identity, date, surface count and a partial-verification marker are emitted
as `/preview-carry-receipt.json`; internal handoffs are not published into the
product. The full source receipt remains repository review evidence.

Known Community holds: advanced server ordering, filters and whole-archive
search need a separately accepted reader (`community_feed_page_v2` is absent).
Replies/counts remain blocked in the read-only Preview pending parent-chain
visibility acceptance. Existing message-action, Person and private-return code
is preserved. No migration, product-DB/RLS, live Edge or Production change is
implied. Existing large-chunk warnings remain; no budget was increased.
