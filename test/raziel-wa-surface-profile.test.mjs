// RAZIEL_WHATSAPP_SURFACE_PROFILE_RUNTIME_V1 — WhatsApp Surface Profile v1 runtime enforcement contract.
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  hasDepthCue, whatsappSurfaceProfileText, evaluateWhatsappActionBoundary, isExplicitConfirmation,
  renderWhatsappReply, ACTION_CONFIRMATION_TEXT,
} from "../supabase/functions/_shared/waRazielRender.ts";
import { runAiAnalyze, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";

const wa = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
const ai = fs.readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
for (const f of ["supabase/functions/ai-analyze/index.ts", "supabase/functions/wa-raziel/index.ts", "supabase/functions/_shared/waRazielRender.ts"]) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--check", f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || `${f} syntax check failed`);
}

// (1) concise-first default; depth only on explicit intent
for (const t of ["תרחיב על זה", "תסביר לי יותר לעומק", "בפירוט בבקשה", "תעמיק"]) assert.ok(hasDepthCue(t), t);
for (const t of ["מה הגימטריה של שלום", "מה זה אומר", "תודה", ""]) assert.ok(!hasDepthCue(t), t);
const concise = whatsappSurfaceProfileText(false), deep = whatsappSurfaceProfileText(true);
assert.match(concise, /תשובה ראשונה קצרה/);
assert.match(concise, /בלי לקצץ/);                 // no truncation of semantic truth
assert.match(concise, /הזמנה אחת להעמיק/);          // single invitation
assert.doesNotMatch(concise, /אפשר תשובה מורחבת/);
assert.match(deep, /ביקש במפורש להעמיק/);
assert.doesNotMatch(deep, /תשובה ראשונה קצרה/);
// Warm accuracy is invisible scaffolding: preserve the conversational/spiritual voice while
// preventing an unsourced definition from collapsing two neighboring concepts into one.
assert.match(concise, /שמור על הקול החם, הרוחני, הסקרן והשיחתי/);
assert.match(concise, /אל תהפוך את התשובה לדוח טכני/);
assert.match(concise, /אל תקבע ששני מושגים קרובים הם אותו דבר/);
assert.match(concise, /כשאין מקור מפורש בחומר שסופק/);
assert.match(concise, /קריאה אפשרית ולא כעובדה מוחלטת/);
assert.match(concise, /בלשון ניטרלית/);
assert.match(concise, /הגהה שקטה/);
assert.doesNotMatch(concise, /עיבור נשמות|גלגול נשמות/); // systemic rule, never a one-phrase patch
assert.match(wa, /const depth = hasDepthCue\(cleanText\)/);
assert.match(wa, /trusted_channel: \{ channel: "whatsapp", sender, depth,/);
assert.match(ai, /const depth = tc\.depth === true/);
assert.match(ai, /\(rTrusted \? whatsappSurfaceProfileText\(rTrusted\.depth\) : ""\)/);   // profile only on trusted WhatsApp turns, never site

// (3) no fabricated URLs/deep links: profile forbids them; renderer never adds one
assert.match(concise, /אל תמציא קישורים/);
const rendered = renderWhatsappReply({ raziel: { answer: "תשובה קצרה", continue_wa: true } });
assert.equal(rendered, "תשובה קצרה");
assert.doesNotMatch(rendered, /https?:\/\/|sod1820/);

// (6) invisible actions explained humanly, never internals
assert.match(concise, /בגובה אנושי/);
assert.match(concise, /אל תזכיר מנגנונים פנימיים, שמות פונקציות, מזהים או עקבות/);

// (2) fail-closed action boundary
assert.equal(evaluateWhatsappActionBoundary(null), "deny");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm", mutates_personal_state: true }), "require_confirmation");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm" }), "require_confirmation");                                  // unknown ⇒ closed
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm", mutates_personal_state: true, owner_deterministic_safe: false }), "require_confirmation");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm", mutates_personal_state: true, owner_deterministic_safe: true }), "allow");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm", mutates_personal_state: true, explicit_confirmation: true }), "allow");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_dm", mutates_personal_state: false }), "allow");
assert.equal(evaluateWhatsappActionBoundary({ surface: "whatsapp_group", mutates_personal_state: true, explicit_confirmation: true }), "deny");
for (const t of ["כן", "אשר", "בצע.", "yes"]) assert.ok(isExplicitConfirmation(t), t);
for (const t of ["אולי", "כן אבל קודם תגיד לי", "לא", "", "מה דעתך, כן?"]) assert.ok(!isExplicitConfirmation(t), t);
assert.match(ACTION_CONFIRMATION_TEXT, /אישור מפורש/);
assert.match(concise, /דורשת אישור מפורש/);
assert.doesNotMatch(wa + ai, /person_life/);                       // no person_life write implemented here

// (4) DM/group separation, groups untouched
assert.match(wa, /const GROUPS_ENABLED = false;/);
const group = wa.slice(wa.indexOf("async function handleGroup"), wa.indexOf("async function handleAllDMs"));
assert.doesNotMatch(group, /razielCoreRespond|trusted_channel|whatsappSurfaceProfileText|fn_raziel_context|razielContext/);   // no personal memory/state into group semantics

// (5) proactive: no new loop, cron untouched
assert.equal((wa.match(/async function sendProactive/g) || []).length, 1);   // pre-existing welcome only
assert.doesNotMatch(wa, /cron\.schedule|\*\/1 \*/);

// The real shared ai-analyze handler receives the warm-accuracy profile on a verified
// WhatsApp DM. The adapter does not create another model path or a phrase-specific patch.
const ibbur = await runAiAnalyze({
  answer: { enabled: false },
  allowed: true,
  bearer: SERVICE_KEY,
  body: {
    subject: "עיבור נשמות",
    trusted_channel: { channel: "whatsapp", sender: "972555000111", depth: false },
  },
});
assert.equal(ibbur.status, 200);
assert.equal(ibbur.models.length, 1);
assert.equal(ibbur.calls.filter((call) => call.name === "fn_raziel_identity").length, 1);
assert.equal(ibbur.calls.filter((call) => call.name === "research-run").length, 0);
const ibburPrompt = ibbur.models[0].user;
assert.match(ibburPrompt, /הנושא הנוכחי: עיבור נשמות/);
assert.match(ibburPrompt, /שמור על הקול החם, הרוחני, הסקרן והשיחתי/);
assert.match(ibburPrompt, /אל תקבע ששני מושגים קרובים הם אותו דבר/);
assert.match(ibburPrompt, /בלשון ניטרלית/);
assert.match(ibburPrompt, /הגהה שקטה/);
assert.doesNotMatch(wa, /עיבור נשמות|גלגול נשמות/);

console.log("PASS raziel WhatsApp surface profile runtime contract");
