import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F, calcGem, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// ===== "קחו אותי למסע" — הילוך אקראי בגרף הקשרים (edges) =====
// טוענים את כל ישויות-הזהב + הקשרים פעם אחת, ואז מטיילים בצד-לקוח:
// כל תחנה לוקחת לישות מקושרת אחרת — אף אחד לא יודע לאן יגיע.

const LINES = [
  "הקשר הוביל אותך אל",
  "ומשם נפתח שביל אל",
  "החוט ממשיך אל",
  "הגרף לוחש לך על",
  "תחנה הבאה במסע —",
  "ומכאן אל",
];

export default function JourneyPage() {
  const P = usePalette();
  const [sp] = useSearchParams();
  const startFrom = (sp.get("from") || "").trim();
  const [graph, setGraph] = useState(null); // { map:id->node, adj:id->Set(id), list:[] }
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "קחו אותי למסע · סוד 1820"; }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: nodes }, { data: edges }] = await Promise.all([
        supabase.from("nodes").select("id,label,description,weight,metadata").eq("type", "entity").eq("is_active", true),
        supabase.from("edges").select("from_node,to_node").eq("relation_type", "related"),
      ]);
      if (!alive) return;
      const map = new Map(); (nodes || []).forEach(n => map.set(n.id, n));
      const adj = new Map();
      const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
      (edges || []).forEach(e => { if (map.has(e.from_node) && map.has(e.to_node)) { add(e.from_node, e.to_node); add(e.to_node, e.from_node); } });
      const list = nodes || [];
      setGraph({ map, adj, list });
      let start = startFrom ? list.find(n => n.label === startFrom) : null;
      if (!start) start = pickStart(list);
      setPath(start ? [start] : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [startFrom]);

  function pickStart(list) {
    const pool = list.filter(n => (n.weight || 3) >= 4);
    const src = pool.length ? pool : list;
    return src[Math.floor(Math.random() * src.length)] || null;
  }

  function step() {
    if (!graph || !path.length) return;
    const cur = path[path.length - 1];
    const prev = path.length > 1 ? path[path.length - 2] : null;
    const neigh = [...(graph.adj.get(cur.id) || [])];
    let cand = neigh.filter(id => !prev || id !== prev.id);
    if (!cand.length) cand = neigh;
    let next;
    if (cand.length) next = graph.map.get(cand[Math.floor(Math.random() * cand.length)]);
    else next = graph.list[Math.floor(Math.random() * graph.list.length)]; // קפיצת דרך
    if (next) setPath(p => [...p, next]);
  }

  function restart() { if (graph) setPath([pickStart(graph.list)]); }

  const cur = path[path.length - 1];
  const prev = path.length > 1 ? path[path.length - 2] : null;
  const disp = n => n?.metadata?.display || n?.label || "";
  const val = n => (n ? calcGem(n.label) : 0);

  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "34px 18px 90px", position: "relative", zIndex: 1 }}>
      <style>{`@keyframes jArrive{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}`}</style>

      <header style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>מסע</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 800, margin: "6px 0 6px", textShadow: `0 0 40px ${P.onAccent}` }}>✨ קחו אותי למסע</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 460, margin: "0 auto" }}>
          לחיצה אחת — והקשרים לוקחים אתכם ממספר למספר, מישות לישות. אף מסע לא חוזר על עצמו.
        </p>
      </header>

      {loading || !cur ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 40 }}>טוען את הגרף…</div>
      ) : (
        <>
          {/* תחנה נוכחית */}
          {prev && (
            <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13.5, marginBottom: 10 }}>
              <span style={{ color: P.inkSoft }}>{disp(prev)}</span>　{LINES[(path.length - 2) % LINES.length]}…
            </div>
          )}
          <div key={path.length} style={{
            animation: "jArrive .55s ease both", textAlign: "center",
            background: P.cardGrad,
            border: `1.5px solid ${P.borderStrong}`, borderRadius: 20, padding: "30px 22px", boxShadow: `0 0 40px ${P.onAccent}`,
          }}>
            <div style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 14, marginBottom: 6 }}>תחנה {path.length}</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,40px)", fontWeight: 800, lineHeight: 1.25 }}>{disp(cur)}</div>
            <div style={{ color: P.ink, fontFamily: F.mono, fontSize: 20, marginTop: 8 }}>{val(cur)}</div>
            {cur.metadata?.world && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 6 }}>{cur.metadata.world}</div>}
            {cur.description && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, marginTop: 12, maxWidth: 520, marginInline: "auto" }}>{cur.description}</div>}
            {KEY_NUMBERS[val(cur)] && <div style={{ color: P.accent, fontFamily: F.body, fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{KEY_NUMBERS[val(cur)]}</div>}
          </div>

          {/* כפתורים */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
            <button onClick={step} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "13px 30px", boxShadow: `0 0 30px ${P.onAccent}` }}>
              המשיכו במסע ✨
            </button>
            <Link to={`/number/${encodeURIComponent(cur.label)}`} style={{ textDecoration: "none", background: P.card, color: P.ink, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "13px 20px" }}>
              פתחו את {disp(cur)} →
            </Link>
            <button onClick={restart} style={{ cursor: "pointer", background: "none", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, padding: "13px 18px" }}>
              מסע חדש 🎲
            </button>
          </div>

          {/* שביל המסע */}
          {path.length > 1 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}>השביל שעברתם</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", alignItems: "center" }}>
                {path.slice(-12).map((n, i, a) => (
                  <React.Fragment key={i}>
                    <span style={{ color: n === cur ? P.accentText : P.inkSoft, fontFamily: F.body, fontSize: 13, border: `1px solid ${n === cur ? P.borderStrong : P.border}`, borderRadius: 999, padding: "3px 11px" }}>{disp(n)}</span>
                    {i < a.length - 1 && <span style={{ color: P.accentDim, fontSize: 12 }}>←</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 34 }}>
        <Link to="/cross" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, textDecoration: "none" }}>← להצלבת השיטות</Link>
      </div>
    </div>
  );
}
