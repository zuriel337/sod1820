import React, { useState } from "react";
import { Link } from "react-router-dom";
import { isUniversalFinding } from "../../lib/research/universalFinding.js";

const TXT = {
  candidate: "מועמד",
  finding: "ממצא",
  evidence: "ראיה",
  claim: "טענה",
  interpretation: "פרשנות",
  match: "אומת במנוע",
  not_tested: "לא אומת במנוע",
  mismatch: "אי־התאמה",
  method_unknown: "שיטה לא מזוהה",
};

const pill = {
  display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999,
  border: "1px solid var(--border, rgba(128,128,128,.25))", padding: "3px 8px",
  fontSize: 10.5, fontWeight: 800, lineHeight: 1.2,
};

function safeText(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  try { return JSON.stringify(v); } catch { return "—"; }
}

/**
 * Renderer-neutral projection of a Universal Finding.
 * Truth is read only from the Finding envelope; this component never computes,
 * promotes, publishes, writes research_objects, or mutates canonical state.
 */
export default function FindingSurface({ finding, compact = false, onRemove = null, removeLabel = "הסר" }) {
  const [open, setOpen] = useState(false);
  if (!isUniversalFinding(finding)) return null;

  const label = finding.subject?.label || finding.subject?.key || finding.id;
  const source = finding.source?.engine || "source";
  const method = finding.source?.method || finding.source?.adapter || null;
  const verification = finding.verification?.verification_state || "not_tested";
  const stage = finding.stage || "finding";
  const sourceIdentity = finding.identity?.sourceIdentity;
  const createdBy = finding.provenance?.createdBy || "—";
  const sourceRef = finding.source?.sourceRef || finding.provenance?.inputRef || null;
  const href = finding.kind === "gematria" && Number.isFinite(Number(finding.subject?.value))
    ? `/number/${Number(finding.subject.value)}`
    : null;

  return (
    <article style={{ border: "1px solid var(--border, rgba(128,128,128,.22))", borderRadius: 12, padding: compact ? "8px 10px" : "10px 12px", marginBottom: 7, background: "var(--card, rgba(255,255,255,.55))" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
            <span style={pill}>{finding.kind}</span>
            <span style={pill}>{TXT[stage] || stage}</span>
            <span style={{ ...pill, fontWeight: 900 }}>{TXT[verification] || verification}</span>
          </div>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 850, overflowWrap: "anywhere" }}>
            {href ? <Link to={href} style={{ color: "inherit", textDecoration: "none" }}>{label}</Link> : label}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: .72 }}>
            מקור: <b>{source}</b>{method ? ` · ${method}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flex: "none" }}>
          <button type="button" onClick={() => setOpen(v => !v)} title="זהות · מקור · provenance" style={{ border: 0, background: "transparent", cursor: "pointer", opacity: .75 }}>{open ? "▴" : "▾"}</button>
          {onRemove && <button type="button" onClick={() => onRemove(finding)} title={removeLabel} style={{ border: 0, background: "transparent", cursor: "pointer", opacity: .75 }}>✕</button>}
        </div>
      </div>

      {open && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border, rgba(128,128,128,.18))", display: "grid", gap: 4, fontSize: 10.8, lineHeight: 1.5, overflowWrap: "anywhere" }}>
        <div><b>Finding ID:</b> {finding.id}</div>
        <div><b>Source identity:</b> {safeText(sourceIdentity)}</div>
        {sourceRef && <div><b>Source ref:</b> {safeText(sourceRef)}</div>}
        <div><b>Provenance:</b> {createdBy}</div>
        <div><b>Truth state:</b> {stage} · {verification}</div>
        <div style={{ opacity: .68 }}>Workspace membership ≠ Canonical ≠ Published.</div>
      </div>}
    </article>
  );
}
