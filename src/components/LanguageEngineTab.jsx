import React, { useState, useEffect, useCallback } from "react";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { kindBadge, activeFlags } from "../lib/wordQuality.js";

// 🌍 מנוע השפה — מרכז-בקרה לאדמין: סטטיסטיקות למידה · מילים ממתינות (Hebrew QC) · תור תעתוק.
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const H = ({ children }) => <h3 style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 16, fontWeight: 800, margin: "22px 2px 12px" }}>{children}</h3>;

function Stat({ label, value, tone }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "14px 12px", minWidth: 120 }}>
      <div style={{ color: tone || C.goldBright, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11.5, marginTop: 3 }}>{label}</div>
    </div>
  );
}

const btn = (bg, fg = "#fff") => ({ cursor: "pointer", background: bg, border: "none", borderRadius: 999, color: fg, fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "5px 12px", minHeight: 30 });

export default function LanguageEngineTab() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [translit, setTranslit] = useState([]);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState({});   // id → text

  const load = useCallback(async () => {
    if (!supabase) return;
    const wk = new Date(Date.now() - 7 * 864e5).toISOString();
    const [fb, learned, sug, wrq] = await Promise.all([
      supabase.from("feedback").select("verdict").limit(10000),
      supabase.from("word_aliases").select("id", { count: "exact", head: true }).eq("verified", true).gte("created_at", wk),
      supabase.from("translit_suggestions").select("*").eq("status", "open").order("hits", { ascending: false }).limit(20),
      supabase.from("word_review_queue").select("*").eq("status", "pending").order("quality_score", { ascending: false }).order("hits", { ascending: false }).limit(60),
    ]);
    const rows = fb.data || [];
    const found = rows.filter(r => r.verdict === "found").length;
    const notFound = rows.filter(r => r.verdict === "not_found").length;
    setStats({
      asked: rows.length, found, notFound,
      success: found + notFound ? Math.round((found / (found + notFound)) * 100) : 0,
      learnedWeek: learned.count || 0,
    });
    setTranslit(sug.data || []);
    setPending(wrq.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolveWord = async (id, action) => {
    setBusy(id);
    try { await supabase.rpc("resolve_word_review", { p_id: id, p_action: action, p_edit: editing[id] || null }); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };
  const resolveTranslit = async (norm, approve) => {
    setBusy(norm);
    try { await supabase.rpc("admin_resolve_translit", { p_input_norm: norm, p_approve: approve }); await load(); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  };

  if (!stats) return <div style={{ color: C.muted, padding: 20 }}>טוען…</div>;

  return (
    <div>
      {/* 📊 סטטיסטיקות למידה */}
      <H>📊 מנוע הלמידה — מבט-על</H>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Stat label="נשאלה השאלה" value={stats.asked} />
        <Stat label="👍 נמצא" value={stats.found} tone="#7bbf7b" />
        <Stat label="👎 לא נמצא" value={stats.notFound} tone="#d98a92" />
        <Stat label="אחוז הצלחה" value={stats.success + "%"} />
        <Stat label="מילים נלמדו השבוע" value={stats.learnedWeek} tone={C.goldBright} />
        <Stat label="ממתינות לבקרה" value={pending.length} tone="#e0b34a" />
      </div>

      {/* 🛡️ מילים ממתינות — Hebrew QC */}
      <H>🛡️ מילים ממתינות לבקרה ({pending.length})</H>
      {!pending.length ? <div style={{ ...card, color: C.muted }}>אין מילים בתור — המנוע שמרני, רק מה שצריך בדיקה מגיע לכאן.</div>
        : <div style={{ display: "grid", gap: 12 }}>
          {pending.map(w => {
            const flags = activeFlags(w.flags || {});
            const sim = w.similar_words || [];
            const longRow = w.word_count >= 5;
            return (
              <div key={w.id} style={{ ...card, borderColor: longRow ? "#a3474f" : C.border }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 19 }}>{w.extracted}</b>
                  <span style={{ fontFamily: F.heading, fontSize: 12, color: w.kind === "word" ? "#7bbf7b" : w.kind === "phrase" ? "#e0b34a" : "#d98a92" }}>{kindBadge(w.kind)}</span>
                  <span style={{ color: longRow ? "#e0736f" : C.muted, fontFamily: F.mono, fontSize: 12 }}>{w.word_count} מילים</span>
                  <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>איכות {w.quality_score ?? "—"}</span>
                  {w.confidence != null && <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>ביטחון {w.confidence}%</span>}
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11.5 }}>· {w.source || "?"} · {w.hits} הופעות</span>
                </div>
                {w.original_text && w.original_text !== w.extracted &&
                  <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 5 }}>מקורי: «{w.original_text}»{w.reason ? ` · סיבה: ${w.reason}` : ""}</div>}
                {flags.length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>{flags.map((f, i) => <span key={i} style={{ background: "rgba(160,31,46,.15)", color: "#e0a0a6", borderRadius: 999, fontSize: 11, padding: "2px 9px" }}>{f}</span>)}</div>}
                {sim.length > 0 && <div style={{ marginTop: 6, color: "#e0b34a", fontFamily: F.body, fontSize: 12 }}>⚠ דומות קיימות: {sim.slice(0, 6).map((s, i) => <span key={i}>{s.phrase} <span style={{ color: C.muted }}>({s.why})</span>{i < Math.min(6, sim.length) - 1 ? " · " : ""}</span>)}</div>}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                  <input value={editing[w.id] ?? ""} onChange={e => setEditing(s => ({ ...s, [w.id]: e.target.value }))} placeholder={w.extracted} dir="rtl"
                    style={{ fontSize: 15, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.goldLight, minWidth: 120 }} />
                  <button disabled={busy === w.id} onClick={() => resolveWord(w.id, editing[w.id] ? "edit" : "approve")} style={btn("#2e7d46")}>✔ אשר</button>
                  <button disabled={busy === w.id} onClick={() => resolveWord(w.id, "reject")} style={btn("#8a2f39")}>❌ דחה</button>
                  <button disabled={busy === w.id} onClick={() => resolveWord(w.id, "block")} style={btn("transparent", "#d98a92")}>🚫 חסום</button>
                </div>
              </div>
            );
          })}
        </div>}

      {/* 🌍 תור תעתוק — Top לא-נמצאו */}
      <H>🌍 תור תעתוק · Top חיפושים שלא נפתרו ({translit.length})</H>
      {!translit.length ? <div style={{ ...card, color: C.muted }}>אין חיפושים ממתינים.</div>
        : <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["קלט", "הצעה", "hits", "👍", "👎", "פעולה"].map(h => <th key={h} style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, textAlign: "right", padding: "7px 10px", borderBottom: `1px solid ${C.borderGold}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {translit.map(s => (
                <tr key={s.id}>
                  <td style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "7px 10px" }}>{s.input_sample || s.input_norm}</td>
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
