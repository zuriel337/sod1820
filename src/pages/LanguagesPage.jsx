import React, { useState, useEffect, useCallback } from "react";
import { F, calcGem } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { langLinkAdd, langLinksList, langLinksPending, langLinkReview } from "../lib/supabase.js";
import EnglishDiscovery from "../components/EnglishDiscovery.jsx";

// 🌍 קשרים בין שפות — אשף מחקר (שכבת LCE). כל קשר מסווג בסוג-קשר, ומקבל תגית ברורה
// כדי שהקורא לא יבלבל בין תעתוק / תרגום / שורש / רעיון (בקשת צוריאל). הכול pending עד אישור.
const REL_TYPES = [
  { key: "transliteration", emoji: "🔁", label: "תעתוק", hint: "אותו צליל, אותיות אחרות (pilot → פילוט)" },
  { key: "translation", emoji: "🌍", label: "תרגום", hint: "אותה משמעות בשפה אחרת (Messiah → משיח)" },
  { key: "root", emoji: "🌱", label: "שורש לשוני", hint: "שורש או מבנה-אותיות משותף" },
  { key: "semantic", emoji: "💡", label: "קשר רעיוני", hint: "רעיון מקשר — לא מילולי" },
  { key: "pronunciation", emoji: "🗣️", label: "הגייה", hint: "דמיון בצליל/הגייה בלבד" },
];
const REL_MAP = { ...Object.fromEntries(REL_TYPES.map(r => [r.key, r])), community: { emoji: "👥", label: "קהילה" }, ai: { emoji: "🤖", label: "הצעת AI" } };
const LANGS = [
  { key: "en", label: "English", flag: "🇺🇸" },
  { key: "ru", label: "Русский", flag: "🇷🇺" },
  { key: "other", label: "אחר", flag: "🌐" },
];
const LANG_MAP = Object.fromEntries(LANGS.map(l => [l.key, l]));

function StatusBadge({ status, P }) {
  const cfg = status === "approved" ? { t: "✅ מאומת", c: "#2e7d32", bg: "rgba(46,125,50,0.14)" }
    : status === "rejected" ? { t: "✖ נדחה", c: "#b23", bg: "rgba(180,40,40,0.12)" }
    : { t: "⏳ ממתין לאישור", c: P.accentText, bg: P.glow };
  return <span style={{ color: cfg.c, background: cfg.bg, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{cfg.t}</span>;
}

function LinkRow({ r, P, admin, onReview }) {
  const rel = REL_MAP[r.relationship_type] || { emoji: "💡", label: r.relationship_type };
  const lang = LANG_MAP[r.lang] || { flag: "🌐", label: r.lang };
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 13px", display: "grid", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>{r.hebrew}</span>
        {r.gematria_he != null && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 12, fontWeight: 700 }}>= {r.gematria_he}</span>}
        <span style={{ color: P.accentDim, fontSize: 13 }}>⟷</span>
        <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600, direction: "ltr" }}>{lang.flag} {r.foreign_word}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        <span style={{ color: P.accentText, background: P.glow, fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 10px", border: `1px solid ${P.border}` }}>{rel.emoji} {rel.label}</span>
        <StatusBadge status={r.status} P={P} />
        {r.created_by_name && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>· מאת {r.created_by_name}</span>}
      </div>
      {r.note && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>{r.note}</div>}
      {admin && (
        <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
          {r.status !== "approved" && <button onClick={() => onReview(r.id, "approve")} style={btn(P, true)}>✅ אשר</button>}
          {r.status !== "rejected" && <button onClick={() => onReview(r.id, "reject")} style={btn(P, false)}>✖ דחה</button>}
        </div>
      )}
    </div>
  );
}
function btn(P, primary) {
  return { cursor: "pointer", borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "6px 14px",
    border: primary ? "none" : `1px solid ${P.border}`, background: primary ? P.accentBtn : "none", color: primary ? P.onAccent : P.accentDim };
}

