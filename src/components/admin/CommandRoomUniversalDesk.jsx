import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getChannelUpdates, supabase } from "../../lib/supabase.js";
import { analyzeFull } from "../../lib/analysisFlow.js";
import { analyzeTime } from "../../lib/timeFlow.js";
import { fetchCanonicalGematriaFindings } from "../../lib/research/canonicalGematria.js";
import { searchResearchViewerGraphEntities } from "../../lib/research/researchViewerProjection.js";
import {
  buildUniversalDecomposition,
  collectSubjectCandidates,
} from "../../lib/research/universalDecomposer.js";
import {
  getAiDepthProfile,
  runRoutedAiAnalysis,
} from "../../lib/research/aiDepthRouter.js";
import "./CommandRoomUniversalDesk.css";

const CHANNELS = [
  ["torat-haremez", "תורת הרמז", "📜"],
  ["gilui-yomi", "הגילוי היומי", "✨"],
  ["or-geula", "אור הגאולה", "🔥"],
  ["sfot-vheker", "שפות וחקר מציאות", "🌍"],
];
const LABEL = Object.fromEntries(CHANNELS.map(([key, label]) => [key, label]));
const ICON = Object.fromEntries(CHANNELS.map(([key, , icon]) => [key, icon]));

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function ageLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "אתמול" : `לפני ${days} ימים`;
}

