import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { C, F } from "../theme.js";
import { stripHtml } from "../lib/format.js";
import { SectionHeader } from "../components/ui.jsx";
import TimelineStrongNumbers from "../components/axis/TimelineStrongNumbers.jsx";

// ===== ציר ההתגלות — העמוד המלא =====
// כל אירועי הציר מקובצים לפי שנה, וכל תחנה מחוברת לתוכן שלה:
// הפוסט המתעד (edges: post —documents→ event) והגלריה (nodes.gallery_id).

const VIOLET = "#8458ff";

const PAGE_CSS = `
  .rev-station { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; transform-style: preserve-3d; }
  .rev-station:hover { transform: perspective(900px) rotateX(1.6deg) translateY(-5px); border-color: ${C.borderGold} !important; box-shadow: 0 14px 44px rgba(0,0,0,.55), 0 0 34px ${VIOLET}2e; }
  .rev-station.rev-target { border-color: ${VIOLET} !important; box-shadow: 0 0 0 1px ${VIOLET}, 0 0 44px ${VIOLET}55; }
  @keyframes rev-spine-glow { 0%,100% { opacity:.55; } 50% { opacity:1; } }
`;

function useAxisData() {
  const [data, setData] = useState({ events: [], convergences: [], postByEvent: {}, imagesByGallery: {}, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      // צירי התכנסות מאושרים עם תאריך — נשזרים בציר לפי כרונולוגיה
      const { data: convs } = await supabase.from("topic_cards")
        .select("slug,title,subtitle,occurred_at,highlight_numbers,quality,meter_score")
        .eq("status", "approved").not("occurred_at", "is", null);
      const convergences = (convs || []).map(c => ({ ...c, __conv: true }));

      const { data: events } = await supabase.from("nodes")
        .select("id,label,weight,hebrew_date,axis_theme,metadata,gallery_id,created_at")
        .eq("type", "event").eq("is_active", true);
      if (!alive || !events?.length) { alive && setData(d => ({ ...d, convergences, loading: false })); return; }

      const ids = events.map(e => e.id);

      // אירוע ← הפוסט המתעד: edges(documents) ← צומת פוסט ← posts לפי wp_id
      const { data: edges } = await supabase.from("edges")
        .select("from_node,to_node").eq("relation_type", "documents").in("to_node", ids);
      const postNodeIds = [...new Set((edges || []).map(e => e.from_node))];
      const { data: postNodes } = postNodeIds.length
        ? await supabase.from("nodes").select("id,metadata").in("id", postNodeIds)
        : { data: [] };
      const wpByNode = Object.fromEntries((postNodes || []).map(n => [n.id, n.metadata?.post_wp_id]).filter(([, v]) => v));
      const wpIds = [...new Set(Object.values(wpByNode))];
      const { data: posts } = wpIds.length
        ? await supabase.from("posts").select("wp_id,title,slug,image_url,date").in("wp_id", wpIds)
        : { data: [] };
      const postByWp = Object.fromEntries((posts || []).map(p => [p.wp_id, p]));
      const postByEvent = {};
      for (const ed of edges || []) {
        const post = postByWp[wpByNode[ed.from_node]];
        if (post && !postByEvent[ed.to_node]) postByEvent[ed.to_node] = post;
      }

      // אירוע ← תמונות הגלריה שלו (עד 4 לכל תחנה)
      const galleryIds = [...new Set(events.map(e => e.gallery_id).filter(Boolean))];
      const { data: images } = galleryIds.length
        ? await supabase.from("gallery_images")
            .select("gallery_id,image_url,name,ordering").in("gallery_id", galleryIds)
            .eq("published", 1).order("ordering")
        : { data: [] };
      const imagesByGallery = {};
      for (const im of images || []) {
        (imagesByGallery[im.gallery_id] ||= []).length < 4 && imagesByGallery[im.gallery_id].push(im);
      }

      alive && setData({ events, convergences, postByEvent, imagesByGallery, loading: false });
    })();
    return () => { alive = false; };
  }, []);

  return data;
}

function eventYear(ev) {
  const y = Number(ev.metadata?.year);
  if (y) return y;
  const c = new Date(ev.created_at).getFullYear();
  return Number.isFinite(c) ? c : 0;
}

