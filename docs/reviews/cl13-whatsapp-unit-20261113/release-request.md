# Release request — the active WhatsApp path, CL-13 only: `wa-raziel` A, verify, then `ai-analyze` A, verify (13.11.2026)

> **This is a request, not an approval.** Nothing is applied, deployed or merged. A Production step needs the explicit approval of ZURIEL for the exact function, the exact SHA-256 stamps below and the exact drift state (CLAUDE.md 0.4). An approval for step 1 is not an approval for step 2.
> **No SQL is attached to this request** and no research decision is reopened (D-RESEARCH-APPROVAL, D-ERASE, D-ADMIN stay where they are). The database step is a separate package in `claude/cl13-db-step-20261113`; Edge goes before the database.
> Recommended by Codex (13.11): artifact **A** for both functions. Reviewed by Codex on `e294549b1`: no blocker found in the code of A. The three corrections below are changes of the hand-over only; the deploy files and their stamps are unchanged.

## Current state, and the historical base of the package (read 13.11)

* **Now:** `main` and the live site are at **`9be0c29fc`** (`origin/main` = `9be0c29fc52337069192b057ef1a9882c7026009`; the alias `sod1820.co.il` points to `dpl_9paqBrZzi7D1GXow7LV8eWCjkpEF`, a READY production deployment whose source commit is `9be0c29fc`).
* **Historical base of this package: `aa0f6bc82`** (`dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`) — the commit the branch was cut from and the one the reviews of Codex and the first journal lines refer to. It is kept as the base of the package and is not rewritten; the branch is not rebased.
* **What the move changes for this request: nothing in the Edge code.** Between `aa0f6bc82` and `9be0c29fc` no file under `supabase/functions` changed (`git diff --name-only aa0f6bc82 9be0c29fc -- supabase/functions` is empty). The deployed Edge versions are what the drift gate in section 1 reads at deploy time; artifact A is built on the deployed bytes, not on `main`. A merge-tree of the branch into `9be0c29fc` is clean (the only change on `main` in a file this branch also touches is three added test lines in the workflow list).
* A deploy of the site does not deploy Edge functions, and this request deploys no site.

## 0. The choice: artifact A — and what the branch files are

**The request is for artifact A of both functions, and only A.** A = *the deployed bytes + the CL-13 diff, nothing else*, assembled by:

```
node scripts/cl13-whatsapp-unit.mjs assemble wa-raziel A <out-dir>
node scripts/cl13-whatsapp-unit.mjs assemble ai-analyze A <out-dir>
node scripts/cl13-whatsapp-unit.mjs verify        # every stamp below, from unit.json
```

**The files of the branch itself (`supabase/functions/wa-raziel/index.ts`, `supabase/functions/ai-analyze/index.ts` and the navigation modules) represent candidate B, not A.** B carries code that is on `main` and was never deployed (N6 navigation for `wa-raziel`; N8–N10 for `ai-analyze`). **Deploying from the branch files, or from `scripts/package-ai-analyze.mjs`, is not what this request asks for.** Whoever deploys must assemble A with the command above and check every stamp before the call; a file whose SHA-256 differs from the table is a stop.

## 1. The stamps of artifact A (checked by `test/cl13-whatsapp-unit-pins.test.mjs` against `unit.json`)

### Step 1 — `wa-raziel` A (deployed v21, `verify_jwt: false`, entrypoint `functions/wa-raziel/index.ts`, no import map)

| File in the deploy | SHA-256 | Against deployed v21 |
|---|---|---|
| `functions/wa-raziel/index.ts` | `3b51d4f5db1154930685c0470fe1929e627da70a5df9a1c6da3286f9b0a5df63` | changed (CL-13 only) |
| `functions/_shared/waGreen.ts` | `099e9bbbe14438d8db0914a8b9e329b16b9906aa8b30dd738da53f6edf5f3ca4` | identical to deployed |
| `functions/_shared/waRazielRender.ts` | `b20bcffcd1c36a8e82a3cc57a3000dce93f0740c8b308628b7a9d07c121fa284` | identical to deployed |
| `functions/_shared/personalMemoryPolicy.js` | `858a4882361652618707f59f9d183c3b255979820edff14febb3b147ce2f2e03` | new in the bundle |

