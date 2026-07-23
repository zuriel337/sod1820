import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { thumb } from "../../lib/img.js";
import { supabase, getMyResearch } from "../../lib/supabase.js";
import { getMatricesByOwner, getMyMatrices, moderateMatrix } from "../../lib/elsMatrices.js";
import { getResearcherProfile, getResearcherStats } from "../../lib/contributions.js";
import WaChatWindow from "../WaChatWindow.jsx";
import { METHODS } from "../../lib/gematria.js";
import { useWaLink } from "../../lib/userCenter/useWaLink.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import AskRaziel from "../AskRaziel.jsx";

const RAZIEL_WA = "972557049261";   // רזיאל — הסוכן בוואטסאפ (Green API)

const RAGIL = METHODS.find(m => m.key === "רגיל");
const nameValue = (name) => { try { return RAGIL ? RAGIL.fn(name) : 0; } catch { return 0; } };

// 📁 אזורי «תיק המחקר» (researcher_dossier_law) — נטענים על ContributorPage לפי c.user_id.
// עדשות על הקיים (עץ אחד): צפנים=els_records · השפעה=research_level_of · יומן=timestamps.
// המחקר במרכז, לא המשתמש. כל פריט מצביע לעמוד קנוני (/codes/:slug, /number/:n), לא משכפל.

function heYear(ts) { try { return new Date(ts).getFullYear(); } catch { return null; } }
function heDate(ts) { try { return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } }

// 📊 השפעה מחקרית — במקום עוקבים/לייקים. מדדי-מחקר בלבד.
function ImpactBar({ P, level, matrices }) {
  const published = matrices.filter(m => m.status === "published").length;
  const inDossier = matrices.length;
  const stats = [
    level?.contrib > 0 && { n: level.contrib, label: "חידושים שאושרו" },
    published > 0 && { n: published, label: "צפנים פורסמו" },
    inDossier > 0 && { n: inDossier, label: "צפנים בתיק" },
    level?.posts > 0 && { n: level.posts, label: "מחקרים" },
    level?.whatsapp > 0 && { n: level.whatsapp.toLocaleString("he-IL"), label: "רמזים בוואטסאפ" },
  ].filter(Boolean);
  if (!stats.length) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800, textAlign: "center", marginBottom: 10 }}>📊 השפעה מחקרית</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ minWidth: 104, textAlign: "center", background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "13px 16px" }}>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{s.n}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🔬 תחומי מחקר — אוטומטי מהפעילות (עריך בעתיד). מצביע על מה החוקר מתמקד.
