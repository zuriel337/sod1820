// CL-13 WhatsApp unit - runs the REAL Edge handlers of wa-raziel and ai-analyze with the memory calls answered by a throwaway
// PostgreSQL (test/helpers/cl13-pg-bridge.mjs) and every provider mocked. Types are erased and only the imports are replaced;
// the shared policy module is the production module. Unknown I/O fails the run.
// Every function takes the SOURCE to run, so that the same scenario can run on each deploy candidate of
// docs/reviews/cl13-whatsapp-unit-20261113/unit.json (the tree, candidate A of wa-raziel, the A bundle of ai-analyze) and on
// the DEPLOYED code (the rollback manifest).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runAiAnalyze } from "./ai-analyze-handler.mjs";
import { runWaRaziel } from "./wa-raziel-handler.mjs";

export const UA = "11111111-1111-4111-8111-111111111111";          // an account holder with a stored thread and a verified phone
export const UB = "22222222-2222-4222-8222-222222222222";          // another account holder
export const PHONE_A = "972500000001";                              // the phone the wa-raziel harness sends from
export const GROUP = "120363000000000001@g.us";
export const treeSource = (name) => readFileSync(new URL(`../../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");

// ── ai-analyze: the memory calls of the real handler go to the throwaway database. `source` + `bundled` select the code. ──
export async function aiAnalyzeOnPg(pg, { source = treeSource("ai-analyze"), bundled = false, ...options } = {}) {
  return runAiAnalyze({ allowed: true, extraRoute: async ({ url, init }) => pg.rest(url, init), source, bundled, ...options });
}

// ── wa-raziel: the memory functions of the real handler go to the throwaway database ──
export async function waRazielOnPg(pg, { text, linked = true, id = `m-${Date.now()}-${Math.random()}`, source = treeSource("wa-raziel"), refuseFacts = false, ...rest } = {}) {
  const real = (name) => async (args) => { const r = pg.rpc(name, args); return { data: r.data, error: r.error }; };
  return runWaRaziel({
    incoming: { id, text },
    identity: linked ? { linked: true, user_ref: UA, user_id: UA } : { linked: false },
    // a sender without an account is answered only after the go-live time of the DM policy
    dmPolicy: { go_live_at: new Date(Date.now() - 86400_000).toISOString() },
    rpcOverrides: {
      fn_personal_memory_policy_v1: real("fn_personal_memory_policy_v1"), fn_raziel_context: real("fn_raziel_context"),
      fn_raziel_remember: real("fn_raziel_remember"),
      // refuseFacts: the writer of profile details answers with no row (a refusal / a failure) although the policy granted them
      fn_raziel_fact: refuseFacts ? async () => ({ data: null, error: null }) : real("fn_raziel_fact"),
    },
    source,
    ...rest,
  });
}

// ── wa-raziel, the GROUP path. The product keeps it off with a constant (GROUPS_ENABLED = false); here that one constant is
// switched on in the copy of the source the test runs, and the group the source serves (a literal id) is replaced by a synthetic
// one, so that "nothing personal in a group" is tested on the real code path.
export async function waRazielGroupOnPg(pg, { text, senderLinked = true, source = treeSource("wa-raziel") }) {
  assert.equal(source.match(/const GROUPS_ENABLED = false;/g)?.length, 1, "the group path is off in the product");
  const literal = /const AMIT_GROUP = "[0-9]+@g\.us";/;
  assert.equal(source.match(new RegExp(literal.source, "g"))?.length, 1, "exactly one group constant");
  return waRazielOnPg(pg, {
    text: "הודעה פרטית שאינה קשורה", linked: senderLinked, id: `dm-${Math.random()}`,
    source: source.replace("const GROUPS_ENABLED = false;", "const GROUPS_ENABLED = true;").replace(literal, `const AMIT_GROUP = "${GROUP}";`),
    group: { chatId: GROUP, senderId: `${PHONE_A}@c.us`, senderName: "A", text, id: `g-${Math.random()}` },
    envOverrides: { ANTHROPIC_API_KEY: "synthetic-model-key" },
    tableRows: { wa_vip_senders: [{ raziel_access: true }] },
  });
}
