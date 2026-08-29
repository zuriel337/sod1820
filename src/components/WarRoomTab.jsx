// 🎛️ חדר המפקדה (CC-1, מורחב ב-COMMAND_CENTER_ATTENTION_CLOSURE Pass 1) — View על כל האוצר
// (לא רק Discovery), שהפך לשער-התפעולי-האנושי (§4 בפקודת-הפאס — תיקון-דיוק-חוזה, לא-שינוי-התנהגות):
// ⚠️ "אין WRITE" (§13.8 המקורי, 11.8.2026) הפך-לא-מדויק ואינו-עוד-הניסוח-הנכון: החדר קורא ל-Human-Gate
// RPCs קיימים ומאושרים (admin_research_review/decideCandidate/sendCandidateFromResearcher/
// reviewRecommendation/moderateMatrix/approveContribution ועוד) — כולם כותבים, אחרי-לחיצה-אנושית-מפורשת.
// החוזה-המדויק במקום זה: **חדר המפקדה לא-בעל-האמת-המחקרית** · מותר-לו להפעיל פעולות-Human-Gated
// **קיימות-ומאושרות-מראש בלבד** · אין WRITE ישיר-לטבלה מהחדר עצמו (בלי-RPC-מתווך) · אין קנוניזציה/
// פרסום-אוטומטי-ע"י-AI · Human-Gate RPCs נשארים מסלול-השיפוט היחיד (§11.20/§20). קטעי-קוד ספציפיים
// שעדיין קורא-בלבד-בפועל (למשל קליטה-חיה/thread/resolver-זהות) ממשיכים-לתעד-זאת מקומית — זה נשאר נכון.
// שער=החלטה-לא-ראות (§11.34): חומר שלפני research_objects נראה כאן. HOT≠TRUE · VIP≠TRUE · Claim≠Fact.
// כל הנתונים מ-helpers קיימים בלבד (reuse-first). מסלול-החומר מראה «איפה נעצר».
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  supabase,
  getResearchFeed, getWaGroups, getWaLog, getForumMaterial,
  getLanguageLinks, getLanguageStats, getHotNumbers, getPostsFromSupabase,
  getChannelUpdates, getContributorsIndex, dbFirstLookup, getWriterVerifiedClaims, getHubCounts, checkAxisData, getWaThread, getAiAnalysis,
  getContributorConversation, getContributorDossierData,
} from "../lib/supabase.js";
import { analyzeTime } from "../lib/timeFlow.js";
import { crossMethodPairs } from "../lib/gematria.js";
import { detectLanguage, replyLanguage, LANG_HE, CANON_LANGS } from "../lib/lang.js";
import { creditsFor, providerCost } from "../lib/cost.js";
import { waTranslate, waPrepareReply, waSendArtifact } from "../lib/waReply.js";
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
  buildAttentionDigest, computeSignals, reconcileNewVsAttention,
} from "../lib/ccwork.js";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import AiAnalyze from "./AiAnalyze.jsx";
import WriterOS from "./WriterOS.jsx";
import NumberResearcher from "./admin/RazielRoom.jsx";
import ElsModerationTab from "./ElsModerationTab.jsx";
import MetatronAttention from "./admin/MetatronAttention.jsx";
import AttentionSignals from "./admin/AttentionSignals.jsx";
import { thumb } from "../lib/img.js";
import { buildResearchCase, collectQueryNeeds } from "../lib/triage.js";

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
const FACET_HE = { writer: "כתב", status: "סטטוס", method: "שיטה", dest: "יעד", tier: "רובד", flag: "סוג", kind: "סוג-מועמד", src: "צינור", srckind: "סוג-מקור", hasnum: "מכיל מספר", hasgem: "מכיל גימטריה", hasimg: "מכיל תמונה", engine: "נותח", judging: "לשיפוט", from: "מ-", to: "עד", channel: "ערוץ", group: "קבוצת-וואטסאפ" };
const SRCKIND_HE = { post: "📄 פוסט", comment: "💬 תגובה", channel: "📡 ערוץ", finding: "🔬 ממצא", wa: "🟢 וואטסאפ" };

// ── CC-1.1 · LIVE INGESTION — הפרדת שלושת הצינורות (READ-ONLY, בלי feeder/WRITE) ──
// A = ערוצי-שידור (channel_updates, חי) · C = מנוע-הגילויים (research_objects) · B = רזיאל/VIP (רדום).
// ⛔ תצוגה בלבד: אין fn_persist_discovery, אין שינוי research_objects, אין הפעלת B.
const A_CHANNELS = [
  ["gilui-yomi", "הגילוי היומי"], ["torat-haremez", "תורת הרמז"],
  ["or-geula", "אור הגאולה"], ["sfot-vheker", "שפות וחקר מציאות"],
];
const C_SOURCES = ["discovery-engine", "entity-combo", "research-center", "active-panel"];
// 🔥 Pass 1C §2: hot_numbers_live(days,lim) — מקור-אמת יחיד למספר-הימים (אין hardcode כפול בתווית).
const HOT_DAYS = 30;
// §7 · תוויות-ערוץ (מ-A_CHANNELS הקיים — לא רשימה שנייה).
const CHANNEL_HE = Object.fromEntries(A_CHANNELS);

// ⚖️ Pipeline C · Human Gate (STEP 1B — screen-map approved by Zuriel 25.8.2026).
// EXTENDS WarRoomTab in place — same file, same tab, no new route/store. Read: research_objects
// where status='candidate'. Write: the single existing RPC admin_research_review(id,decision) —
// no new RPC. Does NOT reuse/revive the old ConvergenceJudge (research_candidates, dead code) —
// different store, per Gate #18 (no physical consolidation).
const RO_FIELDS = "id,kind,statement,source,source_ref,contributor,value,terms,relates,engine_verified,engine_detail,confidence,privacy_scope,created_at";

// בונה תיאור-תוצאה *מהתשובה-בפועל של ה-RPC בלבד* — אף פעם לא מניח node/edge/ledger שנוצרו.
// תיקון-Screen-Map #2: ציבורי-בערך-חסר עדיין יוצר insight-node, אבל בלי number-node/edge/ledger.
function describeOutcome(res) {
  if (!res || res.ok !== true) return null;
  if (res.status === "rejected") return { label: "נדחה", color: "#e0563a" };
  // M1 truth contract (HG-2): approve יוצר «approved» לכל kind — הקידום ל-canonical הוא פעולת
  // Human-Gate נפרדת ומפורשת (admin_research_review p_decision='canonicalize'), לא תוצר-לוואי של אישור.
  if (res.status === "approved") {
    return {
      label: "אושר כידע-חי (לא צומת בגרף)", color: "#3ea6ff",
      detail: "approved ≠ canonical — הקידום לקנוני הוא פעולה נפרדת ומפורשת",
    };
  }
  if (res.status === "canonical") {
    if (res.graph_promoted) {
      return {
        label: "קנוני — קודם לגרף הציבורי", color: "#4caf7d",
        detail: [
          `insight-node: ${res.insight_node || "—"}`,
          res.number_node ? `number-node: ${res.number_node}` : "אין number-node (אין value)",
          res.edge_id ? `edge: ${res.edge_id}` : "אין edge (אין value)",
          res.decision_ledger_id ? `decision_ledger: ${res.decision_ledger_id}` : "אין decision_ledger (לא נוצר edge)",
        ].join(" · "),
      };
    }
    // תיקון-Screen-Map #1: הניסוח המדויק שאושר — לא "not visible outside admin" (הבטחת-נראות שלא-הוכחה).
    return { label: "קנוני פרטי — לא קודם לגרף הציבורי", color: "#c79a2e" };
  }
  return null;
}

const selBox = { padding: "4px 8px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, background: "#fff", color: C.goldLight };

function PipelineCCard({ c, decided, onDecide, busy }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const act = async (decision) => {
    setErr("");
    const res = await onDecide(c.id, decision);
    if (!res) { setErr("קריאת-הרשת נכשלה — נסה שוב."); return; }
    if (res.ok === false) {
      setErr(
        res.error === "invalid_decision" ? "החלטה לא-תקפה — לא בוצע דבר." :
        res.error === "already_reviewed" ? `המועמד כבר-נשפט (סטטוס: ${res.status}) — לא בוצע דבר נוסף.` :
        res.error || "שגיאה — לא בוצע דבר."
      );
    }
  };
  const outcome = decided ? describeOutcome(decided) : null;
  return (
    <div style={{ ...box, opacity: decided ? 0.75 : 1, borderColor: outcome ? outcome.color + "55" : C.border }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", cursor: "pointer" }} onClick={() => setOpen(v => !v)}>
        <span style={pill("#3ea6ff")}>{c.kind}</span>
        <span style={{ color: C.goldLight, fontSize: 13, fontWeight: 700, flex: "1 1 auto", minWidth: 0 }}>{c.statement}</span>
        <span style={{ color: C.faint, fontSize: 10.5 }}>{open ? "▲ הסתר" : "▼ פרטים"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <span style={pill(C.muted)}>מועמד — לא עובדה</span>
        {c.engine_verified === true && <span style={pill("#4caf7d")}>✓ מנוע: תואם</span>}
        {c.engine_verified === false && <span style={pill("#e0563a")}>✗ מנוע: לא-תואם</span>}
        <span style={pill(C.faint)}>אימות מנוע — אינו אישור קנוני</span>
        <span style={pill(c.privacy_scope === "public_candidate" ? "#4caf7d" : "#c79a2e")}>{c.privacy_scope}</span>
        {c.source && <span style={pill(C.faint)}>{c.source}</span>}
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "grid", gap: 5, fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
          <div><b style={{ color: C.goldLight }}>source_ref:</b> {c.source_ref || "—"}</div>
          <div><b style={{ color: C.goldLight }}>contributor:</b> {c.contributor || "—"}</div>
          <div><b style={{ color: C.goldLight }}>value:</b> {c.value ?? "—"} &nbsp;<b style={{ color: C.goldLight }}>terms:</b> {(c.terms || []).join(", ") || "—"} &nbsp;<b style={{ color: C.goldLight }}>relates:</b> {(c.relates || []).join(", ") || "—"}</div>
          <div><b style={{ color: C.goldLight }}>confidence:</b> {c.confidence ?? "—"}</div>
          <div><b style={{ color: C.goldLight }}>engine_detail:</b> <span style={{ fontFamily: "monospace", fontSize: 10.5, wordBreak: "break-all" }}>{c.engine_detail ? JSON.stringify(c.engine_detail) : "—"}</span></div>
          <div><b style={{ color: C.goldLight }}>created_at:</b> {c.created_at ? new Date(c.created_at).toLocaleString("he-IL") : "—"}</div>
        </div>
      )}
      {!decided && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <button disabled={busy} onClick={(e) => { e.stopPropagation(); act("approve"); }} style={{ ...chip(true, "#4caf7d"), opacity: busy ? 0.5 : 1 }}>✓ Approve</button>
          <button disabled={busy} onClick={(e) => { e.stopPropagation(); act("reject"); }} style={{ ...chip(true, "#e0563a"), opacity: busy ? 0.5 : 1 }}>✕ Reject</button>
          {err && <span style={{ color: "#e0563a", fontSize: 11 }}>{err}</span>}
        </div>
      )}
      {outcome && (
        <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 8, background: outcome.color + "18", border: `1px solid ${outcome.color}55` }}>
          <div style={{ color: outcome.color, fontWeight: 800, fontSize: 12 }}>{outcome.label}</div>
          {outcome.detail && <div style={{ color: C.muted, fontSize: 10.5, marginTop: 2 }}>{outcome.detail}</div>}
          <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>קנוני ≠ מפורסם</div>
        </div>
      )}
    </div>
  );
}

