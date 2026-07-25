import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { getCloudNotes, saveCloudNotes } from "../lib/auth.js";
import { ENTITY_ICON, ENTITY_LABEL, entityFromPhrase } from "../lib/research/entity.js";
import { getAiAnalysis, getHotNumbers, getTopCollective } from "../lib/supabase.js";
import { collectionConvergences, convergencesFactLine } from "../lib/deepAnalysis.js";
import { engName, AI_ENGINES } from "../lib/aiEngines.js";
import { trackAi, trackJourneyStep } from "../lib/tracking.js";
import { calcGem } from "../theme.js";
import RazielChat from "./RazielChat.jsx";
import ApiPanel from "./research/ApiPanel.jsx";

const heb = n => Number(n).toLocaleString("he");
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
// חלון-הדפסה נקי (RTL · Heebo) — משמש לפנקס ולייצוא-מחקר
function printDoc(title, bodyText) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:'Heebo',Arial,sans-serif;padding:34px;line-height:1.85;color:#1b1d22;white-space:pre-wrap;font-size:15px}h1{font-size:18px;color:#9a7818;margin:0 0 16px}</style></head><body><h1>${esc(title)}</h1>${esc(bodyText) || "<i style='color:#999'>(ריק)</i>"}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
}

// 📝 פנקס-מחקר — משטח כתיבה חופשי נשמר מסשן-לסשן + הדפסה + פנקס-פעיל
// (סימון טקסט → חישוב גימטריה · הוסף-למחקר · העתק). אנונימי=דפדפן; ענן=שדרוג עתידי.
function NotesPanel() {
  const { addToResearch } = useResearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const [text, setText] = useState(() => { try { return localStorage.getItem("sod_notes_v1") || ""; } catch { return ""; } });
  const [saved, setSaved] = useState(true);
  const [sel, setSel] = useState("");
  // התחברות → משיכת הפנקס מהענן (ענן מנצח אם יש בו תוכן; אחרת דוחפים את המקומי למעלה)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    getCloudNotes(user.id).then(cloud => {
      if (!alive) return;
      if (cloud && cloud.trim()) setText(cloud);
      else { let loc = ""; try { loc = localStorage.getItem("sod_notes_v1") || ""; } catch { /* noop */ } if (loc.trim()) saveCloudNotes(user.id, loc); }
    }).catch(() => { /* noop */ });
    return () => { alive = false; };
  }, [user]);
  // שמירה: localStorage תמיד; ענן אם מחובר (debounce)
  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      try { localStorage.setItem("sod_notes_v1", text); } catch { /* noop */ }
      if (user) saveCloudNotes(user.id, text).catch(() => { /* noop */ });
      setSaved(true);
    }, 600);
    return () => clearTimeout(t);
  }, [text, user]);
  const onSel = e => {
    const ta = e.target;
    const s = (ta.value.substring(ta.selectionStart, ta.selectionEnd) || "").trim();
    setSel(s);
  };
  const selVal = sel ? calcGem(sel) : 0;
  const addSel = () => { if (sel) addToResearch(entityFromPhrase(sel, selVal)); };
  const gemSel = () => { if (sel && selVal) nav(`/number/${selVal}?from=notes`); };
  const copySel = () => { try { navigator.clipboard.writeText(sel); } catch { /* noop */ } };
  return (
    <div>
      <textarea className="rw-notes" dir="rtl" value={text}
        onChange={e => setText(e.target.value)} onSelect={onSel} onMouseUp={onSel} onKeyUp={onSel}
        placeholder="כתוב כאן מחשבות · רמזים · חישובים · שאלות מחקר… נשמר אוטומטית מסשן לסשן. סמן ביטוי כדי לחשב/להוסיף." />
      {sel && (
        <div className="rw-notes-sel">
          <span className="rw-muted" style={{ fontSize: 11.5 }}>«{sel.slice(0, 16)}{sel.length > 16 ? "…" : ""}» = <b style={{ color: "var(--acc)" }}>{heb(selVal)}</b></span>
          <span style={{ display: "flex", gap: 5 }}>
            <button className="rw-mini" onClick={gemSel} title="לדף המספר">🧮</button>
            <button className="rw-mini" onClick={addSel} title="הוסף למחקר">➕</button>
            <button className="rw-mini" onClick={copySel} title="העתק">📋</button>
          </span>
        </div>
      )}
      <div className="rw-notes-bar">
        <span className="rw-muted" style={{ fontSize: 11.5 }}>{saved ? "✓ נשמר" : "שומר…"} · {user ? "☁️ ענן" : "💾 מקומי"} · {text.trim().length} תווים</span>
        <button className="rw-notes-print" onClick={() => printDoc("פנקס המחקר · סוד 1820", text)} title="הדפס / שמור PDF">🖨 הדפס</button>
      </div>
    </div>
  );
}

