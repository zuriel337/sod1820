from pathlib import Path

p = Path('src/pages/ElsWorkAreaPage.jsx')
s = p.read_text()

repls = [
('import { buildJourneyPromotion, buildJourneyRestore, journeyAnchorMatches } from "../lib/elsJourney.js";\n',
 'import { buildJourneyPromotion, buildJourneyRestore, journeyAnchorMatches } from "../lib/elsJourney.js";\nimport { useUniversalWorkspace } from "../lib/research/useUniversalWorkspace.js";\nimport { elsStateToUniversalFindings } from "../lib/research/universalFinding.js";\n'),
('export default function ElsWorkAreaPage() {\n  const P = usePalette();\n',
 'export default function ElsWorkAreaPage() {\n  const P = usePalette();\n  const workspace = useUniversalWorkspace();\n'),
('  const promoteFinding = (finding) => {\n',
 '''  const addFindingToWorkspace = (finding) => {\n    const exact = elsStateToUniversalFindings(s, { inputRef: axis.hitId })\n      .filter((uf) => uf.view?.rendererHints?.role === "finding" && uf.subject?.label === finding?.t);\n    if (!exact.length) { setFindingMessage("לממצא הזה אין כרגע מופע מדויק שאפשר להוסיף למחקר."); return; }\n    workspace.upsertFinding(exact[0]);\n    setFindingMessage(`📌 «${finding.t}» נוסף למחקר עם העוגן המדויק שלו.`);\n  };\n\n  const promoteFinding = (finding) => {\n'''),
('          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <button key={`top-${f.t}-${i}`} type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>)}</div>\n',
 '''          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <div key={`top-${f.t}-${i}`} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>\n            <button type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>\n            <button type="button" disabled={!Array.isArray(f.shown) || !f.shown.length} onClick={() => addFindingToWorkspace(f)} title="שמור את המופע המדויק ב-Workspace הגלובלי" style={{ minHeight: 42, borderRadius: 12, padding: "0 10px", border: `1px solid ${P.border}`, background: "transparent", color: P.accentText, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}>📌 למחקר</button>\n          </div>)}</div>\n''')
]

for old, new in repls:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly 1 match, got {count}: {old[:100]!r}')
    s = s.replace(old, new, 1)

p.write_text(s)
print('patched ElsWorkAreaPage.jsx')
