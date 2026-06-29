import React, { useState, useCallback, useMemo } from "react";
import { METHODS, onlyHeb } from "../lib/gematria.js";
import { entityFromPhrase } from "../lib/research/entity.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";

// 📊 ניתוח קובץ — העלאת אקסל/CSV עם רשימת ביטויים → המנוע מחשב גימטריה לכל שורה,
// מוצא התכנסויות (אותו ערך), ומאפשר לצרף הכל ל«המחקר הפעיל». עץ אחד: כל ביטוי = ישות.
// המנוע הרשמי בלבד (gematria.js) — לא מחשבים מהזיכרון (gematria_engine_law).

const RAGIL = METHODS.find(m => m.key === "רגיל");
const SHOW = ["רגיל", "מילוי", "סידורי", "אתבש", "ריבוע", "קדמי"]; // עמודות ברירת-מחדל
const cols = SHOW.map(k => METHODS.find(m => m.key === k)).filter(Boolean);
const hasHeb = s => /[א-ת]/.test(String(s || ""));
const num = s => { const clean = String(s).replace(/[^\d.-]/g, ""); if (!/\d/.test(clean)) return null; const n = Number(clean); return Number.isFinite(n) ? n : null; };

// פירוק טקסט גולמי (CSV/TSV/הדבקה) → מטריצת תאים
function parseText(txt) {
  const lines = String(txt).split(/\r?\n/).filter(l => l.trim() !== "");
  // הפרדן נקבע מכל הקובץ (לא משורה אחת) — שורה ראשונה בלי פסיק לא תבטל פיצול בהמשך
  const delim = lines.some(l => l.includes("\t")) ? "\t" : lines.some(l => l.includes(",")) ? "," : null;
  return lines.map(l => delim ? l.split(delim).map(c => c.trim().replace(/^"|"$/g, "")) : [l.trim()]);
}

// משורת-תאים → { phrase, given } : התא העברי הראשון = הביטוי, מספר נתון (אם יש) = להשוואה
function rowToItem(cells) {
  const phrase = cells.find(hasHeb);
  if (!phrase) return null;
  // ערך-נתון = התא הראשון שהוא מספר טהור (לא עברי) — להשוואה מול חישוב המנוע
  const givenCell = cells.find(c => !hasHeb(c) && num(c) != null);
  return { phrase: String(phrase).trim(), given: givenCell != null ? num(givenCell) : null };
}

function analyze(matrix) {
  const items = [];
  for (const cells of matrix) {
    const it = rowToItem(cells);
    if (!it || !onlyHeb(it.phrase).length) continue;
    const values = {};
    for (const m of METHODS) { try { values[m.key] = m.fn(it.phrase); } catch { values[m.key] = null; } }
    items.push({ ...it, ragil: RAGIL.fn(it.phrase), values });
  }
  // התכנסויות: ערך רגיל שחוזר ב-≥2 ביטויים שונים
  const byVal = {};
  for (const it of items) (byVal[it.ragil] ||= []).push(it.phrase);
  const convergences = Object.entries(byVal)
    .filter(([, arr]) => new Set(arr).size >= 2)
    .map(([v, arr]) => ({ value: +v, phrases: [...new Set(arr)] }))
    .sort((a, b) => b.phrases.length - a.phrases.length);
  // התאמות לערך-נתון בקובץ (אימות עמודת-מספר מול המנוע)
  const matches = items.filter(it => it.given != null && it.given === it.ragil);
  return { items, convergences, matches };
}

