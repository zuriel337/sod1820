// Read-only views over the existing session and ResearchProvider. No persistence,
// inferred identity, topic classifier or independent map/document lifecycle.
const list = value => Array.isArray(value) ? value : [];
const text = value => typeof value === "string" ? value : "";
const knownCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function projectRazielConversation(value = {}, current = false) {
  value = value || {};
  const messages = list(value.thread).filter(message => ["user", "raziel"].includes(message?.role) && typeof message.text === "string");
  const ref = value.ref || value.sessionRef || messages.find(message => message.role === "user")?.turnId || null;
  return {
    id: value.id || null, ref,
    title: text(value.title) || text(messages.find(message => message.role === "user")?.text).slice(0, 96) || "שיחה עם רזיאל",
    questions: Array.isArray(value.thread) ? messages.filter(message => message.role === "user").length : knownCount(value.turn_count),
    mode: (current ? value.viewMode : value.view_mode) === "exploratory" ? "מתפרע" : "כללי",
    savedAt: value.saved_at || value.savedAt || null,
    subject: (current ? value.contextSnapshot : value.context_snapshot)?.subject || null,
    messages,
    pictures: messages.flatMap((message, index) => message.role === "raziel" && message.viewMode === "landscape" && message.viewModeApplied === true
      ? [{ message, index, question: text(message.question) || text(message.turnId && messages.find(item => item.role === "user" && item.turnId === message.turnId)?.text), turnId: message.turnId || null }]
      : []),
  };
}

export function projectSavedRazielConversations(saved) {
  return list(saved).filter(item => item?.type === "raziel_session" && typeof item.id === "string" && typeof item.ref === "string")
    .map(item => projectRazielConversation(item))
    .sort((a, b) => text(b.savedAt).localeCompare(text(a.savedAt)) || text(a.id).localeCompare(text(b.id)));
}

export function filterRazielTitles(conversations, query) {
  const needle = text(query).trim().toLocaleLowerCase("he");
  return needle ? conversations.filter(item => item.title.toLocaleLowerCase("he").includes(needle)) : conversations;
}

function subjectKey(subject) {
  const id = subject?.id ?? subject?.ref;
  return typeof subject?.type === "string" && id != null && String(id).trim()
    ? JSON.stringify([subject.type, String(id)]) : null;
}

export function projectRazielDossier(conversation, conversations, research) {
  const subject = conversation?.subject;
  const key = subjectKey(subject);
  const sameSubject = candidate => key != null && subjectKey(candidate) === key;
  const related = list(conversations).filter(item => item.ref === conversation?.ref || sameSubject(item.subject));
  const seen = new Set();
  const items = [...list(research?.saved), ...list(research?.pinned), ...list(research?.cart)].filter(item => {
    if (!item || item.type === "raziel_session") return false;
    const identity = subjectKey(item);
    const itemSubject = item.metadata?.subject || item.metadata?.context?.subject;
    const matches = sameSubject(itemSubject) || sameSubject({ type: item.type, id: item.ref ?? item.id });
    if (!matches || !identity || seen.has(identity)) return false;
    seen.add(identity); return true;
  });
  return { subject, hasExplicitSubject: key != null, conversations: related, items };
}

export function razielGroundingCopy(message) {
  if (message?.grounding === "deterministic") return "חישוב — כפי שנשמר בשיחה";
  if (message?.grounding === "sourced") return "תשובה עם ייחוס למקורות";
  if (message?.grounding === "interpretation") return "פרשנות של רזיאל";
  return "תשובה ללא סיווג שמור";
}

export function workspaceCreditBalance(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function workspaceResearchHref(entity) {
  const href = text(entity?.link || entity?.href);
  if (!href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(href)) return null;
  // Keep the existing exact locator/query/hash. Never put a title, question,
  // conversation identifier or private Context in a newly generated URL.
  return href.replace(/^\/number\//, "/2029/number/");
}