// פריט-ישות לחיץ — מנווט ליעד (e.link) אם קיים; אחרת צ'יפ פשוט. כפתור-פעולה בצד.
function EntityRow({ e, onRemove, removeIcon = "✕" }) {
  const label = <>{ENTITY_ICON[e.type] || "•"} <span className="rw-er-t">{e.title}</span></>;
  return (
    <div className="rw-er">
      {e.link ? <Link to={e.link} className="rw-er-lk">{label}</Link> : <span className="rw-er-lk">{label}</span>}
      {onRemove && <button className="rw-er-x" title="הסר" onClick={() => onRemove(e)}>{removeIcon}</button>}
    </div>
  );
}

// שורת-שמור עם בורר-אוסף (📁) — לקיבוץ שמורים לתיקיות.
function SavedRow({ e, collections, onAssign, onRemove }) {
  const label = <>{ENTITY_ICON[e.type] || "•"} <span className="rw-er-t">{e.title}</span></>;
  return (
    <div className="rw-er">
      {e.link ? <Link to={e.link} className="rw-er-lk">{label}</Link> : <span className="rw-er-lk">{label}</span>}
      <select className="rw-er-sel" title="העבר לאוסף" value={e.coll || ""} onChange={ev => onAssign(e.id, ev.target.value)}>
        <option value="">📁 ללא</option>
        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="rw-er-x" title="הסר" onClick={() => onRemove(e)}>✕</button>
    </div>
  );
}

// פאנל בודד — מודול עצמאי (Panel Registry).
function Panel({ icon, title, extra, children, bare }) {
  if (bare) return <div className="rw-pb bare">{children}</div>;
  return (
    <div className="rw-panel">
      <div className="rw-ph"><span>{icon} {title}</span>{extra != null && <span className="rw-muted" style={{ fontWeight: 600 }}>{extra}</span>}</div>
      <div className="rw-pb">{children}</div>
    </div>
  );
}

