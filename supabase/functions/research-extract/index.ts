// 🕎 research-extract — ה-Research Extractor של SOD1820.
// ממיר טקסט מכל מקור (וואטסאפ/אתר/OCR/קול/מסמך/פורום) לשפת-המחקר האחידה: 5 סוגי-אובייקטים בלבד
// (fact · relation · observation · hypothesis · question). מטטרון קורא רק את השפה הזו — לא אכפת לו מהמקור.
// עובדות/קשרים מאומתים במנוע הרשמי (fn_all_methods). הכל נכנס כ-candidate → אישור צוריאל → קנוני בגרף.
// G0: cron/internal invocation uses existing FB_ADMIN_KEY header; no static/query credential in source.
//
// ── MF-1 MINIMUM CLOSURE (2026-08-29, Human-Gate approved; work_log 372d7a5c / BEFORE 091b7274) ──
// This file is VENDORED from the deployed function (version 2) so the MF-1 change is reviewable in
// git. NOT DEPLOYED in this pass — the deployed function is unchanged until an explicit deploy
// authorization. Exactly two changes were made; extraction semantics are untouched:
//
//   (1) "" vs NULL source_ref mismatch — the dedup pre-check used
//       .eq("source_ref", source_ref || "") while the INSERT wrote NULL, so a null-ref extraction
//       could NEVER match its own previous rows and duplicated without bound. The pre-check now
//       uses .is("source_ref", null) for the null case and .eq(...) otherwise.
//
//   (2) Idempotent write — the insert now tolerates a unique violation (SQLSTATE 23505) from
//       research_objects_identity_uidx and treats it as "already ingested" instead of an error.
//       NOTE: PostgREST's .upsert({ onConflict }) takes COLUMN names and cannot infer an
//       EXPRESSION-based PARTIAL unique index, so 23505-tolerance is the correct equivalent of
//       ignoreDuplicates here. The DB index remains the authority; this only keeps the hourly
//       cron quiet instead of noisy.
//
// The app-level (source_ref, kind, statement) pre-check is intentionally KEPT as a cheap fast path.
// It is no longer the guarantee — research_objects_identity_uidx is, and it also covers the case
// this pre-check provably missed (LLM re-wording + kind flip on re-extraction).
//
// ── 2029 HUMAN PRESENTATION (branch-only, 2026-09-17) ─────────────────────────────
// The SAME extraction call now also returns a short human title + summary in Hebrew. They are saved
// under the existing flexible meta.ext.presentation primitive. statement/source/source_ref remain
// unchanged authorities for research/provenance; presentation never becomes a source witness,
// governance state, verification state or publication decision. No second AI call is introduced.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const ANTHROPIC = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODEL = (Deno.env.get("EXTRACT_MODEL") || Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const SYSTEM =
`אתה ה-Research Extractor של SOD1820 — ממיר טקסט ממקור כלשהו לשפת-המחקר האחידה.
קודם החלט מה שווה לחלץ: אם אין תוכן-מחקר (ברכה/סמול-טוק/תודה/בקשה טכנית) — החזר [] ריק.
חלץ אך ורק 5 סוגי-אובייקטים:
- fact: עובדה בדידה שאפשר לאמת. terms=[הביטויים], value=המספר אם נטען. דוגמה: {"kind":"fact","statement":"שם «ציון סיבוני» = 958","terms":["ציון סיבוני"],"value":958}
- relation: קשר בין שני דברים. relates=[צד-א,צד-ב]. דוגמה: {"kind":"relation","statement":"שם ↔ מיקוד (אותו ערך)","relates":["שם","מיקוד"],"value":958}
- observation: תצפית לא-טריוויאלית. דוגמה: {"kind":"observation","statement":"אותו ערך 958 מופיע גם בשם וגם במיקוד","value":958}
- hypothesis: השערת-מחקר (פרשנות / «ייתכן»). דוגמה: {"kind":"hypothesis","statement":"ייתכן שכששם ומיקוד חולקים ערך יש בכך משמעות למחקר"}
- question: שאלה פתוחה שראוי לחקור. דוגמה: {"kind":"question","statement":"האם הדפוס הזה חוזר אצל חוקרים נוספים?"}
חוקי ברזל:
1. אל תמציא ערכי-גימטריה. אם נטען ערך — שים אותו ב-value; השרת יאמת במנוע. לא בטוח → value=null.
2. הפרד עובדה מפרשנות: טענה מאומתת=fact; «אולי/ייתכן/מרמז»=hypothesis. אף פעם לא fact לפרשנות.
3. בלי נבואות, בלי טענות על אנשים חיים. statement/title/summary בעברית בלבד.
4. לכל אובייקט הוסף title קצר ואנושי + summary של משפט או שניים. אלה שכבת הצגה בלבד: שמור אי-ודאות, אל תשדרג candidate/finding לפרט מאומת, ואל תציג technical keys, UUID, source_ref, adapter/runtime או שמות שדות כ-copy אנושי.
5. מקור לא-עברי נשאר מקור לא-עברי. title/summary בעברית מסבירים אותו; אל תציג תרגום כאילו הוא ציטוט מקור ואל תעביר ערך גימטרי לביטוי מתורגם.
6. כל אובייקט: {"kind","statement","title","summary","terms":[],"value":null,"relates":[],"confidence":0-100,"evidence":"קטע קצר מהמקור"}.
פלט: אך ורק JSON array תקין. בלי טקסט לפני/אחרי, בלי Markdown, בלי גדרות-קוד.`;

