import { humanContentTitle } from "./presentation/contentTitle.js";
import { publicPostHref } from "./publicPostUrls.js";
import { publicOrGeulaItem2029 } from "./publicContinuityReaders2029.js";
import { NOW_PUBLIC_CHANNELS_2029, publicChannelToSystemItem } from "./research/systemFeedPublicSources2029.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./research/publicPostBoundary.js";
import { formatGregorianDate } from "./research/timeline2029.js";

export const PUBLIC_HISTORY_READING = {
  "/timeline": { title: "ציר הזמן", description: "אירועים ונושאים לפי תאריך, עם קישורים לפוסטים שתיעדו אותם." },
  "/broadcasts": { title: "מרכז השידורים", description: "עדכונים, תמונות וסרטונים שפורסמו בערוצי סוד 1820." },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 18;
const query = (table, params) => table + "?" + new URLSearchParams(params);
const publicChannel = key => Object.hasOwn(NOW_PUBLIC_CHANNELS_2029, key);
const missing = "הפריט שבקישור אינו זמין לקריאה.";
const dated = (kind, value) => {
  const date = formatGregorianDate(value);
  return date ? kind + " " + date : "";
};

function pageHref(path, page, channel) {
  const params = new URLSearchParams();
  if (channel) params.set("c", channel);
  if (page > 1) params.set("page", String(page));
  return params.size ? path + "?" + params : path;
}

function pagination(path, page, hasMore, channel) {
  return {
    previousHref: page > 1 ? pageHref(path, page - 1, channel) : null,
    nextHref: hasMore ? pageHref(path, page + 1, channel) : null,
  };
}

async function timeline(readRows, page, hash) {
  const eventId = hash.startsWith("#ev-") ? hash.slice(4) : "";
  if (hash.startsWith("#ev-") && !UUID.test(eventId)) return { sections: [], notice: missing };
  const window = { limit: String(PAGE_SIZE + 1), offset: String((page - 1) * PAGE_SIZE) };
  const [events, topics] = await Promise.all([
    readRows(query("nodes", {
      select: "id,origin:metadata->>source,occurred:metadata->>occurred_at,greg:metadata->>greg_date,day:metadata->>gregorian_date,"
        + "docs:edges!edges_to_node_fkey!inner(article:nodes!edges_from_node_fkey!inner(wp:metadata->>post_wp_id))",
      type: "eq.event", is_active: "eq.true", "docs.relation_type": "eq.documents",
      "docs.article.type": "eq.post", "docs.article.is_active": "eq.true",
      order: "metadata->>occurred_at.desc.nullslast,id.asc", ...window,
      ...(eventId ? { id: "eq." + eventId, offset: "0", limit: "1" } : {}),
    })),
    eventId ? [] : readRows(query("topic_cards_public", {
      select: "slug,title,status,occurred_at", status: "eq.approved", occurred_at: "not.is.null",
      order: "occurred_at.desc,slug.asc", ...window,
    })),
  ]);
  const activeEvents = events.slice(0, PAGE_SIZE);
  const wpIds = [...new Set(activeEvents.flatMap(event => event.docs.map(doc => doc.article?.wp)).filter(id => /^\d+$/.test(id)))];
  const posts = wpIds.length ? await readRows(query("posts", {
    select: "id,wp_id,title,date,slug,link,source,tags", wp_id: "in.(" + wpIds.join(",") + ")",
    or: "(" + publicPostOnlyFilter() + ")", limit: String(wpIds.length),
  })) : [];
  const byWp = new Map(posts.filter(post => !hasSuppressedPublicPostTag(post) && !["web", "gpt-draft"].includes(post.source))
    .map(post => [String(post.wp_id), post]));
  const eventItems = [];
  for (const event of activeEvents) {
    if (!UUID.test(event.id) || eventId && event.id !== eventId.toLowerCase()) continue;
    let first = true;
    for (const wp of new Set(event.docs.map(doc => String(doc.article?.wp)))) {
      const post = byWp.get(wp);
      const title = humanContentTitle(post?.title);
      const href = post && publicPostHref(post);
      if (!href || !title) continue;
      // Imported event timestamps can be copied from the documenting post.
      const eventDate = event.origin !== "auto_from_post" && (event.occurred || event.greg || event.day);
      const detail = dated("תאריך האירוע", eventDate || "") || dated("פורסם", post.date);
      eventItems.push({ id: first ? "ev-" + event.id : "ev-" + event.id + "-" + wp, title, href, detail });
      first = false;
    }
  }
  const topicItems = topics.slice(0, PAGE_SIZE).filter(t => t.status === "approved" && t.title && t.occurred_at
    && typeof t.slug === "string" && t.slug && !/[/?#\\\u0000-\u001f]/.test(t.slug))
    .map(t => ({ title: humanContentTitle(t.title), href: "/topic/" + encodeURIComponent(t.slug), detail: dated("תאריך האירוע", t.occurred_at) }));
  const sections = [
    { title: "פוסטים המתעדים אירועים", items: eventItems },
    { title: "נושאים מתוארכים", items: topicItems },
  ].filter(section => section.items.length);
  if (eventId) return { sections, focusedId: eventItems[0]?.id, notice: eventItems.length ? null : missing };
  return { sections, ...pagination("/timeline", page, events.length > PAGE_SIZE || topics.length > PAGE_SIZE) };
}

function channelRows(readRows, channel, id, limit, offset, now) {
  return readRows(query("channel_updates", {
    select: "id,channel,status,page_only,expires_at,created_at,text,seo_title,image_url,link_url",
    channel: channel ? "eq." + channel : "in.(" + Object.keys(NOW_PUBLIC_CHANNELS_2029).join(",") + ")",
    status: "eq.live", page_only: "eq.false", or: "(expires_at.is.null,expires_at.gt." + new Date(now).toISOString() + ")",
    order: "created_at.desc,id.desc", limit: String(limit), offset: String(offset), ...(id ? { id: "eq." + id } : {}),
  }));
}

function broadcastItem(row, now) {
  const item = publicChannelToSystemItem(row, { now });
  if (!item) return null;
  const videoPage = publicOrGeulaItem2029(row, { now });
  const href = videoPage?.href || "/broadcasts?" + new URLSearchParams({ c: row.channel, u: row.id });
  return { id: row.id, title: humanContentTitle(videoPage?.title || item.label), href,
    detail: dated("פורסם", item.at), source: item };
}

async function broadcasts(readRows, params, page) {
  const channel = params.get("c");
  const id = params.get("u");
  const tab = params.get("tab");
  if (tab && tab !== "channels") {
    const destinations = { forum: ["/community/chat", "לדיונים שפורסמו"], reality: ["/reality", "לזרם המציאות"],
      activity: ["/reality", "לפעילות שפורסמה"], dev: ["/broadcasts?c=site-news", "לעדכוני האתר"] };
    const target = Object.hasOwn(destinations, tab) && destinations[tab];
    return target && !id ? { sections: [{ title: "המשך קריאה", items: [{ href: target[0], title: target[1] }] }] }
      : { sections: [], notice: missing };
  }
  const allChannels = !channel || channel === "all";
  if ((!allChannels && !publicChannel(channel)) || (params.has("u") && !UUID.test(id || ""))) return { sections: [], notice: missing };
  const now = Date.now();
  if (id) {
    const rows = await channelRows(readRows, allChannels ? null : channel, id, 1, 0, now);
    const row = rows.find(r => r.id === id.toLowerCase() && (allChannels || r.channel === channel));
    const item = row && broadcastItem(row, now);
    if (!item) return { sections: [], notice: missing };
    const source = item.source;
    const detail = [item.detail, source.fullText].filter(Boolean).join(" · ");
    const items = [{ id: item.id, title: item.title, detail, href: row.channel === "or-geula" ? item.href : source.href }];
    if (source.mediaHref) items.push({ title: "למדיה שפורסמה בעדכון", href: source.mediaHref });
    return { focusedId: row.id, sections: [{ title: NOW_PUBLIC_CHANNELS_2029[row.channel], items }] };
  }
  const channels = allChannels ? Object.keys(NOW_PUBLIC_CHANNELS_2029) : [channel];
  const size = allChannels ? 3 : PAGE_SIZE;
  if (allChannels && page !== 1) return { sections: [], notice: "לבחירת עמוד יש לבחור ערוץ." };
  const groups = await Promise.all(channels.map(async key => {
    const rows = await channelRows(readRows, key, null, size + 1, (page - 1) * size, now);
    const items = rows.slice(0, size).filter(row => row.channel === key).map(row => broadcastItem(row, now))
      .filter(Boolean).map(({ id, title, href, detail }) => ({ id, title, href, detail }));
    if (allChannels && rows.length > size) items.push({ title: "לכל העדכונים בערוץ", href: pageHref("/broadcasts", 1, key) });
    return { title: NOW_PUBLIC_CHANNELS_2029[key], items, hasMore: rows.length > size };
  }));
  return { sections: groups.filter(g => g.items.length),
    ...(!allChannels && pagination("/broadcasts", page, groups[0].hasMore, channel)) };
}

export async function readPublicHistory2029(readRows, path, search = "", hash = "") {
  const meta = PUBLIC_HISTORY_READING[path];
  if (!meta) throw new Error("unknown_public_history_route");
  const params = new URLSearchParams(search);
  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,4}$/.test(rawPage)) return { ...meta, sections: [], notice: "מספר העמוד אינו תקין." };
  const data = path === "/timeline" ? await timeline(readRows, Number(rawPage), hash) : await broadcasts(readRows, params, Number(rawPage));
  return { ...meta, ...data };
}
