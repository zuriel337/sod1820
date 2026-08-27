import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase, askRaziel } from "../../lib/supabase.js";

const TYPE_META = {
  comment: ["💬", "תגובות"],
  whatsapp: ["🟢", "WhatsApp"],
  community_hint: ["💡", "דיווחי רמזים"],
  els: ["🔍", "ELS"],
  research_object: ["🔬", "מחקר"],
  contact: ["✉️", "פניות"],
  direct_message: ["📨", "הודעות"],
  channel: ["📡", "ערוצים"],
};
const GROUP_LABELS = {
  "or-geula": "אור הגאולה",
  "torat-haremez": "תורת הרמז",
  "gilui-yomi": "הגילוי היומי",
  "sfot-vheker": "שפות וחקר מציאות",
  "sod-hachashmal": "סוד החשמל",
};
const tabs = ["all", "comment", "whatsapp", "community_hint", "direct_message", "contact", "els", "research_object", "channel"];
const card = { background: "#fff", border: "1px solid #e1e6ee", borderRadius: 16, boxShadow: "0 5px 20px rgba(24,39,75,.05)" };
const btn = { border: "1px solid #cfd7e3", background: "#fff", color: "#243247", borderRadius: 10, padding: "8px 12px", fontWeight: 800, cursor: "pointer" };

function fmt(v) { try { return new Date(v).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } }
function groupLabel(v) { return GROUP_LABELS[v] || v || "ללא קבוצה"; }
function clip(v, n=260) { const s=String(v||"").replace(/\s+/g," ").trim(); return s.length>n?s.slice(0,n)+"…":s; }

function ScopeChip({ active, children, onClick, count }) {
  return <button onClick={onClick} style={{ ...btn, borderColor: active ? "#2f6df6" : "#d7dce4", background: active ? "#eef4ff" : "#fff", color: active ? "#175cd3" : "#475467", padding: "7px 11px" }}>{children}{count != null ? ` · ${count}` : ""}</button>;
}

