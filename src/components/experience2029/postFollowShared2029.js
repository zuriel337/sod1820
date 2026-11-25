import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicReadingActionsLocked } from "../../lib/publicReadingRelease2029.js";
import { getVisitorId } from "../../lib/tracking.js";
import { getNotificationPrefs } from "../../lib/supabase.js";
import { watchToggle } from "../../lib/commandCenter.js";
import { trackConversion } from "../../lib/marketing.js";
import { includesFollowSubject } from "../../lib/followIdentity.js";
import { fetchPostFollowTargets2029, postFollowCandidates2029 } from "../../lib/research/postsCatalog2029Projection.js";

// ONE read of the follow targets and ONE read of the saved follows for the Post, shared by the bell, the invitation line and the panel (ZURIEL 25.11.2026):
// no double requests, and the state a person chooses in the panel shows in both entrances. The engine is the existing one (watchToggle / getNotificationPrefs through WatchButton).
const targetReads = new Map();
export function readPostFollowTargets(post) {
  const key = JSON.stringify(postFollowCandidates2029({ post }));
  if (key === "[]") return { key, promise: Promise.resolve([]) };
  if (!targetReads.has(key)) {
    const promise = fetchPostFollowTargets2029({ post }).catch(error => { targetReads.delete(key); throw error; });
    targetReads.set(key, promise);
  }
  return { key, promise: targetReads.get(key) };
}
// Only a target with a verified updates route is offered (state "ready"); every other state is never shown as a follow.
export function usePostFollowTargets(post) {
  const { isAdmin } = useAuth();
  const locked = publicReadingActionsLocked(isAdmin);   // follows are closed to the public: no target requests are made for nothing (Speed Law)
  const [view, setView] = useState({ key: "", ready: [], status: "loading" });
  const { key, promise } = useMemo(() => locked ? { key: "locked", promise: null } : readPostFollowTargets(post), [post, locked]);
  useEffect(() => {
    if (!promise) return undefined;
    let live = true;
    promise.then(items => { if (live) setView({ key, ready: items.filter(item => item.state === "ready"), status: "done" }); },
      () => { if (live) setView({ key, ready: [], status: "error" }); });
    return () => { live = false; };
  }, [key, promise]);
  if (locked) return { key, ready: [], status: "locked" };
  return view.key === key ? view : { key, ready: [], status: "loading" };
}

const listeners = new Set();
let prefs = { key: "", topics: null, promise: null };
let stamp = 0;
const emit = () => { stamp += 1; for (const listener of [...listeners]) listener(); };
function readPrefs(id) {
  const key = id.userId || id.visitorId || "";
  if (prefs.key !== key) prefs = { key, topics: null, promise: null };
  if (!prefs.promise) {
    const mine = prefs;
    mine.promise = Promise.resolve(getNotificationPrefs(id)).then(result => { if (prefs === mine) { mine.topics = result?.topics ?? []; emit(); } return result; })
      .catch(error => { if (prefs === mine) mine.promise = null; throw error; });
  }
  return prefs.promise;
}
// The instance I/O handed to every WatchButton of the panel: reads come from the one shared read; a confirmed toggle refreshes it once so both entrances update.
export const sharedFollowIO = Object.freeze({
  read: readPrefs,
  toggle: async (topic, source, next, visitorId) => {
    const ack = await watchToggle(topic, source, next, visitorId);
    if (ack) { const key = prefs.key; prefs = { key, topics: prefs.topics, promise: null }; emit(); }
    return ack;
  },
  track: (detail) => trackConversion("follow", detail),
});
// true / false once the saved follows are known, null before.
export function usePostFollowing(topics) {
  const { user } = useAuth();
  const id = useMemo(() => user?.id ? { userId: user.id } : { visitorId: getVisitorId() }, [user?.id]);
  const topicKey = (topics || []).join("|");
  const version = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => stamp, () => 0);
  useEffect(() => { if (topicKey && !prefs.promise) readPrefs(id).catch(() => {}); }, [topicKey, id, version]);
  if (!topicKey || prefs.topics == null) return null;
  return topics.some(topic => includesFollowSubject(prefs.topics, topic));
}
