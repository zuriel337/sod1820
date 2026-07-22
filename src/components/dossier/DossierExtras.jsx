import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { thumb } from "../../lib/img.js";
import { supabase } from "../../lib/supabase.js";
import { getMatricesByOwner } from "../../lib/elsMatrices.js";

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

// 🔠 המחקר שלי — הצפנים בתיק. עדשה על els_records (self_published/published). מקשר לעמוד הקנוני.
function DossierMatrices({ P, name, matrices }) {
  if (!matrices.length) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800, marginBottom: 4 }}>🔠 הצפנים של {name}</div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 12 }}>מטריצות-דילוג שגילה. לחיצה פותחת את עמוד-הצופן המלא.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
        {matrices.map(m => (
          <Link key={m.id} to={`/codes/${encodeURIComponent(m.slug || m.id)}`} style={{ textDecoration: "none", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
                {m.status !== "published" && <span style={{ color: "#9a6b00" }}> · ⏳ בתיק</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
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

export default function DossierExtras({ P, c, level, isOwner }) {
  const [matrices, setMatrices] = useState([]);
  const [joinedAt, setJoinedAt] = useState(null);
  const settings = c?.dossier_settings || {};
  const [focus, setFocus] = useState(settings.current_focus || "");
  const name = c?.display_name || "החוקר";

  useEffect(() => { setFocus((c?.dossier_settings || {}).current_focus || ""); }, [c]);

  useEffect(() => {
    if (!c?.user_id) return;
    let alive = true;
    getMatricesByOwner(c.user_id).then(r => { if (alive) setMatrices(Array.isArray(r) ? r : []); }).catch(() => {});
    supabase.from("profiles").select("joined_at").eq("user_id", c.user_id).maybeSingle()
      .then(({ data }) => { if (alive) setJoinedAt(data?.joined_at || c.created_at || null); }).catch(() => { if (alive) setJoinedAt(c.created_at || null); });
    return () => { alive = false; };
  }, [c?.user_id, c?.created_at]);

  const saveFocus = useCallback(async (text) => {
    const { data } = await supabase.rpc("update_my_dossier", { p_settings: { current_focus: text } });
    if (data?.ok) setFocus(text);
  }, []);

  if (!c?.user_id) return null;
  return (
    <div>
      <CurrentFocus P={P} focus={focus} isOwner={isOwner} onSave={saveFocus} />
      <ImpactBar P={P} level={level} matrices={matrices} />
      <ResearchDomains P={P} level={level} matrices={matrices} tags={c?.tags} />
      <DossierMatrices P={P} name={name} matrices={matrices} />
      <ResearchJournal P={P} name={name} level={level} matrices={matrices} joinedAt={joinedAt} />
    </div>
  );
}
