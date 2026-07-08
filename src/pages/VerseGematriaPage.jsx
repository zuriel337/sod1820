import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GEM, onlyHeb } from "../lib/gematria.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";

// 🔢📖 חיפוש פסוקים לפי גימטריה — מקלידים מספר (או ביטוי), והמערכת מחזירה מכל התנ״ך:
//   • פסוקים שלמים ששווים לערך (ערך מחושב-מראש בקורפוס, method=רגיל).
//   • צירופי מילים רצופות (2–6) ששווים לערך — חושב בליבת הגימטריה (GEM).
// הקורפוס: public/tanakh-verses.json (23,204 פסוקים · 39 ספרים). עץ אחד — כל תוצאה מפנה לדף המספר.
// נולד מאתגר תורת הרמז (4 מילים = 1820). רגיל=יסוד (סופיות=רגיל) — עקבי עם fn_ragil.

const ragil = w => onlyHeb(w).reduce((s, c) => s + (GEM[c] || 0), 0);
const words = txt => String(txt || "").split(/[\s־]+/).filter(Boolean);
const MIN_W = 2, MAX_W = 6, CAP_VERSES = 40, CAP_WINDOWS = 80;

export default function VerseGematriaPage() {
  const P = usePalette();
  const [corpus, setCorpus] = useState(null);   // {books, verses}
  const [loadErr, setLoadErr] = useState(false);
  const [raw, setRaw] = useState("1820");
  const [applied, setApplied] = useState(1820);
  const inputRef = useRef(null);

  useEffect(() => {
    track("verse-gematria");
    applySeo({ title: "חיפוש פסוקים לפי גימטריה — סוד 1820", description: "מקלידים מספר ומגלים את כל הפסוקים והצירופים בתנ״ך ששווים לו, מאומת במנוע.", path: "/verse-gematria" });
    fetch("/tanakh-verses.json").then(r => r.json()).then(setCorpus).catch(() => setLoadErr(true));
  }, []);

  // קלט: מספר → כערך; ביטוי עברי → מחשבים את ערכו הרגיל
  const parseTarget = (s) => {
    const t = String(s || "").trim();
    if (/^\d+$/.test(t)) return { value: +t, from: null };
    const v = ragil(t);
    return { value: v, from: v ? t : null };
  };
  const { value: target, from: fromPhrase } = useMemo(() => parseTarget(applied), [applied]);

  const results = useMemo(() => {
    if (!corpus || !target) return null;
    const { books, verses } = corpus;
    const ref = v => `${books[v[0]]} ${v[1]},${v[2]}`;
    const fullVerses = [];
    const windows = [];
    for (const v of verses) {
      if (v[4] === target && fullVerses.length < CAP_VERSES) fullVerses.push({ ref: ref(v), text: v[3] });
      if (windows.length >= CAP_WINDOWS) continue;
      const ws = words(v[3]);
      for (let n = MIN_W; n <= MAX_W && windows.length < CAP_WINDOWS; n++) {
        for (let i = 0; i + n <= ws.length; i++) {
          let sum = 0; for (let k = 0; k < n; k++) sum += ragil(ws[i + k]);
          if (sum === target) { windows.push({ ref: ref(v), n, phrase: ws.slice(i, i + n).join(" ") }); break; }
        }
      }
    }
    // הכי קצר קודם (צירוף קצר = מובהק יותר)
    windows.sort((a, b) => a.n - b.n);
    return { fullVerses, windows };
  }, [corpus, target]);

  const submit = e => { e?.preventDefault?.(); setApplied(raw.trim() || "0"); };
  const quick = n => { setRaw(String(n)); setApplied(n); inputRef.current?.blur?.(); };

  const cardBg = P.card, border = P.border;
  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: P.pageBg, color: P.ink }}>
      <style>{`
        .vg-wrap{max-width:900px;margin:0 auto;padding:26px 16px 80px}
        .vg-h1{font-family:${F.royal};font-size:clamp(23px,4vw,34px);font-weight:800;color:${P.accentText};margin:0 0 6px;text-align:center}
        .vg-sub{color:${P.inkSoft};font-family:${F.body};font-size:14.5px;line-height:1.7;text-align:center;max-width:60ch;margin:0 auto 22px}
        .vg-form{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;max-width:520px;margin:0 auto 10px}
        .vg-input{flex:1;min-width:180px;background:${P.cardSoft};border:1px solid ${P.borderStrong};border-radius:999px;color:${P.ink};font-family:${F.body};font-size:17px;padding:12px 20px;outline:none;text-align:center}
        .vg-btn{cursor:pointer;background:${P.accentBtn};color:${P.onAccent};border:none;border-radius:999px;font-family:${F.heading};font-weight:800;font-size:15px;padding:12px 26px;white-space:nowrap}
        .vg-quick{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:4px 0 24px}
        .vg-chip{cursor:pointer;background:${P.cardSoft};border:1px solid ${border};color:${P.inkSoft};font-family:${F.mono};font-size:13px;font-weight:700;padding:5px 13px;border-radius:999px;transition:.15s}
        .vg-chip:hover{border-color:${P.accent};color:${P.ink}}
        .vg-hero{text-align:center;margin:0 0 22px}
        .vg-hero .val{font-family:${F.mono};font-size:clamp(34px,8vw,56px);font-weight:800;color:${P.accentText};line-height:1}
        .vg-hero .lbl{color:${P.inkSoft};font-family:${F.heading};font-size:13px;margin-top:4px}
        .vg-hero .lbl b{color:${P.accentText}}
        .vg-sect{margin:22px 0 10px;display:flex;align-items:center;gap:9px}
        .vg-sect h2{font-family:${F.heading};font-size:15px;font-weight:800;color:${P.accentText};margin:0;white-space:nowrap}
        .vg-sect .rule{flex:1;height:1px;background:linear-gradient(90deg,${P.borderStrong},transparent)}
        .vg-sect .ct{font-family:${F.mono};font-size:12px;color:${P.muted}}
        .vg-list{display:flex;flex-direction:column;gap:9px}
        .vg-card{display:block;background:${cardBg};border:1px solid ${border};border-radius:12px;padding:11px 14px;text-decoration:none;color:inherit;transition:.15s}
        .vg-card:hover{border-color:${P.accent};transform:translateY(-1px)}
        .vg-ref{font-family:${F.heading};font-size:11.5px;font-weight:800;color:${P.accentDim};margin-bottom:4px;display:flex;align-items:center;gap:7px}
        .vg-ref .tag{background:${P.accent}1f;border:1px solid ${P.accent}55;color:${P.accentText};border-radius:999px;padding:1px 8px;font-size:10px}
        .vg-phrase{font-family:${F.regal};font-size:16px;font-weight:700;color:${P.ink};line-height:1.5}
        .vg-vtext{font-family:${F.regal};font-size:14px;color:${P.inkSoft};line-height:1.6}
        .vg-empty{color:${P.inkSoft};font-family:${F.body};text-align:center;padding:16px}
        .vg-note{margin-top:26px;color:${P.muted};font-family:${F.heading};font-size:11.5px;text-align:center;line-height:1.7}
      `}</style>

      <div className="vg-wrap">
        <h1 className="vg-h1">🔢 חיפוש פסוקים לפי גימטריה</h1>
        <p className="vg-sub">הקלידו <b>מספר</b> (או ביטוי) — והמערכת סורקת את <b>כל התנ״ך</b> ומחזירה פסוקים וצירופי-מילים רצופות ששווים לו. שיטת רגיל, מאומת במנוע.</p>

        <form className="vg-form" onSubmit={submit}>
          <input ref={inputRef} className="vg-input" value={raw} onChange={e => setRaw(e.target.value)}
            placeholder="מספר · או ביטוי…" inputMode="text" aria-label="ערך לחיפוש" dir="rtl" />
          <button className="vg-btn" type="submit">✦ חפשו</button>
        </form>
        <div className="vg-quick">
          {[1820, 86, 358, 26, 613, 541].map(n => <button key={n} className="vg-chip" onClick={() => quick(n)}>{n}</button>)}
        </div>

        {loadErr && <div className="vg-empty">שגיאה בטעינת קורפוס התנ״ך. נסו לרענן.</div>}
        {!corpus && !loadErr && <div className="vg-empty">טוען את התנ״ך (23,204 פסוקים)…</div>}

        {corpus && results && (
          <>
            <div className="vg-hero">
              <div className="val">{target.toLocaleString("he")}</div>
              <div className="lbl">
                {fromPhrase ? <>«{fromPhrase}» = <b>{target}</b> · רגיל</> : <>הערך שאתם מחפשים</>}
                {" · "}<Link to={`/number/${target}`} style={{ color: P.accentText, fontWeight: 800, textDecoration: "none" }}>לדף המספר →</Link>
              </div>
            </div>

            <div className="vg-sect"><h2>📖 פסוקים שלמים</h2><span className="ct">{results.fullVerses.length}{results.fullVerses.length >= CAP_VERSES ? "+" : ""}</span><span className="rule" /></div>
            <div className="vg-list">
              {results.fullVerses.length ? results.fullVerses.map((v, i) => (
                <Link key={i} to={`/number/${encodeURIComponent(v.text)}`} className="vg-card">
                  <div className="vg-ref">{v.ref}<span className="tag">פסוק שלם</span></div>
                  <div className="vg-vtext">{v.text}</div>
                </Link>
              )) : <div className="vg-empty">אין פסוק שלם בערך הזה — נסו את הצירופים למטה.</div>}
            </div>

            <div className="vg-sect"><h2>🧩 צירופי מילים רצופות</h2><span className="ct">{results.windows.length}{results.windows.length >= CAP_WINDOWS ? "+" : ""}</span><span className="rule" /></div>
            <div className="vg-list">
              {results.windows.length ? results.windows.map((w, i) => (
                <Link key={i} to={`/number/${encodeURIComponent(w.phrase)}`} className="vg-card">
                  <div className="vg-ref">{w.ref}<span className="tag">{w.n} מילים</span></div>
                  <div className="vg-phrase">{w.phrase}</div>
                </Link>
              )) : <div className="vg-empty">לא נמצאו צירופי מילים רצופות בערך הזה.</div>}
            </div>
          </>
        )}

        <div className="vg-note">
          נולד מאתגר «תורת הרמז» — 4 מילים רצופות = 1820. הערכים בשיטת רגיל (סופיות = רגיל), עקבי עם מנוע הגימטריה.<br />
          רוצים חיפוש אותיות (דילוגים) בכל התנ״ך? <Link to="/research?tool=els" style={{ color: P.accentText, textDecoration: "none", fontWeight: 700 }}>למחשבון הדילוגים →</Link>
        </div>
      </div>
    </div>
  );
}
