// Test harness (bundled by test/scroll-return-2029.test.mjs): a Home-shaped page wired the way the product wires it — the real useSettledBox hook (held
// boxes are their own placeholders, loading slots only from evidence), the real scroll restorer driven like RouteEffects2029 does (onLocation in a layout
// effect, navType POP on Back), history through pushState so the browser's own scroll restoration takes part. Reads are simulated per visit
// (window.__cfg.visits[i]): ok / late / empty / fail / fewer items. The restorer is injected through the "@restorer" alias, so the same scenario runs against
// the current restorer and against the one of e3498434 (negative control).
import React, { useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useSettledBox } from "@hook";
import { createScrollRestorer2029 } from "@restorer";

const NBSP = " ";
// the blocks carry data-block for measurement; data-scroll-anchor (what the restorer remembers) only when the page is marked (cfg.unmarked turns it off: a page like Post or World)
const mark = (id) => ({ "data-block": id, ...(window.__cfg?.unmarked ? {} : { "data-scroll-anchor": id }) });
const memory = { updates: null, notable: null, gateways: null };   // what the previous visit showed (presentation memory, like shownBefore)
let visit = -1;                                                     // index of the current Home visit (0 = first)
const cfgFor = (name) => ((window.__cfg?.visits || [])[Math.min(visit, (window.__cfg?.visits || []).length - 1)] || {})[name] || { ms: 100, outcome: "ok" };

function useRead(name, itemsWhenOk) {
  const [state, setState] = useState({ done: false, outcome: null, n: 0 });
  useEffect(() => {
    const read = cfgFor(name);
    const timer = setTimeout(() => setState({ done: true, outcome: read.outcome, n: read.outcome === "ok" ? (read.n ?? itemsWhenOk) : 0 }), read.ms ?? 100);
    return () => clearTimeout(timer);
  }, [name, itemsWhenOk]);
  return state;
}

function List({ id, className, pending, items, slots, slotClass, itemClass, empty }) {
  const box = useSettledBox(id, { pending, settled: !pending, count: items });
  return <div className={className} ref={box.ref} data-h29-hold={box.hold} data-held={box.held ? "1" : "0"}>
    {Array.from({ length: items }, (_, i) => <a key={i} className={itemClass} href="/post/x" data-item={`${id}:${i}`}>{`${id} ${i}`}</a>)}
    {pending && !box.held ? Array.from({ length: slots }, (_, i) => <span key={`s${i}`} className={`${itemClass} is-loading`} aria-hidden="true">{NBSP}</span>) : null}
    {!pending && items === 0 ? <p className="empty">{empty}</p> : null}
  </div>;
}

function Home() {
  const [first] = useState(() => (visit = visit + 1));   // index of this Home visit, assigned at mount
  const updates = useRead("updates", 4), notable = useRead("notable", 4), gateways = useRead("gateways", 3);
  const hero = useRead("hero", 1);
  const heroBox = useSettledBox("hero", { pending: !hero.done, settled: hero.outcome === "ok", count: "lead" });
  useEffect(() => { if (updates.done) memory.updates = updates.n; }, [updates.done, updates.n]);
  useEffect(() => { if (notable.done) memory.notable = notable.n; }, [notable.done, notable.n]);
  useEffect(() => { if (gateways.done) memory.gateways = gateways.n; }, [gateways.done, gateways.n]);
  const notableWaiting = (memory.notable || 0) > 0 && !notable.done;
  const notableShown = notableWaiting || (notable.done && notable.n > 0);
  return <div className="home" data-visit={first}>
    <div className="hero-slot" {...mark("home:hero")} ref={heroBox.ref} data-h29-hold={heroBox.hold}>
      <section className={!hero.done ? "hero is-loading" : hero.outcome === "ok" ? "hero" : "hero is-unavailable"}>{hero.done ? (hero.outcome === "ok" ? "hero" : "unavailable") : "loading"}</section>
    </div>
    <section className="quiet" {...mark("home:quiet")}>notice</section>
    <section className="sec" {...mark("home:updates")}><h2>updates</h2>
      <List id="updates" className="list updates" pending={!updates.done} items={updates.done ? updates.n : 0} slots={memory.updates || 0} itemClass="card" empty="no updates" />
    </section>
    {notableShown ? <section className="sec" {...mark("home:notable")}><h2>notable</h2>
      <List id="notable" className="list notable" pending={!notable.done} items={notable.done ? notable.n : 0} slots={memory.notable || 0} itemClass="ncard" empty="none" />
    </section> : null}
    <div className="story" {...mark("home:story")}>story</div>
    <section className="dg" {...mark("home:gateways-head")}><h2>gateways</h2></section>
    {["A", "B", "C"].map((name) => <article key={name} className="gw" {...mark(`gw:${name}`)}><h3>{name}</h3>
      <List id={`gw${name}`} className="list gwlist" pending={!gateways.done} items={gateways.done ? gateways.n : 0} slots={memory.gateways || 0} itemClass="row" empty="no sources" />
      <a className="gwaction" href="/post/x">open</a></article>)}
    <section className="dim" {...mark("gw:dimension")}>dimension five</section>
    <section className="tail" {...mark("home:tools")}>tools</section>
    <section className="tail2">continuity</section>
  </div>;
}

