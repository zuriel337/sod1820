-- State BEFORE the fix, copied from the live database (26.11.2026): the original function body and the broad self_published policy
-- come from test/els-native-save-fixture.sql. Seeds one row of each class found live.
create function public.self_publish_matrix(p_id uuid, p_on boolean default true) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  select owner_user_id into v_owner from public.els_records where id=p_id;
  if v_owner is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_owner <> v_uid then return jsonb_build_object('ok',false,'error','not_owner'); end if;
  update public.els_records set self_published = coalesce(p_on,true) where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'self_published',coalesce(p_on,true));
end $function$;
grant execute on function public.self_publish_matrix(uuid,boolean) to authenticated;
-- A=…01 member, B=…02 member, C=…03 admin
insert into els_records(id,owner_user_id,search_term,scope,skip_distance,direction,start_index,status,visibility,self_published,title,slug) values
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','אליהו','torah',22,'back',10,'draft','private',true,'live leak case','e1'),
 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','משיח','torah',25,'back',10,'draft','private',false,'private ok','e2'),
 ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','פומבי','torah',3,'fwd',10,'published','public',true,'public self','e3'),
 ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','פומבי ב','torah',4,'fwd',10,'published','public',false,'public approved','e4'),
 ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','פרטי א','torah',5,'fwd',10,'draft','private',false,'A private','e5'),
 ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','פרטי חסום','torah',6,'fwd',-1,'draft','private',false,'A mismatch','e6'),
 ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','מוסתר','torah',7,'fwd',10,'hidden','private',false,'A withheld','e7');
-- BEFORE: the leak is real (anon reads the private row whose flag is set).
begin; set local role anon;
select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000001'),'BEFORE: anon reads a private row with self_published=true (documents the leak)');
commit;
