-- SOD1820 · Legacy retirement — deactivate 9 unconditional spec rows (bnei_haheichal excluded per ד3) — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
-- Effect: is_active=false only. label/description/metadata unchanged; the rows stay in public.nodes as history.
-- Re-verified at HEAD 932aba4bd and in the live DB on 11.11.2026: zero consumers (code, CI, docs, DB functions, views, edges; no reader of type='spec').
begin;
do $sod_blk$
declare
  r record; n int;
begin
  for r in select * from (values
    ('2fa07a3e-5537-42c4-86ad-920920202cbd'::uuid, 'd5f4f03d9094cf454e57c4e53969388c', $sod_lbl$ארכיון ההתגלות — גלריה מאוחדת$sod_lbl$),
    ('abc9bf76-46f7-4598-a635-25240730b112'::uuid, 'f9c9ce6eecaf7e3e201b1e431beb5717', $sod_lbl$בית המדרש — Mega Menu ושיטות$sod_lbl$),
    ('0caadab6-fc1f-4d1d-a401-d613a3b6ef47'::uuid, '9b6d8a84acca0e265cc3967aba9a0dc6', $sod_lbl$הצופן התנ״כי — דף ELS + לוגו-צופן אוטומטי$sod_lbl$),
    ('f8927670-babf-4ffe-87ed-7e833bedc5f0'::uuid, '5c100d488e957f2ba5392bfd71dd06ce', $sod_lbl$מבנה התפריט העליון (סופי)$sod_lbl$),
    ('1ccaf4df-d985-4fc9-8b5d-4acbfeb5efb7'::uuid, '1b7a3d73d576e9b65eaee84f43a5e2fc', $sod_lbl$מנגנון הקפצת תמונות גימטריה לפי הקשר$sod_lbl$),
    ('64bb4f0d-1fad-4ac7-98cb-2dfbee23d4a0'::uuid, 'dff953f6fd6f13b4315d080daa435572', $sod_lbl$עמוד הבית — פריסה דינמית מלכותית$sod_lbl$),
    ('40af59bd-010e-47a2-819d-149a597a24e0'::uuid, 'eb9226b7d616468f1621a5a27bd7eca3', $sod_lbl$ציר זמן הגאולה — מפרט בנייה (Claude Code)$sod_lbl$),
    ('76ef74ea-e227-4760-9e24-d616e5ed71c3'::uuid, 'c09ab0e0b2c07b64e43454a3012faf27', $sod_lbl$שורת פעילות חיה$sod_lbl$),
    ('f30c0148-e4c0-4937-a4ee-4cd26019587f'::uuid, '80672c41c3494650565e6b39ef2e0c5f', $sod_lbl$תוכנית-אב לאתר — הרשת החיה$sod_lbl$)
  ) as t(id, d_md5, label) loop
    perform 1 from public.nodes where id=r.id and type='spec' and is_active and label=r.label and md5(coalesce(description,''))=r.d_md5 for update;
    if not found then raise exception 'S21 spec drift or missing: % (%)', r.label, r.id; end if;
  end loop;
  if exists (select 1 from public.nodes where type='spec' and label like 'בני ההיכל%' and not is_active) then
    raise exception 'S21: bnei_haheichal must stay untouched';
  end if;
  update public.nodes set is_active=false
   where type='spec' and is_active and id in ('2fa07a3e-5537-42c4-86ad-920920202cbd', 'abc9bf76-46f7-4598-a635-25240730b112', '0caadab6-fc1f-4d1d-a401-d613a3b6ef47', 'f8927670-babf-4ffe-87ed-7e833bedc5f0', '1ccaf4df-d985-4fc9-8b5d-4acbfeb5efb7', '64bb4f0d-1fad-4ac7-98cb-2dfbee23d4a0', '40af59bd-010e-47a2-819d-149a597a24e0', '76ef74ea-e227-4760-9e24-d616e5ed71c3', 'f30c0148-e4c0-4937-a4ee-4cd26019587f');
  get diagnostics n = row_count;
  if n <> 9 then raise exception 'S21: expected 9 rows, updated %', n; end if;
  if (select count(*) from public.nodes where type='spec' and is_active) <> 1 then raise exception 'S21: exactly one spec (bnei_haheichal) must remain active'; end if;
end
$sod_blk$;
commit;
