import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { stripHtml } from "../lib/format.js";
import EntityHubGoldenControls from "../components/entity/EntityHubGoldenControls.jsx";

const C = {
  page: "#f4efe4",
  panel: "#fffdf8",
  ink: "#211c13",
  soft: "#6e6558",
  line: "#e6dcc8",
  gold: "#9a7617",
  gold2: "#c4a044",
  goldBg: "#fbf2d8",
  green: "#27633a",
  greenBg: "#e9f5eb",
  violet: "#60378b",
  violetBg: "#f1e8fa",
  warn: "#865600",
  warnBg: "#fff1d6",
};

const page = {
  minHeight: "100vh",
  direction: "rtl",
  background: C.page,
  color: C.ink,
  padding: "28px 16px 76px",
  fontFamily: "Heebo, Arial, sans-serif",
  position: "relative",
  zIndex: 1,
};
const shell = { maxWidth: 1240, margin: "0 auto" };
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, boxShadow: "0 10px 34px rgba(62,46,19,.06)" };
const muted = { color: C.soft, fontSize: 13.5, lineHeight: 1.65 };
const buttonReset = { border: 0, font: "inherit" };

function chipStyle(tone = "neutral") {
  const map = {
    ok: [C.greenBg, C.green],
    warn: [C.warnBg, C.warn],
    private: [C.violetBg, C.violet],
    gold: [C.goldBg, C.gold],
    neutral: ["#f1eee7", "#5d5548"],
  };
  const [background, color] = map[tone] || map.neutral;
  return { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, background, color };
}

function Section({ eyebrow, title, subtitle, action, children, style }) {
  return <section style={{ ...card, marginTop: 18, padding: 20, ...style }}>
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 15 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900, marginBottom: 4 }}>{eyebrow}</div> : null}
        <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>{title}</h2>
        {subtitle ? <div style={{ ...muted, marginTop: 5, maxWidth: 820 }}>{subtitle}</div> : null}
      </div>
      {action || null}
    </div>
    {children}
  </section>;
}

function Stat({ label, value, note }) {
  return <div style={{ ...card, padding: "13px 15px", flex: "1 1 140px", minWidth: 130 }}>
    <div style={{ fontSize: 27, lineHeight: 1, fontWeight: 950, color: C.ink }}>{value}</div>
    <div style={{ color: C.gold, fontSize: 12, fontWeight: 850, marginTop: 5 }}>{label}</div>
    {note ? <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>{note}</div> : null}
  </div>;
}

function Empty({ children = "אין מידע בשכבה הזאת כרגע." }) {
  return <div style={{ ...muted, padding: "8px 0" }}>{children}</div>;
}

function statusTone(status) {
  if (status === "approved" || status === "canonical") return "ok";
  if (status === "candidate") return "warn";
  return "neutral";
}

