# Public context labels — 29 October 2026

Task `CENTRAL_PUBLIC_CONTEXT_LABELS_20261029`; BEFORE
`845140aa-d4f4-4ff9-bf59-96bf33932d84`; base
`658902d3ac3610991a34b2580a8976a28be363d4`; branch
`gpt/2029-central-public-context-labels-20261029`.

ZURIEL approved replacing exposed technical context metadata with readable
public titles. This extends the existing presentation helpers in
razielSessionSeam2029, not a new naming registry, store or identity resolver.

The Intro context strip now shows a readable subject title and, when proved by
exact context metadata, the actual section title. Raw lens keys and raw source
locators are not rendered. A missing section label is omitted rather than
guessed from an anchor or slug.

Raziel's heading uses the selected item's human label, or its subject's label
only when both nonempty identity and type match exactly. Otherwise it asks
"מה תרצה לחקור?". Context sheets, selection summaries, frame breadcrumbs and
personal-context summaries reuse the same public-label boundary; type keys use
the existing Hebrew type nouns. No raw UUID fallback becomes a heading.

UUIDs, technical prefixes, path/anchor keys and internal camelCase labels are
filtered before truncation. Authored body text is untouched. Legitimate names
and scientific labels such as Donald Trump, Sha'arei Orah, COVID-19, B-52,
DNA/RNA and E=mc² remain readable. Numeric labels remain numbers.

IDs, type keys, locators, URLs, exact-return state and stored Research Context
remain unchanged. The existing transport adapter still returns the original
request by identity. No Auth, Provider, engine, quota, DB/RLS, migration, content
page or publication policy is changed. Unknown identities are not linked by
names or by inferred source association.

Acceptance: five focused Node contracts cover opaque labels, English/math,
exact identity/type matching (including missing fields), exact section matching
and unchanged data/transport. Browser fixtures use the real shared frame and
providers at 320/390/1440 × three themes × matched/unresolved/foreign-selection
cases (27): Intro, Raziel, Here and More expose no UUID/anchor keys, the hero
uses the correct human/fallback title, and the original context JSON survives
opening and closing unchanged. External IO is synthetic/intercepted; zero
model calls or unexpected product writes. Broader Raziel/build/gate and exact
hosted results are recorded in AFTER and the dated canonical plan37 receipt.

Hosted acceptance must inspect real public Topic/Post entry, expanded context,
Raziel/Here/More, exact SHA/branch and unchanged Preview write protections.
Preview remains mock-only/read-only with noindex/no-store. Previously recorded
personal API, replies and permission-server gaps remain open.