function ResearchDomains({ P, level, matrices, tags }) {
  const domains = useMemo(() => {
    const d = [];
    if (matrices.length) d.push("🔠 דילוגי אותיות");
    if (level?.xp) d.push("🔢 גימטריה");
    if (level?.posts > 0) d.push("📖 פסוקים ומקורות");
    if (level?.whatsapp > 0) d.push("🌍 רמזי מציאות");
    if (Array.isArray(tags) && tags.some(t => /אנגלית|שפ/.test(String(t)))) d.push("🌐 שפות");
    return d;
  }, [level, matrices, tags]);
  if (!domains.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 7 }}>🔬 מתמקד ב־</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {domains.map((t, i) => (
          <span key={i} style={{ color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "5px 13px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// 🏅 כרטיס-החוקר המפואר — הריבוע בראש הדף: דרגה + ניקוד, ספירות (צפנים/ממצאים/גימטריות/פוסטים),
//    ורשימת הגימטריות שהכניס למערכת. עדשה על researcher_stats RPC. theme-safe (usePalette).
function ResearcherStatsCard({ P, c, name, level }) {
  const [s, setS] = useState(null);
  const [allGem, setAllGem] = useState(false);
  useEffect(() => { let a = true; getResearcherStats(c?.user_id, name).then(r => { if (a) setS(r); }).catch(() => {}); return () => { a = false; }; }, [c?.user_id, name]);
  if (!s) return null;
  const gems = Array.isArray(s.gematrias) ? s.gematrias : [];
  const icon = ["🌱", "🌿", "🔬", "🎓", "👑"][(level?.level || 1) - 1] || "🌱";
  const tiles = [
    { n: s.ciphers, label: "צפנים", ic: "🔠" },
    { n: s.findings, label: "ממצאים", ic: "📱" },
    { n: gems.length, label: "גימטריות", ic: "🔢" },
    { n: s.posts, label: "פוסטים", ic: "📝" },
  ].filter(t => t.n > 0);
  if (!tiles.length && !s.points && !gems.length) return null;
  const shown = allGem ? gems : gems.slice(0, 8);
  return (
    <div style={{ marginBottom: 22, borderRadius: 18, padding: 2, background: `linear-gradient(135deg, ${P.accent}, ${P.border} 55%, ${P.accent})`, boxShadow: `0 10px 34px ${P.glow}` }}>
      <div style={{ borderRadius: 16, background: P.cardGrad || P.card, padding: "18px 18px 16px" }}>
        {/* דרגה + ניקוד */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 30 }}>{icon}</span>
            <div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>{s.rank || level?.label || "חוקר"}</div>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>תיק המחקר של {name}</div>
            </div>
          </div>
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{(s.points || 0).toLocaleString("he-IL")}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>נקודות</div>
          </div>
        </div>

        {/* אריחי-ספירה */}
        {tiles.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 8, marginTop: 14 }}>
            {tiles.map(t => (
              <div key={t.label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "9px 6px", textAlign: "center" }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{t.n.toLocaleString("he-IL")}</div>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>{t.ic} {t.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* פירוק-ניקוד */}
        {(s.accepted || s.validated || s.promoted) > 0 && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>
            {s.accepted > 0 && <span>✅ {s.accepted} אושרו</span>}
            {s.validated > 0 && <span>🔬 {s.validated} אומתו</span>}
            {s.promoted > 0 && <span>💎 {s.promoted} הוקרנו לעץ</span>}
          </div>
        )}

        {/* הגימטריות שהכניס למערכת */}
        {gems.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>🔢 הגימטריות שלו במערכת ({gems.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {shown.map((g, i) => (
                <span key={i} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: "5px 11px", color: P.accentText, fontFamily: F.body, fontSize: 12.5, fontWeight: 600, direction: "rtl" }}>{g}</span>
              ))}
              {gems.length > 8 && (
                <button onClick={() => setAllGem(v => !v)} style={{ cursor: "pointer", background: "transparent", border: `1px dashed ${P.accent}`, borderRadius: 999, padding: "5px 11px", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>
                  {allGem ? "פחות ▲" : `עוד ${gems.length - 8} ▼`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔠 המחקר שלי — הצפנים בתיק. עדשה על els_records (self_published/published). מקשר לעמוד הקנוני.
// 👑 אדמין: על צופן שעדיין «בתיק» (status!=published) מוצג «⬆️ קדם לספרייה» — מקדם לספרייה הראשית
//    (moderate→published) מבלי לצאת מדף-האדם. כך צוריאל מחליט מה עולה לראשי (els_dossier_default_law).
function DossierMatrices({ P, name, matrices, isAdmin, onPromote }) {
  const [busyId, setBusyId] = useState(null);
  if (!matrices.length) return null;
  const promote = async (id) => {
    setBusyId(id);
    try { await onPromote(id); } catch { /* נשאר בתיק */ }
    setBusyId(null);
  };
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 4 }}>🔠 הצפנים של {name}</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>מטריצות-דילוג שגילה. לחיצה פותחת את עמוד-הצופן המלא.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
        {matrices.map(m => {
          const promoted = m.status === "published";
          return (
            <div key={m.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Link to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", flex: 1 }}>
                {m.image_url ? (
                  <img src={thumb(m.image_url, 420)} alt={m.title || m.search_term} loading="lazy" style={{ width: "100%", aspectRatio: "1.3", objectFit: "cover", background: "#0a0700", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1.3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: P.cardGrad || P.card, color: P.accentText, fontSize: 18, fontWeight: 800, textAlign: "center", padding: 12 }}>
                    <img src="/els-icon.png" alt="" width="38" height="38" style={{ borderRadius: 9, objectFit: "cover" }} />{m.search_term}
                  </div>
                )}
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{m.title || m.search_term}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>
                    {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
                    {!promoted && <span style={{ color: "#9a6b00" }}> · ⏳ בתיק</span>}
                  </div>
                </div>
              </Link>
              {isAdmin && (
                promoted ? (
                  <div style={{ borderTop: `1px solid ${P.border}`, color: "#1c7a38", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, textAlign: "center", padding: "7px 8px" }}>✦ בספרייה הראשית</div>
                ) : (
                  <button onClick={() => promote(m.id)} disabled={busyId === m.id} style={{ cursor: "pointer", borderTop: `1px solid ${P.border}`, border: "none", borderRadius: 0, background: "rgba(28,122,56,.12)", color: "#1c7a38", fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "8px", minHeight: 36 }}>
                    {busyId === m.id ? "…" : "⬆️ קדם לספרייה"}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 📱 ממצאים — עדשה על research_contributions (חידושי/ממצאי הכתב, כולל ווטסאפ מנותב). approved בלבד.
//    עץ אחד: כל ממצא מקשר ליעד הקנוני (/number · /topic), לא משכפל.
// 👑 אדמין: על ממצא גולמי (status=published, בדף בלבד) מוצג «⬆️ קדם לפורום» → moderate→approved,
//    מעביר אותו לפיד-הפורום הציבורי (החלטת צוריאל: גולמי-וואטסאפ נשאר בדף, אתה אוצר מה עולה לפורום).
function DossierFindings({ P, name, isAdmin }) {
  const [items, setItems] = useState(null);
  useEffect(() => { let a = true; getResearcherProfile(name, 80).then(r => { if (a) setItems(r?.items || []); }).catch(() => a && setItems([])); return () => { a = false; }; }, [name]);
  if (!items || !items.length) return null;
  // 📱 קופסת-הוואטסאפ — סגורה כברירת-מחדל, נפתחת בלחיצה על הכותרת. כל ההודעות בקופסה אחת,
  //    לא מתפזרות על הדף (החלטת צוריאל). אדמין מוציא משם לפורום («קדם לפורום» על כל בועה).
  return (
    <div style={{ marginBottom: 26 }}>
      <WaChatWindow name={name} items={items} isAdmin={isAdmin} height={440} collapsible defaultOpen={false} />
    </div>
  );
}

// 🧭 יומן המחקר — ציר-זמן. מנוע-אבני-דרך אוטומטי מ-timestamps קיימים (אין הזנה ידנית).
function ResearchJournal({ P, name, level, matrices, joinedAt }) {
  const milestones = useMemo(() => {
    const ms = [];
    if (joinedAt) ms.push({ ts: joinedAt, icon: "🌱", text: "הצטרף לקהילת המחקר" });
    const sorted = [...matrices].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    if (sorted.length) ms.push({ ts: sorted[0].created_at, icon: "🔠", text: `גילה את הצופן הראשון — «${sorted[0].title || sorted[0].search_term}»` });
    const firstPub = sorted.find(m => m.status === "published");
    if (firstPub) ms.push({ ts: firstPub.created_at, icon: "✓", text: `הצופן הראשון פורסם לאתר — «${firstPub.title || firstPub.search_term}»` });
    if (matrices.length >= 3) ms.push({ ts: sorted[Math.min(2, sorted.length - 1)].created_at, icon: "📚", text: `${matrices.length} צפנים בתיק המחקר` });
    const link1820 = matrices.find(m => m.primary_number === 1820 || (Array.isArray(m.anchor_numbers) && m.anchor_numbers.includes(1820)));
    if (link1820) ms.push({ ts: link1820.created_at, icon: "👑", text: "מצא קשר ל-1820" });
    if (level?.posts > 0) ms.push({ ts: joinedAt, icon: "📝", text: `פרסם ${level.posts} מחקרים` });
    // מיון כרונולוגי + קיבוץ לפי שנה
    return ms.filter(m => m.ts).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  }, [level, matrices, joinedAt]);

  if (!milestones.length) return null;
  const byYear = {};
  milestones.forEach(m => { const y = heYear(m.ts) || "—"; (byYear[y] = byYear[y] || []).push(m); });

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 4 }}>🧭 יומן המחקר</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>הדרך שעבר {name} — אבני-הדרך שנאספו לאורך המסע.</div>
      {Object.keys(byYear).sort().reverse().map(year => (
        <div key={year} style={{ marginBottom: 14 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{year}</div>
          <div style={{ borderInlineStart: `2px solid ${P.border}`, paddingInlineStart: 14, display: "grid", gap: 10 }}>
            {byYear[year].map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, flex: "none", marginTop: 1 }}>{m.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, marginTop: 1 }}>{heDate(m.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 🟢 «כרגע אני חוקר…» — מעבדה חיה. עריכה inline לבעלים (נשמר ל-dossier_settings.current_focus).
function CurrentFocus({ P, focus, isOwner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(focus || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(focus || ""); }, [focus]);
  async function save() {
    setBusy(true);
    try { await onSave(val.trim()); setEditing(false); } catch { /* noop */ }
    setBusy(false);
  }
  if (!focus && !isOwner) return null;
  return (
    <div style={{ marginBottom: 20, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: `3px solid #25d366`, borderRadius: 12, padding: "12px 15px" }}>
      <div style={{ color: "#1a9e4b", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 5 }}>🟢 כרגע אני חוקר…</div>
      {editing ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={val} onChange={e => setVal(e.target.value)} dir="auto" autoFocus
            placeholder="למשל: את הקשרים בין 2212 לעשרה בטבת"
            style={{ flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: 10, background: P.cardSoft, border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 15, outline: "none" }} />
          <button onClick={save} disabled={busy} style={{ background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{busy ? "…" : "שמור"}</button>
          <button onClick={() => { setEditing(false); setVal(focus || ""); }} style={{ background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 10, padding: "0 14px", fontFamily: F.heading, fontSize: 13, cursor: "pointer" }}>ביטול</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.5, flex: 1 }}>{focus || <span style={{ color: P.accentDim }}>הוסף שורה על מה שאתה חוקר עכשיו…</span>}</div>
          {isOwner && <button onClick={() => setEditing(true)} title="ערוך" style={{ background: "none", border: "none", color: P.accentDim, cursor: "pointer", fontSize: 14 }}>✏️</button>}
        </div>
      )}
    </div>
  );
}

// 🧑 על החוקר — קטן (זהות). ביו + גימטריית-השם (מנוע רשמי, רגיל). עריכה inline לבעלים.
function AboutResearcher({ P, name, about, isOwner, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(about || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(about || ""); }, [about]);
  const nv = nameValue(name);
  async function save() { setBusy(true); try { await onSave(val.trim()); setEditing(false); } catch { /* noop */ } setBusy(false); }
  if (!about && !isOwner && !nv) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>🧑 על החוקר</div>
        {isOwner && !editing && <button onClick={() => setEditing(true)} title="ערוך" style={{ background: "none", border: "none", color: P.accentDim, cursor: "pointer", fontSize: 13 }}>✏️</button>}
      </div>
      {editing ? (
        <div style={{ display: "grid", gap: 8 }}>
          <textarea value={val} onChange={e => setVal(e.target.value)} dir="auto" rows={3} autoFocus
            placeholder="כמה מילים על עצמך ותחומי-העניין שלך…"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: P.cardSoft, border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 15, outline: "none", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={busy} style={{ background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 10, padding: "8px 16px", fontFamily: F.heading, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{busy ? "…" : "שמור"}</button>
            <button onClick={() => { setEditing(false); setVal(about || ""); }} style={{ background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 10, padding: "8px 14px", fontFamily: F.heading, fontSize: 13, cursor: "pointer" }}>ביטול</button>
          </div>
        </div>
      ) : (
        about ? <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.7 }}>{about}</div>
              : isOwner && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5 }}>הוסף כמה מילים על עצמך…</div>
      )}
      {nv > 0 && (
        <div style={{ marginTop: 9 }}>
          <Link to={`/number/${nv}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: P.accentText, background: P.glow, border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
            🔢 {name} = {nv} <span style={{ color: P.accentDim, fontWeight: 400, fontSize: 11 }}>(גימטריה רגילה · מאומת במנוע)</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// 🔬 מה חקרתי — ביטויים/מספרים שהחוקר חקר (research_items, owner-only דרך RLS). זיכרון-המחקר החי:
// «המחקר שלך מחכה לך» — לחיצה חוזרת אל דף-המספר/הביטוי. מוצג רק לבעלים (אחרים חסומים ב-RLS ממילא).
function MyResearchExplored({ P, isOwner }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!isOwner) { setItems([]); return; }
    let alive = true;
    getMyResearch({ limit: 30, types: ["number", "phrase"] }).then(r => { if (alive) setItems(Array.isArray(r) ? r : []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [isOwner]);
  if (!isOwner || !items || !items.length) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 4 }}>🔬 מה חקרתי</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>ביטויים ומספרים שחקרת — לחיצה מחזירה אותך אל המחקר. <span style={{ opacity: 0.75 }}>(רואה רק אתה)</span></div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {items.map((r, i) => (
          <Link key={i} to={r.link || `/number/${encodeURIComponent(r.entity_ref)}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", color: P.accentText, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "6px 12px", fontFamily: r.entity_type === "number" ? F.mono : F.heading, fontSize: 13.5, fontWeight: 700 }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{r.entity_type === "number" ? "🔢" : "✦"}</span>{r.title || r.entity_ref}
          </Link>
        ))}
      </div>
    </div>
  );
}

// 🕸 הקשרים שלי — המספרים/הישויות שהמחקר נוגע בהם (מ-primary_number + anchor_numbers).
// הופך את התיק לחלק מהעץ: כל מספר מצביע לדף-המספר הקנוני (/number/:n). לא משכפל.
function Connections({ P, matrices }) {
  const nums = useMemo(() => {
    const m = new Map();
    matrices.forEach(x => {
      [x.primary_number, ...(Array.isArray(x.anchor_numbers) ? x.anchor_numbers : [])]
        .filter(n => Number.isFinite(n) && n > 0)
        .forEach(n => m.set(n, (m.get(n) || 0) + 1));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, 24);
  }, [matrices]);
  if (!nums.length) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 4 }}>🕸 הקשרים שלי</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>המספרים שהמחקר נוגע בהם — כל אחד מוביל לדף-המספר בעץ הידע.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {nums.map(([n, cnt]) => (
          <Link key={n} to={`/number/${n}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: P.accentText, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: "6px 12px", fontFamily: F.mono, fontSize: 14, fontWeight: 700 }}>
            {n}{cnt > 1 && <span style={{ color: P.accentDim, fontSize: 11, fontFamily: F.body }}>×{cnt}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ⚙️ בקרת-בעלים — נראות התיק (ציבורי/לא-רשום/פרטי). נשמר ל-dossier_settings.visibility.
function OwnerControls({ P, visibility, onSave }) {
  const [busy, setBusy] = useState(false);
  const opts = [
    { v: "public", label: "🌍 ציבורי", hint: "גלוי לכולם ובגוגל" },
    { v: "unlisted", label: "🔗 קישור בלבד", hint: "רק מי שיש לו הקישור · לא בגוגל" },
    { v: "private", label: "🔒 פרטי", hint: "רק אתה רואה" },
  ];
  const cur = visibility || "public";
  async function pick(v) { if (v === cur) return; setBusy(true); try { await onSave(v); } catch { /* noop */ } setBusy(false); }
  return (
    <div style={{ marginBottom: 18, background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 12, padding: "11px 14px" }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 8 }}>⚙️ התיק שלך — מי רואה? <span style={{ fontWeight: 400 }}>(רק אתה רואה את הבקרה הזו)</span></div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {opts.map(o => {
          const on = o.v === cur;
          return (
            <button key={o.v} onClick={() => pick(o.v)} disabled={busy} title={o.hint}
              style={{ cursor: busy ? "default" : "pointer", border: `1px solid ${on ? P.accent : P.border}`, background: on ? P.glow : "none",
                color: on ? P.accentText : P.accentDim, borderRadius: 999, padding: "6px 13px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11, marginTop: 7 }}>{opts.find(o => o.v === cur)?.hint}</div>
    </div>
  );
}

// 🤖 הסוכן האישי (רזיאל) + חיבור-וואטסאפ — לבעלים בלבד. חיבור-הוואטסאפ = «הסוכן מזהה אותך».
function AgentConnect({ P, isOwner }) {
  const { linked } = useWaLink();
  if (!isOwner) return null;
  const waUrl = `https://wa.me/${RAZIEL_WA}?text=${encodeURIComponent("שלום רזיאל 🌳 אני מתיק המחקר שלי באתר — ")}`;
  return (
    <div style={{ marginBottom: 22, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderInlineStart: "3px solid #25d366", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🤖</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>הסוכן האישי · רזיאל</div>
        <span style={{ marginInlineStart: "auto", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, color: linked ? "#1a9e4b" : P.accentDim }}>{linked ? "🟢 וואטסאפ מחובר" : "○ לא מחובר"}</span>
      </div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
        רזיאל הוא הסוכן שלך בוואטסאפ — שאל שאלות, קבל רמזים אישיים, ושמור גילויים ישר לתיק.
        {!linked && " חבר את הוואטסאפ שלך כדי שרזיאל יזהה אותך."}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", background: "#25d366", color: "#fff", borderRadius: 10, padding: "10px 16px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>💬 דבר עם רזיאל</a>
        {!linked && <Link to="/profile#whatsapp" style={{ textDecoration: "none", background: "none", border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 10, padding: "10px 16px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>🔗 חבר את הוואטסאפ שלי</Link>}
      </div>
    </div>
  );
}

export default function DossierExtras({ P, c, level, isOwner, onCount }) {
  const [matrices, setMatrices] = useState([]);
  const [joinedAt, setJoinedAt] = useState(null);
  const [settings, setSettings] = useState(c?.dossier_settings || {});
  const { isAdmin } = useAuth();
  const name = c?.display_name || "החוקר";

  // 👑 אדמין — קידום צופן מדף-האדם לספרייה הראשית (moderate→published), עדכון אופטימי מקומי.
  const promoteMatrix = useCallback(async (id) => {
    await moderateMatrix(id, "published");
    setMatrices(list => list.map(m => (m.id === id ? { ...m, status: "published" } : m)));
  }, []);

  useEffect(() => { setSettings(c?.dossier_settings || {}); }, [c]);

  useEffect(() => {
    if (!c?.user_id) return;
    let alive = true;
    // 🔑 הבעלים רואה את *כל* הצפנים שלו בתיק (כולל ממתינים) — כדי שצופן טרי יופיע מיד. צופה-אחר: רק ציבורי/בתיק.
    const load = isOwner ? getMyMatrices(c.user_id).then(a => (a || []).filter(m => m.status !== "hidden")) : getMatricesByOwner(c.user_id);
    load.then(r => { if (alive) { const arr = Array.isArray(r) ? r : []; setMatrices(arr); onCount?.(arr.length); } }).catch(() => { if (alive) onCount?.(0); });
    supabase.from("profiles").select("joined_at").eq("user_id", c.user_id).maybeSingle()
      .then(({ data }) => { if (alive) setJoinedAt(data?.joined_at || c.created_at || null); }).catch(() => { if (alive) setJoinedAt(c.created_at || null); });
    return () => { alive = false; };
  }, [c?.user_id, c?.created_at, isOwner]);

  // שמירה מרוכזת ל-dossier_settings (על החוקר / כרגע-אני-חוקר / נראות) — RPC update_my_dossier.
  const saveSettings = useCallback(async (patch) => {
    const { data } = await supabase.rpc("update_my_dossier", { p_settings: patch });
    if (data?.ok) setSettings(s => ({ ...s, ...patch }));
    return data;
  }, []);

  if (!c?.user_id) return null;
  const about = settings.about || c?.bio || "";
  const rzNumbers = [...new Set(matrices.flatMap(m => [m.primary_number, ...(Array.isArray(m.anchor_numbers) ? m.anchor_numbers : [])]).filter(n => Number.isFinite(n) && n > 0))].slice(0, 8);
  const rzFacts = `חוקר: ${name}. ${matrices.length} צפנים בתיק${level?.contrib ? `, ${level.contrib} חידושים מאושרים` : ""}${level?.label ? `, דרגה: ${level.label}` : ""}.${rzNumbers.length ? ` מספרים שהמחקר נוגע בהם: ${rzNumbers.join(", ")}.` : ""}`;
  return (
    <div>
      {isOwner && <OwnerControls P={P} visibility={settings.visibility} onSave={v => saveSettings({ visibility: v })} />}
      <AgentConnect P={P} isOwner={isOwner} />
      <AboutResearcher P={P} name={name} about={about} isOwner={isOwner} onSave={t => saveSettings({ about: t })} />
      {matrices.length > 0 && (
        <AskRaziel kind="research" subject={name} facts={rzFacts} palette={P}
          greeting={isOwner ? "עברתי על המחקר שלך, ומצאתי כמה נקודות שעשויות לעניין אותך." : "עברתי על המחקר הזה, ומצאתי כמה נקודות שעשויות לעניין אותך."}
          waText={`שלום רזיאל 🌳 בקשר לתיק המחקר של ${name} — `} />
      )}
      <CurrentFocus P={P} focus={settings.current_focus || ""} isOwner={isOwner} onSave={t => saveSettings({ current_focus: t })} />
      <ResearcherStatsCard P={P} c={c} name={name} level={level} />
      <ResearchDomains P={P} level={level} matrices={matrices} tags={c?.tags} />
      <DossierMatrices P={P} name={name} matrices={matrices} isAdmin={isAdmin} onPromote={promoteMatrix} />
      <DossierFindings P={P} name={name} isAdmin={isAdmin} />
      <MyResearchExplored P={P} isOwner={isOwner} />
      <ResearchJournal P={P} name={name} level={level} matrices={matrices} joinedAt={joinedAt} />
      <Connections P={P} matrices={matrices} />
    </div>
  );
}