function cleanText(value, max = 220) {
  const text = stripHtml(String(value || "")).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function GalleryCard({ item, onOpen, compact = false }) {
  if (!item) return null;
  const src = item.thumb_url || item.image_url;
  return <button onClick={() => onOpen(item)} style={{ ...buttonReset, cursor: "pointer", textAlign: "right", padding: 0, borderRadius: 15, overflow: "hidden", background: "#111", border: `1px solid ${C.line}`, minWidth: 0 }}>
    <div style={{ aspectRatio: compact ? "16 / 10" : "4 / 3", overflow: "hidden", background: "#181511" }}>
      <img src={src} alt={item.name || "עדות גלריה"} loading="lazy" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
    </div>
    <div style={{ background: C.panel, padding: compact ? "9px 10px" : "11px 12px" }}>
      <div style={{ color: C.ink, fontWeight: 850, fontSize: compact ? 13 : 14, lineHeight: 1.35 }}>{cleanText(item.name || item.description || "עדות חזותית", 72)}</div>
      <div style={{ ...muted, fontSize: 11.5, marginTop: 4, display: "flex", gap: 7, flexWrap: "wrap" }}>
        {item.occurred_at ? <span>{new Date(`${item.occurred_at}T00:00:00`).toLocaleDateString("he-IL")}</span> : null}
        {item.primary_value ? <span>מספר ראשי {item.primary_value}</span> : null}
      </div>
    </div>
  </button>;
}

function ImageModal({ item, onClose }) {
  if (!item) return null;
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(8,6,3,.94)", padding: 18, display: "grid", placeItems: "center", direction: "rtl" }}>
    <div onClick={e => e.stopPropagation()} style={{ width: "min(900px,96vw)", maxHeight: "94vh", overflowY: "auto" }}>
      <div style={{ textAlign: "left", marginBottom: 8 }}><button onClick={onClose} style={{ cursor: "pointer", width: 42, height: 42, borderRadius: 10, border: "1px solid rgba(212,175,55,.45)", color: "#f5df8a", background: "transparent", fontSize: 23 }}>×</button></div>
      <img src={item.image_url || item.thumb_url} alt={item.name || ""} style={{ width: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", background: "#050403", borderRadius: 14, border: "1px solid rgba(212,175,55,.35)" }} />
      {(item.name || item.description) ? <div style={{ color: "#ddd5c7", lineHeight: 1.9, fontSize: 15, padding: "12px 3px", whiteSpace: "pre-wrap" }}>
        {item.name ? <div style={{ color: "#efd671", fontWeight: 850, marginBottom: 5 }}>{cleanText(item.name, 160)}</div> : null}
        {cleanText(item.description, 900)}
      </div> : null}
    </div>
  </div>;
}

function MethodModal({ group, onClose }) {
  if (!group) return null;
  const r = group.registry || {};
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 510, background: "rgba(29,22,10,.62)", display: "flex", justifyContent: "flex-start", direction: "rtl" }}>
    <aside onClick={e => e.stopPropagation()} style={{ width: "min(430px,94vw)", height: "100%", overflowY: "auto", background: C.panel, borderInlineEnd: `1px solid ${C.line}`, boxShadow: "18px 0 60px rgba(0,0,0,.22)", padding: 22 }}>
      <button onClick={onClose} style={{ cursor: "pointer", float: "left", width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", fontSize: 21 }}>×</button>
      <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.6, fontWeight: 900 }}>METHOD INSPECTOR · DECISION PREVIEW</div>
      <h2 style={{ fontSize: 28, margin: "7px 0 4px" }}>{r.display_label || group.method}</h2>
      <div style={{ ...muted, fontSize: 15 }}>{r.sub || "הסבר השיטה יגיע מה־Registry הקנוני."}</div>
      {r.soul ? <p style={{ lineHeight: 1.8, margin: "13px 0 0" }}>{r.soul}</p> : null}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
        <span style={chipStyle("gold")}>version {r.version ?? "—"}</span>
        <span style={chipStyle(r.active ? "ok" : "warn")}>{r.active ? "active" : "inactive"}</span>
        <span style={chipStyle(r.in_engine ? "ok" : "warn")}>{r.in_engine ? "in engine" : "not in engine"}</span>
        <span style={chipStyle()}>{r.execution_kind || "execution unknown"}</span>
      </div>
      {Array.isArray(r.derived_from) && r.derived_from.length ? <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 13, padding: 12 }}><b>מורכב מ:</b> {r.derived_from.join(" + ")}{r.operator ? ` · ${r.operator}` : ""}</div> : null}
      <div style={{ marginTop: 18, padding: 14, borderRadius: 14, border: `1px dashed ${C.gold2}`, background: C.goldBg }}>
        <div style={{ fontWeight: 900, color: C.gold }}>החלטה ארכיטקטונית עדיין פתוחה</div>
        <div style={{ ...muted, color: "#655321", marginTop: 5 }}>ה־Preview הזה רק מוכיח שלשיטה יש Identity והסבר קנוני. עוד לא החלטנו האם לחיצה עליה תפתח פירוק בתוך הכרטיס, מגירת־שיטה בצד, או מעבר למעבדת־עומק.</div>
      </div>
      <h3 style={{ margin: "22px 0 9px" }}>דוגמאות ב־{group.value ?? "המספר"}</h3>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {(group.phrases || []).slice(0, 18).map((item, i) => {
          const phrase = phraseOf(item);
          return phrase ? <Link key={`${phrase}-${i}`} to={`/number/${encodeURIComponent(phrase)}`} style={{ textDecoration: "none", border: `1px solid ${C.line}`, background: "#f8f4ea", color: C.ink, borderRadius: 999, padding: "6px 10px", fontSize: 13 }}>{phrase}</Link> : null;
        })}
      </div>
    </aside>
  </div>;
}

