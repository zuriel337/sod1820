// 🎛️ חדר המפקדה (CC-1) — View קורא-בלבד על כל האוצר (לא רק Discovery).
// חוקי-ברזל (§13.8): אין WRITE · אין קידום · אין engine · אין שינוי EntityPage/גרף.
// שער=החלטה-לא-ראות (§11.34): חומר שלפני research_objects נראה כאן. HOT≠TRUE · VIP≠TRUE · Claim≠Fact.
// כל הנתונים מ-helpers קיימים בלבד (reuse-first). מסלול-החומר מראה «איפה נעצר».
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  getResearchFeed, getWaGroups, getWaLog, getForumMaterial,
  getLanguageLinks, getLanguageStats, getHotNumbers, getPostsFromSupabase,
  getChannelUpdates, getContributorsIndex, dbFirstLookup, getWriterVerifiedClaims,
} from "../lib/supabase.js";
import { buildMethodProfile, analyzeFull } from "../lib/analysisFlow.js";
import { buildWriterIndex, resolveWriter, WRITER_STATE } from "../lib/writers.js";
import {
  materialTrack, MATERIAL_STAGES, TRACK_COLOR, TRACK_LABEL, langRelLabel,
  tierOf, TIER,
} from "../lib/discovery.js";
import { PaletteProvider, PALETTES } from "../lib/palette.js";
import { getHandledMap, markHandled, unmarkHandled } from "../lib/handled.js";
import {
  CORE_WRITERS, orderWriters, ROUTES, destinations, fallbackTier,
  normStatus, statusOptions, structuralExtract, actionState, ACT_STATE, whatMissing, sortItems,
} from "../lib/ccwork.js";
import AiAnalyze from "./AiAnalyze.jsx";
import WriterOS from "./WriterOS.jsx";

// 🏙️ עור «היכל» בהיר (research_workspace_law + city_background_dual_theme_law) — חדר המפקדה
// מרונדר בשפה הבהירה-נקייה של סביבת-המחקר (כרטיסים לבנים, אקסנט-כחול, נגיעת-זהב), מעל רקע-העיר.
// מיפוי סמנטי: אותם מפתחות שהקוד כבר משתמש בהם (surface/border/gold*/muted/faint) → ערכי-היכל בהירים,
// כך שכל הרכיבים הופכים בהירים בבת-אחת בלי לגעת בכל שורה. ⛔ scoped לטאב בלבד — לא נוגע בעיצוב-האתר.
const C = {
  surface: "#ffffff", surface2: "#ffffff", card: "#ffffff",
  border: "#dbe1ea",
  goldBright: "#1c4bbf",   // אקסנט-היכל (כחול קריא) — כותרות/הדגשות/ערכים
  gold: "#2f6df6",         // אקסנט-כחול
  goldLight: "#1b1d22",    // טקסט ראשי כהה (קריא על בהיר)
  muted: "#5b6472",        // טקסט משני
  faint: "#8a93a3",        // טקסט עמום
};

// 📱 זיהוי מסך-צר (מובייל) — לפריסה רספונסיבית בלי media-query ב-inline styles.
function useNarrow(bp = 760) {
  const [n, setN] = useState(typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = () => setN(window.innerWidth < bp);
    f(); window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [bp]);
  return n;
}

