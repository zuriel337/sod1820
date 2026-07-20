import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { useNumHref } from "../lib/numHrefCtx.js";

// 🔑 שיטת המפתח — כרטיס-תצוגה חי בהיכל (lab).
// ממיר את אב-הטיפוס (HTML) לרכיב React שמונע *ישירות מהמנוע* (fn_maftech_decompose):
// עובר בין 3 מילות-הדגמה אמיתיות (רזה · הרגע · קרבים) ומציג 3 שכבות מופרדות ויזואלית —
//   ✅ עובדה (רגיל · מסתתר · קדמי + מד מוסתר↔גלוי)  ·  🔑 מפתח-האותיות (השערה)  ·  ✂️ חיתוך תת-מילים.
// חוק-ברזל (gematria_engine_law): שום ערך לא מחושב כאן — הכל נמשך מהמנוע הרשמי.
// חותם אפיסטמי: המספרים = עובדת-מנוע · משמעות-האותיות/המראה/החיתוך = שיטה פרשנית («המפתח») במצב lab.

// מילות-ההדגמה שנבחרו עם כריסטינה (09/07): כל אחת חושפת שכבה אחרת של השיטה.
const DEMO = [
  { word: "רזה", note: "רז שמתגלה — מוסתר נמוך מגלוי (שקיפות)" },
  { word: "הרגע", note: "קליפה נושאת יותר מהנראה — מוסתר עולה על גלוי" },
  { word: "קרבים", note: "ניצוץ-יוד פנימי + חיתוך עשיר לתת-מילים" },
];
const ROTATE_MS = 7000;

// פלטת-ההיכל (בהיר-נקי) עם נגיעת-זהב מלכותית — עקבי עם research_workspace_law.
const C = {
  card: "var(--card,#ffffff)", line: "var(--line,#e4e7ec)", ink: "var(--ink,#1b1d22)",
  ink2: "var(--ink2,#5b6472)", soft: "#f7f8fa", gold: "#9a7818", goldDeep: "#7a5e12",
  goldSoft: "#fbf3da", blue: "#2c5fb3", blueSoft: "#eef3fb", blueLine: "#cfe0fb",
  teal: "#1f9d8f", amber: "#d9902a", green: "#1f9d57",
};

export default function MaftechShowcase() {
  const numHref = useNumHref();
  const [idx, setIdx] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [paused, setPaused] = useState(false);
  const cache = useRef({});

  const active = DEMO[idx];

  // סיבוב-אוטומטי בין מילות-ההדגמה (נעצר בריחוף/מגע).
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % DEMO.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  // טעינה חיה מהמנוע, עם מטמון-מילה כדי לא לחזור ל-RPC על אותה מילה.
  useEffect(() => {
    const word = active.word;
    if (cache.current[word]) { setData(cache.current[word]); setLoading(false); setErr(false); return; }
    let live = true; setLoading(true); setErr(false);
    supabase.rpc("fn_maftech_decompose", { word }).then(({ data, error }) => {
      if (!live) return;
      if (error || !data || data.error) { setErr(true); setData(null); }
      else { cache.current[word] = data; setData(data); }
      setLoading(false);
    }).catch(() => { if (live) { setErr(true); setLoading(false); } });
    return () => { live = false; };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const FT = data?.FACT || {};
  const IN = data?.INTERPRETATION || {};
  const segs = data?.segments_real_words || [];
  const meterMax = Math.max(FT.ragil || 0, FT.misratar || 0, 1);
  const hiddenOver = (FT.misratar || 0) > (FT.ragil || 0); // מוסתר>גלוי → קליפה (ענבר); אחרת שקיפות/ריפוי (טורקיז)

  return (
    <div style={S.wrap} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* כותרת ממותגת — כתר + זהב-עלה */}
      <div style={S.head}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>👑</span>
          <div>
            <div style={{ fontFamily: F.regal, fontSize: 20, fontWeight: 800, color: C.goldDeep, letterSpacing: 0.2 }}>שיטת המפתח 🔑</div>
            <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink2, marginTop: 1 }}>עדשת פירוק-אותיות — כל מילה נפתחת לשכבותיה</div>
          </div>
          <span title="שיטה פרשנית — השערה, לא אמת מוחלטת · במצב מעבדה" style={S.labBadge}>השערה · lab</span>
        </div>
      </div>

      {/* בורר מילות-הדגמה */}
      <div style={S.chips} role="tablist" aria-label="מילות הדגמה">
        {DEMO.map((d, i) => (
          <button key={d.word} role="tab" aria-selected={i === idx} onClick={() => { setPaused(true); setIdx(i); }}
            style={{ ...S.chip, ...(i === idx ? S.chipOn : null) }}>{d.word}</button>
        ))}
        <span style={S.rotHint}>{paused ? "⏸ מושהה" : "↻ מתחלף"}</span>
      </div>

      {loading && <div style={S.state}>מפרק את «{active.word}»…</div>}
      {err && !loading && <div style={{ ...S.state, color: "#a3402f" }}>לא ניתן לפרק כרגע — נסו שוב.</div>}

      {data && !loading && (
        <div style={{ display: "grid", gap: 11 }}>
          {/* שכבה 1 — ✅ עובדה (מאומת במנוע) + מד מוסתר↔גלוי */}
          <section style={S.layer}>
            <div style={{ ...S.layerH, color: C.green }}>✅ עובדה — מאומת במנוע</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[["רגיל", FT.ragil], ["מסתתר", FT.misratar], ["קדמי", FT.kadmi]].map(([k, v]) => (
                <span key={k} style={S.factChip}>{k} <span style={{ color: C.ink }}>{v ?? "—"}</span></span>
              ))}
            </div>
            {/* מד: גלוי (רגיל) מול מוסתר (מסתתר) — טורקיז=שקיפות/ריפוי · ענבר=קליפה */}
            <div style={{ display: "grid", gap: 7 }}>
              <MeterRow label="גלוי" sub="רגיל" value={FT.ragil} pct={(FT.ragil || 0) / meterMax * 100} color={C.gold} />
              <MeterRow label="מוסתר" sub="מסתתר" value={FT.misratar} pct={(FT.misratar || 0) / meterMax * 100} color={hiddenOver ? C.amber : C.teal} />
            </div>
            {FT.hidden_vs_revealed && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: hiddenOver ? C.amber : C.teal, flex: "none" }} />
                <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink2, lineHeight: 1.5 }}>{FT.hidden_vs_revealed}</span>
              </div>
            )}
          </section>

          {/* שכבה 2 — 🔑 מפתח האותיות (השערה) */}
          <section style={S.layer}>
            <div style={{ ...S.layerH, color: C.blue }}>🔑 מפתח האותיות — השערה</div>
            <div style={{ display: "grid", gap: 6 }}>
              {(IN.letters || []).map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "baseline" }}>
                  <span style={S.letterGlyph}>{l.letter}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{l.meaning || <em style={{ color: C.ink2 }}>—</em>}</span>
                </div>
              ))}
            </div>
            {((IN.mirror || []).length > 0 || IN.sparks_yod > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                {(IN.mirror || []).map((m, i) => (
                  <span key={i} style={S.mirrorChip}>מראה {m}</span>
                ))}
                {IN.sparks_yod > 0 && <span style={S.sparkChip}>✦ ניצוצות-יוד: {IN.sparks_yod}</span>}
              </div>
            )}
          </section>

          {/* שכבה 3 — ✂️ חיתוך תת-מילים */}
          {segs.length > 0 && (
            <section style={S.layer}>
              <div style={{ ...S.layerH, color: C.ink2 }}>✂️ חיתוך — תת-מילים במאגר</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {segs.map((s, i) => (
                  <Link key={i} to={numHref(s.ragil) + (numHref(s.ragil).includes("?") ? "&" : "?") + "from=maftech"} style={S.segChip}>
                    {s.sub} <span style={{ fontFamily: F.mono, color: C.goldDeep, fontWeight: 800 }}>{s.ragil}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* חותם אפיסטמי */}
          <div style={S.seal}>
            <b style={{ color: C.green }}>המספרים = עובדת-מנוע.</b> משמעות-האותיות, המראה והחיתוך = שיטה פרשנית («המפתח») במצב <b>lab</b> — השערה, לא אמת מוחלטת. ✦ סוד 1820
          </div>
        </div>
      )}
    </div>
  );
}

