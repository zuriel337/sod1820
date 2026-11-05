import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { cleanTypingName, createTypingTracker, shouldSendTyping, TYPING_TTL_MS } from "../../lib/community/communityTyping.js";

// Shows who is typing right now: the public display name of a member, or
// anonymous for a guest. The channel never carries text; a failure is silent.
const CHANNEL = "community-typing";
const randomKey = () => { try { return crypto.randomUUID(); } catch { return `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; } };

export function useCommunityTyping2029({ enabled }) {
  const [people, setPeople] = useState({ names: [], anonymous: 0 });
  const channelRef = useRef(null), subscribed = useRef(false), lastSent = useRef(0);
  const key = useRef(null);
  if (!key.current) key.current = randomKey();
  useEffect(() => {
    if (!enabled || !supabase?.channel) return undefined;
    const tracker = createTypingTracker();
    let timer = null, alive = true;
    const sync = () => { if (alive) setPeople(current => { const next = tracker.people(); return current.anonymous === next.anonymous && current.names.join("\u0001") === next.names.join("\u0001") ? current : next; }); };
    try {
      const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false, ack: false } } });
      channelRef.current = channel;
      channel.on("broadcast", { event: "typing" }, ({ payload }) => { tracker.mark(payload?.k, payload?.n); sync(); if (!timer) timer = setInterval(() => { sync(); if (!tracker.count() && timer) { clearInterval(timer); timer = null; } }, 1500); })
        .subscribe(status => { subscribed.current = status === "SUBSCRIBED"; });
    } catch { channelRef.current = null; }
    return () => {
      alive = false; subscribed.current = false;
      if (timer) clearInterval(timer);
      const channel = channelRef.current; channelRef.current = null;
      try { if (channel) supabase.removeChannel(channel); } catch { /* ignore */ }
      setPeople({ names: [], anonymous: 0 });
    };
  }, [enabled]);
  const notifyTyping = useCallback((name = null) => {
    const channel = channelRef.current, now = Date.now();
    if (!channel || !subscribed.current || !shouldSendTyping(lastSent.current, now)) return;
    lastSent.current = now;
    try { channel.send({ type: "broadcast", event: "typing", payload: { k: key.current, n: cleanTypingName(name) } }); } catch { /* ignore */ }
  }, []);
  return { typingPeople: people, notifyTyping, typingTtl: TYPING_TTL_MS };
}
