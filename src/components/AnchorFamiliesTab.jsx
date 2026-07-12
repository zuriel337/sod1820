// 🧩 Anchor Dashboard — כלי-בקרה על שכבת הגילוי (משפחות-עוגנים). נתונים+מיפוי בלבד, בלי AI/מסקנות.
// המנוע מגלה → צוריאל בודק → מאשר. קידום-סטטוס סדרתי: discovered→reviewed→approved_anchor→featured.
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { discoverAnchorFamilies, getAnchorFamilies, mapAnchorFamily, setAnchorFamilyStatus } from "../lib/supabase.js";

const NEXT = { discovered: "reviewed", reviewed: "approved_anchor", approved_anchor: "featured", featured: null };
const STATUS_HE = { discovered: "התגלה", reviewed: "נבדק", approved_anchor: "אושר כעוגן", featured: "מובלט", rejected: "נדחה" };
const STATUS_COLOR = { discovered: "#8a8f98", reviewed: "#3ea6ff", approved_anchor: "#4caf7d", featured: C.goldBright, rejected: "#e0645a" };

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" };
const th = { color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, textAlign: "right", padding: "8px 10px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" };
const td = { color: C.goldLight, fontFamily: F.body, fontSize: 13.5, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800, fontFamily: F.heading });

export default function AnchorFamiliesTab() {
  const [rows, setRows] = useState([]);
  const [stored, setStored] = useState({});     // root → {status, review_notes}
  const [loading, setLoading] = useState(true);
  const [minWords, setMinWords] = useState(10);
  const [sel, setSel] = useState(null);          // root שנבחר
  const [detail, setDetail] = useState(null);    // map_anchor_family
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [disc, fams] = await Promise.all([discoverAnchorFamilies(minWords, 60), getAnchorFamilies()]);
    setRows(disc);
    setStored(Object.fromEntries((fams || []).map(f => [f.root, f])));
    setLoading(false);
  }, [minWords]);
  useEffect(() => { load(); }, [load]);

  const openFamily = async (root) => {
    setSel(root); setDetail(null); setMsg("");
    setNotes(stored[root]?.review_notes || "");
    setDetail(await mapAnchorFamily(root));
  };

  const curStatus = (root) => stored[root]?.status || rows.find(r => r.root === root)?.family_status || "discovered";

  const promote = async (root, status) => {
    setBusy(true); setMsg("");
    try {
      const res = await setAnchorFamilyStatus(root, status, notes || null);
      setStored(s => ({ ...s, [root]: res }));
      setMsg(status === "rejected" ? "נדחה." : `→ ${STATUS_HE[status]}`);
      // עדכון סטטוס בשורה
      setRows(rs => rs.map(r => r.root === root ? { ...r, family_status: res.status } : r));
    } catch (e) { setMsg("שגיאה: " + (e.message || e).toString().slice(0, 120)); }
    setBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 17, fontWeight: 800 }}>🧩 משפחות-עוגנים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>המנוע מגלה מבנה — <b>לא</b> מסקנה. אתה בודק ומאשר. קידום סדרתי בלבד.</div>
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>מינ׳ מילים</span>
            <input type="number" value={minWords} min={4} max={40} onChange={e => setMinWords(Number(e.target.value) || 10)}
              style={{ width: 56, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "5px 8px", fontFamily: F.body }} />
            <button onClick={load} disabled={loading} style={{ cursor: "pointer", background: "transparent", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 8, padding: "5px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5 }}>↻ רענן</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: sel ? "1.3fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        {/* רשימת המשפחות */}
        <div style={{ ...box, overflowX: "auto" }}>
          {loading ? <div style={{ color: C.muted, padding: 12 }}>טוען…</div> : (
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
              <thead><tr>
                <th style={th}>משפחה</th><th style={th}>מילים</th><th style={th}>שיטות</th>
                <th style={th}>עדשות</th><th style={th}>מסלולים</th><th style={th}>סטטוס</th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const st = r.family_status || (stored[r.root]?.status);
                  return (
                    <tr key={r.root} onClick={() => openFamily(r.root)}
                      style={{ cursor: "pointer", background: sel === r.root ? "rgba(212,175,55,0.10)" : "transparent" }}>
                      <td style={td}>
                        <b style={{ color: C.goldBright, fontSize: 15 }}>{r.root}</b>
                        <span style={{ color: C.muted }}> ↔ {r.mirror}</span>
                        {r.is_existing_anchor && <span title="כבר עוגן קיים" style={{ marginInlineStart: 6 }}>⭐</span>}
                      </td>
                      <td style={td}>{r.n_words}</td>
                      <td style={td}>{r.n_methods}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span title="אפס נע">🔢</span> <span title="מספר הפוך">🔄</span>{r.is_existing_anchor ? " ⭐" : ""}
                      </td>
                      <td style={td}>{r.n_traces || 0}</td>
                      <td style={td}>{st ? <span style={pill(STATUS_COLOR[st])}>{STATUS_HE[st]}</span> : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* פירוט משפחה — מבנה בלבד */}
        {sel && (
          <div style={{ ...box, position: "sticky", top: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 18, fontWeight: 800}}>משפחה {sel}</div>
              <button onClick={() => setSel(null)} style={{ cursor: "pointer", background: "none", border: "none", color: C.muted, fontSize: 18 }}>✕</button>
            </div>
            {!detail ? <div style={{ color: C.muted }}>ממפה…</div> : (
              <div style={{ display: "grid", gap: 11, fontFamily: F.body, fontSize: 13.5, color: C.goldLight }}>
                <Row label="ערכי המשפחה">{(detail.family_values || []).map((v, i) => (
                  <Link key={i} to={`/number/${v}`} style={{ textDecoration: "none", color: C.goldBright, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "2px 9px", fontWeight: 700 }}>{v}</Link>
                ))}</Row>
                <Row label="מספר הפוך (ראי)"><span style={{ color: C.muted }}>{(detail.mirror_values || []).join(" · ") || "—"}</span></Row>
                <Row label="אפס נע"><span style={{ color: C.muted }}>{(detail.zero_shift_values || []).join(" · ") || "—"}</span></Row>
                <Row label="שיטות">{(detail.methods || []).map((m, i) => <span key={i} style={pill("#8a8f98")}>{m}</span>)}</Row>
                <Row label={`מונחים בציר (${detail.evidence_count || 0})`}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(detail.hebrew_terms || []).map((t, i) => (
                      <Link key={i} to={`/number/${encodeURIComponent(t)}`} style={{ textDecoration: "none", color: C.goldLight, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "2px 9px" }}>{t}</Link>
                    ))}
                  </div>
                </Row>
                <Row label="גשרים חוצי-שפות">
                  <span style={{ color: C.muted }}>{detail.n_bridges > 0 ? (detail.bridges || []).map(b => `${b.alias} (${b.lang})`).join(" · ") : "— (עדיין)"}</span>
                </Row>

                {/* יומן-מחקר + קידום סטטוס */}
                <div style={{ marginTop: 6, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>📝 הערות בדיקה (לך, לא ל-AI)</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="נבדק: שני הצדדים בעלי משמעות · דורש הרחבת שפה…"
                    style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "8px 10px", fontFamily: F.body, fontSize: 13, resize: "vertical" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                    <span style={{ color: C.muted, fontSize: 12 }}>סטטוס:</span>
                    <span style={pill(STATUS_COLOR[curStatus(sel)])}>{STATUS_HE[curStatus(sel)]}</span>
                    {NEXT[curStatus(sel)] && (
                      <button onClick={() => promote(sel, NEXT[curStatus(sel)])} disabled={busy}
                        style={{ cursor: "pointer", background: STATUS_COLOR[NEXT[curStatus(sel)]], border: "none", color: "#0d0d0f", borderRadius: 8, padding: "6px 14px", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>
                        → {STATUS_HE[NEXT[curStatus(sel)]]}
                      </button>
                    )}
                    {curStatus(sel) !== "rejected" && (
                      <button onClick={() => promote(sel, "rejected")} disabled={busy}
                        style={{ cursor: "pointer", background: "transparent", border: `1px solid #e0645a`, color: "#e0645a", borderRadius: 8, padding: "6px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12 }}>דחה</button>
                    )}
                    <button onClick={() => promote(sel, curStatus(sel))} disabled={busy} title="שמור הערות בלי לשנות סטטוס"
                      style={{ cursor: "pointer", background: "transparent", border: `1px solid ${C.border}`, color: C.goldLight, borderRadius: 8, padding: "6px 12px", fontFamily: F.heading, fontWeight: 700, fontSize: 12 }}>💾 שמור הערות</button>
                  </div>
                  {msg && <div style={{ color: msg.startsWith("שגיאה") ? "#e0645a" : "#4caf7d", fontSize: 12.5, marginTop: 7 }}>{msg}</div>}
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 8, fontStyle: "italic" }}>מבנה שנמצא — לא מסקנה. הקידום סדרתי; אין קפיצה ישירה ל״מובלט״.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "108px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ color: C.muted, fontSize: 12.5, paddingTop: 2 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>{children}</div>
    </div>
  );
}
