import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { C, F } from "../theme.js";
import { stripHtml } from "../lib/format.js";
import { SectionHeader } from "../components/ui.jsx";
import ConvergenceAxis from "../components/ConvergenceAxis.jsx";

// ===== ציר ההתגלות — העמוד המלא =====
// כל אירועי הציר מקובצים לפי שנה, וכל תחנה מחוברת לתוכן שלה:
// הפוסט המתעד (edges: post —documents→ event) והגלריה (nodes.gallery_id).

const VIOLET = "#8458ff";

const PAGE_CSS = `
  .rev-station { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; transform-style: preserve-3d; }
  .rev-station:hover { transform: perspective(900px) rotateX(1.6deg) translateY(-5px); border-color: ${C.borderGold} !important; box-shadow: 0 14px 44px rgba(0,0,0,.55), 0 0 34px ${VIOLET}2e; }
  .rev-station.rev-target { border-color: ${VIOLET} !important; box-shadow: 0 0 0 1px ${VIOLET}, 0 0 44px ${VIOLET}55; }
  @keyframes rev-spine-glow { 0%,100% { opacity:.55; } 50% { opacity:1; } }
  @media (max-width: 980px) { .rev-wrap { flex-direction: column; } .rev-aside { width: 100% !important; position: static !important; } }
`;

function useAxisData() {
  const [data, setData] = useState({ events: [], postByEvent: {}, imagesByGallery: {}, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: events } = await supabase.from("nodes")
        .select("id,label,weight,hebrew_date,axis_theme,metadata,gallery_id,created_at")
        .eq("type", "event").eq("is_active", true);
      if (!alive || !events?.length) { alive && setData(d => ({ ...d, loading: false })); return; }

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

      alive && setData({ events, postByEvent, imagesByGallery, loading: false });
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

export default function TimelinePage() {
  const { events, postByEvent, imagesByGallery, loading } = useAxisData();
  const { hash } = useLocation();

  const byYear = useMemo(() => {
    const groups = new Map();
    for (const ev of events) {
      const y = eventYear(ev);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(ev);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (b.weight || 0) - (a.weight || 0) || new Date(b.created_at) - new Date(a.created_at));
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [events]);

  // גלילה אל תחנה שהגיעו אליה מהפס הקבוע
  useEffect(() => {
    if (loading || !hash) return;
    const el = document.getElementById(hash.slice(1));
    el && setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }, [loading, hash]);

  return (
    <div className="rev-wrap" style={{ direction: "rtl", maxWidth: 1180, margin: "0 auto", padding: "64px 24px 96px", display: "flex", gap: 28, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
      <style>{PAGE_CSS}</style>
      <aside className="rev-aside" style={{ width: 248, flex: "0 0 auto", position: "sticky", top: 80 }}>
        <ConvergenceAxis title="✦ ציר ההתכנסות" />
      </aside>
      <main style={{ flex: 1, minWidth: 0, maxWidth: 860 }}>
      <SectionHeader eyebrow="המסע בזמן" title="🌅 ציר ההתגלות" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 620, margin: "-24px auto 52px" }}>
        אירועי הגאולה כפי שנגלו, שנה אחר שנה. כל תחנה מחוברת לפוסט המתעד ולתמונות הממצאים —
        והכוכבים בפס הצדדי ילוו אתכם בכל האתר.
      </p>

      {loading && <div style={{ color: C.muted, textAlign: "center", fontFamily: F.heading, letterSpacing: 2 }}>טוען את הציר…</div>}

      {byYear.map(([year, list]) => (
        <section key={year} style={{ position: "relative", marginBottom: 40 }}>
          <div style={{
            position: "sticky", top: 70, zIndex: 2, display: "inline-block",
            background: "rgba(10,7,16,0.92)", border: `1px solid ${C.borderGold}`, borderRadius: 999,
            padding: "6px 22px", color: C.goldBright, fontFamily: F.cinzel, fontSize: 19, fontWeight: 700,
            letterSpacing: 3, marginBottom: 20, boxShadow: `0 0 24px ${VIOLET}33`,
          }}>
            {year || "—"}
          </div>

          {/* חוט השנה */}
          <div style={{ position: "relative", marginInlineStart: 24, paddingInlineStart: 24,
            borderInlineStart: `2px solid ${VIOLET}44` }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: -2, width: 2,
              background: `linear-gradient(180deg, ${C.gold}88, ${VIOLET}88, transparent)`,
              animation: "rev-spine-glow 5s ease-in-out infinite" }} />
            {list.map(ev => (
              <Station key={ev.id} ev={ev}
                post={postByEvent[ev.id]}
                images={ev.gallery_id ? imagesByGallery[ev.gallery_id] : null}
                isTarget={hash === `#ev-${ev.id}`} />
            ))}
          </div>
        </section>
      ))}

      {!loading && !events.length && (
        <div style={{ color: C.muted, textAlign: "center", fontFamily: F.body }}>אין עדיין אירועים בציר.</div>
      )}
      </main>
    </div>
  );
}
