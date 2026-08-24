from pathlib import Path

p = Path('src/pages/ElsWorkAreaPage.jsx')
s = p.read_text(encoding='utf-8')
original = s


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)


def replace_between(start_marker, end_marker, new_block, label):
    global s
    start = s.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker missing')
    end = s.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker missing')
    s = s[:start] + new_block + s[end:]


replace_once(
    '  const [focusMarks, setFocusMarks] = useState(false);',
    '  const [focusMarks, setFocusMarks] = useState(true);',
    'focus default',
)
replace_once(
    '  const [matrixRtl, setMatrixRtl] = useState(true);',
    '  const [matrixRtl, setMatrixRtl] = useState(true);\n'
    '  // Focus/Fit is the default research view: same canonical Snapshot, fewer DOM cells on screen.\n'
    '  // Full Matrix is always one click away; this never changes engine/search/Finding truth.\n'
    '  const [fitMatrix, setFitMatrix] = useState(true);',
    'fit state',
)
replace_once(
    '    setCellSize(30); setFocusMarks(false); setShowGrid(false); setMatrixRtl(true); setSelectedCell(null);',
    '    setCellSize(30); setFocusMarks(true); setShowGrid(false); setMatrixRtl(true); setFitMatrix(true); setSelectedCell(null);',
    'reset defaults',
)

new_rows = '''    // 📐 Focus/Fit is a renderer crop over the SAME Snapshot — never a new ELS window/search.
    //    We bound the visible rows/columns around engine-owned marks with modest context padding.
    //    Full Matrix simply renders the complete matrix.rows payload again. Absolute idx stays identical.
    const rowCount = matrix.rows.length;
    const colCount = matrix.rows.reduce((mx, row) => Math.max(mx, Array.from(row).length), 0);
    let renderRowStart = 0, renderRowEnd = Math.max(0, rowCount - 1), renderColStart = 0, renderColEnd = Math.max(0, colCount - 1);
    if (fitMatrix && S > 0 && rowCount > 0 && colCount > 0 && Array.isArray(matrix.marks) && matrix.marks.length) {
      const coords = matrix.marks.map((m) => {
        const idx = Number(m.i);
        if (!Number.isFinite(idx)) return null;
        return { r: Math.floor(idx / S) - r0, c: (idx % S) - c0 };
      }).filter((x) => x && x.r >= 0 && x.r < rowCount && x.c >= 0 && x.c < colCount);
      if (coords.length) {
        const rows = coords.map((x) => x.r), cols = coords.map((x) => x.c);
        renderRowStart = Math.max(0, Math.min(...rows) - 2);
        renderRowEnd = Math.min(rowCount - 1, Math.max(...rows) + 2);
        renderColStart = Math.max(0, Math.min(...cols) - 6);
        renderColEnd = Math.min(colCount - 1, Math.max(...cols) + 6);
      }
    }
    // 📐 גריד-תאים מחושב פעם-אחת (idx + סדר-RTL כבר-מוחל) — מקור-משותף למישור-הראשי ול-Verse.
    const rowsMeta = matrix.rows.slice(renderRowStart, renderRowEnd + 1).map((row, rOffset) => {
      const ri = renderRowStart + rOffset;
      const cells = Array.from(row).slice(renderColStart, renderColEnd + 1).map((letter, cOffset) => {
        const ci = renderColStart + cOffset;
        return { letter, ci, idx: (r0 + ri) * S + (c0 + ci) };
      });
      if (matrixRtl) cells.reverse();
      return { ri, cells };
    });
'''
replace_between(
    '    // 📐 גריד-תאים מחושב פעם-אחת',
    '    const showVersePlane =',
    new_rows,
    'rowsMeta fit crop',
)

