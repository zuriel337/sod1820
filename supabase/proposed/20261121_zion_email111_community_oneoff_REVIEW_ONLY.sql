-- REVIEW ONLY — Zion Siboni inbound email #111 -> existing community and Daily Discovery.
-- Source of record: public.inbound_emails(id=111). Uses the SAME existing
-- research_contributions + channel_updates + decision_ledger homes as the 12-Nov import.
-- No new schema/Edge/cron/Research Intake/AI; source text is never edited.
-- PRE-DEPLOY OWNER GATE: approval of this exact file and commit SHA is required.
-- DO NOT run this just because the branch exists or CI passes.

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

DO $zion_email_111$
DECLARE
  source_id constant bigint := 111;
  writer_id constant uuid := '9594ec7d-159d-4148-ad6d-0371ffca8282';
  thread_id constant uuid := '0cb16c0a-de99-5d71-bb45-b7211d18af2e';
  card_id constant uuid := '1f35ea62-3aac-5be2-975f-65078f818be7';
  receipt_id constant uuid := 'b74f0a2e-48ea-56a4-b04a-75dcc387802d';
  expected_body_hash constant text := 'dba3630ebc8b9b2003d6abbb34d41f0d';
  expected_subject_hash constant text := '6a9687d86d6be756cf25bf7c5855847c';
  expected_message_id_hash constant text := '1935cc3e5a59405373b60b697b5c2f3e';
  expected_received_at constant timestamptz := '2026-11-20 06:54:56.28566+00';
  m public.inbound_emails%ROWTYPE;
  c public.contributors%ROWTYPE;
  existing_ledger public.decision_ledger%ROWTYPE;
  new_at timestamptz := now();
  card_href text := '/community/chat?thread=' || thread_id::text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('sod1820:zion-email:111:community-import', 0));

  SELECT * INTO m FROM public.inbound_emails WHERE id = source_id FOR SHARE;
  SELECT * INTO c FROM public.contributors WHERE id = writer_id FOR SHARE;
  IF m.id IS NULL OR c.id IS NULL THEN
    RAISE EXCEPTION 'Reviewed email or canonical contributor is missing';
  END IF;
  IF m.received_at IS DISTINCT FROM expected_received_at
    OR md5(coalesce(m.body_text, '')) <> expected_body_hash
    OR md5(coalesce(m.subject, '')) <> expected_subject_hash
    OR md5(coalesce(m.message_id, '')) <> expected_message_id_hash
    OR coalesce(m.meta->>'provider', '') <> 'resend'
    OR coalesce(m.meta->>'verified_webhook', '') <> 'true'
    OR m.in_reply_to IS NOT NULL
    OR lower(btrim(coalesce(m.from_email,''))) <> lower(btrim(coalesce(c.email,'')))
    OR c.display_name <> 'ציון סיבוני'
    OR c.slug <> 'zion-siboni'
    OR c.kind <> 'author'
    OR c.active IS DISTINCT FROM true
    OR c.trusted IS DISTINCT FROM true
    OR coalesce(c.locked,false)
    OR coalesce(c.building,false)
    OR coalesce(c.dossier_settings->>'visibility','public') <> 'public'
    OR length(coalesce(m.body_text,'')) < 40
    OR length(coalesce(m.body_text,'')) > 10000
    OR coalesce(m.body_text,'') ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
    OR coalesce(m.body_text,'') ~ '(^|[^0-9])\+?(972|0)[0-9 -]{8,}[0-9]'
    THEN
    RAISE EXCEPTION 'Source proof changed or not admissible as this reviewed public email';
  END IF;

  SELECT * INTO existing_ledger FROM public.decision_ledger WHERE id=receipt_id FOR SHARE;
  IF FOUND THEN
    IF existing_ledger.decision_type <> 'community_source_import'
       OR existing_ledger.status <> 'applied'
       OR existing_ledger.subject_ref <> thread_id::text
       OR coalesce(existing_ledger.evidence->>'inbound_email_id','') <> '111'
       OR NOT EXISTS (
          SELECT 1 FROM public.research_contributions r
          WHERE r.id=thread_id AND r.author_contributor_id=writer_id
            AND md5(coalesce(r.body,''))=expected_body_hash AND r.status='approved'
       )
       OR NOT EXISTS (
          SELECT 1 FROM public.channel_updates cu
          WHERE cu.id=card_id AND cu.link_url=card_href
            AND cu.status='live' AND cu.channel='gilui-yomi'
       )
    THEN RAISE EXCEPTION 'Conflicting existing import receipt, stop for review'; END IF;
    RETURN; -- Exactly the previously approved one-off import; zero duplicate writes.
  END IF;

  IF EXISTS (SELECT 1 FROM public.research_contributions WHERE id=thread_id)
     OR EXISTS (SELECT 1 FROM public.channel_updates WHERE id=card_id)
     OR EXISTS (
        SELECT 1 FROM public.research_contributions r
        WHERE r.author_contributor_id=writer_id
          AND md5(coalesce(r.body,''))=expected_body_hash
     )
     OR EXISTS (
        SELECT 1 FROM public.channel_updates cu
        WHERE cu.link_url=card_href
     )
     OR EXISTS (
       SELECT 1 FROM public.decision_ledger l
       WHERE l.decision_type='community_source_import'
         AND l.status='applied'
         AND l.evidence->>'inbound_email_id'=source_id::text
     )
  THEN
    RAISE EXCEPTION 'The email is already imported or collides with existing community source';
  END IF;

  -- Existing canonical Community source. Keep EXACT body text, original source
  -- receipt date and real author_contributor_id. Do not impersonate login.
  INSERT INTO public.research_contributions
    (id,author_user_id,author_contributor_id,author_name,origin,status,
     target_type,target_id,parent_id,title,body,created_at,updated_at,last_activity_at)
  VALUES
    (thread_id,NULL,writer_id,c.display_name,'community_2029','approved',
     'home','community',NULL,left(btrim(m.subject),160),
     m.body_text,m.received_at,new_at,new_at);

  -- Same already-live Daily Discovery source-card channel as the Nov 12 import.
  -- This is a public content pointer, NOT a new Research Object or verification.
  INSERT INTO public.channel_updates
    (id,text,source,channel,status,page_only,created_at,link_url,credit)
  VALUES
    (card_id,left(c.display_name || ' · ' || btrim(m.subject),160),
     'admin','gilui-yomi','live',false,new_at,card_href,c.display_name);

  -- Private audit, no raw address, message header or body embedded in ledger.
  INSERT INTO public.decision_ledger
    (id,decision_type,subject_type,subject_ref,domain,human_decision,status,
     evidence,result_ref)
  VALUES
    (receipt_id,'community_source_import','community_thread',thread_id::text,
     'community','approve','applied',
     jsonb_build_object(
        'inbound_email_id',source_id,
        'received_at',m.received_at,
        'source_body_md5',expected_body_hash,
        'subject_md5',expected_subject_hash,
        'message_id_md5',expected_message_id_hash,
        'source_provider','resend','verified_webhook',true,
        'author_contributor_id',writer_id,
        'editorial_scope','owner_authorized_daily_discovery_one_off'
     ),
     jsonb_build_object('community_thread',thread_id,'now_card',card_id)
    );
END
$zion_email_111$;

-- Exact acceptance readback (no private message text exposed).
SELECT r.id AS community_root,
       r.status, r.author_name,
       md5(r.body) AS public_body_md5,
       cu.id AS now_card, cu.status AS now_status,
       cu.link_url AS community_href,
       dl.status AS source_receipt
FROM public.research_contributions r
JOIN public.channel_updates cu
  ON cu.id='1f35ea62-3aac-5be2-975f-65078f818be7'
JOIN public.decision_ledger dl
  ON dl.id='b74f0a2e-48ea-56a4-b04a-75dcc387802d'
WHERE r.id='0cb16c0a-de99-5d71-bb45-b7211d18af2e'
  AND r.author_contributor_id='9594ec7d-159d-4148-ad6d-0371ffca8282'
  AND md5(coalesce(r.body,''))='dba3630ebc8b9b2003d6abbb34d41f0d'
  AND cu.link_url='/community/chat?thread=0cb16c0a-de99-5d71-bb45-b7211d18af2e';

COMMIT;
