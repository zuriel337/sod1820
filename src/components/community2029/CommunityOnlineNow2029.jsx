import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import UserBadge from "../UserBadge.jsx";
import { COMMUNITY_PRESENCE_PING_MS, fetchCommunityPresenceOnline, pingCommunityPresence } from "../../lib/community/communityPresence.js";

const ONLINE_POLL_MS = 60000;
const SHOWN_MAX = 6;

// "Who's online now" — like the legacy chat. A signed-in member pings while this
// page is open and visible; everyone (members and guests) sees the short public
// list, the same way the legacy chat showed its participants.
export default function CommunityOnlineNow2029() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const ping = () => { if (!document.hidden) pingCommunityPresence().catch(() => {}); };
    ping();
    const timer = setInterval(ping, COMMUNITY_PRESENCE_PING_MS);
    document.addEventListener("visibilitychange", ping);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", ping); };
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    const load = () => { fetchCommunityPresenceOnline().then(list => { if (alive) setPeople(list); }).catch(() => {}); };
    load();
    const timer = setInterval(load, ONLINE_POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (!people.length) return null;
  const shown = people.slice(0, SHOWN_MAX);
  const extra = people.length - shown.length;
  return <p className="sod29-community-online-now" role="status">
    <span className="sod29-community-online-dot" aria-hidden="true" />
    <span>{people.length === 1 ? "מחוברת/ים כרגע: " : `${people.length} מחוברים כרגע: `}</span>
    <span className="sod29-community-online-avatars">
      {shown.map(person => <UserBadge key={person.id} avatarOnly colorfulFallback fallbackSeed={`user:${person.id}`} name={person.name} avatarUrl={person.avatarUrl} avatarClassName="sod29-community-online-avatar" />)}
    </span>
    <span className="sod29-community-online-names">{shown.map(person => person.name).join(", ")}{extra > 0 ? ` ועוד ${extra}` : ""}</span>
  </p>;
}
