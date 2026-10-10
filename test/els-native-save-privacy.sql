set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$declare a uuid;b uuid;begin
 a:=save_els_matrix('בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>false,p_title=>'First',p_note=>'private note',p_positions=>'{}');
 perform test_expect((select status='draft' and visibility='private' and not self_published and owner_user_id=auth.uid() from els_records where id=a),'member private save is valid, owned and not self-published');
 b:=save_els_matrix('בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>false,p_title=>'Updated',p_note=>'updated note',p_positions=>'{"findings":[{"t":"תורה","color":"#FF5D6C"}]}');
 perform test_expect(a=b,'same private occurrence updates instead of duplicating');
 perform test_expect((select title='Updated' and description='updated note' and jsonb_array_length(positions->'findings')=1 from els_records where id=a),'private updates retain title, notes and findings');
 b:=save_els_matrix('בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>4,p_public=>false);
 perform test_expect(a<>b,'different exact occurrences remain different records');
end$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select test_expect((select count(*)=0 from els_records),'other member cannot read private ciphers');
do $$declare a uuid;begin
 a:=save_els_matrix('בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_public=>false);
 perform test_expect((select owner_user_id=auth.uid() from els_records where id=a),'matching another persons axis creates an owned private record');
 perform test_expect((select count(*)=1 from els_records),'other private rows remain inaccessible');
end$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$declare pub uuid;priv uuid;begin
 pub:=save_els_matrix('ציבורי',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>true,p_note=>'public original');
 perform test_expect((select status='published' and visibility='public' and self_published from els_records where id=pub),'existing admin public flow remains published');
 perform test_expect((select count(*)>0 from test_publish_gate_calls),'public save still invokes the publication replay gate');
 priv:=save_els_matrix('ציבורי',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>false,p_note=>'private copy',p_from_topic=>'test-topic');
 perform test_expect(priv<>pub,'admin private save never overwrites an existing public occurrence');
 perform test_expect((select status='draft' and visibility='private' and not self_published from els_records where id=priv),'admin private intent is honored');
 perform test_expect((select description='public original' from els_records where id=pub),'public record stays unchanged');
 perform test_expect((select count(*)=0 from research_contributions),'private save emits no public topic contribution');
 perform test_expect(save_els_matrix('ציבורי',p_skip=>3,p_direction=>'back',p_start_index=>10,p_public=>false)=priv,'repeated admin private save reuses only its private row');
 begin
   perform save_els_matrix('לא מאומת',p_skip=>3,p_direction=>'fwd',p_start_index=>-1,p_public=>true);
   raise exception 'publication gate unexpectedly accepted mismatch';
 exception when check_violation then null;end;
end$$;

select set_config('request.jwt.claim.sub','',false);
set role anon;
select test_expect((select count(*)=1 from els_records),'anonymous library sees only the explicitly public cipher');
do $$begin
 begin perform save_els_matrix('אסור',p_skip=>2,p_public=>false);raise exception 'anonymous save unexpectedly succeeded';
 exception when others then if sqlerrm<>'must be logged in' then raise;end if;end;
end$$;
reset role;
select test_expect((select description='updated note' from els_records where owner_user_id='00000000-0000-0000-0000-000000000001' and start_index=0),'other callers never overwrote the original owners private data');
select 'ELS private save / ownership / publication compatibility: PASS';
