import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../lib/AuthContext.jsx";

const CALIBRATION_REFS = ["posts:136", "posts:53", "posts:976", "posts:904"];
const NAV = [["feed", "זרם המחקר"], ["findings", "ממצאים"], ["sources", "מקורות"], ["review", "לבדיקה"]];

const card = { background: "#fff", border: "1px solid #dfe5ec", borderRadius: 16, boxShadow: "0 5px 20px rgba(24,39,75,.05)" };
const pill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800, border: "1px solid currentColor" };
const colors = {
  VERIFIED: ["#18794e", "#eaf8f1"], HELD: ["#9a6700", "#fff5d8"],
  MISMATCH: ["#b42318", "#fff0ee"], NEW: ["#175cd3", "#edf4ff"], EXISTING: ["#475467", "#f2f4f7"],
};

function tag(status) {
  const [color, background] = colors[status] || colors.EXISTING;
  return { ...pill, color, background };
}

function stateOf(row) {
  const d = row?.engine_detail || {};
  if (Array.isArray(d.source_mismatches) && d.source_mismatches.length) return "MISMATCH";
  if (row?.engine_verified === false || d.reason === "COUNTING_CONVENTION_OR_EDITION_UNRESOLVED" || d.status === "NOT_REPRODUCED_UNDER_CURRENT_CONVENTION") return "HELD";
  if (row?.engine_verified === true) return "VERIFIED";
  return row?.status === "candidate" ? "NEW" : "EXISTING";
}

function postId(ref) {
  const m = /^posts:(\d+)$/.exec(ref || "");
  return m ? Number(m[1]) : null;
}

function stripHtml(v, max = 350) {
  const s = String(v || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function Stat({ n, label }) {
  return <div style={{ ...card, padding: 15, minWidth: 105 }}><div style={{ fontSize: 25, fontWeight: 900 }}>{n}</div><div style={{ color: "#667085", fontSize: 12 }}>{label}</div></div>;
}

function Why({ row }) {
  const steps = [
    ["SOURCE", row.source_ref || row.source || "—"],
    ["EXTRACTION", row.kind || "research object"],
    ["PROCEDURE / ENGINE", row.engine_detail?.engine || row.engine_detail?.procedure?.[0] || "not engine verified"],
    ["FINDING / CANDIDATE", row.status || "—"],
  ];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>{steps.map(([k, v], i) => <div key={k} style={{ padding: 10, border: "1px solid #e4e7ec", background: "#f8fafc", borderRadius: 10, position: "relative" }}><div style={{ fontSize: 10, color: "#667085", fontWeight: 900 }}>{k}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, wordBreak: "break-word" }}>{String(v)}</div>{i < steps.length - 1 && <span style={{ position: "absolute", left: -8, top: "45%", color: "#98a2b3" }}>←</span>}</div>)}</div>;
}

function Hold({ row }) {
  const d = row.engine_detail || {};
  const source = d.source_claim || d.source_mismatches || row.statement;
  const canonical = d.canonical_result || d.canonical_book358 || d.result || d;
  if (stateOf(row) !== "HELD" && stateOf(row) !== "MISMATCH") return null;
  return <div style={{ border: "1px solid #f2b8b5", background: "#fff8f7", borderRadius: 14, padding: 14 }}><b style={{ color: "#b42318" }}>MISMATCH / HOLD — לא מתקנים בשקט</b><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, marginTop: 9 }}><div style={{ background: "#fff", padding: 10, borderRadius: 9 }}><b>SOURCE CLAIM</b><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 11 }}>{JSON.stringify(source, null, 2)}</pre></div><div style={{ background: "#fff", padding: 10, borderRadius: 9 }}><b>CANONICAL CORPUS / ENGINE</b><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 11 }}>{JSON.stringify(canonical, null, 2)}</pre></div></div><div style={{ color: "#7a271a", fontSize: 12 }}>Possible cause: edition / tokenization / segmentation / counting convention unresolved.</div></div>;
}

