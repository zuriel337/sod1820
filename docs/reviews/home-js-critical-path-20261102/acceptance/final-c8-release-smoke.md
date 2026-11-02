# Exact final c8 product and protected Production-config review

Source: `c8e05790fe68c8f548e22a7c02e5094ddc5b8755`.
Product Preview: https://sod1820-nd7st17o8-sod1820-s-projects.vercel.app
(`dpl_8YZUjAG9Df9F58MUXFXmdnAeuFWS`).
Protected Production-config review:
https://sod1820-edca56j3h-sod1820-s-projects.vercel.app
(`dpl_BN3p9bEC4mGuUSoMC4BqXfy2PiCy`).

This is functional exact-source acceptance, not another latency series and not a
Production deployment. The prior measurements stay explicitly labeled25709d70.
All72 JavaScript assets actually requested by final product Home→primary
Post→Home at390px were fetched from both exact protected deployments and match
by decoded body length and SHA-256. This supports retaining measured257 client
results for the unchanged observed paths; it is not a whole-site unrequested
asset comparison. Root independently reports an empty source/client build-input
diff across257→c8. The Production-config artifact uses its own intentional
transport/profile build and does not inherit product Preview latency numbers.

| Scope |390px|1440px|
|---|---|---|
| Product: exact identity, actual Preview SW, visible primary action |PASS|PASS|
| Product: real primary Post and exact Home query/fragment return |PASS|PASS|
| Artifact: exact source, emitted worker hash and live policy handshake |PASS|PASS|
| Artifact: Home→Post→World→1820→milui3928→phrase913 and back |PASS|PASS|
| Artifact: legacy calculator parameters, recompute913, share URL, reload, Number/back |PASS|PASS|
| Artifact: public gallery catalog→2029 image and refresh |PASS|PASS|
| Separate missing-target receipt: exact linked gallery image visible and reloaded |PASS|PASS|

The primary Post remains `/post/sprites-lightning-over-france`. Return preserves
repeated query parameters and fragment. These Home cases depart atscrollY0 and
return to0 within the unchanged≤2px check; they do not replace earlier nonzero
scroll restoration acceptance. Calculator old `w=בראשית&n=1` calculates913 rather
than trusting the supplied1; sharing is checked by URL without sending anything.

The gallery catalog's real public link targets gallery105 and image
`7bccbdee-f8ad-4d97-9c5b-03ca07ee426e`. The initial bounded smoke checked a rendered
first image and refresh identity. A separate narrow receipt then verifies the
actual linked image, its loaded public media, the exact hash target inside the
viewport and direct refresh at both widths, without manually scrolling to create
success. Both receipts remain archived.

Artifact worker `/sw.js` SHA-256:
`abbbdc3b97b473fcafe0d47083eff2d0c58b4e74e9df58b04ca7dc36b9a44baa`.
The downloaded bytes match `public-reading-artifact.json`; the active controller
answers policy `public-reading-production-20261102` and exactc8 source SHA.
The artifact reports `sourceDirty=true` for the documented Vercel root-config
materialization and `applicationSourceDirty=false`; no dirty-state concealment.
It still reports `productionReady=false`, `generalProductWrites=false`,
`modelCalls=false`. This review does not authorize a live cutover.

The independent read-only guard remains unchanged. Its known lang_links_list
POST denial is retained during Number paths; a guard-blocked request is not
presented as a successful real SW policy test. Actual worker identity/startup is
verified, while root's emitted-worker/local lifecycle tests supply separate
negative-boundary evidence. All admitted REST responses observed here succeed;
normal Posts requests canceled on navigation are retained asAbortError rather
than hidden. There are no unhandled pageerrors. The exact external Vercel toolbar
URL remains explicitly blocked as in the paired code-only experiment.

No account was authenticated; no positive signup, model, mail, publication,
subscription, billing, private-data operation or media playback occurred. We did
not change flags, credentials, deployed server functions or live product data.
Root owns the separate HTTP/canonical/robots/XML/raw-template/protection checks.