function short(value, length = 142) {
  const text = stripHtml(value);
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

function normalizeMessage(row) {
  return {
    id: row.id,
    sourceRef: `channel_updates:${row.id}`,
    channel: row.channel,
    channelLabel: LABEL[row.channel] || row.channel || "ערוץ",
    icon: ICON[row.channel] || "📡",
    contributor: row.credit || "מקור לא מזוהה",
    text: stripHtml(row.text),
    occurredAt: row.created_at,
    image: row.image_url || row.thumb_url || null,
    source: row.source || null,
  };
}

async function invokeExpressionBoundary(text) {
  try {
    const { data, error } = await supabase.functions.invoke("expression-extract", { body: { text } });
    if (error) return { status: "unavailable", candidates: [], compound_claims: [], error: error.message };
    return data || { status: "ok", candidates: [], compound_claims: [] };
  } catch (error) {
    return { status: "unavailable", candidates: [], compound_claims: [], error: error?.message || "expression-extract failed" };
  }
}

async function fetchMethodLabels() {
  const { data, error } = await supabase
    .from("gematria_methods")
    .select("method_key,display_label,db_column")
    .eq("active", true)
    .eq("in_engine", true);
  if (error) return {};
  const labels = {};
  for (const row of data || []) {
    if (row.method_key) labels[row.method_key] = row.display_label || row.method_key;
    if (row.db_column) labels[row.db_column] = row.display_label || row.method_key || row.db_column;
  }
  return labels;
}

async function fetchGraphMatches(subjects) {
  const pairs = await Promise.all(subjects.slice(0, 10).map(async (s) => {
    try {
      const rows = await searchResearchViewerGraphEntities(s.text, { limit: 5 });
      const exact = (rows || []).filter((r) => String(r?.label || "").trim() === s.text);
      return [s.text, exact.length ? exact : (rows || []).slice(0, 2)];
    } catch {
      return [s.text, []];
    }
  }));
  return Object.fromEntries(pairs);
}

async function fetchResearchMatches(subjects) {
  const pairs = await Promise.all(subjects.slice(0, 9).map(async (s) => {
    const term = String(s.text || "").replace(/[%_]/g, "").trim();
    if (term.length < 2) return [s.text, []];
    try {
      const { data, error } = await supabase
        .from("research_objects")
        .select("id,kind,statement,source,source_ref,status,engine_verified,created_at")
        .ilike("statement", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) return [s.text, []];
      return [s.text, data || []];
    } catch {
      return [s.text, []];
    }
  }));
  return Object.fromEntries(pairs);
}

function gematriaEligible(subject) {
  const s = String(subject || "").replace(/[״׳"']/g, "").trim();
  return s.length >= 1 && s.length <= 42 && /^[א-ת\- ]+$/.test(s);
}

async function fetchCanonicalGematriaForSubjects(subjects) {
  const chosen = subjects.filter((s) => gematriaEligible(s.text)).slice(0, 8);
  const batches = await Promise.all(chosen.map(async (s) => {
    try {
      return await fetchCanonicalGematriaFindings(s.text);
    } catch {
      return [];
    }
  }));
  return batches.flat();
}

function factsForAi({ item, preliminary, methodLabels }) {
  const calc = (preliminary.calculations || []).slice(0, 28).map((c) =>
    `${c.subject} = ${c.value} (${methodLabels[c.method] || c.method})`
  );
  const rel = (preliminary.claims?.sourceRelations || []).slice(0, 12).map((r) =>
    `${r.left} ↔ ${r.right} [טענת מקור; ${r.cue}]`
  );
  const refs = (preliminary.extracted?.sourceReferences || []).slice(0, 8).map((r) =>
    `${r.raw} [מראה-מקום מהמקור; לא אומת כאן]`
  );
  const graph = (preliminary.identityResolution?.graphMatches || []).slice(0, 12).map((g) =>
    `${g.term} → node:${g.nodeType}:${g.label}`
  );
  const prior = (preliminary.identityResolution?.existingResearchObjects || []).slice(0, 8).map((r) =>
    `${r.statement} [Research Object קיים · ${r.status}]`
  );
  return [
    `SOURCE ARTIFACT — ${item.channelLabel}, מאת ${item.contributor}: ${item.text.slice(0, 3200)}`,
    calc.length ? `CALCULATIONS FROM CANONICAL ENGINE ONLY: ${calc.join(" · ")}` : "CALCULATIONS: none supplied.",
    rel.length ? `SOURCE CLAIM RELATIONS (not facts): ${rel.join(" · ")}` : "SOURCE CLAIM RELATIONS: none extracted.",
    refs.length ? `SOURCE REFERENCES: ${refs.join(" · ")}` : "SOURCE REFERENCES: none extracted.",
    graph.length ? `EXISTING GRAPH IDENTITIES: ${graph.join(" · ")}` : "EXISTING GRAPH IDENTITIES: none resolved.",
    prior.length ? `EXISTING RESEARCH OBJECTS: ${prior.join(" · ")}` : "EXISTING RESEARCH OBJECTS: none matched.",
    "הפרד במפורש בין מה שהמקור טוען, מה שהמנוע אימת, מה שכבר קיים במערכת, ומה שהוא פרשנות/השערה. אל תחשב ערכים חדשים ואל תמציא מקורות.",
  ].join("\n");
}

async function runDeterministicAnalysis(item) {
  const text = item.text || "";
  const analysis = analyzeFull(text, { writerName: item.contributor });
  const time = analyzeTime(text, { sourceDate: item.occurredAt });
  const expressionBoundary = await invokeExpressionBoundary(text);
  const subjects = collectSubjectCandidates({ text, analysis });

  const [graphMatches, researchMatches, canonicalGematriaFindings, methodLabels] = await Promise.all([
    fetchGraphMatches(subjects),
    fetchResearchMatches(subjects),
    fetchCanonicalGematriaForSubjects(subjects),
    fetchMethodLabels(),
  ]);

  const source = {
    kind: "message",
    sourceRef: item.sourceRef,
    title: `${item.channelLabel} · ${item.contributor}`,
    contributor: item.contributor,
    occurredAt: item.occurredAt,
    channel: item.channel,
  };

  const rebuildArgs = {
    source,
    text,
    analysis,
    expressionBoundary,
    canonicalGematriaFindings,
    graphMatches,
    researchMatches,
    time,
  };

  return {
    decomposition: buildUniversalDecomposition(rebuildArgs),
    methodLabels,
    expressionBoundary,
    rebuildArgs,
    aiProfile: getAiDepthProfile("none"),
  };
}

async function addAiInterpretation(item, current, depth) {
  if (!current?.decomposition || !current?.rebuildArgs) return current;
  const routed = await runRoutedAiAnalysis({
    depth,
    kind: "research",
    subject: current.rebuildArgs.source.title,
    facts: factsForAi({ item, preliminary: current.decomposition, methodLabels: current.methodLabels || {} }),
    ref: item.id,
    ref_name: item.channelLabel,
    operation: "universal_decomposition",
  });

  return {
    ...current,
    aiProfile: routed.profile,
    aiError: routed.skipped || routed.analysis ? null : "לא התקבל ניתוח AI",
    decomposition: routed.analysis
      ? buildUniversalDecomposition({ ...current.rebuildArgs, aiInterpretation: routed.analysis })
      : current.decomposition,
  };
}

function Tag({ children, type = "" }) {
  return <span className={`cud-tag ${type}`}>{children}</span>;
}

function Card({ icon, title, count, wide = false, children }) {
  return (
    <section className={`cud-card${wide ? " wide" : ""}`}>
      <div className="cud-card-head"><span>{icon}</span><b>{title}</b>{count != null && <small>{count}</small>}</div>
      {children}
    </section>
  );
}

function QuestionPanel({ number, icon, title, subtitle, tone, count, children, footer }) {
  return (
    <section className={`cud-answer ${tone || ""}`}>
      <div className="cud-answer-head">
        <span className="cud-answer-number">{number}</span>
        <span className="cud-answer-icon">{icon}</span>
        <div><h4>{title}</h4><p>{subtitle}</p></div>
        {count != null && <b className="cud-answer-count">{count}</b>}
      </div>
      <div className="cud-answer-body">{children}</div>
      {footer && <div className="cud-answer-foot">{footer}</div>}
    </section>
  );
}

function groupCalculations(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const list = map.get(row.subject) || [];
    list.push(row);
    map.set(row.subject, list);
  }
  return [...map.entries()];
}

function DecompositionView({ result }) {
  const d = result?.decomposition;
  if (!d) return null;
  const labels = result.methodLabels || {};
  const counts = d.counts || {};
  const calculationGroups = groupCalculations(d.calculations);
  const subjects = d.extracted?.subjects || [];
  const relations = d.claims?.sourceRelations || [];
  const refs = d.extracted?.sourceReferences || [];
  const existing = d.identityResolution?.existingResearchObjects || [];
  const graph = d.identityResolution?.graphMatches || [];
  const unresolved = d.unresolved || [];
  const compound = d.claims?.compoundClaims || [];
  const sourceCount = relations.length + refs.length + compound.length;
  const knownCount = graph.length + existing.length;
  const decisionCount = relations.length + unresolved.length;
  const aiProfile = result.aiProfile || getAiDepthProfile("none");

  return (
    <div className="cud-result">
      <div className="cud-readout">
        <div>
          <span className="cud-eyebrow">תשובת המערכת</span>
          <h3>המקור פורק. עכשיו צריך להבין מה הוא אומר, מה אומת, מה כבר קיים — ומה נשאר אצלך.</h3>
          <p>המסך הזה הוא מפת עבודה בלבד. הוא לא יוצר Node, לא מאשר קשר ולא משנה אמת.</p>
        </div>
        <div className="cud-readout-badges">
          <Tag type="claim">{sourceCount} פריטי מקור</Tag>
          <Tag type="fact">{counts.calculations || 0} תוצאות מנוע</Tag>
          <Tag type="identity">{knownCount} התאמות קיימות</Tag>
          <Tag type="open">{decisionCount} דורשים הכרעה/בדיקה</Tag>
          <Tag type={aiProfile.key === "none" ? "identity" : "claim"}>AI: {aiProfile.label}</Tag>
        </div>
      </div>

      <div className="cud-answers">
        <QuestionPanel
          number="1"
          icon="📜"
          title="מה צבי אומר?"
          subtitle="טענות, מראי־מקום וקשרים שנכתבו במקור — עדיין לא אמת קנונית."
          tone="source"
          count={sourceCount}
          footer="SOURCE CLAIM ≠ FACT · מראה־מקום שנמצא בטקסט ≠ exact-witness verified"
        >
          {refs.slice(0, 6).map((r) => (
            <div className="cud-row" key={`ref-${r.raw}`}>
              <div className="cud-row-main"><b>{r.raw}</b></div>
              <div className="cud-row-meta"><Tag>מראה מקום</Tag><Tag type="open">טרם אומת מול העד בשכבה הזו</Tag></div>
            </div>
          ))}
          {relations.slice(0, 8).map((r, i) => (
            <div className="cud-row" key={`source-rel-${r.left}-${r.right}-${i}`}>
              <div className="cud-row-main"><b>{r.left} ↔ {r.right}</b></div>
              <div className="cud-row-meta"><Tag type="claim">טענת מקור</Tag><Tag>{r.cue}</Tag></div>
            </div>
          ))}
          {compound.slice(0, 4).map((c, i) => (
            <div className="cud-row" key={`source-compound-${i}`}>
              <div className="cud-row-main"><b>{c.raw || c.text || c.expression || "ביטוי מורכב"}</b>{c.result != null && <strong>{c.result}</strong>}</div>
              <div className="cud-row-meta"><Tag type="claim">{c.status || "candidate"}</Tag></div>
            </div>
          ))}
          {!sourceCount && <p className="cud-muted">לא חולצה כרגע טענה או אסמכתה מפורשת מהמקור.</p>}
        </QuestionPanel>

        <QuestionPanel
          number="2"
          icon="🔢"
          title="מה המנועים החזירו?"
          subtitle="תוצאות חישוביות מהמסלול הקנוני. תוצאת מנוע אינה מאשרת אוטומטית את הפרשנות של המקור."
          tone="engine"
          count={calculationGroups.length}
          footer="ENGINE RESULT ≠ SOURCE CLAIM VERIFIED · MATCH מוצג רק כאשר באמת קיים claim שנבדק"
        >
          {calculationGroups.slice(0, 10).map(([subject, rows]) => (
            <div className="cud-row" key={`calc-${subject}`}>
              <div className="cud-row-main"><b>{subject}</b><strong>{rows.find((r) => r.method === "ragil")?.value ?? rows[0]?.value}</strong></div>
              <div className="cud-row-meta">
                {rows.slice(0, 5).map((r) => (
                  <Tag type="fact" key={`${r.method}-${r.value}`}>
                    {labels[r.method] || r.method}={r.value} · {r.verificationState === "match" ? "MATCH" : "ENGINE RESULT"}
                  </Tag>
                ))}
                {rows.length > 5 && <Tag>+{rows.length - 5} שיטות</Tag>}
              </div>
            </div>
          ))}
          {!calculationGroups.length && <p className="cud-muted">לא נמצאו כרגע ביטויים כשירים למסלול גימטריה קנוני.</p>}
        </QuestionPanel>

        <QuestionPanel
          number="3"
          icon="🌳"
          title="מה כבר קיים אצלנו?"
          subtitle="זהויות גרף ו־Research Objects שנמצאו מחדש — המטרה היא לחבר לקיים, לא לשכפל."
          tone="known"
          count={knownCount}
          footer="EXISTING IDENTITY → LINK, DON'T DUPLICATE · Research Object ≠ Node"
        >
          {graph.slice(0, 10).map((g, i) => (
            <div className="cud-row" key={`g-${g.nodeId}-${i}`}>
              <div className="cud-row-main"><b>{g.term}</b><strong>{g.label}</strong></div>
              <div className="cud-row-meta"><Tag type="identity">Node · {g.nodeType}</Tag>{g.identityKey && <Tag>{g.identityKey}</Tag>}</div>
            </div>
          ))}
          {existing.slice(0, 10).map((r, i) => (
            <div className="cud-row" key={`ro-${r.researchObjectId}-${i}`}>
              <div className="cud-row-main"><b>{short(r.statement, 92)}</b></div>
              <div className="cud-row-meta"><Tag type="identity">Research Object</Tag><Tag>{r.status}</Tag>{r.engineVerified && <Tag type="fact">engine verified</Tag>}</div>
            </div>
          ))}
          {!knownCount && <p className="cud-muted">לא נמצאה כרגע חפיפה ישירה לזהות או ממצא קיים.</p>}
        </QuestionPanel>

        <QuestionPanel
          number="4"
          icon="⚖️"
          title="מה מחכה להחלטה שלך?"
          subtitle="קשרים וזהויות שעדיין אינם מוכנים לעץ. כאן המערכת עוצרת ולא מחליטה במקומך."
          tone="decision"
          count={decisionCount}
          footer="אין כאן פעולה אוטומטית · פעולות Human Gate יתחברו רק אחרי write-path audit"
        >
          {relations.slice(0, 8).map((r, i) => (
            <div className="cud-row" key={`decision-rel-${r.left}-${r.right}-${i}`}>
              <div className="cud-row-main"><b>{r.left} ↔ {r.right}</b></div>
              <div className="cud-row-meta"><Tag type="claim">RELATION CANDIDATE</Tag><Tag type="open">דורש Human Gate</Tag></div>
            </div>
          ))}
          {unresolved.slice(0, 10).map((u, i) => (
            <div className="cud-row" key={`unresolved-${u.kind}-${i}`}>
              <div className="cud-row-main"><b>{u.label}</b></div>
              <div className="cud-row-meta"><Tag type="open">OPEN</Tag><Tag>{u.kind}</Tag></div>
              <p className="cud-muted">{u.reason}</p>
            </div>
          ))}
          {!decisionCount && <p className="cud-muted">לא זוהתה כרגע החלטת זהות/יחס שמחכה לשער שלך.</p>}
        </QuestionPanel>
      </div>

      <details className="cud-details">
        <summary>🔬 פתח פירוט מחקרי מלא</summary>
        <div className="cud-grid cud-detail-grid">
          <Card icon="🔤" title="כל המילים, הביטויים והזהויות" count={subjects.length}>
            {subjects.slice(0, 18).map((s) => (
              <div className="cud-row" key={s.text}>
                <div className="cud-row-main"><b>{s.text}</b></div>
                <div className="cud-row-meta">
                  {s.origins.map((o) => <Tag key={o}>{o}</Tag>)}
                  {s.existingGraphIdentity && <Tag type="identity">✓ קיים בעץ</Tag>}
                  {s.existingResearchObject && <Tag type="identity">✓ קיים במחקר</Tag>}
                  {!s.existingGraphIdentity && <Tag type="open">identity unresolved</Tag>}
                </div>
              </div>
            ))}
          </Card>

          <Card icon="🧭" title="תמונת מצב" count={6}>
            <div className="cud-summary cud-summary-inside">
              <div className="cud-stat gold"><b>{counts.subjects || 0}</b><small>נושאים</small></div>
              <div className="cud-stat green"><b>{counts.calculations || 0}</b><small>תוצאות מנוע</small></div>
              <div className="cud-stat orange"><b>{counts.sourceClaims || 0}</b><small>טענות מקור</small></div>
              <div className="cud-stat"><b>{counts.sourceReferences || 0}</b><small>מראי מקום</small></div>
              <div className="cud-stat"><b>{counts.graphMatches || 0}</b><small>זהויות בעץ</small></div>
              <div className="cud-stat"><b>{counts.unresolved || 0}</b><small>פתוח</small></div>
            </div>
          </Card>

          {d.interpretation?.text ? (
            <Card icon="🤖" title={`מבט AI — ${aiProfile.label}`} wide>
              <div className="cud-ai">{d.interpretation.text}</div>
              <div className="cud-row-meta"><Tag type="claim">INTERPRETATION</Tag><Tag type="open">לא Canonical</Tag><Tag>{aiProfile.description}</Tag></div>
            </Card>
          ) : (
            <Card icon="⚙️" title="AI חיצוני לא הופעל" wide>
              <p className="cud-muted">כל המפה שמעל נבנתה מהמנועים, ה־DB וה־Identity Resolution. אפשר לבקש סיכום זול או מחקר עמוק רק אם צריך.</p>
            </Card>
          )}
        </div>
      </details>

      <div className="cud-truthbar">INPUT ≠ EXTRACTION ≠ CALCULATION ≠ CLAIM ≠ EVIDENCE ≠ FACT ≠ INTERPRETATION ≠ CANONICAL ≠ PUBLISHED · המנוע מגלה ומארגן; צוריאל חוקר, מפרש ובוחר.</div>
    </div>
  );
}

export default function CommandRoomUniversalDesk({ onOpenGate, onOpenAdvanced }) {
  const [state, setState] = useState({ loading: true, error: "", rows: [] });
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [runningStage, setRunningStage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const batches = await Promise.all(CHANNELS.map(async ([key]) => {
        const rows = await getChannelUpdates(30, key, true);
        return (rows || []).map(normalizeMessage);
      }));
      const rows = batches.flat().sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));
      setState({ loading: false, error: "", rows });
      setSelectedId((id) => (id && rows.some((r) => r.id === id) ? id : rows[0]?.id || null));
    } catch (e) {
      setState({ loading: false, error: e?.message || "שגיאה בטעינת הקליטה", rows: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.rows.filter((r) =>
      (channel === "all" || r.channel === channel) &&
      (!q || `${r.text} ${r.contributor} ${r.channelLabel}`.toLowerCase().includes(q))
    );
  }, [state.rows, channel, query]);

  useEffect(() => {
    if (filtered.length && !filtered.some((r) => r.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = state.rows.find((r) => r.id === selectedId) || filtered[0] || null;
  const busy = !!runningStage;

  const choose = (item) => {
    setSelectedId(item.id);
    setResult(null);
    setRunningStage("");
    setError("");
  };

  const runDeterministic = useCallback(async () => {
    if (!selected || busy) return;
    setRunningStage("deterministic");
    setError("");
    setResult(null);
    try {
      setResult(await runDeterministicAnalysis(selected));
    } catch (e) {
      setError(e?.message || "הפירוק נכשל");
    } finally {
      setRunningStage("");
    }
  }, [selected, busy]);

  const runAi = useCallback(async (depth) => {
    if (!selected || !result || busy) return;
    setRunningStage(depth);
    setError("");
    try {
      setResult(await addAiInterpretation(selected, result, depth));
    } catch (e) {
      setError(e?.message || "ניתוח ה־AI נכשל");
    } finally {
      setRunningStage("");
    }
  }, [selected, result, busy]);

  const stageCopy = runningStage === "quick"
    ? "Gemini Flash מסכם את מה שכבר נאסף — בלי לחשב מחדש."
    : runningStage === "deep"
      ? "Claude Sonnet מבצע מחקר עמוק על Evidence Pack שכבר נבנה."
      : "Shared Expression Extraction → canonical Gematria → Identity Resolution → Existing Research. בלי AI חיצוני.";

  return (
    <div className="cud" dir="rtl">
      <header className="cud-top">
        <div className="cud-brand"><b>🎛️ חדר המפקדה</b><small>מקור אחד → פירוק → מחקר → Human Gate → עץ</small></div>
        <label className="cud-search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חפש בהודעות…" /></label>
        <button className="cud-pill" onClick={onOpenGate}>⚖️ שולחן צוריאל</button>
        <button className="cud-pill" onClick={onOpenAdvanced}>🧰 מתקדם</button>
      </header>

      <div className="cud-body">
        <aside className="cud-list">
          <div className="cud-list-head">
            <button className={`cud-channel${channel === "all" ? " active" : ""}`} onClick={() => setChannel("all")}>הכול</button>
            {CHANNELS.map(([key, label, icon]) => (
              <button key={key} className={`cud-channel${channel === key ? " active" : ""}`} onClick={() => setChannel(key)}>{icon} {label}</button>
            ))}
          </div>
          <div className="cud-items">
            {state.loading && <div className="cud-loading"><span className="cud-dot" />טוען קליטה חיה…</div>}
            {state.error && <div className="cud-error">{state.error}</div>}
            {!state.loading && filtered.map((item) => (
              <button className={`cud-item${item.id === selected?.id ? " active" : ""}`} key={item.id} onClick={() => choose(item)}>
                <div className="cud-item-top"><b>{item.icon} {item.channelLabel}</b><span>{item.contributor}</span><span style={{ marginInlineStart: "auto" }}>{ageLabel(item.occurredAt)}</span></div>
                <p>{short(item.text)}</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="cud-main">
          {!selected ? <div className="cud-empty"><i>⌁</i><h3>אין הודעה לבחירה</h3></div> : <>
            <section className="cud-source">
              <div>
                <h2>{selected.icon} {selected.channelLabel}</h2>
                <div className="cud-source-meta"><span>מאת {selected.contributor}</span><span>·</span><span>{ageLabel(selected.occurredAt)}</span><span>·</span><span>{selected.sourceRef}</span></div>
                <div className="cud-source-text">{selected.text}</div>
              </div>
              <div>
                <button className="cud-run" onClick={runDeterministic} disabled={busy}>{runningStage === "deterministic" ? "מפרק ומצליב…" : "⚙️ נתח מקור · בלי AI"}</button>
                <div className="cud-actions">
                  <button className="cud-secondary" onClick={() => runAi("quick")} disabled={!result || busy}>✨ סכם בזול · Gemini</button>
                  <button className="cud-secondary" onClick={() => runAi("deep")} disabled={!result || busy}>🧠 מחקר עמוק · Sonnet</button>
                </div>
                <div className="cud-actions"><button className="cud-secondary" onClick={onOpenGate}>שלח לשולחן</button><button className="cud-secondary" onClick={onOpenAdvanced}>פתח מתקדם</button></div>
              </div>
            </section>

            {busy && <div className="cud-empty"><i>{runningStage === "deep" ? "🧠" : runningStage === "quick" ? "✨" : "⚙️"}</i><h3>{runningStage === "deep" ? "מחקר עמוק" : runningStage === "quick" ? "סיכום מהיר" : "בונה מפת פירוק"}</h3><p>{stageCopy}</p><div className="cud-loading" style={{ justifyContent: "center" }}><span className="cud-dot" />עובד על המקור…</div></div>}
            {!busy && !result && <div className="cud-empty"><i>⚙️</i><h3>המקור מוכן לפירוק</h3><p>השלב הראשון משתמש במנועים וב־DB שלנו בלבד — בלי קריאת AI חיצונית. אחרי הפירוק אפשר לבחור סיכום זול או מחקר עמוק.</p><button className="cud-run" onClick={runDeterministic}>⚙️ נתח מקור · בלי AI</button></div>}
            {error && <div className="cud-error">{error}</div>}
            {result && <DecompositionView result={result} />}
          </>}
        </main>
      </div>
    </div>
  );
}