function Post() { return <div id="post" className="post">post <a id="back-link" href="/">home</a></div>; }

const restorer = createScrollRestorer2029();
let keySeq = 0;
function App() {
  const [loc, setLoc] = useState({ key: history.state?.key || "k0", pathname: location.pathname, hash: location.hash, navType: "POP" });
  useEffect(() => {
    restorer.start();
    const onPop = () => setLoc({ key: history.state?.key || "k0", pathname: location.pathname, hash: location.hash, navType: "POP" });
    window.addEventListener("popstate", onPop);
    window.__navigate = (to) => { const key = `k${++keySeq}`; history.pushState({ key }, "", to); setLoc({ key, pathname: to, hash: "", navType: "PUSH" }); };
    return () => { window.removeEventListener("popstate", onPop); restorer.stop(); };
  }, []);
  useLayoutEffect(() => { restorer.onLocation(loc); }, [loc.key]);
  const isHome = loc.pathname === "/";
  return isHome ? <Home key={loc.key} /> : <Post key={loc.key} />;
}

// ---- observation --------------------------------------------------------------------------------------------------------
const frames = [], shifts = [], touches = [], jumps = [];
let recording = false;
const IDS = ["home:hero", "home:updates", "home:notable", "gw:A", "gw:B", "gw:C", "gw:dimension", "home:tools"];
const blockTops = () => Object.fromEntries(IDS.map((id) => { const el = document.querySelector(`[data-block="${id}"]`); return [id, el ? Math.round(el.getBoundingClientRect().top) : null]; }));
// Sampled from a message task posted by the frame's rAF callback: that task runs after the frame has been produced (layout, ResizeObserver callbacks, paint),
// so it reports what was painted, not the transient layout an rAF callback sees before ResizeObserver corrections.
const channel = new MessageChannel();
channel.port1.onmessage = () => { if (recording) frames.push({ t: Math.round(performance.now()), y: Math.round(scrollY), dh: document.documentElement.scrollHeight, tops: blockTops() }); };
const frame = () => { if (recording) channel.port2.postMessage(0); requestAnimationFrame(frame); };
try { new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) shifts.push({ t: Math.round(e.startTime), v: e.value }); }).observe({ type: "layout-shift", buffered: true }); } catch { /* no layout-shift API */ }
window.addEventListener("touchstart", () => touches.push(Math.round(performance.now())), { capture: true, passive: true });
const nativeScrollTo = window.scrollTo.bind(window);
window.scrollTo = function (...args) { jumps.push({ t: Math.round(performance.now()), to: args[0] && typeof args[0] === "object" ? args[0].top : args[1], from: Math.round(scrollY) }); return nativeScrollTo(...args); };
requestAnimationFrame(frame);

window.__api = {
  mount() { createRoot(document.getElementById("root")).render(<App />); },
  scrollToBlock(id, viewportTop) { const el = document.querySelector(`[data-block="${id}"]`); const top = el.getBoundingClientRect().top + scrollY; nativeScrollTo({ top: top - viewportTop, behavior: "instant" }); },
  tops: blockTops,
  start() { frames.length = 0; shifts.length = 0; touches.length = 0; jumps.length = 0; recording = true; return Math.round(performance.now()); },
  stop() { recording = false; },
  frames: () => frames.slice(), shifts: () => shifts.slice(), touches: () => touches.slice(), jumps: () => jumps.slice(),
  held: () => [...document.querySelectorAll("[data-held]")].map((n) => n.dataset.held),
  state: () => ({ y: Math.round(scrollY), dh: document.documentElement.scrollHeight, path: location.pathname, tops: blockTops(), overflowAnchor: document.documentElement.style.overflowAnchor }),
};
