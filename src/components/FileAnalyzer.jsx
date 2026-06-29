import React, { useState, useCallback, useMemo } from "react";
import { METHODS, onlyHeb } from "../lib/gematria.js";
import { entityFromPhrase } from "../lib/research/entity.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { getGematriaByValues } from "../lib/supabase.js";

// 📊 ניתוח קובץ — העלאת אקסל/CSV עם רשימת ביטויים → המנוע מחשב גימטריה לכל שורה,
// מוצא התכנסויות (אותו ערך), מצליב מול מאגר האתר, ומאפשר לצרף הכל ל«המחקר הפעיל».
// עץ אחד: כל ביטוי = ישות. המנוע הרשמי בלבד (gematria.js) — לא מחשבים מהזיכרון.

const RAGIL = METHODS.find(m => m.key === "רגיל");
const SHOW = ["רגיל", "מילוי", "סידורי", "אתבש", "ריבוע", "קדמי"]; // עמודות ברירת-מחדל
const baseCols = SHOW.map(k => METHODS.find(m => m.key === k)).filter(Boolean);
const hasHeb = s => /[א-ת]/.test(String(s || ""));
const num = s => { const clean = String(s).replace(/[^\d.-]/g, ""); if (!/\d/.test(clean)) return null; const n = Number(clean); return Number.isFinite(n) ? n : null; };

// פירוק טקסט גולמי (CSV/TSV/הדבקה) → מטריצת תאים. הפרדן נקבע מכל הקובץ.
function parseText(txt) {
  const lines = String(txt).split(/\r?\n/).filter(l => l.trim() !== "");
  const delim = lines.some(l => l.includes("\t")) ? "\t" : lines.some(l => l.includes(",")) ? "," : null;
  return lines.map(l => delim ? l.split(delim).map(c => c.trim().replace(/^"|"$/g, "")) : [l.trim()]);
}

// ניחוש-עמודות: עמודת-הביטוי = הכי הרבה תאים עבריים · עמודת-הערך = הכי הרבה מספרים (אחרת).
function guessCols(matrix) {
  const n = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  const heb = Array(n).fill(0), nums = Array(n).fill(0);
  for (const r of matrix) for (let c = 0; c < n; c++) { const v = r[c]; if (hasHeb(v)) heb[c]++; else if (num(v) != null) nums[c]++; }
  const phraseCol = heb.length ? heb.indexOf(Math.max(...heb)) : 0;
  let valueCol = -1, best = 0;
  for (let c = 0; c < n; c++) if (c !== phraseCol && nums[c] > best) { best = nums[c]; valueCol = c; }
  // זיהוי-כותרות אוטומטי: שורה ראשונה ללא מספרים, אך הגוף עם מספרים → כנראה שמות-עמודות
  const r0 = matrix[0] || [], r1 = matrix[1] || [];
  const header = matrix.length > 1 && !r0.some(v => num(v) != null) && r1.some(v => num(v) != null);
  return { phraseCol, valueCol, header, ncols: n };
}

function analyze(matrix, cfg) {
  const rows = cfg.header ? matrix.slice(1) : matrix;
  const items = [];
  for (const cells of rows) {
    const phrase = String(cfg.phraseCol >= 0 ? (cells[cfg.phraseCol] ?? "") : (cells.find(hasHeb) ?? "")).trim();
    if (!phrase || !onlyHeb(phrase).length) continue;
    const given = cfg.valueCol >= 0 ? num(cells[cfg.valueCol]) : null;
    const values = {};
    for (const m of METHODS) { try { values[m.key] = m.fn(phrase); } catch { values[m.key] = null; } }
    items.push({ phrase, given, ragil: RAGIL.fn(phrase), values });
  }
  const byVal = {};
  for (const it of items) (byVal[it.ragil] ||= []).push(it.phrase);
  const convergences = Object.entries(byVal)
    .filter(([, arr]) => new Set(arr).size >= 2)
    .map(([v, arr]) => ({ value: +v, phrases: [...new Set(arr)] }))
    .sort((a, b) => b.phrases.length - a.phrases.length);
  const matches = items.filter(it => it.given != null && it.given === it.ragil);
  return { items, convergences, matches };
}

