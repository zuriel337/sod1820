// ===== 💬 חדר רזיאל — מחקר ופיקוד (Raziel Room) =====
// חולץ מ-AdminPage.jsx (היה מוגדר בתוך CommandCenterTab היתום, שלא מנותב לשום tab-key חי —
// ראה COMMAND_CENTER_ATTENTION_CLOSURE, פאס 1). קובץ עצמאי כדי שגם WarRoomTab וגם AdminPage
// (אם/כש-CommandCenterTab יחזור לחיים) ישתמשו באותו רכיב בדיוק — אין שכפול-קוד.
// אינו מקור-ידע חדש: שולף dossier קנוני (fn_number_dossier) ומדבר עליו. אותו עץ, אותו metatron_context.
// Human-Gate: רזיאל קורא/מנתח/מסביר/ממליץ בלבד. פקודות-אישור/דחייה קיימות (decideCandidate/
// sendCandidateFromResearcher) עוברות דרך אותם RPCs מאושרים שכבר משמשים את שופט-ההתכנסויות —
// לא נוסף כאן אפס-הרשאה חדשה, לא נוסף נתיב-פרסום/קנוניזציה.
import React, { useState, useEffect } from "react";
import { F } from "../../theme.js";
import { judgeLastVisit, getSeenMap, candidateState, ageLabel } from "../../lib/judgeQueue.js";
import { getConvergenceCandidates, decideCandidate, sendCandidateFromResearcher, askNumberResearcher, getNumberDossier, loadResearcherThread } from "../../lib/visits.js";

// 🎨 עותק-מקומי של פלטת-האדמין (var(--adm-*), מוזרק פעם-אחת ע"י AdminPage.jsx ל-:root —
// אותם משתנים, בלי import-חוצה-קבצים; אותו דפוס-שכפול-פלטה שכבר קיים ב-WarRoomTab.jsx).
const C = {
  goldLight: "var(--adm-goldLight)", goldBright: "var(--adm-goldBright)", goldDim: "var(--adm-goldDim)",
  surface2: "var(--adm-surface2)", border: "var(--adm-border)", muted: "var(--adm-muted)", crimsonLight: "var(--adm-crimsonLight)",
};
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", minWidth: 0, maxWidth: "100%" };
function segBtn(active) { return { cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: "none", background: active ? "rgba(212,175,55,0.22)" : "transparent", color: active ? C.goldBright : C.muted }; }

// שמות-שיטות בעברית לתצוגה (המנוע מחזיר תעתיק אנגלי) — למניעת «אותיות באנגלית» בממשק
const METHOD_HE = { ragil: "רגיל", gadol: "גדול", katan: "קטן", kadmi: "קדמי", misratar: "מסתתר", atbash: "אתבש", siduri: "סידורי", mispar_katan: "מספר קטן", neelam: "נעלם", meshulash: "משולש", perati: "פרטי" };
const heM = (m) => METHOD_HE[String(m || "").trim()] || m;