export default function CommandCenterNextPage() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [historyOpen, setHistoryOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("טופל במפקדה");
  const [razielText, setRazielText] = useState("");
  const [razielAnswer, setRazielAnswer] = useState("");
  const [razielBusy, setRazielBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [{ data: feed, error: fe }, { data: hist, error: he }] = await Promise.all([
        supabase.rpc("admin_attention_feed_v1", { p_include_handled: false, p_limit: 1200 }),
        supabase.rpc("admin_attention_history_v1", { p_limit: 120 }),
      ]);
      if (fe) throw fe; if (he) throw he;
      setItems(feed || []); setHistory(hist || []); setSelected(new Set());
    } catch (e) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin, load]);

  const counts = useMemo(() => {
    const out = { all: items.length };
    for (const i of items) out[i.source_type] = (out[i.source_type] || 0) + 1;
    return out;
  }, [items]);
  const groups = useMemo(() => [...new Set(items.map(i => i.source_group).filter(Boolean))].sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b),"he")), [items]);
  const shown = useMemo(() => items.filter(i => {
    if (tab !== "all" && i.source_type !== tab) return false;
    if (group && i.source_group !== group) return false;
    if (q) {
      const hay = `${i.actor_name||""} ${i.title||""} ${i.body||""} ${i.context_label||""} ${i.source_group||""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [items, tab, group, q]);
  const selectedItems = useMemo(() => shown.filter(i => selected.has(i.attention_key)), [shown, selected]);
  const contextItems = selectedItems.length ? selectedItems : shown;

  const toggle = k => setSelected(s => { const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  const selectAll = () => setSelected(new Set(shown.map(i => i.attention_key)));
  const clearSelection = () => setSelected(new Set());

  async function handleSelected() {
    const target = selectedItems.length ? selectedItems : shown;
    if (!target.length) return;
    if (!window.confirm(`אתה עומד לסמן כטופל ${target.length} פריטים${group ? ` מקבוצת ${groupLabel(group)}` : ""}. להמשיך?`)) return;
    setBusy(true);
    const payload = target.map(i => ({ source_type:i.source_type, source_ref:i.source_ref, source_group:i.source_group, actor_name:i.actor_name, title:i.title, body:i.body, context_ref:i.context_ref }));
    const { data, error: e } = await supabase.rpc("admin_attention_handle_bulk_v1", { p_items: payload, p_reason: reason || "טופל במפקדה" });
    setBusy(false);
    if (e || data?.ok === false) { setError(e?.message || data?.error || "הפעולה נכשלה"); return; }
    await load();
  }

  async function restore(h) {
    const { data, error: e } = await supabase.rpc("admin_attention_unhandle_v1", { p_source_type: h.source_type, p_source_ref: h.source_ref });
    if (e || data?.ok === false) { setError(e?.message || data?.error || "השחזור נכשל"); return; }
    await load();
  }

  async function askCurrent(text) {
    const prompt = (text || razielText).trim(); if (!prompt) return;
    setRazielBusy(true); setRazielAnswer("");
    const sample = contextItems.slice(0, 45).map(i => ({ type:i.source_type, group:i.source_group, actor:i.actor_name, title:i.title, body:clip(i.body,220), context:i.context_label, status:i.status }));
    try {
      const r = await askRaziel({
        subject: prompt,
        facts: sample,
        context: `COMMAND CENTER vNext · scope=${selectedItems.length ? "SELECTED" : "FILTERED"} · ${contextItems.length} items. Attention בלבד; Dismissed/Handled ≠ False; Claim ≠ Fact.`,
        metatron: true,
      });
      setRazielAnswer(r?.answer || r?.greeting || "רזיאל לא החזיר תשובה.");
    } catch (e) { setRazielAnswer(`שגיאה: ${e?.message || e}`); }
    finally { setRazielBusy(false); }
  }

  const page = { minHeight:"100vh", direction:"rtl", background:"#f3f6fa", color:"#172033", padding:"18px clamp(10px,2.5vw,30px) 40px", fontFamily:"Arial, sans-serif" };
  if (authLoading) return <main style={page}>טוען הרשאות…</main>;
  if (!isAdmin) return <main style={page}><div style={{ ...card, maxWidth:560, margin:"80px auto", padding:28, textAlign:"center" }}><h2>מפקדה חדשה</h2><p>אדמין בלבד.</p></div></main>;

  return <main style={page}><div style={{ maxWidth:1480, margin:"0 auto", display:"grid", gap:14 }}>
    <header style={{ ...card, padding:"16px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
      <div><div style={{ color:"#175cd3", fontSize:11, fontWeight:900 }}>SOD1820 · COMMAND CENTER vNEXT · EXPERIMENTAL PROJECTION</div><h1 style={{ margin:"3px 0", fontSize:"clamp(25px,4vw,38px)" }}>🎛️ המפקדה החדשה</h1><div style={{ color:"#667085", fontSize:13 }}>נכנס → בוחר → מטפל → היסטוריה. אותם מקורות, אותם חוקים, אותו Human Gate.</div></div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}><b style={{ fontSize:25, color:"#175cd3" }}>{items.length}</b><span style={{ color:"#667085" }}>דורשים תשומת לב</span><button onClick={load} style={btn}>↻</button></div>
    </header>

    {error && <div style={{ ...card, padding:12, color:"#b42318", borderColor:"#f3b2ad" }}>{error}</div>}

    <section style={{ ...card, padding:12, display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
      {tabs.map(k => { const [ic,lbl]=k==="all"?["📥","הכול"]:(TYPE_META[k]||["•",k]); return <ScopeChip key={k} active={tab===k} onClick={()=>{setTab(k);setSelected(new Set());}} count={counts[k]||0}>{ic} {lbl}</ScopeChip>; })}
    </section>

    <section style={{ ...card, padding:12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
      <select value={group} onChange={e=>{setGroup(e.target.value);setSelected(new Set());}} style={{ ...btn, minWidth:190 }}><option value="">כל הקבוצות / המקורות</option>{groups.map(g=><option key={g} value={g}>{groupLabel(g)}</option>)}</select>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש…" style={{ border:"1px solid #cfd7e3", borderRadius:10, padding:"9px 11px", minWidth:180, flex:"1 1 220px" }} />
      <span style={{ color:"#667085", fontSize:12 }}>מוצגים <b>{shown.length}</b></span>
      <button onClick={selectAll} style={btn}>☑ בחר הכל ({shown.length})</button>
      {selected.size>0 && <button onClick={clearSelection} style={btn}>נקה בחירה · {selected.size}</button>}
    </section>

    {(selected.size>0 || group) && <section style={{ ...card, padding:12, position:"sticky", top:8, zIndex:3, borderColor:"#9db8ff", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
      <b>{selectedItems.length ? `${selectedItems.length} נבחרו` : `כל ${shown.length} המסוננים`}</b>
      <select value={reason} onChange={e=>setReason(e.target.value)} style={btn}><option>טופל במפקדה</option><option>לא רלוונטי כרגע</option><option>כפול</option><option>חלש מדי</option><option>לא מתאים למחקר</option></select>
      <button onClick={handleSelected} disabled={busy} style={{ ...btn, background:"#eaf8f0", borderColor:"#88caa5", color:"#18794e" }}>{busy?"מטפל…":"✓ טופל / הוצא מהתור"}</button>
      <button onClick={()=>askCurrent("סכם לי את הקבוצה שבחרתי, קבץ אותה ותמליץ מה דורש אותי קודם.")} style={{ ...btn, background:"#eef4ff", borderColor:"#9db8ff", color:"#175cd3" }}>🤖 תן לרזיאל</button>
    </section>}

    <section style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr)", gap:8 }}>
      {loading ? <div style={{ ...card, padding:28, textAlign:"center" }}>טוען…</div> : shown.map(i => {
        const [ic,lbl]=TYPE_META[i.source_type]||["•",i.source_type];
        const checked=selected.has(i.attention_key);
        return <article key={i.attention_key} onClick={()=>toggle(i.attention_key)} style={{ ...card, padding:"12px 14px", cursor:"pointer", borderColor:checked?"#2f6df6":"#e1e6ee", background:checked?"#f4f7ff":"#fff" }}>
          <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}><input type="checkbox" checked={checked} onChange={()=>toggle(i.attention_key)} onClick={e=>e.stopPropagation()} style={{ marginTop:4 }} /><div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}><b>{ic} {lbl}</b><span style={{ color:"#175cd3", fontSize:12, fontWeight:800 }}>{groupLabel(i.source_group)}</span><span style={{ color:"#667085", fontSize:12 }}>{i.actor_name}</span><span style={{ marginRight:"auto", color:"#98a2b3", fontSize:11 }}>{fmt(i.created_at)}</span></div>
            <div style={{ fontWeight:800, marginTop:5 }}>{i.title}</div><div style={{ color:"#475467", marginTop:4, lineHeight:1.6, fontSize:13 }}>{clip(i.body,420)}</div>
            {(i.context_label||i.context_ref) && <div style={{ marginTop:6, color:"#667085", fontSize:11 }}>↳ הקשר: {i.context_label || "—"}{i.context_ref ? ` · ${i.context_ref}` : ""}</div>}
            {i.source_type==="whatsapp" && <div style={{ marginTop:5, color:i.metadata?.reply_out?"#18794e":"#98a2b3", fontSize:11 }}>🤖 תשובת רזיאל: {i.metadata?.reply_out || "עדיין אין"}</div>}
            {i.source_type==="community_hint" && <div style={{ marginTop:5, color:"#9a6700", fontSize:11 }}>💡 {i.metadata?.image_url?"דיווח חזותי/מעורב":"דיווח טקסט מחקרי"}{i.metadata?.number?` · #${i.metadata.number}`:""}</div>}
          </div></div>
        </article>;
      })}
      {!loading && !shown.length && <div style={{ ...card, padding:28, textAlign:"center", color:"#667085" }}>אין פריטים במסנן הזה.</div>}
    </section>

    <section style={{ ...card, padding:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}><b style={{ color:"#9a7818" }}>🤖 רזיאל</b><span style={{ color:"#667085", fontSize:12 }}>עובד על {selectedItems.length?`${selectedItems.length} הנבחרים`:`${shown.length} המסוננים`}</span></div>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:8 }}>{["סכם לי","קבץ לי","מצא כפילויות","מה קודם?"].map(x=><button key={x} onClick={()=>askCurrent(x)} style={btn}>{x}</button>)}</div>
      <div style={{ display:"flex", gap:8 }}><input value={razielText} onChange={e=>setRazielText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askCurrent()} placeholder="תגיד לרזיאל מה לעשות עם מה שמוצג עכשיו…" style={{ border:"1px solid #cfd7e3", borderRadius:10, padding:"10px 12px", flex:1 }} /><button onClick={()=>askCurrent()} disabled={razielBusy} style={{ ...btn, background:"#eef4ff", borderColor:"#9db8ff" }}>{razielBusy?"חושב…":"שלח"}</button></div>
      {razielAnswer && <div style={{ marginTop:10, padding:12, borderRadius:12, background:"#fffaf0", border:"1px solid #ead7a1", whiteSpace:"pre-wrap", lineHeight:1.7 }}>{razielAnswer}</div>}
    </section>

    <section style={{ ...card, overflow:"hidden" }}>
      <button onClick={()=>setHistoryOpen(v=>!v)} style={{ width:"100%", border:0, background:"#f8fafc", padding:"12px 14px", textAlign:"right", fontWeight:900, cursor:"pointer" }}>🕘 היסטוריה · {history.length} {historyOpen?"▲":"▼"}</button>
      {historyOpen && <div style={{ maxHeight:270, overflowY:"auto", padding:"4px 12px 12px" }}>{history.map(h=><div key={h.id} style={{ display:"flex", gap:8, alignItems:"center", borderBottom:"1px solid #eef1f4", padding:"8px 2px" }}><span>✓</span><div style={{ flex:1, minWidth:0 }}><b style={{ fontSize:12 }}>{h.title || h.source_type}</b><div style={{ color:"#667085", fontSize:11 }}>{h.metadata?.source_group ? groupLabel(h.metadata.source_group)+" · " : ""}{h.metadata?.reason || "טופל"} · {fmt(h.metadata?.at || h.created_at)}</div></div><button onClick={()=>restore(h)} style={{ ...btn, padding:"5px 8px", fontSize:11 }}>↩ החזר</button></div>)}</div>}
    </section>
  </div></main>;
}
