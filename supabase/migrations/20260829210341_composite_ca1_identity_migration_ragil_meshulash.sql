-- COMPOSITE FOUNDATION PATCH — CA-1 identity migration for רגיל+משולש
-- Re-keys legacy composite rows from the operator-blind key md5(word_id||':'||method)
-- to the canonical public.fn_bidim_id(word_id, method, version, 'sum').
-- GATED ON VERIFICATION IN THE SAME STATEMENT: a row is re-keyed ONLY if its stored value
-- is identical to the current governed recomputation (fn_method_value). An unverified row
-- is physically unable to be migrated.
-- NON-DESTRUCTIVE: no row deleted, no value changed. The legacy key stays reconstructible
-- from (word_id, method) at any time, so no evidence is lost.
-- Provenance is NOT upgraded to 'governed' (these were not produced by a governed run);
-- they become 'legacy_verified'. A later governed run upgrades them in place via ON CONFLICT.
update public.bidim b
   set bid_id                      = public.fn_bidim_id(b.word_id, b.method, gm.version, 'sum'),
       operator                    = 'sum',
       method_version              = gm.version,
       dependency_version_snapshot = gm.dependency_versions,
       provenance_state            = 'legacy_verified'
  from public.gematria_methods gm
 where gm.method_key = b.method
   and b.method = 'רגיל+משולש'
   and b.bid_id = md5(b.word_id::text || ':' || b.method)
   and b.value  = public.fn_method_value(b.method, b.phrase);
