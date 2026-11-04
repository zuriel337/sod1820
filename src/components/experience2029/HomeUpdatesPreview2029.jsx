// Illustration for the closed "עדכונים אחרונים" card: how publications will later link along time.
// Presentation only: no reader, no data, no tree and no verified connection. The numbers are a
// labelled example, so nothing here can be mistaken for an active feed, tree or measurement.
import React from "react";

// Three coupled cars (like a train chain), each dropping a stem to a point on a thin time axis.
// RTL: the first car is on the right. The numbers are the illustrative example 14 / 140 / 16.
const CARS = [
  { n: "14", x: 262, i: 0 },
  { n: "140", x: 146, i: 1 },
  { n: "16", x: 30, i: 2 },
];
const CAR_W = 68;
const CAR_Y = 6;
const CAR_H = 42;
const MID = CAR_Y + 26;
const AXIS_Y = 72;

export default function HomeUpdatesPreview2029() {
  return <figure className="h29-chain" data-home-updates-preview="illustration">
    <svg viewBox="0 0 360 82" role="img" aria-label="המחשה בלבד: שלושה פרסומים מחוברים בשרשרת לאורך ציר זמן. המספרים דוגמה, ואינם קשרים מאומתים או נתונים חיים.">
      <defs>
        <linearGradient id="h29-chain-sweep" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--s29-brand-gold)", stopOpacity: 0 }} />
          <stop offset=".5" style={{ stopColor: "var(--s29-brand-gold)", stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: "var(--s29-brand-gold)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <line className="h29-chain-axis" x1="10" x2="350" y1={AXIS_Y} y2={AXIS_Y} />
      {CARS.map(car => <g key={`stem-${car.n}`} className="h29-chain-stem" style={{ "--i": car.i }}>
        <line x1={car.x + CAR_W / 2} x2={car.x + CAR_W / 2} y1={CAR_Y + CAR_H} y2={AXIS_Y} />
        <circle cx={car.x + CAR_W / 2} cy={AXIS_Y} r="3.5" />
      </g>)}
      {[0, 1].map(link => {
        const right = CARS[link].x;
        const left = CARS[link + 1].x + CAR_W;
        return <g key={link} className="h29-chain-link" style={{ "--i": link }}>
          <line x1={left} x2={right} y1={MID} y2={MID} />
          <circle cx={(left + right) / 2 - 5} cy={MID} r="4.5" />
          <circle cx={(left + right) / 2 + 5} cy={MID} r="4.5" />
        </g>;
      })}
      {CARS.map(car => <g key={car.n} className="h29-chain-car" style={{ "--i": car.i }}>
        <rect x={car.x} y={CAR_Y} width={CAR_W} height={CAR_H} rx="11" />
        <text x={car.x + CAR_W / 2} y={MID - 1} textAnchor="middle">{car.n}</text>
        <line className="h29-chain-bar" x1={car.x + 22} x2={car.x + CAR_W - 22} y1={CAR_Y + CAR_H - 9} y2={CAR_Y + CAR_H - 9} />
      </g>)}
      <rect className="h29-chain-sweep" x="10" y={CAR_Y - 4} width="70" height={AXIS_Y - CAR_Y + 10} rx="16" fill="url(#h29-chain-sweep)" />
    </svg>
  </figure>;
}
