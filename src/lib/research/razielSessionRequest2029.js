import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";
import { buildRazielSessionRequestBase } from "./razielSession2029.js";

// Loaded only after an explicit submit. The always-mounted 2029 session keeps its small reducer and
// bounded context helpers eager, while conversation identity/intent resolution stays off the entry path.
export function buildRazielSessionRequest(input = {}) {
  const request = buildRazielSessionRequestBase(input);
  if (!request) return null;
  const resolvedTurn = resolveRazielConversationTurn({
    question: request.subject,
    thread: input.state?.thread,
    surfaceSemantic: request.surfaceSemantic,
  });
  return {
    ...request,
    conversationResolution: projectRazielConversationResolution(resolvedTurn),
  };
}
