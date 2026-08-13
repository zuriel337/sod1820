// 👤 Writer Research OS (CC-1.4) — שכבה אחת reusable לכל contributor (צבי = test case).
// עמדת-מחקר אינטראקטיבית מעל דף/אזור-הכתב. READ + ניווט + מבנה-פעולה; **כל WRITE = gated (פאזה 3 / Decision-Gate)**.
// Reuse-first: contributors/wa_names (זהות) · getUpdatesByReporterNames (RAW) · getWriterCoreWords (CORE) ·
//   getResearchFeed (VAULT) · getResearcherProfile (CANONICAL) · resolveWriter · tierOf · dossier_settings (policy).
// ⛔ אין טבלה/מנוע/גרף/מקור-אמת/RPC חדש. Governance: RAW≠VAULT≠CORE≠CANONICAL · Claim≠Fact · engine≠human · Preference≠Truth.
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
// 🏙️ עור «היכל» בהיר — מוטמע אך-ורק בחדר-המפקדה, לכן מרונדר באותה שפה בהירה (כרטיסים לבנים, אקסנט-כחול).
// אותם מפתחות → ערכי-היכל, כך שכל הרכיב הופך בהיר בבת-אחת (עקבי עם WarRoomTab).
const C = {
  surface: "#ffffff", surface2: "#ffffff",
  border: "#dbe1ea", goldBright: "#1c4bbf", gold: "#2f6df6",
  goldLight: "#1b1d22", muted: "#5b6472", faint: "#8a93a3",
};
import { supabase, getUpdatesByReporterNames, getWriterCoreWords, getResearchFeed } from "../lib/supabase.js";
import { getResearcherProfile } from "../lib/contributions.js";
import { resolveWriter } from "../lib/writers.js";
import { tierOf, TIER } from "../lib/discovery.js";

const CUT = "2026-08-09";  // נקודת-החיתוך של האוצרה האחרונה (work_log 7–9.8) — «חומר חדש מאז»
const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 0 };
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading });
const chip = (active, col) => ({ cursor: "pointer", borderRadius: 999, padding: "4px 11px", fontSize: 12, fontWeight: 800, fontFamily: F.heading, border: `1px solid ${active ? (col || C.goldBright) : C.border}`, background: active ? (col || C.goldBright) + "22" : "transparent", color: active ? (col || C.goldBright) : C.muted, whiteSpace: "nowrap" });
const fmt = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "—";

// למידת-שיטה + כיוון (סעיף 3) — reuse: researcher_definitions / gematria_words.tags / resolve_word_review.
const METHODS = [["סופי תיבות"], ["ראשי תיבות"], ["נוטריקון"], ["ELS"], ["אתב\"ש"], ["תאריך/מקרי (לא-ממצא)"], ["שיטה אחרת"]];
const DIRECTIONS = [["→ משמאל לימין"], ["← ימין לשמאל"], ["סדר הופעה"], ["אחר"]];

// מונה לחיץ בכותרת-הכתב.
function Stat({ label, n, col, active, onClick, hint }) {
  return (
    <div onClick={onClick} title={hint || label}
      style={{ ...box, padding: "8px 12px", cursor: onClick ? "pointer" : "default", borderColor: active ? col : C.border, minWidth: 96 }}>
      <div style={{ color: col, fontFamily: F.heading, fontWeight: 800, fontSize: 11 }}>{label}</div>
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontWeight: 900, fontSize: 20 }}>{n}</div>
    </div>
  );
}

function normRaw(r) {
  return { kind: "raw", key: "raw:" + r.id, tier: tierOf("channel_updates", r), source: "ערוץ · " + (r.channel || "—"),
    rawAuthor: r.credit || "", ts: r.created_at, text: String(r.text || "").replace(/<[^>]+>/g, "").trim(),
    value: null, method: null, tags: [], is_verified: false, status: null, link: r.link_url || null };
}
function normCore(r) {
  return { kind: "core", key: "core:" + r.id, tier: tierOf("gematria_words", r), source: "אוצר · gematria_words",
    rawAuthor: r.vip_source || String(r.source || "").replace("contribution:", ""), ts: r.created_at, text: r.phrase || "",
    value: r.ragil, method: r.other_method || r.essence_method || null, tags: Array.isArray(r.tags) ? r.tags : [],
    is_verified: r.is_verified === true, status: r.visibility_tier === 1 ? "מוצף (tier-1)" : null, node_id: r.node_id || null };
}
function normVault(r) {
  return { kind: "vault", key: "vault:" + r.id, tier: tierOf("research_objects", r), source: "מנוע · מועמד",
    rawAuthor: r.contributor || r.source || "", ts: r.created_at, text: r.statement || "", value: r.value,
    method: null, tags: [], is_verified: r.engine_verified === true, status: r.status, roKind: r.kind };
}
function normCanon(r) {
  return { kind: "canonical", key: "canon:" + (r.id || Math.random()), tier: TIER.CANONICAL, source: "פורום · פורסם",
    rawAuthor: r.author_name || "", ts: r.created_at || r.last_activity_at, text: String(r.body || r.title || "").replace(/<[^>]+>/g, "").trim(),
    value: null, method: null, tags: [], is_verified: false, status: "published", link: r.id ? `/forum/${r.id}` : null };
}