Drift gate: `list_edge_functions` must show `wa-raziel` version **21**, `ezbr_sha256` **`6167766567cca19de23f2b10756227a9e1d4cc0cab9cd9fa4cd76ed36d221e1b`**, read immediately before the deploy.

### Step 2 — `ai-analyze` A (deployed v91, `verify_jwt: true`, entrypoint `index.ts`, one bundled file, no import map)

| File in the deploy | SHA-256 | Against deployed v91 |
|---|---|---|
| `index.ts` | `9ad6ff905912ec6c3148bc9ff8269b69bac5a5f4c74f66eebe20e298d569687b` | changed (CL-13 only; the two comment lines that held personal addresses stay redacted, as in the rollback artifact) |

Drift gate: `list_edge_functions` must show `ai-analyze` version **91**, `ezbr_sha256` **`2c8100726a5cdd353bd10efb7bec0ec1b30339995787c824d262707294cb57eb`**, read immediately before the deploy.

## 2. Conditions for each step

1. The explicit approval of ZURIEL naming the function, "artifact A" and the SHA-256 of its entry file.
2. The drift gate above, read immediately before the call. Any difference: stop and report.
3. The stamps checked on the assembled files (`verify`) in the same session.
4. The review of Codex on this unit.
5. **The rollback accepted as a decision (section 5).**
6. The baseline of section 3 read immediately before the step.

Not conditions (they belonged to the M0-coupled build): D-CARRY, the secret `ZURIEL_WA`, the N14 redirect check, the database step.

## 3. Baseline (read again before each step, with the same filter)

The independent read of Codex on 13.11: **`public.agent_user_memory` had 1,086 rows, of which 471 with `agent = 'raziel'`.** (The earlier figure of the first request, written from an older read, is replaced by these.) Numbers move with legitimate traffic, so they are not a pass/fail value: **read them again immediately before the step with the same filters and compare the result after the step with that fresh read.** All reads are read-only.

```sql
-- The same filters before and after. F0 = everything, F1 = raziel on WhatsApp chats, F2 = raziel on the site thread.
-- n and newest are over ALL rows of the filter, new rows included (no date restriction): they are what shows a new row.
-- stamp_of_earlier_rows is the hash of the rows that existed before; the date restriction is ONLY here, to compare those rows.
--   BEFORE read: leave :B0, :B1, :B2 as 'infinity' (all rows). AFTER read: set each to the `newest` of the same filter in the BEFORE read.
select 'F0' as filter, count(*) as n, max(created_at) as newest,
       md5(coalesce(string_agg(md5(t::text), ',' order by t.id) filter (where t.created_at <= :'B0'::timestamptz), '')) as stamp_of_earlier_rows
  from public.agent_user_memory t
union all
select 'F1', count(*), max(created_at),
       md5(coalesce(string_agg(md5(t::text), ',' order by t.id) filter (where t.created_at <= :'B1'::timestamptz), ''))
  from public.agent_user_memory t where agent = 'raziel' and channel like '%@%'
union all
select 'F2', count(*), max(created_at),
       md5(coalesce(string_agg(md5(t::text), ',' order by t.id) filter (where t.created_at <= :'B2'::timestamptz), ''))
  from public.agent_user_memory t where agent = 'raziel' and channel = 'site';
-- and the records of captured profile details after the deploy time T:
select count(*) from public.wa_bot_log where action = 'raziel_facts' and created_at > :'T'::timestamptz;
```

Reading the result: *before* is the fresh read; *after* is read at least one cron cycle (2 minutes) and one handled inbound message later.
* **`n` and `newest` are compared as they are, over all rows including new ones.** A new row raises `n` and/or moves `newest`; equality of both means that no new row appeared. The date restriction is used for nothing else than the `stamp_of_earlier_rows` comparison (equal = the rows that existed before are unchanged, none was updated or deleted).
* **What this proves, and what it does not.** No new row means that **no save was observed**. It does not prove that a write function was not called: `track_functions = none`, and a call that wrote nothing (a refusal, a closed policy) leaves no trace. The claim of this request is therefore "no new personal-memory row appears", never "the writer was not called".

## 4. The two steps

### Step 1 — deploy `wa-raziel` A, then verify (read-only)

Closes, in `wa-raziel` itself: saving the message of a linked sender and of a sender without an account; extracting and saving profile details and the `[facts-captured]` record of an unsaved detail; **the memory read of `wa-raziel` itself** (its own `getContext`: the stored context it reads for the returning-user greeting of the private chat, where the last stored research thread can appear in the text it sends, and for the group answers); the account-link message no longer says "everything is saved". The person is still answered.

