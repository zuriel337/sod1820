import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/lib/AuthContext.jsx";
import { supabase } from "../../src/lib/supabase.js";
import { use2029Palette } from "../../src/lib/palette.js";
import FollowCenterController2029 from "../../src/components/followCenter2029/FollowCenterController2029.jsx";
import "../../src/components/experience2029/systemFrame2029.css";

const row = (id, title) => ({ id, title, body: "נתון סינתטי", read_at: null, created_at: "2026-10-25T12:00:00Z", link: "/post/exact?item=7#here" });
const fixture = window.__centerFixture = { topics: ["number:1820"], updates: [row("n1", "עדכון ראשון"), row("n2", "עדכון שני")],
  calls: [], holds: {}, held: [], fail: {}, markAck: { ok: true, markedIds: ["n1", "n2"] }, applyUnfollow: true };
const copy = value => JSON.parse(JSON.stringify(value));
function adapter(key) {
  async function request(kind, userId, arg, run) {
    fixture.calls.push({ kind, userId, arg, key });
    if (fixture.holds[kind]) return new Promise((resolve, reject) => fixture.held.push({ kind, resolve, reject }));
    if (fixture.fail[kind]) throw new Error("Synthetic failure");
    return copy(run());
  }
  return {
    readUpdates: id => request("readUpdates", id, null, () => fixture.updates),
    readFollows: id => request("readFollows", id, null, () => ({ topics: fixture.topics, links: {} })),
    unfollow: (id, topic) => request("unfollow", id, topic, () => { if (fixture.applyUnfollow) fixture.topics = []; return null; }),
    markAll: id => request("markAll", id, null, () => fixture.markAck),
    markOne: (id, item) => request("markOne", id, item, () => ({ ok: true, markedIds: [item] })),
  };
}
function Review() {
  const P = use2029Palette(), [io, setIO] = useState(() => adapter(0));
  fixture.changeAdapter = () => setIO(adapter(1));
  fixture.switchAccount = session => supabase.auth.setSession(session);
  return <main dir="rtl" className="sod29-root native-frame" style={{ background: P.pageBg, color: P.ink, padding: 16, minHeight: "100vh",
    "--s29-ink": P.ink, "--s29-muted": P.inkSoft, "--s29-line": P.border, "--s29-panel": P.card, "--s29-panel-soft": P.cardSoft,
    "--s29-accent-text": P.accentText, "--s29-font-ui": "Arial, sans-serif", "--s29-type-ui": "16px", "--s29-type-small": "16px", "--s29-type-micro": "14px", "--s29-type-body": "18px", "--s29-type-lead": "21px" }}>
    <FollowCenterController2029 {...(new URLSearchParams(location.search).has("transport") ? {} : { io })} returnHref="/2029/me/notifications" />
  </main>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Review /></AuthProvider></BrowserRouter>);
