import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { fetchResearchViewerFindings } from "../../lib/research/researchViewerProjection.js";

const NAV = [["feed", "זרם המחקר"], ["findings", "ממצאים"], ["sources", "מקורות"], ["review", "לבדיקה"]];
const card = { background: "#fff", border: "1px solid #dfe5ec", borderRadius: 16, boxShadow: "0 5px 20px rgba(24,39,75,.05)" };
const pill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800, border: "1px solid #d0d5dd", background: "#fff" };

function tone(value) {
  if (value === "match" || value === "canonical") return { color: "#18794e", background: "#eaf8f1", borderColor: "#98d5b6" };
  if (value === "mismatch" || value === "rejected") return { color: "#b42318", background: "#fff0ee", borderColor: "#f1a9a5" };
  if (value === "method_unknown" || value === "not_tested" || value === "candidate") return { color: "#9a6700", background: "#fff5d8", borderColor: "#e6c86b" };
  if (value === "approved") return { color: "#175cd3", background: "#edf4ff", borderColor: "#9ec1f5" };
  return { color: "#475467", background: "#f2f4f7", borderColor: "#d0d5dd" };
}

function Chip({ children, value }) {
  return <span style={{ ...pill, ...tone(value) }}>{children}</span>;
}

function Stat({ n, label }) {
  return <div style={{ ...card, padding: 15, minWidth: 112 }}><div style={{ fontSize: 25, fontWeight: 900 }}>{n}</div><div style={{ color: "#667085", fontSize: 12 }}>{label}</div></div>;
}

function sourceLabel(finding) {
  return finding?.source?.sourceRef || finding?.source?.corpus || "מקור לא מסומן";
}

function verificationState(finding) {
  return finding?.verification?.verification_state ?? null;
}

function governanceState(finding) {
  return finding?.status ?? null;
}

