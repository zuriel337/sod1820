import { topicLabel, NOTIFICATION_CHANNELS } from "../../lib/notifications.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";

// View model for the 2029 personal update center. It only arranges what the existing owners already supply
// (notifications, explicit follows, resolver links, channel metadata). It stores nothing, sends nothing and
// invents no reason: a missing source_topic means no "why" line. A failed read is never an empty list and an
// unconfirmed follow change is never a success.

export const READ_STATES = Object.freeze(["loading", "ready", "unavailable"]);
const KIND_ORDER = ["כתב", "מספר", "קטגוריה", "ערוץ", "נושא", ""];
const KIND_HEADINGS = { "כתב": "כותבים", "מספר": "מספרים", "קטגוריה": "קטגוריות", "ערוץ": "ערוצים", "נושא": "נושאים", "": "אחר" };
// 2029 icon names (NavigationIcon2029 catalog) per subject kind and channel. The legacy emoji from topicLabel are not used.
const KIND_ICON = { "כתב": "personal", "מספר": "number", "קטגוריה": "layers", "ערוץ": "signal", "נושא": "discovery", "": "help" };
const CHANNEL_ICON = { email: "posts", push: "signal", whatsapp: "conversation" };
const readState = (value) => READ_STATES.includes(value) ? value : "unavailable";
const safeInternal = (href) => {
  if (typeof href !== "string" || !/^\/(?!\/)/.test(href) || /[\\\u0000-\u0020]/.test(href)) return null;
  try {
    const url = new URL(href, "https://internal.invalid");
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== "https://internal.invalid" || path.startsWith("//") || /[\\\u0000-\u001f]/.test(path)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
};

// Follow v19: follow, identity, channel choice and delivery are four separate states.
export function followLifecycle({ principal, followCount, channels, followReadState = "ready" }) {
  const registered = principal === "registered";
  const guest = principal === "guest";
  const known = followReadState === "ready";
  const followState = known ? (followCount > 0 ? "done" : "idle") : followReadState === "loading" ? "loading" : "unknown";
  const chosen = registered && Array.isArray(channels) && channels.some((channel) => channel.chosen);
  return [
    { key: "follow", label: "מעקב", state: followState, note: known ? (followCount > 0 ? `${followCount} במעקב` : "עוד לא בחרת") : followReadState === "loading" ? "טוען את המעקבים" : "לא ניתן לקרוא את המעקבים כרגע" },
    { key: "identity", label: "זהות", state: registered ? "done" : guest ? "needed" : "loading", note: registered ? "מחובר" : guest ? "נדרש אימות זהות" : "בודק את הזהות" },
    { key: "channel", label: "ערוץ", state: guest || registered && known ? (chosen ? "done" : "idle") : "unknown", note: guest || registered && known ? (chosen ? "נבחר במפורש" : "לא נבחר") : "טרם נקראו העדפות הערוצים" },
    { key: "delivery", label: "משלוח", state: "unavailable", note: "לא הופעל" },
  ];
}

export function buildFollowCenterModel({ principal = "loading", notifications = {}, follows = {}, device = {} } = {}) {
  const kind = principal === "registered" || principal === "guest" ? principal : "loading";
  const nState = readState(notifications.state), fState = readState(follows.state);
  const items = nState === "ready" && Array.isArray(notifications.items) ? notifications.items : [];
  const updates = items.map((item) => {
    const why = topicLabel(item.source_topic);
    return {
      id: item.id, title: item.title || "", body: item.body || "", unread: !item.read_at,
      time: bilingualDateLabel(item.created_at), href: safeInternal(item.link),
      why: why ? { icon: KIND_ICON[why.kind] || "help", label: why.label, kind: why.kind } : null,
    };
  });
  const topics = fState === "ready" && Array.isArray(follows.topics) ? follows.topics : [];
  const links = follows.links || {}, pending = follows.pending || {};
  const groups = new Map();
  for (const topic of topics) {
    const label = topicLabel(topic); if (!label) continue;
    const key = KIND_ORDER.includes(label.kind) ? label.kind : "";
    const href = key === "כתב" ? safeInternal(links[topic]) : safeInternal(label.link);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ topic, icon: KIND_ICON[key], label: label.label, href, change: pending[topic] || "idle" });
  }
  const followGroups = KIND_ORDER.filter((key) => groups.has(key)).map((key) => ({ key, heading: KIND_HEADINGS[key], items: groups.get(key) }));
  const followCount = fState === "ready" ? followGroups.reduce((sum, group) => sum + group.items.length, 0) : null;
  // Capability metadata comes from the existing channel list; only device Push has its own readiness.
  const channels = NOTIFICATION_CHANNELS.map((channel) => {
    const ready = channel.key === "push" && device.push === "available";
    return { key: channel.key, icon: CHANNEL_ICON[channel.key] || "help", label: channel.label, available: ready, chosen: ready && device.pushSubscribed === true,
      note: ready ? (device.pushSubscribed ? "פעיל במכשיר הזה" : "אפשר להפעיל במכשיר הזה") : channel.note };
  });
  return {
    principal: kind,
    updates: { state: nState, items: updates, unread: nState === "ready" ? updates.filter((item) => item.unread).length : null },
    following: { state: fState, groups: followGroups, count: followCount },
    channels, lifecycle: followLifecycle({ principal: kind, followCount, channels, followReadState: fState }),
    // Inferred relevance and Raziel suggestions are different inputs from an explicit follow and are not active producers yet.
    inputs: [
      { key: "follow", label: "אני עוקב", note: "בחירה מפורשת שלך", active: true },
      { key: "signal", label: "רלוונטי אליך", note: "עוד לא פעיל", active: false },
      { key: "raziel", label: "רזיאל מציע", note: "עוד לא פעיל", active: false },
    ],
  };
}
