import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { GA_ENABLED } from "../lib/analytics.js";

// כתובת הטמעה של דוח Looker Studio (GA4) — מוגדר ב-VITE_LOOKER_URL
const LOOKER_URL = import.meta.env.VITE_LOOKER_URL || "";
import {
  getTrafficStats, adminGetMessages, adminSetMessageRead, adminGetSubscribers,
  getNumberSets, saveNumberSet, deleteNumberSet, getOcrCounts, runOcrBatch,
  getTopicCards, setTopicCardStatus, updateTopicCard, getGalleryImagesByIds,
  getImageConnections, findGalleryImages, createTopicCardDraft,
  supabase,
} from "../lib/supabase.js";

// ===== פאנל הניהול (/admin) — נעול ל-role=admin, טאבים =====
const TABS = [
  { key: "stats",    label: "📊 סטטיסטיקות" },
  { key: "subs",     label: "📋 רשימת תפוצה" },
  { key: "messages", label: "✉️ פניות" },
  { key: "emails",   label: "📧 מיילים" },
  { key: "sets",     label: "🖼 סטים ותמונות" },
  { key: "topics",   label: "🎴 כרטיסי נושא" },
  { key: "upload",   label: "📷 העלאת תמונה" },
  { key: "ocr",      label: "🔤 OCR" },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }) : "";
const card = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" };
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

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState("stats");
  const mobile = useIsMobile();

  if (loading) return <Center>טוען…</Center>;
  if (!user) return <Center>נדרשת התחברות. <Link to="/login" style={{ color: C.goldBright }}>כניסה →</Link></Center>;
  if (!isAdmin) return <Center>אין לך הרשאת ניהול.</Center>;

  return (
    <div style={{ direction: "rtl", width: "100%", maxWidth: "100%", margin: 0, padding: mobile ? "22px 12px 80px" : "36px clamp(14px, 3vw, 56px) 90px", boxSizing: "border-box", overflowX: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>לוח בקרה</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>⚙️ ניהול סוד 1820</h1>
      </div>

      {/* טאבים — במובייל גלילה אופקית במקום שבירת שורות צפופה */}
      <div style={{ display: "flex", flexWrap: mobile ? "nowrap" : "wrap", justifyContent: mobile ? "flex-start" : "center", gap: 8, marginBottom: 26, overflowX: mobile ? "auto" : "visible", paddingBottom: mobile ? 6 : 0, WebkitOverflowScrolling: "touch" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: mobile ? 13 : 14, fontWeight: 700, padding: mobile ? "8px 14px" : "9px 18px", borderRadius: 999, whiteSpace: "nowrap", flex: "0 0 auto",
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
      {tab === "topics" && <TopicsTab />}
      {tab === "upload" && <ImageUploadTab />}
      {tab === "ocr" && <OcrTab />}
    </div>
  );
}

// ===== 🎴 כרטיסי נושא — חיבורים שה-AI הכין, האדמין מאשר =====
function TopicsTab() {
  const [cards, setCards] = useState(null);
  const [imgMap, setImgMap] = useState({});
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
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

  if (!cards) return <Loading />;
  if (!cards.length) return <Empty>אין כרטיסי נושא עדיין. ה-AI יכין חיבורים ותראה אותם כאן לאישור.</Empty>;

  const draftCount = cards.filter(c => c.status === "draft").length;
  const numChip = (n, hot) => (
    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: hot ? 15 : 12.5, padding: hot ? "4px 12px" : "2px 9px", borderRadius: 999,
      border: `1px solid ${hot ? C.gold : C.border}`, background: hot ? "rgba(212,175,55,0.18)" : "transparent", color: hot ? C.goldBright : C.goldDim }}>{n}</span>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <HuntBox onCreated={load} />
      <H>{cards.length} כרטיסי נושא · {draftCount} ממתינים לאישור</H>
      {cards.map(c => {
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
              <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 21, fontWeight: 700 }}>{c.title}</span>
              <span style={{ color: sColor, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{sLabel}</span>
              <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>★ {c.quality}/10</span>
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
                {f.bullets.map((b, i) => <li key={i}>{b}</li>)}
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
  { icon: "📈", name: "Google Analytics 4", desc: "תנועה חיה, קהל, התנהגות, המרות", live: GA_ENABLED },
  { icon: "🟢", name: "משתמשים כעת (Realtime)", desc: "כמה גולשים מחוברים ברגע זה — דרך GA4", live: GA_ENABLED },
  { icon: "📊", name: "Vercel Web Analytics", desc: "מבקרים, צפיות ומקורות תנועה — בלוח הבקרה של Vercel", live: true },
  { icon: "🔎", name: "Google Search Console", desc: "מילות חיפוש, חשיפות, מיקום ממוצע", live: false },
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

function StatsTab() {
  const mobile = useIsMobile();
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
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <Stat label="סך צפיות (Jetpack)" value={totalViews.toLocaleString()} />
        <Stat label="פוסטים נמדדים" value={(s.posts || []).length.toLocaleString()} />
        <Stat label="מקורות הפניה" value={(s.referrers || []).length.toLocaleString()} />
        <Stat label="חיפושים" value={(s.searches || []).length.toLocaleString()} />
      </div>

      {/* Google Analytics — סטטוס איסוף + דוח Looker חי */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: LOOKER_URL ? 12 : 0 }}>
          <span style={{ fontSize: 26 }}>📈</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>Google Analytics (חי)</div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>
              איסוף נתונים: {GA_ENABLED
                ? <b style={{ color: "#5fbf6a" }}>✅ פעיל (gtag מותקן)</b>
                : <b style={{ color: C.goldDim }}>⚠️ לא פעיל — הגדירו VITE_GA_ID</b>}
            </div>
          </div>
          {GA_ENABLED && <span style={{ color: "#5fbf6a", fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>LIVE</span>}
        </div>
        {LOOKER_URL ? (
          <iframe title="Google Analytics — Looker Studio" src={LOOKER_URL}
            style={{ width: "100%", height: mobile ? 460 : 640, border: `1px solid ${C.border}`, borderRadius: 12, background: "#fff" }}
            allowFullScreen />
        ) : (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.95, borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ color: C.goldLight, fontWeight: 700, marginBottom: 4 }}>להצגת דוח חי כאן (מאיפה נכנסו, Realtime, מכשירים, ערים, דפים):</div>
            1. ב-<a href="https://lookerstudio.google.com" target="_blank" rel="noopener noreferrer" style={linkA}>Looker Studio</a> צרו דוח מחובר ל-GA4.<br />
            2. שיתוף → "כל מי שיש לו את הקישור" → העתיקו את כתובת ה-Embed.<br />
            3. הגדירו אותה כמשתנה סביבה <b style={{ color: C.goldLight }}>VITE_LOOKER_URL</b> ב-Vercel — והדוח יופיע כאן.
          </div>
        )}
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
              <div style={{ display: "flex", alignItems: "flex-end", gap: gran === "day" ? 2 : 6, height: "100%", minWidth: gran === "day" ? view.length * 8 : "100%", paddingInline: 2 }}>
                {view.map(r => (
                  <div key={r.key} onClick={() => setSel(r)} title={`${r.key}: ${r.views.toLocaleString()} צפיות`}
                    style={{ flex: gran === "day" ? "0 0 6px" : 1, minWidth: gran === "day" ? 6 : 14, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer" }}>
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
