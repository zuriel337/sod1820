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

// The existing verified association is read separately from channel preference.
// No phone, credit field, OTP endpoint or provider operation is consumed here.
export async function readOwnWhatsAppBinding2029(userId, { client = supabase, signal } = {}) {
  const canceled = () => { if (signal?.aborted) throw new DOMException("Binding read canceled", "AbortError"); };
  const account = async () => {
    canceled();
    const { data, error } = await client.auth.getSession();
    canceled();
    if (error || !userId || data?.session?.user?.id !== userId || !data.session.access_token) {
      const failure = new Error("Account changed"); failure.code = "42501"; throw failure;
    }
  };
  try {
    await account();
    let query = client.from("wa_account_links").select("verified_at").eq("user_id", userId)
      .not("verified_at", "is", null).limit(1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    await account();
    if (error) throw error;
    if (!Array.isArray(data) || data.length > 1 || data.some(row => typeof row?.verified_at !== "string" || !Number.isFinite(Date.parse(row.verified_at)))) {
      throw new Error("Invalid binding response");
    }
    return data.length ? { state: "linked", verifiedAt: data[0].verified_at } : { state: "measured_empty" };
  } catch (error) {
    canceled();
    return { state: ["401", "403", "42501"].includes(String(error?.status || error?.code)) ? "access_filtered" : "failed" };
  }
}

export const followCenterIO = Object.freeze({
  readWhatsApp: readOwnWhatsAppBinding2029,
  async readUpdates(userId) {
    await requireAccount(userId);
    const items = await getMyNotifications(30, { strict: true, userId });
    await requireAccount(userId);
    return items.map(item => ({ ...item, link: notificationHref(item.link) }));
  },
  async readFollows(userId) {
    await requireAccount(userId);
    const prefs = await getNotificationPrefs({ userId });
    const topics = followTopics(prefs);
    const channelKnown = prefs === null || Array.isArray(prefs?.channels) && prefs.channels.every(channel => typeof channel === "string" && channel.trim());
    const channels = channelKnown ? [...new Set((prefs?.channels || []).map(channel => channel.trim()))] : null;
    // One anonymous-visible batch; ambiguous/private authors never receive guessed links.
    const links = await publicWriterFollowLinks(topics);
    await requireAccount(userId);
    // Selection is not delivery readiness. Never return the private email or
    // infer a chosen channel from a device permission/default.
    return { topics, links, channels, channelState: channelKnown ? "ready" : "unavailable" };
  },
  async unfollow(userId, topic) {
    await requireAccount(userId);
    return watchToggle(topic, "center", false, null);
  },
  async markAll(userId) {
    await requireAccount(userId);
    const ack = await markAllRead({ strict: true, userId });
    await requireAccount(userId);
    return ack;
  },
  async markOne(userId, id) {
    await requireAccount(userId);
    const ack = await markNotificationRead(id, { strict: true, userId });
    await requireAccount(userId);
    return ack;
  },
});
