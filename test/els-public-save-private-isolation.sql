-- F3 regressions: run only after the isolated fixture + both save migrations.
-- Roll back these cases so the legacy privacy suite remains independently repeatable.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$declare private_id uuid; submitted uuid; snapshot jsonb; begin
 private_id:=save_els_matrix('פרטי ראשון',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>false,
   p_title=>'private title',p_note=>'private note',p_positions=>'{"secret":"A"}');
 select to_jsonb(r) into snapshot from els_records r where id=private_id;
 submitted:=save_els_matrix('פרטי ראשון',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>true,
   p_title=>'submitted title',p_note=>'submitted note',p_positions=>'{"submitted":true}');
 perform test_expect(submitted<>private_id,'S1: public submission must not reuse caller private draft');
 perform test_expect((select to_jsonb(r)=snapshot from els_records r where id=private_id),'S1: complete private row unchanged');
 perform test_expect((select status='pending' and visibility='private' and self_published and owner_user_id=auth.uid() from els_records where id=submitted),'member submission stays pending with explicit submission provenance');
 perform test_expect(save_els_matrix('פרטי ראשון',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>true)=submitted,'submitted pending row remains reusable');
 perform test_expect(save_els_matrix('פרטי ראשון',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>false)=private_id,'private save still selects its private row, not pending intake');
 perform save_els_matrix('פרטי זר',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>false,p_title=>'member secret',p_positions=>'{"secret":"B"}');
 perform save_els_matrix('פרטי לא מאומת',p_skip=>3,p_direction=>'fwd',p_start_index=>-1,p_public=>false,p_note=>'must survive failed public gate');
end$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$declare private_id uuid; public_id uuid; snapshot jsonb; gates bigint; begin
 select id,to_jsonb(r) into private_id,snapshot from els_records r where search_term='פרטי זר';
 select count(*) into gates from test_publish_gate_calls;
 public_id:=save_els_matrix('פרטי זר',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>true,p_title=>'admin public',p_positions=>'{"public":true}');
 perform test_expect(public_id<>private_id,'S2: admin public lookup must not reuse another owners private draft');
 perform test_expect((select to_jsonb(r)=snapshot from els_records r where id=private_id),'S2: foreign private row unchanged in every field');
 perform test_expect((select owner_user_id=auth.uid() and status='published' and visibility='public' and self_published from els_records where id=public_id),'admin public flow creates its own published record');
 perform test_expect((select count(*)=gates+1 from test_publish_gate_calls),'new public record passes replay gate even when an identical private row exists');
 perform test_expect(save_els_matrix('פרטי זר',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>true,p_title=>'public update')=public_id,'permitted existing public upsert preserved');
 perform test_expect((select count(*)=gates+2 from test_publish_gate_calls),'existing published update still passes replay gate');
 select id,to_jsonb(r) into private_id,snapshot from els_records r where search_term='פרטי לא מאומת';
 begin
   perform save_els_matrix('פרטי לא מאומת',p_skip=>3,p_direction=>'fwd',p_start_index=>-1,p_public=>true);
   raise exception 'public gate unexpectedly bypassed by matching private row';
 exception when check_violation then null;end;
 perform test_expect((select to_jsonb(r)=snapshot from els_records r where id=private_id),'failed public gate leaves private record unchanged');
 private_id:=save_els_matrix('פרטי מנהל',p_skip=>4,p_direction=>'fwd',p_start_index=>0,p_public=>false,p_note=>'admin private');
 public_id:=save_els_matrix('פרטי מנהל',p_skip=>4,p_direction=>'fwd',p_start_index=>0);
 perform test_expect(private_id<>public_id,'default public argument excludes admin own private draft');
 perform test_expect(save_els_matrix('פרטי מנהל',p_skip=>4,p_direction=>'fwd',p_start_index=>0,p_public=>null)=public_id,'NULL public argument retains legacy public semantics');
 perform test_expect((select description='admin private' and status='draft' and not self_published from els_records where id=private_id),'admin own draft remains private');
end$$;

-- Historical NULL submission provenance must not count as an explicit submission.
reset role;
insert into els_records(owner_user_id,search_term,scope,skip_distance,direction,start_index,status,visibility,self_published,title)
 values ('00000000-0000-0000-0000-000000000001','טיוטה ותיקה','torah',2,'fwd',0,'draft','private',null,'legacy secret');
set local role authenticated;
do $$declare private_id uuid; public_id uuid;begin
 select id into private_id from els_records where search_term='טיוטה ותיקה';
 public_id:=save_els_matrix('טיוטה ותיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>null);
 perform test_expect(public_id<>private_id,'NULL public argument must not match foreign NULL self_published draft');
 perform test_expect((select title='legacy secret' and self_published is null and status='draft' from els_records where id=private_id),'legacy NULL-provenance private row untouched');
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select test_expect((select count(*)=0 from els_records where search_term in ('פרטי ראשון','פרטי זר','פרטי מנהל') and not coalesce(self_published,false)),'foreign member cannot read unsubmitted private rows');
do $$declare submitted uuid;begin
 submitted:=save_els_matrix('פרטי זר',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>true);
 perform test_expect((select owner_user_id=auth.uid() and status='pending' from els_records where id=submitted),'member cannot overwrite foreign published/private rows');
end$$;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select test_expect((select count(*)=0 from els_records where search_term in ('פרטי ראשון','פרטי זר','פרטי מנהל') and not coalesce(self_published,false)),'anonymous reads do not expose preserved private rows');
rollback;
select 'F3 S1/S2, ownership, private snapshot, pending/public compatibility, gate and RLS: PASS';