export default function FileAnalyzer() {
  const { addToResearch } = useResearch();
  const [data, setData] = useState(null); // { items, convergences, matches }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const [allCols, setAllCols] = useState(false);
  const [drag, setDrag] = useState(false);

  const run = useCallback(matrix => {
    const res = analyze(matrix);
    if (!res.items.length) { setErr("לא נמצאו ביטויים בעברית בקובץ. ודאו שיש עמודה עם מילים/שמות."); setData(null); }
    else { setErr(""); setData(res); }
  }, []);

  const onFile = useCallback(async file => {
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const name = (file.name || "").toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.startsWith("text")) {
        run(parseText(await file.text()));
      } else {
        const XLSX = await import("xlsx"); // טעינה עצלה — לא מנפח את ה-bundle הראשי
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        run(rows.map(r => (r || []).map(c => (c == null ? "" : String(c)))));
      }
    } catch (e) { setErr("שגיאה בקריאת הקובץ: " + (e?.message || e)); }
    finally { setBusy(false); }
  }, [run]);

  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }, [onFile]);

  const addAll = () => { data?.items.forEach(it => addToResearch?.(entityFromPhrase(it.phrase, it.ragil))); };
  const exportCsv = () => {
    if (!data) return;
    const head = ["ביטוי", "ערך-נתון", ...(allCols ? METHODS : cols).map(m => m.key)];
    const lines = [head.join(",")].concat(data.items.map(it =>
      [it.phrase, it.given ?? "", ...(allCols ? METHODS : cols).map(m => it.values[m.key] ?? "")].join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gematria-analysis.csv"; a.click();
  };

  const shown = allCols ? METHODS : cols;
  const convSet = useMemo(() => new Set(data?.convergences.flatMap(c => c.phrases) || []), [data]);

  return (
    <div className="rw-card fa">
      <style>{FA_CSS}</style>
      <div className="fa-head">
        <div>
          <div className="fa-t">📊 ניתוח קובץ גימטריה</div>
          <div className="rw-muted">העלו אקסל / CSV עם עמודת מילים או שמות — המנוע מחשב גימטריה לכל שורה, מוצא התכנסויות, ומאפשר לצרף הכל למחקר. <b>חישוב מאומת במנוע הרשמי.</b></div>
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
        <button className="fa-btn" onClick={() => run(parseText(paste))} disabled={!paste.trim()}>נתח את ההדבקה</button>
      </details>

      {err && <div className="fa-err">⚠️ {err}</div>}

      {data && (
        <>
          <div className="fa-sum">
            <span className="fa-stat"><b>{data.items.length}</b> ביטויים</span>
            <span className="fa-stat conv"><b>{data.convergences.length}</b> התכנסויות</span>
            {data.matches.length > 0 && <span className="fa-stat match"><b>{data.matches.length}</b> תואמים לערך-הנתון</span>}
            <span className="fa-spacer" />
            <button className="fa-mini" onClick={() => setAllCols(v => !v)}>{allCols ? "פחות עמודות" : "כל 11 השיטות"}</button>
            <button className="fa-mini" onClick={addAll}>➕ צרף הכל למחקר</button>
            <button className="fa-mini" onClick={exportCsv}>⬇️ ייצוא CSV</button>
          </div>

          {data.convergences.length > 0 && (
            <div className="fa-convs">
              <div className="fa-convs-t">🧩 התכנסויות — ביטויים בעלי אותו ערך (רגיל)</div>
              {data.convergences.slice(0, 12).map(c => (
                <div key={c.value} className="fa-conv">
                  <a className="fa-val" href={`/number/${c.value}`} target="_blank" rel="noreferrer">{c.value.toLocaleString("he")}</a>
                  <span className="fa-conv-ph">{c.phrases.join(" = ")}</span>
                </div>
              ))}
              {data.convergences.length > 12 && <div className="rw-muted">…ועוד {data.convergences.length - 12} התכנסויות</div>}
            </div>
          )}

          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead><tr><th>ביטוי</th>{data.items.some(i => i.given != null) && <th>נתון</th>}{shown.map(m => <th key={m.key}>{m.key}</th>)}<th /></tr></thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i} className={convSet.has(it.phrase) ? "conv" : ""}>
                    <td className="fa-ph">{it.phrase}{convSet.has(it.phrase) && <span className="fa-dot" title="חלק מהתכנסות">🧩</span>}</td>
                    {data.items.some(x => x.given != null) && <td className={it.given === it.ragil ? "fa-ok" : ""}>{it.given ?? ""}</td>}
                    {shown.map(m => <td key={m.key} className={m.key === "רגיל" ? "fa-ragil" : ""}>{it.values[m.key]?.toLocaleString("he") ?? ""}</td>)}
                    <td><a className="fa-mini link" href={`/number/${it.ragil}`} target="_blank" rel="noreferrer">פתח →</a></td>
                  </tr>
                ))}
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
.fa-sum{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0 10px}
.fa-stat{background:var(--rw-soft,#f1ece0);border-radius:8px;padding:5px 11px;font-size:13px;color:var(--rw-muted,#5b6472)}
.fa-stat b{color:var(--rw-ink,#1b1d22);font-size:15px}
.fa-stat.conv b{color:#6b3fa0}.fa-stat.match b{color:#1f7a4d}
.fa-spacer{flex:1}
.fa-mini{background:#fff;border:1px solid var(--rw-line,#d9cfb8);border-radius:8px;padding:5px 10px;font-size:12.5px;cursor:pointer;color:var(--rw-ink,#1b1d22);font-weight:600}
.fa-mini.link{border:none;background:none;color:var(--acc,#2f6df6);padding:0}
.fa-convs{background:#f7f3ff;border:1px solid #e6dcff;border-radius:12px;padding:12px 14px;margin:8px 0 14px}
.fa-convs-t{font-weight:800;color:#6b3fa0;margin-bottom:8px;font-size:14px}
.fa-conv{display:flex;align-items:center;gap:10px;padding:4px 0;flex-wrap:wrap}
.fa-val{font-weight:800;color:#6b3fa0;min-width:54px;text-decoration:none}
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
