import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { englishAll, EN_TAGS, hasLatin } from "../lib/englishGematria.js";
import { hebrewLatinOptions } from "../lib/translit.js";
import { getAiAnalysis, getValuePhraseList, getNameResearch } from "../lib/supabase.js";
import { getWordCrossFacts } from "../lib/deepAnalysis.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";

// 🧪 מעבדת השם — לא «מחשבון שמות» אלא מעבדת מחקר. השאלה: «מה אפשר לגלות על השם הזה?»
// הסדר (החלטת צוריאל): שם → סיכום-AI (חוקר מלווה) → מחקר → התכנסויות → גשרים → הקשר → אישי → לאן ממשיכים.
// שלב 2 (עדיפות צוריאל): 🌉 גשרים חוצי-שפות (הכי חשוב) · 📚 הקשר · 🌳 אישי · «לאן ממשיכים מכאן?».

const C = { bg: "#f6f7f9", card: "#ffffff", ink: "#1b1d22", dim: "#5b6472", line: "#e4e7ec", blue: "#2f6df6", gold: "#b78900" };
const F = { h: "'Heebo',system-ui,sans-serif", m: "ui-monospace,SFMono-Regular,monospace" };

const HEB = [...METHODS, ...DEPTH_METHODS].map(m => ({
  key: m.key, tag: "hebrew",
  explain: [m.sub, m.soul].filter(Boolean).join(" — "),
  fn: m.fn,
}));

const REL = { shared_value: "ערך משותף", transliteration: "תעתוק", translation: "תרגום", anagram: "אנגרם", cognate: "שורש משותף" };
const LANG = { en: "אנגלית", ru: "רוסית", ar: "ערבית", gr: "יוונית", la: "לטינית" };
const FLAG = { en: "🇺🇸", ru: "🇷🇺", ar: "🇸🇦", gr: "🇬🇷", la: "🏛️" };

function tagChip(tag) {
  const t = EN_TAGS[tag] || EN_TAGS.modern;
  return <span title={t.label} style={{ fontSize: 11 }}>{t.icon}</span>;
}

