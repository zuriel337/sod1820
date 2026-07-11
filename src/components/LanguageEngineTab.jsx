import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { Link } from "react-router-dom";
import { supabase, adminWordsConsole, adminReviewWord, adminValueConvergence, scanDiscoveryEvents, discoveryPending, discoveryMark, sendNewsletter, addEnglishAlias, adminTriageCounts, adminBulkTriage, adminConvergenceTypes, adminAddWord, getWordWorlds, getWorldTagStats, applyWorldTag, getPendingBridges, verifyBridge, getLangStats, getAllBridges, editBridge, getAllAliases, adminAddAlias, adminEditAlias, manageAliasRpc } from "../lib/supabase.js";
import { hebrewToLatin } from "../lib/translit.js";
import { METHODS } from "../lib/gematria.js";
import { englishSimple, hasLatin } from "../lib/englishGematria.js";

// מחשב ערך-רגיל בצד-לקוח (מנוע רשמי) — לבדיקה מיידית במעבדה.
const ragilFn = METHODS.find(m => m.key === "רגיל").fn;
import { kindBadge, activeFlags } from "../lib/wordQuality.js";

// 🌍 מנוע השפה — מרכז-בקרה מלא: כל המילים החדשות בכל השפות, מקור מפורט, ואישור/הסתרה/מחיקה.
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 17px" };
const H = ({ children, sub }) => (
  <div style={{ margin: "24px 2px 12px" }}>
    <h3 style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16.5, fontWeight: 800, margin: 0 }}>{children}</h3>
    {sub && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>{sub}</div>}
  </div>
);
const LANG_FLAG = { he: "🇮🇱", en: "🇺🇸", ru: "🇷🇺", ar: "🇸🇦", el: "🇬🇷", la: "🏛️", fr: "🇫🇷", es: "🇪🇸" };
const METHOD_HE = { transliteration: "תעתוק", translation: "תרגום", exact: "איות מקובל", root: "שורש", variant: "נטייה", acronym: "ר״ת", etymology: "אטימולוגיה", phonetic: "דמיון-צליל", root_claim: "טענת-שורש", manual: "ידני", other: "אחר" };
const LAYER_TONE = { fact: "#7bbf7b", linguistic: "#5ec8ff", research: "#e0b34a", interpretive: "#c58cff" };
const SRC_HE = { whatsapp: "📱 וואטסאפ", "wa-deep": "📱 וואטסאפ", "wa-vip": "📱 וואטסאפ VIP", community: "👥 קהילה", "community-translit": "👥 קהילה", "shimon-vip": "👑 שמעון", admin: "👑 אדמין", review: "👑 אישור", search: "🔍 חיפוש", import: "📥 יבוא", post: "📝 פוסט", gallery: "🖼 גלריה", ai: "🤖 AI" };
const srcLabel = s => SRC_HE[s] || (s ? "· " + s : "?");

