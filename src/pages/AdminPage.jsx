import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { GA_ENABLED } from "../lib/analytics.js";
import { getVisitStats, getVisitDetail, getSearchConsole, getTrafficHistory, getLegacyTopPages, syncGoogleAnalytics, getGaInsights, getArrivalSources, getPageDwell, getVisitorJourneys, getJourneyShares, getAiUsage, getResearchUsage, getTrafficComposition, getVisitsTwoMeter, getTrafficDayDetail, getCrawlIntel } from "../lib/visits.js";
import SearchesTab from "../components/SearchesTab.jsx";
import ElsStatsTab from "../components/ElsStatsTab.jsx";
import ElsModerationTab from "../components/ElsModerationTab.jsx";
import LanguageEngineTab from "../components/LanguageEngineTab.jsx";
import { CLARITY_CONFIGURED } from "../lib/clarity.js";

// כתובת הטמעה של דוח Looker Studio (GA4) — מוגדר ב-VITE_LOOKER_URL
const LOOKER_URL = import.meta.env.VITE_LOOKER_URL || "";
import {
  getTrafficStats, adminGetMessages, adminSetMessageRead, adminGetSubscribers,
  getNumberSets, saveNumberSet, deleteNumberSet, getOcrCounts, runOcrBatch,
  getTopicCards, setTopicCardStatus, updateTopicCard, mergeTopicCards, getGalleryImagesByIds,
  getImageConnections, findGalleryImages, createTopicCardDraft,
  searchGalleryForCuration, setImageCuration, getRealityHints,
  getWallPrivate, getLabInsights, getJourneyFunnel, getAiTokenUsage, getAiCostMetrics,
  getJourneyExperiments, getRealTraffic, getRealtimeNow, getLiveVisitors, getUsersOverview, getUserJourney, getPulse, getRetention,
  getWaCandidates, adminLinkWa, adminUnlinkWa,
  supabase,
} from "../lib/supabase.js";
import { METHODS } from "../lib/gematria.js";
import { getAllContributions, approveContribution, moderateContribution, intentMeta } from "../lib/contributions.js";
import { NOTIFICATION_TOPICS } from "../lib/notifications.js";
import { KEY_NUMBERS } from "../theme.js";
import { collectPairs, fetchFamilySizes, fetchResonanceMap, scoreCross } from "../lib/crossRarity.js";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import ViralIntelTab from "../components/ViralIntelTab.jsx";
import AnchorFamiliesTab from "../components/AnchorFamiliesTab.jsx";
import FindingsTab from "../components/FindingsTab.jsx";
import AiStylesTab from "../components/AiStylesTab.jsx";
import SystemSuggestionsTab from "../components/SystemSuggestionsTab.jsx";
import CalendarHeatmap from "../components/CalendarHeatmap.jsx";
import NumberHeatGrid from "../components/NumberHeatGrid.jsx";
import { computePulse } from "../lib/reality.js";
import { computeNumberHeat, computeSectionHeat, sectionLabel, heatColor } from "../lib/heatmap.js";

// ===== פאנל הניהול (/admin) — נעול ל-role=admin, טאבים =====
const TABS = [
  { key: "stats",    label: "📊 סטטיסטיקות" },
  { key: "aicost",   label: "💰 עלות AI" },
  { key: "agents",   label: "🤖 סוכנים ועלויות" },
  { key: "aistyles", label: "🤖 ניתוחי AI" },
  { key: "suggest",  label: "🧠 המלצות המערכת" },
  { key: "live",     label: "🔴 שידור חי" },
  { key: "traffic",  label: "📊 תנועה" },
  { key: "retention",label: "🔁 חוזרים" },
  { key: "users",    label: "👤 משתמשים" },
  { key: "walink",   label: "🟢 חיבור וואטסאפ" },
  { key: "jexp",     label: "🧪 ניסויי מסע" },
  { key: "journeys", label: "🧭 מסעות (ישן)" },
  { key: "heatmap",  label: "🔥 מפת חום" },
  { key: "popularity", label: "📈 פופולריות" },
  { key: "conversions", label: "🎯 המרות" },
  { key: "viral",    label: "🔥 ויראליות" },
  { key: "research", label: "🧪 מעבדת צוריאל" },
  { key: "anchors",  label: "🧩 עוגנים" },
  { key: "findings", label: "🔬 ממצאים" },
  { key: "scanner",  label: "🔍 סורק נדירות" },
  { key: "chiddushim", label: "✍️ אישור חידושים" },
  { key: "contribmod", label: "💬 מרכז התגובות" },
  { key: "subs",     label: "📋 רשימת תפוצה" },
  { key: "messages", label: "✉️ פניות" },
  { key: "emails",   label: "📧 מיילים" },
  { key: "newsletter", label: "✉️ דיוור" },
  { key: "sets",     label: "🖼 סטים ותמונות" },
  { key: "topics",   label: "🎴 כרטיסי נושא" },
  { key: "curation", label: "⭐ אצירת תמונות" },
  { key: "upload",   label: "📷 העלאת תמונה" },
  { key: "ocr",      label: "🔤 OCR" },
  { key: "classify", label: "🏷️ סיווג תמונות" },
  { key: "meta",     label: "📡 מעקב Meta" },
  { key: "searches", label: "🔍 חיפושי גולשים" },
  { key: "els",      label: "🔍 הצופן (דילוגים)" },
  { key: "language", label: "🌍 מנוע שפה" },
  { key: "utm",      label: "🔗 בונה קישורים" },
  { key: "push",     label: "🔔 שליחת התראה" },
  { key: "worklog",  label: "📝 יומן עבודה" },
  { key: "stream",   label: "🌊 זרם המציאות" },
  { key: "broadcast", label: "📡 שדר לטיקר" },
];

// 🗂️ איחוד ל-7 טאבי-על (בקשת צוריאל 4.7): כל טאב-על פותח שורת תת-טאבים.
const GROUPS = [
  { key: "analytics", label: "📊 אנליטיקס", subs: ["stats", "aicost", "aistyles", "heatmap", "popularity", "viral", "searches", "els", "meta"] },
  { key: "journeys",  label: "🧭 מסעות",    subs: ["live", "traffic", "retention", "users", "walink", "jexp", "journeys"] },
  { key: "language",  label: "🌍 מנוע שפה", subs: ["language"] },
  { key: "content",   label: "✍️ תוכן",     subs: ["topics", "chiddushim", "contribmod", "stream", "broadcast"] },
  { key: "images",    label: "🖼 תמונות",   subs: ["sets", "curation", "upload", "ocr", "classify"] },
  { key: "comms",     label: "📧 תפוצה",    subs: ["subs", "emails", "newsletter", "messages"] },
  { key: "tools",     label: "🔧 כלים",     subs: ["research", "anchors", "findings", "suggest", "scanner", "utm", "push", "worklog"] },
];
const TAB_LABEL = Object.fromEntries(TABS.map(t => [t.key, t.label]));
const GROUP_OF = Object.fromEntries(GROUPS.flatMap(g => g.subs.map(s => [s, g.key])));

const fmtDate = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }) : "";
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", minWidth: 0, maxWidth: "100%" };
const th = { color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, textAlign: "right", padding: "9px 12px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" };
const td = { color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };

// זיהוי מסך נייד — להתאמת פריסה (ה-inline-styles לא נתמכים ע"י media queries)
function useIsMobile(bp = 640) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(`(max-width:${bp}px)`).matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const fn = e => setM(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, [bp]);
  return m;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// 🎛️ דופק עליון — מרכז-בקרה קליקבילי. כל KPI → הטאב שמסביר אותו. מתרענן כל 30ש.