**What step 1 does not close: the read through `ai-analyze`.** The private WhatsApp answer is produced by `ai-analyze`, which reads the stored context of a linked sender on its own (trusted WhatsApp channel). That read stays open after step 1 and is **closed in step 2**. Until step 2, the stored memory of a linked sender can still reach the WhatsApp answer through `ai-analyze` (tested: `MIXED 1b`, `1c`).

Verify:
1. `list_edge_functions`: `wa-raziel` has a new version above 21, `verify_jwt: false`; `get_edge_function`: every file equals the SHA-256 of section 1 (4 files).
2. **F1** after: `n` and `newest` (all rows, new ones included) equal the fresh read of F1, and `stamp_of_earlier_rows` is equal (no save observed; the collector is closed). **F0 and F2 may move** — other writers are legitimately open (`ai-analyze` on the site thread until step 2; the two dormant bots). No `personal_context` row for any sender created after T by `wa-raziel`.
3. No `wa_bot_log` row with `action = 'raziel_facts'` after T.
4. The person is still answered: at least one inbound message handled after T has its `raziel_dm` row in `wa_bot_log` and an outbound reply. If ZURIEL wants a probe, one ordinary message from his own phone (his action; not a probe of a real third party). **The navigation probe of the earlier request does not apply**: navigation is N6, which A does not contain.
5. The link to `ai-analyze` still works (a reply arrives); this is also what the test `LINK` scenarios show on the branch.

Stop and report (do not continue to step 2) if: a stamp differs; F1 moved; a reply is missing; the drift gate differed.

Not verifiable from here: `track_functions = none`, so a call counter is not available. The absence of new rows and of the captured record shows that no save was observed; it does not show that no write function was called. A message sent to a real third party is never used as a test.

### Step 2 — only after step 1 is verified: deploy `ai-analyze` A, then verify (read-only)

Closes: **the read through `ai-analyze`** — the stored context of a linked sender entering the WhatsApp answer (trusted channel) and the site answer; and remembering the subject of a site question. With step 1 and step 2 both deployed, neither function reads the stored memory without a consent.

Verify:
1. `list_edge_functions`: `ai-analyze` has a new version above 91, `verify_jwt: true`; `get_edge_function`: the file equals the SHA-256 of section 1 (1 file).
2. **F1 and F2** after: `n` and `newest` (all rows, new ones included) equal the fresh read, and `stamp_of_earlier_rows` is equal (now the site thread is closed too; no save observed). F0 may still move (the dormant bots).
3. A signed-in site request produces no new `raziel` row with `channel = 'site'`.
4. The WhatsApp reply of a linked sender is still produced by `ai-analyze` (the link): a reply arrives.

## 5. What the rollback means (it is a decision, not a technical step)

* `wa-raziel`: redeploy the manifest source — `node scripts/cl13-whatsapp-unit.mjs rollback wa-raziel <out-dir>` (v21, byte for byte, exact source from git). **It restores the OLD memory behaviour: every message is saved again, profile details are extracted and saved again, and the stored context is read again, without consent.**
* `ai-analyze`: the same with `rollback ai-analyze <out-dir>` (v91; two comment lines that held personal addresses are redacted). **It restores reading the stored memory into the answer and remembering every site question.**
* Rows written while the old behaviour is restored stay; nothing is deleted by a rollback, and the rollback of the code does not undo anything a deployed step prevented. Rolling back and then applying the database step later leaves the Edge code closed or open exactly as the deployed bytes say.
* If a step has to be rolled back, step 2 is rolled back before step 1.

## 6. Between the steps (what is true, and tested)

After step 1 the collector is closed, but `ai-analyze` v91 still reads the stored memory of a linked sender into the WhatsApp answer and remembers site questions (`states` MIXED 1b, 1c). This is the intermediate state; it is the reason step 2 follows. **U1 (`wa-hatishbi`, `wa-uriel`) is not part of this request and does not close the active collection.**

## 7. What this request does not contain

SQL of any kind; the database step; a research decision; N6 navigation; N8–N10; M0 or N14; any secret or setting; `wa-hatishbi`, `wa-uriel`, `raziel-attention`, `number-researcher`. Candidate B exists only as the alternative if ZURIEL decides to take N6.
