import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { onlyHeb, METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { resolve } from "../lib/engine.js";
import { getAllValuePhrases, addWallWord } from "../lib/supabase.js";
import { buildMessages } from "../lib/numberMessage.js";
import { applySeo, SITE_URL } from "../lib/seo.js";
import VisitorSearchesBox from "../components/VisitorSearchesBox.jsx";

// ===== 🧮 מחשבון גימטריה קהילתי — דף ויראלי, יום/לילה, עם ניתוח-חכם מהגרף =====
// אחיו המקצועי (19 שיטות מלאות) חי במעבדת-המחקר (/research?tool=gematria + /beit-midrash?tab=calc).
// כאן: רגש · שיתוף · «מה השם שלך מסתיר?» — כל תוצאה מפנה לעץ האחד (/number/:value), לא משכפלת.

const ALL_METHODS = [...METHODS, ...DEPTH_METHODS];                       // 19 שיטות
const CORE_KEYS = ["רגיל", "מילוי", "מסתתר", "קדמי", "ריבוע", "סידורי", "אתבש", "אלבם"]; // 8 מרכזיות

const gemAll = name => ALL_METHODS.map(m => ({ key: m.key, sub: m.sub || m.soul || "", value: m.fn(name) }));
const regularOf = name => { try { return resolve(name).value; } catch { return METHODS[0].fn(name); } };
// כרטיס-שיתוף דינמי 1200×630 — השם ענק + הערך (api/card קיים).
const cardFor = (name, value) => `${SITE_URL}/api/card?w=${encodeURIComponent(name)}&n=${value}`;
const shareUrl = name => `${SITE_URL}/community/calculator?w=${encodeURIComponent(name)}`;

export default function CommunityCalculatorPage() {
  const P = usePalette();
  const loc = useLocation();
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [compare, setCompare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phrases1, setPhrases1] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [fromShare, setFromShare] = useState(false);

  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם",
      description: "מה השם שלך מסתיר? מחשבון הגימטריה החינמי של SOD1820 — חשבו כל שם או מילה, גלו לאילו ביטויים מהתורה הוא שווה, השוו בין שני שמות ושתפו בוואטסאפ. ✨",
      path: "/community/calculator",
    });
  }, []);

  // הגעה משיתוף (?w=) → ממלא את השם ומראה «בדוק את שלך»
  useEffect(() => {
    const w = new URLSearchParams(loc.search).get("w");
    if (w) { setName1(w); setFromShare(true); }
  }, [loc.search]);

  const r1 = useMemo(() => onlyHeb(name1).length ? { value: regularOf(name1), all: gemAll(name1) } : null, [name1]);
  const r2 = useMemo(() => (compare && onlyHeb(name2).length) ? { value: regularOf(name2), all: gemAll(name2) } : null, [compare, name2]);
  const matches = useMemo(() => (r1 && r2) ? r1.all.filter((a, i) => a.value === r2.all[i].value) : [], [r1, r2]);

  // ✨ הקסם: לאילו ביטויים מהתורה/הגרף השם שווה
  useEffect(() => {
    if (!r1) { setPhrases1([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const p = await getAllValuePhrases(r1.value, 24); if (alive) setPhrases1((p || []).filter(x => x?.phrase && x.phrase !== name1.trim())); }
      catch { if (alive) setPhrases1([]); }
      addWallWord(name1.trim(), r1.value);          // לקיר החי
    }, 650);
    return () => { alive = false; clearTimeout(t); };
  }, [name1, r1?.value]); // eslint-disable-line
  useEffect(() => { if (r2) { const t = setTimeout(() => addWallWord(name2.trim(), r2.value), 650); return () => clearTimeout(t); } }, [name2, r2?.value]); // eslint-disable-line

  // 🔮 ניתוח-חכם מהגרף (מנוע buildMessages — עובדה מול רמז)
  const analysis = useMemo(
    () => (r1 ? buildMessages({ term: name1.trim(), value: r1.value, isNumber: false, phrases: phrases1 }) : []),
    [r1?.value, phrases1, name1]
  );

  // אחוז-תאימות משחקי לשני שמות
  const compat = useMemo(() => {
    if (!r1 || !r2) return null;
    if (r1.value === r2.value) return { pct: 100, note: "נשמות תאומות — אותה גימטריה רגילה!" };
    const pct = Math.min(98, 22 + matches.length * 13);
    return { pct, note: matches.length ? `${matches.length} שיטות משותפות` : "אין התאמה ישירה — אבל הסכום מספר סיפור" };
  }, [r1, r2, matches]);

  const shareText = !r1 ? "" : (
    r2
      ? `גימטריה ✨ "${name1.trim()}" = ${r1.value} · "${name2.trim()}" = ${r2.value}${compat?.pct != null ? ` — תאימות ${compat.pct}%` : ""}\nבדקו את שלכם:\n${shareUrl(name1.trim())}`
      : `הגימטריה של "${name1.trim()}" = ${r1.value} ✨${phrases1[0] ? ` (שווה ל«${phrases1[0].phrase}»!)` : ""}\nגלו מה השם שלכם מסתיר:\n${shareUrl(name1.trim())}`
  );

  // ── סגנונות theme-aware ──
  const inp = { width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 12, color: P.ink, fontFamily: F.heading, fontSize: 19, fontWeight: 700, padding: "15px 16px", textAlign: "center", outline: "none" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontFamily: F.body, fontSize: 14, fontWeight: 700, textDecoration: "none" };
  const pillBtn = (bg, fg) => ({ cursor: "pointer", background: bg, color: fg, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "13px 26px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 });

  function Reveal({ name, r, phrases }) {
    const shown = showAll ? r.all : r.all.filter(a => CORE_KEYS.includes(a.key));
    return (
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: "22px 18px", boxShadow: P.mode === "light" ? "0 6px 24px rgba(120,90,20,0.08)" : "0 6px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginBottom: 2 }}>{name.trim()}</div>
          <Link to={`/number/${r.value}`} style={{ textDecoration: "none" }}>
            <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>{r.value}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>גימטריה רגילה · לחצו לחקירה מלאה →</div>
          </Link>
        </div>

        {/* ✨ הקסם — לאילו ביטויים השם שווה */}
        {phrases?.length > 0 && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>✨ השם שלך שווה גם ל:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
              {phrases.slice(0, 6).map(p => (
                <Link key={p.phrase} to={`/number/${r.value}`} style={{ ...chip, background: P.glow, color: P.accentText, border: `1px solid ${P.border}` }}>{p.phrase}</Link>
              ))}
              {phrases.length > 6 && <Link to={`/number/${r.value}`} style={{ ...chip, background: "none", color: P.accentDim, border: `1px dashed ${P.border}` }}>+{phrases.length - 6} עוד</Link>}
            </div>
          </div>
        )}

        {/* שיטות — 8 מרכזיות, אפשר לפתוח את כל ה-19 */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px,1fr))", gap: 8 }}>
          {shown.map(a => (
            <Link key={a.key} to={`/number/${a.value}`} title={a.sub} style={{ textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 6px", textAlign: "center" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>{a.key}</div>
              <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{a.value}</div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 10, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowAll(s => !s)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "underline" }}>
            {showAll ? "− הצג פחות" : "+ כל 19 השיטות"}
          </button>
          <Link to="/research?tool=gematria" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>🔬 למחשבון המקצועי →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "48px 16px 100px", position: "relative", zIndex: 1 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>כלי חינמי · שתפו לחברים</div>
        <h1 style={{ color: P.ink, fontFamily: F.regal, fontSize: 34, fontWeight: 800, margin: "6px 0 4px" }}>🧮 מה השם שלך מסתיר?</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.85, maxWidth: 520, margin: "0 auto" }}>
          הקלידו שם או מילה בעברית — וגלו את ערכם, לאילו ביטויים מהתורה הם שווים, ומה מסתתר ביניהם. ✨
        </p>
      </div>

      {fromShare && (
        <div style={{ background: P.glow, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "12px 16px", marginBottom: 18, textAlign: "center", color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
          👋 חבר שיתף אותך — עכשiו <b>בדוק את השם שלך</b> למטה 👇
        </div>
      )}

      {/* קלט */}
      <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
        <input style={inp} value={name1} onChange={e => setName1(e.target.value)} placeholder="הקלידו שם / מילה בעברית…" autoFocus dir="rtl" />
        {compare && <input style={inp} value={name2} onChange={e => setName2(e.target.value)} placeholder="שם שני להשוואה…" dir="rtl" />}
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button onClick={() => setCompare(c => !c)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "underline" }}>
          {compare ? "− הסר השוואה" : "💞 השוואת שני שמות (תאימות)"}
        </button>
      </div>

      {r1 && (
        <div style={{ display: "grid", gap: 16 }}>
          <Reveal name={name1} r={r1} phrases={phrases1} />
          {r2 && <Reveal name={name2} r={r2} phrases={[]} />}

          {/* 💞 תאימות */}
          {compat && (
            <div style={{ background: compat.pct >= 60 ? P.glow : P.cardSoft, border: `1px solid ${compat.pct >= 60 ? P.borderStrong : P.border}`, borderRadius: 16, padding: "18px", textAlign: "center" }}>
              <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 40, fontWeight: 800 }}>{compat.pct}%</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>תאימות גימטרית</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>{compat.note}</div>
              {matches.length > 0 && <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{matches.map(m => `${m.key} (${m.value})`).join(" · ")}</div>}
              <Link to={`/number/${r1.value + r2.value}`} style={{ display: "inline-block", marginTop: 8, color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>סכום שני השמות: {r1.value + r2.value} →</Link>
            </div>
          )}

          {/* 🔮 ניתוח-חכם מהגרף */}
          {!r2 && analysis.length > 0 && (
            <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 16, padding: "16px 18px" }}>
              {!showAnalysis ? (
                <button onClick={() => setShowAnalysis(true)} style={{ ...pillBtn(P.accentBtn, P.onAccent), width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                  🔮 גלו מה מסתתר בשם «{name1.trim()}»
                </button>
              ) : (
                <>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, marginBottom: 10 }}>🔮 מה מסתתר בשם שלך</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {analysis.map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", color: m.fact ? P.ink : P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7 }}>
                        <span style={{ color: m.fact ? P.accent : P.accentDim, flexShrink: 0 }}>{m.fact ? "✓" : "✧"}</span>
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>✓ עובדה מאומתת במנוע · ✧ רמז משלים (פרשנות)</div>
                </>
              )}
            </div>
          )}

          {/* שיתוף */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={pillBtn("#25D366", "#06310f")}>🟢 שתפו בוואטסאפ</a>
            <button onClick={() => { navigator.clipboard?.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={pillBtn(P.card, P.accentText)}>
              {copied ? "✓ הועתק" : "🔗 העתק קישור"}
            </button>
          </div>

          {/* 📸 תצוגת כרטיס-השיתוף */}
          {!r2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 7 }}>📸 כך זה ייראה בשיתוף</div>
              <img src={cardFor(name1.trim(), r1.value)} alt={`${name1.trim()} = ${r1.value}`} loading="lazy"
                style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: P.mode === "light" ? "0 4px 18px rgba(120,90,20,0.12)" : "0 4px 18px rgba(0,0,0,0.5)" }} />
            </div>
          )}
        </div>
      )}

      {/* 🔎 הקיר החי — מה גולשים מחשבים עכשiו */}
      <div style={{ marginTop: 30 }}>
        <VisitorSearchesBox light={P.mode === "light"} onPick={p => { setName1(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>

      {/* גשר למקצועי */}
      <div style={{ marginTop: 26, textAlign: "center" }}>
        <Link to="/research?tool=gematria" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
          רוצים לעומק? המחשבון המקצועי — 19 שיטות, הצלבות ומנוע מלא →
        </Link>
      </div>
    </div>
  );
}