export default function NumberResearcher() {
  const [input, setInput] = useState("");
  const [values, setValues] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [msgs, setMsgs] = useState([]);           // [{role:'user'|'assistant', text}]
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState("");
  const [showDoss, setShowDoss] = useState(false);
  const [sent, setSent] = useState(null);
  const [err, setErr] = useState("");
  const [cands, setCands] = useState([]);          // מועמדים ממתינים בשופט (רשימה חיה)
  const [busyC, setBusyC] = useState(null);
  const [snap, setSnap] = useState(null);          // context_snapshot של התשובה האחרונה
  const [showSnap, setShowSnap] = useState(false);

  const loadCands = () => getConvergenceCandidates(50).then(r => setCands(r?.candidates || [])).catch(() => {});
  useEffect(() => { loadCands(); }, []);
  // 🧵 השיחה מתמשכת — נטענת מ-agent_user_memory (channel='site') בכל כניסה/רענון, לא נמחקת.
  // משחזר גם את ה-snapshot האחרון → «על סמך מה רזיאל ענה?» עובד מיד אחרי כניסה מחדש (Replay).
  useEffect(() => { loadResearcherThread().then(r => { if (r?.history?.length) setMsgs(r.history); if (r?.snapshot) setSnap(r.snapshot); }).catch(() => {}); }, []);
  const push = (role, text) => setMsgs(p => [...p, { role, text }]);

  const parseVals = (s) => (s.match(/\d{1,6}/g) || []).slice(0, 2).map(Number);

  // 🎛️ פקודות-שיחה: «אשר 321» · «דחה 665» · «חלקי 424» · «שלח 318 לשופט»
  const detectCommand = (m) => {
    const num = (m.match(/\d{1,6}/) || [])[0];
    if (!num) return null;
    if (/לשופט|שלח\b/.test(m)) return { kind: "judge", v: num };
    if (/\b(אשר|תאשר|אישור|מאשר)\b/.test(m)) return { kind: "approve", v: num };
    if (/\b(דחה|תדחה|דחייה|לדחות|דוחה)\b/.test(m)) return { kind: "reject", v: num };
    if (/\bחלקי\b/.test(m)) return { kind: "partial", v: num };
    return null;
  };
  const runCommand = async (cmd) => {
    setBusyC(cmd.v);
    const c = cands.find(x => String(x.subject_ref) === String(cmd.v));
    let note;
    if (cmd.kind === "judge") {
      const r = await sendCandidateFromResearcher(Number(cmd.v)).catch(() => null);
      note = r?.status === "sent_to_judge" ? `✅ שלחתי את ${cmd.v} לשופט (${r.recommendation}).` : r?.status === "already_pending" ? `ℹ️ ${cmd.v} כבר ממתין בשופט.` : `לא הצלחתי לשלוח את ${cmd.v}.`;
      await loadCands();
    } else if (!c) {
      note = `אין מועמד ממתין ל-${cmd.v} בשופט. אם תרצה — אמור «שלח ${cmd.v} לשופט» ואייצר מועמד.`;
    } else {
      const dec = cmd.kind === "approve" ? "approve" : cmd.kind === "reject" ? "reject" : "partial";
      const res = await decideCandidate(c.id, dec).catch(() => null);
      setCands(prev => prev.filter(x => x.id !== c.id));
      note = `${dec === "approve" ? "✅ אושר" : dec === "reject" ? "❌ נדחה" : "✏️ חלקי"}: ${cmd.v}. נכנס ל-decision_ledger + הזין את Learned-Pattern. ${res?.pattern_key ? "(דפוס: " + res.pattern_key + ")" : ""}`;
    }
    push("assistant", note);
    setBusyC(null);
  };

  // 🗂️ «קול השולחן» — רזיאל עונה על שאלות-תור מתוך המועמדים הקיימים (אדמין בלבד, בלי מקור-אמת חדש).
  // קורא את אותו מצב-תור פר-משתמש (localStorage) של שולחן השופט → «חדש/כבר-ראיתי» עקביים בשני המקומות.
  // כלל-הברזל נשמר: מועמד ממתין = טרם הוכרע → «עדיין אין החלטה שלך». צפייה אינה החלטה.
  const answerDeskQuery = (m) => {
    const asksDesk = /(שולחן|שופט|ממת|מחכ|תור|מועמד|רשימה|חדש)/.test(m);
    const asksWhy = /למה/.test(m);
    const numInMsg = (m.match(/\d{1,6}/) || [])[0];
    if (!asksDesk && !(asksWhy && numInMsg)) return null;   // לא שאלת-שולחן → רזיאל הרגיל עונה
    const cutoff = judgeLastVisit(); const seenMap = getSeenMap();
    const withS = cands.map(c => ({ c, s: candidateState(c, cutoff, seenMap) }));
    const at = c => c.created_at || "";
    const line = (c, s) => `• ${c.subject_ref} — ${REC_META[c.recommendation]?.[1] || c.recommendation}${s.isNew ? " 🆕" : s.isSeen ? " 👀" : ""} · ${(c.why || {}).method_count || 0} שיטות · ממתין ${ageLabel(c.created_at)}`;
    // «למה X עדיין מחכה» — רק בהקשר-שולחן, כדי לא לחטוף שאלת-גימטריה רגילה
    if (asksWhy && numInMsg && asksDesk) {
      const hit = withS.find(x => String(x.c.subject_ref) === String(numInMsg));
      if (hit) {
        const w = hit.c.why || {};
        return `⚖️ ${numInMsg} עדיין מועמד כי השופט דירג «${REC_META[hit.c.recommendation]?.[1] || hit.c.recommendation}»: התכנסות ב-${w.method_count || 0} שיטות${w.anchor ? " · עוגן: " + w.anchor : ""}${(w.evidence_ids || []).length ? " · " + w.evidence_ids.length + " ראיות" : ""}. ממתין ${ageLabel(hit.c.created_at)}.\n👁️ עדיין אין החלטה שלך על הממצא הזה — הוא ממתין להכרעתך (הגיל אינו מעלה חשיבות).`;
      }
      return `אין מועמד ממתין ל-${numInMsg} בשולחן — כלומר אין ממצא פתוח שמחכה כרגע להכרעתך עליו. אם תרצה, אמור «שלח ${numInMsg} לשופט».`;
    }
    if (!cands.length) return "🗂️ השולחן ריק כרגע — אין מועמדים ממתינים. «🔨 סרוק מועמדים» בשופט יפיק אצווה.";
    const rank = { strong: 0, needs_check: 1, weak: 2, duplicate: 3 };
    if (/הרבה זמן|ותיק|ישן|כמה זמן|מזמן/.test(m)) {
      const old = [...withS].sort((a, b) => at(a.c).localeCompare(at(b.c))).slice(0, 5);
      return `🕰️ הממתינים הכי מזמן:\n${old.map(({ c, s }) => line(c, s)).join("\n")}\n(תזכורת: גיל אינו מעלה חשיבות — ותיק לא הופך חזק מעצמו.)`;
    }
    if (/מעניין|חזק|תשומת/.test(m)) {
      const unseen = withS.filter(x => !x.s.isSeen);
      const pool = (unseen.length ? unseen : withS).sort((a, b) => (rank[a.c.recommendation] ?? 9) - (rank[b.c.recommendation] ?? 9) || (b.c.conf || 0) - (a.c.conf || 0)).slice(0, 3);
      return `🔥 ${unseen.length ? "שלושת המעניינים שעוד לא ראית" : "הכי חזקים על השולחן"}:\n${pool.map(({ c, s }) => line(c, s)).join("\n")}\n(«חזק» = דירוג השופט, לא «תאשר».)`;
    }
    if (/חדש/.test(m)) {
      const fresh = withS.filter(x => x.s.isNew);
      if (!fresh.length) return "🆕 אין מועמדים חדשים מאז ביקורך האחרון בשולחן.";
      return `🆕 חדש מאז ביקורך (${fresh.length}):\n${fresh.slice(0, 8).map(({ c, s }) => line(c, s)).join("\n")}`;
    }
    const nNew = withS.filter(x => x.s.isNew).length, nSeen = withS.filter(x => x.s.isSeen).length, nStrong = withS.filter(x => x.s.isStrong).length;
    return `🗂️ על השולחן ${cands.length} מועמדים ממתינים — 🆕 ${nNew} חדשים · 🔥 ${nStrong} דורשי-תשומת-לב · 👀 ${nSeen} שכבר ראית.\n${withS.slice(0, 6).map(({ c, s }) => line(c, s)).join("\n")}\nשאל «מה מחכה הכי הרבה זמן», «הכי מעניינים שלא ראיתי», או «למה ${(cands[0] || {}).subject_ref || "665"} מחכה».`;
  };

  const start = async () => {
    const vals = parseVals(input);
    if (!vals.length) return;
    setValues(vals); setSent(null); setErr(""); setSending(true);
    push("user", `🔎 חקירת ${vals.join(" · ")}`);  // השיחה נמשכת — לא מוחקים היסטוריה
    try {
      const ds = await Promise.all(vals.map(v => getNumberDossier(v).catch(() => null)));
      setDossiers(ds);
      const res = await askNumberResearcher(vals, "", []);
      if (res?.dossiers) setDossiers(res.dossiers);
      if (res?.context_snapshot) setSnap(res.context_snapshot);
      push("assistant", res?.answer || "רגע — נתקעתי לרגע. נסה לשלוח שוב 🌳");
    } catch (e) { setErr(e.message || "שגיאה"); }
    setSending(false);
  };
  const send = async () => {
    const m = chat.trim(); if (!m || sending) return;
    setChat(""); setSending(true); setErr("");
    push("user", m);
    // פקודה? מבצע ומעדכן את הרשימה החיה — בלי לשלוח לרזיאל
    const cmd = detectCommand(m);
    if (cmd) { await runCommand(cmd); setSending(false); return; }
    // שאלת-שולחן? רזיאל עונה מיד מהתור החי (בלי סבב-שרת) — «מה חדש», «מה מחכה הרבה», «למה X מחכה»
    const deskAns = answerDeskQuery(m);
    if (deskAns) { push("assistant", deskAns); setSending(false); return; }
    const hist = msgs.map(x => ({ role: x.role, text: x.text }));
    try {
      const vals = values.length ? values : parseVals(m);
      if (vals.length && vals.join() !== values.join()) { setValues(vals); const ds = await Promise.all(vals.map(v => getNumberDossier(v).catch(() => null))); setDossiers(ds); }
      const res = await askNumberResearcher(vals, m, hist);
      if (res?.dossiers) setDossiers(res.dossiers);
      if (res?.context_snapshot) setSnap(res.context_snapshot);
      push("assistant", res?.answer || "רגע — נתקעתי לרגע. נסה לשלוח שוב, או נסח את השאלה אחרת 🌳");
    } catch (e) { setErr(e.message || "שגיאה"); }
    setSending(false);
  };
  const toJudge = async (v) => { try { const r = await sendCandidateFromResearcher(v); setSent({ v, ...r }); } catch { setSent({ v, status: "error" }); } };

  const d0 = dossiers[0] || {};
  const recCol = { strong: "#8bd98b", needs_check: "#c9a24a", weak: C.muted, duplicate: "#7fb2ff" };
  return (
    <div style={{ ...card, border: "1px solid rgba(127,178,255,0.45)", background: "linear-gradient(180deg, rgba(47,109,246,0.06), rgba(8,5,2,0.42))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>💬</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>חדר רזיאל — מחקר ופיקוד</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>דבר איתו על כל מספר · «אשר 321» / «דחה 665» / «שלח 424 לשופט» · «מה חדש בשופט» / «מה מחכה הכי הרבה» / «למה 665 מחכה» — והרשימה מתעדכנת חי.</div>
        </div>
        <button onClick={loadCands} style={{ ...segBtn(false), fontSize: 12 }}>↻</button>
      </div>

      {/* רשימה חיה — מה מחכה לך לאשר (לחיץ + פקודה) */}
      {cands.length > 0 && (
        <div style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", marginBottom: 10 }}>
          <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🗂️ ממתינים לך לאשר ({cands.length}) <span style={{ color: C.muted, fontWeight: 400 }}>— לחץ לחקור, או אמור לרזיאל «אשר …»</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 96, overflowY: "auto" }}>
            {cands.map(c => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.25)", border: `1px solid ${recCol[c.recommendation] || C.border}`, borderRadius: 999, padding: "3px 6px 3px 10px", opacity: busyC === c.subject_ref ? 0.5 : 1 }}>
                <button onClick={() => { setInput(String(c.subject_ref)); setTimeout(start, 0); }} title="חקור" style={{ background: "none", border: "none", color: recCol[c.recommendation] || C.goldDim, fontFamily: F.mono, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{c.subject_ref}</button>
                <button onClick={async () => { setBusyC(c.subject_ref); await decideCandidate(c.id, "approve").catch(() => {}); setCands(p => p.filter(x => x.id !== c.id)); push("assistant", `✅ אושר: ${c.subject_ref} (נכנס ל-decision_ledger + Learned-Pattern).`); setBusyC(null); }} title="אשר" style={{ background: "rgba(76,175,80,0.15)", border: "none", color: "#8bd98b", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11 }}>✓</button>
                <button onClick={async () => { setBusyC(c.subject_ref); await decideCandidate(c.id, "reject").catch(() => {}); setCands(p => p.filter(x => x.id !== c.id)); push("assistant", `❌ נדחה: ${c.subject_ref} (נשמר כ«חיבור לא-מאושר», לא כנתון-שגוי).`); setBusyC(null); }} title="דחה" style={{ background: "rgba(200,80,80,0.12)", border: "none", color: "#e08a8a", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11 }}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && start()}
          placeholder="מספר לחקירה… (321  ·  או  321 2212 להשוואה)" dir="rtl"
          style={{ flex: 1, minWidth: 160, background: "rgba(8,5,2,0.5)", color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: F.mono, fontSize: 15 }} />
        <button onClick={start} disabled={sending} style={{ ...segBtn(false), fontSize: 13, opacity: sending ? 0.5 : 1 }}>{sending && !msgs.length ? "טוען…" : "🔎 חקור"}</button>
      </div>

      {err && <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 12.5, marginBottom: 8 }}>שגיאה: {err}</div>}

      {values.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 14, fontWeight: 700 }}>{values.join(" · ")}</span>
          <button onClick={() => setShowDoss(s => !s)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: F.body, fontSize: 11.5 }}>🔍 למה אתה אומר את זה? (מקורות)</button>
          {values.map(v => <button key={v} onClick={() => toJudge(v)} style={{ background: "rgba(201,162,74,0.13)", border: "1px solid rgba(201,162,74,0.45)", color: "#c9a24a", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontFamily: F.body, fontSize: 11.5 }}>➕ שלח {v} לשופט</button>)}
          {sent && <span style={{ color: sent.status === "sent_to_judge" ? "#8bd98b" : sent.status === "already_pending" ? "#c9a24a" : "#e08a8a", fontFamily: F.body, fontSize: 11.5 }}>{sent.status === "sent_to_judge" ? `✓ ${sent.v} נשלח (${sent.recommendation})` : sent.status === "already_pending" ? `${sent.v} כבר בשופט` : "שגיאה"}</span>}
        </div>
      )}

      {/* מקורות (dossier) — שרשרת הראיות, אותו אובייקט שרזיאל קיבל */}
      {showDoss && dossiers.map((dd, di) => dd && (
        <div key={di} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", marginBottom: 8, fontFamily: F.body, fontSize: 11.5, color: C.goldDim, lineHeight: 1.6 }}>
          <div style={{ color: "#7fb2ff", fontWeight: 700, marginBottom: 3 }}>📦 dossier · {dd.value} <span style={{ color: C.muted, fontWeight: 400 }}>(גרסה {typeof dd.context_version === "object" ? (dd.context_version?.rules_hash || "—") : (dd.context_version || "—")})</span></div>
          {dd.facts?.anchor && <div>⚓ עוגן: {dd.facts.anchor}</div>}
          <div>🧮 התכנסויות: {(dd.facts?.convergences || []).map(m => `${heM(m.method)}(${m.group_size})`).join(" · ") || "—"}</div>
          <div>🔗 ראיות: {(dd.evidence || []).length ? dd.evidence.map(e => `[${heM(e.method)}·${e.status}]`).join(" ") : "—"} · 🎴 כרטיסים: {(dd.cards || []).map(c => c.slug).join(" · ") || "—"}</div>
          <div>⚖️ ההחלטות שלך: {(dd.decisions || []).length ? dd.decisions.map(x => `${x.human_decision}${x.reason_code ? "·" + x.reason_code : ""}`).join(" · ") : "—"}</div>
          <div>🔀 קשורים: {(dd.related || []).join(" · ") || "—"}</div>
        </div>
      ))}

      {/* 🧬 context_snapshot — «על סמך מה רזיאל ענה?» (ניתן לשחזור, לא מקור-אמת) */}
      {snap && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowSnap(s => !s)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: F.body, fontSize: 11.5 }}>🧬 על סמך מה רזיאל ענה? (context snapshot)</button>
          {showSnap && (
            <div style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", marginTop: 6, fontFamily: F.body, fontSize: 11.5, color: C.goldDim, lineHeight: 1.7 }}>
              <div>🧠 מוח: <b>raziel_brain#1</b> · גרסת-קול {snap.persona?.voice_version ?? "—"} {snap.persona?.updated_at ? `(עודכן ${String(snap.persona.updated_at).slice(0, 10)})` : ""}</div>
              <div>💾 זיכרון שנקרא: {snap.memory_context?.recent_conversation_n || 0} שיחות אחרונות {snap.memory_context?.summary_present ? "+ סיכום" : ""} {snap.persisted === false ? "(לא מחובר)" : ""}</div>
              <div>📚 ידע: context {typeof snap.knowledge_context_version === "object" ? (snap.knowledge_context_version?.rules_hash || "—") : (snap.knowledge_context_version || "—")}</div>
              <div>📏 חוקים: {(snap.rules_snapshot || []).map(r => `${r.rule_id}·v${r.version}`).join(" · ") || "—"}</div>
              <div>⚙️ מנוע: {(snap.engine_snapshot || []).map(e => heM(e.method_key)).join(" · ") || "—"}</div>
              <div>⚖️ החלטות רלוונטיות: {(snap.decisions || []).length ? snap.decisions.map(d => `${d.subject_ref}:${d.human_decision || d.status}`).join(" · ") : "—"}</div>
            </div>
          )}
        </div>
      )}

      {/* השיחה — אזור גדול ונגלל */}
      <div style={{ display: "grid", gap: 8, marginBottom: 10, minHeight: 300, maxHeight: "56vh", overflowY: "auto", padding: 4, background: "rgba(0,0,0,0.18)", borderRadius: 10 }}>
        {!msgs.length && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: 18, textAlign: "center", lineHeight: 1.8 }}>הקלד מספר למעלה או בחר מהרשימה — ואז דבר איתי כמו בצ'אט.<br />נסה: «אשר 321» · «מה הקשר בין 321 ל-2212?» · «שלח 424 לשופט»</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ background: m.role === "user" ? "rgba(47,109,246,0.12)" : "rgba(8,5,2,0.4)", border: `1px solid ${m.role === "user" ? "rgba(127,178,255,0.3)" : C.border}`, borderRadius: 10, padding: "10px 13px", maxWidth: "94%", marginInlineStart: m.role === "user" ? "auto" : 0 }}>
            <div style={{ color: m.role === "user" ? "#7fb2ff" : C.goldLight, fontFamily: F.heading, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.role === "user" ? "צוריאל" : "🔵 רזיאל · חוקר"}</div>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {sending && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, padding: 8 }}>רזיאל חושב…</div>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={chat} onChange={e => setChat(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="דבר עם רזיאל / פקודה: «אשר 321» · «דחה 665» · «שלח 424 לשופט»…" dir="rtl"
          style={{ flex: 1, background: "rgba(8,5,2,0.5)", color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 13px", fontFamily: F.body, fontSize: 14 }} />
        <button onClick={send} disabled={sending} style={{ ...segBtn(false), fontSize: 14, opacity: sending ? 0.5 : 1 }}>שלח</button>
      </div>
    </div>
  );
}

// REC_META — משותף עם שופט-ההתכנסויות (ConvergenceJudge, עדיין ב-AdminPage.jsx) לתיוג-מועמדים
// בתוך «קול השולחן» (answerDeskQuery). ערכים זהים בכוונה — לא ליצור taxonomy שני.
const REC_META = {
  strong:      ["#8bd98b", "🟢 חזק לבדיקה"],
  needs_check: ["#c9a24a", "🟡 דורש בדיקה"],
  weak:        [C.muted,   "◽ חלש"],
  duplicate:   ["#7fb2ff", "🔵 כפילות/קיים"],
};
