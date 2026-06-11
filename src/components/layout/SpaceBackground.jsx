import React from "react";

// רקע החלל/העיר הקבוע של האתר — נשמר מהעיצוב הקיים.
const genStars = (n, spread) =>
  Array.from({ length: n }, () => {
    const x = Math.floor(Math.random() * spread);
    const y = Math.floor(Math.random() * spread);
    const o = (0.12 + Math.random() * 0.65).toFixed(2);
    return `${x}px ${y}px 0 0 rgba(255,255,255,${o})`;
  }).join(',');

const STARS_SM = genStars(180, 2400);

export default function SpaceBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* city night photo — LA skyline */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        opacity: 0.28,
      }} />
      {/* strong center mask — keeps text readable, city glows at edges */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 80% at 50% 48%, rgba(7,5,14,0.97) 0%, rgba(7,5,14,0.85) 40%, rgba(7,5,14,0.45) 68%, rgba(7,5,14,0.08) 100%)",
      }} />
      {/* crimson glow top + royal purple bottom */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse at 50% -10%, rgba(122,19,32,0.30) 0%, transparent 55%)",
          "radial-gradient(ellipse at 50% 110%, rgba(61,31,92,0.25) 0%, transparent 50%)",
          "radial-gradient(ellipse at 15% 25%, rgba(80,30,150,0.14) 0%, transparent 48%)",
          "radial-gradient(ellipse at 85% 70%, rgba(122,19,32,0.12) 0%, transparent 44%)",
        ].join(','),
      }} />
      {/* subtle stars over the city */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, boxShadow: STARS_SM, opacity: 0.35 }} />
    </div>
  );
}
