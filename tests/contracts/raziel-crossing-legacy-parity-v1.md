# Raziel / 2029 — Legacy crossing parity acceptance contract
Source SHA: 4865100c8499c0fa90bc61e2b69dbb80a2d1128a. Isolated tests only.

## Modes
A — CrossFinder: METHODS + DEPTH_METHODS; candidates gematria_words ragil=input.ragil, is_verified, limit 250; exclude self, anagrams, duplicate phrases; at least 2 method-column matches; rank by match count then length, primary plus 12 more.
B — CompareTwo: two explicit inputs; computeEntity+connectToAxis; partition same-method vs cross-method equality; UI limit 6; no corpus implied.
C — 2029 Number Hidden: fn_method_profile, verified corpus, equivalence collapse, two independent same-method matches, deduplication.
D — new triangle-to-concealed bulk lookup: additional research mode, NOT substitute for A/B/C.

## Secondary behavior to preserve
Rarity score: independentMethods, bidim family sizes, zero-scale resonance, anchor-number bonus. Treat score as a ranking, not proof.
Normalization: canonical method registry and fn_normalize_for_calc, retain original phrase; distinguish קדמי, משולש מילה, משולש גדול.
Sources: UUID, calculation method, version, actual arithmetic, provenance, fact vs interpretation.
Privacy: owner-public writings and names permitted, private personal self-research, encrypted/unpublished excluded unless separately authorized. No RLS bypass.
Cost: 250 candidates, default at most 13 visible results, deterministic before optional AI.

## Golden acceptance requirements
1. Test CrossFinder legacy behavior against golden cases using different phrases and methods, ranking, anagram filtering.
2. CompareTwo same-method and cross-method positive cases plus no-match cases.
3. Number Hidden tests for independent methods and anagram exclusion.
4. Cross-method new mode verifies math, source UUID, permissions, caps.
5. Method alias and dependence tests to avoid equating קדמי with משולש מילה.
6. Rarity and optional bidim failure are graceful.
7. Client and server normalization parity; keep original user expression.
8. Anon/authenticated/admin isolation; blocked personal submissions.
9. Same canonical adapter for Number2029, Heichal and Raziel.
10. Bounded query plans and AI cost budget; no unconditional full pairwise joins.

STATUS: parity acceptance contract only, not an implemented or passing feature. Narrow v1 SQL candidate is not legacy-equivalent.