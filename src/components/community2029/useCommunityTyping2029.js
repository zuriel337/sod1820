import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { createTypingTracker, shouldSendTyping, TYPING_TTL_MS } from "../../lib/community/communityTyping.js";

// Shows how many other people are typing right now. Presence of a key only; the
// channel never carries text, names or accounts, and a failure is silent.
const CHANNEL = "community-typing";
const randomKey = () => { try { return crypto.randomUUID(); } catch { return `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; } };

export function useCommunityTyping2029({ enabled }) {
  const [count, setCount] = useState(0);
  const channelRef = useRef(null), subscribed = useRef(false), lastSent = useRef(0);
  const key = useRef(null);
  if (!key.current) key.current = randomKey();
  useEffect(() => {
    if (!enabled || !supabase?.channel) return undefined;
    const tracker = createTypingTracker();
    let timer = null, alive = true;
    const sync = () => { if (alive) setCount(tracker.count()); };
    try {
      const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false, ack: false } } });
      channelRef.current = channel;
      channel.on("broadcast", { event: "typing" }, ({ payload }) => { tracker.mark(payload?.k); sync(); if (!timer) timer = setInterval(() => { sync(); if (!tracker.count() && timer) { clearInterval(timer); timer = null; } }, 1500); })
        .subscribe(status => { subscribed.current = status === "SUBSCRIBED"; });
    } catch { channelRef.current = null; }
    return () => {
      alive = false; subscribed.current = false;
      if (timer) clearInterval(timer);
      const channel = channelRef.current; channelRef.current = null;
      try { if (channel) supabase.removeChannel(channel); } catch { /* ignore */ }
      setCount(0);
    };
  }, [enabled]);
  const notifyTyping = useCallback(() => {
    const channel = channelRef.current, now = Date.now();
    if (!channel || !subscribed.current || !shouldSendTyping(lastSent.current, now)) return;
    lastSent.current = now;
    try { channel.send({ type: "broadcast", event: "typing", payload: { k: key.current } }); } catch { /* ignore */ }
  }, []);
  return { typingCount: count, notifyTyping, typingTtl: TYPING_TTL_MS };
}
