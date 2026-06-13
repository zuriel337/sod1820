import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import { getEntityBundle } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";

// ===== דף הישות (Entity Page) — מרכז כל המידע סביב מספר/ביטוי =====
// /number/:phrase — מספר (1237) או ביטוי (דוד המלך). מרכז: ערך+מילים שוות,
// פוסטים, גלריות, ציר ההתגלות, חידושי AI, דיוני קהילה, צפנים, סרטונים.

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionHead({ icon, title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(19px,3vw,25px)", fontWeight: 700, margin: 0 }}>
        {icon} {title}
      </h2>
      {count != null && (
        <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 999, padding: "1px 10px" }}>
          {count}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.borderGold}, transparent)` }} />
    </div>
  );
}

const card = {
  background: "linear-gradient(135deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))",
  border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px",
  textDecoration: "none", display: "block", transition: "border-color 0.2s, transform 0.2s",
};

export default function EntityPage() {
  const { phrase } = useParams();
  const nav = useNavigate();
  const term = decodeURIComponent(phrase || "").trim();
  const isNumber = /^\d+$/.test(term);
  const value = isNumber ? Number(term) : calcGem(term);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setData(null);
    getEntityBundle({ term, value, isNumber })
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    document.title = `${term} · ${value} — דף הישות · סוד 1820`;
    return () => { alive = false; };
  }, [term, value, isNumber]);

  const d = data || {};
  const chips = [
    d.galleriesCount && { id: "galleries", e: "🖼", n: d.galleriesCount, l: "תמונות" },
    d.phrases?.length && { id: "tree", e: "🌳", n: d.phrases.length, l: "מילים שוות" },
    d.postsCount && { id: "posts", e: "📖", n: d.postsCount, l: "פוסטים" },
    d.eventsCount && { id: "events", e: "🕰", n: d.eventsCount, l: "אירועים" },
    d.insightsCount && { id: "insights", e: "🤖", n: d.insightsCount, l: "חידושי AI" },
    d.commentsCount && { id: "comments", e: "💬", n: d.commentsCount, l: "דיונים" },
  ].filter(Boolean);

  return (
    <div style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "44px 20px 100px", position: "relative", zIndex: 1 }}>
      <button onClick={() => nav(-1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 26 }}>← חזרה</button>

      {/* ── ראש: הערך ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>
          דף הישות
        </div>
        {!isNumber && (
          <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, marginBottom: 2 }}>{term}</div>
        )}
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: "0 0 40px rgba(212,175,55,0.4)" }}>
          {value}
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, marginTop: 6 }}>
          {isNumber ? "הערך המספרי" : "גימטריית הביטוי"}
        </div>
      </div>

      {/* ── מפת קשרים מהירה ── */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 30 }}>טוען את כל הקשרים…</div>
      ) : chips.length > 0 ? (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
          padding: "16px 14px", marginBottom: 40, borderRadius: 16,
          border: `1px solid ${C.borderGold}`, background: "rgba(8,5,2,0.4)",
        }}>
          {chips.map(c => (
            <button key={c.id} onClick={() => scrollTo(c.id)} style={{
              cursor: "pointer", background: "rgba(20,15,12,0.6)", border: `1px solid ${C.border}`,
              color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
              padding: "8px 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 16 }}>{c.e}</span>
              <b style={{ color: C.goldBright }}>{c.n}</b> {c.l}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 20, marginBottom: 30 }}>
          עדיין לא נמצאו קשרים ל«{term}» — נסו מספר או ביטוי אחר.
        </div>
      )}

      {/* ── 🖼 גלריות (למעלה — התמונות הברורות ביותר) ── */}
      {d.galleries?.length > 0 && (
        <section id="galleries" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="🖼" title="גלריות ותמונות" count={d.galleriesCount} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {d.galleries.map(g => (
              <button key={g.id} onClick={() => setLightbox(g)} style={{
                cursor: "pointer", padding: 0, aspectRatio: "1", borderRadius: 10, overflow: "hidden",
                border: `1px solid ${C.border}`, background: "#000",
              }}>
                <img src={g.image_url} alt={g.name || ""} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 🌳 עץ המספרים + מילים שוות ── */}
      <section id="tree" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
        <SectionHead icon="🌳" title="עץ המספרים ומילים שוות" count={d.phrases?.length || null} />
        {d.phrases?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {d.phrases.map((p, i) => (
              <Link key={i} to={`/number/${encodeURIComponent(p.phrase)}`} style={{
                textDecoration: "none", color: C.goldLight, fontFamily: F.body, fontSize: 14,
                border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 13px",
                background: "rgba(20,15,12,0.5)",
              }}>{p.phrase}</Link>
            ))}
          </div>
        ) : (
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, marginBottom: 14 }}>אין מילים נוספות בערך זה במאגר.</p>
        )}
        <Link to="/numbers" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
          פתחו את {value} בעץ המספרים התלת-מימדי →
        </Link>
      </section>

      {/* ── 📖 פוסטים ── */}
      {d.posts?.length > 0 && (
        <section id="posts" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="📖" title="פוסטים" count={d.postsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.posts.map(p => (
              <Link key={p.wp_id || p.slug} to={`/${p.slug}`} style={card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                  {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 🕰 ציר ההתגלות ── */}
      {d.events?.length > 0 && (
        <section id="events" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="🌅" title="ציר ההתגלות" count={d.eventsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.events.map(ev => (
              <Link key={ev.id} to="/timeline" style={card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                  {stripHtml(ev.label || "")}
                </div>
                {ev.hebrew_date && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 4 }}>{ev.hebrew_date}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 🤖 חידושי AI ── */}
      {d.insights?.length > 0 && (
        <section id="insights" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="🤖" title="חידושי AI" count={d.insightsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.insights.map(it => (
              <div key={it.id} style={card}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  {stripHtml(it.title || "חידוש")}
                </div>
                {it.body && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{stripHtml(it.body).slice(0, 180)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 💬 דיוני קהילה ── */}
      {d.comments?.length > 0 && (
        <section id="comments" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="💬" title="דיוני קהילה" count={d.commentsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.comments.map(c => (
              <div key={c.wp_id} style={card}>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8 }}>{stripHtml(c.content || "").slice(0, 220)}</div>
                {c.author_name && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 6 }}>— {c.author_name}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 🔍 דילוגי אותיות + 🎥 סרטונים (קישורי גילוי) ── */}
      <section style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Link to="/code" style={{ ...card, textAlign: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🔍</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>חפשו «{term}» בדילוגי האותיות</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>מנוע הצפנים בטקסט התורה</div>
        </Link>
        <Link to="/post" style={{ ...card, textAlign: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🎥</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>סרטונים ופוסטים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>כל התוכן באתר</div>
        </Link>
      </section>

      {/* ── Lightbox (סגירה ב-× או לחיצה על הרקע) ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(3,2,8,0.94)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(820px,96vw)", maxHeight: "92vh", overflowY: "auto", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setLightbox(null)} aria-label="סגור" style={{
                background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright,
                fontSize: 24, cursor: "pointer", borderRadius: 8, width: 44, height: 44, lineHeight: 1,
              }}>×</button>
            </div>
            <img src={lightbox.image_url} alt={lightbox.name || ""}
              style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.borderGold}`, display: "block" }} />
            {lightbox.name && <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginTop: 12 }}>{lightbox.name}</div>}
            {(lightbox.all_values?.length > 0) && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                {lightbox.all_values.slice(0, 10).map((v, i) => (
                  <Link key={i} to={`/number/${v}`} onClick={() => setLightbox(null)} style={{
                    textDecoration: "none", color: v === lightbox.primary_value ? "#1a0e00" : C.goldLight,
                    background: v === lightbox.primary_value ? C.gold : "rgba(8,5,2,0.5)",
                    border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px",
                    fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                  }}>{v}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