function TopicCard({ item, image, onImage }) {
  if (!item) return null;
  return <article style={{ border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", background: C.panel, minWidth: 0 }}>
    {image ? <button onClick={() => onImage(image)} style={{ ...buttonReset, display: "block", width: "100%", padding: 0, cursor: "pointer", background: "#111" }}><img src={image.thumb_url || image.image_url} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /></button> : null}
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><span style={chipStyle("ok")}>מאושר</span>{item.quality != null ? <span style={chipStyle("gold")}>איכות {item.quality}</span> : null}</div>
      <Link to={`/topic/${encodeURIComponent(item.slug)}`} style={{ display: "block", marginTop: 9, color: C.ink, textDecoration: "none", fontWeight: 900, fontSize: 17, lineHeight: 1.35 }}>{item.title || item.slug}</Link>
      {item.subtitle ? <div style={{ ...muted, marginTop: 6 }}>{cleanText(item.subtitle, 180)}</div> : null}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{(item.highlight_numbers || []).slice(0, 5).map(n => <span key={n} style={chipStyle("gold")}>{n}</span>)}</div>
    </div>
  </article>;
}

export default function EntityHubPreviewPage() {
  const { type = "number", key = "1237" } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [zoom, setZoom] = useState(null);
  const [methodFocus, setMethodFocus] = useState(null);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type, key, relationLimit: 120, researchLimit: 60, topicLimit: 16 })
      .then(data => alive && setState({ loading: false, data, error: data ? null : new Error("הישות לא נמצאה") }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [type, key]);

  const relationGroups = useMemo(() => {
    const out = new Map();
    for (const finding of state.data?.graph?.relations || []) {
      const relation = finding?.projection?.dimensions?.relationFamily || "related";
      if (!out.has(relation)) out.set(relation, []);
      out.get(relation).push(finding);
    }
    return [...out.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [state.data]);

  if (state.loading) return <main style={page}><div style={shell}>טוען את היקום של הישות…</div></main>;
  if (state.error || !state.data) return <main style={page}><div style={shell}><h1>לא ניתן לטעון את הישות</h1><pre style={{ whiteSpace: "pre-wrap" }}>{state.error?.message}</pre></div></main>;

  const data = state.data;
  const identity = data.identity;
  const hg = data.research?.humanGate || { total: 0, status: {}, access: {} };
  const researchAvailable = data.research?.access?.available !== false;
  const journey = data.journeys?.numberKnowledgeJourney;
  const declaredLenses = data.lenses?.declared || [];
  const isNumber = identity.type === "number";
  const surface = data.surface || {};
  const galleries = Array.isArray(surface.galleries) ? surface.galleries : [];
  const posts = Array.isArray(surface.posts) ? surface.posts : [];
  const insights = Array.isArray(surface.insights) ? surface.insights : [];
  const topics = Array.isArray(data.topics?.rows) ? data.topics.rows : [];
  const families = Array.isArray(data.gematria?.families) ? data.gematria.families : [];
  const heroImages = galleries.slice(0, 3);
  const imageMap = new Map(galleries.map(item => [String(item.id), item]));

  return <main style={page}>
    <div style={shell}>
      <header style={{ ...card, padding: 22, overflow: "hidden", position: "relative" }}>
        <div className="eh-hero-grid" style={{ display: "grid", gridTemplateColumns: heroImages.length ? "minmax(0,1.05fr) minmax(360px,.95fr)" : "1fr", gap: 22, alignItems: "stretch" }}>
          <div style={{ padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: C.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900 }}>SOD1820 · UNIVERSAL ENTITY HUB · PUBLIC PREVIEW v2</div>
            <h1 style={{ margin: "7px 0 4px", fontSize: "clamp(48px,8vw,84px)", lineHeight: .95, letterSpacing: -2 }}>{identity.label}</h1>
            <div style={{ color: C.soft, fontSize: 17, lineHeight: 1.55, maxWidth: 610 }}>{identity.description || identity.finding?.subject?.description || "ישות אחת · כל העדשות שסביבה · אותה אמת מתחת."}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>
              <span style={chipStyle()}>{identity.definition?.icon || "🔹"} {identity.definition?.label || identity.type}</span>
              <span style={chipStyle("ok")}>Public preview</span>
              <span style={chipStyle("ok")}>Projection read-only</span>
              <span style={chipStyle("warn")}>Human Gate נשמר</span>
            </div>
            {declaredLenses.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{declaredLenses.slice(0, 10).map(lens => <span key={lens} style={chipStyle()}>{lens}</span>)}</div> : null}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              {isNumber ? <Link to={`/number/${encodeURIComponent(identity.label)}`} style={{ textDecoration: "none", background: C.gold, color: "#fff", padding: "10px 16px", borderRadius: 999, fontWeight: 900 }}>הדף הקיים ←</Link> : null}
              <Link to="/beit-midrash" style={{ textDecoration: "none", border: `1px solid ${C.gold2}`, color: C.gold, padding: "10px 16px", borderRadius: 999, fontWeight: 850 }}>בית המדרש ←</Link>
            </div>
          </div>
          {heroImages.length ? <div className="eh-mosaic" style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gridTemplateRows: "1fr 1fr", minHeight: 360, gap: 7 }}>
            <button onClick={() => setZoom(heroImages[0])} style={{ ...buttonReset, cursor: "pointer", gridRow: "1 / 3", padding: 0, overflow: "hidden", borderRadius: 16, background: "#111" }}><img src={heroImages[0].thumb_url || heroImages[0].image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>
            {heroImages.slice(1, 3).map(item => <button key={item.id} onClick={() => setZoom(item)} style={{ ...buttonReset, cursor: "pointer", padding: 0, overflow: "hidden", borderRadius: 14, background: "#111" }}><img src={item.thumb_url || item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>)}
          </div> : null}
        </div>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <Stat label="תמונות גלריה" value={surface.galleriesCount ?? galleries.length} note="עדויות ציבוריות סביב הישות" />
        <Stat label="ביטויים" value={surface.phrasesCount ?? surface.phrases?.length ?? 0} note="מהמאגר הציבורי" />
        <Stat label="שיטות שפוגשות כאן" value={families.length} note="Registry + engine" />
        <Stat label="Topics מאושרים" value={topics.length} note="אוצרות Human Gate" />
        <Stat label="קשרי Graph" value={data.graph?.relations?.length || 0} note="אותו Reality Graph" />
        <Stat label="פוסטים" value={surface.postsCount ?? posts.length} note="תוכן מחובר" />
      </div>

      {isNumber ? <EntityHubGoldenControls data={data} relationGroups={relationGroups} /> : null}

      {isNumber ? <Section eyebrow="GEMATRIA LENS" title={`איך  ${identity.label}  מופיע בגימטריה`} subtitle="כאן רואים את ההבדל שחשוב לנו להחליט עליו: הביטוי הוא הישות הלחיצה הראשית; השיטה היא עדשה נפרדת עם Identity והגדרה משלה. כרגע לחיצה על שם השיטה פותחת Inspector זמני רק כדי שנוכל להחליט יחד — זו עדיין לא התנהגות קנונית.">
        {families.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12 }}>
          {families.map(group => {
            const r = group.registry || {};
            const list = (group.phrases || []).slice(0, 7);
            const regular = group.method === "רגיל";
            return <article key={group.method} style={{ border: `1px solid ${regular ? C.gold2 : C.line}`, background: regular ? "linear-gradient(180deg,#fffdf7,#fbf3dd)" : "#fff", borderRadius: 15, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <button onClick={() => setMethodFocus({ ...group, value: identity.label })} style={{ ...buttonReset, cursor: "pointer", background: "none", padding: 0, color: C.ink, textAlign: "right", flex: 1 }}>
                  <div style={{ fontWeight: 950, fontSize: 17 }}>{r.display_label || group.method} <span style={{ color: C.gold, fontSize: 12 }}>↗</span></div>
                  <div style={{ ...muted, marginTop: 3 }}>{r.sub || "שיטת גימטריה רשומה"}</div>
                </button>
                <span style={chipStyle(regular ? "gold" : "neutral")}>{group.count ?? group.phrases?.length ?? 0}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {list.map((item, i) => {
                  const phrase = phraseOf(item);
                  return phrase ? <Link key={`${group.method}-${phrase}-${i}`} to={`/number/${encodeURIComponent(phrase)}`} style={{ color: C.ink, textDecoration: "none", background: "#f7f4ed", border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 12.5 }}>{phrase} <b style={{ color: C.gold }}>= {identity.label}</b></Link> : null;
                })}
              </div>
            </article>;
          })}
        </div> : <Empty />}
      </Section> : null}

      <Section eyebrow="VISUAL EVIDENCE" title={`גלריה חיה סביב ${identity.label}`} subtitle="אלו תמונות אמיתיות שכבר נמצאות במערכת ומקושרות למספר. זו לא גלריה חדשה — רק Projection של אותו מאגר גלריות קיים." action={<Link to="/gallery" style={{ color: C.gold, textDecoration: "none", fontWeight: 850 }}>לכל הגלריות ←</Link>}>
        {galleries.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>{galleries.slice(0, 12).map(item => <GalleryCard key={item.id} item={item} onOpen={setZoom} />)}</div> : <Empty />}
        {(surface.galleriesCount || 0) > galleries.slice(0, 12).length ? <div style={{ ...muted, marginTop: 12, textAlign: "center" }}>זהו רק חלון ראשון מתוך {surface.galleriesCount} תמונות מחוברות.</div> : null}
      </Section>

      <Section eyebrow="CURATED CONVERGENCES" title="נושאים והתכנסויות" subtitle="כאן מופיעים רק Topic Cards מאושרים — לא Raw Signals ולא כל שוויון שנמצא במנוע.">
        {topics.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>{topics.map(item => {
          const firstImage = (item.image_ids || []).map(id => imageMap.get(String(id))).find(Boolean) || null;
          return <TopicCard key={item.id || item.slug} item={item} image={firstImage} onImage={setZoom} />;
        })}</div> : <Empty />}
      </Section>

      <Section eyebrow="CONNECTED CONTENT" title="פוסטים וחידושים שמתחברים לישות" subtitle="תוכן מוצג כעדשה נוספת על הישות — לא כחנות אמת נפרדת.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
          <div>
            <h3 style={{ margin: "0 0 9px" }}>📖 פוסטים</h3>
            {posts.length ? <div style={{ display: "grid", gap: 7 }}>{posts.slice(0, 8).map(p => <Link key={p.wp_id || p.id || p.slug} to={`/${p.slug}`} style={{ color: C.ink, textDecoration: "none", border: `1px solid ${C.line}`, background: "#fff", borderRadius: 12, padding: "10px 12px", fontWeight: 750 }}>{cleanText(typeof p.title === "string" ? p.title : p.title?.rendered || p.slug, 120)}</Link>)}</div> : <Empty />}
          </div>
          <div>
            <h3 style={{ margin: "0 0 9px" }}>✨ חידושים</h3>
            {insights.length ? <div style={{ display: "grid", gap: 7 }}>{insights.slice(0, 6).map(it => <div key={it.id} style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 12, padding: "10px 12px" }}><div style={{ fontWeight: 850 }}>{cleanText(it.title || "חידוש", 100)}</div>{it.body ? <div style={{ ...muted, marginTop: 4 }}>{cleanText(it.body, 170)}</div> : null}</div>)}</div> : <Empty />}
          </div>
        </div>
      </Section>

      <Section eyebrow="ONE REALITY GRAPH" title="הקשרים בעץ" subtitle="ה־Hub לא יוצר קשרים. הוא רק מקבץ את ה־edges שכבר חיים ב־Reality Graph.">
        {relationGroups.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 11 }}>{relationGroups.map(([relation, findings]) => <div key={relation} style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 14, padding: 12 }}><div style={{ fontWeight: 950, color: C.gold }}>{relation} · {findings.length}</div>{findings.slice(0, 7).map(f => <div key={f.id} style={{ ...muted, borderTop: "1px solid #f0eadf", paddingTop: 6, marginTop: 6 }}>{f.subject?.label}</div>)}</div>)}</div> : <Empty />}
      </Section>

      {isNumber ? <Section eyebrow="JOURNEY" title="Number Knowledge Journey" subtitle="המסע הקיים נשאר traversal/snapshot של אותו מחקר; ה־Hub אינו ממציא Path Store נוסף.">
        {journey ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.55fr)", gap: 13 }} className="eh-journey-grid">
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 15, padding: 14, background: "#fff" }}>
            <div style={{ fontSize: 19, fontWeight: 950 }}>{journey.seed?.title || `מסע ${identity.label}`}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}><span style={chipStyle(statusTone(journey.seed?.governance?.status))}>seed: {journey.seed?.governance?.status || "unknown"}</span><span style={chipStyle()}>branches: {journey.branches?.length || 0}</span></div>
            {journey.branches?.length ? <div style={{ display: "grid", gap: 7, marginTop: 12 }}>{journey.branches.slice(0, 8).map((branch, i) => <div key={branch.id || i} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: "9px 10px" }}><b>{branch.branch_name || branch.name || `ענף ${i + 1}`}</b>{branch.description ? <div style={{ ...muted, marginTop: 3 }}>{cleanText(branch.description, 170)}</div> : null}</div>)}</div> : null}
          </div>
          <div style={{ border: `1px dashed ${C.gold2}`, borderRadius: 15, padding: 14, background: C.goldBg }}><div style={{ fontWeight: 950, color: C.gold }}>Live map ≠ Approved</div><div style={{ ...muted, color: "#655321", marginTop: 5 }}>חישובים חיים אינם יורשים את האישור של ה־seed. זו בדיוק ההפרדה בין Projection לבין Human Gate.</div></div>
        </div> : <Empty>אין מסע זמין כרגע.</Empty>}
      </Section> : null}

      <Section eyebrow="GOVERNANCE / PROVENANCE" title="מה נשאר מאחורי הקלעים" subtitle="Preview ציבורי אינו עוקף את ה־RLS/GRANT. שכבה פרטית נשארת פרטית; אנחנו מציגים את החוויה בלי להחליש את האמת או את ההרשאות.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: "#fff" }}><b>Human Gate</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{researchAvailable ? Object.entries(hg.status || {}).filter(([, count]) => count).map(([name, count]) => <span key={name} style={chipStyle(statusTone(name))}>{name}: {count}</span>) : <span style={chipStyle("private")}>Research layer protected</span>}</div></div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: "#fff" }}><b>Sources</b>{data.sources?.length ? <div style={{ ...muted, marginTop: 7 }}>{data.sources.slice(0, 7).map((source, i) => <div key={`${source.ref || source.label}-${i}`}>• {cleanText(source.label, 120)}</div>)}</div> : <Empty />}</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, background: "#fff" }}><b>Activity timeline v0</b>{data.timeline?.length ? <div style={{ ...muted, marginTop: 7 }}>{data.timeline.slice(-6).map(item => <div key={`${item.id}-${item.at}`}>{new Date(item.at).toLocaleDateString("he-IL")} · {cleanText(item.label, 90)}</div>)}</div> : <Empty />}</div>
        </div>
      </Section>

      <footer style={{ ...muted, marginTop: 24, textAlign: "center" }}>One Tree · One Research OS · Many Lenses · Foundation → Projection → Experience</footer>
    </div>

    <ImageModal item={zoom} onClose={() => setZoom(null)} />
    <MethodModal group={methodFocus} onClose={() => setMethodFocus(null)} />

    <style>{`
      .eh-mosaic button img { transition: transform .3s ease, opacity .3s ease; }
      .eh-mosaic button:hover img { transform: scale(1.025); opacity: .94; }
      @media (max-width: 820px) {
        .eh-hero-grid { grid-template-columns: 1fr !important; }
        .eh-mosaic { min-height: 290px !important; }
        .eh-journey-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 520px) {
        .eh-mosaic { grid-template-columns: 1fr 1fr !important; grid-template-rows: 210px 120px !important; min-height: 0 !important; }
        .eh-mosaic > button:first-child { grid-column: 1 / 3; grid-row: 1 !important; }
      }
    `}</style>
  </main>;
}
