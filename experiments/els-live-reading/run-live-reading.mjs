#!/usr/bin/env node
// EXP-15 live reading harness. Stages (see README.md):
//   dry-run     build and write the exact request for review; no network, no credential
//   preflight   needs the credential: model listed? limits and capabilities? exact token count?  (no tokens billed)
//   call1       needs the credential: repeats the preflight, then sends the round-1 request, only with --approve <sha256 of the reviewed request> and --max-usd
//   sql         offline: locate the proposals and write the canonical verification SQL (to be executed read-only by the operator)
//   ingest      offline: merge the SQL results into verified / not verified
//   round2      offline: neighbourhood cards for verified proposals marked to continue; writes the round-2 request for review
//   call2       needs the credential: the round-2 request, same approval rule
//   report      offline: the report (and the evaluation targets, last)
// There is no mock path. Without the credential the call stages stop with exit code 2.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { buildCard, buildRound2Message } from "./lib/prompt.mjs";
import { countsByKind, loadContext, round1Request as makeRound1 } from "./lib/context.mjs";
import { KEY_ENV, NoCredentialError, costOf, requestSha256, summarizeMessage } from "./lib/request.mjs";
import { callRound, makeClient, preflight } from "./lib/client.mjs";
import { classify, locateFinding, parseModelOutput, verificationItems } from "./lib/validate.mjs";
import { verificationStatements } from "./lib/verify-sql.mjs";
import { evaluateTargets } from "./lib/evaluate.mjs";
import { renderReport } from "./lib/report.mjs";

const here = (path) => new URL(path, import.meta.url);
const [stage, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const model = args.model || "claude-opus-5-5";
const effort = args.effort || "high";
const maxTokens = Number(args["max-tokens"] || 32_000);
const rounds = Number(args.rounds || 1);
const outDir = args["out-dir"] ? new URL(`file://${args["out-dir"].replace(/\/?$/, "/")}`) : here("./out/");
const reviewDir = here("./review/");
const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));
const writeJson = (url, value) => writeFileSync(url, JSON.stringify(value, null, 2));
const fail = (message, code = 1) => { process.stderr.write(`${message}\n`); process.exit(code); };

function context() {
  try { return loadContext(args.page || "public/tzofen.html"); } catch (error) { return fail(`${error.message}; refusing`); }
}

function round1Request(ctx) {
  return makeRound1({ ...ctx }, { model, effort, maxTokens, rounds });
}

function guardCall(request, record) {
  const sha = requestSha256(request);
  if (!args.approve || args.approve !== sha) fail(`the request differs from the one approved: expected --approve ${sha}. Nothing was sent.`, 3);
  if (!record?.ok) fail(`preflight failed (${record?.reason ?? JSON.stringify(record?.checks)}). Nothing was sent.`, 4);
  const cap = Number(args["max-usd"]);
  if (!Number.isFinite(cap) || (record.upper_bound_usd !== null && cap < record.upper_bound_usd)) fail(`--max-usd must cover the upper bound ${record.upper_bound_usd} computed from the exact token count. Nothing was sent.`, 3);
}

/** A call stage repeats the free preflight on exactly this request (the model must be listed, the token count exact), checks the approval, then sends. */
async function callStage(request, file) {
  let client;
  try { client = makeClient(); } catch (error) { if (error instanceof NoCredentialError) fail(error.message, 2); throw error; }
  const record = await preflight(client, request);
  guardCall(request, record);
  const { message, ms } = await callRound(client, request);
  const summary = summarizeMessage(message);
  writeJson(new URL(file, outDir), { request_sha256: requestSha256(request), preflight: record, ms, cost: costOf(summary.model, summary.usage), summary, content: message.content });
  process.stdout.write(`${JSON.stringify({ file, model: summary.model, stop_reason: summary.stop_reason, usage: summary.usage, ms, cost: costOf(summary.model, summary.usage) }, null, 2)}\n`);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });

