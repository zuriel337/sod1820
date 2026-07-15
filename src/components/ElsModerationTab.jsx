import React, { useEffect, useState, useCallback } from "react";
import { F } from "../theme.js";
import { getPendingMatrices, moderateMatrix } from "../lib/elsMatrices.js";

// 🔠 אישור-צפנים (אדמין) — צפנים ששלחו משתמשים רשומים (status=pending) ממתינים כאן.
// «✅ אשר» → published (מופיע בספרייה + נשלחת התראה לשומר) · «🙈 דחה» → hidden.
export default function ElsModerationTab() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => { getPendingMatrices(100).then(setItems).catch(() => setItems([])); }, []);
  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (id, status) => {
    setBusy(id);
    try { await moderateMatrix(id, status); setItems(prev => (prev || []).filter(m => m.id !== id)); }
    catch (e) { alert("שגיאה: " + (e?.message || "נסה שוב")); }
    finally { setBusy(null); }
  }, []);

  const list = items || [];
  const card = { background: "rgba(20,14,4,0.7)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" };
  const btn = (bg, col) => ({ cursor: "pointer", background: bg, color: col, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, padding: "7px 15px", minHeight: 36 });

  return (
    <div dir="rtl" style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ color: "#f0d879", fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>🔍 צפנים ממתינים לאישור</span>
        {list.length > 0 && <span style={{ background: "#c0563f", color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 9px" }}>{list.length}</span>}
        <button onClick={load} style={{ marginInlineStart: "auto", ...btn("rgba(212,175,55,0.14)", "#f0d879") }}>↻ רענן</button>
      </div>

      {items === null ? (
        <div style={{ color: "#9a8f6a", fontFamily: F.body, padding: 20, textAlign: "center" }}>טוען…</div>
      ) : !list.length ? (
        <div style={{ color: "#9a8f6a", fontFamily: F.body, padding: "24px 16px", textAlign: "center", background: "rgba(20,14,4,0.5)", border: "1px dashed rgba(212,175,55,0.2)", borderRadius: 12 }}>
          אין צפנים ממתינים — הכל מאושר. ✓
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map(m => {
            const findings = Array.isArray(m.positions?.findings) ? m.positions.findings.map(f => f.t).filter(Boolean) : [];
            return (
              <div key={m.id} style={card}>
                {m.image_url
                  ? <img src={m.image_url} alt="" style={{ width: 90, height: 72, objectFit: "cover", borderRadius: 8, background: "#0a0700", flexShrink: 0 }} loading="lazy" />
                  : <div style={{ width: 90, height: 72, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "linear-gradient(135deg,#160f03,#0a0700)", color: "#e6cf86", borderRadius: 8, fontSize: 12, fontWeight: 800, flexShrink: 0, textAlign: "center", padding: 4 }}><img src="/els-icon.png" alt="" width="28" height="28" style={{ borderRadius: 6, objectFit: "cover" }} />{m.search_term}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#f0d879", fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>{m.title || m.search_term}</div>
                  <div style={{ color: "#9a8f6a", fontSize: 12, marginTop: 2 }}>
                    דילוג {m.skip_distance} · {m.scope === "tanakh" ? "כל התנ״ך" : "תורה"}{m.author_name ? ` · ✍️ ${m.author_name}` : ""}
                  </div>
                  {findings.length > 0 && <div style={{ color: "#cdbf9f", fontSize: 12, marginTop: 4 }}>ממצאים: {findings.slice(0, 8).join(" · ")}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button disabled={busy === m.id} onClick={() => act(m.id, "published")} style={btn("linear-gradient(135deg,#3fae5f,#1c7a38)", "#04210f")}>{busy === m.id ? "…" : "✅ אשר ופרסם"}</button>
                    <button disabled={busy === m.id} onClick={() => act(m.id, "hidden")} style={btn("transparent", "#c98a7a")}>🙈 דחה</button>
                    {m.slug && <a href={`/codes/${encodeURIComponent(m.slug)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn("transparent", "#9a8f6a"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>👁 תצוגה</a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
