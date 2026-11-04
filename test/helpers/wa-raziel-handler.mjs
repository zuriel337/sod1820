import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import {
  renderWhatsappReply, whatsappContinuationLink, hasContinuityCue, hasDepthCue, SOURCE_ACK_TEXT, SOURCE_ACK_TEXT_DOC,
} from "../../supabase/functions/_shared/waRazielRender.ts";
import {
  parseRazielNavigationRequest, resolveRazielNavigationAction, resolveRazielNavigationFollowUp, razielNavigationNeedsFocus,
  razielNavigationWhatsappText, razielNavigationIsClarification, razielWhatsappVerifiedFocus,
} from "../../supabase/functions/_shared/razielNavigationActions.js";

export const WA_SITE = "https://sod1820.co.il";
export const nowSec = () => Math.floor(Date.now() / 1000);

// Executes the REAL wa-raziel Edge handler (types erased, only its imports replaced) in a fresh VM per run.
// Synthetic Supabase client, Green API and ai-analyze; every call is recorded. The shared navigation resolver and the
// WhatsApp renderer are the production modules, not stand-ins.
export async function runWaRaziel({
  incoming,                 // { id, text, ageSec? }
  history = [],             // chat history oldest..newest: { id, outgoing, text, ageSec }
  methods = {},             // fn_all_methods fixtures: { "שאול": { "רגיל": 337 } }
  aiText = "תשובת מודל רגילה",
  source = readFileSync(new URL("../../supabase/functions/wa-raziel/index.ts", import.meta.url), "utf8"),
} = {}) {
  const sent = [], aiCalls = [], rpcCalls = [], otherFetches = [];
  const phone = "972500000001";
  const chatId = `${phone}@c.us`;
  const now = nowSec();
  const incomingMsg = { idMessage: incoming.id, chatId, timestamp: now - (incoming.ageSec ?? 5), typeMessage: "textMessage", textMessage: incoming.text };
  const chatHistory = [
    ...history.map((m, i) => ({
      idMessage: m.id || `h${i}`, type: m.outgoing ? "outgoing" : "incoming", timestamp: now - (m.ageSec ?? (600 - i)),
      textMessage: m.text,
    })),
    { ...incomingMsg, type: "incoming" },
  ];
  const rpcResults = {
    wa_green_config: { id: "1", token: "t", base: "https://green.invalid" },
    fn_raziel_identity: { linked: true, user_ref: "user:1", user_id: "11111111-2222-4333-8444-555555555555" },
    fn_raziel_claim: true,
    fn_all_methods: undefined,
  };
  const chain = (table, rows) => {
    const builder = {
      select: () => builder, eq: () => builder, neq: () => builder, in: () => builder, gte: () => builder, lte: () => builder,
      is: () => builder, order: () => builder, limit: () => builder, insert: () => builder, upsert: () => builder,
      update: () => builder, delete: () => builder,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject),
    };
    return builder;
  };
  const tables = { raziel_dm_policy: [{ answer_everyone: true, free_per_day_anon: 99, after_gate: "unlimited", scope: "smart", teach_mode: true, en_to_gabriel: false, go_live_at: null }] };
  const fakeSb = {
    from: (table) => chain(table, tables[table] || []),
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (name === "fn_all_methods") return { data: methods[args?.p_word] ?? null, error: null };
      return { data: rpcResults[name] ?? null, error: null };
    },
  };
  let idCounter = 0;
  const waGreen = async (_sb, method, payload) => {
    switch (method) {
      case "lastIncomingMessages": return { http_status: 200, result: [incomingMsg] };
      case "getChatHistory": return { http_status: 200, result: chatHistory };
      case "sendMessage": sent.push(payload); idCounter += 1; return { http_status: 200, result: { idMessage: `out-${idCounter}` } };
      default: otherFetches.push(`green:${method}`); return { http_status: 200, result: {} };
    }
  };
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/functions/v1/ai-analyze")) {
      aiCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ analysis: aiText, intelligence_level: "fast" }), { status: 200 });
    }
    otherFetches.push(url.href);
    return new Response("{}", { status: 200 });
  };
  const env = { FB_ADMIN_KEY: "admin-key", SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "svc", ANTHROPIC_API_KEY: "", ZURIEL_WA: "972556651237@c.us" };
  let handler;
  const code = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from\s+"[^"]+";\n/gm, ""));
  runInNewContext(code, {
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    createClient: () => fakeSb, waGreen, fetch, Request, Response, Headers, URL, AbortSignal, TextEncoder, TextDecoder, console,
    crypto: webcrypto, setTimeout, clearTimeout, Promise, Date, Math, JSON, Set, Map, Number, String, Array, Object, RegExp, Error,
    renderWhatsappReply, whatsappContinuationLink, hasContinuityCue, hasDepthCue, SOURCE_ACK_TEXT, SOURCE_ACK_TEXT_DOC,
    parseRazielNavigationRequest, resolveRazielNavigationAction, resolveRazielNavigationFollowUp, razielNavigationNeedsFocus,
    razielNavigationWhatsappText, razielNavigationIsClarification, razielWhatsappVerifiedFocus,
  }, { filename: "wa-raziel/index.ts", timeout: 5000 });
  if (typeof handler !== "function") throw new Error("wa-raziel did not register a handler");
  const response = await handler(new Request("https://fixture.invalid/functions/v1/wa-raziel?debug=1", { headers: { "x-fb-admin-key": "admin-key" } }));
  const body = await response.json();
  return { status: response.status, body, sent, aiCalls, rpcCalls, otherFetches, methodLookups: rpcCalls.filter((c) => c.name === "fn_all_methods").map((c) => c.args.p_word) };
}
