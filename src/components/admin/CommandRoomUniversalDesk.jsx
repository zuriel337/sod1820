import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getChannelUpdates, getAiAnalysis, supabase } from "../../lib/supabase.js";
import { analyzeFull } from "../../lib/analysisFlow.js";
import { analyzeTime } from "../../lib/timeFlow.js";
import { fetchCanonicalGematriaFindings } from "../../lib/research/canonicalGematria.js";
import { searchResearchViewerGraphEntities } from "../../lib/research/researchViewerProjection.js";
import {
  buildUniversalDecomposition,
  collectSubjectCandidates,
  extractSourceReferences,
  extractSourceRelations,
} from "../../lib/research/universalDecomposer.js";
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
  const refs = (preliminary.extracted?.sourceReferences || []).slice(0, 8).map((r) => `${r.raw} [מראה-מקום מהמקור; לא אומת כאן]`);
  const graph = (preliminary.identityResolution?.graphMatches || []).slice(0, 12).map((g) => `${g.term} → node:${g.nodeType}:${g.label}`);
  const prior = (preliminary.identityResolution?.existingResearchObjects || []).slice(0, 8).map((r) => `${r.statement} [Research Object קיים · ${r.status}]`);
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

async function runUniversalAnalysis(item) {
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

  const preliminary = buildUniversalDecomposition({
    source,
    text,
    analysis,
    expressionBoundary,
    canonicalGematriaFindings,
    graphMatches,
    researchMatches,
    time,
  });

  let aiInterpretation = null;
  try {
    aiInterpretation = await getAiAnalysis({
      kind: "research",
      subject: source.title,
      facts: factsForAi({ item, preliminary, methodLabels }),
      fast: false,
      ref: item.id,
      ref_name: item.channelLabel,
      operation: "universal_decomposition",
    });
  } catch {
    aiInterpretation = null;
  }

  const decomposition = buildUniversalDecomposition({
    source,
    text,
    analysis,
    expressionBoundary,
    canonicalGematriaFindings,
    graphMatches,
    researchMatches,
    time,
    aiInterpretation,
  });

  return { decomposition, methodLabels, expressionBoundary };
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

  return (
    <div className="cud-result">
      <div className="cud-summary">
        <div className="cud-stat gold"><b>{counts.subjects || 0}</b><small>מילים / נושאים</small></div>
        <div className="cud-stat green"><b>{counts.calculations || 0}</b><small>תוצאות מנוע</small></div>
        <div className="cud-stat orange"><b>{counts.sourceClaims || 0}</b><small>טענות מקור</small></div>
        <div className="cud-stat"><b>{counts.sourceReferences || 0}</b><small>מראי מקום</small></div>
        <div className="cud-stat"><b>{counts.graphMatches || 0}</b><small>זהויות בעץ</small></div>
        <div className="cud-stat"><b>{counts.unresolved || 0}</b><small>פתוח להכרעה</small></div>
      </div>

      <div className="cud-map-title">
        <h3>🧩 מפת הפירוק המחקרית</h3>
        <small>אותו Research Intake · אין קידום אוטומטי</small>
      </div>

      <div className="cud-grid">
        <Card icon="🔤" title="מילים, ביטויים וזהויות" count={subjects.length}>
          {subjects.slice(0, 14).map((s) => (
            <div className="cud-row" key={s.text}>
              <div className="cud-row-main"><b>{s.text}</b></div>
              <div className="cud-row-meta">
                {s.origins.map((o) => <Tag key={o}>{o}</Tag>)}
                {s.existingGraphIdentity && <Tag type="identity">✓ קיים בעץ</Tag>}
                {s.existingResearchObject && <Tag type="identity">✓ קיים במחקר</Tag>}
                {!s.existingGraphIdentity && <Tag type="open">resolve identity</Tag>}
              </div>
            </div>
          ))}
        </Card>

        <Card icon="🔢" title="חישובים מהמנוע הקנוני" count={calculationGroups.length}>
          {calculationGroups.slice(0, 10).map(([subject, rows]) => (
            <div className="cud-row" key={subject}>
              <div className="cud-row-main"><b>{subject}</b><strong>{rows.find((r) => r.method === "ragil")?.value ?? rows[0]?.value}</strong></div>
              <div className="cud-row-meta">
                {rows.slice(0, 5).map((r) => <Tag type="fact" key={`${r.method}-${r.value}`}>{labels[r.method] || r.method}={r.value}</Tag>)}
                {rows.length > 5 && <Tag>+{rows.length - 5} שיטות</Tag>}
              </div>
            </div>
          ))}
          {!calculationGroups.length && <p className="cud-muted">לא נמצאו כרגע ביטויים כשירים למסלול גימטריה קנוני.</p>}
        </Card>

        <Card icon="🔗" title="טענות קשר שהמקור עצמו עושה" count={relations.length + compound.length}>
          {relations.map((r, i) => (
            <div className="cud-row" key={`${r.left}-${r.right}-${i}`}>
              <div className="cud-row-main"><b>{r.left} ↔ {r.right}</b></div>
              <div className="cud-row-meta"><Tag type="claim">CLAIM</Tag><Tag>{r.cue}</Tag><Tag type="open">Human Gate</Tag></div>
            </div>
          ))}
          {compound.slice(0, 6).map((c, i) => (
            <div className="cud-row" key={`compound-${i}`}>
              <div className="cud-row-main"><b>{c.raw || c.text || c.expression || "ביטוי מורכב"}</b>{c.result != null && <strong>{c.result}</strong>}</div>
              <div className="cud-row-meta"><Tag type={String(c.status || "").includes("VERIFIED") ? "fact" : "claim"}>{c.status || "candidate"}</Tag></div>
            </div>
          ))}
          {!relations.length && !compound.length && <p className="cud-muted">לא חולצה טענת-קשר מפורשת. אין בכך קביעה שאין קשר מחקרי.</p>}
        </Card>

        <Card icon="📖" title="מראי מקום וראיות מקור" count={refs.length}>
          {refs.map((r) => (
            <div className="cud-row" key={r.raw}>
              <div className="cud-row-main"><b>{r.raw}</b></div>
              <div className="cud-row-meta"><Tag>source reference</Tag><Tag type="open">exact witness לא נבדק כאן</Tag></div>
            </div>
          ))}
          {!refs.length && <p className="cud-muted">לא זוהה מראה-מקום מובנה בטקסט.</p>}
        </Card>

        <Card icon="🌳" title="מה כבר קיים במערכת" count={graph.length + existing.length}>
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
          {!graph.length && !existing.length && <p className="cud-muted">לא נמצאה כרגע חפיפה ישירה לזהות קיימת.</p>}
        </Card>

        <Card icon="🚧" title="מה עדיין אסור לנו להפוך לעץ" count={unresolved.length}>
          {unresolved.slice(0, 14).map((u, i) => (
            <div className="cud-row" key={`${u.kind}-${i}`}>
              <div className="cud-row-main"><b>{u.label}</b></div>
              <div className="cud-row-meta"><Tag type="open">OPEN</Tag><Tag>{u.kind}</Tag></div>
              <p className="cud-muted">{u.reason}</p>
            </div>
          ))}
          {!unresolved.length && <p className="cud-muted">לא זוהה כרגע blocker של identity/witness בשכבת הפירוק.</p>}
        </Card>

        {d.interpretation?.text && (
          <Card icon="🤖" title="מבט מחקרי של AI — פרשנות בלבד" wide>
            <div className="cud-ai">{d.interpretation.text}</div>
            <div className="cud-row-meta"><Tag type="claim">INTERPRETATION</Tag><Tag type="open">לא Canonical</Tag></div>
          </Card>
        )}
      </div>

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
  const [running, setRunning] = useState(false);
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

  const choose = (item) => {
    setSelectedId(item.id);
    setResult(null);
    setError("");
  };

  const run = useCallback(async () => {
    if (!selected || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      setResult(await runUniversalAnalysis(selected));
    } catch (e) {
      setError(e?.message || "הניתוח נכשל");
    } finally {
      setRunning(false);
    }
  }, [selected, running]);

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
            {CHANNELS.map(([key, label, icon]) => <button key={key} className={`cud-channel${channel === key ? " active" : ""}`} onClick={() => setChannel(key)}>{icon} {label}</button>)}
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
                <button className="cud-run" onClick={run} disabled={running}>{running ? "מפרק ומצליב…" : "🧩 הרץ ניתוח מלא"}</button>
                <div className="cud-actions"><button className="cud-secondary" onClick={onOpenGate}>שלח לשולחן</button><button className="cud-secondary" onClick={onOpenAdvanced}>פתח מתקדם</button></div>
              </div>
            </section>

            {running && <div className="cud-empty"><i>⌁</i><h3>בונה מפת פירוק</h3><p>Shared Expression Extraction → canonical Gematria → Identity Resolution → Existing Research → AI interpretation. אין שום WRITE.</p><div className="cud-loading" style={{ justifyContent: "center" }}><span className="cud-dot" />בודק את המקור מול המערכת החיה…</div></div>}
            {!running && !result && <div className="cud-empty"><i>🧩</i><h3>המקור מוכן לפירוק</h3><p>הכפתור לא הופך הודעה ל־Node. הוא מפרק אותה למילים, חישובים, טענות, קשרים, מראי־מקום וזהויות קיימות — ואז מסמן לך מה כבר ידוע ומה עדיין מחכה לשער שלך.</p><button className="cud-run" onClick={run}>🧩 הרץ ניתוח מלא</button></div>}
            {error && <div className="cud-error">{error}</div>}
            {!running && result && <DecompositionView result={result} />}
          </>}
        </main>
      </div>
    </div>
  );
}
