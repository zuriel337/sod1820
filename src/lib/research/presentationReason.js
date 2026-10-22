// Optional explanation/feedback seam under Person + Subscription + Strategy.
// No cohort inference, audience targeting, telemetry writes, UI or auto-follow.
const REASONS = new Set(['followed_subject', 'current_context', 'recent_arrival', 'explicit_recommendation']);
const ACTIONS = new Set(['dismiss_once', 'not_interested', 'mute_subject']);
const boundedRef = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 512 && !/[\u0000-\u001f]/.test(v) ? v.trim() : null;
export function buildPresentationReason({ code, subjectRef, occurrenceKey, evidenceRef } = {}) {
  const subject = boundedRef(subjectRef), occurrence = boundedRef(occurrenceKey), evidence = boundedRef(evidenceRef);
  if (!REASONS.has(code) || !subject || !occurrence) return null;
  if (code === 'explicit_recommendation' && !evidence) return null;
  return { version: 1, code, subjectRef: subject, occurrenceKey: occurrence, evidenceRef: evidence };
}
export function buildPresentationFeedback(reason, action) {
  if (!reason || !ACTIONS.has(action)) return null;
  const valid = buildPresentationReason(reason);
  if (!valid) return null;
  return { version: 1, action, subjectRef: valid.subjectRef, occurrenceKey: valid.occurrenceKey,
    // Dismissal is not unsubscribe or a request to delete source evidence.
    requiresConfirmation: action === 'mute_subject', changesFollow: false };
}
