#!/usr/bin/env node
// SOD1820 shared executor preflight v1: offline-only decision gate.
// Does not invoke Codex, read secrets, access networks or modify production.
// Reads one JSON descriptor from stdin; outputs JSON decision to stdout.
import { readFileSync } from 'node:fs';
const fail=(reason)=>{console.log(JSON.stringify({status:'BLOCKED',reason,executionStarted:false}));process.exitCode=2;};
let t;try { const raw=readFileSync(0,'utf8');if(raw.length>32768)throw Error('oversized');t=JSON.parse(raw);}catch{fail('INVALID_INPUT');process.exit();}
const allowedActors=new Set(['GPT','CLAUDE']);
const allowedModes=new Set(['dry_run','api_codex']);
const allowedEfforts=new Set(['low','medium','high','xhigh']);
const effortByRisk={low:'medium',normal:'high',critical:'xhigh'};
const normalized=(v)=>typeof v==='string'?v.trim():'';
if (!allowedActors.has(t.requested_by)) fail('UNKNOWN_ACTOR');
else if(!allowedModes.has(t.mode))fail('UNSUPPORTED_MODE');
else if(!normalized(t.task_key)|| !/^[A-Z0-9_]{6,100}$/.test(t.task_key))fail('INVALID_TASK_KEY');
else if(!normalized(t.scope)||t.scope.length>300)fail('INVALID_SCOPE');
else if(!['low','normal','critical'].includes(t.risk))fail('INVALID_RISK');
else if(t.coordination_verified!==true)fail('COORDINATION_UNVERIFIED');
else if(t.existing_active_writer===true)fail('ACTIVE_WRITER_CONFLICT');
else if(t.scope_owner_verified!==true)fail('OWNER_UNVERIFIED');
else if(!Number.isFinite(t.planned_usd)||t.planned_usd<0||t.planned_usd>100)fail('INVALID_BUDGET');
else if(t.mode==='api_codex' && t.user_approved_paid_run!==true)fail('PAID_RUN_NEEDS_EXPLICIT_APPROVAL');
else if(t.mode==='api_codex' && t.high_cost_run===true && t.user_approved_expensive_task!==true)fail('HIGH_COST_NEEDS_EXPLICIT_APPROVAL');
else if(t.mode==='api_codex' && t.actual_provider_balance_verified!==true)fail('PROVIDER_BALANCE_UNKNOWN');
else if(t.mode==='api_codex' && t.remaining_monthly_approved_usd<t.planned_usd)fail('INSUFFICIENT_APPROVED_BUDGET');
else if(t.mode==='api_codex' && t.provider_hard_cap_verified!==true)fail('NO_PROVIDER_HARD_CAP');
else {console.log(JSON.stringify({status:'PRECHECK_PASSED_NO_EXECUTION',executionStarted:false,task_key:t.task_key,requested_by:t.requested_by,mode:t.mode,effort:effortByRisk[t.risk],budgetUsd:t.planned_usd,note:'No external side effects; still requires an authenticated external executor and recheck at launch.'}));}
