import React, { useState } from "react";
import { Link } from "react-router-dom";
import { isUniversalFinding } from "../../lib/research/universalFinding.js";

// Renderer-neutral projection of a Universal Finding.
//
// ── PROVENANCE ────────────────────────────────────────────────────────────────────────────
// Reconciled from PR #226 (gpt/research-studio-canonical-extension-v0, head 502c4b88) into the
// M1 truth-contract branch per Human-Gate decision HG-4 (HOLD + AMEND). Layout, styling and the
// read-only design are preserved. Two projection-level fabrications were removed before adoption
// (truth_axes_foundation_law INVARIANT PR1/PR3 — a renderer may REPRESENT semantic state, it may
// not INVENT it):
//   `finding.stage || "finding"`                            -> honestly unknown when absent
//   `finding.verification?.verification_state || "not_tested"` -> honestly unknown when absent
// The `not_tested` wording was also corrected: it means "no claim was tested against the engine",
// NOT "this value is unverified". An engine-computed value with no claim attached is `not_tested`,
// and labelling that "לא אומת במנוע" would have been misleading in the opposite direction.
//
// This component never computes, promotes, publishes, writes research_objects, or mutates
// canonical state. Workspace membership != Canonical != Published.

const TXT = {
  candidate: "מועמד",
  finding: "ממצא",
  evidence: "ראיה",
  claim: "טענה",
  interpretation: "פרשנות",
  match: "טענה אומתה מול המנוע",
  mismatch: "טענה נסתרה על ידי המנוע",
  method_unknown: "שיטה לא מזוהה במנוע",
  not_tested: "לא נבדקה טענה מול המנוע",
};

const UNKNOWN = "לא הוצהר";

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

export default function FindingSurface({ finding, compact = false, onRemove = null, removeLabel = "הסר" }) {
  const [open, setOpen] = useState(false);
  if (!isUniversalFinding(finding)) return null;

  const label = finding.subject?.label || finding.subject?.key || finding.id;
  const source = finding.source?.engine || "source";
  const method = finding.source?.method || finding.source?.adapter || null;
  // Four-axis read. Absent stays absent — never defaulted into a semantic claim.
  const stage = finding.stage ?? null;                                    // EPISTEMIC TYPE
  const verification = finding.verification?.verification_state ?? null;  // VERIFICATION
  const governance = finding.status ?? null;                              // GOVERNANCE
  const accessTier = finding.access?.tier ?? null;                        // PUBLICATION/ACCESS
  const sourceIdentity = finding.identity?.sourceIdentity;
  const createdBy = finding.provenance?.createdBy ?? null;
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
            <span style={pill} title="סוג ידע (EPISTEMIC TYPE)">{stage ? (TXT[stage] || stage) : UNKNOWN}</span>
            <span style={{ ...pill, fontWeight: 900 }} title="אימות מנוע (VERIFICATION)">
              {verification ? (TXT[verification] || verification) : UNKNOWN}
            </span>
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
        <div><b>Provenance:</b> {createdBy ?? UNKNOWN}</div>
        <div><b>סוג ידע:</b> {stage ? (TXT[stage] || stage) : UNKNOWN}</div>
        <div><b>אימות מנוע:</b> {verification ? (TXT[verification] || verification) : UNKNOWN}</div>
        <div><b>ממשל:</b> {governance ?? UNKNOWN}</div>
        <div><b>גישה:</b> {accessTier ?? UNKNOWN}</div>
        <div style={{ opacity: .68 }}>Workspace membership ≠ Canonical ≠ Published.</div>
      </div>}
    </article>
  );
}
