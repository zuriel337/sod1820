import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { followCenterIO } from "../../lib/userCenter/followCenter2029.js";
import { includesFollowSubject } from "../../lib/followIdentity.js";
import { buildFollowCenterModel } from "./followCenterModel2029.js";
import FollowCenter2029 from "./FollowCenter2029.jsx";

async function request(run) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(run), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Follow center request timed out")), 12000);
    })]);
  } finally { clearTimeout(timer); }
}

export default function FollowCenterController2029({ returnHref, onSignIn, io = followCenterIO }) {
  const { user, loading } = useAuth();
  const key = loading ? "loading" : user?.id || "guest";
  return <AccountCenter key={key} userId={loading ? null : user?.id} authLoading={loading}
    io={io} returnHref={returnHref} onSignIn={onSignIn} />;
}

function AccountCenter({ userId, authLoading, io, returnHref, onSignIn }) {
  const [updates, setUpdates] = useState({ state: "loading", items: [] });
  const [follows, setFollows] = useState({ state: "loading", topics: [], links: {}, pending: {} });
  const [readChange, setReadChange] = useState("idle");
  const alive = useRef(false), versions = useRef({ updates: 0, following: 0 });
  const readLock = useRef(false), followLock = useRef(false);
  // Also invalidate in render: an old adapter/account response must not reach a new scope.
  const scope = useRef({ userId, io });
  if (scope.current.userId !== userId || scope.current.io !== io) scope.current = { userId, io };
  const current = scope.current;
  const active = () => alive.current && scope.current === current;

  const load = useCallback(async (section) => {
    const version = ++versions.current[section];
    const valid = () => active() && version === versions.current[section];
    if (!userId) return null;
    const isUpdates = section === "updates";
    if (isUpdates) setUpdates({ state: "loading", items: [] });
    else setFollows({ state: "loading", topics: [], links: {}, pending: {} });
    try {
      const value = await request(() => isUpdates ? io.readUpdates(userId) : io.readFollows(userId));
      if (!valid()) return null;
      if (isUpdates) {
        if (!Array.isArray(value)) throw new Error("Invalid inbox");
        setUpdates({ state: "ready", items: value });
      } else {
        if (!Array.isArray(value?.topics)) throw new Error("Invalid follows");
        setFollows({ state: "ready", topics: value.topics, links: value.links || {}, pending: {},
          channels: value.channels, channelState: value.channelState });
      }
      return value;
    } catch {
      if (valid()) {
        if (isUpdates) setUpdates({ state: "unavailable", items: [] });
        else setFollows({ state: "unavailable", topics: [], links: {}, pending: {} });
      }
      return null;
    }
  }, [userId, io]);

  useEffect(() => {
    alive.current = true;
    setReadChange("idle"); readLock.current = false; followLock.current = false;
    if (userId) { load("updates"); load("following"); }
    return () => { alive.current = false; versions.current.updates++; versions.current.following++; };
  }, [load]);

  async function unfollow(topic) {
    if (!active() || !userId || followLock.current || follows.state !== "ready" || !includesFollowSubject(follows.topics, topic)) return;
    const entry = model.following.groups.flatMap(group => group.items).find(item => item.topic === topic);
    const targets = entry?.topics || [topic];
    followLock.current = true;
    versions.current.following++;
    setFollows(value => ({ ...value, pending: Object.fromEntries(targets.map(target => [target, "pending"])) }));
    for (const target of targets) {
      if (!active()) return;
      try { await request(() => io.unfollow(userId, target)); } catch { /* Readback owns the final state, including partial cancellation. */ }
    }
    if (!active()) return;
    const result = await load("following");
    if (active()) {
      // Only a fresh authoritative read can justify saying the follow is still active.
      const remaining = result ? targets.filter(target => includesFollowSubject(result.topics, target)) : [];
      if (remaining.length) setFollows(value => ({ ...value, pending: Object.fromEntries(remaining.map(target => [target, "failed"])) }));
      followLock.current = false;
    }
  }

  async function mark(id = null) {
    if (!active() || !userId || readLock.current || updates.state !== "ready") return;
    readLock.current = true;
    versions.current.updates++;
    setReadChange("pending");
    try {
      const ack = await request(() => id ? io.markOne(userId, id) : io.markAll(userId));
      if (!active()) return;
      if (ack?.ok !== true || !Array.isArray(ack.markedIds)) throw new Error("Unconfirmed update");
      const ids = new Set(ack.markedIds);
      // Only acknowledged IDs in this account snapshot change; partial/empty acks never clear everything.
      setUpdates(value => ({ ...value, items: value.items.map(item => ids.has(item.id) ? { ...item, read_at: item.read_at || new Date().toISOString() } : item) }));
      setReadChange("idle");
    } catch { if (active()) setReadChange("failed"); }
    finally { if (active()) readLock.current = false; }
  }

  const retry = section => {
    // Recovery reads only. It never repeats a write or races an in-flight mutation.
    if (section === "updates" && !readLock.current) { setReadChange("idle"); load(section); }
    if (section === "following" && !followLock.current) load(section);
  };
  const model = buildFollowCenterModel({ principal: authLoading ? "loading" : userId ? "registered" : "guest",
    notifications: updates, follows,
    channelReadState: follows.state === "ready" && follows.channelState === "ready" ? "ready" : "unavailable",
    deliveryReadState: "unavailable" });
  return <FollowCenter2029 model={model} returnHref={returnHref} readChange={readChange} loadedPage
    onRetry={retry} onUnfollow={unfollow} onMarkAllRead={() => mark()}
    onOpenUpdate={async (item, event, href) => {
      if (!item.unread || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (readLock.current) return;
      await mark(item.id);
      if (active()) window.location.assign(href);
    }}
    onSignIn={onSignIn} onVerifyIdentity={onSignIn} />;
}