const btn = (bg, fg = "#fff") => ({ cursor: "pointer", background: bg, border: bg === "transparent" ? `1px solid ${C.border}` : "none", borderRadius: 999, color: fg, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "4px 11px", minHeight: 28 });
function Stat({ label, value, tone }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "13px 10px", minWidth: 108 }}>
      <div style={{ color: tone || C.goldBright, fontFamily: F.mono, fontSize: 25, fontWeight: 800 }}>{value}</div>
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}
const fmt = d => d ? new Date(d).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// 🔔 אירועי-גילוי — «משהו אמיתי קרה»: זיהוי התכנסות שגדלה, והכנת מייל-אירוע לרשימה (לא ניוזלטר).
function eventEmail(ev) {
  const link = `https://sod1820.co.il/number/${ev.value}`;
  const sample = (ev.sample || []).slice(0, 5);
  return {
    subject: `🔔 גילוי: ${ev.member_count} ביטויים מתכנסים על ${ev.value}`,
    html:
      `<h2 style="color:#7a5c12;">🔔 התכנסות חדשה סביב הערך ${ev.value}</h2>` +
      `<p>זיהינו התכנסות אמיתית: <b>${ev.member_count} ביטויים</b> חולקים את הערך <b>${ev.value}</b>.</p>` +
      (sample.length ? `<p>בין הביטויים:</p><ul>${sample.map(s => `<li>${s} = ${ev.value}</li>`).join("")}</ul>` : "") +
      `<p style="margin:26px 0;"><a href="${link}" style="background:#c9a227;color:#1b1420;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:bold;">היכנסו לגילוי המלא ←</a></p>` +
      `<p style="color:#888;font-size:14px;">נשלח רק כשמתגלה משהו אמיתי. תודה שאתם חלק מהעץ 🌳</p>`,
  };
}
function DiscoveryPanel() {
  const [adminEmail, setAdminEmail] = useState(null);
  useEffect(() => { supabase?.auth?.getUser?.().then(({ data }) => setAdminEmail(data?.user?.email || null)).catch(() => {}); }, []);
  const [pending, setPending] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [sel, setSel] = useState(null);          // האירוע שמכינים לו מייל
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [audience, setAudience] = useState("all");   // all | journey
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(true);   // רשימת-אירועים נפתחת/נסגרת (יכולה להיות ארוכה)
  const load = useCallback(async () => { const d = await discoveryPending(); setPending(d?.error ? [] : (d || [])); }, []);
  useEffect(() => { load(); }, [load]);
  const scan = async () => { setScanning(true); const r = await scanDiscoveryEvents({ days: 30, minMembers: 8 }); setScanning(false); setStatus(r?.found != null ? `נמצאו ${r.found} אירועים חדשים` : "שגיאת סריקה"); await load(); };
  const compose = (ev) => { const e = eventEmail(ev); setSel(ev); setSubject(e.subject); setHtml(e.html); setStatus(""); };
  const dryRun = async () => { try { const r = await sendNewsletter({ subject, html, source: audience === "journey" ? "journey" : null, dryRun: true }); setStatus(`${r?.count ?? 0} נמענים יקבלו`); } catch (e) { setStatus("שגיאה: " + (e.message || e)); } };
  const sendTest = async () => { if (!adminEmail) { setStatus("אין מייל-אדמין לבדיקה"); return; } setBusy(true); try { const r = await sendNewsletter({ subject, html, testEmail: adminEmail }); setStatus(r?.ok ? `נשלחה בדיקה ל-${adminEmail}` : "בדיקה נכשלה"); } catch (e) { setStatus("שגיאה: " + (e.message || e)); } finally { setBusy(false); } };
  const sendAll = async () => {
    if (!confirm(`לשלוח ל${audience === "journey" ? "-נרשמי המסע" : "כל הרשימה"}?`)) return;
    setBusy(true);
    try {
      const r = await sendNewsletter({ subject, html, source: audience === "journey" ? "journey" : null });
      setStatus(`נשלח ל-${r?.sent ?? 0} (נכשל: ${r?.failed ?? 0})`);
      if (sel) { await discoveryMark(sel.id, "sent"); setSel(null); await load(); }
    } catch (e) { setStatus("שגיאה: " + (e.message || e)); } finally { setBusy(false); }
  };
  const dismiss = async (id) => { await discoveryMark(id, "dismissed"); await load(); };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", margin: "8px 2px 12px" }}>
        <div>
          <h3 style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16.5, fontWeight: 800, margin: 0 }}>🔔 אירועי גילוי — מיילים חכמים</h3>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 3 }}>שולח לרשימה **רק כשמתגלה התכנסות אמיתית** — לא ניוזלטר. אותה רשימת subscribers, מתויגת. אתה מחליט מה לשלוח.</div>
        </div>
        <button onClick={scan} disabled={scanning} style={{ ...btn("rgba(212,175,55,.2)", C.goldBright), border: `1px solid ${C.borderGold}`, fontSize: 12.5, padding: "7px 15px" }}>{scanning ? "סורק…" : "🔍 סרוק עכשיו"}</button>
      </div>
      {status && <div style={{ color: C.goldBright, fontFamily: F.body, fontSize: 12.5, marginBottom: 10 }}>{status}</div>}
      {pending && pending.length > 0 && (
        <button onClick={() => setListOpen(o => !o)} style={{ ...btn(listOpen ? "rgba(212,175,55,.15)" : "transparent", C.goldBright), border: `1px solid ${C.borderGold}`, fontSize: 12.5, padding: "6px 14px", marginBottom: 9 }}>
          {listOpen ? "▲ סגור רשימה" : "▼ פתח רשימה"} · {pending.length} אירועים
        </button>
      )}
      {!pending ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !pending.length ? <div style={{ ...card, color: C.muted }}>אין אירועים ממתינים. לחצו «סרוק עכשיו» כדי לזהות התכנסויות חדשות.</div>
        : !listOpen ? null
        : <div style={{ display: "grid", gap: 8, maxHeight: 340, overflowY: "auto", paddingInlineEnd: 2 }}>
          {pending.map(ev => (
            <div key={ev.id} style={{ ...card, padding: "11px 13px", borderColor: sel?.id === ev.id ? C.borderGold : C.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>🎯 {ev.value}</span>
                <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{ev.member_count} ביטויים</span>
                <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, flex: "1 1 auto", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(ev.sample || []).slice(0, 3).join(" · ")}</span>
                <button onClick={() => compose(ev)} style={btn("#2f8f4e")}>✉️ הכן מייל</button>
                <button onClick={() => dismiss(ev.id)} style={btn("transparent", C.muted)}>דחה</button>
              </div>
            </div>
          ))}
        </div>}
      {sel && (
        <div style={{ ...card, marginTop: 12, border: `1px solid ${C.borderGold}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 800 }}>✉️ מייל לאירוע {sel.value} · {sel.member_count} ביטויים</span>
            <button onClick={() => setSel(null)} title="סגור" style={{ ...btn("transparent", C.muted), fontSize: 14, padding: "4px 12px" }}>✕ סגור</button>
          </div>
          {/* 🔤 הביטויים בהתכנסות — האחרונים למעלה */}
          {(sel.sample || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, maxHeight: 96, overflowY: "auto" }}>
              {(sel.sample || []).map((s, i) => (
                <span key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 11px", color: C.goldLight, fontFamily: F.body, fontSize: 13 }}>{s} <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>={sel.value}</span></span>
              ))}
            </div>
          )}
          <input value={subject} onChange={e => setSubject(e.target.value)} dir="rtl" style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 15, padding: "9px 12px", marginBottom: 8 }} />
          <textarea value={html} onChange={e => setHtml(e.target.value)} dir="rtl" rows={7} style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontFamily: F.mono, fontSize: 12, padding: "9px 12px", marginBottom: 9 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11.5 }}>קהל:</span>
            {[["all", "כל הרשימה"], ["journey", "נרשמי המסע"]].map(([k, l]) => (
              <button key={k} onClick={() => setAudience(k)} style={{ ...btn(audience === k ? "rgba(212,175,55,.25)" : "transparent", audience === k ? C.goldBright : C.muted), border: `1px solid ${audience === k ? C.borderGold : C.border}` }}>{l}</button>
            ))}
            <span style={{ flex: 1 }} />
            <button onClick={dryRun} disabled={busy} style={btn("transparent", C.goldBright)}>👁 כמה יקבלו</button>
            <button onClick={sendTest} disabled={busy} style={btn("transparent", C.goldBright)}>✉️ בדיקה אליי</button>
            <button onClick={sendAll} disabled={busy} style={btn("#2f8f4e")}>{busy ? "שולח…" : "🚀 שלח"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 🆕 נוסף לאחרונה — רשימה אינסופית («טען עוד») של כל המאגר לפי סדר-כניסה, עם אישור/דחייה במקום.
function RecentWordsFeed({ srcLabel }) {
  const [rows, setRows] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const PAGE = 30;
  const loadMore = useCallback(async (off) => {
    setLoading(true);
    const d = await adminWordsConsole({ scope: "all", limit: PAGE, offset: off });
    setLoading(false);
    if (!d || d.error) return;
    setTotal(d.total || 0);
    setRows(prev => off === 0 ? (d.rows || []) : [...prev, ...(d.rows || [])]);
    setOffset(off + PAGE);
  }, []);
  useEffect(() => { loadMore(0); }, [loadMore]);
  const act = async (id, action) => {
    if (action === "delete" && !confirm("למחוק לצמיתות?")) return;
    setBusy(id);
    try {
      await adminReviewWord(id, action);
      setRows(prev => action === "delete" ? prev.filter(r => r.id !== id)
        : prev.map(r => r.id === id ? { ...r, is_verified: action === "approve" } : r));
    } catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  return (
    <div>
      <H sub="כל המילים שנכנסו למאגר לפי סדר-כניסה — רשימה אינסופית («טען עוד»). אשר/דחה/מחק במקום. זה מה שמופיע בבית ובחיפוש.">🆕 נוסף לאחרונה למאגר · {total.toLocaleString("he")}</H>
      {!rows.length && loading ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !rows.length ? <div style={{ ...card, color: C.muted }}>אין עדיין.</div>
        : <div style={{ display: "grid", gap: 7 }}>
          {rows.map(w => (
            <div key={w.id} style={{ ...card, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>{w.phrase}</span>
              <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13 }}>= {w.ragil}</span>
              <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10.5 }}>{srcLabel(w.source)}</span>
              {w.family > 0 && <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 10.5 }}>🎯 {w.family}</span>}
              <span style={{ color: w.is_verified ? "#7bbf7b" : "#e0b34a", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>{w.is_verified ? "✅ גלוי" : "⏳ מוסתר"}</span>
              <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>{fmt(w.created_at)}</span>
              <span style={{ flex: 1 }} />
              {!w.is_verified && <button disabled={busy === w.id} onClick={() => act(w.id, "approve")} style={btn("#2f8f4e")}>✅ פרסם</button>}
              {w.is_verified && <button disabled={busy === w.id} onClick={() => act(w.id, "reject")} style={btn("transparent", C.muted)}>✖ הסתר</button>}
              <button disabled={busy === w.id} onClick={() => act(w.id, "delete")} style={btn("transparent", "#d98a92")}>🗑</button>
            </div>
          ))}
        </div>}
      {offset < total && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={() => loadMore(offset)} disabled={loading} style={{ ...btn("rgba(212,175,55,.15)", C.goldBright), border: `1px solid ${C.borderGold}`, fontSize: 13, padding: "9px 24px" }}>
            {loading ? "טוען…" : `טען עוד (${(total - offset).toLocaleString("he")} נותרו)`}
          </button>
        </div>
      )}
    </div>
  );
}

// 🧪 מעבדת התכנסויות — שולחן-עבודה: מקלידים ביטוי → רואים מיד עם מה הוא מתכנס → מוסיפים למאגר.
function ConvergenceLab() {
  const [q, setQ] = useState("");
  const [val, setVal] = useState(null);       // {ragil, en, enVal}
  const [conv, setConv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState([]);     // מה שהוספתי הפעם
  const [msg, setMsg] = useState("");
  const heb = q.replace(/[^א-ת ]/g, "").trim();   // אותיות עבריות בלבד
  const check = async () => {
    setMsg("");
    const en = hasLatin(q);
    const ragil = heb ? ragilFn(heb) : null;
    setVal({ ragil, en, enVal: en ? englishSimple(q) : null });
    if (ragil) { setLoading(true); const d = await adminValueConvergence(ragil); setConv(d?.error ? null : d); setLoading(false); }
    else setConv(null);
  };
  const add = async () => {
    if (!heb || !val?.ragil) return;
    setBusy(true); setMsg("");
    try {
      const r = await adminAddWord(heb, { ragil: val.ragil });
      if (r === "added") { setAdded(a => [{ phrase: heb, ragil: val.ragil }, ...a]); setMsg(`✓ «${heb}» נוסף — מתכנס עכשיו עם ${(conv?.rows || []).length} ביטויים ב-${val.ragil}`); await check(); }
      else if (r === "exists") setMsg("כבר קיים במאגר.");
      else setMsg("לא נוסף: " + r);
    } catch (e) { setMsg("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  };
  const exists = (conv?.rows || []).some(w => w.phrase === heb);
  return (
    <div style={{ ...card, borderColor: C.borderGold }}>
      <h3 style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16.5, fontWeight: 800, margin: "0 0 4px" }}>🧪 מעבדת התכנסויות</h3>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginBottom: 11 }}>הקלד ביטוי → ראה מיד עם מה הוא מתכנס → הוסף למאגר כדי לבנות התכנסות. (לדוגמה: «גוד קינג» → 176 → «כסא המלך».)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} placeholder="הקלד ביטוי (עברית / אנגלית)…" dir="rtl"
          style={{ flex: "1 1 240px", minWidth: 180, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.goldLight, fontFamily: F.body, fontSize: 17, padding: "11px 14px", outline: "none" }} />
        <button onClick={check} style={{ ...btn("rgba(212,175,55,.2)", C.goldBright), border: `1px solid ${C.borderGold}`, fontSize: 14, padding: "9px 20px" }}>בדוק ↩</button>
      </div>
      {val && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {val.ragil != null && <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 18 }}>{heb} = <b style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 22 }}>{val.ragil}</b></span>}
            {val.en && <span style={{ color: "#5ec8ff", fontFamily: F.heading, fontSize: 13 }}>🇺🇸 English Simple = {val.enVal}</span>}
          </div>
          {val.ragil != null && (
            loading ? <div style={{ color: C.muted }}>טוען התכנסות…</div> : (
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🎯 התכנסות {val.ragil} · {(conv?.rows || []).length} ביטויים</span>
                  {!exists && heb && <button disabled={busy} onClick={add} style={btn("#2f8f4e")}>➕ הוסף «{heb}» למאגר</button>}
                  {exists && <span style={{ color: "#7bbf7b", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>✓ כבר בהתכנסות</span>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {(conv?.rows || []).length === 0 ? <span style={{ color: C.muted, fontSize: 12 }}>אין עדיין ביטויים בערך הזה — תהיה הראשון.</span>
                    : (conv.rows || []).map((w, i) => (
                      <span key={i} title={w.is_verified ? "מאומת" : "ממתין"} style={{ background: w.is_verified ? "rgba(123,191,123,.1)" : "rgba(224,179,74,.1)", border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 11px", color: C.goldLight, fontFamily: F.body, fontSize: 13.5 }}>{w.phrase}{!w.is_verified ? " ⏳" : ""}</span>
                    ))}
                </div>
              </div>
            )
          )}
          {val.ragil == null && val.en && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>ביטוי אנגלי — ההוספה למאגר-האנגלית נעשית דרך «🌍 EN» בקונסולה. כאן מוצג הערך בלבד.</div>}
        </div>
      )}
      {msg && <div style={{ color: msg.startsWith("✓") ? "#7bbf7b" : C.muted, fontFamily: F.body, fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      {added.length > 0 && (
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>נוספו הפעם: {added.map(a => `${a.phrase} (${a.ragil})`).join(" · ")}</div>
      )}
    </div>
  );
}

// 🔗 סוגי-התכנסויות ממתינות — לצוריאל לראות ולהחליט: ליבה (מצטרף לגרעין) · קהילה (חדש מאנשים) · מעורב.
const CONV_KIND = { core: { e: "🏛️", t: "ליבה", c: "#7bbf7b", d: "מצטרף להתכנסות קיימת של האתר" }, community: { e: "👥", t: "קהילה", c: "#c58cff", d: "התכנסות חדשה מאנשים — נפרד מהאתר" }, mixed: { e: "🔀", t: "מעורב", c: "#e0b34a", d: "גרעין קטן + תוספת" } };
function ConvergenceTypesPanel() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  useEffect(() => { if (open && !data) adminConvergenceTypes(2).then(d => setData(d?.error ? [] : (d || []))).catch(() => setData([])); }, [open, data]);
  const rows = (data || []).filter(r => filter === "all" || r.kind === filter);
  const sum = k => (data || []).filter(r => r.kind === k).reduce((a, r) => a + (r.pending || 0), 0);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{ ...btn(open ? "rgba(212,175,55,.15)" : "transparent", C.goldBright), border: `1px solid ${C.borderGold}`, fontSize: 13, padding: "8px 16px" }}>
        🔗 סוגי התכנסויות ממתינות {open ? "▲" : "▾"}
      </button>
      {open && (
        <div style={{ ...card, marginTop: 10 }}>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 10 }}>לראות אילו התכנסויות נוצרות מהתוכן הממתין — לפני שמחליטים איפה תוכן-אנשים חי (אתר / אזור-משתמשים נפרד).</div>
          {!data ? <div style={{ color: C.muted }}>טוען…</div> : (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {[["all", `הכל (${data.length})`], ...Object.keys(CONV_KIND).map(k => [k, `${CONV_KIND[k].e} ${CONV_KIND[k].t}`])].map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)} style={{ ...btn(filter === k ? "rgba(212,175,55,.2)" : "transparent", filter === k ? C.goldBright : C.muted), border: `1px solid ${filter === k ? C.borderGold : C.border}` }}>{l}{k !== "all" ? ` · ${sum(k)}` : ""}</button>
                ))}
              </div>
              <div style={{ display: "grid", gap: 7, maxHeight: 420, overflowY: "auto" }}>
                {rows.slice(0, 120).map((r, i) => {
                  const ck = CONV_KIND[r.kind] || CONV_KIND.mixed;
                  return (
                    <div key={i} style={{ border: `1px solid ${C.border}`, borderInlineStart: `3px solid ${ck.c}`, borderRadius: 10, padding: "9px 12px", background: "rgba(8,5,2,0.3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>🎯 {r.value}</span>
                        <span style={{ color: ck.c, fontFamily: F.heading, fontSize: 11, fontWeight: 800 }}>{ck.e} {ck.t}</span>
                        <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 11.5 }}>{r.pending} ממתינים{r.verified_core > 0 ? ` · ${r.verified_core} בליבה` : ""}</span>
                        <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>· {(r.sources || []).join(", ")}</span>
                      </div>
                      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.6 }}>{(r.sample || []).join(" · ")}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 🖥️ קונסולת-מילים — עדשה אחת על כל המאגר: ממתין/מאומת/נדחה/הכל · חיפוש · דפדוף אחורה ללא סוף ·
// לכל מילה: חיבור-לישות (משפחת-ערך) + המלצת-AI + אישור/דחייה/מחיקה. עוקף RLS דרך RPC (רואה מוסתרות).
const REC = { approve: { e: "✅", t: "מומלץ לאשר", c: "#7bbf7b" }, review: { e: "👁", t: "כדאי מבט", c: "#e0b34a" }, reject: { e: "🚫", t: "מומלץ לדחות", c: "#d98a92" } };
const SCOPES = [["pending", "⏳ ממתינות"], ["verified", "✅ מאומתות"], ["rejected", "✖ נדחו"], ["all", "🌐 הכל"]];
function WordsConsole({ srcLabel, initialScope = "pending", lockScope = false, heOnly = false, intlOnly = false, showWorld = false }) {
  const [mode, setMode] = useState(intlOnly ? "intl" : "he");   // he = עברית (gematria_words) · intl = שפות (word_aliases)
  const [intl, setIntl] = useState(null);
  const [intlBusy, setIntlBusy] = useState(null);
  const [scope, setScope] = useState(initialScope);
  const [world, setWorld] = useState("");           // 🌍 מסנן-עולם (טאב מאושרות)
  const [worlds, setWorlds] = useState([]);
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [convVal, setConvVal] = useState(null);   // 🎯 ערך-ההתכנסות הפתוח כרגע
  const [conv, setConv] = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [enId, setEnId] = useState(null);         // 🌍 המילה שפותחים לה טופס-אנגלית
  const [enText, setEnText] = useState("");
  const [enMsg, setEnMsg] = useState("");
  const [enBusy, setEnBusy] = useState(false);
  const [triage, setTriage] = useState(null);     // 🧹 ספירת דליי-הסינון
  const [triageBusy, setTriageBusy] = useState(false);
  const PAGE = 40;
  useEffect(() => { const t = setTimeout(() => { setQ(qLive); setOffset(0); }, 400); return () => clearTimeout(t); }, [qLive]);
  const load = useCallback(async () => {
    setLoading(true);
    const d = await adminWordsConsole({ scope, q: q || null, limit: PAGE, offset, world: world || null });
    setData(d); setLoading(false);
  }, [scope, q, offset, world]);
  useEffect(() => { load(); }, [load]);
  // 🌍 עולמות למסנן (רק בטאב-המאושרות)
  useEffect(() => { if (showWorld) getWordWorlds().then(w => setWorlds(Array.isArray(w) ? w : [])); }, [showWorld]);
  // 🧹 ספירת דליי-הסינון — נטען כשמסתכלים על «ממתינות».
  const loadTriage = useCallback(async () => { if (mode === "he" && scope === "pending") { const t = await adminTriageCounts(); setTriage(t?.error ? null : t); } }, [mode, scope]);
  useEffect(() => { loadTriage(); }, [loadTriage]);
  const bulkTriage = async (action) => {
    const label = action === "reject_junk" ? `לדחות ${triage?.reject || 0} מילות-זבל (ספאם/משפטים/פסוקים)?` : `לאשר ${triage?.approve || 0} מילים נקיות ומחוברות?`;
    if (!confirm(label)) return;
    setTriageBusy(true);
    try { const n = await adminBulkTriage(action); await load(); await loadTriage(); alert(`בוצע על ${n} מילים.`); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setTriageBusy(false); }
  };
  // 🌍 מילים בשפות אחרות — word_aliases (lang≠he). אישור/הסתרה/מחיקה דרך admin_manage_alias.
  const loadIntl = useCallback(async () => {
    const { data } = await supabase.from("word_aliases")
      .select("id, alias, lang, method, verified, source, created_at, gematria_words(phrase, ragil)")
      .neq("lang", "he").order("created_at", { ascending: false }).limit(300);
    setIntl(data || []);
  }, []);
  useEffect(() => { if (mode === "intl") loadIntl(); }, [mode, loadIntl]);
  const intlAction = async (id, action) => {
    if (action === "delete" && !confirm("למחוק לצמיתות?")) return;
    setIntlBusy(id);
    try { await supabase.rpc("admin_manage_alias", { p_id: id, p_action: action }); await loadIntl(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setIntlBusy(null); }
  };
  const loadConv = useCallback(async (value) => {
    setConvLoading(true);
    const d = await adminValueConvergence(value);
    setConv(d); setConvLoading(false);
  }, []);
  const toggleConv = (value) => {
    if (convVal === value) { setConvVal(null); setConv(null); return; }
    setConvVal(value); setConv(null); loadConv(value);
  };
  const openEn = (w) => {
    if (enId === w.id) { setEnId(null); return; }
    setEnId(w.id); setEnText(hebrewToLatin(w.phrase)); setEnMsg("");
  };
  const saveEn = async (phrase) => {
    if (!enText.trim()) return;
    setEnBusy(true); setEnMsg("");
    try { await addEnglishAlias({ phrase, alias: enText.trim() }); setEnMsg("✓ נוסף למאגר האנגלית"); setTimeout(() => { setEnId(null); setEnMsg(""); }, 1200); }
    catch (e) { setEnMsg("שגיאה: " + (e.message || e)); }
    finally { setEnBusy(false); }
  };
  const doAction = async (id, action) => {
    if (action === "delete" && !confirm("למחוק לצמיתות?")) return;
    setBusy(id);
    try { await adminReviewWord(id, action); await load(); if (convVal != null) await loadConv(convVal); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const convAction = async (id, action) => {
    if (action === "delete" && !confirm("למחוק לצמיתות?")) return;
    setBusy(id);
    try { await adminReviewWord(id, action); await loadConv(convVal); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const forbidden = data?.error === "forbidden";
  return (
    <div>
      <H sub="כל המילים בכל המאגר — עדשה אחת. ממתין/מאומת/נדחה/הכל · חיפוש · דפדוף אחורה ללא סוף. לכל מילה: חיבור-לישות + המלצת-AI + פעולה. עוקף הרשאות כדי לראות גם מוסתרות.">🖥️ קונסולת המילים{mode === "he" && total ? ` · ${total.toLocaleString("he")}` : ""}</H>
      {/* בורר-שפה: עברית (gematria_words) / שפות אחרות (word_aliases) — מוסתר כשהטאב נעול לשפה */}
      {!heOnly && !intlOnly && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[["he", "🇮🇱 עברית"], ["intl", "🌍 שפות אחרות"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ ...btn(mode === k ? "rgba(212,175,55,.25)" : "transparent", mode === k ? C.goldBright : C.muted), border: `1px solid ${mode === k ? C.borderGold : C.border}`, fontSize: 12.5, padding: "5px 14px" }}>{l}</button>
          ))}
        </div>
      )}
      {mode === "intl" ? (
        <div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 10 }}>מילים בשפות אחרות (תעתוק/תרגום → עברית). ✅ מאמת · 🙈 מסתיר · 🗑 מוחק.{intl ? ` · ${intl.length}` : ""}</div>
          {!intl ? <div style={{ ...card, color: C.muted }}>טוען…</div>
            : !intl.length ? <div style={{ ...card, color: C.muted }}>אין עדיין מילים בשפות אחרות. ברגע שיתווספו (אנגלית/רוסית/…) הן יופיעו כאן לאישור.</div>
            : <div style={{ display: "grid", gap: 8 }}>
              {intl.map(a => (
                <div key={a.id} style={{ ...card, padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 15 }}>{LANG_FLAG[a.lang] || "🌍"}</span>
                    <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 16, fontWeight: 700, direction: "ltr" }}>{a.alias}</span>
                    <span style={{ color: C.muted, fontSize: 13 }}>→</span>
                    <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 15 }}>{a.gematria_words?.phrase || "—"}</span>
                    {a.gematria_words?.ragil != null && <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>= {a.gematria_words.ragil}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>{METHOD_HE[a.method] || a.method || "—"} · {srcLabel(a.source)}</span>
                    <span style={{ color: a.verified ? "#7bbf7b" : "#e0b34a", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>{a.verified ? "✅ מאומת" : "⏳ ממתין"}</span>
                    <span style={{ flex: 1 }} />
                    {!a.verified && <button disabled={intlBusy === a.id} onClick={() => intlAction(a.id, "verify")} style={btn("#2f8f4e")}>✅ אשר</button>}
                    {a.verified && <button disabled={intlBusy === a.id} onClick={() => intlAction(a.id, "hide")} style={btn("transparent", C.muted)}>🙈 הסתר</button>}
                    <button disabled={intlBusy === a.id} onClick={() => intlAction(a.id, "delete")} style={btn("transparent", "#d98a92")}>🗑</button>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      ) : (<>
      {!lockScope && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {SCOPES.map(([k, l]) => (
            <button key={k} onClick={() => { setScope(k); setOffset(0); }} style={{ ...btn(scope === k ? "rgba(212,175,55,.2)" : "transparent", scope === k ? C.goldBright : C.muted), border: `1px solid ${scope === k ? C.borderGold : C.border}` }}>{l}</button>
          ))}
        </div>
      )}
      {/* 🌍 מסנן-עולם — טאב-המאושרות. «∅» = מילים בלי עולם (חזית מתייג-העולמות). */}
      {showWorld && worlds.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <select value={world} onChange={e => { setWorld(e.target.value); setOffset(0); }}
            style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "8px 11px", outline: "none", maxWidth: "100%" }}>
            <option value="">🌍 כל העולמות</option>
            {worlds.map(w => <option key={w.world} value={w.world}>{w.world === "∅" ? "◦ ללא עולם" : w.world} · {w.n}</option>)}
          </select>
        </div>
      )}
      <input value={qLive} onChange={e => setQLive(e.target.value)} placeholder="🔍 חיפוש מילה…" dir="rtl"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.goldLight, fontFamily: F.body, fontSize: 16, padding: "10px 13px", marginBottom: 12, outline: "none" }} />
      {/* 🧹 סינון-מסה — 3 דליים לפי המלצת-המנוע. שני כפתורים מנקים אלפים בקליק. */}
      {scope === "pending" && triage && triage.total > 0 && (
        <div style={{ ...card, marginBottom: 12, borderColor: C.borderGold, padding: "12px 14px" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>🧹 סינון-חכם — {triage.total.toLocaleString("he")} ממתינות</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 10 }}>המנוע פיצל לפי המלצה. דחה את הזבל ואשר את הטוב בקליק — נשאר לך לעבור ידנית רק על ה«אמצע».</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button disabled={triageBusy || !triage.reject} onClick={() => bulkTriage("reject_junk")} style={btn(triage.reject ? "#7a3f45" : "transparent", "#fff")}>🚫 דחה זבל · {triage.reject}</button>
            <button disabled={triageBusy || !triage.approve} onClick={() => bulkTriage("approve_good")} style={btn(triage.approve ? "#2f8f4e" : "transparent", "#fff")}>✅ אשר טוב · {triage.approve}</button>
            <span style={{ color: "#e0b34a", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>👁 לעין אנושית: {triage.review}</span>
          </div>
        </div>
      )}
      {forbidden ? <div style={{ ...card, color: "#d98a92" }}>אין הרשאת-אדמין (התחבר כאדמין).</div>
        : loading && !rows.length ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !rows.length ? <div style={{ ...card, color: C.muted }}>אין מילים בקטגוריה זו. 🌳</div>
        : <div style={{ display: "grid", gap: 9 }}>
          {rows.map(w => {
            const rec = REC[w.rec?.v] || REC.review;
            return (
              <div key={w.id} style={{ ...card, borderColor: w.rec?.v === "reject" ? "#7a3f45" : w.rec?.v === "approve" ? "#3f6a47" : C.border, padding: "12px 13px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>{w.phrase}</span>
                  <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 14 }}>= {w.ragil}</span>
                  {(w.all_values || []).length > 1 && <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>({w.all_values.join(" · ")})</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
                  {w.world && <span style={{ background: "rgba(94,200,255,.14)", border: "1px solid rgba(94,200,255,.35)", borderRadius: 999, color: "#9bd6ff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "1px 9px" }}>🌍 {w.world}</span>}
                  {w.category && w.category !== "מאגר_ערכים" && w.category !== "כללי" && <span style={{ color: "#c9b98a", fontFamily: F.heading, fontSize: 10.5 }}>🏷 {w.category}</span>}
                  {w.tier != null && w.tier <= 1 && <span style={{ color: "#e0b34a", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>⭐ מוביל</span>}
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>{srcLabel(w.source)}</span>
                  {w.vip_source && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>· מאת {w.vip_source}</span>}
                  <span style={{ color: w.has_entity ? "#7bbf7b" : C.muted, fontFamily: F.heading, fontSize: 11 }}>{w.has_entity ? "🔗 מחובר לישות" : "◦ לא מקושר"}</span>
                  {w.family > 0 && (
                    <button onClick={() => toggleConv(w.ragil)} style={{ cursor: "pointer", background: convVal === w.ragil ? "rgba(212,175,55,.25)" : "transparent", border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldBright, fontFamily: F.heading, fontSize: 11, fontWeight: 700, padding: "2px 10px" }}>
                      🎯 {w.family} באותו ערך {convVal === w.ragil ? "▲" : "▾"}
                    </button>
                  )}
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10.5 }}>· {fmt(w.created_at)}</span>
                </div>
                {/* 🎯 ההתכנסות — כל הביטויים באותו ערך, פתוח אינליין. «להיכנס לתוך ההתכנסות». */}
                {convVal === w.ragil && (
                  <div style={{ margin: "2px 0 10px", background: C.surface2, border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
                      <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🎯 התכנסות הערך {w.ragil}{conv ? ` · ${conv.verified} מאומתים · ${conv.pending} ממתינים` : ""}</span>
                      <Link to={`/number/${w.ragil}`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 12px" }}>← היכנס לדף ההתכנסות</Link>
                    </div>
                    {convLoading ? <div style={{ color: C.muted, fontSize: 12 }}>טוען…</div>
                      : conv?.error ? <div style={{ color: "#d98a92", fontSize: 12 }}>אין הרשאה</div>
                      : <div style={{ display: "grid", gap: 6 }}>
                        {(conv?.rows || []).map(c => (
                          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "5px 8px", borderRadius: 8, background: c.is_verified ? "rgba(123,191,123,.08)" : "rgba(224,179,74,.09)" }}>
                            <Link to={`/number/${w.ragil}`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, textDecoration: "none", flex: "1 1 auto", minWidth: 100 }}>{c.phrase}</Link>
                            <span style={{ color: c.is_verified ? "#7bbf7b" : "#e0b34a", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>{c.is_verified ? "✅ מאומת" : "⏳ ממתין"}</span>
                            <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>{srcLabel(c.source)}</span>
                            {!c.is_verified && <button disabled={busy === c.id} onClick={() => convAction(c.id, "approve")} style={btn("#2f8f4e")}>✅</button>}
                            {c.is_verified && <button disabled={busy === c.id} onClick={() => convAction(c.id, "reject")} style={btn("transparent", C.muted)}>✖</button>}
                          </div>
                        ))}
                      </div>}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* מאושרות: מציגים «✓ מאושר» ברור, לא המלצת-אישור מבלבלת. ממתינות: המלצת-המנוע. */}
                  {w.is_verified
                    ? <span style={{ flex: "1 1 auto", minWidth: 120, color: "#7bbf7b", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800 }}>✅ מאושרת ומפורסמת</span>
                    : <span title={w.rec?.why} style={{ flex: "1 1 auto", minWidth: 140, color: rec.c, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{rec.e} {rec.t} — <span style={{ color: C.muted, fontWeight: 500 }}>{w.rec?.why}</span></span>}
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => openEn(w)} style={btn(enId === w.id ? "rgba(94,200,255,.2)" : "transparent", "#5ec8ff")}>🌍 EN</button>
                    {!w.is_verified && <button disabled={busy === w.id} onClick={() => doAction(w.id, "approve")} style={btn("#2f8f4e")}>✅ פרסם</button>}
                    {w.is_verified && <button disabled={busy === w.id} onClick={() => doAction(w.id, "reject")} style={btn("transparent", C.muted)}>🙈 הסתר</button>}
                    {!w.is_verified && w.state !== "rejected_by_admin" && <button disabled={busy === w.id} onClick={() => doAction(w.id, "reject")} style={btn("transparent", C.muted)}>✖ דחה</button>}
                    <button disabled={busy === w.id} onClick={() => doAction(w.id, "delete")} style={btn("transparent", "#d98a92")}>🗑</button>
                  </div>
                </div>
                {/* 🌍 הוספת תרגום/תעתוק אנגלי — ממלא את מאגר-האנגלית מתוך המילה העברית */}
                {enId === w.id && (
                  <div style={{ marginTop: 9, padding: "10px 11px", borderRadius: 10, background: "rgba(94,200,255,.07)", border: "1px solid rgba(94,200,255,.3)" }}>
                    <div style={{ color: "#9bd6ff", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginBottom: 7 }}>🌍 אנגלית ל«{w.phrase}» (ערך {w.ragil}) — הצעה אוטומטית, ערוך לפי הצורך:</div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <input value={enText} onChange={e => setEnText(e.target.value)} dir="ltr" placeholder="english" style={{ flex: "1 1 160px", minWidth: 140, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 15, padding: "8px 11px", outline: "none" }} />
                      <button disabled={enBusy} onClick={() => saveEn(w.phrase)} style={btn("#2f6df6")}>{enBusy ? "שומר…" : "💾 הוסף למאגר האנגלית"}</button>
                    </div>
                    {enMsg && <div style={{ color: enMsg.startsWith("✓") ? "#7bbf7b" : "#d98a92", fontFamily: F.body, fontSize: 12, marginTop: 6 }}>{enMsg}</div>}
                    <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5, marginTop: 6 }}>נשמר כ-alias (lang=en, תעתוק) — הערך העברי נשמר. יופיע בקונסולה → «🌍 שפות אחרות».</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      {/* דפדוף — אחורה ועוד אחורה, ללא סוף */}
      {(rows.length > 0 || offset > 0) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} style={{ ...btn(offset === 0 ? "transparent" : "rgba(212,175,55,.15)", offset === 0 ? C.muted : C.goldBright), border: `1px solid ${C.border}`, opacity: offset === 0 ? 0.5 : 1 }}>‹ הקודם</button>
          <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>{offset + 1}–{Math.min(offset + PAGE, total)} מתוך {total.toLocaleString("he")}</span>
          <button disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)} style={{ ...btn(offset + PAGE >= total ? "transparent" : "rgba(212,175,55,.15)", offset + PAGE >= total ? C.muted : C.goldBright), border: `1px solid ${C.border}`, opacity: offset + PAGE >= total ? 0.5 : 1 }}>עוד ›</button>
        </div>
      )}
      </>)}
    </div>
  );
}

const VIEWS = [
  ["approved", "🟢 עברית · מאושרות"],
  ["pending", "🟠 עברית · לאישור"],
  ["english", "🇺🇸 אנגלית"],
  ["russian", "🇷🇺 רוסית"],
  ["lab", "🧪 מעבדה"],
];

// 🌍 מתייג-העולמות — פאנל-סקירה בטאב «מאושרות». הצעת עולם לפי קטגוריה + אישור-בעין.
// שום דבר לא מתויג אוטומטית — apply רץ רק בלחיצה על קטגוריה ספציפית.
const CAT_WORLD = { "משיח": "גאולה", "יהוה": "שמות הקודש", "גאולה": "גאולה", "תורה": "תורה וקודש", "קבלה": "מושגי קבלה" };
function WorldTagger() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [worlds, setWorlds] = useState([]);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState({});
  const load = useCallback(async () => {
    const [s, w] = await Promise.all([getWorldTagStats(), getWordWorlds()]);
    const rows = Array.isArray(s) ? s : [];
    setStats(rows);
    setWorlds((Array.isArray(w) ? w : []).map(x => x.world).filter(x => x && x !== "∅"));
    const p = {}; rows.forEach(r => { if (CAT_WORLD[r.category]) p[r.category] = CAT_WORLD[r.category]; });
    setPick(prev => ({ ...p, ...prev }));
  }, []);
  useEffect(() => { if (open && stats === null) load(); }, [open, stats, load]);
  const apply = async (cat) => {
    const w = pick[cat]; if (!w) return;
    if (!confirm(`לתייג את כל המילים בקטגוריה «${cat}» לעולם «${w}»?`)) return;
    setBusy(cat);
    try { const n = await applyWorldTag(cat, w); setDone(d => ({ ...d, [cat]: n })); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const totalUntagged = (stats || []).reduce((a, r) => a + r.n, 0);
  return (
    <div style={{ ...card, marginBottom: 14, borderColor: C.borderGold }}>
      <button onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", background: "none", border: "none", width: "100%", textAlign: "right", padding: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>🌍 מתייג-העולמות{stats ? ` · ${totalUntagged.toLocaleString("he")} ללא עולם` : ""}</span>
        <span style={{ marginInlineStart: "auto", color: C.muted }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
            שלב 1 — לפי קטגוריה (חינם, ללא AI). לכל קטגוריה: כמות · דגימה · עולם-יעד (הצעה מוכנה לקטגוריות ברורות). אשר קטגוריה → כל מילותיה מקבלות עולם. קטגוריות גנריות («מאגר_ערכים» וכו') = השאר ל-AI בשלב 2.
          </div>
          {stats === null ? <div style={{ color: C.muted }}>טוען…</div>
            : !stats.length ? <div style={{ color: C.muted }}>אין קטגוריות לא-מתויגות 🌳</div>
            : <div style={{ display: "grid", gap: 9 }}>
              {stats.map(r => (
                <div key={r.category} style={{ ...card, padding: "11px 13px", borderColor: pick[r.category] ? "#3f6a47" : C.border }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                    <b style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14 }}>🏷 {r.category}</b>
                    <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>{r.n.toLocaleString("he")} מילים</span>
                    {done[r.category] != null && <span style={{ color: "#7bbf7b", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>✓ תויגו {done[r.category]}</span>}
                  </div>
                  <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginBottom: 9 }}>דגימה: {(r.samples || []).join(" · ")}</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={pick[r.category] || ""} onChange={e => setPick(p => ({ ...p, [r.category]: e.target.value }))}
                      style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "6px 10px" }}>
                      <option value="">— בחר עולם —</option>
                      {worlds.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <button disabled={busy === r.category || !pick[r.category]} onClick={() => apply(r.category)} style={btn(pick[r.category] ? "#2f8f4e" : "transparent", "#fff")}>{busy === r.category ? "מתייג…" : "✔ אשר ותייג"}</button>
                    {CAT_WORLD[r.category] && !done[r.category] && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>💡 הצעה: {CAT_WORLD[r.category]}</span>}
                  </div>
                </div>
              ))}
            </div>}
        </div>
      )}
    </div>
  );
}

// 🌉 גשרי-שפה לאישור — הגילויים החוצי-שפתיים שהמנוע מצא היום, ממתינים לאוצר.
function BridgesReview() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => setRows(await getPendingBridges()), []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => {
    if (action === "reject" && !confirm("לדחות את הגשר?")) return;
    setBusy(id);
    try { await verifyBridge(id, action); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const REL = { shared_value: "ערך משותף", transliteration: "תעתוק", translation: "תרגום" };
  return (
    <div>
      <H sub="גשרים חוצי-שפות שהמנוע מצא (מגובי-תרגום, מאומתי-מנוע) וממתינים לאישורך. אישור → נכנס לגרף ולמעבדת-השם כ«✓ מאומת».">🌉 גשרים לאישור{rows ? ` (${rows.length})` : ""}</H>
      {rows === null ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !rows.length ? <div style={{ ...card, color: C.muted }}>אין גשרים שממתינים לאישור כרגע. 🌳</div>
        : <div style={{ display: "grid", gap: 9 }}>
          {rows.map(b => (
            <div key={b.id} style={{ ...card, padding: "12px 14px", borderColor: "#3f5a6a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                <b style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17 }}>{b.hebrew}</b>
                <span style={{ color: "#5ec8ff" }}>↔</span>
                <b style={{ color: "#9bd6ff", fontFamily: F.body, fontSize: 15, direction: "ltr" }}>{LANG_FLAG[b.lang] || "🌍"} {b.foreign_word}</b>
                <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 14 }}>= {b.gematria_he}</span>
                <span style={{ marginInlineStart: "auto", background: "rgba(94,200,255,.14)", border: "1px solid rgba(94,200,255,.3)", borderRadius: 999, color: "#9bd6ff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "1px 9px" }}>{REL[b.relationship_type] || b.relationship_type}{b.method ? ` · ${b.method}` : ""}</span>
              </div>
              {b.note && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>{b.note}</div>}
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <button disabled={busy === b.id} onClick={() => act(b.id, "verify")} style={btn("#2f8f4e")}>✅ אשר גשר</button>
                <button disabled={busy === b.id} onClick={() => act(b.id, "reject")} style={btn("transparent", "#d98a92")}>✖ דחה</button>
                <Link to={`/name-lab?w=${encodeURIComponent(b.foreign_word)}`} target="_blank" rel="noopener noreferrer" style={{ marginInlineStart: "auto", color: "#5ec8ff", fontFamily: F.heading, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🔬 במעבדה →</Link>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

// 🗂️ כל הגשרים — ניהול מלא (כמו עברית): הוצא/הכנס/ערוך. מאושרים · ממתינים · נדחו.
function BridgesManager() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");    // all | approved | review | rejected
  const [busy, setBusy] = useState(null);
  const [edit, setEdit] = useState(null);          // {id, hebrew, foreign}
  const load = useCallback(async () => setRows(await getAllBridges()), []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => {
    if (action === "delete" && !confirm("למחוק את הגשר לגמרי?")) return;
    if (action === "reject" && !confirm("לדחות את הגשר? (יוסר מהגרף)")) return;
    setBusy(id);
    try { await verifyBridge(id, action); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    setBusy(edit.id);
    try { await editBridge(edit.id, edit.hebrew, edit.foreign); setEdit(null); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const stateOf = b => b.status === "rejected" ? "rejected" : (b.human_verified ? "approved" : "review");
  const STATE = {
    approved: { label: "✅ מאושר", c: "#7bbf7b" },
    review:   { label: "⏳ ממתין לאישורך", c: "#e0b34a" },
    rejected: { label: "✖ נדחה", c: "#d98a92" },
  };
  const all = rows || [];
  const shown = filter === "all" ? all : all.filter(b => stateOf(b) === filter);
  const counts = { all: all.length, approved: all.filter(b => stateOf(b) === "approved").length, review: all.filter(b => stateOf(b) === "review").length, rejected: all.filter(b => stateOf(b) === "rejected").length };
  const inp = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 15, padding: "6px 9px", outline: "none", width: 120 };
  return (
    <div style={{ marginTop: 18 }}>
      <H sub="כל גשרי-האנגלית במקום אחד — בדיוק כמו העברית. אפשר לאשר, לדחות, לערוך (להחליף את המילה העברית) או למחוק לגמרי.">🗂️ כל הגשרים{rows ? ` (${all.length})` : ""}</H>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[["all", `הכל · ${counts.all}`], ["approved", `✅ מאושרים · ${counts.approved}`], ["review", `⏳ לאישור · ${counts.review}`], ["rejected", `✖ נדחו · ${counts.rejected}`]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...btn(filter === k ? "rgba(212,175,55,.2)" : "transparent", filter === k ? C.goldBright : C.muted), border: `1px solid ${filter === k ? C.borderGold : C.border}`, fontSize: 12.5, padding: "5px 12px" }}>{l}</button>
        ))}
      </div>
      {rows === null ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !shown.length ? <div style={{ ...card, color: C.muted }}>אין גשרים בקטגוריה הזו.</div>
        : <div style={{ display: "grid", gap: 8 }}>
          {shown.map(b => {
            const st = STATE[stateOf(b)];
            const isEd = edit && edit.id === b.id;
            return (
              <div key={b.id} style={{ ...card, padding: "11px 13px", borderColor: stateOf(b) === "rejected" ? "rgba(217,138,146,.3)" : C.border, opacity: stateOf(b) === "rejected" ? 0.7 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                  {isEd ? (
                    <>
                      <input value={edit.hebrew} onChange={e => setEdit({ ...edit, hebrew: e.target.value })} placeholder="עברית" style={inp} dir="rtl" />
                      <span style={{ color: "#5ec8ff" }}>↔</span>
                      <input value={edit.foreign} onChange={e => setEdit({ ...edit, foreign: e.target.value })} placeholder="לועזית" style={{ ...inp, direction: "ltr" }} />
                    </>
                  ) : (
                    <>
                      <b style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17 }}>{b.hebrew}</b>
                      <span style={{ color: "#5ec8ff" }}>↔</span>
                      <b style={{ color: "#9bd6ff", fontFamily: F.body, fontSize: 15, direction: "ltr" }}>{LANG_FLAG[b.lang] || "🌍"} {b.foreign_word}</b>
                      <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 14 }}>= {b.gematria_he}</span>
                      {b.method && <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>· {b.method}</span>}
                    </>
                  )}
                  <span style={{ marginInlineStart: "auto", color: st.c, fontFamily: F.heading, fontSize: 11, fontWeight: 800 }}>{st.label}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {isEd ? (
                    <>
                      <button disabled={busy === b.id} onClick={saveEdit} style={btn("#2f8f4e")}>💾 שמור</button>
                      <button onClick={() => setEdit(null)} style={btn("transparent", C.muted)}>ביטול</button>
                    </>
                  ) : (
                    <>
                      {stateOf(b) !== "approved" && <button disabled={busy === b.id} onClick={() => act(b.id, "verify")} style={btn("#2f8f4e")}>✅ אשר</button>}
                      {stateOf(b) === "approved" && <button disabled={busy === b.id} onClick={() => act(b.id, "unverify")} style={btn("transparent", "#e0b34a")}>↩ החזר לתור</button>}
                      {stateOf(b) !== "rejected" && <button disabled={busy === b.id} onClick={() => act(b.id, "reject")} style={btn("transparent", "#d98a92")}>✖ דחה</button>}
                      <button disabled={busy === b.id} onClick={() => setEdit({ id: b.id, hebrew: b.hebrew, foreign: b.foreign_word })} style={btn("transparent", "#9bd6ff")}>✏️ ערוך</button>
                      <button disabled={busy === b.id} onClick={() => act(b.id, "delete")} style={btn("transparent", "#d98a92")}>🗑 מחק</button>
                      <Link to={`/name-lab?w=${encodeURIComponent(b.foreign_word)}`} target="_blank" rel="noopener noreferrer" style={{ marginInlineStart: "auto", color: "#5ec8ff", fontFamily: F.heading, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🔬 במעבדה →</Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

// 🌐 ניהול-כינויים מלא (word_aliases) — הוסף/ערוך/אשר/הסתר/מחק. כמו ניהול העברית.
function AliasesManager() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");   // all | verified | pending
  const [busy, setBusy] = useState(null);
  const [edit, setEdit] = useState(null);        // {id, alias, hebrew}
  const [add, setAdd] = useState({ hebrew: "", alias: "" });
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => setRows(await getAllAliases()), []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => {
    if (action === "delete" && !confirm("למחוק את הכינוי לגמרי?")) return;
    setBusy(id);
    try { await manageAliasRpc(id, action); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    setBusy(edit.id);
    try { await adminEditAlias(edit.id, edit.alias, edit.hebrew); setEdit(null); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const doAdd = async () => {
    if (!add.hebrew.trim() || !add.alias.trim()) return;
    setAdding(true);
    try {
      const id = await adminAddAlias(add.hebrew.trim(), add.alias.trim());
      if (!id) alert("לא נוסף — ודא שהעברית תקינה (אותיות עבריות) ושהכינוי לא קיים.");
      setAdd({ hebrew: "", alias: "" }); await load();
    } catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setAdding(false); }
  };
  const all = rows || [];
  const shown = filter === "all" ? all : all.filter(a => filter === "verified" ? a.verified : !a.verified);
  const counts = { all: all.length, verified: all.filter(a => a.verified).length, pending: all.filter(a => !a.verified).length };
  const inp = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 15, padding: "7px 10px", outline: "none" };
  return (
    <div style={{ marginTop: 18 }}>
      <H sub="כל הכינויים הלועזיים (תעתוק/תרגום → עברית) במקום אחד — הוסף חדש, ערוך, אשר, הסתר או מחק. בדיוק כמו ניהול העברית.">🌐 ניהול כינויים{rows ? ` (${all.length})` : ""}</H>

      {/* ➕ הוספת כינוי חדש */}
      <div style={{ ...card, padding: "12px 14px", marginBottom: 10, borderColor: C.borderGold }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>➕ הוסף כינוי — עברית ↔ לועזית</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={add.hebrew} onChange={e => setAdd({ ...add, hebrew: e.target.value })} placeholder="מילה בעברית (למשל: דרים)" style={{ ...inp, flex: "1 1 150px" }} dir="rtl" />
          <span style={{ color: "#5ec8ff" }}>↔</span>
          <input value={add.alias} onChange={e => setAdd({ ...add, alias: e.target.value })} placeholder="foreign word (e.g. dream)" style={{ ...inp, flex: "1 1 150px", direction: "ltr" }} />
          <button disabled={adding || !add.hebrew.trim() || !add.alias.trim()} onClick={doAdd} style={btn("#2f6df6")}>{adding ? "מוסיף…" : "➕ הוסף"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[["all", `הכל · ${counts.all}`], ["verified", `✅ מאושרים · ${counts.verified}`], ["pending", `⏳ ממתינים · ${counts.pending}`]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...btn(filter === k ? "rgba(212,175,55,.2)" : "transparent", filter === k ? C.goldBright : C.muted), border: `1px solid ${filter === k ? C.borderGold : C.border}`, fontSize: 12.5, padding: "5px 12px" }}>{l}</button>
        ))}
      </div>

      {rows === null ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !shown.length ? <div style={{ ...card, color: C.muted }}>אין כינויים בקטגוריה הזו.</div>
        : <div style={{ display: "grid", gap: 8 }}>
          {shown.map(a => {
            const isEd = edit && edit.id === a.id;
            return (
              <div key={a.id} style={{ ...card, padding: "11px 13px", opacity: a.verified ? 1 : 0.72 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                  <span style={{ fontSize: 15 }}>{LANG_FLAG[a.lang] || "🌐"}</span>
                  {isEd ? (
                    <>
                      <input value={edit.alias} onChange={e => setEdit({ ...edit, alias: e.target.value })} placeholder="לועזית" style={{ ...inp, width: 130, direction: "ltr" }} />
                      <span style={{ color: "#5ec8ff" }}>→</span>
                      <input value={edit.hebrew} onChange={e => setEdit({ ...edit, hebrew: e.target.value })} placeholder="עברית" style={{ ...inp, width: 120 }} dir="rtl" />
                    </>
                  ) : (
                    <>
                      <b style={{ color: "#9bd6ff", fontFamily: F.body, fontSize: 15, direction: "ltr" }}>{a.alias}</b>
                      <span style={{ color: "#5ec8ff" }}>→</span>
                      <b style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16 }}>{a.hebrew || "—"}</b>
                      {a.ragil != null && <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13 }}>= {a.ragil}</span>}
                      <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>· {METHOD_HE[a.method] || a.method || "תעתוק"} · {srcLabel(a.source)}</span>
                    </>
                  )}
                  <span style={{ marginInlineStart: "auto", color: a.verified ? "#7bbf7b" : "#e0b34a", fontFamily: F.heading, fontSize: 11, fontWeight: 800 }}>{a.verified ? "✅ מאושר" : "⏳ ממתין"}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {isEd ? (
                    <>
                      <button disabled={busy === a.id} onClick={saveEdit} style={btn("#2f8f4e")}>💾 שמור</button>
                      <button onClick={() => setEdit(null)} style={btn("transparent", C.muted)}>ביטול</button>
                    </>
                  ) : (
                    <>
                      {!a.verified && <button disabled={busy === a.id} onClick={() => act(a.id, "verify")} style={btn("#2f8f4e")}>✅ אשר</button>}
                      {a.verified && <button disabled={busy === a.id} onClick={() => act(a.id, "hide")} style={btn("transparent", "#e0b34a")}>🙈 הסתר</button>}
                      <button disabled={busy === a.id} onClick={() => setEdit({ id: a.id, alias: a.alias, hebrew: a.hebrew || "" })} style={btn("transparent", "#9bd6ff")}>✏️ ערוך</button>
                      <button disabled={busy === a.id} onClick={() => act(a.id, "delete")} style={btn("transparent", "#d98a92")}>🗑 מחק</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

export default function LanguageEngineTab() {
  const [view, setView] = useState("approved");
  const [stats, setStats] = useState(null);
  const [ls, setLs] = useState(null);   // 📊 מד-סטטיסטיקה (מאושר/ממתין)
  const [queue, setQueue] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [translit, setTranslit] = useState([]);
  const [qFilter, setQFilter] = useState("pending");   // pending|all|approved|rejected|blocked
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState({});

  const load = useCallback(async () => {
    if (!supabase) return;
    const wk = new Date(Date.now() - 7 * 864e5).toISOString();
    let q = supabase.from("word_review_queue").select("*").order("created_at", { ascending: false }).limit(150);
    if (qFilter !== "all") q = q.eq("status", qFilter);
    const [fb, learned, sug, wrq, al, enVer, enPend] = await Promise.all([
      supabase.from("feedback").select("verdict").limit(10000),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).eq("verified", true).gte("created_at", wk),
      supabase.from("translit_suggestions").select("*").eq("status", "open").order("hits", { ascending: false }).limit(25),
      q,
      supabase.from("word_aliases").select("id, alias, lang, method, layer, confidence, verified, source, created_at, gematria_words(phrase, ragil)").order("created_at", { ascending: false }).limit(120),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).neq("lang", "he").eq("verified", true),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).neq("lang", "he").eq("verified", false),
    ]);
    const rows = fb.data || [];
    const found = rows.filter(r => r.verdict === "found").length, notFound = rows.filter(r => r.verdict === "not_found").length;
    setStats({ asked: rows.length, found, notFound, success: found + notFound ? Math.round(found / (found + notFound) * 100) : 0, learnedWeek: learned.count || 0, aliasTotal: (al.data || []).length, enVerified: enVer.count || 0, enPending: enPend.count || 0 });
    setTranslit(sug.data || []); setQueue(wrq.data || []); setAliases(al.data || []);
  }, [qFilter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getLangStats().then(setLs); }, []);

  const act = async (fn, args, key) => { setBusy(key); try { await supabase.rpc(fn, args); await load(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(null); } };
  const resolveWord = (id, action) => act("resolve_word_review", { p_id: id, p_action: action, p_edit: editing[id] || null }, id);
  const manageAlias = (id, action) => act("admin_manage_alias", { p_id: id, p_action: action }, id);
  const resolveTranslit = (norm, approve) => act("admin_resolve_translit", { p_input_norm: norm, p_approve: approve }, norm);

  if (!stats) return <div style={{ color: C.muted, padding: 20 }}>טוען…</div>;
  const stTone = s => s === "approved" ? "#7bbf7b" : s === "rejected" ? "#d98a92" : s === "blocked" ? "#9a8" : "#e0b34a";
  const stHe = s => ({ pending: "⏳ ממתין", approved: "✅ אושר", rejected: "✖ נדחה", blocked: "🚫 חסום", merged: "🔀 מוזג" }[s] || s);

  return (
    <div>
      <H sub="כל המילים בכל השפות — מחולק לטאבים. מאושרות · לאישור · אנגלית · רוסית · מעבדת-מחקר.">🌍 מנוע השפה — מרכז בקרה</H>

      {/* ══ 📊 מד-סטטיסטיקה ברור — מה מאושר, מה ממתין (עברית + אנגלית) ══ */}
      {ls && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
          <div style={{ ...card, padding: "12px 14px" }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>🇮🇱 עברית</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div><div style={{ color: "#7bbf7b", fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{(ls.he_approved || 0).toLocaleString("he")}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>✅ מאושרות</div></div>
              <div><div style={{ color: "#e0b34a", fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{(ls.he_pending || 0).toLocaleString("he")}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>⏳ לאישור</div></div>
              <div><div style={{ color: "#5ec8ff", fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{(ls.he_worlds || 0).toLocaleString("he")}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>🌍 מתויגות-עולם</div></div>
            </div>
          </div>
          <div style={{ ...card, padding: "12px 14px" }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>🇺🇸 אנגלית</div>
            <div style={{ display: "flex", gap: 13, flexWrap: "wrap" }}>
              <div><div style={{ color: "#7bbf7b", fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{(ls.bridges_approved || 0) + (ls.en_approved || 0)}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>✅ מאושרים</div></div>
              <div><div style={{ color: (ls.bridges_pending ? "#e0b34a" : C.muted), fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{ls.bridges_pending || 0}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>🌉 גשרים לאישור</div></div>
              <div><div style={{ color: "#e0b34a", fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{ls.translit_pending || 0}</div><div style={{ color: C.muted, fontFamily: F.body, fontSize: 11 }}>🔤 תעתוקים</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ══ טאבים ══ */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {VIEWS.map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ ...btn(view === k ? "rgba(212,175,55,.25)" : "transparent", view === k ? C.goldBright : C.muted), border: `1px solid ${view === k ? C.borderGold : C.border}`, fontSize: 13, padding: "7px 15px", minHeight: 36 }}>{l}</button>
        ))}
      </div>

      {/* ══ 🟢 עברית · מאושרות — מתייג-עולמות + טבלה עשירה עם עולם/קטגוריה/מקור ══ */}
      {view === "approved" && (<>
        <WorldTagger />
        <WordsConsole srcLabel={srcLabel} heOnly lockScope initialScope="verified" showWorld />
      </>)}

      {/* ══ 🟠 עברית · לאישור — ממתינות + נוסף-לאחרונה + תור-בקרה ══ */}
      {view === "pending" && (<>
        <WordsConsole srcLabel={srcLabel} heOnly lockScope initialScope="pending" />
        <RecentWordsFeed srcLabel={srcLabel} />
        <H sub="לכל מילה: הטקסט המקורי · מה חולץ · הסיבה · סוג ✅/⚠️/❌ · דגלי-בטיחות · מילים-דומות · מקור · hits · איכות · ביטחון.">🛡️ מילים בתור-הבקרה</H>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 11 }}>
        {[["pending", "⏳ ממתינות"], ["all", "הכל"], ["approved", "✅ אושרו"], ["rejected", "✖ נדחו"], ["blocked", "🚫 חסומות"]].map(([k, l]) => (
          <button key={k} onClick={() => setQFilter(k)} style={{ ...btn(qFilter === k ? "rgba(212,175,55,.2)" : "transparent", qFilter === k ? C.goldBright : C.muted), border: `1px solid ${qFilter === k ? C.borderGold : C.border}` }}>{l}</button>
        ))}
      </div>
      {!queue.length ? <div style={{ ...card, color: C.muted }}>אין מילים בקטגוריה זו.</div>
        : <div style={{ display: "grid", gap: 11 }}>
          {queue.map(w => {
            const flags = activeFlags(w.flags || {}); const sim = w.similar_words || []; const longRow = w.word_count >= 5;
            return (
              <div key={w.id} style={{ ...card, borderColor: longRow ? "#a3474f" : C.border }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                  <b style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 19 }}>{w.extracted}</b>
                  <span style={{ fontFamily: F.heading, fontSize: 12, color: w.kind === "word" ? "#7bbf7b" : w.kind === "phrase" ? "#e0b34a" : "#d98a92" }}>{kindBadge(w.kind)}</span>
                  <span style={{ color: longRow ? "#e0736f" : C.muted, fontFamily: F.mono, fontSize: 12 }}>{w.word_count} מ׳</span>
                  <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>איכות {w.quality_score ?? "—"}{w.confidence != null ? ` · ביטחון ${w.confidence}%` : ""}</span>
                  <span style={{ color: stTone(w.status), fontFamily: F.heading, fontSize: 11.5 }}>{stHe(w.status)}</span>
                  <span style={{ marginInlineStart: "auto", color: C.muted, fontFamily: F.heading, fontSize: 11 }}>{srcLabel(w.source)} · {w.hits}× · {fmt(w.created_at)}</span>
                </div>
                {w.original_text && w.original_text !== w.extracted &&
                  <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 5 }}>📥 מקורי: «{w.original_text}»{w.reason ? ` · ${w.reason}` : ""}</div>}
                {flags.length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>{flags.map((f, i) => <span key={i} style={{ background: "rgba(160,31,46,.15)", color: "#e0a0a6", borderRadius: 999, fontSize: 11, padding: "2px 9px" }}>{f}</span>)}</div>}
                {sim.length > 0 && <div style={{ marginTop: 6, color: "#e0b34a", fontFamily: F.body, fontSize: 12 }}>⚠ דומות: {sim.slice(0, 6).map((s, i) => <span key={i}>{s.phrase} <span style={{ color: C.muted }}>({s.why})</span>{i < Math.min(6, sim.length) - 1 ? " · " : ""}</span>)}</div>}
                {w.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                    <input value={editing[w.id] ?? ""} onChange={e => setEditing(s => ({ ...s, [w.id]: e.target.value }))} placeholder={w.extracted} dir="rtl" style={{ fontSize: 15, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.goldLight, minWidth: 110 }} />
                    <button disabled={busy === w.id} onClick={() => resolveWord(w.id, editing[w.id] ? "edit" : "approve")} style={btn("#2e7d46")}>✔ אשר</button>
                    <button disabled={busy === w.id} onClick={() => resolveWord(w.id, "reject")} style={btn("#8a2f39")}>❌ דחה</button>
                    <button disabled={busy === w.id} onClick={() => resolveWord(w.id, "hide")} style={btn("transparent", "#c9b98a")}>🙈 הסתר</button>
                    <button disabled={busy === w.id} onClick={() => { if (confirm("למחוק לצמיתות?")) resolveWord(w.id, "delete"); }} style={btn("transparent", "#d98a92")}>🗑 מחק</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </>)}

      {/* ══ 🇺🇸 אנגלית — גשרים לאישור · כינויים · feed · תור-תעתוק ══ */}
      {view === "english" && (<>
      <BridgesReview />
      <BridgesManager />
      <AliasesManager />

      {/* ══ תור תעתוק ══ */}
      <H sub="חיפושים באנגלית שחזרו הרבה ועדיין לא נפתרו — אישור יוצר כינוי מאומת.">🔤 תור תעתוק · Top לא-נפתרו ({translit.length})</H>
      {!translit.length ? <div style={{ ...card, color: C.muted }}>אין ממתינים.</div>
        : <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["קלט", "הצעה", "hits", "👍", "👎", ""].map((h, i) => <th key={i} style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, textAlign: "right", padding: "7px 10px", borderBottom: `1px solid ${C.borderGold}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {translit.map(s => (
                <tr key={s.id}>
                  <td style={{ color: C.goldLight, fontFamily: F.body, padding: "7px 10px" }}>{s.input_sample || s.input_norm}</td>
                  <td style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, padding: "7px 10px" }}>{s.proposed_hebrew || "—"}</td>
                  <td style={{ color: C.muted, fontFamily: F.mono, padding: "7px 10px" }}>{s.hits}</td>
                  <td style={{ color: "#7bbf7b", fontFamily: F.mono, padding: "7px 10px" }}>{s.confirmations}</td>
                  <td style={{ color: "#d98a92", fontFamily: F.mono, padding: "7px 10px" }}>{s.rejections}</td>
                  <td style={{ padding: "7px 10px", display: "flex", gap: 6 }}>
                    <button disabled={busy === s.input_norm || !s.proposed_hebrew} onClick={() => resolveTranslit(s.input_norm, true)} style={btn("#2e7d46")}>✔</button>
                    <button disabled={busy === s.input_norm} onClick={() => resolveTranslit(s.input_norm, false)} style={btn("#8a2f39")}>❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </>)}

      {/* ══ 🇷🇺 רוסית — בקרוב ══ */}
      {view === "russian" && (
        <div style={{ ...card, color: C.muted, textAlign: "center", padding: "44px 20px", lineHeight: 1.8 }}>
          🇷🇺 <b style={{ color: C.goldLight }}>רוסית — בקרוב.</b><br />
          התשתית כבר מוכנה (<code>word_aliases</code> תומך <code>lang=ru</code>, ו-<code>language_links</code> כבר כולל גשר רוסי: משיח ↔ мессия).<br />
          ברגע שנתחיל להזין רוסית — היא תופיע כאן לאישור, בדיוק כמו אנגלית.
        </div>
      )}

      {/* ══ 🧪 מעבדה — כלי-מחקר: מעבדת-התכנסויות · סוגים · אירועי-גילוי ══ */}
      {view === "lab" && (<>
        <ConvergenceLab />
        <div style={{ margin: "18px 0 8px", borderTop: `1px solid ${C.border}`, paddingTop: 12 }}><ConvergenceTypesPanel /></div>
        <div style={{ margin: "18px 0 8px", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}><DiscoveryPanel /></div>
      </>)}
    </div>
  );
}