function MethodRow({ m, value, openKey, setOpen }) {
  const open = openKey === (m.key + m.tag);
  const t = EN_TAGS[m.tag] || EN_TAGS.modern;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 11px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {tagChip(m.tag)}
        <span style={{ color: C.ink, fontFamily: F.h, fontSize: 13.5, fontWeight: 800 }}>{m.he || m.key}</span>
        {m.label && <span style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11 }}>{m.label}</span>}
        <span style={{ flex: 1 }} />
        <b style={{ fontFamily: F.m, color: C.blue, fontSize: 16 }}>{value}</b>
        <button onClick={() => setOpen(open ? null : m.key + m.tag)} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 999, color: C.dim, fontSize: 12, fontWeight: 700, width: 22, height: 22, lineHeight: "20px", padding: 0 }}>{open ? "×" : "?"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px dashed ${C.line}`, color: "#3a4553", fontFamily: F.h, fontSize: 12.5, lineHeight: 1.7 }}>
          <b style={{ color: C.blue }}>{t.icon} {t.label}</b> · {m.explain}
        </div>
      )}
    </div>
  );
}

function Section({ n, icon, title, sub, children }) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,25,40,.04)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: sub ? 3 : 12 }}>
        <span style={{ color: "#c3c8d0", fontFamily: F.m, fontSize: 13, fontWeight: 700 }}>{n}</span>
        <h2 style={{ color: C.ink, fontFamily: F.h, fontSize: 19, fontWeight: 800, margin: 0 }}>{icon} {title}</h2>
      </div>
      {sub && <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12.5, marginBottom: 12 }}>{sub}</div>}
      {children}
    </section>
  );
}

// 🌉 גשר חוצה-שפות — כרטיס. עברית ↔ לועזית, סוג-קשר, ערך, והערת-החוקר.
function BridgeCard({ b, myWord }) {
  const rel = REL[b.relationship_type] || b.relationship_type;
  const flag = FLAG[b.lang] || "🌐";
  const lang = LANG[b.lang] || b.lang;
  const cross = String(b.foreign_word || "");
  return (
    <div style={{ background: "linear-gradient(180deg,#fbfdff,#f3f7ff)", border: `1px solid #d9e5ff`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.h, fontSize: 17, fontWeight: 800, color: C.ink }}>{b.hebrew}</span>
        <span style={{ color: C.blue, fontSize: 15, fontWeight: 800 }}>↔</span>
        <span style={{ fontFamily: F.h, fontSize: 16, fontWeight: 800, color: "#8a5a1f" }}>{flag} {cross}</span>
        <span style={{ flex: 1 }} />
        <b style={{ fontFamily: F.m, color: C.blue, fontSize: 17 }}>{b.gematria_he}</b>
      </div>
      {/* פרובננס — הגשר כישות מחקר: שפה·קשר · שיטה · רמת-ראיות · אימות. לא רק שוויון. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 6px" }}>
        <span style={{ background: "#eaf0fb", border: "1px solid #cfe0fb", borderRadius: 999, color: "#2c5fb3", fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }}>{lang} · {rel}</span>
        {b.method && <span style={{ background: "#f2eefb", border: "1px solid #ddd0f2", borderRadius: 999, color: "#6a4fbf", fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }}>📐 {b.method}</span>}
        {b.evidence_level && <span style={{ background: b.evidence_level === "strong" ? "#e8f6ee" : "#fff8e6", border: `1px solid ${b.evidence_level === "strong" ? "#bfe4cd" : "#f0e2b8"}`, borderRadius: 999, color: b.evidence_level === "strong" ? "#1f8a4c" : "#8a5a1f", fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }}>ראיות: {b.evidence_level === "strong" ? "חזקה" : b.evidence_level === "medium" ? "בינונית" : "ראשונית"}</span>}
        <span style={{ background: b.human_verified ? "#e8f6ee" : "#f4f5f7", border: `1px solid ${b.human_verified ? "#bfe4cd" : C.line}`, borderRadius: 999, color: b.human_verified ? "#1f8a4c" : "#8a94a6", fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }} title={b.human_verified ? "אושר ע\"י אוצר/צוריאל" : "נמצא ע\"י המנוע — ממתין לאימות אנושי"}>{b.human_verified ? "✓ מאומת" : "⏳ ממתין לאישור"}</span>
      </div>
      {b.note && <div style={{ color: "#3a4553", fontFamily: F.h, fontSize: 12.5, lineHeight: 1.65 }}>{b.note}</div>}
      {/* מסלול-חקירה: הגשר הוא צומת ברשת — לא סוף, אלא פתח */}
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11, fontWeight: 700 }}>מסלול:</span>
        <Link to={`/name-lab?w=${encodeURIComponent(cross)}`} style={{ textDecoration: "none", background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, color: C.blue, fontFamily: F.h, fontSize: 12, fontWeight: 800, padding: "5px 12px" }}>🔬 «{cross}»</Link>
        <span style={{ color: "#c3c8d0" }}>→</span>
        <Link to={`/number/${b.gematria_he}`} style={{ textDecoration: "none", background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, color: C.dim, fontFamily: F.h, fontSize: 12, fontWeight: 700, padding: "5px 12px" }}>ערך {b.gematria_he}</Link>
        <span style={{ color: "#c3c8d0" }}>→</span>
        <span style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 11, fontWeight: 700 }}>מושגים · פוסטים · אוצרות</span>
      </div>
    </div>
  );
}

// 🎯 מד עומק ההצלבה — כמה שכבות עצמאיות מצטלבות על השם. צבע לפי עוצמה.
function DepthGauge({ depth }) {
  if (!depth) return null;
  const s = depth.score;
  const col = s >= 70 ? "#1f8a4c" : s >= 40 ? "#b78900" : "#5b6472";
  const level = s >= 70 ? "הצלבה עשירה" : s >= 40 ? "הצלבה בינונית" : s >= 15 ? "הצלבה מתחילה" : "מעט הצלבות";
  return (
    <section style={{ background: "linear-gradient(180deg,#fbfdff,#f3f7ff)", border: `1px solid #d9e5ff`, borderRadius: 16, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0, borderRadius: "50%", background: `conic-gradient(${col} ${s * 3.6}deg, #e4e7ec 0deg)` }}>
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <b style={{ fontFamily: F.m, fontSize: 19, color: col, lineHeight: 1 }}>{s}</b>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontFamily: F.h, fontSize: 16, fontWeight: 800, color: C.ink }}>🎯 עומק ההצלבה</span>
            <span style={{ fontFamily: F.h, fontSize: 12.5, fontWeight: 800, color: col }}>{level}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
            {depth.parts.map((p, i) => (
              <span key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, fontFamily: F.h, fontSize: 11.5, fontWeight: 700, color: C.dim, padding: "2px 9px" }}>{p.label} <b style={{ color: C.blue }}>{p.n}</b></span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ color: "#8a94a6", fontFamily: F.h, fontSize: 11.5, lineHeight: 1.6, marginTop: 10 }}>
        המדד סופר <b>שכבות שמצטלבות</b> על השם (התכנסויות · גשרים · פוסטים · חידושים · אוצרות) — לא כמה שיטות נותנות מספר זהה, ולא «כמה זה נכון». ציון גבוה = השם מחובר לעוד פינות בעץ, נקודת-פתיחה עשירה למחקר.
      </div>
    </section>
  );
}