function Station({ ev, post, images, isTarget }) {
  const strong = (ev.weight || 1) >= 4;
  return (
    <div id={`ev-${ev.id}`} className={`rev-station${isTarget ? " rev-target" : ""}`} style={{
      position: "relative", background: C.surface2, borderRadius: 14,
      border: `1px solid ${strong ? C.borderGold : C.border}`,
      padding: "20px 22px", marginBottom: 18,
    }}>
      {/* נקודת החיבור לחוט */}
      <div style={{
        position: "absolute", top: 26, insetInlineStart: -31, width: 13, height: 13, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #fff8e1, ${strong ? C.goldBright : VIOLET} 60%)`,
        boxShadow: `0 0 12px ${strong ? C.goldBright : VIOLET}`,
      }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        {ev.hebrew_date && (
          <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>
            🕯 {ev.hebrew_date}
          </span>
        )}
        {ev.axis_theme && (
          <span style={{ padding: "2px 10px", borderRadius: 999, border: `1px solid ${VIOLET}66`,
            color: "#b9a4ff", fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1 }}>
            {ev.axis_theme}
          </span>
        )}
        {strong && <span style={{ color: C.goldDim, fontSize: 11, fontFamily: F.heading, letterSpacing: 1 }}>★ אירוע מרכזי</span>}
      </div>

      <h3 style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 18.5, fontWeight: 700, margin: 0, lineHeight: 1.65 }}>
        {stripHtml(ev.label || "")}
      </h3>

      {post && (
        <Link to={`/${post.slug}`} style={{
          display: "flex", alignItems: "center", gap: 12, textDecoration: "none",
          marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`,
        }}>
          {post.image_url && (
            <img src={post.image_url} alt="" loading="lazy" style={{
              width: 64, height: 44, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1, marginBottom: 3 }}>📖 הפוסט המתעד</div>
            <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14.5, fontWeight: 700, lineHeight: 1.5 }}>
              {stripHtml(post.title || "")}
            </div>
          </div>
        </Link>
      )}

      {!!images?.length && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1, marginBottom: 8 }}>🖼 מהגלריה</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {images.map((im, i) => (
              <img key={i} src={im.image_url} alt={im.name || ""} loading="lazy" style={{
                width: 86, height: 62, objectFit: "cover", borderRadius: 8,
                border: `1px solid ${C.border}`, boxShadow: `0 0 14px ${VIOLET}22`,
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// פריט מקרא — נקודת צבע + הסבר
function Legend({ dot, text, pulse }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, boxShadow: `0 0 6px ${dot}`,
        animation: pulse ? "rev-spine-glow 1.6s ease-in-out infinite" : "none", flex: "0 0 auto" }} />
      {text}
    </span>
  );
}

// תחנת ציר התכנסות — נשזרת בציר ההתגלות לפי שנה, מקשרת ל-/topic
function ConvergenceStation({ c }) {
  return (
    <Link to={`/topic/${encodeURIComponent(c.slug)}`} style={{ display: "block", textDecoration: "none", position: "relative", marginBottom: 18 }}>
      <div style={{ position: "absolute", top: 24, insetInlineStart: -31, width: 13, height: 13, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #fff8e1, ${C.goldBright} 60%)`, boxShadow: `0 0 12px ${C.goldBright}` }} />
      <div style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4))", border: `1px solid ${C.gold}`, borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>🌐 ציר התכנסות</span>
          {(c.highlight_numbers || []).map(n => (
            <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 12, color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "1px 9px" }}>{n}</span>
          ))}
        </div>
        <h3 style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 18.5, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{c.title}</h3>
        {c.subtitle && <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, marginTop: 5, lineHeight: 1.6 }}>{c.subtitle}</div>}
        <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginTop: 8 }}>פתח את מרכז ההתכנסות →</div>
      </div>
    </Link>
  );
}

