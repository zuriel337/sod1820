import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  CHALLENGE_DOMAINS, domainMeta, DIFFICULTY, CHALLENGE_STATUS,
  claimChallenge, setChallengeProgress, solveChallenge, openChallenge,
} from "../lib/challenges.js";

// 🧩 כרטיס-אתגר קנוני — «אתגר מחקר» חי בתוך הזרם (פורום/דף-חוקר). מציג סטטוס·קושי·תחומים·
// מדד-התקדמות, ופעולות הלייף-סייקל: ✋ אני בודק · 🔬 עדכון-ביניים · ✅ נפתר. עץ אחד: overlay על תרומה.
export default function ChallengeCard({ challenge, elsPhrase = null, onChanged }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const [ch, setCh] = useState(challenge);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  if (!ch) return null;

  const st = CHALLENGE_STATUS[ch.status] || CHALLENGE_STATUS.open;
  const df = ch.difficulty ? DIFFICULTY[ch.difficulty] : null;
  const mine = user && ch.claimed_by_uid === user.id;
  const canAct = isAdmin || mine;
  const solved = ch.status === "solved";
  const reload = () => onChanged?.();

  async function run(fn, optimistic) {
    setBusy(true);
    try { await fn(); setCh(c => ({ ...c, ...optimistic })); reload(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }
  const doClaim = () => user
    ? run(() => claimChallenge(ch.id), { status: "claimed", claimed_by_uid: user.id, claimed_by_name: "אני" })
    : alert("התחברו כדי לקחת אתגר על עצמכם 🙂");
  const doProgress = (p) => run(async () => { await setChallengeProgress(ch.id, p, noteOpen && note.trim() ? note.trim() : null); setNote(""); setNoteOpen(false); }, { progress: p });
  const doSolve = () => run(() => solveChallenge(ch.id), { status: "solved", progress: 100, solved_by_uid: user?.id });

  const elsHref = `/research?tool=els${elsPhrase ? `&q=${encodeURIComponent(elsPhrase)}` : ""}`;
  const pill = (bg, col, txt) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: bg, color: col, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800 }}>{txt}</span>
  );
  const btn = (gold) => ({ cursor: busy ? "wait" : "pointer", borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, minHeight: 36,
    border: gold ? "none" : `1px solid ${P.border}`, background: gold ? P.accentBtn : "transparent", color: gold ? (P.onAccent || "#1a0e00") : P.accentText });

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(132,88,255,0.10), rgba(212,175,55,0.06))", border: `1px solid ${solved ? "#d4af37" : P.borderStrong}`, borderRadius: 14, padding: "13px 15px", marginTop: 10 }}>
      <style>{`@keyframes sosPulse{0%,100%{box-shadow:0 0 0 0 rgba(214,74,58,.55)}50%{box-shadow:0 0 0 5px rgba(214,74,58,0)}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 7 }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15, fontWeight: 900 }}>🧩 אתגר מחקר</span>
        {/* 🆘 תג בולט לאתגר פתוח שממתין לחוקר — שיזוהה מיד בזרם */}
        {ch.status === "open" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#d64a3a", color: "#fff", borderRadius: 999, padding: "2px 11px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 900, animation: "sosPulse 1.8s ease-in-out infinite" }}>🆘 דרוש חוקר</span>
        )}
        {pill("transparent", st.color, `${st.emoji} ${st.label}`)}
        {df && pill("transparent", P.accentDim, `${df.emoji} ${df.label}`)}
        <span style={{ flex: 1 }} />
        {(ch.domains || []).map(d => { const m = domainMeta(d); return pill(P.glow, P.accentText, `${m.emoji} ${m.label}`); })}
      </div>

      {ch.title && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.6 }}><b style={{ color: P.accentText }}>מחפש:</b> {ch.title}</div>}

      {/* מדד-התקדמות */}
      <div style={{ marginTop: 9 }}>
        <div style={{ height: 7, borderRadius: 999, background: P.cardSoft, border: `1px solid ${P.border}`, overflow: "hidden" }}>
          <div style={{ width: `${ch.progress || 0}%`, height: "100%", background: solved ? "linear-gradient(90deg,#d4af37,#f6e27a)" : "linear-gradient(90deg,#8458ff,#b9a4ff)", borderRadius: 999, transition: "width .3s" }} />
        </div>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, marginTop: 4 }}>התקדמות {ch.progress || 0}%</div>
      </div>

      {/* מי-במי */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>
        {ch.opened_by_name && <span>✍️ נפתח ע״י <b style={{ color: P.accentText }}>{ch.opened_by_name}</b></span>}
        {ch.status === "claimed" && ch.claimed_by_name && <span>🔵 בטיפול ע״י <b style={{ color: P.accentText }}>{ch.claimed_by_name}</b></span>}
        {solved && ch.solved_by_name && <span>✅ נפתר ע״י <b style={{ color: "#d4af37" }}>{ch.solved_by_name}</b> · +50 XP</span>}
      </div>

      {/* פעולות */}
      {!solved && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          {(ch.domains || []).includes("els") && (
            <a href={elsHref} style={{ ...btn(true), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>🔠 פתחו בצופן</a>
          )}
          {ch.status === "open" && <button disabled={busy} onClick={doClaim} style={btn(!((ch.domains || []).includes("els")))}>✋ אני בודק</button>}
          {canAct && (
            <>
              <button disabled={busy} onClick={() => doProgress(30)} style={btn(false)}>30%</button>
              <button disabled={busy} onClick={() => doProgress(70)} style={btn(false)}>70%</button>
              <button disabled={busy} onClick={() => setNoteOpen(v => !v)} style={btn(false)}>💬 עדכון-ביניים</button>
              <button disabled={busy} onClick={doSolve} style={btn(true)}>✅ נפתר</button>
            </>
          )}
        </div>
      )}
      {noteOpen && canAct && (
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="מצאתי כיוון… / בדקתי ולא מצאתי… / דרוש כלי דילוגים…"
            style={{ flex: 1, minWidth: 160, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "8px 11px", color: P.ink, fontFamily: F.body, fontSize: 13, outline: "none" }} />
          <button disabled={busy || !note.trim()} onClick={() => doProgress(ch.progress || 30)} style={{ ...btn(true), opacity: note.trim() ? 1 : 0.5 }}>שלח עדכון</button>
        </div>
      )}
    </div>
  );
}

// 🧩 «הפוך לאתגר מחקר» — אדמין/מחבר בוחר תחומים+קושי והופך חידוש קיים לאתגר. חי בתוך הכרטיס.
export function ChallengeCreate({ contributionId, defaultTitle = "", onCreated }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState([]);
  const [difficulty, setDifficulty] = useState(2);
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState(false);
  if (!user && !isAdmin) return null;

  const toggle = (k) => setDomains(d => d.includes(k) ? d.filter(x => x !== k) : [...d, k]);
  async function create() {
    setBusy(true);
    try { await openChallenge({ contributionId, title: title.trim() || null, domains, difficulty }); setOpen(false); onCreated?.(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }
  const chip = (on) => ({ cursor: "pointer", borderRadius: 999, padding: "4px 11px", fontFamily: F.heading, fontSize: 12, fontWeight: 700,
    border: `1px solid ${on ? P.borderStrong : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent", color: on ? P.accentText : P.accentDim });

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ cursor: "pointer", background: "transparent", border: `1px dashed ${P.borderStrong}`, color: P.accentText, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "5px 13px" }}>🧩 הפוך לאתגר מחקר</button>
  );
  return (
    <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 13px", marginTop: 8 }}>
      {/* 🎯 אצירה — «איכות לפני כמות»: הנחיה קצרה שומרת על היוקרה בלי חיכוך מיותר */}
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.6, marginBottom: 9, paddingInlineStart: 8, borderInlineStart: `2px solid ${P.borderStrong}` }}>
        לפני יצירת אתגר מחקר, ודאו ש: הוא יכול להועיל גם לחוקרים נוספים · יש בו ערך מחקרי אמיתי · הבקשה מוגדרת בבירור.
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="מחפש: … (מה דרוש לפצח)"
        style={{ width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "8px 11px", color: P.ink, fontFamily: F.body, fontSize: 13.5, outline: "none", marginBottom: 9 }} />
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700, marginBottom: 5 }}>תחומים דרושים (איתות לחוקרים המתאימים):</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
        {CHALLENGE_DOMAINS.map(d => <button key={d.key} onClick={() => toggle(d.key)} style={chip(domains.includes(d.key))}>{d.emoji} {d.label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>קושי:</span>
        {[1, 2, 3].map(n => <button key={n} onClick={() => setDifficulty(n)} style={chip(difficulty === n)}>{DIFFICULTY[n].emoji} {DIFFICULTY[n].label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={create} style={{ cursor: "pointer", background: P.accentBtn, border: "none", color: P.onAccent || "#1a0e00", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "7px 16px" }}>צור אתגר</button>
        <button onClick={() => setOpen(false)} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "7px 14px" }}>ביטול</button>
      </div>
    </div>
  );
}