// 🔥 «מה מחפשים עכשיו» — מספרים חמים חיים (getHotNumbers מ-search_log, 7 ימים). כל צ׳יפ → דף-המספר בהיכל.
function HotNumbers() {
  const [hot, setHot] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    getHotNumbers(7, 8).then(r => { if (alive) { setHot(Array.isArray(r) ? r : []); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  if (!loaded) return <div className="rw-muted" style={{ fontSize: 12.5 }}>טוען…</div>;
  if (!hot.length) return <div className="rw-muted" style={{ fontSize: 12.5 }}>עדיין אין מספיק חיפושים היום.</div>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {hot.map((h, i) => (
        <Link key={h.n ?? i} to={`/research?tool=number&n=${h.n}`} className="rw-chip"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {i === 0 && <span>🔥</span>}
          <b>{Number(h.n).toLocaleString("he")}</b>
          <span className="rw-muted" style={{ fontSize: 10.5 }}>{h.count}</span>
        </Link>
      ))}
    </div>
  );
}

// 🧠 ResearchCenter — מערכת פאנלים (registry). מוסיפים פאנל עתידי בשורה אחת.
// variant: 'tools' (ימין) · 'context' (שמאל) · undefined (הכל — מובייל)
export default function ResearchCenter({ variant, tabbed, activeTab, onTab }) {
  const {
    cart = [], saved = [], pinned = [], history = [], collections = [], journeys = [],
    removeFromResearch, removeSaved, togglePin, clearHistory, addCollection, removeCollection, assignCollection, removeJourney,
  } = useResearch();
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  // ברירת-מחדל «active» (המחקר הפעיל) ולא «me» — «me» כבר לא בקונטקסט, ונפילה ל-list[0] פתחה פנקס-ענק ריק.
  const [localTab, setLocalTab] = useState("active");
  const tab = activeTab ?? localTab;
  const setTab = onTab ?? setLocalTab;

  // 🔎 מה שהקהילה חוקרת עכשיו — nodes עם ≥3 חוקרים שונים (Collective Discovery, מקור מאוחד 4a).
  const [community, setCommunity] = useState([]);
  useEffect(() => { let a = true; getTopCollective(3, 8).then(r => { if (a) setCommunity(Array.isArray(r) ? r : []); }).catch(() => {}); return () => { a = false; }; }, []);

  // 🤖 ניתוח-AI של אוסף-המחקר (מוצמדים + פעיל) — Analyze(Collection). מוצא חוטים אמיתיים בין
  // הישויות שאספת (ערכים משותפים · קשר תמטי · התכנסות), ביושר אם אין. הערכים = עובדה מהמנוע.
  const [aiState, setAiState] = useState("idle"); // idle | busy | done | off
  const [aiText, setAiText] = useState(null);
  const [aiEngine, setAiEngine] = useState("claude"); // claude | gemini — מנוע פרשנות נבחר (A/B)
  const analyzeItems = [...pinned, ...cart];
  // 🫀 לב המערכת — התכנסויות בין-שיטתיות באוסף (המנוע מזהה, לא ה-AI). מחושב תמיד, גם לפני ניתוח.
  const convergences = useMemo(() => collectionConvergences(analyzeItems), [analyzeItems]);
  const runAnalyze = async (engine = "claude", { toggle = false } = {}) => {
    if (aiState === "busy") return;
    if (toggle && aiState === "done") { setAiState("idle"); setAiText(null); return; }   // «הסתר» = לחיצה שנייה
    if (!analyzeItems.length) { setAiState("empty"); setAiText(null); return; }
    setAiEngine(engine);
    setAiState("busy");
    trackAi("research", "personal");   // 📊 שימוש ב-AI — ניתוח המחקר האישי
    const itemsLine = analyzeItems.map(e => {
      if (e.type === "number") return `• מספר ${e.title}${e.metadata?.meaning ? ` — ${e.metadata.meaning}` : ""}`;
      if (e.type === "phrase") return `• ביטוי «${e.title}»${e.metadata?.value != null ? ` = ${e.metadata.value}` : ""}`;
      return `• ${ENTITY_LABEL[e.type] || e.type}: ${e.title}`;
    }).join("\n");
    // ההתכנסויות = העובדה המובילה. כך ה-AI מפרש את משיח(מילוי 878)↔דבר-מתוך-דבר(רגיל 878) ולא מפספס.
    const convLine = convergences.length
      ? `\n\n🔮 התכנסויות בין-שיטתיות שהמנוע זיהה (עובדה — פרש מה הן מרמזות יחד):\n${convergencesFactLine(convergences)}`
      : "";
    const facts = itemsLine + convLine;
    const a = await getAiAnalysis({ kind: "research", subject: `אוסף מחקר · ${analyzeItems.length} ישויות`, facts, engine });
    if (a) { setAiText(a); setAiState("done"); } else setAiState("off");
  };

  // 📤 ייצוא/שיתוף מחקר — מקבץ מוצמדים + מחקר-פעיל + פנקס לטקסט אחד → העתק + הדפס/PDF
  const exportResearch = () => {
    const L = ["המחקר שלי · סוד 1820", ""];
    if (pinned.length) { L.push("📌 מוצמדים:"); pinned.forEach(e => L.push(`• ${e.title}${e.link ? `  https://sod1820.co.il${e.link}` : ""}`)); L.push(""); }
    if (cart.length) { L.push("🔬 במחקר עכשיו:"); cart.forEach(e => L.push(`• ${e.title}${e.link ? `  https://sod1820.co.il${e.link}` : ""}`)); L.push(""); }
    let notes = ""; try { notes = localStorage.getItem("sod_notes_v1") || ""; } catch { /* noop */ }
    if (notes.trim()) { L.push("📝 פנקס:"); L.push(notes); }
    const txt = L.join("\n");
    try { navigator.clipboard.writeText(txt); } catch { /* noop */ }
    printDoc("המחקר שלי · סוד 1820", txt);
  };
  const newCollection = () => { const n = (typeof prompt === "function") ? prompt("שם האוסף:") : null; if (n && n.trim()) addCollection(n.trim()); };

  const PANELS = [
    { id: "me", icon: "👤", label: "אני", render: bare => (
      <Panel icon="👤" title="אני" extra={user ? "☁️ מחובר" : "מקומי"} bare={bare}>
        {user ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <div className="rw-av" style={{ width: 38, height: 38, flex: "none" }}>{((profile?.display_name || profile?.username || user.email || "א")[0] || "א").toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.display_name || profile?.username || "מחובר"}</div>
                <div className="rw-muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>☁️ {user.email}</div>
              </div>
            </div>
            <button className="rw-mini" style={{ width: "100%" }} onClick={() => signOut?.()} title="התנתק">יציאה מהחשבון</button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <div className="rw-av" style={{ width: 38, height: 38 }}>א</div>
              <div><div style={{ fontWeight: 800 }}>שלום, אורח</div><div className="rw-muted">המחקר נשמר בדפדפן</div></div>
            </div>
            <button className="rw-login" onClick={() => nav("/login")}>🔐 התחבר / הירשם — לסנכרון בין מכשירים</button>
          </div>
        )}
      </Panel>
    ) },
    { id: "notes", icon: "📝", label: "פנקס", render: bare => (
      <Panel icon="📝" title="פנקס מחקר" bare={bare}><NotesPanel /></Panel>
    ) },
    { id: "community", icon: "🔎", label: "קהילה", badge: () => community.length || null, render: bare => (
      <Panel icon="🔎" title="מה שהקהילה חוקרת" extra={community.length || null} bare={bare}>
        {community.length === 0
          ? <div className="rw-empty">כשכמה חוקרים ייגעו באותו מספר או ביטוי — תופיע כאן «התכנסות קהילתית» עם קישור לצלול פנימה.</div>
          : <div style={{ display: "grid", gap: 6 }}>
              {community.map((c, i) => {
                // מרוכז-ערך: entity_ref = המספר (הצומת-על). c.title = ביטוי-דוגמה (רמז, לא כותרת).
                const to = `/number/${encodeURIComponent(c.entity_ref)}`;
                const hint = c.title && c.title !== c.entity_ref ? c.title : null;
                return (
                  <Link key={i} to={to} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", minWidth: 0, overflow: "hidden",
                    background: "rgba(196,154,46,.08)", border: "1px solid rgba(196,154,46,.28)", borderRadius: 10, padding: "7px 11px", color: "inherit" }}>
                    <span style={{ fontWeight: 800, whiteSpace: "nowrap", flex: "none" }}>🔢 {c.entity_ref}</span>
                    {hint && <span className="rw-muted" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto", minWidth: 0 }}>{hint}</span>}
                    <span className="rw-muted" style={{ marginInlineStart: "auto", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flex: "none" }}>🔎 {c.researchers} חוקרים</span>
                  </Link>
                );
              })}
            </div>}
      </Panel>
    ) },
    { id: "active", icon: "🧠", label: "מחקר", badge: () => cart.length + pinned.length, render: bare => (
      <Panel icon="🧠" title="המחקר הפעיל" extra={(cart.length + pinned.length) || null} bare={bare}>
        {cart.length === 0 && pinned.length === 0
          ? <div className="rw-empty">לחצו «➕ הוסף למחקר» או «📌 הצמד» על מספר · ביטוי · פוסט — והם יצטברו כאן, ויישארו גם כשתעברו כלי.</div>
          : <>
              {pinned.length > 0 && <>
                <div className="rw-sec-t">📌 מוצמדים</div>
                {pinned.map(e => <EntityRow key={e.id} e={e} onRemove={x => togglePin?.(x)} removeIcon="📌" />)}
              </>}
              {cart.length > 0 && <>
                <div className="rw-sec-t" style={{ marginTop: pinned.length ? 10 : 0 }}>🔬 במחקר עכשיו</div>
                {cart.map(e => <EntityRow key={e.id} e={e} onRemove={x => removeFromResearch?.(x.id)} />)}
              </>}
              {/* 🫀 לב המערכת — התכנסויות בין-שיטתיות שהמנוע זיהה באוסף (עובדה, גם לפני AI). */}
              {convergences.length > 0 && (
                <div style={{ marginTop: 12, background: "rgba(47,109,246,0.06)", border: "1px solid rgba(47,109,246,0.25)", borderRadius: 12, padding: "10px 12px" }}>
                  <div className="rw-sec-t" style={{ marginTop: 0 }}>🔮 התכנסויות שהמנוע זיהה</div>
                  <div className="rw-muted" style={{ marginBottom: 8, fontSize: 12 }}>ערך משותף שנמצא באוסף — <b>גם בין שיטות שונות</b> (למשל משיח במילוי = דבר-מתוך-דבר ברגיל).</div>
                  <div style={{ display: "grid", gap: 7 }}>
                    {convergences.slice(0, 6).map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <Link to={`/number/${c.value}`} style={{ textDecoration: "none", background: "linear-gradient(135deg,#2f6df6,#5b8bff)", color: "#fff", borderRadius: 999, padding: "2px 10px", fontWeight: 800, fontSize: 13 }}>{c.value}</Link>
                        {c.crossMethod && <span style={{ background: "#ffe9b8", color: "#7a4d00", borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800 }}>הצלבת שיטות</span>}
                        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {c.members.map((m, mi) => (
                            <React.Fragment key={mi}>
                              {mi > 0 && <span style={{ color: "#9aa1ad" }}>·</span>}
                              <Link to={`/number/${encodeURIComponent(m.phrase)}`} onClick={() => trackJourneyStep(c.value, m.phrase, { via: m.methods.join("/"), surface: "research_center" })} style={{ textDecoration: "none", color: "#1b1d22", fontWeight: 700, fontSize: 13 }}>
                                {m.phrase}<span style={{ color: "#5b6472", fontWeight: 600, fontSize: 11 }}> ({m.methods.join("/")})</span>
                              </Link>
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiState !== "done" && (
                <>
                  <div className="rw-sec-t" style={{ marginTop: 12 }}>🤖 נתח את המספרים שלך ב-AI</div>
                  <div className="rw-muted" style={{ marginBottom: 8 }}>שני מנועים — כל אחד קורא את המספרים שלך בזווית אחרת. בקרוב: גם חיבור ופרשנות משותפת ביניהם.</div>
                </>
              )}
              <div className="rw-cta">
                {aiState === "done" ? (
                  <button className="b1" onClick={() => runAnalyze(aiEngine, { toggle: true })} title="הסתר ניתוח">🤖 הסתר ניתוח</button>
                ) : (
                  <>
                    <button className="b1" onClick={() => runAnalyze("claude")} disabled={aiState === "busy"} title={`${AI_ENGINES.claude.name} — ${AI_ENGINES.claude.tagline}`}>
                      {aiState === "busy" && aiEngine === "claude" ? `✍️ ${engName("claude")}…` : `🔵 נתח עם ${engName("claude")}`}
                    </button>
                    <button className="b1" onClick={() => runAnalyze("gemini")} disabled={aiState === "busy"} title={`${AI_ENGINES.gemini.name} — ${AI_ENGINES.gemini.tagline}`} style={{ background: "linear-gradient(135deg,#8a63f4,#6d3ff0)" }}>
                      {aiState === "busy" && aiEngine === "gemini" ? `✍️ ${engName("gemini")}…` : `🟣 נתח עם ${engName("gemini")}`}
                    </button>
                  </>
                )}
                <button className="b2" onClick={exportResearch} title="העתק + הדפס/PDF">📤 ייצוא</button>
              </div>
              {aiState === "done" && aiText && (
                <div className="rw-ai-box">
                  <div className="rw-ai-h" style={{ color: aiEngine === "gemini" ? "#8a63f4" : undefined }}>
                    {aiEngine === "gemini" ? `🟣 ${engName("gemini")}` : `🔵 ${engName("claude")}`} · פרשנות
                    <button onClick={() => runAnalyze(aiEngine === "gemini" ? "claude" : "gemini")} disabled={aiState === "busy"}
                      style={{ cursor: "pointer", marginInlineStart: 8, background: "none", border: "1px solid currentColor", borderRadius: 999, color: "inherit", fontSize: 11, fontWeight: 700, padding: "2px 9px", opacity: 0.85 }}>
                      {aiEngine === "gemini" ? `🔵 השווה מול ${engName("claude")}` : `🟣 השווה מול ${engName("gemini")}`}
                    </button>
                  </div>
                  <p className="rw-ai-t">{aiText}</p>
                  <div className="rw-ai-note">כל הפרשנויות מבוססות על אותם נתוני גימטריה — ההבדל הוא רק בדרך שכל מודל מסביר אותם. הערכים עובדה מאומתת במנוע; הפרשנות נכתבה ב-AI.</div>
                </div>
              )}
              {aiState === "empty" && <div className="rw-empty" style={{ marginTop: 8 }}>צרפו קודם ישות אחת למחקר (📌 הצמד / ➕ הוסף) — ואז אפשר לנתח את האוסף.</div>}
              {aiState === "off" && <div className="rw-empty" style={{ marginTop: 8 }}>הניתוח אינו זמין כרגע — נסו שוב מאוחר יותר.</div>}
            </>}
      </Panel>
    ) },
    { id: "history", icon: "🕘", label: "לוג", badge: () => history.length, render: bare => (
      <Panel icon="🕘" title="היסטוריית מחקר" extra={history.length || null} bare={bare}>
        {history.length === 0
          ? <div className="rw-empty">כאן יופיע מה שחקרת לאחרונה — «המשך מהמקום שעצרת».</div>
          : <>
              <div className="rw-sec-t">🕘 לאחרונה</div>
              {history.slice(0, 14).map(e => <EntityRow key={e.id} e={e} />)}
              <div className="rw-cta"><button className="b2" onClick={() => clearHistory?.()}>נקה היסטוריה</button></div>
            </>}
      </Panel>
    ) },
    { id: "saved", icon: "📂", label: "שמור", badge: () => saved.length, render: bare => {
      const inColl = id => saved.filter(e => (e.coll || "") === id);
      const loose = inColl("");
      return (
        <Panel icon="📂" title="שמורים" extra={saved.length || null} bare={bare}>
          {saved.length === 0
            ? <div className="rw-empty">השמורים שלך יופיעו כאן — לחצו ⭐ על כל ישות.</div>
            : <>
                {loose.map(e => <SavedRow key={e.id} e={e} collections={collections} onAssign={assignCollection} onRemove={x => removeSaved?.(x.id)} />)}
                {collections.map(c => {
                  const items = inColl(c.id);
                  return (
                    <div key={c.id} style={{ marginTop: 8 }}>
                      <div className="rw-sec-t" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>📁 {c.name} · {items.length}</span>
                        <button className="rw-mini" title="מחק אוסף" onClick={() => removeCollection?.(c.id)}>🗑</button>
                      </div>
                      {items.length === 0 ? <div className="rw-empty" style={{ padding: "2px 2px 4px" }}>ריק — בחרו «{c.name}» בשורת-שמור.</div>
                        : items.map(e => <SavedRow key={e.id} e={e} collections={collections} onAssign={assignCollection} onRemove={x => removeSaved?.(x.id)} />)}
                    </div>
                  );
                })}
                <button className="rw-mini" style={{ marginTop: 9 }} onClick={newCollection}>➕ אוסף חדש</button>
              </>}
        </Panel>
      );
    } },
    { id: "journeys", icon: "🧭", label: "מסעות", badge: () => journeys.length, render: bare => (
      <Panel icon="🧭" title="המסעות שלי" extra={journeys.length || null} bare={bare}>
        {journeys.length === 0
          ? <div className="rw-empty">כל מסע שתסיים יישמר כאן אוטומטית — לחזור אליו, לקרוא שוב את המסר האישי, ולשתף.</div>
          : <div style={{ display: "grid", gap: 8 }}>
              {journeys.map(j => (
                <div key={j.id} className="rw-er" style={{ alignItems: "stretch" }}>
                  <Link to={`/journey?from=${j.root}`} className="rw-er-lk" style={{ flexDirection: "column", alignItems: "stretch", gap: 3 }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <b style={{ fontFamily: "'Courier New', monospace", fontSize: 16, flex: "none" }}>{j.root}</b>
                      <span className="rw-er-t" style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>{(j.path || []).slice(0, 3).join(" · ")}</span>
                    </span>
                    {j.msg && <span className="rw-er-t" style={{ fontSize: 11.5, fontWeight: 400, opacity: 0.7 }}>🔵 {j.msg}</span>}
                  </Link>
                  <button className="rw-er-x" title="הסר מסע" onClick={() => removeJourney?.(j.id)}>✕</button>
                </div>
              ))}
            </div>}
      </Panel>
    ) },
    { id: "whatsnew", icon: "🔔", label: "חדש", render: bare => (
      <Panel icon="🔔" title="מה מחפשים עכשיו" bare={bare}>
        <HotNumbers />
      </Panel>
    ) },
    { id: "raziel", icon: "🤖", label: "רזיאל", render: bare => (
      <Panel icon="🤖" title="רזיאל · צ'אט חופשי" extra="בטא" bare={bare}>
        <RazielChat />
      </Panel>
    ) },
    { id: "api", icon: "🔌", label: "API", render: bare => (
      <Panel icon="🔌" title="API גימטריה" extra="למפתחים" bare={bare}>
        <ApiPanel />
      </Panel>
    ) },
    { id: "roadmap", icon: "🗺️", label: "מפה", render: bare => (
      <Panel icon="🗺️" title="לאן אפשר להגיע" bare={bare}>
        <div className="rw-future" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
          <div className="lk">🕸️ מפת הקשרים <span className="rw-adv">מתקדם</span></div>
          <div className="rw-exp">רואים <b>איך כל מספר · פסוק · פוסט מחוברים</b> ברשת אחת. נפתח בשלב מתקדם.</div>
          <div className="lk">☁️ סנכרון-ענן <span className="rw-adv">בקרוב</span></div>
          <div className="rw-exp">התחברות → הפנקס והשמורים <b>מסתנכרנים בין המכשירים</b>. (בקרוב)</div>
        </div>
      </Panel>
    ) },
  ];

  const ids = variant === "tools" ? ["raziel", "api", "whatsnew"]   // רזיאל = בית-הקבע (צ'אט חופשי) של הסוכן; API = אזור המפתחים לידו
    // «me» הוסר מעולם-המחקר (איחוד האזורים 9.7.2026): הזהות חיה ב«אזור האישי» (מגירת UserCenter);
    // כפתור 👤 בראש הלשונית פותח אותה (אורח → /login).
    : variant === "context" ? ["raziel", "api", "notes", "active", "community", "history", "journeys", "saved", "roadmap"]
    // מובייל/כל: פאנל «רזיאל» (צ'אט חופשי) חשוף — בית-הקבע של הסוכן בסביבת-המחקר.
    : PANELS.map(p => p.id);
  const list = PANELS.filter(p => ids.includes(p.id));

  if (tabbed) {
    const cur = list.find(p => p.id === tab) || list[0];
    return (
      <div className="rw-tabs">
        <div className="rw-tabbar" role="tablist">
          {list.map(p => {
            const n = p.badge?.();
            return (
              <button key={p.id} className={"rw-tab" + (cur.id === p.id ? " on" : "")} onClick={() => setTab(p.id)} title={p.label} role="tab" aria-selected={cur.id === p.id}>
                <span className="rw-tab-ic">{p.icon}</span>
                <span className="rw-tab-lb">{p.label}</span>
                {n ? <span className="rw-tab-badge">{n}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="rw-tabbody">{cur.render(true)}</div>
      </div>
    );
  }

  return <>{list.map(p => <React.Fragment key={p.id}>{p.render(false)}</React.Fragment>)}</>;
}

// טאבי-השמאל (לשימוש המסילה — לפתיחה ישירה לטאב). חייב להתאים ל-context ids.
// «me» הוסר — הזהות עברה ל«אזור האישי» (איחוד האזורים 9.7.2026).
export const LEFT_TABS = [
  { id: "raziel", icon: "🤖" }, { id: "api", icon: "🔌" },
  { id: "notes", icon: "📝" }, { id: "active", icon: "🧠" },
  { id: "history", icon: "🕘" }, { id: "journeys", icon: "🧭" }, { id: "saved", icon: "📂" }, { id: "roadmap", icon: "🗺️" },
];
