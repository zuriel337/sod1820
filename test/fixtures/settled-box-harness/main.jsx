// Test harness (bundled by test/home-settled-box-dom-2029.test.mjs): one list that uses useSettledBox the way Home does — a held box is its own
// placeholder, loading slots only when nothing is held. The hook module is injected through the "@hook" alias so the same scenario can run against
// the current hook and against the previous one.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useSettledBox, readSettledBox, rememberSettledBox, resetSettledBoxes } from "@hook";

// Optional props, all off by default (the original scenarios do not use them):
//   shift   px per card index: card i is PAINTED i*shift px lower than its layout box (an entrance animation mid-way: a transform moves the paint, not the layout)
//   images  every card carries an <img> that is slow to arrive (its natural height is that of the card)
//   before  px of content above the list (the list starts below the first screen)
//   keep    the list came back empty: a message stands where the cards were and the held box is kept (the product's `keep` option; older hooks ignore it)
function List({ id, pending, items, slots, shift = 0, images = false, keep = false, before = 0 }) {
  const box = useSettledBox(id, { pending, settled: !pending && items > 0, count: items, keep });
  return <div className="h29">
    {before ? <div id="before" style={{ height: before }} /> : null}
    <div id="box" ref={box.ref} data-h29-hold={box.hold} data-held={box.held ? "1" : "0"} style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: items }, (_, i) => <article className="card" key={i} style={{ height: 100, transform: shift ? `translateY(${i * shift}px)` : undefined }}>{`item ${i}`}{images ? <img alt="" src={`/slow-${i}.png`} width="10" height="10" /> : null}</article>)}
      {keep && !pending && items === 0 ? <p className="message">unavailable</p> : null}
      {pending && !box.held ? Array.from({ length: slots }, (_, i) => <article className="slot" key={`s${i}`} style={{ height: 100 }}>{" "}</article>) : null}
    </div>
    <div id="marker" style={{ height: 40 }}>marker</div>
    <div id="tail" style={{ height: 3000 }} />
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
  remember: (box) => rememberSettledBox("harness", box),
  reset: () => resetSettledBoxes(),
  startFrames: () => { frames.length = 0; requestAnimationFrame(sample); },
  frames: () => frames.slice(),
  // layout extent of the cards (offsets ignore transforms) and the first row's track height, to tell a stretched grid from a natural one
  geometry: () => { const box = document.getElementById("box"), cards = [...box.querySelectorAll(".card")]; return { box: Math.round(box.getBoundingClientRect().height * 10) / 10, extent: cards.length ? cards.at(-1).offsetTop + cards.at(-1).offsetHeight - cards[0].offsetTop : 0, firstRow: getComputedStyle(box).gridTemplateRows.split(" ")[0] || null, message: box.querySelector(".message")?.textContent || null, hasVar: box.style.getPropertyValue("--h29-settled-h") !== "" }; },
  markerTop: () => Math.round(document.getElementById("marker").getBoundingClientRect().top * 10) / 10,
  tailTop: () => Math.round(document.getElementById("tail").getBoundingClientRect().top * 10) / 10,
  tailDocTop: () => Math.round(document.getElementById("tail").getBoundingClientRect().top + scrollY),
  state: () => { const box = document.getElementById("box"); return box ? { h: Math.round(box.getBoundingClientRect().height), slots: box.querySelectorAll(".slot").length, cards: box.querySelectorAll(".card").length, hasVar: box.style.getPropertyValue("--h29-settled-h") !== "", held: box.dataset.held, minBlock: getComputedStyle(box).minBlockSize } : null; },
};
