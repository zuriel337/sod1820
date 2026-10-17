// The recovery gate: what a person must get when a failure is over, when it is not, and when a message comes back empty — decided on results of the evidence runner
// (run-matrix.sh group `recgate`, files gate-<case>-<width>-AB.json), for one arm, with fixed limits. Exit code 1 when any case FAILS; a case without a valid sample or without the control it
// needs is NOT_RUN (reported as such, never counted as a pass).
//   node recovery-gate.mjs <dir with gate-*-AB.json> --arm A|B [--json out.json] [--enforceSpace]
//
// Two parts. The recovery checks (layout shifts, the same content, the reading place, retry, a deliberate scroll, exact return) decide the verdict. The space of a failure message above the
// person is a defined OPEN task of the shell (docs/perf-evidence-20261016/recovery-fix/README.md: giving it back above the reading place needs a scroll compensation, and the browser counts
// it in this shell whatever its precision): it is measured and printed in its own column, never as a pass, and decides the verdict only with --enforceSpace.
//
// Cases (every one at 320 / 390 on the mobile profile and 1440 / 1920 on the desktop profile):
//   recover2  three entries: the first two return with every read failing, the third is healthy      -> the healthy entry: CLS <= 0.1, the same content as the first visit, the reading place where it was
//   blip      one failing entry, then a healthy one                                                    -> the same
//   persist   three entries that all fail                                                              -> no entry shifts (CLS <= 0.1), the reading place is exact, a deliberate scroll is not pulled back,
//                                                                                                        and the space of a failure message that is above the person is given back (<= 160 px + the message)
//   empty     the lists come back empty (a message, not a failure)                                     -> as persist
//   retry     a failure that is over, the person presses the retry control that is in view             -> the area loads again, the reading place stays, CLS <= 0.1
//   healthy   nothing fails                                                                            -> the return is exact, the same content, CLS <= 0.1 (the change must not cost the normal case)
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2), dir = argv.find((a) => !a.startsWith("--")), arm = argv.includes("--arm") ? argv[argv.indexOf("--arm") + 1] : "B";
const jsonOut = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null, enforceSpace = argv.includes("--enforceSpace");
if (!dir) { console.error("usage: node recovery-gate.mjs <dir with gate-*-AB.json> --arm A|B [--json out.json] [--enforceSpace]"); process.exit(2); }
export const LIMITS = { cls: 0.1, readingPx: 12, boundPx: 160, messageSlackPx: 24 };

const maxOf = (xs) => { xs = xs.filter((x) => x != null); return xs.length ? Math.max(...xs) : null; };
const fmt = (x) => (x == null ? "–" : +(+x).toFixed(3));

// the checks of one entry (a return to Home): { cls, block displacement, identity, space given back }
function entryChecks(name, entry, { healthy, boxesFrom = "holdGeoAtEnd" }) {
  const out = [];
  if (!entry) return [{ name, status: "NOT_RUN", why: "the entry was not reached" }];
  out.push({ name: `${name}: layout shifts`, status: entry.cls <= LIMITS.cls ? "PASS" : "FAIL", value: fmt(entry.cls), limit: LIMITS.cls });
  const disp = entry.block?.displacement ?? entry.displacement;
  out.push(disp == null ? { name: `${name}: reading place`, status: "NOT_RUN", why: "no reading block was measurable" } : { name: `${name}: reading place`, status: disp <= LIMITS.readingPx ? "PASS" : "FAIL", value: `${disp}px`, limit: `${LIMITS.readingPx}px` });
  if (healthy) out.push({ name: `${name}: the content that came back`, status: entry.identity?.same ? "PASS" : "FAIL", value: entry.identity?.same ? "same titles, headings, links, images, rows" : JSON.stringify({ missing: entry.identity?.missing, added: entry.identity?.added }) });
  return out;
}
// the space a failure message keeps above the person: no failure box entirely above the viewport may hold more than the bound (or its own message) plus a small slack
function spaceChecks(name, boxes) {
  if (!Array.isArray(boxes)) return [{ name: `${name}: space of failure messages above the person`, status: "NOT_RUN", open: true, why: "no box geometry was recorded" }];
  const above = boxes.filter((b) => b.msg && b.bottom < 0), over = above.filter((b) => b.h > Math.max(LIMITS.boundPx, b.nat ?? 0) + LIMITS.messageSlackPx);
  return [{ name: `${name}: space of failure messages above the person`, open: true, status: over.length ? "FAIL" : "PASS", value: `${above.length} failure box(es) above the viewport, ${over.length} over the bound${over.length ? ": " + over.map((b) => `${b.cls} ${b.h}px`).join(", ") : ""}`, limit: `${LIMITS.boundPx}px + the message` }];
}
const first = (r) => ({ cls: r.cls, displacement: r.reading?.displacement ?? null, identity: r.identity });

