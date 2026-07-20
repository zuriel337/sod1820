import React, { useEffect, useRef, useState } from "react";
import { applySeo } from "../lib/seo.js";
import {
  labTeacherReply, getLabNotes, addLabNote, deleteLabNote,
  getLabThread, saveLabMessage,
} from "../lib/lab.js";

// 🧪 /meaning-lab — «מעבדה להבנת משמעות». דף עצמאי חבוי (מחוץ ל-Layout, לא בתפריט).
// שכבת-נתונים מבודדת (lab_*) + סוכן ההוראה (Edge lab-teacher). אפס נגיעה בליבה.

const UNIFYING = "איך בני אדם יוצרים משמעות מתוך העולם?";
const MODULES = [
  "0 · איך המוח קולט שפה",
  "1 · מודלי רכישת-שפה",
  "2 · ענפי הבלשנות",
  "3 · שפה ומחשבה",
  "4 · דפוסים: אמת מול אשליה",
  "5 · מחקר · מוצר · עסק",
];
const LEVELS = [
  { v: "", t: "— רמה —" },
  { v: "linguistic", t: "🔵 לשונית" },
  { v: "cognitive", t: "🟢 קוגניטיבית" },
  { v: "research", t: "🟡 מחקרית" },
];
const KINDS = [
  { v: "concept", t: "מושג" },
  { v: "note", t: "הערה" },
  { v: "source", t: "מקור" },
  { v: "question", t: "שאלה" },
  { v: "insight", t: "תובנה" },
];
const AUTHORS = [
  { v: "zuriel", t: "צוריאל" },
  { v: "maya", t: "מאיה" },
  { v: "claude", t: "המורה" },
];
const LEVEL_LABEL = { linguistic: "🔵 לשונית", cognitive: "🟢 קוגניטיבית", research: "🟡 מחקרית" };
const AUTHOR_LABEL = { zuriel: "צוריאל", maya: "מאיה", claude: "המורה" };

const CSS = `
.mlab{direction:rtl;min-height:100vh;background:#f6f7f9;color:#1b1d22;
  font-family:system-ui,-apple-system,"Segoe UI","Heebo",Arial,sans-serif;
  padding:calc(16px + env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box}
.mlab *{box-sizing:border-box}
.mlab-wrap{max-width:1080px;margin:0 auto}
.mlab-head{text-align:center;margin-bottom:14px}
.mlab-kicker{font-size:11px;letter-spacing:3px;color:#caa53d;font-weight:800;text-transform:uppercase}
.mlab-h1{font-size:clamp(22px,5vw,32px);font-weight:800;margin:4px 0 2px}
.mlab-q{color:#5b6472;font-size:14px;font-style:italic}
.mlab-mods{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px}
.mlab-mod{background:#fff;border:1px solid #e6e8ec;border-radius:999px;padding:4px 10px;font-size:12px;color:#5b6472}
.mlab-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin-top:16px;align-items:start}
@media(max-width:820px){.mlab-grid{grid-template-columns:1fr}}
.mlab-card{background:#fff;border:1px solid #e6e8ec;border-radius:16px;padding:14px;box-shadow:0 1px 3px rgba(20,24,40,.04)}
.mlab-card h2{font-size:15px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:6px}
.mlab-chat{display:flex;flex-direction:column;min-height:380px}
.mlab-msgs{flex:1;overflow-y:auto;max-height:56vh;display:flex;flex-direction:column;gap:10px;padding:2px}
.mlab-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.mlab-msg.user{align-self:flex-start;background:#eef3ff;border:1px solid #d9e4ff}
.mlab-msg.maya{align-self:flex-start;background:#fff4e6;border:1px solid #ffe0b8}
.mlab-msg.assistant{align-self:flex-end;background:#f4f6f8;border:1px solid #e6e8ec}
.mlab-msg .who{display:block;font-size:11px;font-weight:800;color:#8a93a3;margin-bottom:3px}
.mlab-empty{color:#8a93a3;font-size:13.5px;text-align:center;padding:24px 8px;line-height:1.7}
.mlab-inrow{display:flex;gap:8px;margin-top:10px;align-items:flex-end}
.mlab-ta{flex:1;resize:vertical;min-height:46px;max-height:180px;font-size:16px;line-height:1.5;
  padding:10px 12px;border:1px solid #d5dae2;border-radius:12px;font-family:inherit;background:#fbfcfe;color:#1b1d22}
.mlab-ta:focus{outline:none;border-color:#2f6df6;background:#fff}
.mlab-btn{border:none;border-radius:12px;padding:0 16px;height:46px;font-size:14px;font-weight:800;cursor:pointer;
  background:#2f6df6;color:#fff;white-space:nowrap}
.mlab-btn:disabled{opacity:.5;cursor:default}
.mlab-btn.ghost{background:#eef1f5;color:#3a4048}
.mlab-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;font-size:13px;color:#5b6472}
.mlab-seg{display:inline-flex;border:1px solid #d5dae2;border-radius:10px;overflow:hidden}
.mlab-seg button{border:none;background:#fff;padding:6px 11px;font-size:12.5px;font-weight:700;cursor:pointer;color:#5b6472}
.mlab-seg button.on{background:#2f6df6;color:#fff}
.mlab-field{width:100%;font-size:16px;padding:9px 11px;border:1px solid #d5dae2;border-radius:10px;
  font-family:inherit;background:#fbfcfe;color:#1b1d22;margin-bottom:8px}
.mlab-field:focus{outline:none;border-color:#2f6df6;background:#fff}
.mlab-row2{display:flex;gap:8px}
.mlab-row2>*{flex:1}
.mlab-note{border:1px solid #eceef2;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fbfcfd}
.mlab-note .nt{font-weight:800;font-size:13.5px;margin-bottom:3px}
.mlab-note .nb{font-size:13px;color:#40474f;line-height:1.6;white-space:pre-wrap}
.mlab-note .nm{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;font-size:11px;color:#8a93a3}
.mlab-chip{background:#eef1f5;border-radius:999px;padding:2px 8px;font-size:11px;color:#5b6472}
.mlab-del{margin-inline-start:auto;background:none;border:none;color:#c05353;cursor:pointer;font-size:12px;font-weight:700}
.mlab-src{color:#2f6df6;text-decoration:none;font-size:11px}
.mlab-foot{text-align:center;color:#aeb4be;font-size:11.5px;margin-top:18px;line-height:1.7}
`;