function MeterRow({ label, sub, value, pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span style={{ fontFamily: F.heading, fontSize: 12, fontWeight: 800, color: C.ink, minWidth: 46, textAlign: "start" }}>
        {label} <span style={{ fontFamily: F.body, fontSize: 10.5, fontWeight: 600, color: C.ink2 }}>({sub})</span>
      </span>
      <div style={{ flex: 1, height: 12, background: C.soft, borderRadius: 999, overflow: "hidden", border: `1px solid ${C.line}` }}>
        <div style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s ease" }} />
      </div>
      <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.goldDeep, minWidth: 34, textAlign: "end" }}>{value ?? "—"}</span>
    </div>
  );
}

const S = {
  wrap: { maxWidth: 560, margin: "0 auto", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: "0 2px 14px rgba(20,25,40,.06)", direction: "rtl" },
  head: { borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 12 },
  labBadge: { marginInlineStart: "auto", background: C.blueSoft, border: `1px solid ${C.blueLine}`, color: C.blue, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "3px 10px" },
  chips: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 13 },
  chip: { cursor: "pointer", fontFamily: F.regal, fontSize: 16, fontWeight: 700, color: C.ink2, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 16px" },
  chipOn: { color: "#fff", background: C.gold, borderColor: C.gold, boxShadow: "0 2px 8px -2px rgba(154,120,24,.5)" },
  rotHint: { marginInlineStart: "auto", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ink2 },
  state: { textAlign: "center", fontFamily: F.body, fontSize: 13.5, color: C.ink2, padding: "26px 0" },
  layer: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px" },
  layerH: { fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 8, letterSpacing: 0.2 },
  factChip: { fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.goldDeep, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 7, padding: "2px 10px" },
  letterGlyph: { fontFamily: F.regal, fontSize: 20, fontWeight: 800, color: C.goldDeep, minWidth: 24, textAlign: "center", flex: "none" },
  mirrorChip: { fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: "#7a4fb3", background: "#f4eefb", border: "1px solid #e2d3f5", borderRadius: 999, padding: "2px 10px" },
  sparkChip: { fontFamily: F.heading, fontSize: 12, fontWeight: 800, color: C.gold, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 10px" },
  segChip: { textDecoration: "none", fontFamily: F.regal, fontSize: 14, fontWeight: 700, color: C.ink, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 12px" },
  seal: { fontFamily: F.body, fontSize: 11.5, color: C.ink2, lineHeight: 1.65, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px" },
};
