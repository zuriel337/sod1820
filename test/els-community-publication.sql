-- Runs after the historical save suites in their isolated Postgres database.
begin;
insert into els_records(owner_user_id,search_term,scope,skip_distance,direction,start_index,status,visibility,self_published,title)
values ('00000000-0000-0000-0000-000000000001','צופן בדיקה','torah',2,'fwd',0,'hidden','private',false,'historical');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare
  public_id uuid;
  private_id uuid;
begin
  public_id := save_els_matrix('צופן בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_title=>'first public');
  perform test_expect((select status='published' and visibility='public' and source='community'
    from els_records where id=public_id), 'new default submission enters the existing library');
  perform test_expect(save_els_matrix('צופן בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_title=>'first public')=public_id,
    'identical retry returns the same stable id');
  perform test_expect((select count(*)=1 from els_records where title='historical' and status='hidden'), 'no historical promotion');
  perform test_expect(save_els_matrix('צופן בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_title=>'variant')<>public_id,
    'a changed submission preserves the original');
  private_id := save_els_matrix('פרטי לדוגמה',p_skip=>3,p_direction=>'fwd',p_start_index=>0,p_public=>false);
  perform test_expect((select status='draft' and visibility='private' and not self_published
    from els_records where id=private_id), 'explicit private save stays with the owner');
  begin
    perform save_els_matrix('שגוי',p_skip=>2,p_direction=>'fwd',p_start_index=>-1);
    raise exception 'publication unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select save_els_matrix('צופן בדיקה',p_skip=>2,p_direction=>'fwd',p_start_index=>0,p_title=>'first public');
select test_expect((select count(distinct owner_user_id)=2 from els_records where title='first public'), 'separate owners keep their own records');
select test_expect((select count(*)=0 from els_records where search_term='פרטי לדוגמה'), 'another member cannot open the private record');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select test_expect((select count(*)=0 from els_records where search_term='פרטי לדוגמה' or title='historical'),'guest cannot read private or historical records');
select test_expect((select count(*)=3 from els_records where search_term='צופן בדיקה' and status='published' and visibility='public'), 'all new public records are readable as a guest');
rollback;
