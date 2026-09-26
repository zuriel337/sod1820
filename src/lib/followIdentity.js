// Follow identity compatibility seam.
// Server-side resolve_topics/canonical_follow_topic remain authoritative for delivery.
// This client helper only keeps WatchButton/presentation aligned with stored legacy aliases.
// Do not add locale/URL/display-name derived identity here; future stable author/category IDs
// enter behind the existing server resolver contract at the approved migration gate.

export function canonicalFollowTopic(topic) {
  let t = String(topic || "").trim();
  if (!t) return "";

  if (t.startsWith("category:")) t = `cat:${t.slice(9)}`;
  else if (/^num_\d+$/.test(t)) t = `number:${t.slice(4)}`;
  else if (t === "els") t = "codes:new";
  else if (["orgeula:new", "or-geula", "channel:orgeula"].includes(t)) t = "channel:or-geula";

  if (t.startsWith("cat:")) {
    const label = t.slice(4).replace(/["“”]/g, "״");
    return `cat:${label}`;
  }
  return t;
}

export function followTopicAliases(topic) {
  const canonical = canonicalFollowTopic(topic);
  if (!canonical) return [];

  if (canonical.startsWith("cat:")) {
    const label = canonical.slice(4);
    const straight = label.replace(/״/g, '"');
    return [...new Set([
      canonical,
      `cat:${straight}`,
      `category:${label}`,
      `category:${straight}`,
    ])];
  }

  if (canonical.startsWith("number:")) {
    const value = canonical.slice(7);
    return [canonical, `num_${value}`];
  }

  if (canonical === "codes:new") return ["codes:new", "els"];
  if (canonical === "channel:or-geula") {
    return ["channel:or-geula", "orgeula:new", "or-geula", "channel:orgeula"];
  }
  return [canonical];
}

export function includesFollowSubject(topics, topic) {
  if (!Array.isArray(topics)) return false;
  const wanted = new Set(followTopicAliases(topic));
  return topics.some(stored => wanted.has(String(stored || "").trim()));
}
