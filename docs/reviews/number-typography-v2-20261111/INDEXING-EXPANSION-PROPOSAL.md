# Number indexing: comparison for a possible expansion (PROPOSAL ONLY: no DB change, no policy change)

ZURIEL (11.11.2026): advance the examination of admitting numbers with at least 5 verified public phrases, together with real Google
demand; do not activate a blanket rule; compare before/after first. This note is the comparison. Nothing in this branch changes
`sitemap_numbers()`, `is_number_indexable()`, the sitemap or any server tag.

## Today (read from the live DB and `gsc_metrics`, 10.8-8.11.2026)
- One decision, three consumers: `public.sitemap_numbers()` (admitted = >= 20 distinct phrases, or a gallery image, or an approved convergence card; since the
  Human-Gate migration `search_indexability_number_gate_v1`, 30.8.2026) -> `is_number_indexable()` -> `api/sitemap.js`, `api/og.js` (server tag) and the browser
  tag (`Number2029Page`). Verified for 1212, 130, 125, 5678, 1331, 1820, 358, "משיח", "משיח בן דוד": all four layers agree (see the PR).
- Admitted numbers: 450. Numeric URLs with impressions in 90 days: 3,559; admitted 369, not admitted 3,190 (28,248 impressions, 179 clicks).

## Candidate rule (not enabled)
A number that has >= 5 verified public phrases AND impressions in the last 90 days, and is not admitted today.
| Candidate set | URLs | Impressions (90d) | Clicks (90d) |
|---|---|---|---|
| >= 5 verified phrases, any impression | 486 | 8,097 | 100 |
| the same with >= 10 impressions | 218 | 6,936 | 83 |
| >= 10 verified phrases (no demand condition) | 216 | n/a | n/a |
Excluded by construction: numbers with no verified phrase (2,688 URLs, 15,502 impressions, 60 clicks), private expressions, unpublished content.
Numbers such as 5678 (0 phrases, 16 clicks in 12 days) show that demand alone is not a content signal, so the rule keeps the phrase condition.

## Before / after (what would change if approved)
| | Before | After (rule A: >=5 verified + demand >=10) |
|---|---|---|
| Admitted numbers | 450 | 450 + 218 |
| Sitemap URLs | 16,779 | +218 |
| Server tag, browser tag, `is_number_indexable` | identical decision | identical decision (same function) |
| Canonical | `/number/<n>` | unchanged |
| Pages already without index that Google shows today | 218 with demand | become indexable |

## Implementation constraints (for the DB approval, if it is given)
- The decision must stay in the one function `sitemap_numbers()` so the sitemap, the server tag and the browser tag cannot diverge.
- `gsc_metrics` is admin-only; `sitemap_numbers()` is public. Do not read it from the public function. Keep the demand condition in a small admitted-set
  snapshot written by an admin/service job (an existing table or `site_flags`, no new store without owner review), and let the function join that snapshot.
- Re-evaluate on a schedule; a number that loses its phrases drops out. Roll back = restore the previous function body.
- Acceptance before release: the matrix of the PR (server, browser, sitemap, canonical, robots) for 20 added and 20 unchanged numbers; sitemap count; a canary.