if (stage === "dry-run") {
  const ctx = context();
  const { round1, request } = round1Request(ctx);
  const sha = requestSha256(request);
  writeJson(new URL("request-round1.json", reviewDir), request);
  const human = [`MODEL: ${request.model}   (availability NOT yet verified: needs the credential)`, `PARAMETERS: max_tokens=${request.max_tokens}; thinking=${JSON.stringify(request.thinking)}; output_config.effort=${request.output_config.effort}; structured output=json_schema (schema below); cache_control=${JSON.stringify(request.cache_control ?? null)}; tools=none; fallbacks=none`,
    `REQUEST SHA-256: ${sha}`, "", "=== SYSTEM ===", request.system, "", "=== USER (single message) ===", request.messages[0].content, "", "=== JSON SCHEMA OF THE ANSWER ===", JSON.stringify(request.output_config.format.schema, null, 2)].join("\n");
  writeFileSync(new URL("request-round1.txt", reviewDir), human);
  const summary = {
    request_sha256: sha, model_candidate: model, availability_verified: false, region: { rows: ctx.region.nRows, cols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, scope: ctx.region.scope, width: ctx.region.W, firstRow: ctx.region.r0, firstCol: ctx.region.c0, axisCells: ctx.region.axisCells.length },
    page_cross_check: { cells: ctx.pageCheck.checked, mismatches: ctx.pageCheck.mismatches.length },
    lines: { total: ctx.lines.length, byKind: countsByKind(ctx.lines), omittedShorterThan3: ctx.lines.omitted.length, readingsSent: ctx.lines.length * 2 },
    chars: { system: request.system.length, user: request.messages[0].content.length, prose: Object.values(round1.prose).join("").length, data: Object.values(round1.data).join("").length },
    note: "Token count is unknown until the preflight (count_tokens needs the credential).",
  };
  writeJson(new URL("input-summary.json", reviewDir), summary);
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
    const statements = verificationStatements(verificationItems(located));
    statements.forEach((sql, k) => writeFileSync(new URL(`verification-round${roundNumber}-${String(k + 1).padStart(2, "0")}.sql`, outDir), sql));
    process.stdout.write(`${located.length} proposals located; ${statements.length} SQL statements written to ${outDir.pathname}\n`);
  } else if (stage === "ingest") {
    const located = readJson(new URL(`located-round${roundNumber}.json`, outDir));
    const results = readJson(new URL(args.results, `file://${process.cwd()}/`));
    const rows = results.flatMap((batch) => (Array.isArray(batch) ? batch : [batch])).flatMap((entry) => entry.verification ?? []);
    const classified = classify(located, rows);
    writeJson(new URL(`classified-round${roundNumber}.json`, outDir), classified);
    const counts = classified.reduce((acc, f) => ({ ...acc, [f.verdict]: (acc[f.verdict] ?? 0) + 1 }), {});
    process.stdout.write(`${JSON.stringify(counts)}\n`);
  } else if (stage === "round2") {
    const first = proposals(1);
    const classified = readJson(new URL("classified-round1.json", outDir));
    const wanted = new Map(first.findings.map((f) => [f.id, f]));
    const chosen = classified.filter((f) => f.verdict !== "not_verified" && wanted.get(f.id)?.continue_from === true).slice(0, Number(args.cap || 12));
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
      return { findings, observations, servedModel: response.summary.model, stopReason: response.summary.stop_reason, stopDetails: response.summary.stop_details, usage: response.summary.usage, ms: response.ms, cost: response.cost };
    });
    const classified = roundsDone.flatMap((n) => readJson(new URL(`classified-round${n}.json`, outDir)));
    const targets = args.targets ? readJson(new URL(args.targets, `file://${process.cwd()}/`)).targets : null;
    const evaluation = targets ? evaluateTargets({ targets, classified, byReading: ctx.byReading }) : null;
    const { request } = round1Request(ctx);
    const input = { round1Sha: requestSha256(request), systemChars: request.system.length, userChars: request.messages[0].content.length, nRows: ctx.region.nRows, nCols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, lines: ctx.lines.length, byKind: countsByKind(ctx.lines), pageMismatches: ctx.pageCheck.mismatches.length, omittedShortLines: ctx.lines.omitted.length };
    const report = renderReport({ meta: { requestedModel: model, effort, maxTokens, preflight: preflightRecord }, input, rounds: roundInfo, classified, evaluation });
    writeFileSync(new URL("report.md", outDir), report.text);
    process.stdout.write(`report written (${report.sha256.slice(0, 12)})\n`);
  }
} else {
  fail(`usage: run-live-reading.mjs dry-run|preflight|call1|sql|ingest|round2|call2|report  (credential variable: ${KEY_ENV})`, 64);
}
