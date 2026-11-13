-- Add reviewed links to existing public passages for Lior Shitrit.
-- Each ref binds a source record, a passage locator and the reviewed SHA-256.
BEGIN;

DO $signed_passages$
DECLARE
  writer constant uuid := 'abca2ad1-7033-4f13-9f05-d616501c6dc6';
  entry record;
  source_hash text;
  reference_value text;
BEGIN
  PERFORM 1 FROM public.contributors
    WHERE id = writer AND slug = 'lior-shitrit' AND display_name = 'ליאור שטרית'
      AND kind = 'author' AND active AND NOT locked AND NOT building
      AND dossier_settings->>'visibility' = 'public'
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Public writer profile no longer matches'; END IF;

  FOR entry IN SELECT * FROM (VALUES
    ('a38cb665-9b58-4b19-b40c-000000000001'::uuid, 'posts', '43', '7a20cc7f786d5a419a97b08ced0f083563d68b897d153a8740971a99293eeb41', '5ed3a4b7b73e58401dfb69100d53a5d05b355360f86d11d84d479c042ab56fae'),
    ('a38cb665-9b58-4b19-b40c-000000000002'::uuid, 'posts', '906', '16c212690b56e6aaa97c029afd980a16bf6b84e03f33162b4aaaf4406e9b1e9b', '2bcb2386e892d8751682ea40c878e87f7c04727ed322611b62ed93785722a7ed'),
    ('a38cb665-9b58-4b19-b40c-000000000003'::uuid, 'posts', '972', '7a20cc7f786d5a419a97b08ced0f083563d68b897d153a8740971a99293eeb41', 'cf40eb1be9517f8b956b1f91938897baf1e6689f4284dec1f3566808f9b4b082'),
    ('a38cb665-9b58-4b19-b40c-000000000004'::uuid, 'posts', '1007', '16c212690b56e6aaa97c029afd980a16bf6b84e03f33162b4aaaf4406e9b1e9b', '9de5a37cc0a52301528acba4b2053a0a980cf8b8e85c9206faaa19cd4c41014b'),
    ('a38cb665-9b58-4b19-b40c-000000000005'::uuid, 'posts', '1047', 'ad0ba4449eea0734e15ee73c38c64275ac9b7f63803c2337bb7d989bbe186e60', 'c9bd89e1ddcb29738a76a819ef322a8f2af794fabe0008af457638b55e9f408c'),
    ('a38cb665-9b58-4b19-b40c-000000000006'::uuid, 'posts', '1049', '8cc77b883a3e9f4f4838521790a75f6874da9f7a049e1768bf732c61349abe21', '5c6765f6f414482bb4dd856acc644be9be0b56a2ac493ff799349e26d8ad2a89'),
    ('a38cb665-9b58-4b19-b40c-000000000007'::uuid, 'posts', '1051', '8f57b45c715eb7bdf2d64ad6d7501a5ce61391bf46bfb7a38474cf9b1d750c08', '9daa142df63bd3bcd8c2152f692787e5c930a44c28254c1670e4f3ec4408f5a7'),
    ('a38cb665-9b58-4b19-b40c-000000000008'::uuid, 'posts', '1476', '7a20cc7f786d5a419a97b08ced0f083563d68b897d153a8740971a99293eeb41', '306f288a3620cdd6d0f0f4070f28c935ba74f38fb739a3c12aa9b7881be8fa6f'),
    ('a38cb665-9b58-4b19-b40c-000000000009'::uuid, 'posts', '1578', '7a20cc7f786d5a419a97b08ced0f083563d68b897d153a8740971a99293eeb41', '2adaee8504bd29a717bfa998a0e4612f9aee8ce7522616bf7508fa543f8c8b47'),
    ('a38cb665-9b58-4b19-b40c-000000000010'::uuid, 'channel_updates', '55363cda-76c8-4527-9176-ed993956be60', '2', '28b34ade5e9cbbcfb47372bf9be2b2cc33e5862ec12316453e43f2c9feddb1fd'),
    ('a38cb665-9b58-4b19-b40c-000000000011'::uuid, 'channel_updates', '55363cda-76c8-4527-9176-ed993956be60', '4', '28b34ade5e9cbbcfb47372bf9be2b2cc33e5862ec12316453e43f2c9feddb1fd'),
    ('a38cb665-9b58-4b19-b40c-000000000012'::uuid, 'channel_updates', 'bf1c85a3-6e8e-429f-a67d-7cebcba06b17', '2', '527e08040d596c44b55149a5a2c217193f56680e040fe681288880ff3cbb2ea1'),
    ('a38cb665-9b58-4b19-b40c-000000000013'::uuid, 'channel_updates', 'bf1c85a3-6e8e-429f-a67d-7cebcba06b17', '4', '527e08040d596c44b55149a5a2c217193f56680e040fe681288880ff3cbb2ea1'),
    ('a38cb665-9b58-4b19-b40c-000000000014'::uuid, 'channel_updates', 'd85af5fd-f72b-47de-92a6-84b001f0311d', '2', '0d68d60eeb60165f291d5c455e0eaa05a39a2410752fd7e9cc951809ac4b1a5c'),
    ('a38cb665-9b58-4b19-b40c-000000000015'::uuid, 'channel_updates', 'd85af5fd-f72b-47de-92a6-84b001f0311d', '3', '0d68d60eeb60165f291d5c455e0eaa05a39a2410752fd7e9cc951809ac4b1a5c')
  ) AS refs(reference_id, source_table, source_id, locator, reviewed_hash)
  LOOP
    IF entry.source_table = 'posts' THEN
      SELECT encode(sha256(convert_to(content, 'UTF8')), 'hex') INTO source_hash
      FROM public.posts
      WHERE id = entry.source_id::bigint AND source = 'wordpress' AND home_hidden IS NOT TRUE
        AND NOT (coalesce(tags, '{}'::text[]) && ARRAY['טיוטה','פורום']::text[])
      FOR SHARE;
    ELSE
      SELECT encode(sha256(convert_to(text, 'UTF8')), 'hex') INTO source_hash
      FROM public.channel_updates
      WHERE id = entry.source_id::uuid AND status = 'live' AND page_only = false
        AND (expires_at IS NULL OR expires_at > now())
      FOR SHARE;
    END IF;
    IF source_hash IS DISTINCT FROM entry.reviewed_hash THEN
      RAISE EXCEPTION 'Public source %:% has changed', entry.source_table, entry.source_id;
    END IF;

    reference_value := entry.source_table || ':' || entry.source_id || '#' || entry.locator || '@' || entry.reviewed_hash;
    IF EXISTS (
      SELECT 1 FROM public.contributor_content
      WHERE id = entry.reference_id AND (
        contributor_id IS DISTINCT FROM writer OR ref IS DISTINCT FROM reference_value
        OR ref_type IS DISTINCT FROM 'signed_source_passage' OR kind IS DISTINCT FROM 'link'
        OR NOT is_public OR is_personal OR body IS NOT NULL
      )
    ) OR EXISTS (
      SELECT 1 FROM public.contributor_content
      WHERE contributor_id = writer AND ref_type = 'signed_source_passage' AND id <> entry.reference_id
        AND split_part(ref, '@', 1) = split_part(reference_value, '@', 1)
    ) THEN RAISE EXCEPTION 'Conflicting passage reference %', entry.reference_id; END IF;

    INSERT INTO public.contributor_content (id, contributor_id, kind, ref_type, ref, is_public, is_personal)
    VALUES (entry.reference_id, writer, 'link', 'signed_source_passage', reference_value, true, false)
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.contributor_content WHERE id = entry.reference_id AND contributor_id = writer
        AND kind = 'link' AND ref_type = 'signed_source_passage' AND ref = reference_value
        AND is_public AND NOT is_personal AND body IS NULL
    ) THEN RAISE EXCEPTION 'Passage reference % was not recorded', entry.reference_id; END IF;
  END LOOP;
END
$signed_passages$;

SELECT id, ref_type, split_part(ref, '@', 1) AS source_locator
FROM public.contributor_content
WHERE contributor_id = 'abca2ad1-7033-4f13-9f05-d616501c6dc6'
  AND ref_type = 'signed_source_passage'
  AND id IN ('a38cb665-9b58-4b19-b40c-000000000001', 'a38cb665-9b58-4b19-b40c-000000000002', 'a38cb665-9b58-4b19-b40c-000000000003', 'a38cb665-9b58-4b19-b40c-000000000004', 'a38cb665-9b58-4b19-b40c-000000000005', 'a38cb665-9b58-4b19-b40c-000000000006', 'a38cb665-9b58-4b19-b40c-000000000007', 'a38cb665-9b58-4b19-b40c-000000000008', 'a38cb665-9b58-4b19-b40c-000000000009', 'a38cb665-9b58-4b19-b40c-000000000010', 'a38cb665-9b58-4b19-b40c-000000000011', 'a38cb665-9b58-4b19-b40c-000000000012', 'a38cb665-9b58-4b19-b40c-000000000013', 'a38cb665-9b58-4b19-b40c-000000000014', 'a38cb665-9b58-4b19-b40c-000000000015')
ORDER BY id;

COMMIT;