replace_once(
    '    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : "28px 20px 70px", background: P.cardSoft, minHeight: 470 }}>',
    '    return <div className="els-native-stage" style={{ overflow: panMode ? "hidden" : "auto", cursor: panMode ? "grab" : viewMode === "3d" ? "grab" : "default", touchAction: panMode || viewMode === "3d" ? "none" : "auto", padding: viewMode === "3d" ? "72px 30px 110px" : fitMatrix ? "20px 14px 42px" : "28px 20px 70px", background: P.cardSoft, minHeight: fitMatrix ? 360 : 470 }}>',
    'stage dimensions',
)

focus_button = '<button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink }}>◎ מיקוד</button>'
fit_buttons = '<button type="button" onClick={() => setFocusMarks((v) => !v)} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: focusMarks ? P.accentBtn : "transparent", color: focusMarks ? P.onAccent : P.ink }}>◎ Focus</button>\n          <button type="button" onClick={() => setFitMatrix((v) => !v)} title={fitMatrix ? "הצג את כל Matrix Snapshot" : "חזור לתצוגה מותאמת סביב הממצאים"} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: fitMatrix ? P.accentBtn : "transparent", color: fitMatrix ? P.onAccent : P.ink }}>{fitMatrix ? "⛶ Full Matrix" : "⌖ חזרה ל-Fit"}</button>'
replace_once(focus_button, fit_buttons, 'toolbar fit controls')

reset_button = '<button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>↺ איפוס</button>\n        </div>\n      </div>'
findings_strip = '''<button type="button" onClick={resetView} style={{ minHeight: 42, borderRadius: 12, padding: "0 13px", border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft }}>↺ איפוס</button>
        </div>
        {ok && findings.length > 0 && <div style={{ ...soft, padding: "9px 10px", display: "grid", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div><span style={{ ...title, fontSize: 11.5 }}>✦ Findings</span><span style={{ ...muted, fontSize: 11.5, marginInlineStart: 7 }}>בחר ממצא כדי להפוך אותו לציר הבא</span></div>
            <span style={{ ...muted, fontSize: 10.5 }}>{fitMatrix ? "Focus/Fit · רק אזור המחקר הפעיל" : "Full Matrix · כל ה-Snapshot"}</span>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <button key={`top-${f.t}-${i}`} type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>)}</div>
        </div>}
      </div>'''
replace_once(reset_button, findings_strip, 'visible findings strip')

replace_once(
    '<span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>lenses:',
    '<span style={{ ...muted, fontSize: 11 }}>Renderer: {viewMode}</span><span style={{ ...muted, fontSize: 11 }}>view: {fitMatrix ? "Focus/Fit" : "Full Matrix"}</span><span style={{ ...muted, fontSize: 11 }}>lenses:',
    'footer fit label',
)

lower_start = s.find('    {ok && findings.length > 0 && <section style={{ ...card, padding: 14, marginTop: 12 }}><div style={title}>🧭 המשך מה־Finding</div>')
if lower_start < 0:
    raise SystemExit('lower duplicate Findings section: start marker missing')
lower_end = s.find('    {mode === "discover"', lower_start)
if lower_end < 0:
    raise SystemExit('lower duplicate Findings section: end marker missing')
s = s[:lower_start] + s[lower_end:]

if s == original:
    raise SystemExit('no code change produced')

checks = [
    'const [fitMatrix, setFitMatrix] = useState(true);',
    'fitMatrix ? "⛶ Full Matrix" : "⌖ חזרה ל-Fit"',
    'key={`top-${f.t}-${i}`}',
    'view: {fitMatrix ? "Focus/Fit" : "Full Matrix"}',
    'matrix.rows.slice(renderRowStart, renderRowEnd + 1)',
]
for check in checks:
    if check not in s:
        raise SystemExit(f'missing invariant: {check}')
if '🧭 המשך מה־Finding</div>' in s:
    raise SystemExit('duplicate lower Findings surface still present')

p.write_text(s, encoding='utf-8')
print('ELS Fit/Focus UX patch applied and source invariants passed')
