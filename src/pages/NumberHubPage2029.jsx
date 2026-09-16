import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase, getSearchCount, getNumberNeighbors } from "../lib/supabase.js";
import { getCiphersForNumber } from "../lib/elsMatrices.js";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { numberAnchorToUniversalFinding } from "../lib/research/numberAnchorFinding.js";
import { entityFromNumber } from "../lib/research/entity.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import PulseRing, { pulseFromCounts } from "../components/PulseRing.jsx";
import QuickActions from "../components/QuickActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import AskRaziel from "../components/AskRaziel.jsx";
import NumberDNA from "../components/NumberDNA.jsx";
import Discourse from "../components/Discourse.jsx";

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function short(text, max = 130) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max).trim()}…` : s;
}

function cleanAnchorPhrase(fact, number) {
  const text = String(fact || "").trim();
  if (!text) return "";
  const rhs = text.split("=").slice(1).join("=").trim();
  if (!rhs) return "";
  return rhs.replace(new RegExp(`^${number}\\s*`), "").replace(/\([^)]*\)\s*$/, "").trim();
}

function methodLabel(group) {
  return group?.registry?.display_label || group?.method || "שיטה";
}

function methodKey(group) {
  return group?.registry?.method_key || group?.method || "";
}

function Section({ P, eyebrow, title, subtitle, action, children }) {
  return <section style={{ marginTop: 18, background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 22, padding: "18px 16px", boxShadow: P.mode === "dark" ? "0 16px 45px rgba(0,0,0,.24)" : "0 12px 34px rgba(80,60,10,.08)" }}>
    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 800, marginBottom: 4 }}>{eyebrow}</div>}
        <h2 style={{ margin: 0, color: P.accentText, fontFamily: F.heading, fontSize: 20, lineHeight: 1.25 }}>{title}</h2>
        {subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action || null}
    </div>
    {children}
  </section>;
}

function SignalChip({ P, icon, value, label }) {
  return <div style={{ minWidth: 92, border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 16, padding: "9px 10px", textAlign: "center" }}>
    <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 18, fontWeight: 800 }}>{icon} {value}</div>
    <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, marginTop: 2 }}>{label}</div>
  </div>;
}

function ActiveTrace({ P, group, phrase, onFinding }) {
  const [state, setState] = useState({ loading: false, finding: null, error: null });
  const [open, setOpen] = useState(false);
  const key = methodKey(group);

  useEffect(() => {
    let live = true;
    setOpen(false);
    if (!key || !phrase) {
      setState({ loading: false, finding: null, error: null });
      onFinding?.(null);
      return undefined;
    }
    setState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(key, phrase)
      .then(finding => {
        if (!live) return;
        setState({ loading: false, finding, error: null });
        onFinding?.(finding || null);
      })
      .catch(error => {
        if (!live) return;
        setState({ loading: false, finding: null, error });
        onFinding?.(null);
      });
    return () => { live = false; };
  }, [key, phrase]);

  const trace = state.finding?.projection?.dimensions?.trace || null;
  const result = state.finding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];

  return <div style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 15, padding: 12 }}>
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>החישוב הפעיל</div>
        <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 15, fontWeight: 800, marginTop: 3 }}>
          {phrase || "—"} · {methodLabel(group)} {state.loading ? "…" : result != null ? `= ${result}` : ""}
        </div>
      </div>
      <button onClick={() => setOpen(v => !v)} disabled={!trace && !state.error} style={{ cursor: trace || state.error ? "pointer" : "default", opacity: trace || state.error ? 1 : .55, border: `1px solid ${P.border}`, background: P.card, color: P.accentText, borderRadius: 999, padding: "7px 12px", fontFamily: F.heading, fontWeight: 750 }}>איך מחשבים?</button>
    </div>
    {state.error && <div style={{ color: P.inkSoft, fontSize: 11.5, marginTop: 7 }}>Trace לא זמין כרגע.</div>}
    {open && trace && <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${P.border}`, color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.65 }}>
      {steps.length ? short(steps.map(s => typeof s === "string" ? s : (s.word || s.label || s.step || "")).filter(Boolean).join(" · "), 300) : "המנוע החזיר Trace מאומת לשיטה הזאת."}
      <div style={{ color: P.accentDim, fontSize: 10.5, marginTop: 6 }}>עובדת מנוע. רזיאל מפרש — הוא לא מחשב את הגימטריה מחדש.</div>
    </div>}
  </div>;
}