const KINDS = ["fact", "relation", "observation", "hypothesis", "question"];
const hasHeb = (s: string) => /[א-ת]/.test(s || "");
function json(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } }); }

function normalizeLang(value: unknown): string | null {
  const s = String(value || "").trim().toLowerCase().replace(/_/g, "-");
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(s) ? s : null;
}

function sourceWitnessLanguage(content: string, explicit: unknown): { lang: string | null; basis: string } {
  const declared = normalizeLang(explicit);
  if (declared) return { lang: declared, basis: "declared_by_intake" };
  const hasHebrew = /[א-ת]/.test(content || "");
  const hasLatin = /[A-Za-z]/.test(content || "");
  // Safe narrow inference only. Latin script alone is NOT automatically English.
  if (hasHebrew && !hasLatin) return { lang: "he", basis: "inferred_hebrew_only" };
  return { lang: null, basis: "unknown" };
}

type OperationalTraceHandle = {
  traceId: string;
  rootSpanId: string;
  startedAt: string;
};

async function payloadHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value || "");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function beginResearchTrace(source: string, content: string): Promise<OperationalTraceHandle | null> {
  try {
    const traceId = crypto.randomUUID();
    const rootSpanId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const sourceKey = String(source || "manual").trim().toLowerCase().replace(/[^a-z0-9:_./-]+/g, "-").slice(0, 80) || "manual";
    const { data, error } = await sb.rpc("op_trace_begin_v1", {
      p_trace_id: traceId,
      p_root_span_id: rootSpanId,
      p_context: {
        capability: "research-extract",
        surface: "edge:research-extract",
        channel: "internal",
        locale: "he",
        identity_class: "service",
        subject_ref: "research-source:" + sourceKey,
        owner_ref: "research_intake_foundation_contract",
        root_name: "research-extract",
        payload_hash: await payloadHash(content),
      },
      p_started_at: startedAt,
    });
    if (error || !data) return null;
    return {
      traceId: String((data as any)?.trace_id || traceId),
      rootSpanId: String((data as any)?.root_span_id || rootSpanId),
      startedAt,
    };
  } catch {
    return null;
  }
}

async function recordResearchSpan(
  trace: OperationalTraceHandle | null,
  opts: {
    spanId: string;
    parentSpanId?: string | null;
    kind: string;
    name: string;
    startedAt: string;
    endedAt: string;
    outcome: string;
    detail?: Record<string, unknown>;
  },
) {
  if (!trace) return;
  try {
    await sb.rpc("op_trace_record_span_v1", {
      p_trace_id: trace.traceId,
      p_span_id: opts.spanId,
      p_parent_span_id: opts.parentSpanId || trace.rootSpanId,
      p_kind: opts.kind,
      p_name: opts.name,
      p_started_at: opts.startedAt,
      p_ended_at: opts.endedAt,
      p_outcome: opts.outcome,
      p_detail: opts.detail || {},
    });
  } catch { /* trace must not break extraction */ }
}

async function finishResearchTrace(trace: OperationalTraceHandle | null, outcome: string, stopReason: string | null = null) {
  if (!trace) return;
  try {
    await sb.rpc("op_trace_finish_v1", {
      p_trace_id: trace.traceId,
      p_root_span_id: trace.rootSpanId,
      p_outcome: outcome,
      p_ended_at: new Date().toISOString(),
      p_stop_reason: stopReason,
    });
  } catch { /* trace must not break extraction */ }
}

