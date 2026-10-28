#!/usr/bin/env node
// EXP-15 live reading harness. Stages (see README.md):
//   dry-run     build and write the exact request for review; no network, no credential
//   preflight   needs the credential: model listed? limits and capabilities? exact token count?  (no tokens billed)
//   call1       needs the credential: repeats the preflight, then sends the round-1 request, only with --approve <sha256 of the reviewed request> and --max-usd
//   collect     needs the credential: fetches the result of a batch that already ended (--batch-id), sends nothing
//   sql         offline: locate the proposals and write the canonical verification SQL (to be executed read-only by the operator)
//   ingest      offline: merge the SQL results into verified / not verified
//   round2      offline: neighbourhood cards for verified proposals marked to continue; writes the round-2 request for review
//   call2       needs the credential: the round-2 request, same approval rule
//   report      offline: the report (and the evaluation targets, last)
//   EXP-16 (--run <id> from lib/plan.mjs; output in controls/runs/<id>/):
//   plan        offline: every planned request with its hash, size and cost bounds (controls/plan-review.*); budget: ledger status
//   summary     offline: the cross-run comparison (blind, planted and diagnostic series kept apart)
//   call stages additionally refuse (exit 7) when the spend ledger's guard says the worst case would pass the hard guard of the total cap.
// There is no mock path. Without the credential the call stages stop with exit code 2.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { buildCard, buildRound2Message } from "./lib/prompt.mjs";
import { DEFAULTS, countsByKind, loadContext, regionPathOf, round1Request as makeRound1, round1RequestV2 } from "./lib/context.mjs";
import { ROUND2_CARD_CAP, RUNS, runById } from "./lib/plan.mjs";
import { appendEntry, guardSpend, loadLedger, spentOf } from "./lib/ledger.mjs";
import { KEY_ENV, NoCredentialError, costOf, lockSha256, requestSha256, summarizeMessage } from "./lib/request.mjs";
import { callBatch, callRound, fetchBatchResults, makeClient, preflight, transportOf } from "./lib/client.mjs";
import { classify, locateFinding, parseModelOutput, syntheticRows, verificationItems } from "./lib/validate.mjs";
import { verificationStatements } from "./lib/verify-sql.mjs";
import { evaluateTargets } from "./lib/evaluate.mjs";
import { renderReport } from "./lib/report.mjs";
import { renderSummary } from "./lib/summary.mjs";
import { torahChanceModel } from "./lib/metrics.mjs";
import { createHash } from "node:crypto";
import { pageLetters } from "./build-windows.mjs";
import { evaluateTargets as evaluateTargetsFor } from "./lib/evaluate.mjs";

const here = (path) => new URL(path, import.meta.url);
const [stage, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const run = args.run ? runById(args.run) : null;
const model = args.model || DEFAULTS.model;
const effort = args.effort || DEFAULTS.effort;
const maxTokens = Number(args["max-tokens"] || DEFAULTS.maxTokens);
const rounds = Number(args.rounds || 1);
const thinkingMode = args.thinking || "adaptive";
const outDir = args["out-dir"] ? new URL(`file://${args["out-dir"].replace(/\/?$/, "/")}`) : run ? here(`./controls/runs/${run.id}/`) : here("./out/");
const ledgerPath = args.ledger || here("./controls/budget-ledger.json").pathname;
const reviewDir = here("./review/");
const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));
const writeJson = (url, value) => writeFileSync(url, JSON.stringify(value, null, 2));
const fail = (message, code = 1) => { process.stderr.write(`${message}\n`); process.exit(code); };

function context() {
  try { return loadContext(args.page || "public/tzofen.html", run ? { regionPath: regionPathOf(run.region) } : undefined); } catch (error) { return fail(`${error.message}; refusing`); }
}

function round1Request(ctx) {
  if (run?.prompt === "v2") return round1RequestV2({ ...ctx }, run, { model, effort, maxTokens, thinkingMode });
  return makeRound1({ ...ctx }, { model, effort, maxTokens, rounds, thinkingMode });
}

