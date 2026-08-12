// 🎛️ חדר המפקדה (CC-1) — View קורא-בלבד על כל האוצר (לא רק Discovery).
// חוקי-ברזל (§13.8): אין WRITE · אין קידום · אין engine · אין שינוי EntityPage/גרף.
// שער=החלטה-לא-ראות (§11.34): חומר שלפני research_objects נראה כאן. HOT≠TRUE · VIP≠TRUE · Claim≠Fact.
// כל הנתונים מ-helpers קיימים בלבד (reuse-first). מסלול-החומר מראה «איפה נעצר».
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  getResearchFeed, getWaGroups, getWaLog, getForumMaterial,
  getLanguageLinks, getLanguageStats, getHotNumbers, getPostsFromSupabase,
  getChannelUpdates, getContributorsIndex,
} from "../lib/supabase.js";
import { buildWriterIndex, resolveWriter, WRITER_STATE } from "../lib/writers.js";
import {
  materialTrack, MATERIAL_STAGES, TRACK_COLOR, TRACK_LABEL, langRelLabel,
  tierOf, TIER,
} from "../lib/discovery.js";
import AiAnalyze from "./AiAnalyze.jsx";
import WriterOS from "./WriterOS.jsx";

const WRITERS = ["יניב לוי", "שמעון חיימוב", "ציון סיבוני", "צבי (OPOC)", "יצחק שחר קנדרו", "כריסטינה", "סלי מור"];

// ── CC-1.1 · LIVE INGESTION — הפרדת שלושת הצינורות (READ-ONLY, בלי feeder/WRITE) ──
// A = ערוצי-שידור (channel_updates, חי) · C = מנוע-הגילויים (research_objects) · B = רזיאל/VIP (רדום).
// ⛔ תצוגה בלבד: אין fn_persist_discovery, אין שינוי research_objects, אין הפעלת B.
const A_CHANNELS = [
  ["gilui-yomi", "הגילוי היומי"], ["torat-haremez", "תורת הרמז"],
  ["or-geula", "אור הגאולה"], ["sfot-vheker", "שפות וחקר מציאות"],
];
const C_SOURCES = ["discovery-engine", "entity-combo", "research-center", "active-panel"];

