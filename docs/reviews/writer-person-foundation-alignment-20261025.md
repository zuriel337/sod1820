# Writer Person Foundation alignment — technical continuation

Status: IMPLEMENTED / LOCALLY TESTED / BRANCH ONLY. This is a data-composition
slice, not acceptance of the final Person 2029 experience or a new rank model.

Branch: `gpt/writer-person-projection-20261025`.
Exact base: `dd3bdf8db5c6eeec87286aadbc5872d6f0ead62f`.
The parent retains `47a70cbe` and `dd3bdf8d`; do not duplicate those patches when
integrating. Remote central was independently checked at
`09d3dbb1fe149aa41377ec87b81849b4bd271e37`; main at
`e73687221aa2ab639930643e5cc8c99666adce88`.

## Authority and scope

ZURIEL requested continued alignment before later integration. Live read-only
coordination verified the previous technical loader scope was released. BEFORE:
`563a31ca-02ec-4a8e-9d57-074084ff2b2c`, task
`WRITER_PERSON_PROJECTION_20261025`.

Semantic owner: live Person Foundation v6, `project_codex` 24,
`person_foundation_contract`, especially §§11–15. The supporting calibration
artifact 34 remains NON-CANONICAL: its candidate weights/bands are not executable
promotion thresholds. Live coordination v17 retains Claude's exclusive visual
lane and passive reporting to ZURIEL. No agent was activated.

The existing `research_level_of` is a five-level participation/XP function. It
cannot supply 2029 Research Standing. The existing `researcher_reputation` is the
research dossier owner, but its live aggregate is not a privacy-filtered public
dossier/progression reader. Neither function, nor the previously identified
unsafe public Person resolver, is newly connected by this slice.

## Delivered behavior

Both public writer loader paths now attach `personProjection`, composed through
the existing `projectPersonProfile2029` with viewer fixed to `public`.

- Seven separate axes: Activity, Tenure, Community Impact, Contribution, Research
  Standing, Publication, Human Curation. Each measurement carries its source,
  denominator/scope and measured/not-measured state. Scores remain null.
- Complete certified publication-family counts may supply posts/cipher records.
  General source completeness is not inferred from unrelated family coverage.
- A complete Tzvi catalogue supplies publication/media counts; paired image/text
  counts once. All source refs and canonical recent items remain unchanged.
- An incomplete/missing/malformed count stays null. A complete measured zero is
  retained. A loaded community page is not an author-wide total. Its likes and
  messages are not folded into the source catalogue.
- Research level, score and next-level progress remain unavailable. Existing
  role text, item volume, XP, credits, legacy rank, or supplied R-level cannot
  create researcher capability or standing. Only the canonical contributor kind
  describes the existing capability; capability alone supplies no rank.
- Person identity is not invented from a Contributor ID. `identityScope` remains
  `contributor`, `personBinding` is `unresolved`, and `personRef` stays null until
  the canonical privacy-safe resolver is ready. This is not full Person unification.
- The overview now labels elapsed time as time **since account registration**,
  with explicit `account_registration` provenance. Historical community tenure
  and last connection remain unknown. A page creation date is not substituted.

There is no additional network request, per-card query, full research read,
identity merge, persistence, score formula or parallel profile database. The
existing identity query additionally selects its existing `kind` column.
Overview data can be composed through the adapter's explicit overview argument;
the loader does not add an overview request on entry.

## Visual handoff and open dependencies

**The currently rendered medallion still uses the old five-level endpoint.**
This technical slice does not remove that visual gap and must not be presented
as completion of the new grade display. Current visual JSX/CSS is untouched.

Claude's next design should consume this source-backed projection, keep public
portrait/name as the medallion's identity, and expose separate meaningful axes
with Explain-Why. Do not convert five lights into eight, map XP to R-levels,
invent a percentage/threshold, or present unavailable values as zero. R6/R7 need
the existing governed Human Gate. Final composition requires real-data visual
review in the three presets and mobile/desktop sizes.

| Dependency | State after this slice |
| --- | --- |
| Writer-to-existing-Person projection adapter | Implemented and connected to both writer loaders |
| Canonical privacy-safe Person binding/resolver | Pending; no unsafe fallback |
| Public seven-axis presentation / medallion replacement | Claude visual work pending |
| Public research dossier and calibrated R0–R7 gates | Pending owning-layer implementation/acceptance |
| Community history/likes/reactions | Existing native reader retained; lazy total composition still pending |
| Historical tenure / public presence | No invented dates or private activity fallback |
| Unified self/My World experience | Separate continuation, not completed here |

## Verification

- Nine relevant Node test files passed. New negative/integration coverage checks
  canonical capabilities, public-only composition, missing vs zero, partial
  families, candidate-vs-finding distinction, paired references, preserved recent
  items, ignored old ranks/XP/credits, registration basis, and both loader paths
  without additional reads.
- Twenty local browser regressions passed: 320/390/1440 × light/parchment/dark ×
  Tzvi/Neria, plus two seeded-admin-session cases. Real components consume
  synthetic anonymous HTTP data; no live mutations or hosted-browser claim.
- `npm run build` passed the Production lock and Legacy/2029 builds.
- Anonymous live loader readback: Tzvi 1,058 catalogue artifacts including five
  posts, ten requests, observed 3.356 seconds; Neria six cipher records and two
  posts, thirteen requests, observed 1.998 seconds. Seven axes present, Research
  Standing null, canonical Person binding unresolved. No private activity,
  legacy-rank/reputation RPC, unsafe Person resolver or full-research request.
- Anonymous overview readback confirmed account-registration provenance and
  unknown historical community tenure. No public last-seen value is introduced.
- These timings are single network observations, not performance percentiles.
- `git diff --check` passed.

Six changed files: the new adapter and its test; the public writer loader;
overview model and existing identity/actions test; this review.

Central integration must first account for parent commits `47a70cbe` and
`dd3bdf8d`, check patch equivalence/ownership, then integrate this continuation.
Previous `85e2f966`/`20f24ea5` patches were already integrated equivalently and must
not be applied again. No main/central merge, deployment, Production, product
DB/RLS, privacy/publication, 573-row review, subscription/credits construction,
World/controller/Frame/Auth or visual changes are part of this slice. Release
the six file claims on delivery.
