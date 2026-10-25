import { supabase, getNotificationPrefs } from "../supabase.js";
import { getMyNotifications, markAllRead, markNotificationRead } from "../notifications.js";
import { watchToggle } from "../commandCenter.js";
import { canonicalFollowTopic } from "../followIdentity.js";
import { publicWriterFollowLinks, writerPersonalHref } from "./writerPersonal2029.js";

// A bounded adapter to the existing owners, not another inbox/follow store or sender.
async function requireAccount(userId) {
  if (!supabase || !userId) throw new Error("Account unavailable");
  const { data, error } = await supabase.auth.getSession();
  if (error || data?.session?.user?.id !== userId) throw new Error("Account changed");
}

export function followTopics(prefs) {
  if (prefs === null) return []; // A measured missing preference row, not a failed read.
  if (!Array.isArray(prefs?.topics) || prefs.topics.some(topic => typeof topic !== "string" || !topic.trim())) {
    throw new Error("Follow preferences unavailable");
  }
  return [...new Set(prefs.topics.map(canonicalFollowTopic))];
}

// Preserve the existing inbox's native conversation handoff, without accepting a URL identity.
export function notificationHref(link) {
  if (typeof link !== "string") return link;
  try {
    const url = new URL(link, "https://local.invalid");
    if (url.origin === "https://local.invalid" && url.pathname === "/me" && url.searchParams.get("tab") === "messages") {
      return writerPersonalHref("messages", { dm: url.searchParams.get("dm") });
    }
  } catch { /* The view's owned safe-link filter rejects malformed links. */ }
  return link;
}

export const followCenterIO = Object.freeze({
  async readUpdates(userId) {
    await requireAccount(userId);
    const items = await getMyNotifications(30, { strict: true });
    await requireAccount(userId);
    return items.map(item => ({ ...item, link: notificationHref(item.link) }));
  },
  async readFollows(userId) {
    await requireAccount(userId);
    const topics = followTopics(await getNotificationPrefs({ userId }));
    // One anonymous-visible batch; ambiguous/private authors never receive guessed links.
    const links = await publicWriterFollowLinks(topics);
    await requireAccount(userId);
    return { topics, links };
  },
  async unfollow(userId, topic) {
    await requireAccount(userId);
    return watchToggle(topic, "center", false, null);
  },
  async markAll(userId) {
    await requireAccount(userId);
    const ack = await markAllRead({ strict: true });
    await requireAccount(userId);
    return ack;
  },
  async markOne(userId, id) {
    await requireAccount(userId);
    const ack = await markNotificationRead(id, { strict: true });
    await requireAccount(userId);
    return ack;
  },
});
