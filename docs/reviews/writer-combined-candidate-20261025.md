# 2029 writers: combined visual, biography and editor candidate

Branch: `gpt/community-manager-bios-20261025`; PR #1155.
Central base: `aef4ac254927a6d534dbceb84a4e85bf9f90ef5d` on
`gpt/2029-central-writer-world-focus-20261025`.
Validated code head: `d8a2ecc1398f1a2b729af4c7196362f291fc051b`.
The final documentation commit follows this code head; its SHA and exact Preview deployment are
recorded in the PR and passive AFTER. No central merge is implied.
Task: `WRITER_VISUAL_TECHNICAL_COMBINED_REVIEW_20261025`.
BEFORE: `f36318d2-ed98-493c-af6d-2b43a744ab3b`.

## Final behavior and attribution

The existing public Person family now combines Claude's reading typography, identity medallion,
mobile hierarchy and semantic colors with the approved historical biographies and the technical
page-editor refresh fix. A confirmed save retains the editor, acknowledgment and subsequent draft;
transient refresh failure retains same-account state, while authentication failure masks it.

The Night action fill is royal blue, while action text uses its accessible light-blue role. The
contrast patch changes exactly 36 text declarations in 13 CSS files. A mechanical comparison
verified that all other CSS bytes in that patch, including the large graphic glyph exception,
were preserved. This is a shared 2029 token-consumer change, not just writer-page styling; it is
not a claim that every screen has undergone a complete accessibility audit. Night's warm canvas,
identity gold, fills, boundaries, focus roles and saved ELS finding colors remain as delivered.

Emily and the explicitly identified Esther26 display the approved note:

> מנהלת ותיקה בקהילת סוד 1820, פעילה ומלווה את הקהילה מזה כעשור.

It is an approved historical statement, not a permission, account binding or computed tenure.
On compact screens it appears in the existing opened “הדרך של…” panel; on desktop it appears in
the introduction. Their source dossiers remain private. The other source named אסתר is untouched.
The two previously authorized bio-field updates are already recorded in the biography handoff;
this integration performs no new live product-data writes.

## Commit equivalence and integration order

The first four candidate commits were already present: `d6e73c36`, `246991f9`, `75bcf0f6`,
`495b0327`. The following released Claude commits were applied in order without conflicts or
authored presentation changes. Authorship is preserved; all listed pairs have identical stable
patch IDs.

| Source | Candidate | Purpose |
| --- | --- | --- |
| `d25915a6` | `75bcf0f6` | Editor save/refresh behavior and deterministic browser checks |
| `3e84ea74` | `495b0327` | Technical verification note |
| `5c6c188d` | `68d8f654` | Night semantic roles and saved ELS color compatibility |
| `a07f613c` | `02c32aac` | Person family typography, hierarchy and mobile |
| `a5bfa85a` | `1ca9e5cd` | Claude's real-anonymous visual evidence |
| `38058fd` | `d8a2ecc1` | Accessible text consumers, contrast guard and browser check |

PR #1155 is the combined candidate. Do not separately apply PR #1154 or the source editor patches
after integrating it. Source branches are retained. The central base already contains the
writer/community/World lineage; no old writer-catalog patches were applied again.

## Independent verification on the combined code

- `npm run build`: Legacy and 2029 passed, including the mandatory Production lock.
- 23 focused Node test files passed: contributor/catalog/Person, community, private writer,
  research-sync, Person/Directory, semantic palette and accent-text guard. No skips.
- Production lock, cheap hardening, World surface, Legacy containment, public language and
  `git diff --check` passed.
- Real anonymous public data: visual family 27 cases across Tzvi/Yaniv/Emily and
  320/390/1440 × Day/Parchment/Night; zero page errors or unexpected writes.
- Real anonymous public data: contact-back control 6 cases at 390/1440 × three presets.
  Ratios: Day 6.44:1, Parchment 6.72:1, Night 11.62:1; 18px text, visible keyboard focus and
  working back action. This verifies the reported contrast defect independently.
- Real anonymous biographies: Emily and Esther26 at 320/390/1440, six cases; approved text
  visible in the intended panel/hero, no horizontal overflow, legacy rank absent, no writes.
- Built App2029 with controlled HTTP fixtures: 16 community cases; ten private-area functional
  flows plus six deterministic editor refresh/acknowledgment cases passed. The new draft is
  checked after the refreshed overview actually renders. Repeated capture matrix was skipped.
- Built App2029 with controlled HTTP fixtures: writer routes in nine viewport/theme combinations,
  paired-media and text exact World occurrence, reload and return-context round trips passed.
- Shared ELS browser suite: all 34 cases passed, zero failures/skips (477.3 seconds), including
  all presets, stored-color identity, exact matrices, touch geometry, saves and privacy fixtures.
- Catalog network/performance sample on Tzvi at 390/Night: 20 recent cards and 20 cards on the
  first full-catalog page; switching to all added zero data requests. No
  `world_contributor_research_v1` or `research_objects` query ran. The one
  `research_contributions` request belongs to attributed community contributions. Cards appeared
  in 6,551ms in one local cold-page sample with real anonymous data through the proxy; this is
  not a production benchmark or a performance-improvement claim. Zero page errors/writes.

Independent logs, patch-equivalence report, CSS mechanical review, browser JSON and six fresh bio
captures are under `/workspace/artifacts/writer-combined-review-20261025/`. Existing committed
Claude captures remain in `writer-visual-family-evidence-20261025/`. The final change includes
25 runtime source files, eight test files, 49 existing visual-evidence artifacts and four review
documents (86 paths including this document); the PR diff is the exact file manifest.

## Boundaries, dependencies and remaining gaps

Protected hosted Preview is required for human visual acceptance. Anonymous live reads above ran
against the local built app; `/api/*` was unavailable and telemetry/mutations were blocked. Private
save/photo/follow/message behavior used fixtures; no hosted authenticated owner save is claimed.
The Preview's exact deployment/SHA and whether its protection allowed application-level checks
must be read from the final PR/AFTER, not inferred from an older Preview URL.

Person binding remains unresolved; unsafe public Person RPCs were not connected. Unknown metrics
remain unknown. Public research rank is not inferred from XP/likes or the medallion, and private
progress still uses its existing older component. Esther's audited imported-message likes are
3,509, not a verified lifetime total; no unverified lifetime baseline was added. Imported archive
coverage does not include all earlier activity visible in the supplied 2016 screenshots.

Stale loader/catalog/community-reuse tests and the previously reported research-engine baseline
failures were not repaired or declared green. The old intermittent editor failure is addressed
by the technical fix and deterministic checks in this candidate. The curated historical public
bio annotations must stay consistent with approved edits until safe Person binding is available.

No main/central merge, Production deployment, domains, deployment-protection changes, DB/RLS,
identity/publication/privacy changes or new subscription/credit work. Release this integration
scope in the passive AFTER; wait for central integration confirmation before another phase.
