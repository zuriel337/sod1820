# Calculator public URLs — compatibility and server canonical

Task: `PUBLIC_CALCULATOR_CANONICAL_COMPATIBILITY_20261104`.
BEFORE: `268c6a37-7858-497f-8367-9021aacce526`.
Base: `163fcd6cbbd81786d5725753a24062d9be4e1ecd` (documentation after the live cutover).

## Verified live behavior, before this fix

The live product remains source `1bc8260adaa889d7903aaa33ef43510df09817f2`,
Production `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A`.
Primary public URLs use the approved unprefixed identity. This does not remove
2029 design or the supported `/2029` compatibility routes.

`live-before.json` records anonymous mobile browser checks of
`/2029/calculator`, `/2029/gematria` and `/2029/gematria/viral`, with `q=משיח`.
All three return200, retain their requested path, and calculate358. They do
**not** redirect. Initial HTML incorrectly uses `/2029/gematria` as canonical,
whereas the hydrated client uses `/gematria`. The alias availability result
must not be interpreted as successful server/client metadata parity.

On the unchanged calculator sources in this checkout, `test-calculator-2029-pro`
fails its literal `path: "/2029/calculator"` assertion at line115. The component
already selects `/gematria` for the public release and `location.pathname`
otherwise; its public query-indexing rule is likewise conditional.
`test-calculator-2029-semantic-surface` **passes** here. This does not establish
the result on Claude's unspecified branch/SHA. Neither existing test was edited.

## Narrow fix — not deployed to Production

Only the public document adapter's metadata-path mapping changes: all three
calculator compatibility aliases feed the existing `/gematria` metadata branch.
No actual URL, redirect, query, fragment, engine, UI, canonical owner, source
reader, authorization, worker, indexing boundary or shared configuration changes.
Ordinary calculator queries remain noindex; query claims are not public facts.
The existing Legacy handler and Claude's calculator files are untouched.

The new regression test invokes the real metadata implementation with networking
forbidden. It reproduces six failures before the fix and passes12/12 after it:
four addresses, plain GET, calculated-query GET and HEAD. Canonical and og:url,
noindex, unmodified request parameters, no redirect, no-store, empty HEAD and
absence of invented numeric publication metadata are checked.

The existing artifact, protected-review, Production-review and candidate suites
pass49/49, including negative admission/origin/method/private-source checks.
An initial artifact run failed because a tracked evidence file was absent from
the sparse checkout; materializing that existing directory resolved it without
test/source edits. Semantic-surface and the Legacy release lock pass.
The unrelated static Pro expectation remains failing and is reported as such.

Receipts in this directory distinguish live-before observations, local synthetic
tests, and any later protected Preview. A protected Preview is not a Production
update. The live deployment above must remain unchanged in this task.
