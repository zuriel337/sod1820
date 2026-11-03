# Chat delta — DEFERRED_USER_DECISION

**Imported this task: 0.** The user deferred the work: “תוותר על הצ'אט כרגע תמשיך אני רוצה לסיים”. Collection and preparation stopped. No SQL import/replay, source deletion, notification, model call, deploy or repository edit was performed by this reviewer.

Baseline `957e4a6a7148f20cadd921303d8c9a86a8b6a7b5`; branch `gpt/2029-public-cutover-final-preparation-20261103`; root coordination addendum `6ec8d9bb-a2ea-4efb-995b-fab450de2118`. AGENTS/CLAUDE/owner pointers and relevant live work_log were checked. Root remains the sole writer.

## Findings retained

Prior import `COMMUNITY_RECENT_OPENWEB_IMPORT_20261031`, AFTER `422c2815-d7df-4618-bca6-3ba9adf12fab`, code SHA `2ce4fa74e7a396eae03ae6ecf2a9f77c6272892c`:45 imported messages,25 roots+20 replies, source moderation preserved, historical replay0 inserts. Current archive:41,125 OpenWeb rows;8,989 stored roots;32,136 linked replies;25,564 approved. Latest imported source timestamp `2026-10-30T00:28:24Z`; last provenance import `2026-10-31T07:49:52.449481Z`. Live staging table is empty. This is not proof that no source messages remain.

The ordinary public guest SDK flow remains available: GET `device-load` → POST `guests/token` → POST `conversation/read`, using the existing conversation `sp_OVtajBTj_POST$ID$GOES$HERE`. No registered/admin/SSO session was used; tokens remained only in process memory. Current public counter:134,877 messages =30,070 roots+104,807 replies. Prior134,856 counter is only corroboration, not coverage proof.

Read32 roots through the exact oldest root of the prior import receipt, then expanded descendant trees with targeted `conversation/read(message_id=...,count=25)`. Reconstructed91 source rows, with0 unresolved pagination within those trees and0 missing parent references. The default newest-root response omits deeper descendants. Exact source-ID matching found45 already imported,46 absent:7 roots+39 replies. Existing45 parent/status mismatches:0. No text/name matching occurred.

## Proposed selection, now deferred

Using the verified previous import transaction as the boundary,21 new public messages were found:7 roots+14 replies. An additional blocked/deleted tombstone was returned by the source. One approved reply descends from that deleted node and stays excluded; do not reparent it or expose deleted content.

The proposed24-row selection is20 new public messages plus4 older public ancestors needed for exact threads: **7 roots+17 replies**. Every selected row was freshly re-read as approved, published and not deleted. Its exact IDs/lineage are in the JSON companion. Five existing source-native identities cover23 rows; one new native identity covers one row. Zero selected authors are mapped to claimed Auth users. No name/email-based attribution occurred.

Twenty older absent replies lie outside this recent ancestor closure. Two were explicitly held in the Oct31 receipt because their triggers produce notifications. These20 are separate from the new reply blocked by its deleted parent. Recent replies on roots older than the prior import anchor were not comprehensively scanned; this is not a full historical or site-wide backfill.

## Canonical writer and read-only dry-run

`public.g3_openweb_import_batch(jsonb)` accepts1–500 rows and invokes the existing25-argument `g3_openweb_import_message(...)`. Both are SECURITY INVOKER: current privilege checks confirm postgres/service_role access, anon/authenticated denied. No credentials were copied/installed. Unique source lineage uses `cl_openweb_message_derived_from_uniq` for `openweb_message/derived_from`. Expected parents resolve atomically through this same lineage; missing expected parents fail closed. `g3_openweb_import_stage_batch(integer)` is unnecessary for the bounded selection. The old Edge importer remains410 and must not be revived.

Actual selected public input passed the existing `orderMessagesForBoundedImport` and `planImport`:24 planned inserts,17 parent links,0 unresolved parents; pure planner replay0 inserts/24 skips. **No live SQL import or replay was run.** Temporary source conversion preserves plain authored text/link hrefs,4 public image URLs (HEAD200/image type),6 original YouTube URLs and24 source reaction-count pairs. Playback was not tested. This temporary representation adapter is not accepted persistent integration or SQL proof.

`origin=openweb` remains archived discussion/idea. No research classification, index eligibility, graph node, validation or source-authority claim is created. The namespace identity is the exact original message/user ID, not a matching title/name.

## SQL proposal is UNTESTED and NOT READY

Live trigger chain: `notify_on_contribution` → `user_notifications` → `fn_user_notification_wa_project` → `bot_outbox`, subject to existing preferences/binding. Read-only prediction for the24 selected rows found0 notifications; prediction is not execution proof. No trigger, global setting, role, channel or permission was disabled.

The prepared one-statement SQL proposal pins IDs/RPC hashes, checks ancestry and identity, invokes the existing batch and replay, and attempts a transaction-local notification guard. It was **not executed or tested**. A concrete defect remains: comparing `xmin` only with the top-level transaction ID can miss PL/pgSQL EXCEPTION subtransaction writes. The live WhatsApp projection contains such an EXCEPTION block. Therefore the current guard is not proof of zero outbox side effects and is **not ready to execute**. The user deferred this task; no correction/testing was attempted afterward.

## Temporary payloads stay outside the repository

- `/tmp/finalprep-chat-public24-rpc-payload.json`, mode0600, SHA256 `5eb7f50565b70e5a930908f22325c29c29b4150940843865f0dad699152fe2ed`.
- `/tmp/finalprep-chat-public24-guarded-import.PROPOSAL.sql`, mode0600, SHA256 `cc63fe975c0e17dcd2217ba35311be03adbd4b1dd4eb8e66d1f5f02480b22809`: inactive, untested, not ready.
- Normalizer input SHA256 `359f8dd87d4f90eace07864e9693439da9a479e503ae21eda769c53c8cfb3121`; normalized messages SHA256 `97e66823c7e3067a68402998be3859a34349bd6160a8eaf981f7ff0bccc4e137`.
- `/tmp/finalprep-chat-public24-artifact-hashes.json` and `/tmp/finalprep-chat-canonical-dryrun-summary.json` contain hashes/sanitized dry-run results only.

The temporary public payload was expressly requested by root before the user deferral. It contains no deleted ancestor body, private DM, email/phone value, token or raw profile metadata, and was never printed. It grants no permission to execute. Root should permanently retain only this report, the sanitized metadata JSON and dry-run receipt; no bodies or executable payload SQL in the repository. Any later resumption requires a fresh explicit instruction and fresh source/state verification.
