# F01/F02 missing server HTTP evidence — approved isolated child

The two outstanding HTTP evidence gaps are now tested on the previously approved disposable child `krnaxxndgtrdnaddlzws`. This supplements the **37 already credited real GoTrue/PostgREST/Storage checks** from evidence commit `d7fdb5e41927eb90deee494b438b3e03c8f88c86`; those checks were not rerun. The independent scoped snapshot acceptance in work-log `9dceeb99-3187-4f79-8387-a9e49c7ca08d` remains the baseline decision. Historical migration replay remains `MIGRATIONS_FAILED`, a separate Foundation issue.

Existing MAIN receipt `eb370db1-0b48-41b0-94c6-73fd74bdf7b9` explicitly credits those 37 native checks, and dispatch `14f40bcd-1a07-481c-9137-f440b91e45ae` explicitly preserves that credit without rerunning them. Their current bounded read-only credit excerpts are included below. No new work-log row is created, and their historical NO_GO status is not represented as a fresh acceptance verdict.

## Native result

One controlled invocation of reviewed proof version 7 returned HTTP 200 / `PASS_SUPPLEMENTAL_HTTP_ONLY` at `2026-10-13T07:25:34.384Z` (10:25:34 Jerusalem). The exact source SHA-256 is `03bd33d5c4ef73f13e596b6cde16550d4227f78988aa71e5e92d8879ab5a2722`.

| Missing evidence | Native result |
| --- | --- |
| Browser-history RPC with the injected server credential and no admin identity | HTTP 403, SQLSTATE `42501`, `permission denied for function get_work_log` |
| One new disposable server-authorized Storage upload | HTTP 200, exact public-byte SHA-256 parity, authorized deletion and confirmed absence |
| Eight protected former exception paths: anonymous PUT, POST upsert, fresh POST | All 24 requests: HTTP 400, `AccessDenied`, `new row violates row-level security policy`; overwrite/upsert bytes unchanged and fresh objects absent |
| Unrelated unauthorized anonymous fresh POST | HTTP 400 with the same precise RLS denial; no object created |
| Existing intentional-community object's anonymous PUT | HTTP 400 with the same precise RLS denial; existing public bytes unchanged |

The report contains **28 supplemental checks, including 26 negative Storage requests**. The eight protected paths required synthetic server-authorized setup because the earlier accepted harness had removed their metadata. These uploads are setup for missing negative evidence, not a rerun of the prior baseline or positive-user tests. All nine created objects were deleted through Storage HTTP with status 200, followed by absence confirmation. Read-only post-run SQL independently found zero protected fixture rows, zero new service-proof rows and zero unrelated-proof rows; the original community fixture remains.

The surviving public community fixture SHA-256 is unchanged before/after: `a38a4ff7320a3d8764ac959b264f15e335360d7c1e23a0627dee7f366c95c58f`. No restoration after failure was needed.

## Trusted execution and retirement

Supabase Edge Runtime held and used its own injected credentials. They were never exported to Codex, chat, Git, client code or evidence. A separate read-only diagnostic established a modern publishable/secret pair in the legacy-named environment variables, with the exact child URL and deployment binding. The proof sends the actual role's key on `apikey` and sends no Authorization header for opaque modern keys. Legacy JWT mode retains exact role and child-ref checks; mixed, reversed and unknown pairs fail before HTTP.

The temporary function required platform JWT verification, a private short-lived nonce, exact child URL/deployment guards, and fixed server-owned destinations, paths and payloads. It accepted no request-selected test, SQL, URL or object data. Independent source review approved this exact source before the native run. Nonce/permit material is excluded from this receipt; only temporary run identifiers in object paths are replaced with `<run-id>` in the sanitized report.

After invocation, the function was immediately replaced by inert version 8 with `verify_jwt=true`. Read-only metadata/source inspection confirmed version 8, a retirement marker, no `fetch` call and no environment-variable read. Retirement is not deletion. No temporary privileged testing implementation is added under `supabase/functions` or to the application deploy path.

## Candidate reconciliation and limits

GitHub main and local `origin/main` both remain `96bd0b30cf402917fd4ff2c40dca7e90bfbeeb6b`. The SQL candidate based on `540083df7e72ebbc56630d5f83cc0d62599cd809` is unchanged:

| Migration | Git blob | SHA-256 |
| --- | --- | --- |
| F01 | `b5b9125eb36717f8734373ef450013c24913cf71` | `0c05f1c2afb718275a0cf97a0517116b2a3c56f907b76df9500397fc4578155a` |
| F02 | `d91080414080205afbc72313119ec5e954ed781a` | `997e4fef2b18d1295f39a048cafc890a6612d1ac37bc34b6da14da329cfeafbd` |

Child after-catalog confirms the protected history definition MD5 remains `afdf1e28eeeba9ce1693768430f518cb`, anon/service execute is false, authenticated execute is true, all 14 temporary policies are absent and all three intentional policies remain. Catalog checks used the general Supabase connector through bounded read-only queries; no database write was performed while preparing this receipt.

This receipt closes the missing **staging HTTP evidence**, not production apply or final release. Independent MAIN acceptance is still required before controlled production application under the existing user authorization. It does not certify historical migration replay, full-system parity, World acceptance, native 2029 management completion or G4 closure. This commit changes evidence only; no merge, main push or production apply/deploy is performed here.

## Artifacts and verification

- [Sanitized native HTTP report](test-evidence/p0-f01-f02-20261013/supplemental-http-report.json)
- [Read-only child after-catalog](test-evidence/p0-f01-f02-20261013/child-after-catalog.json)
- [Existing canonical 37-check credit](test-evidence/p0-f01-f02-20261013/canonical-original-credit.json)
- [Exact reviewed/deployed source archive](test-evidence/p0-f01-f02-20261013/server-http-proof/index.ts)
- [Local harness control archive](test-evidence/p0-f01-f02-20261013/server-http-proof/test-guards.mjs)
- Prior credited evidence: [original 37-case report](https://github.com/zuriel337/sod1820/blob/d7fdb5e41927eb90deee494b438b3e03c8f88c86/docs/test-evidence/p0-f01-f02-20261008/api-report.json)

`node scripts/test-p0-f01-f02-security-patch.mjs` preserves the original focused 5/5 SQL checks. `node scripts/test-p0-f01-f02-server-proof-controls.mjs` copies the archived source and controls to a temporary directory and creates an inert dummy permit solely for local synthetic-key tests. It does not deploy, contact Supabase, obtain credentials or repeat native checks. Controls cover exact 28/26 inventory, actual role headers, nonce/runtime guards, false-denial rejection, response-loss cleanup, failed-cleanup NO_GO and baseline drift without mutation.
