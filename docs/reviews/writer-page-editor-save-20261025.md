# Writer page editor: retain confirmed save and drafts during refresh

Branch: `gpt/writer-personal-editor-save-20261025`.
Base: integrated central `aef4ac254927a6d534dbceb84a4e85bf9f90ef5d`.
Task: `WRITER_PERSONAL_EDITOR_SAVE_20261025`.
BEFORE: `8d9d75ab-4b8f-4174-917a-1ee541fe9bfe`.

## Confirmed problem

The shared PageEditor receives a successful `update_my_page_config` acknowledgment and displays
“נשמר! הדף שלך עודכן ✓”. Its `onSaved` callback then refreshes the private overview. The overview
hook switched the layout to `loading`, unmounting PageEditor and discarding the confirmation and
local form state. The old browser test could briefly observe success, explaining its intermittent
results; this was not solely an obsolete test expectation.

A controlled browser run on the unchanged base held that overview response after the save. It
deterministically observed `editor_retained=false` and `layout_state=loading` at 390px. The fixture
contains no live data and never forwards mutations.

## Final behavior

Only the page-editor save requests a background overview refresh. While the same authenticated
account has a confirmed ready snapshot, the existing layout and editor stay mounted. A successful
refresh updates overview data without clearing the confirmed save or a new draft typed meanwhile.
Other initial loads, retries, creation and portrait mutations retain the existing foreground flow.

A transient unavailable response or timeout retains that same-account snapshot and the draft. The
existing status panel explicitly says the page was saved but its overview could not be refreshed.
An authentication failure is not treated as a transient refresh error: private editor content is
masked. Existing account keys and abort cleanup prevent reuse across different accounts.

The shared PageEditor accepts only `ok === true` as a save acknowledgment. A missing or malformed
acknowledgment preserves the draft, shows the existing error panel and triggers no success refresh.
The existing message panel gains `status`/`alert` semantics; its layout and styles are unchanged.

No API, RPC, database, authentication provider, public-reader, CSS or design change is included.
The active Claude contrast scope and the biography patch remain separate.

## Verification

- Legacy and 2029 builds passed; Production lock, cheap hardening, Legacy containment and diff check passed.
- Twelve focused Node test files passed across writer personal, contributor and research-sync checks.
- Existing built-App personal-chain browser test passed all ten functional flows, including canonical
  self redirect, shared editor/highlights/links, explicit portrait consent/revoke, public visitor
  view, native inbox/replies, failed-send draft, follow failure/retry, notifications, account-switch
  privacy and guest/unlinked/ambiguous/error guards. Repeat capture matrix was skipped.
- Six new deterministic browser checks passed: held successful overview at 390/1440, new draft
  preserved after the overview actually renders, transient 503 retained with truthful notice,
  authentication 401 masking, and missing/truthy-malformed save acknowledgments. Each save makes
  one intercepted write request; no automatic duplicate save is introduced.
- The HTTP fixture now persists the acknowledged page configuration in memory, preserving native
  highlights and links and returning the saved values on later reads.

All browser mutation responses are synthetic. No real user's page, photo, message, follow or
private data was changed. Hosted authenticated save remains a user-session acceptance check.
Existing unrelated stale public loader/catalog/community tests are not declared repaired here.

Evidence: `/workspace/artifacts/writer-editor-save-20261025/` and the generated browser result
bundle. Exact HEAD, PR/Preview status, test logs and released ownership are in the passive AFTER
handoff. Branch only; no main/central merge or Production deployment.
