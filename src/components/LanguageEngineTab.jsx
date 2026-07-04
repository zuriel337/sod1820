import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
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

export default function LanguageEngineTab() {
  const [stats, setStats] = useState(null);
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
    const [fb, learned, sug, wrq, al] = await Promise.all([
      supabase.from("feedback").select("verdict").limit(10000),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).eq("verified", true).gte("created_at", wk),
      supabase.from("translit_suggestions").select("*").eq("status", "open").order("hits", { ascending: false }).limit(25),
      q,
      supabase.from("word_aliases").select("id, alias, lang, method, layer, confidence, verified, source, created_at, gematria_words(phrase, ragil)").order("created_at", { ascending: false }).limit(120),
    ]);
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
        <Stat label="ממתינות" value={queue.filter(w => w.status === "pending").length} tone="#e0b34a" />
      </div>

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
