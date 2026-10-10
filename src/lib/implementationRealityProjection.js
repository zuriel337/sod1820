/**
 * Existing /2029/control implementation reality projection (READ_ONLY).
 * Source is the *admin-authorized* canonical work_log_current RPC.
 * Neither coordination notes nor absent values prove code/runtime truth.
 * No tables, registries, graph or agent orchestration are created.
 */
const UNKNOWN='UNKNOWN';
const text=v=>typeof v==='string'&&v.trim()?v.trim():UNKNOWN;
const src='WORK_LOG_CURRENT_COORDINATION_ONLY';

export function projectImplementationRealityAssignments(rawRows,limit=12){
 if(!Array.isArray(rawRows))return [];
 const seen=new Set(),result=[];
 for(const row of rawRows){
  if(!row||typeof row!=='object')continue;
  const task=text(row.task_key);
  if(task===UNKNOWN||seen.has(task))continue;
  seen.add(task);
  result.push({
   task_key:task,
   canonical_owner_reported:text(row.primary_owner), // report, not live owner verification
   implementation_scope_reported:text(row.assignment_scope), // NOT verified file implementation
   implementations:UNKNOWN, consumers:UNKNOWN, dependencies:UNKNOWN, legacy_duplicates:UNKNOWN,
   writer_handoff:{from_actor:text(row.from_actor),to_actor:text(row.to_actor),
     state:text(row.dispatch_state),kind:text(row.dispatch_kind)},
   branch_release_live:{branch:UNKNOWN,release:text(row.release_authorization_state),live:UNKNOWN},
   health:UNKNOWN,cost:UNKNOWN,drift:UNKNOWN,
   observed_at:text(row.created_at),
   source:src,
   coverage:'PARTIAL_UNVERIFIED_COORDINATION',
   may_authorize_write:false,may_authorize_delete:false
  });
  if(result.length>=Math.min(Math.max(1,limit),20))break;
 }
 return result;
}
