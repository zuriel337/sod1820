import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  getTrafficStats, adminGetMessages, adminSetMessageRead, adminGetSubscribers,
  getNumberSets, saveNumberSet, deleteNumberSet, getOcrCounts, runOcrBatch,
} from "../lib/supabase.js";

// ===== פאנל הניהול (/admin) — נעול ל-role=admin, טאבים =====
const TABS = [
  { key: "stats",    label: "📊 סטטיסטיקות" },
  { key: "subs",     label: "📋 רשימת תפוצה" },
  { key: "messages", label: "✉️ פניות" },
  { key: "emails",   label: "📧 מיילים" },
  { key: "sets",     label: "🖼 סטים ותמונות" },
  { key: "ocr",      label: "🔤 OCR" },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }) : "";
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" };
const th = { color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, textAlign: "right", padding: "9px 12px", borderBottom: `1px solid ${C.borderGold}`, whiteSpace: "nowrap" };
const td = { color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };

function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState("stats");

  if (loading) return <Center>טוען…</Center>;
  if (!user) return <Center>נדרשת התחברות. <Link to="/login" style={{ color: C.goldBright }}>כניסה →</Link></Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול.</Center>;

  return (
    <div style={{ direction: "rtl", width: "100%", margin: 0, padding: "36px clamp(14px, 3vw, 56px) 90px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>לוח בקרה</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>⚙️ ניהול סוד 1820</h1>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 26 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "9px 18px", borderRadius: 999,
            border: `1px solid ${tab === t.key ? C.gold : C.border}`,
            background: tab === t.key ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))" : "transparent",
            color: tab === t.key ? C.goldBright : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "subs" && <SubscribersTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "emails" && <EmailsTab />}
      {tab === "sets" && <SetsTab />}
      {tab === "ocr" && <OcrTab />}
    </div>
  );
}

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
    const r = await runOcrBatch({ limit: 50, retry, runKey });
    addLog(`עובדו ${r.picked} · הצליחו ${r.done} · שגיאות ${r.errors}`);
    return r;
  }
  async function runAll() {
    setRunning(true); setAuto(true); stopRef.current = false;
    try {
      for (let i = 0; i < 80 && !stopRef.current; i++) {
        const r = await runOnce(retryErrors);
        await refresh();
        if (!r || r.picked === 0) { addLog("✅ הסתיים — אין עוד תמונות לעיבוד"); break; }
      }
    } catch (e) { addLog("⚠ שגיאה: " + (e.message || e)); }
    finally { setRunning(false); setAuto(false); }
  }
  async function runSingle() {
    setRunning(true);
    try { await runOnce(retryErrors); await refresh(); } catch (e) { addLog("⚠ שגיאה: " + (e.message || e)); }
    finally { setRunning(false); }
  }

  const pct = counts && counts.total ? Math.round((counts.done) / counts.total * 100) : 0;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="הושלמו (done)" value={counts ? counts.done.toLocaleString() : "…"} />
        <Stat label="ממתינים (pending)" value={counts ? counts.pending.toLocaleString() : "…"} />
        <Stat label="שגיאות" value={counts ? counts.error.toLocaleString() : "…"} />
        <Stat label="סה״כ" value={counts ? counts.total.toLocaleString() : "…"} />
      </div>

      <div style={card}>
        <H>OCR לתמונות הגלריה (Claude Vision)</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: "6px 0 12px" }}>
          מריץ את ה-Edge Function <code style={{ color: C.goldLight }}>gallery-ocr</code> על תמונות שטרם עובדו (50 בכל מנה). רץ על מפתח ה-Anthropic שלך. "הרץ עד הסוף" ממשיך אוטומטית עד שאין ממתינים.
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
              <BtnGold onClick={runSingle}>הרץ 50 הבאים</BtnGold>
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

function Center({ children }) {
  return <div style={{ direction: "rtl", textAlign: "center", color: C.muted, fontFamily: F.body, padding: "120px 24px", fontSize: 16 }}>{children}</div>;
}
function Loading() { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען…</div>; }
function Stat({ label, value }) {
  return (
    <div style={{ ...card, textAlign: "center", minWidth: 130, flex: 1 }}>
      <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 30, fontWeight: 800 }}>{value}</div>
      <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ===== 📊 סטטיסטיקות =====