function guardCall(request, record) {
  const sha = requestSha256(request);
  if (!args.approve || args.approve !== sha) fail(`the request differs from the one approved: expected --approve ${sha}. Nothing was sent.`, 3);
  if (!record?.ok) fail(`preflight failed (${record?.reason ?? JSON.stringify(record?.checks)}). Nothing was sent.`, 4);
  const cap = Number(args["max-usd"]);
  if (!Number.isFinite(cap) || (record.upper_bound_usd !== null && cap < record.upper_bound_usd)) fail(`--max-usd must cover the upper bound ${record.upper_bound_usd} computed from the exact token count. Nothing was sent.`, 3);
}

/** A call stage repeats the free preflight on exactly this request (the model must be listed, the token count exact), checks the approval, then sends.
 *  Through the site's pass-through the call is a one-request Message Batch (the platform's wall clock is shorter than a long thinking call; batches cost half). */
async function callStage(request, file) {
  let client;
  try { client = makeClient(); } catch (error) { if (error instanceof NoCredentialError) fail(error.message, 2); throw error; }
  const transport = transportOf();
  const record = await preflight(client, request);
  guardCall(request, record);
  let ledger;
  try { ledger = loadLedger(ledgerPath); } catch (error) { return fail(`${error.message}`, 7); }
  const guard = guardSpend(ledger, record.upper_bound_usd, { batch: transport === "proxy" || Boolean(args.batch) });
  if (!guard.ok) fail(`budget guard: ${guard.reason}. Nothing was sent.`, 7);
  process.stderr.write(`budget: spent ${guard.spent}, worst case after this call ${guard.worstCase} (cap ${ledger.cap_usd}, hard guard ${ledger.hard_guard_usd})\n`);
  let message;
  let ms;
  let batch = null;
  if (transport === "proxy" || args.batch) {
    const out = await callBatch(client, request, { results: transport === "proxy" ? (id) => fetchBatchResults(process.env, id) : null, onPoll: (b) => process.stderr.write(`${new Date().toISOString()} batch ${b.id}: ${b.processing_status} ${JSON.stringify(b.request_counts)}\n`) });
    batch = out.batch;
    ms = out.ms;
    if (out.result?.type !== "succeeded") { writeJson(new URL(file, outDir), { request_sha256: requestSha256(request), lock_sha256: lockSha256(request), transport, preflight: record, ms, batch, result: out.result }); fail(`the batch result is "${out.result?.type}", not "succeeded"; saved as ${file}`, 6); }
    message = out.result.message;
  } else {
    ({ message, ms } = await callRound(client, request));
  }
  const summary = summarizeMessage(message);
  const cost = costOf(summary.model, summary.usage, { batch: batch !== null });
  writeJson(new URL(file, outDir), { request_sha256: requestSha256(request), lock_sha256: lockSha256(request), transport, batch, preflight: record, ms, cost, summary, content: message.content, run: run?.id ?? null });
  const after = appendEntry(ledgerPath, { id: `${run?.id ?? "run"} ${file}`, kind: batch ? "batch" : "interactive", batch: batch?.id ?? null, usd: cost.usd, at: new Date().toISOString(), model: summary.model, stop_reason: summary.stop_reason, input_tokens: summary.usage?.input_tokens, cache_write_tokens: summary.usage?.cache_creation_input_tokens, output_tokens: summary.usage?.output_tokens, thinking_tokens: summary.usage?.output_tokens_details?.thinking_tokens ?? null });
  process.stderr.write(`ledger: this call ${cost.usd} USD; spent ${after.spent_usd}, remaining ${after.remaining_usd}\n`);
  process.stdout.write(`${JSON.stringify({ file, transport, model: summary.model, stop_reason: summary.stop_reason, usage: summary.usage, ms, batch, cost }, null, 2)}\n`);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });

if (stage === "dry-run") {
  const ctx = context();
  const { round1, request } = round1Request(ctx);
  const sha = requestSha256(request);
  const reviewTarget = run ? outDir : reviewDir;
  writeJson(new URL("request-round1.json", reviewTarget), request);
  const human = [`MODEL: ${request.model}   (availability NOT yet verified: needs the credential)`, `PARAMETERS: max_tokens=${request.max_tokens}; thinking=${JSON.stringify(request.thinking)}; output_config.effort=${request.output_config.effort}; structured output=json_schema (schema below); cache_control=${JSON.stringify(request.cache_control ?? null)}; tools=none; fallbacks=none`,
    `REQUEST SHA-256: ${sha}`, "", "=== SYSTEM ===", request.system, "", "=== USER (single message) ===", request.messages[0].content, "", "=== JSON SCHEMA OF THE ANSWER ===", JSON.stringify(request.output_config.format.schema, null, 2)].join("\n");
  writeFileSync(new URL("request-round1.txt", reviewTarget), human);
  const summary = {
    request_sha256: sha, lock_sha256: lockSha256(request), model_candidate: model, availability_verified: false, region: { rows: ctx.region.nRows, cols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, scope: ctx.region.scope, width: ctx.region.W, firstRow: ctx.region.r0, firstCol: ctx.region.c0, axisCells: ctx.region.axisCells.length },
    page_cross_check: { cells: ctx.pageCheck.checked, mismatches: ctx.pageCheck.mismatches.length },
    lines: { total: ctx.lines.length, byKind: countsByKind(ctx.lines), omittedShorterThan3: ctx.lines.omitted.length, readingsSent: ctx.lines.length * 2 },
    chars: { system: request.system.length, user: request.messages[0].content.length, prose: Object.values(round1.prose).join("").length, data: Object.values(round1.data).filter(Boolean).join("").length },
    note: "Token count is unknown until the preflight (count_tokens needs the credential).",
  };
  writeJson(new URL("input-summary.json", reviewTarget), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else if (stage === "preflight") {
  let client;
  try { client = makeClient(); } catch (error) { if (error instanceof NoCredentialError) fail(error.message, 2); throw error; }
  const { request } = round1Request(context());
  const record = await preflight(client, request);
  writeJson(new URL("preflight.json", outDir), record);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  if (!record.ok) process.exit(4);
} else if (stage === "call1") {
  await callStage(round1Request(context()).request, "round1-response.json");
} else if (stage === "collect") {
  // recovers the answer of a batch that was already created and paid for; the request is rebuilt only to check that it is the approved one
  let client;
  try { client = makeClient(); } catch (error) { if (error instanceof NoCredentialError) fail(error.message, 2); throw error; }
  const { request } = round1Request(context());
  const transport = transportOf();
  const batchId = String(args["batch-id"] || "");
  if (!/^msgbatch_[A-Za-z0-9]{8,64}$/.test(batchId)) fail("--batch-id msgbatch_... is required", 64);
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") fail(`batch ${batchId} is ${batch.processing_status}, not ended`, 6);
  const entries = transport === "proxy" ? await fetchBatchResults(process.env, batchId) : await client.messages.batches.results(batchId);
  let result = null;
  for await (const entry of entries) if (entry.custom_id === "els-live-1") result = entry.result;
  const ms = Date.parse(batch.ended_at) - Date.parse(batch.created_at);
  const preflightRecord = existsSync(new URL("preflight.json", outDir)) ? readJson(new URL("preflight.json", outDir)) : null;
  if (result?.type !== "succeeded") { writeJson(new URL("round1-response.json", outDir), { request_sha256: requestSha256(request), transport, batch: { id: batch.id, created_at: batch.created_at, ended_at: batch.ended_at, request_counts: batch.request_counts }, result }); fail(`the batch result is "${result?.type}"`, 6); }
  const summary = summarizeMessage(result.message);
  const cost = costOf(summary.model, summary.usage, { batch: true });
  writeJson(new URL("round1-response.json", outDir), { request_sha256: requestSha256(request), lock_sha256: lockSha256(request), transport, batch: { id: batch.id, created_at: batch.created_at, ended_at: batch.ended_at, request_counts: batch.request_counts }, preflight: preflightRecord, ms, cost, summary, content: result.message.content, collected_after_the_fact: true });
  process.stdout.write(`${JSON.stringify({ transport, model: summary.model, stop_reason: summary.stop_reason, usage: summary.usage, ms, cost }, null, 2)}\n`);
} else if (stage === "sql" || stage === "ingest" || stage === "round2" || stage === "call2" || stage === "report") {
  const ctx = context();
  const roundNumber = Number(args.round || 1);
  const responseFile = new URL(`round${roundNumber}-response.json`, outDir);
  const prefix = (n, k) => `r${n}.f${String(k + 1).padStart(2, "0")}`;
  const proposals = (n) => {
    const response = readJson(new URL(`round${n}-response.json`, outDir));
    const parsed = parseModelOutput(response.summary.text);
    if (!parsed.ok) fail(`round ${n}: ${parsed.error}`);
    return { response, findings: parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: prefix(n, k) })), observations: parsed.value.observations ?? "" };
  };
  if (stage === "sql") {
    const { findings } = proposals(roundNumber);
    const located = findings.map((f) => locateFinding(f, ctx));
    writeJson(new URL(`located-round${roundNumber}.json`, outDir), located);
    if (ctx.region.synthetic) {
      writeJson(new URL(`engine-round${roundNumber}.json`, outDir), [[{ verification: syntheticRows(located) }]].flat());
      process.stdout.write(`${located.length} proposals located in a synthetic window; no stream or engine to ask, rows written for ingest\n`);
      process.exit(0);
    }
    const statements = verificationStatements(verificationItems(located));
    statements.forEach((sql, k) => writeFileSync(new URL(`verification-round${roundNumber}-${String(k + 1).padStart(2, "0")}.sql`, outDir), sql));
    process.stdout.write(`${located.length} proposals located; ${statements.length} SQL statements written to ${outDir.pathname}\n`);
  } else if (stage === "ingest") {
    const located = readJson(new URL(`located-round${roundNumber}.json`, outDir));
    const results = ctx.region.synthetic ? readJson(new URL(`engine-round${roundNumber}.json`, outDir)) : readJson(new URL(args.results, `file://${process.cwd()}/`));
    const rows = results.flatMap((batch) => (Array.isArray(batch) ? batch : [batch])).flatMap((entry) => entry.verification ?? []);
    const classified = classify(located, rows);
    writeJson(new URL(`classified-round${roundNumber}.json`, outDir), classified);
    const counts = classified.reduce((acc, f) => ({ ...acc, [f.verdict]: (acc[f.verdict] ?? 0) + 1 }), {});
    process.stdout.write(`${JSON.stringify(counts)}\n`);
  } else if (stage === "round2") {
    const first = proposals(1);
    const classified = readJson(new URL("classified-round1.json", outDir));
    const wanted = new Map(first.findings.map((f) => [f.id, f]));
    const chosen = classified.filter((f) => f.verdict !== "not_verified" && wanted.get(f.id)?.continue_from === true).slice(0, Number(args.cap || (run ? ROUND2_CARD_CAP : 12)));
    if (!chosen.length) fail("no verified proposal asked to continue; there is no round 2", 5);
    const cards = chosen.map((f) => buildCard({ region: ctx.region, lines: ctx.lines, byReading: ctx.byReading, findingId: f.id, text: f.text, readingId: f.occurrences[0].reading, from: f.occurrences[0].from, to: f.occurrences[0].to }));
    const { request: r1 } = round1Request(ctx);
    const request = { ...r1, cache_control: { type: "ephemeral" }, messages: [...r1.messages, { role: "assistant", content: first.response.content }, { role: "user", content: buildRound2Message({ cards }) }] };
    writeJson(new URL("request-round2.json", outDir), request);
    writeFileSync(new URL("request-round2.txt", outDir), `REQUEST SHA-256: ${requestSha256(request)}\n\n${request.messages[2].content}`);
    process.stdout.write(`${JSON.stringify({ cards: cards.length, request_sha256: requestSha256(request) })}\n`);
  } else if (stage === "call2") {
    if (!existsSync(new URL("request-round2.json", outDir))) fail("no round-2 request: run the round2 stage first", 5);
    await callStage(readJson(new URL("request-round2.json", outDir)), "round2-response.json");
  } else {
    const roundsDone = [1, 2].filter((n) => existsSync(new URL(`round${n}-response.json`, outDir)));
    const preflightRecord = existsSync(new URL("preflight.json", outDir)) ? readJson(new URL("preflight.json", outDir)) : null;
    const roundInfo = roundsDone.map((n) => {
      const { response, findings, observations } = proposals(n);
      return { findings, observations, servedModel: response.summary.model, stopReason: response.summary.stop_reason, stopDetails: response.summary.stop_details, usage: response.summary.usage, ms: response.ms, cost: response.cost, batch: response.batch ?? null, transport: response.transport ?? "direct" };
    });
    const classified = roundsDone.flatMap((n) => readJson(new URL(`classified-round${n}.json`, outDir)));
    const targets = args.targets ? readJson(new URL(args.targets, `file://${process.cwd()}/`)).targets : null;
    const evaluation = targets ? evaluateTargets({ targets, classified, byReading: ctx.byReading }) : null;
    const { request } = round1Request(ctx);
    const input = { round1Sha: requestSha256(request), systemChars: request.system.length, userChars: request.messages[0].content.length, nRows: ctx.region.nRows, nCols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, lines: ctx.lines.length, byKind: countsByKind(ctx.lines), pageMismatches: ctx.pageCheck.mismatches.length, omittedShortLines: ctx.lines.omitted.length };
    const failedAttempts = readdirSync(outDir).filter((name) => /^attempt\d+-round1-response\.json$/.test(name)).sort().map((name) => {
      const attempt = readJson(new URL(name, outDir));
      return { label: args[`label-${name.slice(0, 8)}`] || name, stopReason: attempt.summary?.stop_reason, usage: attempt.summary?.usage, ms: attempt.ms, cost: attempt.cost, batch: attempt.batch };
    });
    const report = renderReport({ meta: { requestedModel: model, effort, maxTokens, preflight: preflightRecord }, input, rounds: roundInfo, classified, evaluation, failedAttempts });
    writeFileSync(new URL("report.md", outDir), report.text);
    process.stdout.write(`report written (${report.sha256.slice(0, 12)})\n`);
  }
} else if (stage === "budget") {
  const ledger = loadLedger(ledgerPath);
  process.stdout.write(`${JSON.stringify({ cap_usd: ledger.cap_usd, hard_guard_usd: ledger.hard_guard_usd, stop_new_usd: ledger.stop_new_usd, spent_usd: spentOf(ledger), remaining_usd: Number((ledger.cap_usd - spentOf(ledger)).toFixed(6)), entries: ledger.entries.length }, null, 2)}\n`);
} else if (stage === "plan") {
  // Offline: every planned request, built exactly as it would be sent, with its hashes and cost bounds. Token counts are estimates until the preflight (count_tokens needs the credential).
  const TOKENS_PER_CHAR = 20_774 / (26_187 + 576); // measured on the EXP-15 request by count_tokens
  const priceIn = 10 * 0.5; // batch input USD per MTok
  const priceInWrite = 12.5 * 0.5;
  const priceOut = 50 * 0.5;
  const plan = [];
  let expectedTotal = 0;
  for (const item of RUNS) {
    const ctx = (() => { try { return loadContext(args.page || "public/tzofen.html", { regionPath: regionPathOf(item.region) }); } catch (error) { return fail(`${item.id}: ${error.message}; refusing`); } })();
    const { request } = item.prompt === "v2" ? round1RequestV2(ctx, item, { model, effort, maxTokens, thinkingMode }) : makeRound1({ ...ctx }, { model, effort, maxTokens, rounds, thinkingMode });
    const chars = request.system.length + request.messages[0].content.length;
    const inputTokens = Math.round(chars * TOKENS_PER_CHAR);
    const expectedOutput = item.onlyLines ? 15_000 : 33_000; // a two-line probe is much shorter than a full region
    const expected = (inputTokens * priceIn + expectedOutput * priceOut) / 1e6;
    const upper = (inputTokens * priceInWrite + maxTokens * priceOut) / 1e6;
    expectedTotal += expected;
    const dir = here(`./controls/runs/${item.id}/`);
    mkdirSync(dir, { recursive: true });
    writeJson(new URL("request-round1.json", dir), request);
    writeFileSync(new URL("request-round1.txt", dir), [`RUN ${item.id} (${item.series}): ${item.note}`, `REQUEST SHA-256: ${requestSha256(request)}`, `LOCK SHA-256: ${lockSha256(request)}`, "", "=== SYSTEM ===", request.system, "", "=== USER ===", request.messages[0].content].join("\n"));
    plan.push({ id: item.id, series: item.series, group: item.group, priority: item.priority, region: item.region, prompt: item.prompt, story: item.story ?? (item.prompt === "v1" ? "columbia (EXP-15 text)" : null), marked: item.prompt === "v1" ? true : Boolean(item.marked), hint: item.hint ?? null, onlyLines: item.onlyLines ?? null, round2: Boolean(item.round2), request_sha256: requestSha256(request), lock_sha256: lockSha256(request), chars, estimated_input_tokens: inputTokens, expected_usd: Number(expected.toFixed(3)), upper_bound_usd: Number(upper.toFixed(3)), note: item.note });
  }
  writeJson(here("./controls/plan-review.json"), { model, effort, max_tokens: maxTokens, thinking: thinkingMode, transport: "Message Batches through the request-locked pass-through (50% batch price)", assumptions: { tokens_per_char: Number(TOKENS_PER_CHAR.toFixed(4)), expected_output_tokens: 33_000, basis: "EXP-15 round 1: 32,817 output tokens, 21,348 input tokens" }, runs: plan });
  const rows = plan.map((r) => `| ${r.id} | ${r.series} | ${r.region} | ${r.prompt} | ${r.story ?? "—"} | ${r.marked ? "כן" : "לא"} | ${r.hint ?? "—"} | ${r.estimated_input_tokens} | $${r.expected_usd} | $${r.upper_bound_usd} | ${r.request_sha256.slice(0, 12)} | ${r.lock_sha256.slice(0, 12)} |`);
  writeFileSync(here("./controls/plan-review.md"), ["| run | series | region | prompt | story | marked | hint | est. input tokens | expected | worst case | request sha | lock sha |", "|---|---|---|---|---|---|---|---|---|---|---|---|", ...rows, "", `Round-1 expected total: $${expectedTotal.toFixed(2)} (estimate); each worst case assumes the whole ${maxTokens} output tokens are used.`].join("\n"));
  process.stdout.write(`${plan.length} requests written under controls/runs/; expected round-1 total about ${expectedTotal.toFixed(2)} USD (estimate)\n`);
} else if (stage === "summary") {
  const loadRun = (item) => {
    const dir = here(`./controls/runs/${item.id}/`);
    const responseUrl = new URL("round1-response.json", dir);
    if (!existsSync(responseUrl) || !existsSync(new URL("classified-round1.json", dir))) return null;
    const response = readJson(responseUrl);
    const parsed = parseModelOutput(response.summary.text);
    if (!parsed.ok) return null;
    const raw = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
    const ctx = (() => { try { return loadContext(args.page || "public/tzofen.html", { regionPath: regionPathOf(item.region) }); } catch (error) { return fail(`${item.id}: ${error.message}; refusing`); } })();
    const classified = readJson(new URL("classified-round1.json", dir));
    const targets = args.targets ? readJson(new URL(args.targets, `file://${process.cwd()}/`)).targets : null;
    const evaluation = targets && item.region === "columbia" ? evaluateTargetsFor({ targets, classified, byReading: ctx.byReading }) : null;
    let round2 = null;
    if (existsSync(new URL("round2-response.json", dir)) && existsSync(new URL("classified-round2.json", dir))) {
      const response2 = readJson(new URL("round2-response.json", dir));
      const parsed2 = parseModelOutput(response2.summary.text);
      if (parsed2.ok) round2 = { response: response2, raw: parsed2.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r2.f${String(k + 1).padStart(2, "0")}` })), classified: readJson(new URL("classified-round2.json", dir)) };
    }
    return { run: item, response, raw, classified, evaluation, planted: ctx.region.planted ?? null, round2 };
  };
  const runs = RUNS.map(loadRun).filter(Boolean);
  // the EXP-15 run, reclassified with the current classifier so that its engine counts are available
  const refDir = here("./results/");
  const refResponse = readJson(new URL("round1-response.json", refDir));
  const refRaw = parseModelOutput(refResponse.summary.text).value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const refRows = ["r1-01.json", "r1-02.json", "r1-03.json"].map((name) => readJson(new URL(`./results/engine/${name}`, here("./")))).flatMap((batch) => batch).flatMap((entry) => entry.verification ?? []);
  const reference = { response: refResponse, raw: refRaw, classified: classify(readJson(new URL("located-round1.json", refDir)), refRows), evaluation: null, planted: null };
  const targets = args.targets ? readJson(new URL(args.targets, `file://${process.cwd()}/`)).targets : [];
  const ledger = existsSync(ledgerPath) ? loadLedger(ledgerPath) : null;
  const chance = torahChanceModel(pageLetters(args.page || "public/tzofen.html"), (text) => createHash("md5").update(text, "utf8").digest("hex"));
  const text = renderSummary({ runs, reference, ledger, targets, chance });
  writeFileSync(here("./controls/summary.md"), text);
  process.stdout.write(`summary of ${runs.length} runs written to controls/summary.md\n`);
} else {
  fail(`usage: run-live-reading.mjs dry-run|preflight|call1|sql|ingest|round2|call2|report|plan|budget|summary  (credential variable: ${KEY_ENV})`, 64);
}
