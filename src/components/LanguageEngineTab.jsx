import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { Link } from "react-router-dom";
import { supabase, adminWordsConsole, adminReviewWord, adminValueConvergence, scanDiscoveryEvents, discoveryPending, discoveryMark, sendNewsletter } from "../lib/supabase.js";
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
      {!pending ? <div style={{ ...card, color: C.muted }}>טוען…</div>
        : !pending.length ? <div style={{ ...card, color: C.muted }}>אין אירועים ממתינים. לחצו «סרוק עכשיו» כדי לזהות התכנסויות חדשות.</div>
        : <div style={{ display: "grid", gap: 8 }}>
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
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 9 }}>✉️ מייל לאירוע {sel.value}</div>
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

// 🖥️ קונסולת-מילים — עדשה אחת על כל המאגר: ממתין/מאומת/נדחה/הכל · חיפוש · דפדוף אחורה ללא סוף ·
// לכל מילה: חיבור-לישות (משפחת-ערך) + המלצת-AI + אישור/דחייה/מחיקה. עוקף RLS דרך RPC (רואה מוסתרות).
const REC = { approve: { e: "✅", t: "מומלץ לאשר", c: "#7bbf7b" }, review: { e: "👁", t: "כדאי מבט", c: "#e0b34a" }, reject: { e: "🚫", t: "מומלץ לדחות", c: "#d98a92" } };
const SCOPES = [["pending", "⏳ ממתינות"], ["verified", "✅ מאומתות"], ["rejected", "✖ נדחו"], ["all", "🌐 הכל"]];
function WordsConsole({ srcLabel }) {
  const [mode, setMode] = useState("he");           // he = עברית (gematria_words) · intl = שפות (word_aliases)
  const [intl, setIntl] = useState(null);
  const [intlBusy, setIntlBusy] = useState(null);
  const [scope, setScope] = useState("pending");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [convVal, setConvVal] = useState(null);   // 🎯 ערך-ההתכנסות הפתוח כרגע
  const [conv, setConv] = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const PAGE = 40;
  useEffect(() => { const t = setTimeout(() => { setQ(qLive); setOffset(0); }, 400); return () => clearTimeout(t); }, [qLive]);
  const load = useCallback(async () => {
    setLoading(true);
    const d = await adminWordsConsole({ scope, q: q || null, limit: PAGE, offset });
    setData(d); setLoading(false);
  }, [scope, q, offset]);
  useEffect(() => { load(); }, [load]);
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
      {/* בורר-שפה: עברית (gematria_words) / שפות אחרות (word_aliases) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["he", "🇮🇱 עברית"], ["intl", "🌍 שפות אחרות"]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ ...btn(mode === k ? "rgba(212,175,55,.25)" : "transparent", mode === k ? C.goldBright : C.muted), border: `1px solid ${mode === k ? C.borderGold : C.border}`, fontSize: 12.5, padding: "5px 14px" }}>{l}</button>
        ))}
      </div>
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {SCOPES.map(([k, l]) => (
          <button key={k} onClick={() => { setScope(k); setOffset(0); }} style={{ ...btn(scope === k ? "rgba(212,175,55,.2)" : "transparent", scope === k ? C.goldBright : C.muted), border: `1px solid ${scope === k ? C.borderGold : C.border}` }}>{l}</button>
        ))}
      </div>
      <input value={qLive} onChange={e => setQLive(e.target.value)} placeholder="🔍 חיפוש מילה…" dir="rtl"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.goldLight, fontFamily: F.body, fontSize: 16, padding: "10px 13px", marginBottom: 12, outline: "none" }} />
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
                  <span title={w.rec?.why} style={{ flex: "1 1 auto", minWidth: 140, color: rec.c, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{rec.e} {rec.t} — <span style={{ color: C.muted, fontWeight: 500 }}>{w.rec?.why}</span></span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {!w.is_verified && <button disabled={busy === w.id} onClick={() => doAction(w.id, "approve")} style={btn("#2f8f4e")}>✅ פרסם</button>}
                    {w.is_verified && <button disabled={busy === w.id} onClick={() => doAction(w.id, "reject")} style={btn("transparent", C.muted)}>✖ הסתר</button>}
                    {!w.is_verified && w.state !== "rejected_by_admin" && <button disabled={busy === w.id} onClick={() => doAction(w.id, "reject")} style={btn("transparent", C.muted)}>✖ דחה</button>}
                    <button disabled={busy === w.id} onClick={() => doAction(w.id, "delete")} style={btn("transparent", "#d98a92")}>🗑</button>
                  </div>
                </div>
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

export default function LanguageEngineTab() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [translit, setTranslit] = useState([]);
  const [recent, setRecent] = useState([]);            // 🆕 נוספו לאחרונה ל-gematria_words
  const [qFilter, setQFilter] = useState("pending");   // pending|all|approved|rejected|blocked
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState({});

  const load = useCallback(async () => {
    if (!supabase) return;
    const wk = new Date(Date.now() - 7 * 864e5).toISOString();
    let q = supabase.from("word_review_queue").select("*").order("created_at", { ascending: false }).limit(150);
    if (qFilter !== "all") q = q.eq("status", qFilter);
    const [fb, learned, sug, wrq, al, rec] = await Promise.all([
      supabase.from("feedback").select("verdict").limit(10000),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).eq("verified", true).gte("created_at", wk),
      supabase.from("translit_suggestions").select("*").eq("status", "open").order("hits", { ascending: false }).limit(25),
      q,
      supabase.from("word_aliases").select("id, alias, lang, method, layer, confidence, verified, source, created_at, gematria_words(phrase, ragil)").order("created_at", { ascending: false }).limit(120),
      supabase.from("gematria_words").select("id, phrase, ragil, source, vip_source, created_at").order("created_at", { ascending: false }).limit(40),
    ]);
    setRecent(rec.data || []);
    const rows = fb.data || [];
    const found = rows.filter(r => r.verdict === "found").length, notFound = rows.filter(r => r.verdict === "not_found").length;
    setStats({ asked: rows.length, found, notFound, success: found + notFound ? Math.round(found / (found + notFound) * 100) : 0, learnedWeek: learned.count || 0, aliasTotal: (al.data || []).length });
    setTranslit(sug.data || []); setQueue(wrq.data || []); setAliases(al.data || []);
  }, [qFilter]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, args, key) => { setBusy(key); try { await supabase.rpc(fn, args); await load(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(null); } };
  const resolveWord = (id, action) => act("resolve_word_review", { p_id: id, p_action: action, p_edit: editing[id] || null }, id);
  const manageAlias = (id, action) => act("admin_manage_alias", { p_id: id, p_action: action }, id);
  const resolveTranslit = (norm, approve) => act("admin_resolve_translit", { p_input_norm: norm, p_approve: approve }, norm);

  if (!stats) return <div style={{ color: C.muted, padding: 20 }}>טוען…</div>;
  const stTone = s => s === "approved" ? "#7bbf7b" : s === "rejected" ? "#d98a92" : s === "blocked" ? "#9a8" : "#e0b34a";
  const stHe = s => ({ pending: "⏳ ממתין", approved: "✅ אושר", rejected: "✖ נדחה", blocked: "🚫 חסום", merged: "🔀 מוזג" }[s] || s);

  return (
    <div>
      <H sub="כל המילים החדשות שנכנסות למאגר — מכל השפות ומכל מקור. שמרני: מה שיש בו ספק ממתין לאישורך.">🌍 מנוע השפה — מרכז בקרה</H>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <Stat label="נשאל «מצאנו?»" value={stats.asked} />
        <Stat label="👍 נמצא" value={stats.found} tone="#7bbf7b" />
        <Stat label="👎 לא נמצא" value={stats.notFound} tone="#d98a92" />
        <Stat label="הצלחה" value={stats.success + "%"} />
        <Stat label="נלמדו השבוע" value={stats.learnedWeek} tone={C.goldBright} />
        <Stat label="בתור-בקרה" value={queue.filter(w => w.status === "pending").length} tone="#e0b34a" />
      </div>

      {/* ══ 🔔 אירועי גילוי — מיילים חכמים (רק כשמתגלה התכנסות אמיתית) ══ */}
      <div style={{ margin: "22px 0 8px", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        <DiscoveryPanel />
      </div>

      {/* ══ 🖥️ קונסולת המילים — עדשה מלאה על כל המאגר (עוקף RLS, דפדוף, המלצות, חיבור-לישות) ══ */}
      <WordsConsole srcLabel={srcLabel} />

      {/* ══ 🆕 נוספו לאחרונה למאגר (gematria_words) — מה שבאמת נכנס, כולל מה שרואים בבית ══ */}
      <H sub="המילים האחרונות שנכנסו למאגר הראשי (gematria_words) — עם מקור ותאריך. זה מה שמופיע בבית ובחיפוש.">🆕 נוספו לאחרונה למאגר ({recent.length})</H>
      {!recent.length ? <div style={{ ...card, color: C.muted }}>אין עדיין.</div>
        : <div style={{ ...card, overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>{["מילה", "ערך", "מקור", "מאת", "מתי"].map((h, i) => <th key={i} style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 11.5, textAlign: "right", padding: "8px 10px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {recent.map(w => (
                <tr key={w.id}>
                  <td style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, padding: "6px 10px" }}>{w.phrase}</td>
                  <td style={{ color: C.muted, fontFamily: F.mono, padding: "6px 10px" }}>{w.ragil}</td>
                  <td style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, padding: "6px 10px", whiteSpace: "nowrap" }}>{srcLabel(w.source)}</td>
                  <td style={{ color: C.muted, fontFamily: F.body, fontSize: 12, padding: "6px 10px" }}>{w.vip_source || "—"}</td>
                  <td style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, padding: "6px 10px", whiteSpace: "nowrap" }}>{fmt(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      {/* ══ מילים עבריות בתור-הבקרה ══ */}
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

      {/* ══ כל השפות — feed הכינויים ══ */}
      <H sub="כל ייצוג בכל שפה שנכנס — עם סוג-הקשר, שכבת-האמון, המקור, והישות העברית שהוא מצביע אליה.">🌐 מילים בכל השפות ({aliases.length})</H>
      {!aliases.length ? <div style={{ ...card, color: C.muted }}>אין עדיין.</div>
        : <div style={{ ...card, overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>{["", "כינוי", "סוג-קשר", "שכבה", "→ עברית", "ערך", "מקור", "בטחון", "אימות", ""].map((h, i) => <th key={i} style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 11.5, textAlign: "right", padding: "8px 9px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {aliases.map(a => (
                <tr key={a.id} style={{ opacity: a.verified ? 1 : 0.6 }}>
                  <td style={{ padding: "6px 9px" }}>{LANG_FLAG[a.lang] || "🌐"}</td>
                  <td style={{ color: C.goldLight, fontFamily: F.body, padding: "6px 9px" }}>{a.alias}</td>
                  <td style={{ color: C.muted, padding: "6px 9px", whiteSpace: "nowrap" }}>{METHOD_HE[a.method] || a.method || "—"}</td>
                  <td style={{ padding: "6px 9px" }}><span style={{ color: LAYER_TONE[a.layer] || C.muted, fontSize: 11.5, fontWeight: 700 }}>{a.layer || "—"}</span></td>
                  <td style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, padding: "6px 9px" }}>{a.gematria_words?.phrase || "—"}</td>
                  <td style={{ color: C.muted, fontFamily: F.mono, padding: "6px 9px" }}>{a.gematria_words?.ragil ?? ""}</td>
                  <td style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, padding: "6px 9px", whiteSpace: "nowrap" }}>{srcLabel(a.source)}</td>
                  <td style={{ color: C.muted, fontFamily: F.mono, padding: "6px 9px" }}>{a.confidence != null ? Math.round(a.confidence * 100) + "%" : ""}</td>
                  <td style={{ padding: "6px 9px" }}>{a.verified ? <span style={{ color: "#7bbf7b" }}>✓</span> : <span style={{ color: "#e0b34a" }}>⏳</span>}</td>
                  <td style={{ padding: "6px 9px", whiteSpace: "nowrap" }}>
                    {!a.verified && <button disabled={busy === a.id} onClick={() => manageAlias(a.id, "verify")} style={{ ...btn("#2e7d46"), padding: "3px 8px" }}>✔</button>}
                    {a.verified && <button disabled={busy === a.id} onClick={() => manageAlias(a.id, "hide")} style={{ ...btn("transparent", "#c9b98a"), padding: "3px 8px" }}>🙈</button>}
                    <button disabled={busy === a.id} onClick={() => { if (confirm("למחוק כינוי?")) manageAlias(a.id, "delete"); }} style={{ ...btn("transparent", "#d98a92"), padding: "3px 8px", marginInlineStart: 4 }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

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
    </div>
  );
}