const CASES = {
  recover2: (r) => [...entryChecks("return 1 (failing)", first(r), { healthy: false }), ...entryChecks("return 2 (failing)", r.backAgain, { healthy: false }), ...entryChecks("return 3 (healthy)", r.backThird, { healthy: true })],
  blip: (r) => [...entryChecks("return 1 (failing)", first(r), { healthy: false }), ...entryChecks("return 2 (healthy)", r.backAgain, { healthy: true })],
  persist: (r) => [...entryChecks("return 1", first(r), { healthy: false }), ...spaceChecks("return 1", r.holdGeoAtEnd), ...entryChecks("return 2", r.backAgain, { healthy: false }), ...spaceChecks("return 2", r.backAgain?.holdGeoAtEnd),
    ...entryChecks("return 3", r.backThird, { healthy: false }), ...spaceChecks("return 3", r.backThird?.holdGeoAtEnd),
    r.deliberate ? { name: "deliberate scroll", status: r.deliberate.ok ? "PASS" : "FAIL", value: `down ${r.deliberate.downBy}px, up ${r.deliberate.upBy}px, restorer scrolls after: ${r.deliberate.programmaticScrollsAfter}, compensations: ${r.deliberate.compensations}` } : { name: "deliberate scroll", status: "NOT_RUN", why: "not measured" }],
  empty: (r) => [...entryChecks("return 1", first(r), { healthy: false }), ...spaceChecks("return 1", r.holdGeoAtEnd), ...entryChecks("return 2", r.backAgain, { healthy: false }), ...spaceChecks("return 2", r.backAgain?.holdGeoAtEnd),
    r.deliberate ? { name: "deliberate scroll", status: r.deliberate.ok ? "PASS" : "FAIL", value: `down ${r.deliberate.downBy}px, up ${r.deliberate.upBy}px, restorer scrolls after: ${r.deliberate.programmaticScrollsAfter}` } : { name: "deliberate scroll", status: "NOT_RUN", why: "not measured" }],
  retry: (r) => {
    const t = r.retry;
    if (!t || !t.controlsInView) return [{ name: "retry in the same entry", status: "NOT_RUN", why: "no retry control was in view at the reading place" }];
    return [{ name: "retry: the area loads again", status: t.noticesAfter < t.noticesBefore ? "PASS" : "FAIL", value: `${t.noticesBefore} → ${t.noticesAfter} messages` },
      { name: "retry: reading place", status: t.blockDisplacement == null ? "NOT_RUN" : t.blockDisplacement <= LIMITS.readingPx ? "PASS" : "FAIL", value: `${t.blockDisplacement ?? "–"}px`, limit: `${LIMITS.readingPx}px` },
      { name: "retry: layout shifts the browser counts", status: t.cls <= LIMITS.cls ? "PASS" : "FAIL", value: `${fmt(t.cls)} (with the exempt input window: ${fmt(t.clsWithInput)})`, limit: LIMITS.cls }];
  },
  healthy: (r) => [...entryChecks("return 1", first(r), { healthy: true }), ...entryChecks("return 2", r.backAgain, { healthy: true }),
    r.deliberate ? { name: "deliberate scroll", status: r.deliberate.ok ? "PASS" : "FAIL", value: `down ${r.deliberate.downBy}px, up ${r.deliberate.upBy}px, restorer scrolls after: ${r.deliberate.programmaticScrollsAfter}` } : { name: "deliberate scroll", status: "NOT_RUN", why: "not measured" }],
};