// היררכיית-כתבים (תצוגה בלבד — לא קנוני): מרכזיים ראשונים, שאר-המקורות אחריהם.
const WRITERS = CORE_WRITERS;
// תוויות-פאסטים לתצוגה ב-FilterBar (מפתח-סינון → עברית).
const FACET_HE = { writer: "כתב", status: "סטטוס", method: "שיטה", dest: "יעד", tier: "רובד", flag: "סוג", kind: "סוג-מועמד", src: "צינור", srckind: "סוג-מקור", hasnum: "מכיל מספר", hasgem: "מכיל גימטריה", hasimg: "מכיל תמונה", engine: "נותח", judging: "לשיפוט", from: "מ-", to: "עד" };
const SRCKIND_HE = { post: "📄 פוסט", comment: "💬 תגובה", channel: "📡 ערוץ", finding: "🔬 ממצא", wa: "🟢 וואטסאפ" };

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
    key: "c:" + r.id, source: "תגובה", srckind: "comment", author: r.author_name || "—", ts: r.created_at,
    raw: (r.body || r.title || "").trim(), lang: null, img: r.image_url || null,
    engineVerified: ci.verified, values: ci.values, hasCross: ci.cross,
    inFeed: false, inGraph: !!r.graph_node_id, published: r.status === "published",
    value: null, target: r.target_type,
  };
}
function normWa(r) {
  const act = r.action || "";
  return {
    key: "w:" + (r.group_id || "") + ":" + (r.created_at || "") + ":" + (r.sender_name || ""),
    source: "WhatsApp", srckind: "wa", author: r.sender_name || "—", group: r.group_id, ts: r.created_at,
    raw: (r.text_in || "").trim(), lang: null, img: r.image_url || null,
    engineVerified: r.value != null, values: r.value != null ? [r.value] : [], hasCross: false,
    inFeed: false, inGraph: false, published: /saved|channel|vip/.test(act),
    value: r.value,
  };
}
function normPost(r) {
  const t = r.title?.rendered || r.title || "";
  return {
    key: "p:" + (r.slug || r.id), source: "פוסט", srckind: "post", author: r.author || "המערכת", ts: r.date,
    raw: String(t).replace(/<[^>]+>/g, "").trim(), lang: null, img: r.image_url || null,
    engineVerified: false, values: [], hasCross: false,
    inFeed: false, inGraph: false, published: true, value: null, link: r.link || (r.slug ? "/" + r.slug : null),
  };
}
function normCandidate(r) {
  return {
    key: "r:" + r.id, source: "מנוע", srckind: "finding", author: r.contributor || "מנוע-הגילויים", ts: r.created_at,
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
    key: "ch:" + r.id, source: "ערוץ · " + (chLabel || r.channel || "—"), srckind: "channel", author: r.credit || "—",
    ts: r.created_at, raw: t, channel: r.channel, link: r.link_url || null, img: r.image_url || null,
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
      <span style={{ color: C.muted, fontSize: 10.5, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }} title={`מזוהה: ${canon}`}>
        <span style={{ color: st.c }}>✓</span> {canon}
        {writer.mergedFrom && (
          <span style={{ color: C.faint }} title={`ממוזג מ: ${writer.mergedFrom.display_name}`}> ⟵ «{writer.raw}»</span>
        )}
      </span>
    );
  }
  return (
    <span style={{ color: C.faint, fontSize: 10.5, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
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

// שורת-קליטה. CC-1.3: לחיצה → Detail Panel · תג-רובד/flag → פילטר · ✔ סגור-מהתור / ↩︎ החזר · תווית מי→מה→שיטה→סטטוס→יעד→חסר.
function IngestRow({ item, onOpen, onFilter, selected, onToggle, onClose, onUnclose }) {
  const f = INGEST_FLAG[item.flag] || INGEST_FLAG.new;
  const closeBtn = item.handled
    ? (onUnclose && <button onClick={e => { e.stopPropagation(); onUnclose(item); }} style={{ ...chip(false, "#e0913a"), padding: "2px 9px", flex: "none" }} title="החזר לתור">↩︎</button>)
    : (onClose && <button onClick={e => { e.stopPropagation(); onClose(item); }} style={{ ...chip(false, "#4caf7d"), padding: "2px 9px", flex: "none" }} title="סגור מהתור">✔</button>);
  return (
    <div onClick={() => onOpen && onOpen(item)} title="פתח פרטים ופעולות"
      style={{ borderBottom: `1px solid ${C.border}`, padding: "7px 0", cursor: "pointer", opacity: item.handled ? 0.55 : 1, minWidth: 0, overflow: "hidden" }}>
      {/* שורה 1 — בחירה · טקסט · סגור (הטקסט מתכווץ עם ellipsis, לא דוחף מעבר לרוחב) */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
        {onToggle && <input type="checkbox" checked={!!selected} onClick={e => e.stopPropagation()} onChange={() => onToggle(item.key)} style={{ cursor: "pointer", flex: "none" }} />}
        <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.raw ? item.raw.trim() : <span style={{ color: C.faint }}>(ללא טקסט)</span>}
        </span>
        {closeBtn}
      </div>
      {/* שורה 2 — תגיות (נשברות נקי) */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
        <TierBadge tier={item.tier} onClick={onFilter ? () => onFilter({ type: "tier", value: item.tier?.key }) : undefined} />
        <span onClick={onFilter ? (e => { e.stopPropagation(); onFilter({ type: "flag", value: item.flag }); }) : undefined}
          style={{ ...pill(f.c), cursor: onFilter ? "pointer" : "default" }} title={onFilter ? "סנן לפי סוג" : undefined}>{f.t}</span>
        {item.handled && <span style={pill("#8a8a95")} title={`טופל · ${item.handledMeta?.reason || "—"}${item.handledMeta?.at ? " · " + fmt(item.handledMeta.at) : ""}`}>✅ {item.handledMeta?.reason || "טופל"}</span>}
        <span style={{ color: C.muted, fontFamily: F.heading, fontWeight: 700, fontSize: 10.5, whiteSpace: "nowrap" }}>{item.source}</span>
        <span style={{ color: C.faint, fontSize: 10, whiteSpace: "nowrap" }}>{fmt(item.ts)}</span>
        <WriterChip writer={item.writer} />
      </div>
      <RowSummary item={item} />
    </div>
  );
}

// ── CC-1.3 · פאזה 1 — Clickable-everything + Row Action Panel + פילטרים-חיים (READ/navigation בלבד) ──
// ⛔ אין WRITE: פעולות-עבודה (שיפוט/קידום/למד) = פאזה 3. כאן ניווט + חקירה + פילטר בלבד.
// CC-1.3 · סינון-עבודה רב-ממדי (כתב · סטטוס · שיטה · יעד · טווח-תאריכים · רובד/סוג/צינור).
// כל facet אופציונלי; פריט עובר רק אם עומד בכל ה-facets הפעילים (Rank-Don't-Hide: מיקוד, לא מחיקה).
// 👑 ZURIEL / 1237 — מקור-ראשי/מערכתי, לא כתב חיצוני רגיל. סיווג-תצוגה בלבד (לא בעלות/פרטיות/routing).
const ZURIEL_KEYS = ["1237", "צוריאל", "zuriel", "כי לה' המלוכה", "מערכת כי לה' המלוכה", "מערכת «כי לה' המלוכה»"];
function isZuriel(it) {
  const a = String(it?.rawAuthor || it?.author || "").trim().toLowerCase();
  const w = it?.writer; const canon = String(w?.canonical?.display_name || w?.contributor?.display_name || "").toLowerCase();
  if (/\b1237\b/.test(a)) return true;
  return ZURIEL_KEYS.some(k => { const kk = k.toLowerCase(); return a === kk || canon === kk || a.includes("כי לה' המלוכה"); });
}
// גזירות-תצוגה טהורות (אין DB): מכיל-מספר · מכיל-טענת-גימטריה · מכיל-תמונה.
const hasNum = (it) => it?.value != null || (it?.values && it.values.length > 0) || /(?<![\d=])\b\d{2,5}\b/.test(it?.raw || "");
const hasGem = (it) => it?.engineVerified === true || it?.hasCross === true || /[א-ת][^=\n]{0,40}=\s*\d/.test(it?.raw || "") || /\d{2,5}\s*=\s*[א-ת]/.test(it?.raw || "");
const hasImg = (it) => !!it?.img || /https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)/i.test(it?.raw || "");

function matchesFilters(it, f) {
  if (!f) return true;
  const w = it.writer;
  const canon = w?.canonical?.display_name || w?.contributor?.display_name;
  if (f.writer) {
    if (f.writer === "__ZURIEL__") { if (!isZuriel(it)) return false; }
    else if (f.writer === "__UNKNOWN__") { if (isZuriel(it) || !(w && w.state !== "matched")) return false; }
    else if (!(canon === f.writer || it.rawAuthor === f.writer || it.author === f.writer)) return false;
  }
  if (f.tier && it.tier?.key !== f.tier) return false;
  if (f.srckind && it.srckind !== f.srckind) return false;
  if (f.flag && it.flag !== f.flag) return false;
  if (f.kind && it.kind !== f.kind) return false;
  if (f.src) { const ok = f.src === "discovery" ? C_SOURCES.includes(it.src) : it.src === f.src; if (!ok) return false; }
  if (f.status && normStatus(it).key !== f.status) return false;
  if (f.dest && !destinations(it).includes(f.dest)) return false;
  if (f.method) { if (f.method === "__STRUCT__") { if (!structuralExtract(it.raw)) return false; } else if ((it.method || "") !== f.method) return false; }
  if (f.hasnum && !hasNum(it)) return false;
  if (f.hasgem && !hasGem(it)) return false;
  if (f.hasimg && !hasImg(it)) return false;
  if (f.engine && it.engineVerified !== true) return false;               // «נותח» = אומת-מנוע (הסיגנל היחיד הקיים)
  if (f.judging && normStatus(it).key !== "candidate") return false;      // «ממתין לשיפוט»
  if (f.from && new Date(it.ts || 0) < new Date(f.from)) return false;
  if (f.to && new Date(it.ts || 0) > new Date(f.to + "T23:59:59")) return false;
  return true;
}
// פאסטים-פעילים כצ'יפים ניתנים-להסרה + ניקוי-כללי.
function FilterBar({ filters, onClear, onRemove }) {
  const keys = Object.keys(filters || {}).filter((k) => filters[k] != null && filters[k] !== "");
  if (!keys.length) return null;
  const label = (k, v) => {
    if (v === true) return FACET_HE[k] || k;                       // צ'יפ-toggle (מכיל-מספר/נותח/…)
    if (k === "srckind") return SRCKIND_HE[v] || v;
    const vv = v === "__UNKNOWN__" ? "לא-מזוהה" : v === "__ZURIEL__" ? "👑 ZURIEL/1237" : v === "__STRUCT__" ? "מבנה" : v;
    return `${FACET_HE[k] || k}: ${vv}`;
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "2px 0" }}>
      <span style={{ color: C.faint, fontSize: 11 }}>🔎 פעיל:</span>
      {keys.map((k) => (
        <span key={k} onClick={() => onRemove(k)} style={{ ...pill(C.goldBright), cursor: "pointer" }} title="הסר פילטר">{label(k, filters[k])} ✕</span>
      ))}
      <button onClick={onClear} style={chip(false)}>נקה הכל</button>
    </div>
  );
}
// שורת-בקרות הסינון (dropdowns) + מיון + «הצג גם שטופלו».
function WorkFilters({ filters, setFilters, sort, setSort, showHandled, setShowHandled, writers, statuses, methods, handledCount }) {
  const set = (k, v) => setFilters((cur) => { const n = { ...cur }; if (!v) delete n[k]; else n[k] = v; return n; });
  const sel = { background: C.surface2, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, fontFamily: F.heading };
  return (
    <div style={{ ...box, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>🎚️ סינון-עבודה</span>
      <select value={filters.writer || ""} onChange={(e) => set("writer", e.target.value)} style={sel}>
        <option value="">כל הכתבים</option>
        <option value="__ZURIEL__">👑 ZURIEL / 1237 (מקור-ראשי)</option>
        {writers.map((w) => <option key={w} value={w}>{w}</option>)}
        <option value="__UNKNOWN__">❔ לא-מזוהה</option>
      </select>
      <select value={filters.status || ""} onChange={(e) => set("status", e.target.value)} style={sel}>
        <option value="">כל הסטטוסים</option>
        {statuses.map((s) => <option key={s.key} value={s.key}>{s.he}</option>)}
      </select>
      <select value={filters.method || ""} onChange={(e) => set("method", e.target.value)} style={sel}>
        <option value="">כל השיטות</option>
        <option value="__STRUCT__">מבנה (ר״ת/ס״ת/נוטריקון)</option>
        {methods.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={filters.dest || ""} onChange={(e) => set("dest", e.target.value)} style={sel}>
        <option value="">כל היעדים</option>
        {["VAULT", "CORE", "Atlas", "שכבת-הציר"].map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <label style={{ color: C.faint, fontSize: 11, display: "inline-flex", gap: 3, alignItems: "center" }}>מ־<input type="date" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} style={sel} /></label>
      <label style={{ color: C.faint, fontSize: 11, display: "inline-flex", gap: 3, alignItems: "center" }}>עד<input type="date" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} style={sel} /></label>
      <select value={sort} onChange={(e) => setSort(e.target.value)} style={sel}>
        <option value="new">מיון: חדש→ישן</option><option value="old">מיון: ישן→חדש</option><option value="value">מיון: ערך↓</option>
      </select>
      <button onClick={() => setShowHandled((v) => !v)} style={chip(showHandled, "#8a8a95")}>{showHandled ? "🙈 הסתר שטופלו" : `👁 הצג גם שטופלו${handledCount ? ` (${handledCount})` : ""}`}</button>
      <button onClick={() => setFilters({})} style={chip(false)}>נקה סינון</button>
      {/* פאסטים-toggle (כבויים כברירת-מחדל — מצמצמים תצוגה, לא מוחקים ולא מסמנים «טופל») */}
      <span style={{ flexBasis: "100%", height: 0 }} />
      <span style={{ color: C.faint, fontSize: 10.5 }}>הצג רק:</span>
      {[["srckind", "post", "📄 פוסט"], ["srckind", "comment", "💬 תגובה"], ["srckind", "channel", "📡 ערוץ"], ["srckind", "finding", "🔬 ממצא"],
        ["hasnum", true, "🔢 מספר"], ["hasgem", true, "🔢 גימטריה"], ["hasimg", true, "🖼️ תמונה"],
        ["engine", true, "🔬 נותח"], ["judging", true, "⚖️ לשיפוט"]].map(([k, v, lbl]) => {
        const active = filters[k] === v;
        return <button key={k + String(v)} onClick={() => set(k, active ? "" : v)} style={chip(active, "#3ea6ff")}>{lbl}</button>;
      })}
    </div>
  );
}
// תווית-שורה אחידה: מי → מה → שיטה → סטטוס → יעד → מה-חסר.
function RowSummary({ item }) {
  const w = item.writer;
  const who = w?.state === "matched" ? (w.canonical?.display_name || w.contributor?.display_name) : (item.rawAuthor || item.author || "—");
  const what = item.source || item.kind || "—";
  const method = item.method || (structuralExtract(item.raw) ? "נוטריקון?" : "—");
  const st = normStatus(item);
  const dests = destinations(item);
  const miss = whatMissing(item);
  const arr = <span style={{ color: C.faint }}> → </span>;
  return (
    <div style={{ fontSize: 10, color: C.faint, marginTop: 3, lineHeight: 1.6, wordBreak: "break-word", width: "100%" }}>
      <b style={{ color: "#b08bd8" }}>{who}</b>{arr}{what}{arr}<span style={{ color: C.muted }}>{method}</span>
      {arr}<span style={{ color: st.c }}>{st.he}</span>{arr}<span style={{ color: "#3ea6ff" }}>{dests.join("·") || "—"}</span>
      {arr}חסר: <span style={{ color: "#e0563a" }}>{miss}</span>
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
// 🔬 «ניתוח מלא» — Orchestration חכם מעל המנועים/DB הקיימים (READ/preview · אין WRITE · אין קידום).
//   מבין את המבנה שהכתב סימן → מציג A-H + דיאגרמת-מבנה + המלצות. הפעולות (לכידה/Atlas/…) = Human-Gate בלמטה.
function FullAnalysis({ item }) {
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = useCallback(async () => {
    setLoading(true);
    const w = item?.writer;
    const canon = w?.canonical?.display_name || w?.contributor?.display_name;
    const wname = canon || item?.rawAuthor || item?.author || null;
    const names = [canon, item?.rawAuthor, item?.author, ...((w?.canonical?.wa_names) || [])].filter(Boolean);
    const a0 = analyzeFull(item?.raw, { writerName: wname });
    const hubVal = a0.structure.hub?.value ?? (a0.claims.find(c => c.value != null)?.value ?? null);
    try {
      const [db, claims] = await Promise.all([dbFirstLookup(a0.phrases, hubVal), getWriterVerifiedClaims(names)]);
      const profile = buildMethodProfile(claims);
      const a = analyzeFull(item?.raw, { writerName: wname, dbHubKnown: db.hubCount });
      setRes({ a, db, profile, hubVal, wname });
    } catch { setRes({ a: a0, db: { known: [], hubCount: 0, hubValue: hubVal }, profile: null, hubVal, wname }); }
    setLoading(false);
  }, [item]);
  if (!item?.raw) return null;
  const Lyr = ({ t, c, children }) => (
    <div style={{ borderInlineStart: `2px solid ${c || C.gold}`, paddingInlineStart: 9, marginBottom: 9 }}>
      <div style={{ color: c || C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 11.5 }}>{t}</div>
      <div style={{ marginTop: 3, fontSize: 12, color: C.goldLight }}>{children}</div>
    </div>
  );
  const r = res?.a; const db = res?.db; const prof = res?.profile;
  const st = r?.structure;
  const known = new Set((db?.known || []).map(k => k.phrase));
  return (
    <div style={{ ...box, marginTop: 12, borderColor: C.gold }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>🔬 ניתוח מלא</span>
        {!res && <button onClick={run} style={chip(true, C.gold)}>הרץ ניתוח מלא</button>}
        {loading && <span style={{ color: C.faint, fontSize: 11 }}>מנתח…</span>}
        <span style={{ color: C.faint, fontSize: 10 }}>Orchestration · מקסימום-הקשר · לא brute-force · אין WRITE</span>
      </div>
      {r && (
        <div style={{ marginTop: 10 }}>
          {/* 🧩 מבנה-הממצא (יחידת-טיעון אחת) */}
          {(st.sumEq || st.hub) && (
            <div style={{ ...box, background: "#eef2f8", borderColor: "#8458ff55", marginBottom: 10, padding: "10px 12px" }}>
              <div style={{ color: "#7a5cff", fontFamily: F.heading, fontWeight: 800, fontSize: 12, marginBottom: 5 }}>🧩 מבנה הממצא שזוהה</div>
              <div style={{ fontFamily: F.mono, fontSize: 12.5, color: "#1b1d22", lineHeight: 1.9 }}>
                {st.sumEq && <div>{st.sumEq.text} {st.sumEq.verifiedSum ? <b style={{ color: "#2e9e63" }}>✓</b> : <b style={{ color: "#e0563a" }}>⚠️</b>}</div>}
                {st.hub && <div>↕ <b style={{ color: C.gold }}>{st.hub.value}</b> = {st.hub.members.map(m => `«${m.term}» (${m.method})`).join(" = ")}</div>}
                {r.verses.length > 0 && <div>↓ 📖 {r.verses.length} פסוק/מקור</div>}
                {r.sources.length > 0 && <div>↓ 📚 {r.sources.map(s => s.name + (s.citation ? " " + s.citation : "")).join(" · ")}</div>}
                <div style={{ color: C.faint }}>↓ 💬 פרשנות הכתב (בנפרד — לא עובדה)</div>
              </div>
            </div>
          )}
          {/* A · מקור */}
          <Lyr t="A · מקור" c={C.muted}>{item.source}{res.wname ? ` · ${res.wname}` : ""}{item.ts ? ` · ${fmt(item.ts)}` : ""}</Lyr>
          {/* B · חילוץ — כל טענה מוצגת בדיוק כפי-שנכתבה במקור (`text`); צורת-מנוע (`norm`) לצדה, רק אם שונה */}
          <Lyr t={`B · חילוץ (${r.claims.length} טענות · ${r.phrases.length} ביטויים) — כלשונו`}>
            {r.claims.slice(0, 8).map((c, i) => <span key={i} style={{ marginInlineEnd: 8 }}>«{c.text}»{c.method ? <span style={{ ...pill("#8458ff"), fontSize: 10, marginInline: 3 }}>{c.method}</span> : null}{c.norm ? <span style={{ color: C.faint, fontSize: 10 }}> (מנוע: {c.norm})</span> : null}{c.value != null ? <b style={{ color: C.gold }}>={c.value}</b> : ""}</span>)}
            <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>הטקסט נשמר כלשונו · «שיטה» מופרדת כשהכתב כתבּה (ליל הבדלח <b>משולש</b>=434) · «מנוע:» = צורה לחיפוש-בנק, לא מחליפה את המקור.</div>
          </Lyr>
          {/* C · שיטה + פרופיל-כתב */}
          <Lyr t="C · שיטה (רק באינדיקציה אמיתית)">
            {r.koll.length ? <span style={{ ...pill("#c79a2e"), marginInlineEnd: 6 }}>כולל: {r.koll.join("·")} (CLAIM)</span> : null}
            {st.sumEq ? <span style={{ ...pill("#8458ff"), marginInlineEnd: 6 }}>משוואה</span> : null}
            {r.engine.convergences.length ? <span style={{ ...pill("#3ea6ff"), marginInlineEnd: 6 }}>התכנסות</span> : null}
            {r.verses.length ? <span style={{ ...pill("#4caf7d"), marginInlineEnd: 6 }}>פסוקים</span> : null}
            {prof ? <span style={{ color: C.faint }}> · פרופיל-כתב: {prof.dominant ? <b style={{ color: C.gold }}>{prof.dominant} (דומיננטי · {prof.total})</b> : `${prof.total} מאומתים (טרם דומיננטי)`}</span> : null}
          </Lyr>
          {/* D · DB-First */}
          <Lyr t="D · DB-First (מה כבר קיים)" c="#3ea6ff">
            {res.hubVal != null && <div>צביר {res.hubVal}: <b>{db.hubCount}</b> ביטויים מאומתים בבנק</div>}
            {r.phrases.slice(0, 6).map((p, i) => <span key={i} style={{ marginInlineEnd: 8, color: known.has(p) ? "#2e9e63" : "#e0563a" }}>{known.has(p) ? "✓ קיים" : "🆕 חדש"}: {p}</span>)}
          </Lyr>
          {/* E · התכנסות (FACT) */}
          {r.engine.convergences.length > 0 && (
            <Lyr t="E · התכנסות (FACT · אומת-מנוע)" c="#2e9e63">
              {r.engine.convergences.slice(0, 5).map((cv, i) => <div key={i}><b style={{ color: C.gold }}>{cv.value}</b> = {cv.members.map(m => `«${m.term}»·${m.method}`).join(" = ")}</div>)}
            </Lyr>
          )}
          {/* E2 · אשכולות writer-claimed = מועמדי-התכנסות (מחכים לאימות — לא Fact) */}
          {(r.clusters || []).filter(c => c.candidateConvergence).length > 0 && (
            <Lyr t={`E2 · מועמדי-התכנסות (writer-claimed · ${(r.clusters || []).filter(c => c.candidateConvergence).length}) — מחכה לאימות`} c="#e08a2e">
              {(r.clusters || []).filter(c => c.candidateConvergence).slice(0, 8).map((cl, i) => (
                <div key={i} style={{ padding: "1px 0" }}>
                  🔵 <b style={{ color: C.gold }}>{cl.value}</b> <span style={{ color: C.faint }}>({cl.distinctExprs} ביטויים{cl.uniformMethod ? "" : ` · שיטות שונות: ${cl.methods.join("·")}`})</span>: {cl.items.map(it => `«${it.text}»${it.method ? `/${it.method}` : ""}`).join(" · ")}
                </div>
              ))}
              <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>מועמד = הכתב ייחס אותו ערך ל-≥2 ביטויים. <b>CLAIM≠FACT · HOT≠TRUE</b> — שיטה לא-אחידה = כל ביטוי דורש אימות-מנוע נפרד.</div>
            </Lyr>
          )}
          {/* 🧭 מפת ביטוי×שיטה×ערך — ביטוי חוזר לאורך שיטות/ערכים (בלי הסקת-משמעות) */}
          {(r.exprMap || []).length > 0 && (
            <Lyr t="🧭 מפת ביטוי × שיטה × ערך" c="#3ea6ff">
              {r.exprMap.slice(0, 6).map((e, i) => (
                <div key={i} style={{ padding: "1px 0" }}>«<b>{e.expr}</b>» → {e.rows.map(row => `${row.method || "?"}→${row.value}`).join("  ·  ")}</div>
              ))}
              <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>צומת-חוזר: אותו ביטוי בכמה שיטות/ערכים — משמעותי לכתב, אך לא מסיק משמעות. «?» = שיטה לא צוינה.</div>
            </Lyr>
          )}
          {/* F · טענות-חבויות (מכפלה / הופעה / טרם-נבדק) — CLAIM לבדיקה, לא Fact */}
          {(r.products.length > 0 || r.occurrences.length > 0 || (r.pending || []).length > 0) && (
            <Lyr t="F · טענות-חבויות / ממתינות (לבדיקה · לא-Fact)" c="#c77dd8">
              {r.products.map((p, i) => <div key={"p" + i}>✖️ מכפלה: <b>{p.factor}</b> × «{p.unit}»{p.phrase ? <> = «{p.phrase}»</> : null} <span style={{ color: C.faint }}>— לאמת במנוע, לא להניח</span></div>)}
              {r.occurrences.map((o, i) => <div key={"o" + i}>📖 הופעה: «{o.phrase}» <b>{o.count}</b> <span style={{ color: C.faint }}>— לבדוק בחיפוש-תנ״ך</span></div>)}
              {(r.pending || []).map((p, i) => <div key={"pd" + i}>🟡 טרם-נבדק: «{p.phrase}» <span style={{ color: C.faint }}>— {p.note} · הצע גימטריה רגילה תחילה</span></div>)}
            </Lyr>
          )}
          {/* 🕐 טענת-תאריך / הערת-כותב → מועמד לשכבת-הציר (לא ממצא-גימטריה) */}
          {(r.dateClaims || []).length > 0 && (
            <Lyr t="🕐 הערת-כותב · DATE_CLAIM → מועמד לשכבת-הציר" c="#4caf7d">
              {r.dateClaims.map((d, i) => (
                <div key={i} style={{ padding: "1px 0" }}>
                  {[d.hebDate, d.gregDate].filter(Boolean).join(" · ")}{d.claim ? <b style={{ color: C.gold }}> · {d.claim}</b> : null}
                  <div style={{ color: C.faint, fontSize: 10 }}>⛔ לא נכנס למנוע-הגימטריה · מועמד לשכבת-הציר בכפוף לאימות תאריך+אירוע</div>
                </div>
              ))}
            </Lyr>
          )}
          {/* G · פרשנות + H · המלצות (מדורגות: גבוהה/בינונית/פרשני) */}
          <Lyr t="G · פרשנות הכתב" c={C.muted}>מוצגת בנפרד מהעובדות — CLAIM/INTERPRETATION, לא Fact.</Lyr>
          <Lyr t={`H · המלצות מחקר (${r.suggestions.length}) — לבחירתך`} c="#c79a2e">
            {[["high", "🔴 גבוהה", "#d1493f"], ["mid", "🟡 בינונית", "#c79a2e"], ["axis", "🕐 ציר", "#4caf7d"], ["interp", "🟣 פרשני (לא-Fact)", "#8458ff"]].map(([rk, lbl, col]) => {
              const g = r.suggestions.filter(s => s.rank === rk);
              if (!g.length) return null;
              return (
                <div key={rk} style={{ marginTop: 4 }}>
                  <div style={{ color: col, fontWeight: 700, fontSize: 11 }}>{lbl}</div>
                  {g.map((s, i) => <div key={i} style={{ padding: "1px 0 1px 6px" }}>💡 {s.t} <span style={{ color: C.faint }}>— {s.why}</span></div>)}
                </div>
              );
            })}
          </Lyr>
          <div style={{ color: C.faint, fontSize: 10.5, borderTop: `1px dashed ${C.border}`, paddingTop: 6 }}>
            הפרדה: <b style={{ color: "#2e9e63" }}>FACT</b>=אומת-מנוע · <b style={{ color: "#c79a2e" }}>CLAIM</b>=טענת-הכתב · <b style={{ color: "#8458ff" }}>STRUCTURAL</b>=מבנה · <b style={{ color: "#3ea6ff" }}>CONVERGENCE</b>=ערך-משותף · <b style={{ color: C.muted }}>INTERPRETATION</b>=פרשנות. ניתוח ≠ אישור — הפעולות (לכידה/Atlas/ציר/סגירה) למטה, תחת Human-Gate.
          </div>
        </div>
      )}
    </div>
  );
}

// מקרא-פעולות ל-DetailPanel (מצב מדויק לכל פעולה).
const ACTIONS = [["close", "סגור-מהתור"], ["engine", "בדוק-מנוע"], ["atlas", "→ Atlas"], ["axis", "→ שכבת-הציר"], ["core", "קדם→CORE"], ["notarikon", "נוטריקון (ר״ת/ס״ת)"]];
// 🗂️ Row Detail/Action Panel חכם — הפעולות משתנות לפי סוג-החומר (לא 20 כפתורים בשורה).
function DetailPanel({ item, onClose, onFilter, onHandle, onUnhandle }) {
  if (!item) return null;
  const w = item.writer;
  const canon = w?.canonical?.display_name || w?.contributor?.display_name;
  const slug = w?.canonical?.slug || w?.contributor?.slug;
  const v = (item.values && item.values.length ? item.values[0] : item.value);
  const struct = structuralExtract(item.raw);
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

        {/* סגור-מהתור / בטל-סגירה (marker אישי חוצה-מכשירים · לא נוגע בסטטוס-המקור) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          {item.handled ? (
            <>
              <span style={pill("#8a8a95")}>✅ טופל · {item.handledMeta?.reason || "—"}{item.handledMeta?.at ? ` · ${fmt(item.handledMeta.at)}` : ""}</span>
              <button onClick={() => { onUnhandle && onUnhandle(item); onClose && onClose(); }} style={chip(false, "#e0913a")}>↩︎ בטל סגירה (החזר לתור)</button>
            </>
          ) : (
            <>
              <span style={{ color: C.faint, fontSize: 11 }}>סגור-מהתור:</span>
              {["טופל", "לא-רלוונטי", "כפול", "נבדק", "נותב"].map((rs) =>
                <button key={rs} onClick={() => { onHandle && onHandle(item, rs); onClose && onClose(); }} style={chip(false, "#4caf7d")}>{rs}</button>)}
            </>
          )}
        </div>

        {/* 🔬 ניתוח מלא — Orchestration (A-H + מבנה + המלצות), READ/preview · פעולות למטה תחת Human-Gate */}
        <FullAnalysis item={item} />

        {/* מצב-פעולות מדויק — בוצע / ממתין-לאישור / לא-ניתן / חסר-מידע (מחליף «לא בוצע») */}
        <div style={{ marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, marginBottom: 6 }}>מצב-פעולות (מדויק)</div>
          <div style={{ display: "grid", gap: 4 }}>
            {ACTIONS.map(([a, lbl]) => {
              const r = actionState(item, a); const stt = ACT_STATE[r.s];
              return (
                <div key={a} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ ...pill(stt.c), minWidth: 84, textAlign: "center" }}>{stt.t}</span>
                  <b style={{ color: C.goldLight, minWidth: 120 }}>{lbl}</b>
                  <span style={{ color: C.faint, flex: 1, minWidth: 140 }}>{r.why}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* חילוץ-מבנה (נוטריקון · ר״ת/ס״ת) — פרשנות בלבד, לא ערך ולא עובדה. שמעון-flow: חילוץ→נבדק→נותב→סגור-מהתור. */}
        {struct && (
          <div style={{ ...box, marginTop: 10, borderColor: "#8458ff55" }}>
            <div style={{ color: "#a48bff", fontFamily: F.heading, fontWeight: 800, fontSize: 12 }}>🔡 חילוץ-מבנה (פרשנות · לא-עובדה)</div>
            <Field k="מילים" v={struct.words} />
            <Field k="ראשי-תיבות" v={struct.rashei} />
            <Field k="סופי-תיבות" v={`${struct.sofei}${struct.sofeiNorm !== struct.sofei ? ` (מנורמל: ${struct.sofeiNorm})` : ""}`} />
            <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>
              אלו אותיות בלבד — לא ערך-גימטריה ולא «קריאה» מאושרת. אנגרמה/צירוף = פרשנות. בדיקת-מנוע-לערך = ממתין-לאישור (פאזה 3).
            </div>
            {!item.handled && <button onClick={() => { onHandle && onHandle(item, "נבדק · נוטריקון (מבנה) — פרשנות, ללא Fact/Canonical"); onClose && onClose(); }} style={{ ...chip(false, "#8458ff"), marginTop: 6 }}>נבדק — סגור מהתור</button>}
          </div>
        )}

        <div style={{ color: C.faint, fontSize: 10.5, marginTop: 10, borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}>
          «סגור-מהתור» = marker אישי (research_items) — מבוצע. פעולות-עבודה (שיפוט · קדם→גרף · <b>למד-זהות</b> · סווג · העדפה · בדיקת-מנוע-לערך) = <b>פאזה 3</b> (Human-Gate של צוריאל) — אין WRITE לחומר, אין Claim→Fact, אין קידום Canonical.
        </div>
      </div>
    </div>
  );
}

// Bulk Bar — «סגור מהתור» מבוצע בפועל (marker אישי); שאר-הפעולות gated (פאזה 3 · Human-Gate).
function BulkBar({ items, onClear, onCloseQueue }) {
  const n = items.length;
  if (!n) return null;
  const gated = (a) => alert(`«${a}» על ${n} פריטים — ממתין לאישור (פאזה 3 · Human-Gate). לא בוצע WRITE.`);
  return (
    <div style={{ ...box, borderColor: C.goldBright, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <b style={{ color: C.goldBright, fontFamily: F.heading }}>נבחרו {n}</b>
      <button onClick={() => onCloseQueue(items)} style={chip(false, "#4caf7d")}>✔ סגור מהתור ({n})</button>
      <span style={{ color: C.faint, fontSize: 10 }}>|</span>
      {["🔬 בדוק במנוע", "🏷️ סווג", "🧠 למד", "📥 → VAULT", "🔗 → Atlas", "🕐 → שכבת-הציר", "⚖️ שיפוט"].map((a) =>
        <button key={a} onClick={() => gated(a)} style={chip(false)}>{a}</button>)}
      <button onClick={onClear} style={{ ...chip(false), marginInlineStart: "auto" }}>נקה בחירה</button>
      <span style={{ color: C.faint, fontSize: 10 }}>«סגור-מהתור» מבוצע · שאר הפעולות פאזה 3 · Rank-Don't-Hide</span>
    </div>
  );
}

export default function WarRoomTab() {
  const { user, isAdmin } = useAuth();
  const uid = user?.id || null;
  const narrow = useNarrow();   // 📱 מובייל → פריסה חד-טורית
  const [mode, setMode] = useState("now");        // now | treasure
  const [lens, setLens] = useState("writers");    // writers | groups | language | candidates
  const [writer, setWriter] = useState(WRITERS[0]);
  const [groupSel, setGroupSel] = useState(null);
  const [focusN, setFocusN] = useState(null);
  const [filters, setFilters] = useState({});     // CC-1.3 · סינון רב-ממדי (writer/status/method/dest/tier/flag/kind/src/from/to)
  const [sort, setSort] = useState("new");        // CC-1.3 · מיון (new/old/value)
  const [handled, setHandled] = useState(() => new Map()); // marker אישי «handled» (research_items) → Map(key→meta)
  const [showHandled, setShowHandled] = useState(false);   // «הצג גם שטופלו»
  const [candExpanded, setCandExpanded] = useState(false); // הרחבת רשימת-המועמדים (לחיצה על המונה)
  const candRef = useRef(null);                            // עוגן-גלילה לפאנל-המועמדים
  const [detail, setDetail] = useState(null);     // CC-1.3 · פריט פתוח ב-Detail Panel
  const [sel, setSel] = useState(() => new Set()); // CC-1.3 ש2 · רב-בחירה (מפתחות פריטים)
  // תאימות-קליק: setFilter({type,value}) ממזג facet לתוך אובייקט-הסינון (כל ה-onFilter הקיימים ממשיכים לעבוד).
  const setFilter = useCallback((f) => { if (!f) return setFilters({}); setFilters((cur) => ({ ...cur, [f.type]: f.value })); }, []);

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
    const withWriter = (it) => ({ ...it, writer: resolveWriter(it.rawAuthor || it.author, widx) });
    const merged = [
      ...(forum || []).map(normForum), ...(wa || []).map(normWa), ...((posts?.posts) || []).map(normPost),
    ].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 60).map(withWriter);
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
  // marker אישי «handled» — נטען חוצה-מכשירים (research_items) עם ה-uid.
  useEffect(() => { if (uid) getHandledMap(uid).then(setHandled).catch(() => {}); }, [uid]);

  const reloadHandled = useCallback(async () => { if (uid) setHandled(await getHandledMap(uid)); }, [uid]);
  const clearSel = useCallback(() => setSel(new Set()), []);
  // סגור-מהתור (יחיד או Bulk) — insert marker(ים); לא נוגע בסטטוס-המקור.
  const doClose = useCallback(async (items, reason) => {
    if (!uid) { alert("סגירה חוצה-מכשירים דורשת התחברות."); return; }
    const arr = Array.isArray(items) ? items : [items];
    for (const it of arr) { try { await markHandled(uid, it, reason); } catch (e) { console.warn("markHandled", e); } }
    await reloadHandled(); clearSel();
  }, [uid, reloadHandled, clearSel]);
  // בטל-סגירה — delete marker → חוזר לתור.
  const doUnclose = useCallback(async (item) => {
    if (!uid) return;
    try { await unmarkHandled(uid, item); } catch (e) { console.warn("unmarkHandled", e); }
    await reloadHandled();
  }, [uid, reloadHandled]);

  // צינור C — מועמדי-מנוע בלבד (discovery-engine…), מופרד מ-wa-raziel של צינור B.
  const discoveryC = useMemo(() => (candidates || []).filter(c => C_SOURCES.includes(c.src)), [candidates]);
  // withH — מצרף רובד-נסיגה (אם חסר) + דגל-handled מה-marker. pass — סינון רב-ממדי + הסתרת-שטופלו (אלא-אם showHandled).
  const withH = useCallback((it) => {
    const tier = it.tier || fallbackTier(it);
    const base = it.tier ? it : { ...it, tier };
    return handled.has(it.key) ? { ...base, handled: true, handledMeta: handled.get(it.key) } : base;
  }, [handled]);
  const pass = useCallback((it) => matchesFilters(it, filters) && (showHandled || !it.handled), [filters, showHandled]);
  // CC-1.3 · רשימות מסוננות+ממויינות (Rank-Don't-Hide: פילטר=מיקוד; «שטופל» יוצא רק מתור-העבודה האישי).
  const liveAf = useMemo(() => sortItems((liveA || []).map(withH).filter(pass), sort), [liveA, withH, pass, sort]);
  const candF = useMemo(() => sortItems((candidates || []).map(withH).filter(pass), sort), [candidates, withH, pass, sort]);
  // כל-החומר-של-הכתב (דרישה 8): איחוד כל הצינורות — ערוץ+מנוע+פורום+פוסט+וואטסאפ — לא רק חומר-שנותב.
  const poolAll = useMemo(() => [...(liveA || []), ...(candidates || []), ...(incoming || [])].map(withH), [liveA, candidates, incoming, withH]);
  const writerPool = useMemo(() => filters.writer ? sortItems(poolAll.filter(pass), sort) : null, [filters.writer, poolAll, pass, sort]);
  // אפשרויות ל-dropdowns של הסינון (נגזרות מהמאגר).
  const writerOptions = useMemo(() => orderWriters(poolAll.map(i => i.writer?.canonical?.display_name || i.writer?.contributor?.display_name).filter(Boolean)), [poolAll]);
  const statusOpts = useMemo(() => statusOptions(poolAll), [poolAll]);
  const methodOpts = useMemo(() => [...new Set(poolAll.map(i => i.method).filter(Boolean))], [poolAll]);
  // CC-1.3 ש2 · רב-בחירה. shown = מאגר-הכתב (אם פעיל) אחרת התור המוצג. בחירת-כתב = כל-החומר (כל הצינורות).
  const shown = useMemo(() => writerPool || [...liveAf, ...candF], [writerPool, liveAf, candF]);
  const hasFilter = Object.keys(filters).length > 0;
  // מונה-התור החי: מועמדים שלא-שוטפלו (יורד כשסוגרים פריט מהתור). לא תלוי בפילטר — עומק-התור האמיתי.
  const pendingCand = useMemo(() => (candidates || []).map(withH).filter(c => !c.handled), [candidates, withH]);
  const openAllCandidates = () => { setMode("now"); setFilters({}); setShowHandled(false); setCandExpanded(true); setTimeout(() => candRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); };
  // 📊 מונים עקביים — נגזרים מהנתונים הטעונים + מפת handled (אין DB, אין schema).
  // נכנס = כל מה שנטען · טופל = כמה מהם handled · ממתין = נכנס − טופל. Rank-Don't-Hide: החומר לא נמחק.
  const countHandled = useCallback((list) => (list || []).reduce((n, i) => n + (handled.has(i.key) ? 1 : 0), 0), [handled]);
  const stats = useMemo(() => {
    // מאגר-העבודה הניתן-לסגירה = צינור A + מועמדים (incoming/פורום = תצוגת-«נכנס עכשיו» קורא-בלבד, לא נספר).
    const aE = liveA.length, aH = countHandled(liveA);
    const cE = (candidates || []).length, cH = countHandled(candidates);
    const entered = aE + cE, handledN = aH + cH;
    return { entered, handledN, waiting: entered - handledN, judging: pendingCand.length, aE, aWait: aE - aH };
  }, [liveA, candidates, countHandled, pendingCand.length]);
  const selItems = useMemo(() => poolAll.filter(i => sel.has(i.key)), [poolAll, sel]);
  const toggleSel = (k) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const selectAllShown = () => setSel(new Set(shown.map(i => i.key)));
  const selectWriter = (name) => setSel(new Set(poolAll.filter(i => {
    const w = i.writer; const canon = w?.canonical?.display_name || w?.contributor?.display_name;
    return canon === name || i.rawAuthor === name || i.author === name;
  }).map(i => i.key)));

  if (!isAdmin) return <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>אין לך הרשאת ניהול.</div>;

  const langByRel = useMemo(() => {
    const g = { shared_value: [], translation: [], transliteration: [], other: [] };
    (langLinks || []).forEach(l => (g[l.relationship_type] || g.other).push(l));
    return g;
  }, [langLinks]);

  return (
    <PaletteProvider value={PALETTES.lab}>
    <div style={{ position: "relative", background: "#f6f7f9", borderRadius: 16, padding: "14px 14px 22px", overflow: "hidden", minHeight: "60vh" }}>
      {/* 🏙️ רקע-עיר בהיר, scoped לטאב (city_background_dual_theme_law) — לא נוגע בשאר-האתר */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(0.4) brightness(1.5) contrast(0.85)", opacity: 0.12 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(47,109,246,0.05), rgba(20,50,95,0.04))" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
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
        <span style={{ color: C.muted, fontSize: 12 }}>מועמדים ממתינים: <b onClick={openAllCandidates} title="הצג את כל התור" style={{ color: C.goldBright, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>{pendingCand.length}</b></span>
        <span style={{ color: C.muted, fontSize: 12 }}>🔥 מתעורר: {(hot || []).slice(0, 8).map(h => <b key={h.n} style={{ color: C.goldLight, cursor: "pointer", marginInlineEnd: 6 }} onClick={() => setFocusN(h.n)}>{h.n}</b>)}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>(חם = אות, לא אמת)</span>
      </div>

      {mode === "now" && (
       <>
        {/* 📊 מונים — נכנס / ממתין / טופל / לשיפוט · עקביים (נכנסו−טופלו=ממתינים) · לחיצים */}
        <div style={{ ...box, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {[
              { label: "נכנסו", n: stats.entered, c: C.goldBright, on: () => { setFilters({}); setShowHandled(true); }, tip: "כל מה שנטען (חי + מועמדים + נכנס-עכשיו) — לא נמחק לעולם" },
              { label: "ממתינים", n: stats.waiting, c: "#c79a2e", on: () => { setFilters({}); setShowHandled(false); }, tip: "תור-העבודה הפעיל (לא-טופל)" },
              { label: "טופלו", n: stats.handledN, c: "#4caf7d", on: () => { setShowHandled(true); setFilters({ status: "handled" }); }, tip: "מה שסגרת — עם הסיבה. «בטל סגירה» מחזיר לתור" },
              { label: "לשיפוט", n: stats.judging, c: "#3ea6ff", on: openAllCandidates, tip: "מועמדים שממתינים לשיפוט (לא-טופל)" },
            ].map((k, i) => (
              <div key={i} onClick={k.on} title={k.tip}
                style={{ flex: "1 1 84px", minWidth: 78, cursor: "pointer", padding: "11px 6px", textAlign: "center", borderInlineStart: i ? `1px solid ${C.border}` : "none" }}>
                <div style={{ color: k.c, fontFamily: F.heading, fontWeight: 900, fontSize: 25, lineHeight: 1 }}>{k.n}</div>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginTop: 3 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, color: C.faint, fontSize: 10, textAlign: "center", padding: "4px 6px" }}>נכנסו − טופלו = ממתינים · לחיצה על מספר מסננת אליו · החומר המקורי נשמר</div>
        </div>

        {/* CC-1.1 · קליטה חיה — שלושת הצינורות מופרדים (READ-ONLY, בלי feeder) */}
        <div style={box}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📡 קליטה חיה (LIVE INGESTION)</span>
            <span style={{ color: C.faint, fontSize: 11 }}>שלושה צינורות · לחיץ · תצוגה-בלבד (לא feeder, לא WRITE) {busy && "…"}</span>
          </div>
          <WorkFilters filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} showHandled={showHandled} setShowHandled={setShowHandled} writers={writerOptions} statuses={statusOpts} methods={methodOpts} handledCount={handled.size} />
          <FilterBar filters={filters} onClear={() => setFilters({})} onRemove={(k) => setFilters((cur) => { const n = { ...cur }; delete n[k]; return n; })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 8 }}>
            <div onClick={() => setFilter({ type: "tier", value: "RAW", label: "רובד: מקור (RAW)", color: "#8a8a95" })}
              style={{ ...box, borderColor: "#4caf7d55", cursor: "pointer" }} title="סנן לחומר-A (RAW)">
              <div style={{ color: "#4caf7d", fontFamily: F.heading, fontWeight: 800 }}>🟢 LIVE · צינור A</div>
              <div style={{ color: C.muted, fontSize: 11, margin: "3px 0" }}>ערוצי-שידור (WhatsApp) → channel_updates</div>
              <div style={{ color: C.goldLight, fontSize: 22, fontWeight: 900, fontFamily: F.heading }}>{stats.aWait}<span style={{ fontSize: 12, color: C.faint, fontWeight: 700 }}> / {stats.aE}</span></div>
              <div style={{ color: C.faint, fontSize: 10.5 }}>ממתינים / נכנסו · <b style={{ color: "#e0563a" }}>טרם-במנוע</b></div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ color: "#4caf7d", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>🟢 חומר-A שנכנס (חדש/קיים/כפול):</span>
              <button onClick={selectAllShown} style={chip(false)}>☐ בחר מוצג</button>
              {filters.writer && filters.writer !== "__UNKNOWN__" &&
                <button onClick={() => selectWriter(filters.writer)} style={chip(false, "#b08bd8")}>👤 בחר כל {filters.writer}</button>}
              {sel.size > 0 && <button onClick={clearSel} style={chip(false)}>נקה ({sel.size})</button>}
            </div>
            {liveAf.length ? liveAf.slice(0, 20).map(it => <IngestRow key={it.key} item={it} onOpen={setDetail} onFilter={setFilter} selected={sel.has(it.key)} onToggle={toggleSel} onClose={(x) => doClose(x, "טופל")} onUnclose={doUnclose} />)
              : <div style={{ color: C.muted, fontSize: 12 }}>{busy ? "טוען…" : (hasFilter ? "אין חומר-A תואם לפילטר." : "אין חומר-A חי כרגע (status='live').")}</div>}
            {liveAf.length > 20 && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>מוצגים 20 מתוך {liveAf.length}{hasFilter ? " (מסונן)" : ""}.</div>}
          </div>
          {/* CC-1.2 · מקרא-רבדים (Tier Lens) — ניווט בלבד, נגזר מהסטטוס הקיים */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <span style={{ color: C.faint, fontSize: 10.5 }}>רבדים (לחיץ):</span>
            {Object.values(TIER).sort((a, b) => a.order - b.order).map(t => (
              <span key={t.key} onClick={() => setFilter({ type: "tier", value: t.key, label: "רובד: " + t.he, color: t.color })}
                style={{ ...pill(t.color), fontWeight: 800, cursor: "pointer" }} title={`סנן לרובד ${t.he}`}>{t.he} · {t.key}</span>
            ))}
          </div>
          {/* CC-1.3 ש2 · מפת-ניתוב — לאן חומר הולך (עדשות עץ-אחד) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <span style={{ color: C.faint, fontSize: 10.5 }}>ניתוב:</span>
            {Object.entries(ROUTES).map(([from, tos]) => (
              <span key={from} style={{ fontSize: 10.5, color: C.muted }}>
                <b style={{ color: TIER[from]?.color || C.muted }}>{TIER[from]?.he || from}</b> →{" "}
                {tos.map((t, i) => <span key={i} style={{ color: t[2] }}>{t[0]}{i < tos.length - 1 ? " · " : ""}</span>)}
                {" "}<span style={{ color: C.faint }}>|</span>{" "}
              </span>
            ))}
            <span style={{ color: C.faint, fontSize: 10 }}>Human-Gate לכל קידום</span>
          </div>
          <div style={{ color: C.faint, fontSize: 10.5, marginTop: 8, lineHeight: 1.6 }}>
            ⛔ תצוגה בלבד: אף פריט לא נכתב ל-research_objects · צינור A אינו מחובר למנוע (0 קשרים) · «חדש/קיים/כפול» נקבע מנתונים קיימים בלבד (link_url + טקסט חוזר), לא ממנוע · הרובד = ניווט הנגזר מהסטטוס הקיים (לא משנה verified/candidate/approved/canonical) · זהות = resolver קורא-בלבד, אין בחירה-אוטומטית ואין מיזוג-אליאס.
          </div>
        </div>

        {/* CC-1.3 ש2 · Bulk Bar — «סגור מהתור» מבוצע; שאר gated */}
        <BulkBar items={selItems} onClear={clearSel} onCloseQueue={(items) => doClose(items, "טופל · Bulk")} />

        {/* דרישה 8 · כל-החומר-של-הכתב — איחוד כל הצינורות (לא רק חומר-שנותב) */}
        {filters.writer && filters.writer !== "__UNKNOWN__" && (
          <div style={{ ...box, borderColor: "#b08bd855" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ color: "#b08bd8", fontFamily: F.heading, fontWeight: 900 }}>👤 כל החומר של {filters.writer}</span>
              <span style={{ color: C.goldLight, fontWeight: 800 }}>{(writerPool || []).length}</span>
              <span style={{ color: C.faint, fontSize: 10.5 }}>כל הצינורות (ערוץ · מנוע · פורום · פוסט · וואטסאפ) — לא רק חומר-שנותב</span>
              <button onClick={() => selectWriter(filters.writer)} style={{ ...chip(false, "#b08bd8"), marginInlineStart: "auto" }}>בחר הכל</button>
            </div>
            {(writerPool || []).slice(0, 40).map(it => <IngestRow key={it.key} item={it} onOpen={setDetail} onFilter={setFilter} selected={sel.has(it.key)} onToggle={toggleSel} onClose={(x) => doClose(x, "טופל")} onUnclose={doUnclose} />)}
            {(writerPool || []).length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>אין חומר לכתב זה בטווח/סינון הנוכחי.</div>}
            {(writerPool || []).length > 40 && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>מוצגים 40 מתוך {writerPool.length}.</div>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,320px)", gap: 14 }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>🔴 נכנס עכשיו (פורום·פוסטים·WhatsApp-לוג) {busy && "…"}</div>
            {incoming.length ? incoming.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
              : <div style={{ color: C.muted, fontSize: 13 }}>אין חומר טרי כרגע.</div>}
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
            <RazielPanel focusN={focusN} />
            <div style={box} ref={candRef}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800 }}>
                  ⚖️ ממתין לשיפוט <span style={{ color: C.faint, fontSize: 11, fontWeight: 400 }}>({candF.length}{hasFilter ? " מסונן" : ""})</span>
                </span>
                {candF.length > 10 && <button onClick={() => setCandExpanded(v => !v)} style={{ ...chip(candExpanded, C.gold), marginInlineStart: "auto" }}>{candExpanded ? "הצג פחות" : `הצג את כל ${candF.length}`}</button>}
              </div>
              {(candExpanded ? candF : candF.slice(0, 10)).map(c => (
                <div key={c.key} onClick={() => setDetail(c)} title="פתח פרטים ופעולות"
                  style={{ borderBottom: `1px solid ${C.border}`, padding: "6px 0", fontSize: 12.5, color: C.goldLight, cursor: "pointer", opacity: c.handled ? 0.55 : 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                    <input type="checkbox" checked={sel.has(c.key)} onClick={e => e.stopPropagation()} onChange={() => toggleSel(c.key)} style={{ cursor: "pointer", alignSelf: "center" }} />
                    <TierBadge tier={c.tier} onClick={() => setFilter({ type: "tier", value: c.tier?.key })} />
                    <span onClick={e => { e.stopPropagation(); setFilter({ type: "kind", value: c.kind }); }}
                      style={{ ...pill(c.kind === "relation" ? "#3ea6ff" : "#4caf7d"), cursor: "pointer" }} title="סנן לפי סוג">{c.kind}</span>
                    {c.handled && <span style={pill("#8a8a95")} title={c.handledMeta?.reason || "טופל"}>✅ טופל</span>}
                    {c.value ? <Link to={`/number/${c.value}`} onClick={e => e.stopPropagation()} style={{ color: C.goldBright }}>{c.value}</Link> : null}
                    <WriterChip writer={c.writer} />
                    {c.handled
                      ? <button onClick={e => { e.stopPropagation(); doUnclose(c); }} style={{ ...chip(false, "#e0913a"), padding: "2px 8px", marginInlineStart: "auto" }} title="החזר לתור">↩︎</button>
                      : <button onClick={e => { e.stopPropagation(); doClose(c, "טופל"); }} style={{ ...chip(false, "#4caf7d"), padding: "2px 8px", marginInlineStart: "auto" }} title="סגור מהתור">✔</button>}
                  </div>
                  <RowSummary item={c} />
                </div>
              ))}
              {!candF.length && <div style={{ color: C.muted, fontSize: 12 }}>{hasFilter ? "אין מועמדים תואמים לפילטר." : "אין מועמדים. התור נקי ✓"}</div>}
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
      {detail && <DetailPanel item={withH(detail)} onClose={() => setDetail(null)} onFilter={setFilter} onHandle={(it, r) => doClose(it, r)} onUnhandle={doUnclose} />}
      </div>
    </div>
    </PaletteProvider>
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