const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 0 };
const chip = (active, col) => ({
  cursor: "pointer", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 800, fontFamily: F.heading,
  border: `1px solid ${active ? (col || C.goldBright) : C.border}`, background: active ? (col || C.goldBright) + "22" : "transparent",
  color: active ? (col || C.goldBright) : C.muted, whiteSpace: "nowrap",
});
const pill = (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}`, color: c, borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading });
const fmt = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "—";

// ── נורמליזציה: כל מקור → פריט אחיד (למסלול-חומר) ──────────────────────────
function claimInfo(gc) {
  if (!gc || typeof gc !== "object") return { verified: false, values: [], cross: false };
  const layers = Array.isArray(gc.engine_verified_layers) ? gc.engine_verified_layers : [];
  const values = layers.map(l => l && l.value).filter(v => v != null);
  return { verified: gc.verified === true || layers.length > 0, values, cross: layers.length > 1 };
}
function normForum(r) {
  const ci = claimInfo(r.gematria_claim);
  return {
    key: "c:" + r.id, source: "תגובה", author: r.author_name || "—", ts: r.created_at,
    raw: (r.body || r.title || "").trim(), lang: null,
    engineVerified: ci.verified, values: ci.values, hasCross: ci.cross,
    inFeed: false, inGraph: !!r.graph_node_id, published: r.status === "published",
    value: null, target: r.target_type,
  };
}
function normWa(r) {
  const act = r.action || "";
  return {
    key: "w:" + (r.group_id || "") + ":" + (r.created_at || "") + ":" + (r.sender_name || ""),
    source: "WhatsApp", author: r.sender_name || "—", group: r.group_id, ts: r.created_at,
    raw: (r.text_in || "").trim(), lang: null,
    engineVerified: r.value != null, values: r.value != null ? [r.value] : [], hasCross: false,
    inFeed: false, inGraph: false, published: /saved|channel|vip/.test(act),
    value: r.value,
  };
}
function normPost(r) {
  const t = r.title?.rendered || r.title || "";
  return {
    key: "p:" + (r.slug || r.id), source: "פוסט", author: r.author || "המערכת", ts: r.date,
    raw: String(t).replace(/<[^>]+>/g, "").trim(), lang: null,
    engineVerified: false, values: [], hasCross: false,
    inFeed: false, inGraph: false, published: true, value: null, link: r.link || (r.slug ? "/" + r.slug : null),
  };
}
function normCandidate(r) {
  return {
    key: "r:" + r.id, source: "מנוע", author: r.contributor || "מנוע-הגילויים", ts: r.created_at,
    raw: r.statement || "", lang: null,
    engineVerified: r.engine_verified === true, values: r.value != null ? [r.value] : [],
    hasCross: (r.kind === "relation"), inFeed: true, judged: r.status !== "candidate",
    inGraph: !!r.promoted_node_id, published: false, value: r.value, kind: r.kind, status: r.status,
    src: r.source,   // מקור הצינור (discovery-engine / wa-raziel…) — להפרדת C מ-B
    rawAuthor: (r.contributor || r.source || "").trim(),   // מחרוזת-מקור ל-resolver (provenance)
    tier: tierOf("research_objects", r),                   // candidate=VAULT · promoted=CORE
  };
}
// A · ערוץ-שידור → פריט-קליטה מנורמל. published=מקושר-לפוסט (link_url) = «קיים» באתר.
function normChannel(r, chLabel) {
  const t = String(r.text || "").replace(/<[^>]+>/g, "").trim();
  return {
    key: "ch:" + r.id, source: "ערוץ · " + (chLabel || r.channel || "—"), author: r.credit || "—",
    ts: r.created_at, raw: t, channel: r.channel, link: r.link_url || null,
    engineVerified: false, values: [], hasCross: false, value: null,
    inFeed: false, inGraph: false, published: !!r.link_url,
    rawAuthor: (r.credit || "").trim(),               // מחרוזת-מקור ל-resolver (provenance)
    tier: tierOf("channel_updates", r),               // צינור-A = תמיד RAW
  };
}
// חדש / קיים / כפול — רק מה שניתן לקבוע מנתונים קיימים (בלי engine/parser):
//   כפול = אותו טקסט מנורמל חוזר בתוך המנה · קיים = מקושר-לפוסט (link_url) · חדש = ראשון ולא-מקושר.
function classifyIngest(items) {
  const seen = new Set();
  return items.map(it => {
    const norm = (it.raw || "").replace(/\s+/g, " ").trim().toLowerCase();
    let flag;
    if (norm && seen.has(norm)) flag = "dup";
    else { if (norm) seen.add(norm); flag = it.link ? "existing" : "new"; }
    return { ...it, flag };
  });
}
const INGEST_FLAG = {
  new: { t: "🆕 חדש", c: "#4caf7d" }, existing: { t: "🔗 קיים", c: "#b08bd8" }, dup: { t: "♻️ כפול", c: "#8a8a95" },
};

// ── מסלול-החומר (הרכיב המרכזי) ─────────────────────────────────────────────
const TRACK_DOT = { done: "🟢", partial: "🟡", unchecked: "⚪", stalled: "🔴" };
// שורת-סטטוס (לא כפתורים!) — מראה איפה הפריט נמצא במסלול. cursor:default, בלי מראה-כפתור.
function TrackBar({ item }) {
  const track = useMemo(() => materialTrack(item), [item]);
  return (
    <div style={{ marginTop: 8, cursor: "default" }}>
      <span style={{ fontSize: 9.5, color: C.faint, fontFamily: F.heading, marginInlineEnd: 6 }}>מצב-החומר (לתצוגה, לא ללחיצה):</span>
      <span style={{ display: "inline", lineHeight: 1.9 }}>
        {track.map((t, i) => (
          <span key={i} title={`${t.stage}: ${TRACK_LABEL[t.state]}`}
            style={{ fontSize: 10.5, fontWeight: 700, fontFamily: F.heading, color: TRACK_COLOR[t.state], whiteSpace: "nowrap", marginInlineEnd: 4 }}>
            {TRACK_DOT[t.state]} {t.stage}{i < track.length - 1 ? <span style={{ color: C.faint, fontWeight: 400 }}> › </span> : ""}
          </span>
        ))}
      </span>
    </div>
  );
}

function ItemCard({ item, onFocus }) {
  const v = item.values && item.values.length ? item.values[0] : item.value;
  return (
    <div style={{ ...box, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        <span style={pill(C.goldBright)}>{item.source}</span>
        <span style={{ color: C.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>{item.author}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{fmt(item.ts)}</span>
        {item.engineVerified && <span style={pill("#4caf7d")}>✔ מנוע</span>}
        {item.hasCross && <span style={pill("#3ea6ff")}>הצלבה</span>}
        {item.published && <span style={pill("#b08bd8")}>פורסם</span>}
        {v != null && <b style={{ marginInlineStart: "auto", color: C.goldBright, cursor: "pointer", fontFamily: F.heading }} onClick={() => onFocus && onFocus(v)}>{v}</b>}
      </div>
      <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.5, maxHeight: 60, overflow: "hidden", whiteSpace: "pre-wrap" }}>
        {item.raw ? item.raw.slice(0, 200) : <span style={{ color: C.faint }}>(ללא טקסט)</span>}
      </div>
      <TrackBar item={item} />
      <div style={{ display: "flex", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
        {v != null && <Link to={`/number/${v}`} style={{ ...pill(C.gold), textDecoration: "none" }}>🔍 חקור {v}</Link>}
        {item.link && <Link to={item.link} style={{ ...pill(C.muted), textDecoration: "none" }}>📄 לפוסט</Link>}
      </div>
    </div>
  );
}

// CC-1.2 · תג-רובד (Tier Lens) — ניווט בלבד, לא משנה סמנטיקה. CC-1.3: לחיץ → פילטר.
function TierBadge({ tier, onClick }) {
  if (!tier) return null;
  return <span onClick={onClick ? (e => { e.stopPropagation(); onClick(); }) : undefined}
    style={{ ...pill(tier.color), fontWeight: 800, cursor: onClick ? "pointer" : "default" }}
    title={onClick ? `סנן לרובד ${tier.he}` : "רובד-ניווט (נגזר מהסטטוס הקיים; לא משנה אמת)"}>{tier.he}</span>;
}
// CC-1.2 · צ'יפ-זהות — מציג את מצב ה-resolver. **לא בוחר אוטומטית.**
//   matched → הישות הקנונית (עם provenance של השם המקורי אם ממוזג) · ambiguous/unknown → השם הגולמי + מועמדים.
function WriterChip({ writer }) {
  if (!writer) return null;
  const st = WRITER_STATE[writer.state] || WRITER_STATE.unknown;
  if (writer.state === "matched") {
    const canon = writer.canonical?.display_name || writer.contributor?.display_name || writer.raw;
    return (
      <span style={{ color: C.muted, fontSize: 10.5, whiteSpace: "nowrap" }} title={`מזוהה: ${canon}`}>
        <span style={{ color: st.c }}>✓</span> {canon}
        {writer.mergedFrom && (
          <span style={{ color: C.faint }} title={`ממוזג מ: ${writer.mergedFrom.display_name}`}> ⟵ «{writer.raw}»</span>
        )}
      </span>
    );
  }
  return (
    <span style={{ color: C.faint, fontSize: 10.5, whiteSpace: "nowrap" }}
      title={writer.state === "ambiguous"
        ? "כמה התאמות — דורש מיזוג-אנושי (merged_into). לא נבחר אוטומטית."
        : "לא-מזוהה — לא נבחר contributor. השם המקורי נשמר."}>
      <span style={{ color: st.c }}>{st.t}</span>: «{writer.raw || "—"}»
      {writer.state === "ambiguous" && writer.candidates?.length > 0 && (
        <span> ({writer.candidates.map(c => c.display_name).filter(Boolean).join(" / ")})</span>
      )}
    </span>
  );
}

// שורת-קליטה לצינור A. CC-1.3: השורה לחיצה → Detail Panel · תג-רובד/flag לחיצים → פילטר.
function IngestRow({ item, onOpen, onFilter }) {
  const f = INGEST_FLAG[item.flag] || INGEST_FLAG.new;
  return (
    <div onClick={() => onOpen && onOpen(item)} title="פתח פרטים ופעולות"
      style={{ display: "flex", gap: 8, alignItems: "baseline", borderBottom: `1px solid ${C.border}`, padding: "5px 0", fontSize: 12.5, flexWrap: "wrap", cursor: "pointer" }}>
      <TierBadge tier={item.tier} onClick={onFilter ? () => onFilter({ type: "tier", value: item.tier?.key, label: "רובד: " + item.tier?.he, color: item.tier?.color }) : undefined} />
      <span onClick={onFilter ? (e => { e.stopPropagation(); onFilter({ type: "flag", value: item.flag, label: "סוג: " + f.t, color: f.c }); }) : undefined}
        style={{ ...pill(f.c), cursor: onFilter ? "pointer" : "default" }} title={onFilter ? "סנן לפי סוג" : undefined}>{f.t}</span>
      <span style={{ color: C.goldLight, fontFamily: F.heading, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{item.source}</span>
      <span style={{ color: C.faint, fontSize: 10.5, whiteSpace: "nowrap" }}>{fmt(item.ts)}</span>
      <span style={{ color: C.goldLight, flex: 1, minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.raw ? item.raw.slice(0, 100) : <span style={{ color: C.faint }}>(ללא טקסט)</span>}
      </span>
      <WriterChip writer={item.writer} />
    </div>
  );
}

// ── CC-1.3 · פאזה 1 — Clickable-everything + Row Action Panel + פילטרים-חיים (READ/navigation בלבד) ──
// ⛔ אין WRITE: פעולות-עבודה (שיפוט/קידום/למד) = פאזה 3. כאן ניווט + חקירה + פילטר בלבד.
function matchesFilter(it, f) {
  if (!f) return true;
  switch (f.type) {
    case "tier": return it.tier?.key === f.value;
    case "flag": return it.flag === f.value;
    case "kind": return it.kind === f.value;
    case "src":  return f.value === "discovery" ? C_SOURCES.includes(it.src) : it.src === f.value;
    case "writer": {
      const w = it.writer;
      if (f.value === "__UNKNOWN__") return !!w && w.state !== "matched";
      const canon = w?.canonical?.display_name || w?.contributor?.display_name;
      return canon === f.value || it.rawAuthor === f.value;
    }
    default: return true;
  }
}
// פילטר פעיל אחד + ניקוי. כל badge/מונה מגדיר אותו; הרשימות מסתננות מולו.
function FilterBar({ filter, onClear }) {
  if (!filter) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "2px 0" }}>
      <span style={{ color: C.faint, fontSize: 11 }}>🔎 פילטר פעיל:</span>
      <span style={{ ...pill(filter.color || C.goldBright), fontWeight: 800 }}>{filter.label || `${filter.type}: ${filter.value}`}</span>
      <button onClick={onClear} style={chip(false)}>✕ נקה</button>
    </div>
  );
}
const Field = ({ k, v }) => (
  <div style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ color: C.faint, minWidth: 108 }}>{k}</span>
    <span style={{ color: C.goldLight, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{v}</span>
  </div>
);
function whyTier(it) {
  switch (it.tier?.key) {
    case "RAW": return "channel_updates / חומר-מקור";
    case "VAULT": return it.status === "candidate" ? "research_objects.status=candidate" : "מועמד / לא-מקושר-לגרף";
    case "CORE": return "מקושר-לגרף / visibility_tier=1";
    case "CANONICAL": return "approved / published";
    default: return "—";
  }
}
// 🗂️ Row Detail/Action Panel חכם — הפעולות משתנות לפי סוג-החומר (לא 20 כפתורים בשורה).
function DetailPanel({ item, onClose, onFilter }) {
  if (!item) return null;
  const w = item.writer;
  const canon = w?.canonical?.display_name || w?.contributor?.display_name;
  const slug = w?.canonical?.slug || w?.contributor?.slug;
  const v = (item.values && item.values.length ? item.values[0] : item.value);
  const idText = w?.state === "matched" ? `✓ ${canon}`
    : w?.state === "ambiguous" ? `⚠️ כמה התאמות: ${(w.candidates || []).map(c => c.display_name).join(" / ")}`
    : `❔ לא-מזוהה: «${w?.raw || item.rawAuthor || "—"}»`;
  const go = (f) => { onFilter && onFilter(f); onClose && onClose(); };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 5000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "6vh 12px", overflow: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...box, maxWidth: 560, width: "100%", background: C.surface || C.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <TierBadge tier={item.tier} />
          <span style={pill(C.goldBright)}>{item.source}</span>
          <span style={{ color: C.faint, fontSize: 11 }}>{fmt(item.ts)}</span>
          <button onClick={onClose} style={{ ...chip(false), marginInlineStart: "auto" }}>✕ סגור</button>
        </div>
        <div style={{ color: C.goldLight, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", marginBottom: 10 }}>
          {item.raw || <span style={{ color: C.faint }}>(ללא טקסט)</span>}
        </div>
        <Field k="מקור (provenance)" v={`${item.source}${item.rawAuthor ? ` · «${item.rawAuthor}»` : ""}`} />
        <Field k="רובד" v={item.tier ? `${item.tier.he} · ${item.tier.key}` : "—"} />
        <Field k="זהות-כתב" v={idText} />
        {w?.mergedFrom && <Field k="אליאס" v={`«${w.raw}» → ${canon}`} />}
        <Field k="מספרים/ערכים" v={item.values?.length ? item.values.join(" · ") : (v ?? "—")} />
        <Field k="אימות" v={item.engineVerified ? "✔ אומת במנוע (חישובי — לא אישור-אנושי)" : "—"} />
        <Field k="סטטוס" v={item.status || (item.published ? "פורסם" : "—")} />
        <Field k="קשרים" v={item.inGraph ? "מחובר-לגרף" : (item.hasCross ? "הצלבת-שיטות" : "—")} />
        <div style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>
          למה רובד «{item.tier?.he}»: {whyTier(item)}. <b>engine_verified ≠ Human-approved · Claim ≠ Fact.</b>
        </div>
        {/* פעולות-ניווט (עובדות בפאזה 1) — משתנות לפי סוג-החומר */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {v != null && <Link to={`/number/${v}`} style={{ ...pill(C.gold), textDecoration: "none" }}>🔢 דף-מספר {v}</Link>}
          {slug && <Link to={`/community/researcher/${slug}`} style={{ ...pill("#b08bd8"), textDecoration: "none" }}>👤 דף-כתב</Link>}
          {item.link && <Link to={item.link} style={{ ...pill(C.muted), textDecoration: "none" }}>📄 לפוסט</Link>}
          {canon && <span onClick={() => go({ type: "writer", value: canon, label: "כתב: " + canon, color: "#b08bd8" })} style={{ ...pill("#b08bd8"), cursor: "pointer" }}>🔎 כל חומר-הכתב</span>}
          {item.tier && <span onClick={() => go({ type: "tier", value: item.tier.key, label: "רובד: " + item.tier.he, color: item.tier.color })} style={{ ...pill(item.tier.color), cursor: "pointer" }}>🔎 כל רובד {item.tier.he}</span>}
          {w && w.state !== "matched" && <span onClick={() => go({ type: "writer", value: "__UNKNOWN__", label: "זהות: לא-מזוהה", color: "#8a8a95" })} style={{ ...pill("#8a8a95"), cursor: "pointer" }}>🔎 כל ה-UNKNOWN</span>}
        </div>
        <div style={{ color: C.faint, fontSize: 10.5, marginTop: 10, borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}>
          פעולות-עבודה (שיפוט · קדם→גרף · <b>למד-זהות</b> · סווג · העדפה) = <b>פאזה 3</b> (Human-Gate של צוריאל). כאן פאזה-1: ניווט וחקירה בלבד — אפס WRITE.
        </div>
      </div>
    </div>
  );
}

export default function WarRoomTab() {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState("now");        // now | treasure
  const [lens, setLens] = useState("writers");    // writers | groups | language | candidates
  const [writer, setWriter] = useState(WRITERS[0]);
  const [groupSel, setGroupSel] = useState(null);
  const [focusN, setFocusN] = useState(null);
  const [filter, setFilter] = useState(null);     // CC-1.3 · פילטר-חי אחד (tier/flag/kind/writer/src)
  const [detail, setDetail] = useState(null);     // CC-1.3 · פריט פתוח ב-Detail Panel

  const [incoming, setIncoming] = useState([]);
  const [hot, setHot] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [liveA, setLiveA] = useState([]);          // צינור A — ערוצי-שידור חיים (channel_updates)
  const [bDormant, setBDormant] = useState(null);   // צינור B — {enabled,total} (רדום)
  const [writerIdx, setWriterIdx] = useState(null); // CC-1.2 · אינדקס-זהות (contributors) ל-resolver
  const [groups, setGroups] = useState([]);
  const [writerItems, setWriterItems] = useState([]);
  const [groupItems, setGroupItems] = useState([]);
  const [langLinks, setLangLinks] = useState([]);
  const [langStats, setLangStats] = useState({});
  const [busy, setBusy] = useState(false);

  const loadNow = useCallback(async () => {
    setBusy(true);
    const [forum, wa, posts, hn, feed, groups, contribs] = await Promise.all([
      getForumMaterial({ limit: 40 }), getWaLog({ limit: 40 }),
      getPostsFromSupabase({ limit: 12 }), getHotNumbers(30, 12),
      getResearchFeed({ status: "candidate", limit: 120 }), getWaGroups(),
      getContributorsIndex(),
    ]);
    // CC-1.2 · אינדקס-זהות (contributors + wa_names + merged_into) — נבנה פעם, קורא-בלבד.
    const widx = buildWriterIndex(contribs || []);
    setWriterIdx(widx);
    const withWriter = (it) => ({ ...it, writer: resolveWriter(it.rawAuthor, widx) });
    const merged = [
      ...(forum || []).map(normForum), ...(wa || []).map(normWa), ...((posts?.posts) || []).map(normPost),
    ].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 60);
    // A · ערוצי-שידור החיים — reuse של getChannelUpdates לכל אחד מ-4 המקורות (status='live').
    const chArr = await Promise.all(A_CHANNELS.map(([ch, lbl]) =>
      getChannelUpdates(25, ch, true).then(r => (r || []).map(x => normChannel(x, lbl))).catch(() => [])));
    const aMerged = classifyIngest(chArr.flat().sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))).map(withWriter);
    setLiveA(aMerged);
    setBDormant({ total: (groups || []).length, enabled: (groups || []).filter(g => g.enabled).length });
    setIncoming(merged); setHot(hn || []); setCandidates((feed || []).map(normCandidate).map(withWriter));
    setBusy(false);
  }, []);

  const loadWriter = useCallback(async (name) => {
    setBusy(true);
    const [forum, posts, wa] = await Promise.all([
      getForumMaterial({ author: name, limit: 80 }),
      getPostsFromSupabase({ author: name, limit: 40 }),
      getWaLog({ sender: name.split(" ")[0], limit: 40 }),
    ]);
    const items = [...(forum || []).map(normForum), ...((posts?.posts) || []).map(normPost), ...(wa || []).map(normWa)]
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    setWriterItems(items); setBusy(false);
  }, []);

  const loadGroup = useCallback(async (gid) => {
    setBusy(true);
    const wa = await getWaLog({ group: gid, limit: 80 });
    setGroupItems((wa || []).map(normWa)); setBusy(false);
  }, []);

  const loadLanguage = useCallback(async () => {
    setBusy(true);
    const [links, stats] = await Promise.all([getLanguageLinks(200), getLanguageStats()]);
    setLangLinks(links || []); setLangStats(stats || {}); setBusy(false);
  }, []);

  useEffect(() => { if (mode === "now") loadNow(); }, [mode, loadNow]);
  // אינדקס-זהות זמין בשני המצבים (Writer OS צריך אותו גם ב-treasure).
  useEffect(() => { if (!writerIdx) getContributorsIndex().then(rows => setWriterIdx(buildWriterIndex(rows || []))).catch(() => {}); }, [writerIdx]);
  useEffect(() => { if (mode === "treasure") getWaGroups().then(setGroups); }, [mode]);
  useEffect(() => { if (mode === "treasure" && lens === "writers") loadWriter(writer); }, [mode, lens, writer, loadWriter]);
  useEffect(() => { if (mode === "treasure" && lens === "groups" && groupSel) loadGroup(groupSel); }, [mode, lens, groupSel, loadGroup]);
  useEffect(() => { if (mode === "treasure" && lens === "language") loadLanguage(); }, [mode, lens, loadLanguage]);

  // צינור C — מועמדי-מנוע בלבד (discovery-engine…), מופרד מ-wa-raziel של צינור B.
  const discoveryC = useMemo(() => (candidates || []).filter(c => C_SOURCES.includes(c.src)), [candidates]);
  // CC-1.3 · רשימות מסוננות מול הפילטר הפעיל (Rank-Don't-Hide: פילטר=מיקוד, לא מחיקה).
  const liveAf = useMemo(() => (liveA || []).filter(it => matchesFilter(it, filter)), [liveA, filter]);
  const candF = useMemo(() => (candidates || []).filter(c => matchesFilter(c, filter)), [candidates, filter]);

  if (!isAdmin) return <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>אין לך הרשאת ניהול.</div>;

  const langByRel = useMemo(() => {
    const g = { shared_value: [], translation: [], transliteration: [], other: [] };
    (langLinks || []).forEach(l => (g[l.relationship_type] || g.other).push(l));
    return g;
  }, [langLinks]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
      {/* סרגל-על */}
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 18, fontWeight: 900 }}>🎛️ חדר המפקדה</div>
        <span style={{ color: C.muted, fontSize: 11.5 }}>המנוע מציג — אתה בוחר · שער=החלטה לא ראות</span>
        <div style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}>
          <button style={chip(mode === "now")} onClick={() => setMode("now")}>🔴 עכשיו</button>
          <button style={chip(mode === "treasure")} onClick={() => setMode("treasure")}>🗂️ כל האוצר</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10.5 }}>
        <span style={pill("#e0563a")}>HOT ≠ TRUE</span><span style={pill("#b08bd8")}>VIP ≠ TRUE</span>
        <span style={pill("#e0913a")}>Claim ≠ Fact</span><span style={pill(C.muted)}>Interpretation ≠ Fact</span>
        <span style={{ color: C.faint, fontSize: 11 }}>· 🟢 הושלם · 🟡 חלקי · ⚪ לא-נבדק · 🔴 נעצר</span>
      </div>

      {/* מטטרון — פס תמונת-על */}
      <div style={{ ...box, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>🕸️ מטטרון</span>
        <span style={{ color: C.muted, fontSize: 12 }}>מועמדים ממתינים: <b style={{ color: C.goldLight }}>{candidates.length}</b></span>
        <span style={{ color: C.muted, fontSize: 12 }}>🔥 מתעורר: {(hot || []).slice(0, 8).map(h => <b key={h.n} style={{ color: C.goldLight, cursor: "pointer", marginInlineEnd: 6 }} onClick={() => setFocusN(h.n)}>{h.n}</b>)}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>(חם = אות, לא אמת)</span>
      </div>

      {mode === "now" && (
       <>
        {/* CC-1.1 · קליטה חיה — שלושת הצינורות מופרדים (READ-ONLY, בלי feeder) */}
        <div style={box}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📡 קליטה חיה (LIVE INGESTION)</span>
            <span style={{ color: C.faint, fontSize: 11 }}>שלושה צינורות · לחיץ · תצוגה-בלבד (לא feeder, לא WRITE) {busy && "…"}</span>
          </div>
          <FilterBar filter={filter} onClear={() => setFilter(null)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 8 }}>
            <div onClick={() => setFilter({ type: "tier", value: "RAW", label: "רובד: מקור (RAW)", color: "#8a8a95" })}
              style={{ ...box, borderColor: "#4caf7d55", cursor: "pointer" }} title="סנן לחומר-A (RAW)">
              <div style={{ color: "#4caf7d", fontFamily: F.heading, fontWeight: 800 }}>🟢 LIVE · צינור A</div>
              <div style={{ color: C.muted, fontSize: 11, margin: "3px 0" }}>ערוצי-שידור (WhatsApp) → channel_updates</div>
              <div style={{ color: C.goldLight, fontSize: 22, fontWeight: 900, fontFamily: F.heading }}>{liveA.length}</div>
              <div style={{ color: C.faint, fontSize: 10.5 }}>חי · מגיע לאתר · <b style={{ color: "#e0563a" }}>טרם-במנוע</b></div>
            </div>
            <div onClick={() => setFilter({ type: "src", value: "discovery", label: "צינור C · Discovery", color: "#3ea6ff" })}
              style={{ ...box, borderColor: "#3ea6ff55", cursor: "pointer" }} title="סנן למועמדי-מנוע (C)">
              <div style={{ color: "#3ea6ff", fontFamily: F.heading, fontWeight: 800 }}>🔵 DISCOVERY · צינור C</div>
              <div style={{ color: C.muted, fontSize: 11, margin: "3px 0" }}>מנוע-הגילויים → research_objects</div>
              <div style={{ color: C.goldLight, fontSize: 22, fontWeight: 900, fontFamily: F.heading }}>{discoveryC.length}</div>
              <div style={{ color: C.faint, fontSize: 10.5 }}>הגיע למנוע · ממתין לשער-אנושי</div>
            </div>
            <div style={{ ...box, borderColor: "#e0563a55" }} title="מקור רדום — אין תור לעבודה">
              <div style={{ color: "#e0563a", fontFamily: F.heading, fontWeight: 800 }}>🔴 DORMANT · צינור B</div>
              <div style={{ color: C.muted, fontSize: 11, margin: "3px 0" }}>רזיאל/VIP → wa_bot_log</div>
              <div style={{ color: C.goldLight, fontSize: 22, fontWeight: 900, fontFamily: F.heading }}>{bDormant ? `${bDormant.enabled}/${bDormant.total}` : "—"}</div>
              <div style={{ color: C.faint, fontSize: 10.5 }}>כבוי · לא מזין כרגע</div>
            </div>
          </div>
          {/* פיד צינור A — חדש/קיים/כפול (ככל שניתן לקבוע מנתונים קיימים) */}
          <div style={{ marginTop: 12, display: "grid", gap: 2 }}>
            <div style={{ color: "#4caf7d", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, marginBottom: 4 }}>
              🟢 חומר-A שנכנס (חדש/קיים/כפול):
            </div>
            {liveAf.length ? liveAf.slice(0, 20).map(it => <IngestRow key={it.key} item={it} onOpen={setDetail} onFilter={setFilter} />)
              : <div style={{ color: C.muted, fontSize: 12 }}>{busy ? "טוען…" : (filter ? "אין חומר-A תואם לפילטר." : "אין חומר-A חי כרגע (status='live').")}</div>}
            {liveAf.length > 20 && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>מוצגים 20 מתוך {liveAf.length}{filter ? " (מסונן)" : ""}.</div>}
          </div>
          {/* CC-1.2 · מקרא-רבדים (Tier Lens) — ניווט בלבד, נגזר מהסטטוס הקיים */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <span style={{ color: C.faint, fontSize: 10.5 }}>רבדים (לחיץ):</span>
            {Object.values(TIER).sort((a, b) => a.order - b.order).map(t => (
              <span key={t.key} onClick={() => setFilter({ type: "tier", value: t.key, label: "רובד: " + t.he, color: t.color })}
                style={{ ...pill(t.color), fontWeight: 800, cursor: "pointer" }} title={`סנן לרובד ${t.he}`}>{t.he} · {t.key}</span>
            ))}
          </div>
          <div style={{ color: C.faint, fontSize: 10.5, marginTop: 8, lineHeight: 1.6 }}>
            ⛔ תצוגה בלבד: אף פריט לא נכתב ל-research_objects · צינור A אינו מחובר למנוע (0 קשרים) · «חדש/קיים/כפול» נקבע מנתונים קיימים בלבד (link_url + טקסט חוזר), לא ממנוע · הרובד = ניווט הנגזר מהסטטוס הקיים (לא משנה verified/candidate/approved/canonical) · זהות = resolver קורא-בלבד, אין בחירה-אוטומטית ואין מיזוג-אליאס.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)", gap: 14 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>🔴 נכנס עכשיו (פורום·פוסטים·WhatsApp-לוג) {busy && "…"}</div>
            {incoming.length ? incoming.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
              : <div style={{ color: C.muted, fontSize: 13 }}>אין חומר טרי כרגע.</div>}
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <RazielPanel focusN={focusN} />
            <div style={box}>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, marginBottom: 8 }}>
                ⚖️ ממתין לשיפוט <span style={{ color: C.faint, fontSize: 11, fontWeight: 400 }}>({candF.length}{filter ? " מסונן" : ""})</span>
              </div>
              {candF.slice(0, 10).map(c => (
                <div key={c.key} onClick={() => setDetail(c)} title="פתח פרטים ופעולות"
                  style={{ borderBottom: `1px solid ${C.border}`, padding: "6px 0", fontSize: 12.5, color: C.goldLight, cursor: "pointer" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                    <TierBadge tier={c.tier} onClick={() => setFilter({ type: "tier", value: c.tier?.key, label: "רובד: " + c.tier?.he, color: c.tier?.color })} />
                    <span onClick={e => { e.stopPropagation(); setFilter({ type: "kind", value: c.kind, label: "סוג: " + c.kind, color: c.kind === "relation" ? "#3ea6ff" : "#4caf7d" }); }}
                      style={{ ...pill(c.kind === "relation" ? "#3ea6ff" : "#4caf7d"), cursor: "pointer" }} title="סנן לפי סוג">{c.kind}</span>
                    {c.value ? <Link to={`/number/${c.value}`} onClick={e => e.stopPropagation()} style={{ color: C.goldBright }}>{c.value}</Link> : null}
                    <WriterChip writer={c.writer} />
                  </div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{c.raw.slice(0, 60)}</div>
                </div>
              ))}
              {!candF.length && <div style={{ color: C.muted, fontSize: 12 }}>{filter ? "אין מועמדים תואמים לפילטר." : "אין מועמדים. התור נקי ✓"}</div>}
            </div>
          </div>
        </div>
       </>
      )}

      {mode === "treasure" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["writers", "👤 כתבים"], ["groups", "📱 קבוצות"], ["language", "🌍 שפות/אנגלית"], ["candidates", "⚖️ מועמדים"]].map(([k, l]) => (
              <button key={k} style={chip(lens === k)} onClick={() => setLens(k)}>{l}</button>
            ))}
          </div>

          {lens === "writers" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {WRITERS.map(w => <button key={w} style={chip(writer === w, "#b08bd8")} onClick={() => setWriter(w)}>{w}</button>)}
              </div>
              {/* CC-1.4 · Writer Research OS — שכבה אחת reusable לכל contributor */}
              {(() => {
                const wr = writerIdx ? resolveWriter(writer, writerIdx) : null;
                const wc = wr?.canonical || wr?.contributor || null;
                if (!writerIdx) return <div style={{ color: C.muted, fontSize: 12 }}>טוען אינדקס-כתבים…</div>;
                if (!wc) return <div style={{ color: C.muted, fontSize: 13 }}>«{writer}» לא נמצא ב-contributors (אין דף-כתב עדיין).</div>;
                return <WriterOS contributor={wc} writerIndex={writerIdx} />;
              })()}
            </div>
          )}

          {lens === "groups" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {groups.map(g => (
                  <button key={g.group_id} style={chip(groupSel === g.group_id, g.enabled ? "#4caf7d" : "#e0563a")} onClick={() => setGroupSel(g.group_id)}>
                    {g.group_id.replace(/@g\.us$/, "").slice(-6)} {g.enabled ? "🟢" : "🔴 כבוי"}
                  </button>
                ))}
              </div>
              {groups.every(g => !g.enabled) && <div style={pill("#e0563a")}>⚠️ כל הקבוצות כבויות — מקור רדום, לא מזין כרגע</div>}
              {groupItems.length ? groupItems.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>{groupSel ? "אין הודעות לקבוצה זו." : "בחר קבוצה."}</div>}
            </div>
          )}

          {lens === "language" && <LanguageZone byRel={langByRel} stats={langStats} busy={busy} />}

          {lens === "candidates" && (
            <div style={{ display: "grid", gap: 10 }}>
              {candidates.length ? candidates.map(c => <ItemCard key={c.key} item={c} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>אין מועמדים ({busy ? "טוען…" : "רענן במצב עכשיו"}).</div>}
            </div>
          )}
        </div>
      )}

      {/* CC-1.3 · Row Detail/Action Panel — נפתח מכל שורה/פריט. ניווט+חקירה בלבד (פאזה 1). */}
      {detail && <DetailPanel item={detail} onClose={() => setDetail(null)} onFilter={setFilter} />}
    </div>
  );
}

// 🤖 רזיאל — שכבת-הבנה (לא שופט). משתמש ב-AiAnalyze הקנוני.
function RazielPanel({ focusN }) {
  return (
    <div style={box}>
      <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, marginBottom: 6 }}>🤖 רזיאל · הבנה</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
        {focusN ? `מספר במוקד: ${focusN} — בקש ניתוח כדי לראות תבניות אפשריות.` : "בחר מספר (מהחם/מהכרטיסים) לניתוח."}
      </div>
      {focusN != null && (
        <AiAnalyze kind="research" subject={`מספר ${focusN}`} facts={`ניתוח כיווני-מחקר אפשריים סביב המספר ${focusN} — עובדות-מנוע בלבד, הפרד עובדה מפרשנות.`} label="🤖 3 כיוונים אפשריים" compact />
      )}
      <div style={{ color: C.faint, fontSize: 10.5, marginTop: 8 }}>«אני רואה תבנית מעניינת» — לא «זו אמת».</div>
    </div>
  );
}

// 🌍 שכבת השפות/אנגלית — תצוגה ויזואלית מובחנת (§14.2).
function LanguageZone({ byRel, stats, busy }) {
  const Group = ({ title, col, items }) => (
    <div style={box}>
      <div style={{ color: col, fontFamily: F.heading, fontWeight: 800, marginBottom: 6 }}>{title} · {items.length}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.length ? items.map((l, i) => (
          <span key={i} style={{ fontSize: 12, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 8px" }}>
            {l.hebrew} ↔ {l.foreign_word} <b style={{ color: col }}>{l.gematria_he}</b>{l.human_verified ? " ✔" : ""}
          </span>
        )) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
      </div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: C.faint, fontSize: 11.5 }}>🌍 שכבת-השפות · <b>תרגום ≠ תעתיק ≠ ערך-משותף ≠ משמעות</b> {busy && "…"}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={pill("#4caf7d")}>ערך-משותף {byRel.shared_value.length}</span>
        <span style={pill("#3ea6ff")}>תרגום {byRel.translation.length}</span>
        <span style={pill("#e0913a")}>תעתיק {byRel.transliteration.length}</span>
        <span style={pill(C.muted)}>🔵 תעתיקים-ממתינים (לא-נסקרו): {stats.translitOpen ?? "—"}</span>
        <span style={pill(C.faint)}>כיול-חוצה-שפות (21K · server-only)</span>
        {stats.en && <span style={pill("#3ea6ff")}>אנגלית: מאושר {stats.en.en_approved ?? "—"} · ממתין {stats.en.en_pending ?? "—"}</span>}
      </div>
      <Group title={`${langRelLabel("shared_value")} (Hebrew↔English)`} col="#4caf7d" items={byRel.shared_value} />
      <Group title={langRelLabel("translation")} col="#3ea6ff" items={byRel.translation} />
      <Group title={langRelLabel("transliteration")} col="#e0913a" items={byRel.transliteration} />
      <div style={{ ...box, borderColor: "#e0563a55" }}>
        <div style={{ color: "#e0563a", fontFamily: F.heading, fontWeight: 800, marginBottom: 4 }}>🔴 מחוץ למערכת-השפות</div>
        <div style={{ color: C.muted, fontSize: 12.5 }}>חומר he+en מ-WhatsApp (למשל dream/imagine) מזוהה אך <b>לא-עובר</b> למערכת-השפות · 233 תעתיקים פתוחים · 21K כיול לא-מנוצל. הזדמנות-הרחבה (לא ב-CC-1).</div>
      </div>
    </div>
  );
}
