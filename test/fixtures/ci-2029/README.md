# New public frozen inputs: incomplete acceptance

Revision `public-current-route-admission-v4` is retained and reproducible from
Git: 195 navigation contracts and 192 performance/browser contracts. Relative
to revision 3, 23 exact current-route contracts were added and two current
public response bodies were refreshed as matched empty/count header pairs. No
previous contract was removed. The added inputs are limited to verified public
Post/Topic/graph/gallery/math reads and four exact public `401/42501` responses;
the latter contain no research rows. All 37 image bodies decode successfully.

Performance/navigation minimum preflights and the 35 privacy/contract/repack
tests pass. A current built-route diagnostic has no unknown request for the
Number 376 or public Post 5116 startup paths. Full execution still fails closed:
Home has four non-admitted inputs, World has one private-inclusive RPC, Topic has
one response with an unreviewed attribution, and Browser still requires the
non-retainable Bennett draft body. The independent historical Post-only
comparison remains seven samples on each side; it is not full performance
acceptance. This is a new offline experiment, not historical snapshot recovery
or live parity. See the
[`2026-10-18 completion evidence`](../../../docs/perf-evidence-20261018/ci-corpus-completion/README.md),
the prior [`admission-v3 evidence`](../../../docs/perf-evidence-20261015/ci-corpus/admission-v3/README.md),
`manifest.json`, `source-index.json` and `coverage.json`. No local-only draft,
account UUID, unreviewed attribution, contributor content or group message body
is packaged; no empty substitute or live fallback is permitted.

The workflow requires `manifest.json` and `browser.json.gz`,
`navigation.json.gz`, `performance.json.gz`. Input staging must finish before
the offline boundary. There is no capture or live fallback in any gate.

Each manifest entry, keyed by `browser`, `navigation` or `performance`, binds:

```json
{
  "sha256": "<64 lowercase hex characters: exact compressed snapshot>",
  "source": {
    "reference": "<immutable capture/corpus or existing approved artifact>",
    "date": "<capture/corpus date>",
    "sha256": "<64 lowercase hex characters: reviewed retained source index>",
    "access": "public-reviewed OR restricted-existing-artifact"
  },
  "privacyReview": {
    "reference": "<content review and allowed staging location>",
    "decision": "approved-for-this-location",
    "publicAttribution": {
      "authors": ["<independently reviewed public display byline>"],
      "creators": ["<independently reviewed public display byline>"]
    }
  },
  "coverage": { "reference": "<request/route/header/binary coverage evidence>" }
}
```

A metadata declaration is not a privacy review. Public-repo commits/artifacts
must contain only content explicitly reviewed as retainable there. Restricted
payloads require an already approved restricted source/staging mechanism; do
not create storage, change permissions or upload them to ordinary public-repo
artifacts. Neither an anon credential nor HTTP GET proves a safe capture.

Responses use exact `policy.cjs` request keys and `{status,type,body,range?}`;
`body` is canonical base64 of original bytes. Navigation retains the complete
`prefer`, `range`, `accept-profile` signature; browser/performance use the
headerless contract. Do not discard signatures or merge colliding keys. Legacy
MD5 request bodies require the original request arguments for conversion;
UTF8-damaged images cannot be reconstructed by base64-encoding the text.

`snapshot-sha.mjs` verifies provenance metadata, compressed SHA, decoding and a
minimum semantic preflight **before starting any application connection**.
The same preflight runs inside each isolated gate. It checks authored primary
bodies, representative rows, canonical Number/trace results, catalog page/count
and order parity, and original/rendition JPEG dimensions where applicable.
The full gates remain necessary: this minimum preflight does not enumerate or
certify every runtime request, source claim or image pixel. Unknown requests
still fail the independent egress audit even if the app swallows their errors.

Required full execution remains unchanged: seven samples on both builds with
the HEAD tool and one frozen snapshot per comparison; actual navigation,
Back/forward/revisit, catalog 2/8/24/count/failure/retry/return; cold performance
and extension-failure gates; all 16 image cases; complete Entry and World specs
(including Topics, Numbers, books/ELS, rich/medium/sparse and failure states).
Do not substitute a dedicated synthetic corpus for live-data parity claims.

The earlier recovery inventory and historical status are preserved in
[`ci-isolation-completion`](../../../docs/perf-evidence-20261015/ci-isolation-completion/README.md).
