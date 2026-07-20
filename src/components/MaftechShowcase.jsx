import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { supabase, getAiAnalysis } from "../lib/supabase.js";
import { useNumHref } from "../lib/numHrefCtx.js";
import { trackAi } from "../lib/tracking.js";
import { shareOrCopy } from "../lib/share.js";
import { withRid } from "../lib/propagation.js";
import QuickActions from "./QuickActions.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";

// 🔑 שיטת המפתח — כרטיס-תצוגה חי בהיכל (lab).
// ממיר את אב-הטיפוס (HTML) לרכיב React שמונע *ישירות מהמנוע* (fn_maftech_decompose):
// עובר בין 3 מילות-הדגמה אמיתיות (רזה/הרגע/קרבים) ומציג 3 שכבות מופרדות ויזואלית —
//   ✅ עובדה (רגיל · מסתתר · קדמי + מד מוסתר↔גלוי)  ·  🔑 מפתח-האותיות (השערה)  ·  ✂️ חיתוך תת-מילים.
// חוק-ברזל (gematria_engine_law): שום ערך לא מחושב כאן — הכל נמשך מהמנוע הרשמי.
// חותם אפיסטמי: המספרים = עובדת-מנוע · משמעות-האותיות/המראה/החיתוך = שיטה פרשנית («המפתח») במצב lab.
// עץ אחד: הכרטיס הוא הדגמה בלבד — פירוק-מילה-משלך מפנה למחשבון (🔑 שם), לא משכפל.

