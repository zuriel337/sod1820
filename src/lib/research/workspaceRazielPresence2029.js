const boundedCount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

const countCopy = (count, singular, plural) => count === 1 ? `1 ${singular}` : `${count} ${plural}`;

// A deterministic projection over state that My Workspace already owns. It never
// starts research, submits a Raziel turn, or copies private values into navigation.
export function projectWorkspaceRazielPresence2029({
  subjectLabel = "",
  savedResearchCount = null,
  activeResearchCount = null,
  savedConversationCount = null,
  activeQuestionCount = null,
  followCount = null,
  hintsAvailable = false,
  razielLocked = false,
} = {}) {
  const subject = String(subjectLabel || "").trim().slice(0, 160);
  const saved = boundedCount(savedResearchCount);
  const active = boundedCount(activeResearchCount);
  const conversations = boundedCount(savedConversationCount);
  const questions = boundedCount(activeQuestionCount);
  const follows = boundedCount(followCount);
  const existing = [];

  if (conversations != null) existing.push(countCopy(conversations, "שיחה שמורה", "שיחות שמורות"));
  if (saved != null) existing.push(countCopy(saved, "פריט מחקר שמור", "פריטי מחקר שמורים"));
  if (active != null && active > 0) existing.push(countCopy(active, "פריט במחקר עכשיו", "פריטים במחקר עכשיו"));
  if (follows != null) existing.push(countCopy(follows, "מעקב", "מעקבים"));
  if (hintsAvailable) existing.push("הרמזים מחוברים למסע החיים");

  let nextStep = "אפשר לבחור נושא ולשאול את רזיאל.";
  if (razielLocked) nextStep = "השיחות השמורות זמינות; השיחה עם רזיאל נעולה זמנית.";
  else if (questions > 0) nextStep = "אפשר להמשיך את השיחה הפעילה מאותה נקודה.";
  else if (conversations > 0) nextStep = "אפשר לחזור לשיחה שמורה או לשאול שאלה חדשה.";
  else if (subject) nextStep = `אפשר לשאול את רזיאל על ${subject}.`;
  else if (active > 0) nextStep = "אפשר להמשיך את מה שנמצא עכשיו במחקר.";

  return Object.freeze({
    location: subject ? `האזור האישי · ${subject}` : "האזור האישי · תמונת מצב",
    existing: Object.freeze(existing),
    existingCopy: existing.length ? existing.join(" · ") : "המחקר, השיחות והרמזים שלך נגישים מכאן.",
    nextStep,
    canAsk: !razielLocked,
  });
}
