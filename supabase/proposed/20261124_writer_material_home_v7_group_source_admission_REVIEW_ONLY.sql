-- REVIEW ONLY, NOT APPLIED. writer_material_home_law v6 → v7 (#1514, ZURIEL 24.11.2026: text for approval, no DB change).
-- Applying it is a separate ZURIEL approval of this exact file. One transaction, guarded:
--   1. the active writer_material_home_law must be v6 with the exact text read on 24.11.2026 (md5 b8be155d…);
--   2. v6 becomes inactive and v7 (v6 text + the update below, v6 metadata + group_source_admission_v1) becomes the active
--      version, as v5 → v6 was written (nodes.type='rule', supersedes_version, is_active).
-- No table, column, function, policy or grant is created or changed.
do $migration$
declare
  v_old public.nodes%rowtype;
  v_update constant text := $u$


[UPDATE v7 · Human-Gate ZURIEL · 24.11.2026 — GROUP SOURCE ADMISSION TO COMMUNITY THREADS · EXTEND_EXISTING]

43. ONE INTAKE. Every public WhatsApp group source (today gilui-yomi and torat-haremez) and every writer enters through the one existing intake: wa-channel-ingest → channel_updates → channel_update_group_proof, under research_intake_foundation_contract_law. No group, writer or channel gets its own intake, store, table, worker or publication path. A difference between groups or writers is policy data read by the same code, never a separate mechanism.

44. FIVE SEPARATE STAGES. Each stage can only admit or hold; no stage implies the next.
(1) INTAKE: the source message is stored as received, with its provider message id (ext_msg_id), group and time. Intake makes nothing public.
(2) IDENTITY: the author is a canonical Contributor only by server proof, sender JID/phone → exactly one Contributor (identity_basis = verified_phone_unique). Display name, credit, wa_names or message text never establish identity.
(3) THREAD LINKAGE: a reply is linked only through the provider quoted-message id (channel_update_group_proof.quoted_parent_ext_msg_id, private provenance) to a parent from the same group that is already admitted. Never inferred from author, text, time or proximity. A message without a quoted-message id is a new message and may open a root. A message that carries a quoted-message id is a reply: if its parent is missing, not admitted, from another group or would form a cycle, the reply is held; it is never published as a new root.
(4) PUBLICATION AUTHORIZATION: governed by Human Gate (§10). Automatic admission exists only under an explicit, standing ZURIEL authorization scoped to group + contributor + message window (§45).
(5) RESEARCH VERIFICATION: admission to a Community thread publishes a source contribution; it does not verify it. Numbers, equalities and claims inside it remain Source claims until canonical engine/source verification (§3, Truth/Human Gate).

45. SCOPED AUTHORIZATION (ZURIEL 24.11.2026). torat-haremez: only NEW messages, whose provider send time (channel_updates.created_at) is at or after 2026-11-24T18:52:39Z — the first second after ZURIEL's authorization was recorded (work_log 710652f5) — of two contributors: Shimon Haimov (contributor c0459430-6ba0-44a9-b1be-b5952344e74d) and the site owner (contributor "sod1820", fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf). Every other member of the group, verified or not, is held. No backfill of earlier messages. gilui-yomi keeps its existing rules unchanged. The admission step enforces the instant itself: an earlier, undated or unparsable message is held. This is an authorization list read by the one intake, not a mechanism; adding a writer, a group or a time window requires a new explicit ZURIEL decision. It authorizes the publication of this content only. It authorizes no change to the system — schema, functions, Edge deployment, permissions, merge or release — each of which keeps its own explicit ZURIEL approval (CLAUDE.md 0.4).

46. EXISTING AND HOLD.
(a) ALREADY ADMITTED: a source message that was already admitted (one source → at most one contribution) is recognized as existing. No second write, no change of its visibility, no hiding, no re-dating and no re-linking.
(b) HOLD BY DEFAULT: unverified identity, identity mismatch, a writer outside §45, a message before the §45 instant, a held or private source, a body not admitted for public display, or a reply whose parent is missing or unproven (§44.3) → HELD (private). Never published, never guessed. A held item remains private source material.

47. PRIVACY AND EXISTING CONTRACTS. Phone, JID, e-mail and other personal data never leave the server and never appear in the Community, Now, a page, a share card or search (person_foundation_contract_law; raziel_group_privacy_law for the group/DM boundary). The public body follows the existing public projection and redaction. RLS, grants and isAdmin are unchanged. Publication, visibility and Community display rules are not restated here: they remain with §10 and publishing conventions. The Owner Index has no dedicated Community-publication owner; this was reported to ZURIEL and is not created here.

48. ONE WRITE, ATOMIC RECHECK. The write into research_contributions (root or reply, existing origin) is one server-side step that re-checks stages 2–4 at write time, and is idempotent per source message (one source → at most one contribution). Now receives one update per root thread, not one per reply.

49. OWNER CHECK: EXTEND_EXISTING writer_material_home_law under research_intake_foundation_contract_law. This update creates no new law, store, intake, publication axis or permission. The reverse direction (site → group) is out of scope (ZURIEL 24.11.2026).
$u$;
begin
  select * into strict v_old from public.nodes where type = 'rule' and rule_id = 'writer_material_home_law' and is_active;
  if v_old.rule_version <> 6 or md5(v_old.description) <> 'b8be155dcfb7f5562d1f33d6de440193' then
    raise exception 'Unexpected active writer_material_home_law v% (%)', v_old.rule_version, md5(v_old.description);
  end if;

  update public.nodes set is_active = false where id = v_old.id;
  insert into public.nodes (type, label, description, metadata, is_active, rule_id, rule_version, supersedes_version, weight)
  values ('rule', 'Writer / Contributor Material Home v7 — Group Source Admission (one intake)', v_old.description || v_update,
    v_old.metadata || jsonb_build_object(
      'group_source_admission_v1', jsonb_build_object(
        'human_gate', 'ZURIEL 2026-11-24', 'change', 'GROUP_SOURCE_ADMISSION_ONE_INTAKE', 'owner_check', 'EXTEND_EXISTING', 'issue', '#1514', 'work_log', '43b6ca7b-22d1-4582-8a93-d5d2c3aa6fd2',
        'stages', jsonb_build_array('intake', 'identity', 'thread_linkage', 'publication_authorization', 'research_verification'),
        'identity_basis', 'verified_phone_unique',
        'authorizations', jsonb_build_array(jsonb_build_object('channel', 'torat-haremez', 'new_messages_only', true, 'backfill', false,
          'contributors', jsonb_build_array('c0459430-6ba0-44a9-b1be-b5952344e74d', 'fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf'))),
        'effective_from', '2026-11-24T18:52:39Z', 'existing_is_noop', true, 'reply_without_parent', 'held',
        'authorizes_content_publication_only', true,
        'hold_by_default', true, 'reverse_direction', false, 'new_mechanism', false)),
    true, 'writer_material_home_law', 7, 6, v_old.weight);
end;
$migration$;
