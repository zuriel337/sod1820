import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { communityReadingPrincipal } from "../../lib/community/communityReadingPosition.js";
import { loadCommunityDraft, saveCommunityDraft } from "../../lib/community/communityDraft.js";
import { fetchCommunityThread, fetchCommunityReply } from "../../lib/community/communityArchive.js";

const blank = scope => ({ scope, body: "", reply: null, hadAttachments: false, reattach: false, status: "idle" });
const storage = () => { try { return window.localStorage; } catch { return null; } };

export function useCommunityDraft2029({ auth, enabled }) {
  const principal = enabled ? communityReadingPrincipal(auth) : null;
  const scope = useRef(principal); scope.current = principal;
  const [snapshot, setSnapshot] = useState(() => blank(null));
  const current = snapshot.scope === principal ? snapshot : blank(principal);
  const latest = useRef(current); latest.current = current;
  useLayoutEffect(() => {
    const loaded = loadCommunityDraft(storage(), principal), cached = loaded.value;
    const next = cached ? { ...blank(principal), body: cached.body,
      reply: cached.reply ? { ...cached.reply, authorName: "ההודעה הקודמת", draftRestoring: true } : null,
      hadAttachments: cached.hadAttachments, reattach: cached.hadAttachments, status: "restored" }
      : { ...blank(principal), status: loaded.available ? "idle" : "unavailable" };
    latest.current = next; setSnapshot(next);
  }, [principal]);

  // Persist synchronously with the input action: refresh/navigation cannot race
  // a deferred save. Only the bounded text and public target IDs leave memory.
  const change = patch => {
    if (scope.current !== principal) return;
    const before = latest.current.scope === principal ? latest.current : blank(principal);
    const next = { ...before, ...patch };
    if (principal) next.status = saveCommunityDraft(storage(), principal, {
      body: next.body, reply: next.reply, hadAttachments: next.hadAttachments,
    }) ? "saved" : "unavailable";
    latest.current = next; setSnapshot(next);
  };
  const target = current.reply;
  useEffect(() => {
    if (!principal || !target?.draftRestoring) return undefined;
    let alive = true;
    const read = target.parentId ? fetchCommunityReply(target.parentId, target.id) : fetchCommunityThread(target.id);
    read.then(row => {
      if (!alive || scope.current !== principal || latest.current.reply !== target) return;
      const reply = row && !row.isDeleted ? row : { ...target, draftRestoring: false, draftUnavailable: true };
      const next = { ...latest.current, reply };
      latest.current = next; setSnapshot(next);
    }).catch(() => {
      if (!alive || scope.current !== principal || latest.current.reply !== target) return;
      const next = { ...latest.current, reply: { ...target, draftRestoring: false, draftUnavailable: true } };
      latest.current = next; setSnapshot(next);
    });
    return () => { alive = false; };
  }, [principal, target]);

  return { draft: current.body, replyTo: current.reply, status: current.status, reattach: current.reattach,
    setDraft: value => change({ body: typeof value === "function" ? value(latest.current.body) : value }),
    setReplyTo: reply => change({ reply }),
    setHasFiles: hadAttachments => change({ hadAttachments, reattach: false }),
    retryReply: () => current.reply && change({ reply: { ...current.reply, draftRestoring: true, draftUnavailable: false } }),
    clear: () => change({ body: "", reply: null, hadAttachments: false, reattach: false }),
  };
}