function PipelineCReview() {
  const [rows, setRows] = useState(null);       // null = טוען
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [decidedMap, setDecidedMap] = useState({}); // {id: תשובת-RPC} — כרטיס נשאר גלוי עם תוצאה, יוצא מ«ממתינים»
  const [f, setF] = useState({ source: "", kind: "", privacy: "", verified: "" });

  const load = useCallback(() => {
    setError(""); setDecidedMap({});
    supabase.from("research_objects").select(RO_FIELDS).eq("status", "candidate")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => { if (error) { setError(error.message); setRows([]); } else setRows(data || []); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const onDecide = async (id, decision) => {
    setBusyId(id);
    let out;
    try {
      const { data, error } = await supabase.rpc("admin_research_review", { p_id: id, p_decision: decision });
      out = error ? { ok: false, error: error.message } : data;
    } catch (e) { out = { ok: false, error: e?.message || "network_error" }; }
    setBusyId(null);
    if (out && out.ok === true) setDecidedMap(p => ({ ...p, [id]: out })); // הצלחה → יוצא מ«ממתינים» (לא נמחק מהתצוגה)
    return out;
  };

  const pending = useMemo(() => (rows || []).filter(r => !decidedMap[r.id]), [rows, decidedMap]);
  const sources = useMemo(() => [...new Set(pending.map(r => r.source).filter(Boolean))].sort(), [pending]);
  const kinds = useMemo(() => [...new Set(pending.map(r => r.kind).filter(Boolean))].sort(), [pending]);
  const privacies = useMemo(() => [...new Set(pending.map(r => r.privacy_scope).filter(Boolean))].sort(), [pending]);
  const matchesF = useCallback((r) =>
    (!f.source || r.source === f.source) &&
    (!f.kind || r.kind === f.kind) &&
    (!f.privacy || r.privacy_scope === f.privacy) &&
    (!f.verified || (f.verified === "true" ? r.engine_verified === true : f.verified === "false" ? r.engine_verified === false : r.engine_verified == null)),
    [f]);
  const filtered = useMemo(() => (rows || []).filter(matchesF), [rows, matchesF]);

  return (
    <div id="pipeline-c-review" style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>⚖️ Pipeline C · Human Gate</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{rows ? `${pending.length} ממתינים (${filtered.length} מוצגים אחרי-פילטר)` : "טוען…"}</span>
        <button onClick={load} style={{ ...chip(false), marginInlineStart: "auto" }}>↻ רענן</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={pill(C.muted)}>מועמד — לא עובדה</span>
        <span style={pill(C.muted)}>אימות מנוע — אינו אישור קנוני</span>
        <span style={pill(C.muted)}>קנוני ≠ מפורסם</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select style={selBox} value={f.source} onChange={e => setF(p => ({ ...p, source: e.target.value }))}>
          <option value="">כל המקורות</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selBox} value={f.kind} onChange={e => setF(p => ({ ...p, kind: e.target.value }))}>
          <option value="">כל הסוגים</option>
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select style={selBox} value={f.privacy} onChange={e => setF(p => ({ ...p, privacy: e.target.value }))}>
          <option value="">כל ה-privacy_scope</option>
          {privacies.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select style={selBox} value={f.verified} onChange={e => setF(p => ({ ...p, verified: e.target.value }))}>
          <option value="">אימות-מנוע: הכל</option>
          <option value="true">✓ מאומת</option>
          <option value="false">✗ לא-תואם</option>
          <option value="null">לא-נבדק</option>
        </select>
      </div>
      {error && <div style={{ color: "#e0563a", fontSize: 12, marginBottom: 8 }}>שגיאת-טעינה: {error}</div>}
      {rows && filtered.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12 }}>{rows.length ? "אין מועמדים תואמים לפילטר." : "אין מועמדים ממתינים (research_objects, status='candidate')."}</div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map(c => <PipelineCCard key={c.id} c={c} decided={decidedMap[c.id]} onDecide={onDecide} busy={busyId === c.id} />)}
      </div>
    </div>
  );
}

// ── ZVI IMAGE × OCR × VISUAL EXTRACTION PILOT (25.8.2026, Zuriel explicit authorization) ──
// Reuse-first: gallery-ocr (already live) does OCR+scene+entities+image_type+gematria in one pass;
// this panel only surfaces that output + the new image_artifact_classify/route_to_intake RPCs.
// IMAGE = SOURCE/REPRESENTATION, never itself an artifact — classification runs on EXTRACTED
// content only (§3 of the task brief). Anchor Numbers untouched — no reference here at all.
const RETENTION_OPTS = [
  ["image_and_text", "שמור תמונה + מלל"],
  ["text_only", "שמור מלל בלבד"],
  ["image_only", "שמור תמונה בלבד"],
];
const ARTIFACT_BADGE = {
  claim: { label: "טענה — ניתן לניתוב ל-Research Intake", color: "#4caf7d" },
  hint_candidate: { label: "רמז אפשרי — נתב ידנית דרך מאגר-הרמזים", color: "#b08bd8" },
  unclear: { label: "לא-ברור — דורש בדיקה אנושית", color: "#8a8a95" },
  pending_ocr: { label: "ממתין ל-OCR", color: "#c79a2e" },
  not_found: { label: "לא נמצא", color: "#e0563a" },
};
function zviPersonLabel(source) {
  if (!source) return "—";
  if (source.startsWith("pilot:zvi:")) return "צבי (OPOC)";
  return source;
}

function ImagePilotCard({ row, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [retBusy, setRetBusy] = useState(false);
  const cls = row._classification || { artifact_type: row.ocr_status === "done" ? "unclear" : "pending_ocr", reason: "" };
  const badge = ARTIFACT_BADGE[cls.artifact_type] || ARTIFACT_BADGE.unclear;
  const showImage = row.retention !== "text_only";
  const showText = row.retention !== "image_only";

  const setRetention = async (val) => {
    setRetBusy(true);
    await supabase.from("gallery_images").update({ retention: val }).eq("id", row.id);
    setRetBusy(false);
    onRefresh();
  };
  const route = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("image_artifact_route_to_intake", { p_gallery_image_id: row.id });
    setBusy(false);
    setRouteResult(error ? { ok: false, error: error.message } : data);
  };

  return (
    <div style={{ ...box, borderColor: badge.color + "55" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        {showImage && row.image_url && (
          <img src={thumb(row.image_url, 140)} alt="" style={{ width: 90, height: 90, objectFit: "contain", borderRadius: 8, background: "#0002", flexShrink: 0 }} />
        )}
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: C.goldLight, fontWeight: 800, fontSize: 13 }}>{zviPersonLabel(row.source)}</span>
            <span style={pill(badge.color)}>{badge.label}</span>
            <span style={pill(row.ocr_status === "done" ? "#4caf7d" : row.ocr_status === "error" ? "#e0563a" : "#c79a2e")}>OCR: {row.ocr_status}</span>
            <span style={{ color: C.faint, fontSize: 10.5, marginInlineStart: "auto" }} onClick={() => setOpen(v => !v)}>{open ? "▲ הסתר" : "▼ פרטים"}</span>
          </div>
          {showText && row.ocr_text && (
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6, whiteSpace: "pre-wrap" }}>{row.ocr_text.slice(0, 220)}{row.ocr_text.length > 220 ? "…" : ""}</div>
          )}
          {!showText && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 6 }}>מלל מוסתר (retention=image_only) — לא ינותב למחקר</div>}
          {!showImage && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 6 }}>תמונה מוסתרת (retention=text_only) — המלל עדיין זמין</div>}
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "grid", gap: 5, fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
          <div><b style={{ color: C.goldLight }}>source_ref:</b> gallery_images:{row.id}</div>
          <div><b style={{ color: C.goldLight }}>מקור מקורי (provenance):</b> {row.source || "—"}</div>
          <div><b style={{ color: C.goldLight }}>numbers:</b> {(row.ocr_numbers || []).join(", ") || "—"}</div>
          <div><b style={{ color: C.goldLight }}>scene (תיאור-חזותי):</b> {row.ocr_meta?.scene || "—"}</div>
          <div><b style={{ color: C.goldLight }}>entities (ישויות-חזותיות):</b> {(row.ocr_meta?.entities || []).join(", ") || "—"}</div>
          <div><b style={{ color: C.goldLight }}>image_type:</b> {row.image_type || "—"}</div>
          <div><b style={{ color: C.goldLight }}>סיווג-ארטיפקט:</b> {cls.reason || "—"}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <b style={{ color: C.goldLight }}>שימור:</b>
            {RETENTION_OPTS.map(([val, he]) => (
              <button key={val} disabled={retBusy} onClick={() => setRetention(val)}
                style={{ ...chip(row.retention === val, row.retention === val ? "#4caf7d" : C.muted), opacity: retBusy ? 0.5 : 1 }}>{he}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button disabled={busy || cls.artifact_type !== "claim"} onClick={route}
          style={{ ...chip(false, "#4caf7d"), opacity: (busy || cls.artifact_type !== "claim") ? 0.4 : 1 }}>
          ➕ העבר ל-Research Intake
        </button>
        <span style={{ color: C.faint, fontSize: 10 }}>מועמד בלבד — לעולם לא קנוני/פומבי אוטומטית</span>
        {routeResult && (
          routeResult.ok
            ? <span style={{ color: "#4caf7d", fontSize: 11 }}>{routeResult.already_existed ? "כבר קיים כמועמד" : "נוצר מועמד"} — research_objects:{routeResult.research_object_id}</span>
            : <span style={{ color: "#e0563a", fontSize: 11 }}>{routeResult.reason || routeResult.error || "לא נותב"}</span>
        )}
      </div>
    </div>
  );
}

function ImagePilotPanel() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data, error } = await supabase.from("gallery_images")
      .select("id,image_url,name,source,ocr_status,ocr_text,ocr_numbers,ocr_meta,image_type,retention,created_at")
      .like("source", "pilot:%").order("created_at", { ascending: false }).limit(100);
    if (error) { setError(error.message); setRows([]); return; }
    const withCls = await Promise.all((data || []).map(async (r) => {
      if (r.ocr_status !== "done") return { ...r, _classification: null };
      const { data: cls } = await supabase.rpc("image_artifact_classify", { p_gallery_image_id: r.id });
      return { ...r, _classification: cls };
    }));
    setRows(withCls);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>🖼️ פיילוט תמונות — צבי (OCR × חילוץ-חזותי)</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{rows ? `${rows.length} פריטים` : "טוען…"}</span>
        <button onClick={load} style={{ ...chip(false), marginInlineStart: "auto" }}>↻ רענן</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={pill(C.muted)}>תמונה = מקור/ייצוג, לעולם לא רמז/ממצא/עובדה מעצם היותה תמונה</span>
        <span style={pill(C.muted)}>OCR/חזותי ≠ עובדה</span>
        <span style={pill(C.muted)}>שער-אנוש נשאר צוריאל</span>
      </div>
      {error && <div style={{ color: "#e0563a", fontSize: 12, marginBottom: 8 }}>שגיאת-טעינה: {error}</div>}
      {rows && rows.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>אין פריטי-פיילוט (gallery_images, source like 'pilot:%').</div>}
      <div style={{ display: "grid", gap: 8 }}>
        {(rows || []).map(r => <ImagePilotCard key={r.id} row={r} onRefresh={load} />)}
      </div>
    </div>
  );
}

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
    // 📱 הקשר-מלא (wa_bot_log): טלפון · תשובת-בוט · מזהה-ספק · מצב-בוט · action=provenance
    phone: r.sender || null, senderName: r.sender_name || null, botReply: r.reply_out || null,
    msgId: r.msg_id || null, botMode: r.bot_mode || null, action: act,
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
    key: "ch:" + r.id, cuId: r.id, source: "ערוץ · " + (chLabel || r.channel || "—"), srckind: "channel", author: r.credit || "—",
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
  // 📱 Responsive: flex-wrap — כל שלב הוא צ'יפ שנשבר לשורה הבאה במסך צר, אף פעם לא יוצא מגבול הכרטיס.
  // הפרדה ב-gap (לא «›» שגורם bidi-bleed ב-RTL). הכל נשמר גלוי — בלי overflow-hidden שמסתיר.
  return (
    <div style={{ marginTop: 8, cursor: "default", minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: C.faint, fontFamily: F.heading, marginBottom: 3 }}>מצב-החומר (לתצוגה, לא ללחיצה):</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", alignItems: "baseline", maxWidth: "100%" }}>
        {track.map((t, i) => (
          <span key={i} title={`${t.stage}: ${TRACK_LABEL[t.state]}`}
            style={{ fontSize: 10.5, fontWeight: 700, fontFamily: F.heading, color: TRACK_COLOR[t.state], whiteSpace: "nowrap" }}>
            {TRACK_DOT[t.state]} {t.stage}
          </span>
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, onFocus }) {
  const v = item.values && item.values.length ? item.values[0] : item.value;
  return (
    <div style={{ ...box, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
        {/* PART A · תמונה-מקור ≠ מלל-OCR — thumbnail-זעיר כשקיים image_url (היה נלכד ב-item.img ומעולם לא מרונדר). */}
        {item.img && <img src={thumb(item.img, 88)} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, background: "#0002", flexShrink: 0 }} />}
        <span style={pill(C.goldBright)}>{item.source}</span>
        <span style={{ color: C.goldLight, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5 }}>{item.author}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{fmt(item.ts)}</span>
        {item.engineVerified && <span style={pill("#4caf7d")}>✔ מנוע</span>}
        {item.hasCross && <span style={pill("#3ea6ff")}>הצלבה</span>}
        {item.published && <span style={pill("#b08bd8")}>פורסם</span>}
        {v != null && <b style={{ marginInlineStart: "auto", color: C.goldBright, cursor: "pointer", fontFamily: F.heading }} onClick={() => onFocus && onFocus(v)}>{v}</b>}
      </div>
      <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.5, maxHeight: 60, overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
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
// הפילטרים/הניווט כאן (matchesFilters/isZuriel/FilterBar/WorkFilters) אכן נשארים read-only גרידא.
// ⚠️ תיקון-דיוק (Pass 1 §4, לא-שינוי-התנהגות): "שיפוט = פאזה 3" הפך-לא-מדויק — שיפוט כבר-חי במקום
// אחר בקובץ (Pipeline C/ELS/מטטרון/רזיאל, כולם דרך Human-Gate RPCs קיימים). "למד-זהות"/מיזוג-אליאס
// אכן עדיין לא-בנוי (פאזה עתידית אמיתית) — ראו ה-header העליון של הקובץ לחוזה-המלא המדויק.
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
  // Pass 1C-Closure §2/§4 · Drill-down כללי לפי מזהים-יציבים (Set<key>) — לא סינון-שדה, אלא
  // "בדיוק הפריטים האלה שהמונה סופר". מרחיב את matchesFilters הקיים (reuse, לא מקביל).
  if (f.ids && !f.ids.has(it.key)) return false;
  const w = it.writer;
  const canon = w?.canonical?.display_name || w?.contributor?.display_name;
  if (f.writer) {
    if (f.writer === "__ZURIEL__") { if (!isZuriel(it)) return false; }
    else if (f.writer === "__UNKNOWN__") { if (isZuriel(it) || !(w && w.state !== "matched")) return false; }
    else if (!(canon === f.writer || it.rawAuthor === f.writer || it.author === f.writer)) return false;
  }
  if (f.tier && it.tier?.key !== f.tier) return false;
  if (f.srckind && it.srckind !== f.srckind) return false;
  // §7 · פאסט קבוצה/ערוץ — מזהה-יציב אמיתי (channel_updates.channel / wa_bot_log.group_id), לא מחרוזת-תצוגה.
  if (f.channel && it.channel !== f.channel) return false;
  if (f.group && it.group !== f.group) return false;
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
  // "ids"/"idsLabel" זוג-שדות (drill-down כללי, §2/§4) — idsLabel לא-מוצג כצ'יפ נפרד, רק כתווית של ids.
  const keys = Object.keys(filters || {}).filter((k) => k !== "idsLabel" && filters[k] != null && filters[k] !== "");
  if (!keys.length) return null;
  const label = (k, v) => {
    if (k === "ids") return `🔎 ${filters.idsLabel || `${v.size} פריטים נבחרים`}`;
    if (v === true) return FACET_HE[k] || k;                       // צ'יפ-toggle (מכיל-מספר/נותח/…)
    if (k === "srckind") return SRCKIND_HE[v] || v;
    if (k === "channel") return CHANNEL_HE[v] || v;
    const vv = v === "__UNKNOWN__" ? "לא-מזוהה" : v === "__ZURIEL__" ? "👑 ZURIEL/1237" : v === "__STRUCT__" ? "מבנה" : v;
    return `${FACET_HE[k] || k}: ${vv}`;
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "2px 0" }}>
      <span style={{ color: C.faint, fontSize: 11 }}>🔎 פעיל:</span>
      {keys.map((k) => (
        <span key={k} onClick={() => { onRemove(k); if (k === "ids") onRemove("idsLabel"); }} style={{ ...pill(k === "ids" ? "#3ea6ff" : C.goldBright), cursor: "pointer", fontWeight: k === "ids" ? 900 : 800 }} title={k === "ids" ? "חזרה לכל התור" : "הסר פילטר"}>{label(k, filters[k])} ✕</span>
      ))}
      <button onClick={onClear} style={chip(false)}>נקה הכל</button>
    </div>
  );
}
// שורת-בקרות הסינון (dropdowns) + מיון + «הצג גם שטופלו».
function WorkFilters({ filters, setFilters, sort, setSort, showHandled, setShowHandled, hideSelf, setHideSelf, writers, statuses, methods, handledCount, waGroups }) {
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
      {/* §7 · פאסט קבוצה/ערוץ — מזהה-יציב אמיתי (channel_updates.channel / wa_bot_log.group_id) */}
      <select value={filters.channel || ""} onChange={(e) => { set("channel", e.target.value); set("group", ""); }} style={sel}>
        <option value="">כל הערוצים</option>
        {A_CHANNELS.map(([slug, he]) => <option key={slug} value={slug}>📡 {he}</option>)}
      </select>
      {(waGroups || []).length > 0 && (
        <select value={filters.group || ""} onChange={(e) => { set("group", e.target.value); set("channel", ""); }} style={sel}>
          <option value="">כל קבוצות-הוואטסאפ</option>
          {waGroups.map((g) => <option key={g} value={g}>🟢 {g}</option>)}
        </select>
      )}
      <label style={{ color: C.faint, fontSize: 11, display: "inline-flex", gap: 3, alignItems: "center" }}>מ־<input type="date" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} style={sel} /></label>
      <label style={{ color: C.faint, fontSize: 11, display: "inline-flex", gap: 3, alignItems: "center" }}>עד<input type="date" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} style={sel} /></label>
      <select value={sort} onChange={(e) => setSort(e.target.value)} style={sel}>
        <option value="new">מיון: חדש→ישן</option><option value="old">מיון: ישן→חדש</option><option value="value">מיון: ערך↓</option>
      </select>
      <button onClick={() => setShowHandled((v) => !v)} style={chip(showHandled, "#8a8a95")}>{showHandled ? "🙈 הסתר שטופלו" : `👁 הצג גם שטופלו${handledCount ? ` (${handledCount})` : ""}`}</button>
      {typeof hideSelf === "boolean" && setHideSelf && (
        <button onClick={() => setHideSelf((v) => !v)} title="SELF-GENERATED ≠ INCOMING ATTENTION — לא נמחק, רק לא מציף את «עכשיו»"
          style={chip(hideSelf, "#c9a24a")}>{hideSelf ? "🙈 שלי (ZURIEL) מוסתר" : "👑 מציג גם את שלי (ZURIEL)"}</button>
      )}
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
// 🕐 שכבת בדיקת-ציר-וזמן — מציגה תאריכים/שנים/רצפים + CHECK_EXISTING_AXIS_DATA (♻️ כבר בציר / 🆕 חדש).
// כל תוצאה נושאת role + tag (FACT/DATE_CLAIM/EXISTING/NEW/CANDIDATE). ⛔ לא יוצר Event, לא מקרין — הקרנה = Human-Gate.
const ROLE_TAG = {
  EVENT: { t: "מועמד-אירוע", c: "#e08a2e" }, PERSONAL: { t: "DATE_CLAIM · אישי", c: "#c77dd8" },
  MENTIONED: { t: "מוזכר", c: "#8a8a95" }, SOURCE: { t: "תאריך-המקור", c: "#3ea6ff" },
};
function TimeAxisLayer({ time, axis, Lyr }) {
  if (!time) return null;
  const dates = [...(time.gregs || []), ...(time.hebrews || [])];
  const hasAny = dates.length || (time.years || []).length || (time.sequences || []).length;
  if (!hasAny) return null;
  const axHit = (year, iso, raw) => {
    if (!axis) return null;
    return (year != null && axis.byYear?.get(year)) || (iso && axis.byIso?.get(iso))
      || (axis.byHebrew || []).filter(h => raw && (h.hebrew_date || "").replace(/[־\-'"׳״\s]/g, "").includes(String(raw).replace(/[־\-'"׳״\s]/g, "").slice(0, 4))) || null;
  };
  const Existing = ({ hits }) => hits && hits.length ? (
    <span style={{ ...pill("#3ea6ff"), fontSize: 10, marginInline: 4 }}>♻️ בציר: {hits[0].label?.slice(0, 28)}{hits.length > 1 ? ` +${hits.length - 1}` : ""}</span>
  ) : <span style={{ ...pill("#4caf7d"), fontSize: 10, marginInline: 4 }}>🆕 חדש</span>;
  return (
    <Lyr t="🕐 בדיקת ציר וזמן — EXTRACT → NORMALIZE → LINK → CHECK-AXIS → SEQUENCES" c="#4caf7d">
      {dates.map((d, i) => {
        const rt = ROLE_TAG[d.role] || ROLE_TAG.MENTIONED;
        const hits = axHit(d.y != null ? d.y : null, d.iso, d.kind === "hebrew" ? d.raw : null);
        return (
          <div key={"d" + i} style={{ padding: "1px 0" }}>
            {d.kind === "hebrew" ? "🔯" : "📅"} <b>{d.raw}</b>{d.iso ? <span style={{ color: C.faint }}> ={d.iso}</span> : (d.partial ? <span style={{ color: C.faint }}> (חלקי)</span> : null)}
            <span style={{ ...pill(rt.c), fontSize: 10, marginInline: 4 }}>{rt.t}</span>
            {d.event ? <span style={{ color: C.goldLight }}>→ {d.event}</span> : null}
            {d.role !== "PERSONAL" && <Existing hits={hits} />}
          </div>
        );
      })}
      {(time.normalized || []).map((n, i) => (
        <div key={"n" + i} style={{ color: "#2e9e63", fontSize: 11.5 }}>♻️ נרמול: «{n.hebrew}» = «{n.greg}» {n.iso ? `(${n.iso})` : ""} {n.inferred ? "· שנה מהוסקת" : ""} — לא כפילות</div>
      ))}
      {(time.years || []).filter(y => y.role !== "PERSONAL").length > 0 && (
        <div style={{ marginTop: 3 }}>
          <span style={{ color: C.faint, fontSize: 10.5 }}>שנים: </span>
          {time.years.map((y, i) => {
            const hits = axis?.byYear?.get(y.year);
            return <span key={"y" + i} style={{ marginInlineEnd: 6, fontSize: 11.5 }}><b>{y.year}</b>{hits ? <span style={{ color: "#3ea6ff" }}> ♻️</span> : <span style={{ color: "#4caf7d" }}> 🆕</span>}</span>;
          })}
        </div>
      )}
      {(time.sequences || []).map((s, i) => {
        const inAxis = s.years.filter(y => axis?.byYear?.get(y));
        return (
          <div key={"s" + i} style={{ marginTop: 4, padding: "4px 8px", background: "#eef7f0", borderRadius: 8 }}>
            <b style={{ color: "#2e9e63" }}>🕐 רצף רב-שנתי (CANDIDATE):</b> {s.years.map(y => <span key={y}>{y}{axis?.byYear?.get(y) ? "♻️" : ""} </span>)}
            <div style={{ fontSize: 10.5, marginTop: 2 }}>
              <div><b style={{ color: s.contentCriterion ? "#2e9e63" : "#c79a2e" }}>למה נבחר:</b> {s.criterion}</div>
              <div><b>מקורות:</b> {s.eventLinked} מקושרים-לאירוע · פערים {s.gaps?.join("/")}</div>
              <div><b>כבר בציר:</b> {inAxis.length}/{s.years.length} שנים ({inAxis.join(", ") || "—"})</div>
              <div style={{ color: "#c0392b" }}>⛔ סדר-כרונולוגי ≠ משמעות · קשר-נוסף + הקרנה = Human-Gate</div>
            </div>
          </div>
        );
      })}
      <div style={{ color: C.faint, fontSize: 10, marginTop: 4, borderTop: `1px dashed ${C.border}`, paddingTop: 4 }}>
        ♻️ = כבר קיים בציר (nodes/teder — DB-First לזמן) · 🆕 = חדש · <b>FACT</b>=תאריך-מנורמל · <b>DATE_CLAIM</b>=אישי/טענה · <b>CANDIDATE</b>=מועמד. ⛔ אין יצירת Event ואין הקרנה — «🕐 → שכבת-הציר» תחת Human-Gate.
      </div>
    </Lyr>
  );
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
    const t0 = analyzeTime(item?.raw, { sourceDate: item?.ts });   // 🕐 שלב-זמן (טהור)
    const hubVal = a0.structure.hub?.value ?? (a0.claims.find(c => c.value != null)?.value ?? null);
    const clusterVals = (a0.clusters || []).filter(c => c.candidateConvergence).map(c => c.value);
    const tYears = t0.years.map(y => y.year);
    const tIsos = [...t0.gregs, ...t0.hebrews].map(d => d.iso).filter(Boolean);
    const tHeb = t0.hebrews.map(h => h.raw);
    try {
      const [db, claims, hubCounts, axis] = await Promise.all([
        dbFirstLookup(a0.phrases, hubVal), getWriterVerifiedClaims(names), getHubCounts(clusterVals),
        checkAxisData({ years: tYears, isoDates: tIsos, hebrew: tHeb }),
      ]);
      const profile = buildMethodProfile(claims);
      const a = analyzeFull(item?.raw, { writerName: wname, dbHubKnown: db.hubCount });
      setRes({ a, db, profile, hubVal, wname, hubCounts, time: t0, axis });
    } catch { setRes({ a: a0, db: { known: [], hubCount: 0, hubValue: hubVal }, profile: null, hubVal, wname, hubCounts: new Map(), time: t0, axis: null }); }
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
              {(r.clusters || []).filter(c => c.candidateConvergence).slice(0, 8).map((cl, i) => {
                const inBank = res.hubCounts?.get(cl.value);
                return (
                  <div key={i} style={{ padding: "1px 0" }}>
                    🔵 <b style={{ color: C.gold }}>{cl.value}</b> <span style={{ color: C.faint }}>({cl.distinctExprs} ביטויים{cl.uniformMethod ? "" : ` · שיטות שונות: ${cl.methods.join("·")}`})</span>
                    {inBank != null && <span style={{ ...pill(inBank > 0 ? "#3ea6ff" : "#8a8a95"), fontSize: 10, marginInline: 4 }}>{inBank > 0 ? `♻️ ${inBank} כבר בבנק — חיזוק` : "🆕 ערך חדש"}</span>}
                    : {cl.items.map(it => `«${it.text}»${it.method ? `/${it.method}` : ""}`).join(" · ")}
                  </div>
                );
              })}
              <div style={{ color: C.faint, fontSize: 10, marginTop: 2 }}>מועמד = הכתב ייחס אותו ערך ל-≥2 ביטויים. <b>CLAIM≠FACT · HOT≠TRUE</b> · שיטה לא-אחידה = כל ביטוי דורש אימות נפרד · «♻️ בבנק» = הכתב מוסיף ביטוי לצביר קיים (לא מספר חדש).</div>
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
          {/* 🕐 בדיקת ציר וזמן — EXTRACT→NORMALIZE→LINK→CHECK_EXISTING_AXIS→SEQUENCES (עדשת-זמן, גייטד) */}
          <TimeAxisLayer time={res.time} axis={res.axis} Lyr={Lyr} />
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

// 📱 ערוץ מהודעת-WhatsApp: group_id → DM (@c.us) · קבוצה (@g.us) · תווית-אנוש.
function waChannel(group) {
  const g = String(group || "");
  if (/@c\.us$/.test(g)) return { t: "DM · פרטי", c: "#25d366", phone: g.replace(/@c\.us$/, "") };
  if (/@g\.us$/.test(g)) return { t: "קבוצה", c: "#3ea6ff", phone: null };
  return { t: g || "—", c: "#8a8a95", phone: null };
}
// ── ⚙️ מריצי-פעולות · כל אחד מקבל את ה-source item ומריץ מנוע **קיים** על ההודעה בלבד (לא brute-force על thread). ──
// כולם READ בלבד — מחשבים/קוראים, לא מקדמים (Human-Gate). מחזירים {result, why, prov}.
async function runGematria(item) {
  const a = analyzeFull(item?.raw || "", {});
  const explicit = a.claims.filter(c => c.type === "explicit-claim" && c.value != null);
  const contradictions = [];
  for (const c of explicit) {                                   // המנוע סותר Claim? רגיל-מנוע מול הטענה
    const eng = crossMethodPairs(c.norm || c.text).find(p => p.method === "רגיל")?.value;
    if (eng != null && eng !== c.value) contradictions.push({ text: c.text, claimed: c.value, engine: eng });
  }
  const vals = [...new Set(explicit.map(c => c.value))];
  const hubVal = a.structure.hub?.value ?? (vals[0] ?? item?.value ?? null);
  const [db, hubCounts] = await Promise.all([dbFirstLookup(a.phrases, hubVal), getHubCounts(vals)]);
  const known = new Set((db.known || []).map(k => k.phrase));
  return { kind: "gematria", claims: explicit, convergences: a.engine.convergences.slice(0, 4), contradictions, known, hubCounts, hubVal, hubCount: db.hubCount,
    why: "מנוע-הלקוח הקנוני (7 שיטות) על ביטויי-ההודעה בלבד · DB-First לכל ערך", prov: "gematria.js crossMethodPairs + gematria_words" };
}
async function runSearch(item) {
  const a = analyzeFull(item?.raw || "", {});
  const val = a.structure.hub?.value ?? (a.claims.find(c => c.value != null)?.value ?? item?.value ?? null);
  const db = await dbFirstLookup(a.phrases, val);
  return { kind: "search", phrases: a.phrases, known: db.known || [], hubValue: db.hubValue, hubCount: db.hubCount,
    why: "חיפוש ביטויי-ההודעה בבנק-הגימטריה + גודל-הצביר (מה כבר קיים)", prov: "gematria_words (dbFirstLookup)" };
}
async function runAxis(item) {
  const t = analyzeTime(item?.raw || "", { sourceDate: item?.ts });
  const years = t.years.map(y => y.year);
  const isos = [...t.gregs, ...t.hebrews].map(d => d.iso).filter(Boolean);
  const axis = await checkAxisData({ years, isoDates: isos, hebrew: t.hebrews.map(h => h.raw) });
  return { kind: "axis", time: t, axis, why: "EXTRACT→NORMALIZE→LINK→CHECK_EXISTING_AXIS_DATA על ההודעה", prov: "timeFlow + nodes(event)/teder_stations" };
}
async function runAI(item) {
  const a = analyzeFull(item?.raw || "", {});
  const facts = { phrases: a.phrases.slice(0, 8), convergences: a.engine.convergences.slice(0, 4).map(c => ({ value: c.value, terms: [...new Set(c.members.map(m => m.term))] })) };
  // provenance-עלות: user→conversation(group)→message→operation→model — נרשם ל-ai_token_log (שדות קיימים).
  const text = await getAiAnalysis({ kind: "research", subject: (item?.raw || "").slice(0, 300), facts, fast: true,
    ref: item?.msgId || null, ref_name: item?.group || null, user_ref: item?.phone ? `wa:${item.phone}` : null, operation: "ai" });
  return { kind: "ai", text, credits: creditsFor("ai"),
    why: "רזיאל (ai-analyze · Haiku) מפרש עובדות-מנוע בלבד — מציע, לא אמת", prov: "edge ai-analyze · usage→ai_token_log (ref=msg_id)" };
}
const RUNNERS = { gematria: runGematria, search: runSearch, axis: runAxis, ai: runAI };
const ACT_META = {
  gematria: { icon: "🔢", label: "גימטריה", c: "#c79a2e" }, search: { icon: "📚", label: "חיפוש בגוף-הידע", c: "#3ea6ff" },
  axis: { icon: "🕐", label: "בדיקת ציר/זמן", c: "#4caf7d" }, ai: { icon: "🧠", label: "AI (רזיאל)", c: "#b08bd8" },
};
// ⚙️ ActionRunner — 4 פעולות רצות-בפועל על ההודעה. 🔬 «ניתוח מלא» = FullAnalysis (Smart Analysis Flow) בפאנל שמתחת.
function ActionRunner({ item }) {
  const [res, setRes] = useState({});
  const [busy, setBusy] = useState(null);
  const run = async (key) => {
    setBusy(key);
    try { const out = await RUNNERS[key](item); setRes(r => ({ ...r, [key]: out })); }
    catch (e) { setRes(r => ({ ...r, [key]: { err: String(e?.message || e) } })); }
    setBusy(null);
  };
  const Res = ({ k, r }) => {
    if (r?.err) return <div style={{ color: "#c0392b", fontSize: 11.5 }}>שגיאה: {r.err}</div>;
    if (k === "gematria") return (
      <div style={{ fontSize: 11.5, color: C.goldLight, lineHeight: 1.7 }}>
        {r.contradictions?.length > 0 && <div style={{ color: "#c0392b", fontWeight: 700 }}>⚠️ המנוע סותר: {r.contradictions.map(c => `«${c.text}» טען ${c.claimed} · רגיל-מנוע ${c.engine}`).join(" · ")} — לא לאשר</div>}
        {r.convergences?.length > 0
          ? r.convergences.map((cv, i) => <div key={i}>🔗 <b style={{ color: C.goldBright }}>{cv.value}</b> = {[...new Set(cv.members.map(m => m.term))].join(" ↔ ")} {r.hubCounts?.get(cv.value) ? <span style={{ color: "#3ea6ff" }}>♻️ {r.hubCounts.get(cv.value)} כבר בבנק</span> : <span style={{ color: "#4caf7d" }}>🆕</span>}</div>)
          : <div style={{ color: C.faint }}>אין הצלבה פנימית בין ביטויי-ההודעה.</div>}
        {r.claims?.length > 0 && <div style={{ color: C.faint }}>טענות: {r.claims.slice(0, 5).map(c => `«${c.text}»=${c.value}${r.known.has(c.norm || c.text) ? "♻️" : "🆕"}`).join(" · ")}</div>}
      </div>
    );
    if (k === "search") return (
      <div style={{ fontSize: 11.5, color: C.goldLight, lineHeight: 1.7 }}>
        {r.hubValue != null && <div>צביר {r.hubValue}: <b>{r.hubCount}</b> ביטויים מאומתים בבנק</div>}
        {r.known?.length ? <div>♻️ כבר קיים: {r.known.slice(0, 8).map(x => `«${x.phrase}»=${x.ragil}`).join(" · ")}</div> : <div style={{ color: "#4caf7d" }}>🆕 אף אחד מביטויי-ההודעה לא בבנק — חדש.</div>}
      </div>
    );
    if (k === "axis") {
      const dates = [...(r.time.gregs || []), ...(r.time.hebrews || [])];
      return (
        <div style={{ fontSize: 11.5, color: C.goldLight, lineHeight: 1.7 }}>
          {dates.length === 0 && (r.time.years || []).length === 0 ? <div style={{ color: C.faint }}>לא זוהו תאריכים/שנים בהודעה.</div> : null}
          {dates.map((d, i) => <div key={i}>{d.kind === "hebrew" ? "🔯" : "📅"} {d.raw}{d.iso ? `=${d.iso}` : ""} · {d.role}{d.event ? ` → ${d.event}` : ""}</div>)}
          {(r.time.years || []).filter(y => y.role !== "PERSONAL").map((y, i) => <span key={"y" + i} style={{ marginInlineEnd: 6 }}>{y.year}{r.axis?.byYear?.get(y.year) ? <span style={{ color: "#3ea6ff" }}> ♻️{r.axis.byYear.get(y.year)[0]?.label?.slice(0, 20)}</span> : <span style={{ color: "#4caf7d" }}> 🆕</span>}</span>)}
          {(r.time.sequences || []).map((s, i) => <div key={"s" + i} style={{ color: "#2e9e63" }}>🕐 רצף: {s.years.join("→")} — {s.criterion}</div>)}
        </div>
      );
    }
    if (k === "ai") return (
      <div>
        {r.text ? <div style={{ fontSize: 12, color: "#1b1d22", whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#faf7ff", border: "1px solid #b08bd833", borderRadius: 8, padding: "6px 8px" }}>{r.text}</div> : <div style={{ color: C.faint, fontSize: 11.5 }}>אין תשובת-AI (מכסה/שגיאה) — נסה שוב.</div>}
        <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>
          💰 <b>עלות-ספק</b> (₪) נמדדת בשרת (ai_token_log→agent_token_costs) · 🎟️ <b>קרדיטים</b>: {r.credits} (Human-Gate — <b>לא נגבו</b>) · 💵 מחיר-לקוח: לא-מוגדר. <span style={{ color: "#8a8a95" }}>שלוש שכבות נפרדות.</span>
        </div>
      </div>
    );
    return null;
  };
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {Object.keys(ACT_META).map(k => {
        const m = ACT_META[k]; const r = res[k];
        return (
          <div key={k} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: "6px 8px", background: "#fff" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ color: m.c, fontSize: 12.5 }}>{m.icon} {m.label}</b>
              <button onClick={() => run(k)} disabled={busy === k} style={{ ...chip(!!r, m.c), marginInlineStart: "auto" }}>{busy === k ? "מריץ…" : r ? "הרץ שוב" : "▶ הרץ"}</button>
              {r && !r.err && <span style={{ ...pill("#4caf7d"), fontSize: 10 }}>בוצע</span>}
            </div>
            {r && <div style={{ marginTop: 5 }}><Res k={k} r={r} /><div style={{ color: C.faint, fontSize: 9.5, marginTop: 3 }}>למה: {r.why || "—"} · provenance: {r.prov || "—"} · <b>מציע, לא מקדם (Human-Gate)</b></div></div>}
          </div>
        );
      })}
    </div>
  );
}

// ✍️ Phase 3B · Admin-Reply flow — Human-Gate מלא: תרגום-נכנס→עברית · ניסוח-עברית · תרגום→שפת-המקבל · Preview · אישור · שליחה.
// ⛔ אין Auto-Send · recipient = item.group (מהרשומה) · כל תרגום→ai_token_log · שליחה→wa_send הקיים.
function ReplyFlow({ item }) {
  const [open, setOpen] = useState(false);
  const [heIn, setHeIn] = useState(null);       // ההודעה-הנכנסת מתורגמת לעברית (לקריאת האדמין)
  const [heReply, setHeReply] = useState("");   // התשובה שהאדמין מנסח בעברית
  const det = detectLanguage(item?.raw || "");
  const [recip, setRecip] = useState(det.code !== "unknown" ? det.code : "he");   // שפת-המקבל (ברירת: שזוהתה)
  const [preview, setPreview] = useState(null); // התשובה מתורגמת לשפת-המקבל
  const [busy, setBusy] = useState(null);
  const [sent, setSent] = useState(null);
  const [err, setErr] = useState(null);
  const isHe = det.code === "he";
  const prov = { ref: item?.msgId || null, group: item?.group || null, userRef: item?.phone ? `wa:${item.phone}` : null };

  const doTranslateIn = async () => {
    setBusy("in"); setErr(null);
    const r = await waTranslate({ text: item?.raw || "", target: "he", ...prov });
    if (r.error) setErr("תרגום-נכנס נכשל: " + r.error); else setHeIn(r);
    setBusy(null);
  };
  const doPreview = async () => {   // prepare — יוצר artifact-מאושר (הטקסט המדויק שיישלח)
    if (!heReply.trim() || !item?.group) return;
    setBusy("prev"); setErr(null); setPreview(null);
    const r = await waPrepareReply({ chatId: item.group, hebrew: heReply, target: recip, ref: item?.msgId || null, userRef: prov.userRef, msgIn: item?.raw || null });
    if (r.error) setErr("הכנת-תרגום נכשלה: " + (r.detail || r.error)); else setPreview(r);   // r = {artifact, text}
    setBusy(null);
  };
  const doSend = async () => {   // 🔒 Human-Gate — שולח את ה-artifact המאושר בלבד (מילה-במילה). Idempotent.
    if (!preview?.artifact) return;
    setBusy("send"); setErr(null);
    const r = await waSendArtifact({ artifact: preview.artifact });
    if (r.error) setErr("שליחה נכשלה: " + (r.detail || r.error)); else setSent({ at: r.at, text: preview.text, idempotent: r.idempotent });
    setBusy(null);
  };

  const box2 = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 12.5, color: "#1b1d22", whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ ...chip(true, "#128c4b"), marginTop: 6 }}>✍️ השב (Human-Gate)</button>
  );
  return (
    <div style={{ ...box, marginTop: 8, borderColor: "#128c4b55", background: "#f2fbf5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <b style={{ color: "#128c4b", fontSize: 13 }}>✍️ השב — מסלול אנושי</b>
        <span style={{ color: C.faint, fontSize: 10 }}>ניסוח→תרגום→Preview→אישור→שליחה · אין Auto-Send</span>
        <button onClick={() => setOpen(false)} style={{ ...chip(false), marginInlineStart: "auto" }}>✕</button>
      </div>
      {sent ? (
        <div style={{ ...box2, borderColor: "#4caf7d", background: "#eef7f0" }}>
          <b style={{ color: "#2e9e63" }}>✅ נשלח</b> · {fmt(sent.at)} · אל <bdi dir="ltr">{item.group}</bdi>
          <div style={{ marginTop: 4 }}>🗣️ מקור: {item?.raw?.slice(0, 60)}</div>
          <div>↩️ תשובה ({LANG_HE[recip] || recip}): {sent.text}</div>
          <div style={{ color: C.faint, fontSize: 10, marginTop: 3 }}>סטטוס: sent · תועד ב-wa_bot_log+bot_outbox (מי→למי→מתי→מה)</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 7 }}>
          {/* 1 · הודעה-נכנסת → עברית */}
          <div>
            <div style={{ fontSize: 11, color: "#128c4b", fontWeight: 700 }}>1️⃣ ההודעה בעברית (לקריאתך)</div>
            {isHe ? <div style={{ ...box2, color: "#2e9e63" }}>המקור כבר עברית — {item?.raw?.slice(0, 80)}</div>
              : heIn ? <div style={box2}>{heIn.text} <span style={{ color: C.faint, fontSize: 9.5 }}>(detected {heIn.detected} · {Math.round((heIn.confidence || 0) * 100)}%)</span></div>
                : <button onClick={doTranslateIn} disabled={busy === "in"} style={chip(false, "#3ea6ff")}>{busy === "in" ? "מתרגם…" : "📥 תרגם לעברית"}</button>}
          </div>
          {/* 2 · ניסוח-תשובה בעברית */}
          <div>
            <div style={{ fontSize: 11, color: "#128c4b", fontWeight: 700 }}>2️⃣ נסח תשובה בעברית</div>
            <textarea value={heReply} onChange={e => { setHeReply(e.target.value); setPreview(null); }} rows={3} dir="rtl"
              placeholder="כתוב כאן בעברית…" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: F.body, resize: "vertical" }} />
          </div>
          {/* 3 · שפת-המקבל + override */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#128c4b", fontWeight: 700 }}>3️⃣ שפת-המקבל:</span>
            <span style={{ ...pill(det.confidence >= 0.6 ? "#3ea6ff" : "#c79a2e"), fontSize: 10 }}>זוהה: {det.code === "unknown" ? "לא-ודאי" : det.name} {Math.round((det.confidence || 0) * 100)}%</span>
            <select value={recip} onChange={e => { setRecip(e.target.value); setPreview(null); }} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 6px", fontSize: 12 }}>
              {CANON_LANGS.map(l => <option key={l} value={l}>{LANG_HE[l]}</option>)}
            </select>
            <span style={{ color: C.faint, fontSize: 9.5 }}>override ידני</span>
          </div>
          {/* 4 · Preview */}
          <div>
            <button onClick={doPreview} disabled={!heReply.trim() || busy === "prev"} style={chip(!!preview, "#c79a2e")}>{busy === "prev" ? "מתרגם…" : "👁️ תצוגה מקדימה (תרגום)"}</button>
            {preview && <div style={{ ...box2, marginTop: 5, borderColor: "#c79a2e55" }}>
              <div style={{ color: C.faint, fontSize: 10 }}>התשובה ב{LANG_HE[recip] || recip} (מה שיישלח):</div>{preview.text}
            </div>}
          </div>
          {/* 5 · אישור ושליחה (Human-Gate) */}
          <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 6 }}>
            <button onClick={doSend} disabled={!preview?.artifact || busy === "send"} style={chip(true, preview?.artifact ? "#128c4b" : "#8a8a95")}>
              {busy === "send" ? "שולח…" : "✅ אשר (ZURIEL) ושלח את המאושר"}
            </button>
            <span style={{ color: C.faint, fontSize: 10, marginInlineStart: 8 }}>שולח את ה-artifact המאושר בלבד (מילה-במילה) · recipient מהרשומה (<bdi dir="ltr">{item?.group || "—"}</bdi>) · double-click בטוח</span>
          </div>
        </div>
      )}
      {err && <div style={{ color: "#c0392b", fontSize: 11.5, marginTop: 5 }}>⚠️ {err}</div>}
      <div style={{ color: C.faint, fontSize: 9.5, marginTop: 5 }}>💰 כל תרגום נרשם ל-ai_token_log (ref/msg/group/user) · קרדיטים לא נגבים (מדידה בלבד).</div>
    </div>
  );
}

