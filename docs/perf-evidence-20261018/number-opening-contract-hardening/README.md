# Number opening contract hardening

Date: 2026-10-18

- Branch: `gpt/perf-number-opening-contract-hardening-20261018`
- Exact base: `gpt/perf-number-anchor-seam-20261018@51420051243a5dc10fcb9bcdf8540e2657f3dae9`
- Scope: compact Number opening reader + Number identity/anchor seam + focused tests only
- Database state: repository migration unchanged and not applied to the live project

## SQL security review

The unchanged migration remains `SECURITY INVOKER`, pins `search_path` to `public`, schema-qualifies
its source tables/functions, revokes PostgreSQL's default `PUBLIC` execute privilege, and grants
only the existing Data API roles (`anon`, `authenticated`, `service_role`). The underlying
`bidim`, `gematria_words`, `gematria_methods`, and `nodes` RLS policies remain load-bearing. No
privileged fallback, write, database apply, or policy change was introduced.

## Result

The compact opening now fails closed when the RPC envelope contradicts its bounded contract. It
rejects invalid or duplicate family identities, a Registry method that differs from its family,
returned samples that exceed their exact family count, a checkpoint that does not identify the last
returned phrase, non-canonical family order, inconsistent totals, a response limit different from
the requested bounded limit, and any change to the explicit full-depth contract.

`projectNumberOpeningCore` also rejects a Number identity or a present anchor `row.value` that does
not equal the opening root. An anchor row that does not carry a `value` field is preserved as-is; the
adapter does not invent one and cannot prove root equality from absent data.

## Intended UI sequence

The future 2029 Number surface should use this order:

1. `await fetchNumberOpeningIdentity(root)`.
2. If it returns `null`, stop without calling the compact or full Number lookup.
3. After it returns the exact existing Number identity, start these together:

   ```js
   const [opening, anchorProfile] = await Promise.all([
     fetchNumberOpeningProjection(openingIdentity.value),
     fetchNumberAnchorProfile(openingIdentity.value),
   ]);
   ```

4. Pass `openingIdentity.identity`, `opening`, and `anchorProfile` to
   `projectNumberOpeningCore`.

The existing `fetchNumberOpeningContext` remains backward compatible for non-critical callers and
reuses the same identity gate, but it waits for the anchor before returning. The identity-only gate
performs no anchor, family, graph, research or full-row read.

## Ordering and parity boundary

The compact response consumes `gematria_methods.sort_order`, the canonical Registry presentation
order. Equal sort orders remain deterministically ordered by the database contract. This is not a
claim of universal parity with the legacy `getValueFamilies` local comparator or with its
nondeterministic enrichment queries.

For the live data examined during the preceding review, Registry sort orders were unique, no
visible lookup hit used an unregistered method, no published phrase had duplicate
`gematria_words` rows, and the one duplicated public entity label used by the lookup carried the
same World on both nodes. That establishes current-data compatibility, not a permanent invariant.
The compact SQL deliberately keeps phrase metadata source-native through `word_id` and prefers its
bound `node_id`; future duplicate rows can therefore resolve more deterministically than the legacy
phrase-only enrichment.

## Validation completed

- `44/44` focused migration, adapter, Entity Hub, identity and anchor tests passed. They include
  hostile count, cursor, Registry, primary/tied order, depth, per-method and 718/719 root envelopes.
- The duplicate-row fixture gives the losing row different `world`, `ragil` and `tags`; acceptance
  proves the bounded sample keeps all three values from the same stable winning source row.
- Identity-only acceptance proves that no `number_anchors` read begins before identity succeeds,
  including missing zero, unsafe values and a Number node whose label differs from the request.
- Equal Registry `sort_order` fixtures prove deterministic database order and reject its reversed
  envelope without reviving the legacy local priority list.
- `test-2029-number-preview` and `test-2029-world-surface` passed.
- The full Legacy + 2029 production build passed. Vite emitted the pre-existing large-chunk and
  ineffective-Legacy-import warnings; neither is introduced by these non-UI readers.
- The 2029 bundle budget passed `5/5`: entry `187.2 KB gzip`; Number route adds `31` chunks and
  `202.9 KB gzip`, within its `31` chunk / `205 KB gzip` limits.
- `git diff` confirms the migration SQL is byte-unchanged from the exact base.

No UI, CSS, flag, Legacy path, migration SQL, live database, deployment or Production state is
changed by this branch.
