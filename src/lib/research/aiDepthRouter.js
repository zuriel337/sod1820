import { getAiAnalysis } from "../supabase.js";

// Universal AI depth router v1.
// Projection/orchestration only: deterministic engines remain truth owners.
// This module chooses interpretation cost/depth; it does not calculate, canonicalize, publish, or persist research truth.

export const AI_DEPTH_PROFILES = Object.freeze({
  none: Object.freeze({
    key: "none",
    label: "בלי AI חיצוני",
    description: "פירוק, מנועים, DB ו-Identity Resolution בלבד",
    externalAi: false,
  }),
  quick: Object.freeze({
    key: "quick",
    label: "סיכום מהיר וזול",
    description: "Gemini Flash על עובדות שכבר נאספו",
    externalAi: true,
    engine: "gemini",
    fast: true,
    long: false,
  }),
  deep: Object.freeze({
    key: "deep",
    label: "מחקר עמוק",
    description: "Claude Sonnet רק כשעומק נוסף מצדיק את העלות",
    externalAi: true,
    engine: "claude",
    fast: false,
    long: true,
  }),
});

export function getAiDepthProfile(depth = "none") {
  return AI_DEPTH_PROFILES[depth] || AI_DEPTH_PROFILES.none;
}

export async function runRoutedAiAnalysis({ depth, kind = "research", subject, facts, ref, ref_name, user_ref, operation }) {
  const profile = getAiDepthProfile(depth);
  if (!profile.externalAi) {
    return { analysis: null, profile, skipped: true };
  }

  const analysis = await getAiAnalysis({
    kind,
    subject,
    facts,
    fast: profile.fast,
    engine: profile.engine,
    long: profile.long,
    ref,
    ref_name,
    user_ref,
    operation: operation ? `${operation}:${profile.key}` : `ai_depth:${profile.key}`,
  });

  return { analysis: analysis || null, profile, skipped: false };
}
