-- ROLLBACK for 04-contract-v14.sql: retire v14 and re-activate v13 (history kept). NOT APPLIED. Same rule-guard caveat as the apply file.
\set ON_ERROR_STOP on
begin;
  update public.nodes set is_active=false where type='rule' and rule_id='traffic_intelligence_law' and rule_version=14 and is_active;
  update public.nodes set is_active=true where type='rule' and rule_id='traffic_intelligence_law' and rule_version=13;
commit;
