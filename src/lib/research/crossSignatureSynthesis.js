import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";

export const CROSS_SIGNATURE_SYNTHESIS_VERSION = "cross-signature-synthesis-v1";

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function uniq(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function publicMethods(methods) {
  return uniq(methods).map((method) => canonicalMethodPublicLabel(method));
}

function signatureList(normalized) {
  return Array.isArray(normalized?.cross_signatures) ? normalized.cross_signatures : [];
}

export function buildCrossSignatureBoundedFacts(normalized, { maxSamples = 12 } = {}) {
  const signatures = signatureList(normalized);
  if (!signatures.length) return "";
  const sampleCap = Math.max(0, Math.min(Number(maxSamples) || 12, 24));
  const lines = [
    "חתימות Cross מנורמלות — נתוני מבנה/קונברגנציה בלבד; אינן אמת קנונית ואינן ראיה עצמאית כשלעצמן.",
    "עצמאות שיטות וביטויים נקבעת רק ע״י public.cross_method_strength; אין להסיק עצמאות מספירת שיטות גולמית.",
  ];

  for (const signature of signatures) {
    const methods = publicMethods(signature.methods);
    const dependent = publicMethods(signature.dependent_methods);
    lines.push(
      `- number=${signature.value} independent_p1_methods=${signature.independent_p1_method_count ?? "unknown"} `
      + `p1_hits=${signature.p1_hits ?? "unknown"} independent_phrases=${signature.independent_phrase_count ?? "unknown"} `
      + `raw_phrases=${signature.phrase_count ?? "unknown"} dependent_expression_phrases=${signature.dependent_expression_phrase_count ?? "unknown"} `
      + `signal=${signature.signal || "none"}`
    );
    if (methods.length) lines.push(`  methods_after_method_dependency_normalization: ${methods.join(" · ")}`);
    if (dependent.length) lines.push(`  dependent_methods_preserved_not_counted_independent: ${dependent.join(" · ")}`);
    if (signature.unregistered_methods?.length) {
      lines.push(`  control_unregistered_methods: ${publicMethods(signature.unregistered_methods).join(" · ")}`);
    }
    const samples = (Array.isArray(signature.sample_rows) ? signature.sample_rows : []).slice(0, sampleCap);
    if (samples.length) {
      lines.push(`  bounded_examples_only (${samples.length}; source_exhaustive=${signature.sample_window?.truncated === false ? "yes" : "no"}):`);
      for (const row of samples) {
        lines.push(`    • ${row.phrase} · ${canonicalMethodPublicLabel(row.method)} = ${row.value ?? signature.value}`);
      }
    }
  }
  return lines.join("\n");
}

function supportFor(signature, extra = {}) {
  return {
    finding_ids: signature.source_finding_id ? [signature.source_finding_id] : [],
    dependency_groups: [
      `cross-signature:number:${signature.value}`,
      "method-dependency-normalized:public.cross_method_strength",
      ...(extra.dependency_groups || []),
    ],
    derivation_refs: [
      "view:cross_method_strength",
      ...(extra.derivation_refs || []),
    ],
    negative_or_control_refs: extra.negative_or_control_refs || [],
  };
}

export function composeCrossSignatureEvidenceBackedSynthesisDraft({
  normalized,
  aiMessage,
  frozenAt = null,
} = {}) {
  const signatures = signatureList(normalized);
  if (!signatures.length) {
    return {
      status: SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
      message: null,
      claims: [],
      motifs: [],
      freeze: {
        frozen: true,
        frozen_at: clean(frozenAt) || new Date().toISOString(),
        policy_version: CROSS_SIGNATURE_SYNTHESIS_VERSION,
      },
      provenance: {
        source_refs: ["view:cross_method_strength"],
        version_refs: [CROSS_SIGNATURE_SYNTHESIS_VERSION],
      },
    };
  }

  const claims = [];
  const motifs = [];

  for (const signature of signatures) {
    const prefix = `cross-${signature.value}`;
    const motifClaimIds = [];

    if (signature.independent_p1_method_count != null || signature.p1_hits != null) {
      const id = `${prefix}-method-independence`;
      motifClaimIds.push(id);
      claims.push({
        id,
        text: `בערך ${signature.value}, מקור Cross הקנוני מציג ${signature.independent_p1_method_count ?? "מספר לא ידוע של"} קבוצות שיטה עצמאיות ברמת P1 לאחר נרמול תלות; פגיעות P1 במקור: ${signature.p1_hits ?? "לא צוין"}.`,
        role: "engine_finding_summary",
        motif_key: `${prefix}-method-structure`,
        support: supportFor(signature),
      });
    }

    if (signature.independent_phrase_count != null || signature.phrase_count != null) {
      const id = `${prefix}-expression-independence`;
      motifClaimIds.push(id);
      claims.push({
        id,
        text: `בערך ${signature.value}, ${signature.independent_phrase_count ?? "מספר לא ידוע של"} משפחות ביטוי נותרו עצמאיות לאחר נרמול תלות מתוך ${signature.phrase_count ?? "מספר לא ידוע של"} ביטויים במקור; ביטויי-תלות מסומנים בנפרד ואינם מוסיפים ראיה עצמאית.`,
        role: "engine_finding_summary",
        motif_key: `${prefix}-expression-structure`,
        support: supportFor(signature),
      });
    }

    if ((signature.dependent_methods?.length || 0) > 0 || (signature.dependent_expression_phrase_count || 0) > 0) {
      const id = `${prefix}-dependency-controls`;
      motifClaimIds.push(id);
      const methods = publicMethods(signature.dependent_methods);
      claims.push({
        id,
        text: `בקרת התלות של ${signature.value} שומרת ${methods.length} שיטות תלויות${methods.length ? ` (${methods.join(" · ")})` : ""} ו־${signature.dependent_expression_phrase_count ?? 0} ביטויי-תלות גלויים, אך אינה סופרת אותם כצירים עצמאיים.`,
        role: "control",
        motif_key: `${prefix}-dependency-visibility`,
        support: supportFor(signature, {
          negative_or_control_refs: ["cross_method_strength:dependency-normalization"],
        }),
      });
    }

    if ((signature.unregistered_methods?.length || 0) > 0) {
      const id = `${prefix}-unregistered-control`;
      motifClaimIds.push(id);
      claims.push({
        id,
        text: `בחתימת ${signature.value} קיימות שיטות שאינן רשומות במלואן ב־Registry (${publicMethods(signature.unregistered_methods).join(" · ")}); הן נשמרות כבקרת provenance ואינן מקודמות אוטומטית.`,
        role: "control",
        motif_key: `${prefix}-registry-control`,
        support: supportFor(signature, {
          negative_or_control_refs: ["cross_method_strength:unregistered_methods"],
        }),
      });
    }

    if (motifClaimIds.length) {
      motifs.push({
        key: `${prefix}-cross-signature`,
        label: `חתימת Cross · ${signature.value}`,
        summary: "מבנה שיטות וביטויים לאחר נרמול תלות קנוני; קונברגנציה/נגזרת בלבד.",
        claim_ids: motifClaimIds,
      });
    }
  }

  return {
    status: claims.length ? SYNTHESIS_STATUS.COMPOSED : SYNTHESIS_STATUS.INSUFFICIENT_EVIDENCE,
    message: clean(aiMessage),
    claims,
    motifs,
    freeze: {
      frozen: true,
      frozen_at: clean(frozenAt) || new Date().toISOString(),
      policy_version: CROSS_SIGNATURE_SYNTHESIS_VERSION,
    },
    explain_why: {
      summary: "המסר נשען על Cross Signatures מנורמלות שתלויות ב־Finding IDs אמיתיים.",
      reason: "raw method count is never treated as independent evidence; dependency-normalized counts come from the canonical Cross owner.",
      refs: signatures.map((signature) => signature.source_finding_id).filter(Boolean),
    },
    provenance: {
      source_refs: ["view:cross_method_strength", "rpc:fn_number_lookup"],
      version_refs: [CROSS_SIGNATURE_SYNTHESIS_VERSION],
      policy_version: CROSS_SIGNATURE_SYNTHESIS_VERSION,
    },
  };
}

export default composeCrossSignatureEvidenceBackedSynthesisDraft;