const LINK = C.goldBright;  // צבע קישור אחיד בכל הפאנל
const FUTURE_SOURCES = [
  { icon: "📈", name: "Google Analytics 4", desc: "תנועה חיה, קהל, התנהגות, המרות" },
  { icon: "🔎", name: "Google Search Console", desc: "מילות חיפוש, חשיפות, מיקום ממוצע" },
  { icon: "🟢", name: "משתמשים כעת (Realtime)", desc: "כמה גולשים מחוברים ברגע זה" },
  { icon: "📱", name: "מקורות חברתיים", desc: "פייסבוק / טיקטוק / וואטסאפ — הפניות ושיתופים" },
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

function StatsTab() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [gran, setGran] = useState("day");   // day | month | year
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
  const max = Math.max(...series.map(x => x.views), 1);
  const view = series.slice(gran === "day" ? -120 : -60);   // לא להציף ברצועות
  const referrers = (s.referrers || []).slice(0, 12);
  const searches = (s.searches || []).slice(0, 12);
  const clicksOut = (s.clicks || []).slice(0, 12);
  const topPosts = (s.posts || []).slice(0, 20);
  const granLabel = gran === "year" ? "שנה" : gran === "month" ? "חודש" : "יום";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="סך צפיות (Jetpack)" value={totalViews.toLocaleString()} />
        <Stat label="פוסטים נמדדים" value={(s.posts || []).length.toLocaleString()} />
        <Stat label="מקורות הפניה" value={(s.referrers || []).length.toLocaleString()} />
        <Stat label="חיפושים" value={(s.searches || []).length.toLocaleString()} />
      </div>

      {/* Realtime placeholder */}
      <div style={{ ...card, borderColor: C.borderGold, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 30 }}>🟢</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>משתמשים כעת באתר</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>יתחבר ל-Google Analytics Realtime (תשתית מוכנה)</div>
        </div>
        <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 24, fontWeight: 800 }}>בקרוב</span>
      </div>

      {/* צפיות — יום / חודש / שנה, לחיץ */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <H>צפיות לפי {granLabel}</H>
          <span style={{ flex: 1 }} />
          {[["day", "יום"], ["month", "חודש"], ["year", "שנה"]].map(([k, l]) => (
            <button key={k} onClick={() => setGran(k)} style={{ cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: `1px solid ${gran === k ? C.gold : C.border}`, background: gran === k ? "rgba(212,175,55,0.18)" : "transparent", color: gran === k ? C.goldBright : C.muted }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: gran === "day" ? 2 : 6, height: 150, marginTop: 14, overflowX: "auto" }}>
          {view.map(r => (
            <div key={r.key} onClick={() => setSel(r)} title={`${r.key}: ${r.views.toLocaleString()} צפיות`} style={{ flex: gran === "day" ? "0 0 6px" : 1, minWidth: gran === "day" ? 6 : 14, cursor: "pointer", textAlign: "center" }}>
              <div style={{ background: sel?.key === r.key ? `linear-gradient(180deg, ${C.goldBright}, ${C.gold})` : `linear-gradient(180deg, ${C.gold}, ${C.goldDark})`, borderRadius: "3px 3px 0 0", height: `${Math.round(r.views / max * 120)}px`, minHeight: 2, boxShadow: sel?.key === r.key ? `0 0 12px ${C.gold}` : "none" }} />
              {gran !== "day" && <div style={{ color: C.muted, fontFamily: F.mono, fontSize: 9, marginTop: 4, whiteSpace: "nowrap" }}>{r.key}</div>}
            </div>
          ))}
        </div>
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

      {/* תשתית עתידית */}
      <div style={card}>
        <H>מקורות נתונים — בקרוב</H>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, margin: "4px 0 14px" }}>תשתית מוכנה לחיבור עתידי. כשתחבר חשבון — הנתונים יוצגו כאן.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {FUTURE_SOURCES.map(f => (
            <div key={f.name} style={{ border: `1px dashed ${C.borderGold}`, borderRadius: 12, padding: "14px 16px", opacity: 0.85 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{f.name}</div>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>{f.desc}</div>
              <div style={{ marginTop: 8, display: "inline-block", color: C.goldDim, fontFamily: F.heading, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 999, padding: "2px 10px" }}>🔌 לא מחובר</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== 📋 רשימת תפוצה =====
function SubscribersTab() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { adminGetSubscribers().then(setRows).catch(e => setErr(e.message || "שגיאה")); }, []);
  if (err) return <div style={{ color: C.crimsonLight, textAlign: "center", padding: 30 }}>{err}</div>;
  if (!rows) return <Loading />;
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <H>{rows.length.toLocaleString()} נרשמים</H>
        <span style={{ flex: 1 }} />
        <BtnGold onClick={() => downloadCsv("subscribers.csv", [["email", "name", "source", "active", "created_at"], ...rows.map(r => [r.email, r.name, r.source, r.active, r.created_at])])}>⬇ ייצוא CSV</BtnGold>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>מייל</th><th style={th}>שם</th><th style={th}>מקור</th><th style={th}>תאריך</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, fontFamily: F.mono, direction: "ltr", textAlign: "right" }}>{r.email}</td>
                <td style={td}>{r.name || "—"}</td>
                <td style={{ ...td, color: C.muted }}>{r.source || "—"}</td>
                <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>אין נרשמים עדיין.</Empty>}
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
          <span style={{ flex: 1 }} />
          <button onClick={() => setDraft({ id: s.id, name: s.name, numbers: (s.numbers || []).join(", ") })} style={iconBtn}>✎ ערוך</button>
          <button onClick={() => remove(s.id)} style={iconBtn}>🗑 מחק</button>
        </div>
      ))}
      {sets.length === 0 && <Empty>אין סטים עדיין — צור את הראשון.</Empty>}
    </div>
  );
}

const iconBtn = { cursor: "pointer", background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12 };
function BtnGold({ children, onClick }) {
  return <button onClick={onClick} style={{ cursor: "pointer", background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(8,5,2,0.4))", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</button>;
}
function H({ children }) { return <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{children}</span>; }
function Empty({ children }) { return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>{children}</div>; }
