# Isolation browser contract reconciliation

Task `PUBLIC_LAUNCH_CLOSURE_THREE_LANES_20261102`. Test-only branch
`gpt/2029-isolation-browser-contract-reconcile-20261102`, base
`644c982b7e8acd0c74118375a0f3c59bcfd413e6`. Live ownership addenda:
`ce0094e6-c699-4511-97c7-de766e9673fb` and
`1a9e557d-23f8-4dcf-9a3e-de9ddedd7a0a`. Product source is unchanged.

The original full 48-case browser run is preserved by root under
`/tmp/public-launch-closure-20261102/isolation-browser`: 36 passed, 11 failed,
one serial case did not run. Those results remain failed evidence. The 11
failures concern five acceptance/setup mismatches plus six theme/width instances
of the same obsolete local searchbox. Source comparison found no change from
accepted baseline `6cd64a79` in Number Page/Core/Living World, System Frame or
expression-address navigation.

## Exact corrections

1. EntryLearn's positive Number scenario now has a local, explicitly labeled
   `lock_number=false` fixture. The generic isolated 2029 build does not inherit
   the dedicated public-reading compiler profile. The original missing fixture
   correctly rendered the locked drawer. No live flag changes, Preview bypass,
   negative-lock test removal or expression/trace/help/return assertion removal.
2. Number1237 retains primary identity, six-method, layer summary, inspector,
   research-context, World, SEO and overflow checks. It waits for the existing
   `data-material-state=ready` boundary before asserting secondary material.
   Summary is still an existing component; it was never removed.
3. Number596 full Page crossing selection deliberately opens a replayable
   expression address. Tests now require the selected `שומרים`/regular method,
   root596, typed exact return to `ירושלים`, reverse crossing values
   596/2650/1156/3210, and exact browser Back identity. The original internal
   crossing-focus/reset assertions are retained on the compact Number Drawer,
   where that interaction actually belongs. Empty verse and overflow assertions
   remain.
4. Miluy preserves the existing 1500ms primary requirement, checked together by
   a synchronous DOM/URL sample: root878, `משיח`, selected Miluy, result878, exact
   destination and no drawer. Its separate material-ready wait is bounded by
   the suite's existing 30-second content-read budget. Stage identity, layers,
   language content and canonical explanation/Heichal checks remain.
5. Number878 waits for material-ready before requiring its existing journey
   section. Locked Golden journey/no-semantic-ID behavior remains required in
   the nonfunctional build; functional-fixture assertions remain present.
6. All six source-projector cases use the existing unified World searchbox,
   require URL `q`, selected writer/source identity, then clear the writer query
   before opening the whole Hashmal corpus. Existing public writer lens,
   sanitized group proof, full-source reading, themes, widths, media/privacy,
   source updates and overflow checks remain. No duplicate search UI was added.

No readiness wait exceeds 30 seconds. Failed material remains a failure; no
pending state is counted as empty or complete. CLS remains 0.1. No case is
skipped, no original negative test is weakened, and no product runtime is
changed to satisfy an obsolete DOM assumption.

## Independent read-only egress

Both specs install `tests/fixtures/public-readonly-egress.cjs`. Its live RPC
allowlist comes from the existing reviewed read inventory, excludes volatile
functions, and uses the same reviewed extra readers as the native guard.
Canonical functions/A3/model/signup/unsubscribe, Auth mutations, unknown RPCs,
general table/storage writes, same-origin proxy POSTs and external writes are
denied before network. Realtime sockets are not connected and beacons are
disabled. Receipts retain only method/path counts, never args, query strings,
tokens, headers or response bodies. Existing public data and canonical engine
reads remain actual read-only requests; existing storage-image/media fixtures
remain explicitly fixture evidence.

Chromium keeps loopback access direct. When the existing session supplies
`HTTPS_PROXY`, only already-approved external reads are forwarded through a
separate Playwright APIRequest context. Redirects return to the browser for the
same guard to check their destination. Each spec disposes this per-test context
in afterEach. CI without an inherited proxy uses direct fallback. No browser
proxy, shared network setting, credential value or dependency is changed or
saved; existing page fixtures and storage/protected-read guards keep precedence.

`lang_links_list` is excluded completely from this test guard. Its live
VOLATILE SECURITY DEFINER signature accepts visitor-specific draft access.
Miluy's original `Messiah`/`мессия` rendering assertions use a separately labeled
synthetic public-only response, installed before the guard's live network path.
Only the exact ordinary null-visitor request receives that fixture. Other
visitor/query/method shapes fall through to denial. No live visitor argument is
rewritten and no successful language rendering is described as live language
or human-verification acceptance.

## Validation

Static syntax checks, `git diff --check`, and direct deny/allow checks over the
actual guard classifier passed. The classifier rejects GET/POST/PATCH/DELETE
for models, A3, signed unsubscribe, credit RPCs, live language RPC and Auth
token; rejects table and proxy POSTs; preserves approved method/profile and
table GET reads; rejects a nonloopback acceptance target.

Root released the loopback4173 browser lease before the focused functional run.
Only the six corrected representative cases are run here; no build, native
performance measurement, live product write/model call or deployment. Final
focused results are recorded below. Root owns the fresh full 48-case run and
full safe workflow, including actual isolated A3; this patch alone cannot mark
the complete gate passed.

The first attempted focused command could not launch Chromium: Playwright's
bundled `chromium_headless_shell-1187` executable was absent. All six setup
failures are retained separately; they exercised no product behavior. Using
the already-installed `/usr/bin/chromium` through a disposable runtime config
then passed all six representative corrected cases. After the optional proxy
handling addition, the same six passed again with one worker, zero retries and
no skipped cases. The existing unchanged loopback build was used; no build or
native performance run was performed. Root's fresh complete 48-case and full
safe workflow acceptance remain required and are not marked passed here.
