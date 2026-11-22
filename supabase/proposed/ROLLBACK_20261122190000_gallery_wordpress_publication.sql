-- Manual rollback. Run with a separately authorized commit and the work-log receipt.
-- psql -X -v ON_ERROR_STOP=1 -v applied_xid=RECEIPT -f ROLLBACK_20261122190000_gallery_wordpress_publication.sql
-- A SQL console can SET sod1820.gallery_release_action = 'rollback' and
-- SET sod1820.gallery_release_xid = '<recorded numeric apply_transaction_id>'
-- in the same session and then run the unchanged proposal. Reset both settings
-- afterwards or close the session. A reused connection must never be left in rollback mode.
-- The original gallery_images table owner privileges are required.
\set ON_ERROR_STOP on
\if :{?applied_xid}
select set_config('sod1820.gallery_release_action', 'rollback', false),
       set_config('sod1820.gallery_release_xid', :'applied_xid', false);
\ir 20261122190000_gallery_wordpress_publication_PROPOSAL.sql
reset sod1820.gallery_release_action;
reset sod1820.gallery_release_xid;
\else
-- Fail before loading the shared action when no receipt was supplied.
do $$ begin raise exception 'Pass -v applied_xid=<recorded apply transaction>'; end $$;
\endif
