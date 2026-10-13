# Stage 0 — rollback compatibility and capability containment

Branch-only correction from production rollback `99249526e91f1d720fae1aa43e82bbbe51ee5c45`, revised after ZURIEL explicitly keeps the active Legacy Number and phrase URLs public until a verified replacement. **`afd7320b` is superseded and must not be promoted.** No live flags or product data are changed.

Reference work `49d72cd10801956b3af6fe99711ba68aad287ffe` is preserved in GitHub tag `checkpoint/g4-49d72cd1` and local branch `reference/g4-49d72cd1`. No merge/cherry-pick of #1082. World and ELS retain their open baseline. Home, Posts, cipher content and Chat retain their existing readers and routes.

## Route and discovery policy

| Routes | Access in this candidate | Public discovery |
|---|---|---|
| `/number` | Active Legacy search, no native Number lock | Canonical label **דף המספר**, indexable search entry |
| `/number/:phrase` (numeric and phrase values) | Active Legacy reader until verified replacement | Keep existing admitted sitemap entries. OG and client consume `is_number_indexable` / `is_phrase_indexable`; unknown/rejected admission is noindex without closing content access |
| `/2029/number/:value` | `lock_number`, currently closed | noindex while closed, omitted from public sitemap; missing flag fails closed |
| `/numbers` | `lock_convergence_tree`, currently closed | Existing convergence hub stays distinct from Legacy Number |
| `/books`, `/book/:slug`, aliases | `lock_books`, currently closed | Closed metadata, omitted from sitemap |
| `/heichal`, `/היכל`, `/heichal.html` | `lock_heichal`, currently closed; old HTML 307 to same gated entry | Closed metadata, including encoded Hebrew crawler alias |
| `/journey`, `/journey-beta`, `/מסע`, `/2029/journey` | `lock_life_journey`, currently closed | Closed metadata; existing middleware 403 for crawlers on old Journey routes stays |
| `/forum`, `/forum/:id` | `lock_forum`, currently closed | UI and public discovery agree |
| `/cross`, `/הצלבה` | `lock_cross`, currently closed | Same state for both aliases |
| `/research` | Existing `lock_research`, registered-only | Existing crawler 403, unknown flags fail closed |
| `/world`, `/els`, existing public content | Existing open baseline | Existing public discovery preserved |

The only human-decision change in this revision is the active Legacy Number/phrase compatibility policy. No other opening decision was found in the bounded live ledger scan. Current live `site_flags` and their decision messages confirm the other rows above. This does not infer a new opening from a previously unwrapped route.

Availability is still owned by `site_flags_lock_law v3`. This revision does not add a second flag, store or local status. The native Number surface still consumes `lock_number`; its active compatibility predecessors are not silently treated as the same release surface.

## Implementation and naming

- Remove `lock_number` wrappers only from the two active Legacy routes. Retain the native Number wrapper and all other confirmed gates.
- Limit the `lock_number` discovery projection to `/2029/number/*`, restoring all active `/number/*` entries from the existing sitemap owner rather than manufacturing URLs.
- Legacy numeric and phrase crawler documents call the existing **STABLE** index-admission RPCs before declaring indexability. They do not read/change `lock_number`. Numeric-prefix phrases stay phrases; anchor metadata remains numeric-only. Canonical addresses are retained.
- Public names follow Design V2 §11.7: **דף המספר**, **היכל**, **ספרים ומקורות**, **מסעות**. The separately owned `/numbers` hub keeps **עץ ההתכנסויות**. A blocked route's document title uses its existing canonical capability label rather than the internal code name.
- Prior stage-0 fail-closed gates, navigation refresh, no-store capability metadata and the old Heichal HTML redirect remain.

## Validation and measurements

Commands: `npm run build`; `node --test scripts/test-stage0-containment.mjs`; `PLAYWRIGHT_MODULE=<installed playwright/index.mjs> node scripts/test-stage0-lock-browser.mjs`; existing SEO/AI, cheap-hardening, Legacy Research and document-isolation regression scripts; `git diff --check`.

The focused suite covers Legacy numeric/phrase access independently of missing/closed native flags, admission true/false/unavailable, exact canonical URLs, preservation of public sitemap URLs, and all remaining blocked families. The controlled browser suite covers 13 auth/flag/navigation cases.

`scripts/measure-stage0-number-navigation.mjs` records entry and actual React navigation before/after on fixed deployment SHAs, desktop and 390px mobile (CPU x4; 150ms / 1.6Mbps). Three fresh-context repetitions per profile follow Number 1820 → its existing Royal Gate → expression אמת → Back → Home → Legacy Number search → Number 1820. It reports presentation time, request count, cold-document LCP/TTFB, and content/indexability observations. SPA navigation times are not labeled LCP. These are laboratory measurements, not Traffic Intelligence human-entrance counts or field percentiles. The same verified read-only RPC allowlist is used before/after; telemetry, writes and realtime are suppressed.

Exact-commit preview observations, URL-set restoration counts and numeric measurements are attached in the work-log handoff and external evidence report after deployment. Live admin/registered accounts and product writes are not exercised. No main merge, main push or production promotion is included.
