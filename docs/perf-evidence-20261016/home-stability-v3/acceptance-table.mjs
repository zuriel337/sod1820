// One row per arm per configuration from a directory of runner results (`*-AB.json`): valid samples, CLS, the exactness of the return (the block read, before and after), whether what Home shows came back the same
// (titles, headings, link destinations, image sources, gateway rows, as hashes), Forward to the same Post at the same place and the second Back, a deliberate scroll, early input, overflow and broken images.
//   node acceptance-table.mjs <dir with *-AB.json>
import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] || ".";
const median = (xs) => { xs = xs.filter((x) => x != null).sort((a, b) => a - b); return xs.length ? xs[Math.floor(xs.length / 2)] : null; };
const round = (x, n = 3) => x == null ? "–" : +x.toFixed(n);
const rows = [];
for (const file of fs.readdirSync(dir).filter((f) => /-AB\.json$/.test(f)).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), name = file.replace(/-AB\.json$/, "");
  for (const arm of ["A", "B"]) {
    const all = data.runs.filter((r) => r.arm === arm), ok = all.filter((r) => r.valid), back = ok.filter((r) => r.anchor);
    const flag = (list, fn) => list.length ? (list.every(fn) ? "yes" : "NO") : "–";
    rows.push([name, arm, `${ok.length}/${all.length}`, ok.length ? `${round(median(ok.map((r) => r.cls)))} [${round(Math.min(...ok.map((r) => r.cls)))}..${round(Math.max(...ok.map((r) => r.cls)))}]` : "–",
      back.length ? round(median(back.map((r) => r.anchor.finalDisp)), 0) : "–", flag(back.filter((r) => r.identity), (r) => r.identity.same),
      flag(back.filter((r) => r.forward), (r) => r.forward.samePost && r.forward.yDiff <= 2), back.some((r) => r.backAgain) ? Math.max(...back.map((r) => r.backAgain?.yDisp ?? 0)) : "–", flag(back.filter((r) => r.backAgain), (r) => r.backAgain.identity.same),
      flag(back.filter((r) => r.deliberate), (r) => r.deliberate.ok), back.some((r) => r.interrupt) ? back.map((r) => `${r.interrupt?.phase}:${r.interrupt?.restoreJumpsAfterInput}`).join(" ") : "–",
      ok.length ? Math.max(...ok.map((r) => r.display?.overflowX ?? 0)) : "–", ok.length ? Math.max(...ok.map((r) => r.display?.imagesBroken ?? 0)) : "–", ok.length && ok[0].readyMs ? round(median(ok.map((r) => r.readyMs?.usable)), 0) : "–",
      back.length ? round(median(back.map((r) => r.finalDocH)), 0) : "–"]);
  }
}
const head = ["configuration", "arm", "valid", "CLS median [min..max]", "block read: end displacement px", "same titles/links/images after Back", "Forward: same Post, same place", "2nd Back: displacement px", "2nd Back: same content", "deliberate scroll kept", "early input (phase:jumps after)", "overflow px", "broken images", "usable ms (first entry)", "final doc px"];
console.log(`| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|`);
for (const r of rows) console.log(`| ${r.join(" | ")} |`);
