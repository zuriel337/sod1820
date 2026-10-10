#!/usr/bin/env node
// SOD1820 API billing probe. ONE bounded request; default DRY RUN.
// Does not launch Codex Cloud, edit files, spawn commands or dispatch tasks.
const model = "gpt-6.1-sol";
const rates = { input: 1 / 1e6, output: 5 / 1e6 }; // USD, Standard, short context, check pricing before live
const maxOutputTokens = 120;
const prompt = "Reply with exactly: SOD1820_API_PROBE_OK";
const predictedInputTokensUpperBound = 500;
const conservativeBudget = Number((predictedInputTokensUpperBound * rates.input + maxOutputTokens * rates.output).toFixed(6));
const approvedCap = 0.02; // USD per connectivity request. This is a preflight allowance, NOT a bank/provider hard stop.
const live = process.argv.includes("--live");
console.log(JSON.stringify({mode: live ? "LIVE_REQUEST" : "DRY_RUN",model,maxOutputTokens,estimatedMaximumUsd: conservativeBudget,approvedCapUsd:approvedCap,
  warning:"Estimated preflight only; no provider-enforced cost cap. Exact billing may differ due to token/account factors."},null,2));
if (!live) process.exit(0);
if (process.env.SOD_API_PROBE_LIVE_APPROVED !== "YES") {
  console.error("BLOCKED: require per-run user approval and SOD_API_PROBE_LIVE_APPROVED=YES");
  process.exit(2);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("BLOCKED: OPENAI_API_KEY missing; never enter secrets into chat, repo, or logs.");
  process.exit(2);
}
if (conservativeBudget > approvedCap) { console.error("BLOCKED: preflight over cap"); process.exit(2); }
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
try {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method:"POST", signal:controller.signal,
    headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model,input:prompt,max_output_tokens:maxOutputTokens,store:false})
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error(JSON.stringify({ok:false,httpStatus:response.status,errorType:payload.error?.type || "unknown"}));
    process.exitCode=1;
  } else {
    const output=Array.isArray(payload.output) ? payload.output.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("") : "";
    const input=Number(payload.usage?.input_tokens||0), generated=Number(payload.usage?.output_tokens||0);
    console.log(JSON.stringify({ok:output.includes("SOD1820_API_PROBE_OK"),responseMatched:output.includes("SOD1820_API_PROBE_OK"),
      usage:{inputTokens:input,outputTokens:generated},estimatedChargeUsd: Number((input*rates.input+generated*rates.output).toFixed(6)),
      note:"Usage-derived estimate, not vendor invoice or guaranteed charge."},null,2));
  }
} catch(err) { console.error(JSON.stringify({ok:false,error:err.name==="AbortError"?"timeout":String(err.message).slice(0,160)}));process.exitCode=1; }
finally {clearTimeout(timeout);}