// מילות-ההדגמה שנבחרו עם כריסטינה (09/07): כל אחת חושפת שכבה אחרת של השיטה.
const DEMO = [
  { word: "רזה", note: "רז שמתגלה — כאן ה«מוסתר» נמוך מה«גלוי» (שקיפות)" },
  { word: "הרגע", note: "קליפה נושאת יותר מהנראה — ה«מוסתר» עולה על ה«גלוי»" },
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

const clean = (s) => (s || "").replace(/[^א-ת]/g, "");

export default function MaftechShowcase() {
  const numHref = useNumHref();
  const [idx, setIdx] = useState(0);
  const [custom, setCustom] = useState("");     // מילה שהמשתמש הקליד
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [paused, setPaused] = useState(false);
  const cache = useRef({});

  // המילה הפעילה: הקלט של המשתמש גובר על מילות-ההדגמה. פחות מ-2 אותיות עבריות = עדיין בהדגמה.
  const customClean = clean(custom);
  const isCustom = customClean.length >= 2;
  const active = isCustom ? { word: customClean, note: "🔍 פירוק חי — מילה שלכם, ישר מהמנוע" } : DEMO[idx];
  const go = (i) => { setPaused(true); setCustom(""); setIdx(i); };

  // סיבוב-אוטומטי בין מילות-ההדגמה (נעצר בריחוף/מגע/פוקוס/הקלדה).
  useEffect(() => {
    if (paused || isCustom) return;
    const t = setInterval(() => setIdx(i => (i + 1) % DEMO.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, isCustom]);

  // טעינה חיה מהמנוע (debounce קטן לקלט-חופשי), עם מטמון-מילה כדי לא לחזור ל-RPC.
  useEffect(() => {
    const word = active.word;
    if (cache.current[word]) { setData(cache.current[word]); setLoading(false); setErr(false); return; }
    let live = true; setLoading(true); setErr(false);
    const t = setTimeout(() => {
      supabase.rpc("fn_maftech_decompose", { word }).then(({ data, error }) => {
        if (!live) return;
        if (error || !data || data.error) { setErr(true); setData(null); }
        else { cache.current[word] = data; setData(data); }
        setLoading(false);
      }).catch(() => { if (live) { setErr(true); setLoading(false); } });
    }, isCustom ? 400 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [active.word]); // eslint-disable-line react-hooks/exhaustive-deps

  const FT = data?.FACT || {};
  const IN = data?.INTERPRETATION || {};
  const SP = IN.sparks || {};                    // v2: {count, positions, adjacent}
  const segs = data?.segments_real_words || [];
  const revs = data?.reversals || [];            // v2: מילים שנקראות הפוך
  const meterMax = Math.max(FT.ragil || 0, FT.misratar || 0, 1);
  const hiddenOver = (FT.misratar || 0) > (FT.ragil || 0); // מוסתר>גלוי → קליפה (ענבר); אחרת שקיפות/ריפוי (טורקיז)

  // 🤖 פרשנות-AI — מפרש עובדות-מנוע בלבד (ai_analyze_contract): עובדה מופרדת מרמז, בלי נבואות.
  const [aiState, setAiState] = useState("idle"); // idle | busy | done | off
  const [aiText, setAiText] = useState(null);
  // מילה חדשה → מנקה ניתוח ישן.
  useEffect(() => { setAiState("idle"); setAiText(null); }, [active.word]);

  // בונה מחרוזת-עובדות לפרומפט: עובדות-מנוע מסומנות ✅, שכבת-המפתח מסומנת השערה.
  const buildAiFacts = () => {
    const lines = [`מילה: ${active.word}`];
    lines.push(`עובדות מנוע (מאומת): רגיל=${FT.ragil}, מסתתר=${FT.misratar}, קדמי=${FT.kadmi}.`);
    if (FT.hidden_vs_revealed) lines.push(`מוסתר↔גלוי: ${FT.hidden_vs_revealed}`);
    if ((IN.letters || []).length) lines.push(`שיטת המפתח (השערה פרשנית, לא עובדה) — מפתח האותיות: ${IN.letters.map(l => `${l.letter}=${l.meaning || "?"}`).join(" · ")}`);
    if ((IN.mirror || []).length) lines.push(`מראה (השערה): ${IN.mirror.join(", ")}`);
    if (IN.sparks_yod > 0) lines.push(`ניצוצות-יוד (השערה): ${IN.sparks_yod}`);
    if (segs.length) lines.push(`תת-מילים במאגר (עובדה): ${segs.map(s => `${s.sub}=${s.ragil}`).join(", ")}`);
    return lines.join("\n");
  };

  const runAi = async () => {
    if (aiState === "busy") return;
    if (aiState === "done") { setAiState("idle"); setAiText(null); return; } // לחיצה שנייה = הסתר
    setAiState("busy"); trackAi("research");
    const subject = active.word, facts = buildAiFacts();
    let txt = await getAiAnalysis({ kind: "research", subject, facts, fast: true });
    if (!txt) { await new Promise(r => setTimeout(r, 800)); txt = await getAiAnalysis({ kind: "research", subject, facts, again: true, fast: true }); }
    if (txt) { setAiText(txt); setAiState("done"); } else setAiState("off");
  };

  // 🕘 היסטוריית-מילים (זיכרון-שריר) — נשמרת מקומית, נרשמת רק ב«סיום» (Enter/יציאה), לא בכל הקשה.
  const [history, setHistory] = useState([]);
  useEffect(() => {
    try { const h = JSON.parse(localStorage.getItem("maftech_history") || "[]"); if (Array.isArray(h)) setHistory(h.slice(0, 10)); } catch { /* noop */ }
  }, []);
  const pushHistory = (w) => {
    const word = clean(w);
    if (word.length < 2) return;
    setHistory(prev => {
      const next = [word, ...prev.filter(x => x !== word)].slice(0, 10);
      try { localStorage.setItem("maftech_history", JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const commitCustom = () => { if (isCustom) pushHistory(customClean); };
  const clearHistory = () => { setHistory([]); try { localStorage.removeItem("maftech_history"); } catch { /* noop */ } };

  // 🔗 Deep-link: /research?tool=maftech&w=<מילה> נפתח ישר על אותה מילה (דואליות-עמוד + לולאת-שיתוף).
  const [sp] = useSearchParams();
  useEffect(() => {
    const w0 = clean(sp.get("w") || "");
    if (w0.length >= 2) { setCustom(w0); setPaused(true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔗 שיתוף המילה — URL קנוני עם &w= (OG מזריק כרטיס-תמונה ל-api/og), עם rid למדידת ויראליות.
  const shareWord = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
    const url = withRid(`${origin}/research?tool=maftech&w=${encodeURIComponent(active.word)}`);
    shareOrCopy({ title: `«${active.word}» בשיטת המפתח · סוד 1820`, url });
  };

  // ❓ אקורדיון «איך זה עובד» (Progressive Disclosure)
  const [howOpen, setHowOpen] = useState(false);

  return (
    <div style={S.wrap}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}>
      <style>{ANIM_CSS}</style>

      {/* כותרת ממותגת — כתר + זהב-עלה */}
      <div style={S.head}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>👑</span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: F.regal, fontSize: 20, fontWeight: 800, color: C.goldDeep, letterSpacing: 0.2 }}>שיטת המפתח 🔑</div>
            <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink2, marginTop: 1 }}>עדשת פירוק-אותיות — כל מילה נפתחת לשכבותיה</div>
          </div>
          <span title="שיטה פרשנית — השערה, לא אמת מוחלטת · במצב מעבדה" style={S.labBadge}>השערה · lab</span>
        </div>
      </div>

      {/* שדה-קלט — פרקו מילה משלכם, ישר בכרטיס */}
      <div style={S.inputRow}>
        <span style={S.inputIcon} aria-hidden="true">🔑</span>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onFocus={() => setPaused(true)}
          onBlur={commitCustom}
          onKeyDown={e => { if (e.key === "Enter") { commitCustom(); e.currentTarget.blur(); } }}
          placeholder="פרקו מילה משלכם בעברית…"
          aria-label="מילה לפירוק בשיטת המפתח"
          inputMode="text"
          style={S.input}
        />
        {custom && (
          <button onClick={() => { setCustom(""); setPaused(false); }} style={S.clearBtn} title="נקה" aria-label="נקה">✕</button>
        )}
      </div>
      {custom && !isCustom && <div style={S.hint}>הקלידו לפחות 2 אותיות בעברית…</div>}

      {/* 🕘 מילים אחרונות — חזרה מהירה (זיכרון-שריר) */}
      {history.length > 0 && (
        <div style={S.histRow}>
          <span style={{ fontFamily: F.body, fontSize: 11.5, fontWeight: 700, color: C.ink2 }}>🕘 אחרונות:</span>
          {history.map(w => (
            <button key={w} onClick={() => { setPaused(true); setCustom(w); }} style={{ ...S.histChip, ...(isCustom && customClean === w ? S.histChipOn : null) }}>{w}</button>
          ))}
          <button onClick={clearHistory} style={S.histClear} title="נקה היסטוריה" aria-label="נקה היסטוריה">נקה</button>
        </div>
      )}

      {/* בורר מילות-הדגמה (מוסתר כשמקלידים) */}
      {!isCustom && (
        <div style={S.chips} role="tablist" aria-label="מילות הדגמה">
          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink2 }}>או נסו הדגמה:</span>
          {DEMO.map((d, i) => (
            <button key={d.word} role="tab" aria-selected={i === idx} onClick={() => go(i)}
              style={{ ...S.chip, ...(i === idx ? S.chipOn : null) }}>{d.word}</button>
          ))}
          <span style={S.dots} aria-hidden="true">
            {DEMO.map((_, i) => (
              <span key={i} style={{ ...S.dot, ...(i === idx ? S.dotOn : null) }} />
            ))}
          </span>
          <button onClick={() => setPaused(p => !p)} style={S.playBtn}
            title={paused ? "המשך סבב אוטומטי" : "השהה סבב אוטומטי"} aria-label={paused ? "המשך" : "השהה"}>
            {paused ? "▶" : "⏸"}
          </button>
        </div>
      )}

      {/* למה המילה הזאת — נרטיב קצר לכל הדגמה */}
      <div style={S.note}>{active.note}</div>

      {loading && <div style={S.state}><span style={S.spinner} /> מפרק את «{active.word}»…</div>}
      {err && !loading && <div style={{ ...S.state, color: "#a3402f" }}>לא ניתן לפרק כרגע — נסו שוב.</div>}

      {data && !loading && (
        <div key={idx} className="mft-fade" style={{ display: "grid", gap: 11 }}>
          {/* שכבה 1 — ✅ עובדה (מאומת במנוע) + מד מוסתר↔גלוי */}
          <section style={S.layer}>
            <div style={{ ...S.layerH, color: C.green }}>✅ עובדה — מאומת במנוע</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[["רגיל", FT.ragil], ["מסתתר", FT.misratar], ["קדמי", FT.kadmi]].map(([k, v]) => (
                v ? (
                  <Link key={k} to={numHref(v)} title={`דף המספר ${v}`} style={{ ...S.factChip, textDecoration: "none" }}>
                    {k} <span style={{ color: C.ink }}>{v}</span> <span style={{ opacity: 0.5, fontSize: 10 }}>↗</span>
                  </Link>
                ) : <span key={k} style={S.factChip}>{k} —</span>
              ))}
            </div>
            {/* מד: גלוי (רגיל) מול מוסתר (מסתתר) — טורקיז=שקיפות/ריפוי · ענבר=קליפה */}
            <div style={{ display: "grid", gap: 7 }} role="img"
              aria-label={`מד מוסתר מול גלוי: רגיל ${FT.ragil ?? "?"}, מסתתר ${FT.misratar ?? "?"}`}>
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
                {IN.sparks_yod > 0 && <span style={S.sparkChip} title={SP.positions?.length ? `מיקומי-יוד: ${SP.positions.join(", ")}` : undefined}>✦ ניצוצות-יוד: {IN.sparks_yod}{SP.adjacent ? " · אשכול" : ""}</span>}
              </div>
            )}
          </section>

          {/* שכבה 3 — ✂️ חיתוך תת-מילים (לקסיקון רחב: ליבה + תנ״ך) */}
          {segs.length > 0 && (
            <section style={S.layer}>
              <div style={{ ...S.layerH, color: C.ink2 }}>✂️ חיתוך — תת-מילים במאגר <span style={{ fontWeight: 600, color: C.ink2 }}>(📖 = מופיעה בתנ״ך)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {segs.map((s, i) => (
                  <Link key={i} to={numHref(s.ragil) + (numHref(s.ragil).includes("?") ? "&" : "?") + "from=maftech"} style={S.segChip}>
                    {s.in_tanach ? "📖 " : ""}{s.sub} <span style={{ fontFamily: F.mono, color: C.goldDeep, fontWeight: 800 }}>{s.ragil}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* שכבה 4 (v2) — 🔁 היפוך: תת-מילה שנקראת הפוך כמילה מוכרת */}
          {revs.length > 0 && (
            <section style={S.layer}>
              <div style={{ ...S.layerH, color: "#7a4fb3" }}>🔁 היפוך — נקראות הפוך <span style={{ fontWeight: 600, color: C.ink2 }}>(רמז ✦)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {revs.map((r, i) => (
                  <Link key={i} to={numHref(r.ragil) + (numHref(r.ragil).includes("?") ? "&" : "?") + "from=maftech"} style={{ ...S.segChip, borderColor: "#e2d3f5", background: "#faf7fe" }} title={`«${r.sub}» הפוך = «${r.reversed}»`}>
                    {r.sub} <span style={{ color: "#7a4fb3", fontWeight: 800 }}>→ {r.reversed}</span> <span style={{ fontFamily: F.mono, color: C.goldDeep, fontWeight: 800 }}>{r.ragil}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* חותם אפיסטמי */}
          <div style={S.seal}>
            <b style={{ color: C.green }}>המספרים = עובדת-מנוע.</b> משמעות-האותיות, המראה והחיתוך = שיטה פרשנית («המפתח») במצב <b>lab</b> — השערה, לא אמת מוחלטת. ✦ סוד 1820
          </div>

          {/* 3 פעולות אחידות (research_workspace_law) — על המילה הפעילה. 🤖 נתח = פרשנות עובדות-המנוע. 🔗 = שיתוף המילה. */}
          <QuickActions entity={entityFromPhrase(active.word, FT.ragil)} onAnalyze={runAi} onShare={shareWord} />

          {/* 🤖 פרשנות-AI — מבוססת עובדות-מנוע בלבד (רמז משלים, לא עובדה) */}
          {aiState === "busy" && <div style={S.state}><span style={S.spinner} /> המנוע מנתח את «{active.word}»…</div>}
          {aiState === "off" && <div style={{ ...S.state, color: "#a3402f", padding: "12px 0" }}>הניתוח אינו זמין כרגע — נסו שוב מאוחר יותר.</div>}
          {aiState === "done" && aiText && (
            <div className="mft-fade" style={S.aiCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "#2c5fb3", fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>🔵 ניתוח AI · פרשנות</span>
                <button onClick={runAi} title="הסתר" style={{ cursor: "pointer", background: "none", border: "none", color: C.ink2, fontSize: 13 }}>▴</button>
              </div>
              <p style={{ margin: 0, color: C.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiText}</p>
              <div style={{ color: C.ink2, fontFamily: F.body, fontSize: 10.5, marginTop: 9, fontStyle: "italic" }}>
                הגימטריה = עובדה מאומתת במנוע · הפרשנות נכתבה ב-AI (רמז משלים, לא עובדה).
              </div>
            </div>
          )}
        </div>
      )}

      {/* עץ אחד — המחשבון המלא (כל 19 השיטות) לצד הפירוק כאן */}
      <div style={{ textAlign: "center", marginTop: 13 }}>
        <Link to="/research?tool=gematria" style={S.cta}>🧮 למחשבון המלא — כל השיטות ←</Link>
      </div>

      {/* ❓ איך זה עובד — Progressive Disclosure (פשוט→עמוק) */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setHowOpen(o => !o)} style={S.howToggle} aria-expanded={howOpen}>
          <span>❓ איך זה עובד?</span>
          <span style={{ transform: howOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
        </button>
        {howOpen && (
          <div className="mft-fade" style={S.howBody}>
            <p style={S.howP}><b style={{ color: C.green }}>✅ עובדה — מהמנוע הרשמי.</b> רגיל · מסתתר · קדמי מחושבים במנוע. <b>מד מוסתר↔גלוי</b> משווה את הערך הגלוי (רגיל) לנסתר (מסתתר): מוסתר נמוך = שקיפות/ריפוי (טורקיז), מוסתר גבוה = קליפה נושאת יותר (ענבר).</p>
            <p style={S.howP}><b style={{ color: C.blue }}>🔑 מפתח האותיות — השערה.</b> לכל אות משמעות בשיטה. <b>מראה</b> = אותיות שמשקפות זו את זו (ק↔א · ר↔ב · ש↔ג). <b>ניצוצות-יוד</b> = אותיות יוד כניצוץ פנימי.</p>
            <p style={S.howP}><b>✂️ חיתוך · 🔁 היפוך.</b> המילה מכילה תת-מילים מהמאגר והתנ״ך (📖). <b>היפוך</b> = תת-מילה שנקראת אחורה כמילה מוכרת.</p>
            <p style={{ ...S.howP, marginBottom: 0, color: C.goldDeep }}><b>יושר:</b> המספרים = עובדה מאומתת. משמעות-האותיות, המראה, החיתוך וההיפוך = <b>פרשנות</b> («שיטת המפתח», lab) — רמז, לא אמת מוחלטת.</p>
          </div>
        )}
      </div>
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
        <div className="mft-bar" style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.goldDeep, minWidth: 34, textAlign: "end" }}>{value ?? "—"}</span>
    </div>
  );
}

const ANIM_CSS = `
@keyframes mftFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes mftSpin { to { transform: rotate(360deg); } }
.mft-fade { animation: mftFade .28s ease; }
.mft-bar { transition: width .5s ease; }
@media (prefers-reduced-motion: reduce) {
  .mft-fade { animation: none; }
  .mft-bar { transition: none; }
}
`;

const S = {
  wrap: { maxWidth: 560, margin: "0 auto", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: "0 2px 14px rgba(20,25,40,.06)", direction: "rtl" },
  head: { borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 12 },
  labBadge: { marginInlineStart: "auto", background: C.blueSoft, border: `1px solid ${C.blueLine}`, color: C.blue, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "3px 10px" },
  inputRow: { display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "0 12px", marginBottom: 9, minHeight: 46 },
  inputIcon: { fontSize: 17, flex: "none", opacity: 0.85 },
  input: { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.regal, fontSize: 16, fontWeight: 700, color: C.ink, padding: "11px 0", minWidth: 0 },
  clearBtn: { flex: "none", cursor: "pointer", background: C.soft, border: `1px solid ${C.line}`, borderRadius: 999, color: C.ink2, fontSize: 12, fontWeight: 800, width: 26, height: 26, lineHeight: 1 },
  hint: { fontFamily: F.body, fontSize: 12, color: C.ink2, margin: "-3px 4px 10px" },
  histRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 11 },
  histChip: { cursor: "pointer", fontFamily: F.regal, fontSize: 13.5, fontWeight: 700, color: C.goldDeep, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 13px", minHeight: 34 },
  histChipOn: { color: "#fff", background: C.gold, borderColor: C.gold },
  histClear: { cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.ink2, background: "none", border: "none", textDecoration: "underline", padding: "5px 4px" },
  chips: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 8 },
  chip: { cursor: "pointer", fontFamily: F.regal, fontSize: 16, fontWeight: 700, color: C.ink2, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "0 16px", minHeight: 40 },
  chipOn: { color: "#fff", background: C.gold, borderColor: C.gold, boxShadow: "0 2px 8px -2px rgba(154,120,24,.5)" },
  dots: { display: "inline-flex", gap: 5, marginInlineStart: 4 },
  dot: { width: 7, height: 7, borderRadius: 999, background: C.line, transition: "background .2s, transform .2s" },
  dotOn: { background: C.gold, transform: "scale(1.25)" },
  playBtn: { marginInlineStart: "auto", cursor: "pointer", background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, color: C.ink2, fontSize: 12, fontWeight: 700, minWidth: 40, minHeight: 40, lineHeight: 1 },
  note: { fontFamily: F.body, fontSize: 12.5, color: C.ink2, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 11px", marginBottom: 13, lineHeight: 1.5 },
  state: { display: "flex", alignItems: "center", justifyContent: "center", gap: 9, textAlign: "center", fontFamily: F.body, fontSize: 13.5, color: C.ink2, padding: "26px 0" },
  spinner: { width: 15, height: 15, borderRadius: "50%", border: `2px solid ${C.line}`, borderTopColor: C.gold, display: "inline-block", animation: "mftSpin .7s linear infinite" },
  layer: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px" },
  layerH: { fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 8, letterSpacing: 0.2 },
  factChip: { fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.goldDeep, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 7, padding: "2px 10px" },
  letterGlyph: { fontFamily: F.regal, fontSize: 20, fontWeight: 800, color: C.goldDeep, minWidth: 24, textAlign: "center", flex: "none" },
  mirrorChip: { fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: "#7a4fb3", background: "#f4eefb", border: "1px solid #e2d3f5", borderRadius: 999, padding: "2px 10px" },
  sparkChip: { fontFamily: F.heading, fontSize: 12, fontWeight: 800, color: C.gold, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 10px" },
  segChip: { textDecoration: "none", fontFamily: F.regal, fontSize: 14, fontWeight: 700, color: C.ink, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 12px" },
  seal: { fontFamily: F.body, fontSize: 11.5, color: C.ink2, lineHeight: 1.65, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px" },
  aiCard: { background: C.blueSoft, border: `1.5px solid ${C.blueLine}`, borderRadius: 12, padding: "12px 14px" },
  cta: { display: "inline-block", textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, color: C.goldDeep, background: C.goldSoft, border: `1px solid ${C.line}`, borderRadius: 999, padding: "9px 18px", minHeight: 44, lineHeight: "26px" },
  howToggle: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: C.soft, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 13px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, color: C.ink2, minHeight: 44 },
  howBody: { background: C.card, border: `1px solid ${C.line}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "11px 13px", marginTop: -2 },
  howP: { margin: "0 0 9px", fontFamily: F.body, fontSize: 12.5, color: C.ink, lineHeight: 1.65 },
};
