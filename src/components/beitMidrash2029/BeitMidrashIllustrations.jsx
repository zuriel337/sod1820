import React from "react";

/*
 * Presentational teaching illustrations. They draw shapes and lay out words the lesson already has;
 * they read no data, calculate nothing and are never evidence. Decorative drawings are aria-hidden.
 */

// Fibonacci tiling (squares 8,5,3,2,1,1) with its quarter-arc spiral: geometry only, no numbers.
export function FibonacciSpiral() {
  return <svg className="bm-illo bm-spiral" viewBox="-0.6 -0.6 14.2 9.2" aria-hidden="true" focusable="false" data-illustration="fibonacci-spiral">
    <g className="bm-spiral-grid">
      <rect x="0" y="0" width="8" height="8" />
      <rect x="8" y="0" width="5" height="5" />
      <rect x="10" y="5" width="3" height="3" />
      <rect x="8" y="6" width="2" height="2" />
      <rect x="8" y="5" width="1" height="1" />
      <rect x="9" y="5" width="1" height="1" />
    </g>
    <path className="bm-spiral-path" pathLength="1" d="M0 8A8 8 0 0 1 8 0A5 5 0 0 1 13 5A3 3 0 0 1 10 8A2 2 0 0 1 8 6A1 1 0 0 1 9 5A1 1 0 0 1 10 6" />
  </svg>;
}

const SOURCE_STEPS = Object.freeze(["מקור", "הקשר", "ציטוט", "בדיקה"]);

// Source → context → quotation → check, as a real list so it reads in order for assistive tech.
export function SourceTrail() {
  return <ol className="bm-source-trail" aria-label="סדר הקריאה במקור" data-illustration="source-trail">
    {SOURCE_STEPS.map((step, index) => <li key={step} style={{ "--bm-i": index }}>
      <span className="bm-trail-node" aria-hidden="true">{index + 1}</span>
      <strong>{step}</strong>
    </li>)}
  </ol>;
}

// One dot per step of a learning path; the written steps stay the accessible content.
export function PathTrail({ steps }) {
  const count = steps > 0 ? Math.min(8, Math.trunc(steps)) : 1;
  return <span className="bm-path-trail" aria-hidden="true" data-illustration="path-trail" data-steps={count}>
    {[...new Array(count).keys()].map((index) => <i key={index} style={{ "--bm-i": index }} />)}
  </span>;
}

// Lines meeting at one point (crossing) or scattered points settling into a ring (convergence).
export function MeetingIllustration({ kind }) {
  return <span className="bm-meeting" data-illustration={`meeting-${kind}`}>
    <svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">
      {kind === "convergence" ? <>
        <circle className="bm-meeting-ring" cx="60" cy="32" r="18" />
        <circle className="bm-meeting-dot" cx="14" cy="14" r="3" />
        <circle className="bm-meeting-dot" cx="106" cy="12" r="3" />
        <circle className="bm-meeting-dot" cx="18" cy="52" r="3" />
        <circle className="bm-meeting-dot" cx="104" cy="54" r="3" />
        <circle className="bm-meeting-core" cx="60" cy="32" r="4" />
      </> : <>
        <path className="bm-meeting-line" pathLength="1" d="M6 8 60 32" />
        <path className="bm-meeting-line" pathLength="1" d="M6 56 60 32" />
        <path className="bm-meeting-line" pathLength="1" d="M114 32H60" />
        <circle className="bm-meeting-core" cx="60" cy="32" r="4.5" />
      </>}
    </svg>
    <small>המחשה בלבד</small>
  </span>;
}
