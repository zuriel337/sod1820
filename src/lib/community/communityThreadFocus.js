// Existing Community focus validation, shared by browser and HTTP metadata.
// A syntactically valid focus is never evidence that a message is public.
export const COMMUNITY_THREAD_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeCommunityThreadFocus({ threadId = "", replyId = "", path = "" } = {}) {
  if (!COMMUNITY_THREAD_UUID.test(threadId) || replyId && !COMMUNITY_THREAD_UUID.test(replyId)) return null;
  const ids = path ? String(path).split(",") : [threadId, replyId].filter(Boolean);
  if (!ids.length || ids.length > 30 || ids.some(id => !COMMUNITY_THREAD_UUID.test(id))
    || new Set(ids).size !== ids.length || ids[0] !== threadId
    || replyId && ids[ids.length - 1] !== replyId) return null;
  return { threadId, replyId: ids.length > 1 ? ids[ids.length - 1] : null, path: ids };
}