function PulseBar({ goto }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    let live = true;
    const tick = () => getPulse().then(x => live && setP(x || {})).catch(() => { });
    tick(); const id = setInterval(tick, 30000);
    return () => { live = false; clearInterval(id); };
  }, []);
  const num = n => Number(n || 0).toLocaleString("he");
  const tiles = [
    { icon: "👥", big: p ? num(p.online) : "—", lbl: "באתר עכשיו", to: "live", col: "#5fe08a", pulse: true },
    { icon: "📈", big: p ? num(p.today_visitors) : "—", sub: p ? num(p.today_views) + " צפיות" : "", lbl: "מבקרים היום", to: "traffic", col: C.goldBright },
    { icon: "🔍", big: p?.top_source ? p.top_source.name : "—", sub: p?.top_source ? num(p.top_source.n) : "", lbl: "מקור מוביל היום", to: "traffic", col: "#8ea2ff" },
    { icon: "🤖", big: p ? "$" + Number(p.ai_cost_today || 0).toFixed(3) : "—", sub: p ? "סה״כ $" + Number(p.ai_cost_total || 0).toFixed(2) : "", lbl: "עלות AI היום", to: "users", col: "#e0c860" },
    { icon: "🧭", big: p ? num(p.journeys_done) : "—", lbl: "מסעות שהושלמו היום", to: "journeys", col: "#7fd18a" },
    { icon: "🆕", big: p ? num(p.new_today) : "—", sub: p ? num(p.registered_total) + " סה״כ" : "", lbl: "נרשמו היום", to: "users", col: "#ff9a9a" },
  ];
  return (
    <div style={{ marginBottom: 18 }}>
      <style>{`@keyframes pb-blink{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 10 }}>
        {tiles.map((t, i) => (
          <button key={i} onClick={() => goto(t.to)} title={`פתח: ${t.lbl}`} style={{ cursor: "pointer", textAlign: "right", border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 15px", background: "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(8,5,2,0.42))", transition: "border-color .15s, transform .1s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.col; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.pulse && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5fe08a", boxShadow: "0 0 6px #5fe08a", animation: "pb-blink 1.4s ease-in-out infinite" }} />}
              <span style={{ flex: 1 }} />
              <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>← פרטים</span>
            </div>
            <div style={{ color: t.col, fontFamily: F.mono, fontSize: 24, fontWeight: 800, lineHeight: 1.1, wordBreak: "break-word" }}>{t.big}{t.sub ? <span style={{ fontSize: 11, color: C.goldDim, fontFamily: F.body, fontWeight: 400 }}> · {t.sub}</span> : ""}</div>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginTop: 3 }}>{t.lbl}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState("stats");
  const [group, setGroup] = useState("analytics");
  const mobile = useIsMobile();
  const activeGroup = GROUPS.find(g => g.key === group) || GROUPS[0];
  const selectGroup = g => { setGroup(g.key); setTab(g.subs[0]); };
  // 🎛️ ניווט מהדופק: כל KPI מוביל לטאב שמסביר אותו (מוצא את הקבוצה שמכילה את הטאב).
  const gotoTab = (t) => { const g = GROUPS.find(gr => gr.subs.includes(t)); if (g) { setGroup(g.key); setTab(t); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* noop */ } } };

  if (loading) return <Center>טוען…</Center>;
  if (!user) return <Center>נדרשת התחברות. <Link to="/login" style={{ color: C.goldBright }}>כניסה →</Link></Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול.</Center>;

  return (
    <div style={{ direction: "rtl", width: "100%", maxWidth: "100%", margin: 0, padding: mobile ? "22px 12px 80px" : "36px clamp(14px, 3vw, 56px) 90px", boxSizing: "border-box", overflowX: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>לוח בקרה</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>⚙️ ניהול סוד 1820</h1>
        <a href="/editor" style={{
          display: "inline-block", marginTop: 14, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          padding: "10px 22px", borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 800, letterSpacing: 1,
        }}>✍️ פוסט חדש — עורך מתקדם + AI</a>
      </div>

      <PulseBar goto={gotoTab} />

      {/* טאבי-על (7) — 🌳 עץ אחד: כל קבוצה פותחת שורת תת-טאבים */}
      <div style={{ display: "flex", flexWrap: mobile ? "nowrap" : "wrap", justifyContent: mobile ? "flex-start" : "center", gap: 8, marginBottom: 12, overflowX: mobile ? "auto" : "visible", paddingBottom: mobile ? 6 : 0, WebkitOverflowScrolling: "touch" }}>
        {GROUPS.map(g => (
          <button key={g.key} onClick={() => selectGroup(g)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: mobile ? 13.5 : 15, fontWeight: 800, padding: mobile ? "9px 15px" : "10px 20px", borderRadius: 999, whiteSpace: "nowrap", flex: "0 0 auto",
            border: `1px solid ${group === g.key ? C.gold : C.border}`,
            background: group === g.key ? "linear-gradient(135deg, rgba(212,175,55,0.28), rgba(8,5,2,0.5))" : "transparent",
            color: group === g.key ? C.goldBright : C.muted,
          }}>{g.label}</button>
        ))}
      </div>
      {/* תת-טאבים — רק אם לקבוצה יש יותר מאחד */}
      {activeGroup.subs.length > 1 && (
        <div style={{ display: "flex", flexWrap: mobile ? "nowrap" : "wrap", justifyContent: mobile ? "flex-start" : "center", gap: 7, marginBottom: 26, overflowX: mobile ? "auto" : "visible", paddingBottom: mobile ? 6 : 0, WebkitOverflowScrolling: "touch" }}>
          {activeGroup.subs.map(s => (
            <button key={s} onClick={() => setTab(s)} style={{
              cursor: "pointer", fontFamily: F.heading, fontSize: mobile ? 12.5 : 13.5, fontWeight: 700, padding: mobile ? "6px 12px" : "7px 15px", borderRadius: 999, whiteSpace: "nowrap", flex: "0 0 auto",
              border: `1px solid ${tab === s ? C.borderGold : C.border}`,
              background: tab === s ? "rgba(212,175,55,0.14)" : "transparent",
              color: tab === s ? C.goldBright : C.muted,
            }}>{TAB_LABEL[s] || s}</button>
          ))}
        </div>
      )}
      {activeGroup.subs.length <= 1 && <div style={{ marginBottom: 26 }} />}

      {tab === "stats" && <StatsTab />}
      {tab === "aicost" && <AiCostTab />}
      {tab === "agents" && <AgentsCostTab />}
      {tab === "aistyles" && <AiStylesTab />}
      {tab === "suggest" && <SystemSuggestionsTab />}
      {tab === "live" && <LiveVisitorsTab />}
      {tab === "traffic" && <RealTrafficPanel />}
      {tab === "retention" && <RetentionTab />}
      {tab === "users" && <UsersTab />}
      {tab === "walink" && <WhatsAppLinkTab />}
      {tab === "jexp" && <JourneyExperimentsTab />}
      {tab === "journeys" && <JourneysTab />}
      {tab === "heatmap" && <HeatmapTab />}
      {tab === "popularity" && <PopularityTab />}
      {tab === "conversions" && <ConversionsTab />}
      {tab === "viral" && <ViralIntelTab />}
      {tab === "research" && <ResearchTab />}
      {tab === "anchors" && <AnchorFamiliesTab />}
      {tab === "findings" && <FindingsTab />}
      {tab === "scanner" && <ScannerTab />}
      {tab === "chiddushim" && <ChiddushReviewTab />}
      {tab === "contribmod" && <ContribModTab />}
      {tab === "subs" && <SubscribersTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "emails" && <EmailsTab />}
      {tab === "newsletter" && <NewsletterTab />}
      {tab === "sets" && <SetsTab />}
      {tab === "topics" && <TopicsTab />}
      {tab === "curation" && <CurationTab />}
      {tab === "upload" && <ImageUploadTab />}
      {tab === "ocr" && <OcrTab />}
      {tab === "classify" && <ClassifyTab />}
      {tab === "meta" && <MetaTab />}
      {tab === "searches" && <SearchesTab />}
      {tab === "els" && <><ElsModerationTab /><ElsStatsTab /></>}
      {tab === "language" && <LanguageEngineTab />}
      {tab === "utm" && <UtmBuilderTab />}
      {tab === "push" && <PushSendTab />}
      {tab === "worklog" && <WorkLogTab />}
      {tab === "stream" && <StreamAdminTab />}
      {tab === "broadcast" && <BroadcastTab />}
    </div>
  );
}

// ===== ✍️ אישור חידושי גולשים + היסטוריה (אנליטיקס) =====
function StatusBadge({ s }) {
  const map = { pending: ["⏳ ממתין", "#9a7818", "rgba(154,120,24,0.15)"], approved: ["✅ אושר", "#3fae5a", "rgba(63,174,90,0.14)"], rejected: ["✖ נדחה", "#d98a92", "rgba(160,31,46,0.16)"] };
  const [t, c, bg] = map[s] || ["", C.muted, "transparent"];
  return <span style={{ color: c, background: bg, border: `1px solid ${c}55`, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{t}</span>;
}
function SubRow({ r, onApprove, onReject, busy }) {
  const m = METHODS.find(x => x.key === r.method) || METHODS[0];
  const [replyMsg, setReplyMsg] = useState("");
  // זוג-גימטריה = שני ביטויים שהוזנו. הטופס הנוכחי שולח חידוש-טקסט חופשי (בלי זוג) → אין ריבוע.
  const hasPair = !!(r.phrase_a && r.phrase_b);
  const va = m.fn(r.phrase_a || ""), vb = m.fn(r.phrase_b || "");
  const ok = va > 0 && va === vb;
  // ניתן לאשר: זוג-גימטריה שמאומת, או חידוש-טקסט חופשי עם תוכן.
  const canApprove = hasPair ? ok : !!(r.body || r.title);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", background: "rgba(8,5,2,0.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ flex: 1, minWidth: 0, color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{r.title}</span>
        <StatusBadge s={r.status} />
      </div>
      {hasPair ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: ok ? "rgba(63,174,90,0.12)" : "rgba(160,31,46,0.14)", border: `1px solid ${ok ? "#3fae5a55" : "#a01f2e55"}`, borderRadius: 10, padding: "7px 12px", marginBottom: 8 }}>
          <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14 }}>«{r.phrase_a}»</span>
          <b style={{ color: C.goldBright, fontFamily: F.mono }}>{va}</b>
          <span style={{ color: C.goldDim }}>=</span>
          <b style={{ color: C.goldBright, fontFamily: F.mono }}>{vb}</b>
          <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14 }}>«{r.phrase_b}»</span>
          <span style={{ color: C.goldDim, fontSize: 12 }}>· {r.method}</span>
          <span style={{ color: ok ? "#5fd07a" : "#ff9a8a", fontFamily: F.heading, fontWeight: 800, fontSize: 12 }}>{ok ? "✓ מאומת מנוע" : "✗ לא שווה!"}</span>
        </div>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(212,175,55,0.10)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 11px", marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>✍️</span>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>חידוש טקסט חופשי — יתפרסם ב«חידושי הקהילה» ללא חותמת «מאומת מנוע»</span>
        </div>
      )}
      {r.body && <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{r.body}</p>}
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginBottom: r.status === "pending" ? 12 : 0 }}>
        ✍️ {r.author_name || "—"} · <span dir="ltr">{r.author_email || ""}</span> · {fmtDate(r.created_at)}
      </div>
      {r.status === "pending" && (
        <>
          {/* ✍️ תגובה אישית לשולח — נכנסת גם להתראה באתר וגם למייל האישור (אופציונלי) */}
          <textarea value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
            placeholder="✍️ תגובה אישית לשולח (אופציונלי) — תיכנס להתראה באתר ולמייל האישור"
            style={{ width: "100%", boxSizing: "border-box", minHeight: 50, resize: "vertical", marginBottom: 10,
              background: "rgba(8,5,2,0.6)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px",
              color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={busy || !canApprove} onClick={() => onApprove(r.id, replyMsg.trim() || null)} title={canApprove ? "" : (hasPair ? "הגימטריה לא שווה — לא ניתן לאשר" : "אין תוכן לאישור")} style={{
              cursor: busy || !canApprove ? "not-allowed" : "pointer", opacity: canApprove ? 1 : 0.5, border: "none", borderRadius: 999, padding: "9px 20px",
              background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 13.5 }}>
              {busy ? "…" : "✅ אשר ופרסם"}
            </button>
            <button disabled={busy} onClick={() => onReject(r.id)} style={{
              cursor: "pointer", border: `1px solid ${C.border}`, borderRadius: 999, padding: "9px 18px",
              background: "transparent", color: "#d98a92", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5 }}>
              ✖ דחה
            </button>
          </div>
        </>
      )}
    </div>
  );
}
// 🤖 סוכנים ועלויות — registry-driven: כל סוכן שרושם ל-ai_token_log או מוגדר ב-bot_settings
// נכנס אוטומטית. עלויות מחושבות מ-api_pricing (admin_agents view דרך RPC admin_agents_dashboard).
function AgentsCostTab() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    supabase.rpc("admin_agents_dashboard")
      .then(({ data, error }) => { if (error) setErr(error.message || "שגיאה"); else setRows(data || []); })
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ ...card, color: "#d98a92" }}>שגיאה: {err}</div>;
  if (rows === null) return <Center>טוען…</Center>;

  const num = n => Number(n || 0).toLocaleString("he");
  const ils = n => "₪" + Number(n || 0).toLocaleString("he", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totIls = rows.reduce((s, r) => s + Number(r.cost_ils_all || 0), 0);
  const totIls30 = rows.reduce((s, r) => s + Number(r.cost_ils_30d || 0), 0);
  const totCalls = rows.reduce((s, r) => s + Number(r.calls_all || 0), 0);

  const th = { textAlign: "right", padding: "8px 10px", color: C.goldDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` };
  const td = { padding: "9px 10px", color: C.goldLight, fontFamily: F.body, fontSize: 13, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}55` };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 18, fontWeight: 800 }}>🤖 סוכנים ועלויות</span>
        <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13 }}>{rows.length} סוכנים · {num(totCalls)} קריאות</span>
        <span style={{ marginInlineStart: "auto", color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>
          סה"כ: {ils(totIls)} <span style={{ color: C.goldDim, fontSize: 12, fontWeight: 400 }}>(30 יום: {ils(totIls30)})</span>
        </span>
      </div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 12, lineHeight: 1.7 }}>
        עדשה אחת על <b>ai_token_log × api_pricing</b>. כל סוכן עתידי (source חדש ב-ai_token_log או bot_settings node) נכנס אוטומטית. שער: usd_to_ils ב-api_pricing.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>סוכן</th>
              <th style={th}>קריאות</th>
              <th style={th}>טוקנים (in/out)</th>
              <th style={th}>מודלים</th>
              <th style={th}>עלות (סה"כ)</th>
              <th style={th}>30 יום</th>
              <th style={th}>היום</th>
              <th style={th}>פעילות אחרונה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.agent}>
                <td style={td}>
                  <span style={{ fontWeight: 700, color: C.goldBright }}>{r.display_name}</span>
                  {r.is_registered_bot && <span style={{ marginInlineStart: 6, background: "rgba(212,175,55,0.16)", color: C.gold, borderRadius: 999, padding: "1px 7px", fontSize: 10.5, fontWeight: 700 }}>בוט</span>}
                  {r.role && <div style={{ color: C.goldDim, fontSize: 11 }}>{r.role}</div>}
                </td>
                <td style={td}>{num(r.calls_all)}</td>
                <td style={{ ...td, fontFamily: F.mono, fontSize: 12 }}>{num(r.in_tokens)} / {num(r.out_tokens)}</td>
                <td style={{ ...td, fontSize: 11, color: C.goldDim, whiteSpace: "normal" }}>{r.models || "—"}</td>
                <td style={{ ...td, fontWeight: 800, color: C.goldBright }}>{ils(r.cost_ils_all)}</td>
                <td style={td}>{ils(r.cost_ils_30d)}</td>
                <td style={td}>{ils(r.cost_ils_1d)}</td>
                <td style={{ ...td, color: C.goldDim, fontSize: 11 }}>{r.last_activity ? new Date(r.last_activity).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChiddushReviewTab() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [toast, setToast] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    supabase.from("chiddush_submissions").select("*").order("created_at", { ascending: false }).limit(300)
      .then(({ data }) => setRows(data || [])).catch(() => setRows([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel("admin-chiddush")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chiddush_submissions" }, ({ new: r }) => {
        setRows(prev => (prev ? [r, ...prev] : [r]));
        setToast(r.author_name || "גולש"); setTimeout(() => setToast(null), 9000);
      }).subscribe();
    return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, []);

  async function approve(id, message) {
    setBusy(id);
    const row = rows.find(r => r.id === id);
    try {
      // 1) אישור: יוצר את החידוש + התראה-באתר לשולח (כולל תגובת-אדמין), מחזיר את מזהה החידוש (=«המיקום»)
      const { data: insightId, error } = await supabase.rpc("approve_chiddush", { p_id: id, p_message: message || null });
      if (error) throw error;
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "approved", insight_id: insightId } : r));
      // 2) מייל לשולח (Resend) — «החידוש שלך אושר» + תגובת-האדמין. לא חוסם את האישור אם נכשל.
      const email = row?.author_email;
      if (email && insightId) {
        supabase.functions.invoke("notify-approval", {
          body: { email, name: row?.author_name || "", title: row?.title || "", link: `/research?tool=midrash&tab=community&insight=${insightId}`, message: message || "" },
        }).then(({ data }) => {
          if (data?.ok) setMsg(`✅ אושר — ומייל נשלח ל־${email}`);
          else if (data?.error === "not_configured") setMsg("✅ אושר — התראה נשמרה באתר (מייל: חסר RESEND_API_KEY)");
          else setMsg(`✅ אושר — התראה נשמרה באתר (מייל לא נשלח: ${data?.error || "שגיאה"})`);
          setTimeout(() => setMsg(null), 9000);
        }).catch(() => { setMsg("✅ אושר — התראה נשמרה באתר (מייל לא נשלח)"); setTimeout(() => setMsg(null), 9000); });
      }
    }
    catch (e) { alert("שגיאה באישור: " + (e.message || e)); }
    finally { setBusy(null); }
  }
  async function reject(id) {
    setBusy(id);
    try { await supabase.rpc("reject_chiddush", { p_id: id }); setRows(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r)); }
    catch (e) { alert("שגיאה: " + (e.message || e)); }
    finally { setBusy(null); }
  }

  if (rows === null) return <Center>טוען…</Center>;
  const counts = { pending: 0, approved: 0, rejected: 0 };
  rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const view = rows.filter(r => filter === "all" || r.status === filter);
  const pill = on => ({ cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap", border: `1px solid ${on ? C.gold : C.border}`, background: on ? "rgba(212,175,55,0.18)" : "transparent", color: on ? C.goldBright : C.muted });

  return (
    <div style={card}>
      {toast && (
        <div style={{ background: "linear-gradient(160deg, rgba(30,22,6,0.98), rgba(10,7,0,0.98))", border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, color: C.goldBright, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>
          ✍️ הגשת חידוש חדשה מאת <span style={{ color: C.goldLight }}>{toast}</span> — ממתינה לאישורך
        </div>
      )}
      {msg && (
        <div style={{ background: "linear-gradient(160deg, rgba(10,26,12,0.98), rgba(4,12,5,0.98))", border: "1px solid #3fae5a66", borderRadius: 12, padding: "10px 16px", marginBottom: 14, color: "#8fe0a2", fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>
          {msg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("pending")} style={pill(filter === "pending")}>⏳ ממתינים ({counts.pending})</button>
        <button onClick={() => setFilter("approved")} style={pill(filter === "approved")}>✅ אושרו ({counts.approved})</button>
        <button onClick={() => setFilter("rejected")} style={pill(filter === "rejected")}>✖ נדחו ({counts.rejected})</button>
        <button onClick={() => setFilter("all")} style={pill(filter === "all")}>📜 כל ההיסטוריה ({rows.length})</button>
      </div>
      {!view.length
        ? <div style={{ color: C.muted, fontFamily: F.body, padding: 24, textAlign: "center" }}>אין הגשות{filter === "pending" ? " ממתינות" : ""}.</div>
        : <div style={{ display: "grid", gap: 12 }}>{view.map(r => <SubRow key={r.id} r={r} onApprove={approve} onReject={reject} busy={busy === r.id} />)}</div>}
    </div>
  );
}

// ===== 🎴 כרטיסי נושא — חיבורים שה-AI הכין, האדמין מאשר =====
function TopicsTab() {
  const [cards, setCards] = useState(null);
  const [imgMap, setImgMap] = useState({});
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all"); // all | draft | approved | strong
  const [sel, setSel] = useState([]);          // ids נבחרים למיזוג
  const load = useCallback(() => {
    getTopicCards().then(async cs => {
      setCards(cs);
      const ids = [...new Set(cs.flatMap(c => c.image_ids || []))];
      if (ids.length) {
        try { const imgs = await getGalleryImagesByIds(ids); const m = {}; imgs.forEach(i => { m[i.id] = i; }); setImgMap(m); } catch { /* ignore */ }
      }
    }).catch(() => setCards([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    setBusy(id);
    try { await setTopicCardStatus(id, status); await load(); }
    catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
    finally { setBusy(null); }
  }
  function toggleSel(id) { setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  async function doMerge() {
    if (sel.length < 2) return;
    // היעד = בעל ה-quality הגבוה ביותר מהנבחרים
    const chosen = cards.filter(c => sel.includes(c.id)).sort((a, b) => (b.quality || 0) - (a.quality || 0));
    const keep = chosen[0]; const rest = chosen.slice(1).map(c => c.id);
    if (!window.confirm(`למזג ${sel.length} טופיקים לתוך "${keep.title}"? האחרים יסומנו כממוזגים.`)) return;
    setBusy("merge");
    try { await mergeTopicCards(keep.id, rest); setSel([]); await load(); }
    catch (e) { alert("מיזוג נכשל: " + (e.message || e)); }
    finally { setBusy(null); }
  }

  if (!cards) return <Loading />;
  if (!cards.length) return <Empty>אין כרטיסי נושא עדיין. ה-AI יכין חיבורים ותראה אותם כאן לאישור.</Empty>;

  const draftCount = cards.filter(c => c.status === "draft").length;
  const strong = c => (c.quality || 0) >= 8 || (c.meter_score || 0) >= 50;
  const view = cards
    .filter(c => filter === "all" ? c.status !== "merged"
      : filter === "strong" ? strong(c) && c.status !== "merged"
      : c.status === filter)
    .sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0) || (b.quality || 0) - (a.quality || 0));
  const fbtn = on => ({ cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 13px", borderRadius: 999, border: `1px solid ${on ? C.borderGold : C.border}`, background: on ? "rgba(212,175,55,0.12)" : "transparent", color: on ? C.goldBright : C.muted });
  const numChip = (n, hot) => (
    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: hot ? 15 : 12.5, padding: hot ? "4px 12px" : "2px 9px", borderRadius: 999,
      border: `1px solid ${hot ? C.gold : C.border}`, background: hot ? "rgba(212,175,55,0.18)" : "transparent", color: hot ? C.goldBright : C.goldDim }}>{n}</span>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <HuntBox onCreated={load} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <H>{cards.length} כרטיסים · {draftCount} ממתינים</H>
        <span style={{ flex: 1 }} />
        {[["all", "הכל"], ["draft", "ממתינים"], ["strong", "⭐ חזקים"], ["approved", "מאושרים"]].map(([k, l]) => (
          <button key={k} style={fbtn(filter === k)} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {sel.length >= 2 && (
        <div style={{ ...card, borderColor: C.borderGold, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{sel.length} נבחרו למיזוג</span>
          <span style={{ flex: 1 }} />
          {busy === "merge" ? <span style={{ color: C.goldDim }}>ממזג…</span> : <>
            <BtnGold onClick={doMerge}>🔗 מזג לתוך החזק ביותר</BtnGold>
            <button onClick={() => setSel([])} style={iconBtn}>נקה</button>
          </>}
        </div>
      )}
      {view.map(c => {
        const f = c.findings || {};
        const imgs = (c.image_ids || []).map(id => imgMap[id]).filter(Boolean);
        const hot = new Set(c.highlight_numbers || []);
        const others = (c.numbers || []).filter(n => !hot.has(n));
        const sLabel = c.status === "approved" ? "✓ מאושר" : c.status === "rejected" ? "✗ נדחה" : "⏳ טיוטה";
        const sColor = c.status === "approved" ? "#7bbf7b" : c.status === "rejected" ? "#d98a92" : C.goldDim;
        if (editing === c.id) {
          return <CardEditor key={c.id} card={c} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;
        }
        return (
          <div key={c.id} style={{ ...card, borderColor: c.status === "draft" ? C.borderGold : C.border }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <label style={{ cursor: "pointer", alignSelf: "center", display: "inline-flex" }} title="בחר למיזוג">
                <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggleSel(c.id)} />
              </label>
              <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 21, fontWeight: 700 }}>{c.title}</span>
              <span style={{ color: sColor, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{sLabel}</span>
              <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>★ {c.quality}/10</span>
              {c.meter_score != null && <span style={{ color: C.gold, fontFamily: F.mono, fontSize: 12 }}>מד {c.meter_score}</span>}
              <span style={{ flex: 1 }} />
              {(c.search_terms || []).slice(0, 4).map(t => (
                <span key={t} style={{ color: C.muted, fontFamily: F.body, fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 999, padding: "2px 9px" }}>{t}</span>
              ))}
            </div>
            {c.subtitle && <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14, marginBottom: 12 }}>{c.subtitle}</div>}

            {/* מספרים */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              {[...hot].map(n => numChip(n, true))}
              {others.map(n => numChip(n, false))}
            </div>

            {/* ממצאים */}
            {f.headline && <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.headline}</div>}
            {Array.isArray(f.bullets) && (
              <ul style={{ margin: "0 0 12px", paddingInlineStart: 20, color: "#d4ccbf", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.85 }}>
                {f.bullets.map((b, i) => <li key={i}>{typeof b === "string" ? b : (b?.t || "")}</li>)}
              </ul>
            )}

            {/* רמז משלים (רובד פרשני — מובחן מהגימטריה) */}
            {f.hint && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.35)`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>🔮</span>
                <div style={{ color: "#b9bcff", fontFamily: F.body, fontSize: 13, lineHeight: 1.75 }}><b style={{ color: "#cfd1ff" }}>רמז משלים: </b>{f.hint}</div>
              </div>
            )}

            {/* חיבורים */}
            {Array.isArray(f.connections) && f.connections.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                {f.connections.map((cn, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px" }}>
                    <span style={{ fontFamily: F.mono, fontWeight: 800, color: C.goldBright, fontSize: 14 }}>{cn.number}</span>
                    <span style={{ color: C.goldDim }}>↔</span>
                    {(cn.links || []).map(l => <span key={l} style={{ color: C.goldLight, fontFamily: F.body, fontSize: 12.5 }}>{l}</span>)}
                    {cn.note && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>· {cn.note}</span>}
                  </div>
                ))}
              </div>
            )}

            {f.caveat && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12, paddingInlineStart: 10, borderInlineStart: `2px solid ${C.border}` }}>⚠️ {f.caveat}</div>}

            {/* תמונות */}
            {imgs.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {imgs.map(im => (
                  <a key={im.id} href={im.image_url} target="_blank" rel="noopener noreferrer" title={(im.ocr_numbers || []).join(" · ")} style={{ display: "block", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: `center/cover no-repeat url(${im.image_url})` }} />
                ))}
              </div>
            )}

            {/* פעולות אישור */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              {busy === c.id ? <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13 }}>שומר…</span> : (
                <>
                  {c.status !== "approved" && <BtnGold onClick={() => setStatus(c.id, "approved")}>✓ אשר לפרסום</BtnGold>}
                  {c.status !== "rejected" && <button onClick={() => setStatus(c.id, "rejected")} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.crimsonLight}`, color: "#d98a92", borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontSize: 13 }}>✗ דחה</button>}
                  {c.status !== "draft" && <button onClick={() => setStatus(c.id, "draft")} style={iconBtn}>↩ החזר לטיוטה</button>}
                  <button onClick={() => setEditing(c.id)} style={iconBtn}>✎ ערוך</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// עורך כרטיס — הוספה/הסרה/הבלטה של תוכן הכרטיס
function CardEditor({ card, onCancel, onSaved }) {
  const f = card.findings || {};
  const [title, setTitle] = useState(card.title || "");
  const [subtitle, setSubtitle] = useState(card.subtitle || "");
  const [quality, setQuality] = useState(card.quality ?? 5);
  const [nums, setNums] = useState((card.numbers || []).join(", "));
  const [hot, setHot] = useState((card.highlight_numbers || []).join(", "));
  const [headline, setHeadline] = useState(f.headline || "");
  const imgIdx = id => (card.image_ids || []).indexOf(id);
  const [bullets, setBullets] = useState((f.bullets || []).map(b => {
    if (typeof b === "string") return b;
    const n = imgIdx(b?.img);
    return n >= 0 ? `${b?.t || ""} | ${n + 1}` : (b?.t || "");
  }).join("\n"));
  const [hint, setHint] = useState(f.hint || "");
  const [caveat, setCaveat] = useState(f.caveat || "");
  const [saving, setSaving] = useState(false);

  const parseNums = s => s.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  const lbl = { color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, margin: "10px 0 4px" };
  const inp = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "8px 12px", fontFamily: F.body, fontSize: 14 };
  const mono = { ...inp, fontFamily: F.mono, direction: "ltr", textAlign: "right" };

  async function save() {
    setSaving(true);
    try {
      await updateTopicCard(card.id, {
        title: title.trim(), subtitle: subtitle.trim(), quality: Number(quality) || 0,
        numbers: parseNums(nums), highlight_numbers: parseNums(hot),
        findings: { ...f, headline: headline.trim(), hint: hint.trim(), caveat: caveat.trim(),
          bullets: bullets.split("\n").map(s => s.trim()).filter(Boolean).map(line => {
            const m = line.match(/^(.*?)\s*\|\s*(\d+)\s*$/);
            if (m) { const id = (card.image_ids || [])[parseInt(m[2], 10) - 1]; if (id) return { t: m[1].trim(), img: id }; }
            return line;
          }) },
      });
      onSaved();
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); setSaving(false); }
  }

  return (
    <div style={{ ...card, borderColor: C.gold }}>
      <H>✎ עריכת כרטיס</H>
      <div style={lbl}>כותרת</div>
      <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
      <div style={lbl}>כותרת משנה</div>
      <input value={subtitle} onChange={e => setSubtitle(e.target.value)} style={inp} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={lbl}>עוצמה (0-10)</div>
          <input type="number" min="0" max="10" value={quality} onChange={e => setQuality(e.target.value)} style={mono} />
        </div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <div style={lbl}>מספרים (פסיקים)</div>
          <input value={nums} onChange={e => setNums(e.target.value)} style={mono} />
        </div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <div style={lbl}>מספרים מובלטים (פסיקים)</div>
          <input value={hot} onChange={e => setHot(e.target.value)} style={mono} />
        </div>
      </div>
      <div style={lbl}>כותרת הממצאים</div>
      <input value={headline} onChange={e => setHeadline(e.target.value)} style={inp} />
      <div style={lbl}>נקודות (שורה לכל נקודה · להצמיד תמונה: "טקסט | 2" כשהמספר = מיקום התמונה בכרטיס)</div>
      <textarea value={bullets} onChange={e => setBullets(e.target.value)} rows={6} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
      <div style={lbl}>רמז משלים (רובד פרשני)</div>
      <textarea value={hint} onChange={e => setHint(e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
      <div style={lbl}>הסתייגות מחקרית</div>
      <textarea value={caveat} onChange={e => setCaveat(e.target.value)} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {saving ? <span style={{ color: C.goldDim, fontFamily: F.heading }}>שומר…</span> : (
          <>
            <BtnGold onClick={save}>💾 שמור</BtnGold>
            <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "8px 16px", cursor: "pointer", fontFamily: F.heading }}>ביטול</button>
          </>
        )}
      </div>
    </div>
  );
}

// כלי "צוד חיבורים" — בוחרים תמונה, המנוע מחשב את כל החיבורים, ויוצרים טיוטת כרטיס
function HuntBox({ onCreated }) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState(null);
  const [picked, setPicked] = useState(null);   // {image, conn}
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState("");

  async function search() {
    setHits(null); setPicked(null); setSaved("");
    if (!term.trim()) return;
    try { setHits(await findGalleryImages(term.trim())); } catch (e) { alert(e.message); }
  }
  async function pick(img) {
    setLoading(true); setSaved("");
    try {
      const conn = await getImageConnections(img.id);
      setPicked({ image: img, conn });
      const fname = (img.image_url || "").split("/").pop().split(".")[0];
      setTitle(img.name || fname || "כרטיס חדש");
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }
  async function createDraft() {
    if (!picked) return;
    const conns = picked.conn?.connections || [];
    const hot = conns.filter(c => (c.sets || []).length > 0).map(c => c.number);
    const nums = conns.map(c => c.number);
    const slug = "img-" + picked.image.id.slice(0, 8);
    try {
      await createTopicCardDraft({
        slug, title: title.trim() || "כרטיס חדש",
        subtitle: "צידה אוטומטית מתמונה — חיבורים לרשימות הגימטריה",
        search_terms: [term.trim()].filter(Boolean),
        image_ids: [picked.image.id],
        numbers: nums, highlight_numbers: hot, quality: 5,
        findings: {
          headline: "חיבורים שזוהו אוטומטית",
          bullets: conns.slice(0, 8).map(c =>
            `${c.number} — חוזר ב-${c.images} תמונות${(c.sets || []).length ? ` · בסטים: ${c.sets.join(", ")}` : ""}`),
          connections: conns.filter(c => (c.sets || []).length).slice(0, 6).map(c =>
            ({ number: c.number, links: c.sets, note: `חוזר ב-${c.images} תמונות` })),
          caveat: "צידה אוטומטית — דורשת בדיקה ועריכה לפני אישור. מספרים קטנים עשויים להיות תאריכים."
        }
      });
      setSaved("✓ נוצרה טיוטה — גלול למטה לאישור/עריכה");
      onCreated && onCreated();
    } catch (e) { alert("יצירה נכשלה: " + (e.message || e)); }
  }

  const conns = picked?.conn?.connections || [];
  return (
    <div style={{ ...card, borderColor: C.borderGold }}>
      <H>🎯 צוד חיבורים לתמונה</H>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "4px 0 12px", lineHeight: 1.7 }}>
        בחר תמונה (חיפוש לפי שם קובץ או טקסט) — המנוע יחשב אילו מהמספרים שלה חוזרים בתמונות אחרות ובאילו סטים, ותוכל ליצור טיוטת כרטיס לאישור.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="חיפוש תמונה — למשל מירון / תרנגול / שם קובץ"
          style={{ flex: 1, minWidth: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "9px 12px", fontFamily: F.body, fontSize: 14 }} />
        <BtnGold onClick={search}>חפש</BtnGold>
      </div>

      {hits && hits.length > 0 && !picked && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {hits.map(im => (
            <button key={im.id} onClick={() => pick(im)} title={(im.image_url || "").split("/").pop()}
              style={{ cursor: "pointer", padding: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", width: 72, height: 72, background: `center/cover no-repeat url(${im.image_url})` }} />
          ))}
        </div>
      )}
      {hits && hits.length === 0 && <Empty>אין תמונות תואמות.</Empty>}
      {loading && <div style={{ color: C.goldDim, fontFamily: F.heading, marginTop: 12 }}>מחשב חיבורים…</div>}

      {picked && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <a href={picked.image.image_url} target="_blank" rel="noopener noreferrer" style={{ width: 90, height: 90, flexShrink: 0, borderRadius: 8, border: `1px solid ${C.border}`, background: `center/cover no-repeat url(${picked.image.image_url})` }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="שם הכרטיס"
                style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldBright, padding: "8px 12px", fontFamily: F.regal, fontSize: 16, marginBottom: 8 }} />
              <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                {conns.map(c => (
                  <div key={c.number} style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: F.body, fontSize: 13 }}>
                    <span style={{ fontFamily: F.mono, fontWeight: 800, color: (c.sets || []).length ? C.goldBright : C.goldDim, minWidth: 48 }}>{c.number}</span>
                    <span style={{ color: C.muted }}>{c.images} תמונות</span>
                    {(c.sets || []).length > 0 && <span style={{ color: C.goldLight }}>· {c.sets.join(", ")}</span>}
                  </div>
                ))}
                {conns.length === 0 && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>אין חיבורים משמעותיים.</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <BtnGold onClick={createDraft}>➕ צור טיוטת כרטיס</BtnGold>
            <button onClick={() => { setPicked(null); setSaved(""); }} style={iconBtn}>← תמונה אחרת</button>
            {saved && <span style={{ color: "#7bbf7b", fontFamily: F.heading, fontSize: 13 }}>{saved}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ⭐ אצירת תמונות — דירוג (importance) + הסתרה. מיון: חזק קודם, ואז תאריך =====
function CurationTab() {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback((t = "") => {
    setRows(null);
    searchGalleryForCuration(t).then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(() => { load(""); }, [load]);

  async function bump(im, delta) {
    setBusy(im.id);
    const next = Math.max(0, Math.min(100, (im.importance || 0) + delta));
    try {
      await setImageCuration(im.id, { importance: next });
      setRows(rs => rs.map(r => r.id === im.id ? { ...r, importance: next } : r)
        .sort((a, b) => (b.importance || 0) - (a.importance || 0) || new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0)));
    } catch (e) { alert(e.message || e); }
    finally { setBusy(null); }
  }
  async function toggleHide(im) {
    setBusy(im.id);
    try {
      await setImageCuration(im.id, { curator_hidden: !im.curator_hidden });
      setRows(rs => rs.map(r => r.id === im.id ? { ...r, curator_hidden: !im.curator_hidden } : r));
    } catch (e) { alert(e.message || e); }
    finally { setBusy(null); }
  }
  // 🆕 הוסף/הסר מהפיד «עדכוני גלריה» (source='update'). חוזר ל-'manual' בביטול.
  async function toggleUpdate(im) {
    setBusy(im.id);
    const next = im.source === "update" ? "manual" : "update";
    try {
      const saved = await setImageCuration(im.id, { source: next });
      setRows(rs => rs.map(r => r.id === im.id ? { ...r, source: saved?.source ?? next } : r));
    } catch (e) { alert(e.message || e); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <H>⭐ אצירת תמונות</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "6px 0 12px", lineHeight: 1.8 }}>
          ⭐ מעלה/מוריד עוצמה (המובחר עולה למעלה) · 👁 מסתיר מבלי למחוק. הסדר הזה <b style={{ color: C.goldDim }}>משפיע על כל התצוגות של אותו מספר</b> (פוסט היסוד, דף המספר). חיפוש מספר = גלריית אותו מספר בדיוק כפי שמוצגת.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && load(term)}
            placeholder="חיפוש לפי מספר / טקסט / שם קובץ…"
            style={{ flex: 1, minWidth: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "9px 12px", fontFamily: F.body, fontSize: 14 }} />
          <BtnGold onClick={() => load(term)}>חפש</BtnGold>
        </div>
        {/* גלריות לפי מספר — פתיחה מהירה */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
          <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, letterSpacing: 1 }}>גלריות לפי מספר:</span>
          {["1820", "776", "878", "888", "358", "424", "1202", "26", "70"].map(nq => (
            <button key={nq} onClick={() => { setTerm(nq); load(nq); }}
              style={{ cursor: "pointer", background: term === nq ? "rgba(212,175,55,0.18)" : "none", border: `1px solid ${term === nq ? C.borderGold : C.border}`, color: C.goldLight, borderRadius: 999, padding: "4px 12px", fontFamily: F.mono, fontSize: 12.5, fontWeight: 700 }}>{nq}</button>
          ))}
        </div>
      </div>

      {rows === null ? <Loading /> : rows.length === 0 ? <Empty>אין תוצאות.</Empty> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14 }}>
          {rows.map(im => (
            <div key={im.id} style={{ ...card, padding: 0, overflow: "hidden", opacity: im.curator_hidden ? 0.45 : 1 }}>
              <div style={{ position: "relative", aspectRatio: "4/3", background: `center/cover no-repeat url(${im.image_url})` }}>
                <span style={{ position: "absolute", top: 6, insetInlineStart: 6, background: "rgba(8,5,2,0.8)", color: C.goldBright, fontFamily: F.mono, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>⭐ {im.importance ?? 0}</span>
                {im.curator_hidden && <span style={{ position: "absolute", top: 6, insetInlineEnd: 6, background: "rgba(8,5,2,0.8)", color: "#d98a92", fontFamily: F.heading, fontSize: 11, borderRadius: 999, padding: "2px 8px" }}>מוסתר</span>}
                {im.source === "update" && !im.curator_hidden && <span style={{ position: "absolute", top: 6, insetInlineEnd: 6, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 8px" }}>🆕 בפיד</span>}
              </div>
              <div style={{ padding: "10px 12px" }}>
                {(im.ocr_numbers || []).length > 0 && <div style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 11.5, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">{(im.ocr_numbers || []).slice(0, 8).join(" · ")}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button disabled={busy === im.id} onClick={() => bump(im, 10)} style={curBtn}>⭐ +</button>
                  <button disabled={busy === im.id} onClick={() => bump(im, -10)} style={curBtn}>−</button>
                  <button disabled={busy === im.id} onClick={() => toggleHide(im)} style={{ ...curBtn, borderColor: im.curator_hidden ? C.borderGold : C.border }}>{im.curator_hidden ? "👁 הצג" : "👁 הסתר"}</button>
                  <button disabled={busy === im.id} onClick={() => toggleUpdate(im)} title="הוסף/הסר מהפיד «עדכוני גלריה»" style={{ ...curBtn, borderColor: im.source === "update" ? "#e0556a" : C.border, color: im.source === "update" ? "#e0556a" : C.goldLight }}>{im.source === "update" ? "🆕 בפיד ✓" : "🆕 לפיד"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const curBtn = { cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.goldLight, borderRadius: 8, padding: "5px 11px", fontFamily: F.heading, fontSize: 12 };

// ===== 🔤 OCR (Edge Function gallery-ocr) =====
function OcrTab() {
  const [counts, setCounts] = useState(null);
  const [runKey, setRunKey] = useState("");
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState([]);
  const [retryErrors, setRetryErrors] = useState(false);
  const stopRef = React.useRef(false);

  const refresh = useCallback(() => getOcrCounts().then(setCounts).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  function addLog(m) { setLog(l => [`${new Date().toLocaleTimeString("he-IL")} · ${m}`, ...l].slice(0, 40)); }

  async function runOnce(retry = false) {
    const r = await runOcrBatch({ limit: 5, retry, runKey });   // 5 = יציב מתחת לטיימאאוט 150ש' של ה-Edge Function
    addLog(`עובדו ${r.picked} · הצליחו ${r.done} · שגיאות ${r.errors}`);
    return r;
  }
  async function runAll() {
    setRunning(true); setAuto(true); stopRef.current = false;
    try {
      for (let i = 0; i < 600 && !stopRef.current; i++) {
        const r = await runOnce(retryErrors);
        await refresh();
        if (!r || r.picked === 0) { addLog("✅ הסתיים — אין עוד תמונות לעיבוד"); break; }
      }
    } catch (e) { addLog("⚠ שגיאה: " + (e.message || e)); }
    finally { setRunning(false); setAuto(false); }
  }
  async function runSingle() {   // "הרץ 3" — מנה קטנה ומהירה של 3 תמונות
    setRunning(true);
    try {
      const r = await runOcrBatch({ limit: 3, retry: retryErrors, runKey });
      addLog(`עובדו ${r.picked} · הצליחו ${r.done} · שגיאות ${r.errors}`);
      await refresh();
    } catch (e) { addLog("⚠ שגיאה: " + (e.message || e)); }
    finally { setRunning(false); }
  }

  const pct = counts && counts.total ? Math.round((counts.done) / counts.total * 100) : 0;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <Stat label="הושלמו (done)" value={counts ? counts.done.toLocaleString() : "…"} />
        <Stat label="ממתינים (pending)" value={counts ? counts.pending.toLocaleString() : "…"} />
        <Stat label="שגיאות" value={counts ? counts.error.toLocaleString() : "…"} />
        <Stat label="סה״כ" value={counts ? counts.total.toLocaleString() : "…"} />
      </div>

      <div style={card}>
        <H>OCR לתמונות הגלריה (Claude Vision)</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: "6px 0 12px" }}>
          מריץ את ה-Edge Function <code style={{ color: C.goldLight }}>gallery-ocr</code> על תמונות שטרם עובדו (5 בכל מנה — יציב). רץ על מפתח ה-Anthropic שלך. "הרץ עד הסוף" ממשיך אוטומטית עד שאין ממתינים.
        </div>
        <div style={{ height: 10, background: "rgba(8,5,2,0.5)", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.goldDark})` }} />
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12, marginBottom: 14 }}>{pct}% הושלמו</div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.goldLight, fontFamily: F.heading, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={retryErrors} onChange={e => setRetryErrors(e.target.checked)} />
          כלול גם תמונות שנכשלו (נסה שוב שגיאות) — לאחר טעינת קרדיטים ב-Anthropic
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={runKey} onChange={e => setRunKey(e.target.value)} placeholder="x-run-key (אם הוגדר)"
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "8px 12px", fontFamily: F.mono, fontSize: 13, direction: "ltr" }} />
          {!running ? (
            <>
              <BtnGold onClick={runSingle}>הרץ 3</BtnGold>
              <BtnGold onClick={runAll}>▶ הרץ עד הסוף</BtnGold>
            </>
          ) : (
            <>
              <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13 }}>⏳ {auto ? "רץ אוטומטית…" : "מריץ…"}</span>
              {auto && <button onClick={() => { stopRef.current = true; }} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.crimsonLight}`, color: "#d98a92", borderRadius: 999, padding: "8px 16px", fontFamily: F.heading }}>עצור</button>}
            </>
          )}
          <button onClick={refresh} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "8px 14px", fontFamily: F.heading, fontSize: 12 }}>רענן ספירה</button>
        </div>
      </div>

      {log.length > 0 && (
        <div style={card}>
          <H>יומן הרצה</H>
          <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 12.5, color: C.goldDim, display: "grid", gap: 4, maxHeight: 240, overflowY: "auto" }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 🔍 סורק נדירות — סורק מלא ביטויים/ערכים ומדרג לפי נדירות (אותו מנוע של «ההצלבה הנסתרת») =====
// המנוע סופר בשבילך: לכל פריט — גודל משפחת-הערך (כמה ביטויים חולקים אותו) + בונוס תהודת-אפס.
// משפחה קטנה = נדיר = ציון גבוה. אין חיפוש ידני — מדביקים רשימה / טווח, והכל מדורג אוטומטית.
const SCAN_METHODS = ["רגיל", "מילוי", "מסתתר", "קדמי", "ריבוע", "סידורי", "אתבש", "אלבם", "מילוי בלבד", "הכפלה"];

function ScannerTab() {
  const [mode, setMode] = useState("phrases");        // phrases | values
  const [text, setText] = useState("");               // ביטויים (שורה לכל ביטוי)
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("1000");
  const [rangeStep, setRangeStep] = useState("1");
  const [methods, setMethods] = useState(["רגיל"]);   // שיטות לסריקת ביטויים
  const [withReso, setWithReso] = useState(true);      // בונוס תהודת-אפס
  const [minScore, setMinScore] = useState(0);         // סף נדירות
  const [maxFamily, setMaxFamily] = useState("");      // משפחה מקסימלית (ריק = ללא הגבלה)
  const [maxWords, setMaxWords] = useState("5");       // 📏 מילים מקסימלי — מנטרל משפטים ארוכים (ריק = ללא הגבלה)
  const [sort, setSort] = useState("rarity");          // rarity | value | family
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  function toggleMethod(k) { setMethods(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k]); }

  // בונה את הפריטים לסריקה (כל פריט = "הצלבה" של עצמו על-פני השיטות הנבחרות)
  function buildItems() {
    if (mode === "values") {
      const a = parseInt(rangeFrom, 10), b = parseInt(rangeTo, 10), st = Math.max(1, parseInt(rangeStep, 10) || 1);
      if (isNaN(a) || isNaN(b)) return [];
      const out = [];
      for (let v = a; v <= b && out.length < 2000; v += st) out.push({ key: String(v), kind: "value", value: v, methods: [{ label: "רגיל", value: v }] });
      return out;
    }
    const phrases = [...new Set(text.split("\n").map(s => s.trim()).filter(Boolean))].slice(0, 600);
    const pick = methods.length ? methods : ["רגיל"];
    return phrases.map(p => {
      const ms = pick.map(k => { const m = METHODS.find(x => x.key === k); return m ? { label: k, value: m.fn(p) } : null; })
        .filter(m => m && m.value > 0);
      return { key: p, kind: "phrase", value: ms[0]?.value ?? null, methods: ms };
    }).filter(it => it.methods.length);
  }

  async function loadGoldEntities() {
    setBusy(true); setNote("טוען ישויות זהב…");
    try {
      const { data } = await supabase.from("nodes").select("label").eq("type", "entity").eq("is_active", true).gte("weight", 3).limit(600);
      const labels = [...new Set((data || []).map(r => r.label).filter(Boolean))];
      setMode("phrases"); setText(labels.join("\n")); setNote(`נטענו ${labels.length} ישויות זהב — לחץ «סרוק».`);
    } catch (e) { setNote("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }
  function loadKeyNumbers() {
    setMode("values");
    const ns = Object.keys(KEY_NUMBERS).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (ns.length) { setRangeFrom(String(ns[0])); setRangeTo(String(ns[ns.length - 1])); }
    setText(""); setNote(`${ns.length} מספרי מפתח — עבור למצב «ערכים» וסרוק, או הדבק ידנית.`);
  }

  async function scan() {
    setBusy(true); setRows(null); setNote("");
    try {
      const items = buildItems();
      if (!items.length) { setNote("אין מה לסרוק — הדבק ביטויים או הגדר טווח."); setBusy(false); return; }
      const scored = await rankItems(items);
      setRows(scored);
      setNote(`נסרקו ${items.length} · הוצגו ${scored.length}`);
    } catch (e) { setNote("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }

  // 🌐 סריקת כל המאגר — השרת מדרג את כל ~13,400 הביטויים לפי נדירות ומחזיר את הצמרת,
  // ואז הלקוח מחשב עליהם ציון מדויק (כולל ⚡ תהודה ועוגנים) — אותו מנוע כמו בהדבקה.
  async function scanCorpus() {
    setBusy(true); setRows(null); setNote("מדרג את כל המאגר בשרת…");
    try {
      const pick = (methods.length ? methods : ["רגיל"]).filter(k => k !== "מילוי בלבד"); // מילוי בלבד לא ב-bidim
      const mf = parseInt(maxFamily, 10);
      const mw = parseInt(maxWords, 10);
      const { data, error } = await supabase.rpc("scan_corpus_rarity", {
        p_methods: pick, p_max_family: isNaN(mf) ? null : mf, p_max_words: isNaN(mw) ? null : mw, p_limit: 800,
      });
      if (error) throw error;
      const items = (data || []).map(r => {
        const ms = (r.methods || []).filter(m => m && m.value > 0);
        const reg = ms.find(m => m.label === "רגיל");
        return { key: r.phrase, kind: "phrase", value: (reg || ms[0])?.value ?? null, methods: ms };
      }).filter(it => it.methods.length);
      if (!items.length) { setNote("לא חזרו מועמדים — בחר שיטות או הקטן «משפחה עד»."); setBusy(false); return; }
      setNote("מחשב נדירות מדויקת (תהודה + עוגנים)…");
      const scored = await rankItems(items);
      setRows(scored);
      setNote(`כל המאגר נסרק · ${items.length} מועמדים מובילים · הוצגו ${scored.length}`);
    } catch (e) { setNote("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }

  // דירוג רשימת פריטים — אותו צינור לכל מצבי הסריקה (הדבקה / טווח / כל המאגר)
  async function rankItems(items) {
    const wordCount = s => (String(s || "").trim().split(/\s+/).filter(Boolean).length || 0);
    const mw = parseInt(maxWords, 10);
    let pool = items.map(it => ({ ...it, nWords: it.kind === "phrase" ? wordCount(it.key) : 1 }));
    if (!isNaN(mw)) pool = pool.filter(it => it.nWords <= mw); // 📏 סינון אורך — מנטרל משפטים ארוכים
    const pairs = collectPairs(pool);
    const sizeMap = await fetchFamilySizes(pairs);
    const resoMap = withReso ? await fetchResonanceMap(pairs.map(p => p.value)) : {};
    let scored = pool.map(it => ({ ...it, rarity: scoreCross(it, sizeMap, resoMap) }));
    const mf = parseInt(maxFamily, 10);
    if (!isNaN(mf)) scored = scored.filter(it => it.rarity.rarestSize != null && it.rarity.rarestSize <= mf);
    scored = scored.filter(it => it.rarity.score >= minScore);
    scored.sort((a, b) =>
      sort === "value" ? (a.value || 0) - (b.value || 0)
      : sort === "family" ? (a.rarity.rarestSize ?? 1e9) - (b.rarity.rarestSize ?? 1e9)
      : (b.rarity.score - a.rarity.score) || (a.nWords - b.nWords)); // שובר-שוויון: קצר קודם
    return scored;
  }

  function exportCsv() {
    if (!rows || !rows.length) return;
    const head = ["פריט", "ערך", "משפחה נדירה", "ציון נדירות", "תהודת-אפס", "שיטות"];
    const body = rows.map(r => [r.key, r.value ?? "", r.rarity.rarestSize ?? "", r.rarity.score, r.rarity.resonance || 0, r.methods.map(m => `${m.label}=${m.value}`).join(" | ")]);
    downloadCsv(`rarity-scan-${Date.now()}.csv`, [head, ...body]);
  }

  const mPill = on => ({ cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 999, border: `1px solid ${on ? C.gold : C.border}`, background: on ? "rgba(212,175,55,0.18)" : "transparent", color: on ? C.goldBright : C.muted });
  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "8px 12px", fontFamily: F.body, fontSize: 14 };
  const mono = { ...inp, fontFamily: F.mono, direction: "ltr", textAlign: "center", width: 90 };
  const sc = s => s >= 70 ? "#3fae5a" : s >= 40 ? C.goldBright : C.goldDim;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <H>🔍 סורק נדירות</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "6px 0 14px", lineHeight: 1.8 }}>
          המנוע סופר בשבילך — <b style={{ color: C.goldDim }}>אין חיפוש ידני</b>. הדבק רשימת ביטויים (שורה לכל אחד) או הגדר טווח ערכים, בחר שיטות, ולחץ «סרוק».
          כל פריט מדורג לפי נדירות: <b style={{ color: C.goldDim }}>משפחה קטנה = נדיר = ציון גבוה</b>, ועם בונוס תהודת-אפס (⚡).
        </div>

        {/* מצב + טעינה מהירה */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <button onClick={() => setMode("phrases")} style={mPill(mode === "phrases")}>✍️ ביטויים</button>
          <button onClick={() => setMode("values")} style={mPill(mode === "values")}>🔢 טווח ערכים</button>
          <span style={{ width: 1, height: 20, background: C.border }} />
          <button onClick={loadGoldEntities} style={mPill(false)}>★ טען ישויות זהב</button>
          <button onClick={loadKeyNumbers} style={mPill(false)}>🔑 מספרי מפתח</button>
        </div>

        {mode === "phrases" ? (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={7}
              placeholder={"ביטוי בכל שורה…\nמשיח בן דוד\nירושלים\nפרה אדומה"}
              style={{ ...inp, width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, margin: "12px 0 6px" }}>שיטות לסריקה (כל פריט נמדד בכל שיטה — הנדיר ביותר קובע):</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SCAN_METHODS.map(k => <button key={k} onClick={() => toggleMethod(k)} style={mPill(methods.includes(k))}>{k}</button>)}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div><div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 4 }}>מ-</div><input value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={mono} /></div>
            <div><div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 4 }}>עד</div><input value={rangeTo} onChange={e => setRangeTo(e.target.value)} style={mono} /></div>
            <div><div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 4 }}>קפיצה</div><input value={rangeStep} onChange={e => setRangeStep(e.target.value)} style={mono} /></div>
          </div>
        )}

        {/* אפשרויות */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.goldLight, fontFamily: F.heading, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={withReso} onChange={e => setWithReso(e.target.checked)} /> ⚡ בונוס תהודת-אפס
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>
            סף נדירות: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{minScore}</b>
            <input type="range" min="0" max="100" value={minScore} onChange={e => setMinScore(Number(e.target.value))} />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>
            משפחה עד <input value={maxFamily} onChange={e => setMaxFamily(e.target.value)} placeholder="∞" style={{ ...mono, width: 56 }} /> ביטויים
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.goldLight, fontFamily: F.heading, fontSize: 13 }} title="מנטרל משפטים ארוכים שנדירים 'טריוויאלית'. ריק = ללא הגבלה.">
            📏 מילים עד <input value={maxWords} onChange={e => setMaxWords(e.target.value)} placeholder="∞" style={{ ...mono, width: 56 }} />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>
            מיון:
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inp, padding: "6px 10px" }}>
              <option value="rarity">נדירות ↓</option>
              <option value="family">משפחה ↑</option>
              <option value="value">ערך ↑</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          {busy ? <span style={{ color: C.goldDim, fontFamily: F.heading }}>סורק…</span> : <>
            <BtnGold onClick={scan}>🔍 סרוק רשימה</BtnGold>
            <button onClick={scanCorpus} style={{ ...iconBtn, borderColor: C.gold, color: C.goldBright }} title="מדרג את כל ~13,400 הביטויים שבמאגר לפי נדירות, ומציף את ההצלבה הכי גבוהה. בחר את השיטות שיכנסו להצלבה.">🌐 סרוק את כל המאגר</button>
          </>}
          {rows && rows.length > 0 && <button onClick={exportCsv} style={iconBtn}>⬇ ייצוא CSV</button>}
          {note && <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12.5 }}>{note}</span>}
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 8, lineHeight: 1.7 }}>
          🌐 <b style={{ color: C.muted }}>כל המאגר:</b> השרת מדרג את כל הביטויים לפי השיטות שסימנת ומחזיר את הצמרת, ואז הציון המדויק (⚡ תהודה + עוגנים) מחושב כאן.
          טיפ: ביטויים ארוכים נדירים "טריוויאלית" — לסינון אמיתי הגדל את מספר השיטות או מיין לפי <b style={{ color: C.muted }}>נדירות ↓</b> שמשקלל גם תהודה ועוגנים.
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr>
              <th style={th}>#</th><th style={th}>פריט</th><th style={th}>ערך</th><th style={th}>משפחה</th><th style={th}>נדירות</th><th style={th}>⚡</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 400).map((r, i) => (
                <tr key={r.key + i}>
                  <td style={{ ...td, color: C.goldDim, fontFamily: F.mono }}>{i + 1}</td>
                  <td style={{ ...td, color: C.goldBright, fontWeight: 700 }} title={r.methods.map(m => `${m.label}=${m.value}`).join(" · ")}>{r.key}</td>
                  <td style={{ ...td, fontFamily: F.mono }}>{r.value ?? "—"}</td>
                  <td style={{ ...td, fontFamily: F.mono, color: (r.rarity.rarestSize ?? 99) <= 6 ? "#3fae5a" : C.goldLight }}>{r.rarity.rarestSize ?? "—"}</td>
                  <td style={{ ...td, fontFamily: F.mono, fontWeight: 800, color: sc(r.rarity.score) }}>{r.rarity.score}</td>
                  <td style={{ ...td, fontFamily: F.mono }} title={r.rarity.resonance ? `מהדהד ב-${r.rarity.resonance} סקאלות-אפס` : ""}>{r.rarity.resonance ? `⚡${r.rarity.resonance}` : ""}</td>
                  <td style={td}>
                    {r.value != null && <Link to={`/number/${r.value}`} style={{ color: LINK, fontFamily: F.heading, fontSize: 12, textDecoration: "none", marginInlineEnd: 10 }}>מספר →</Link>}
                    {r.kind === "phrase" && <Link to={`/journey?from=${encodeURIComponent(r.key)}`} style={{ color: LINK, fontFamily: F.heading, fontSize: 12, textDecoration: "none" }}>מסע →</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 400 && <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, textAlign: "center", marginTop: 10 }}>מוצגות 400 הראשונות מתוך {rows.length} — צמצם עם הסף/מיון או ייצא CSV.</div>}
        </div>
      )}
      {rows && rows.length === 0 && <Empty>אין תוצאות בסף הזה — הורד את סף הנדירות או הרחב את הקלט.</Empty>}
    </div>
  );
}

// ===== 🧪 מעבדת צוריאל — שכבת חקירה (rule tzuriel_lab) =====
// קוקפיט אחד: (1) מחשבון מחקר פרטי + «ההצלבה הנסתרת שלי» (קיר פרטי מדורג לפי נדירות);
// (2) חידושי המעבדה הקיימים — insights space='lab' (EXPLORATORY, evidence_level 2).
function ResearchTab() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lab, setLab] = useState(null);
  const [published, setPublished] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(null);
  const [promotedId, setPromotedId] = useState(null);

  async function analyze() {
    setBusy(true); setNote("טוען את המחקר שלי…"); setRows(null);
    try {
      const priv = await getWallPrivate(200);
      const phrases = [...new Set((priv || []).map(r => (r.phrase || "").trim()).filter(Boolean))];
      if (!phrases.length) { setNote("עדיין אין פריטים — חקרו משהו במחשבון (נשמר אוטומטית לפרטי)."); setBusy(false); return; }
      const items = phrases.map(p => {
        const ms = SCAN_METHODS.filter(k => k !== "מילוי בלבד").map(k => {
          const m = METHODS.find(x => x.key === k); return m ? { label: k, value: m.fn(p) } : null;
        }).filter(m => m && m.value > 0);
        return { key: p, kind: "phrase", value: ms.find(m => m.label === "רגיל")?.value ?? ms[0]?.value ?? null, methods: ms };
      }).filter(it => it.methods.length);
      const pairs = collectPairs(items);
      const sizeMap = await fetchFamilySizes(pairs);
      const resoMap = await fetchResonanceMap(pairs.map(p => p.value));
      const scored = items.map(it => ({ ...it, rarity: scoreCross(it, sizeMap, resoMap) }))
        .sort((a, b) => (b.rarity.score - a.rarity.score) || (a.value || 0) - (b.value || 0));
      setRows(scored); setNote(`${scored.length} פריטים במחקר שלי`);
    } catch (e) { setNote("שגיאה: " + (e.message || e)); }
    finally { setBusy(false); }
  }
  async function loadLab() {
    const drafts = await getLabInsights(80).catch(() => []);
    setLab(drafts);
    const { data: pub } = await supabase.from('insights')
      .select('id,title,body,category,related_numbers,evidence_level,origin,tags,created_at')
      .eq('category', 'מעבדת צוריאל').is('space', null).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(80);
    setPublished(pub || []);
  }

  async function promoteInsight(id) {
    await supabase.from('insights').update({ space: null }).eq('id', id);
    await loadLab();
  }

  async function demoteInsight(id) {
    await supabase.from('insights').update({ space: 'lab', category: 'מעבדת צוריאל' }).eq('id', id);
    await loadLab();
  }

  async function saveInsight(id) {
    setSaving(id);
    const d = editDraft[id] || {};
    const patch = {};
    if (d.title !== undefined) patch.title = d.title.trim();
    if (d.body !== undefined) patch.body = d.body;
    if (d.evidence_level !== undefined) patch.evidence_level = parseInt(d.evidence_level, 10) || null;
    if (d.related_numbers_str !== undefined)
      patch.related_numbers = d.related_numbers_str.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (Object.keys(patch).length) await supabase.from('insights').update(patch).eq('id', id);
    await loadLab();
    setSaving(null);
  }

  function startEdit(it) {
    setEditDraft(prev => ({
      ...prev,
      [it.id]: { title: it.title, body: it.body || "", evidence_level: it.evidence_level ?? "", related_numbers_str: (it.related_numbers || []).join(", ") }
    }));
    setExpandedId(id => id === it.id ? null : it.id);
  }

  useEffect(() => { analyze(); loadLab(); }, []); // eslint-disable-line

  const sc = s => s >= 70 ? "#3fae5a" : s >= 40 ? C.goldBright : C.goldDim;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <H>🧪 מעבדת צוריאל</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "6px 0 14px", lineHeight: 1.8 }}>
          שכבת חקירה — חידושים חזקים/מבניים שטרם עברו שרשרת הוכחה מלאה (<b style={{ color: C.goldDim }}>EXPLORATORY</b>).
          המחשבון כאן <b style={{ color: C.goldDim }}>פרטי לחלוטין</b> — נשמר רק אצלך, לא באתר/ברשימת החיפושים/בקיר.
          כל פריט נצבר ל«ההצלבה הנסתרת שלי» ומדורג לפי נדירות.
        </div>
        <GematriaCalculator research />
        <div style={{ marginTop: 12 }}>
          <BtnGold onClick={analyze}>{busy ? "מנתח…" : "🔄 רענן את ההצלבה הנסתרת שלי"}</BtnGold>
          {note && <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12.5, marginInlineStart: 10 }}>{note}</span>}
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div style={{ ...card, overflowX: "auto" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>💎 ההצלבה הנסתרת שלי</div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
            <thead><tr>
              <th style={th}>#</th><th style={th}>פריט</th><th style={th}>ערך</th><th style={th}>משפחה</th><th style={th}>נדירות</th><th style={th}>⚡</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 300).map((r, i) => (
                <tr key={r.key + i}>
                  <td style={{ ...td, color: C.goldDim, fontFamily: F.mono }}>{i + 1}</td>
                  <td style={{ ...td, color: C.goldBright, fontWeight: 700 }} title={r.methods.map(m => `${m.label}=${m.value}`).join(" · ")}>{r.key}</td>
                  <td style={{ ...td, fontFamily: F.mono }}>{r.value ?? "—"}</td>
                  <td style={{ ...td, fontFamily: F.mono, color: (r.rarity.rarestSize ?? 99) <= 6 ? "#3fae5a" : C.goldLight }}>{r.rarity.rarestSize ?? "—"}</td>
                  <td style={{ ...td, fontFamily: F.mono, fontWeight: 800, color: sc(r.rarity.score) }}>{r.rarity.score}</td>
                  <td style={{ ...td, fontFamily: F.mono }} title={r.rarity.resonance ? `מהדהד ב-${r.rarity.resonance} סקאלות-אפס` : ""}>{r.rarity.resonance ? `⚡${r.rarity.resonance}` : ""}</td>
                  <td style={td}>
                    {r.value != null && <Link to={`/number/${r.value}`} style={{ color: LINK, fontFamily: F.heading, fontSize: 12, textDecoration: "none", marginInlineEnd: 10 }}>מספר →</Link>}
                    <Link to={`/journey?from=${encodeURIComponent(r.key)}`} style={{ color: LINK, fontFamily: F.heading, fontSize: 12, textDecoration: "none" }}>מסע →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* toast: פורסם בהצלחה */}
      {promotedId && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 999,
          background: "linear-gradient(135deg,rgba(212,175,55,0.95),rgba(180,140,30,0.95))", color: "#1a0e00",
          borderRadius: 999, padding: "10px 24px", fontFamily: F.heading, fontWeight: 800, fontSize: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 12 }}>
          ✅ עבר לבית המדרש! &nbsp;
          <Link to="/beit-midrash?tab=crosses" onClick={() => setPromotedId(null)}
            style={{ color: "#1a0e00", fontFamily: F.heading, fontSize: 13, textDecoration: "underline" }}>
            לחץ לראות →
          </Link>
          <button onClick={() => setPromotedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a0e00", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* 🔬 טיוטות — space='lab', מקובצות לפי מספר, ישנות ראשון */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>
            🔬 טיוטות המעבדה {lab ? `(${lab.length})` : ""}
          </div>
          <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "2px 8px" }}>ישנות ראשון · חדשות למטה</span>
        </div>
        {!lab ? <div style={{ color: C.muted, fontFamily: F.body }}>טוען…</div>
          : lab.length === 0 ? <Empty>אין טיוטות — כל החידושים פורסמו.</Empty>
          : (() => {
            const sorted = [...lab].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const groupKey = it => {
              const ns = it.related_numbers || [];
              if (ns.includes(400) || ns.includes(40)) return 400;
              if (ns.includes(358) || ns.includes(853)) return 358;
              return ns[0] ?? 0;
            };
            const groups = {};
            sorted.forEach(it => { const k = groupKey(it); (groups[k] = groups[k] || []).push(it); });
            const groupEntries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
            const GROUP_LABEL = { 400: '◈ ת׳ / מ׳ — 40 · 400', 358: '◈ משיח / 358', 0: '◈ אחר' };
            const inp = { background: "rgba(4,2,14,0.7)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 13, padding: "7px 10px", width: "100%", boxSizing: "border-box" };
            return (
              <div style={{ display: "grid", gap: 20 }}>
                {groupEntries.map(([key, items]) => (
                  <div key={key}>
                    <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 2,
                      padding: "5px 0 8px", borderBottom: `1px solid rgba(212,175,55,0.18)`, marginBottom: 10 }}>
                      {GROUP_LABEL[key] || `◈ ${key}`} · {items.length} פריטים
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {items.map(it => {
                        const isOpen = expandedId === it.id;
                        const draft = editDraft[it.id] || {};
                        return (
                          <div key={it.id} style={{ border: `1px solid ${isOpen ? "rgba(132,88,255,0.6)" : "rgba(132,88,255,0.25)"}`, borderRadius: 12, background: "rgba(132,88,255,0.04)", overflow: "hidden" }}>
                            {/* ── שורת כותרת ── */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 13px", cursor: "pointer" }}
                              onClick={() => startEdit(it)}>
                              <span style={{ color: isOpen ? "#c9a6ff" : C.goldBright, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, flex: 1 }}>{it.title}</span>
                              {it.evidence_level != null && <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 10 }}>ev{it.evidence_level}</span>}
                              <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>{new Date(it.created_at).toLocaleDateString("he-IL", { day:"numeric", month:"short" })}</span>
                              <span style={{ color: "rgba(132,88,255,0.7)", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>{isOpen ? "▲ סגור" : "▼ פתח"}</span>
                            </div>

                            {/* ── תוכן מורחב ── */}
                            {isOpen && (
                              <div style={{ borderTop: "1px solid rgba(132,88,255,0.2)", padding: "14px 13px", display: "grid", gap: 12 }}>

                                {/* כותרת */}
                                <div>
                                  <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 4 }}>כותרת</div>
                                  <input value={draft.title ?? it.title} onChange={e => setEditDraft(p => ({ ...p, [it.id]: { ...p[it.id], title: e.target.value } }))} style={inp} />
                                </div>

                                {/* גוף מלא */}
                                <div>
                                  <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 4 }}>תוכן מלא</div>
                                  <textarea value={draft.body ?? it.body ?? ""} rows={6}
                                    onChange={e => setEditDraft(p => ({ ...p, [it.id]: { ...p[it.id], body: e.target.value } }))}
                                    style={{ ...inp, resize: "vertical", lineHeight: 1.7, whiteSpace: "pre-wrap" }} />
                                </div>

                                {/* מספרים + רמת ראיה */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                                  <div>
                                    <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 4 }}>מספרים קשורים (פסיק)</div>
                                    <input value={draft.related_numbers_str ?? (it.related_numbers||[]).join(", ")}
                                      onChange={e => setEditDraft(p => ({ ...p, [it.id]: { ...p[it.id], related_numbers_str: e.target.value } }))}
                                      style={{ ...inp, direction: "ltr", textAlign: "right" }} />
                                  </div>
                                  <div>
                                    <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 4 }}>רמת ראיה (1-5)</div>
                                    <input type="number" min={1} max={5} value={draft.evidence_level ?? (it.evidence_level ?? "")}
                                      onChange={e => setEditDraft(p => ({ ...p, [it.id]: { ...p[it.id], evidence_level: e.target.value } }))}
                                      style={{ ...inp, width: 70, textAlign: "center", direction: "ltr" }} />
                                  </div>
                                </div>

                                {/* כפתורי פעולה */}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button onClick={() => saveInsight(it.id)} style={{ background: "rgba(132,88,255,0.2)", border: "1px solid rgba(132,88,255,0.5)", color: "#c9a6ff", borderRadius: 999, padding: "6px 16px", cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                                    {saving === it.id ? "שומר…" : "💾 שמור"}
                                  </button>
                                  <button onClick={async () => {
                                    const { error } = await supabase.from('insights').update({ space: null, category: 'הצלבות' }).eq('id', it.id);
                                    if (error) { alert('שגיאה בפרסום: ' + error.message); return; }
                                    await loadLab();
                                    setExpandedId(null);
                                    setPromotedId(it.id);
                                    setTimeout(() => setPromotedId(null), 6000);
                                  }} style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "6px 16px", cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                                    ✨ פרסם → בית המדרש
                                  </button>
                                </div>

                                {/* 🔒 אופציות עתידיות */}
                                <div style={{ marginTop: 4, borderTop: "1px dashed rgba(212,175,55,0.12)", paddingTop: 12 }}>
                                  <div style={{ color: "rgba(212,175,55,0.3)", fontFamily: F.heading, fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>🔒 אופציות עתידיות</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {[
                                      { icon: "👁", label: "נראות: ציבורי / רשומים / מנויים" },
                                      { icon: "📦", label: "שייך לסט (hint_set)" },
                                      { icon: "📖", label: "שייך למסלול (trail)" },
                                      { icon: "🔗", label: "פוסט מקור" },
                                      { icon: "🏷", label: "תגיות שיטה" },
                                    ].map(opt => (
                                      <span key={opt.label} style={{ background: "rgba(4,2,14,0.5)", border: "1px dashed rgba(212,175,55,0.15)", borderRadius: 8, padding: "5px 10px", color: "rgba(212,175,55,0.3)", fontFamily: F.heading, fontSize: 11, cursor: "not-allowed" }} title="בקרוב">
                                        {opt.icon} {opt.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            )}

                            {/* מספרים בשורה (כשסגור) */}
                            {!isOpen && (it.related_numbers || []).length > 0 && (
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "0 13px 10px" }}>
                                {it.related_numbers.map(n => (
                                  <Link key={n} to={`/number/${n}`} onClick={e => e.stopPropagation()}
                                    style={{ color: LINK, fontFamily: F.mono, fontSize: 11, textDecoration: "none", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "1px 8px" }}>{n}</Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        }
      </div>

      {/* ✅ פורסמו — category='מעבדת צוריאל', space IS NULL */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>
            ✅ פורסמו מהמעבדה {published ? `(${published.length})` : ""}
          </div>
          <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, background: "rgba(63,174,90,0.08)", border: "1px solid rgba(63,174,90,0.3)", borderRadius: 999, padding: "2px 8px" }}>בית המדרש</span>
        </div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>
          חידושים שיצאו מהמעבדה ומוצגים בפומבי. לחץ <b style={{ color: C.goldDim }}>החזר לטיוטה</b> כדי להסיר מהתצוגה.
        </div>
        {!published ? <div style={{ color: C.muted, fontFamily: F.body }}>טוען…</div>
          : published.length === 0 ? <Empty>אין חידושים פורסמו עדיין.</Empty>
          : (
          <div style={{ display: "grid", gap: 10 }}>
            {published.map(it => (
              <div key={it.id} style={{ border: `1px solid rgba(63,174,90,0.25)`, borderRadius: 10, padding: "11px 13px", background: "rgba(63,174,90,0.04)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{it.title}</span>
                  {it.evidence_level != null && <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>ev{it.evidence_level}</span>}
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>· {it.origin}</span>
                  <button onClick={() => demoteInsight(it.id)} style={{ marginInlineStart: "auto", background: "rgba(132,88,255,0.1)", border: "1px solid rgba(132,88,255,0.35)", color: "#c9a6ff", borderRadius: 999, padding: "3px 12px", cursor: "pointer", fontFamily: F.heading, fontSize: 11 }}>
                    ↩ החזר לטיוטה
                  </button>
                </div>
                {it.body && <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>{it.body.slice(0, 200)}{it.body.length > 200 ? "…" : ""}</div>}
                {(it.related_numbers || []).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {it.related_numbers.map(n => (
                      <Link key={n} to={`/number/${n}`} style={{ color: LINK, fontFamily: F.mono, fontSize: 12, textDecoration: "none", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "2px 9px" }}>{n} →</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ direction: "rtl", textAlign: "center", color: C.muted, fontFamily: F.body, padding: "120px 24px", fontSize: 16 }}>{children}</div>;
}
function Loading() { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען…</div>; }
function Stat({ label, value }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "14px 12px" }}>
      <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ===== 📊 סטטיסטיקות =====
const LINK = C.goldBright;  // צבע קישור אחיד בכל הפאנל
// מקורות נתונים — live=true מסומן כמחובר (ירוק), אחרת "בקרוב".
const DATA_SOURCES = [
  { icon: "🏛️", name: "מד-כניסות פנימי (SOD1820)", desc: "כניסות חיות נאספות ישירות לבסיס הנתונים שלנו — בלי תלות בגוגל", live: true },
  { icon: "📈", name: "Google Analytics 4", desc: "תנועה חיה, קהל, התנהגות, המרות", live: GA_ENABLED },
  { icon: "🟢", name: "משתמשים כעת (Realtime)", desc: "כמה גולשים מחוברים ברגע זה — דרך GA4", live: GA_ENABLED },
  { icon: "📊", name: "Vercel Web Analytics", desc: "מבקרים, צפיות ומקורות תנועה — בלוח הבקרה של Vercel", live: true },
  { icon: "🔎", name: "Google Search Console", desc: "מילות חיפוש, חשיפות, מיקום ממוצע", live: true },
  { icon: "📱", name: "מקורות חברתיים", desc: "פייסבוק / טיקטוק / וואטסאפ — הפניות ושיתופים", live: false },
];
const linkA = { color: LINK, textDecoration: "none", borderBottom: `1px solid ${C.borderGold}` };

// שורות-מד אופקיות (הכל בזהב, צבע אחיד)
function BarRow({ items, labelKey, valueKey, hrefKey }) {
  const max = Math.max(...items.map(x => x[valueKey] || 0), 1);
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      {items.map((r, i) => {
        const label = r[labelKey] || "—";
        const href = hrefKey && r[hrefKey];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: "42%", fontFamily: F.body, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", textAlign: "right" }} title={label}>
              {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={linkA}>{label}</a> : <span style={{ color: C.goldLight }}>{label}</span>}
            </span>
            <div style={{ flex: 1, background: "rgba(8,5,2,0.5)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${Math.round((r[valueKey] || 0) / max * 100)}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.goldDark})`, height: 16, minWidth: 2 }} />
            </div>
            <span style={{ width: 60, textAlign: "left", color: C.goldBright, fontFamily: F.mono, fontSize: 12 }}>{(r[valueKey] || 0).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

// סקאלת גרף: מחזיר פונקציית-גובה (%) + ticks לציר-Y (לינארי או לוגריתמי)
function buildScale(maxV, scale) {
  const fmt = n => n >= 1000 ? +(n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(Math.round(n));
  if (scale === "log") {
    const top = Math.pow(10, Math.max(1, Math.ceil(Math.log10(Math.max(maxV, 1)))));
    const denom = Math.log10(top + 1);
    const ticks = [{ pct: 0, label: "0" }];
    for (let t = 1; t <= top; t *= 10) ticks.push({ pct: Math.log10(t + 1) / denom * 100, label: fmt(t) });
    return { h: v => v <= 0 ? 0 : Math.min(100, Math.log10(v + 1) / denom * 100), ticks };
  }
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(maxV, 1))));
  const f = maxV / p; const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const top = nf * p;
  const ticks = [0, .25, .5, .75, 1].map(fr => ({ pct: fr * 100, label: fmt(top * fr) }));
  return { h: v => Math.min(100, v / top * 100), ticks };
}

