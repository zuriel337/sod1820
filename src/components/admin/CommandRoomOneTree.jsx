import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import {
  fetchResearchViewerGraphEntity,
  searchResearchViewerGraphEntities,
} from "../../lib/research/researchViewerProjection.js";

const S = {
  page: { minHeight: 560, border: "1px solid rgba(120,145,175,.18)", borderRadius: 18, background: "var(--cud-bg, #08111d)", color: "var(--cud-text, #eef3f8)", overflow: "hidden" },
  head: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 16, borderBottom: "1px solid rgba(120,145,175,.16)" },
  card: { border: "1px solid rgba(120,145,175,.16)", borderRadius: 14, background: "rgba(255,255,255,.035)", padding: 12 },
  muted: { color: "var(--cud-muted, #8f9bad)", fontSize: 11.5, lineHeight: 1.5 },
  btn: { border: "1px solid rgba(125,170,230,.32)", background: "rgba(125,170,230,.08)", color: "inherit", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontWeight: 850, fontSize: 11.5 },
};

function short(v, n = 120) {
  const s = String(v || "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function pill(label, tone = "muted") {
  const map = {
    tree: ["#70d9a2", "rgba(112,217,162,.11)"],
    approved: ["#83b4ff", "rgba(131,180,255,.11)"],
    candidate: ["#e5c46d", "rgba(229,196,109,.11)"],
    canonical: ["#c4a7ff", "rgba(196,167,255,.11)"],
    drift: ["#f09a9a", "rgba(240,154,154,.11)"],
    muted: ["#9aa6b7", "rgba(154,166,183,.08)"],
  };
  const [color, bg] = map[tone] || map.muted;
  return <span style={{ border: `1px solid ${color}55`, background: bg, color, borderRadius: 999, padding: "3px 8px", fontSize: 10.5, fontWeight: 850, whiteSpace: "nowrap" }}>{label}</span>;
}

async function exactCount(table, apply) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

async function loadOneTree() {
  const [nodesRes, roRes, topicsRes, counts] = await Promise.all([
    supabase
      .from("nodes")
      .select("id,type,label,description,identity_key,is_active,created_at,weight,metadata")
      .eq("is_active", true)
      .order("weight", { ascending: false, nullsFirst: false })
      .limit(260),
    supabase
      .from("research_objects")
      .select("id,kind,statement,status,privacy_scope,promoted_node_id,source_ref,source,created_at,engine_verified,value")
      .in("status", ["candidate", "approved", "canonical"])
      .order("created_at", { ascending: false })
      .limit(420),
    supabase
      .from("topic_cards")
      .select("id,slug,title,status,node_id,approved_at,created_at")
      .eq("status", "approved")
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(260),
    Promise.all([
      exactCount("nodes", q => q.eq("is_active", true)),
      exactCount("edges"),
      exactCount("research_objects", q => q.eq("status", "candidate")),
      exactCount("research_objects", q => q.eq("status", "approved")),
      exactCount("research_objects", q => q.eq("status", "canonical")),
    ]),
  ]);
  if (nodesRes.error) throw nodesRes.error;
  if (roRes.error) throw roRes.error;
  if (topicsRes.error) throw topicsRes.error;
  return {
    nodes: nodesRes.data || [],
    research: roRes.data || [],
    topics: topicsRes.data || [],
    counts: { nodes: counts[0], edges: counts[1], candidate: counts[2], approved: counts[3], canonical: counts[4] },
  };
}

function researchState(row) {
  if (row.promoted_node_id) return { key: "tree", label: "בעץ" };
  if (row.status === "canonical") return { key: "canonical", label: "קנוני · מחוץ לעץ" };
  if (row.status === "approved") {
    const graphEligible = ["fact", "relation"].includes(row.kind) && row.privacy_scope === "public_candidate";
    return graphEligible
      ? { key: "approved", label: "מאושר · יכול לעבור לעץ" }
      : { key: "approved", label: "מאושר · קנוניזציה נפרדת" };
  }
  return { key: "candidate", label: "במחקר" };
}

function NodeCard({ node, active, onClick }) {
  return <button onClick={() => onClick(node)} style={{ width: "100%", textAlign: "right", cursor: "pointer", color: "inherit", border: `1px solid ${active ? "rgba(112,217,162,.62)" : "rgba(120,145,175,.14)"}`, background: active ? "rgba(112,217,162,.08)" : "rgba(255,255,255,.022)", borderRadius: 11, padding: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{pill("קיים בעץ", "tree")} {pill(node.type || "node")}<span style={{ marginInlineStart: "auto", opacity: .55, fontSize: 10 }}>{node.weight != null ? `w ${node.weight}` : ""}</span></div>
    <b style={{ display: "block", marginTop: 7, fontSize: 13 }}>{node.label || node.id}</b>
    {node.description && <div style={{ ...S.muted, marginTop: 4 }}>{short(node.description, 100)}</div>}
  </button>;
}

function ResearchCard({ row, onOpenGate }) {
  const state = researchState(row);
  return <div style={S.card}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {pill(state.label, state.key)}
      {pill(row.kind || "research")}
      {row.engine_verified === true && pill("engine verified", "tree")}
      {row.privacy_scope && pill(row.privacy_scope)}
    </div>
    <b style={{ display: "block", marginTop: 7, fontSize: 12.5, lineHeight: 1.45 }}>{short(row.statement, 150)}</b>
    <div style={{ ...S.muted, marginTop: 5 }}>{row.source_ref || row.source || "ללא source_ref"}</div>
    {!row.promoted_node_id && row.status !== "canonical" && <button onClick={onOpenGate} style={{ ...S.btn, marginTop: 8 }}>⚖️ פתח בשולחן השער</button>}
    {row.status === "canonical" && !row.promoted_node_id && <div style={{ ...S.muted, marginTop: 7 }}>קנוני אינו מבטיח Node. Observation/Hypothesis או חומר פרטי יכולים להישאר קנוניים מחוץ לגרף.</div>}
  </div>;
}

function Neighborhood({ findings }) {
  if (!findings?.length) return <div style={S.muted}>בחר ישות מהעץ כדי לראות את השכונה הקנונית שלה.</div>;
  const root = findings.find(f => f?.kind === "graph-entity") || findings[0];
  const rels = findings.filter(f => f?.kind === "graph-relation");
  return <div>
    <div style={{ ...S.card, borderColor: "rgba(112,217,162,.42)", background: "rgba(112,217,162,.06)" }}>
      <div>{pill("מרכז נוכחי", "tree")}</div>
      <h3 style={{ margin: "8px 0 2px", fontSize: 18 }}>{root?.subject?.label || "ישות"}</h3>
      <div style={S.muted}>{root?.subject?.type || "entity"} · {root?.identity?.entityRef || ""}</div>
    </div>
    <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
      {rels.slice(0, 60).map((r, i) => <div key={`${r.id || i}`} style={{ borderInlineStart: "3px solid rgba(196,167,255,.55)", padding: "7px 10px", background: "rgba(196,167,255,.045)", borderRadius: 8 }}>
        <b style={{ fontSize: 12 }}>{r?.subject?.label || "קשר"}</b>
        <div style={S.muted}>{r?.source?.method || "relation"}</div>
      </div>)}
      {!rels.length && <div style={S.muted}>לישות הזו אין כרגע קשרים סמוכים שהוחזרו מהגרף.</div>}
    </div>
  </div>;
}

export default function CommandRoomOneTree({ onOpenGate }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [query, setQuery] = useState("");
  const [searchRows, setSearchRows] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [neighborhood, setNeighborhood] = useState([]);
  const [nodeLoading, setNodeLoading] = useState(false);

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: "" }));
    try {
      const data = await loadOneTree();
      setState({ loading: false, error: "", data });
    } catch (e) {
      setState({ loading: false, error: e?.message || "טעינת העץ נכשלה", data: null });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchRows([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const rows = await searchResearchViewerGraphEntities(q, { limit: 30 });
        if (alive) setSearchRows(rows || []);
      } catch { if (alive) setSearchRows([]); }
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const chooseNode = useCallback(async (node) => {
    if (!node?.id) return;
    setSelectedNode(node);
    setNodeLoading(true);
    try { setNeighborhood(await fetchResearchViewerGraphEntity(node.id, { relationLimit: 80 })); }
    catch { setNeighborhood([]); }
    finally { setNodeLoading(false); }
  }, []);

  const d = state.data;
  const nodes = query.trim().length >= 2 ? searchRows : (d?.nodes || []);
  const activeResearch = useMemo(() => {
    const rows = d?.research || [];
    return rows
      .filter(r => !r.promoted_node_id)
      .sort((a, b) => {
        const rank = { approved: 0, candidate: 1, canonical: 2 };
        return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [d]);
  const topicDrift = (d?.topics || []).filter(t => !t.node_id);

  return <div style={S.page} dir="rtl">
    <div style={S.head}>
      <div>
        <div style={{ fontSize: 11, opacity: .62, fontWeight: 850 }}>REALITY GRAPH · PROJECTION READ-ONLY</div>
        <h2 style={{ margin: "3px 0 0", fontSize: 21 }}>🌳 העץ האחד</h2>
        <div style={S.muted}>כל הידע הישן שכבר בגרף + כל החומר החדש בדרכו לשער. אין עץ שני ואין העתקת מידע.</div>
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="חפש בכל הידע הישן…" style={{ marginInlineStart: "auto", minWidth: 250, maxWidth: 420, flex: "1 1 280px", border: "1px solid rgba(120,145,175,.24)", background: "rgba(255,255,255,.04)", color: "inherit", borderRadius: 11, padding: "10px 12px" }} />
      <button onClick={reload} style={S.btn}>{state.loading ? "טוען…" : "↻ רענן"}</button>
      <button onClick={onOpenGate} style={S.btn}>⚖️ שולחן השער</button>
    </div>

    {state.error && <div style={{ padding: 14, color: "#f09a9a" }}>{state.error}</div>}
    {d && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, padding: "12px 14px 0" }}>
      {[["Nodes חיים", d.counts.nodes], ["Edges", d.counts.edges], ["במחקר", d.counts.candidate], ["מאושר", d.counts.approved], ["קנוני", d.counts.canonical]].map(([label, value]) => <div key={label} style={{ ...S.card, padding: "9px 10px" }}><div style={S.muted}>{label}</div><b style={{ display: "block", marginTop: 2, fontSize: 21 }}>{value == null ? "—" : Number(value).toLocaleString("he-IL")}</b></div>)}
    </div>}

    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,.85fr) minmax(320px,1.25fr) minmax(280px,1fr)", gap: 10, padding: 14, alignItems: "start" }}>
      <section style={S.card}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><b>🌲 ידע שכבר בעץ</b><span style={{ marginInlineStart: "auto" }}>{pill(query ? `${nodes.length} תוצאות` : "ישן + קיים", "tree")}</span></div>
        <div style={{ ...S.muted, margin: "4px 0 9px" }}>ברירת המחדל מציגה Nodes בעלי משקל גבוה. החיפוש עובר על ה־Reality Graph החי כולו.</div>
        <div style={{ display: "grid", gap: 7, maxHeight: 650, overflow: "auto" }}>
          {(nodes || []).map(n => <NodeCard key={n.id} node={n} active={selectedNode?.id === n.id} onClick={chooseNode} />)}
          {!nodes?.length && <div style={S.muted}>לא נמצאו Nodes.</div>}
        </div>
      </section>

      <section style={S.card}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><b>🕸️ שכונת הישות</b>{selectedNode && pill(selectedNode.type || "node")}</div>
        <div style={{ ...S.muted, margin: "4px 0 9px" }}>זהו הגרף הקנוני הקיים — Node במרכז וה־Edges האמיתיים שסביבו. Graph presence ≠ Truth verification.</div>
        {nodeLoading ? <div style={S.muted}>טוען קשרים מהעץ…</div> : <Neighborhood findings={neighborhood} />}
      </section>

      <section style={S.card}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><b>🚦 מה בדרך לעץ</b><span style={{ marginInlineStart: "auto" }}>{pill(`${activeResearch.length} מוצגים`, "candidate")}</span></div>
        <div style={{ ...S.muted, margin: "4px 0 9px" }}>אותו Research OS. כאן רואים Candidate / Approved / Canonical שלא הוקרן ל־Node. אישור מחקר אינו קידום אוטומטי לעץ.</div>
        <div style={{ display: "grid", gap: 7, maxHeight: 570, overflow: "auto" }}>
          {activeResearch.slice(0, 180).map(r => <ResearchCard key={r.id} row={r} onOpenGate={onOpenGate} />)}
        </div>
        {topicDrift.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(120,145,175,.15)" }}>
          <b style={{ fontSize: 12.5 }}>⚠️ Topics מאושרים בלי Node</b>
          <div style={S.muted}>מוצגים כ־Drift, לא מסונכרנים אוטומטית.</div>
          {topicDrift.slice(0, 12).map(t => <div key={t.id} style={{ marginTop: 6 }}>{pill("פער עץ", "drift")} <span style={{ fontSize: 11.5 }}>{t.title || t.slug}</span></div>)}
        </div>}
      </section>
    </div>

    <div style={{ padding: "0 14px 14px", ...S.muted }}>
      <b>כלל העבודה:</b> Candidate → Approved → Canonical הם שלבים שונים. רק קידום קנוני שעומד בחוזי Identity / Privacy / Graph יכול ליצור Node/Edge. אחרי קידום אמיתי, רענון העץ מציג את הישות כאן מתוך המקור הקנוני — לא מעותק UI.
    </div>
  </div>;
}
