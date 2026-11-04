import React, { useSyncExternalStore } from "react";
import { communityMessageTime } from "../../lib/community/communityMessageTime.js";

// One minute clock for the whole mounted Community, including nested replies.
// Pause while hidden; refresh immediately when returning to the tab.
const listeners = new Set();
let tick = 0, timer = null;
const snapshot = () => tick;
const serverSnapshot = () => 0;
function refresh() {
  tick += 1;
  for (const listener of listeners) listener();
}
function visibilityChanged() {
  clearInterval(timer);
  timer = null;
  if (document.visibilityState !== "hidden") {
    refresh();
    timer = setInterval(refresh, 60_000);
  }
}
function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", visibilityChanged);
    visibilityChanged();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", visibilityChanged);
    }
  };
}

export default function CommunityMessageTime2029({ value, formatDate }) {
  useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const time = communityMessageTime(value, formatDate);
  if (!time) return null;
  return <time dateTime={value} title={time.full} aria-label={time.accessible}>{time.label}</time>;
}