export default function LanguagesPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();

  // אשף — שדות
  const [hebrew, setHebrew] = useState("");
  const [foreign, setForeign] = useState("");
  const [lang, setLang] = useState("en");
  const [rel, setRel] = useState("transliteration");
  const [note, setNote] = useState("");
  const [name, setName] = useState(() => { try { return localStorage.getItem("sod_lang_name") || ""; } catch { return ""; } });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState([]);

  const gemPreview = hebrew.trim() ? calcGem(hebrew.trim()) : null;

  const load = useCallback(() => {
    langLinksList(getVisitorId()).then(setRows).catch(() => setRows([]));
    if (isAdmin) langLinksPending().then(setPending).catch(() => setPending([]));
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e?.preventDefault?.();
    setErr(""); setMsg("");
    if (!hebrew.trim() || !foreign.trim()) { setErr("צריך למלא גם מילה בעברית וגם מילה בשפה הזרה"); return; }
    setBusy(true);
    try {
      const nm = name.trim();
      try { if (nm) localStorage.setItem("sod_lang_name", nm); } catch { /* noop */ }
      const r = await langLinkAdd({ hebrew, foreign, lang, rel, note, name: nm || null, visitor: getVisitorId() });
      if (r?.error) { setErr(r.error === "too_long" ? "אחת המילים/ההערה ארוכה מדי" : "לא ניתן לשמור כרגע"); }
      else {
        setMsg("נשמר! הקשר ממתין לאישור ויופיע לכולם אחרי אישור. אתה כבר רואה אותו למטה 👇");
        setForeign(""); setNote("");   // משאירים עברית+סוג לנוחות הזנה רצופה
        load();
      }
    } catch { setErr("שגיאה — נסו שוב בעוד רגע"); }
    finally { setBusy(false); }
  }

  async function review(id, action) {
    try { await langLinkReview(id, action); load(); } catch { /* noop */ }
  }

  const inp = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10, background: P.cardSoft, border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" };
  const stepLabel = { color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 7, display: "flex", alignItems: "center", gap: 7 };
  const stepNum = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: P.accentBtn, color: P.onAccent, fontSize: 11, fontWeight: 900 };

  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* כותרת */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,32px)", fontWeight: 800 }}>🌍 קשרים בין שפות</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, maxWidth: 520, margin: "8px auto 0" }}>
          מרחב מחקר לקשרים בין עברית לשפות אחרות. <b style={{ color: P.accentText }}>כל קשר מסווג</b> — תעתוק, תרגום, שורש או רעיון — כדי שיהיה ברור וישר. כל הזנה ממתינה לאישור לפני שהיא מוצגת לכולם.
        </div>
      </div>

      {/* 🔎 שער-הכניסה — מנוע הגילויים (מילה לועזית → התכנסויות נדירות) */}
      <EnglishDiscovery />

      {/* 🧙 האשף */}
      <form onSubmit={submit} style={{ background: P.surface, border: `1.5px solid ${P.borderStrong}`, borderRadius: 18, padding: "20px 18px", display: "grid", gap: 18, marginBottom: 30 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, textAlign: "center" }}>🧙 הוספת קשר חדש</div>

        {/* שלב 1 — עברית */}
        <div>
          <div style={stepLabel}><span style={stepNum}>1</span> המילה בעברית</div>
          <input value={hebrew} onChange={e => setHebrew(e.target.value)} placeholder="למשל: פילוט" style={inp} dir="rtl" />
          {gemPreview != null && gemPreview > 0 && (
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, marginTop: 5 }}>🔢 ערך רגיל: <b style={{ color: P.accentText, fontFamily: F.mono }}>{gemPreview}</b> <span style={{ opacity: 0.7 }}>(מאומת סופית במנוע בעת השמירה)</span></div>
          )}
        </div>

        {/* שלב 2 — מילה זרה + שפה */}
        <div>
          <div style={stepLabel}><span style={stepNum}>2</span> המילה בשפה הזרה</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={foreign} onChange={e => setForeign(e.target.value)} placeholder="pilot" style={{ ...inp, flex: "1 1 200px" }} dir="ltr" />
            <div style={{ display: "flex", gap: 6 }}>
              {LANGS.map(l => (
                <button type="button" key={l.key} onClick={() => setLang(l.key)}
                  style={{ cursor: "pointer", borderRadius: 10, padding: "9px 12px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
                    border: `1px solid ${lang === l.key ? P.accent : P.border}`, background: lang === l.key ? P.glow : P.cardSoft, color: lang === l.key ? P.accentText : P.inkSoft }}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* שלב 3 — סוג הקשר */}
        <div>
          <div style={stepLabel}><span style={stepNum}>3</span> מה סוג הקשר?</div>
          <div style={{ display: "grid", gap: 7 }}>
            {REL_TYPES.map(t => (
              <button type="button" key={t.key} onClick={() => setRel(t.key)}
                style={{ cursor: "pointer", textAlign: "right", borderRadius: 12, padding: "10px 13px",
                  border: `1.5px solid ${rel === t.key ? P.accent : P.border}`, background: rel === t.key ? P.glow : P.cardSoft }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 17 }}>{t.emoji}</span>
                  <span style={{ color: rel === t.key ? P.accentText : P.ink, fontFamily: F.heading, fontSize: 14, fontWeight: 800 }}>{t.label}</span>
                </div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 3, lineHeight: 1.5 }}>{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* שלב 4 — הערה + שם + שליחה */}
        <div>
          <div style={stepLabel}><span style={stepNum}>4</span> הערה (רשות) + שם</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="הסבר קצר על הקשר (רשות)" rows={2} style={{ ...inp, resize: "vertical", fontFamily: F.body }} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך (למשל: שמעון)" style={{ ...inp, marginTop: 8 }} dir="rtl" />
        </div>

        {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, textAlign: "center" }}>{err}</div>}
        {msg && <div style={{ color: "#2e9e5b", fontFamily: F.body, fontSize: 13, textAlign: "center" }}>{msg}</div>}
        <button type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 20px", boxShadow: `0 8px 24px ${P.glow}` }}>
          {busy ? "שומר…" : "➕ הוסף את הקשר"}
        </button>
      </form>

      {/* 🛡 אזור אישור לאדמין */}
      {isAdmin && pending.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>🛡 ממתינים לאישור ({pending.length})</div>
          <div style={{ display: "grid", gap: 9 }}>
            {pending.map(r => <LinkRow key={r.id} r={r} P={P} admin onReview={review} />)}
          </div>
        </div>
      )}

      {/* 📖 הקשרים */}
      <div>
        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 10 }}>📖 הקשרים במאגר</div>
        {rows.length === 0 ? (
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, textAlign: "center", padding: "24px 0" }}>עדיין אין קשרים. תהיו הראשונים להוסיף למעלה 👆</div>
        ) : (
          <div style={{ display: "grid", gap: 9 }}>
            {rows.map(r => <LinkRow key={r.id} r={r} P={P} admin={isAdmin} onReview={review} />)}
          </div>
        )}
      </div>
    </div>
  );
}
