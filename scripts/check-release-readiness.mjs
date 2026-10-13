import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = ['routes', 'visual', 'goldenJourneys', 'realData', 'performance', 'seo', 'ci', 'productionStage', 'rollbackPlan'];
const failures = [];
let evidence;
try { evidence = JSON.parse(readFileSync(process.argv[2], 'utf8')); }
catch { failures.push('Provide a release evidence JSON file. No evidence means NO_GO.'); }
if (evidence) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (evidence.commit !== head) failures.push('Evidence commit must equal current HEAD.');
  if (!evidence.deploymentId || !evidence.previewUrl) failures.push('Exact deployment ID and preview URL are required.');
  for (const name of required) {
    const gate = evidence.gates?.[name];
    if (gate?.status !== 'PASS' || !gate.receipt || !gate.checkedAt) failures.push(`${name}: PASS, receipt and checkedAt required.`);
  }
  const approval = evidence.humanApproval;
  if (approval?.actor !== 'ZURIEL' || approval?.commit !== head || !approval?.record || approval?.production !== true) {
    failures.push('Explicit ZURIEL production approval for this commit is required.');
  }
}
console.log(JSON.stringify({ verdict: failures.length ? 'NO_GO' : 'GO', failures }, null, 2));
if (failures.length) process.exitCode = 1;
