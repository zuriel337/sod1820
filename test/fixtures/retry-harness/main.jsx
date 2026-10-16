// Test harness (bundled by test/home-retry-2029.test.mjs): the REAL DiscoveryGateways2029 and HomeComposition2029 over stand-in readers (stubs.js), so the test can fail a
// reader, click the retry in its message, and see exactly which reads ran again. Components that only draw (icons, ratings, hero motion, sign-up, watch buttons) are drawn as nothing.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import DiscoveryGateways2029 from "../../../src/components/experience2029/DiscoveryGateways2029.jsx";
import HomeComposition2029 from "../../../src/components/experience2029/HomeComposition2029.jsx";

// A stand-in for the plane story: it draws its own message (a frame state with its own retry) when it cannot load, like WorldFlightStory2029. window.__plan.story: "ok" | "fail" per visit.
function StubStory() {
  const [state, setState] = React.useState({ loading: true });
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    window.__calls.push("story");
    const list = ((window.__plan = window.__plan || {}).story = (window.__plan || {}).story || []);
    const outcome = list.length ? list.shift() : "ok";
    setState({ loading: true });
    const timer = setTimeout(() => setState({ loading: false, ok: outcome !== "fail" }), 400);   // after the page around it has settled
    return () => clearTimeout(timer);
  }, [attempt]);
  if (state.loading) return <section className="sod29-flight-story is-home is-loading" style={{ height: 200 }}>loading</section>;
  if (!state.ok) return <section className="sod29-frame-state state-unavailable" role="status" style={{ height: 70 }}><strong>unavailable</strong><button className="sod29-action" onClick={() => setAttempt((n) => n + 1)}>retry story</button></section>;
  return <section className="sod29-flight-story is-home" style={{ height: 300 }}>story</section>;
}

let root = null;
window.__api = {
  mount(which, props = {}) { root = createRoot(document.getElementById("root")); root.render(<MemoryRouter>{which === "gateways" ? <DiscoveryGateways2029 {...props} /> : <HomeComposition2029 worldOpen worldPending={false} onOpenWorkspace={() => {}} story={props.withStory ? <StubStory /> : undefined} {...props} />}</MemoryRouter>); },
  unmount() { root?.unmount(); root = null; },
};
