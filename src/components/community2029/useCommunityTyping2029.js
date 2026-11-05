import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { cleanTypingName, createTypingTracker, shouldSendTyping, TYPING_TTL_MS } from "../../lib/community/communityTyping.js";

// Shows who is typing right now, you included: the public display name of a
// member, or anonymous for a guest, exactly as others see it. The channel never
// carries text; a failure is silent and your own indicator keeps working.
const CHANNEL = "community-typing";
const EMPTY = { names: [], anonymous: 0 };
const randomKey = () => { try { return crypto.randomUUID(); } catch { return `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; } };
const samePeople = (a, b) => a.anonymous === b.anonymous && a.names.join("\u0001") === b.names.join("\u0001");

export function useCommunityTyping2029({ enabled }) {
  const [people, setPeople] = useState(EMPTY);
  const tracker = useRef(null);
  if (!tracker.current) tracker.current = createTypingTracker();
  const channelRef = useRef(null), subscribed = useRef(false), lastSent = useRef(0), syncRef = useRef(null);
  const key = useRef(null);
  if (!key.current) key.current = randomKey();
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null, alive = true;
    // One refresh keeps the label current and keeps a one-second clock running
    // only while somebody (you or another person) is still counted as typing.
    const sync = () => {
      if (!alive) return;
      const next = tracker.current.people();
      setPeople(current => samePeople(current, next) ? current : next);
      if (tracker.current.count() > 0 && !timer) timer = setInterval(sync, 1000);
      else if (!tracker.current.count() && timer) { clearInterval(timer); timer = null; }
    };
    syncRef.current = sync;
    if (supabase?.channel) {
      try {
        const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false, ack: false } } });
        channelRef.current = channel;
        channel.on("broadcast", { event: "typing" }, ({ payload }) => { tracker.current.mark(payload?.k, payload?.n); sync(); })
          .subscribe(status => { subscribed.current = status === "SUBSCRIBED"; });
      } catch { channelRef.current = null; }
    }
    return () => {
      alive = false; subscribed.current = false; syncRef.current = null;
      if (timer) clearInterval(timer);
      tracker.current.clear();
      const channel = channelRef.current; channelRef.current = null;
      try { if (channel) supabase.removeChannel(channel); } catch { /* ignore */ }
      setPeople(EMPTY);
    };
  }, [enabled]);
  const notifyTyping = useCallback((name = null) => {
    const clean = cleanTypingName(name), now = Date.now();
    // Always show yourself at once, on every keystroke (the broadcast skips the sender).
    tracker.current.mark(key.current, clean, now);
    syncRef.current?.();
    const channel = channelRef.current;
    if (!channel || !subscribed.current || !shouldSendTyping(lastSent.current, now)) return;
    lastSent.current = now;
    try { channel.send({ type: "broadcast", event: "typing", payload: { k: key.current, n: clean } }); } catch { /* ignore */ }
  }, []);
  return { typingPeople: people, notifyTyping, typingTtl: TYPING_TTL_MS };
}
