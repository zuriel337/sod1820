import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const ai = fs.readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
const wa = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
const sql = fs.readFileSync("supabase/migrations/20261006180000_raziel_wa_native_media_intake_bridge_v1.sql", "utf8");

for (const f of ["supabase/functions/ai-analyze/index.ts", "supabase/functions/wa-raziel/index.ts"]) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--check", f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || `${f} syntax check failed`);
}

// (1) trusted channel identity: service-role bearer only, user tier only, never admin, unlinked = anon
const helper = ai.slice(ai.indexOf("function isInternalServiceRequest"), ai.indexOf("// Multimodal source stage"));
assert.match(helper, /timingSafeEq\(token, SB_SVC\)/);
assert.match(helper, /if \(!tc \|\| typeof tc !== "object" \|\| !isInternalServiceRequest\(req\)\) return null/);
assert.match(helper, /fn_raziel_identity/);
assert.match(helper, /tier: "user"/);
assert.doesNotMatch(helper, /tier: "admin"/);
assert.match(helper, /tier: "anon", uid: null, media: null/);   // unlinked → anon, media dropped
assert.match(ai, /const rTrusted = await resolveTrustedChannel\(req, body\)/);
assert.match(ai, /rTrusted \? \{ identity: rTrusted\.identity, tier: rTrusted\.tier \} : await resolveIdentity\(req, body\)/);
assert.match(ai, /const rBearer = tier === "admin" && !rTrusted/);          // never forward service key as admin/user JWT
assert.match(ai, /const rUserBearer = !rTrusted &&/);
assert.match(ai, /rPersDesc = rTrusted \? null :/);
assert.ok(!/body\??\.trusted_channel[\s\S]{0,200}tier\s*=\s*"admin"/.test(ai));
// ordinary JWT cannot spoof: the only reader of body.trusted_channel is the gated helper
assert.equal(ai.split("\n").filter((l) => !l.trim().startsWith("//") && /body\??\.trusted_channel/.test(l)).length, 1);

// (3) source stage precedes numeric routing; caption never falls into gematria when a source is attached
const iStage = ai.indexOf("rSource = await razielSourceStage");
const iDet = ai.indexOf("fn_raziel_answer`");
assert.ok(iStage > 0 && iDet > iStage, "source stage must run before deterministic numeric routing");
assert.match(ai, /rSubject && SB_URL && SB_SVC && !rTrusted\?\.media/);
assert.match(ai, /private_contribution_media_access/);
assert.match(ai, /object\/sign\/submission-inbox/);
assert.match(ai, /expiresIn: 120/);
assert.match(ai, /אל תחשב גימטריה ואל תציג ערכים לטקסט הזה/);
assert.match(ai, /contract\.source_stage = \{ executed: true[^}]*derivative: true, moderation: "pending"/);

// (2) RPC hardening + semantics
assert.match(sql, /create or replace function public\.wa_raziel_intake_source_v1\(/);
assert.match(sql, /security definer\s+set search_path = ''/);
assert.match(sql, /revoke all on function public\.wa_raziel_intake_source_v1\(text, text, text, text\) from public, anon, authenticated/);
assert.match(sql, /grant execute on function public\.wa_raziel_intake_source_v1\(text, text, text, text\) to service_role/);
assert.doesNotMatch(sql, /grant execute[^;]*(anon|authenticated)\s*;/);
assert.match(sql, /from public\.wa_account_links l/);
assert.match(sql, /sender not linked/);
assert.match(sql, /storage object outside linked owner prefix/);
assert.match(sql, /sod1820\/2029\/contributors\//);
assert.match(sql, /sod1820\/2029\/accounts\//);
assert.match(sql, /o\.bucket_id = 'submission-inbox'/);
assert.match(sql, /'pending'/);
assert.doesNotMatch(sql, /'(approved|published|canonical)'/);   // pending only
assert.match(sql, /whatsapp intake must remain pending/);                                   // standing-approval trigger cannot bypass moderation
assert.match(sql, /'visibility', 'private'/);
assert.doesNotMatch(sql, /create table|create schema|create bucket|insert into storage\.buckets/i);   // no new store
// unqualified object refs would break under search_path = ''
const body = sql.slice(sql.indexOf("begin"), sql.indexOf("$function$;"));
assert.doesNotMatch(body, /\bfrom\s+(?!public\.|storage\.|jsonb_array_elements)[a-z_]+\b/);
assert.doesNotMatch(body, /insert into (?!public\.)/);

// (4) wa-raziel thin adapter: DM goes to the shared core; local semantic orchestration is not used for DM
const dm = wa.slice(wa.indexOf("async function handleAllDMs"), wa.indexOf("async function sendProactiveWelcomes"));
assert.match(dm, /razielCoreRespond\(/);
assert.doesNotMatch(dm, /razielRespond\(|buildFacts\(|allMethods\(|api\.anthropic\.com/);
const core = wa.slice(wa.indexOf("async function razielCoreRespond"), wa.indexOf("async function sendStaticFallback"));
assert.match(core, /\/functions\/v1\/ai-analyze/);
assert.match(core, /persona: "raziel"/);
assert.match(core, /trusted_channel: \{ channel: "whatsapp"/);
assert.doesNotMatch(core, /buildFacts|fn_all_methods|api\.anthropic\.com|RAZIEL_SYSTEM/);
assert.match(core, /Bearer \$\{SB_SVC_ENV\}/);
// transport duties retained
for (const re of [/sendVerified\(/, /enqueueOutbox\(/, /retryOutbox\(/, /logBot\(/, /fn_raziel_identity/]) assert.match(wa, re);
// history preserved (legacy group path not deleted)
assert.match(wa, /async function razielRespond\(/);
// media intake: linked only, private bucket, single bind RPC, no direct table write
assert.match(wa, /storage\.from\("submission-inbox"\)\.upload/);
assert.match(wa, /rpc\("wa_raziel_intake_source_v1"/);
assert.match(wa, /media && linked && idn\?\.user_id/);
assert.doesNotMatch(wa, /from\("research_contributions"\)/);

// (5) site + WA share one Raziel core
assert.match(ai, /if \(String\(body\?\.persona \|\| ""\)\.toLowerCase\(\) === "raziel"\)/);
assert.match(core, /persona: "raziel"/);

console.log("PASS raziel WhatsApp 2029 native cutover contract");
