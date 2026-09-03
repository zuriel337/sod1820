import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { F } from "../../theme.js";
import { supabase, listRelationEvidence, setRelationEvidence } from "../../lib/supabase.js";
import { getCommandCenter, reviewRecommendation } from "../../lib/visits.js";
import { getPendingHints, approveHint, rejectHint } from "../../lib/community.js";
import { fetchResearchViewerFindings, reviewResearchObjectFinding } from "../../lib/research/researchViewerProjection.js";

// HUMAN GATE DESK v1
// ------------------
// Experience/Projection only. It unifies the researcher's VIEW and gestures, not storage.
// Every source remains source-native and every write delegates to an existing canonical path:
// recommendations -> admin_recommendation_review; research_objects -> admin_research_review;
// relation_evidence -> set_relation_evidence; community_hints -> existing approve/reject RPCs;
// chiddush_submissions -> existing approve/reject RPCs; raw attention -> research_items handled marker.
// No new table/store/engine/graph. Candidate != Approved != Canonical != Published.

const C = {
  bg: "#070b12",
  panel: "rgba(12,18,29,.92)",
  panel2: "rgba(17,25,39,.86)",
  line: "rgba(157,175,205,.16)",
  lineStrong: "rgba(212,175,55,.34)",
  text: "#f3f5f8",
  muted: "#9da8b8",
  faint: "#677386",
  gold: "#d7b85b",
  blue: "#6da7ff",
  green: "#67d493",
  red: "#ee8585",
  violet: "#b69cff",
  cyan: "#69d6dc",
};

const SOURCE_LABEL = {
  attention: "קליטה",
  recommendation: "מטטרון",
  research_object: "אובייקט מחקר",
  relation: "קשר",
  community_hint: "רמז קהילה",
  chiddush: "חידוש",
  topic: "התכנסות",
  insight: "בית המדרש",
  contribution: "תרומת מחקר",
};

const VIEW_LABELS = {
  desk: "⚖️ שולחן השער",
  beit: "📚 בית המדרש",
  topics: "🌐 התכנסויות",
  overview: "🧭 תמונה כוללת",
};