export default function WriterOS({ contributor, writerIndex }) {
  // מרחיבים את רשומת-האינדקס ב-user_id + dossier_settings (grant מאומת) לצורך policy + פרופיל.
  const [full, setFull] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!contributor?.slug) { setFull(null); return; }
    supabase.from("contributors").select("user_id,dossier_settings").eq("slug", contributor.slug).maybeSingle()
      .then(({ data }) => { if (alive) setFull(data || {}); }).catch(() => { if (alive) setFull({}); });
    return () => { alive = false; };
  }, [contributor?.slug]);
  const c = useMemo(() => ({ ...contributor, ...(full || {}) }), [contributor, full]);
  const names = useMemo(() => [c?.display_name, ...(Array.isArray(c?.wa_names) ? c.wa_names : [])].filter(Boolean), [c]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState(null);   // {type,value,label,color}
  const [detail, setDetail] = useState(null);
  const [sel, setSel] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!c?.display_name) { setItems([]); return; }
    setBusy(true); setSel(new Set()); setFilter(null);
    const [ups, core, feed, prof] = await Promise.all([
      getUpdatesByReporterNames(names, 200).catch(() => []),
      getWriterCoreWords(names, 500).catch(() => []),
      getResearchFeed({ status: "candidate", limit: 200 }).catch(() => []),
      getResearcherProfile(c.display_name, 40, c.user_id || null).catch(() => null),
    ]);
    // VAULT — סינון מועמדי-המנוע לכתב זה דרך ה-resolver (reuse; לא query נוסף).
    const mine = (feed || []).filter(r => {
      const w = resolveWriter(r.contributor || r.source || "", writerIndex);
      return w.state === "matched" && (w.canonical?.slug === c.slug);
    });
    const all = [
      ...(ups || []).map(normRaw), ...(core || []).map(normCore),
      ...mine.map(normVault), ...((prof?.items) || []).map(normCanon),
    ].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    setItems(all); setBusy(false);
  }, [c, names, writerIndex]);

  useEffect(() => { load(); }, [load]);

  const byTier = (k) => items.filter(i => i.tier?.key === k);
  const newSince = items.filter(i => i.ts && i.ts >= CUT);
  const methods = useMemo(() => {
    const m = new Map();
    items.forEach(i => { if (i.method) m.set(i.method, (m.get(i.method) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const lastActivity = items[0]?.ts;
  const policy = (c?.dossier_settings && c.dossier_settings.policy) || {};

  const matches = (i) => {
    if (!filter) return true;
    switch (filter.type) {
      case "tier": return i.tier?.key === filter.value;
      case "new": return i.ts && i.ts >= CUT;
      case "numphrase": return i.value != null && i.method;
      case "method": return i.method === filter.value;
      case "unknown": { const w = resolveWriter(i.rawAuthor, writerIndex); return w.state !== "matched"; }
      default: return true;
    }
  };
  const shown = items.filter(matches);
  const allSelected = shown.length > 0 && shown.every(i => sel.has(i.key));
  const toggle = (k) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const selectShown = () => setSel(new Set(shown.map(i => i.key)));
  const clearSel = () => setSel(new Set());

  if (!c) return <div style={{ color: C.muted, fontSize: 13 }}>בחר כתב.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* 1 · Writer Header */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, fontWeight: 900 }}>👤 {c.display_name}</span>
          {c.vip && <span style={pill("#b08bd8")}>VIP · עדיפות ≠ אמת</span>}
          <Link to={`/community/researcher/${c.slug}`} style={{ ...pill(C.gold), textDecoration: "none" }}>↗ דף-הכתב</Link>
          <span style={{ color: C.faint, fontSize: 11, marginInlineStart: "auto" }}>פעילות אחרונה: {fmt(lastActivity)} {busy && "…"}</span>
        </div>
        {/* aliases */}
        <div style={{ color: C.muted, fontSize: 11.5, margin: "6px 0" }}>
          זהות קנונית: <b style={{ color: C.goldLight }}>{c.display_name}</b>
          {names.length > 1 && <> · aliases (wa_names): {names.slice(1).map((a, i) => <span key={i} style={pill("#8a8a95")}>{a}</span>)}</>}
        </div>
        {/* מונים לחיצים */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <Stat label="RAW · מקור" n={byTier("RAW").length} col="#8a8a95" active={filter?.type === "tier" && filter.value === "RAW"} onClick={() => setFilter({ type: "tier", value: "RAW", label: "רובד: RAW", color: "#8a8a95" })} />
          <Stat label="VAULT · מחקר" n={byTier("VAULT").length} col="#b08bd8" active={filter?.type === "tier" && filter.value === "VAULT"} onClick={() => setFilter({ type: "tier", value: "VAULT", label: "רובד: VAULT", color: "#b08bd8" })} />
          <Stat label="CORE · אוצר" n={byTier("CORE").length} col="#c79a2e" active={filter?.type === "tier" && filter.value === "CORE"} onClick={() => setFilter({ type: "tier", value: "CORE", label: "רובד: CORE", color: "#c79a2e" })} />
          <Stat label="CANONICAL" n={byTier("CANONICAL").length} col="#4caf7d" active={filter?.type === "tier" && filter.value === "CANONICAL"} onClick={() => setFilter({ type: "tier", value: "CANONICAL", label: "רובד: CANONICAL", color: "#4caf7d" })} />
          <Stat label="חדש מאז 9.8" n={newSince.length} col="#3ea6ff" active={filter?.type === "new"} onClick={() => setFilter({ type: "new", label: "חדש מאז נקודת-החיתוך", color: "#3ea6ff" })} hint="חומר שנכנס אחרי האוצרה האחרונה" />
          <Stat label="ממתין (VAULT)" n={byTier("VAULT").length} col="#e0913a" active={filter?.type === "tier" && filter.value === "VAULT"} onClick={() => setFilter({ type: "tier", value: "VAULT", label: "ממתין לשיפוט", color: "#e0913a" })} hint="מועמדים ממתינים לשער-אנושי" />
          <Stat label="num+phrase" n={items.filter(i => i.value != null && i.method).length} col="#c0453c" active={filter?.type === "numphrase"} onClick={() => setFilter({ type: "numphrase", label: "מספר+שיטה", color: "#c0453c" })} />
        </div>
        {/* שיטות (לחיצות) */}
        {methods.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <span style={{ color: C.faint, fontSize: 11 }}>שיטות (מהנתונים):</span>
            {methods.map(([m, n]) => (
              <span key={m} onClick={() => setFilter({ type: "method", value: m, label: "שיטה: " + m, color: "#3ea6ff" })}
                style={{ ...pill("#3ea6ff"), cursor: "pointer" }}>{m} · {n}</span>
            ))}
          </div>
        )}
        {/* 6 · Writer Policy (קריאה בלבד — dossier_settings.policy.*) */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <span style={{ color: C.faint, fontSize: 11 }}>Policy (dossier_settings · קריאה):</span>
          {["raw_capture", "vault", "engine", "language", "ai", "core_recommendation", "human_gate"].map(k => (
            <span key={k} style={pill(policy[k] ? "#4caf7d" : "#8a8a95")}>{k}: {policy[k] ? "✓" : "—"}</span>
          ))}
          <span style={{ color: C.faint, fontSize: 10 }}>· כתיבת-policy = Decision-Gate נפרד</span>
        </div>
      </div>

      {/* 8 · Test-case (צבי) — Fact/Claim/Interpretation/Status, בלי להפוך פרשנות לעובדה */}
      {c.slug === "tzvi-opoc" && (
        <div style={{ ...box, borderColor: "#c79a2e55" }}>
          <div style={{ color: "#c79a2e", fontFamily: F.heading, fontWeight: 800, marginBottom: 6 }}>🧪 מקרה-מחקר: «יפול צדיק וקם»</div>
          <div style={{ display: "grid", gap: 3, fontSize: 12.5 }}>
            <div><span style={pill("#4caf7d")}>FACT</span> אותיות-סופיות: יפו<b>ל</b> · צדי<b>ק</b> · וק<b>ם</b> → ל·ק·ם (חילוץ מכני, לא ערך-גימטריה)</div>
            <div><span style={pill("#e0913a")}>כיוון</span> קריאה ← ימין-לשמאל → «מקל» (סעיף 3: כיוון = חלק מהשיטה)</div>
            <div><span style={pill("#3ea6ff")}>CLAIM (צבי)</span> «מקל» → זכות-אבות (אברהם · יצחק · ישראל)</div>
            <div><span style={pill(C.muted)}>INTERPRETATION</span> פרשנות משלימה — נשענת על החילוץ, לא נגזרת ממנו לוגית</div>
            <div><span style={pill("#c0453c")}>STATUS</span> פרשנות <b>לא-מאומתת</b> — ⛔ לא הופכת לעובדה. engine מאמת ערכים, לא משמעות.</div>
          </div>
        </div>
      )}

      {/* 4 · Bulk bar (gated) */}
      {sel.size > 0 && (
        <div style={{ ...box, borderColor: C.goldBright, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b style={{ color: C.goldBright, fontFamily: F.heading }}>נבחרו {sel.size} פריטים</b>
          {["🔬 בדוק במנוע", "🏷️ סווג שיטה", "🧠 למד שיטה", "💾 שמור RAW", "📥 העבר ל-VAULT", "🔎 פתח מחקר"].map(a => (
            <button key={a} onClick={() => alert(`«${a}» על ${sel.size} פריטים — פאזה 3 (Decision-Gate). לא בוצע WRITE.`)} style={chip(false)}>{a}</button>
          ))}
          <button onClick={clearSel} style={{ ...chip(false), marginInlineStart: "auto" }}>נקה בחירה</button>
          <span style={{ color: C.faint, fontSize: 10 }}>Bulk = לולאה מעל single-id RPC קיים · אין קידום אוטומטי · gated</span>
        </div>
      )}

      {/* 2 · Writer Inbox */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>📥 Writer Inbox <span style={{ color: C.faint, fontSize: 11, fontWeight: 400 }}>({shown.length}{filter ? " מסונן" : ""})</span></span>
          <button onClick={allSelected ? clearSel : selectShown} style={chip(allSelected)}>{allSelected ? "☑ בטל בחירת-הכל" : "☐ בחר את המוצג"}</button>
          <button onClick={() => setSel(new Set(items.map(i => i.key)))} style={chip(false)}>בחר כל-הכתב</button>
          <button onClick={() => setSel(new Set(items.filter(i => resolveWriter(i.rawAuthor, writerIndex).state !== "matched").map(i => i.key)))} style={chip(false)}>בחר UNKNOWN</button>
          {filter && <button onClick={() => setFilter(null)} style={chip(false)}>✕ נקה פילטר</button>}
        </div>
        {shown.length ? shown.slice(0, 60).map(i => {
          const w = resolveWriter(i.rawAuthor, writerIndex);
          return (
            <div key={i.key} style={{ display: "flex", gap: 8, alignItems: "baseline", borderBottom: `1px solid ${C.border}`, padding: "6px 0", fontSize: 12.5 }}>
              <input type="checkbox" checked={sel.has(i.key)} onChange={() => toggle(i.key)} onClick={e => e.stopPropagation()} style={{ marginTop: 3, cursor: "pointer" }} />
              <div onClick={() => setDetail(i)} title="פתח פרטים ופעולות" style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", flex: 1, minWidth: 0, cursor: "pointer" }}>
                <span style={{ ...pill(i.tier?.color || C.muted), fontWeight: 800 }}>{i.tier?.he}</span>
                {i.method && <span style={pill("#3ea6ff")}>{i.method}</span>}
                {i.value != null && <b style={{ color: C.goldBright }}>{i.value}</b>}
                {i.is_verified && <span style={pill("#4caf7d")}>✔ מנוע</span>}
                {w.state !== "matched" && <span style={pill("#8a8a95")}>❔ {w.raw}</span>}
                <span style={{ color: C.goldLight, flex: 1, minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.text ? i.text.slice(0, 90) : "(ללא טקסט)"}</span>
                <span style={{ color: C.faint, fontSize: 10.5 }}>{fmt(i.ts)}</span>
              </div>
            </div>
          );
        }) : <div style={{ color: C.muted, fontSize: 12.5 }}>{busy ? "טוען…" : (filter ? "אין חומר תואם לפילטר." : "אין חומר לכתב זה. התור נקי ✓")}</div>}
        {shown.length > 60 && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>מוצגים 60 מתוך {shown.length}.</div>}
      </div>

      {detail && <WriterDetailPanel item={detail} writerIndex={writerIndex} onClose={() => setDetail(null)} />}
    </div>
  );
}

// 🗂️ Detail/Action Panel — סעיף 2 + 3 (Method/Direction learning) + 5 (Preference). כל WRITE gated.
function WriterDetailPanel({ item, writerIndex, onClose }) {
  const w = resolveWriter(item.rawAuthor, writerIndex);
  const canon = w?.canonical?.display_name || w?.contributor?.display_name;
  const slug = w?.canonical?.slug || w?.contributor?.slug;
  const [learn, setLearn] = useState(false);
  const gated = (what) => alert(`«${what}» — פאזה 3 (Decision-Gate). ישמר דרך המנגנון הקיים (researcher_definitions / tags / record_feedback), בלי לשנות Fact/Canonical. לא בוצע WRITE.`);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 5000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "5vh 12px", overflow: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...box, maxWidth: 580, width: "100%", background: C.surface || C.surface2 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ ...pill(item.tier?.color || C.muted), fontWeight: 800 }}>{item.tier?.he}</span>
          <span style={pill(C.goldBright)}>{item.source}</span>
          <span style={{ color: C.faint, fontSize: 11 }}>{fmt(item.ts)}</span>
          <button onClick={onClose} style={{ ...chip(false), marginInlineStart: "auto" }}>✕ סגור</button>
        </div>
        <div style={{ color: C.goldLight, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", marginBottom: 10 }}>{item.text || "(ללא טקסט)"}</div>
        {[["מקור (provenance)", `${item.source}${item.rawAuthor ? ` · «${item.rawAuthor}»` : ""}`],
          ["זהות", w?.state === "matched" ? `✓ ${canon}` : `❔ לא-מזוהה: «${w?.raw || item.rawAuthor}»`],
          ["רובד", item.tier ? `${item.tier.he} · ${item.tier.key}` : "—"],
          ["שיטה", item.method || "— (לא-מסווג)"],
          ["תגיות/כיוון", (item.tags || []).join(" · ") || "—"],
          ["מספר/ערך", item.value ?? "—"],
          ["אימות-מנוע", item.is_verified ? "✔ אומת במנוע (חישובי ≠ אישור-אנושי)" : "—"],
          ["Claim ≠ Fact", "טענת-הכתב אינה עובדה עד אימות-מנוע · פרשנות מופרדת"],
          ["סטטוס", item.status || "—"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.faint, minWidth: 118 }}>{k}</span><span style={{ color: C.goldLight, flex: 1, wordBreak: "break-word" }}>{v}</span>
          </div>
        ))}
        {/* ניווט (עובד) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {item.value != null && <Link to={`/number/${item.value}`} style={{ ...pill(C.gold), textDecoration: "none" }}>🔢 דף-מספר {item.value}</Link>}
          {slug && <Link to={`/community/researcher/${slug}`} style={{ ...pill("#b08bd8"), textDecoration: "none" }}>👤 דף-כתב</Link>}
          {item.link && <Link to={item.link} style={{ ...pill(C.muted), textDecoration: "none" }}>📄 מקור</Link>}
          <button onClick={() => setLearn(v => !v)} style={chip(learn, "#3ea6ff")}>🧠 למד את המערכת</button>
        </div>
        {/* 3 · Method / Direction learning (gated) */}
        {learn && (
          <div style={{ marginTop: 10, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
            <div style={{ color: C.faint, fontSize: 11, marginBottom: 6 }}>סווג שיטה (→ researcher_definitions / gematria_words.tags · gated):</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{METHODS.map(([m]) => <button key={m} onClick={() => gated("סווג: " + m)} style={chip(false, "#3ea6ff")}>{m}</button>)}</div>
            <div style={{ color: C.faint, fontSize: 11, margin: "8px 0 6px" }}>כיוון-קריאה:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{DIRECTIONS.map(([d]) => <button key={d} onClick={() => gated("כיוון: " + d)} style={chip(false)}>{d}</button>)}</div>
            <div style={{ color: C.faint, fontSize: 11, margin: "8px 0 6px" }}>העדפה (Preference ≠ Truth · Rank-Don't-Hide → record_feedback):</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => gated("העדפה: אל תעקוב אחרי זה")} style={chip(false, "#8a8a95")}>🔕 אל תעקוב (לא מוחק, לא FALSE)</button>
              <button onClick={() => gated("העדפה: העדף חומר כזה")} style={chip(false, "#4caf7d")}>⭐ העדף</button>
            </div>
            <div style={{ color: C.faint, fontSize: 10.5, marginTop: 8 }}>⛔ כל אלה <b>gated</b> — פאזה 3. לא משנים Fact/Canonical, לא מוחקים, לא מקדמים. קידום = ZURIEL בלבד.</div>
          </div>
        )}
      </div>
    </div>
  );
}
