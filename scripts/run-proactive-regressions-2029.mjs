// CI runner: run bounded, existing functional tests for risk-mapped changed files.
// A green targeted test is not a substitute for browser/RUM verification.
import { execFileSync, spawnSync } from "node:child_process";
import { impactForChangedFiles } from "./performance-change-impact-2029.mjs";

function arg(key, fallback) { const i=process.argv.indexOf(key); return i>=0 ? process.argv[i+1] : fallback; }
const base=arg("--base","origin/main");
const files=process.argv.includes("--files")
  ? arg("--files","").split(",").filter(Boolean)
  : execFileSync("git",["diff","--name-only","--diff-filter=ACMRT",`${base}...HEAD`],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const impact=impactForChangedFiles(files);
console.log(JSON.stringify(impact,null,2));
const run=(filename)=>{
  console.log(`Running targeted functional regression: ${filename}`);
  const child=spawnSync(process.execPath,["--test",filename],{stdio:"inherit",env:process.env});
  if(child.error)throw child.error;
  if(child.status!==0)process.exitCode=1;
};
run("test/performance-change-impact-2029.test.mjs");
if(impact.categories.some(x=>["personal-save-and-sync","shared-entry","storage-auth-access"].includes(x))){
  run("test/personal-save-decision-2029.test.mjs");
  run("test/research-sync-hardening.test.mjs");
}
if(impact.categories.includes("book-public-source"))run("src/lib/research/publicLibraryContinuity2029.test.js");
if(impact.browserRequired){
  console.log("::warning title=Behavioral browser evidence pending::Changed code may affect real guest/user workflows. Targeted unit tests do not prove authenticated save/reload or actual LCP/INP/CLS.");
}
if(!impact.categories.length)console.log("::warning title=Risk-map coverage unknown::No mapped file family. Human review required; absence of a rule is not a pass.");
const summary=process.env.GITHUB_STEP_SUMMARY;
if(summary){
  const fs=await import("node:fs");
  fs.appendFileSync(summary,[
    "## SOD1820 · Proactive performance / behavior impact",
    `**Assessment:** ${impact.verdict} · **Priority:** ${impact.priority}`,
    `**Impacted areas:** ${impact.affectedScopes.join(", ")||"Unmapped / UNKNOWN"}`,
    `**Potential regressions:** ${impact.potentialFailures.join("; ")||"Unknown; inspect change"}`,
    `**Further checks:** ${impact.proposedChecks.join("; ")||"Manual review"}`,
    `**Browser evidence:** ${impact.browserRequired?"Required, not proved by this job":"Not mandated by mapped rule; review coverage"}`,
    "",].join("\n")+"\n");
}
