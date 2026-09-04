import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";

const page = {
  minHeight: "100vh",
  direction: "rtl",
  background: "#f7f4ec",
  color: "#221d12",
  padding: "36px 18px 80px",
  fontFamily: "Heebo, Arial, sans-serif",
};
const shell = { maxWidth: 1180, margin: "0 auto" };
const card = { background: "#fffdf8", border: "1px solid #e7dfcf", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(53,43,23,.05)" };
const muted = { color: "#6f6759", fontSize: 13 };
const chip = (tone = "neutral") => ({
  display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800,
  background: tone === "warn" ? "#fff1d6" : tone === "ok" ? "#e8f5e9" : tone === "private" ? "#f1e8ff" : "#f1eee7",
  color: tone === "warn" ? "#8a5a00" : tone === "ok" ? "#22602c" : tone === "private" ? "#5d328b" : "#5d5548",
});

function Section({ title, subtitle, children }) {
  return <section style={{ ...card, marginTop: 16 }}>
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      {subtitle ? <div style={{ ...muted, marginTop: 4 }}>{subtitle}</div> : null}
    </div>
    {children}
  </section>;
}

function Stat({ label, value }) {
  return <div style={{ ...card, padding: 14, minWidth: 120, flex: "1 1 130px" }}>
    <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
    <div style={muted}>{label}</div>
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

export default function EntityHubPreviewPage() {
  const { type = "number", key = "1237" } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

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

  if (state.loading) return <main style={page}><div style={shell}>טוען Entity Hub…</div></main>;
  if (state.error || !state.data) return <main style={page}><div style={shell}><h1>לא ניתן לטעון את הישות</h1><pre style={{ whiteSpace: "pre-wrap" }}>{state.error?.message}</pre></div></main>;

  const data = state.data;
  const identity = data.identity;
  const hg = data.research?.humanGate || { total: 0, status: {}, access: {} };
  const researchAvailable = data.research?.access?.available !== false;
  const journey = data.journeys?.numberKnowledgeJourney;
  const declaredLenses = data.lenses?.declared || [];
  const isNumber = identity.type === "number";

  return <main style={page}>
    <div style={shell}>
      <header style={{ ...card, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...muted, fontWeight: 800 }}>SOD1820 · UNIVERSAL ENTITY HUB · PUBLIC PREVIEW v1</div>
            <h1 style={{ margin: "6px 0 4px", fontSize: 44, lineHeight: 1 }}>{identity.label}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span style={chip()}>{identity.definition?.icon || "🔹"} {identity.definition?.label || identity.type}</span>
              <span style={chip()}>node:{identity.nodeId.slice(0, 8)}…</span>
              <span style={chip("ok")}>Public preview</span>
              <span style={chip("ok")}>Projection read-only</span>
              <span style={chip("warn")}>Human Gate נשמר</span>
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            {isNumber ? <Link to={`/number/${encodeURIComponent(identity.label)}`} style={{ color: "#775a16", fontWeight: 800 }}>לדף המספר הישן ←</Link> : null}
          </div>
        </div>
        <p style={{ margin: "18px 0 0", maxWidth: 820, lineHeight: 1.7 }}>
          השאלה של ה־Hub: <strong>מה SOD1820 יודע על הישות הזאת?</strong> התצוגה מרכיבה את שכבות ה־Reality Graph, Topics, מקורות ומסע־המספר הקיים בלי ליצור אמת או Store חדשים. שכבת מחקר שאינה ציבורית נשארת חסומה על ידי ה־DB ולא נפתחת לצורך ה־Preview.
        </p>
        {declaredLenses.length ? <div style={{ marginTop: 14, display: "flex", gap: 7, flexWrap: "wrap" }}>{declaredLenses.map(lens => <span key={lens} style={chip()}>{lens}</span>)}</div> : null}
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <Stat label="קשרי Graph" value={data.graph?.relations?.length || 0} />
        <Stat label="Research Objects" value={researchAvailable ? (hg.total || 0) : "—"} />
        <Stat label="Topics מאושרים" value={data.topics?.findings?.length || 0} />
        <Stat label="מקורות מזוהים" value={data.sources?.length || 0} />
        <Stat label="אירועי Timeline" value={data.timeline?.length || 0} />
      </div>

      <Section title="Human Gate · מצב המחקר" subtitle="סטטוס מחקר ו־privacy הם שני צירים נפרדים. תצוגה אינה קנוניזציה ואינה פרסום.">
        {researchAvailable ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(hg.status || {}).map(([name, count]) => <span key={name} style={chip(statusTone(name))}>{name}: {count}</span>)}
          {Object.entries(hg.access || {}).map(([name, count]) => count ? <span key={name} style={chip(name === "private" ? "private" : "neutral")}>{name}: {count}</span> : null)}
        </div> : <Empty>שכבת Research Objects אינה ציבורית בהרשאה הנוכחית. ה־Preview אינו עוקף את ה־RLS/GRANT כדי להציג אותה.</Empty>}
      </Section>

      <Section title="Reality Graph" subtitle="הקשרים הקנוניים הקיימים בעץ. עצם קיום edge אינו ממציא verification או publication.">
        {relationGroups.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {relationGroups.map(([relation, findings]) => <div key={relation} style={{ border: "1px solid #ece4d5", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{relation} · {findings.length}</div>
            {findings.slice(0, 8).map(f => <div key={f.id} style={{ ...muted, marginTop: 6, lineHeight: 1.45 }}>{f.subject?.label}</div>)}
            {findings.length > 8 ? <div style={{ ...muted, marginTop: 8 }}>+ {findings.length - 8} נוספים</div> : null}
          </div>)}
        </div> : <Empty />}
      </Section>

      <Section title="Research" subtitle="ממצאים וטענות נשארים ב־Research OS עם הסטטוס, הגישה וה־provenance שלהם.">
        {!researchAvailable ? <Empty>שכבת המחקר המלאה נשארת סגורה בהרשאה הזאת. זו הגנת נתונים, לא חסימת Preview.</Empty> : data.research?.findings?.length ? <div style={{ display: "grid", gap: 10 }}>
          {data.research.findings.map((f, index) => {
            const row = data.research.rows?.find(r => String(r.id) === String(f.identity?.sourceIdentity?.researchObjectId));
            return <article key={f.id} style={{ border: "1px solid #ece4d5", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={chip(statusTone(f.status))}>{f.status || "status unknown"}</span>
                <span style={chip(f.access?.tier === "private" ? "private" : "neutral")}>{f.access?.tier || "access unknown"}</span>
                <span style={chip()}>{row?.kind || "research"}</span>
                {row?.engine_verified === true ? <span style={chip("ok")}>engine_verified</span> : row?.engine_verified === false ? <span style={chip("warn")}>engine not verified</span> : null}
              </div>
              <div style={{ fontWeight: 800, lineHeight: 1.55 }}>{index + 1}. {f.subject?.label}</div>
              <div style={{ ...muted, marginTop: 8 }}>source: {f.source?.sourceRef || f.source?.corpus || "לא צוין"} · created: {f.provenance?.createdAt ? new Date(f.provenance.createdAt).toLocaleString("he-IL") : "לא צוין"}</div>
            </article>;
          })}
        </div> : <Empty />}
      </Section>

      <Section title="Topics / Convergences מאושרים" subtitle="השכבה האוצרותית בלבד. Raw engine convergences אינם מתערבבים כאן אוטומטית.">
        {data.topics?.findings?.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.topics.findings.map(f => <span key={f.id} style={chip("ok")}>{f.subject?.label || f.id}</span>)}
        </div> : <Empty />}
      </Section>

      {isNumber ? <Section title="Number Knowledge Journey" subtitle="המסע הקיים מוצג בלי לזייף את גבולות האישור שלו.">
        {journey ? <>
          <div style={{ border: "1px solid #d9cfbb", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 19, fontWeight: 900 }}>{journey.seed?.title || `מסע ${identity.label}`}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <span style={chip(statusTone(journey.seed?.governance?.status))}>seed: {journey.seed?.governance?.status || "unknown"}</span>
              {journey.seed?.readiness != null ? <span style={chip()}>readiness: {journey.seed.readiness}</span> : null}
              <span style={chip()}>branches: {journey.branches?.length || 0}</span>
            </div>
            <div style={{ ...muted, marginTop: 9 }}>האישור חל על seed/editorial content בלבד. הוא אינו נצבע על חישובים חיים שנכנסים ל־payload.</div>
          </div>
          {journey.branches?.length ? <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 9 }}>
            {journey.branches.map((branch, i) => <div key={branch.id || `${branch.branch_name || "branch"}-${i}`} style={{ border: "1px solid #ece4d5", borderRadius: 12, padding: 11 }}>
              <strong>{branch.branch_name || branch.name || `ענף ${i + 1}`}</strong>
              {branch.description ? <div style={{ ...muted, marginTop: 5 }}>{branch.description}</div> : null}
            </div>)}
          </div> : null}
          {journey.liveComputedMap ? <div style={{ marginTop: 12, border: "1px dashed #c58a1b", background: "#fff8e8", borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 900 }}>Live-computed map · לא יורש Approved</div>
            <div style={{ ...muted, marginTop: 6 }}>החלק הזה מחושב בזמן הקריאה. status=null בכוונה; הוא דורש שיפוט נפרד אם רוצים לקבע אותו.</div>
            <pre style={{ margin: "10px 0 0", fontSize: 12, overflowX: "auto", direction: "ltr", textAlign: "left" }}>{JSON.stringify(journey.liveComputedMap, null, 2)}</pre>
          </div> : null}
        </> : <Empty>אין Number Knowledge Journey זמין כרגע לישות הזאת.</Empty>}
        <div style={{ marginTop: 12, ...muted }}>Research/Discovery Path עתידי יורכב כ־traversal/snapshot על אותו Research Context — ה־Hub אינו יוצר Store או אמת מקבילים.</div>
      </Section> : null}

      <Section title="Sources" subtitle="References שמגיעים מהשכבות הזמינות ומהמסע הקיים. מקור אינו Claim ואינו Canonical status.">
        {data.sources?.length ? <ul style={{ margin: 0, paddingInlineStart: 22 }}>
          {data.sources.map((source, i) => <li key={`${source.type}-${source.ref || source.label}-${i}`} style={{ margin: "7px 0" }}>{source.label}</li>)}
        </ul> : <Empty />}
      </Section>

      <Section title="Timeline · activity lens v0" subtitle="כרגע: זמן יצירת Graph/Research records הזמינים בהרשאה הנוכחית בלבד. אינו מתיימר עדיין להיות הכרונולוגיה ההיסטורית המלאה.">
        {data.timeline?.length ? <div style={{ display: "grid", gap: 7 }}>
          {data.timeline.slice(-30).map(item => <div key={`${item.id}-${item.at}`} style={{ display: "grid", gridTemplateColumns: "170px 120px 1fr", gap: 10, borderBottom: "1px solid #eee6d9", paddingBottom: 7 }}>
            <span style={muted}>{new Date(item.at).toLocaleString("he-IL")}</span>
            <strong>{item.kind}</strong>
            <span>{item.label}</span>
          </div>)}
        </div> : <Empty />}
      </Section>

      <footer style={{ ...muted, marginTop: 24, textAlign: "center" }}>
        One Tree · One Research OS · Many Lenses · Foundation → Projection → Experience
      </footer>
    </div>
  </main>;
}