/// ===== פופולריות מדורים — visitor_events =====
const WINDOWS = [
  { label: "היום", days: 1 },
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "הכל", days: 0 },
];

// ===== HeatmapTab — מרכז מפות החום (עדשה אחת על העץ) =====
// שלוש מפות חום מעל אותם נתונים + סטטוס מפת החום ההתנהגותית (Microsoft Clarity).
//   1. חום מספרים  — gallery_images (דופק מציאות) + visitor_events (צפיות) → /number/:n
//   2. חום קלנדרי  — מתי הועלו רמזים (occurred_at) בסגנון GitHub
//   3. חום מדורים  — אילו אזורי-אתר נצפים הכי הרבה
function HeatmapTab() {
  const [hints, setHints] = useState([]);
  const [views, setViews] = useState({});
  const [sectionCounts, setSectionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);   // 🔄 רענון-ידני — טוען מחדש נתונים טריים

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [hintsData] = await Promise.all([getRealityHints(1000)]);
        // צפיות בדפי מספר + ספירת מדורים מתוך visitor_events (2000 אחרונות)
        let viewMap = {}, secMap = {};
        if (supabase) {
          const { data } = await supabase.from("visitor_events")
            .select("section, slug")
            .order("created_at", { ascending: false })
            .limit(2000);
          for (const r of data || []) {
            if (r.section) secMap[r.section] = (secMap[r.section] || 0) + 1;
            if (r.section === "number" && r.slug != null) {
              const n = Number(r.slug);
              if (Number.isFinite(n)) viewMap[n] = (viewMap[n] || 0) + 1;
            }
          }
        }
        if (!alive) return;
        setHints(hintsData || []);
        setViews(viewMap);
        setSectionCounts(secMap);
      } catch { /* noop */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [tick]);

  const numberHeat = useMemo(() => {
    const pulse = computePulse(hints);
    return computeNumberHeat(pulse.rows, views);
  }, [hints, views]);
  const sectionHeat = useMemo(() => computeSectionHeat(sectionCounts), [sectionCounts]);

  if (loading) return <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 14, textAlign: "center", padding: 30 }}>טוען מפות חום…</div>;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>מפות החום נטענות מחדש בכל כניסה — לחצו לרענון מיידי.</span>
        <button onClick={() => setTick(t => t + 1)} style={{ cursor: "pointer", border: `1px solid ${C.borderGold}`, background: "rgba(212,175,55,0.15)", color: C.goldBright, borderRadius: 999, padding: "7px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>🔄 רענן עכשיו</button>
      </div>
      {/* 1 — מפת חום התנהגותית (Microsoft Clarity) */}
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🖱 מפת חום התנהגותית — קליקים · גלילה · עכבר</div>
        {CLARITY_CONFIGURED ? (
          <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
            ✅ Microsoft Clarity מחובר ופעיל. מפות החום, הקלטות הסשנים ומפות הגלילה זמינות בלוח של Clarity (לא משתכפלות כאן — מקור אחד).
            <div style={{ marginTop: 8 }}>
              <a href="https://clarity.microsoft.com" target="_blank" rel="noreferrer" style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 700 }}>פתח את לוח Clarity →</a>
            </div>
          </div>
        ) : (
          <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
            ⚠️ הקוד מחובר אבל חסר מזהה. מפות החום ההתנהגותיות (קליקים/גלילה/עכבר) ייפתחו ברגע שיוגדר משתנה הסביבה.
            <ol style={{ margin: "8px 0 0", paddingInlineStart: 20, color: C.muted, fontSize: 13 }}>
              <li>היכנס ל-<a href="https://clarity.microsoft.com" target="_blank" rel="noreferrer" style={{ color: C.goldBright }}>clarity.microsoft.com</a> → New project → העתק את ה-Project ID.</li>
              <li>ב-Vercel → Settings → Environment Variables → הוסף <code style={{ color: C.goldBright }}>VITE_CLARITY_ID</code> עם ה-ID.</li>
              <li>Redeploy — והמפות ההתנהגותיות יתחילו להיאסף.</li>
            </ol>
          </div>
        )}
      </div>

      {/* 2 — מפת חום של נתונים: המספרים החמים → /number/:n */}
      <NumberHeatGrid rows={numberHeat} limit={60} />

      {/* 3 — מפת חום קלנדרית: מתי הועלו רמזים */}
      <CalendarHeatmap items={hints} days={364} title="🔥 מפת חום קלנדרית — רמזי המציאות לאורך זמן" />

      {/* 4 — מפת חום של מדורי האתר */}
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔥 מפת חום — אזורי האתר הנצפים ביותר</div>
        <div style={{ display: "grid", gap: 6 }}>
          {sectionHeat.map(r => (
            <div key={r.section} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 110, color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, textAlign: "left", flex: "0 0 auto" }}>{sectionLabel(r.section)}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 6, background: "rgba(212,175,55,0.06)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(3, r.heat * 100)}%`, height: "100%", background: heatColor(r.heat), borderRadius: 6 }} />
              </div>
              <span style={{ width: 48, color: C.goldDim, fontFamily: F.mono, fontSize: 12, textAlign: "right", flex: "0 0 auto" }}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const SECTION_LABELS = {
  home: "דף הבית", number: "מספרים", convergence: "התכנסויות",
  post: "פוסטים", "reality-stream": "זרם המציאות",
  "beit-midrash": "בית המדרש", timeline: "ציר הזמן",
  share: "שיתופים", app: "אפליקציה",
};

function PopularityTab() {
  const [win, setWin] = useState(7);
  const [sections, setSections] = useState([]);
  const [topNums, setTopNums] = useState([]);
  const [topImgs, setTopImgs] = useState([]);
  const [topWa, setTopWa] = useState([]);
  const [uniq, setUniq] = useState(null);
  const [appStats, setAppStats] = useState({ offers: 0, installs: 0, installsReal: 0, installsInferred: 0, launchers: 0, promptAccept: 0, promptDismiss: 0, byBrowser: [], byDevice: [], bySource: [], byDay: [] });
  const [pushStats, setPushStats] = useState({ offers: 0, accepts: 0, dismisses: 0, enabled: 0, denied: 0, byBrowser: [], byOs: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    import("../lib/supabase.js").then(({ supabase }) => {
      if (!supabase) return;
      setLoading(true);
      const since = win > 0
        ? new Date(Date.now() - win * 86400000).toISOString()
        : "2020-01-01T00:00:00Z";

      const agg = (arr, key) => {
        const cnt = {};
        arr.forEach(r => { const v = r[key]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
        return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
      };

      Promise.all([
        // כל הנתונים בשאילתה אחת (max 2000 שורות אחרונות)
        supabase.from("visitor_events")
          .select("section, slug, event_type, meta, visitor_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000)
          .then(({ data }) => {
            const rows = data || [];
            // sections
            const secCnt = {};
            rows.forEach(r => { const s = r.section; if (s) secCnt[s] = (secCnt[s] || 0) + 1; });
            setSections(Object.entries(secCnt).sort((a,b)=>b[1]-a[1]).map(([section,count])=>({section,count})));
            // top numbers
            const numRows = rows.filter(r => r.section === "number");
            setTopNums(agg(numRows, "slug").slice(0, 10));
            // top image clicks
            const imgCnt = {};
            rows.filter(r => r.event_type === "image_click").forEach(r => { const v = r.meta?.value; if (v) imgCnt[v] = (imgCnt[v] || 0) + 1; });
            setTopImgs(Object.entries(imgCnt).sort((a,b)=>b[1]-a[1]).slice(0, 10));
            // WhatsApp
            const waRows = rows.filter(r => r.event_type === "share" && r.meta?.platform === "whatsapp");
            setTopWa(agg(waRows, "slug").slice(0, 8));
            // גולשים ייחודיים
            setUniq(new Set(rows.map(r => r.visitor_id)).size);
          }).catch(() => {}),

        // 📲 משפך התקנת האפליקציה — שאילתה ייעודית לאירועי 'app' בלבד.
        // ⚠️ אסור לחשב את זה מתוך 2000 השורות האחרונות: אירועי התקנה נדירים,
        // וזרם הצפיות מבליע אותם → הספירה "מתאפסת". כאן שולפים ישירות את אירועי
        // האפליקציה (מעטים) ומחשבים משפך + פילוח יומי אמיתי.
        // 🔒 התקנות = מדד-חיים מצטבר: תמיד מתחילת-המדידה (כל הזמן), *ללא תלות בחלון שנבחר* —
        //    כך «כמה הורידו» לא מתאפס כשמחליפים ל-7/30 יום. (בקשת צוריאל 10.7.2026.)
        supabase.from("visitor_events")
          .select("event_type, meta, visitor_id, created_at")
          .eq("section", "app")
          .gte("created_at", "2020-01-01T00:00:00Z")
          .order("created_at", { ascending: false })
          .limit(10000)
          .then(({ data }) => {
            const appRows = data || [];
            const offers = new Set(appRows.filter(r => r.event_type === "offer").map(r => r.visitor_id)).size;
            const installRows = appRows.filter(r => r.event_type === "install");
            const installs = installRows.length;
            // התקנות אמיתיות (appinstalled) מול אומדן (פתיחה ראשונה ב-standalone, בעיקר iOS)
            const installsReal = installRows.filter(r => !r.meta?.inferred).length;
            const installsInferred = installRows.filter(r => r.meta?.inferred).length;
            const launchers = new Set(appRows.filter(r => r.event_type === "launch").map(r => r.visitor_id)).size;
            // כפתור ההתקנה המותאם — לחצו «התקן» מול ביטלו (accept/dismiss)
            const promptAccept = appRows.filter(r => r.event_type === "prompt_accept").length;
            const promptDismiss = appRows.filter(r => r.event_type === "prompt_dismiss").length;
            const breakdown = (key) => {
              const c = {};
              installRows.forEach(r => { const v = r.meta?.[key]; if (v) c[v] = (c[v] || 0) + 1; });
              return Object.entries(c).sort((a, b) => b[1] - a[1]);
            };
            // התקנות לפי יום (מהישן לחדש) — real מול inferred
            const dayCnt = {};
            installRows.forEach(r => {
              const d = (r.created_at || "").slice(0, 10); if (!d) return;
              const c = dayCnt[d] || (dayCnt[d] = { real: 0, inferred: 0 });
              if (r.meta?.inferred) c.inferred++; else c.real++;
            });
            const byDay = Object.entries(dayCnt).sort((a, b) => a[0] < b[0] ? -1 : 1)
              .map(([day, c]) => ({ day, ...c, total: c.real + c.inferred }));
            setAppStats({ offers, installs, installsReal, installsInferred, launchers, promptAccept, promptDismiss, byBrowser: breakdown("browser"), byDevice: breakdown("device"), bySource: breakdown("source"), byDay });
          }).catch(() => {}),

        // 🔔 משפך התראות פוש — שאילתה ייעודית ל-section='push' (אירועים נדירים, לא נחתכים).
        // offer=הבקשה הוצגה · prompt_accept=לחצו "כן" · enabled=נרשמו בפועל · denied=הדפדפן חסם · prompt_dismiss=דחו.
        supabase.from("visitor_events")
          .select("event_type, meta, visitor_id")
          .eq("section", "push")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10000)
          .then(({ data }) => {
            const rows = data || [];
            const n = (t) => rows.filter(r => r.event_type === t).length;
            const offers = new Set(rows.filter(r => r.event_type === "offer").map(r => r.visitor_id)).size;
            const enabledRows = rows.filter(r => r.event_type === "enabled");
            const bd = (key) => {
              const c = {}; enabledRows.forEach(r => { const v = r.meta?.[key]; if (v) c[v] = (c[v] || 0) + 1; });
              return Object.entries(c).sort((a, b) => b[1] - a[1]);
            };
            setPushStats({ offers, accepts: n("prompt_accept"), dismisses: n("prompt_dismiss"), enabled: enabledRows.length, denied: n("denied"), byBrowser: bd("browser"), byOs: bd("os") });
          }).catch(() => {}),
      ]).finally(() => setLoading(false));
    });
  }, [win]);

  const maxSec = sections.reduce((m, r) => Math.max(m, r.count || 0), 1);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* בורר חלון זמן */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {WINDOWS.map(w => (
          <button key={w.days} onClick={() => setWin(w.days)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
            padding: "6px 16px", borderRadius: 999,
            border: `1px solid ${win === w.days ? C.gold : C.border}`,
            background: win === w.days ? "rgba(212,175,55,0.15)" : "transparent",
            color: win === w.days ? C.goldBright : C.muted,
          }}>{w.label}</button>
        ))}
        {uniq != null && <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, marginRight: "auto", alignSelf: "center" }}>גולשים ייחודיים: <b style={{ color: C.goldBright }}>{uniq}</b></span>}
      </div>
      {loading && <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 14, textAlign: "center" }}>טוען…</div>}

      {/* משפך התקנת אפליקציה (PWA) */}
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📲 משפך התקנת האפליקציה</div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 14 }}>🔒 מצטבר מתחילת המדידה (כל הזמן) — לא מושפע מהחלון שנבחר למעלה.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
          {[
            { emoji: "👀", n: appStats.offers, label: "ראו הצעת התקנה" },
            { emoji: "📲", n: appStats.installs, label: `התקינו${appStats.installsInferred ? ` (${appStats.installsReal} ודאי · ${appStats.installsInferred} אומדן iOS)` : ""}` },
            { emoji: "👤", n: appStats.launchers, label: "חזרו להשתמש מהאפליקציה" },
            { emoji: "📈", n: appStats.offers ? Math.round((appStats.installs / appStats.offers) * 100) + "%" : "—", label: "יחס המרה (התקנה/הצעה)" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26 }}>{s.emoji}</div>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 24, fontWeight: 800 }}>{s.n}</div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* כפתור ההתקנה המותאם — accept/dismiss */}
        {(appStats.promptAccept > 0 || appStats.promptDismiss > 0) && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, textAlign: "center" }}>
            📲 כפתור ההתקנה: <b style={{ color: C.goldBright }}>{appStats.promptAccept}</b> לחצו «התקן» · <b style={{ color: C.goldLight }}>{appStats.promptDismiss}</b> ביטלו
            {appStats.promptAccept + appStats.promptDismiss > 0 && <> · המרה <b style={{ color: C.goldBright }}>{Math.round((appStats.promptAccept / (appStats.promptAccept + appStats.promptDismiss)) * 100)}%</b></>}
          </div>
        )}
        {/* פילוח התקנות לפי דפדפן / מכשיר / מקור */}
        {appStats.installs > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            {[
              { title: "דפדפן", data: appStats.byBrowser },
              { title: "מכשיר", data: appStats.byDevice },
              { title: "מקור", data: appStats.bySource },
            ].map(col => col.data.length > 0 && (
              <div key={col.title}>
                <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{col.title}</div>
                {col.data.map(([k, n]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>{k}</span>
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>{n}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {/* 📅 התקנות לפי יום — כל ההיסטוריה מההתחלה ועד היום, עם מונה מצטבר (רץ) */}
        {appStats.byDay.length > 0 && (() => {
          const maxDay = appStats.byDay.reduce((m, d) => Math.max(m, d.total), 1);
          let running = 0;
          const rows = appStats.byDay.map(d => { running += d.total; return { ...d, cum: running }; });
          const grand = running;
          return (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>📅 התקנות לפי יום — מההתחלה ועד היום</span>
                <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>סה״כ מצטבר: {grand}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 44px 58px", alignItems: "center", gap: 10, marginBottom: 4, color: C.goldDim, fontFamily: F.heading, fontSize: 10.5 }}>
                <span>תאריך</span><span /><span style={{ textAlign: "left" }}>ביום</span><span style={{ textAlign: "left" }}>מצטבר</span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {rows.map(d => (
                  <div key={d.day} style={{ display: "grid", gridTemplateColumns: "84px 1fr 44px 58px", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 11.5 }}>{new Date(d.day).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
                    <div style={{ background: C.bgGlow, borderRadius: 999, height: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.goldBright})`, width: `${Math.round((d.total / maxDay) * 100)}%`, borderRadius: 999, transition: "width .4s" }} />
                    </div>
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12, textAlign: "left" }} title={`${d.real} ודאי · ${d.inferred} אומדן`}>{d.total}</span>
                    <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 12, textAlign: "left", fontWeight: 700 }}>{d.cum}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 🔔 משפך התראות פוש — מכשיר שהיה עיוור: הצעה → אישור → נרשם בפועל */}
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔔 משפך התראות פוש</div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginBottom: 14 }}>
          מתחיל לאסוף מרגע העלייה · פוש עובד בכרום/אנדרואיד — ובאייפון רק באפליקציה מותקנת (iOS 16.4+)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
          {[
            { emoji: "👀", n: pushStats.offers, label: "ראו את הבקשה" },
            { emoji: "🔔", n: pushStats.enabled, label: "נרשמו לפוש בפועל" },
            { emoji: "🚫", n: pushStats.dismisses + pushStats.denied, label: "דחו / נחסמו" },
            { emoji: "📈", n: pushStats.offers ? Math.round((pushStats.enabled / pushStats.offers) * 100) + "%" : "—", label: "יחס המרה (נרשמו/ראו)" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26 }}>{s.emoji}</div>
              <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 24, fontWeight: 800 }}>{s.n}</div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* פילוח הנרשמים לפי דפדפן / מערכת-הפעלה */}
        {pushStats.enabled > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            {[
              { title: "דפדפן", data: pushStats.byBrowser },
              { title: "מערכת", data: pushStats.byOs },
            ].map(col => col.data.length > 0 && (
              <div key={col.title}>
                <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{col.title}</div>
                {col.data.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>{k}</span>
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP מדורים — bar chart */}
      {sections.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 מדורים פופולריים</div>
          <div style={{ display: "grid", gap: 8 }}>
            {sections.map(r => (
              <div key={r.section} style={{ display: "grid", gridTemplateColumns: "110px 1fr 40px", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5 }}>{SECTION_LABELS[r.section] || r.section}</span>
                <div style={{ background: C.bgGlow, borderRadius: 999, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.goldBright})`, width: `${Math.round((r.count / maxSec) * 100)}%`, borderRadius: 999, transition: "width .4s" }} />
                </div>
                <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12, textAlign: "left" }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {/* TOP מספרים */}
        {topNums.length > 0 && (
          <div style={{ ...card }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔢 מספרים חמים</div>
            {topNums.map(([slug, cnt]) => (
              <div key={slug} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <a href={`/number/${slug}`} style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 13, textDecoration: "none" }}>{slug}</a>
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{cnt}</span>
              </div>
            ))}
          </div>
        )}

        {/* TOP תמונות שנלחצו */}
        {topImgs.length > 0 && (
          <div style={{ ...card }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🖼 תמונות בזרם (לחיצות)</div>
            {topImgs.map(([val, cnt]) => (
              <div key={val} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5 }}>ערך {val}</span>
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{cnt}</span>
              </div>
            ))}
          </div>
        )}

        {/* TOP וואצאפ */}
        {topWa.length > 0 && (
          <div style={{ ...card }}>
            <div style={{ color: "#1faa55", fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💬 שיתופי וואצאפ</div>
            {topWa.map(([slug, cnt]) => (
              <div key={slug} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <a href={`/${slug}`} style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, textDecoration: "none" }}>{slug}</a>
                <span style={{ color: "#1faa55", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{cnt} 💬</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 💰 מרכז עלות AI — כל מדדי-העלות במקום אחד =====
//   מקור עלות אמיתי: ai_token_log (usage מ-Anthropic) → total · לפי מקור · לפי מודל · לפי סוג · מגמה יומית.
//   פעילות בוט וואטסאפ: wa_bot_log → כמות הודעות + תגובות-AI לכל קבוצה/צ׳אט.
//   🌳 עץ אחד: המקור היחיד לעלות הוא ai_token_log; כאן רק עדשה מאוחדת עליו (מפנה, לא משכפל).
const AI_SRC = { journey: "🧭 מסע (מרכז מחקר)", analyze: "🧠 ניתוח כלים", "wa-chat": "💬 שיחת וואטסאפ", router: "🔬 ניתוב מחקר", "gallery-ocr": "🔤 OCR גלריה" };
const AI_KIND = { deep: "ניתוח עומק", msg: "הודעת-מסע", notarikon: "ראשי/סופי תיבות", number: "דף מספר", research: "מרכז מחקר", converse: "שיחה חופשית", verse: "פסוק", compare: "השוואה" };
// שמות ידידותיים לערוצי וואטסאפ הידועים (לא חושפים מזהה-גולמי מיותר)
const WA_NAMES = {
  "120363409557354268@g.us": "סוד 1820 · הקבוצה הראשית",
  "120363397037220315@g.us": "תורת הרמז",
  "120363428363475524@g.us": "ערוץ נוסף",
};
const waLabel = (id = "") => WA_NAMES[id] || (id.endsWith("@g.us") ? "קבוצה ···" + id.replace("@g.us", "").slice(-4) : id.replace("@c.us", "").replace(/^972/, "0"));
const fmtTok = n => { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); };
const usd = n => "$" + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = n => "$" + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// 🎯 טאב המרות — משפך המחקר: אנונימי → רשום → משתמש-מחקר. RPC admin_conversion_funnel (אדמין).
function ConversionsTab() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    import("../lib/supabase.js").then(({ supabase }) =>
      supabase.rpc("admin_conversion_funnel").then(({ data }) => { if (alive) { setD(data || null); setLoading(false); } })
    ).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  if (loading) return <div style={{ color: C.muted, fontFamily: F.body, padding: 30, textAlign: "center" }}>טוען…</div>;
  if (!d || d.error) return <div style={{ color: "#d98a92", fontFamily: F.body, padding: 30, textAlign: "center" }}>אין הרשאה / שגיאה בטעינת המדדים.</div>;
  const engaged = d.registered ? Math.round(100 * (d.saved_research || 0) / d.registered) : 0;
  const convRate = d.leads ? Math.round(100 * (d.leads_converted || 0) / d.leads) : 0;
  const Tile = ({ label, value, sub, accent }) => (
    <div style={{ background: C.surface, border: `1px solid ${accent ? C.borderGold : C.border}`, borderRadius: 14, padding: "16px 18px", minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ color: accent ? C.goldBright : "#ede4d3", fontFamily: F.mono, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, marginTop: 5 }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ direction: "rtl" }}>
      <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, fontWeight: 800, margin: "4px 0 4px" }}>🎯 משפך ההמרות</h3>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>אנונימי → רשום → משתמש-מחקר. ככל שיותר נרשמים משתמשים במחקר — הפיצ׳ר דביק והמינוף גבוה.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <Tile label="👥 משתמשים רשומים" value={d.registered ?? 0} sub={`${d.registered_30d ?? 0} ב-30 יום`} accent />
        <Tile label="🧠 שמרו מחקר בענן" value={d.saved_research ?? 0} sub={`${engaged}% מהרשומים — דביקות`} accent />
        <Tile label="✉️ מנויי מייל" value={d.subscribers ?? 0} />
        <Tile label="🎯 לידי-מחקר" value={d.leads ?? 0} sub={`${d.leads_7d ?? 0} ב-7 יום`} />
        <Tile label="✅ לידים שהומרו" value={d.leads_converted ?? 0} sub={`${convRate}% המרה · ${d.converted_7d ?? 0} ב-7 יום`} />
      </div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.7, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 15px" }}>
        💡 «שמרו מחקר» = משתמשים שהמחקר שלהם סונכרן לענן (המדד הכי-חשוב לדביקות). «לידי-מחקר» = מי שהשאיר מייל אחרי ניתוח-על (למשפך הטיפוח, כשהניוזלטר יופעל).
      </div>
    </div>
  );
}

function AiCostTab() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true; setLoading(true);
    getAiCostMetrics(days).then(x => { if (live) { setD(x || null); setLoading(false); } }).catch(() => live && setLoading(false));
    return () => { live = false; };
  }, [days]);

  const t = d?.total || {};
  const bySource = d?.by_source || [];
  const byModel = d?.by_model || [];
  const byKind = d?.by_kind || [];
  const byDay = d?.by_day || [];
  const wa = d?.wa || {};
  const waChats = wa.chats || [];
  const dayMaxCost = Math.max(...byDay.map(x => Number(x.cost_usd) || 0), 0.0001);
  const srcMaxCost = Math.max(...bySource.map(x => Number(x.cost_usd) || 0), 0.0001);
  const waMax = Math.max(...waChats.map(g => Number(g.msgs) || 0), 1);
  const chatName = c => c.kind === "group" ? waLabel(c.chat_id) : (c.name && c.name.trim() ? c.name : waLabel(c.chat_id));

  const Kpi = ({ v, lbl, big }) => (
    <div style={{ flex: "1 1 130px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px", background: "rgba(8,5,2,0.4)" }}>
      <div style={{ color: big ? "#7fd18a" : C.goldBright, fontFamily: F.mono, fontSize: big ? 27 : 22, fontWeight: 800 }}>{v}</div>
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* כותרת + טווח */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, margin: "0 0 3px" }}>💰 מרכז עלות ה-AI</h2>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5 }}>כל עלויות ה-AI במקום אחד — נמדד מהשימוש האמיתי (Anthropic usage). haiku $1/$5 · sonnet $3/$15 · opus $15/$75 ל-1M טוקן.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[[7, "שבוע"], [30, "חודש"], [90, "3 חודשים"]].map(([n, lbl]) => (
            <button key={n} onClick={() => setDays(n)} style={{ cursor: "pointer", border: `1px solid ${days === n ? C.gold : C.border}`, background: days === n ? "rgba(212,175,55,0.18)" : "transparent", color: days === n ? C.goldBright : C.muted, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{lbl}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ ...card, color: C.muted, textAlign: "center", padding: 30 }}>טוען מדדים…</div> : !Number(t.calls) ? (
        <div style={{ ...card, color: C.muted, fontFamily: F.body, fontSize: 14, textAlign: "center", padding: 30 }}>עדיין אין קריאות-AI מתועדות בטווח הזה.</div>
      ) : (
        <>
          {/* KPI ראשי */}
          <div style={card}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Kpi big v={usd(t.cost_usd)} lbl="💰 עלות כוללת (הערכה)" />
              <Kpi v={fmtTok(t.total_tokens)} lbl="🪙 סה״כ טוקנים" />
              <Kpi v={fmtTok(t.input_tokens)} lbl="⬆️ קלט" />
              <Kpi v={fmtTok(t.output_tokens)} lbl="⬇️ פלט" />
              <Kpi v={Number(t.calls || 0).toLocaleString("he")} lbl="🤖 קריאות AI" />
            </div>
          </div>

          {/* עלות לפי מקור */}
          <div style={card}>
            <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, margin: "0 0 4px" }}>🗂️ עלות לפי מקור</h3>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>מהיכן מגיעה ההוצאה — מסע / ניתוח-כלים / שיחת-וואטסאפ.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {bySource.map((s, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", background: "rgba(8,5,2,0.3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 120 }}>{AI_SRC[s.source] || s.source}</span>
                    <span style={{ color: "#7fd18a", fontFamily: F.mono, fontSize: 14, fontWeight: 800 }}>{usd4(s.cost_usd)}</span>
                    <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>{fmtTok(s.total_tokens)}</span>
                    <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11 }}>· {Number(s.calls).toLocaleString("he")} קר׳</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(212,175,55,0.12)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((Number(s.cost_usd) / srcMaxCost) * 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7fd18a,#d4af37)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* מגמה יומית + לפי מודל */}
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
            <div style={card}>
              <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, margin: "0 0 12px" }}>📈 מגמה יומית</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120, marginBottom: 8 }}>
                {byDay.map((x, i) => (
                  <div key={i} title={`${x.day}: ${usd4(x.cost_usd)} · ${x.calls} קר׳`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <div style={{ width: "100%", maxWidth: 34, height: Math.max(4, Math.round((Number(x.cost_usd) / dayMaxCost) * 96)), borderRadius: "5px 5px 0 0", background: "linear-gradient(180deg,#d4af37,#7fd18a)" }} />
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 9.5, whiteSpace: "nowrap" }}>{x.day.slice(5)}</span>
                  </div>
                ))}
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, textAlign: "center" }}>גובה = עלות $ ליום</div>
            </div>

            <div style={card}>
              <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, margin: "0 0 12px" }}>🤖 עלות לפי מודל</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>מודל</th><th style={th}>עלות</th><th style={th}>טוקנים</th><th style={th}>קריאות</th></tr></thead>
                  <tbody>
                    {byModel.map((m, i) => (
                      <tr key={i}>
                        <td style={{ ...td, color: C.goldBright, fontWeight: 700, fontFamily: F.mono, fontSize: 12.5 }}>{m.model}</td>
                        <td style={{ ...td, color: "#7fd18a", fontFamily: F.mono }}>{usd4(m.cost_usd)}</td>
                        <td style={td}>{fmtTok(m.total_tokens)}</td>
                        <td style={td}>{Number(m.calls).toLocaleString("he")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* לפי סוג-פעולה */}
          <div style={card}>
            <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, margin: "0 0 4px" }}>🔎 עלות לפי סוג-פעולה</h3>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>פירוט מדויק — איזו פעולת-AI ספציפית צרכה הכי הרבה.</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>מקור</th><th style={th}>פעולה</th><th style={th}>עלות</th><th style={th}>טוקנים</th><th style={th}>קריאות</th></tr></thead>
                <tbody>
                  {byKind.map((k, i) => (
                    <tr key={i}>
                      <td style={{ ...td, color: C.goldLight }}>{AI_SRC[k.source] || k.source}</td>
                      <td style={{ ...td, color: C.goldBright, fontWeight: 700 }}>{AI_KIND[k.kind] || k.kind}</td>
                      <td style={{ ...td, color: "#7fd18a", fontFamily: F.mono }}>{usd4(k.cost_usd)}</td>
                      <td style={td}>{fmtTok(k.total_tokens)}</td>
                      <td style={td}>{Number(k.calls).toLocaleString("he")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📱 פעילות + עלות לפי משתמש/קבוצה — כל מי שהבוט דיבר איתו, למעקב וניהול */}
          <div style={card}>
            <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, margin: "0 0 4px" }}>💬 עלות ופעילות לפי משתמש / קבוצה</h3>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>כל מי שהבוט («רזיאל») דיבר איתו — קבוצות ומשתמשים פרטיים. כמות הודעות · תגובות-AI · עלות $ בפועל. רוב התגובות = מנוע-גימטריה → עלות אפס; רק שיחת-AI («רזיאל») עולה טוקנים.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <Kpi v={Number(wa.total_msgs || 0).toLocaleString("he")} lbl="💬 סה״כ הודעות שטופלו" />
              <Kpi v={Number(wa.ai_msgs || 0).toLocaleString("he")} lbl="🤖 תגובות-AI (בתשלום)" />
              <Kpi big v={usd4(wa.ai_cost_usd)} lbl="💰 עלות שיחות-AI" />
              <Kpi v={waChats.length.toLocaleString("he")} lbl="👥 משתמשים/קבוצות" />
            </div>
            {waChats.length === 0 ? <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>אין פעילות-בוט בטווח.</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>משתמש / קבוצה</th><th style={th}>סוג</th><th style={th}>הודעות</th><th style={th}>תגובות-AI</th><th style={th}>עלות</th><th style={th}>אחרון</th></tr></thead>
                  <tbody>
                    {waChats.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...td, color: C.goldBright, fontWeight: 700 }}>
                          <span style={{ marginInlineEnd: 6 }}>{c.kind === "group" ? "👥" : "👤"}</span>{chatName(c)}
                          <div style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 10, marginTop: 2, direction: "ltr", textAlign: "right" }}>{c.kind === "private" ? String(c.chat_id).replace("@c.us", "").replace(/^972/, "0") : String(c.chat_id).slice(-8)}</div>
                        </td>
                        <td style={{ ...td, color: C.goldDim, fontSize: 12 }}>{c.kind === "group" ? "קבוצה" : "פרטי"}</td>
                        <td style={{ ...td, color: C.goldBright, fontFamily: F.mono, fontWeight: 700 }}>{Number(c.msgs).toLocaleString("he")}</td>
                        <td style={td}>{Number(c.ai_msgs) > 0 ? <span style={{ color: "#7fd18a", fontFamily: F.mono, fontWeight: 700 }}>🤖 {c.ai_msgs}</span> : <span style={{ color: C.muted }}>—</span>}</td>
                        <td style={{ ...td, color: Number(c.cost_usd) > 0 ? "#7fd18a" : C.muted, fontFamily: F.mono }}>{Number(c.cost_usd) > 0 ? usd4(c.cost_usd) : "$0"}</td>
                        <td style={{ ...td, color: C.goldDim, fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtDate(c.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>💡 עלות-שיחה נמדדת מעכשיו לכל צ׳אט (מהעדכון הזה) — תתמלא ככל שהבוט משוחח. שיחות-AI קודמות נספרו בלי ייחוס-משתמש.</div>
          </div>

          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, textAlign: "center", fontStyle: "italic" }}>
            💡 עלות ה-AI מבוססת על צריכת-הטוקנים האמיתית שמדווחת מ-Anthropic. הבוט האוטונומי (מנוע-גימטריה) לא צורך טוקנים כלל — רק שיחות-AI («רזיאל») ופעולות-ניתוח נספרות כאן.
          </div>
        </>
      )}
    </div>
  );
}