function apiMessages(list) {
  // בונה את מערך-ההודעות למודל: תפקיד user/assistant; הודעות מאיה מסומנות כיועצת-אורחת.
  return list.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.author === "maya" ? `[מאיה, יועצת-אורחת]: ${m.content}` : m.content,
  }));
}

export default function MeaningLabPage() {
  const [msgs, setMsgs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState("");
  const [sender, setSender] = useState("zuriel");   // מי כותב לשיח: zuriel | maya
  const [depth, setDepth] = useState("deep");        // deep=Sonnet | fast=Haiku
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ kind: "concept", level: "", title: "", body: "", source_url: "", author: "zuriel" });
  const scRef = useRef(null);

  useEffect(() => { applySeo({ title: "מעבדה להבנת משמעות", description: "סביבת לימוד פרטית", path: "/meaning-lab", noindex: true }); }, []);
  useEffect(() => { (async () => {
    setMsgs(await getLabThread("main"));
    setNotes(await getLabNotes());
  })(); }, []);
  useEffect(() => { const el = scRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const mine = { role: "user", author: sender, content: text };
    const next = [...msgs, mine];
    setMsgs(next);
    setBusy(true);
    saveLabMessage(mine);                                  // fire-and-forget
    const { reply, error } = await labTeacherReply(apiMessages(next), { fast: depth === "fast" });
    const botText = reply || (error === "not_configured"
      ? "⚠️ מנוע ה-AI לא מחובר (חסר מפתח). בדוק את ה-secret של הפונקציה."
      : "⚠️ לא התקבלה תשובה כרגע. נסה שוב בעוד רגע.");
    const bot = { role: "assistant", author: "claude", content: botText };
    setMsgs((m) => [...m, bot]);
    if (reply) saveLabMessage(bot);
    setBusy(false);
  }

  function onKey(e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }

  async function submitNote(e) {
    e.preventDefault();
    if (!note.title.trim()) return;
    const saved = await addLabNote({ ...note, title: note.title.trim(), body: note.body.trim() || null, source_url: note.source_url.trim() || null, level: note.level || null });
    if (saved) { setNotes((n) => [saved, ...n]); setNote({ kind: "concept", level: "", title: "", body: "", source_url: "", author: note.author }); }
  }

  async function removeNote(id) { await deleteLabNote(id); setNotes((n) => n.filter((x) => x.id !== id)); }

  return (
    <div className="mlab">
      <style>{CSS}</style>
      <div className="mlab-wrap">
        <div className="mlab-head">
          <div className="mlab-kicker">מעבדה להבנת משמעות</div>
          <h1 className="mlab-h1">🧪 מעבדה להבנת משמעות</h1>
          <div className="mlab-q">«{UNIFYING}»</div>
          <div className="mlab-mods">{MODULES.map((m) => <span key={m} className="mlab-mod">{m}</span>)}</div>
        </div>

        <div className="mlab-grid">
          {/* ── שיח המורה ── */}
          <div className="mlab-card mlab-chat">
            <h2>🎓 שיח עם המורה</h2>
            <div className="mlab-msgs" ref={scRef}>
              {msgs.length === 0 && (
                <div className="mlab-empty">
                  כאן לומדים בשיח, צעד-צעד.{"\n"}שאל שאלה, בקש להסביר מושג, או בקש להתחיל את מודול 0.{"\n"}
                  מאיה יכולה להיכנס — החליפי את הכותב ל«מאיה» כדי לייעץ.
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={m.id || i} className={`mlab-msg ${m.role === "assistant" ? "assistant" : (m.author === "maya" ? "maya" : "user")}`}>
                  <span className="who">{m.role === "assistant" ? "🎓 המורה" : (AUTHOR_LABEL[m.author] || "צוריאל")}</span>
                  {m.content}
                </div>
              ))}
              {busy && <div className="mlab-msg assistant"><span className="who">🎓 המורה</span>כותב…</div>}
            </div>

            <div className="mlab-inrow">
              <textarea className="mlab-ta" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                placeholder={sender === "maya" ? "מאיה — הערה / כיוון / תיקון מושג…" : "כתוב למורה… (⌘/Ctrl+Enter לשליחה)"} />
              <button className="mlab-btn" onClick={send} disabled={busy || !input.trim()}>{busy ? "…" : "שלח"}</button>
            </div>
            <div className="mlab-controls">
              <span>כותב:</span>
              <span className="mlab-seg">
                {AUTHORS.slice(0, 2).map((a) => (
                  <button key={a.v} className={sender === a.v ? "on" : ""} onClick={() => setSender(a.v)}>{a.t}</button>
                ))}
              </span>
              <span style={{ marginInlineStart: 8 }}>מנוע:</span>
              <span className="mlab-seg">
                <button className={depth === "deep" ? "on" : ""} onClick={() => setDepth("deep")}>עמוק</button>
                <button className={depth === "fast" ? "on" : ""} onClick={() => setDepth("fast")}>מהיר</button>
              </span>
            </div>
          </div>

          {/* ── הזנת-ידע ── */}
          <div className="mlab-card">
            <h2>📥 הזנת ידע</h2>
            <form onSubmit={submitNote}>
              <input className="mlab-field" placeholder="כותרת (מושג / הערה / מקור)…" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} />
              <textarea className="mlab-field" rows={3} placeholder="פירוט (לא חובה)…" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} />
              <input className="mlab-field" placeholder="קישור למקור (לא חובה)…" value={note.source_url} onChange={(e) => setNote({ ...note, source_url: e.target.value })} />
              <div className="mlab-row2">
                <select className="mlab-field" value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })}>
                  {KINDS.map((k) => <option key={k.v} value={k.v}>{k.t}</option>)}
                </select>
                <select className="mlab-field" value={note.level} onChange={(e) => setNote({ ...note, level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.t}</option>)}
                </select>
                <select className="mlab-field" value={note.author} onChange={(e) => setNote({ ...note, author: e.target.value })}>
                  {AUTHORS.map((a) => <option key={a.v} value={a.v}>{a.t}</option>)}
                </select>
              </div>
              <button className="mlab-btn" type="submit" style={{ width: "100%" }} disabled={!note.title.trim()}>➕ הוסף למעבדה</button>
            </form>

            <div style={{ marginTop: 14 }}>
              {notes.length === 0 && <div className="mlab-empty" style={{ padding: "14px 4px" }}>עדיין אין רשומות. כל מה שנלמד — מושגים, מקורות, תובנות — נצבר כאן.</div>}
              {notes.map((n) => (
                <div key={n.id} className="mlab-note">
                  <div className="nt">{n.title}</div>
                  {n.body && <div className="nb">{n.body}</div>}
                  <div className="nm">
                    <span className="mlab-chip">{(KINDS.find((k) => k.v === n.kind) || {}).t || n.kind}</span>
                    {n.level && <span className="mlab-chip">{LEVEL_LABEL[n.level] || n.level}</span>}
                    <span className="mlab-chip">{AUTHOR_LABEL[n.author] || n.author}</span>
                    {n.source_url && <a className="mlab-src" href={n.source_url} target="_blank" rel="noreferrer">מקור ↗</a>}
                    <button className="mlab-del" onClick={() => removeNote(n.id)}>מחק</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mlab-foot">🔒 דף פרטי — לא מקושר לאתר, לא מאונדקס. הכל נשמר בטבלאות מבודדות (lab_*).</div>
      </div>
    </div>
  );
}
