// A Heichal free question is a TEMPORARY Research Context representation: subject.type "phrase" + dimensions.entryIntent
// "free_question". It is not a canonical phrase identity, is never calculated as a whole, and is not an item to save,
// share or add to research. Presentation owners (System Frame, rail, Heichal) read this one predicate so a question is never
// offered as a number/gematria/save/share action. Pure: no engine, network or storage.
export const ENTRY_INTENT_FREE_QUESTION = "free_question";

// True only while the subject IS the free question (not after an exact expression was explicitly chosen).
export function isFreeQuestionContext(context) {
  return context?.dimensions?.entryIntent === ENTRY_INTENT_FREE_QUESTION
    && context?.subject?.type === "phrase"
    && Boolean(context?.dimensions?.entryQuestion)
    && context.dimensions.entryExactExpression !== true
    && context.subject.id === context.dimensions.entryQuestion;
}

// Reader-safe one-line reference for the subject (never prints a question as "phrase:<text>").
export function contextSubjectRef(context) {
  const subject = context?.subject;
  if (!subject) return "";
  const label = subject.label || subject.id;
  return isFreeQuestionContext(context) ? `שאלה חופשית: ${label}` : `${subject.type}:${label}`;
}