// ===== 🧭 דשבורד המסעות — זמן/צפיות לכל דף-וכלי + מסע-לכל-מבקר =====
function fmtDwell(s) {
  if (s == null) return "—";
  if (s < 60) return `${s}ש׳`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} דק׳`;
}
// 🧪 ניסויי-מסע (A/B) — שני ממדים: עדשת-כניסה (reality/kingdom) + תוכן (full/classic).
// מדד ראשי = מעבר-לצעד-2. נתונים מסוננים-בוטים ב-RPC. מחליף את «מסעות» כברירת-המחדל של הקבוצה.
const JEXP_META = {
  lens: {
    title: "🎭 עדשת הכניסה — קוד המציאות מול כי לה׳ המלוכה",
    note: "אותו מסע, מסך-כניסה שונה (מיתוג + צבע). מה גורם ליותר אנשים לצעוד פנימה?",
    variants: { reality: "🔮 קוד המציאות", kingdom: "👑 כי לה׳ המלוכה" },
    colors: { reality: "#8ea2ff", kingdom: "#e8c840" },
  },
  kind: {
    title: "✍️ תוכן המסע — מלא מול קלאסי (ניסיוני)",
    note: "מלא = כל המערכי-גימטריה וכל העולמות (כולל גאולה). קלאסי = רק מילים שה-AI יצר, בעולמות קלאסי+קדושה, בלי משיחי/מודרני.",
    variants: { full: "🧮 מלא · כל המערכי-גימטריה", classic: "📜 קלאסי · עולמות קלאסי+קדושה" },
    colors: { full: "#d4af37", classic: "#7fd18a" },
  },
};

// 🔁 Retention — חוזרים מול חדשים + דביקות רשומים + קוהורטות.
function RetentionTab() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { let live = true; getRetention(30).then(x => live && setD(x || {})).catch(e => live && setErr(String(e?.message || e))); return () => { live = false; }; }, []);
  const num = n => Number(n || 0).toLocaleString("he");
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  if (!d) return err ? <Empty>שגיאה: {err}</Empty> : <Loading />;
  const ret7 = pct(d.reg_retained_7d, d.reg_eligible_7d);
  const rd = d.returning_daily || [];
  const rmax = Math.max(...rd.map(x => (Number(x.new) || 0) + (Number(x.ret) || 0)), 1);
  const cohorts = d.cohorts || [];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: "0 0 4px" }}>🔁 Retention — האם חוזרים</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14 }}>המדד המרכזי: מתוך הרשומים לפני 7+ ימים — כמה חזרו בשבוע האחרון. זה מנבא צמיחה לטווח ארוך.</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ flex: "1 1 200px", border: `1px solid ${ret7 >= 40 ? "#7fd18a" : ret7 >= 20 ? "#e8c860" : "#e0796f"}`, borderRadius: 14, padding: "16px 18px", background: "rgba(127,209,138,0.06)" }}>
            <div style={{ color: ret7 >= 40 ? "#7fd18a" : ret7 >= 20 ? "#e8c860" : "#e0796f", fontFamily: F.mono, fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{ret7}%</div>
            <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginTop: 4 }}>שימור 7 ימים</div>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 }}>{num(d.reg_retained_7d)} מתוך {num(d.reg_eligible_7d)} רשומים ותיקים חזרו {ret7 >= 40 ? "· מצוין 🎉" : ""}</div>
          </div>
          {[["🟢 פעילים היום", d.reg_active_1d], ["📅 פעילים השבוע", d.reg_active_7d], ["📆 פעילים החודש", d.reg_active_30d], ["👥 סה״כ רשומים", d.reg_total]].map(([lbl, v]) => (
            <div key={lbl} style={{ flex: "1 1 120px", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", background: "rgba(8,5,2,0.35)" }}>
              <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 28, fontWeight: 800 }}>{num(v)}</div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginTop: 4 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {rd.length > 0 && (
        <div style={card}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, margin: "0 0 4px" }}>חוזרים מול חדשים · יומי</h3>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>🟩 חוזר = מבקר שכבר היה כאן ביום קודם · 🟨 חדש = ביקור ראשון. ככל שהירוק גדל — הבסיס נאמן יותר.</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 130, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {rd.map((x, i) => {
              const nw = Number(x.new) || 0, rt = Number(x.ret) || 0, tot = nw + rt;
              const h = Math.round((tot / rmax) * 122);
              return (
                <div key={i} title={`${x.d}: ${num(rt)} חוזרים · ${num(nw)} חדשים`} style={{ flex: "1 0 7px", minWidth: 7, height: Math.max(2, h), display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
                  <div style={{ height: `${tot ? (nw / tot) * 100 : 0}%`, background: "#d4af37" }} />
                  <div style={{ height: `${tot ? (rt / tot) * 100 : 0}%`, background: "#7fd18a" }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.goldDim, fontFamily: F.mono, fontSize: 10.5, marginTop: 4 }}>
            <span>{rd[0]?.d}</span><span>{rd[rd.length - 1]?.d}</span>
          </div>
        </div>
      )}

      {cohorts.length > 0 && (
        <div style={card}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, margin: "0 0 4px" }}>קוהורטות — לפי שבוע הרשמה</h3>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>לכל קבוצת נרשמים (לפי שבוע) — כמה מהם עדיין פעילים בשבוע האחרון. אחוז גבוה = המוצר «נדבק».</div>
          <div style={{ display: "grid", gap: 7 }}>
            {cohorts.map((c, i) => {
              const p = pct(c.active, c.size);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 12.5, minWidth: 52 }}>{c.week}</span>
                  <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, minWidth: 70 }}>{num(c.active)}/{num(c.size)} חוזרים</span>
                  <div style={{ flex: 1, height: 16, background: "rgba(212,175,55,0.1)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${p}%`, height: "100%", borderRadius: 6, background: p >= 50 ? "linear-gradient(90deg,#7fd18a,#d4af37)" : "linear-gradient(90deg,#d4af37,#8a6d18)" }} />
                  </div>
                  <span style={{ color: p >= 50 ? "#7fd18a" : C.goldBright, fontFamily: F.mono, fontSize: 13, fontWeight: 800, minWidth: 42, textAlign: "left" }}>{p}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 👤 משתמשים — רשימת רשומים + «מסע» מפורט לכל יוזר (נוכחות, ימים, פעילות).
function pill(c) { return { border: `1px solid ${c}`, borderRadius: 999, padding: "3px 10px", background: "rgba(8,5,2,0.4)", color: C.goldLight, fontFamily: F.body, fontSize: 11.5, whiteSpace: "nowrap" }; }
function timeAgoTs(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "עכשיו";
  if (s < 3600) return `לפני ${Math.floor(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.floor(s / 3600)} שע׳`;
  return `לפני ${Math.floor(s / 86400)} ימים`;
}
const UA_KIND = { visit: "👁 ביקור", gematria: "🧮 גימטריה", post: "📄 פוסט" };
function UsersTab() {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const [j, setJ] = useState(null);
  const [lj, setLj] = useState(false);
  useEffect(() => {
    let live = true;
    getUsersOverview().then(x => live && setUsers(Array.isArray(x) ? x : [])).catch(e => live && setErr(String(e?.message || e)));
    return () => { live = false; };
  }, []);
  const open = (email) => { setSel(email); setJ(null); setLj(true); getUserJourney(email).then(setJ).catch(() => setJ({ error: "err" })).finally(() => setLj(false)); };
  const num = n => Number(n || 0).toLocaleString("he");

  if (sel) {
    const absent = j ? Math.max(0, (j.days_since_register || 0) - (j.active_days || 0)) : 0;
    const daily = (j && j.daily) || [];
    const dmax = Math.max(...daily.map(x => Number(x.n) || 0), 1);
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <button onClick={() => setSel(null)} style={{ ...segBtn(false), alignSelf: "flex-start" }}>← חזרה לרשימת המשתמשים</button>
        {lj || !j ? <Loading /> : j.error ? <Empty>לא נמצא</Empty> : (
          <>
            <div style={card}>
              <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: "0 0 4px", direction: "ltr", textAlign: "right" }}>📧 {j.email}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                {j.role === "admin" && <span style={{ ...pill("#e0796f") }}>👑 מנהל</span>}
                {j.vip && <span style={{ ...pill("#e0c860") }}>✨ בני היכל</span>}
                <span style={{ ...pill(C.gold) }}>{j.tier || "free"}</span>
                {j.building && <span style={{ ...pill(C.border) }}>🏛️ {j.building}</span>}
                <span style={{ ...pill(C.border) }}>נרשם {j.registered ? new Date(j.registered).toLocaleDateString("he-IL") : "—"}</span>
                <span style={{ ...pill(C.border) }}>התחברות אחרונה {timeAgoTs(j.last_sign_in)}</span>
                {j.phone && <a href={"https://wa.me/" + String(j.phone).replace(/\D/g, "")} target="_blank" rel="noreferrer" style={{ ...pill("#25d366"), color: "#25d366", textDecoration: "none", fontWeight: 700 }}>💬 וואטסאפ</a>}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[["📅 ימים פעילים", num(j.active_days), "#7fd18a"], ["🕳️ ימי היעדרות", num(absent), "#8a7a4a"], ["📆 ימים מאז הרשמה", num(j.days_since_register), C.goldBright], ["⚡ סה״כ פעולות", num(j.total_activities), C.goldBright], ["💰 עלות AI", "$" + Number(j.ai?.cost_usd || 0).toFixed(3), C.gold], ["🤖 קריאות AI", num(j.ai?.calls), C.goldLight], ["👁 נראה לאחרונה", timeAgoTs(j.last_seen), C.goldLight]].map(([lbl, v, col]) => (
                  <div key={lbl} style={{ flex: "1 1 130px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
                    <div style={{ color: col, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{v}</div>
                    <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            {daily.length > 0 && (
              <div style={card}>
                <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, margin: "0 0 10px" }}>📈 נוכחות יומית (פעולות ליום)</h3>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
                  {daily.map((x, i) => (
                    <div key={i} title={`${x.d}: ${num(x.n)} פעולות (👁${x.visits} 🧮${x.gem} 📄${x.posts})`} style={{ flex: "1 0 8px", minWidth: 8, height: Math.max(3, Math.round((Number(x.n) / dmax) * 112)), borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#f0d878,#8a6d18)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: C.goldDim, fontFamily: F.mono, fontSize: 10.5, marginTop: 4 }}>
                  <span>{daily[0]?.d}</span><span>{daily[daily.length - 1]?.d}</span>
                </div>
              </div>
            )}
            {(j.searches || []).length > 0 && (
              <div style={card}>
                <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, margin: "0 0 10px" }}>🔍 מה הוא מחפש (הכי הרבה)</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {j.searches.map((s, i) => (
                    <span key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 12px", background: "rgba(8,5,2,0.4)", color: C.goldLight, fontFamily: F.body, fontSize: 13 }} dir="rtl">🧮 {s.term} <b style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 11 }}>×{s.n}</b></span>
                  ))}
                </div>
              </div>
            )}
            <div style={card}>
              <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, margin: "0 0 10px" }}>🧭 מסע הפעולות (50 אחרונות)</h3>
              <div style={{ display: "grid", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {(j.recent || []).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 11px", background: "rgba(8,5,2,0.3)" }}>
                    <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.goldLight, minWidth: 90 }}>{UA_KIND[r.kind] || r.kind}</span>
                    <span dir="rtl" style={{ flex: 1, color: C.goldDim, fontFamily: F.body, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title || r.ref || ""}</span>
                    <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 10.5 }}>{timeAgoTs(r.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: 0 }}>👤 משתמשים רשומים {users ? `· ${users.length}` : ""}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginTop: 4 }}>לחצו על משתמש לפתיחת «מסע» מלא — נוכחות, ימים פעילים/חסרים, וכל הפעולות. 🟢 = באתר עכשיו.</div>
        {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>שגיאה: {err}</div>}
      </div>
      {!users ? <Loading /> : users.length === 0 ? <Empty>אין משתמשים רשומים.</Empty> : (
        <div style={{ display: "grid", gap: 8 }}>
          {users.map((u, i) => (
            <button key={i} onClick={() => open(u.email)} style={{ cursor: "pointer", textAlign: "right", border: `1px solid ${u.online ? "rgba(95,224,138,0.5)" : C.border}`, borderRadius: 12, padding: "11px 14px", background: "rgba(8,5,2,0.4)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: u.online ? "#5fe08a" : "#4a4436", boxShadow: u.online ? "0 0 7px #5fe08a" : "none", flex: "0 0 auto" }} />
              <span style={{ flex: 1, minWidth: 150, color: C.goldLight, fontFamily: F.body, fontSize: 13, fontWeight: 700, direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}{u.role === "admin" ? " 👑" : ""}{u.vip ? " ✨" : ""}</span>
              <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5 }}>⚡ {num(u.activities)}</span>
              <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5 }}>📅 {num(u.active_days)}י׳</span>
              <span style={{ color: Number(u.ai_cost) > 0 ? "#7fd18a" : C.muted, fontFamily: F.mono, fontSize: 11.5 }}>💰${Number(u.ai_cost || 0).toFixed(2)}</span>
              <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11, minWidth: 74, textAlign: "left" }}>{timeAgoTs(u.last_seen)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 💬 אישור תגובות — תור התרומות הממתינות (כולל אנונימיות). אישור → פומבי · הסתרה → נדחה.
const CONTRIB_FILTERS = [["pending", "⏳ ממתינות"], ["approved", "✅ אושרו"], ["hidden", "🔒 מוסתרות"], ["all", "הכל"]];
function ContribModTab() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState("pending");
  const load = (st = status) => { setRows(null); getAllContributions(st, 200).then(r => setRows(Array.isArray(r) ? r : [])).catch(() => setRows([])); };
  useEffect(() => { load(status); /* eslint-disable-next-line */ }, [status]);
  const approve = async (id) => { setBusy(id); try { await approveContribution(id); load(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(null); } };
  const hide = async (id) => { setBusy(id); try { await moderateContribution(id, "hidden"); load(); } catch (e) { alert("שגיאה: " + (e.message || e)); } finally { setBusy(null); } };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: 0 }}>💬 מרכז התגובות {rows ? `· ${rows.length}` : ""}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
          כל התגובות והתרומות מכל האתר — מספרים, פוסטים, כותבים, צ'אט — במקום אחד. כולל <b style={{ color: C.goldLight }}>תגובות אורחים</b> (מוגבל 5/שעה). אישור → פומבי · הסתרה → נדחה.
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}>
          {CONTRIB_FILTERS.map(([k, lbl]) => (
            <button key={k} onClick={() => setStatus(k)} style={segBtn(status === k)}>{lbl}</button>
          ))}
        </div>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty>אין תגובות בקטגוריה זו.</Empty> : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map(r => {
            const im = intentMeta(r.intent);
            return (
              <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.4)", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ ...pill(C.gold) }}>{im.emoji} {im.label}</span>
                  <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, fontWeight: 700 }} dir="rtl">✍️ {r.author_name || "אורח"}{!r.author_user_id && <span style={{ color: C.goldDim, fontWeight: 400 }}> · אורח</span>}</span>
                  {r.target_id && <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 11.5 }}>{r.target_type === "number" ? "🔢" : "🔖"} {r.target_id}</span>}
                  <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11, marginInlineStart: "auto" }}>{timeAgoTs(r.created_at)}</span>
                </div>
                {r.title && <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }} dir="rtl">{r.title}</div>}
                <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }} dir="rtl">{r.body}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {r.status !== "approved" && <button disabled={busy === r.id} onClick={() => approve(r.id)} style={{ ...segBtn(true) }}>{busy === r.id ? "…" : r.status === "hidden" ? "↩️ שחזר" : "✅ אשר"}</button>}
                  {r.status !== "hidden" && <button disabled={busy === r.id} onClick={() => hide(r.id)} style={{ ...segBtn(false), color: "#e0796f" }}>✖ הסתר</button>}
                  <span style={{ marginInlineStart: "auto", fontFamily: F.mono, fontSize: 10.5, color: r.status === "approved" ? "#7fd18a" : r.status === "hidden" ? "#8a7a4a" : C.gold }}>
                    {r.status === "approved" ? "✓ פומבי" : r.status === "hidden" ? "🔒 מוסתר" : "⏳ ממתין"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 🟢 חיבור וואטסאפ ↔ חשבון — כלי אדמין. האמון של צוריאל = עוגן-האימות (בלי OTP למי שהוא מכיר).
// מסלול OTP (המשתמש מחבר את עצמו) חי במקביל בדף-המשתמש. כאן: המספרים שכבר יש לנו + קישור ידני.
function WaCandidateRow({ c, onLink, onUnlink }) {
  const [email, setEmail] = useState(c.suggested_email || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const num = n => Number(n || 0).toLocaleString("he");
  const link = async () => {
    if (!email.trim() || busy) return;
    setBusy(true); setMsg("");
    const r = await onLink(c.phone, email.trim());
    setBusy(false);
    if (!r.ok) setMsg(r.error === "no_user" ? "אין משתמש רשום עם המייל הזה" : r.error === "bad_phone" ? "מספר לא תקין" : "שגיאה: " + (r.error || ""));
  };
  const unlink = async () => { if (busy) return; setBusy(true); await onUnlink(c.phone); setBusy(false); };
  const linked = !!c.linked_email;
  return (
    <div style={{ border: `1px solid ${linked ? "rgba(95,224,138,0.45)" : C.border}`, borderRadius: 12, padding: "11px 14px", background: "rgba(8,5,2,0.4)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16 }}>🟢</span>
        <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5, fontWeight: 700, minWidth: 120 }} dir="rtl">{c.name || "—"}</span>
        <a href={"https://wa.me/" + String(c.phone).replace(/\D/g, "")} target="_blank" rel="noreferrer" style={{ color: "#25d366", fontFamily: F.mono, fontSize: 12.5, textDecoration: "none", direction: "ltr" }}>+{c.phone}</a>
        <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5 }}>⚡ {num(c.events)}</span>
        <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11, marginInlineStart: "auto" }}>{timeAgoTs(c.last_seen)}</span>
      </div>
      {linked ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...pill("#5fe08a"), color: "#5fe08a" }}>✓ מקושר</span>
          <span style={{ color: C.goldLight, fontFamily: F.body, fontSize: 12.5, direction: "ltr" }}>{c.linked_email}</span>
          <button onClick={unlink} disabled={busy} style={{ ...segBtn(false), marginInlineStart: "auto", color: "#e0796f", borderColor: "rgba(224,121,111,0.4)" }}>{busy ? "…" : "🔗 נתק"}</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="מייל של משתמש רשום"
            dir="ltr" style={{ flex: "1 1 200px", background: "rgba(8,5,2,0.6)", border: `1px solid ${c.suggested_email ? "rgba(240,216,120,0.5)" : C.border}`, borderRadius: 9, padding: "9px 11px", color: C.goldLight, fontFamily: F.body, fontSize: 13 }} />
          {c.suggested_email && <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 10.5 }}>הצעה אוטומטית ✨</span>}
          <button onClick={link} disabled={busy || !email.trim()} style={{ ...segBtn(true), opacity: email.trim() ? 1 : 0.5 }}>{busy ? "מקשר…" : "🔗 קשר"}</button>
        </div>
      )}
      {msg && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
function WhatsAppLinkTab() {
  const [cands, setCands] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const load = () => getWaCandidates().then(x => setCands(Array.isArray(x) ? x : [])).catch(e => setErr(String(e?.message || e)));
  useEffect(() => { load(); }, []);
  const onLink = async (phone, email) => {
    const r = await adminLinkWa(phone, email);
    if (r.ok) setCands(list => (list || []).map(c => c.phone === phone ? { ...c, linked_email: email } : c));
    return r;
  };
  const onUnlink = async (phone) => {
    const r = await adminUnlinkWa(phone);
    if (r.ok) setCands(list => (list || []).map(c => c.phone === phone ? { ...c, linked_email: null } : c));
    return r;
  };
  const filtered = (cands || []).filter(c => !q.trim() || (c.name || "").includes(q) || (c.phone || "").includes(q) || (c.linked_email || "").includes(q));
  const linkedCount = (cands || []).filter(c => c.linked_email).length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: 0 }}>🟢 חיבור וואטסאפ ↔ חשבון {cands ? `· ${cands.length}` : ""}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
          כל המספרים שכבר דיברו עם הבוט. <b style={{ color: C.goldLight }}>קישור ידני כאן = בלי קוד</b> — האישור שלך הוא האימות (אתה מכיר את האנשים). מי שמחבר את עצמו באתר עובר אימות-קוד בוואטסאפ. אחרי קישור, הזיכרון של הבוט על אותו מספר נפתח למשתמש באזור-האישי שלו.
          {cands && <> <b style={{ color: "#5fe08a" }}>{linkedCount}</b> מקושרים.</>}
          <br />💡 «הצעה אוטומטית ✨» = התאמנו את המספר למשתמש רשום לפי הטלפון בפרופיל שלו.
        </div>
        {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>שגיאה: {err}</div>}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 חיפוש לפי שם / מספר / מייל" dir="rtl"
          style={{ width: "100%", boxSizing: "border-box", marginTop: 10, background: "rgba(8,5,2,0.6)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", color: C.goldLight, fontFamily: F.body, fontSize: 13 }} />
      </div>
      {!cands ? <Loading /> : filtered.length === 0 ? <Empty>אין מספרים תואמים.</Empty> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((c, i) => <WaCandidateRow key={c.phone || i} c={c} onLink={onLink} onUnlink={onUnlink} />)}
        </div>
      )}
    </div>
  );
}