export default function NameLabPage() {
  const [sp, setSp] = useSearchParams();
  const [word, setWord] = useState((sp.get("w") || "").trim());
  const [editing, setEditing] = useState(!word);
  const [openKey, setOpen] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState("idle"); // idle|busy|done|off
  const [conv, setConv] = useState(null);
  const [convCount, setConvCount] = useState(0);
  const [research, setResearch] = useState(null); // {bridges,posts,treasures,hints,...} | false=err
  const [enWord, setEnWord] = useState(null);      // איות-אנגלית שנבחר לשם עברי (תעתוק מוצהר)
  const { addToResearch, saveItem, isPinned, togglePin } = useResearch();

  useEffect(() => { document.title = "מעבדת השם · סוד 1820"; }, []);

  const hebVals = useMemo(() => word ? HEB.map(m => ({ ...m, value: m.fn(word) })) : [], [word]);
  const regVal = hebVals[0]?.value || 0;
  const heInput = !!word && !hasLatin(word);           // קלט עברי טהור → מציעים תעתוק לאנגלית
  const translitOpts = useMemo(() => heInput ? hebrewLatinOptions(word) : [], [heInput, word]);

  // ערכי-אנגלית: קלט לטיני → ישיר; קלט עברי → על האיות שנבחר (enWord), אם נבחר.
  const enSource = hasLatin(word) ? word : (enWord || "");
  const enVals = useMemo(() => enSource ? englishAll(enSource) : [], [enSource]);
  const enOrdinal = enVals[0]?.value || 0;
  // 💫 גשר-חי בין-שפתי: ערך-האנגלית (אורדינלי) שווה לערך העברי הרגיל = התכנסות חוצת-שפה אמיתית.
  const liveBridge = enOrdinal > 0 && enOrdinal === regVal;

  // התכנסויות מאומתות — המילים ששוות לערך הרגיל (בתוך המספר).
  useEffect(() => {
    let live = true; setConv(null); setConvCount(0);
    if (regVal >= 10) getValuePhraseList(regVal).then(list => {
      if (!live) return;
      const phrases = (list || []).map(x => x.phrase).filter(p => p && p !== word);
      setConvCount(phrases.length);
      setConv(phrases.slice(0, 24));
    }).catch(() => live && setConv([]));
    return () => { live = false; };
  }, [regVal, word]);

  // איפוס בחירת-האיות כשמחליפים שם; ברירת-מחדל = האופציה הראשונה (המשתמש יכול לשנות).
  useEffect(() => { setEnWord(heInput && translitOpts.length ? translitOpts[0] : null); }, [word, heInput, translitOpts]);

  // 🎯 עומק ההצלבה (0-100) — כמה *שכבות עצמאיות* מצטלבות על השם. לא ספירת-שיטות, לא «אמת»:
  // מודד עושר-החיבור בגרף (התכנסויות + גשרים + פוסטים + חידושים + אוצרות + גשר-חי).
  const depth = useMemo(() => {
    if (!word) return null;
    const r = research || {};
    const parts = [
      { k: "conv", label: "התכנסויות בערך", n: convCount, pts: Math.min(convCount, 40) },
      { k: "bridge", label: "גשרים מאומתים", n: (r.bridges || []).length, pts: (r.bridges || []).length * 12 },
      { k: "live", label: "גשר-חי בין-שפתי", n: liveBridge ? 1 : 0, pts: liveBridge ? 14 : 0 },
      { k: "posts", label: "פוסטים", n: r.posts_count || 0, pts: Math.min(r.posts_count || 0, 15) },
      { k: "hints", label: "חידושים", n: r.hints_count || 0, pts: Math.min(r.hints_count || 0, 5) * 2 },
      { k: "treas", label: "אוצרות", n: r.treasures_count || 0, pts: Math.min(r.treasures_count || 0, 3) * 3 },
    ];
    const score = Math.min(100, parts.reduce((a, p) => a + p.pts, 0));
    return { score, parts: parts.filter(p => p.n > 0) };
  }, [word, research, convCount, liveBridge]);

  // 🌉📚 מחקר הקשר + גשרים — RPC אחד (עץ אחד: השם כשער לגרף).
  useEffect(() => {
    let live = true; setResearch(null);
    if (word) getNameResearch(word, regVal).then(r => live && setResearch(r || false)).catch(() => live && setResearch(false));
    return () => { live = false; };
  }, [word, regVal]);

  const analyze = useCallback(async () => {
    if (!word || aiState === "busy") return;
    setAiState("busy"); setAi(null);
    // הרכבת עובדות ל-AI + הנחיית «חוקר מלווה» (למה מעניין, מאיזו שיטה, מקורהּ, מה לחקור).
    const topHeb = hebVals.slice(0, 8).map(m => `${m.key}=${m.value}`).join(" · ");
    const enLabel = hasLatin(word) ? word : enWord;
    const enLine = enVals.length ? `\nאנגלית (${enLabel}${heInput ? ", תעתוק מוצהר" : ""}): ` + enVals.map(m => `${m.label}=${m.value} (${EN_TAGS[m.tag]?.label})`).join(" · ") + (liveBridge ? ` — ⚡ ערך-האנגלית האורדינלי (${enOrdinal}) שווה לערך העברי הרגיל (${regVal})!` : "") : "";
    const convLine = (conv && conv.length) ? `\nהתכנסויות (רגיל=${regVal}): ${conv.slice(0, 12).join(", ")}` : "";
    const br = research && research.bridges ? research.bridges : [];
    const brLine = br.length ? `\nגשרים חוצי-שפות: ${br.map(b => `${b.hebrew}↔${b.foreign_word} (${LANG[b.lang] || b.lang}, ${REL[b.relationship_type] || b.relationship_type}, ${b.gematria_he})`).join(" · ")}` : "";
    const ctxLine = research ? `\nהקשר בגרף: ${research.posts_count || 0} פוסטים · ${research.treasures_count || 0} אוצרות · ${research.hints_count || 0} חידושים.` : "";
    // 🔮 שכבת-עומק בין-שיטתית (אותה עדשה כמו דף המספר) — הנסתר של «${word}» = הפנים של מילים אחרות.
    let crossLine = "";
    try { crossLine = (await getWordCrossFacts(word)).crossLine; } catch { /* בלי עומק, לא שוברים */ }
    const crossFacts = crossLine ? `\nהצלבות בין-שיטתיות (עובדה מהמנוע — פני מילה אחרת = ערך נסתר של השם): ${crossLine}` : "";
    const facts =
      "[הנחיה: אתה חוקר שמלווה את המשתמש במעבדת-השם — לא מחשבון. כתוב פסקה קצרה (3-5 משפטים) שעונה: מה מיוחד בשם? אילו התכנסויות *מעניינות* נמצאו — ובעיקר **למה** הן מעניינות (התכנסות שהופיעה בשיטה אחת ולא באחרות = נקודת-מחקר; גשר עברית↔אנגלית = נדיר ומיוחד; הצלבה בין-שיטתית = הנסתר של השם נופל על פני מילה אחרת). לכל התכנסות שאתה מדגיש ציין מאיזו שיטה ומה מקורהּ (מסורת עברית / לטיני-היסטורי / מודרני). אם יש גשר חוצה-שפות — הדגש אותו, זה הדבר הנדיר. סיים בהכוונה: מה כדאי לחקור בהמשך. דבר כמו חוקר סקרן שמזמין להעמיק, לא כמו נוסחה. הפרד עובדה (הערך) מפרשנות (הרמז), בלי נבואות.]\n\n" +
      `השם: ${word}\nערכים בעברית: ${topHeb}${enLine}${convLine}${brLine}${crossFacts}${ctxLine}`;
    try {
      const res = await getAiAnalysis({ kind: "name_lab", subject: word, facts });
      setAi(res || null); setAiState(res ? "done" : "off");
    } catch { setAiState("off"); }
  }, [word, hebVals, enVals, conv, regVal, research, aiState, enWord, heInput, liveBridge, enOrdinal]);

  const commit = (v) => { const w = (v ?? "").trim(); setWord(w); setEditing(false); setAi(null); setAiState("idle"); if (w) setSp({ w }, { replace: true }); };

  // 🌳 ישות-השם למחקר האישי (Research Bus).
  const entity = useMemo(() => word ? { id: "name:" + word, type: "name", title: word, value: regVal, meta: { en: enVals[0]?.value } } : null, [word, regVal, enVals]);
  const pinned = entity && isPinned?.(entity.id);

  // «לאן ממשיכים מכאן?» — כיווני-מחקר אמיתיים מהנתונים בפועל (מספרים כנים, בלי המצאה).
  const nextDirs = useMemo(() => {
    if (!word) return [];
    const d = [];
    const br = (research && research.bridges) || [];
    if (br.length) { const b = br[0]; d.push({ ic: "🌉", t: `נמצא גשר אל «${b.foreign_word}» ב${LANG[b.lang] || b.lang} — חקור את הצד השני`, to: `/name-lab?w=${encodeURIComponent(b.foreign_word)}` }); }
    if (enVals.length && !br.length) d.push({ ic: "🌉", t: `יש ל«${word}» גם ערך באנגלית (${enVals[0].value}) — חפש מולו התכנסות עברית`, to: `/number/${enVals[0].value}` });
    if (conv && conv.length) d.push({ ic: "💎", t: `${conv.length} מילים וביטויים מתכנסים לערך ${regVal}`, to: `/number/${regVal}` });
    if (research && research.posts_count > 0) d.push({ ic: "📚", t: `${research.posts_count} פוסטים חוקרים את «${word}»`, to: `/post?q=${encodeURIComponent(word)}`, scroll: "ctx" });
    if (research && research.hints_count > 0) d.push({ ic: "🔔", t: `${research.hints_count} חידושים במרכז-המחקר נגעו במספר ${regVal}`, to: `/research` });
    if (research && research.treasures_count > 0) d.push({ ic: "💎", t: `${research.treasures_count} אוצרות בזרם-המציאות נושאים את המספר ${regVal}`, to: `/archive` });
    d.push({ ic: "🔢", t: `צלול לעומק אל דף המספר ${regVal}`, to: `/number/${regVal}` });
    return d.slice(0, 6);
  }, [word, research, conv, enVals, regVal]);

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: "100vh", color: C.ink }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 16px 90px", display: "grid", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>🧪 מעבדת השם</div>
          <div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 13, marginTop: 3 }}>מה אפשר לגלות על השם הזה?</div>
        </div>

        {/* 1 · השם */}
        <Section n="01" icon="🧪" title="השם">
          {editing || !word ? (
            <form onSubmit={e => { e.preventDefault(); commit(new FormData(e.target).get("w")); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input name="w" defaultValue={word} autoFocus placeholder="הקלד שם או מילה — עברית או אנגלית…" style={{ flex: 1, minWidth: 180, fontFamily: F.h, fontSize: 20, fontWeight: 700, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", color: C.ink }} />
              <button style={{ cursor: "pointer", background: C.blue, border: "none", borderRadius: 12, color: "#fff", fontFamily: F.h, fontSize: 15, fontWeight: 800, padding: "0 24px" }}>חקור ←</button>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: F.h, fontSize: 38, fontWeight: 800, color: C.ink }}>{word}</div>
              <button onClick={() => setEditing(true)} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 999, color: C.dim, fontFamily: F.h, fontSize: 13, fontWeight: 700, padding: "6px 14px" }}>✎ ערוך / החלף</button>
            </div>
          )}
        </Section>

        {word && (<>
          {/* 2 · סיכום AI — הדבר הראשון */}
          <Section n="02" icon="🤖" title="סיכום המחקר" sub="חוקר מלווה — מה מיוחד, אילו התכנסויות מעניינות ולמה, ומה כדאי לחקור בהמשך.">
            {aiState === "done" && ai ? (
              <div style={{ color: C.ink, fontFamily: F.h, fontSize: 15.5, lineHeight: 1.85, background: "#f3f7ff", border: `1px solid #d9e5ff`, borderRadius: 12, padding: "14px 16px" }}>{ai}</div>
            ) : aiState === "busy" ? (
              <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>🔬 החוקר מנתח את «{word}»…</div>
            ) : aiState === "off" ? (
              <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>הניתוח לא זמין כרגע. <button onClick={analyze} style={{ cursor: "pointer", background: "none", border: "none", color: C.blue, fontWeight: 700, textDecoration: "underline" }}>נסה שוב</button></div>
            ) : (
              <button onClick={analyze} style={{ cursor: "pointer", background: `linear-gradient(135deg,${C.blue},#5b8bff)`, border: "none", borderRadius: 12, color: "#fff", fontFamily: F.h, fontSize: 15, fontWeight: 800, padding: "12px 22px" }}>🔬 מה אפשר לגלות על «{word}»?</button>
            )}
          </Section>

          {/* 🎯 מד עומק ההצלבה — סיכום כמותי של החיבור בגרף */}
          <DepthGauge depth={depth} />

          {/* 3 · המחקר — השיטות */}
          <Section n="03" icon="🔢" title="המחקר" sub={`${hebVals.length} שיטות עברית${enVals.length ? " · " + enVals.length + " שיטות אנגלית" : ""} — כל שיטה עם ערך, תג-מקור והסבר (לחיצה על «?»).`}>
            <div style={{ color: "#1f8a4c", fontFamily: F.h, fontSize: 12.5, fontWeight: 800, margin: "0 0 7px" }}>✅ מסורת עברית</div>
            <div style={{ display: "grid", gap: 6 }}>
              {hebVals.map((m, i) => <MethodRow key={i} m={m} value={m.value} openKey={openKey} setOpen={setOpen} />)}
            </div>

            {/* 🔤 קלט עברי → הצעת חישוב באנגלית: בוחרים איות (תעתוק מוצהר) או עורכים ידנית */}
            {heInput && (
              <div style={{ marginTop: 14, background: "#f6f9ff", border: `1px solid #d9e5ff`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ color: C.ink, fontFamily: F.h, fontSize: 13.5, fontWeight: 800, marginBottom: 3 }}>🔤 לחשב את «{word}» גם באנגלית?</div>
                <div style={{ color: C.dim, fontFamily: F.h, fontSize: 12, lineHeight: 1.6, marginBottom: 9 }}>העברית נכתבת בלי תנועות — לכן בוחרים <b>איות</b> (תעתוק מוצהר, לא תרגום). כל אפשרות מראה את ערך-האורדינלי שלה.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 9 }}>
                  {translitOpts.map((opt, i) => {
                    const on = enWord === opt;
                    const ord = englishAll(opt)[0]?.value || 0;
                    const match = ord === regVal;
                    return (
                      <button key={i} onClick={() => setEnWord(opt)} style={{ cursor: "pointer", background: on ? C.blue : "#fff", border: `1px solid ${on ? C.blue : (match ? "#bfe4cd" : C.line)}`, borderRadius: 999, color: on ? "#fff" : C.ink, fontFamily: F.h, fontSize: 13, fontWeight: 800, padding: "7px 13px", minHeight: 40 }}>
                        {opt} <span style={{ fontFamily: F.m, opacity: on ? 0.9 : 0.65 }}>· {ord}</span>{match ? " 💫" : ""}
                      </button>
                    );
                  })}
                </div>
                <input value={enWord || ""} onChange={e => setEnWord(e.target.value.replace(/[^A-Za-z' ]/g, ""))} placeholder="או הקלד את האיות המדויק…" style={{ width: "100%", boxSizing: "border-box", fontFamily: F.h, fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.ink }} />
              </div>
            )}

            {enVals.length > 0 && (<>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "14px 0 7px" }}>
                <span style={{ color: C.blue, fontFamily: F.h, fontSize: 12.5, fontWeight: 800 }}>🇺🇸 אנגלית{heInput && enWord ? ` · «${enWord}» (תעתוק)` : ""}</span>
                {liveBridge && <span style={{ background: "#e8f6ee", border: "1px solid #bfe4cd", borderRadius: 999, color: "#1f8a4c", fontFamily: F.h, fontSize: 11, fontWeight: 800, padding: "2px 9px" }}>💫 גשר-חי: אנגלית = עברית = {regVal}</span>}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {enVals.map((m, i) => <MethodRow key={i} m={m} value={m.value} openKey={openKey} setOpen={setOpen} />)}
              </div>
            </>)}
          </Section>

          {/* 4 · התכנסויות */}
          <Section n="04" icon="💎" title="ההתכנסויות" sub={`מילים וביטויים ששווים לערך הרגיל (${regVal}) — «בתוך המספר». מאומת במנוע.`}>
            {conv === null ? <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>טוען…</div> :
              conv.length === 0 ? <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>לא נמצאו התכנסויות לערך זה.</div> : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {conv.map((p, i) => (
                    <Link key={i} to={`/number/${encodeURIComponent(p)}`} style={{ textDecoration: "none", background: "#f3f7ff", border: `1px solid #d9e5ff`, borderRadius: 999, padding: "5px 13px", color: C.blue, fontFamily: F.h, fontSize: 13.5, fontWeight: 700 }}>{p}</Link>
                  ))}
                  <Link to={`/number/${regVal}`} style={{ textDecoration: "none", background: C.ink, borderRadius: 999, padding: "5px 13px", color: "#fff", fontFamily: F.h, fontSize: 13, fontWeight: 700 }}>כל ה-{regVal} ←</Link>
                </div>
              )}
          </Section>

          {/* 5 · הגשרים — חוצי-שפות (העדיפות העליונה) */}
          <Section n="05" icon="🌉" title="הגשרים" sub="עברית ↔ אנגלית ↔ שפות — לא רק ערך שווה, אלא התכנסות בין־שפתית אמיתית. אחד הדברים שאין כמעט בשום מקום.">
            {research === null ? <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>מחפש גשרים…</div> :
              (research && research.bridges && research.bridges.length) ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {research.bridges.map((b, i) => <BridgeCard key={i} b={b} myWord={word} />)}
                </div>
              ) : (
                <div style={{ color: C.dim, fontFamily: F.h, fontSize: 13.5, lineHeight: 1.7, background: "#f6f7f9", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
                  לא נמצא עדיין גשר חוצה-שפות מאומת ל«{word}» (ערך {regVal}).{enVals.length ? ` הערך באנגלית הוא ${enVals[0].value} — גשר אמיתי נרשם רק לאחר אימות ידני.` : ""} מאגר הגשרים גדל עם המחקר 🌱
                </div>
              )}
          </Section>

          {/* 6 · ההקשר — השם כשער לגרף */}
          <Section n="06" icon="📚" title="ההקשר" sub="פוסטים · אוצרות · חידושים הקשורים לשם ולמספר. השם כשער אל עץ-הידע.">
            {research === null ? <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>טוען הקשר…</div> :
              !research ? <div style={{ color: C.dim, fontFamily: F.h, fontSize: 14 }}>ההקשר לא זמין כרגע.</div> : (
                <div style={{ display: "grid", gap: 16 }}>
                  {/* פוסטים */}
                  {research.posts && research.posts.length > 0 && (
                    <div>
                      <div style={{ color: C.ink, fontFamily: F.h, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>📖 פוסטים {research.posts_count > research.posts.length ? `(${research.posts.length} מתוך ${research.posts_count})` : `(${research.posts_count})`}</div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {research.posts.map((p, i) => (
                          <Link key={i} to={`/${p.slug}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 10, padding: 8 }}>
                            {p.image_url && <img src={p.image_url} alt="" loading="lazy" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
                            <span style={{ color: C.ink, fontFamily: F.h, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</span>
                          </Link>
                        ))}
                      </div>
                      {research.posts_count > research.posts.length && <Link to={`/post?q=${encodeURIComponent(word)}`} style={{ display: "inline-block", marginTop: 8, textDecoration: "none", color: C.blue, fontFamily: F.h, fontSize: 12.5, fontWeight: 800 }}>כל {research.posts_count} הפוסטים ←</Link>}
                    </div>
                  )}
                  {/* אוצרות */}
                  {research.treasures && research.treasures.length > 0 && (
                    <div>
                      <div style={{ color: C.ink, fontFamily: F.h, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>💎 אוצרות בזרם-המציאות (מספר {regVal})</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {research.treasures.map((g, i) => (
                          <Link key={i} to="/archive" title={g.name || ""} style={{ textDecoration: "none" }}>
                            <img src={g.image_url} alt={g.name || ""} loading="lazy" style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.line}` }} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* חידושים */}
                  {research.hints && research.hints.length > 0 && (
                    <div>
                      <div style={{ color: C.ink, fontFamily: F.h, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>🔔 חידושים שנגעו במספר {regVal} ({research.hints_count})</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {research.hints.map((h, i) => (
                          <Link key={i} to={h.source_type === "post" && h.source_ref ? `/${h.source_ref}` : "/research"} style={{ textDecoration: "none", background: "#fbfcfe", border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 11px", color: C.ink, fontFamily: F.h, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{h.origin === "ai" ? "🔵 " : ""}{h.title}</Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {!(research.posts?.length || research.treasures?.length || research.hints?.length) && (
                    <div style={{ color: C.dim, fontFamily: F.h, fontSize: 13.5 }}>עוד לא נמצא הקשר לשם הזה בגרף. כל שם חדש מרחיב את העץ 🌱</div>
                  )}
                </div>
              )}
          </Section>

          {/* 7 · המחקר האישי */}
          <Section n="07" icon="🌳" title="המחקר האישי" sub={`שמור את «${word}» לעץ שלך, הוסף למחקר הפעיל, והמשך מאותה נקודה בכל מכשיר.`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => entity && addToResearch?.(entity)} style={{ cursor: "pointer", background: C.blue, border: "none", borderRadius: 999, color: "#fff", fontFamily: F.h, fontSize: 13.5, fontWeight: 800, padding: "10px 18px", minHeight: 44 }}>➕ הוסף למחקר</button>
              <button onClick={() => entity && saveItem?.(entity)} style={{ cursor: "pointer", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, color: C.ink, fontFamily: F.h, fontSize: 13.5, fontWeight: 800, padding: "10px 18px", minHeight: 44 }}>⭐ שמור לעץ</button>
              <button onClick={() => entity && togglePin?.(entity)} style={{ cursor: "pointer", background: pinned ? "#fff4e0" : "#fff", border: `1px solid ${pinned ? "#f0dcae" : C.line}`, borderRadius: 999, color: pinned ? "#8a5a1f" : C.dim, fontFamily: F.h, fontSize: 13.5, fontWeight: 800, padding: "10px 18px", minHeight: 44 }}>{pinned ? "📌 מוצמד" : "📌 הצמד"}</button>
              <button onClick={() => { const url = `${location.origin}/name-lab?w=${encodeURIComponent(word)}`; try { navigator.share ? navigator.share({ title: `מעבדת השם — ${word}`, url }) : navigator.clipboard?.writeText(url); } catch { /* noop */ } }} style={{ cursor: "pointer", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, color: C.ink, fontFamily: F.h, fontSize: 13.5, fontWeight: 800, padding: "10px 18px", minHeight: 44 }}>🔗 שתף</button>
            </div>
          </Section>

          {/* 8 · לאן ממשיכים מכאן? — כל גילוי הוא התחלה של גילוי חדש 🌳 */}
          {nextDirs.length > 0 && (
            <Section n="08" icon="🧭" title="לאן ממשיכים מכאן?" sub="כל גילוי הוא התחלה של גילוי חדש — כיווני-המשך אמיתיים, לפי מה שנמצא בפועל.">
              <div style={{ display: "grid", gap: 8 }}>
                {nextDirs.map((d, i) => (
                  <Link key={i} to={d.to} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11, background: "linear-gradient(180deg,#fbfdff,#f3f7ff)", border: `1px solid #d9e5ff`, borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{d.ic}</span>
                    <span style={{ color: C.ink, fontFamily: F.h, fontSize: 14, fontWeight: 700, lineHeight: 1.5, flex: 1 }}>{d.t}</span>
                    <span style={{ color: C.blue, fontFamily: F.h, fontSize: 18, fontWeight: 800 }}>←</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </>)}
      </div>
    </div>
  );
}
