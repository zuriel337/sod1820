import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import QuickActions from "./QuickActions.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { entityFromPhrase } from "../lib/research/entity.js";
import { METHODS, onlyHeb, hebrewNumeral } from "../lib/gematria.js";
import { makeNameCard } from "../lib/research/nameCard.js";
import { canShareFile, shareImageFile } from "../lib/share.js";

// 🪪 סיפור השם שלך — עדשה אישית: שלד מחקרי מדויק (מנוע הגימטריה + פסוקי התורה),
// עור רגשי, שפה של גילוי-זהות. «זה אני» לא «זה המספר שלי». בלי ניחוש/עתידות —
// רק עובדה עטופה יפה. כל ערך מחושב במנוע הרשמי; «פסוק לשמך» מנהג אמיתי.

// משמעות מסורתית של האותיות (אסוציאציות מקובלות — לא טענה מדעית).
const LETTER_MEANING = {
  "א": "ראשית · אחדות · אלופו של עולם", "ב": "בית · ברכה · בריאה",
  "ג": "גמילות חסד · גובה · גאולה", "ד": "דלת · דעת · ענווה",
  "ה": "הנה · גילוי · נשימת חיים", "ו": "חיבור · המשכה · ו׳ החיבור",
  "ז": "זיו · זיכרון · קיום", "ח": "חיים · חן · חום",
  "ט": "טוב · הטמון בפנים", "י": "יד · נקודת ההתחלה · יסוד",
  "כ": "כף · כתר · הכלה", "ל": "לב · לימוד · שאיפה כלפי מעלה",
  "מ": "מים · מלכות · מעיין נובע", "נ": "נפש · נאמנות · צמיחה",
  "ס": "סמך · תמיכה · מעגל שלם", "ע": "עין · עומק · ענווה",
  "פ": "פה · ביטוי · פתיחה", "צ": "צדיק · צניעות · צמיחה",
  "ק": "קדושה · קו · היקף", "ר": "ראש · רוממות · ריבוי",
  "ש": "שלום · אש · שלהבת", "ת": "תורה · אמת · תכלית וחתימה",
};
const FINAL2BASE = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const base = c => FINAL2BASE[c] || c;
const meaningOf = c => LETTER_MEANING[base(c)] || "";

// השיטות שמספרות את «נשמת השם» (תת-קבוצה רגשית; הכל מהמנוע הרשמי, soul = הניסוח של צוריאל)
const SOUL_KEYS = ["רגיל", "מילוי", "מסתתר", "אתבש", "אלבם", "ריבוע"];

