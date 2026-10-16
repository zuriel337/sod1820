// One row per arm per configuration from a directory of runner results (`*-AB.json`): valid samples, CLS, the exactness of the return (the block read, before and after), whether what Home shows came back the same
// (titles, headings, link destinations, image sources, gateway rows, as hashes), Forward to the same Post at the same place and the second Back, a deliberate scroll, early input, overflow and broken images.
//   node acceptance-table.mjs <dir with *-AB.json>
//   node acceptance-table.mjs <dir> --closing    the closing round's view: the return CLS (max, never only the best), Home's width on the first visit and at the end, the capsule, the remembered boxes still held,
//                                                the document with and without the failure's reserved space (first return, then the fresh entry), the capsule probe, and the signatures of every file
import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] || ".";
const CLOSING = process.argv.includes("--closing");
const median = (xs) => { xs = xs.filter((x) => x != null).sort((a, b) => a - b); return xs.length ? xs[Math.floor(xs.length / 2)] : null; };
const round = (x, n = 3) => x == null ? "–" : +x.toFixed(n);
if (CLOSING) {
  const uniq = (xs) => [...new Set(xs.filter((x) => x != null))];
  const max = (xs) => { xs = xs.filter((x) => x != null); return xs.length ? Math.max(...xs) : null; };
  const mode = (cls) => (cls || "").includes("is-peek") ? "peek" : (cls || "").includes("is-pinned") ? "pinned" : (cls || "").includes("is-slim") ? "slim" : "–";
  const rowsC = [], sigs = [];
  for (const file of fs.readdirSync(dir).filter((f) => /-AB\.json$/.test(f)).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), name = file.replace(/-AB\.json$/, "");
    sigs.push([name, data.profile?.profile ?? "mobile", data.profile?.viewport, ...["A", "B"].flatMap((arm) => { const a = data.signatures?.arms?.[arm]; return [a?.commit?.slice(0, 8) ?? "null", a?.buildArtifact?.signature?.slice(0, 12) ?? "null"]; }), data.signatures?.input?.fixtureSha256?.slice(0, 12) ?? "null", data.signatures?.input?.corpusClass ?? "null", data.signatures?.tool?.repoHead?.slice(0, 8) ?? "null", data.signatures?.environment?.browser ?? "null"]);
    for (const arm of ["A", "B"]) {
      const all = data.runs.filter((r) => r.arm === arm), ok = all.filter((r) => r.valid);
      if (data.runs[0]?.mode === "load") { rowsC.push([name, arm, `${ok.length}/${all.length}`, `load: CLS max ${max(ok.map((r) => r.cls)) ?? "–"}`, ...Array(9).fill("–")]); continue; }
      const again = ok.filter((r) => r.backAgain), caps = ok.filter((r) => r.capsule?.present);
      const capCell = caps.length ? caps.map((r) => `${mode(r.capsule.start.companionCls)}→hover ${mode(r.capsule.hover.companionCls)}${r.capsule.hover.railPresent ? "+rail" : "-NO RAIL"}, content ${uniq([r.capsule.start.contentW, r.capsule.hover.contentW, r.capsule.leave.contentW]).join("/")}→leave ${mode(r.capsule.leave.companionCls)}`).slice(0, 1).join("") : "–";
      rowsC.push([name, arm, `${ok.length}/${all.length}`, ok.length ? `${round(median(ok.map((r) => r.cls)))} (max ${round(max(ok.map((r) => r.cls)))})` : "–",
        ok.some((r) => r.frameFirstVisit?.h29) ? `${uniq(ok.map((r) => r.frameFirstVisit?.h29?.w)).join("/")} → ${uniq(ok.map((r) => r.frameAtEnd?.h29?.w)).join("/")}` : "–",
        ok.some((r) => r.frameAtEnd) ? uniq(ok.map((r) => mode(r.frameAtEnd?.companionCls))).join("/") : "–",
        ok.some((r) => r.holdsAtEnd) ? `${median(ok.map((r) => (r.holdsAtEnd || []).filter((h) => h.v !== "").length))}/${median(ok.map((r) => (r.holdsAtEnd || []).length))}` : "–",
        ok.some((r) => r.reading) ? `${max(ok.map((r) => r.reading?.displacement))}` : "–",
        ok.length ? `${round(median(ok.map((r) => r.depart?.docH)), 0)} → ${round(median(ok.map((r) => r.finalDocH)), 0)}` : "–",
        again.length ? `CLS max ${round(max(again.map((r) => r.backAgain.cls)))}, doc ${round(median(again.map((r) => r.backAgain.docH)), 0)}, block ${max(again.map((r) => r.backAgain.block?.displacement)) ?? "–"}px, same ${again.every((r) => r.backAgain.identity?.same) ? "yes" : "NO"}` : "–",
        ok.some((r) => r.forward) ? `${ok.every((r) => r.forward?.samePost) ? "same Post" : "NO"}, ${max(ok.map((r) => r.forward?.yDiff))}px` : "–",
        ok.some((r) => r.deliberate) ? (ok.every((r) => r.deliberate?.ok) ? "yes" : "NO") : "–",
        ok.some((r) => r.interrupt) ? ok.map((r) => `${r.interrupt?.inputKind ?? "touch"}:${r.interrupt?.phase}:${r.interrupt?.restoreJumpsAfterInput}`).join(" ") : "–",
        capCell]);
    }
  }
  const headC = ["configuration", "arm", "valid", "return CLS median (max)", "Home column px: first visit → end", "capsule at end", "boxes still held (median)", "block read: displacement px", "document px: before leaving → end", "fresh entry (second return)", "Forward", "deliberate scroll", "input cancels restore (kind:phase:jumps after)", "capsule probe (hover)"];
  console.log(`| ${headC.join(" | ")} |\n|${headC.map(() => "---").join("|")}|`);
  for (const r of rowsC) console.log(`| ${r.join(" | ")} |`);
  const headS = ["configuration", "profile", "viewport", "A commit", "A build signature", "B commit", "B build signature", "input sha256", "corpus", "tool repo HEAD", "browser"];
  console.log(`\n### Signatures (every result file carries its own; null = not known, never filled in afterwards)\n\n| ${headS.join(" | ")} |\n|${headS.map(() => "---").join("|")}|`);
  for (const r of sigs) console.log(`| ${r.join(" | ")} |`);
  process.exit(0);
}
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
