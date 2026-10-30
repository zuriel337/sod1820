# Topic public findings through a number — 30 October 2026

Base: `fec00f60f4240f73b7348036d5c7ade6597de016` on
`gpt/elections-world-seed-integration-20261030`. Final HEAD/remote and release
record are in the coordination AFTER. This is a bounded consumer integration
under the adopted One Tree contract, not another finding reader or graph.

## Runtime change

The public Topic body now has an on-demand "ממצאים דרך המספר" entry for each
valid, distinct number declared by its existing projection. Its wording says
explicitly that a shared structured value is a discovery path, not a direct
documented finding-to-topic relation. Existing direct graph connections are
unchanged. The current coverage is the existing public Zvi source corpus, stated
in the entry; no all-contributor or all-source coverage is claimed.

`TopicNumberResearch2029` mounts the unmodified `NumberZviPublicResearch2029`,
which dynamically loads `fetchZviNumberFindingsPage` only after the visitor asks.
The same anonymous client, exact structured-value query, source/live-status and
privacy/review guards, cards, keyset pages and canonical finding references are
used on Topic and Number. No per-topic finding id list was added. A newly eligible
row can be returned on the next explicit opening/read without a Topic code change.
This does not implement push updates, a refresh timer or generic source admission.

Six number entries are initially available, with a control exposing the rest.
An exact number hash reopens the appropriate entry even beyond that initial
window. Only one entry is expanded at a time; collapsing or changing Topic
unmounts the old consumer and retains its existing pending-request cancellation.
An absent/invalid value is not zero. Withheld Topics do not mount this consumer.

The current number entry is encoded in the source Topic URL. The existing shared
finding links carry it as return state; capture on the Topic also records an exact
Research Context return with the source Topic ref, locator and indirect path
meaning. Source links keep the existing source occurrence URL. Browser Back
reopens the selected number entry. Returning does not preserve a snapshot of all
loaded pages: the reader revalidates on the visitor's next request. No author,
engine-verification result, canonical node or direct edge is inferred from value.

## Verification

- 35 existing tests passed in the public Zvi reader, number consumer and content
  projection suites. Their guards, pagination and identity checks are unchanged.
- New browser acceptance used the actual Topic number-entry component, existing
  Number consumer/cards, anonymous reader and source/status/value guards, with
  synthetic anonymous database responses and Research Context observation.
  It ran at 320 and 1440 without skips. It covered no reads on initial render or
  accordion opening, pagination/dedup, private/person-only/unreviewed/wrong-value/
  missing-value/unavailable-source rejection, explicit zero, new finding arrival
  after initial rendering, source/finding return, deep links beyond the first six
  numbers, retry, previous-Topic delayed result, empty and withheld contexts.
- The preceding Topic-to-Number-sheet browser acceptance passed again alongside
  the new consumer tests (three registered tests total). No external request or
  browser page error occurred in these synthetic runs.
- 2029 build, native Topic surface acceptance, Legacy Production lock and diff
  check passed. Existing large-bundle and ineffective-dynamic-import build
  warnings remain. No new CSS or shared Frame design was added.

## Remaining acceptance and boundary

Hosted Preview and the full real Frame/ResearchProvider plus live-public-source
round trip remain to be verified. A browser fixture is not live RLS proof. The
reader still uses its existing bounded eligibility rules; this change does not
relax its reviewed manifests or make all approved records displayable. Direct
Topic attachment, novelty markers, strength explanation and generic source-kind
coverage remain separate work under their current owners.

No Number page/component/reader/Provider/Frame, blocked World content envelope,
source data, publication, graph, product DB/RLS/schema/migration, model, Edge,
main, Production or hosted deployment changed in this slice. The only runtime
files added/edited are the new Topic consumer and its mount in Topic2029Page.
