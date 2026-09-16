import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { numberAnchorToUniversalFinding } from "../lib/research/numberAnchorFinding.js";
import { entityFromNumber } from "../lib/research/entity.js";
import PulseRing, { pulseFromCounts } from "../components/PulseRing.jsx";
import QuickActions from "../components/QuickActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import AskRaziel from "../components/AskRaziel.jsx";
import ConvergenceMeter from "../components/ConvergenceMeter.jsx";
import NumberDNA from "../components/NumberDNA.jsx";

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function cleanAnchorPhrase(fact, number) {
  const text = String(fact || "").trim();
  if (!text) return "";
  const rhs = text.split("=").slice(1).join("=").trim();
  if (!rhs) return "";
  return rhs
    .replace(new RegExp(`^${number}\\s*`), "")
    .replace(/\([^)]*\)\s*$/, "")
    .trim();
}

function short(text, max = 110) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max).trim()}…` : s;
}

function methodLabel(group) {
  return group?.registry?.display_label || group?.method || "שיטה";
}

function MethodTraceMini({ methodKey, phrase, P }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, finding: null, error: null });

  useEffect(() => {
    setOpen(false);
    setState({ loading: false, finding: null, error: null });
  }, [methodKey, phrase]);

  async function load() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (state.finding || state.error || state.loading || !methodKey || !phrase) return;
    setState({ loading: true, finding: null, error: null });
    try {
      const finding = await fetchGematriaMethodTrace(methodKey, phrase);
      setState({ loading: false, finding, error: null });
    } catch (error) {
      setState({ loading: false, finding: null, error });
    }
  }

  const trace = state.finding?.projection?.dimensions?.trace || null;
  const value = state.finding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];

  return <div style={{ marginTop: 10 }}>
    <button onClick={load} style={{ cursor: "pointer", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.accentText, borderRadius: 999, padding: "7px 13px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5 }}>
      {open ? "סגור חישוב" : "איך מחשבים?"}
    </button>
    {open && <div style={{ marginTop: 9, border: `1px solid ${P.border}`, background: P.cardSoft, borderRadius: 12, padding: 11, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
      {state.loading && "טוען את החישוב מהמנוע…"}
      {state.error && "החישוב המפורט לא זמין כרגע."}
      {!state.loading && !state.error && state.finding && <>
        <div><b style={{ color: P.accentText }}>{phrase}</b> · {methodKey}{value != null ? ` = ${value}` : ""}</div>
        {steps.length > 0 && <div style={{ marginTop: 5 }}>{short(steps.map(s => typeof s === "string" ? s : (s.word || s.label || s.step || "")).filter(Boolean).join(" · "), 180)}</div>}
        <div style={{ marginTop: 5, fontSize: 11, color: P.accentDim }}>החישוב מגיע מהמנוע הקנוני. רזיאל מפרש אותו — לא מחשב אותו מחדש.</div>
      </>}
    </div>}
  </div>;
}

export default function NumberHubOpening2029() {
  const { type, key } = useParams();
  const nav = useNavigate();
  const P = usePalette();
  const number = Number(key);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [anchorFinding, setAnchorFinding] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [activePhrase, setActivePhrase] = useState("");

  useEffect(() => {
    let live = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type, key, relationLimit: 120, researchLimit: 60, topicLimit: 16 })
      .then(data => live && setState({ loading: false, data, error: null }))
      .catch(error => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
  }, [type, key]);

  useEffect(() => {
    let live = true;
    if (!Number.isInteger(number)) { setAnchorFinding(null); return undefined; }
    supabase.from("number_anchors")
      .select("value,category,fact,hint,created_at,updated_at")
      .eq("value", number)
      .maybeSingle()
      .then(({ data }) => { if (live) setAnchorFinding(numberAnchorToUniversalFinding(data)); })
      .catch(() => live && setAnchorFinding(null));
    return () => { live = false; };
  }, [number]);

  const data = state.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const surface = data?.surface || {};
  const graphRelations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const anchor = anchorFinding?.projection?.dimensions?.legacyNumberAnchor || null;
  const anchorPhrase = cleanAnchorPhrase(anchor?.fact, number);

  useEffect(() => {
    if (!families.length) return;
    const withAnchor = anchorPhrase
      ? families.find(group => (group.phrases || []).some(item => phraseOf(item) === anchorPhrase))
      : null;
    const preferred = withAnchor || families.find(group => group.method === "רגיל") || families[0];
    const phrase = anchorPhrase && (preferred?.phrases || []).some(item => phraseOf(item) === anchorPhrase)
      ? anchorPhrase
      : phraseOf(preferred?.phrases?.[0]);
    setSelectedMethod(preferred?.method || "");
    setActivePhrase(phrase || anchorPhrase || String(number));
  }, [families, anchorPhrase, number]);

  const selectedGroup = useMemo(
    () => families.find(group => group.method === selectedMethod) || families[0] || null,
    [families, selectedMethod],
  );

  const selectedPhrases = (selectedGroup?.phrases || []).map(phraseOf).filter(Boolean).slice(0, 12);
  const pulse = pulseFromCounts({
    posts: surface.postsCount ?? surface.posts?.length ?? 0,
    galleries: surface.galleriesCount ?? surface.galleries?.length ?? 0,
    words: surface.phrasesCount ?? surface.phrases?.length ?? 0,
    events: surface.eventsCount ?? 0,
    ai: surface.insightsCount ?? surface.insights?.length ?? 0,
    comm: surface.commentsCount ?? 0,
  });
  const entity = Number.isInteger(number) ? entityFromNumber(number) : null;
  const leadTopic = topics[0] || null;
  const factLine = anchorPhrase ? `✦ נוגע ב-${number} — ${anchorPhrase}` : `✦ מרכז המספר ${number}`;
  const hintLine = anchor?.hint ? `✦ ${short(anchor.hint, 105)}` : leadTopic?.title ? `✦ התכנסות מובילה: ${leadTopic.title}` : null;

  function chooseMethod(group) {
    const nextMethod = group.method;
    const phrases = (group.phrases || []).map(phraseOf).filter(Boolean);
    setSelectedMethod(nextMethod);
    setActivePhrase(current => phrases.includes(current) ? current : (phrases[0] || current));
  }

  if (state.loading) return <main style={{ minHeight: "100vh", direction: "rtl", padding: 30, color: P.ink, background: P.pageBg }}>טוען את דף המספר…</main>;
  if (state.error || !data || type !== "number" || !Number.isInteger(number)) return <main style={{ minHeight: "100vh", direction: "rtl", padding: 30, color: P.ink, background: P.pageBg }}>לא ניתן לפתוח את דף המספר כרגע.</main>;

  const frame = { maxWidth: 720, margin: "0 auto" };
  const card = { background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 22, boxShadow: P.mode === "dark" ? "0 18px 55px rgba(0,0,0,.30)" : "0 14px 40px rgba(80,60,10,.10)" };
  const softBtn = { border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, borderRadius: 999, padding: "9px 14px", fontFamily: F.heading, fontWeight: 750, cursor: "pointer" };

  return <main style={{ minHeight: "100vh", direction: "rtl", padding: "28px 14px 90px", color: P.ink, background: P.mode === "dark" ? "radial-gradient(circle at 50% 10%, rgba(70,45,100,.14), transparent 30%), linear-gradient(180deg,#080612,#0b0713 65%,#09060e)" : P.pageBg }}>
    <div style={frame}>
      <section style={{ ...card, padding: "28px 18px 20px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>דף הביטוי</div>

        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(27px,7vw,42px)", fontWeight: 800, lineHeight: 1.18, minHeight: 45 }}>
          {activePhrase || anchorPhrase || number}
        </div>
        <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(60px,16vw,94px)", letterSpacing: 10, lineHeight: 1.08, marginTop: 6 }}>{number}</div>
        <div style={{ display: "inline-flex", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.accentText, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 750, marginTop: 10 }}>ביטוי חי</div>

        <div style={{ display: "grid", placeItems: "center", marginTop: 14 }}>
          <PulseRing value={pulse} size={112} core={false} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
          <span style={{ ...softBtn, cursor: "default" }}>🔗 {graphRelations.length} חיבורים</span>
          <WatchButton topic={`number:${number}`} source="g3_golden_number_hub_2029" compact ghost label={`עקוב אחרי ${number}`} />
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 8, color: P.accentText, fontFamily: F.body, fontSize: 16, lineHeight: 1.65 }}>
          <div>{factLine}</div>
          {hintLine && <div>{hintLine}</div>}
        </div>

        {entity && <QuickActions entity={entity} hideAnalyze style={{ "--acc": P.accent, "--onAcc": P.onAccent, "--line": P.border, "--card": P.cardSoft, "--ink": P.ink, "--ink2": P.inkSoft, "--accS": P.glow }} />}
      </section>

      <section style={{ ...card, marginTop: 16, padding: "16px 14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 16 }}>שיטות</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, marginTop: 2 }}>בחר שיטה — הביטוי הפעיל ורזיאל עוברים איתך באותו הקשר.</div>
          </div>
          <button onClick={() => nav(`/research?tool=gematria&q=${encodeURIComponent(activePhrase || String(number))}`)} style={softBtn}>🧮 מחשבון</button>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "thin" }}>
          {families.map(group => {
            const active = group.method === selectedGroup?.method;
            return <button key={group.method} onClick={() => chooseMethod(group)} style={{ flex: "0 0 auto", cursor: "pointer", border: `1px solid ${active ? P.accent : P.border}`, background: active ? P.accentBtn : P.cardSoft, color: active ? P.onAccent : P.ink, borderRadius: 999, padding: "9px 14px", fontFamily: F.heading, fontWeight: 800, whiteSpace: "nowrap" }}>
              {methodLabel(group)} <span style={{ opacity: .72, fontSize: 10 }}>· {group.count ?? group.phrases?.length ?? 0}</span>
            </button>;
          })}
        </div>

        <div style={{ marginTop: 12, borderTop: `1px solid ${P.border}`, paddingTop: 12 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 1.4, marginBottom: 7 }}>{methodLabel(selectedGroup)} · ביטויים שמגיעים ל-{number}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {selectedPhrases.map(phrase => <button key={phrase} onClick={() => setActivePhrase(phrase)} style={{ cursor: "pointer", border: `1px solid ${phrase === activePhrase ? P.accent : P.border}`, background: phrase === activePhrase ? P.glow : P.cardSoft, color: phrase === activePhrase ? P.accentText : P.ink, borderRadius: 999, padding: "6px 11px", fontFamily: F.body, fontSize: 12.5 }}>{phrase}</button>)}
          </div>
          <MethodTraceMini methodKey={selectedGroup?.registry?.method_key || selectedGroup?.method} phrase={activePhrase} P={P} />
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <AskRaziel
          subject={`${activePhrase || number} · ${methodLabel(selectedGroup)} · ${number}`}
          facts={[
            `${activePhrase || number} · ${methodLabel(selectedGroup)} = ${number}`,
            anchor?.fact || null,
            leadTopic?.title ? `התכנסות מובילה: ${leadTopic.title}` : null,
          ].filter(Boolean)}
          context={`דף המספר ${number}. הביטוי הפעיל: ${activePhrase || "—"}. השיטה הפעילה: ${methodLabel(selectedGroup)}. פרש את החיבורים והצע צעד מחקרי הבא בלי לחשב גימטריה מחדש.`}
          greeting={`רזיאל רואה כרגע את ${number}, את הביטוי «${activePhrase || ""}» ואת שיטת ${methodLabel(selectedGroup)}.`}
          title="רזיאל · מחקר המספר"
          subtitle="אותו רזיאל · העובדות מהמנוע, הפרשנות ממנו"
          palette={P}
          metatron
          cta={false}
        />
      </section>

      <section style={{ ...card, overflow: "hidden", marginTop: 16 }}>
        <ConvergenceMeter value={number} />
        <NumberDNA value={number} />
      </section>
    </div>
  </main>;
}
