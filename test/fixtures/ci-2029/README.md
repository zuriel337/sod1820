# Frozen inputs required before full CI acceptance

**BLOCKED: no complete, reviewed corpus is provisioned.** This directory is an
input location, not permission to publish upstream bodies in this public repo.
Do not copy the legacy scroll captures here or add empty response substitutes.

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
    "sha256": "<64 lowercase hex characters: original source>",
    "access": "public-reviewed OR restricted-existing-artifact"
  },
  "privacyReview": {
    "reference": "<content review and allowed staging location>",
    "decision": "approved-for-this-location"
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

The exact missing inputs, candidate sources and local/remote status are in
[`ci-isolation-completion`](../../../docs/perf-evidence-20261015/ci-isolation-completion/README.md).
