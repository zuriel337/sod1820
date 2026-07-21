import React, { useEffect, useState, useCallback } from "react";
import { F } from "../theme.js";
import { getPendingMatrices, moderateMatrix, getAllVariants } from "../lib/elsMatrices.js";
import { getAllContributions, approveContribution, moderateContribution } from "../lib/contributions.js";
import { formatDateHe } from "../lib/format.js";

// 🔍 תור-אישור מרוכז לצופן (אדמין) — מקום אחד לכל הממתין סביב הצפנים:
//   (1) צפנים ממתינים (els_records status=pending) · (2) תרומות-מחקר על צפנים (מ«שתף כממצא»/תגובות) ·
//   (3) «גרסאות» שנשמרו על צופן קיים וממתינות למיזוג. עץ אחד — לא מפזרים אישורים בין מסכים.
export default function ElsModerationTab() {
  const [items, setItems] = useState(null);      // צפנים ממתינים
  const [contribs, setContribs] = useState(null); // תרומות על צפנים
  const [variants, setVariants] = useState(null); // גרסאות למיזוג
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    getPendingMatrices(100).then(setItems).catch(() => setItems([]));
    getAllContributions("pending", 200)
      .then(list => setContribs((list || []).filter(c => c.target_type === "els")))
      .catch(() => setContribs([]));
    getAllVariants(100).then(setVariants).catch(() => setVariants([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (id, status) => {
    setBusy(id);
    try { await moderateMatrix(id, status); setItems(prev => (prev || []).filter(m => m.id !== id)); }
    catch (e) { alert("שגיאה: " + (e?.message || "נסה שוב")); }
    finally { setBusy(null); }
  }, []);

  const contribAct = useCallback(async (id, approve) => {
    setBusy(id);
    try {
      if (approve) await approveContribution(id); else await moderateContribution(id, "hidden");
      setContribs(prev => (prev || []).filter(c => c.id !== id));
    } catch (e) { alert("שגיאה: " + (e?.message || "נסה שוב")); }
    finally { setBusy(null); }
  }, []);

  const list = items || [], clist = contribs || [], vlist = variants || [];
  const total = list.length + clist.length + vlist.length;
  const card = { background: "rgba(20,14,4,0.7)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" };
  const btn = (bg, col) => ({ cursor: "pointer", background: bg, color: col, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, padding: "7px 15px", minHeight: 36 });
  const sectionH = (emoji, txt, n, accent = "#f0d879") => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "16px 0 10px" }}>
      <span style={{ color: accent, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800 }}>{emoji} {txt}</span>
      {n > 0 && <span style={{ background: "#c0563f", color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 9px" }}>{n}</span>}
    </div>
  );
  const empty = (txt) => <div style={{ color: "#9a8f6a", fontFamily: F.body, padding: "16px", textAlign: "center", background: "rgba(20,14,4,0.5)", border: "1px dashed rgba(212,175,55,0.2)", borderRadius: 12 }}>{txt}</div>;

  return (
    <div dir="rtl" style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ color: "#f0d879", fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>🔍 תור אישור — הצופן</span>
        {total > 0 && <span style={{ background: "#c0563f", color: "#fff", borderRadius: 999, fontSize: 12.5, fontWeight: 800, padding: "2px 10px" }}>{total} ממתינים</span>}
        <button onClick={load} style={{ marginInlineStart: "auto", ...btn("rgba(212,175,55,0.14)", "#f0d879") }}>↻ רענן</button>
      </div>
      <div style={{ color: "#9a8f6a", fontFamily: F.body, fontSize: 12.5, marginBottom: 6 }}>מקום אחד לכל הממתין סביב הצפנים — צפנים · תרומות · גרסאות למיזוג.</div>

      {/* (1) צפנים ממתינים */}
      {sectionH("🔠", "צפנים ממתינים לאישור", list.length)}
      {items === null ? empty("טוען…") : !list.length ? empty("אין צפנים ממתינים — הכל מאושר. ✓") : (
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

      {/* (2) תרומות-מחקר על צפנים (מ«שתף כממצא» / תגובות) */}
      {sectionH("💬", "תרומות ממתינות על צפנים", clist.length, "#8fb8ff")}
      {contribs === null ? empty("טוען…") : !clist.length ? empty("אין תרומות ממתינות על צפנים. ✓") : (
        <div style={{ display: "grid", gap: 10 }}>
          {clist.map(c => (
            <div key={c.id} style={card}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#cdbf9f", fontSize: 12, marginBottom: 3 }}>
                  {c.intent ? `${c.intent} · ` : ""}✍️ {c.author_name || "אורח"}{c.created_at ? ` · ${formatDateHe(c.created_at)}` : ""}
                  {" · "}<a href={`/codes/${encodeURIComponent(c.target_id)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#8fb8ff", textDecoration: "none" }}>הצופן ←</a>
                </div>
                <div style={{ color: "#e8dcc0", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.body}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button disabled={busy === c.id} onClick={() => contribAct(c.id, true)} style={btn("linear-gradient(135deg,#3fae5f,#1c7a38)", "#04210f")}>{busy === c.id ? "…" : "✅ אשר"}</button>
                  <button disabled={busy === c.id} onClick={() => contribAct(c.id, false)} style={btn("transparent", "#c98a7a")}>🙈 דחה</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* (3) גרסאות שממתינות למיזוג — המיזוג נעשה בעמוד-הצופן (שם יש פאנל-המיזוג) */}
      {sectionH("🔀", "גרסאות שממתינות למיזוג", vlist.length, "#e0b84a")}
      {variants === null ? empty("טוען…") : !vlist.length ? empty("אין גרסאות ממתינות למיזוג. ✓") : (
        <div style={{ display: "grid", gap: 10 }}>
          {vlist.map(v => {
            const vf = Array.isArray(v.positions?.findings) ? v.positions.findings.map(f => f.t).filter(Boolean) : [];
            const parentSlug = v.positions?.variantOfSlug || null;
            return (
              <div key={v.id} style={card}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#f0d879", fontFamily: F.regal, fontSize: 15, fontWeight: 800 }}>{v.title || v.search_term} <span style={{ color: "#9a8f6a", fontSize: 12, fontWeight: 400 }}>· דילוג {v.skip_distance}</span></div>
                  <div style={{ color: "#9a8f6a", fontSize: 12, marginTop: 2 }}>✍️ {v.author_name || "אורח"}{v.created_at ? ` · ${formatDateHe(v.created_at)}` : ""}</div>
                  {vf.length > 0 && <div style={{ color: "#cdbf9f", fontSize: 12, marginTop: 4 }}>ממצאים: {vf.slice(0, 8).join(" · ")}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {parentSlug
                      ? <a href={`/codes/${encodeURIComponent(parentSlug)}`} target="_blank" rel="noopener noreferrer" style={{ ...btn("linear-gradient(135deg,#e0b84a,#b0791a)", "#1a0e00"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>🔀 פתח למיזוג בעמוד-הצופן</a>
                      : <span style={{ color: "#9a8f6a", fontSize: 12 }}>(אין קישור-מקור — נשמר לפני התיוג)</span>}
                    <button disabled={busy === v.id} onClick={() => act(v.id, "hidden")} style={btn("transparent", "#c98a7a")}>🙈 דחה גרסה</button>
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
