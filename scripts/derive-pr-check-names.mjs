#!/usr/bin/env node
// Derives, from .github/workflows/*.yml, the check-run names that a pull request to main gets, with the trigger of each one.
// Read-only and offline: it reads the workflow files and nothing else. It is the source of the table in
// docs/reviews/contracts-enforcement-20261113/required-checks.md and of the pin in test/required-checks-definition-2029.test.mjs.
//
// A GitHub Actions check-run is named by its JOB: the `name:` of the job when it has one, otherwise the job id (the workflow name is
// not part of it). A branch ruleset matches a required status check by that name (and optionally by the app that reported it).
// The parser is a strict line parser for the shapes these workflows use (block mappings, inline `[a, b]` lists, `- item` lists).
// It THROWS on anything it does not understand (a matrix, a reusable workflow, a dynamic job name, an inline top-level `on`),
// so a workflow written in a new shape fails the pin loudly instead of being read wrongly.
//
// Usage: node scripts/derive-pr-check-names.mjs [--json]
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const stripComment = (l) => l.replace(/\s+#.*$/, '');
const unquote = (v) => v.trim().replace(/^(['"])(.*)\1$/, '$2');
const indentOf = (l) => l.length - l.trimStart().length;

function inlineList(v) {
  const m = /^\[(.*)\]$/.exec(v.trim());
  return m ? m[1].split(',').map((x) => unquote(x)).filter(Boolean) : null;
}

// A key's value at `indent`: inline scalar / inline list, or the `- item` lines that follow it.
function readValue(lines, i, indent) {
  const [, , , rest] = /^(\s*)([A-Za-z0-9_.-]+):\s*(.*)$/.exec(lines[i]);
  const r = stripComment(rest).trim();
  if (r) return { value: inlineList(r) ?? unquote(r), next: i + 1 };
  const items = []; let j = i + 1;
  while (j < lines.length && (stripComment(lines[j]).trim() === '' || indentOf(lines[j]) > indent)) {
    const t = stripComment(lines[j]).trim();
    if (t.startsWith('- ')) items.push(unquote(t.slice(2)));
    j++;
  }
  return { value: items.length ? items : null, next: j };
}

export function parseWorkflow(text, file) {
  const lines = text.split('\n');
  const topName = lines.map((l) => /^name:\s*(.+)$/.exec(l)).find(Boolean);
  const wf = { file, name: topName ? unquote(stripComment(topName[1])) : file, on: {}, jobs: [] };
  const onAt = lines.findIndex((l) => /^on:\s*$/.test(l));
  if (onAt < 0) throw new Error(file + ': top-level "on:" must be a block mapping (this parser does not read other shapes)');
  let i = onAt + 1;
  while (i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > 0 || lines[i].startsWith('#'))) {
    const l = lines[i];
    if (l.trim() === '' || l.trim().startsWith('#') || indentOf(l) !== 2) { i++; continue; }
    const m = /^  ([a-z_]+):\s*(.*)$/.exec(stripComment(l));
    if (!m) throw new Error(file + ': cannot read the trigger line: ' + l);
    const trig = {}; i++;
    while (i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > 2 || lines[i].trim().startsWith('#'))) {
      if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#') && indentOf(lines[i]) === 4 && lines[i].trim().startsWith('- ')) {
        (trig._items ||= []).push(stripComment(lines[i]).trim().slice(2)); i++; // e.g. schedule: - cron: '...'
      } else if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#') && indentOf(lines[i]) === 4) {
        const k = /^    ([A-Za-z0-9_-]+):/.exec(lines[i]);
        if (!k) throw new Error(file + ': cannot read the trigger option: ' + lines[i]);
        const { value, next } = readValue(lines, i, 4); trig[k[1]] = value; i = next;
      } else i++;
    }
    wf.on[m[1]] = trig;
  }
  const jobsAt = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (jobsAt < 0) throw new Error(file + ': no jobs block');
  let cur = null;
  for (let k = jobsAt + 1; k < lines.length; k++) {
    const l = lines[k]; if (l.trim() === '' || l.trim().startsWith('#')) { if (cur) cur.body.push(l); continue; }
    if (indentOf(l) === 0) break;
    const jm = /^  ([A-Za-z0-9_-]+):\s*$/.exec(stripComment(l));
    if (indentOf(l) === 2 && jm) { cur = { id: jm[1], props: {}, body: [] }; wf.jobs.push(cur); continue; }
    if (!cur) throw new Error(file + ': unexpected line before the first job: ' + l);
    cur.body.push(l);
    const pm = /^    ([A-Za-z0-9_-]+):\s*(.*)$/.exec(stripComment(l));
    if (indentOf(l) === 4 && pm) cur.props[pm[1]] = unquote(pm[2]);
  }
  wf.jobs = wf.jobs.map((j) => {
    for (const bad of ['strategy', 'uses']) if (bad in j.props) throw new Error(file + ' job ' + j.id + ': "' + bad + '" is not supported by this parser (check names would change)');
    const name = j.props.name ?? j.id;
    if (name.includes('${{')) throw new Error(file + ' job ' + j.id + ': dynamic job name; the check name cannot be derived statically');
    const body = j.body.join('\n');
    return { id: j.id, name, if: j.props.if ?? null, needs: j.props.needs ?? null, runsOn: j.props['runs-on'] ?? null,
      timeoutMinutes: j.props['timeout-minutes'] ? Number(j.props['timeout-minutes']) : null,
      cost: /playwright/i.test(body) ? 'browser' : /npm ci|npm run build|docker run|initdb/i.test(body) ? 'install-or-build' : 'light' };
  });
  return wf;
}

// -> one row per job of every workflow that has a pull_request trigger
export function deriveChecks(dir = resolve(root, '.github/workflows')) {
  const rows = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    const wf = parseWorkflow(readFileSync(resolve(dir, f), 'utf8'), f);
    const pr = wf.on.pull_request;
    if (!pr) continue;
    const pathFiltered = !!(pr.paths || pr['paths-ignore']);
    for (const j of wf.jobs) rows.push({
      check: j.name, workflow_file: f, workflow_name: wf.name, job_id: j.id,
      pr_trigger: pathFiltered ? 'paths' : 'always',
      pr_branches: pr.branches ?? null, pr_types: pr.types ?? null,
      path_filter_entries: pr.paths ? pr.paths.length : pr['paths-ignore'] ? pr['paths-ignore'].length : 0,
      also_on: Object.keys(wf.on).filter((k) => k !== 'pull_request').sort(),
      job_if: j.if, timeout_minutes: j.timeoutMinutes, cost_class: j.cost,
    });
  }
  const count = new Map(); for (const r of rows) count.set(r.check, (count.get(r.check) || 0) + 1);
  for (const r of rows) r.duplicate_name = count.get(r.check) > 1;
  return rows;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = deriveChecks();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else for (const r of rows) console.log([r.check.padEnd(36), r.pr_trigger.padEnd(6), (r.pr_branches ? r.pr_branches.join(',') : 'any').padEnd(5), String(r.timeout_minutes ?? 'unset(360)').padEnd(10), r.cost_class.padEnd(16), r.workflow_file + (r.duplicate_name ? '  DUPLICATE-NAME' : '')].join(' '));
}
