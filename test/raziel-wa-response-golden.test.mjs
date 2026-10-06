// RAZIEL_WA_RESPONSE_SPEED_GOLDEN_V1 — WhatsApp renderer / context isolation / ack / retry-cost contract.
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { renderWhatsappReply, hasContinuityCue, SOURCE_ACK_TEXT } from "../supabase/functions/_shared/waRazielRender.ts";

const wa = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
const ai = fs.readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
for (const f of ["supabase/functions/ai-analyze/index.ts", "supabase/functions/wa-raziel/index.ts", "supabase/functions/_shared/waRazielRender.ts"]) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--check", f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || `${f} syntax check failed`);
}

// (1) no raw JSON / fences / envelopes ever reach WhatsApp
const RAW = /```|^\s*[\[{]|"(answer|facts|suggested_paths|follow_up_question)"\s*:/;
const cases = [
  [{ raziel: { answer: "שלום", follow_up_question: "רוצה להמשיך?" } }, "שלום\n\nרוצה להמשיך?"],
  [{ analysis: "```json\n{\"v\":1,\"answer\":\"תשובה נקייה\",\"facts\":[]}\n```" }, "תשובה נקייה"],
  [{ raziel: { answer: "{\"answer\":\"שכבה פנימית\",\"follow_up_question\":null}" } }, "שכבה פנימית"],
  [{ raziel: { answer: "```json\n{\"raziel\":{\"answer\":\"עמוק\"}}\n```" } }, "עמוק"],
  [{ analysis: "{\"v\":1,\"answer\":\"חתוך באמצע\",\"facts\":[{\"a\"" }, "חתוך באמצע"],
  [{ analysis: "הנה התשובה: {\"answer\":\"בתוך טקסט\"}" }, "בתוך טקסט"],
  [{ analysis: "טקסט רגיל בלי מעטפת" }, "טקסט רגיל בלי מעטפת"],
  [{ error: "quota", message: "הגעת למכסה היומית" }, "הגעת למכסה היומית"],
];
for (const [d, want] of cases) { const out = renderWhatsappReply(d); assert.equal(out, want); assert.doesNotMatch(out, RAW); }
for (const bad of [{ analysis: "{\"v\":1,\"facts\":[],\"suggested_paths\":[]}" }, { analysis: "```json\n{broken" }, { raziel: {} }, null, {}, { analysis: "" }]) {
  assert.equal(renderWhatsappReply(bad), "", "unnormalizable envelope must fail closed (empty), never raw payload");
}

// (2) continuity cue gating
for (const t of ["כמו קודם", "תמשיך מהמקום שעצרנו", "תחבר למה שדיברנו", "בהמשך לשיחה הקודמת"]) assert.ok(hasContinuityCue(t), t);
for (const t of ["מה כתוב בתמונה?", "תקרא לי את זה", "מה הסמל הזה", ""]) assert.ok(!hasContinuityCue(t), t);

const core = wa.slice(wa.indexOf("async function razielCoreRespond"), wa.indexOf("async function sendSourceAck"));
assert.match(core, /const continuity = hasContinuityCue\(cleanText\)/);
assert.match(core, /hasSource && !continuity \? "" : await recentDialogue/);       // attached source: no prior-topic dialogue by default
assert.match(core, /\.\.\.\(hasSource \? \{ media: opts\.source, continuity \} : \{\}\)/);
assert.match(ai, /rTrusted\?\.media && !rTrusted\.continuity \? "" : razielContextText\(ctx\)/);   // no personal memory/name on source turns
assert.match(ai, /const continuity = tc\.continuity === true/);
assert.match(ai, /אל תקרא לו בשם ואל תסיק שם/);                                     // no guessed name
assert.match(ai, /\[קריא\][\s\S]{0,200}\[לא בטוח\][\s\S]{0,60}\[לא קריא\]/);          // readable / uncertain / unreadable layers in source stage
assert.match(ai, /פרשנות שלך/);                                                      // interpretation separated from reading
assert.doesNotMatch(ai.slice(ai.indexOf("const RAZIEL_SOURCE_SYSTEM"), ai.indexOf("function b64")), /גימטריה (?!ו)[^"]*חשב/);
// returning-user welcome (names last research thread) is not prepended to source turns
assert.match(wa, /welcome: source \? "" : welcome/);
assert.match(core, /else if \(opts\.welcome\) reply = opts\.welcome \+ reply/);

// (3) ack: deterministic, no model, exactly once per msg_id, before the core call, transport-only log
assert.equal(SOURCE_ACK_TEXT, "קיבלתי את התמונה. אני קורא ומנתח אותה עכשיו — אחזור אליך עם תשובה.");
const ack = wa.slice(wa.indexOf("async function sendSourceAck"), wa.indexOf("async function sendStaticFallback"));
assert.match(ack, /alreadyDone\(msgId, "raziel_dm_ack"\)/);
assert.match(ack, /fn_raziel_claim", \{ p_key: "raziel:ack:" \+ msgId \}/);
assert.match(ack, /action: "raziel_dm_ack"/);
assert.doesNotMatch(ack, /fetch\(|anthropic|ai-analyze|razielCoreRespond|logTokens/);          // zero AI/token usage
const dm = wa.slice(wa.indexOf("async function handleAllDMs"), wa.indexOf("async function sendProactiveWelcomes"));
const iAck = dm.indexOf("await sendSourceAck(");
const iCore = dm.indexOf("await razielCoreRespond(");
assert.ok(iAck > 0 && iCore > iAck, "ack must come after ingest/bind and before the core call");
assert.ok(iAck > dm.indexOf("ingestInboundSource("), "ack only after successful ingest");
assert.equal((dm.match(/sendSourceAck\(/g) || []).length, 1);
assert.match(dm, /if \(source\) await sendSourceAck/);

// (4) retry/cost: malformed-but-successful envelope never causes another paid attempt
const iRender = core.indexOf("renderWhatsappReply(data)");
const emptyBlock = core.slice(core.indexOf("if (!reply) {"), core.indexOf("if (hasSource) reply += SOURCE_NOTICE"));
assert.ok(iRender > 0);
assert.doesNotMatch(emptyBlock, /retryable_error/);
assert.match(emptyBlock, /sendStaticFallback/);
assert.match(emptyBlock, /refused_with_fallback/);
assert.match(core, /data\?\.degraded && !opts\.lastAttempt && opts\.allowDegradedRetry/);   // degraded (provider-failed) retry bounded
assert.match(dm, /allowDegradedRetry: priorRetries < 1/);
assert.match(core, /else if \(!opts\.lastAttempt\) return \{ status: "retryable_error" \}/);   // transient HTTP/network retry kept, bounded by MAX_AI_RETRIES
assert.match(wa, /const MAX_AI_RETRIES = 3/);
assert.doesNotMatch(wa, /\*\/1 \*|cron\.schedule/);                                          // cron untouched
assert.doesNotMatch(core, /String\(data\.raziel\.answer\)/);                                 // no raw answer passthrough

console.log("PASS raziel WhatsApp response/speed golden contract");