async function logResearchTokens(
  usage: { input_tokens?: number; output_tokens?: number } | undefined,
  trace: OperationalTraceHandle | null,
  spanId: string,
): Promise<number | null> {
  try {
    if (!usage) return null;
    const row = {
      source: "research-extract",
      kind: "extract",
      model: MODEL,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      trace_id: trace?.traceId || null,
      span_id: trace?.traceId ? spanId : null,
    };
    const { data, error } = await sb.from("ai_token_log").insert(row).select("id").maybeSingle();
    if (error) {
      const { data: legacy, error: legacyError } = await sb.from("ai_token_log").insert({
        source: "research-extract",
        kind: "extract",
        model: MODEL,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
      }).select("id").maybeSingle();
      if (legacyError) return null;
      return Number((legacy as any)?.id) || null;
    }
    const id = Number((data as any)?.id) || null;
    if (id && trace) {
      await sb.rpc("op_trace_link_ai_cost_v1", {
        p_trace_id: trace.traceId,
        p_span_id: spanId,
        p_ai_token_log_id: id,
      }).catch(() => null);
    }
    return id;
  } catch {
    return null;
  }
}

async function allMethods(
  w: string,
  trace: OperationalTraceHandle | null = null,
  parentSpanId: string | null = null,
): Promise<Record<string, number> | null> {
  const spanId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  try {
    const { data, error } = await sb.rpc("fn_all_methods", { p_word: w });
    const endedAt = new Date().toISOString();
    await recordResearchSpan(trace, {
      spanId,
      parentSpanId,
      kind: "db_rpc",
      name: "research-extract:fn_all_methods",
      startedAt,
      endedAt,
      outcome: error ? "engine_error" : "success",
      detail: {
        capability: "gematria:all-methods",
        owner_ref: "gematria_engine_law v2",
        tool_version: "fn_all_methods",
        output_use: error ? "not_applicable" : "used",
        resources: { api_calls: 1, latency_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) },
        cost: { certainty: "not_billable" },
        replay: { inputRef: "sha256:" + await payloadHash(w), ownerRuleRefs: ["gematria_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    if (error) return null;
    return (data && (data as any)["רגיל"]) ? (data as any) : null;
  } catch {
    const endedAt = new Date().toISOString();
    await recordResearchSpan(trace, {
      spanId,
      parentSpanId,
      kind: "db_rpc",
      name: "research-extract:fn_all_methods",
      startedAt,
      endedAt,
      outcome: "engine_error",
      detail: {
        capability: "gematria:all-methods",
        owner_ref: "gematria_engine_law v2",
        tool_version: "fn_all_methods",
        output_use: "not_applicable",
        cost: { certainty: "not_billable" },
        replay: { inputRef: "sha256:" + await payloadHash(w), ownerRuleRefs: ["gematria_engine_law v2"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    return null;
  }
}

async function extractText(content: string, source: string, source_ref: string | null, contributor: string | null, source_lang: string | null = null) {
  if (!content || content.trim().length < 8) return { inserted: 0, objects: [] as any[] };
  const trace = await beginResearchTrace(source, content);
  const witnessLanguage = sourceWitnessLanguage(content, source_lang);
  const modelSpanId = crypto.randomUUID();
  const modelStartedAt = new Date().toISOString();

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1900, system: SYSTEM,
        messages: [{ role: "user", content: `מקור: ${source}\nשפת מקור מוצהרת/מזוהה: ${witnessLanguage.lang || "לא ידועה"}\n\nהטקסט:\n"""\n${content.slice(0, 6000)}\n"""\n\nהחזר JSON array בלבד לפי השפה.` }] }),
    });

    const modelEndedAt = new Date().toISOString();
    if (!resp.ok) {
      await recordResearchSpan(trace, {
        spanId: modelSpanId,
        kind: "model_call",
        name: "research-extract:model",
        startedAt: modelStartedAt,
        endedAt: modelEndedAt,
        outcome: "provider_error",
        detail: {
          capability: "research-extract",
          owner_ref: "research_intake_foundation_contract",
          intelligence_level: "deep",
          provider: "anthropic",
          model: MODEL,
          routing_reason: "canonical_research_extractor",
          output_use: "not_applicable",
          stop_reason: `anthropic_${resp.status}`,
          resources: { api_calls: 1, latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)) },
          cost: { certainty: "unknown" },
          replay: { inputRef: "sha256:" + await payloadHash(content), ownerRuleRefs: ["research_intake_foundation_contract"] },
          privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
        },
      });
      await finishResearchTrace(trace, "provider_error", `anthropic_${resp.status}`);
      return { inserted: 0, error: `anthropic_${resp.status}`, trace_id: trace?.traceId || null };
    }

    const d = await resp.json();
    await recordResearchSpan(trace, {
      spanId: modelSpanId,
      kind: "model_call",
      name: "research-extract:model",
      startedAt: modelStartedAt,
      endedAt: modelEndedAt,
      outcome: "success",
      detail: {
        capability: "research-extract",
        owner_ref: "research_intake_foundation_contract",
        intelligence_level: "deep",
        provider: "anthropic",
        model: MODEL,
        routing_reason: "canonical_research_extractor",
        output_use: "used",
        resources: {
          input_tokens: d?.usage?.input_tokens ?? null,
          output_tokens: d?.usage?.output_tokens ?? null,
          api_calls: 1,
          latency_ms: Math.max(0, Date.parse(modelEndedAt) - Date.parse(modelStartedAt)),
        },
        cost: { certainty: "unknown" },
        replay: { inputRef: "sha256:" + await payloadHash(content), ownerRuleRefs: ["research_intake_foundation_contract"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });
    await logResearchTokens(d?.usage, trace, modelSpanId);

    const txt = (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    let arr: any;
    try {
      const i = txt.indexOf("["), j = txt.lastIndexOf("]");
      arr = JSON.parse(txt.slice(i, j + 1));
    } catch {
      await finishResearchTrace(trace, "failed_with_reason", "parse_error");
      return { inserted: 0, error: "parse", raw: txt.slice(0, 200), trace_id: trace?.traceId || null };
    }
    if (!Array.isArray(arr)) {
      await finishResearchTrace(trace, "success", "empty_or_non_array");
      return { inserted: 0, objects: [], trace_id: trace?.traceId || null };
    }

    const ref: string | null = (typeof source_ref === "string" && source_ref.length > 0) ? source_ref : null;
    let inserted = 0, absorbed = 0;
    const out: any[] = [];
    const persistenceStartedAt = new Date().toISOString();

    for (const o of arr.slice(0, 20)) {
      const kind = String(o?.kind || "").toLowerCase();
      if (!KINDS.includes(kind)) continue;
      const statement = String(o?.statement || "").slice(0, 500).trim();
      if (!statement) continue;
      const presentationTitle = String(o?.title || "").slice(0, 180).trim() || null;
      const presentationSummary = String(o?.summary || "").slice(0, 700).trim() || null;
      const hasHumanPresentation = Boolean(presentationTitle || presentationSummary);
      const terms = (Array.isArray(o?.terms) ? o.terms : []).map(String).slice(0, 6);
      const relates = (Array.isArray(o?.relates) ? o.relates : []).map(String).slice(0, 4);
      const value = (o?.value != null && !isNaN(+o.value)) ? Math.trunc(+o.value) : null;

      let engine_verified: boolean | null = null;
      let engine_detail: any = null;
      if ((kind === "fact" || kind === "relation") && value != null) {
        const det: Record<string, any> = {};
        let anyHeb = false, matched = false;
        for (const t of [...terms, ...relates]) {
          if (hasHeb(t)) {
            anyHeb = true;
            const m = await allMethods(t, trace, modelSpanId);
            if (m) {
              det[t] = m;
              if (Object.values(m).some((v) => v === value)) matched = true;
            }
          }
        }
        if (anyHeb) { engine_verified = matched; engine_detail = det; }
      }

      const exQ = sb.from("research_objects").select("id").eq("kind", kind).eq("statement", statement);
      const { data: ex } = await (ref === null ? exQ.is("source_ref", null) : exQ.eq("source_ref", ref)).maybeSingle();
      if (ex) continue;

      const presentationMeta = {
        ext: {
          presentation: {
            v: 1,
            default_locale: "he",
            statement_lang: "he",
            statement_role: "research_statement",
            source_witness_lang: witnessLanguage.lang,
            source_witness_lang_basis: witnessLanguage.basis,
            variants: hasHumanPresentation ? {
              he: { title: presentationTitle, summary: presentationSummary, source_label: null },
            } : {},
            compiled: {
              mode: "research_extract_single_pass",
              generated_by: "research-extract",
              model: MODEL,
              generated_at: new Date().toISOString(),
              source_ref: ref,
              presentation_complete: hasHumanPresentation,
            },
          },
        },
      };

      const { error: insErr } = await sb.from("research_objects").insert({
        kind, statement, terms, value, relates, source, source_ref: ref, contributor,
        confidence: (o?.confidence != null && !isNaN(+o.confidence)) ? Math.trunc(+o.confidence) : null,
        engine_verified, engine_detail, evidence: String(o?.evidence || "").slice(0, 600), status: "candidate",
        meta: presentationMeta,
      });
      if (insErr) {
        if ((insErr as any).code === "23505") { absorbed++; continue; }
        throw insErr;
      }
      inserted++;
      out.push({ kind, statement, title: presentationTitle, value, engine_verified, presentation_complete: hasHumanPresentation });
    }

    const persistenceEndedAt = new Date().toISOString();
    await recordResearchSpan(trace, {
      spanId: crypto.randomUUID(),
      parentSpanId: modelSpanId,
      kind: "db_rpc",
      name: "research-extract:persist-candidates",
      startedAt: persistenceStartedAt,
      endedAt: persistenceEndedAt,
      outcome: "success",
      detail: {
        capability: "research-intake:persist-candidates",
        owner_ref: "research_intake_foundation_contract",
        tool_version: "research_objects",
        output_use: "used",
        resources: {
          inserted,
          absorbed,
          candidate_count: Math.min(arr.length, 20),
          latency_ms: Math.max(0, Date.parse(persistenceEndedAt) - Date.parse(persistenceStartedAt)),
        },
        cost: { certainty: "not_billable" },
        replay: { inputRef: "sha256:" + await payloadHash(content), ownerRuleRefs: ["research_intake_foundation_contract"] },
        privacy: { redactionApplied: true, rawPrivatePayloadLogged: false },
      },
    });

    await finishResearchTrace(trace, "success");
    return { inserted, absorbed, objects: out, trace_id: trace?.traceId || null };
  } catch (e) {
    await finishResearchTrace(trace, "failed_with_reason", "unhandled_exception");
    throw e;
  }
}

async function buildConversation(chatId: string): Promise<{ text: string; name: string }> {
  const phone = chatId.replace("@c.us", "");
  const { data: inc } = await sb.from("wa_bot_log").select("created_at,text_in,sender_name").eq("sender", phone).eq("action", "raziel_dm").not("text_in", "is", null).order("created_at").limit(40);
  const { data: out } = await sb.from("bot_transcripts").select("created_at,message").eq("chat_id", chatId).order("created_at").limit(40);
  const rows = [
    ...(inc || []).map((r: any) => ({ t: r.created_at, who: r.sender_name || "משתמש", m: r.text_in })),
    ...(out || []).map((r: any) => ({ t: r.created_at, who: "רזיאל", m: r.message })),
  ].sort((a, b) => +new Date(a.t) - +new Date(b.t));
  const name = (inc || []).map((r: any) => r.sender_name).find(Boolean) || phone;
  return { text: rows.map((r) => `${r.who}: ${(r.m || "").replace(/\s+/g, " ").slice(0, 300)}`).join("\n"), name };
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return new Response("forbidden", { status: 403 });
  const u = new URL(req.url);
  if (!ANTHROPIC) return json({ error: "not_configured" });
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode || u.searchParams.get("mode") || "extract";
  try {
    if (mode === "scan") {
      const hours = Math.min(Number(body?.hours || u.searchParams.get("hours") || 24), 168);
      const maxChats = Math.min(Number(body?.max || 8), 20);
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: chats } = await sb.from("bot_transcripts").select("chat_id,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(300);
      const seen = new Set<string>(); const list: string[] = [];
      for (const c of (chats || [])) { const cid = (c as any).chat_id; if (cid && cid.endsWith("@c.us") && !seen.has(cid)) { seen.add(cid); list.push(cid); } }
      let total = 0, totalAbsorbed = 0; const per: any[] = [];
      for (const chatId of list.slice(0, maxChats)) {
        const { text, name } = await buildConversation(chatId);
        if (text.length < 20) continue;
        const r = await extractText(text, "wa-raziel", chatId, name, null);
        total += r.inserted || 0; totalAbsorbed += (r as any).absorbed || 0;
        per.push({ chatId, name, inserted: r.inserted || 0, absorbed: (r as any).absorbed || 0 });
      }
      return json({ mode: "scan", total, absorbed: totalAbsorbed, chats: per });
    }
    const { source = "manual", source_ref = null, source_lang = null, contributor = null, content = "" } = body;
    const r = await extractText(content, source, source_ref, contributor, source_lang);
    return json({ mode: "extract", ...r });
  } catch (e) { return json({ error: String(e).slice(0, 200) }); }
});