export default function ResearchViewerV0Page() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [tab, setTab] = useState("feed");
  const [rows, setRows] = useState([]);
  const [posts, setPosts] = useState({});
  const [els, setEls] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const fields = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";
        const { data: ro, error: roErr } = await supabase.from("research_objects").select(fields).in("source_ref", CALIBRATION_REFS).order("created_at", { ascending: false });
        if (roErr) throw roErr;
        const findings = ro || [];

        const ids = [...new Set(findings.map(r => postId(r.source_ref)).filter(Boolean))];
        let postMap = {};
        if (ids.length) {
          const { data: ps, error: pErr } = await supabase.from("posts").select("id,title,slug,content,excerpt,source,created_at").in("id", ids);
          if (pErr) throw pErr;
          postMap = Object.fromEntries((ps || []).map(p => [p.id, p]));
        }

        const { data: er, error: eErr } = await supabase.from("els_records").select("id,title,search_term,skip_distance,primary_number,visibility,status,source,corpus_id,start_index,engine_detail,slug").eq("search_term", "משיח טבת עשירי").limit(1).maybeSingle();
        if (eErr) throw eErr;

        const labels = [...new Set(findings.flatMap(r => [...(r.terms || []), r.value != null ? String(r.value) : null]).filter(Boolean))].slice(0, 80);
        let ns = [];
        if (labels.length) {
          const { data: nd, error: nErr } = await supabase.from("nodes").select("id,type,label,description").in("label", labels).limit(120);
          if (nErr) throw nErr;
          ns = nd || [];
        }

        let es = [];
        if (ns.length) {
          const idsCsv = ns.map(n => n.id).join(",");
          const { data: ed, error: edgeErr } = await supabase.from("edges").select("id,from_node,to_node,relation_type,weight,metadata").or(`from_node.in.(${idsCsv}),to_node.in.(${idsCsv})`).limit(120);
          if (edgeErr) throw edgeErr;
          es = ed || [];
        }

        if (!alive) return;
        setRows(findings); setPosts(postMap); setEls(er || null); setNodes(ns); setEdges(es); setSelectedId(findings[0]?.id || null);
      } catch (e) { if (alive) setError(e?.message || String(e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [authLoading, isAdmin]);

  const selected = rows.find(r => r.id === selectedId) || rows[0] || null;
  const selectedPost = selected ? posts[postId(selected.source_ref)] : null;
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach(r => { if (!map.has(r.source_ref)) map.set(r.source_ref, []); map.get(r.source_ref).push(r); });
    return [...map.entries()].map(([ref, items]) => ({ ref, items, verified: items.filter(x => stateOf(x) === "VERIFIED").length, held: items.filter(x => stateOf(x) === "HELD").length, mismatch: items.filter(x => stateOf(x) === "MISMATCH").length }));
  }, [rows]);

  const selectedNodeIds = new Set(nodes.filter(n => selected && ((selected.terms || []).includes(n.label) || String(selected.value) === n.label)).map(n => n.id));
  const relatedEdges = edges.filter(e => selectedNodeIds.has(e.from_node) || selectedNodeIds.has(e.to_node));

  const page = { minHeight: "100vh", direction: "rtl", background: "#f4f6f8", color: "#172033", padding: "24px clamp(14px,3vw,38px) 48px", fontFamily: "Arial, sans-serif" };
  if (authLoading) return <main style={page}>טוען הרשאות…</main>;
  if (!isAdmin) return <main style={page}><div style={{ ...card, maxWidth: 600, margin: "80px auto", padding: 30, textAlign: "center" }}><h2>Research Viewer v0</h2><p>פנימי · אדמין בלבד.</p></div></main>;

  const verified = rows.filter(r => stateOf(r) === "VERIFIED").length;
  const held = rows.filter(r => stateOf(r) === "HELD").length;
  const mismatch = rows.filter(r => stateOf(r) === "MISMATCH").length;

  return <main style={page}><div style={{ maxWidth: 1440, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}><div><div style={{ color: "#175cd3", fontSize: 12, fontWeight: 900 }}>SOD1820 · LIVE RESEARCH PROJECTION</div><h1 style={{ margin: "4px 0", fontSize: "clamp(26px,4vw,40px)" }}>Research Viewer v0</h1><div style={{ color: "#667085" }}>המנוע מגלה ומארגן; צוריאל חוקר, מפרש ובוחר.</div></div><nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{NAV.map(([k, v]) => <button key={k} onClick={() => setTab(k)} style={{ border: `1px solid ${tab === k ? "#175cd3" : "#d0d5dd"}`, background: tab === k ? "#edf4ff" : "#fff", color: tab === k ? "#175cd3" : "#344054", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>{v}</button>)}</nav></header>

    {error && <div style={{ ...card, color: "#b42318", borderColor: "#f1a9a5", padding: 14, marginBottom: 14 }}>Live read failed: {error}</div>}
    {loading ? <div style={{ ...card, padding: 28, textAlign: "center", color: "#667085" }}>טוען נתונים חיים…</div> : <>
      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}><Stat n={rows.length} label="Research Objects" /><Stat n={verified} label="Verified" /><Stat n={held} label="Held" /><Stat n={mismatch} label="Mismatch" /><Stat n={els ? 1 : 0} label="ELS source-native" /></section>

      {tab === "feed" && <div style={{ display: "grid", gap: 12 }}>{grouped.map(g => { const p = posts[postId(g.ref)]; return <article key={g.ref} style={{ ...card, padding: 17 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: "#667085", fontSize: 11 }}>{g.ref}</div><h3 style={{ margin: "4px 0" }}>{p?.title || `פוסט #${postId(g.ref)}`}</h3></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={tag("NEW")}>{g.items.length} findings</span><span style={tag("VERIFIED")}>{g.verified} verified</span><span style={tag("HELD")}>{g.held} held</span><span style={tag("MISMATCH")}>{g.mismatch} mismatch</span></div></div><p style={{ color: "#667085", fontSize: 13 }}>{stripHtml(p?.excerpt || p?.content || g.items[0]?.statement, 260)}</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{g.items.map(r => <button key={r.id} onClick={() => { setSelectedId(r.id); setTab("findings"); }} style={{ ...tag(stateOf(r)), cursor: "pointer" }}>{stateOf(r)} · {r.value ?? r.kind}</button>)}</div></article>; })}{els && <article style={{ ...card, padding: 17 }}><div style={{ fontSize: 11, color: "#667085" }}>ELS · existing source-native record</div><h3>{els.title}</h3><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><span style={tag("VERIFIED")}>PUBLISHED / ENGINE ENRICHED</span><span style={pill}>skip {els.skip_distance}</span><span style={pill}>start {els.start_index}</span><span style={pill}>corpus {els.corpus_id}</span></div><p style={{ fontSize: 12, color: "#667085" }}>הועשר IN PLACE; לא נוצר Research Object כפול.</p></article>}</div>}

      {tab === "findings" && selected && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(280px,.75fr)", gap: 14 }}><section style={{ ...card, padding: 18, display: "grid", gap: 15 }}><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><span style={tag(stateOf(selected))}>{stateOf(selected)}</span><span style={pill}>{selected.kind}</span><span style={pill}>{selected.privacy_scope}</span></div><div><div style={{ color: "#667085", fontSize: 11 }}>EXTRACTED CLAIM / FINDING</div><h2 style={{ lineHeight: 1.6, fontSize: 20 }}>{selected.statement}</h2></div><div><b>Original Source</b><p style={{ color: "#475467" }}>{selectedPost?.title || selected.source_ref}</p><p style={{ color: "#667085", fontSize: 12 }}>{stripHtml(selectedPost?.excerpt || selectedPost?.content, 500)}</p></div><div><b>Procedure / Method / Operation</b><pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", borderRadius: 10, padding: 10, fontFamily: "inherit", fontSize: 11 }}>{JSON.stringify(selected.engine_detail?.procedure || selected.engine_detail?.arithmetic || selected.engine_detail?.engine || "—", null, 2)}</pre></div><div><b>Engine Verification</b><div style={{ marginTop: 5 }}>{selected.engine_verified === true ? "✓ ENGINE VERIFIED" : selected.engine_verified === false ? "HELD / NOT ENGINE VERIFIED" : "NOT TESTED / UNKNOWN"}</div></div><Hold row={selected} /><div><b>למה אני רואה את זה?</b><div style={{ marginTop: 8 }}><Why row={selected} /></div></div></section><aside style={{ display: "grid", gap: 12, alignContent: "start" }}><div style={{ ...card, padding: 14 }}><b>ממצאים</b><div style={{ display: "grid", gap: 6, marginTop: 8 }}>{rows.map(r => <button key={r.id} onClick={() => setSelectedId(r.id)} style={{ textAlign: "right", border: r.id === selected.id ? "1px solid #175cd3" : "1px solid #e4e7ec", background: r.id === selected.id ? "#edf4ff" : "#fff", borderRadius: 9, padding: 8, cursor: "pointer" }}><span style={{ ...tag(stateOf(r)), marginLeft: 6 }}>{stateOf(r)}</span>{r.source_ref} · {r.value ?? r.kind}</button>)}</div></div><div style={{ ...card, padding: 14 }}><b>Relations Preview · One Tree</b><p style={{ color: "#667085", fontSize: 11 }}>רק identities/edges חיים. אם אין node — לא ממציאים.</p><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{nodes.filter(n => selectedNodeIds.has(n.id)).map(n => <span key={n.id} style={pill}>{n.type}: {n.label}</span>)}</div><div style={{ display: "grid", gap: 5, marginTop: 8 }}>{relatedEdges.slice(0, 12).map(e => <div key={e.id} style={{ background: "#f8fafc", padding: 7, borderRadius: 8, fontSize: 11 }}>{e.relation_type} · {String(e.from_node).slice(0, 8)} → {String(e.to_node).slice(0, 8)}</div>)}</div>{!selectedNodeIds.size && <div style={{ color: "#98a2b3", fontSize: 12 }}>לא נמצאה זהות One Tree ישירה למונחי הממצא.</div>}</div></aside></div>}

      {tab === "sources" && <div style={{ display: "grid", gap: 12 }}>{grouped.map(g => { const p = posts[postId(g.ref)]; return <article key={g.ref} style={{ ...card, padding: 17 }}><div style={{ color: "#667085", fontSize: 11 }}>{g.ref} · {p?.source || "source"}</div><h3>{p?.title || g.ref}</h3><p style={{ color: "#475467", lineHeight: 1.7 }}>{stripHtml(p?.excerpt || p?.content, 700)}</p><div style={{ color: "#667085", fontSize: 12 }}>{g.items.length} Research Objects linked by live source_ref.</div></article>; })}{els && <article style={{ ...card, padding: 17 }}><div style={{ color: "#667085", fontSize: 11 }}>els_records · canonical source-native home</div><h3>{els.title}</h3><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 11 }}>{JSON.stringify(els.engine_detail, null, 2)}</pre></article>}</div>}

      {tab === "review" && <div style={{ display: "grid", gap: 10 }}><div style={{ ...card, padding: 14, background: "#fffaf0", borderColor: "#f1d18a" }}><b>מחכה לצוריאל</b><div style={{ color: "#667085", fontSize: 12 }}>read-mostly: אין Promote to Canonical, אין Publish, אין Truth editing. “פתח למחקר” רק פותח Inspector.</div></div>{rows.filter(r => r.status === "candidate").map(r => <article key={r.id} style={{ ...card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ flex: "1 1 500px" }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={tag(stateOf(r))}>{stateOf(r)}</span><span style={pill}>{r.source_ref}</span></div><div style={{ marginTop: 7, fontWeight: 700 }}>{stripHtml(r.statement, 270)}</div></div><button onClick={() => { setSelectedId(r.id); setTab("findings"); }} style={{ border: "1px solid #175cd3", background: "#edf4ff", color: "#175cd3", borderRadius: 10, padding: "9px 12px", fontWeight: 800, cursor: "pointer" }}>פתח למחקר</button></article>)}</div>}
    </>}
  </div></main>;
}
