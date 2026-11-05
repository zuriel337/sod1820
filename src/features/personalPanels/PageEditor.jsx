// Shared personal-account panel (Backend/Auth bound). Owned here so 2029 does not load the Legacy UserCenter drawer shell.
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { loadOwnWriterIdentity } from "../../lib/userCenter/writerPersonal2029.js";

export function looksGenericName(name) {
  const n = (name || "").trim();
  if (!n) return true;
  if (n === "חוקר") return true;
  const HEBREW_BLOCK = new RegExp("[\\u0590-\\u05FF]");
  return !HEBREW_BLOCK.test(n) && !/\s/.test(n);
}

// 🎨 עורך-הדף — «ערוך את הדף שלי» תחת ✍️ היצירה. כותב/קורא update_my_page_config (RPC חי, allowlist).
//    ה-allowlist כאן חייב להתאים במדויק ל-RPC אחרת השמירה נדחית. accent/emblem/bio מסונכרנים לעמודות.
const PE_ACCENTS = ['#9c7a1e','#b07d16','#7a52c8','#127f70','#3f8a2f','#c0453c','#9a6a12','#1f6f9c','#8a6a1c','#8a5a2a','#2b6f9c','#d4af37'];
const PE_EMBLEMS = ['👑','✦','🔤','🔠','🔢','📅','🌅','🕰️','📜','🛸','🔡','✡️','🧭','🔬','🧠','🧩','📖','📊','💎','🌍','🔍','🕯️','📚','✨','🌊','🔥','🎬','⭐'];
const PE_SECTIONS = [
  { id: 'highlights',       label: '⭐ מובחרים (בראש)' },
  { id: 'verified_gematrias', label: '🔢 הגימטריות המאומתות' },
  { id: 'events',           label: '📅 ציר פעילות ואירועים' },
  { id: 'posts',            label: '📝 הפוסטים שלי' },
  { id: 'convergences',     label: '🎯 התכנסויות' },
  { id: 'featured_gallery', label: '🖼️ גלריה מוצגת' },
  { id: 'forum',            label: '💬 דיונים ופורום' },
  { id: 'dossier',          label: '📁 תיק החוקר' },
  { id: 'links',            label: '🔗 קישורים חיצוניים' },
];
export default function PageEditor({ T, goto, onSaved, refreshUnavailable = false, readOnly = false }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [origName, setOrigName] = useState("");
  const [accent, setAccent] = useState("");
  const [emblem, setEmblem] = useState("");
  const [bio, setBio] = useState("");
  const [sections, setSections] = useState(PE_SECTIONS.map(s => ({ id: s.id, visible: true })));
  const [links, setLinks] = useState([]);
  const [highlights, setHighlights] = useState([]); // נשמר כפי-שהוא (עריכת-מובחרים בגרסה נפרדת)
  const [publicHref, setPublicHref] = useState(null);
  const [readFailed, setReadFailed] = useState(false);

  useEffect(() => {
    let a = true;
    if (!user?.id) { setLoaded(true); return; }
    loadOwnWriterIdentity(user.id).then((value) => { if (a) setPublicHref(value.publicVisible ? value.href : null); });
    supabase.from("contributors").select("page_config,accent,emblem,bio,display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!a) return;
        if (error) { setReadFailed(true); setLoaded(true); return; }
        const pc = data?.page_config || {};
        setDisplayName(data?.display_name || "");
        setOrigName(data?.display_name || "");
        setAccent(pc.accent || data?.accent || "");
        setEmblem(pc.emblem || data?.emblem || "");
        setBio(pc.bio || data?.bio || "");
        setHighlights(Array.isArray(pc.highlights) ? pc.highlights : []);
        setLinks(Array.isArray(pc.links) ? pc.links : []);
        // ממזגים סדר/נראות שמורים עם ברירת-המחדל, כדי שמדור חדש לא ייעלם
        const saved = Array.isArray(pc.sections) ? pc.sections : [];
        const byId = Object.fromEntries(saved.map(s => [s.id, s]));
        const ordered = [
          ...saved.filter(s => PE_SECTIONS.some(d => d.id === s.id)).map(s => ({ id: s.id, visible: s.visible !== false })),
          ...PE_SECTIONS.filter(d => !byId[d.id]).map(d => ({ id: d.id, visible: true })),
        ];
        setSections(ordered);
        setLoaded(true);
      })
      .catch(() => { if (a) { setReadFailed(true); setLoaded(true); } });
    return () => { a = false; };
  }, [user?.id]);

  const labelOf = id => (PE_SECTIONS.find(s => s.id === id)?.label || id);
  const move = (i, dir) => setSections(prev => {
    const n = [...prev]; const j = i + dir; if (j < 0 || j >= n.length) return prev;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const toggle = i => setSections(prev => prev.map((s, k) => k === i ? { ...s, visible: !s.visible } : s));
  const addLink = () => setLinks(prev => prev.length >= 6 ? prev : [...prev, { label: "", url: "" }]);
  const setLink = (i, k, v) => setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const rmLink = i => setLinks(prev => prev.filter((_, idx) => idx !== i));

  async function save() {
    if (busy || readFailed || readOnly) return;
    setBusy(true); setMsg(null);
    const nameTrim = displayName.trim();
    const p_config = {
      version: 1,
      ...(nameTrim && nameTrim !== origName ? { display_name: nameTrim } : {}),
      accent: accent || undefined,
      emblem: emblem || undefined,
      bio: bio?.trim() || undefined,
      sections,
      highlights,
      links: links.filter(l => l.label?.trim() && l.url?.trim()).map(l => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    try {
      const { data, error } = await supabase.rpc("update_my_page_config", { p_config });
      if (error || data?.ok !== true) {
        const e = data?.error || "";
        const msgs = { bio_too_long: "הביו ארוך מדי (עד 600 תווים).", display_name_required: "השם לא יכול להישאר ריק.", display_name_too_long: "השם ארוך מדי (עד 60 תווים).", display_name_no_email: "השם לא יכול להיות כתובת מייל." };
        setMsg({ kind: "err", text: msgs[e] || (e.startsWith("bad_link") ? "קישור לא תקין — בדקו כותרת (עד 40) וכתובת (https:// או /)." : "לא התקבל אישור שמירה. מה שהקלדת נשאר כאן.") });
      } else {
        if (nameTrim) setOrigName(nameTrim);
        setMsg({ kind: "ok", text: "נשמר! הדף שלך עודכן ✓" });
        const current = await loadOwnWriterIdentity(user.id);
        setPublicHref(current.publicVisible ? current.href : null);
        onSaved?.();
      }
    } catch { setMsg({ kind: "err", text: "שגיאת רשת, נסו שוב." }); }
    setBusy(false);
  }

  if (!loaded) return <div style={{ color: T.sub, fontSize: 13, padding: "10px 0" }}>טוען…</div>;
  if (readFailed) return <p role="alert">לא ניתן לקרוא את הגדרות הדף כרגע. השמירה חסומה כדי לשמור על ההגדרות הקיימות.</p>;

  const chip = { border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", background: T.bg, color: T.ink, fontFamily: "inherit" };
  const H = ({ children }) => <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, margin: "16px 0 8px" }}>{children}</div>;
  const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: T.bg, border: `1px solid ${T.line}`, color: T.ink, fontFamily: "inherit", fontSize: 16, outline: "none" };

  return (
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.7, marginBottom: 6 }}>
        {readOnly ? "אפשר לצפות בפרטי הדף. שמירת שינויים אינה זמינה בגרסת התצוגה הזו." : "עצב את הדף הפומבי שלך. השינויים נשמרים ומופיעים לכל מבקר."}{" "}
        {publicHref ? <button onClick={() => window.location.assign(`${publicHref}?view=public`)} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>👁 תצוגה מקדימה ←</button> : null}
      </div>

      {/* 💡 נאדג' עדין — שם-תצוגה שנראה טכני (username/מייל גולמי, או "חוקר" הגנרי) */}
      {looksGenericName(origName) && (
        <div style={{ background: T.goldSoft || T.bg, border: `1px solid ${T.gold || T.line}`, borderRadius: 11, padding: "11px 13px", margin: "4px 0 14px", fontSize: 12.5, color: T.ink, lineHeight: 1.7 }}>
          💡 השם המוצג בדף שלך כרגע (<b>{origName || "—"}</b>) נראה טכני — כדאי לבחור שם ידידותי יותר שיוצג לכל מבקר, בשדה למטה.
        </div>
      )}

      <H>👤 שם התצוגה בדף</H>
      <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 60))} placeholder="השם שיוצג בראש הדף שלך" style={input} />

      <H>🎨 צבע-נושא</H>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PE_ACCENTS.map(hex => (
          <button key={hex} onClick={() => setAccent(hex)} title={hex}
            style={{ width: 30, height: 30, borderRadius: "50%", background: hex, cursor: "pointer",
              border: accent === hex ? `3px solid ${T.ink}` : `2px solid ${T.line}`, boxShadow: accent === hex ? `0 0 0 2px ${hex}55` : "none" }} />
        ))}
      </div>

      <H>✦ סמל</H>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PE_EMBLEMS.map(e => (
          <button key={e} onClick={() => setEmblem(emblem === e ? "" : e)}
            style={{ ...chip, padding: "5px 9px", fontSize: 17, background: emblem === e ? T.accSoft : T.bg, borderColor: emblem === e ? T.acc : T.line }}>{e}</button>
        ))}
      </div>

      <H>📝 ביו קצר (עד 600 תווים)</H>
      <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 600))} rows={3}
        placeholder="כמה מילים עליך ועל המחקר שלך…" style={{ ...input, resize: "vertical", minHeight: 64 }} />
      <div style={{ fontSize: 11, color: T.sub, textAlign: "end", marginTop: 3 }}>{bio.length}/600</div>

      <H>📑 מדורים — סדר ונראות</H>
      <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8 }}>הזז מדור למעלה/למטה או הסתר אותו מהדף שלך (מדור מוסתר לא נעלם — פשוט לא מוצג).</div>
      <div style={{ display: "grid", gap: 6 }}>
        {sections.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 10px" }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: s.visible ? T.ink : T.sub, opacity: s.visible ? 1 : .6 }}>{labelOf(s.id)}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...chip, padding: "4px 9px", opacity: i === 0 ? .4 : 1 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} style={{ ...chip, padding: "4px 9px", opacity: i === sections.length - 1 ? .4 : 1 }}>↓</button>
            <button onClick={() => toggle(i)} style={{ ...chip, padding: "4px 11px", background: s.visible ? T.accSoft : T.bg, borderColor: s.visible ? T.acc : T.line, color: s.visible ? T.acc : T.sub }}>{s.visible ? "מוצג" : "מוסתר"}</button>
          </div>
        ))}
      </div>

      <H>🔗 קישורים חיצוניים (עד 6)</H>
      <div style={{ display: "grid", gap: 8 }}>
        {links.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
            <input value={l.label} onChange={e => setLink(i, "label", e.target.value)} placeholder="כותרת" style={{ ...input, fontSize: 14 }} />
            <input value={l.url} onChange={e => setLink(i, "url", e.target.value)} placeholder="https://…" dir="ltr" style={{ ...input, fontSize: 14 }} />
            <button onClick={() => rmLink(i)} style={{ ...chip, padding: "8px 11px", color: "#c0453c" }}>✕</button>
          </div>
        ))}
        {links.length < 6 && <button onClick={addLink} style={{ ...chip, justifySelf: "start" }}>➕ הוסף קישור</button>}
      </div>

      {msg && (
        <div role={msg.kind === "ok" ? "status" : "alert"} style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, borderRadius: 10, padding: "9px 12px",
          background: msg.kind === "ok" ? "#e9f9ef" : "#fdecea", color: msg.kind === "ok" ? "#1a7f37" : "#b3261e", border: `1px solid ${msg.kind === "ok" ? "#bfe9cd" : "#f5c6c0"}` }}>
          {msg.kind === "ok" && refreshUnavailable ? "הדף נשמר. רענון הפרטים לא הושלם; אפשר להמשיך לערוך." : msg.text}
        </div>
      )}
      <button onClick={save} disabled={busy || readOnly} style={{ width: "100%", marginTop: 14, background: T.acc, color: "#fff", border: "none", borderRadius: 11, padding: "13px 16px", minHeight: 48, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: busy || readOnly ? "default" : "pointer", opacity: busy || readOnly ? .7 : 1 }}>
        {busy ? "שומר…" : "💾 שמור את הדף שלי"}
      </button>
    </fieldset>
  );
}

// 🪪 הפרטים שלי (הועבר מ-/profile) — שם מלא + תאריך-לידה (save_my_info). פרטי; פותח ניתוח-שם + רזיאל.

export { PageEditor };