const panel = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,.20)" };
const btn = (active = false) => ({ cursor: "pointer", border: `1px solid ${active ? C.lineStrong : C.line}`, background: active ? "rgba(215,184,91,.12)" : "rgba(255,255,255,.025)", color: active ? C.gold : C.muted, borderRadius: 999, padding: "8px 13px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 850 });

function short(v, max = 170) {
  const s = String(v || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function dt(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return ""; }
}
function safeArray(v) { return Array.isArray(v) ? v : []; }
function cardKey(c) { return `${c.kind}:${c.id}`; }

function Badge({ children, tone = "muted" }) {
  const color = tone === "gold" ? C.gold : tone === "green" ? C.green : tone === "red" ? C.red : tone === "blue" ? C.blue : tone === "violet" ? C.violet : tone === "cyan" ? C.cyan : C.muted;
  return <span style={{ border: `1px solid ${color}55`, background: `${color}12`, color, borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontFamily: F.heading, fontWeight: 850, whiteSpace: "nowrap" }}>{children}</span>;
}

function ActionButton({ children, tone = "muted", disabled, onClick, title }) {
  const color = tone === "green" ? C.green : tone === "red" ? C.red : tone === "gold" ? C.gold : tone === "blue" ? C.blue : C.muted;
  return <button type="button" title={title} disabled={disabled} onClick={onClick} style={{ cursor: disabled ? "wait" : "pointer", border: `1px solid ${color}66`, background: `${color}12`, color, borderRadius: 9, padding: "5px 9px", fontSize: 11.5, fontFamily: F.heading, fontWeight: 800, opacity: disabled ? .5 : 1 }}>{children}</button>;
}

function normalizeAttention(r) {
  return {
    id: r.attention_key || `${r.source_type}:${r.source_ref}`,
    rawId: r.source_ref,
    kind: "attention",
    sourceType: r.source_type,
    sourceRef: r.source_ref,
    title: r.title || r.source_group || "פריט חדש",
    body: r.body || "",
    meta: r.context_label || r.source_group || r.actor_name || "",
    status: r.status || "new",
    createdAt: r.created_at,
    raw: r,
  };
}
function normalizeRecommendation(r) {
  return { id: r.id, rawId: r.id, kind: "recommendation", sourceRef: String(r.id), title: r.target_entity || "המלצת מטטרון", body: r.reason || "", meta: r.type || "recommendation", status: r.status || "pending", createdAt: r.created_at, raw: r };
}
function normalizeRelation(r) {
  return { id: r.id || `${r.method}:${r.a_phrase}:${r.b_phrase}`, rawId: r.id, kind: "relation", sourceRef: String(r.id || ""), title: `${r.a_phrase || "?"} ↔ ${r.b_phrase || "?"}`, body: [r.method, r.value != null ? `ערך ${r.value}` : null, r.relation_type].filter(Boolean).join(" · "), meta: r.source || "relation_evidence", status: r.status || "candidate", createdAt: r.created_at, raw: r };
}
function normalizeHint(r) {
  return { id: r.id, rawId: r.id, kind: "community_hint", sourceRef: String(r.id), title: r.number ? `רמז #${r.number}` : "רמז מהקהילה", body: r.description || "", meta: r.reporter_name || "קהילה", status: r.status || "pending", createdAt: r.created_at, raw: r };
}
function normalizeChiddush(r) {
  return { id: r.id, rawId: r.id, kind: "chiddush", sourceRef: String(r.id), title: r.title || "חידוש", body: r.body || "", meta: r.author_name || "חוקר", status: r.status || "pending", createdAt: r.created_at, raw: r };
}
function normalizeRO(row, finding) {
  return { id: row.id, rawId: row.id, kind: "research_object", sourceRef: String(row.id), title: row.statement || row.kind || "Research Object", body: row.source || row.source_ref || "", meta: [row.kind, row.value != null ? `#${row.value}` : null, row.engine_verified === true ? "engine verified" : null].filter(Boolean).join(" · "), status: row.status, createdAt: row.created_at, raw: row, finding };
}
function normalizeTopic(r) {
  return { id: r.id, rawId: r.id, kind: "topic", sourceRef: String(r.id), title: r.title || r.slug || "התכנסות", body: r.subtitle || "", meta: r.node_id ? "Graph identity" : "חסר Node", status: r.status || "approved", createdAt: r.approved_at || r.created_at, raw: r, link: r.slug ? `/topic/${encodeURIComponent(r.slug)}` : null };
}
function normalizeInsight(r) {
  return { id: r.id, rawId: r.id, kind: "insight", sourceRef: String(r.id), title: r.title || "חידוש", body: r.body || "", meta: [r.origin, r.category, r.verified ? "מאומת" : null].filter(Boolean).join(" · "), status: r.is_active ? "active" : "inactive", createdAt: r.created_at, raw: r, link: r.card_url || null };
}
function normalizeContribution(r) {
  return { id: r.id, rawId: r.id, kind: "contribution", sourceRef: String(r.id), title: r.title || r.intent || "תרומת מחקר", body: r.body || "", meta: [r.author_name, r.status, r.convergence_slug ? "מקושר להתכנסות" : null, r.graph_node_id ? "מקושר לעץ" : null].filter(Boolean).join(" · "), status: r.status, createdAt: r.created_at, raw: r, link: r.convergence_slug ? `/topic/${encodeURIComponent(r.convergence_slug)}` : null };
}

async function loadDeskData() {
  const errors = [];
  const guard = async (name, fn, fallback) => {
    try { return await fn(); }
    catch (e) { errors.push(`${name}: ${e?.message || e}`); return fallback; }
  };

  const [attention, command, candidateRO, approvedRO, canonicalRO, relations, hints, chiddush, topics, insights, contributions] = await Promise.all([
    guard("attention", async () => {
      const { data, error } = await supabase.rpc("admin_attention_feed_v2", { p_include_handled: false, p_limit: 900 });
      if (error) throw error; return data || [];
    }, []),
    guard("metatron", () => getCommandCenter(), {}),
    guard("research-candidate", () => fetchResearchViewerFindings({ limit: 500, status: "candidate" }), { rows: [], findings: [] }),
    guard("research-approved", () => fetchResearchViewerFindings({ limit: 300, status: "approved" }), { rows: [], findings: [] }),
    guard("research-canonical", () => fetchResearchViewerFindings({ limit: 300, status: "canonical" }), { rows: [], findings: [] }),
    guard("relations", () => listRelationEvidence("candidate", 120), []),
    guard("hints", () => getPendingHints("pending", 120), []),
    guard("chiddush", async () => {
      const { data, error } = await supabase.from("chiddush_submissions").select("id,title,body,author_name,status,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(120);
      if (error) throw error; return data || [];
    }, []),
    guard("topics", async () => {
      const { data, error } = await supabase.from("topic_cards").select("id,slug,title,subtitle,status,node_id,numbers,highlight_numbers,approved_at,created_at").eq("status", "approved").order("approved_at", { ascending: false, nullsFirst: false }).limit(350);
      if (error) throw error; return data || [];
    }, []),
    guard("insights", async () => {
      const { data, error } = await supabase.from("insights").select("id,title,body,origin,category,verified,is_active,created_at,card_url,related_numbers").eq("is_active", true).order("created_at", { ascending: false }).limit(180);
      if (error) throw error; return data || [];
    }, []),
    guard("contributions", async () => {
      const { data, error } = await supabase.from("research_contributions").select("id,title,body,intent,author_name,status,created_at,graph_node_id,convergence_slug").in("status", ["approved", "published"]).order("created_at", { ascending: false }).limit(180);
      if (error) throw error; return data || [];
    }, []),
  ]);

  const byId = (bundle) => {
    const m = new Map();
    safeArray(bundle?.findings).forEach(f => {
      const id = String(f?.identity?.sourceIdentity?.researchObjectId || "");
      if (id) m.set(id, f);
    });
    return m;
  };
  const cMap = byId(candidateRO), aMap = byId(approvedRO), kMap = byId(canonicalRO);

  return {
    errors,
    attention: safeArray(attention).map(normalizeAttention).filter(c => c.sourceType !== "research_object" && c.sourceType !== "community_hint"),
    recommendations: safeArray(command?.recommendations).map(normalizeRecommendation),
    relations: safeArray(relations).map(normalizeRelation),
    hints: safeArray(hints).map(normalizeHint),
    chiddush: safeArray(chiddush).map(normalizeChiddush),
    candidate: safeArray(candidateRO?.rows).map(r => normalizeRO(r, cMap.get(String(r.id)))),
    approved: safeArray(approvedRO?.rows).map(r => normalizeRO(r, aMap.get(String(r.id)))),
    canonical: safeArray(canonicalRO?.rows).map(r => normalizeRO(r, kMap.get(String(r.id)))),
    topics: safeArray(topics).map(normalizeTopic),
    insights: safeArray(insights).map(normalizeInsight),
    contributions: safeArray(contributions).map(normalizeContribution),
  };
}

function Card({ card, busy, onAction, onFocus, onDragStart, compact = false }) {
  const canApprove = ["recommendation", "research_object", "relation", "community_hint", "chiddush"].includes(card.kind) && (card.kind !== "research_object" || card.status === "candidate");
  const canTree = card.kind === "research_object" && card.status === "approved";
  const canHandle = card.kind === "attention";
  const canReject = ["recommendation", "research_object", "relation", "community_hint", "chiddush"].includes(card.kind) && !(card.kind === "research_object" && card.status !== "candidate");
  const tone = card.kind === "research_object" ? "blue" : card.kind === "topic" ? "green" : card.kind === "recommendation" ? "gold" : card.kind === "relation" ? "violet" : card.kind === "community_hint" ? "cyan" : "muted";
  return <article draggable onDragStart={e => onDragStart?.(e, card)} style={{ border: `1px solid ${C.line}`, borderRadius: 13, background: C.panel2, padding: compact ? "9px 10px" : "11px 12px", opacity: busy === cardKey(card) ? .45 : 1, cursor: "grab" }}>
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <Badge tone={tone}>{SOURCE_LABEL[card.kind] || card.kind}</Badge>
      <Badge>{card.status || "—"}</Badge>
      {card.kind === "topic" && <Badge tone={card.raw?.node_id ? "green" : "red"}>{card.raw?.node_id ? "בעץ" : "חסר Node"}</Badge>}
      <span style={{ flex: 1 }} />
      <span style={{ color: C.faint, fontSize: 10.5 }}>{dt(card.createdAt)}</span>
    </div>
    <div style={{ color: C.text, fontFamily: F.heading, fontSize: compact ? 12.5 : 13.5, fontWeight: 850, lineHeight: 1.45, marginTop: 7 }}>{short(card.title, compact ? 90 : 130)}</div>
    {card.body && <div style={{ color: C.muted, fontFamily: F.body, fontSize: compact ? 11 : 11.8, lineHeight: 1.55, marginTop: 4 }}>{short(card.body, compact ? 110 : 185)}</div>}
    {card.meta && <div style={{ color: C.faint, fontFamily: F.body, fontSize: 10.5, marginTop: 5 }}>{short(card.meta, 125)}</div>}
    {!compact && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 9 }}>
      <ActionButton onClick={() => onFocus(card)} title="הוסף לסדר העבודה">📌 סדר עבודה</ActionButton>
      {card.link && <a href={card.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><ActionButton>↗ פתח</ActionButton></a>}
      {canApprove && <ActionButton tone="green" disabled={busy === cardKey(card)} onClick={() => onAction(card, "approve")}>✓ אשר</ActionButton>}
      {canTree && <ActionButton tone="gold" disabled={busy === cardKey(card)} onClick={() => onAction(card, "tree")}>🌳 לעץ</ActionButton>}
      {canHandle && <ActionButton tone="blue" disabled={busy === cardKey(card)} onClick={() => onAction(card, "handled")}>טופל</ActionButton>}
      {canReject && <ActionButton tone="red" disabled={busy === cardKey(card)} onClick={() => onAction(card, "reject")}>דחה</ActionButton>}
    </div>}
  </article>;
}

function DropLane({ id, title, subtitle, tone, count, onDrop, active, children }) {
  const color = tone === "green" ? C.green : tone === "gold" ? C.gold : tone === "blue" ? C.blue : tone === "red" ? C.red : C.violet;
  return <section onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, id)} style={{ ...panel, minWidth: 0, overflow: "hidden", borderColor: active ? color : C.line, boxShadow: active ? `0 0 0 2px ${color}22, 0 18px 60px rgba(0,0,0,.25)` : panel.boxShadow }}>
    <div style={{ padding: "12px 13px", borderBottom: `1px solid ${C.line}`, background: `${color}0c` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ color, fontFamily: F.heading, fontSize: 13.5 }}>{title}</b><span style={{ marginInlineStart: "auto", color: C.text, fontFamily: F.mono, fontWeight: 900 }}>{Number(count || 0).toLocaleString("he-IL")}</span></div>
      <div style={{ color: C.faint, fontFamily: F.body, fontSize: 10.5, marginTop: 3 }}>{subtitle}</div>
    </div>
    <div style={{ padding: 9, display: "grid", gap: 7, maxHeight: 590, overflowY: "auto" }}>{children}</div>
  </section>;
}

export default function KnowledgeControlCenterTab() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [view, setView] = useState("desk");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState("");
  const [dragTarget, setDragTarget] = useState("");
  const dragCard = useRef(null);
  const [focus, setFocus] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sod_human_gate_focus_v1") || "[]"); }
    catch { return []; }
  });

  const saveFocus = useCallback((next) => {
    setFocus(next);
    try { localStorage.setItem("sod_human_gate_focus_v1", JSON.stringify(next)); } catch { /* local preference only */ }
  }, []);

  const reload = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: "" }));
    loadDeskData().then(data => setState({ loading: false, error: "", data })).catch(e => setState({ loading: false, error: e?.message || String(e), data: null }));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const addFocus = useCallback((card) => {
    const minimal = { id: card.id, kind: card.kind, title: card.title, body: short(card.body, 140), meta: card.meta, status: card.status, sourceRef: card.sourceRef, createdAt: card.createdAt, link: card.link || null };
    const key = cardKey(minimal);
    const next = [minimal, ...focus.filter(x => cardKey(x) !== key)].slice(0, 30);
    saveFocus(next); setToast("נוסף לסדר העבודה האישי. זה לא משנה אמת או עץ.");
  }, [focus, saveFocus]);

  const removeFocus = (card) => saveFocus(focus.filter(x => cardKey(x) !== cardKey(card)));
  const moveFocus = (idx, dir) => {
    const to = idx + dir; if (to < 0 || to >= focus.length) return;
    const next = [...focus]; [next[idx], next[to]] = [next[to], next[idx]]; saveFocus(next);
  };

  const runAction = useCallback(async (card, action) => {
    const key = cardKey(card); setBusy(key); setToast("");
    try {
      if (action === "handled") {
        if (card.kind !== "attention") throw new Error("לפריט הזה אין מסלול 'טופל' קנוני");
        const payload = [{ source_type: card.raw.source_type, source_ref: card.raw.source_ref, title: card.raw.title, context_ref: card.raw.context_ref, source_group: card.raw.source_group, actor_name: card.raw.actor_name, body: card.raw.body }];
        const { data, error } = await supabase.rpc("admin_attention_handle_bulk_v2", { p_items: payload, p_reason: "טופל משולחן השער" });
        if (error) throw error; if (data?.ok === false) throw new Error(data.error || "handle failed");
        setToast("הפריט סומן כטופל. המקור לא נמחק.");
      } else if (card.kind === "recommendation") {
        if (!["approve", "reject"].includes(action)) throw new Error("המלצה אינה נכנסת לעץ ישירות");
        const res = await reviewRecommendation(card.rawId, action === "approve" ? "approved" : "rejected");
        if (!res?.id) throw new Error("ההמלצה לא עודכנה");
        setToast(action === "approve" ? "ההמלצה אושרה. שים לב: אישור המלצה אינו מבצע אוטומטית שינוי בעץ." : "ההמלצה נדחתה ונשמרה בפרובננס.");
      } else if (card.kind === "research_object") {
        if (!card.finding) throw new Error("חסרה זהות Finding ל־Research Object");
        const decision = action === "approve" ? "approve" : action === "tree" ? "canonicalize" : action === "reject" ? "reject" : null;
        if (!decision) throw new Error("פעולה לא חוקית ל־Research Object");
        if (decision === "canonicalize" && !window.confirm("לקדם את אובייקט המחקר לקנוני/עץ דרך admin_research_review? Canonical ≠ Published.")) { setBusy(null); return; }
        if (decision === "reject" && !window.confirm("לדחות את אובייקט המחקר? הוא לא יימחק; הסטטוס יישמר.")) { setBusy(null); return; }
        const res = await reviewResearchObjectFinding(card.finding, { decision });
        if (!res?.ok) throw new Error(res?.error || "admin_research_review failed");
        setToast(decision === "canonicalize" ? (res.graph_promoted ? "קודם לקנוני והוקרן לעץ דרך המסלול הקנוני." : "קודם לקנוני. ה־RPC לא דיווח על Graph promotion — לא מוצג כאילו נוצר Node.") : decision === "approve" ? "אושר כידע מחקרי. Approved ≠ Canonical." : "נדחה ונשמר.");
      } else if (card.kind === "relation") {
        if (!["approve", "reject"].includes(action)) throw new Error("קשר מאושר אינו Node חדש");
        const r = card.raw;
        await setRelationEvidence(r.method, r.a_phrase, r.b_phrase, r.value, action === "approve" ? "confirmed" : "rejected", null, action === "reject" ? "נדחה משולחן השער" : null, "human_gate_desk_v1");
        setToast(action === "approve" ? "הקשר אושר כ־relation evidence. הוא לא הוצג כאילו נוצר Edge חדש." : "הקשר נדחה ונשמר עם סיבת דחייה.");
      } else if (card.kind === "community_hint") {
        if (action === "approve") {
          const r = card.raw;
          const res = await approveHint(card.rawId, { number: r.number, name: r.reporter_name || null, occurred: r.occurred_at || null });
          if (res?.ok === false) throw new Error(res.error || "approve hint failed");
          setToast("הרמז אושר דרך המסלול הקיים ונשלח ל־gallery_images. זה לא הופך אותו אוטומטית ל־Node.");
        } else if (action === "reject") {
          if (!window.confirm("לדחות את דיווח הרמז?")) { setBusy(null); return; }
          const res = await rejectHint(card.rawId, "נדחה משולחן השער");
          if (res?.ok === false) throw new Error(res.error || "reject hint failed");
          setToast("הרמז נדחה.");
        } else throw new Error("פעולה לא חוקית לרמז");
      } else if (card.kind === "chiddush") {
        if (action === "approve") {
          const { data, error } = await supabase.rpc("approve_chiddush", { p_id: card.rawId, p_message: null });
          if (error) throw error; if (!data) throw new Error("approve_chiddush returned empty");
          setToast("החידוש אושר דרך המסלול הקיים ל־insights.");
        } else if (action === "reject") {
          if (!window.confirm("לדחות את החידוש?")) { setBusy(null); return; }
          const { data, error } = await supabase.rpc("reject_chiddush", { p_id: card.rawId });
          if (error) throw error; if (!data) throw new Error("reject_chiddush returned empty");
          setToast("החידוש נדחה.");
        } else throw new Error("פעולה לא חוקית לחידוש");
      } else {
        throw new Error("אין עדיין מסלול כתיבה קנוני לפריט הזה. לא בוצע שינוי.");
      }
      reload();
    } catch (e) {
      setToast(`⚠️ ${e?.message || e}`);
    } finally { setBusy(null); }
  }, [reload]);

  const onDragStart = (e, card) => {
    dragCard.current = card;
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", cardKey(card)); } catch { /* noop */ }
  };
  const onDrop = (e, target) => {
    e.preventDefault(); setDragTarget(""); const card = dragCard.current; dragCard.current = null; if (!card) return;
    if (target === "focus") return addFocus(card);
    if (target === "handled") return runAction(card, "handled");
    if (target === "approved") return runAction(card, "approve");
    if (target === "tree") return runAction(card, "tree");
    if (target === "reject") return runAction(card, "reject");
  };

  const d = state.data;
  const incoming = useMemo(() => d ? [...d.attention, ...d.recommendations, ...d.relations, ...d.hints, ...d.chiddush] : [], [d]);
  const tree = useMemo(() => d ? [...d.canonical.filter(c => c.raw?.promoted_node_id), ...d.topics.filter(t => t.raw?.node_id)] : [], [d]);
  const treeDrift = useMemo(() => d ? [...d.canonical.filter(c => !c.raw?.promoted_node_id), ...d.topics.filter(t => !t.raw?.node_id)] : [], [d]);

  const allSources = useMemo(() => {
    const s = new Set(incoming.map(c => SOURCE_LABEL[c.kind] || c.kind)); return ["all", ...s];
  }, [incoming]);
  const matches = useCallback((c) => {
    if (source !== "all" && (SOURCE_LABEL[c.kind] || c.kind) !== source) return false;
    const q = query.trim().toLowerCase(); if (!q) return true;
    return `${c.title} ${c.body} ${c.meta} ${c.status}`.toLowerCase().includes(q);
  }, [query, source]);

  const visibleIncoming = incoming.filter(matches);
  const visibleCandidate = safeArray(d?.candidate).filter(matches);
  const visibleApproved = safeArray(d?.approved).filter(matches);
  const visibleTree = tree.filter(matches);
  const beitItems = [...safeArray(d?.insights), ...safeArray(d?.contributions)].filter(matches).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const topicItems = safeArray(d?.topics).filter(matches);

  return <div dir="rtl" style={{ minHeight: "78vh", color: C.text, fontFamily: F.body }}>
    <div style={{ ...panel, padding: "18px 20px", background: "radial-gradient(circle at 18% 0%,rgba(109,167,255,.12),transparent 30%),radial-gradient(circle at 90% 0%,rgba(215,184,91,.10),transparent 26%),rgba(9,14,23,.96)" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 270 }}>
          <div style={{ color: C.gold, fontFamily: F.regal, fontSize: 29, fontWeight: 900 }}>⚖️ שולחן צוריאל · Human Gate Desk</div>
          <div style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.7, marginTop: 5, maxWidth: 850 }}>מקום אחד לכל מה שמחכה לך. גרור פריטים בין תחנות, אבל כל תנועה מפעילה רק מסלול קנוני שכבר קיים. אין כאן Store חדש ואין קיצור דרך בין Candidate, Approved, Canonical ו־Published.</div>
        </div>
        <button onClick={reload} disabled={state.loading} style={{ ...btn(false), padding: "10px 17px" }}>{state.loading ? "טוען…" : "↻ רענן הכל"}</button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>{Object.entries(VIEW_LABELS).map(([k, label]) => <button key={k} onClick={() => setView(k)} style={btn(view === k)}>{label}</button>)}</div>
      {d && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8, marginTop: 14 }}>
        {[
          ["ממתין לך", incoming.length, C.gold], ["במחקר", d.candidate.length, C.blue], ["מאושר", d.approved.length, C.green], ["בעץ", tree.length, C.violet], ["פערי עץ", treeDrift.length, treeDrift.length ? C.red : C.green], ["בית המדרש", d.insights.length + d.contributions.length, C.cyan],
        ].map(([label, value, color]) => <div key={label} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 11px", background: "rgba(255,255,255,.022)" }}><div style={{ color: C.faint, fontSize: 10.5, fontWeight: 800 }}>{label}</div><div style={{ color, fontFamily: F.mono, fontSize: 23, fontWeight: 950, marginTop: 2 }}>{Number(value || 0).toLocaleString("he-IL")}</div></div>)}
      </div>}
    </div>

    {toast && <div style={{ marginTop: 10, padding: "10px 13px", borderRadius: 11, border: `1px solid ${toast.startsWith("⚠") ? C.red + "66" : C.lineStrong}`, background: toast.startsWith("⚠") ? `${C.red}12` : `${C.gold}0d`, color: toast.startsWith("⚠") ? C.red : C.gold, fontSize: 12.5, lineHeight: 1.5 }}>{toast}</div>}
    {state.error && <div style={{ marginTop: 10, color: C.red }}>{state.error}</div>}
    {d?.errors?.length > 0 && <details style={{ marginTop: 9, color: C.muted, fontSize: 11.5 }}><summary style={{ cursor: "pointer" }}>חלק מהמקורות לא נטענו ({d.errors.length})</summary><div style={{ padding: 8 }}>{d.errors.map((x, i) => <div key={i}>{x}</div>)}</div></details>}

    <div style={{ ...panel, marginTop: 12, padding: 11, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="חפש בכל השולחן…" style={{ flex: 1, minWidth: 220, background: "rgba(255,255,255,.04)", color: C.text, border: `1px solid ${C.line}`, borderRadius: 11, padding: "9px 11px", outline: "none", fontFamily: F.body }} />
      <select value={source} onChange={e => setSource(e.target.value)} style={{ background: C.panel2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px" }}>{allSources.map(s => <option key={s} value={s}>{s === "all" ? "כל המקורות" : s}</option>)}</select>
    </div>

    <section onDragOver={e => { e.preventDefault(); setDragTarget("focus"); }} onDragLeave={() => setDragTarget("")} onDrop={e => onDrop(e, "focus")} style={{ ...panel, marginTop: 12, padding: 12, borderColor: dragTarget === "focus" ? C.gold : C.lineStrong, background: "linear-gradient(90deg,rgba(215,184,91,.07),rgba(109,167,255,.04))" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ color: C.gold, fontFamily: F.heading }}>📌 סדר העבודה שלי</b><span style={{ color: C.faint, fontSize: 10.5 }}>גרור לכאן כל דבר שאתה רוצה לטפל בו לפי סדר. נשמר בדפדפן בלבד — לא משנה אמת/גרף.</span><span style={{ marginInlineStart: "auto", color: C.muted, fontFamily: F.mono }}>{focus.length}</span></div>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingTop: focus.length ? 9 : 4 }}>
        {!focus.length && <div style={{ color: C.faint, fontSize: 11.5, padding: "9px 4px" }}>גרור לכאן פריטים כדי לבנות לעצמך תור עבודה פשוט.</div>}
        {focus.map((c, i) => <div key={cardKey(c)} style={{ minWidth: 210, maxWidth: 260, border: `1px solid ${C.line}`, borderRadius: 11, padding: 9, background: C.panel2 }}>
          <div style={{ color: C.text, fontSize: 12, fontWeight: 800 }}>{short(c.title, 70)}</div><div style={{ color: C.faint, fontSize: 10, marginTop: 3 }}>{SOURCE_LABEL[c.kind] || c.kind}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 7 }}><ActionButton onClick={() => moveFocus(i, -1)}>←</ActionButton><ActionButton onClick={() => moveFocus(i, 1)}>→</ActionButton><ActionButton tone="red" onClick={() => removeFocus(c)}>×</ActionButton></div>
        </div>)}
      </div>
    </section>

    {state.loading && !d && <div style={{ ...panel, marginTop: 12, padding: 50, textAlign: "center", color: C.muted }}>טוען את כל מקורות הידע…</div>}

    {d && view === "desk" && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
        <DropLane id="incoming" title="📥 נכנס / ממתין לי" subtitle="חומר חדש, המלצות, רמזים וקשרים. לא אמת קנונית." tone="gold" count={visibleIncoming.length} onDrop={onDrop} active={dragTarget === "incoming"}>
          {visibleIncoming.slice(0, 180).map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} />)}
          {!visibleIncoming.length && <div style={{ color: C.faint, fontSize: 11.5, padding: 10 }}>אין פריטים בתצוגה הזו.</div>}
        </DropLane>
        <DropLane id="research" title="🔬 במחקר" subtitle="research_objects במצב candidate. המנוע/החוקר מצא; עוד לא אושר." tone="blue" count={visibleCandidate.length} onDrop={onDrop} active={dragTarget === "research"}>
          {visibleCandidate.slice(0, 180).map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} />)}
        </DropLane>
        <DropLane id="approved" title="✓ אושר" subtitle="Approved ≠ Canonical. גרור Research Object מאושר לעץ רק אם אתה באמת רוצה לקנוניזציה." tone="green" count={visibleApproved.length + treeDrift.length} onDrop={onDrop} active={dragTarget === "approved"}>
          {visibleApproved.slice(0, 150).map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} />)}
          {treeDrift.slice(0, 40).map(c => <div key={`drift:${cardKey(c)}`} style={{ border: `1px solid ${C.red}55`, borderRadius: 11, padding: 9, background: `${C.red}0a` }}><Badge tone="red">פער עץ</Badge><div style={{ color: C.text, fontSize: 12.5, fontWeight: 800, marginTop: 6 }}>{short(c.title, 100)}</div><div style={{ color: C.faint, fontSize: 10.5, marginTop: 3 }}>{c.kind === "topic" ? "Topic מאושר ללא node_id — מוצג, לא מסונכרן אוטומטית." : "Canonical Research Object ללא promoted_node_id — לא מוצג כאילו הוא בעץ."}</div></div>)}
        </DropLane>
        <DropLane id="tree" title="🌳 בעץ" subtitle="רק זהויות שבאמת מוקרן להן Node/Graph identity." tone="violet" count={visibleTree.length} onDrop={onDrop} active={dragTarget === "tree"}>
          {visibleTree.slice(0, 220).map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} compact />)}
        </DropLane>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div onDragOver={e => { e.preventDefault(); setDragTarget("handled"); }} onDragLeave={() => setDragTarget("")} onDrop={e => onDrop(e, "handled")} style={{ ...panel, padding: 15, borderColor: dragTarget === "handled" ? C.blue : C.line, textAlign: "center" }}><b style={{ color: C.blue }}>✓ גרור לכאן: טופל</b><div style={{ color: C.faint, fontSize: 10.5, marginTop: 3 }}>רק פריטי Attention. מסמן handled ב־research_items; המקור נשאר במקומו.</div></div>
        <div onDragOver={e => { e.preventDefault(); setDragTarget("reject"); }} onDragLeave={() => setDragTarget("")} onDrop={e => onDrop(e, "reject")} style={{ ...panel, padding: 15, borderColor: dragTarget === "reject" ? C.red : C.line, textAlign: "center" }}><b style={{ color: C.red }}>✕ גרור לכאן: דחה</b><div style={{ color: C.faint, fontSize: 10.5, marginTop: 3 }}>מפעיל רק reject קנוני של סוג הפריט. שום דבר לא נמחק בשקט.</div></div>
      </div>
    </>}

    {d && view === "beit" && <div style={{ ...panel, marginTop: 12, padding: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><b style={{ color: C.cyan, fontFamily: F.heading }}>📚 מה חי עכשיו בבית המדרש</b><span style={{ color: C.faint, fontSize: 10.5 }}>Insights + תרומות מאושרות/מפורסמות. לא הופכים אוטומטית ל־Node.</span><span style={{ marginInlineStart: "auto", color: C.text, fontFamily: F.mono }}>{beitItems.length}</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: 8 }}>{beitItems.slice(0, 260).map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} compact />)}</div></div>}

    {d && view === "topics" && <div style={{ ...panel, marginTop: 12, padding: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><b style={{ color: C.green, fontFamily: F.heading }}>🌐 ההתכנסויות</b><span style={{ color: C.faint, fontSize: 10.5 }}>Topic Card = מקור עריכתי · node_id = זהות גרף. אלה שני צירים שונים.</span><span style={{ marginInlineStart: "auto", color: C.text, fontFamily: F.mono }}>{topicItems.length}</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: 8 }}>{topicItems.map(c => <Card key={cardKey(c)} card={c} busy={busy} onAction={runAction} onFocus={addFocus} onDragStart={onDragStart} compact />)}</div></div>}

    {d && view === "overview" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10, marginTop: 12 }}>
      {[
        ["מה מחכה להחלטה", incoming.length, "Attention + recommendations + relation candidates + community hints + chiddush", C.gold],
        ["מחקר שטרם אושר", d.candidate.length, "research_objects.status = candidate", C.blue],
        ["מחקר מאושר", d.approved.length, "Approved ≠ Canonical", C.green],
        ["Graph identity", tree.length, "Canonical RO עם promoted_node_id + approved Topic עם node_id", C.violet],
        ["פערי Projection", treeDrift.length, "Canonical/Topic שאינם מוקרן לעץ כרגע", treeDrift.length ? C.red : C.green],
        ["תוכן בית מדרש", d.insights.length + d.contributions.length, "Insights פעילים + תרומות approved/published", C.cyan],
      ].map(([title, value, desc, color]) => <div key={title} style={{ ...panel, padding: 15 }}><div style={{ color, fontFamily: F.heading, fontWeight: 900 }}>{title}</div><div style={{ color: C.text, fontFamily: F.mono, fontSize: 32, fontWeight: 950, margin: "5px 0" }}>{Number(value || 0).toLocaleString("he-IL")}</div><div style={{ color: C.faint, fontSize: 11.5, lineHeight: 1.55 }}>{desc}</div></div>)}
    </div>}

    <div style={{ marginTop: 12, color: C.faint, fontSize: 10.5, lineHeight: 1.7, textAlign: "center" }}>Rank, Don't Hide · Source stays source-native · Human Gate = ZURIEL · Canonical ≠ Published</div>
    <style>{`@media(max-width:1050px){.human-gate-grid{grid-template-columns:repeat(2,minmax(0,1fr))}} @media(max-width:720px){.human-gate-grid{grid-template-columns:1fr}}`}</style>
  </div>;
}
