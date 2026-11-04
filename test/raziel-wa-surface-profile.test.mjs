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
// Warm accuracy belongs to the shared Raziel core, not to this surface-only profile.
assert.doesNotMatch(concise, /אל תקבע ששני מושגים קרובים הם אותו דבר|הגהה שקטה/);
assert.match(ai, /const RAZIEL_SHARED_WARM_ACCURACY_LAYER/);
assert.match(ai, /persona \+ RAZIEL_SHARED_WARM_ACCURACY_LAYER/);
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
assert.equal(renderWhatsappReply({
  raziel: { answer: "תשובה קצרה", suggested_paths: [{ id: "deepen", label: "טקסט לא סמכותי" }] },
}), "תשובה קצרה\n\nאם תרצה, אפשר להעמיק בתשובה.");
assert.equal(renderWhatsappReply({
  raziel: { answer: "תשובה קצרה", suggested_paths: [{ id: "invented_link", href: "https://evil.example" }] },
}), "תשובה קצרה", "unknown/model-authored actions never become WhatsApp prose or links");

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

// The real shared ai-analyze handler gives both the site and a verified WhatsApp DM the same
// warm-accuracy system layer. WhatsApp alone receives its concise surface-format instruction.
const runIbbur = (body, bearer) => runAiAnalyze({
  answer: { enabled: false },
  allowed: true,
  bearer,
  body: { subject: "עיבור נשמות", ...body },
  modelResult: {
    text: JSON.stringify({
      v: 1,
      agent: "raziel",
      answer: "תשובה חמה ומדויקת",
      facts: [],
      suggested_paths: [{ id: "invented_link", label: "קישור שהמודל המציא", href: "https://evil.example" }],
    }),
    usage: { input_tokens: 12, output_tokens: 6 }, attempts: 1, degraded: false,
  },
});
const [siteIbbur, waIbbur] = await Promise.all([
  runIbbur({}, "synthetic-anon-key"),
  runIbbur({ trusted_channel: { channel: "whatsapp", sender: "972555000111", depth: false } }, SERVICE_KEY),
]);
for (const run of [siteIbbur, waIbbur]) {
  assert.equal(run.status, 200);
  assert.ok(run.models.length >= 1);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  const synthesis = run.models.findLast((model) => /כללי קול ודיוק משותפים לכל מופעי רזיאל/.test(model.system));
  assert.ok(synthesis, "shared warm-accuracy layer must reach this Raziel surface");
  assert.match(synthesis.system, /שמור על הקול החם, הרוחני, הסקרן והשיחתי/);
  assert.match(synthesis.system, /אל תקבע ששני מושגים קרובים הם אותו דבר/);
  assert.match(synthesis.system, /בלשון ניטרלית/);
  assert.match(synthesis.system, /הגהה שקטה/);
  assert.match(synthesis.system, /השאר תמיד את suggested_paths ריק/);
  assert.match(synthesis.user, /הנושא הנוכחי: עיבור נשמות/);
}
assert.deepEqual(siteIbbur.result.raziel.suggested_paths.map((path) => path.id), ["save_conversation"]);
assert.deepEqual(waIbbur.result.raziel.suggested_paths.map((path) => path.id), ["deepen"]);
assert.doesNotMatch(JSON.stringify([siteIbbur.result.raziel.suggested_paths, waIbbur.result.raziel.suggested_paths]), /invented_link|evil|המודל המציא/);
assert.doesNotMatch(siteIbbur.models.at(-1).user, /פרופיל משטח וואטסאפ/);
assert.match(waIbbur.models.at(-1).user, /פרופיל משטח וואטסאפ/);
assert.equal(waIbbur.calls.filter((call) => call.name === "fn_raziel_identity").length, 1);
assert.doesNotMatch(wa, /עיבור נשמות|גלגול נשמות/);

console.log("PASS raziel WhatsApp surface profile runtime contract");
