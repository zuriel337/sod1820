from pathlib import Path
import re

p = Path('src/pages/ElsWorkAreaPage.jsx')
s = p.read_text()
original = s

def once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)

once('  const [focusMarks, setFocusMarks] = useState(false);\n  const [showGrid, setShowGrid] = useState(false);\n  const [matrixRtl, setMatrixRtl] = useState(true);',
     '  const [focusMarks, setFocusMarks] = useState(true);\n  const [showGrid, setShowGrid] = useState(false);\n  const [matrixRtl, setMatrixRtl] = useState(true);\n  // Focus/Fit is the default research view: same canonical Snapshot, fewer DOM cells on screen.\n  // Full Matrix is always one click away; this never changes engine/search/Finding truth.\n  const [fitMatrix, setFitMatrix] = useState(true);',
     'state defaults')

once('    setCellSize(30); setFocusMarks(false); setShowGrid(false); setMatrixRtl(true); setSelectedCell(null);',
     '    setCellSize(30); setFocusMarks(true); setShowGrid(false); setMatrixRtl(true); setFitMatrix(true); setSelectedCell(null);',
     'reset defaults')

old_rows = '''    // 📐 גריד-תאים מחושב פעם-אחת (idx + סדר-RTL כבר-מוחל) — מקור-משותף למישור-הראשי (ללא שינוי) ולמישור-\n    //    ה-Verse-context החדש, כדי ששני המישורים יתיישרו מרחבית בדיוק (אותה שורה/עמודה בדיוק לכל idx).\n    const rowsMeta = matrix.rows.map((row, ri) => {\n      const cells = Array.from(row).map((letter, ci) => ({ letter, ci, idx: (r0 + ri) * S + (c0 + ci) }));\n      if (matrixRtl) cells.reverse();\n      return { ri, cells };\n    });'''
new_rows = '''    // 📐 Focus/Fit is a renderer crop over the SAME Snapshot — never a new ELS window/search.\n    //    We bound the visible rows/columns around engine-owned marks with modest context padding.\n    //    Full Matrix simply renders the complete matrix.rows payload again. Absolute idx stays identical.\n    const rowCount = matrix.rows.length;\n    const colCount = matrix.rows.reduce((mx, row) => Math.max(mx, Array.from(row).length), 0);\n    let renderRowStart = 0, renderRowEnd = Math.max(0, rowCount - 1), renderColStart = 0, renderColEnd = Math.max(0, colCount - 1);\n    if (fitMatrix && S > 0 && rowCount > 0 && colCount > 0 && Array.isArray(matrix.marks) && matrix.marks.length) {\n      const coords = matrix.marks.map((m) => {\n        const idx = Number(m.i);\n        if (!Number.isFinite(idx)) return null;\n        return { r: Math.floor(idx / S) - r0, c: (idx % S) - c0 };\n      }).filter((x) => x && x.r >= 0 && x.r < rowCount && x.c >= 0 && x.c < colCount);\n      if (coords.length) {\n        const rows = coords.map((x) => x.r), cols = coords.map((x) => x.c);\n        renderRowStart = Math.max(0, Math.min(...rows) - 2);\n        renderRowEnd = Math.min(rowCount - 1, Math.max(...rows) + 2);\n        renderColStart = Math.max(0, Math.min(...cols) - 6);\n        renderColEnd = Math.min(colCount - 1, Math.max(...cols) + 6);\n      }\n    }\n    // 📐 גריד-תאים מחושב פעם-אחת (idx + סדר-RTL כבר-מוחל) — מקור-משותף למישור-הראשי ול-Verse.\n    const rowsMeta = matrix.rows.slice(renderRowStart, renderRowEnd + 1).map((row, rOffset) => {\n      const ri = renderRowStart + rOffset;\n      const cells = Array.from(row).slice(renderColStart, renderColEnd + 1).map((letter, cOffset) => {\n        const ci = renderColStart + cOffset;\n        return { letter, ci, idx: (r0 + ri) * S + (c0 + ci) };\n      });\n      if (matrixRtl) cells.reverse();\n      return { ri, cells };\n    });'''
once(old_rows, new_rows, 'rowsMeta fit crop')

once('    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : "28px 20px 70px", background: P.cardSoft, minHeight: 470 }}>',
     '    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : fitMatrix ? "20px 14px 42px" : "28px 20px 70px", background: P.cardSoft, minHeight: fitMatrix ? 360 : 470 }}>',
     'stage fit dimensions')

once('          <button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink }}>◎ מיקוד</button>\n          <button type="button" onClick={() => setShowGrid((v) => !v)}',
     '          <button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink }}>◎ Focus</button>\n          <button type="button" onClick={() => setFitMatrix((v) => !v)} title={fitMatrix ? "הצג את כל Matrix Snapshot" : "חזור לתצוגה מותאמת סביב הממצאים"} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: fitMatrix ? P.accentBtn : "transparent", color: fitMatrix ? P.onAccent : P.ink }}>{fitMatrix ? "⌖ Fit" : "⛶ Full Matrix"}</button>\n          <button type="button" onClick={() => setShowGrid((v) => !v)}',
     'toolbar fit button')

toolbar_end = '''          <button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>↺ איפוס</button>\n        </div>\n      </div>\n      {s?.status === "empty" ?'''
toolbar_new = '''          <button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>↺ איפוס</button>\n        </div>\n        {ok && findings.length > 0 && <div style={{ ...soft, padding: "9px 10px", display: "grid", gap: 7 }}>\n          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>\n            <div><span style={{ ...title, fontSize: 11.5 }}>✦ Findings</span><span style={{ ...muted, fontSize: 11.5, marginInlineStart: 7 }}>בחר ממצא כדי להפוך אותו לציר הבא</span></div>\n            <span style={{ ...muted, fontSize: 10.5 }}>{fitMatrix ? "Focus/Fit · רק אזור המחקר הפעיל" : "Full Matrix · כל ה-Snapshot"}</span>\n          </div>\n          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <button key={`top-${f.t}-${i}`} type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>)}</div>\n        </div>}\n      </div>\n      {s?.status === "empty" ?'''
once(toolbar_end, toolbar_new, 'visible findings strip')

once('<span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>lenses:',
     '<span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>view: {fitMatrix ? "Focus/Fit" : "Full Matrix"}</span><span style={{ ...muted, fontSize: 11 }}>lenses:',
     'footer fit label')

old_lower = re.compile(r'''\n\s*\{ok && findings\.length > 0 && <section style=\{\{ \.\.\.card, padding: 14, marginTop: 12 \}\}><div style=\{title\}>🧭 המשך מה־Finding</div>.*?</section>\}\n\n    \{mode === "discover"''', re.S)
m = old_lower.search(s)
if not m:
    raise SystemExit('lower duplicate findings section: no match')
s = s[:m.start()] + '\n\n    {mode === "discover"' + s[m.end():]

if s == original:
    raise SystemExit('no code change produced')
p.write_text(s)

checks = [
    'const [fitMatrix, setFitMatrix] = useState(true);',
    '"⌖ Fit" : "⛶ Full Matrix"',
    'key={`top-${f.t}-${i}`}',
    'view: {fitMatrix ? "Focus/Fit" : "Full Matrix"}',
]
for c in checks:
    if c not in s:
        raise SystemExit(f'missing check: {c}')
if '🧭 המשך מה־Finding</div>' in s:
    raise SystemExit('duplicate lower Findings surface still present')
print('ELS Fit/Focus UX patch applied and source invariants passed')
