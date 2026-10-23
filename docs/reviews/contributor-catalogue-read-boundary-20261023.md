# Public contributor catalogue read boundary

Legacy writer pages and the general 2029 reader covered different source families.
Filtering contributions only by contributor ID also omitted existing account-bound
records. The writer catalogue now composes metadata from existing public posts,
contributions, ciphers, Insights, attributed events, media and approved Topic views.

The new contribution RPC checks visible active contributor eligibility and exact
existing contributor/account or unique source-name lineage. It returns only approved
or published root records, with bounded stable pagination. It does not merge accounts
or introduce a content store. Direct cipher reads require both public visibility and
published status, including when historical self-publication policies are permissive.

The general writer loader defers full research payloads. Source occurrence links and
reader attribution proofs survive presentation. Linked Insight projections retain
their references without being counted again as independent findings. Missing legacy
visibility uses the same existing default at community entry and writer-page entry;
explicit private visibility remains excluded.

The Insight read policy adds a restrictive boundary for the existing private space,
with explicit owner/admin access. Publication remains separate from verification,
governance and canonicality. No global publication default is introduced.

Validation: relevant unit suites, Legacy and 2029 builds, Production lock and local
browser coverage at 320/390/1440 in light/parchment/dark. Account-specific correction
manifests and live-data evidence remain in the private coordination ledger, outside
the public repository. This branch contains application code, synthetic tests and
generic schema definitions only. No merge or Production frontend cutover is included.