export default function FileAnalyzer() {
  const { addToResearch } = useResearch();
  const [raw, setRaw] = useState(null);     // מטריצת התאים הגולמית
  const [cfg, setCfg] = useState(null);     // { phraseCol, valueCol, header, ncols }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const [allCols, setAllCols] = useState(false);
  const [drag, setDrag] = useState(false);
  const [cross, setCross] = useState(null);   // Map value→[ביטויים מהאתר]
  const [crossBusy, setCrossBusy] = useState(false);

  const data = useMemo(() => (raw && cfg ? analyze(raw, cfg) : null), [raw, cfg]);

  const load = useCallback(matrix => {
    if (!matrix.length) { setErr("הקובץ ריק."); setRaw(null); return; }
    const g = guessCols(matrix);
    if (matrix.every(r => !r.some(hasHeb))) { setErr("לא נמצאו ביטויים בעברית. ודאו שיש עמודה עם מילים/שמות."); setRaw(null); return; }
    setErr(""); setCross(null); setRaw(matrix); setCfg(g);
  }, []);

  const onFile = useCallback(async file => {
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const name = (file.name || "").toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.startsWith("text")) {
        load(parseText(await file.text()));
      } else {
        const XLSX = await import("xlsx"); // טעינה עצלה — לא מנפח את ה-bundle הראשי
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        load(rows.map(r => (r || []).map(c => (c == null ? "" : String(c)))));
      }
    } catch (e) { setErr("שגיאה בקריאת הקובץ: " + (e?.message || e)); }
    finally { setBusy(false); }
  }, [load]);

  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }, [onFile]);
  const setCol = patch => { setCfg(c => ({ ...c, ...patch })); setCross(null); };

  // 🔗 הצלבה מול מאגר האתר — לכל ערך, אילו ביטויים אחרים באתר שווים לו
  const crossSearch = useCallback(async () => {
    if (!data) return;
    setCrossBusy(true);
    try {
      const ownByVal = {};
      for (const it of data.items) (ownByVal[it.ragil] ||= new Set()).add(it.phrase);
      const map = await getGematriaByValues(data.items.map(it => it.ragil));
      const out = new Map();
      for (const [val, phrases] of map) {
        const extra = [...new Set(phrases)].filter(p => !ownByVal[val]?.has(p));
        if (extra.length) out.set(val, extra);
      }
      setCross(out);
    } catch (e) { setErr("הצלבה נכשלה: " + (e?.message || e)); }
    finally { setCrossBusy(false); }
  }, [data]);

  const addAll = () => { data?.items.forEach(it => addToResearch?.(entityFromPhrase(it.phrase, it.ragil))); };
  const exportCsv = () => {
    if (!data) return;
    const ms = allCols ? METHODS : baseCols;
    const head = ["ביטוי", "ערך-נתון", ...ms.map(m => m.key)];
    const lines = [head.join(",")].concat(data.items.map(it =>
      [it.phrase, it.given ?? "", ...ms.map(m => it.values[m.key] ?? "")].join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gematria-analysis.csv"; a.click();
  };

  const shown = allCols ? METHODS : baseCols;
  const convSet = useMemo(() => new Set(data?.convergences.flatMap(c => c.phrases) || []), [data]);
  const hasGiven = !!data?.items.some(i => i.given != null);
  const sample = raw && (cfg.header ? raw[1] : raw[0]) || [];
  const crossCount = cross ? cross.size : 0;

  return (
    <div className="rw-card fa">
      <style>{FA_CSS}</style>
      <div className="fa-head">
        <div>
          <div className="fa-t">📊 ניתוח קובץ גימטריה</div>
          <div className="rw-muted">העלו אקסל / CSV עם עמודת מילים או שמות — המנוע מחשב גימטריה לכל שורה, מוצא התכנסויות, מצליב מול מאגר האתר, ומאפשר לצרף הכל למחקר. <b>חישוב מאומת במנוע הרשמי.</b></div>
        </div>
      </div>

      <div className={"fa-drop" + (drag ? " on" : "")}
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
        <div className="fa-drop-ic">⬆️</div>
        <div><b>גררו לכאן קובץ</b> או</div>
        <label className="fa-btn">
          בחרו קובץ (xlsx · xls · csv)
          <input type="file" accept=".xlsx,.xls,.csv,.txt,text/csv" style={{ display: "none" }}
            onChange={e => onFile(e.target.files?.[0])} />
        </label>
        {busy && <div className="rw-muted" style={{ marginTop: 8 }}>קורא ומחשב…</div>}
      </div>

      <details className="fa-paste">
        <summary>או הדביקו רשימה (מילה בכל שורה, או «מילה,ערך»)</summary>
        <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5} placeholder={"ישראל\nאברהם\nתורה,611"} />
        <button className="fa-btn" onClick={() => load(parseText(paste))} disabled={!paste.trim()}>נתח את ההדבקה</button>
      </details>

      {err && <div className="fa-err">⚠️ {err}</div>}

      {/* 🎯 בורר-עמודות — מופיע כשבקובץ יותר מעמודה אחת. ניחוש אוטומטי, ניתן לתיקון. */}
      {data && cfg.ncols > 1 && (
        <div className="fa-picker">
          <span className="fa-pk-t">🎯 עמודות:</span>
          <label>ביטוי
            <select value={cfg.phraseCol} onChange={e => setCol({ phraseCol: +e.target.value })}>
              {Array.from({ length: cfg.ncols }, (_, c) => <option key={c} value={c}>עמודה {c + 1}{sample[c] ? ` · ${String(sample[c]).slice(0, 10)}` : ""}</option>)}
            </select>
          </label>
          <label>ערך (להשוואה)
            <select value={cfg.valueCol} onChange={e => setCol({ valueCol: +e.target.value })}>
              <option value={-1}>— ללא —</option>
              {Array.from({ length: cfg.ncols }, (_, c) => <option key={c} value={c}>עמודה {c + 1}{sample[c] ? ` · ${String(sample[c]).slice(0, 10)}` : ""}</option>)}
            </select>
          </label>
          <label className="fa-pk-chk"><input type="checkbox" checked={cfg.header} onChange={e => setCol({ header: e.target.checked })} /> שורה ראשונה = כותרות</label>
        </div>
      )}

      {data && (
        <>
          <div className="fa-sum">
            <span className="fa-stat"><b>{data.items.length}</b> ביטויים</span>
            <span className="fa-stat conv"><b>{data.convergences.length}</b> התכנסויות בקובץ</span>
            {data.matches.length > 0 && <span className="fa-stat match"><b>{data.matches.length}</b> תואמים לערך-הנתון</span>}
            {cross && <span className="fa-stat cross"><b>{crossCount}</b> ערכים נפגשים עם האתר</span>}
            <span className="fa-spacer" />
            <button className="fa-mini" onClick={() => setAllCols(v => !v)}>{allCols ? "פחות עמודות" : "כל 11 השיטות"}</button>
            <button className="fa-mini pri" onClick={crossSearch} disabled={crossBusy}>{crossBusy ? "מצליב…" : "🔗 הצלב מול האתר"}</button>
            <button className="fa-mini" onClick={addAll}>➕ צרף הכל למחקר</button>
            <button className="fa-mini" onClick={exportCsv}>⬇️ ייצוא CSV</button>
          </div>

          {data.convergences.length > 0 && (
            <div className="fa-convs">
              <div className="fa-convs-t">🧩 התכנסויות בתוך הקובץ — ביטויים בעלי אותו ערך (רגיל)</div>
              {data.convergences.slice(0, 12).map(c => (
                <div key={c.value} className="fa-conv">
                  <a className="fa-val" href={`/number/${c.value}`} target="_blank" rel="noreferrer">{c.value.toLocaleString("he")}</a>
                  <span className="fa-conv-ph">{c.phrases.join(" = ")}</span>
                </div>
              ))}
              {data.convergences.length > 12 && <div className="rw-muted">…ועוד {data.convergences.length - 12} התכנסויות</div>}
            </div>
          )}

          {cross && (
            <div className="fa-convs cross">
              <div className="fa-convs-t cross">🔗 הצלבות מול מאגר האתר — מי עוד שווה לערכים שלכם</div>
              {crossCount === 0
                ? <div className="rw-muted">אף ערך בקובץ לא נפגש (עדיין) עם ביטוי אחר במאגר. ככל שהמאגר גדל — יהיו יותר מפגשים.</div>
                : [...cross.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 14).map(([val, phrases]) => (
                    <div key={val} className="fa-conv">
                      <a className="fa-val cross" href={`/number/${val}`} target="_blank" rel="noreferrer">{val.toLocaleString("he")}</a>
                      <span className="fa-conv-ph">{phrases.slice(0, 8).join(" · ")}{phrases.length > 8 ? ` +${phrases.length - 8}` : ""}</span>
                    </div>
                  ))}
            </div>
          )}

          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead><tr><th>ביטוי</th>{hasGiven && <th>נתון</th>}{shown.map(m => <th key={m.key}>{m.key}</th>)}<th /></tr></thead>
              <tbody>
                {data.items.map((it, i) => {
                  const inConv = convSet.has(it.phrase);
                  const inCross = cross?.has(it.ragil);
                  return (
                    <tr key={i} className={inConv ? "conv" : ""}>
                      <td className="fa-ph">{it.phrase}
                        {inConv && <span className="fa-dot" title="חלק מהתכנסות בקובץ">🧩</span>}
                        {inCross && <span className="fa-dot" title="נפגש עם ביטוי במאגר האתר">🔗</span>}
                      </td>
                      {hasGiven && <td className={it.given != null && it.given === it.ragil ? "fa-ok" : ""}>{it.given ?? ""}</td>}
                      {shown.map(m => <td key={m.key} className={m.key === "רגיל" ? "fa-ragil" : ""}>{it.values[m.key]?.toLocaleString("he") ?? ""}</td>)}
                      <td><a className="fa-mini link" href={`/number/${it.ragil}`} target="_blank" rel="noreferrer">פתח →</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const FA_CSS = `
.fa{max-width:none}
.fa-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}
.fa-t{font-size:19px;font-weight:800;color:var(--rw-ink,#1b1d22);margin-bottom:3px}
.fa-drop{border:2px dashed var(--rw-line,#d9cfb8);border-radius:14px;padding:26px;text-align:center;background:var(--rw-soft,#faf7ef);transition:.15s}
.fa-drop.on{border-color:var(--acc,#2f6df6);background:#eef4ff}
.fa-drop-ic{font-size:30px;margin-bottom:6px}
.fa-btn{display:inline-block;margin-top:10px;background:var(--acc,#2f6df6);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-weight:700;cursor:pointer;font-size:14px}
.fa-btn:disabled{opacity:.5;cursor:default}
.fa-paste{margin-top:12px}
.fa-paste summary{cursor:pointer;color:var(--rw-muted,#5b6472);font-size:13px}
.fa-paste textarea{width:100%;margin-top:8px;border:1px solid var(--rw-line,#d9cfb8);border-radius:9px;padding:10px;font-size:15px;font-family:inherit;resize:vertical;direction:rtl}
.fa-err{margin-top:12px;background:#fdecec;color:#a01f2e;border-radius:9px;padding:10px 12px;font-size:14px}
.fa-picker{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px;background:var(--rw-soft,#f6f2e8);border:1px solid var(--rw-line,#ece4d3);border-radius:10px;padding:10px 14px;font-size:13px}
.fa-pk-t{font-weight:800;color:var(--rw-ink,#1b1d22)}
.fa-picker label{display:flex;align-items:center;gap:6px;color:var(--rw-muted,#5b6472);font-weight:600}
.fa-picker select{border:1px solid var(--rw-line,#d9cfb8);border-radius:7px;padding:4px 8px;font-family:inherit;font-size:13px;background:#fff}
.fa-pk-chk{cursor:pointer}
.fa-sum{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0 10px}
.fa-stat{background:var(--rw-soft,#f1ece0);border-radius:8px;padding:5px 11px;font-size:13px;color:var(--rw-muted,#5b6472)}
.fa-stat b{color:var(--rw-ink,#1b1d22);font-size:15px}
.fa-stat.conv b{color:#6b3fa0}.fa-stat.match b{color:#1f7a4d}.fa-stat.cross b{color:#1f6feb}
.fa-spacer{flex:1}
.fa-mini{background:#fff;border:1px solid var(--rw-line,#d9cfb8);border-radius:8px;padding:5px 10px;font-size:12.5px;cursor:pointer;color:var(--rw-ink,#1b1d22);font-weight:600}
.fa-mini.pri{background:var(--acc,#2f6df6);color:#fff;border-color:transparent}
.fa-mini:disabled{opacity:.6;cursor:default}
.fa-mini.link{border:none;background:none;color:var(--acc,#2f6df6);padding:0}
.fa-convs{background:#f7f3ff;border:1px solid #e6dcff;border-radius:12px;padding:12px 14px;margin:8px 0 14px}
.fa-convs.cross{background:#eef5ff;border-color:#d6e4ff}
.fa-convs-t{font-weight:800;color:#6b3fa0;margin-bottom:8px;font-size:14px}
.fa-convs-t.cross{color:#1f6feb}
.fa-conv{display:flex;align-items:center;gap:10px;padding:4px 0;flex-wrap:wrap}
.fa-val{font-weight:800;color:#6b3fa0;min-width:54px;text-decoration:none}
.fa-val.cross{color:#1f6feb}
.fa-conv-ph{color:var(--rw-ink,#1b1d22)}
.fa-tablewrap{overflow-x:auto;border:1px solid var(--rw-line,#ece4d3);border-radius:12px}
.fa-table{border-collapse:collapse;width:100%;font-size:14px}
.fa-table th{background:var(--rw-soft,#f6f2e8);text-align:right;padding:8px 12px;font-weight:700;color:var(--rw-muted,#5b6472);white-space:nowrap;position:sticky;top:0}
.fa-table td{padding:7px 12px;border-top:1px solid var(--rw-line,#f0eadc);white-space:nowrap}
.fa-table tr.conv{background:#faf7ff}
.fa-ph{font-weight:700;color:var(--rw-ink,#1b1d22)}
.fa-dot{margin-inline-start:5px;font-size:11px}
.fa-ragil{font-weight:800;color:var(--acc,#2f6df6)}
.fa-ok{color:#1f7a4d;font-weight:700}
`;