function EmptyNote({ P, children }) {
  return <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, padding: "4px 0" }}>{children}</div>;
}

export default function NumberHubPage2029() {
  const { type, key } = useParams();
  const nav = useNavigate();
  const P = usePalette();
  const research = useResearch();
  const number = Number(key);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [anchorFinding, setAnchorFinding] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [activePhrase, setActivePhrase] = useState("");
  const [resolverDraft, setResolverDraft] = useState("");
  const [mode, setMode] = useState("research");
  const [calcFinding, setCalcFinding] = useState(null);
  const [metrics, setMetrics] = useState({ views: 0, searches: 0 });
  const [neighbors, setNeighbors] = useState([]);
  const [ciphers, setCiphers] = useState([]);

  useEffect(() => {
    let live = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type, key, relationLimit: 140, researchLimit: 70, topicLimit: 18 })
      .then(data => live && setState({ loading: false, data, error: null }))
      .catch(error => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
  }, [type, key]);

  useEffect(() => {
    let live = true;
    if (!Number.isInteger(number)) return undefined;
    Promise.allSettled([
      supabase.from("number_anchors").select("value,category,fact,hint,created_at,updated_at").eq("value", number).maybeSingle(),
      getSearchCount(number),
      supabase.from("page_views").select("*", { count: "exact", head: true }).eq("kind", "number").eq("ref", String(number)),
      getNumberNeighbors(number, 10),
      getCiphersForNumber(number, 10),
    ]).then(results => {
      if (!live) return;
      const anchorRow = results[0].status === "fulfilled" ? results[0].value?.data : null;
      setAnchorFinding(numberAnchorToUniversalFinding(anchorRow));
      setMetrics({
        searches: results[1].status === "fulfilled" ? Number(results[1].value || 0) : 0,
        views: results[2].status === "fulfilled" ? Number(results[2].value?.count || 0) : 0,
      });
      setNeighbors(results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : []);
      setCiphers(results[4].status === "fulfilled" && Array.isArray(results[4].value) ? results[4].value : []);
    });
    return () => { live = false; };
  }, [number]);

  const data = state.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const surface = data?.surface || {};
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const researchRows = Array.isArray(data?.research?.rows) ? data.research.rows : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const journey = data?.journeys?.numberKnowledgeJourney || null;
  const zero = data?.zeroScale || null;
  const zeroChain = Array.isArray(zero?.scale_chain) ? zero.scale_chain : [];
  const galleries = Array.isArray(surface.galleries) ? surface.galleries : [];
  const posts = Array.isArray(surface.posts) ? surface.posts : [];
  const insights = Array.isArray(surface.insights) ? surface.insights : [];
  const anchor = anchorFinding?.projection?.dimensions?.legacyNumberAnchor || null;
  const anchorPhrase = cleanAnchorPhrase(anchor?.fact, number);

  useEffect(() => {
    if (!families.length) return;
    const withAnchor = anchorPhrase ? families.find(g => (g.phrases || []).some(x => phraseOf(x) === anchorPhrase)) : null;
    const preferred = withAnchor || families.find(g => g.method === "רגיל") || families[0];
    const phrase = anchorPhrase && (preferred?.phrases || []).some(x => phraseOf(x) === anchorPhrase)
      ? anchorPhrase
      : phraseOf(preferred?.phrases?.[0]);
    setSelectedMethod(preferred?.method || "");
    setActivePhrase(phrase || anchorPhrase || String(number));
    setResolverDraft(phrase || anchorPhrase || "");
  }, [families, anchorPhrase, number]);

  const selectedGroup = useMemo(() => families.find(g => g.method === selectedMethod) || families[0] || null, [families, selectedMethod]);
  const selectedPhrases = (selectedGroup?.phrases || []).map(phraseOf).filter(Boolean).slice(0, 18);
  const activeResult = calcFinding?.subject?.value ?? calcFinding?.projection?.dimensions?.trace?.result ?? null;
  const pulse = pulseFromCounts({
    posts: surface.postsCount ?? posts.length,
    galleries: surface.galleriesCount ?? galleries.length,
    words: surface.phrasesCount ?? surface.phrases?.length ?? 0,
    events: surface.eventsCount ?? 0,
    ai: surface.insightsCount ?? insights.length,
    comm: surface.commentsCount ?? 0,
  });
  const entity = Number.isInteger(number) ? entityFromNumber(number) : null;
  const leadTopic = topics[0] || null;

  useEffect(() => {
    if (!data?.identity?.nodeId) return;
    const subject = { id: data.identity.nodeId, type: "number", label: String(number), href: `/entity-hub-preview/number/${number}` };
    const selection = { entityId: data.identity.nodeId, entityType: "number", expression: activePhrase || null, method: selectedMethod || null };
    if (!research?.context?.subject) research?.setResearchContext?.({ subject, selection, lens: "number" });
    else research?.updateResearchContext?.({ selection, lens: "number" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.identity?.nodeId, activePhrase, selectedMethod, number]);

  function chooseMethod(group) {
    const phrases = (group.phrases || []).map(phraseOf).filter(Boolean);
    setSelectedMethod(group.method);
    setActivePhrase(current => phrases.includes(current) ? current : (phrases[0] || current));
    setResolverDraft(current => phrases.includes(current) ? current : (phrases[0] || current));
  }

  function resolveInput(e) {
    e?.preventDefault?.();
    const q = String(resolverDraft || "").trim();
    if (!q) return;
    if (/^\d+$/.test(q)) {
      nav(`/entity-hub-preview/number/${Number(q)}`);
      return;
    }
    setActivePhrase(q);
  }

  if (state.loading) return <main style={{ minHeight: "100vh", direction: "rtl", padding: 30, color: P.ink, background: P.pageBg }}>טוען את דף המספר…</main>;
  if (state.error || !data || type !== "number" || !Number.isInteger(number)) return <main style={{ minHeight: "100vh", direction: "rtl", padding: 30, color: P.ink, background: P.pageBg }}>לא ניתן לפתוח את דף המספר כרגע.</main>;

  const frame = { maxWidth: 760, margin: "0 auto" };
  const card = { background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 24, boxShadow: P.mode === "dark" ? "0 18px 55px rgba(0,0,0,.30)" : "0 14px 40px rgba(80,60,10,.10)" };
  const softBtn = { border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, borderRadius: 999, padding: "9px 14px", fontFamily: F.heading, fontWeight: 750, cursor: "pointer" };
  const sectionBg = P.mode === "dark" ? "radial-gradient(circle at 50% 8%, rgba(80,54,115,.16), transparent 30%), linear-gradient(180deg,#080612,#0b0713 60%,#09060e)" : P.pageBg;

  return <main style={{ minHeight: "100vh", direction: "rtl", padding: "20px 12px 100px", color: P.ink, background: sectionBg }}>
    <div style={frame}>
      <section style={{ ...card, padding: "18px 15px 22px", overflow: "hidden" }}>
        <form onSubmit={resolveInput} style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: 16 }}>
          <input value={resolverDraft} onChange={e => setResolverDraft(e.target.value)} placeholder="חפשו שם · מילה · מספר…" style={{ minWidth: 0, flex: 1, border: `1px solid ${P.borderStrong}`, background: P.cardSoft, color: P.ink, borderRadius: 999, padding: "11px 16px", fontFamily: F.body, fontSize: 14, outline: "none" }} />
          <button type="submit" style={{ border: 0, background: P.accentBtn, color: P.onAccent, borderRadius: 999, padding: "0 18px", fontFamily: F.heading, fontWeight: 850, cursor: "pointer" }}>✦ חפש</button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ display: "flex", border: `1px solid ${P.border}`, borderRadius: 999, padding: 3, background: P.cardSoft }}>
            <button onClick={() => setMode("simple")} style={{ border: 0, borderRadius: 999, padding: "7px 14px", cursor: "pointer", background: mode === "simple" ? P.accentBtn : "transparent", color: mode === "simple" ? P.onAccent : P.inkSoft, fontFamily: F.heading, fontWeight: 800 }}>👁 פשוט</button>
            <button onClick={() => setMode("research")} style={{ border: 0, borderRadius: 999, padding: "7px 14px", cursor: "pointer", background: mode === "research" ? P.accentBtn : "transparent", color: mode === "research" ? P.onAccent : P.inkSoft, fontFamily: F.heading, fontWeight: 800 }}>🔬 מחקר</button>
          </div>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>דף המספר · 2029</div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>דף הביטוי</div>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,7vw,44px)", fontWeight: 850, lineHeight: 1.2, marginTop: 10 }}>{activePhrase || anchorPhrase || number}</div>
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(62px,17vw,100px)", letterSpacing: 10, lineHeight: 1.05, marginTop: 6 }}>{number}</div>
          <div style={{ display: "inline-flex", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.accentText, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginTop: 8 }}>{activeResult != null ? `${methodLabel(selectedGroup)} · ${activeResult}` : "ביטוי חי"}</div>

          <div style={{ display: "grid", placeItems: "center", marginTop: 14 }}><PulseRing value={pulse} size={116} core={false} /></div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 15 }}>
            <SignalChip P={P} icon="👁" value={metrics.views} label="צפיות" />
            <SignalChip P={P} icon="🔎" value={metrics.searches} label="חיפושים" />
            <SignalChip P={P} icon="🔗" value={relations.length} label="חיבורים" />
            <SignalChip P={P} icon="🧮" value={families.length} label="שיטות" />
          </div>

          <div style={{ marginTop: 18, color: P.accentText, fontFamily: F.body, fontSize: 16, lineHeight: 1.75 }}>
            <div>✦ {anchorPhrase ? `נוגע ב-${number} — ${anchorPhrase}` : `מרכז המספר ${number}`}</div>
            {anchor?.hint && <div>✦ {short(anchor.hint, 125)}</div>}
            {!anchor?.hint && leadTopic?.title && <div>✦ התכנסות מובילה: {leadTopic.title}</div>}
          </div>

          <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <WatchButton topic={`number:${number}`} source="g3_golden_number_hub_2029" compact ghost label={`עקוב אחרי ${number}`} />
            <button onClick={() => nav(`/research?tool=gematria&q=${encodeURIComponent(activePhrase || String(number))}`)} style={softBtn}>🧮 מחשבון גימטריה</button>
          </div>
          {entity && <QuickActions entity={entity} hideAnalyze style={{ "--acc": P.accent, "--onAcc": P.onAccent, "--line": P.border, "--card": P.cardSoft, "--ink": P.ink, "--ink2": P.inkSoft, "--accS": P.glow }} />}
        </div>

        {mode === "research" && <>
          <div style={{ marginTop: 20, borderTop: `1px solid ${P.border}`, paddingTop: 17 }}>
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 16, fontWeight: 850 }}>שיטות</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5 }}>השיטה היא עדשה. המספר נשאר ה-Root עד שאתה פותח Root אחר במפורש.</div>
              </div>
              {selectedGroup && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 11 }}>{methodLabel(selectedGroup)}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 7, scrollbarWidth: "thin" }}>
              {families.map(group => {
                const active = group.method === selectedGroup?.method;
                return <button key={group.method} onClick={() => chooseMethod(group)} style={{ flex: "0 0 auto", cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`, background: active ? P.accentBtn : P.cardSoft, color: active ? P.onAccent : P.ink, borderRadius: 999, padding: "9px 14px", fontFamily: F.heading, fontWeight: 800, whiteSpace: "nowrap" }}>{methodLabel(group)} <span style={{ opacity: .7, fontSize: 10 }}>· {group.count ?? group.phrases?.length ?? 0}</span></button>;
              })}
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
              {selectedPhrases.map(phrase => <button key={phrase} onClick={() => { setActivePhrase(phrase); setResolverDraft(phrase); }} style={{ cursor: "pointer", border: `1px solid ${phrase === activePhrase ? P.accent : P.border}`, background: phrase === activePhrase ? P.glow : P.cardSoft, color: P.ink, borderRadius: 999, padding: "6px 10px", fontFamily: F.body, fontSize: 12 }}>{phrase}</button>)}
            </div>
          </div>

          <div style={{ marginTop: 13 }}><ActiveTrace P={P} group={selectedGroup} phrase={activePhrase} onFinding={setCalcFinding} /></div>

          {anchor && <div style={{ marginTop: 13, border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 15, padding: 12 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>עוגן המחקר הנוכחי</div>
            <div style={{ color: P.accentText, fontFamily: F.body, fontWeight: 800, fontSize: 14, marginTop: 4 }}>{anchor.fact || number}</div>
            {anchor.hint && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.65, marginTop: 5 }}>{anchor.hint}</div>}
          </div>}

          {zeroChain.length > 1 && <div style={{ marginTop: 13, border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 15, padding: 12 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>Zero Scale · אותו שורש, סדר גודל אחר</div>
            <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 8, paddingBottom: 3 }}>
              {zeroChain.map(n => <button key={n} onClick={() => nav(`/entity-hub-preview/number/${n}`)} style={{ ...softBtn, flex: "0 0 auto", padding: "7px 12px", fontFamily: F.mono }}>{n}</button>)}
            </div>
          </div>}

          {leadTopic && <div style={{ marginTop: 13, border: `1px solid ${P.borderStrong}`, background: P.cardSoft, borderRadius: 15, padding: 12 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>התכנסות מובילה</div>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 850, fontSize: 15, marginTop: 4 }}>{leadTopic.title}</div>
            {leadTopic.subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>{leadTopic.subtitle}</div>}
            <button onClick={() => nav(`/topic/${encodeURIComponent(leadTopic.slug)}`)} style={{ ...softBtn, marginTop: 8 }}>פתח התכנסות ←</button>
          </div>}

          <div style={{ marginTop: 14 }}>
            <AskRaziel
              subject={`${activePhrase || number} · ${methodLabel(selectedGroup)} · Root ${number}`}
              facts={calcFinding?.evidence?.facts || []}
              context={`Root number ${number}; active expression ${activePhrase || "—"}; selected method ${methodLabel(selectedGroup)}.`}
              advanced
              surface="number_page"
              surfaceContext={{
                number,
                visibleFacts: activeResult != null ? [{ label: activePhrase, value: activeResult, method: methodLabel(selectedGroup) }] : [],
                visibleMatches: selectedPhrases.slice(0, 8),
                visibleConvergences: topics.slice(0, 5).map(t => t.title),
              }}
              title="רזיאל · חוקר איתך"
              subtitle="אותו מספר, אותו ביטוי, אותה שיטה — עובדות מהמנוע ואז פרשנות"
              greeting={`אני רואה עכשיו את ${activePhrase || number} דרך ${methodLabel(selectedGroup)} בתוך עולם ${number}. אפשר להסביר למה זה מעניין, להשוות שיטות או להציע את הצעד הבא במחקר.`}
              cta={false}
            />
          </div>
        </>}
      </section>

      <Section P={P} eyebrow="1 · CONVERGENCE" title="התכנסויות והצלבות" subtitle="היהלום נשאר למעלה. כאן נפתח אותו לעומק בלי לשנות את האמת שמתחת.">
        {leadTopic ? <div style={{ border: `1px solid ${P.borderStrong}`, background: P.cardSoft, borderRadius: 15, padding: 13, marginBottom: 12 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 850 }}>{leadTopic.title}</div>
          {leadTopic.subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, marginTop: 4 }}>{leadTopic.subtitle}</div>}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
            <button onClick={() => nav(`/topic/${encodeURIComponent(leadTopic.slug)}`)} style={softBtn}>Explain Why / פתח</button>
            <WatchButton topic={`topic:${leadTopic.slug}`} source="number_hub_convergence" compact ghost label="עקוב" />
          </div>
        </div> : <EmptyNote P={P}>אין כרגע התכנסות מאושרת להצגה.</EmptyNote>}
        {topics.length > 1 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>{topics.slice(1, 7).map(t => <button key={t.slug} onClick={() => nav(`/topic/${encodeURIComponent(t.slug)}`)} style={{ ...softBtn, padding: "6px 10px", fontSize: 11.5 }}>◎ {t.title}</button>)}</div>}
        <NumberDNA value={number} />
      </Section>

      {neighbors.length > 0 && <Section P={P} eyebrow="2 · PATHS" title="מספרים קשורים ונתיבים" subtitle="לא 'מספרים דומים' — יעדים שיש אליהם דרך חיה במערכת.">
        <div style={{ display: "grid", gap: 9 }}>
          {neighbors.slice(0, 8).map((n, i) => {
            const target = Number(n.value ?? n.number ?? n.target ?? 0);
            const viaTopic = Number(n.viaTopic ?? n.via_topic ?? 0);
            const viaImage = Number(n.viaImage ?? n.via_image ?? 0);
            const relation = viaTopic > 0 ? "Research Relation · נושא משותף" : viaImage > 0 ? "Media Relation · מקור חזותי" : "Graph Relation";
            return <div key={`${target}-${i}`} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 14, padding: 11 }}>
              <button onClick={() => target && nav(`/entity-hub-preview/number/${target}`)} style={{ border: 0, background: "transparent", color: P.heroNum, fontFamily: F.mono, fontSize: 24, fontWeight: 850, cursor: target ? "pointer" : "default" }}>{target || "—"}</button>
              <div style={{ flex: 1, color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>{relation}</div>
              {target ? <button onClick={() => nav(`/entity-hub-preview/number/${target}`)} style={{ ...softBtn, padding: "6px 10px" }}>פתח ←</button> : null}
            </div>;
          })}
        </div>
      </Section>}

      {worlds.length > 0 && <Section P={P} eyebrow="3 · WORLDS / MEANING" title="עולמות · מושגים · משמעות" subtitle="המשמעות היא רשת עם מקור והקשר — לא הגדרה אחת קשיחה.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {worlds.slice(0, 14).map((w, i) => {
            const label = w.world || w.label || w.name || w.title || `עולם ${i + 1}`;
            const count = w.count ?? w.total ?? null;
            return <div key={`${label}-${i}`} style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 999, padding: "7px 12px", color: P.accentText, fontFamily: F.body, fontSize: 12.5 }}>{label}{count != null ? ` · ${count}` : ""}</div>;
          })}
        </div>
      </Section>}

      {sources.length > 0 && <Section P={P} eyebrow="4 · SOURCES" title="מקורות · ספרים · פסוקים" subtitle="מקור, לוקייטור וממצא נשארים נפרדים. אין רשימת ספרים קשיחה בתוך הדף.">
        <div style={{ display: "grid", gap: 8 }}>
          {sources.slice(0, 12).map((s, i) => <div key={`${s.ref || s.label}-${i}`} style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 13, padding: 11 }}>
            <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 13, fontWeight: 800 }}>{s.label || s.ref || "מקור"}</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, marginTop: 3 }}>{[s.type, s.ref].filter(Boolean).join(" · ")}</div>
          </div>)}
        </div>
      </Section>}

      {(researchRows.length > 0 || insights.length > 0) && <Section P={P} eyebrow="LIVING RESEARCH" title="ממצאים ומחקר חי" subtitle="מה נמצא, מה עדיין מועמד, ומה השתנה — בלי לקדם אוטומטית לקנון.">
        <div style={{ display: "grid", gap: 9 }}>
          {researchRows.slice(0, 7).map((r, i) => <div key={r.id || i} style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 13, padding: 11 }}>
            <div style={{ color: P.accentText, fontFamily: F.body, fontWeight: 800, fontSize: 13 }}>{short(r.statement || r.kind || "ממצא מחקרי", 160)}</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, marginTop: 4 }}>{[r.kind, r.status, r.privacy_scope].filter(Boolean).join(" · ")}</div>
          </div>)}
          {insights.slice(0, 4).map((x, i) => <div key={x.id || `ins-${i}`} style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 13, padding: 11 }}>
            <div style={{ color: P.accentText, fontFamily: F.body, fontWeight: 800, fontSize: 13 }}>{short(x.title || x.insight || x.text || "תובנה", 160)}</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, marginTop: 4 }}>Insight · projection</div>
          </div>)}
        </div>
      </Section>}

      {timeline.length > 0 && <Section P={P} eyebrow="TIME / REALITY" title="זמן · מציאות · מה השתנה" subtitle="ציר הזמן הוא הקשר למחקר, לא הוכחה בפני עצמו.">
        <div style={{ display: "grid", gap: 8 }}>
          {timeline.slice(-8).reverse().map((t, i) => <div key={`${t.id || t.label}-${i}`} style={{ display: "grid", gridTemplateColumns: "minmax(90px,auto) 1fr", gap: 10, borderBottom: i < Math.min(7, timeline.length - 1) ? `1px solid ${P.border}` : "none", paddingBottom: 8 }}>
            <div style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 10.5 }}>{t.at ? new Date(t.at).toLocaleDateString("he-IL") : "—"}</div>
            <div style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5 }}>{t.label || t.kind || "עדכון"}</div>
          </div>)}
        </div>
      </Section>}

      {(galleries.length > 0 || posts.length > 0) && <Section P={P} eyebrow="MEDIA / HISTORY" title="מדיה · פוסטים · היסטוריה" subtitle="ייצוגים של אותו מחקר — לא Truth Store נוסף.">
        {galleries.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 12 }}>
          {galleries.slice(0, 6).map(g => <a key={g.id} href={g.image_url || g.thumb_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", aspectRatio: "1", overflow: "hidden", borderRadius: 11, border: `1px solid ${P.border}`, background: P.cardSoft }}><img src={g.thumb_url || g.image_url} alt={g.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></a>)}
        </div>}
        {posts.length > 0 && <div style={{ display: "grid", gap: 7 }}>{posts.slice(0, 6).map((p, i) => <button key={p.id || p.slug || i} onClick={() => p.slug && nav(`/post/${encodeURIComponent(p.slug)}`)} style={{ textAlign: "right", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, borderRadius: 12, padding: 10, cursor: p.slug ? "pointer" : "default", fontFamily: F.body }}>{short(p.title || p.excerpt || "פוסט", 110)}</button>)}</div>}
      </Section>}

      {ciphers.length > 0 && <Section P={P} eyebrow="TEXT / CIPHER / ELS" title="צפנים · ELS · טקסט" subtitle="אותו מנוע ELS קנוני; כאן רק הקרנה של תוצאות שמקושרות למספר.">
        <div style={{ display: "grid", gap: 8 }}>
          {ciphers.slice(0, 8).map((c, i) => <button key={c.id || c.slug || i} onClick={() => c.slug && nav(`/codes/${encodeURIComponent(c.slug)}`)} style={{ textAlign: "right", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, borderRadius: 13, padding: 11, cursor: c.slug ? "pointer" : "default" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>{c.title || c.term || c.slug || "צופן"}</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, marginTop: 3 }}>{[c.primary_number != null ? `מספר ${c.primary_number}` : null, c.skip_distance != null ? `דילוג ${c.skip_distance}` : null].filter(Boolean).join(" · ")}</div>
          </button>)}
        </div>
      </Section>}

      {journey && <Section P={P} eyebrow="JOURNEY" title="מסע · היכל · המשך מחקר" subtitle="אותו Research Context ממשיך איתך — לא מתחילים מחקר חדש בכל מסך.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => nav("/journey")} style={{ ...softBtn, background: P.accentBtn, color: P.onAccent, borderColor: "transparent" }}>🧭 פתח מסע</button>
          <button onClick={() => nav(`/research?number=${number}`)} style={softBtn}>🏛️ פתח בהיכל</button>
          <button onClick={() => setMode("research")} style={softBtn}>🔮 חזור לרזיאל</button>
        </div>
        {Array.isArray(journey.branches) && journey.branches.length > 0 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>{journey.branches.slice(0, 8).map((b, i) => <span key={i} style={{ border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 999, padding: "5px 9px", color: P.inkSoft, fontFamily: F.body, fontSize: 11 }}>{typeof b === "string" ? b : (b.label || b.title || b.type || "ענף")}</span>)}</div>}
      </Section>}

      <Section P={P} eyebrow="COMMUNITY" title="דיון ומחקר משותף" subtitle="קהילה יכולה להוסיף חומר ודיון — לא להחליף אמת קנונית.">
        <Discourse target={{ type: "number", id: String(number) }} origin="number" archive={surface.comments || []} />
      </Section>
    </div>
  </main>;
}