export default function NameStory() {
  const { addToResearch } = useResearch();
  const [raw, setRaw] = useState("");
  const [name, setName] = useState(null);       // השם שנפתח (אחרי לחיצה)
  const [verses, setVerses] = useState(null);

  useEffect(() => {
    let live = true;
    fetch("/torah-verses.json").then(r => r.json()).then(j => { if (live) setVerses(j); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const letters = name ? onlyHeb(name) : [];
  const main = name ? (METHODS[0].fn(name) || 0) : 0;
  const souls = useMemo(() => name ? SOUL_KEYS.map(k => { const m = METHODS.find(x => x.key === k); return m ? { key: k, soul: m.soul, value: m.fn(name) } : null; }).filter(Boolean) : [], [name]);

  // פסוק לשמך — מתחיל באות הראשונה, חותם באות האחרונה (התאמה גמישה לסופיות)
  const myVerses = useMemo(() => {
    if (!name || !verses || letters.length < 1) return [];
    const f = base(letters[0]), l = base(letters[letters.length - 1]);
    const out = [];
    for (const r of verses.verses) {
      const t = r[3];
      if (base(t[0]) === f && base(t[t.length - 1]) === l) { out.push(r); if (out.length >= 60) break; }
    }
    return out;
  }, [name, verses, letters]);

  // עם מי שמך מתכנס — מילים בתורה ששוות לערך שמך
  const convVerses = useMemo(() => {
    if (!name || !verses || !main) return [];
    const out = [];
    for (const r of verses.verses) {
      const w = r[3].split(" ").find(x => METHODS[0].fn(x) === main);
      if (w) { out.push([r, w]); if (out.length >= 8) break; }
    }
    return out;
  }, [name, verses, main]);

  const open = () => { const n = raw.trim(); if (onlyHeb(n).length) setName(n); };
  const refOf = r => `${verses.books[r[0]]} ${r[1]}:${r[2]}`;
  const entity = name ? entityFromPhrase(name, main) : null;

  // 🖼️ כרטיס שיתוף — מנוע ההפצה (Canvas בצד-לקוח, עברית נכונה)
  const [card, setCard] = useState(null);     // { blob, url }
  const [busy, setBusy] = useState(false);
  const makeCard = async () => {
    setBusy(true);
    const v = myVerses[0];
    const { blob, url } = await makeNameCard({
      name, value: main, hebNum: hebrewNumeral(main),
      verseRef: v ? refOf(v) : "", verseText: v ? v[3] : "",
    });
    setCard({ blob, url }); setBusy(false);
  };
  const shareCard = async () => {
    if (!card) return;
    const file = new File([card.blob], `sod1820-${name}.png`, { type: "image/png" });
    try {
      if (canShareFile(file)) {
        await shareImageFile(file, { title: `${name} = ${main}`, text: `סיפור השם שלי · sod1820.co.il/research` });
        return;
      }
    } catch { /* בוטל ע״י המשתמש */ }
    const a = document.createElement("a"); a.href = card.url; a.download = `sod1820-${name}.png`; a.click();
  };

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };

  // ----- מסך פתיחה -----
  if (!name) {
    return (
      <div className="rw-card" style={{ textAlign: "center", padding: "40px 22px" }}>
        <div style={{ fontSize: 40 }}>🪪</div>
        <div style={{ fontSize: 27, fontWeight: 800, margin: "8px 0 4px" }}>גלה את סיפור השם שלך</div>
        <div className="rw-muted" style={{ maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.7 }}>
          כל שם נושא ערך, מבנה ופסוק משלו. הקלד שם — ותגלה מה מסתתר בו.
        </div>
        <input
          value={raw} onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && open()}
          dir="rtl" aria-label="הקלד שם" placeholder="שמך · שם יקר לך · שם תינוק…"
          style={{ width: "100%", maxWidth: 380, boxSizing: "border-box", fontSize: 22, fontWeight: 700, textAlign: "center",
            padding: "13px 16px", borderRadius: 12, border: `1px solid ${C.acc}`, background: C.bg, color: C.ink, outline: "none" }}
        />
        <div>
          <button onClick={open} style={{ marginTop: 16, cursor: "pointer", border: "none", borderRadius: 999,
            background: "linear-gradient(135deg,#e9c84a,#b07d12)", color: "#1a0e00", fontWeight: 800, fontSize: 17,
            padding: "13px 32px", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(176,125,18,.3)" }}>
            🔥 פתח את הסיפור שלי
          </button>
        </div>
      </div>
    );
  }

  // ----- מסך הגילוי -----
  const Section = ({ title, sub, children }) => (
    <div className="rw-card" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
      {sub && <div className="rw-muted" style={{ marginTop: 2, marginBottom: 10 }}>{sub}</div>}
      {children}
    </div>
  );

  return (
    <div>
      <button className="rw-back" onClick={() => { setName(null); setRaw(name); }}>← שם אחר</button>

      {/* הגיבור — השם + הערך */}
      <div className="rw-card" style={{ textAlign: "center", padding: "30px 20px", background: "linear-gradient(180deg,var(--card),var(--bg))" }}>
        <div className="rw-muted" style={{ fontWeight: 700 }}>השם שלך</div>
        <div style={{ fontSize: 38, fontWeight: 800, margin: "2px 0 10px", letterSpacing: -.5 }}>{name}</div>
        <div style={{ fontSize: 13.5, color: C.ink2 }}>נושא את הערך</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: C.acc, lineHeight: 1.05 }}>{main.toLocaleString("he")}</div>
        {hebrewNumeral(main) && <div style={{ fontSize: 18, fontWeight: 700, color: C.acc, opacity: .8 }}>{hebrewNumeral(main)}</div>}
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to={`/number/${main}?from=name`} style={{ textDecoration: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "10px 20px" }}>✨ גלה הכל על {main} ←</Link>
          <button onClick={makeCard} disabled={busy} style={{ cursor: "pointer", border: "none", background: "linear-gradient(135deg,#e9c84a,#b07d12)", color: "#1a0e00", fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "10px 20px", fontFamily: "inherit" }}>{busy ? "מכין…" : "🖼️ כרטיס שם"}</button>
          {entity && <button onClick={() => addToResearch?.(entity)} style={{ cursor: "pointer", border: `1px solid ${C.acc}`, background: "var(--card)", color: C.acc, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "10px 20px", fontFamily: "inherit" }}>➕ הוסף למחקר</button>}
        </div>
      </div>

      {/* כרטיס שיתוף — תצוגה מקדימה + שיתוף/הורדה */}
      {card && (
        <div className="rw-card" style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🖼️ הכרטיס שלך מוכן</div>
          <div className="rw-muted" style={{ marginBottom: 12 }}>שתפו אותו בוואטסאפ · סטטוס · אינסטגרם — כל שיתוף מביא עוד אנשים לגלות את שמם.</div>
          <img src={card.url} alt={`כרטיס השם ${name}`} style={{ maxWidth: 320, width: "100%", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,.3)" }} />
          <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={shareCard} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "12px 26px", fontFamily: "inherit" }}>🔗 שתף את הכרטיס</button>
            <a href={card.url} download={`sod1820-${name}.png`} style={{ textDecoration: "none", border: `1px solid ${C.acc}`, color: C.acc, fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "12px 26px" }}>⬇️ הורד</a>
          </div>
        </div>
      )}

      {/* מבנה האותיות */}
      <Section title="🔤 מבנה השם" sub="כל אות בשמך — והמשמעות המסורתית שבה">
        <div style={{ display: "grid", gap: 8 }}>
          {letters.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 40, textAlign: "center", fontSize: 28, fontWeight: 800, color: C.acc }}>{c}</div>
              <div style={{ fontSize: 14.5, color: C.ink }}>{meaningOf(c)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* נשמת השם — השיטות (soul) */}
      <Section title="✨ נשמת השם" sub="אותו שם, נקרא בכמה דרכים — כל אחת חושפת פן אחר">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          {souls.map(s => (
            <div key={s.key} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", background: C.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5 }}>{s.key}</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: C.acc }}>{s.value.toLocaleString("he")}</span>
              </div>
              <div className="rw-muted" style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.4 }}>{s.soul}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* פסוק לשמך */}
      <Section title="📜 הפסוק שלך" sub="לפי מנהג עתיק — הפסוק שמתחיל באות הראשונה של שמך, וחותם באות האחרונה">
        {!verses ? <div className="rw-muted">טוען…</div>
          : myVerses.length === 0 ? <div className="rw-muted">לא נמצא פסוק שמתחיל ב-«{base(letters[0])}» וחותם ב-«{base(letters[letters.length - 1])}». נסה את השם המלא או המקוצר.</div>
          : <>
              <div style={{ border: `2px solid ${C.accS}`, borderRadius: 14, padding: "16px 18px", background: C.bg, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.acc }}>{refOf(myVerses[0])}</div>
                <div style={{ fontSize: 21, lineHeight: 1.9, fontWeight: 600, marginTop: 6 }}>{myVerses[0][3]}</div>
              </div>
              {myVerses.length > 1 && <div className="rw-muted" style={{ marginTop: 8, textAlign: "center" }}>ועוד {myVerses.length - 1}{myVerses.length >= 60 ? "+" : ""} פסוקים שמתחילים ב-{base(letters[0])} וחותמים ב-{base(letters[letters.length - 1])}</div>}
            </>}
      </Section>

      {/* התכנסות */}
      <Section title="💞 עם מי שמך מתכנס" sub={`מילים בתורה שנושאות בדיוק את הערך שלך — ${main.toLocaleString("he")}`}>
        {convVerses.length === 0 ? <div className="rw-muted">לא נמצאה מילה בתורה בערך הזה — אבל בדף המספר מחכות לך כל ההצלבות.</div>
          : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[...new Set(convVerses.map(([, w]) => w))].map((w, i) => (
                <span key={i} className="rw-chip" style={{ fontSize: 16 }}>{w} = {main.toLocaleString("he")}</span>
              ))}
            </div>}
        <div style={{ marginTop: 12 }}>
          <Link to={`/number/${main}?from=name`} style={{ color: C.acc, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>→ כל ההצלבות וצירי ההתכנסות סביב {main}</Link>
        </div>
      </Section>

      {entity && <div style={{ marginTop: 12 }}><QuickActions entity={entity} /></div>}
    </div>
  );
}
