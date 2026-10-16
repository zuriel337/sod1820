// Test harness (bundled by test/home-settled-box-dom-2029.test.mjs): one list that uses useSettledBox the way Home does — a held box is its own
// placeholder, loading slots only when nothing is held. The hook module is injected through the "@hook" alias so the same scenario can run against
// the current hook and against the previous one.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useSettledBox, readSettledBox, resetSettledBoxes } from "@hook";

function List({ id, pending, items, slots }) {
  const box = useSettledBox(id, { pending, settled: !pending, count: items });
  return <div className="h29">
    <div id="box" ref={box.ref} data-h29-hold={box.hold} data-held={box.held ? "1" : "0"} style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: items }, (_, i) => <article className="card" key={i} style={{ height: 100 }}>{`item ${i}`}</article>)}
      {pending && !box.held ? Array.from({ length: slots }, (_, i) => <article className="slot" key={`s${i}`} style={{ height: 100 }}>{" "}</article>) : null}
    </div>
  </div>;
}

let root = null, container = null;
const frames = [];
const sample = () => {
  const box = document.getElementById("box");
  if (box) frames.push({ t: Math.round(performance.now()), h: Math.round(box.getBoundingClientRect().height), slots: box.querySelectorAll(".slot").length, cards: box.querySelectorAll(".card").length,
    hasVar: box.style.getPropertyValue("--h29-settled-h") !== "", held: box.dataset.held, minBlock: getComputedStyle(box).minBlockSize, vw: innerWidth });
  requestAnimationFrame(sample);
};
window.__api = {
  mount(props) { if (!container) { container = document.createElement("div"); document.body.appendChild(container); } root = createRoot(container); root.render(<List id="harness" {...props} />); },
  render(props) { root.render(<List id="harness" {...props} />); },
  unmount() { root?.unmount(); root = null; container?.remove(); container = null; },
  memory: () => readSettledBox("harness") || null,
  reset: () => resetSettledBoxes(),
  startFrames: () => { frames.length = 0; requestAnimationFrame(sample); },
  frames: () => frames.slice(),
  state: () => { const box = document.getElementById("box"); return box ? { h: Math.round(box.getBoundingClientRect().height), slots: box.querySelectorAll(".slot").length, cards: box.querySelectorAll(".card").length, hasVar: box.style.getPropertyValue("--h29-settled-h") !== "", held: box.dataset.held, minBlock: getComputedStyle(box).minBlockSize } : null; },
};
