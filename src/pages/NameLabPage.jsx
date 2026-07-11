import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { englishAll, EN_TAGS, hasLatin } from "../lib/englishGematria.js";
import { getAiAnalysis, getValuePhraseList } from "../lib/supabase.js";

// 🧪 מעבדת השם — לא «מחשבון שמות» אלא מעבדת מחקר. השאלה: «מה אפשר לגלות על השם הזה?»
// הסדר (החלטת צוריאל): שם → סיכום-AI (חוקר מלווה) → מחקר → התכנסויות → גשרים → הקשר → אישי.

const C = { bg: "#f6f7f9", card: "#ffffff", ink: "#1b1d22", dim: "#5b6472", line: "#e4e7ec", blue: "#2f6df6", gold: "#b78900" };
const F = { h: "'Heebo',system-ui,sans-serif", m: "ui-monospace,SFMono-Regular,monospace" };

const HEB = [...METHODS, ...DEPTH_METHODS].map(m => ({
  key: m.key, tag: "hebrew",
  explain: [m.sub, m.soul].filter(Boolean).join(" — "),
  fn: m.fn,
}));

function tagChip(tag) {
  const t = EN_TAGS[tag] || EN_TAGS.modern;
  const col = tag === "hebrew" ? "#1f8a4c" : tag === "latin" ? "#8a5a1f" : tag === "modern" ? C.blue : "#8a4fbf";
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

export default function NameLabPage() {
  const [sp, setSp] = useSearchParams();
  const [word, setWord] = useState((sp.get("w") || "").trim());
  const [editing, setEditing] = useState(!word);
  const [openKey, setOpen] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState("idle"); // idle|busy|done|off
  const [conv, setConv] = useState(null);

  useEffect(() => { document.title = "מעבדת השם · סוד 1820"; }, []);

  const hebVals = useMemo(() => word ? HEB.map(m => ({ ...m, value: m.fn(word) })) : [], [word]);
  const enVals = useMemo(() => (word && hasLatin(word)) ? englishAll(word) : [], [word]);
  const regVal = hebVals[0]?.value || 0;

  // התכנסויות מאומתות — המילים ששוות לערך הרגיל (בתוך המספר).
  useEffect(() => {
    let live = true; setConv(null);
    if (regVal >= 10) getValuePhraseList(regVal).then(list => {
      if (!live) return;
      setConv((list || []).map(x => x.phrase).filter(p => p && p !== word).slice(0, 24));
    }).catch(() => live && setConv([]));
    return () => { live = false; };
  }, [regVal, word]);

  const analyze = useCallback(async () => {
    if (!word || aiState === "busy") return;
    setAiState("busy"); setAi(null);
    // הרכבת עובדות ל-AI + הנחיית «חוקר מלווה» (למה מעניין, מאיזו שיטה, מקורהּ, מה לחקור).
    const topHeb = hebVals.slice(0, 8).map(m => `${m.key}=${m.value}`).join(" · ");
    const enLine = enVals.length ? "\nאנגלית: " + enVals.map(m => `${m.label}=${m.value} (${EN_TAGS[m.tag]?.label})`).join(" · ") : "";
    const convLine = (conv && conv.length) ? `\nהתכנסויות (רגיל=${regVal}): ${conv.slice(0, 12).join(", ")}` : "";
    const facts =
      "[הנחיה: אתה חוקר שמלווה את המשתמש במעבדת-השם — לא מחשבון. כתוב פסקה קצרה (3-5 משפטים) שעונה: מה מיוחד בשם? אילו התכנסויות *מעניינות* נמצאו — ובעיקר **למה** הן מעניינות (התכנסות שהופיעה בשיטה אחת ולא באחרות = נקודת-מחקר; גשר עברית↔אנגלית = נדיר). לכל התכנסות שאתה מדגיש ציין מאיזו שיטה ומה מקורהּ (מסורת עברית / לטיני-היסטורי / מודרני). סיים בהכוונה: מה כדאי לחקור בהמשך. דבר כמו חוקר סקרן שמזמין להעמיק, לא כמו נוסחה. הפרד עובדה (הערך) מפרשנות (הרמז), בלי נבואות.]\n\n" +
      `השם: ${word}\nערכים בעברית: ${topHeb}${enLine}${convLine}`;
    try {
      const res = await getAiAnalysis({ kind: "name_lab", subject: word, facts });
      setAi(res || null); setAiState(res ? "done" : "off");
    } catch { setAiState("off"); }
  }, [word, hebVals, enVals, conv, regVal, aiState]);

  const commit = (v) => { const w = (v ?? "").trim(); setWord(w); setEditing(false); setAi(null); setAiState("idle"); if (w) setSp({ w }, { replace: true }); };

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

          {/* 3 · המחקר — השיטות */}
          <Section n="03" icon="🔢" title="המחקר" sub={`${hebVals.length} שיטות עברית${enVals.length ? " · " + enVals.length + " שיטות אנגלית" : ""} — כל שיטה עם ערך, תג-מקור והסבר (לחיצה על «?»).`}>
            <div style={{ color: "#1f8a4c", fontFamily: F.h, fontSize: 12.5, fontWeight: 800, margin: "0 0 7px" }}>✅ מסורת עברית</div>
            <div style={{ display: "grid", gap: 6 }}>
              {hebVals.map((m, i) => <MethodRow key={i} m={m} value={m.value} openKey={openKey} setOpen={setOpen} />)}
            </div>
            {enVals.length > 0 && (<>
              <div style={{ color: C.blue, fontFamily: F.h, fontSize: 12.5, fontWeight: 800, margin: "14px 0 7px" }}>🇺🇸 אנגלית</div>
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

          {/* 5-7 · שלב 2 (scaffold כן — עץ אחד) */}
          {[["05", "🌉", "הגשרים", "עברית ↔ אנגלית ↔ שפות — ערך שמתכנס בין המנועים. אחד הדברים הייחודיים ביותר."],
            ["06", "📚", "ההקשר", "פוסטים · אוצרות · רמזים · מספרים · תמונות הקשורים לשם."],
            ["07", "🌳", "המחקר האישי", "שמירה · הוספה לעץ · מועדפים · שיתוף · המשך מחקר."]].map(([n, ic, ti, s]) => (
              <Section key={n} n={n} icon={ic} title={ti} sub={s}>
                <div style={{ color: "#9aa1ad", fontFamily: F.h, fontSize: 13, fontStyle: "italic", background: "#f6f7f9", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>בקרוב — שלב 2 של מעבדת השם.</div>
              </Section>
            ))}
        </>)}
      </div>
    </div>
  );
}
