-- One reviewed import. Run after the reader is deployed and verified.
-- Body text is selected inside the database from the exact reviewed sources.
BEGIN;

DO $gilui_yomi$
DECLARE
  owner_id constant uuid := 'b6ce542a-2b07-4749-8aba-532c886f6de7';
  owner_contributor constant uuid := 'fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf';
  zion_contributor constant uuid := '9594ec7d-159d-4148-ad6d-0371ffca8282';
  yaniv_contributor constant uuid := 'd0fe09cd-ccc2-4f37-9c94-0de9e75e2b86';
  -- Set only after identifying an existing public writer page and confirming its link to the sender.
  lior_contributor constant uuid := NULL;
  root_id constant uuid := '2c22eafe-5847-4c31-a510-2abfd1fa3291';
  card_id constant uuid := 'ad270354-41ab-4d4d-8bf5-030e0452406d';
  receipt_id constant uuid := 'ea7af789-75dc-4292-a2f1-040948eef581';
  thread_title constant text := 'ימין ושמאל תפרוצי · 1237, 1158 ותשפ״ז';
  thread_excerpt constant text := 'ציון סיבוני, ליאור שיטרית ויניב לוי בדיון של הגילוי היומי על 1237, 1158 ותשפ״ז.';
  now_at constant timestamptz := now();
  source_start constant timestamptz := '2026-11-12 00:00 Asia/Jerusalem';
  source_end constant timestamptz := '2026-11-13 00:00 Asia/Jerusalem';
  item record;
  writer record;
  source_body text;
  source_at timestamptz;
  source_hash text;
  details jsonb := '[]'::jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('gilui-yomi-thread-20261112', 0));
  IF EXISTS (SELECT 1 FROM public.decision_ledger WHERE id = receipt_id
      AND decision_type = 'community_source_import' AND subject_ref = root_id::text AND status = 'applied') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users u
      JOIN public.contributors c ON c.id = owner_contributor AND c.user_id = u.id AND c.active
      WHERE u.id = owner_id AND u.role = 'admin' AND u.display_name = 'sod1820' AND c.display_name = 'sod1820')
      OR (SELECT c.display_name FROM public.contributors c
          WHERE c.user_id = owner_id AND coalesce(c.display_name, '') <> '' ORDER BY c.created_at LIMIT 1)
          IS DISTINCT FROM 'sod1820' THEN
    RAISE EXCEPTION 'Approved community publisher has changed';
  END IF;

  IF lior_contributor IS NULL THEN
    RAISE EXCEPTION 'The reviewed contributor ID for Lior is required';
  END IF;
  IF lior_contributor IN (owner_contributor, zion_contributor, yaniv_contributor) THEN
    RAISE EXCEPTION 'The reviewed contributors must have distinct identities';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.research_contributions'::regclass
        AND tgname = 'trg_rc_notify' AND tgenabled = 'O'
        AND tgfoid = 'public.notify_on_contribution()'::regprocedure) THEN
    RAISE EXCEPTION 'Community notification trigger changed';
  END IF;
  -- Historical imports do not send new notifications. This table lock is scoped
  -- to the transaction and the trigger is restored before anything can commit.
  ALTER TABLE public.research_contributions DISABLE TRIGGER trg_rc_notify;

  FOR item IN SELECT * FROM (VALUES
    (1, root_id, NULL::uuid, zion_contributor, 107, NULL::uuid, '09867e29c4d2b21c14ff33978120c7f5', '09867e29c4d2b21c14ff33978120c7f5', '2026-11-12 22:42:25+02'::timestamptz),
    (2, '1af9041b-b83b-4247-8f4b-721e6abf4e73'::uuid, root_id, owner_contributor, NULL, 'ac57bf9c-d19e-421d-83f8-15351664189c'::uuid, 'e5f0cc58f75da7cdd938312ec735b91a', 'f592ecc68dcfe37b2615c045409001d0', '2026-11-12 22:44:04+02'::timestamptz),
    (3, '04343580-0d90-43be-9867-38ec7f96b786'::uuid, '1af9041b-b83b-4247-8f4b-721e6abf4e73'::uuid, zion_contributor, 108, NULL, '82bb170bc817dd1cb8ba3fd6e74bdfb7', 'b18b098f95d5a3cc4944e1eff594278b', '2026-11-12 22:58:51+02'::timestamptz),
    (4, '2ca09a20-ab24-4456-8add-0f12fa8c6aa5'::uuid, '04343580-0d90-43be-9867-38ec7f96b786'::uuid, lior_contributor, 109, NULL, 'd2a96eb41043722f42f31b797cb03400', '2385575fc89f55f2705f7557e266a310', '2026-11-12 23:15:40+02'::timestamptz),
    (5, 'c6f9255f-707e-4a2c-b5c9-a2fea3ed22c0'::uuid, root_id, yaniv_contributor, NULL, '60ee7dd1-f2c2-42b0-8a36-89a4fa9190e4', '4f4a0fa457fabf35b4ac2531144410e9', NULL, NULL),
    (6, '409bbb47-120a-438b-8cfd-c3284832b428'::uuid, root_id, owner_contributor, NULL, '8c30a12a-57da-49a8-a454-748c674fc6b0', 'd5f38e24ba93fc631aea28c782f64180', NULL, NULL),
    (7, '4649109a-1059-4e5a-8ae9-5a267b44a9be'::uuid, root_id, yaniv_contributor, NULL, '8594a16e-b68d-4d5c-a7ed-491a76097eb7', 'b4b54c8ee4a797ecb25dddda23d2a16a', NULL, NULL),
    (8, 'e045d5b8-835c-41fc-a322-b339d9499f76'::uuid, root_id, yaniv_contributor, NULL, '9ae687a5-69f6-4196-8884-35395c0b1b1a', 'd4ede7ae27c71237bc451c37e4c5f962', NULL, NULL),
    (9, '3bd5ec19-bd2c-460a-8b4e-02c7bbfb7daa'::uuid, root_id, owner_contributor, NULL, '82ff208e-20b5-47b4-a572-d62db931b234', '68236813dd91512054a661a3281ed7fa', NULL, NULL)
  ) AS sources(seq, id, parent_id, contributor_id, inbox_id, update_id, before_hash, body_hash, original_at)
    ORDER BY seq
  LOOP
    SELECT c.id, c.display_name, c.email INTO writer
    FROM public.contributors c
    WHERE c.id = item.contributor_id AND c.active
      AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false)
      AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public';
    IF NOT FOUND OR nullif(btrim(writer.display_name), '') IS NULL THEN
      RAISE EXCEPTION 'Public writer profile unavailable for source %', item.seq;
    END IF;

    IF item.inbox_id IS NOT NULL THEN
      SELECT m.body_text, m.received_at INTO source_body, source_at
      FROM public.inbound_emails m
      WHERE m.id = item.inbox_id
        AND lower(btrim(m.from_email)) = lower(btrim(writer.email))
        AND m.meta->>'provider' = 'resend' AND m.meta->>'verified_webhook' = 'true';
    ELSE
      SELECT c.text, c.created_at INTO source_body, source_at
      FROM public.channel_updates c JOIN public.channel_update_group_proof p ON p.update_id = c.id
      WHERE c.id = item.update_id AND c.channel = 'gilui-yomi' AND p.channel = c.channel
        AND p.identity_contributor_id = writer.id AND c.contributor_id = writer.id
        AND c.group_source_intake_public
        AND p.incoming AND p.identity_basis = 'verified_phone_unique' AND p.held_at IS NULL AND p.text_only;
    END IF;
    IF md5(source_body) IS DISTINCT FROM item.before_hash OR source_at IS NULL
      OR source_at < source_start OR source_at >= source_end THEN
      RAISE EXCEPTION 'Reviewed source % has changed or is unavailable', item.seq;
    END IF;

    IF item.inbox_id IN (108, 109) THEN
      source_body := btrim(split_part(source_body, E'\nבתאריך ', 1), E' \t\n\r');
    ELSIF item.seq = 2 THEN
      source_body := btrim(regexp_replace(source_body, E'^Worked for [^\n]+\n[[:space:]]*', ''), E' \t\n\r');
    END IF;
    source_hash := md5(source_body);
    IF (item.body_hash IS NOT NULL AND source_hash IS DISTINCT FROM item.body_hash)
      OR source_body ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
      OR source_body ~ '(^|[^0-9])\+?(972|0)[0-9 -]{8,}[0-9]' THEN
      RAISE EXCEPTION 'Source % does not match its approved public text', item.seq;
    END IF;

    INSERT INTO public.research_contributions
      (id, author_user_id, author_contributor_id, author_name, origin, status, target_type, target_id,
       parent_id, title, body, created_at, updated_at, last_activity_at)
    VALUES
      (item.id, CASE WHEN writer.id = owner_contributor THEN owner_id END, writer.id, writer.display_name, 'community_2029', 'approved', 'home', 'community',
       item.parent_id, CASE WHEN item.id = root_id THEN thread_title END,
       source_body,
       coalesce(item.original_at, source_at), now_at, now_at);

    details := details || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'message_id', item.id, 'parent_id', item.parent_id, 'contributor_id', writer.id, 'inbound_email_id', item.inbox_id,
      'channel_update_id', item.update_id, 'source_at', source_at,
      'gmail_occurrence', CASE WHEN item.seq = 2 THEN '1a1d180df6566ee3' END,
      'public_body_md5', source_hash)));
  END LOOP;

  ALTER TABLE public.research_contributions ENABLE TRIGGER trg_rc_notify;

  INSERT INTO public.channel_updates (id, text, source, channel, status, page_only, created_at, link_url)
  VALUES (card_id, thread_excerpt, 'admin', 'gilui-yomi', 'live', false, now_at,
          '/community/chat?thread=' || root_id::text);

  INSERT INTO public.decision_ledger
    (id, decision_type, subject_type, subject_ref, domain, human_decision, status, evidence, result_ref)
  VALUES
    (receipt_id, 'community_source_import', 'community_thread', root_id::text, 'community', 'approve', 'applied',
     jsonb_build_object('source_date', '2026-11-12', 'sources', details),
     jsonb_build_object('community_thread', root_id, 'now_card', card_id));
END
$gilui_yomi$;

SELECT r.id AS community_root, c.id AS now_card,
       '/community/chat?thread=' || r.id::text AS href
FROM public.research_contributions r
JOIN public.channel_updates c ON c.id = 'ad270354-41ab-4d4d-8bf5-030e0452406d'
WHERE r.id = '2c22eafe-5847-4c31-a510-2abfd1fa3291';

COMMIT;