// 📱 הקשר-מלא של הודעת WhatsApp/DM — זהות · הודעה · תשובת-בוט · timeline · provenance · מצב-פעולות.
// ⛔ READ בלבד (wa_bot_log/getWaThread) · זהות דרך ה-resolver הקיים (UNKNOWN כשאין) · אין טבלת-conversations חדשה · אין שליחה.
function WaContext({ item }) {
  const [thread, setThread] = useState(null);
  useEffect(() => {
    if (item?.srckind !== "wa" || (!item?.group && !item?.phone)) { setThread(null); return; }
    let alive = true; setThread(null);
    getWaThread({ groupId: item.group, sender: item.phone, limit: 60 })
      .then(rows => { if (alive) setThread(rows || []); }).catch(() => { if (alive) setThread([]); });
    return () => { alive = false; };
  }, [item?.group, item?.phone, item?.srckind]);
  if (item?.srckind !== "wa") return null;
  const w = item.writer;
  const ch = waChannel(item.group);
  const phone = item.phone || ch.phone;
  const matched = w?.state === "matched";
  const contributor = matched ? (w.canonical || w.contributor) : null;
  const vip = contributor?.vip;
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", gap: 8, fontSize: 12, padding: "2px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
      <span style={{ color: C.faint, minWidth: 92 }}>{k}</span>
      <span style={{ color: C.goldLight, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ ...box, marginTop: 12, borderColor: "#25d36688", background: "#f2fbf5" }}>
      {/* 👤 מי זה */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: "#128c4b", fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📱 הקשר ההודעה</span>
        <span style={{ ...pill(ch.c) }}>{ch.t}</span>
        {matched
          ? <span style={{ ...pill("#4caf7d") }}>✓ {contributor?.display_name}</span>
          : w?.state === "ambiguous"
            ? <span style={{ ...pill("#c79a2e") }}>⚠️ מועמדים: {(w.candidates || []).map(c => c.display_name).join(" / ")}</span>
            : <span style={{ ...pill("#8a8a95") }}>❔ UNKNOWN — לא מזוהה</span>}
        {vip && <span style={{ ...pill("#b08bd8") }}>👑 VIP</span>}
      </div>
      <Row k="שם" v={item.senderName || item.author || "—"} />
      <Row k="טלפון" v={phone || "— (לא זמין ברשומה)"} />
      <Row k="זהות" v={matched ? `contributor: ${contributor?.display_name}${vip ? " · VIP" : ""}` : (w?.state === "ambiguous" ? "מועמד — דורש מיזוג-אנושי (לא קנוני)" : "UNKNOWN — לא נבחר contributor")} />
      <Row k="תאריך/שעה" v={fmt(item.ts)} />
      <Row k="provenance" v={`action=${item.action || "—"}${item.botMode ? ` · mode=${item.botMode}` : ""}${item.msgId ? ` · msg=${item.msgId}` : ""}`} />

      {/* 🌍 שכבת-שפה — זיהוי (heuristic·confidence) · תצוגת-אדמין תמיד עברית · שפת-תשובה. המקור לא משתנה. */}
      {(() => {
        const det = detectLanguage(item.raw || "");
        const rep = replyLanguage(det, null);   // אין העדפת-משתמש מאומתת עדיין (agent_user_memory · שלב עתידי)
        const isHe = det.code === "he";
        return (
          <div style={{ ...box, marginTop: 8, background: "#f6f7ff", borderColor: "#3ea6ff55", padding: "8px 10px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ color: "#1c4bbf", fontSize: 12 }}>🌍 שפה</b>
              <span style={{ ...pill(det.confidence >= 0.6 ? "#3ea6ff" : det.confidence >= 0.4 ? "#c79a2e" : "#8a8a95") }}>
                {det.code === "unknown" ? "❔ לא-ודאי" : det.name} · confidence {Math.round((det.confidence || 0) * 100)}%
              </span>
              <span style={{ color: C.faint, fontSize: 10 }}>{det.why}</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.goldLight, marginTop: 4, lineHeight: 1.7 }}>
              <div>👁️ <b>תצוגת-אדמין (עברית):</b> {isHe
                ? <span style={{ color: "#2e9e63" }}>המקור כבר עברית — אין צורך בתרגום</span>
                : <span style={{ color: "#2e9e63" }}>תרגום ההודעה לעברית זמין ב«✍️ השב» ← «📥 תרגם לעברית» (מנוע video-transcribe · raw, דרך wa_admin_reply · <b>מחובר וחי</b>)</span>}
              </div>
              <div>↩️ <b>שפת-תשובה (ברירת-מחדל):</b> {LANG_HE[rep.code] || rep.code} <span style={{ color: C.faint }}>({rep.note}) · ניתן לשינוי ידני</span></div>
              <div style={{ color: C.faint, fontSize: 10 }}>⛔ המקור נשמר כלשונו · הניתוח המחקרי תמיד על המקור, לא על התרגום · תרגום = שכבת-תקשורת בלבד</div>
            </div>
          </div>
        );
      })()}

      {/* 💬 הודעה + 🤖 תשובת-הבוט */}
      <div style={{ marginTop: 10 }}>
        <div style={{ color: "#128c4b", fontWeight: 800, fontSize: 12 }}>💬 ההודעה המלאה</div>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, color: "#1b1d22", whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 3 }}>{item.raw || <span style={{ color: C.faint }}>(ללא טקסט)</span>}</div>
        <div style={{ color: "#128c4b", fontWeight: 800, fontSize: 12, marginTop: 8 }}>🤖 תשובת הבוט</div>
        <div style={{ background: "#eef7f0", border: `1px solid #25d36633`, borderRadius: 10, padding: "8px 10px", fontSize: 13, color: "#1b1d22", whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 3 }}>
          {item.botReply ? (/^\[.*\]$/.test(item.botReply) ? <span style={{ color: C.faint }}>{item.botReply} (marker — הטקסט המלא ב-timeline/bot_outbox)</span> : item.botReply) : <span style={{ color: C.faint }}>(אין תשובה מתועדת בשורה)</span>}
        </div>
      </div>

      {/* 🕐 Timeline — כל השיחה לפי group_id (הקשר קיים, לא טבלה חדשה) */}
      <div style={{ marginTop: 10 }}>
        <div style={{ color: "#128c4b", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>🕐 Timeline · כל השיחה {thread ? `(${thread.length})` : "…"}</div>
        {thread === null ? <div style={{ color: C.faint, fontSize: 12 }}>טוען שיחה…</div>
          : !thread.length ? <div style={{ color: C.faint, fontSize: 12 }}>אין הודעות נוספות בשיחה זו.</div>
            : (
              <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto", paddingInlineEnd: 2 }}>
                {thread.map((m, i) => (
                  <div key={i} style={{ borderInlineStart: `2px solid ${C.border}`, paddingInlineStart: 8 }}>
                    <div style={{ fontSize: 9.5, color: C.faint }}>{fmt(m.created_at)}{m.action ? ` · ${m.action}` : ""}</div>
                    {m.text_in && <div style={{ fontSize: 12.5, color: "#1b1d22", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", marginTop: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><b style={{ color: "#128c4b" }}>👤</b> {m.text_in}</div>}
                    {m.reply_out && <div style={{ fontSize: 12.5, color: "#1b1d22", background: "#eef7f0", borderRadius: 8, padding: "5px 8px", marginTop: 3, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><b>🤖</b> {/^\[.*\]$/.test(m.reply_out) ? <span style={{ color: C.faint }}>{m.reply_out}</span> : m.reply_out}</div>}
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* ⚙️ פעולות — מנועים קיימים, רצות בפועל על ההודעה (Human-Gate: מחשב/קורא, לא מקדם) */}
      <div style={{ marginTop: 10, borderTop: `1px dashed ${C.border}`, paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ color: "#128c4b", fontWeight: 800, fontSize: 12 }}>⚙️ פעולות · רצות על ההודעה</span>
          <span style={{ color: C.faint, fontSize: 10 }}>קלט = ההודעה הזו בלבד (לא כל ה-thread)</span>
        </div>
        <ActionRunner item={item} />
        <ReplyFlow item={item} />
        <div style={{ color: C.faint, fontSize: 10.5, marginTop: 6 }}>
          🔬 <b>ניתוח מלא</b> (Smart Analysis Flow — חילוץ·DB-First·שיטה·מנוע·FACT/CLAIM/CONVERGENCE·המלצה) בפאנל שמתחת.
        </div>
      </div>
    </div>
  );
}

// מקרא-פעולות ל-DetailPanel (מצב מדויק לכל פעולה).
// ── RESEARCH TRIAGE BEFORE HUMAN GATE — "🧠 בדיקת מחקר", תמיד מעל «שמור למחקר». ──
// Orchestration בלבד מעל triage.js (שעצמו עוטף רק analysisFlow.js+gematria.js הקיימים). אפליית
// dbFirst/existingObjects נשלפת כאן (DB-First מוזרק מהרכיב, אותו דפוס בדיוק כמו FullAnalysis הקיים).
// אפמרי לחלוטין: הניתוח חי ב-state בלבד, נעלם בסגירה. אין WRITE עד לחיצה מפורשת על פעולה.
const INTEREST_COLOR = { HIGH: "#4caf7d", MEDIUM: "#3ea6ff", LOW: "#c79a2e", NONE: "#8a8a95" };
const EXISTING_HE = {
  new: "חדש", already_exists: "קיים בבנק", duplicate: "כפול-מדויק", strengthens: "מחזק/מצטרף",
};

function TriageArtifactCard({ art, baseSourceRef, contributor, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const c = art.candidate;
  const vBadge = art.verification.engine_verified === true ? { t: "✓ אומת במנוע", col: "#4caf7d" }
    : art.verification.engine_verified === false ? { t: "✗ המנוע לא-תואם", col: "#e0563a" }
    : { t: "— אינו-רלוונטי/לא-ניתן-לאימות", col: "#8a8a95" };
  const eBadge = { t: EXISTING_HE[art.existing.status] || art.existing.status, col: art.existing.status === "new" ? "#4caf7d" : art.existing.status === "duplicate" ? "#8a8a95" : "#3ea6ff" };

  const save = async () => {
    setBusy(true);
    const sourceRef = `${baseSourceRef}#a${art.idx}`;
    const kind = art.routing.artifact_type === "relation" ? "relation" : "observation";
    const statement = c.text + (c.value != null ? ` = ${c.value}` : "") + (c.method ? ` (${c.method})` : "");
    const { data, error } = await supabase.rpc("research_artifact_save", {
      p_source_ref: sourceRef, p_kind: kind, p_statement: statement, p_value: c.value ?? null,
      p_terms: [c.norm || c.text], p_contributor: contributor || null,
      p_engine_verified: art.verification.engine_verified === true,
      p_engine_detail: art.verification.engine_detail || {},
    });
    setBusy(false);
    setRes(error ? { ok: false, error: error.message } : data);
  };

  return (
    <div style={{ ...box, padding: "9px 11px", marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={pill(c.type === "equation" ? "#8458ff" : "#3ea6ff")}>{c.type}</span>
        <span style={{ color: C.goldLight, fontWeight: 700, fontSize: 12.5 }}>{c.text}</span>
        {c.value != null && <b style={{ color: C.goldBright }}>= {c.value}</b>}
        {c.method && <span style={{ color: C.faint, fontSize: 10.5 }}>({c.method})</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
        <span style={pill(INTEREST_COLOR[art.interest])}>{art.interest}</span>
        <span style={pill(vBadge.col)}>{vBadge.t}</span>
        <span style={pill(eBadge.col)}>{eBadge.t}</span>
      </div>
      <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>
        {art.reasons.join(" · ")}
      </div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
        <b style={{ color: C.goldLight }}>המלצת-ניתוב:</b> {art.routing.label} — {art.routing.why}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        {art.routing.primary === "A" && !res && (
          <button disabled={busy} onClick={save} style={{ ...chip(true, "#4caf7d"), opacity: busy ? 0.5 : 1 }}>💾 שמור כמועמד מחקר</button>
        )}
        {art.routing.primary === "D" && (
          <span style={{ color: "#3ea6ff", fontSize: 11 }}>✓ כבר קיים — research_objects:{art.existing.detail.research_object_id}</span>
        )}
        {(art.routing.primary === "B" || art.routing.primary === "C") && (
          <span style={{ color: C.faint, fontSize: 11 }}>ℹ️ נתב ידנית דרך השער הקיים — אין כפתור אוטומטי (Gate #18)</span>
        )}
        {art.routing.primary === "F" && !res && (
          <button onClick={() => onDismiss(art.idx)} style={chip(false)}>🙈 לא למחקר (מקומי בלבד)</button>
        )}
        {res && res.ok && <span style={{ color: "#4caf7d", fontSize: 11 }}>{res.already_existed ? "✓ כבר נמצא" : "✓ נשמר"} — research_objects:{res.research_object_id}</span>}
        {res && res.ok === false && <span style={{ color: "#e0563a", fontSize: 11 }}>{res.error}</span>}
      </div>
    </div>
  );
}

// ── RESEARCH CASE / "🗂️ תיק מחקר" — ONE unified projection, not 5 separate places (Gate #18: no new store). ──
// "ONE PLACE TO UNDERSTAND ≠ ONE TABLE TO STORE. Foundation → Projection → Experience." — buildResearchCase()
// (triage.js) is the ONLY new logic (pure group-by over the already-reused extractCandidates/triageSource) —
// this component is pure rendering over it + item's own already-loaded source fields. No new table/RPC/engine.
function CaseSection({ title, children }) {
  return (
    <div>
      <div style={{ color: "#8a6d1a", fontFamily: F.heading, fontWeight: 800, fontSize: 11.5, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

// forceItem/forceLabel — נקודת-ההרחבה היחידה שנדרשה כדי לתמוך ב"בנה תיק מחקר מהבחירה" (PHASE 4, Zvi Conversation
// View): כשמוזרק item סינתטי (raw=טקסט-מאוחד מכמה הודעות שנבחרו ידנית + sourceRef=שרשור-provenance אמיתי),
// הפאנל משתמש בו כ-"effective" source במקום ה-item הרגיל, בלי לשכפל את כל ה-A-H — אותה לוגיקה בדיוק.
function ResearchCasePanel({ item, forceItem, forceLabel }) {
  const [state, setState] = useState(null); // null=לא-הורץ · "loading" · {kase} · {error}
  const [dismissed, setDismissed] = useState(() => new Set());
  if (!forceItem && (item.srckind !== "channel" || !item.cuId)) return null;
  const effective = forceItem || item;
  const baseSourceRef = forceItem ? forceItem.sourceRef : `channel_updates:${item.cuId}`;

  const run = async () => {
    setState("loading");
    try {
      const { phrases, values } = collectQueryNeeds(effective);
      const [dbFirst, hubCounts, existingRes] = await Promise.all([
        phrases.length ? dbFirstLookup(phrases, null) : Promise.resolve({ known: [] }),
        values.length ? getHubCounts(values) : Promise.resolve(new Map()),
        values.length
          ? supabase.from("research_objects").select("id,value,terms,statement,source_ref").in("value", values)
          : Promise.resolve({ data: [] }),
      ]);
      const kase = buildResearchCase(effective, {
        dbFirst: { known: dbFirst.known || [], hubCounts },
        existingObjects: existingRes.data || [],
      });
      setState({ kase });
    } catch (e) {
      setState({ error: e?.message || "שגיאה בהרכבת תיק-המחקר" });
    }
  };

  return (
    <div style={{ ...box, marginTop: 12, borderColor: "#e9c84a55", background: "#fffaf3" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: "#8a6d1a", fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>🗂️ תיק מחקר{forceLabel ? ` — ${forceLabel}` : ""}</span>
        <span style={{ color: C.faint, fontSize: 10 }}>מקום אחד לכל מה שהמערכת יודעת על המקור — הצעה בלבד, לא Canonical, לא פרסום</span>
        {!state && <button onClick={run} style={{ ...chip(true, "#e9c84a"), marginInlineStart: "auto" }}>🗂️ בנה תיק</button>}
        {state === "loading" && <span style={{ color: C.faint, fontSize: 11, marginInlineStart: "auto" }}>בונה תיק…</span>}
        {state && state !== "loading" && <button onClick={run} style={{ ...chip(false), marginInlineStart: "auto" }}>↻ בנה מחדש</button>}
      </div>
      {state && state !== "loading" && state.error && <div style={{ color: "#e0563a", fontSize: 12 }}>{state.error}</div>}
      {state && state !== "loading" && state.kase && (() => {
        const { kase } = state;
        const visible = kase.artifacts.filter(a => !dismissed.has(a.idx));
        const newOnes = visible.filter(a => a.existing.status === "new");
        const factLike = visible.filter(a => a.verification.engine_verified === true);
        const claimLike = visible.filter(a => a.verification.engine_verified !== true);
        const gateNeeded = visible.filter(a => a.routing.primary === "A");

        return (
          <div style={{ display: "grid", gap: 12 }}>
            <CaseSection title="A · מקור (Source)">
              <div style={{ fontSize: 11.5, color: C.muted }}>
                כותב: <b>{effective.author || effective.rawAuthor || "—"}</b> · ערוץ: {effective.source || "—"} · {effective.ts ? fmt(effective.ts) : ""}
                {" · "}provenance: <code style={{ fontSize: 10 }}>{baseSourceRef}</code>
              </div>
              {effective.img && <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>יש תמונה מצורפת למקור (מוצגת למעלה בפאנל).</div>}
            </CaseSection>

            <CaseSection title={`B · ממצאים שחולצו (${visible.length})`}>
              {!visible.length && <div style={{ color: C.faint, fontSize: 12 }}>לא נמצאה כאן טענת-ערך לניתוב.</div>}
              {visible.map(a => (
                <div key={a.idx} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12, marginBottom: 3 }}>
                  <span style={pill(a.candidate.type === "equation" ? "#8458ff" : "#3ea6ff")}>{a.candidate.type}</span>
                  <span style={{ color: C.goldLight, fontWeight: 700 }}>{a.candidate.text}</span>
                  {a.candidate.value != null && <b style={{ color: C.goldBright }}>= {a.candidate.value}</b>}
                  {a.candidate.method && <span style={{ color: C.faint, fontSize: 10 }}>({a.candidate.method})</span>}
                </div>
              ))}
            </CaseSection>

            <CaseSection title="C · אמת מחושבת (Engine Verification)">
              {!visible.length && <div style={{ color: C.faint, fontSize: 12 }}>—</div>}
              {visible.map(a => {
                const v = a.verification.engine_verified;
                const sym = v === true ? "✓ אומת" : v === false ? "⚠ המנוע לא-תואם" : "— לא-ניתן-לאימות קליינטי";
                const col = v === true ? "#4caf7d" : v === false ? "#e0563a" : "#8a8a95";
                return (
                  <div key={a.idx} style={{ fontSize: 11.5, marginBottom: 2 }}>
                    <span style={{ color: col, fontWeight: 700 }}>{sym}</span>
                    <span style={{ color: C.muted }}> — {a.candidate.text}{a.candidate.value != null ? ` = ${a.candidate.value}` : ""}</span>
                    {v !== true && a.verification.engine_detail?.reason && (
                      <span style={{ color: C.faint, fontSize: 10 }}> ({a.verification.engine_detail.reason})</span>
                    )}
                    {a.verification.engine_matches?.length > 0 && (
                      <div style={{ color: "#3ea6ff", fontSize: 10.5, marginTop: 1 }}>
                        🔎 Engine Match (PHASE 5 — לא לפי ה-label, נמצא בפועל): {a.verification.engine_matches.map(mm => `${mm.method}`).join(" · ")}
                        <span style={{ color: C.faint }}> — סיגנל בלבד, Engine Match ≠ Truth.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CaseSection>

            <CaseSection title="D · מה כבר קיים במערכת">
              {!visible.length && <div style={{ color: C.faint, fontSize: 12 }}>—</div>}
              {visible.map(a => (
                <div key={a.idx} style={{ fontSize: 11.5, marginBottom: 2 }}>
                  <span style={{ color: "#3ea6ff", fontWeight: 700 }}>◐ {EXISTING_HE[a.existing.status] || a.existing.status}</span>
                  <span style={{ color: C.muted }}> — {a.candidate.text}</span>
                  {a.existing.status === "duplicate" && <span style={{ color: C.faint, fontSize: 10 }}> (research_objects:{a.existing.detail.research_object_id})</span>}
                </div>
              ))}
            </CaseSection>

            <CaseSection title={`E · מה חדש (${newOnes.length})`}>
              <div style={{ color: C.faint, fontSize: 10.5, marginBottom: 4 }}>⚠ חדש-למערכת ≠ נכון — NEW ≠ TRUE.</div>
              {!newOnes.length && <div style={{ color: C.faint, fontSize: 12 }}>אין ממצא-חדש כרגע.</div>}
              {newOnes.map(a => (
                <div key={a.idx} style={{ fontSize: 11.5, color: "#4caf7d", fontWeight: 700 }}>★ {a.candidate.text}{a.candidate.value != null ? ` = ${a.candidate.value}` : ""}</div>
              ))}
            </CaseSection>

            <CaseSection title={`F · קשרים (${kase.connections.length})`}>
              {!kase.connections.length && <div style={{ color: C.faint, fontSize: 12 }}>לא נמצאה הצטלבות-ערך בתוך מקור זה.</div>}
              {kase.connections.map(cn => (
                <div key={cn.value} style={{ fontSize: 12, marginBottom: 3 }}>
                  🔗 <b style={{ color: C.goldBright }}>{cn.value}</b> ↔ {cn.phrases.map((p, i) => (
                    <span key={i} style={{ color: C.goldLight }}>{p}{i < cn.phrases.length - 1 ? " ↔ " : ""}</span>
                  ))}
                  <div style={{ color: C.faint, fontSize: 10 }}>👤 טענת-כותב בתוך אותו מקור — לא הצלבה מאושרת</div>
                </div>
              ))}
            </CaseSection>

            <CaseSection title="G · פרשנות (הפרדה)">
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 2 }}>
                <div><span style={pill("#4caf7d")}>FACT</span> {factLike.length} ממצאים אומתו במנוע (engine_verified=true).</div>
                <div><span style={pill("#c79a2e")}>CLAIM</span> {claimLike.length} ממצאים הם טענת-כותב שלא אומתה/לא-ניתנת-לאימות/נסתרה — נשארים Claim, לא Fact.</div>
                <div><span style={pill("#a48bff")}>👤 טענת כותב</span> כל תוכן המקור — {effective.author || effective.rawAuthor || "—"} — לא נקבע כאן קנוני.</div>
                {kase.weakSignals.length > 0 && (
                  <div><span style={pill("#8a8a95")}>🟣 INTERPRETATION</span> {kase.weakSignals.length} אותות-הקשר נוספים (ללא ערך-לניתוב, לא נעלמים): {kase.weakSignals.map(w => w.text).join(" · ")}</div>
                )}
              </div>
            </CaseSection>

            <CaseSection title={`H · Human Gate (${gateNeeded.length} דורשים החלטה מתוך ${visible.length})`}>
              {!gateNeeded.length && <div style={{ color: C.faint, fontSize: 12 }}>אין כרגע ממצא הדורש החלטת-אדם — לא כל ממצא צריך כפתור.</div>}
              {gateNeeded.map(a => (
                <TriageArtifactCard key={a.idx} art={a} baseSourceRef={baseSourceRef} contributor={effective.author}
                  onDismiss={(idx) => setDismissed(p => new Set(p).add(idx))} />
              ))}
              {visible.some(a => a.routing.primary === "D") && (
                <div style={{ fontSize: 11, color: "#3ea6ff", marginTop: 4 }}>
                  {visible.filter(a => a.routing.primary === "D").length} ממצא/ים כבר קיימים — ראה סעיף D, אין צורך בהחלטה נוספת.
                </div>
              )}
            </CaseSection>
          </div>
        );
      })()}
    </div>
  );
}

// ── 💬 ZVI CONVERSATION VIEW (PHASE 1-4) — Thread ≠ Research Case. ──────────────────────────────
// Thread = פרוייקציה כרונולוגית טהורה על המקור (getContributorConversation, READ-ONLY, אין טבלה חדשה).
// Case = מה שנבנה מתוך בחירה-אנושית מפורשת של חלק מהרצף (ResearchCasePanel forceItem, ללא WRITE אוטומטי).
// ⛔ Scoped בכוונה ל-Zvi בלבד (slug='tzvi-opoc') — אין contributors.phone גנרי לכל כתב (ר' work_log), כך
// שזו לא "מערכת-Person" חדשה אלא זהות מוזרקת במפורש לפי הידע-הקיים (phone+credit variants), בדיוק כמו
// שה-brief ביקש ("PERSON = מי שלח" מוזרק, לא Person system מקביל).
// waSenderName="OPOC1 OPOC1" — חובה, לא רק phone: אחרת רשומות "agent_reply" של הבוט-עצמו (sender_name="רזיאל
// (agent)") שנרשמות תחת אותו טלפון-פרטי נכנסות בטעות ל"שיחה של צבי" (נמצא בפועל, ids 211/220 ב-wa_bot_log).
const ZVI_IDENTITY = { phone: "972537738295", waSenderName: "OPOC1 OPOC1", credits: ["צבי", "צבי (OPOC)"] };
const hm = (ts) => ts ? new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—";
const dayKey = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : "—";

function ConvoItem({ it, selected, onToggle, onBuildContext }) {
  if (it.duplicateOfSourceRef) {
    return (
      <div style={{ fontSize: 10.5, color: C.faint, padding: "2px 4px 2px 34px" }}>
        🔁 טקסט זהה למעלה (ingestion כפול, {hm(it.ts)}) — <code style={{ fontSize: 9 }}>{it.sourceRef}</code>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 4px", borderRadius: 8, background: selected ? "#e9c84a18" : "transparent" }}>
      <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
          <b style={{ color: C.goldLight }}>{hm(it.ts)}</b>
          <span style={{ color: C.faint }}>— {it.credit || "צבי"}</span>
          <span style={pill(it.kind === "channel_updates" ? "#3ea6ff" : "#8458ff")}>{it.kind}</span>
          {it.channel && <span style={{ color: C.faint, fontSize: 9.5 }}>{String(it.channel).replace(/@[gc]\.us$/, "")}</span>}
          <button onClick={onBuildContext} style={{ ...chip(false), marginInlineStart: "auto", fontSize: 10 }}>🗂️ בדוק כרצף מחקר</button>
        </div>
        {it.img && (
          <div style={{ margin: "4px 0" }}>
            <img src={thumb(it.img, 240)} alt="" style={{ maxWidth: 220, maxHeight: 160, objectFit: "contain", borderRadius: 8, background: "#0002" }} />
          </div>
        )}
        {it.isImagePlaceholder && !it.img && (
          <div style={{ fontSize: 11, color: C.faint }}>
            🖼️ תמונה (WhatsApp) — {it.ocrNotStored ? "OCR נשלח בזמנו אך לא נשמר ב-DB (reply_out ריק)" : "לא נשמרה תמונה/OCR בפועל, רק אינדיקציה"}
          </div>
        )}
        {it.text && <div style={{ fontSize: 12.5, color: C.goldLight, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{it.text}</div>}
        {!it.text && !it.img && !it.isImagePlaceholder && <div style={{ fontSize: 11, color: C.faint }}>(ללא תוכן נשמר)</div>}
        <div style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>provenance: <code>{it.sourceRef}</code>{it.msgId ? ` · msg_id:${it.msgId}` : ""}</div>
      </div>
    </div>
  );
}

function ZviConversationPanel({ contributor }) {
  const [items, setItems] = useState(null); // null=לא-נטען עדיין
  const [sel, setSel] = useState(() => new Set());
  const [showCase, setShowCase] = useState(false);
  const isZvi = contributor?.slug === "tzvi-opoc";

  useEffect(() => {
    if (!isZvi) return;
    let alive = true;
    getContributorConversation(ZVI_IDENTITY).then(rows => { if (alive) setItems(rows); });
    return () => { alive = false; };
  }, [isZvi]);

  if (!isZvi) return null;

  const toggle = (idx) => setSel(p => { const n = new Set(p); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  // PHASE 4 — ברירת-מחדל: מציעה context (קודם+נבחר+הבא), לא בונה Case אוטומטית. Zuriel מאשר/מתקן ואז לוחץ "בנה".
  const buildContext = (idx) => {
    setSel(new Set([idx - 1, idx, idx + 1].filter(i => items && i >= 0 && i < items.length)));
    setShowCase(false);
  };

  const groups = useMemo(() => {
    if (!items) return [];
    const byDay = new Map();
    items.forEach((it, idx) => {
      const k = dayKey(it.ts);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push({ ...it, idx });
    });
    return [...byDay.entries()];
  }, [items]);

  const selectedItems = items ? [...sel].sort((a, b) => a - b).map(i => items[i]).filter(Boolean) : [];
  const forceItem = selectedItems.length ? {
    raw: selectedItems.map(it => `[${hm(it.ts)}] ${it.text || (it.img ? "(תמונה מצורפת)" : it.isImagePlaceholder ? "(תמונה — ללא OCR שמור)" : "")}`).join("\n"),
    author: "צבי (OPOC)", source: `💬 השיחה של צבי — בחירה ידנית (${selectedItems.length} פריטים)`,
    ts: selectedItems[0]?.ts, img: selectedItems.find(it => it.img)?.img || null,
    sourceRef: selectedItems.map(it => it.sourceRef).join("+"),
  } : null;

  return (
    <div style={{ ...box, marginTop: 12, borderColor: "#8458ff44" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: "#8458ff", fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>💬 השיחה של צבי</span>
        <span style={{ color: C.faint, fontSize: 10 }}>רצף כרונולוגי (Thread) — לא Research Case. פרוייקציה READ-ONLY על channel_updates+wa_bot_log+wa_deep_queue.</span>
      </div>
      {items === null && <div style={{ color: C.faint, fontSize: 12 }}>טוען רצף…</div>}
      {items && !items.length && <div style={{ color: C.faint, fontSize: 12 }}>לא נמצא חומר.</div>}
      {items && items.length > 0 && (
        <div style={{ maxHeight: 480, overflow: "auto", display: "grid", gap: 2 }}>
          {groups.map(([day, dayItems]) => (
            <div key={day}>
              <div style={{ textAlign: "center", color: C.faint, fontSize: 10, margin: "10px 0 4px", borderBottom: `1px dashed ${C.border}` }}>{fmt(dayItems[0].ts)}</div>
              {dayItems.map(it => (
                <ConvoItem key={it.sourceRef} it={it} selected={sel.has(it.idx)} onToggle={() => toggle(it.idx)} onBuildContext={() => buildContext(it.idx)} />
              ))}
            </div>
          ))}
        </div>
      )}
      {sel.size > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: C.faint, fontSize: 11 }}>{sel.size} פריטים נבחרו</span>
          <button onClick={() => setShowCase(true)} style={chip(true, "#e9c84a")}>בנה תיק מחקר מהבחירה</button>
          <button onClick={() => { setSel(new Set()); setShowCase(false); }} style={chip(false)}>נקה בחירה</button>
        </div>
      )}
      {showCase && forceItem && (
        <ResearchCasePanel forceItem={forceItem} forceLabel={`רצף נבחר · ${selectedItems.length} פריטים`} />
      )}
    </div>
  );
}

// ── 🗂️ ZVI CONTRIBUTOR RESEARCH DOSSIER (Zvi Full Corpus Pass) ─────────────────────────────────
// Foundation → Projection → Experience: קורא בלבד מ-research_objects (הפאונדיישן, אחרי ה-batch pass)
// + research_items(handled) הקיים. אין הרצה-חיה של extractCandidates על 400+ הודעות בכל טעינה — זו
// רק פרוייקציה על מה שכבר-נשמר. לא Premium, לא Number Page ציבורי — תצוגת-מחקר לצוריאל בלבד.
const DOSSIER_VERDICT = (o) => {
  if (o.engine_verified === true) return o.engine_detail?.compound ? "verified_composite" : "verified_direct";
  if (o.engine_detail?.compound?.status === "METHOD_UNRESOLVED") return "unresolved";
  if (o.engine_verified === false) return "unverified";
  return "interpretation";
};
const VERDICT_HE = {
  verified_direct: "✓ אומת ישירות", verified_composite: "✓ אומת (Composite)",
  unresolved: "◌ שיטה לא-מזוהה", unverified: "🟡 טרם אומת", interpretation: "🟣 פרשנות",
};
const VERDICT_COLOR = { verified_direct: "#4caf7d", verified_composite: "#4caf7d", unresolved: "#8a8a95", unverified: "#c79a2e", interpretation: "#a48bff" };

function ZviDossierPanel({ contributor }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ number: "", verdict: "", q: "" });
  const isZvi = contributor?.slug === "tzvi-opoc";

  useEffect(() => {
    if (!isZvi) return;
    let alive = true;
    getContributorDossierData({ contributor: "צבי (OPOC)", handledPrefix: "ch:" }).then(d => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [isZvi]);

  if (!isZvi) return null;
  if (!data) return (
    <div style={{ ...box, marginTop: 12, borderColor: "#e9c84a55" }}>
      <span style={{ color: "#8a6d1a", fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>🗂️ תיק המחקר של צבי</span>
      <div style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>טוען…</div>
    </div>
  );

  const objects = data.objects.map(o => ({ ...o, verdict: DOSSIER_VERDICT(o) }));
  const verifiedDirect = objects.filter(o => o.verdict === "verified_direct");
  const verifiedComposite = objects.filter(o => o.verdict === "verified_composite");
  const unresolved = objects.filter(o => o.verdict === "unresolved");
  const unverified = objects.filter(o => o.verdict === "unverified");
  const interpretations = objects.filter(o => o.verdict === "interpretation");

  // מספרים מרכזיים — קיבוץ לפי value, ממוין לפי כמות
  const byValue = new Map();
  for (const o of objects) { if (o.value == null) continue; if (!byValue.has(o.value)) byValue.set(o.value, []); byValue.get(o.value).push(o); }
  const keyNumbers = [...byValue.entries()].sort((a, b) => b[1].length - a[1].length);
  // קשרים — ערכים עם ≥2 ביטויים שונים (terms[0] כביטוי-מייצג)
  const connections = keyNumbers.filter(([, os]) => new Set(os.map(o => (o.terms || [])[0] || o.statement)).size >= 2);
  // מקורות — פירוק source_ref לבסיס (בלי #batchN/#aN)
  const bySource = new Map();
  for (const o of objects) {
    const base = String(o.source_ref || "").split("#")[0];
    if (!bySource.has(base)) bySource.set(base, 0);
    bySource.set(base, bySource.get(base) + 1);
  }

  const methods = [...new Set(objects.map(o => o.engine_detail?.verification?.method).filter(Boolean))].sort();

  const passFilter = (o) => {
    if (filters.number && String(o.value) !== filters.number) return false;
    if (filters.verdict && o.verdict !== filters.verdict) return false;
    if (filters.q && !((o.statement || "").includes(filters.q))) return false;
    return true;
  };
  const filtered = objects.filter(passFilter);
  const anyFilterActive = filters.number || filters.verdict || filters.q;

  const handledCount = data.handled?.length || 0;

  return (
    <div style={{ ...box, marginTop: 12, borderColor: "#e9c84a55", background: "#fffaf3" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ color: "#8a6d1a", fontFamily: F.heading, fontWeight: 900, fontSize: 15 }}>🗂️ תיק המחקר של צבי</span>
        <span style={{ color: C.faint, fontSize: 10 }}>Contributor Research Dossier — פרוייקציה על research_objects, לא Premium, לא דף-מספר ציבורי</span>
      </div>

      {/* 1. Identity/Provenance */}
      <CaseSection title="1 · צבי (OPOC) — Identity">
        <div style={{ fontSize: 11.5, color: C.muted }}>
          slug: <code>tzvi-opoc</code> · {objects.length} ממצאים שמורים · {handledCount} מקורות סומנו-מטופלים בתור-הבקרה
        </div>
      </CaseSection>

      {/* 2. כל החידושים + פילטרים */}
      <CaseSection title={`2 · כל החידושים (${objects.length})`}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={filters.number} onChange={e => setFilters(f => ({ ...f, number: e.target.value }))} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.border}` }}>
            <option value="">כל המספרים</option>
            {keyNumbers.slice(0, 40).map(([v]) => <option key={v} value={v}>{v} ({byValue.get(v).length})</option>)}
          </select>
          <select value={filters.verdict} onChange={e => setFilters(f => ({ ...f, verdict: e.target.value }))} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.border}` }}>
            <option value="">כל הסטטוסים</option>
            {Object.entries(VERDICT_HE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="חיפוש בטקסט…" style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.border}`, minWidth: 120 }} />
          {anyFilterActive && <button onClick={() => setFilters({ number: "", verdict: "", q: "" })} style={chip(false)}>נקה סינון</button>}
        </div>
        <div style={{ maxHeight: 340, overflow: "auto", display: "grid", gap: 4 }}>
          {filtered.slice(0, 200).map(o => (
            <div key={o.id} style={{ fontSize: 11.5, padding: "4px 6px", borderRadius: 7, background: "#0000000a" }}>
              <span style={{ color: VERDICT_COLOR[o.verdict], fontWeight: 700 }}>{VERDICT_HE[o.verdict]}</span>
              <span style={{ color: C.goldLight }}> — {(o.statement || "").slice(0, 90)}</span>
              {o.value != null && <b style={{ color: C.goldBright }}> ({o.value})</b>}
              <div style={{ color: C.faint, fontSize: 9 }}>{o.source_ref}</div>
            </div>
          ))}
          {filtered.length > 200 && <div style={{ color: C.faint, fontSize: 10.5 }}>+{filtered.length - 200} נוספים (סנן כדי לצמצם)</div>}
          {!filtered.length && <div style={{ color: C.faint, fontSize: 12 }}>אין תוצאות לסינון הנוכחי.</div>}
        </div>
      </CaseSection>

      <CaseSection title={`3 · מאומתים במנוע — ישיר (${verifiedDirect.length})`}>
        <div style={{ color: C.faint, fontSize: 11 }}>{verifiedDirect.slice(0, 10).map(o => `${(o.terms || [])[0] || "—"}=${o.value}`).join(" · ")}{verifiedDirect.length > 10 ? ` · +${verifiedDirect.length - 10}` : ""}</div>
      </CaseSection>

      <CaseSection title={`4 · Composite/Arithmetic Verified (${verifiedComposite.length})`}>
        <div style={{ color: C.faint, fontSize: 11 }}>{verifiedComposite.map(o => o.statement).join(" · ") || "—"}</div>
      </CaseSection>

      <CaseSection title={`5 · טרם אומתו / שיטה לא-מזוהה (${unresolved.length + unverified.length})`}>
        <div style={{ color: C.faint, fontSize: 11 }}>
          {unresolved.map(o => `⚠ ${o.statement} (METHOD_UNRESOLVED)`).join(" · ")}
          {unverified.length > 0 && (unresolved.length ? " · " : "") + `${unverified.length} טענות engine_verified=false — ראה סעיף 2 (Rank, Don't Hide)`}
        </div>
      </CaseSection>

      <CaseSection title={`6 · פרשנויות (${interpretations.length})`}>
        <div style={{ color: C.faint, fontSize: 11 }}>{interpretations.length ? interpretations.slice(0, 10).map(o => o.statement?.slice(0, 60)).join(" · ") : "אין (הפאס הנוכחי לא סיווג relation/hypothesis נפרדים)."}</div>
      </CaseSection>

      <CaseSection title={`7 · מספרים מרכזיים (${keyNumbers.length})`}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {keyNumbers.slice(0, 24).map(([v, os]) => (
            <span key={v} onClick={() => setFilters(f => ({ ...f, number: String(v) }))} style={{ ...pill(C.gold), cursor: "pointer" }}>{v} ({os.length})</span>
          ))}
        </div>
      </CaseSection>

      <CaseSection title={`8 · קשרים / Convergences (${connections.length})`}>
        {connections.slice(0, 15).map(([v, os]) => (
          <div key={v} style={{ fontSize: 12, marginBottom: 3 }}>
            🔗 <b style={{ color: C.goldBright }}>{v}</b> ↔ {[...new Set(os.map(o => (o.terms || [])[0] || o.statement))].slice(0, 6).join(" ↔ ")}
          </div>
        ))}
        {!connections.length && <div style={{ color: C.faint, fontSize: 12 }}>—</div>}
      </CaseSection>

      <CaseSection title={`9 · מקורות (${bySource.size})`}>
        <div style={{ color: C.faint, fontSize: 11 }}>{bySource.size} מקורות ייחודיים תרמו ל-{objects.length} ממצאים (ממוצע {(objects.length / Math.max(1, bySource.size)).toFixed(1)} ממצאים/מקור).{methods.length > 1 && ` שיטות שנמצאו מעבר ל-רגיל: ${methods.filter(m => m !== "רגיל").join(", ") || "—"}.`}</div>
      </CaseSection>

      <CaseSection title="10 · Chronology / רצף-שיחה">
        <div style={{ color: C.faint, fontSize: 11 }}>ראה פאנל «💬 השיחה של צבי» למעלה — אותה פרוייקציה כרונולוגית בדיוק.</div>
      </CaseSection>
    </div>
  );
}

// ── PART B/D · «➕ שמור למחקר» — כפתור Human-Gate אחד וברור, נפרד מ«סגור-מהתור» (PART E). ──
// כרגע רק לפריטי Pipeline C-source=channel (channel_updates, cuId קיים) — Claim-shaped בלבד,
// דרך ה-RPC היחיד channel_update_save_to_research (אותו דפוס בדיוק כמו image_artifact_route_to_intake).
function SaveToResearchBox({ item }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  if (item.srckind !== "channel" || !item.cuId) return null;
  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("channel_update_save_to_research", { p_channel_update_id: item.cuId });
    setBusy(false);
    setRes(error ? { ok: false, error: error.message } : data);
  };
  const openPipelineC = (e) => {
    e.preventDefault();
    document.getElementById("pipeline-c-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div style={{ ...box, marginTop: 12, borderColor: "#4caf7d55", background: "#f2fbf5" }}>
      <div style={{ color: "#128c4b", fontFamily: F.heading, fontWeight: 900, fontSize: 13, marginBottom: 6 }}>🔬 מחקר · Human Gate</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={pill(C.muted)}>מועמד — לא עובדה</span>
        <span style={pill(C.muted)}>≠ «סגור-מהתור» (מצב-עבודה אישי, לא-קנוני)</span>
      </div>
      {!res && (
        <button disabled={busy} onClick={save} style={{ ...chip(true, "#4caf7d"), opacity: busy ? 0.5 : 1 }}>
          {busy ? "שומר…" : "➕ שמור למחקר"}
        </button>
      )}
      {res && res.ok && (
        <div style={{ fontSize: 12.5, color: "#128c4b", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 800 }}>{res.already_existed ? "✓ כבר נמצא במחקר" : "✓ נשמר למחקר"}</div>
          <div>סטטוס: מועמד &nbsp;·&nbsp; פרטיות: פרטי &nbsp;·&nbsp; מקור: {item.author || "—"}</div>
          <a href="#pipeline-c-review" onClick={openPipelineC} style={{ color: "#128c4b", fontWeight: 700 }}>↓ פתח ב-Pipeline C · Human Gate</a>
        </div>
      )}
      {res && res.ok === false && (
        <div style={{ fontSize: 12, color: "#e0563a", marginTop: 4 }}>{res.reason || res.error || "לא נשמר"}</div>
      )}
    </div>
  );
}

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
        {/* PART A · תמונה-מקור ≠ מלל-OCR — image_url כבר נלכד ב-normChannel אך מעולם לא רונדר.
            מוצג לצד הטקסט (לא במקומו) · אין gating לפי retention כאן (אין עמודת-retention ל-channel_updates,
            ברירת-המחדל היא image_and_text). */}
        {item.img && (
          <div style={{ margin: "0 0 10px" }}>
            <img src={thumb(item.img, 420)} alt="" style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 10, background: "#0002", display: "block" }} />
            <a href={item.img} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: C.faint }}>🔍 פתח תמונה מקורית בגודל-מלא</a>
          </div>
        )}
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

        {/* PART E · «מצב עבודה» (אישי, לא-קנוני) ≠ «מחקר / Human Gate» (למטה) — שני צירים נפרדים בכוונה. */}
        <div style={{ color: C.faint, fontSize: 10, fontFamily: F.heading, fontWeight: 800, marginTop: 14, marginBottom: 4 }}>📋 מצב עבודה (אישי — לא משפיע על מחקר/אמת)</div>
        {/* סגור-מהתור / בטל-סגירה (marker אישי חוצה-מכשירים · לא נוגע בסטטוס-המקור) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
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

        {/* RESEARCH CASE — "🗂️ תיק מחקר", תמיד מעל «שמור למחקר» (התיק מציע/מרכז, «שמור» מבצע-ידני). */}
        <ResearchCasePanel item={item} />

        {/* PART B/D · «➕ שמור למחקר» — ציר נפרד מ«מצב עבודה» למעלה. Claim-shaped בלבד, דרך Research Intake הקיים. */}
        <SaveToResearchBox item={item} />

        {/* 📱 הקשר-הודעה (WhatsApp/DM) — זהות · הודעה · תשובת-בוט · timeline · provenance · פעולות. READ בלבד. */}
        <WaContext item={item} />

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

// §9-11 · Bulk Action Bar — מטריצת-תאימות-לפי-סוג-ישות, בלי RPC-גנרי-מומצא:
//   · "✔ סגור מהתור" (Attention בלבד, research_items) — זמין לכל סוג-ישות, תמיד.
//   · "⚖️ אשר/דחה כמועמדים" (Truth, admin_research_review) — זמין רק כשהבחירה הומוגנית
//     (כולה srckind='finding' + status='candidate') — בדיוק אותו RPC-קנוני שכבר קיים per-item.
//   · שאר-הפעולות (בדוק-במנוע/סווג/למד/ניתוב) — אין להן היום נתיב-קנוני-רב-ישויות → disabled + טולטיפ
//     מדויק (לא "פאזה 3", ניסוח שכבר תוקן כלא-מדויק ב-Pass 1 follow-up), לא alert מטעה.
const CLOSE_REASONS = ["לא רלוונטי", "כפול", "חלש מדי", "לא מתאים למחקר"];
function BulkBar({ items, onClear, onCloseQueue, onBulkDecide, busy, narrow }) {
  const [confirm, setConfirm] = useState(null); // {kind, reason?} — ממתין-לאישור-מפורש
  const [reason, setReason] = useState("");
  const [lastResult, setLastResult] = useState(null); // {ok, fail} — תוצאת-Bulk-decide אחרונה
  const n = items.length;
  if (!n && !lastResult) return null;
  if (!n && lastResult) {
    return (
      <div style={{ ...box, borderColor: lastResult.fail ? "#e0563a" : "#4caf7d", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: lastResult.fail ? "#e0563a" : "#4caf7d", fontWeight: 800, fontSize: 12.5 }}>
          {lastResult.fail ? `⚠️ ${lastResult.ok} הצליחו · ${lastResult.fail} נכשלו` : `✔ בוצע על ${lastResult.ok} פריטים`}
        </span>
        <button onClick={() => setLastResult(null)} style={{ ...chip(false), marginInlineStart: "auto" }}>סגור</button>
      </div>
    );
  }
  const bySrc = {};
  for (const it of items) bySrc[it.srckind || it.source || "אחר"] = (bySrc[it.srckind || it.source || "אחר"] || 0) + 1;
  const breakdown = Object.entries(bySrc).map(([k, c]) => `${SRCKIND_HE[k] || k}: ${c}`).join(" · ");
  const homogeneousCandidates = n > 0 && items.every(it => it.srckind === "finding" && it.status === "candidate" && !it.handled);
  const doCloseWithReason = (r) => { onCloseQueue(items, r); setConfirm(null); setReason(""); };
  return (
    <div style={{ ...box, borderColor: C.goldBright, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", ...(narrow ? { position: "sticky", bottom: 8, zIndex: 5, boxShadow: "0 4px 18px rgba(0,0,0,0.18)" } : {}) }}>
      <b style={{ color: C.goldBright, fontFamily: F.heading }}>נבחרו {n}</b>
      <span style={{ color: C.faint, fontSize: 10.5 }}>{breakdown}</span>
      {!confirm && (
        <>
          <button disabled={busy} onClick={() => setConfirm({ kind: "close" })} style={{ ...chip(false, "#4caf7d"), opacity: busy ? 0.5 : 1 }}>✔ סגור מהתור ({n})</button>
          {homogeneousCandidates && (
            <>
              <button disabled={busy} onClick={() => setConfirm({ kind: "approve" })} style={{ ...chip(false, "#3ea6ff"), opacity: busy ? 0.5 : 1 }}>⚖️ אשר כמועמדים ({n})</button>
              <button disabled={busy} onClick={() => setConfirm({ kind: "reject" })} style={{ ...chip(false, "#e0563a"), opacity: busy ? 0.5 : 1 }}>✕ דחה כמועמדים ({n})</button>
            </>
          )}
          <span style={{ color: C.faint, fontSize: 10 }}>|</span>
          {["🔬 בדוק במנוע", "🏷️ סווג", "📥 → VAULT", "🔗 → Atlas", "🕐 → שכבת-הציר"].map((a) =>
            <button key={a} disabled title={`אין עדיין נתיב-קנוני לפעולה הזו על ${n > 1 ? "כמה סוגי-ישות בבת-אחת" : "סוג-הישות הזה"} — EXTENSION POINT, לא בוצע WRITE`} style={{ ...chip(false), opacity: 0.4, cursor: "not-allowed" }}>{a}</button>)}
          <button onClick={onClear} style={{ ...chip(false), marginInlineStart: "auto" }}>נקה בחירה</button>
        </>
      )}
      {confirm?.kind === "close" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
          <span style={{ color: C.muted, fontSize: 11.5 }}>סיבת-סגירה (תור-קשב אישי — לא קביעת-אמת מחקרית):</span>
          {CLOSE_REASONS.map(r => <button key={r} onClick={() => doCloseWithReason(r)} style={chip(false)}>{r}</button>)}
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="סיבה אחרת…" style={{ ...selBox, minWidth: 140 }} />
          <button onClick={() => doCloseWithReason(reason || "טופל · Bulk")} style={chip(false, "#4caf7d")}>אשר סגירה של {n}</button>
          <button onClick={() => setConfirm(null)} style={chip(false)}>ביטול</button>
        </div>
      )}
      {(confirm?.kind === "approve" || confirm?.kind === "reject") && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
          <span style={{ color: confirm.kind === "approve" ? "#3ea6ff" : "#e0563a", fontSize: 12, fontWeight: 800 }}>
            אתה עומד לבצע «{confirm.kind === "approve" ? "אישור" : "דחייה"}» על {n} מועמדים ({breakdown}) — פעולת-Truth דרך admin_research_review, בלתי-הפיכה (סטטוס משתנה). אשר במפורש:
          </span>
          <button disabled={busy} onClick={async () => {
            const results = await onBulkDecide(items, confirm.kind === "approve" ? "approve" : "reject");
            const ok = (results || []).filter(r => r.ok).length, fail = (results || []).length - ok;
            setLastResult({ ok, fail }); setConfirm(null);
          }} style={{ ...chip(false, confirm.kind === "approve" ? "#3ea6ff" : "#e0563a"), opacity: busy ? 0.5 : 1 }}>{busy ? "מבצע…" : `כן — בצע על ${n}`}</button>
          <button onClick={() => setConfirm(null)} style={chip(false)}>ביטול</button>
        </div>
      )}
      <span style={{ color: C.faint, fontSize: 10, width: "100%" }}>Rank-Don't-Hide · «סגור-מהתור» = Attention בלבד (research_items) · אישור/דחייה = Truth (decision_ledger) דרך RPC קנוני קיים בלבד</span>
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
  // 👑 Pass 1 (COMMAND_CENTER_ATTENTION_CLOSURE, §2): SELF-GENERATED ≠ INCOMING ATTENTION.
  // חומר של צוריאל עצמו מוסתר כברירת-מחדל מ-«עכשיו» (לא נמחק — reuse של isZuriel() הקיים,
  // toggle גלוי מחזיר אותו). לא נוגע ב-«כל האוצר»/history (שם רואים הכל, כולל ZURIEL, כרגיל).
  const [hideSelf, setHideSelf] = useState(true);
  const [candExpanded, setCandExpanded] = useState(false); // הרחבת רשימת-המועמדים (לחיצה על המונה)
  // «נכנס עכשיו» = תצוגה-בלבד (פורום/פוסטים/WhatsApp-לוג) — ניתן לקפל, וההעדפה נשמרת (אם סגרת, יישאר סגור).
  const [showIncoming, setShowIncoming] = useState(() => { try { return localStorage.getItem("cc_hide_incoming") !== "1"; } catch { return true; } });
  const toggleIncoming = () => setShowIncoming(v => { const nv = !v; try { localStorage.setItem("cc_hide_incoming", nv ? "0" : "1"); } catch { /* ignore */ } return nv; });
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
  const [writerFull, setWriterFull] = useState([]);   // כל-החומר-המלא של הכתב המסונן (לא רק 40 הטריים) — לעיבוד-בכמות
  const [groupItems, setGroupItems] = useState([]);
  const [langLinks, setLangLinks] = useState([]);
  const [langStats, setLangStats] = useState({});
  const [busy, setBusy] = useState(false);

  const loadNow = useCallback(async () => {
    setBusy(true);
    const [forum, wa, posts, hn, feed, groups, contribs] = await Promise.all([
      getForumMaterial({ limit: 40 }), getWaLog({ limit: 40 }),
      getPostsFromSupabase({ limit: 12 }), getHotNumbers(HOT_DAYS, 12),
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
  // 👤 כתב-מסונן → טוען את **כל** החומר שלו (לא רק 40 הטריים) כדי לעבד בכמות ולראות מונה שיורד.
  useEffect(() => {
    const name = filters.writer;
    if (!name || name === "__UNKNOWN__" || name === "__ZURIEL__" || !writerIdx) { setWriterFull([]); return; }
    let alive = true;
    Promise.all([getForumMaterial({ author: name, limit: 200 }), getPostsFromSupabase({ author: name, limit: 60 })])
      .then(([forum, posts]) => {
        if (!alive) return;
        const withWriter = (it) => ({ ...it, writer: resolveWriter(it.rawAuthor || it.author, writerIdx) });
        setWriterFull([...(forum || []).map(normForum), ...((posts?.posts) || []).map(normPost)].map(withWriter));
      }).catch(() => { if (alive) setWriterFull([]); });
    return () => { alive = false; };
  }, [filters.writer, writerIdx]);

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
  // §9 · Bulk Human-Gate — נתיב-קנוני אמיתי ויחיד: admin_research_review (בדיוק אותו RPC שכבר
  // משמש per-item ב-PipelineCReview) — לא RPC-גנרי-מומצא. פועל רק על מועמדי-מנוע (srckind='finding',
  // status='candidate') — לא על channel_updates/פורום/פוסטים, שאין להם נתיב-קנוני מקביל.
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkDecideCandidates = useCallback(async (items, decision) => {
    setBulkBusy(true);
    const results = [];
    for (const it of items) {
      const id = String(it.key || "").replace(/^r:/, "");
      try {
        const { data, error } = await supabase.rpc("admin_research_review", { p_id: id, p_decision: decision });
        results.push({ id, ok: !error && data?.ok === true, error: error?.message || data?.error });
      } catch (e) { results.push({ id, ok: false, error: e?.message || "network_error" }); }
    }
    setBulkBusy(false); clearSel(); await loadNow();
    return results;
  }, [clearSel, loadNow]);

  // צינור C — מועמדי-מנוע בלבד (discovery-engine…), מופרד מ-wa-raziel של צינור B.
  const discoveryC = useMemo(() => (candidates || []).filter(c => C_SOURCES.includes(c.src)), [candidates]);
  // withH — מצרף רובד-נסיגה (אם חסר) + דגל-handled מה-marker. pass — סינון רב-ממדי + הסתרת-שטופלו (אלא-אם showHandled).
  const withH = useCallback((it) => {
    const tier = it.tier || fallbackTier(it);
    const base = it.tier ? it : { ...it, tier };
    return handled.has(it.key) ? { ...base, handled: true, handledMeta: handled.get(it.key) } : base;
  }, [handled]);
  // 👑 hideSelf חל רק על «עכשיו» (Incoming/Attention) — «כל האוצר» (History/Archive, mode==="treasure")
  // תמיד רואה הכל, וגם ב-«עכשיו» בחירה מפורשת של פילטר-הכתב ZURIEL עוקפת את ההסתרה (Rank-Don't-Hide).
  // Pass 1C-Closure §2 · כשיש drill-down מפורש (filters.ids) — count=drilldown חייב להיות מדויק:
  // הצג בדיוק את ה-ids, בלי showHandled/hideSelf לגזור עוד פריטים בשקט (matchesFilters כבר מסנן
  // ל-ids בלבד ממילא — אלה רק שני תנאים נוספים שהיו עלולים לצמצם מתחת למה שהמונה הבטיח).
  const pass = useCallback((it) =>
    matchesFilters(it, filters) && (!!filters.ids || showHandled || !it.handled) &&
    (!!filters.ids || !hideSelf || mode !== "now" || filters.writer === "__ZURIEL__" || !isZuriel(it)),
    [filters, showHandled, hideSelf, mode]);
  // CC-1.3 · רשימות מסוננות+ממויינות (Rank-Don't-Hide: פילטר=מיקוד; «שטופל» יוצא רק מתור-העבודה האישי).
  const liveAf = useMemo(() => sortItems((liveA || []).map(withH).filter(pass), sort), [liveA, withH, pass, sort]);
  const candF = useMemo(() => sortItems((candidates || []).map(withH).filter(pass), sort), [candidates, withH, pass, sort]);
  // כל-החומר-של-הכתב (דרישה 8): איחוד כל הצינורות — ערוץ+מנוע+פורום+פוסט+וואטסאפ + החומר-המלא של הכתב. dedup לפי key.
  const poolAll = useMemo(() => {
    const seen = new Set(); const out = [];
    for (const it of [...(liveA || []), ...(candidates || []), ...(incoming || []), ...(writerFull || [])].map(withH))
      if (!seen.has(it.key)) { seen.add(it.key); out.push(it); }
    return out;
  }, [liveA, candidates, incoming, writerFull, withH]);
  const writerPool = useMemo(() => filters.writer ? sortItems(poolAll.filter(pass), sort) : null, [filters.writer, poolAll, pass, sort]);
  // מונה-כתב חי: סה"כ/ממתין/טופל עבור הכתב המסונן (יורד כשסוגרים) — «לפתוח צבי, לעבד בכמות, לראות מונה יורד».
  const writerCounts = useMemo(() => {
    if (!filters.writer) return null;
    const mine = poolAll.filter(it => matchesFilters(it, { writer: filters.writer }));
    const handledN = mine.filter(i => i.handled).length;
    return { total: mine.length, handled: handledN, waiting: mine.length - handledN };
  }, [filters.writer, poolAll]);
  // אפשרויות ל-dropdowns של הסינון (נגזרות מהמאגר).
  const writerOptions = useMemo(() => orderWriters(poolAll.map(i => i.writer?.canonical?.display_name || i.writer?.contributor?.display_name).filter(Boolean)), [poolAll]);
  const statusOpts = useMemo(() => statusOptions(poolAll), [poolAll]);
  const methodOpts = useMemo(() => [...new Set(poolAll.map(i => i.method).filter(Boolean))], [poolAll]);
  // §7 · אפשרויות-קבוצת-וואטסאפ — מזהה-יציב אמיתי (group_id), נגזר מהמאגר הטעון (אין fetch נוסף).
  const waGroupOpts = useMemo(() => [...new Set(poolAll.map(i => i.group).filter(Boolean))], [poolAll]);
  // CC-1.3 ש2 · רב-בחירה. shown = מאגר-הכתב (אם פעיל) אחרת התור המוצג. בחירת-כתב = כל-החומר (כל הצינורות).
  const shown = useMemo(() => writerPool || [...liveAf, ...candF], [writerPool, liveAf, candF]);
  const hasFilter = Object.keys(filters).length > 0;
  // 🎛️ Pass 1B §3: digest חסום עבור רזיאל — מעל shown (כבר מכבד hideSelf/filters/showHandled).
  // אין fetch נוסף כאן — רק צבירה/דגימה מעל מה שכבר טעון. Pass 1C §16-17: זו הפרוסה "FILTERED";
  // razielDigest (למטה, אחרי selItems) בוחר בין SELECTED/FILTERED — היטלים (projections) על אותו live set.
  // Pass 1C-Closure §10 · scopeNote = תיאור-הקבוצה-הנוכחית (מ-drillTo, אם פעיל) — כדי שרזיאל ידע
  // "אני מסתכל כרגע על X מתוך Y" בלי store חדש, רק runtime-context שכבר עובר דרך ה-digest הקיים.
  const filteredDigest = useMemo(() => buildAttentionDigest(shown, { mode, filters, hideSelf, scopeNote: filters.idsLabel || null }), [shown, mode, filters, hideSelf]);
  // מונה-התור החי: מועמדים שלא-שוטפלו (יורד כשסוגרים פריט מהתור). לא תלוי בפילטר — עומק-התור האמיתי.
  const pendingCand = useMemo(() => (candidates || []).map(withH).filter(c => !c.handled), [candidates, withH]);
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
  // Pass 1C-Closure §1/§2/§5 · אותו universe בדיוק שממנו נגזר stats.waiting (raw liveA∪candidates,
  // ללא filters/hideSelf) — כדי ש"195 ממתינים" יהיה ניתן ל-drill-down מדויק, לא approximation.
  const queueUniverse = useMemo(() => [...liveA, ...candidates].map(withH), [liveA, candidates, withH]);
  const attentionItems = useMemo(() => queueUniverse.filter((it) => !it.handled), [queueUniverse]);
  const handledInQueue = useMemo(() => queueUniverse.filter((it) => it.handled), [queueUniverse]);
  // Pass 1C-Closure §3-§7 · drill-down כללי: מזהים-יציבים בלבד → filters.ids, לא approximation.
  const drillTo = useCallback((ids, label) => {
    setMode("now"); setFilters({ ids: new Set(ids), idsLabel: label });
    setTimeout(() => document.getElementById("cc-ingestion-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);
  // §3.3 · "חדש מהמערכת" — reuse whats_new_law הקנוני (crossesNew.js), מפתח נפרד לחדר-המפקדה.
  // ⚠️ חייב להיות מוגדר *לפני* signals (למטה) — TDZ: const מוקדם-בזמן-ריצה מ-declaration שלו קורס.
  const signalsCutoff = useMemo(() => seenCutoff("cc_signals"), []);
  const markSignalsSeen = useCallback(() => markSeenKey("cc_signals"), []);
  // Pass 1C-Closure §7 · Signals מחושבים פעם אחת כאן (לא בתוך AttentionSignals) כדי ש-drillTo יקבל
  // בדיוק את אותם ids שהמונה מציג — לא חישוב-כפול/מקביל.
  const signals = useMemo(() => computeSignals(poolAll, { newCutoff: signalsCutoff }), [poolAll, signalsCutoff]);
  const reconcile = useMemo(() => reconcileNewVsAttention(signals.fresh.ids, queueUniverse.map((it) => it.key), attentionItems.map((it) => it.key)), [signals, queueUniverse, attentionItems]);
  const selItems = useMemo(() => poolAll.filter(i => sel.has(i.key)), [poolAll, sel]);
  // §16-17 · רזיאל מבין ALL/FILTERED/SELECTED — היטלים על אותו תור-חי, לא 3 stores. יש בחירה פעילה →
  // digest מצומצם לנבחרים בלבד (scope="selected"); אחרת ה-digest המסונן-הרגיל (filteredDigest).
  const razielDigest = useMemo(() =>
    sel.size > 0 ? buildAttentionDigest(selItems, { mode, filters, hideSelf, scope: "selected", scopeNote: filters.idsLabel ? `בחירה מתוך: ${filters.idsLabel}` : null }) : filteredDigest,
    [sel.size, selItems, filteredDigest, mode, filters, hideSelf]);
  const toggleSel = (k) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  // §8 · הבחנה קריטית: "בחר את המוצגים" (רק מה-שנרנדר בפועל, ה-20 הראשונים) ≠ "בחר הכל לפי הסינון"
  // (כל shown — כל הפריטים התואמים לפילטר, גם אם לא-מוצגים כי הרשימה חתוכה ל-20). שני כפתורים נפרדים.
  const VISIBLE_CAP = 20;
  const selectVisibleShown = () => setSel(new Set(liveAf.slice(0, VISIBLE_CAP).map(i => i.key)));
  const selectAllShown = () => setSel(new Set(shown.map(i => i.key)));
  const invertSel = () => setSel(s => new Set(shown.filter(i => !s.has(i.key)).map(i => i.key)));
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

      {/* מטטרון — פס תמונת-על. §Closure: "👀 חם אצל הקהל" הוסר מכאן — כפילות-תצוגה מול AttentionSignals
          למטה (עם label נכון + drill-down אמיתי + Link ל-/number). לא שני מקורות לאותו סימן. */}
      <div style={{ ...box, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>🕸️ מטטרון</span>
        <span style={{ color: C.muted, fontSize: 12 }}>מועמדים ממתינים: <b onClick={() => drillTo(pendingCand.map(it => it.key), `לשיפוט (${pendingCand.length})`)} title="הצג את כל התור — בדיוק אלה" style={{ color: C.goldBright, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>{pendingCand.length}</b></span>
      </div>

      {mode === "now" && (
       <>
        {/* 💬 חדר רזיאל — Pass 1 (COMMAND_CENTER_ATTENTION_CLOSURE): הרכיב חולץ מ-CommandCenterTab
            היתום (AdminPage.jsx, שלא מנותב לשום tab-key חי) לקובץ עצמאי (admin/RazielRoom.jsx) ומוצג
            כאן, בראש «עכשיו», כדי שצוריאל ייכנס לשיחת-מחקר עם רזיאל מיד בפתיחת חדר-המפקדה — בלי לשכפל
            את שאר CommandCenterTab (מטטרון-תעבורה/המלצות-דמוגרפיה לא מובאים בפאס הזה, ר' §6 בפקודה).
            שומר במלואו: היסטוריית-שיחה (agent_user_memory) · context_snapshot («על סמך מה ענית») ·
            בדיקת-מועמדים · פקודות-שיחה קיימות (אשר/דחה/שלח-לשופט — עוברות ב-admin_research_review/
            decideCandidate הקיימים, אין הרשאת-קנוניזציה חדשה). רזיאל = קורא/מנתח/מסביר/ממליץ בלבד. */}
        {/* 📡 אותות-קשב — Pass 1C §3/§5: SIGNALS קודם ל-RAZIEL (FINAL PRODUCT LAW: Signals → Raziel →
            Recommendation → Zuriel). עובדות דטרמיניסטיות בלבד — «מה כדאי לי לעשות» נשאר רק בחדר-רזיאל
            שמתחתיו, כדי לא למזג recommendation לתוך signal (§4/§5). אין fetch חדש — מעל מה שכבר טעון. */}
        <AttentionSignals theme={C} signals={signals} reconcile={reconcile} hot={hot} hotDays={HOT_DAYS}
          onDrill={drillTo} onMarkSeen={markSignalsSeen} />

        <NumberResearcher theme={C} attentionDigest={razielDigest} mode={mode} filtersActive={sel.size > 0 ? false : hasFilter} />

        {/* 📊 מונים — נכנס / ממתין / טופל / לשיפוט · עקביים (נכנסו−טופלו=ממתינים) · לחיצים */}
        <div style={{ ...box, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {/* Pass 1C-Closure §2/§5: כל 4 המונים כאן מנתבים ל-drill-down מדויק (queueUniverse/
                attentionItems/handledInQueue/pendingCand — אותם arrays שמהם המספר עצמו נגזר) —
                לא approximation דרך setFilters/setShowHandled גנרי כמו קודם. */}
            {[
              { label: "נכנסו", n: stats.entered, c: C.goldBright, on: () => drillTo(queueUniverse.map(it => it.key), `נכנסו — כל התור (${stats.entered})`), tip: "כל מה שנטען (ערוץ+מועמדים) — לא נמחק לעולם" },
              { label: "ממתינים", n: stats.waiting, c: "#c79a2e", on: () => drillTo(attentionItems.map(it => it.key), `ממתינים — התור הפעיל (${stats.waiting})`), tip: "תור-העבודה הפעיל (לא-טופל) — לחיצה = בדיוק אלה" },
              { label: "טופלו", n: stats.handledN, c: "#4caf7d", on: () => drillTo(handledInQueue.map(it => it.key), `טופלו (${stats.handledN})`), tip: "מה שסגרת — עם הסיבה. «בטל סגירה» מחזיר לתור" },
              { label: "לשיפוט", n: stats.judging, c: "#3ea6ff", on: () => drillTo(pendingCand.map(it => it.key), `לשיפוט (${stats.judging})`), tip: "מועמדים שממתינים לשיפוט (לא-טופל)" },
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

        {/* CC-1.1 · קליטה חיה — שלושת הצינורות מופרדים (READ-ONLY, בלי feeder). id=עוגן-גלילה ל-drillTo. */}
        <div style={box} id="cc-ingestion-anchor">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 900, fontSize: 14 }}>📡 קליטה חיה (LIVE INGESTION)</span>
            <span style={{ color: C.faint, fontSize: 11 }}>שלושה צינורות · לחיץ · תצוגה-בלבד (לא feeder, לא WRITE) {busy && "…"}</span>
          </div>
          {/* Pass 1C-Closure §5/§13 · באנר-drill-down בולט (לא רק צ'יפ קטן) — ברור גם במובייל,
              עם חזרה-חד-משמעית ל"כל התור". shown.length כאן = בדיוק המספר שממנו הגעת (§2). */}
          {filters.ids && (
            <div style={{ ...box, borderColor: "#3ea6ff", background: "#3ea6ff10", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ color: "#3ea6ff", fontWeight: 900, fontSize: 13 }}>🔎 מציג כרגע: {filters.idsLabel || `${filters.ids.size} פריטים`}</span>
              <span style={{ color: C.faint, fontSize: 11 }}>({shown.length} מוצגים כאן — כל כלי-העבודה למטה פועלים על הקבוצה הזו בלבד)</span>
              <button onClick={() => setFilters((cur) => { const n = { ...cur }; delete n.ids; delete n.idsLabel; return n; })} style={{ ...chip(false, "#3ea6ff"), marginInlineStart: "auto" }}>← חזרה לכל התור</button>
            </div>
          )}
          <WorkFilters filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} showHandled={showHandled} setShowHandled={setShowHandled} hideSelf={hideSelf} setHideSelf={setHideSelf} writers={writerOptions} statuses={statusOpts} methods={methodOpts} handledCount={handled.size} waGroups={waGroupOpts} />
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
              {/* §8 · "בחר את המוצגים" (רק ה-20 המוצגים כרגע) ≠ "בחר הכל לפי הסינון" (כל shown, גם לא-מוצגים) */}
              <button onClick={selectVisibleShown} style={chip(false)} title={`בוחר רק את ${Math.min(VISIBLE_CAP, liveAf.length)} השורות המוצגות`}>☐ בחר את המוצגים ({Math.min(VISIBLE_CAP, liveAf.length)})</button>
              <button onClick={selectAllShown} style={chip(false, "#3ea6ff")} title="בוחר את כל הפריטים התואמים לסינון הנוכחי, גם אם לא כולם מוצגים">☑ בחר הכל לפי הסינון ({shown.length})</button>
              {sel.size > 0 && <button onClick={invertSel} style={chip(false)}>⇄ הפוך בחירה</button>}
              {filters.writer && filters.writer !== "__UNKNOWN__" &&
                <button onClick={() => selectWriter(filters.writer)} style={chip(false, "#b08bd8")}>👤 בחר כל {filters.writer}</button>}
              {sel.size > 0 && <button onClick={clearSel} style={chip(false)}>נקה ({sel.size})</button>}
              {sel.size > 0 && <span style={{ color: C.faint, fontSize: 10.5 }}>נבחרו {sel.size} מתוך {shown.length} התואמים לסינון</span>}
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

        {/* STEP 1B · Pipeline C — Human Gate (screen-map approved 25.8.2026). קופסה נפרדת, לא-מקוננת
            בתוך «קליטה חיה» — אותה קופסה מצהירה על-עצמה תצוגה-בלבד/בלי-WRITE, ואין לסתור זאת. */}
        <PipelineCReview />

        {/* 🔠 ELS · Human Gate — Pass 1 (COMMAND_CENTER_ATTENTION_CLOSURE, §3): reuse מלא של
            ElsModerationTab הקיים (בעבר תחת טאב-אדמין נפרד "🔍 הצופן", בלי שינוי בו) — לא זרימת-
            אישור-ELS שנייה. שער-הענן הזה כבר מסונן-מטבעו ל"דורש-Human-Gate-בלבד" (status='pending'/
            variants-למיזוג/תרומות-על-צפנים) — צפני-ELS שאושרו/פורסמו לא-מוצגים כאן, הם ממשיכים
            להיות חומר-מחקר/ארכיון בדף-הצופן הרגיל (/codes/:slug), בלי שינוי. */}
        <div style={box}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: "#c9a24a", fontFamily: F.heading, fontWeight: 900, fontSize: 13 }}>🔠 ELS · Human Gate</span>
            <span style={{ color: C.faint, fontSize: 10.5 }}>reuse מלא של ElsModerationTab (els_records status='pending' + תרומות-צופן + מיזוגים)</span>
          </div>
          <ElsModerationTab />
        </div>

        {/* ⚖️ מטטרון — Pass 1 (COMMAND_CENTER_ATTENTION_CLOSURE, §6): רק פרוסת-ה-Attention מתוך
            CommandCenterTab היתום (התראות+פערים+תיבת-המלצות-לאישור) — לא traffic/demand-analytics
            כלליים, לא «מרכז פעילות» (דפדוף-גילויים כללי, לא-attention-פר-הגדרה). ר' דוח-פאס-1. */}
        <MetatronAttention />

        {/* ZVI IMAGE × OCR × VISUAL EXTRACTION PILOT (25.8.2026) — כרטיס נפרד, לא מקונן,
            מרחיב את gallery-ocr הקיים בלבד. אין מנוע-OCR שני, אין מיזוג-פיזי של השערים. */}
        <ImagePilotPanel />

        {/* CC-1.3 ש2 · Bulk Bar — «סגור מהתור» מבוצע; שאר gated */}
        <BulkBar items={selItems} onClear={clearSel} onCloseQueue={(items, reason) => doClose(items, reason || "טופל · Bulk")} onBulkDecide={bulkDecideCandidates} busy={bulkBusy} narrow={narrow} />

        {/* דרישה 8 · כל-החומר-של-הכתב — איחוד כל הצינורות (לא רק חומר-שנותב) */}
        {filters.writer && filters.writer !== "__UNKNOWN__" && (
          <div style={{ ...box, borderColor: "#b08bd855" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ color: "#b08bd8", fontFamily: F.heading, fontWeight: 900 }}>👤 כל החומר של {filters.writer}</span>
              {writerCounts && <>
                <span style={{ ...pill("#c79a2e"), fontWeight: 800 }} title="ממתין לעיבוד (יורד כשסוגרים)">ממתין {writerCounts.waiting}</span>
                <span style={{ ...pill("#4caf7d") }} title="טופל (סגור מהתור)">טופל {writerCounts.handled}</span>
                <span style={{ color: C.faint, fontSize: 11 }}>מתוך {writerCounts.total}</span>
                <button onClick={() => setShowHandled(v => !v)} style={{ ...chip(showHandled, "#4caf7d") }}>{showHandled ? "הסתר שטופלו" : "הצג גם שטופלו"}</button>
              </>}
              <span style={{ color: C.faint, fontSize: 10.5 }}>כל הצינורות — החומר המלא של הכתב, לעיבוד בכמות</span>
              <button onClick={() => selectWriter(filters.writer)} style={{ ...chip(false, "#b08bd8"), marginInlineStart: "auto" }}>בחר הכל</button>
            </div>
            {(writerPool || []).slice(0, 40).map(it => <IngestRow key={it.key} item={it} onOpen={setDetail} onFilter={setFilter} selected={sel.has(it.key)} onToggle={toggleSel} onClose={(x) => doClose(x, "טופל")} onUnclose={doUnclose} />)}
            {(writerPool || []).length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>אין חומר לכתב זה בטווח/סינון הנוכחי.</div>}
            {(writerPool || []).length > 40 && <div style={{ color: C.faint, fontSize: 10.5, marginTop: 4 }}>מוצגים 40 מתוך {writerPool.length}.</div>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : (showIncoming ? "minmax(0,1fr) minmax(0,320px)" : "minmax(0,1fr)"), gap: 14 }}>
          {showIncoming ? (
            <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
              {/* 👁️ תצוגה-בלבד — צבע ניטרלי (אפור) כדי לא להתנגש עם 🔴 DORMANT (צינור B כבוי). ניתן להסתרה. */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: C.muted, fontFamily: F.heading, fontWeight: 800 }}>👁️ נכנס עכשיו (פורום·פוסטים·WhatsApp-לוג) · תצוגה-בלבד {busy && "…"}</span>
                <button onClick={toggleIncoming} title="הסתר את העמודה (יישמר)" style={{ ...chip(false), marginInlineStart: "auto" }}>✕ הסתר</button>
              </div>
              {incoming.length ? incoming.map(it => <ItemCard key={it.key} item={it} onFocus={setFocusN} />)
                : <div style={{ color: C.muted, fontSize: 13 }}>אין חומר טרי כרגע.</div>}
            </div>
          ) : (
            <div><button onClick={toggleIncoming} style={chip(false, C.muted)} title="הצג שוב את «נכנס עכשיו»">👁️ הצג «נכנס עכשיו»{incoming.length ? ` (${incoming.length})` : ""}</button></div>
          )}
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
                return <>
                  <WriterOS contributor={wc} writerIndex={writerIdx} />
                  <ZviDossierPanel contributor={wc} />
                  <ZviConversationPanel contributor={wc} />
                </>;
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