export default function ResearchViewerV0Page() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [tab, setTab] = useState("feed");
  const [findings, setFindings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchResearchViewerFindings({ limit: 300 });
        if (!alive) return;
        setFindings(result.findings || []);
        setSelectedId(result.findings?.[0]?.id || null);
      } catch (e) {
        if (alive) setError(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authLoading, isAdmin]);

  const selected = findings.find(f => f.id === selectedId) || findings[0] || null;
  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of findings) {
      const key = sourceLabel(f);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return [...map.entries()].map(([source, items]) => ({ source, items }));
  }, [findings]);

  const verificationCounts = useMemo(() => {
    const out = { match: 0, mismatch: 0, method_unknown: 0, not_tested: 0, unknown: 0 };
    for (const f of findings) {
      const v = verificationState(f);
      if (v && Object.prototype.hasOwnProperty.call(out, v)) out[v] += 1;
      else out.unknown += 1;
    }
    return out;
  }, [findings]);

  const review = useMemo(() => findings.filter(f => {
    const v = verificationState(f);
    const g = governanceState(f);
    return v === "mismatch" || v === "method_unknown" || g === "candidate";
  }), [findings]);

  const page = { minHeight: "100vh", direction: "rtl", background: "#f4f6f8", color: "#172033", padding: "24px clamp(14px,3vw,38px) 48px", fontFamily: "Arial, sans-serif" };
  if (authLoading) return <main style={page}>טוען הרשאות…</main>;
  if (!isAdmin) return <main style={page}><div style={{ ...card, maxWidth: 600, margin: "80px auto", padding: 30, textAlign: "center" }}><h2>Research Viewer v0</h2><p>פנימי · אדמין בלבד.</p></div></main>;

  return <main style={page}><div style={{ maxWidth: 1440, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
      <div><div style={{ color: "#175cd3", fontSize: 12, fontWeight: 900 }}>SOD1820 · LIVE DISCOVERY PROJECTION</div><h1 style={{ margin: "4px 0", fontSize: "clamp(26px,4vw,40px)" }}>Research Viewer v0</h1><div style={{ color: "#667085" }}>Projection בלבד — מציג state שמגיע מהמקור; לא ממציא אמת, אימות או קנון.</div></div>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{NAV.map(([k, v]) => <button key={k} onClick={() => setTab(k)} style={{ border: `1px solid ${tab === k ? "#175cd3" : "#d0d5dd"}`, background: tab === k ? "#edf4ff" : "#fff", color: tab === k ? "#175cd3" : "#344054", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>{v}</button>)}</nav>
    </header>

    {error && <div style={{ ...card, color: "#b42318", borderColor: "#f1a9a5", padding: 14, marginBottom: 14 }}>Live read failed: {error}</div>}
    {loading ? <div style={{ ...card, padding: 28, textAlign: "center", color: "#667085" }}>טוען Discovery חי…</div> : <>
      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat n={findings.length} label="Universal Findings" />
        <Stat n={grouped.length} label="מקורות" />
        <Stat n={verificationCounts.match} label="Verification: match" />
        <Stat n={verificationCounts.mismatch} label="Mismatch" />
        <Stat n={review.length} label="לבדיקה" />
      </section>

      {tab === "feed" && <div style={{ display: "grid", gap: 12 }}>{grouped.map(group => <article key={group.source} style={{ ...card, padding: 17 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: "#667085", fontSize: 11 }}>SOURCE</div><h3 style={{ margin: "4px 0" }}>{group.source}</h3></div><Chip>{group.items.length} findings</Chip></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{group.items.slice(0, 24).map(f => <button key={f.id} onClick={() => { setSelectedId(f.id); setTab("findings"); }} style={{ ...pill, ...tone(verificationState(f) || governanceState(f)), cursor: "pointer" }}>{verificationState(f) || "verification: unknown"} · {f.subject?.label || f.kind}</button>)}</div>
      </article>)}</div>}

      {tab === "findings" && selected && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,.8fr)", gap: 14 }}>
        <section style={{ ...card, padding: 18, display: "grid", gap: 15 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><Chip value={verificationState(selected)}>verification: {verificationState(selected) || "unknown"}</Chip><Chip value={governanceState(selected)}>governance: {governanceState(selected) || "unknown"}</Chip><Chip>access: {selected.access?.tier || "unknown"}</Chip></div>
          <div><div style={{ color: "#667085", fontSize: 11 }}>SUBJECT</div><h2 style={{ margin: "4px 0" }}>{selected.subject?.label || "—"}</h2></div>
          <div><div style={{ color: "#667085", fontSize: 11 }}>SOURCE / PROVENANCE</div><pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 10, fontSize: 12 }}>{JSON.stringify({ source: selected.source, identity: selected.identity, provenance: selected.provenance }, null, 2)}</pre></div>
          <div><div style={{ color: "#667085", fontSize: 11 }}>VERIFICATION</div><pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 10, fontSize: 12 }}>{JSON.stringify(selected.verification, null, 2)}</pre></div>
        </section>
        <aside style={{ ...card, padding: 18 }}><h3 style={{ marginTop: 0 }}>Reality Graph / Projection</h3><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify({ entityRef: selected.identity?.entityRef, relationRef: selected.identity?.relationRef, projection: selected.projection }, null, 2)}</pre></aside>
      </div>}

      {tab === "sources" && <div style={{ display: "grid", gap: 10 }}>{grouped.map(group => <div key={group.source} style={{ ...card, padding: 16 }}><b>{group.source}</b><div style={{ color: "#667085", marginTop: 6 }}>{group.items.length} Findings · source-native identity preserved</div></div>)}</div>}

      {tab === "review" && <div style={{ display: "grid", gap: 10 }}>{review.length ? review.map(f => <button key={f.id} onClick={() => { setSelectedId(f.id); setTab("findings"); }} style={{ ...card, padding: 15, textAlign: "right", cursor: "pointer" }}><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}><Chip value={verificationState(f)}>{verificationState(f) || "verification: unknown"}</Chip><Chip value={governanceState(f)}>{governanceState(f) || "governance: unknown"}</Chip></div><b>{f.subject?.label || f.id}</b><div style={{ color: "#667085", fontSize: 12, marginTop: 5 }}>{sourceLabel(f)}</div></button>) : <div style={{ ...card, padding: 20 }}>אין כרגע פריטים שמסווגים ל־review לפי mismatch / method_unknown / candidate.</div>}</div>}
    </>}
  </div></main>;
}