// 🔴 שידור חי — מי באתר עכשיו, מקסימום פרטים. מתרענן כל 10ש.
function humanPath(p) {
  if (!p) return "—";
  let s; try { s = decodeURIComponent(p); } catch { s = p; }
  if (s === "/" || s === "") return "🏠 דף הבית";
  const num = s.match(/^\/number\/(.+)$/); if (num) return "🔢 מספר · " + num[1];
  if (s.startsWith("/journey")) return "🧭 מסע ההתכנסות";
  if (s.startsWith("/reality")) return "🎬 קוד המציאות";
  if (s.startsWith("/archive")) return "🌊 זרם המציאות";
  if (s.startsWith("/beit-midrash") || s.startsWith("/research")) return "🧠 סביבת המחקר";
  if (s.startsWith("/tag/")) { try { return "🏷️ תגית · " + decodeURIComponent(s.slice(5)); } catch { return "🏷️ " + s.slice(5); } }
  if (s.startsWith("/topic/")) return "🔗 התכנסות · " + s.slice(7);
  if (s.startsWith("/community")) return "💬 קהילה";
  if (s.startsWith("/post")) return "📄 פוסטים";
  if (s.startsWith("/gematria") || s.startsWith("/calc")) return "🧮 גימטריה";
  if (s.startsWith("/els") || s.startsWith("/dilug")) return "🔍 דילוגים";
  if (/^\/[^/]+$/.test(s) && s.length < 70) return "📄 " + s.slice(1);
  return s;
}
function humanSrc(r) {
  if (!r) return "🔗 ישיר";
  if (/google/i.test(r)) return "🔍 Google";
  if (/facebook|fb\./i.test(r)) return "📘 Facebook";
  if (/instagram/i.test(r)) return "📸 Instagram";
  if (/whatsapp|wa\.me/i.test(r)) return "💬 WhatsApp";
  if (/t\.me|telegram/i.test(r)) return "✈️ Telegram";
  if (/bing/i.test(r)) return "🔎 Bing";
  if (/youtube/i.test(r)) return "▶️ YouTube";
  if (/sod1820/i.test(r)) return "🏠 פנימי";
  try { return "🌐 " + r.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]; } catch { return "🌐 חיצוני"; }
}
const devIcon = d => (/mobile|android|iphone/i.test(d || "") ? "📱" : /tablet|ipad/i.test(d || "") ? "📲" : "💻");
function agoColor(s) { return s < 60 ? "#5fe08a" : s < 180 ? "#e8c860" : "#8a7a4a"; }
function fmtAgo(s) { s = Number(s || 0); return s < 60 ? `${s}ש׳` : `${Math.floor(s / 60)}ד׳`; }
function LiveVisitorsTab() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    let live = true;
    const tick = () => getLiveVisitors(10).then(x => { if (live) { setD(x || {}); setBeat(b => b + 1); } }).catch(e => live && setErr(String(e?.message || e)));
    tick();
    const id = setInterval(tick, 10000);
    return () => { live = false; clearInterval(id); };
  }, []);
  const vs = (d && d.visitors) || [];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`@keyframes lv-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.75)}}`}</style>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5b5b", boxShadow: "0 0 10px #ff5b5b", animation: "lv-pulse 1.4s ease-in-out infinite" }} />
            <span style={{ color: "#ff9a9a", fontFamily: F.heading, fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>שידור חי</span>
          </span>
          <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 38, fontWeight: 800, lineHeight: 1 }}>{d ? Number(d.online || 0).toLocaleString("he") : "—"}</span>
          <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13 }}>באתר עכשיו (10 דק׳)</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>🔁 {d?.returning || 0} חוזרים · 📧 {d?.identified || 0} מזוהים · מתרענן כל 10ש {beat > 0 ? "●" : ""}</span>
        </div>
        {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>שגיאה: {err}</div>}
      </div>
      {!d ? <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>טוען…</div> :
        vs.length === 0 ? <div style={{ color: C.muted, textAlign: "center", padding: 30, fontFamily: F.body }}>אין מבקרים פעילים ב-10 הדקות האחרונות.</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {vs.map((v, i) => (
              <div key={i} style={{ border: `1px solid ${v.secs_ago < 60 ? "rgba(95,224,138,0.4)" : C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{devIcon(v.device)}</span>
                  <span style={{ flex: 1, color: v.email ? "#7fd18a" : C.goldLight, fontFamily: v.email ? F.body : F.mono, fontSize: v.email ? 12.5 : 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.email ? "📧 " + v.email : "👤 " + v.v}
                  </span>
                  <span style={{ color: agoColor(v.secs_ago), fontFamily: F.mono, fontSize: 11, fontWeight: 700 }}>● {fmtAgo(v.secs_ago)}</span>
                </div>
                <div dir="rtl" style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 6, wordBreak: "break-word" }}>{humanPath(v.path)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: C.goldDim, fontFamily: F.body, fontSize: 11, marginBottom: 8 }}>
                  <span>{humanSrc(v.referrer)}</span>
                  <span>· 📄 {v.pages} דפים</span>
                  {v.dur > 0 && <span>· ⏱️ {fmtAgo(v.dur)}</span>}
                  <span>· {v.returning ? "🔁 חוזר" : "✨ חדש"}</span>
                </div>
                {Array.isArray(v.trail) && v.trail.length > 1 && (
                  <div dir="rtl" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, color: C.muted, fontFamily: F.body, fontSize: 10.5, lineHeight: 1.7, wordBreak: "break-word" }}>
                    🧭 {v.trail.map(p => humanPath(p).replace(/^\S+\s/, "")).join(" ← ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7, padding: "0 4px", fontStyle: "italic" }}>
        כל כרטיס = מבקר אמיתי חי (בוטים סוננו). 📧 = מזוהה (השאיר אימייל אי-פעם) · 👤 = אנונימי. השובל = הדפים שעבר ב-30 הדק׳. הנתונים דרך המונה שלנו — לא Google (שנחסם).
      </div>
    </div>
  );
}

// 📈 כניסות אמיתיות לאורך זמן + מקורות — מסונן-בוטים. עונה על «מי שולח» ו«האם יש עלייה אמיתית».
const SRC_ICON = { "(ישיר)": "🔗", "Google": "🔍", "Facebook": "📘", "Instagram": "📸", "X/Twitter": "𝕏", "WhatsApp": "💬", "Telegram": "✈️", "Bing": "🔎", "DuckDuckGo": "🦆", "YouTube": "▶️", "TikTok": "🎵", "(ניווט פנימי)": "🏠" };
function RealTrafficPanel() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(null);   // 🟢 «כמה עכשיו» — מתרענן כל 25ש
  useEffect(() => {
    let live = true; setD(null); setErr("");
    getRealTraffic(days).then(x => live && setD(x || {})).catch(e => live && setErr(String(e?.message || e)));
    return () => { live = false; };
  }, [days]);
  useEffect(() => {
    let live = true;
    const tick = () => getRealtimeNow(5).then(x => live && setNow(x || null)).catch(() => { });
    tick();
    const id = setInterval(tick, 25000);
    return () => { live = false; clearInterval(id); };
  }, []);
  const decode = p => { try { return decodeURIComponent(p); } catch { return p; } };
  const daily = (d && d.daily) || [];
  const sources = (d && d.sources) || [];
  const maxV = Math.max(...daily.map(x => Number(x.visitors) || 0), 1);
  const maxSrc = Math.max(...sources.map(s => Number(s.visitors) || 0), 1);
  const recent = Number(d?.recent_avg || 0), prior = Number(d?.prior_avg || 0);
  const trend = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : (recent > 0 ? 100 : 0);
  const up = trend >= 0;
  const fmt = n => Number(n || 0).toLocaleString("he");
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: 0 }}>📈 כניסות אמיתיות — מגמה ומקורות</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {[[7, "7 ימים"], [30, "30 יום"], [90, "90 יום"]].map(([n, lbl]) => (
            <button key={n} onClick={() => setDays(n)} style={{ cursor: "pointer", border: `1px solid ${days === n ? C.gold : C.border}`, background: days === n ? "rgba(212,175,55,0.18)" : "transparent", color: days === n ? C.goldBright : C.muted, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{lbl}</button>
          ))}
        </div>
      </div>
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14 }}>מבקרים אמיתיים בלבד (בוטים דטרמיניסטיים סוננו). «מי שולח» = referrer.</div>
      {/* 🟢 כמה עכשיו — חי, מתרענן כל 25ש */}
      <div style={{ border: "1px solid rgba(127,209,138,0.4)", borderRadius: 14, padding: "14px 16px", background: "rgba(127,209,138,0.06)", marginBottom: 16 }}>
        <style>{`@keyframes rt-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#5fe08a", boxShadow: "0 0 8px #5fe08a", animation: "rt-pulse 1.6s ease-in-out infinite" }} />
            <span style={{ color: "#7fd18a", fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>עכשיו באתר</span>
          </span>
          <span style={{ color: "#7fd18a", fontFamily: F.mono, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{now ? Number(now.now_visitors || 0).toLocaleString("he") : "—"}</span>
          <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>מבקרים ב-5 הדק׳ האחרונות · <b style={{ color: C.goldBright, fontFamily: F.mono }}>{now ? Number(now.last30_visitors || 0).toLocaleString("he") : "—"}</b> ב-30 הדק׳</span>
        </div>
        {now && (now.top_paths || []).length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {now.top_paths.map((p, i) => (
              <span key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 10px", background: "rgba(8,5,2,0.4)", color: C.goldLight, fontFamily: F.body, fontSize: 11.5, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", direction: "ltr" }} title={decode(p.path)}>{decode(p.path)} · {p.n}</span>
            ))}
          </div>
        )}
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 10.5, marginTop: 8, fontStyle: "italic" }}>מתרענן אוטומטית כל 25 שניות · מסונן-בוטים · בד״כ גבוה מ-Google Analytics (שנחסם ע״י חוסמי-פרסומות).</div>
      </div>
      {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13 }}>שגיאה: {err}</div>}
      {!d ? <div style={{ color: C.muted }}>טוען…</div> : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: "1 1 150px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
              <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{fmt(d.total_real_visitors)}</div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>מבקרים אמיתיים · {days} יום</div>
            </div>
            <div style={{ flex: "1 1 150px", border: `1px solid ${up ? "#7fd18a" : "#e0796f"}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
              <div style={{ color: up ? "#7fd18a" : "#e0796f", fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{up ? "▲" : "▼"} {Math.abs(trend)}%</div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>ממוצע יומי — מחצית אחרונה מול קודמת ({fmt(recent)} מול {fmt(prior)}/יום)</div>
            </div>
            <div style={{ flex: "1 1 150px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
              <div style={{ color: C.muted, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{fmt(d.bot_visitors)}</div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>🤖 בוטים שסוננו</div>
            </div>
          </div>
          {/* גרף עמודות יומי */}
          {daily.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>מבקרים אמיתיים ליום</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 130, borderBottom: `1px solid ${C.border}`, paddingBottom: 2, overflowX: "auto" }}>
                {daily.map((x, i) => {
                  const h = Math.max(2, Math.round((Number(x.visitors) / maxV) * 122));
                  const isLast = i === daily.length - 1;
                  return (
                    <div key={x.day} title={`${x.day}: ${fmt(x.visitors)} מבקרים · ${fmt(x.visits)} ביקורים`} style={{ flex: "1 0 6px", minWidth: 6, height: h, borderRadius: "3px 3px 0 0", background: isLast ? "linear-gradient(180deg,#f0d878,#d4af37)" : "linear-gradient(180deg,#d4af37,#8a6d18)", opacity: isLast ? 1 : 0.85 }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.goldDim, fontFamily: F.mono, fontSize: 10.5, marginTop: 4 }}>
                <span>{daily[0]?.day}</span><span>{daily[daily.length - 1]?.day}</span>
              </div>
            </div>
          )}
          {/* גרף שעתי — 24 שעות (זיהוי קפיצות / דפוס לילה-יום) */}
          {(d.hourly || []).length > 0 && (() => {
            const hrs = d.hourly, hmax = Math.max(...hrs.map(x => Number(x.visitors) || 0), 1);
            return (
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>מבקרים אמיתיים לפי שעה · 24ש (שעון ישראל)</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90, borderBottom: `1px solid ${C.border}` }}>
                  {hrs.map((x, i) => (
                    <div key={i} title={`${x.hr}: ${fmt(x.visitors)} מבקרים`} style={{ flex: 1, minWidth: 5, height: Math.max(2, Math.round((Number(x.visitors) / hmax) * 84)), borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#8ea2ff,#3a4a8a)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: C.goldDim, fontFamily: F.mono, fontSize: 10, marginTop: 3 }}>
                  {hrs.filter((_, i) => i % 4 === 0).map((x, i) => <span key={i}>{x.hr}</span>)}
                </div>
              </div>
            );
          })()}
          {/* מקורות */}
          {sources.length > 0 && (
            <div>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>מי שולח · מקורות ({days} יום)</div>
              <div style={{ display: "grid", gap: 6 }}>
                {sources.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, minWidth: 118, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{SRC_ICON[s.source] || "🌐"} {s.source}</span>
                    <div style={{ flex: 1, height: 16, background: "rgba(212,175,55,0.1)", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((Number(s.visitors) / maxSrc) * 100)}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#d4af37,#f0d878)" }} />
                    </div>
                    <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13, fontWeight: 800, minWidth: 54, textAlign: "left" }}>{fmt(s.visitors)}</span>
                  </div>
                ))}
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, marginTop: 8, fontStyle: "italic" }}>«ישיר» = הקלדה/סימנייה/קישור מאפליקציה (וואטסאפ/טלגרם לרוב נכנסים ככה). המספר = מבקרים ייחודיים.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JourneyExperimentsTab() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true; setData(null); setErr("");
    getJourneyExperiments(days).then(d => live && setData(d || {})).catch(e => live && setErr(String(e?.message || e)));
    return () => { live = false; };
  }, [days]);
  const rate = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const rangeLbl = days === 7 ? "7 ימים" : days === 14 ? "14 יום" : "30 יום";

  const renderExp = (key) => {
    const meta = JEXP_META[key];
    const rows = (data && data[key]) || [];
    const byV = Object.fromEntries(rows.map(r => [r.variant, r]));
    const filled = Object.keys(meta.variants).map(k => byV[k] || { variant: k, starts: 0, step2: 0, completes: 0 });
    const anyData = filled.some(r => Number(r.starts) > 0);
    const best = anyData ? filled.slice().sort((a, b) => rate(b.step2, b.starts) - rate(a.step2, a.starts))[0] : null;
    return (
      <div style={card} key={key}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>{meta.title}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>{meta.note}</div>
        {!anyData ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: "8px 0" }}>
            עדיין אין נתונים אמיתיים בטווח ({rangeLbl}) — צריך תנועה אמיתית של גולשים. הבוטים כבר סוננו.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filled.map(r => {
              const r2 = rate(r.step2, r.starts), rc = rate(r.completes, r.starts);
              const win = best && r.variant === best.variant && Number(r.step2) > 0;
              const col = meta.colors[r.variant] || C.gold;
              return (
                <div key={r.variant} style={{ border: `1px solid ${win ? col : C.border}`, borderRadius: 12, padding: "12px 14px", background: win ? "rgba(212,175,55,0.06)" : "rgba(8,5,2,0.3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 800, flex: 1 }}>{meta.variants[r.variant]}{win ? " 🏆" : ""}</span>
                    <span style={{ color: col, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{r2}%</span>
                    <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11 }}>צעד 2</span>
                  </div>
                  <div style={{ height: 10, background: "rgba(212,175,55,0.1)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${Math.max(r2, r.step2 > 0 ? 3 : 0)}%`, height: "100%", borderRadius: 999, background: col }} />
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>
                    <span>🚀 מתחילים: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{Number(r.starts).toLocaleString("he")}</b></span>
                    <span>➡️ צעד 2: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{Number(r.step2).toLocaleString("he")}</b></span>
                    <span>✅ סיום: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{Number(r.completes).toLocaleString("he")}</b> ({rc}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 🔀 צירופים (2×2) — כל שילוב עדשה×תוכן. «גם וגם»: לראות איזה שילוב ספציפי הכי עובד.
  const CELL_LENS = { reality: "🔮 מציאות", kingdom: "👑 מלוכה" };
  const CELL_KIND = { full: "🧮 מלא", classic: "📜 קלאסי" };
  const renderCells = () => {
    const rows = (data && data.cells) || [];
    if (!rows.length) return null;
    const anyData = rows.some(r => Number(r.starts) > 0);
    if (!anyData) return null;
    const best = rows.slice().sort((a, b) => rate(b.step2, b.starts) - rate(a.step2, a.starts))[0];
    const maxRate = Math.max(...rows.map(r => rate(r.step2, r.starts)), 1);
    return (
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🔀 צירופים · עדשה × תוכן (2×2)</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>איזה <b>שילוב</b> ספציפי מוביל הכי הרבה אנשים לצעד 2. משלים את ההשוואות השוליות למעלה.</div>
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r, i) => {
            const r2 = rate(r.step2, r.starts);
            const win = best && r.lens === best.lens && r.kind === best.kind && Number(r.step2) > 0;
            return (
              <div key={i} style={{ border: `1px solid ${win ? "#7fd18a" : C.border}`, borderRadius: 10, padding: "9px 12px", background: win ? "rgba(127,209,138,0.07)" : "rgba(8,5,2,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, flex: 1 }}>{CELL_LENS[r.lens] || r.lens} + {CELL_KIND[r.kind] || r.kind}{win ? " 🏆" : ""}</span>
                  <span style={{ color: win ? "#7fd18a" : C.goldBright, fontFamily: F.mono, fontSize: 16, fontWeight: 800 }}>{r2}%</span>
                  <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11 }}>· {Number(r.starts).toLocaleString("he")} התחילו</span>
                </div>
                <div style={{ height: 7, background: "rgba(212,175,55,0.1)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(Math.round((r2 / maxRate) * 100), r.step2 > 0 ? 3 : 0)}%`, height: "100%", borderRadius: 999, background: win ? "#7fd18a" : C.gold }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, margin: 0 }}>🧪 ניסויי המסע · A/B</h3>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginTop: 4 }}>המדד הראשי: <b style={{ color: C.goldBright }}>מעבר לצעד 2</b> — כמה מהמתחילים באמת המשיכו. הזוכה מסומן 🏆.</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[[7, "7 ימים"], [14, "14 יום"], [30, "30 יום"]].map(([d, lbl]) => (
              <button key={d} onClick={() => setDays(d)} style={{ cursor: "pointer", border: `1px solid ${days === d ? C.gold : C.border}`, background: days === d ? "rgba(212,175,55,0.18)" : "transparent", color: days === d ? C.goldBright : C.muted, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{lbl}</button>
            ))}
          </div>
        </div>
        {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13, marginTop: 8 }}>שגיאה: {err}</div>}
        {data && (
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10, fontStyle: "italic" }}>
            🛡️ סינון בוטים: {Number(data.bot_events || 0).toLocaleString("he")} אירועי-בוט הוסרו ({Number(data.bot_sigs || 0)} חתימות) · {Number(data.real_events || 0).toLocaleString("he")} אירועים אמיתיים נותרו.
          </div>
        )}
      </div>
      {renderExp("lens")}
      {renderExp("kind")}
      {renderCells()}
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7, padding: "0 4px" }}>
        התצוגה המפורטת הישנה (משפך, שמירות, טוקנים) עברה לטאב «🧭 מסעות (ישן)».
      </div>
    </div>
  );
}

function JourneysTab() {
  const [dwell, setDwell] = useState(null);
  const [journeys, setJourneys] = useState(null);
  const [shares, setShares] = useState(null);
  const [ai, setAi] = useState(null);
  const [rw, setRw] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [err, setErr] = useState("");
  const [hours, setHours] = useState(168);
  const [days, setDays] = useState(7);  // טווח למשפך-המסע + אזור-המשתמש (7 / 30 / 90 יום)
  useEffect(() => {
    let live = true; setErr("");
    getPageDwell(hours).then(d => live && setDwell(d || [])).catch(e => live && setErr(String(e?.message || e)));
    getVisitorJourneys(24, 4).then(d => live && setJourneys(d || [])).catch(() => live && setJourneys([]));
    getJourneyShares(720).then(d => live && setShares(d || null)).catch(() => live && setShares(null));
    getAiUsage(720).then(d => live && setAi(d || null)).catch(() => live && setAi(null));
    return () => { live = false; };
  }, [hours]);
  useEffect(() => {
    let live = true;
    getJourneyFunnel(days).then(d => live && setFunnel(d || null)).catch(() => live && setFunnel(null));
    getResearchUsage(days * 24).then(d => live && setRw(d || null)).catch(() => live && setRw(null));
    getAiTokenUsage(days).then(d => live && setTokens(d || null)).catch(() => live && setTokens(null));
    return () => { live = false; };
  }, [days]);
  // תוויות ידידותיות לכל כפתור-AI (kind → שם + היכן)
  const AI_LABELS = {
    compare: "🔀 השוואת מילים", notarikon: "🔠 ראשי/סופי תיבות", verse: "📜 חיפוש בפסוק",
    daily_verse: "📅 פסוק יומי", research: "🧠 ניתוח המחקר שלי (אזור אישי)",
    journey_msg: "🧭 מסר-מסע (ראשון)", journey_deep: "🔓 מסר-עומק (מסע)",
  };
  const rangeLbl = days === 7 ? "7 ימים" : days === 30 ? "30 יום" : "90 יום";
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* 🧭 משפך המסע — התחילו → יעד → סיום → שיתוף → פתיחה → וואטסאפ → שמירה. הדליפה שצוריאל רצה לראות. */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: 0 }}>🧭 משפך המסע — איפה מאבדים אנשים</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[[7, "7 ימים"], [30, "30 יום"], [90, "90 יום"]].map(([d, lbl]) => (
              <button key={d} onClick={() => setDays(d)} style={{ cursor: "pointer", border: `1px solid ${days === d ? C.gold : C.border}`, background: days === d ? "rgba(212,175,55,0.18)" : "transparent", color: days === d ? C.goldBright : C.muted, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14 }}>כל שלב = כמה מבקרים הגיעו אליו, ואיזה אחוז מהמתחילים. הצניחה הגדולה = איפה לתקן. טווח: {rangeLbl}.</div>
        {!funnel ? <div style={{ color: C.muted }}>טוען…</div> : (() => {
          const base = funnel.started || 0;
          const stages = [
            ["🚀 התחילו מסע", funnel.started, "#d4af37"],
            ["🎯 הגיעו ליעד", funnel.revealed, "#e8c860"],
            ["✅ סיימו מסע", funnel.completed, "#7fd18a"],
            ["🔗 שיתפו", funnel.shared, "#5fb0ff"],
            ["📬 שיתוף נפתח", funnel.opened, "#3ea6ff"],
            ["💬 לחצו וואטסאפ", funnel.cta, "#25d366"],
            ["🔖 שמרו מסע", Math.max(funnel.saved || 0, funnel.savesCount || 0), "#d98cff"],
          ];
          const pct = n => base > 0 ? Math.round((n / base) * 100) : 0;
          return (
            <div style={{ display: "grid", gap: 7 }}>
              {stages.map(([lbl, n, col], i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", background: "rgba(8,5,2,0.3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, flex: 1 }}>{lbl}</span>
                    <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 16, fontWeight: 800 }}>{Number(n || 0).toLocaleString("he")}</span>
                    <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, minWidth: 42, textAlign: "left" }}>{pct(n)}%</span>
                  </div>
                  <div style={{ height: 7, background: "rgba(212,175,55,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(pct(n), n > 0 ? 2 : 0)}%`, height: "100%", borderRadius: 999, background: col }} />
                  </div>
                </div>
              ))}
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 6, lineHeight: 1.6, fontStyle: "italic" }}>
                {base > 0 && funnel.completed != null && (
                  <>שיעור סיום: <b style={{ color: C.goldBright }}>{pct(funnel.completed)}%</b> · שיעור שיתוף: <b style={{ color: C.goldBright }}>{pct(funnel.shared)}%</b> · המרה לוואטסאפ: <b style={{ color: C.goldBright }}>{pct(funnel.cta)}%</b>. </>
                )}
                {funnel.aiMsg > 0 && <>🤖 {Number(funnel.aiMsg).toLocaleString("he")} מסרי-AI במסעות (טוקנים).</>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 📉 נשירה לפי שלב — באיזה שלב במסע אנשים עוצרים. עמודה = כמה הגיעו לשלב N. */}
      {funnel && funnel.steps && Object.keys(funnel.steps).length > 0 && (
        <div style={card}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>📉 נשירה לפי שלב · {rangeLbl}</h3>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 14 }}>כמה מבקרים הגיעו לכל שלב-מסע. הצניחה בין שלב לשלב = איפה עוצרים באמצע.</div>
          {(() => {
            const keys = Object.keys(funnel.steps).map(Number).sort((a, b) => a - b);
            const max = Math.max(...keys.map(k => funnel.steps[k]), 1);
            const first = funnel.steps[keys[0]] || 1;
            return (
              <div style={{ display: "grid", gap: 6 }}>
                {keys.map(k => {
                  const n = funnel.steps[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, minWidth: 58 }}>שלב {k}</span>
                      <div style={{ flex: 1, height: 18, background: "rgba(212,175,55,0.1)", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((n / max) * 100)}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#d4af37,#f0d878)" }} />
                      </div>
                      <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13, fontWeight: 800, minWidth: 44, textAlign: "left" }}>{Number(n).toLocaleString("he")}</span>
                      <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, minWidth: 40, textAlign: "left" }}>{Math.round((n / first) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 🔖 שמירות-מסע אחרונות — מי שמר מסע (journey_saves) + לאיזה שורש. עץ אחד: נשמר ב-DB, לא רק localStorage. */}
      {funnel && (funnel.recentSaves || []).length > 0 && (
        <div style={card}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🔖 שמירות-מסע אחרונות</h3>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>מי שמר מסע ולאיזה שורש. סה״כ בטווח: <b style={{ color: C.goldBright }}>{Number(funnel.savesCount || 0).toLocaleString("he")}</b>.</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>מתי</th><th style={th}>שורש</th><th style={th}>עולם</th><th style={th}>מבקר</th></tr></thead>
              <tbody>
                {funnel.recentSaves.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{r.created_at ? new Date(r.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td style={{ ...td, fontFamily: F.mono }}>{r.root ? <Link to={`/number/${r.root}`} style={{ color: C.goldBright }}>{r.root}</Link> : "—"}</td>
                    <td style={td}>{r.world || "—"}</td>
                    <td style={{ ...td, color: C.goldDim, fontFamily: F.mono, fontSize: 11 }}>{String(r.visitor_id || "").slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔗 שיתופי-מסע + 🔓 פתיחות מסר-עומק (AI) — «מי שיתף» (30 יום). קשור ישירות לצריכת קרדיטי ה-AI. */}
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🔗 שיתופי מסע · 🔓 מסרי-עומק (AI) · 30 יום</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>מי שיתף מסע ומי פתח מסר-עומק (השכבה השנייה שנפתחת בזכות שיתוף). כל פתיחת-עומק = קריאת AI אחת.</div>
        {!shares ? <div style={{ color: C.muted }}>טוען…</div> : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {[["🔗 שיתופים", shares.total_shares], ["🔓 מסרי-עומק", shares.total_deep], ["👤 משתפים ייחודיים", shares.unique_sharers]].map(([lbl, n]) => (
                <div key={lbl} style={{ flex: "1 1 150px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
                  <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 24, fontWeight: 800 }}>{Number(n || 0).toLocaleString("he")}</div>
                  <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
                </div>
              ))}
            </div>
            {(shares.recent || []).length === 0 ? <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עדיין אין שיתופים בטווח.</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>מתי</th><th style={th}>סוג</th><th style={th}>מספר</th><th style={th}>ערוץ</th><th style={th}>מבקר</th></tr></thead>
                  <tbody>
                    {(shares.recent || []).map((r, i) => (
                      <tr key={i}>
                        <td style={td}>{r.ts ? new Date(r.ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td style={{ ...td, color: r.kind === "deep" ? "#3ea6ff" : C.goldBright, fontWeight: 700 }}>{r.kind === "deep" ? "🔓 עומק" : "🔗 שיתוף"}</td>
                        <td style={{ ...td, fontFamily: F.mono }}>{r.number ? <Link to={`/number/${r.number}`} style={{ color: C.goldBright }}>{r.number}</Link> : "—"}</td>
                        <td style={td}>{r.platform || "—"}</td>
                        <td style={{ ...td, color: C.goldDim, fontFamily: F.mono, fontSize: 11 }}>{r.visitor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🧠 שימוש באזור-המשתמש — כמה נכנסו/שמרו/הוסיפו למחקר (כולל אנונימיים!) ב-48 שעות. */}
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🧠 אזור המשתמש — מי נכנס ושמר · {rangeLbl}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>כולל אנונימיים (visitor_id) — לא רק רשומים. «נכנסו» = פתחו את «עולם המשתמש»; «שמרו» = ⭐/🔖.</div>
        {!rw ? <div style={{ color: C.muted }}>טוען…</div> : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[["👤 נכנסו לאזור", rw.openers], ["🔖 שמרו", rw.savers], ["➕ הוסיפו למחקר", rw.adders], ["🧭 שמרו מסע", rw.journeyers], ["Σ סה״כ שמירות", rw.total_saves]].map(([lbl, n]) => (
              <div key={lbl} style={{ flex: "1 1 130px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
                <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 24, fontWeight: 800 }}>{Number(n || 0).toLocaleString("he")}</div>
                <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>מספרים = מבקרים ייחודיים. שמירה מקומית (בלי לוגין) נספרת גם — עץ אחד, Local-first.</div>
      </div>

      {/* 🪙 מד-טוקנים — כמה טוקנים ועלות ($) עלו קריאות ה-AI (מסע/ניתוח/מחקר). מקור: ai_token_log מ-Anthropic usage. */}
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🪙 מד-טוקנים ועלות AI · {rangeLbl}</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>כמה טוקנים באמת נצרכו וכמה זה עלה (הערכה ב-$). נמדד מהתגובה של Anthropic — מסע/ניתוח/מחקר. עלות = haiku $1/$5 · sonnet $3/$15 ל-1M.</div>
        {!tokens ? <div style={{ color: C.muted }}>טוען…</div> : (() => {
          const t = tokens.total || {};
          const fmtTok = n => { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); };
          const SRC = { journey: "🧭 מסע", analyze: "🧠 ניתוח (כלים)", router: "🔬 מרכז-מחקר" };
          if (!Number(t.calls)) return <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עדיין אין קריאות-AI מתועדות בטווח (המדידה החלה כעת — יצטבר עם השימוש).</div>;
          return (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {[["💰 עלות משוערת", "$" + Number(t.cost_usd || 0).toLocaleString("en", { maximumFractionDigits: 2 })], ["🪙 סה״כ טוקנים", fmtTok(t.total_tokens)], ["⬆️ קלט", fmtTok(t.input_tokens)], ["⬇️ פלט", fmtTok(t.output_tokens)], ["🤖 קריאות", Number(t.calls || 0).toLocaleString("he")]].map(([lbl, v]) => (
                  <div key={lbl} style={{ flex: "1 1 130px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
                    <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{v}</div>
                    <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {(tokens.by_source || []).length > 0 && (() => {
                const max = Math.max(...tokens.by_source.map(s => Number(s.total_tokens) || 0), 1);
                return (
                  <div style={{ display: "grid", gap: 8 }}>
                    {tokens.by_source.map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", background: "rgba(8,5,2,0.3)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, flex: 1 }}>{SRC[s.source] || s.source}</span>
                          <span style={{ color: "#7fd18a", fontFamily: F.mono, fontSize: 13, fontWeight: 800 }}>${Number(s.cost_usd || 0).toLocaleString("en", { maximumFractionDigits: 2 })}</span>
                          <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>{fmtTok(s.total_tokens)}</span>
                          <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11 }}>· {Number(s.calls).toLocaleString("he")} קר׳</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(212,175,55,0.12)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((Number(s.total_tokens) / max) * 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7fd18a,#d4af37)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>

      {/* 🤖 שימוש ב-AI לפי כפתור — על איזה כפתורי-AI לחצו הכי הרבה (30 יום). כל שורה = כפתור. */}
      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🤖 שימוש ב-AI לפי כפתור · 30 יום</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>על איזה כפתורי-AI לחצו הכי הרבה. כל לחיצה = קריאת AI אחת (עלות קרדיטים).</div>
        {!ai ? <div style={{ color: C.muted }}>טוען…</div> : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {[["🤖 סה״כ קריאות AI", ai.total], ["👤 משתמשים ייחודיים", ai.unique_users]].map(([lbl, n]) => (
                <div key={lbl} style={{ flex: "1 1 160px", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(8,5,2,0.35)" }}>
                  <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 24, fontWeight: 800 }}>{Number(n || 0).toLocaleString("he")}</div>
                  <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>{lbl}</div>
                </div>
              ))}
            </div>
            {(ai.by_button || []).length === 0 ? <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עדיין אין שימוש ב-AI בטווח.</div> : (() => {
              const max = Math.max(...ai.by_button.map(b => b.uses), 1);
              return (
                <div style={{ display: "grid", gap: 8 }}>
                  {ai.by_button.map((b, i) => (
                    <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", background: "rgba(8,5,2,0.3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, flex: 1 }}>{AI_LABELS[b.kind] || b.kind}</span>
                        <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}>{Number(b.uses).toLocaleString("he")}</span>
                        <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11 }}>· {Number(b.users).toLocaleString("he")} משתמשים</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(212,175,55,0.12)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((b.uses / max) * 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#d4af37,#f0d878)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: 0 }}>⏱️ זמן וצפיות לכל דף / כלי-מעבדה</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[[24, "24ש"], [72, "3 ימים"], [168, "שבוע"]].map(([h, lbl]) => (
              <button key={h} onClick={() => setHours(h)} style={{ cursor: "pointer", border: `1px solid ${hours === h ? C.gold : C.border}`, background: hours === h ? "rgba(212,175,55,0.18)" : "transparent", color: hours === h ? C.goldBright : C.muted, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>{lbl}</button>
            ))}
          </div>
        </div>
        {err && <div style={{ color: "#e0796f", fontFamily: F.body, fontSize: 13, marginBottom: 8 }}>שגיאה: {err}</div>}
        {!dwell ? <div style={{ color: C.muted }}>טוען…</div> : dwell.length === 0 ? <div style={{ color: C.muted }}>אין נתונים בטווח.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>דף / כלי</th><th style={th}>צפיות</th><th style={th}>ייחודיים</th><th style={th}>זמן ממוצע</th><th style={th}>חציון</th></tr></thead>
              <tbody>
                {dwell.map(r => (
                  <tr key={r.page}>
                    <td style={{ ...td, color: C.goldBright, fontWeight: 700 }}>{r.page}</td>
                    <td style={td}>{r.visits?.toLocaleString("he")}</td>
                    <td style={td}>{r.uniq?.toLocaleString("he")}</td>
                    <td style={{ ...td, color: C.goldBright }}>{fmtDwell(r.avg_sec)}</td>
                    <td style={td}>{fmtDwell(r.median_sec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>אומדן-שהייה = הזמן עד הצפייה הבאה של אותו מבקר (מוגבל ל-30 דק'). כלי-מעבדה נספרים בנפרד מאז עדכון המעקב; ביקורים ישנים מופיעים כ«מעבדה · בית».</div>
      </div>

      <div style={card}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, margin: "0 0 4px" }}>🧭 מסעות מבקרים · 24 שעות</h3>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, marginBottom: 12 }}>איפה כל אדם היה (4+ צפיות). 🏠בית · 🔢מספר · 📚מדרש · 🏛️מעבדה · 🧮חשב · 🔍דילוג · 📜פסוק · 💬קהילה</div>
        {!journeys ? <div style={{ color: C.muted }}>טוען…</div> : journeys.length === 0 ? <div style={{ color: C.muted }}>אין מסעות בטווח.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {journeys.map((j, i) => (
              <div key={j.visitor} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", background: "rgba(8,5,2,0.35)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 11 }}>#{i + 1}</span>
                  <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{j.views} צפיות</span>
                  <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 10 }}>{String(j.visitor).slice(0, 8)}</span>
                </div>
                <div dir="rtl" style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.9, wordBreak: "break-word" }}>{j.journey}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== מעטפת: שני תת-טאבים — חי (האתר החדש) / היסטוריה (Jetpack) =====
function StatsTab() {
  const [view, setView] = useState("live");  // live | legacy
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={segWrap}>
          {[["live", "🟢 חי — האתר החדש"], ["legacy", "📜 היסטוריה (Jetpack)"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={segBtn(view === k)}>{l}</button>
          ))}
        </div>
      </div>
      {view === "live" ? <LiveStatsView /> : <LegacyStatsView />}
    </div>
  );
}

// ===== 📜 היסטוריה — נתוני Jetpack/וורדפרס שיובאו (האתר הישן) =====
function LegacyStatsView() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [gran, setGran] = useState("day");   // day | month | year
  const [scale, setScale] = useState("linear"); // linear | log
  const [sel, setSel] = useState(null);       // נקודת זמן שנבחרה
  useEffect(() => { getTrafficStats().then(setS).catch(e => setErr(e.message || "שגיאה")); }, []);

  // אגרגציה של צפיות לפי גרנולריות
  const series = useMemo(() => {
    if (!s) return [];
    if (gran === "year") return (s.yearly || []).map(r => ({ key: String(r.period), views: r.views || 0 }));
    if (gran === "month") {
      const m = {};
      (s.daily || []).forEach(d => { const k = (d.date || "").slice(0, 7); if (k) m[k] = (m[k] || 0) + (d.views || 0); });
      return Object.entries(m).map(([key, views]) => ({ key, views })).sort((a, b) => a.key.localeCompare(b.key));
    }
    return (s.daily || []).map(d => ({ key: d.date, views: d.views || 0 }));
  }, [s, gran]);

  useEffect(() => { setSel(null); }, [gran]);

  if (err) return <div style={{ color: C.crimsonLight, textAlign: "center", padding: 30 }}>{err}</div>;
  if (!s) return <Loading />;

  const totalViews = (s.yearly || []).reduce((a, r) => a + (r.views || 0), 0);
  const view = series.slice(gran === "day" ? -120 : -60);   // לא להציף ברצועות
  const max = Math.max(...view.map(x => x.views), 1);
  const { h: barH, ticks } = buildScale(max, scale);
  const referrers = (s.referrers || []).slice(0, 12);
  const searches = (s.searches || []).slice(0, 12);
  const clicksOut = (s.clicks || []).slice(0, 12);
  const topPosts = (s.posts || []).slice(0, 20);
  const granLabel = gran === "year" ? "שנה" : gran === "month" ? "חודש" : "יום";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ ...card, borderColor: C.borderGold, background: "rgba(212,175,55,0.05)" }}>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>📜 היסטוריית האתר הישן (Jetpack / וורדפרס)</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
          ארכיון שיובא מ-WordPress.com — צפיות שנאספו לאורך השנים עד המעבר לאתר החדש. נתון קבוע ולא משתנה.
          הנתונים החיים של האתר החדש נמצאים בטאב <b style={{ color: C.goldLight }}>🟢 חי</b>.
        </div>
      </div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <Stat label="סך צפיות (Jetpack)" value={totalViews.toLocaleString()} />
        <Stat label="פוסטים נמדדים" value={(s.posts || []).length.toLocaleString()} />
        <Stat label="מקורות הפניה" value={(s.referrers || []).length.toLocaleString()} />
        <Stat label="חיפושים" value={(s.searches || []).length.toLocaleString()} />
      </div>

      {/* צפיות — יום / חודש / שנה, עם ציר-Y, לחיץ */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <H>צפיות לפי {granLabel}</H>
          <span style={{ flex: 1 }} />
          <div style={segWrap}>
            {[["linear", "רגיל"], ["log", "לוג"]].map(([k, l]) => (
              <button key={k} onClick={() => setScale(k)} title={k === "log" ? "סקאלה לוגריתמית — כשיש יום חריג עם הרבה צפיות" : "סקאלה רגילה"} style={segBtn(scale === k)}>{l}</button>
            ))}
          </div>
          <div style={segWrap}>
            {[["day", "יום"], ["month", "חודש"], ["year", "שנה"]].map(([k, l]) => (
              <button key={k} onClick={() => setGran(k)} style={segBtn(gran === k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* גרף: אזור עמודות (ימין) + ציר-Y עם תוויות וקווי-עזר */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, minWidth: 0, position: "relative", height: 190, borderInlineStart: `1px solid ${C.border}` }}>
            {ticks.map((t, i) => (
              <div key={i} style={{ position: "absolute", insetInline: 0, bottom: `${t.pct}%`, borderTop: `1px dashed ${C.faint}`, pointerEvents: "none" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, overflowX: "auto", overflowY: "hidden" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: gran === "day" ? 2 : 6, height: "100%", width: "100%", minWidth: gran === "day" && view.length > 45 ? view.length * 8 : "100%", paddingInline: 2 }}>
                {view.map(r => (
                  <div key={r.key} onClick={() => setSel(r)} title={`${r.key}: ${r.views.toLocaleString()} צפיות`}
                    style={{ flex: "1 1 0", minWidth: gran === "day" ? 3 : 14, maxWidth: gran === "day" ? 20 : "none", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer" }}>
                    <div style={{ background: sel?.key === r.key ? `linear-gradient(180deg, ${C.goldBright}, ${C.gold})` : `linear-gradient(180deg, ${C.gold}, ${C.goldDark})`, borderRadius: "3px 3px 0 0", height: `${barH(r.views)}%`, minHeight: r.views > 0 ? 2 : 0, boxShadow: sel?.key === r.key ? `0 0 12px ${C.gold}` : "none" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ציר-Y (כמות גולשים) — בצד ימin */}
          <div style={{ width: 50, position: "relative", height: 190, flexShrink: 0 }}>
            {ticks.map((t, i) => (
              <div key={i} style={{ position: "absolute", right: 0, bottom: `${t.pct}%`, transform: "translateY(50%)", color: C.goldDim, fontFamily: F.mono, fontSize: 10, whiteSpace: "nowrap" }}>{t.label}</div>
            ))}
          </div>
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1, textAlign: "center", marginTop: 4 }}>כמות צפיות {scale === "log" ? "(לוגריתמי)" : ""}</div>

        {sel && (
          <div style={{ marginTop: 12, padding: "12px 16px", border: `1px solid ${C.borderGold}`, borderRadius: 12, background: "rgba(212,175,55,0.06)" }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>📅 {sel.key} · {sel.views.toLocaleString()} צפיות</div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>פירוט "מאיפה נכנסו" ברמת ה{granLabel} הבודד יגיע עם חיבור Google Analytics. כרגע ההפניות הכלליות למטה.</div>
          </div>
        )}
        <div style={{ color: C.muted, fontFamily: F.mono, fontSize: 10, marginTop: 6, textAlign: "center" }}>לחצו על עמודה לפירוט · {view.length} {granLabel === "יום" ? "ימים" : granLabel === "חודש" ? "חודשים" : "שנים"}</div>
      </div>

      {/* מאיפה הגיעו / מה חיפשו */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div style={card}>
          <H>↘ מאיפה הגיעו (נכנסים)</H>
          {referrers.length ? <BarRow items={referrers} labelKey="title" valueKey="views" hrefKey="url" /> : <Empty>אין נתוני הפניות.</Empty>}
        </div>
        <div style={card}>
          <H>🔎 מה חיפשו</H>
          {searches.length ? <BarRow items={searches} labelKey="title" valueKey="views" /> : <Empty>אין נתוני חיפוש.</Empty>}
        </div>
      </div>

      {/* קליקים יוצאים */}
      <div style={card}>
        <H>↗ קליקים יוצאים</H>
        {clicksOut.length ? <BarRow items={clicksOut} labelKey="title" valueKey="views" hrefKey="url" /> : <Empty>אין נתוני קליקים יוצאים.</Empty>}
      </div>

      {/* פוסטים מובילים */}
      <div style={card}>
        <H>הפוסטים הנצפים ביותר</H>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>#</th><th style={th}>כותרת</th><th style={th}>צפיות</th></tr></thead>
            <tbody>
              {topPosts.map((p, i) => (
                <tr key={p.post_id || i}>
                  <td style={{ ...td, color: C.goldDim, fontFamily: F.mono }}>{i + 1}</td>
                  <td style={td}>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={linkA}>{p.title || p.url}</a> : (p.title || "—")}</td>
                  <td style={{ ...td, fontFamily: F.mono, color: C.goldBright }}>{(p.views || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== 🟢 חי — מד-הכניסות הפנימי של האתר החדש (SOD1820) =====
const RANGES = [["30", "30 יום"], ["90", "90 יום"], ["365", "שנה"], ["all", "הכל"]];
// ── 🕷️ Crawl Intelligence — מגמות בוטים (מי סורק · מוגש/חסום · לפי בוט · Top תוכן) ──
const BOT_COLOR = { Googlebot: "#4caf50", Bingbot: "#0a84ff", "GPTBot (OpenAI)": "#10a37f", GPTBot: "#10a37f", ClaudeBot: "#d97757", PerplexityBot: "#a78bfa", Meta: "#3b7bff", Amazonbot: "#ff9900", Applebot: "#a1a1a6", Yandex: "#ff3b30", Baidu: "#4b56e0", DuckDuckBot: "#de5833", AhrefsBot: "#ff6b35", SemrushBot: "#ff642d", MJ12bot: "#c0392b", ubermetrics: "#b08d57", UptimeMonitor: "#7f8c8d", other: "#8696a0" };
function CrawlSpark({ series, color }) {
  const vals = (series || []).map(s => Number(s.hits) || 0);
  const max = Math.max(1, ...vals);
  return <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 20 }}>
    {vals.map((v, i) => <span key={i} style={{ width: 5, height: `${v ? Math.max(10, Math.round(v / max * 100)) : 6}%`, minHeight: 2, background: color, borderRadius: 1, opacity: v ? 1 : 0.22 }} />)}
  </span>;
}
function CrawlIntel() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getCrawlIntel(days).then(x => { setD(x); setLoading(false); }).catch(() => setLoading(false)); }, [days]);
  const fmt = n => Number(n || 0).toLocaleString("he");
  if (loading && !d) return <div style={card}><Loading /></div>;
  if (!d) return null;
  const t = d.totals || {}, total = (Number(t.served) || 0) + (Number(t.blocked) || 0);
  const pctBlocked = total ? Math.round((Number(t.blocked) || 0) / total * 100) : 0;
  const kd = d.kind_daily || [], kmax = Math.max(1, ...kd.map(x => (Number(x.served) || 0) + (Number(x.blocked) || 0)));
  return (
    <div style={{ ...card, borderColor: "rgba(150,120,220,.4)", background: "rgba(120,90,200,.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ color: "#b9a6ff", fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>🕷️ Crawl Intelligence — מי סורק אותך</div>
        <span style={{ flex: 1 }} />
        <div style={segWrap}>{[[7, "7 ימים"], [14, "14"], [30, "30"]].map(([k, l]) => <button key={k} onClick={() => setDays(k)} style={segBtn(days === k)}>{l}</button>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 10, marginBottom: 12 }}>
        <Stat label="✅ מוגש (בקשות)" value={fmt(t.served)} />
        <Stat label="🚫 נחסם" value={fmt(t.blocked)} />
        <Stat label="🤖 סורקים" value={fmt(t.crawlers)} />
        <Stat label="📊 % חסום" value={pctBlocked + "%"} />
      </div>
      {kd.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>🟩 מוגש מול 🟥 חסום · {days} ימים</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>
            {kd.map((x, i) => { const s = Number(x.served) || 0, b = Number(x.blocked) || 0, tot = s + b, h = Math.round(tot / kmax * 100), sh = tot ? Math.round(s / tot * h) : 0, bh = Math.max(0, h - sh);
              return <div key={i} title={`${x.day} · מוגש ${fmt(s)} · חסום ${fmt(b)}`} style={{ flex: "1 0 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ height: `${bh}%`, background: "#c0546a", borderRadius: "3px 3px 0 0" }} />
                <div style={{ height: `${sh}%`, background: "#4ea36b" }} />
              </div>; })}
          </div>
        </div>
      )}
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>📈 לפי בוט · {days} ימים {(!d.by_bot || !d.by_bot.length) && <span style={{ color: C.muted, fontWeight: 400, fontSize: 11 }}>(מתחיל להיאסף מהיום)</span>}</div>
      {d.by_bot && d.by_bot.length > 0 ? (
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {d.by_bot.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: BOT_COLOR[b.bot] || "#8696a0", flex: "0 0 auto" }} />
              <span style={{ fontFamily: F.heading, fontSize: 12.5, color: C.goldLight, minWidth: 118 }}>{b.bot}</span>
              <CrawlSpark series={b.series} color={BOT_COLOR[b.bot] || "#8696a0"} />
              <span style={{ marginInlineStart: "auto", fontFamily: F.mono, fontSize: 12.5, color: C.goldBright }}>{fmt(b.total)}{Number(b.blocked) > 0 && <span style={{ color: "#c0546a" }}> · חסום {fmt(b.blocked)}</span>}</span>
            </div>
          ))}
        </div>
      ) : <div style={{ ...card, color: C.muted, fontSize: 12, marginBottom: 14 }}>אוסף נתונים — יופיע תוך יום-יומיים (המדידה התחילה עכשיו).</div>}
      {d.by_bucket && d.by_bucket.length > 0 && (<>
        <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>🔥 Top דליי-תוכן שנסרקו</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {d.by_bucket.map((x, i) => <span key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.goldLight, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px" }}>{x.bucket} · <b style={{ fontFamily: F.mono }}>{fmt(x.hits)}</b></span>)}
        </div>
      </>)}
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>🔍 מי סורק (מזוהה · מצטבר)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(d.bot_seen || []).map((x, i) => <span key={i} style={{ fontFamily: F.body, fontSize: 11.5, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 9px" }}><span style={{ color: BOT_COLOR[x.bot] || "#8696a0" }}>●</span> {x.bot} · {fmt(x.hits)}</span>)}
      </div>
    </div>
  );
}

// ── שני מונים אחידים: «כולל בוטים» מול «אנשים בלבד» ──
// מקור-על (comp) = edge_geo_log, אחיד ל-3 שבועות בלי מדרגה; ביקורים (visits) = site_visits מהיום.
function TwoMeterPanel() {
  const [comp, setComp] = useState(null);
  const [vm, setVm] = useState(null);
  const [src, setSrc] = useState("comp");
  const [selDay, setSelDay] = useState(null);   // יום נבחר (לחיצה על עמודה)
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  useEffect(() => {
    getTrafficComposition(21).then(setComp).catch(() => setComp([]));
    getVisitsTwoMeter(21).then(setVm).catch(() => setVm([]));
  }, []);
  useEffect(() => {
    if (!selDay) { setDetail(null); return; }
    let alive = true; setDetailBusy(true);
    getTrafficDayDetail(selDay)
      .then(d => { if (alive) { setDetail(d); setDetailBusy(false); } })
      .catch(() => { if (alive) { setDetail(null); setDetailBusy(false); } });
    return () => { alive = false; };
  }, [selDay]);
  const rows = ((src === "comp" ? comp : vm) || []).slice(-21);
  const unit = src === "comp" ? "בקשות/יום" : "ביקורים/יום";
  const max = Math.max(1, ...rows.map(r => Number(r.total) || 0));
  const last = rows[rows.length - 1];
  const fmt = n => Number(n || 0).toLocaleString("he");
  const dec = p => { try { return decodeURIComponent(p); } catch { return p; } };
  return (
    <div style={{ ...card, borderColor: "rgba(120,150,220,0.4)", background: "rgba(90,120,200,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ color: "#9bb6ff", fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>📊 שני מונים — כולל בוטים מול אנשים</div>
        <span style={{ flex: 1 }} />
        <div style={segWrap}>
          {[["comp", "אחיד · 3 שבועות"], ["visits", "ביקורים · מהיום"]].map(([k, l]) =>
            <button key={k} onClick={() => setSrc(k)} style={segBtn(src === k)}>{l}</button>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontFamily: F.body, fontSize: 12, color: C.muted }}>
        <span>🟩 אנשים</span><span>🟧 בוטים</span><span>גובה-העמודה = סה״כ כולל בוטים</span><span style={{ color: "#9bb6ff" }}>👆 לחצו על יום לפירוט</span>
      </div>
      {!rows.length ? (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, textAlign: "center", padding: 14 }}>אין נתונים בטווח.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, overflowX: "auto" }}>
            {rows.map((r, i) => {
              const total = Number(r.total) || 0, humans = Number(r.humans) || 0, bots = Number(r.bots) || 0;
              const hTot = Math.round(total / max * 100);
              const hHum = total ? Math.round(humans / total * hTot) : 0;
              const hBot = Math.max(0, hTot - hHum);
              const dd = String(r.day || "").slice(5);
              const on = selDay === r.day;
              return (
                <div key={i} onClick={() => setSelDay(on ? null : r.day)}
                  title={`${dd} · סה״כ ${fmt(total)} · אנשים ${fmt(humans)} · בוטים ${fmt(bots)} — לחצו לפירוט`}
                  style={{ flex: "1 0 14px", minWidth: 14, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", outline: on ? "2px solid #9bb6ff" : "none", outlineOffset: 1, borderRadius: 3 }}>
                  <div style={{ height: `${hBot}%`, background: "#d8934e", borderRadius: "3px 3px 0 0", opacity: on ? 1 : 0.85 }} />
                  <div style={{ height: `${hHum}%`, background: "#4ea36b", opacity: on ? 1 : 0.85 }} />
                </div>
              );
            })}
          </div>
          {last && !selDay && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginTop: 12 }}>
              <Stat label={`🟦 כולל בוטים (${unit})`} value={fmt(last.total)} />
              <Stat label="🟩 אנשים" value={fmt(last.humans)} />
              <Stat label="🟧 בוטים" value={fmt(last.bots)} />
            </div>
          )}

          {/* פירוט יום נבחר — דפים · מקורות · מדינות */}
          {selDay && (
            <div style={{ ...card, marginTop: 12, background: "rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ color: "#9bb6ff", fontFamily: F.heading, fontSize: 14, fontWeight: 800 }}>📅 פירוט {selDay}</div>
                <span style={{ flex: 1 }} />
                <button onClick={() => setSelDay(null)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "4px 12px", fontFamily: F.heading, fontSize: 12 }}>✕ סגור</button>
              </div>
              {detailBusy && !detail ? <Loading /> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
                  <DayList title="📄 דפים שנכנסו" rows={detail?.pages} render={p => ({ label: dec(p.path), total: p.total, humans: p.humans, bots: p.bots })} fmt={fmt} muted={C.muted} />
                  <DayList title="📍 מאיפה הגיעו (מקור)" rows={detail?.sources} render={s => ({ label: s.via, total: s.sessions })} fmt={fmt} muted={C.muted} />
                  <DayList title="🌍 מדינות" rows={detail?.countries} render={c => ({ label: c.country, total: c.total, humans: c.humans, bots: c.bots })} fmt={fmt} muted={C.muted} />
                </div>
              )}
            </div>
          )}

          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5, marginTop: 10, lineHeight: 1.7 }}>
            {src === "comp"
              ? "מקור: edge_geo_log (ה-middleware מתעד כל בקשה) — אחיד לכל 3 השבועות, בלי מדרגה. יחידה: בקשות-דף (לא ביקורים ייחודיים), לכן הסקאלה גבוהה מהמונה הישן."
              : "מקור: site_visits ביחידות-ביקורים. «כולל בוטים» רציף; «אנשים» (is_bot=false) נקי מהיום שבו נדלק סימון-הבוט (לפני כן חלק מהבוטים נספרו כאנשים)."}
            {" "}הפירוט: דפים ומדינות עם פילוח אנשים/בוטים; מקורות-הגעה מ-events. היום חלקי עד חצות (שעון ישראל).
          </div>
        </>
      )}
    </div>
  );
}

// שורת-פירוט קטנה ליום נבחר (דפים / מקורות / מדינות)
function DayList({ title, rows, render, fmt, muted }) {
  const list = rows || [];
  const top = Math.max(1, ...list.map(r => Number(render(r).total) || 0));
  return (
    <div>
      <div style={{ color: "#c9d4ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {!list.length ? <div style={{ color: muted, fontFamily: F.body, fontSize: 12 }}>—</div> : (
        <div style={{ display: "grid", gap: 6 }}>
          {list.map((r, i) => {
            const v = render(r);
            const pct = Math.round((Number(v.total) || 0) / top * 100);
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: F.body, fontSize: 12, color: "#dfe6ff" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", textAlign: "left", flex: 1 }}>{v.label}</span>
                  <span style={{ fontFamily: F.mono, whiteSpace: "nowrap" }}>
                    {fmt(v.total)}{v.humans != null ? <span style={{ color: "#4ea36b" }}> · {fmt(v.humans)}</span> : null}{v.bots != null && Number(v.bots) > 0 ? <span style={{ color: "#d8934e" }}> · {fmt(v.bots)}</span> : null}
                  </span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 2 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#5f7fd0", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveStatsView() {
  const mobile = useIsMobile();
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("90");
  const [gran, setGran] = useState("day");      // day | month
  const [scale, setScale] = useState("linear");  // linear | log
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);     // פירוט הדפים/מקורות ליום/חודש הנבחר
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    const days = range === "all" ? 36500 : Number(range);
    getVisitStats(days).then(d => { setS(d); setLoading(false); })
      .catch(e => { setErr(e.message || "שגיאה"); setLoading(false); });
  }, [range]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel(null); }, [gran, range]);

  // בחירת עמודה → טוענים את הדפים/מקורות של אותו יום (או חודש). ביטול בחירה → חזרה לכלל הטווח.
  useEffect(() => {
    if (!sel) { setDetail(null); setDetailBusy(false); return; }
    let alive = true;
    setDetailBusy(true);
    getVisitDetail(gran, sel.key)
      .then(d => { if (alive) { setDetail(d); setDetailBusy(false); } })
      .catch(() => { if (alive) { setDetail(null); setDetailBusy(false); } });
    return () => { alive = false; };
  }, [sel, gran]);

  // אגרגציה לפי גרנולריות
  const series = useMemo(() => {
    const daily = (s?.daily || []);
    if (gran === "month") {
      const m = {};
      daily.forEach(d => { const k = (d.date || "").slice(0, 7); if (k) { m[k] = m[k] || { views: 0, uniques: 0 }; m[k].views += d.views || 0; m[k].uniques += d.uniques || 0; } });
      return Object.entries(m).map(([key, v]) => ({ key, views: v.views, uniques: v.uniques })).sort((a, b) => a.key.localeCompare(b.key));
    }
    return daily.map(d => ({ key: d.date, views: d.views || 0, uniques: d.uniques || 0 }));
  }, [s, gran]);

  if (err) return <div style={{ color: C.crimsonLight, textAlign: "center", padding: 30 }}>{err}</div>;
  if (loading && !s) return <Loading />;

  const view = series.slice(gran === "day" ? -120 : -60);
  const max = Math.max(...view.map(x => x.views), 1);
  const { h: barH, ticks } = buildScale(max, scale);
  // נתיבים בעברית נשמרים מקודדים (%D7%...) — מפענחים לתצוגה קריאה
  const decodePath = p => { try { return decodeURIComponent(p); } catch { return p; } };
  // יום/חודש נבחר → מציגים את הדפים/מקורות שלו; אחרת כלל-הטווח.
  const usingDetail = !!(sel && detail);
  const srcPaths = usingDetail ? (detail.paths || []) : (s?.paths || []);
  const srcRefs = usingDetail ? (detail.referrers || []) : (s?.referrers || []);
  const paths = srcPaths.slice(0, 20).map(p => ({ ...p, label: decodePath(p.path) }));
  const referrers = srcRefs.slice(0, 12);
  const devices = (s?.devices || []);
  const granLabel = gran === "month" ? "חודש" : "יום";
  const empty = (s?.total_views || 0) === 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <CrawlIntel />
      <TwoMeterPanel />
      <div style={{ ...card, borderColor: "rgba(95,191,106,0.45)", background: "rgba(95,191,106,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: "#7bd087", fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>🟢 מד-הכניסות החי של האתר החדש</div>
          <span style={{ flex: 1 }} />
          <div style={segWrap}>
            {RANGES.map(([k, l]) => <button key={k} onClick={() => setRange(k)} style={segBtn(range === k)}>{l}</button>)}
          </div>
          <button onClick={load} title="רענן" style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "6px 12px", fontFamily: F.heading, fontSize: 12 }}>↻ רענן</button>
        </div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
          נאסף ישירות לבסיס הנתונים שלנו — ללא תלות בגוגל. פרטיות מלאה: בלי IP, בלי פרטים אישיים (מזהה אקראי לספירת מבקרים ייחודיים בלבד).
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <Stat label="מבקרים ייחודיים (סה״כ)" value={(s?.total_uniques || 0).toLocaleString()} />
        <Stat label="צפיות בדפים (סה״כ)" value={(s?.total_views || 0).toLocaleString()} />
        <Stat label="צפיות היום" value={(s?.today_views || 0).toLocaleString()} />
        <Stat label="🟢 פעילים עכשיו (5 דק׳)" value={(s?.active_now || 0).toLocaleString()} />
      </div>

      {empty && (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>אוספים נתונים…</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 6, lineHeight: 1.8 }}>
            המד מתחיל למדוד מרגע העלאת הגרסה הזו לאוויר. כל גלישה באתר נספרת כאן אוטומטית.<br />
            כשיתחילו להיכנס גולשים — הגרף, הדפים המובילים ומקורות התנועה יופיעו כאן בזמן אמת.
          </div>
        </div>
      )}

      {!empty && (
        <>
          {/* גרף צפיות — יום / חודש */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <H>צפיות לפי {granLabel}</H>
              <span style={{ flex: 1 }} />
              <div style={segWrap}>
                {[["linear", "רגיל"], ["log", "לוג"]].map(([k, l]) => <button key={k} onClick={() => setScale(k)} style={segBtn(scale === k)}>{l}</button>)}
              </div>
              <div style={segWrap}>
                {[["day", "יום"], ["month", "חודש"]].map(([k, l]) => <button key={k} onClick={() => setGran(k)} style={segBtn(gran === k)}>{l}</button>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 0, position: "relative", height: 190, borderInlineStart: `1px solid ${C.border}` }}>
                {ticks.map((t, i) => <div key={i} style={{ position: "absolute", insetInline: 0, bottom: `${t.pct}%`, borderTop: `1px dashed ${C.faint}`, pointerEvents: "none" }} />)}
                <div style={{ position: "absolute", inset: 0, overflowX: "auto", overflowY: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: gran === "day" ? 2 : 6, height: "100%", width: "100%", minWidth: gran === "day" && view.length > 45 ? view.length * 8 : "100%", paddingInline: 2 }}>
                    {view.map(r => (
                      <div key={r.key} onClick={() => setSel(r)} title={`${r.key}: ${r.views.toLocaleString()} צפיות · ${r.uniques.toLocaleString()} ייחודיים`}
                        style={{ flex: "1 1 0", minWidth: gran === "day" ? 3 : 14, maxWidth: gran === "day" ? 20 : "none", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer" }}>
                        <div style={{ background: sel?.key === r.key ? `linear-gradient(180deg, ${C.goldBright}, ${C.gold})` : `linear-gradient(180deg, ${C.gold}, ${C.goldDark})`, borderRadius: "3px 3px 0 0", height: `${barH(r.views)}%`, minHeight: r.views > 0 ? 2 : 0, boxShadow: sel?.key === r.key ? `0 0 12px ${C.gold}` : "none" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ width: 50, position: "relative", height: 190, flexShrink: 0 }}>
                {ticks.map((t, i) => <div key={i} style={{ position: "absolute", right: 0, bottom: `${t.pct}%`, transform: "translateY(50%)", color: C.goldDim, fontFamily: F.mono, fontSize: 10, whiteSpace: "nowrap" }}>{t.label}</div>)}
              </div>
            </div>
            {sel && (
              <div style={{ marginTop: 12, padding: "12px 16px", border: `1px solid ${C.borderGold}`, borderRadius: 12, background: "rgba(212,175,55,0.06)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>📅 {sel.key} · {sel.views.toLocaleString()} צפיות · {sel.uniques.toLocaleString()} מבקרים ייחודיים</div>
                <span style={{ flex: 1 }} />
                <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>{detailBusy ? "טוען דפים…" : "הדפים למטה מציגים את היום הזה"}</span>
                <button onClick={() => setSel(null)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "4px 12px", fontFamily: F.heading, fontSize: 12 }}>הצג הכל ✕</button>
              </div>
            )}
            <div style={{ color: C.muted, fontFamily: F.mono, fontSize: 10, marginTop: 6, textAlign: "center" }}>לחצו על עמודה כדי לראות את הדפים והמקורות של אותו {granLabel} · {view.length} {gran === "day" ? "ימים" : "חודשים"}</div>
          </div>

          {/* דפים מובילים + מאיפה הגיעו — כלל-הטווח, או היום/חודש שנבחר בגרף */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={card}>
              <H>📄 הדפים הנצפים ביותר{usingDetail ? ` · ${sel.key}` : ""}</H>
              {detailBusy ? <Empty>טוען…</Empty> : paths.length ? <BarRow items={paths} labelKey="label" valueKey="views" hrefKey="path" /> : <Empty>אין צפיות ב{granLabel} הזה.</Empty>}
            </div>
            <div style={card}>
              <H>↘ מאיפה הגיעו{usingDetail ? ` · ${sel.key}` : ""}</H>
              {detailBusy ? <Empty>טוען…</Empty> : referrers.length ? <BarRow items={referrers} labelKey="referrer" valueKey="views" /> : <Empty>אין נתונים ב{granLabel} הזה.</Empty>}
            </div>
          </div>

          {/* מקורות-הגעה מתויגים — אינסטגרם/פייסבוק (?src=ig …), אמין גם בלי referrer */}
          <ArrivalSourcesPanel />

          {/* מכשירים */}
          {devices.length > 0 && (
            <div style={card}>
              <H>📱 מכשירים</H>
              <BarRow items={devices.map(d => ({ ...d, label: d.device === "mobile" ? "📱 נייד" : d.device === "desktop" ? "🖥️ מחשב" : d.device }))} labelKey="label" valueKey="views" />
            </div>
          )}
        </>
      )}

      {/* Google Analytics — נתונים חיים אמיתיים (מקורות, מדינות, מכשירים, דפים, זמן-אמת) */}
      <GoogleAnalyticsPanel />

      {/* צמיחת תנועה לאורך הזמן — היסטוריית Jetpack + חי */}
      <TrafficHistoryPanel />

      {/* העמודים הישנים הכי נצפים (Jetpack) */}
      <LegacyTopPagesPanel />

      {/* Google Search Console — שאילתות חיפוש כנתונים, מחוברות לגרף (עץ אחד) */}
      <SearchConsolePanel />

      {/* מקורות נתונים — סטטוס חיבור חי */}
      <div style={card}>
        <H>מקורות נתונים</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "4px 0 14px" }}>הירוקים מחוברים ואוספים נתונים. האפורים יתחברו בהמשך.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {DATA_SOURCES.map(f => (
            <div key={f.name} style={{ border: `1px ${f.live ? "solid" : "dashed"} ${f.live ? "rgba(95,191,106,0.5)" : C.borderGold}`, borderRadius: 12, padding: "14px 16px", opacity: f.live ? 1 : 0.85, background: f.live ? "rgba(95,191,106,0.06)" : "transparent" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{f.name}</div>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>{f.desc}</div>
              <div style={{ marginTop: 8, display: "inline-block", fontFamily: F.heading, fontSize: 11, borderRadius: 999, padding: "2px 10px",
                color: f.live ? "#5fbf6a" : C.goldDim, border: `1px solid ${f.live ? "rgba(95,191,106,0.5)" : C.border}`, fontWeight: 700 }}>
                {f.live ? "✅ מחובר" : "🔌 בקרוב"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== ↗ מקורות-הגעה מתויגים (אינסטגרם / פייסבוק) =====
// מודד מאיפה נכנסו דרך קישורים מתויגים (?src=ig …) — אמין גם כשה-referrer ריק
// (אינסטגרם/פייסבוק מוחקים referrer בדפדפן הפנימי). מקור: visitor_events (section='arrival').
// הערוצים הקנוניים שמפרסמים — תג, תווית-תצוגה ודף-נחיתה. עץ אחד: הקישור מפנה לדף קיים.
const ARRIVAL_CHANNELS = [
  { tag: "ig",        label: "📸 אינסטגרם · קוד המציאות",  path: "/reality" },
  { tag: "fb-code",   label: "👍 פייסבוק · קוד המציאות",   path: "/reality" },
  { tag: "fb-meluha", label: "👑 פייסבוק · כי לה׳ המלוכה", path: "/" },
  // 🔗 לינקים פרטיים מתויגים — להפצה אישית (וואטסאפ/טלגרם). כך יודעים כמה נכנסו דרך כל לינק.
  { tag: "bm",        label: "📖 בית המדרש · לינק פרטי",   path: "/beit-midrash" },
  { tag: "heichal",   label: "🏛️ היכל הגילוי · לינק פרטי", path: "/research" },
  { tag: "code",      label: "🔍 הצופן התנ״כי · לינק פרטי", path: "/code" },
];
function ArrivalSourcesPanel() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState("30");
  const [copied, setCopied] = useState("");
  const load = useCallback(() => {
    setErr("");
    const days = range === "all" ? 36500 : Number(range);
    getArrivalSources(days).then(setD).catch(e => setErr(e.message || "שגיאה"));
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
  const linkFor = ch => `${origin}${ch.path}?src=${ch.tag}`;
  const copy = ch => {
    try { navigator.clipboard?.writeText(linkFor(ch)); setCopied(ch.tag); setTimeout(() => setCopied(""), 1600); } catch { /* noop */ }
  };

  const byTag = (d?.by_tag) || [];
  const stat = tag => byTag.find(r => r.tag === tag) || { visitors: 0, today: 0, hits: 0 };
  // תגים שנקלטו אך אינם ברשימת הערוצים הקנוניים (תיוגים נוספים / ניחושי referrer)
  const known = new Set(ARRIVAL_CHANNELS.map(c => c.tag));
  const others = byTag.filter(r => !known.has(r.tag));

  return (
    <div style={{ ...card, borderColor: "rgba(62,166,255,0.4)", background: "rgba(62,166,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <H>↗ מקורות-הגעה מתויגים</H>
        <span style={{ flex: 1 }} />
        <div style={segWrap}>
          {RANGES.map(([k, l]) => <button key={k} onClick={() => setRange(k)} style={segBtn(range === k)}>{l}</button>)}
        </div>
        <button onClick={load} title="רענן" style={{ cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "6px 12px", fontFamily: F.heading, fontSize: 12 }}>↻</button>
      </div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, margin: "2px 0 14px", lineHeight: 1.7 }}>
        כמה נכנסו דרך הקישורים שמפרסמים ברשתות — <b style={{ color: "#7cc0ff" }}>אמין גם כשאין referrer</b> (אינסטגרם/פייסבוק מוחקים אותו). העתיקו את הקישור המתויג לכל ערוץ ושימו אותו ב-bio / בפוסט.
      </div>

      {err && <Empty>{err}</Empty>}

      <div style={{ display: "grid", gap: 10 }}>
        {ARRIVAL_CHANNELS.map(ch => {
          const s = stat(ch.tag);
          return (
            <div key={ch.tag} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{ch.label}</div>
                <span style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#7cc0ff", fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{(s.today || 0).toLocaleString()}</div>
                    <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5 }}>היום</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{(s.visitors || 0).toLocaleString()}</div>
                    <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5 }}>בטווח</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code style={{ flex: 1, minWidth: 180, color: C.muted, fontFamily: F.mono, fontSize: 11.5, background: "rgba(0,0,0,0.25)", border: `1px solid ${C.faint}`, borderRadius: 8, padding: "6px 10px", overflowX: "auto", whiteSpace: "nowrap" }} dir="ltr">{linkFor(ch)}</code>
                <button onClick={() => copy(ch)} style={{ cursor: "pointer", background: copied === ch.tag ? "rgba(95,191,106,0.15)" : "none", border: `1px solid ${copied === ch.tag ? "rgba(95,191,106,0.5)" : C.borderGold}`, color: copied === ch.tag ? "#7bd087" : C.goldLight, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {copied === ch.tag ? "✓ הועתק" : "העתק קישור"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <H>תגים נוספים שנקלטו</H>
          <BarRow items={others.map(r => ({ label: `${r.tag}${r.tagged ? "" : " (נוחש)"}`, visitors: r.visitors }))} labelKey="label" valueKey="visitors" />
        </div>
      )}

      {byTag.length === 0 && !err && (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, textAlign: "center", padding: "10px 0", lineHeight: 1.7 }}>
          עדיין אין כניסות מתויגות. ברגע שיפרסמו את הקישורים למעלה ויתחילו להיכנס דרכם — הספירה תופיע כאן (מצטבר קדימה מרגע הפרסום).
        </div>
      )}
    </div>
  );
}

// ===== 📊 צמיחת התנועה לאורך הזמן (היסטוריית Jetpack + חי) =====
function TrafficHistoryPanel() {
  const mob = useIsMobile();
  const [gran, setGran] = useState("week"); // day | week | month | year
  const [metric, setMetric] = useState("views"); // views | users (GA activeUsers)
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [ga, setGa] = useState(null);      // סטטוס סנכרון GA
  const [gaBusy, setGaBusy] = useState(false);
  const [sel, setSel] = useState(null);    // עמודה שנבחרה (הקשה → קריאת המספר)
  const load = useCallback(() => {
    setRows(null); setErr("");
    getTrafficHistory(gran).then(setRows).catch(e => setErr(e.message || "שגיאה"));
  }, [gran]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel(null); }, [gran]); // החלפת תצוגה → מאפסים בחירה

  const runGaSync = useCallback(async () => {
    setGaBusy(true);
    try {
      const r = await syncGoogleAnalytics();
      setGa(r);
      if (r && r.written > 0) load(); // נכנסו נתונים חדשים → רענון הגרף
    } catch (e) { setGa({ error: e.message || "שגיאה" }); }
    finally { setGaBusy(false); }
  }, [load]);

  // סנכרון GA אוטומטי פעם אחת בטעינת הפאנל (ממלא פערים אוטומטית)
  const gaRan = useRef(false);
  useEffect(() => { if (!gaRan.current) { gaRan.current = true; runGaSync(); } }, [runGaSync]);

  // ממיינים בעצמנו לפי תאריך — Supabase/PostgREST לא מתחייב לשמור את סדר ה-RPC.
  // תצוגת "ימים" = רק העידן החדש (2026), כך מגדירה ה-RPC — מציגים את כולו (≈170 יום).
  // ההיסטוריה הישנה חיה בשבועות/חודשים/שנים. שבועות = שנתיים אחרונות (אחרת אלפי עמודות).
  const shown = useMemo(() => {
    if (!rows) return [];
    const sorted = [...rows].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const cap = gran === "week" ? 104 : null;
    return cap ? sorted.slice(-cap) : sorted;
  }, [rows, gran]);
  const bw = mob ? 16 : 24;        // רוחב עמודה
  const gap = mob ? 4 : 6;
  const colMin = mob ? 22 : 36;

  // סדר תצוגה: העדכני ביותר ראשון (יושב בקצה ימין ב-RTL) — גלוי מיד, בלי גלילה אוטומטית.
  const display = useMemo(() => [...shown].reverse(), [shown]);

  // ציר-מד שמסתדר אוטומטית לעמודות הנראות כרגע על המסך (לא תלוי בכיוון/scrollLeft).
  // מודד אילו עמודות נמצאות בתוך חלון-הראייה לפי מיקום בפועל (getBoundingClientRect).
  const scrollRef = useRef(null);
  const [viewMax, setViewMax] = useState(1);
  const pitch = colMin + gap;
  const recomputeViewMax = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cont = el.getBoundingClientRect();
    let m = 1;
    el.querySelectorAll("[data-v]").forEach(node => {
      const r = node.getBoundingClientRect();
      if (r.right > cont.left + 1 && r.left < cont.right - 1) {
        const v = +node.getAttribute("data-v") || 0;
        if (v > m) m = v;
      }
    });
    setViewMax(m);
  }, []);
  // כיול הציר אחרי שה-layout מוכן (וכשמחליפים תצוגה).
  useEffect(() => {
    const raf = requestAnimationFrame(recomputeViewMax);
    const t = setTimeout(recomputeViewMax, 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [display, metric, recomputeViewMax]);
  const scrollTick = useRef(false);
  const onScroll = useCallback(() => {
    if (scrollTick.current) return;
    scrollTick.current = true;
    requestAnimationFrame(() => { scrollTick.current = false; recomputeViewMax(); });
  }, [recomputeViewMax]);
  const isUsers = metric === "users";
  const val = r => isUsers ? (r?.users || 0) : (r?.views || 0);
  const total = shown.reduce((s, r) => s + val(r), 0);
  const peak = shown.reduce((a, r) => val(r) > val(a) ? r : a, shown[0] || {});
  const { h: barH, ticks } = buildScale(viewMax, "linear"); // ציר-מד מתכוונן + קווי-עזר
  const BZ = mob ? 120 : 140, LBL = 16;                  // גובה אזור-העמודות + תווית
  const fmtLabel = p => {
    const s = String(p);
    if (gran === "year") return s.slice(0, 4);
    if (gran === "month") return `${s.slice(5, 7)}/${s.slice(2, 4)}`;
    return `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  };
  const fmtPeriod = p => {
    const s = String(p);
    if (gran === "year") return s.slice(0, 4);
    if (gran === "month") return `${s.slice(5, 7)}/${s.slice(0, 4)}`;
    return s.slice(0, 10).split("-").reverse().join("/");
  };
  const selRow = sel ? shown.find(r => r.period === sel) : null;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>📊</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>צמיחת התנועה לאורך הזמן</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>קו רציף — <span style={{ color: C.goldBright }}>🟡 Jetpack (עבר)</span> · <span style={{ color: "#4caf50" }}>🟢 האתר החדש (חי)</span></div>
        </div>
        <button onClick={runGaSync} disabled={gaBusy} title="משיכת נתונים מ-Google Analytics" style={{ ...segBtn(false), opacity: gaBusy ? 0.5 : 1, cursor: gaBusy ? "default" : "pointer" }}>{gaBusy ? "מסנכרן…" : "🔄 GA"}</button>
        <div style={segWrap}>
          {[["views", "צפיות"], ["users", "Users"]].map(([k, l]) => (
            <button key={k} onClick={() => setMetric(k)} style={segBtn(metric === k)}>{l}</button>
          ))}
        </div>
        <div style={segWrap}>
          {[["day", "ימים"], ["week", "שבועות"], ["month", "חודשים"], ["year", "שנים"]].map(([k, l]) => (
            <button key={k} onClick={() => setGran(k)} style={segBtn(gran === k)}>{l}</button>
          ))}
        </div>
      </div>
      {ga && (ga.configured === false || ga.error || ga.written > 0) && (
        <div style={{ color: ga.error ? C.crimsonLight : C.muted, fontFamily: F.body, fontSize: 11.5, marginBottom: 8 }}>
          {ga.configured === false ? "GA עדיין לא מחובר — ראה הוראות הקמה למטה."
            : ga.error ? `GA: ${ga.error}`
            : `✓ סונכרנו ${ga.written} ימים מ-Google Analytics`}
        </div>
      )}

      {err ? <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, padding: 12 }}>שגיאה: {err}</div>
        : !rows ? <Loading />
        : !rows.length ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.9, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            עוד אין נתונים בתצוגה הזו. שלח לי את מספרי ה-<b style={{ color: C.goldLight }}>Jetpack</b> (צילום מסך של הסטטיסטיקות לפי שנים/חודשים) ואטען אותם לכאן — והגרף יידלק.
          </div>
        ) : (
          <>
            {/* סיכום: סה״כ + שיא */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", color: C.goldLight, fontFamily: F.body, fontSize: 13, marginBottom: 8 }}>
              <span>{gran === "day" ? "סה״כ ב-2026" : "סה״כ בתצוגה"}: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{total.toLocaleString()}</b> {isUsers ? "Users" : "צפיות"}</span>
              {peak && val(peak) > 0 && <span style={{ color: C.muted }}>שיא: <b style={{ color: C.goldBright, fontFamily: F.mono }}>{val(peak).toLocaleString()}</b> ({fmtPeriod(peak.period)})</span>}
              {isUsers && total === 0 && <span style={{ color: C.muted }}>— לחצו «🔄 GA» למשיכת ה-Users (סנכרון ראשון ממלא גם אחורה)</span>}
            </div>

            {/* קריאת העמודה שנבחרה (הקשה) — עובד גם בנייד */}
            <div style={{ minHeight: 30, marginBottom: 6 }}>
              {selRow ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "5px 12px", borderRadius: 999, border: `1px solid ${selRow.live_views > 0 ? "rgba(76,175,80,0.5)" : C.borderGold}`, background: selRow.live_views > 0 ? "rgba(76,175,80,0.08)" : "rgba(212,175,55,0.06)" }}>
                  <span style={{ color: selRow.live_views > 0 ? "#7bd087" : C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                    {selRow.live_views > 0 ? "🟢" : "🟡"} {fmtPeriod(selRow.period)}
                  </span>
                  <span style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 13 }}>{val(selRow).toLocaleString()} {isUsers ? "Users" : "צפיות"}{!isUsers && selRow.live_views > 0 ? ` · חי: ${selRow.live_views.toLocaleString()}` : ""}</span>
                  <button onClick={() => setSel(null)} title="סגור" style={{ cursor: "pointer", background: "none", border: "none", color: C.muted, fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              ) : <span style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>העדכני ביותר בקצה שמאל ← · הקש על עמודה לראות את המספר · גלול ימינה לחזור אחורה בזמן</span>}
            </div>

            {/* גרף: עמודות (נגלל) + ציר-מד אנכי בצד (כמות גלישה) */}
            <div style={{ display: "flex", gap: 6 }}>
              <div ref={scrollRef} onScroll={onScroll} dir="ltr" style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap, height: BZ + LBL, minWidth: shown.length * pitch + 8, paddingInline: 2 }}>
                  {ticks.map((t, i) => (
                    <div key={"g" + i} style={{ position: "absolute", left: 0, right: 0, bottom: LBL + (t.pct / 100) * BZ, borderTop: `1px dashed ${C.faint}`, pointerEvents: "none" }} />
                  ))}
                  {display.map((r, i) => {
                    const v = val(r), live = r.live_views || 0;
                    const totalH = v > 0 ? Math.max(2, Math.round((barH(v) / 100) * BZ)) : 0;
                    const liveH = !isUsers && live > 0 ? Math.max(2, Math.round((barH(live) / 100) * BZ)) : 0;
                    const jpH = Math.max(0, totalH - liveH);
                    const active = sel === r.period;
                    return (
                      <div key={i} data-v={v} onClick={() => setSel(active ? null : r.period)}
                        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: BZ + LBL, minWidth: colMin, cursor: "pointer", borderRadius: 6, background: active ? "rgba(212,175,55,0.14)" : "transparent" }}>
                        <div title={`${r.period}: ${v.toLocaleString()}${!isUsers && live ? ` (חי: ${live})` : ""}`} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: bw, height: BZ }}>
                          {isUsers ? (
                            totalH > 0 && <div style={{ width: bw, height: totalH, background: "linear-gradient(to top, #2f5fd0, #6f9bff)", borderRadius: "4px 4px 0 0", outline: active ? "2px solid #9bb6ff" : "none", transition: "height .25s ease" }} />
                          ) : (<>
                            {liveH > 0 && <div style={{ width: bw, height: liveH, background: "linear-gradient(to top, #2e7d32, #4caf50)", borderRadius: "4px 4px 0 0", outline: active ? "2px solid #7bd087" : "none", transition: "height .25s ease" }} />}
                            {jpH > 0 && <div style={{ width: bw, height: jpH, background: `linear-gradient(to top, ${C.goldDim}, ${C.goldBright})`, borderRadius: liveH > 0 ? 0 : "4px 4px 0 0", outline: active && liveH === 0 ? `2px solid ${C.goldBright}` : "none", transition: "height .25s ease" }} />}
                          </>)}
                        </div>
                        <span style={{ height: LBL, lineHeight: `${LBL}px`, fontSize: mob ? 8.5 : 9.5, color: active ? C.goldBright : C.muted, fontFamily: F.mono, whiteSpace: "nowrap" }}>{fmtLabel(r.period)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* ציר-המד: כמות גלישה */}
              <div style={{ width: 38, position: "relative", height: BZ + LBL, flexShrink: 0, borderInlineStart: `1px solid ${C.border}` }}>
                {ticks.map((t, i) => (
                  <div key={i} style={{ position: "absolute", insetInlineStart: 4, bottom: LBL + (t.pct / 100) * BZ, transform: "translateY(50%)", color: C.goldDim, fontFamily: F.mono, fontSize: 10, whiteSpace: "nowrap" }}>{t.label}</div>
                ))}
              </div>
            </div>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1, textAlign: "center", marginTop: 3 }}>↑ מד כמות גלישה · הציר מתכוונן אוטומטית למה שרואים</div>
          </>
        )}
    </div>
  );
}

// ===== 📄 ארכיון: העמודים הישנים הכי נצפים (Jetpack top-posts) — מגירה סגורה =====
function LegacyTopPagesPanel() {
  const mob = useIsMobile();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open || rows) return;
    getLegacyTopPages(15).then(setRows).catch(e => setErr(e.message || "שגיאה"));
  }, [open, rows]);
  const max = Math.max(1, ...(rows || []).map(r => r.views || 0));

  return (
    <div style={card}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "right" }}>
        <span style={{ fontSize: 22 }}>🗄️</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>ארכיון — העמודים הישנים הכי נצפים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>מה משך הכי הרבה צפיות באתר הישן (Jetpack)</div>
        </div>
        <span style={{ color: C.goldDim, fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
      </button>
      {open && <div style={{ marginTop: 12 }}>
      {err ? <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, padding: 12 }}>שגיאה: {err}</div>
        : !rows ? <Loading />
        : !rows.length ? <Empty>אין נתונים.</Empty>
        : (
          <div style={{ display: "grid", gap: mob ? 10 : 8 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: mob ? 8 : 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: mob ? 13 : 14, lineHeight: 1.45, wordBreak: "break-word" }}>
                    <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>{i + 1}.</span> {r.title}
                  </div>
                  <div style={{ height: 5, background: C.border, borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((r.views / max) * 100)}%`, background: `linear-gradient(to left, ${C.goldDim}, ${C.goldBright})` }} />
                  </div>
                </div>
                <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: mob ? 13 : 14, whiteSpace: "nowrap" }}>{(r.views || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}

// ===== 📈 Google Analytics — נתונים חיים אמיתיים (GA4 Data API) =====
const GA_CHANNEL_HE = {
  "Organic Search": "חיפוש אורגני", "Direct": "ישיר", "Referral": "הפניה",
  "Organic Social": "רשתות חברתיות", "Social": "רשתות חברתיות", "Email": "מייל",
  "Paid Search": "חיפוש ממומן", "Display": "באנרים", "(Unassigned)": "לא משויך",
  "Organic Shopping": "קניות", "Affiliates": "שותפים", "Audio": "אודיו", "Video": "וידאו",
};
const GA_DEVICE_HE = { desktop: "מחשב 🖥️", mobile: "נייד 📱", tablet: "טאבלט", smart_tv: "טלוויזיה" };
const GA_NEWRET_HE = { new: "🆕 חדשים", returning: "🔁 חוזרים", "(not set)": "לא ידוע" };
const gaName = (s, map) => map[s] || s;
// פורמט זמן שהייה (שניות → דק׳:שנ׳) ואחוז מעורבות
const fmtDur = sec => { sec = Math.round(sec || 0); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m}:${String(s).padStart(2, "0")} דק׳` : `${s} ש׳`; };
const fmtPct = r => `${Math.round((r || 0) * 100)}%`;

// items של [{key,value}] או רב-מדדים; valKey בוחר את שדה-הערך, note שורת-משנה אופציונלית
function GaList({ title, items, fmt, valKey = "value", note, valFmt }) {
  const max = Math.max(1, ...(items || []).map(i => i[valKey] || 0));
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 7 }}>
        {(items || []).length ? items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt ? fmt(it.key) : it.key}</div>
              {note && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{note(it)}</div>}
              <div style={{ height: 4, background: C.border, borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round(((it[valKey] || 0) / max) * 100)}%`, background: `linear-gradient(to left, ${C.goldDim}, ${C.goldBright})` }} />
              </div>
            </div>
            <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13 }}>{valFmt ? valFmt(it[valKey]) : (it[valKey] || 0).toLocaleString()}</div>
          </div>
        )) : <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>אין נתונים בטווח.</div>}
      </div>
    </div>
  );
}

// גרף-עמודות זעיר (מגמה יומית / שעות היום)
function GaBars({ title, items, fmtKey }) {
  const vals = (items || []).map(i => i.users ?? i.value ?? 0);
  const max = Math.max(1, ...vals);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {(items || []).length ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}>
          {items.map((it, i) => {
            const v = it.users ?? it.value ?? 0;
            return <div key={i} title={`${fmtKey ? fmtKey(it.key) : it.key}: ${v.toLocaleString()}`}
              style={{ flex: 1, minWidth: 2, height: `${Math.max(2, Math.round((v / max) * 100))}%`, background: "linear-gradient(to top, #B8860B, #E8C84A)", borderRadius: "2px 2px 0 0" }} />;
          })}
        </div>
      ) : <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>אין נתונים בטווח.</div>}
    </div>
  );
}

function GoogleAnalyticsPanel() {
  const [days, setDays] = useState("28");
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true); setErr("");
    getGaInsights(Number(days)).then(r => { setD(r); setLoading(false); }).catch(e => { setErr(e.message || "שגיאה"); setLoading(false); });
  }, [days]);

  const stat = (label, val, accent) => (
    <div style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ color: accent || C.goldBright, fontFamily: F.mono, fontSize: 19, fontWeight: 700 }}>{(val || 0).toLocaleString()}</div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>{label}</div>
    </div>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>📈</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>Google Analytics — נתונים חיים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>תנועה · זמן שהייה לפי מדינה · ערים · מקורות · טכנולוגיה · דפים · מגמות · זמן-אמת</div>
        </div>
        {d?.configured && !d.error && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#4caf50", fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 6px #4caf50" }} />
            {d.realtime} עכשיו
          </span>
        )}
        <div style={segWrap}>
          {[["7", "7 ימים"], ["28", "28 יום"], ["90", "90 יום"]].map(([k, l]) => (
            <button key={k} onClick={() => setDays(k)} style={segBtn(days === k)}>{l}</button>
          ))}
        </div>
      </div>

      {!CLARITY_CONFIGURED && (
        <div style={{ background: "rgba(127,200,255,0.07)", border: "1px solid rgba(127,200,255,0.25)", borderRadius: 10, padding: "10px 13px", marginBottom: 12, color: C.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
          💡 <b style={{ color: C.goldLight }}>הקלטות גולשים + מפות חום (Microsoft Clarity — חינם):</b> צרו פרויקט ב-<span style={{ fontFamily: F.mono }}>clarity.microsoft.com</span>, והוסיפו את ה-Project ID כמשתנה <span style={{ fontFamily: F.mono }}>VITE_CLARITY_ID</span> ב-Vercel. הקוד כבר מוכן — יופעל לבד.
        </div>
      )}
      {loading ? <Loading />
        : err ? <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, padding: 12 }}>שגיאה: {err}</div>
        : !d ? <Empty>צריך להיות מחובר כמנהל.</Empty>
        : d.configured === false ? <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: 12 }}>GA עדיין לא מחובר (חסר GA_PROPERTY_ID).</div>
        : d.error ? <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 12.5, padding: 12, lineHeight: 1.7 }}>GA החזיר שגיאה:<br /><span style={{ fontFamily: F.mono, fontSize: 11.5, color: C.goldDim }}>{d.error}</span></div>
        : (
          <div style={{ display: "grid", gap: 18 }}>
            {/* סך הכל + מעורבות */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 10 }}>
              {stat("🟢 כעת באתר", d.realtime, "#4caf50")}
              {stat("משתמשים", d.totals?.users)}
              {stat("חדשים", d.totals?.newUsers)}
              {stat("הפעלות", d.totals?.sessions)}
              {stat("צפיות בדפים", d.totals?.views)}
              <div style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 17, fontWeight: 700 }}>{fmtDur(d.totals?.avgEngagementSec)}</div>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>⏱️ זמן שהייה ממוצע</div>
              </div>
              <div style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 17, fontWeight: 700 }}>{fmtPct(d.totals?.engagementRate)}</div>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>🔥 שיעור מעורבות</div>
              </div>
              <div style={{ background: "rgba(8,5,2,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 17, fontWeight: 700 }}>{fmtPct(d.totals?.bounceRate)}</div>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 11.5 }}>↩️ שיעור נטישה</div>
              </div>
            </div>

            {/* זמן-אמת: מה צופים עכשיו */}
            {d.realtime > 0 && d.realtimePages?.length > 0 && (
              <div style={{ background: "rgba(76,175,80,0.07)", border: "1px solid rgba(76,175,80,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                <GaList title="🟢 מה צופים עכשיו (זמן-אמת)" items={d.realtimePages} />
              </div>
            )}

            {/* גיאוגרפיה — מדינות עם זמן שהייה (כולל ישראל) + ערים */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
              <GaList title="🌍 מדינות · זמן שהייה" items={d.countries} valKey="users"
                note={it => `⏱️ ${fmtDur(it.avgSec)} · מעורבות ${fmtPct(it.engRate)}`} />
              <GaList title="🏙️ ערים" items={d.cities} />
            </div>

            {/* רכישה — מאיפה מגיעים */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
              <GaList title="🔗 ערוצי תנועה" items={d.channels} fmt={k => gaName(k, GA_CHANNEL_HE)} />
              <GaList title="🌐 מקורות" items={d.sources} />
              <GaList title="📨 מדיום" items={d.mediums} />
            </div>

            {/* טכנולוגיה */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
              <GaList title="📱 מכשירים" items={d.devices} fmt={k => gaName(k, GA_DEVICE_HE)} />
              <GaList title="💻 מערכת הפעלה" items={d.os} />
              <GaList title="🌐 דפדפן" items={d.browsers} />
              <GaList title="🗣️ שפה" items={d.langs} />
            </div>

            {/* תוכן — דפים עם זמן + נחיתה + חדשים/חוזרים */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
              <GaList title="📄 דפים נצפים · זמן" items={d.pages} valKey="views" note={it => `⏱️ ${fmtDur(it.avgSec)}`} />
              <GaList title="🛬 דפי נחיתה" items={d.landing} />
              <GaList title="🆕 חדשים מול חוזרים" items={d.newReturning} fmt={k => gaName(k, GA_NEWRET_HE)} />
            </div>

            {/* מגמות */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              <GaBars title="📅 מגמה יומית (משתמשים)" items={d.daily} fmtKey={k => k && k.length === 8 ? `${k.slice(6, 8)}/${k.slice(4, 6)}` : k} />
              <GaBars title="🕐 שעות היום (פעילות)" items={d.hours} fmtKey={k => `${k}:00`} />
            </div>
          </div>
        )}
    </div>
  );
}

// ===== 🔎 Google Search Console — שאילתות חיפוש מחוברות לגרף (עץ אחד) =====
// כל שאילתה → ישות בגרף: מספר → /number/:n, ביטוי → מחשבון בית-המדרש.
function scQueryLink(q) {
  const t = (q || "").trim();
  return /^\d+$/.test(t) ? `/number/${t}` : `/beit-midrash?w=${encodeURIComponent(t)}`;
}
function SearchConsolePanel() {
  const mob = useIsMobile();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");
  useEffect(() => {
    setLoading(true); setErr("");
    getSearchConsole(Number(days)).then(r => { setD(r); setLoading(false); })
      .catch(e => { setErr(e.message || "שגיאה"); setLoading(false); });
  }, [days]);

  const decode = p => { try { return decodeURIComponent(p.replace(/^https?:\/\/[^/]+/, "")) || "/"; } catch { return p; } };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>🔎</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>מה חיפשו בגוגל (Search Console)</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12 }}>כל חיפוש מקושר לישות בגרף — לחיצה פותחת אותו</div>
        </div>
        {d?.queries && (
          <div style={segWrap}>
            {[["30", "30 יום"], ["90", "90 יום"], ["480", "16 חודש"]].map(([k, l]) => (
              <button key={k} onClick={() => setDays(k)} style={segBtn(days === k)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? <Loading />
        : err ? <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, padding: 12 }}>שגיאה: {err}</div>
        : !d ? <Empty>צריך להיות מחובר כמנהל.</Empty>
        : d.configured === false ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.95, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ color: C.goldLight, fontWeight: 700, marginBottom: 4 }}>עוד לא מחובר — חיבור חד-פעמי (≈10 דק׳):</div>
            1. ב-<a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={linkA}>Google Cloud</a> → צרו פרויקט → הפעילו <b style={{ color: C.goldLight }}>Search Console API</b>.<br />
            2. צרו <b style={{ color: C.goldLight }}>Service Account</b> → מפתח חדש (JSON).<br />
            3. ב-Search Console → הגדרות → משתמשים → הוסיפו את כתובת המייל של ה-Service Account (הרשאת קריאה).<br />
            4. ב-Vercel → Settings → Environment Variables → הוסיפו <b style={{ color: C.goldLight }}>GSC_SERVICE_ACCOUNT</b> = תוכן ה-JSON המלא → Redeploy.
          </div>
        ) : d.error ? (
          <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 12.5, padding: 12, lineHeight: 1.7 }}>
            החיבור הוגדר אך גוגל החזיר שגיאה:<br /><span style={{ fontFamily: F.mono, fontSize: 11.5, color: C.goldDim }}>{d.error}</span>
            <div style={{ marginTop: 6, color: C.muted }}>בדקו ש-ה-Service Account נוסף כמשתמש ב-Search Console, ושהנכס (GSC_SITE_URL) נכון.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>מילות חיפוש מובילות</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>חיפוש</th><th style={th}>קליקים</th>{!mob && <th style={th}>הופעות</th>}<th style={th}>מיקום</th></tr></thead>
                <tbody>
                  {(d.queries || []).slice(0, 15).map((q, i) => (
                    <tr key={i}>
                      <td style={{ ...td, wordBreak: "break-word" }}><a href={scQueryLink(q.key)} target="_blank" rel="noopener noreferrer" style={linkA}>{q.key}</a></td>
                      <td style={{ ...td, fontFamily: F.mono, color: C.goldBright }}>{q.clicks.toLocaleString()}</td>
                      {!mob && <td style={{ ...td, fontFamily: F.mono, color: C.muted }}>{q.impressions.toLocaleString()}</td>}
                      <td style={{ ...td, fontFamily: F.mono, color: C.goldDim }}>{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                  {!(d.queries || []).length && <tr><td style={td} colSpan={4}>אין עדיין נתונים בטווח הזה.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>הדפים שהביאו הכי הרבה קליקים מגוגל</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>דף</th><th style={th}>קליקים</th>{!mob && <th style={th}>הופעות</th>}</tr></thead>
                <tbody>
                  {(d.pages || []).slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td style={{ ...td, wordBreak: "break-word" }}><a href={decode(p.key)} target="_blank" rel="noopener noreferrer" style={linkA}>{decode(p.key)}</a></td>
                      <td style={{ ...td, fontFamily: F.mono, color: C.goldBright }}>{p.clicks.toLocaleString()}</td>
                      {!mob && <td style={{ ...td, fontFamily: F.mono, color: C.muted }}>{p.impressions.toLocaleString()}</td>}
                    </tr>
                  ))}
                  {!(d.pages || []).length && <tr><td style={td} colSpan={3}>אין עדיין נתונים בטווח הזה.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

// ===== 📋 רשימת תפוצה =====
function SubscribersTab() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  useEffect(() => { adminGetSubscribers().then(setRows).catch(e => setErr(e.message || "שגיאה")); }, []);

  const activeCount = useMemo(() => (rows || []).filter(r => r.active).length, [rows]);
  const view = useMemo(() => {
    let v = rows || [];
    if (filter === "active") v = v.filter(r => r.active);
    else if (filter === "inactive") v = v.filter(r => !r.active);
    const s = q.trim().toLowerCase();
    if (s) v = v.filter(r => (r.email || "").toLowerCase().includes(s) || (r.name || "").toLowerCase().includes(s));
    return v;
  }, [rows, filter, q]);

  if (err) return <div style={{ color: C.crimsonLight, textAlign: "center", padding: 30 }}>{err}</div>;
  if (!rows) return <Loading />;

  const inactive = rows.length - activeCount;
  const fbtn = on => ({ cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 999, border: `1px solid ${on ? C.borderGold : C.border}`, background: on ? "rgba(212,175,55,0.12)" : "transparent", color: on ? C.goldBright : C.muted });
  const input = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 13.5, padding: "7px 12px", minWidth: 200, flex: 1 };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <H>{rows.length.toLocaleString()} נרשמים</H>
        <span style={{ color: "#7bbf7b", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>✓ {activeCount.toLocaleString()} פעילים</span>
        <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 13 }}>· {inactive.toLocaleString()} לא-פעילים</span>
        <span style={{ flex: 1 }} />
        <BtnGold onClick={() => downloadCsv("subscribers.csv", [["email", "name", "source", "active", "created_at"], ...view.map(r => [r.email, r.name, r.source, r.active, r.created_at])])}>⬇ ייצוא CSV{view.length !== rows.length ? ` (${view.length.toLocaleString()})` : ""}</BtnGold>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button style={fbtn(filter === "all")} onClick={() => setFilter("all")}>הכל</button>
        <button style={fbtn(filter === "active")} onClick={() => setFilter("active")}>✓ פעילים</button>
        <button style={fbtn(filter === "inactive")} onClick={() => setFilter("inactive")}>לא-פעילים</button>
        <input style={input} placeholder="חיפוש מייל או שם…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>מייל</th><th style={th}>שם</th><th style={th}>סטטוס</th><th style={th}>מקור</th><th style={th}>תאריך</th></tr></thead>
          <tbody>
            {view.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, fontFamily: F.mono, direction: "ltr", textAlign: "right" }}>{r.email}</td>
                <td style={td}>{r.name || "—"}</td>
                <td style={td}>{r.active
                  ? <span style={{ color: "#7bbf7b", fontWeight: 700 }}>✓ פעיל</span>
                  : <span style={{ color: C.muted }}>—</span>}</td>
                <td style={{ ...td, color: C.muted }}>{r.source || "—"}</td>
                <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {view.length === 0 && <Empty>אין תוצאות.</Empty>}
      </div>
    </div>
  );
}

// ===== ✉️ פניות =====
function MessagesTab() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { adminGetMessages().then(setRows).catch(e => setErr(e.message || "שגיאה")); }, []);
  useEffect(() => { load(); }, [load]);
  async function toggle(m) { try { await adminSetMessageRead(m.id, !m.read); load(); } catch (e) { alert(e.message); } }
  if (err) return <div style={{ color: C.crimsonLight, textAlign: "center", padding: 30 }}>{err}</div>;
  if (!rows) return <Loading />;
  const unread = rows.filter(r => !r.read).length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <H>{rows.length} פניות · {unread} שלא נקראו</H>
      {rows.map(m => (
        <div key={m.id} style={{ ...card, borderColor: m.read ? C.border : C.borderGold, opacity: m.read ? 0.75 : 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>{m.name || "—"}</span>
            <a href={`mailto:${m.email}`} style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 13, direction: "ltr", textDecoration: "none" }}>{m.email}</a>
            <span style={{ flex: 1 }} />
            <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>{fmtDate(m.created_at)}</span>
            <button onClick={() => toggle(m)} style={{ cursor: "pointer", background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "3px 12px", fontFamily: F.heading, fontSize: 11 }}>
              {m.read ? "סמן כלא נקרא" : "סמן כנקרא ✓"}
            </button>
          </div>
          {m.subject && <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.subject}</div>}
          <div style={{ color: "#d4ccbf", fontFamily: F.body, fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{m.message}</div>
        </div>
      ))}
      {rows.length === 0 && <Empty>אין פניות עדיין.</Empty>}
    </div>
  );
}

// ===== 📧 מיילים =====
function EmailsTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([adminGetSubscribers(), adminGetMessages()])
      .then(([subs, msgs]) => {
        const map = new Map();
        subs.forEach(s => s.email && map.set(s.email.toLowerCase(), { email: s.email, name: s.name, src: "תפוצה" }));
        msgs.forEach(m => m.email && !map.has(m.email.toLowerCase()) && map.set(m.email.toLowerCase(), { email: m.email, name: m.name, src: "פנייה" }));
        setData([...map.values()]);
      }).catch(() => setData([]));
  }, []);
  if (!data) return <Loading />;
  const all = data.map(d => d.email).join(", ");
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <H>{data.length} כתובות מייל ייחודיות</H>
        <span style={{ flex: 1 }} />
        <BtnGold onClick={() => { navigator.clipboard?.writeText(all); }}>📋 העתק הכל</BtnGold>
        <BtnGold onClick={() => downloadCsv("emails.csv", [["email", "name", "source"], ...data.map(d => [d.email, d.name, d.src])])}>⬇ CSV</BtnGold>
      </div>
      <textarea readOnly value={all} style={{ width: "100%", minHeight: 200, boxSizing: "border-box", background: C.bg, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontFamily: F.mono, fontSize: 13, direction: "ltr", lineHeight: 1.8 }} />
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>הדבקו ב-Gmail/מערכת דיוור בשדה הנמענים (BCC).</div>
    </div>
  );
}

// ===== ✉️ דיוור — שליחת מייל לרשימת התפוצה (send-newsletter + Resend) =====
// שלב 1: כתיבה + פילוח (פעילים / לפי מקור) + ספירת נמענים + «שלח בדיקה אליי» + «שלח לכולם».
// שולח רק ל-active=true. כל מייל כולל לינק הסרה. השליחה מאומתת לפי חשבון האדמין (JWT).
// דורש RESEND_API_KEY ב-Secrets + אימות דומיין — עד אז «שלח לכולם» יחזיר not_configured.
function NewsletterTab() {
  const { user } = useAuth();
  const [subs, setSubs] = useState(null);
  const [source, setSource] = useState("");     // "" = כל הפעילים
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [busy, setBusy] = useState("");         // "" | test | send
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { adminGetSubscribers().then(setSubs).catch(() => setSubs([])); }, []);

  const active = useMemo(() => (subs || []).filter(s => s.active && s.email), [subs]);
  const sources = useMemo(() => {
    const c = {}; active.forEach(s => { const k = s.source || "(ללא מקור)"; c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [active]);
  const reach = useMemo(() => source ? active.filter(s => (s.source || "(ללא מקור)") === source).length : active.length, [active, source]);

  async function invoke(payload) {
    const { data, error } = await supabase.functions.invoke("send-newsletter", { body: payload });
    if (error) throw new Error(data?.error || error.message);
    if (data?.error) throw new Error(data.hint || data.error);
    return data;
  }
  async function sendTest() {
    setErr(""); setMsg(null);
    if (!user?.email) { setErr("אין כתובת אדמין לשליחת בדיקה"); return; }
    if (!subject.trim() || !bodyHtml.trim()) { setErr("מלאו נושא ותוכן"); return; }
    setBusy("test");
    try {
      const r = await invoke({ subject: subject.trim(), html: bodyHtml, test_email: user.email });
      setMsg(r?.ok ? `✓ נשלחה בדיקה אל ${user.email}` : "הבדיקה לא נשלחה — בדקו את מפתח Resend");
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(""); }
  }
  async function sendAll() {
    setErr(""); setMsg(null);
    if (!subject.trim() || !bodyHtml.trim()) { setErr("מלאו נושא ותוכן"); return; }
    if (!window.confirm(`לשלוח את «${subject.trim()}» ל-${reach} נמענים${source ? ` (${source})` : ""}?`)) return;
    setBusy("send");
    try {
      const r = await invoke({ subject: subject.trim(), html: bodyHtml, source: source || undefined });
      setMsg(`✦ נשלח: ${r.sent} · נכשל: ${r.failed} (מתוך ${r.recipients})`);
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(""); }
  }

  const field = { width: "100%", padding: "10px 12px", background: C.surface, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: F.body, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl = { color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, display: "block", margin: "14px 0 5px" };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>✉️ שליחת דיוור לרשימת התפוצה</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>
          נשלח רק ל<b style={{ color: C.goldLight }}> נרשמים פעילים</b>. כל מייל כולל לינק הסרה. תמיד «שלחו בדיקה אליכם» לפני שליחה לכולם.
        </div>

        <label style={lbl}>פילוח נמענים</label>
        <select value={source} onChange={e => setSource(e.target.value)} style={field}>
          <option value="">📣 כל הפעילים ({active.length})</option>
          {sources.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
        </select>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginTop: 6 }}>
          יעד נוכחי: <b style={{ color: C.goldBright }}>{subs ? reach : "…"}</b> נמענים
        </div>

        <label style={lbl}>נושא</label>
        <input style={field} value={subject} onChange={e => setSubject(e.target.value)} dir="rtl" placeholder="רמז חדש התגלה על 1820" />

        <label style={lbl}>תוכן (HTML — מותר עברית, קישורים, כותרות)</label>
        <textarea style={{ ...field, minHeight: 200, fontFamily: F.mono, fontSize: 13, lineHeight: 1.7, direction: "rtl" }}
          value={bodyHtml} onChange={e => setBodyHtml(e.target.value)}
          placeholder={"<h2>שלום,</h2>\n<p>התגלתה התכנסות חדשה סביב 1820…</p>\n<p><a href=\"https://sod1820.co.il/number/1820\">לצפייה בדף המספר ←</a></p>"} />

        {err && <div style={{ color: C.danger || C.crimsonLight, fontFamily: F.heading, fontSize: 13, marginTop: 12 }}>{err}</div>}
        {msg && <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5, marginTop: 12 }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={sendTest} disabled={!!busy} style={{
            cursor: busy ? "wait" : "pointer", padding: "11px 22px", borderRadius: 10, border: `1px solid ${C.borderGold}`,
            background: "transparent", color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700,
          }}>{busy === "test" ? "שולח…" : "🧪 שלח בדיקה אליי"}</button>
          <button onClick={sendAll} disabled={!!busy} style={{
            cursor: busy ? "wait" : "pointer", padding: "11px 26px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800,
          }}>{busy === "send" ? "שולח…" : `✉️ שלח ל-${subs ? reach : "…"} נמענים`}</button>
        </div>
      </div>

      <div style={{ ...card, borderColor: C.border }}>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.9 }}>
          <b style={{ color: C.goldLight }}>הפעלה:</b> להוסיף ב-Supabase → Edge Functions → Secrets את <code style={{ color: C.goldBright }}>RESEND_API_KEY</code> (ואם רוצים כתובת שולח מותאמת — <code style={{ color: C.goldBright }}>NEWSLETTER_FROM</code>), ולאמת את הדומיין <b>sod1820.co.il</b> ב-Resend. עד אז «שלח לכולם» יחזיר הודעת «חסר מפתח».
        </div>
      </div>
    </div>
  );
}

// ===== 🖼 סטים ותמונות =====
function SetsTab() {
  const [sets, setSets] = useState(null);
  const [draft, setDraft] = useState(null);  // {id?, name, numbers}
  const load = useCallback(() => { getNumberSets().then(setSets).catch(() => setSets([])); }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    const nums = draft.numbers.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (!draft.name.trim() || !nums.length) { alert("שם ומספרים נדרשים"); return; }
    try { await saveNumberSet({ id: draft.id, name: draft.name.trim(), numbers: nums }); setDraft(null); load(); }
    catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }
  async function remove(id) { if (!window.confirm("למחוק את הסט?")) return; try { await deleteNumberSet(id); load(); } catch (e) { alert(e.message); } }
  // ⭐ שליטה אילו סדרות מוצגות גם בדף הבית (שומר description/sort_order הקיימים)
  async function toggleHome(s) {
    try {
      await saveNumberSet({ id: s.id, name: s.name, numbers: s.numbers, description: s.description, sort_order: s.sort_order, show_on_home: !s.show_on_home });
      load();
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }
  if (!sets) return <Loading />;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14, flex: 1, minWidth: 200 }}>
          סטים = קבוצות מספרים (למשל "דוד המלך = 14,45"). הסידור הידני של התמונות בכל סט נעשה בעמוד הארכיון.
        </div>
        <Link to="/archive?tab=pool" style={{ textDecoration: "none" }}><BtnGold>🖼 פתח את מאגר הסטים בארכיון →</BtnGold></Link>
        <BtnGold onClick={() => setDraft({ name: "", numbers: "" })}>➕ סט חדש</BtnGold>
      </div>

      {draft && (
        <div style={{ ...card, borderColor: C.borderGold }}>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={draft.name} placeholder="שם הסט (למשל: דוד המלך)" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "10px 12px", fontFamily: F.body, fontSize: 15 }} />
            <input value={draft.numbers} placeholder="מספרים מופרדים בפסיק — 14, 45" onChange={e => setDraft(d => ({ ...d, numbers: e.target.value }))}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, padding: "10px 12px", fontFamily: F.mono, fontSize: 15, direction: "ltr", textAlign: "right" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <BtnGold onClick={save}>💾 שמור</BtnGold>
              <button onClick={() => setDraft(null)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "8px 16px", cursor: "pointer", fontFamily: F.heading }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {sets.map(s => (
        <div key={s.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{s.name}</span>
          <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 13 }}>{(s.numbers || []).join(" · ")}</span>
          {s.image_order?.length > 0 && <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>· {s.image_order.length} מובלטות</span>}
          {s.show_on_home && <span style={{ color: "#e0b34a", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>· ⭐ בדף הבית</span>}
          <span style={{ flex: 1 }} />
          <button onClick={() => toggleHome(s)} title="הצג/הסתר את הסדרה בדף הבית" style={{ ...iconBtn, color: s.show_on_home ? "#e0b34a" : C.muted }}>{s.show_on_home ? "⭐ בבית ✓" : "☆ הצג בבית"}</button>
          <button onClick={() => setDraft({ id: s.id, name: s.name, numbers: (s.numbers || []).join(", ") })} style={iconBtn}>✎ ערוך</button>
          <button onClick={() => remove(s.id)} style={iconBtn}>🗑 מחק</button>
        </div>
      ))}
      {sets.length === 0 && <Empty>אין סטים עדיין — צור את הראשון.</Empty>}
    </div>
  );
}

// ===== 📷 העלאת תמונה — מעלה ל-bucket gallery ומחזיר קישור + HTML מוכן לפוסט =====
function ImageUploadTab() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState("");   // "", uploading, error
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); setUrl(""); setStatus(""); setErr("");
  }
  async function upload() {
    if (!file) return;
    setStatus("uploading"); setErr("");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `posts/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setUrl(supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl);
      setStatus("");
    } catch (e) { setErr(e.message || String(e)); setStatus("error"); }
  }
  function copy(text, which) { navigator.clipboard?.writeText(text); setCopied(which); setTimeout(() => setCopied(""), 1500); }

  const figureHtml = url
    ? `<figure class="wp-block-image aligncenter size-large"><img src="${url}" alt="${alt}"/></figure>`
    : "";
  const fieldBox = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.mono, fontSize: 12.5, padding: "10px 12px", direction: "ltr", textAlign: "left", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 660, margin: "0 auto" }}>
      <div style={card}>
        <H>📷 העלאת תמונה לפוסט</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: "6px 0 14px" }}>
          בחרו תמונה → היא תעלה לאחסון → תקבלו <b style={{ color: C.goldLight }}>קישור ציבורי</b> וגם <b style={{ color: C.goldLight }}>קטע HTML מוכן</b> להדבקה בתוך פוסט.
        </div>

        <label style={{ display: "inline-block", cursor: "pointer", background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(8,5,2,0.4))", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "9px 18px", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
          🖼 בחר תמונה…
          <input type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
        </label>

        {preview && <img src={preview} alt="תצוגה מקדימה" style={{ display: "block", maxWidth: "100%", maxHeight: 320, borderRadius: 12, marginTop: 14, border: `1px solid ${C.border}` }} />}

        {file && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <BtnGold onClick={upload}>{status === "uploading" ? "⏳ מעלה…" : "⬆ העלה תמונה"}</BtnGold>
            <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 12 }}>{file.name} · {(file.size / 1024).toFixed(0)}KB</span>
          </div>
        )}
        {err && <div style={{ color: C.crimsonLight, fontFamily: F.body, fontSize: 13, marginTop: 10 }}>⚠ {err}</div>}

        {url && (
          <div style={{ display: "grid", gap: 12, marginTop: 16, borderTop: `1px solid ${C.borderGold}`, paddingTop: 14 }}>
            <div style={{ color: "#7bbf7b", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>✅ הועלה בהצלחה</div>

            <div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 5 }}>תיאור התמונה (alt) — לא חובה:</div>
              <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="למשל: כתבת ynet" style={{ ...fieldBox, fontFamily: F.body, direction: "rtl", textAlign: "right" }} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11 }}>🔗 קישור ציבורי</span>
                <BtnGold onClick={() => copy(url, "url")}>{copied === "url" ? "✓ הועתק" : "📋 העתק"}</BtnGold>
              </div>
              <input readOnly value={url} onFocus={e => e.target.select()} style={fieldBox} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11 }}>&lt;/&gt; קטע HTML לפוסט</span>
                <BtnGold onClick={() => copy(figureHtml, "html")}>{copied === "html" ? "✓ הועתק" : "📋 העתק"}</BtnGold>
              </div>
              <textarea readOnly value={figureHtml} style={{ ...fieldBox, minHeight: 70, resize: "vertical" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = { cursor: "pointer", background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12 };
const segWrap = { display: "inline-flex", gap: 6, background: "rgba(8,5,2,0.4)", border: `1px solid ${C.border}`, borderRadius: 999, padding: 4 };
function segBtn(active) { return { cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: "none", background: active ? "rgba(212,175,55,0.22)" : "transparent", color: active ? C.goldBright : C.muted }; }
function BtnGold({ children, onClick }) {
  return <button onClick={onClick} style={{ cursor: "pointer", background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(8,5,2,0.4))", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</button>;
}
function H({ children }) { return <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{children}</span>; }
function Empty({ children }) { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>{children}</div>; }

const fld = { background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.heading, fontSize: 13, padding: "9px 12px", width: "100%", boxSizing: "border-box", direction: "rtl", outline: "none" };

// ===== ClassifyTab — סיווג מהיר של תמונות =====
const IMAGE_TYPES = [
  { key: "hint",      label: "💡 רמז",       shortcut: "H", color: "#e9c84a" },
  { key: "gematria",  label: "🔢 גימטריה",   shortcut: "G", color: "#7bbf7b" },
  { key: "method",    label: "📐 שיטה",       shortcut: "M", color: "#80b4ff" },
  { key: "event",     label: "📰 אירוע",      shortcut: "E", color: "#f4a56a" },
  { key: "gallery",   label: "🖼 כללי",       shortcut: "K", color: "#b08fff" },
];

function ClassifyTab() {
  const [imgs, setImgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState({});
  const [done, setDone] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const PAGE = 50;

  async function loadPage(p, all) {
    if (!supabase) return;
    setLoading(true);
    let q = supabase.from("gallery_images")
      .select("id,name,image_url,primary_value,occurred_at,image_type,source", { count: "exact" });
    if (!all) q = q.is("image_type", null);
    const { data, count, error } = await q.order("created_at", { ascending: false }).range(p * PAGE, (p + 1) * PAGE - 1);
    if (!error) { setImgs(data || []); setTotal(count || 0); }
    setLoading(false);
  }

  useEffect(() => { loadPage(page, showAll); }, [page, showAll]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const t = IMAGE_TYPES.find(t => t.shortcut === e.key.toUpperCase());
      if (t && imgs.length) classifyFirst(imgs[0].id, t.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imgs]);

  async function classify(id, type) {
    setSaving(p => ({ ...p, [id]: true }));
    try {
      await setImageCuration(id, { image_type: type });
      setImgs(prev => prev.filter(i => i.id !== id));
      setDone(p => p + 1);
      setTotal(p => p - 1);
    } catch(e) { alert("שגיאה: " + e.message); }
    setSaving(p => ({ ...p, [id]: false }));
  }

  function classifyFirst(id, type) { classify(id, type); }

  const classified = done;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
            🏷️ סיווג תמונות {showAll ? "(הכל)" : "(לא מסווגות)"}
          </div>
          <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>
            {total} תמונות · סווגתי {classified} כרגע
          </span>
          <button onClick={() => { setShowAll(p => !p); setPage(0); setDone(0); }} style={{ ...iconBtn, marginRight: "auto" }}>
            {showAll ? "הצג לא מסווגות" : "הצג הכל"}
          </button>
        </div>

        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginBottom: 8 }}>קיצורי מקלדת:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {IMAGE_TYPES.map(t => (
              <span key={t.key} style={{ color: t.color, fontFamily: F.heading, fontSize: 12, background: "rgba(0,0,0,0.35)", border: `1px solid ${t.color}44`, borderRadius: 6, padding: "3px 10px" }}>
                <kbd style={{ fontWeight: 800 }}>{t.shortcut}</kbd> = {t.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 13, padding: 20 }}>טוען…</div> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {imgs.map((img, idx) => (
                <div key={img.id} style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                  {idx === 0 && <div style={{ position: "absolute", top: 6, right: 6, background: C.gold, color: "#1a0e00", fontFamily: F.heading, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 8px", zIndex: 2 }}>⌨️ NEXT</div>}
                  <img src={img.image_url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                  <div style={{ padding: "8px 10px 10px" }}>
                    <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                      {img.name || "(ללא שם)"}
                    </div>
                    <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 10, marginBottom: 8 }}>
                      #{img.primary_value || "?"} · {img.source || "?"} · {img.image_type ? `✓ ${img.image_type}` : "לא מסווג"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {IMAGE_TYPES.map(t => (
                        <button key={t.key} disabled={!!saving[img.id]} onClick={() => classify(img.id, t.key)} style={{
                          cursor: "pointer", border: `1px solid ${t.color}66`, borderRadius: 7, padding: "5px 8px",
                          background: saving[img.id] ? "rgba(0,0,0,0.2)" : `${t.color}11`,
                          color: t.color, fontFamily: F.heading, fontSize: 11, fontWeight: 700,
                        }}>{t.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!imgs.length && <Empty>{showAll ? "אין תמונות" : "✅ כל התמונות מסווגות!"}</Empty>}
            {total > PAGE && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, alignItems: "center" }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={iconBtn}>→ הקודם</button>
                <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>עמוד {page + 1}</span>
                <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)} style={iconBtn}>← הבא</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== PushSendTab — שליחת התראת Push לפי נושא =====
function PushSendTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [topic, setTopic] = useState("all");   // all = לכל המנויים
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [counts, setCounts] = useState(null);   // { total, byTopic }

  // ספירת מנויי Push האמיתית (כל המשתמשים) דרך RPC security-definer — RLS מסתיר מנויים של אחרים.
  useEffect(() => {
    if (!supabase) return;
    supabase.rpc("push_sub_count").then(({ data }) => {
      if (data && typeof data.total === "number") setCounts({ total: data.total, byTopic: data.by_topic || {} });
    }).catch(() => {});
  }, []);

  // אומדן יעד: topic=all → כולם; אחרת מי שסימן את הנושא + מי שלא סימן כלום (=הכל).
  const reach = topic === "all" ? (counts?.total ?? 0) : (counts ? (counts.byTopic[topic] || 0) : 0);

  async function send() {
    setErr(""); setResult(null);
    if (!title.trim() && !body.trim()) { setErr("נא למלא כותרת או תוכן"); return; }
    setBusy(true);
    try {
      // אימות לפי הסשן של האדמין (JWT) — בלי מפתח ידני. invoke מצרף את ה-Authorization אוטומטית.
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          url: url.trim() || "/",
          topic: topic === "all" ? undefined : topic,
        },
      });
      if (error) { setErr(data?.error || error.message || "השליחה נכשלה"); }
      else if (data?.error) { setErr(data.error); }
      else { setResult(data); }
    } catch (e) {
      setErr("השליחה נכשלה — בדקו שהפונקציה send-push פרוסה. " + String(e));
    } finally {
      setBusy(false);
    }
  }

  const field = { width: "100%", padding: "10px 12px", background: C.surface, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: F.body, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl = { color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, display: "block", margin: "14px 0 5px" };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <div style={{ ...card }}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔔 שליחת התראת Push</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>
          ההתראה נשלחת רק למנויי Push שסימנו את הנושא (ומי שלא סימן נושאים — מקבל הכל).
          השליחה מאומתת אוטומטית לפי חשבון האדמין — אין צורך במפתח.
        </div>

        <label style={lbl}>נושא</label>
        <select value={topic} onChange={e => setTopic(e.target.value)} style={field}>
          <option value="all">📣 כל המנויים</option>
          {NOTIFICATION_TOPICS.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
        </select>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginTop: 6 }}>
          מנויי Push: <b style={{ color: C.goldBright }}>{counts ? counts.total : "…"}</b>
          {topic !== "all" && counts ? <> · סימנו נושא זה: <b style={{ color: C.goldBright }}>{reach}</b></> : null}
        </div>

        <label style={lbl}>כותרת</label>
        <input style={field} value={title} onChange={e => setTitle(e.target.value)} dir="rtl" placeholder="רמז חדש על 1820" />

        <label style={lbl}>תוכן</label>
        <input style={field} value={body} onChange={e => setBody(e.target.value)} dir="rtl" placeholder="התגלתה התכנסות חדשה — לחצו לצפייה" />

        <label style={lbl}>קישור (url)</label>
        <input style={field} value={url} onChange={e => setUrl(e.target.value)} dir="ltr" placeholder="/number/1820" />

        {err && <div style={{ color: C.danger, fontFamily: F.heading, fontSize: 13, marginTop: 12 }}>{err}</div>}
        {result && (
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13.5, marginTop: 12 }}>
            ✦ נשלח: {result.sent} · נכשל: {result.failed || 0} · מנויים מתים שנוקו: {result.gone || 0} (מתוך {result.total})
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button onClick={send} disabled={busy} style={{
            cursor: busy ? "wait" : "pointer", padding: "11px 26px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800,
          }}>{busy ? "שולח…" : "שליחת התראה 🔔"}</button>
        </div>
      </div>

      <PushSubscribersList />
    </div>
  );
}

// תווית מכשיר קצרה מתוך user-agent (לתצוגת רשימת מנויי Push).
function pushDeviceLabel(ua = "") {
  const os = /Android/i.test(ua) ? "אנדרואיד"
    : /iPhone|iPad|iPod|iOS/i.test(ua) ? "אייפון"
    : /Windows/i.test(ua) ? "Windows"
    : /Macintosh|Mac OS/i.test(ua) ? "Mac"
    : /Linux/i.test(ua) ? "Linux" : "—";
  const br = /Edg/i.test(ua) ? "Edge"
    : /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox"
    : /Safari/i.test(ua) ? "Safari" : "";
  return br ? `${os} · ${br}` : os;
}

// 📋 רשימת מנויי Push (אדמין): מייל (אם מחובר), מכשיר, האם גם ברשימת התפוצה.
function PushSubscribersList() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.rpc("push_sub_list").then(({ data, error }) => {
      if (error) setErr(error.message || "שגיאה בטעינה");
      else setRows(data || []);
    }).catch(e => setErr(String(e)));
  }, []);

  const th = { textAlign: "right", color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td = { textAlign: "right", color: C.goldLight, fontFamily: F.body, fontSize: 12.5, padding: "9px 10px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" };

  return (
    <div style={{ ...card }}>
      <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        📋 מנויי Push {rows ? `(${rows.length})` : ""}
      </div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12 }}>
        מי שאישר התראות. מייל מוצג רק למשתמש מחובר; "אנונימי" = נרשם בלי חשבון.
        העמודה האחרונה מציינת אם הוא גם ברשימת התפוצה (מייל).
      </div>
      {err && <div style={{ color: C.danger, fontFamily: F.heading, fontSize: 13 }}>{err}</div>}
      {!err && rows === null && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13 }}>טוען…</div>}
      {!err && rows && rows.length === 0 && <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13 }}>אין מנויים עדיין.</div>}
      {!err && rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
            <thead>
              <tr>
                <th style={th}>מייל</th>
                <th style={th}>מכשיר</th>
                <th style={th}>נרשם</th>
                <th style={th}>ברשימת תפוצה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{r.anonymous ? <span style={{ color: C.muted }}>אנונימי</span> : <span dir="ltr">{r.email || "—"}</span>}</td>
                  <td style={td} dir="ltr"><span style={{ color: C.goldDim }}>{pushDeviceLabel(r.user_agent)}</span></td>
                  <td style={td} dir="ltr"><span style={{ color: C.goldDim }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("he-IL") : "—"}</span></td>
                  <td style={td}>{r.is_email_subscriber ? <span style={{ color: "#5bd16a" }}>✅ כן</span> : <span style={{ color: C.muted }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== 🔗 בונה קישורי UTM — לינקים ממותגים-מדידים לכל קמפיין =====
const UTM_SOURCES = [
  { k: "whatsapp", l: "וואטסאפ", m: "social" },
  { k: "facebook", l: "פייסבוק", m: "social" },
  { k: "instagram", l: "אינסטגרם", m: "social" },
  { k: "telegram", l: "טלגרם", m: "social" },
  { k: "x", l: "X / טוויטר", m: "social" },
  { k: "newsletter", l: "ניוזלטר", m: "email" },
  { k: "email", l: "אימייל", m: "email" },
  { k: "youtube", l: "יוטיוב", m: "video" },
];
function UtmBuilderTab() {
  const [base, setBase] = useState("https://sod1820.co.il/");
  const [source, setSource] = useState("whatsapp");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    let u;
    try { u = new URL(base.trim()); } catch { return ""; }
    const p = u.searchParams;
    if (source.trim()) p.set("utm_source", source.trim());
    if (medium.trim()) p.set("utm_medium", medium.trim());
    if (campaign.trim()) p.set("utm_campaign", campaign.trim());
    if (content.trim()) p.set("utm_content", content.trim());
    return u.toString();
  }, [base, source, medium, campaign, content]);

  function copy() {
    if (!url) return;
    try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("העתיקו את הקישור:", url); }
  }

  const field = { width: "100%", padding: "10px 12px", background: C.surface, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: F.body, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl = { color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, display: "block", margin: "14px 0 5px" };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      <div style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔗 בונה קישורי קמפיין (UTM)</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>
          צרו קישור ממותג לכל מקור (וואטסאפ/פייסבוק/ניוזלטר…). כל כניסה דרכו תופיע ב-Google Analytics
          תחת המקור/קמפיין שתבחרו — כך תדעו בדיוק מאיזה ערוץ הגיעו.
        </div>

        <label style={lbl}>כתובת היעד</label>
        <input style={field} value={base} onChange={e => setBase(e.target.value)} dir="ltr" placeholder="https://sod1820.co.il/number/1820" />

        <label style={lbl}>מקור (utm_source)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {UTM_SOURCES.map(s => (
            <button key={s.k} onClick={() => { setSource(s.k); setMedium(s.m); }}
              style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700,
                border: `1px solid ${source === s.k ? C.goldBright : C.border}`, background: source === s.k ? "rgba(184,134,11,0.18)" : "transparent", color: source === s.k ? C.goldBright : C.goldDim }}>
              {s.l}
            </button>
          ))}
        </div>
        <input style={field} value={source} onChange={e => setSource(e.target.value)} dir="ltr" placeholder="whatsapp" />

        <label style={lbl}>סוג (utm_medium)</label>
        <input style={field} value={medium} onChange={e => setMedium(e.target.value)} dir="ltr" placeholder="social / email / referral" />

        <label style={lbl}>שם קמפיין (utm_campaign)</label>
        <input style={field} value={campaign} onChange={e => setCampaign(e.target.value)} dir="ltr" placeholder="purim-1820 / shaver-launch" />

        <label style={lbl}>תוכן / וריאנט (utm_content) — אופציונלי</label>
        <input style={field} value={content} onChange={e => setContent(e.target.value)} dir="ltr" placeholder="button-a / story-1" />

        <label style={lbl}>הקישור המוכן</label>
        <div style={{ ...field, minHeight: 44, wordBreak: "break-all", color: url ? C.goldBright : C.danger, fontFamily: F.mono, fontSize: 12.5, cursor: url ? "pointer" : "default" }} onClick={copy}>
          {url || "כתובת יעד לא תקינה — בדקו את ה-URL"}
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={copy} disabled={!url} style={{ cursor: url ? "pointer" : "default", padding: "10px 24px", borderRadius: 10, border: "none",
            background: url ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : C.border, color: "#1a0e00", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>
            {copied ? "הועתק ✓" : "העתק קישור 🔗"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MetaTab — מעקב Meta Pixel + CAPI =====
const CAPI_URL = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/meta-capi";
function MetaTab() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [win, setWin] = useState(7);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    const since = new Date(Date.now() - win * 86400000).toISOString();
    supabase.from("visitor_events").select("section,slug,event_type,meta,visitor_id,created_at")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { setEvents(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, [win]);

  async function testCapi() {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(CAPI_URL, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: "PageView", event_source_url: "https://sod1820.co.il/admin-test" }) });
      setTestResult(await r.json());
    } catch(e) { setTestResult({ ok: false, error: String(e) }); }
    setTesting(false);
  }

  const byType = {};
  events.forEach(e => { byType[e.event_type] = (byType[e.event_type] || 0) + 1; });
  const uniq = new Set(events.map(e => e.visitor_id)).size;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📡 Meta Conversions API</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <code style={{ color: C.gold, fontFamily: "monospace", fontSize: 11, background: "rgba(0,0,0,0.35)", padding: "4px 10px", borderRadius: 6 }}>{CAPI_URL}</code>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <BtnGold onClick={testCapi}>{testing ? "בודק…" : "🧪 שלח אירוע בדיקה"}</BtnGold>
          {testResult && (
            <span style={{ color: testResult.ok ? "#7bbf7b" : "#e57373", fontFamily: F.heading, fontSize: 13 }}>
              {testResult.ok
                ? `✅ הצליח — events_received: ${testResult.events_received} | trace: ${testResult.fbtrace_id}`
                : `❌ ${testResult.skipped || testResult.error || "שגיאה"}`}
            </span>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>👁 אירועי גולשים</div>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginRight: "auto" }}>ייחודיים: <b style={{ color: C.goldBright }}>{uniq}</b></span>
          {[{l:"24ש",d:1},{l:"7י",d:7},{l:"30י",d:30}].map(w => (
            <button key={w.d} onClick={() => setWin(w.d)} style={{ cursor:"pointer", fontFamily:F.heading, fontSize:12, padding:"4px 12px", borderRadius:999, border:`1px solid ${win===w.d?C.gold:C.border}`, background:win===w.d?"rgba(212,175,55,0.15)":"transparent", color:win===w.d?C.goldBright:C.muted }}>{w.l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([type, cnt]) => (
            <div key={type} style={{ background:"rgba(212,175,55,0.08)", border:`1px solid ${C.borderGold}`, borderRadius:8, padding:"5px 12px", fontFamily:F.heading, fontSize:12 }}>
              <span style={{ color:C.goldDim }}>{type}:</span> <b style={{ color:C.goldBright }}>{cnt}</b>
            </div>
          ))}
        </div>
        {loading ? <div style={{ color:C.muted, fontFamily:F.heading, fontSize:13 }}>טוען…</div> : (
          <div style={{ display:"grid", gap:5, maxHeight:360, overflowY:"auto" }}>
            {events.map((e,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"130px 90px 90px 1fr", gap:8, alignItems:"center", borderBottom:`1px solid ${C.border}`, paddingBottom:5 }}>
                <span style={{ color:C.muted, fontFamily:"monospace", fontSize:10 }}>{new Date(e.created_at).toLocaleString("he-IL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                <span style={{ color:C.goldLight, fontFamily:F.heading, fontSize:11 }}>{e.section}</span>
                <span style={{ color:C.gold, fontFamily:F.heading, fontSize:11 }}>{e.event_type}</span>
                <span style={{ color:C.muted, fontFamily:F.heading, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.slug || (e.meta ? JSON.stringify(e.meta).slice(0,40) : "")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== WorkLogTab — יומן עבודה =====
function WorkLogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ topic: "", what_we_did: "", status: "הושלם", open_threads: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");

  function load() {
    if (!supabase) return;
    // RPC security-definer — עוקף RLS/הרשאות-טבלה (כמו דשבורד הויראליות שעובד)
    supabase.rpc("get_work_log")
      .then(({ data }) => { setEntries(data || []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  async function addEntry() {
    if (!form.topic || !form.what_we_did) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("work_log").insert({
      session_date: today, topic: form.topic, what_we_did: form.what_we_did,
      status: form.status, open_threads: form.open_threads || null,
    }).select().single();
    if (!error && data) {
      setEntries(prev => [data, ...prev]);
      setForm({ topic: "", what_we_did: "", status: "הושלם", open_threads: "" });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>✍️ רשומה חדשה</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={form.topic} onChange={e => setForm(p=>({...p,topic:e.target.value}))} placeholder="נושא" style={fld} />
          <textarea value={form.what_we_did} onChange={e => setForm(p=>({...p,what_we_did:e.target.value}))} placeholder="מה עשינו" rows={3} style={{ ...fld, resize:"vertical" }} />
          <input value={form.open_threads} onChange={e => setForm(p=>({...p,open_threads:e.target.value}))} placeholder="חוטים פתוחים (אופציונלי)" style={fld} />
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <BtnGold onClick={addEntry}>{saving ? "שומר…" : "💾 שמור"}</BtnGold>
            {saved && <span style={{ color:"#7bbf7b", fontFamily:F.heading, fontSize:13 }}>✅ נשמר</span>}
          </div>
        </div>
      </div>
      {(() => {
        const q = query.trim().toLowerCase();
        const view = q
          ? entries.filter(e => `${e.topic || ""} ${e.what_we_did || ""} ${e.open_threads || ""} ${e.status || ""}`.toLowerCase().includes(q))
          : entries;
        return (
          <div style={card}>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ color:C.goldBright, fontFamily:F.heading, fontSize:14, fontWeight:700 }}>
                📋 כל היומן {!loading && <span style={{ color:C.muted, fontWeight:400 }}>({view.length}{q ? ` / ${entries.length}` : ""})</span>}
              </div>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 חיפוש ביומן…" dir="rtl"
                style={{ ...fld, marginRight:"auto", maxWidth:300, padding:"7px 12px" }} />
            </div>
            {loading ? <div style={{ color:C.muted, fontSize:13, fontFamily:F.heading }}>טוען…</div> : (
              <div style={{ display:"grid", gap:16, maxHeight:620, overflowY:"auto", paddingLeft:6 }}>
                {view.map(e => (
                  <div key={e.id} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"baseline", marginBottom:5, flexWrap:"wrap" }}>
                      <b style={{ color:C.goldBright, fontFamily:F.heading, fontSize:13 }}>{e.topic}</b>
                      <span style={{ color:C.muted, fontFamily:"monospace", fontSize:10 }}>{e.session_date}</span>
                      <span style={{ color:e.status==="הושלם"?"#7bbf7b":C.gold, fontFamily:F.heading, fontSize:11, marginRight:"auto" }}>{e.status}</span>
                    </div>
                    <div style={{ color:C.goldLight, fontFamily:F.body, fontSize:13, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{e.what_we_did}</div>
                    {e.open_threads && <div style={{ color:C.muted, fontFamily:F.heading, fontSize:11, marginTop:5 }}>⚡ {e.open_threads}</div>}
                  </div>
                ))}
                {!view.length && <Empty>{q ? "אין תוצאות לחיפוש" : "אין רשומות עדיין"}</Empty>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ===== StreamAdminTab — ניהול זרם המציאות =====
function StreamAdminTab() {
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editImg, setEditImg] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getRealityHints(300).then(data => { setHints(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function removeFromStream(id) {
    await setImageCuration(id, { source: "manual" });
    setHints(prev => prev.filter(h => h.id !== id));
  }

  const filtered = q ? hints.filter(h => (h.name||"").includes(q) || String(h.primary_value||"").includes(q)) : hints;

  return (
    <div style={{ display:"grid", gap:20 }}>
      <div style={card}>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
          <div style={{ color:C.goldBright, fontFamily:F.heading, fontSize:14, fontWeight:700 }}>🌊 זרם המציאות — {hints.length} רמזים</div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="סנן לפי שם / מספר" style={{ ...fld, maxWidth:200, marginRight:"auto" }} />
        </div>
        {loading ? <div style={{ color:C.muted, fontFamily:F.heading, fontSize:13 }}>טוען…</div> : (
          <div style={{ display:"grid", gap:6, maxHeight:520, overflowY:"auto" }}>
            {filtered.map(h => (
              <div key={h.id} style={{ display:"grid", gridTemplateColumns:"52px 1fr auto auto", gap:10, alignItems:"center", borderBottom:`1px solid ${C.border}`, paddingBottom:6 }}>
                {h.image_url
                  ? <img src={h.image_url} alt="" style={{ width:52, height:52, objectFit:"cover", borderRadius:5 }} />
                  : <div style={{ width:52, height:52, background:C.border, borderRadius:5 }} />}
                <div style={{ minWidth:0 }}>
                  <div style={{ color:C.goldLight, fontFamily:F.heading, fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name || "(ללא שם)"}</div>
                  <div style={{ color:C.muted, fontFamily:"monospace", fontSize:10 }}>
                    {h.occurred_at ? h.occurred_at.slice(0,10) : "—"} · #{h.primary_value || "?"}
                  </div>
                </div>
                <button onClick={() => setEditImg(h)} style={iconBtn} title="ערוך">✏️</button>
                <button onClick={() => removeFromStream(h.id)} style={{ ...iconBtn, color:"#e57373", borderColor:"#e57373" }} title="הוצא מהזרם">↩</button>
              </div>
            ))}
            {!filtered.length && <Empty>אין תוצאות</Empty>}
          </div>
        )}
      </div>
      {editImg && (
        <ImageEditModal
          image={editImg}
          onSave={async patch => { await setImageCuration(editImg.id, patch); setHints(prev => prev.map(h => h.id===editImg.id ? {...h,...patch} : h)); setEditImg(null); }}
          onClose={() => setEditImg(null)}
          onRemoveFromStream={editImg.source === "update" ? () => { removeFromStream(editImg.id); setEditImg(null); } : null}
        />
      )}
    </div>
  );
}


// 📡 «שדר לטיקר» — שידור חי לאתר: נכנס לרצועת «עדכון חי» + כרטיס «עדכון מהערוץ» בבית.
// מקור אחד: channel_updates. שום דבר לא נכנס לזרם המציאות מכאן — רק תצוגה.
function BroadcastTab() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [credit, setCredit] = useState("");
  const [channel, setChannel] = useState("main");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { const { listChannelUpdates } = await import("../lib/supabase.js"); setRows(await listChannelUpdates(30)); }
    catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!text.trim()) { setMsg("כתבו את העדכון קודם"); return; }
    setBusy(true); setMsg("");
    try {
      const { broadcastChannelUpdate } = await import("../lib/supabase.js");
      await broadcastChannelUpdate({ text: text.trim(), imageUrl: imageUrl.trim() || null, hours: hours || null, credit: credit.trim() || null, channel });
      setText(""); setImageUrl(""); setCredit(""); setMsg("✅ שודר! יופיע בטיקר ובעמוד הבית תוך דקה (רענון אצל הגולשים).");
      load();
    } catch (e) { setMsg("שגיאה: " + (e.message || e)); }
    setBusy(false);
  }
  async function toggle(r) {
    try {
      const { setChannelUpdateStatus } = await import("../lib/supabase.js");
      await setChannelUpdateStatus(r.id, r.status === "live" ? "off" : "live");
      load();
    } catch (e) { alert("שגיאה: " + (e.message || e)); }
  }

  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.goldLight, fontFamily: F.body, fontSize: 14.5, padding: "10px 13px", outline: "none", width: "100%", boxSizing: "border-box" };
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <div style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>📡 שידור חדש</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>
          נכנס לרצועת «● עדכון חי» בכל האתר + כרטיס «עדכון מהערוץ» בעמוד הבית. לא נוגע בזרם המציאות.
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="מה קורה עכשיו?"
          style={{ ...inp, resize: "vertical", minHeight: 70, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} dir="ltr" placeholder="קישור לתמונה (אופציונלי)"
            style={{ ...inp, flex: 1, minWidth: 220 }} />
          <input value={credit} onChange={e => setCredit(e.target.value)} placeholder="מאת… (למשל: שחר קנדרו · קוד המציאות)"
            style={{ ...inp, flex: 1, minWidth: 200 }} />
          <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...inp, width: "auto", cursor: "pointer" }}>
            <option value="main">📡 ראשי (טיקר האתר)</option>
            <option value="reality-code">🎬 קוד המציאות (בית)</option>
            <option value="or-geula">✨ אור הגאולה (צ'אט)</option>
            <option value="sod-hachashmal">⚡ סוד החשמל</option>
            <option value="torat-haremez">☀️ תורת הרמז VIP</option>
          </select>
          <select value={hours} onChange={e => setHours(Number(e.target.value))} style={{ ...inp, width: "auto", cursor: "pointer" }}>
            <option value={6}>יורד אחרי 6 שעות</option>
            <option value={24}>יורד אחרי 24 שעות</option>
            <option value={72}>יורד אחרי 3 ימים</option>
            <option value={0}>נשאר עד כיבוי ידני</option>
          </select>
          <button onClick={send} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: "linear-gradient(135deg,#e9c84a,#9a7818)",
            color: "#1a0e00", border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "10px 26px" }}>
            {busy ? "משדר…" : "📡 שדר"}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, color: msg.startsWith("✅") ? "#7bbf7b" : "#ff8080", fontFamily: F.body, fontSize: 13 }}>{msg}</div>}
      </div>

      <div style={card}>
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>השידורים האחרונים</div>
        {!rows.length && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>עוד לא שודר כלום.</div>}
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map(r => {
            const expired = r.expires_at && new Date(r.expires_at) < new Date();
            const liveNow = r.status === "live" && !expired;
            return (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px" }}>
                <span style={{ flex: "0 0 auto", fontSize: 10.5, fontFamily: F.heading, fontWeight: 800, borderRadius: 999, padding: "2px 9px",
                  background: liveNow ? "rgba(87,201,138,.15)" : "rgba(255,255,255,.06)", color: liveNow ? "#57c98a" : C.muted }}>
                  {liveNow ? "● חי" : expired ? "פג" : "כבוי"}
                </span>
                {r.image_url && <span title="עם תמונה">📷</span>}
                <span style={{ flex: 1, minWidth: 0, color: C.goldLight, fontFamily: F.body, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</span>
                <span style={{ flex: "0 0 auto", color: C.muted, fontFamily: F.heading, fontSize: 10.5 }}>{fmtDate(r.created_at)}</span>
                <button onClick={() => toggle(r)} style={{ flex: "0 0 auto", cursor: "pointer", background: "none", border: `1px solid ${C.border}`,
                  color: C.goldLight, borderRadius: 999, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "4px 12px" }}>
                  {r.status === "live" ? "כבה" : "הדלק"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