const rows = [];
for (const file of fs.readdirSync(dir).filter((f) => /^gate-[a-z0-9]+-\d+-AB\.json$/.test(f)).sort()) {
  const [, kind, width] = /^gate-([a-z0-9]+)-(\d+)-AB\.json$/.exec(file), data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const all = data.runs.filter((r) => r.arm === arm), valid = all.filter((r) => r.valid), checkFn = CASES[kind];
  if (!checkFn) continue;
  if (!valid.length) { rows.push({ case: kind, width: +width, arm, samples: `0/${all.length}`, status: "NOT_RUN", checks: [{ name: "samples", status: "NOT_RUN", why: `no valid sample (${all.map((r) => (r.invalid || []).join(";") || r.error || "invalid").join(" | ").slice(0, 160)})` }] }); continue; }
  // a check passes only if it passes in every valid sample; the worst sample is reported
  const perSample = valid.map(checkFn), names = perSample[0].map((c) => c.name), checks = names.map((n) => {
    const cs = perSample.map((s) => s.find((c) => c.name === n)).filter(Boolean), fail = cs.find((c) => c.status === "FAIL"), notRun = cs.find((c) => c.status === "NOT_RUN");
    return fail || (cs.every((c) => c.status === "NOT_RUN") ? notRun : cs.find((c) => c.status === "PASS") || notRun);
  });
  const decisive = enforceSpace ? checks : checks.filter((c) => !c.open), openChecks = checks.filter((c) => c.open);
  const status = decisive.some((c) => c.status === "FAIL") ? "FAIL" : decisive.every((c) => c.status === "NOT_RUN") ? "NOT_RUN" : decisive.some((c) => c.status === "NOT_RUN") ? "PASS_WITH_NOT_RUN" : "PASS";
  const spaceOpen = openChecks.length ? (openChecks.some((c) => c.status === "FAIL") ? "OPEN (over the limit)" : openChecks.every((c) => c.status === "NOT_RUN") ? "not measured" : "within the limit") : "–";
  rows.push({ case: kind, width: +width, arm, samples: `${valid.length}/${all.length}`, status, spaceOpen, checks, commit: data.signatures?.arms?.[arm]?.commit ?? null, build: data.signatures?.arms?.[arm]?.buildArtifact?.signature ?? null, input: data.signatures?.input?.fixtureSha256 ?? null });
}
rows.sort((a, b) => a.case.localeCompare(b.case) || a.width - b.width);
console.log(`# Recovery gate — arm ${arm}${enforceSpace ? " (space limit enforced)" : ""}\n\n| case | width | valid samples | verdict | space above the person (open task) | what failed / was not run |\n|---|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.case} | ${r.width} | ${r.samples} | **${r.status}** | ${r.spaceOpen ?? "–"} | ${r.checks.filter((c) => c.status !== "PASS" && (enforceSpace || !c.open)).map((c) => `${c.name}: ${c.status}${c.value ? " " + c.value : ""}${c.limit != null ? ` (limit ${c.limit})` : ""}${c.why ? " — " + c.why : ""}`).join("; ") || "all checks pass"} |`);
const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`\nPASS ${count("PASS")} · PASS_WITH_NOT_RUN ${count("PASS_WITH_NOT_RUN")} · FAIL ${count("FAIL")} · NOT_RUN ${count("NOT_RUN")} (limits: CLS ≤ ${LIMITS.cls}, reading place ≤ ${LIMITS.readingPx} px, failure box above the person ≤ ${LIMITS.boundPx} px + its message)`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ arm, limits: LIMITS, rows }, null, 1));
process.exit(rows.some((r) => r.status === "FAIL") ? 1 : 0);