// פאנל אינדקס צירי ההתכנסות — צד ימין במחשב בלבד (כשפותחים את ציר הזמן)
function ConvergenceIndexPanel({ items }) {
  if (!items || !items.length) return null;
  const stars = q => { const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2))); return "★".repeat(n) + "☆".repeat(5 - n); };
  const sorted = [...items].sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0) || (b.quality || 0) - (a.quality || 0));
  return (
    <>
      <style>{`
        .tl-conv-panel { position: fixed; right: 20px; top: 88px; width: 240px; max-height: calc(100vh - 120px);
          overflow-y: auto; display: none; z-index: 5; direction: rtl; }
        @media (min-width: 1220px) { .tl-conv-panel { display: block; } }
      `}</style>
      <aside className="tl-conv-panel">
        <div style={{ background: "rgba(10,7,16,0.92)", border: `1px solid ${C.borderGold}`, borderRadius: 14, padding: "13px 14px" }}>
          <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
            🌐 צירי ההתכנסות ({sorted.length})
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {sorted.map(c => (
              <Link key={c.slug} to={`/topic/${encodeURIComponent(c.slug)}`} style={{ textDecoration: "none",
                background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(8,5,2,0.4))", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "8px 10px", display: "block" }}>
                <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{c.title}</div>
                <div style={{ color: C.gold, fontSize: 10, letterSpacing: 1, marginTop: 2 }}>{stars(c.quality)}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {(c.highlight_numbers || []).slice(0, 4).map(n => (
                    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 10.5, color: C.goldDim, border: `1px solid ${C.border}`, borderRadius: 999, padding: "0 7px" }}>{n}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function TimelinePage() {
  const { events, convergences, postByEvent, imagesByGallery, loading } = useAxisData();
  const { hash } = useLocation();

  const byYear = useMemo(() => {
    const groups = new Map(); // year -> {events, convs}
    const bucket = y => { if (!groups.has(y)) groups.set(y, { events: [], convs: [] }); return groups.get(y); };
    for (const ev of events) bucket(eventYear(ev)).events.push(ev);
    for (const c of convergences || []) bucket(new Date(c.occurred_at).getFullYear()).convs.push(c);
    for (const g of groups.values()) {
      g.events.sort((a, b) => (b.weight || 0) - (a.weight || 0) || new Date(b.created_at) - new Date(a.created_at));
      g.convs.sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0) || (b.quality || 0) - (a.quality || 0));
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [events, convergences]);

  // גלילה אל תחנה שהגיעו אליה מהפס הקבוע
  useEffect(() => {
    if (loading || !hash) return;
    const el = document.getElementById(hash.slice(1));
    el && setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }, [loading, hash]);

  return (
    <div style={{ direction: "rtl", maxWidth: 860, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <style>{PAGE_CSS}</style>
      <TimelineStrongNumbers />
      <ConvergenceIndexPanel items={convergences} />
      <SectionHeader eyebrow="המסע בזמן" title="🌅 ציר ההתגלות" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 620, margin: "-24px auto 28px" }}>
        אירועי הגאולה כפי שנגלו, שנה אחר שנה — ולצידם <b style={{ color: C.goldLight }}>צירי ההתכנסות</b> שהתגלו באותן שנים.
      </p>

      {/* מקרא */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 44, fontFamily: F.body, fontSize: 12.5, color: C.muted }}>
        <Legend dot={C.goldBright} text="אירוע מרכזי" />
        <Legend dot={VIOLET} text="אירוע רגיל" />
        <Legend dot={C.gold} text="🌐 ציר התכנסות (חידוש)" />
        <Legend dot="#3ea6ff" text="✨ עודכן ב-AI (מהבהב)" pulse />
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", fontFamily: F.heading, letterSpacing: 2 }}>טוען את הציר…</div>}

      {byYear.map(([year, { events: evs, convs }]) => (
        <section key={year} style={{ position: "relative", marginBottom: 40 }}>
          <div style={{
            position: "sticky", top: 70, zIndex: 2, display: "inline-block",
            background: "rgba(10,7,16,0.92)", border: `1px solid ${C.borderGold}`, borderRadius: 999,
            padding: "6px 22px", color: C.goldBright, fontFamily: F.cinzel, fontSize: 19, fontWeight: 700,
            letterSpacing: 3, marginBottom: 20, boxShadow: `0 0 24px ${VIOLET}33`,
          }}>
            {year || "—"}
          </div>

          {/* מסלול האירועים */}
          {evs.length > 0 && (
            <div style={{ position: "relative", marginInlineStart: 24, paddingInlineStart: 24,
              borderInlineStart: `2px solid ${VIOLET}44` }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: -2, width: 2,
                background: `linear-gradient(180deg, ${C.gold}88, ${VIOLET}88, transparent)`,
                animation: "rev-spine-glow 5s ease-in-out infinite" }} />
              {evs.map(ev => (
                <Station key={ev.id} ev={ev}
                  post={postByEvent[ev.id]}
                  images={ev.gallery_id ? imagesByGallery[ev.gallery_id] : null}
                  isTarget={hash === `#ev-${ev.id}`} />
              ))}
            </div>
          )}

          {/* מסלול ההתכנסויות — נתיב זהב נפרד */}
          {convs.length > 0 && (
            <div style={{ marginTop: evs.length ? 18 : 0, marginInlineStart: 24, paddingInlineStart: 24, borderInlineStart: `2px solid ${C.gold}` }}>
              <div style={{ color: C.gold, fontFamily: F.heading, fontSize: 12, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
                ✦ התכנסויות שהתגלו ב-{year}
              </div>
              {convs.map(c => <ConvergenceStation key={`c-${c.slug}`} c={c} />)}
            </div>
          )}
        </section>
      ))}

      {!loading && !events.length && !(convergences || []).length && (
        <div style={{ color: C.muted, textAlign: "center", fontFamily: F.body }}>אין עדיין אירועים בציר.</div>
      )}
    </div>
  );
}
