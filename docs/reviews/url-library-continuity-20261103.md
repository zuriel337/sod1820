# Public library continuations — F20 / F22

Branch-only implementation from product `9d3a09689a05bd0b72ca484335c1fbce8b538170`.
Scope: the existing cipher publication store, existing Book identities/manifests,
one public presentation wrapper, and an opt-in seam in the existing source reader.
No route/flag/HTTP metadata files, DB changes, publishing, engine work, deployment,
or main changes are included. Root owns integration and browser acceptance.

## Integration exports

- Default `PublicLibraryContinuity2029Page({ kind = "codes", collection = "published" })`.
  `kind` is `codes` or `books`; `collection="research"` selects the existing
  unlisted published research collection.
- Named `PublicCiphers2029Page` and `PublicBooks2029Page` are route-ready wrappers.
- The wrapper reads the existing `:slug` route parameter. For ciphers,
  `slug === "מחקר"` selects the collection rather than a record.
- `/codes`, `/codes/מחקר`, `/codes/:slug` use the cipher wrapper; `/books` and
  `/book/:slug` use the book wrapper. Root must preserve query/hash on aliases
  `/books/:slug` and `/book.html` according to the existing URL meaning.
- `BookSourceReader2029({ manifest, publicReadOnly: true })` is the opt-in source
  seam. The wrapper admits and binds the source before mounting it. Its existing
  default remains the research/preview reader.

`publicLibraryContinuity2029.js` exports `publicLibraryQuery2029`,
`readPublicLibraryRows2029`, `fetchPublicLibrary2029`,
`fetchPublicLibraryItem2029`, the two allowlist projections,
`publicBookSourceAvailable2029`, and `publicLibraryMetadata2029`.
The query specification is bounded and can be adapted by the existing HTTP
metadata owner; its `readRows(spec, { signal })` injection must use an anonymous
read path. It is not permission to call a privileged SQL reader from public HTTP.

## Admission and metadata

Cipher admission requires both `status='published'` and `visibility='public'`
in the anonymous query and the returned-row projection. The live
`public_read_self_published_els` RLS policy also admits self-published rows, so
anonymous RLS alone is insufficient. This wrapper never queries that lane,
owner IDs, drafts, engine detail, or quality/verification metadata. `/codes/מחקר`
requires `source='research'` as well; it stays unlisted/noindex. Exact slug queries
reject missing, mismatched, or ambiguous results.

Book identities come through the existing anonymous client and canonical
`fn_graph_space_is_public(metadata)` RLS. No client copy of the graph privacy
predicate was introduced. Active Book identity is separate from source access.
Source reading additionally requires one documented `book:` source identity,
the live `identity_tiers.digital_object` PDF binding, and an exact match to the
existing manifest URL. Public storage bucket/path or the exact documented
external URL is used; signed/query URLs, path traversal, unknown manifests,
ambiguous source identities, and conflicting known file hashes/sizes fail closed.
Before mounting a source, an anonymous, uncached HEAD checks the current PDF MIME
and URL. Redirects and unavailable/non-PDF responses do not become an empty book.

Metadata remains generic/noindex before admission or after error. A known book
without a usable source reader stays noindex. HTTP owner should preserve actual
404 for missing/refused identity and report reader failure separately for a known
public book. It must not index a manifest-only title or treat a static route as
proof of publication. `publicLibraryMetadata2029` supplies the matching client
metadata state; root remains responsible for HTTP status, XML and server SEO.

## Current bounded evidence, 3 November 2026

The dedicated read-only plugin reported `supabase_read_only_user` with
`transaction_read_only=on`. A scoped eight-slug query and direct anonymous Data
API reads found seven active public Book identities; `maamar-esther` returned
zero rows. This is a real missing public identity, not permission to expose its
compiled preview manifest.

The six stored books (`ahavat-torah`, `daat-tevunot`, `sefer-yetzirah`,
`sefer-raziel-hamalach`, `sefer-hapliah`, `sefer-habahir`) matched their existing
public storage PDFs and current HEAD responses. Ahavat keeps the existing byte,
SHA-256 and page-count-verified controlled renderer. The other five retain the
existing iframe reader. This is source delivery evidence, not new research
verification or publication acceptance.

Bentov's exact external PDF returned PDF/200 but no CORS header. The public
wrapper therefore uses `external_source_reader_unavailable`, with the exact
admitted external source as a separate-window alternative and a valid requested
page when available. The HTTP helper applies the same CORS boundary. It does not
claim successful in-page reading from a terminal-only HEAD success.

The current Raziel Book source identity is `book:sefer-raziel-hamalach`, while its
search file declares `book:hebrewbooks:23968`. Bentov's Book identity likewise
differs from the source identity in its search file. Public search checks exact
identity and reports mismatch; no alias is invented and no evidence is merged.
Other search-file/source identities matched the inspected local files.

Bounded anonymous reads returned three records plus `more=true` in each cipher
collection. Public sample `שדהתימן-8756` had a saved public matrix image, an exact
stored locator, and six deduplicated annotations. Published research sample
`הר-המוריה-87` lacked a saved image and exact locator; its public text remains
readable with a specific unavailable matrix state. No new matrix is generated.

## P0 and reading behavior

- One `els_records:<id>` remains one source. Duplicate response rows deduplicate
  by that identity. Repeated saved annotation terms do not create source counts,
  engine verification, independent evidence, or Human Gate acceptance.
- Book identity, documented source identity, file witness and PDF page remain
  separate. Public-only mode does not load commentary, internal maps,
  `research_objects`, or research/control actions. Search is marked as an
  extraction layer and validates its source identity before use.
- The existing OpenWeb/archive acceptance is unchanged. No community/archive
  rows or new RO/graph records are consumed or created by this scope.
- Fetch errors, cancellation, empty collections, refused/missing identities,
  unbound sources and unavailable files remain distinct. Both list/detail reads
  cancel through `AbortController`; source text loading aborts on cleanup.
- Book `page`, `chapter`, `q` and hash context are retained. Valid page/chapter/
  PDF-fragment locators select the existing source location; invalid locators
  show a named state without rendering page 1 as the requested content.
  Popstate/hash changes update the existing reader. Library return navigation
  accepts only the relevant library paths.
- Legacy cipher `#cipher-research` referred to the linked contributions/discussion.
  That exact requested anchor now names the unavailable discussion capability;
  the wrapper does not invent a replacement thread or mount the session-aware
  Legacy Discourse UI. Exact public discussion continuity remains a community
  integration gap. Known source anchors scroll after admission completes.

## Validation and remaining acceptance

23 focused unit/contract checks pass:

```text
node --test src/lib/research/publicLibraryContinuity2029.test.js \
  src/data/bookReader2029.test.js \
  test/books-unified-reader-2029.test.mjs \
  test/book-fullscreen-reader-2029.test.mjs
```

Both changed JSX modules passed Vite's Oxc syntax transform. `git diff --check`
passed. Live checks used only anonymous public reads and the dedicated read-only
plugin; no data or permissions changed. Browser/RTL/theme/computed typography,
back-forward, integrated route guards, HTTP statuses and full builds remain the
root's centralized acceptance work. Source-identity mismatch correction and
publication of an absent book are outside this implementation's authority.
