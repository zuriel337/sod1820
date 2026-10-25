import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import WatchButton from "../../src/components/WatchButton.jsx";

// Test-only ports: actual Watch controller/Auth provider, no follow or identity writes.
const TOPIC = "author:בדיקה";
const fixture = window.__watchStateFixture = {
  topics: new URLSearchParams(location.search).has("saved") ? [TOPIC] : [],
  failRead: false, failToggle: false, applyUnconfirmed: false,
  holdRead: false, holdToggle: false, pendingReads: [], pendingToggles: [], calls: [],
};
function adapter(key) {
  return {
    read: async () => {
      fixture.calls.push({ kind: "read", adapter: key });
      if (fixture.holdRead) return new Promise(resolve => fixture.pendingReads.push(resolve));
      if (fixture.failRead) throw new Error("Synthetic read failure");
      return { topics: [...fixture.topics], channels: [] };
    },
    toggle: async (topic, source, on) => {
      fixture.calls.push({ kind: "toggle", topic, source, on, adapter: key });
      if (fixture.holdToggle) return new Promise(resolve => fixture.pendingToggles.push(resolve));
      if (!fixture.failToggle || fixture.applyUnconfirmed) fixture.topics = on ? [topic] : [];
      return fixture.failToggle ? null : { ok: true };
    },
    track: () => {},
  };
}
function Review() {
  const [topic, setTopic] = useState(TOPIC);
  const [key, setKey] = useState(0);
  const [identity, setIdentity] = useState(false);
  fixture.changeTopic = setTopic;
  fixture.changeAdapter = () => setKey(value => value + 1);
  const io = useMemo(() => adapter(key), [key]);
  return <main dir="rtl">
    <WatchButton variant="2029" topic={topic} source="watch-state-fixture" label="מעקב בדיקה"
      noPush followIO={io} onVerifyIdentity={() => setIdentity(true)} />
    {identity ? <p role="status">אימות מדומה בלבד</p> : null}
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Review /></AuthProvider></BrowserRouter>);
