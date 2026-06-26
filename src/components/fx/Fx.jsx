import React, { useRef, useEffect } from "react";

// ===== מחולל אפקטים תלת-ממדיים קלים (canvas) — לשימוש חוזר בכל מקום =====
// <Fx kind="starfield" /> · "grid" · "constellation" · "numbers" · "vortex"
// כל אפקט: ~25fps, מכבד prefers-reduced-motion, עוצר כשהטאב מוסתר.

const KEY_NUMS = ["67", "506", "1820", "424", "126", "218", "456", "45"];

// ── פונקציות הציור לכל סוג (ctx, w, h, S=state, color, t) ──
const STEPS = {
  // 1) שדה כוכבים — טיסה קדימה (warp)
  starfield(ctx, w, h, S, color) {
    if (!S.init) { S.init = true; S.stars = Array.from({ length: 140 }, () => ({ x: (Math.random() - 0.5) * w, y: (Math.random() - 0.5) * h, z: Math.random() * w })); }
    ctx.fillStyle = "rgba(7,11,18,0.35)"; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (const s of S.stars) {
      s.z -= w * 0.012; if (s.z <= 1) { s.z = w; s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; }
      const k = 128 / s.z, sx = cx + s.x * k, sy = cy + s.y * k, r = (1 - s.z / w) * 2.4;
      ctx.fillStyle = r > 1.6 ? "#eaf6ff" : color;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.4, r), 0, 6.3); ctx.fill();
    }
  },

  // 2) רשת סינתוויב — מישור פרספקטיבה זורם
  grid(ctx, w, h, S, color, t) {
    ctx.fillStyle = "rgba(7,11,18,0.4)"; ctx.fillRect(0, 0, w, h);
    const hz = h * 0.42, vx = w / 2, off = (t * 0.0009) % 1;
    ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {            // קווים אופקיים שמתרחקים
      const p = (i + off) / 12, y = hz + (h - hz) * p * p;
      ctx.globalAlpha = 0.12 + 0.4 * p; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.32;
    for (let i = -7; i <= 7; i++) {            // קווים אנכיים → נקודת מגוז
      ctx.beginPath(); ctx.moveTo(vx + i * (w / 7), h); ctx.lineTo(vx + i * 7, hz); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // 3) קונסטלציה — נקודות מרחפות + קווי חיבור
  constellation(ctx, w, h, S, color) {
    if (!S.init) { S.init = true; S.pts = Array.from({ length: 46 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 })); }
    ctx.clearRect(0, 0, w, h);
    const P = S.pts;
    for (const p of P) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d2 = dx * dx + dy * dy;
      if (d2 < 8000) { ctx.strokeStyle = color; ctx.globalAlpha = 1 - d2 / 8000; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke(); }
    }
    ctx.globalAlpha = 1; ctx.fillStyle = "#eaf6ff";
    for (const p of P) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.3); ctx.fill(); }
  },

  // 4) מספרים מרחפים — מספרי-מפתח עם עומק (parallax)
  numbers(ctx, w, h, S, color) {
    if (!S.init) { S.init = true; S.ns = Array.from({ length: 16 }, () => ({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 1.7, s: KEY_NUMS[(Math.random() * KEY_NUMS.length) | 0] })); }
    ctx.fillStyle = "rgba(7,11,18,0.28)"; ctx.fillRect(0, 0, w, h);
    for (const n of S.ns) {
      n.y -= n.z * 0.5; if (n.y < -20) { n.y = h + 20; n.x = Math.random() * w; n.s = KEY_NUMS[(Math.random() * KEY_NUMS.length) | 0]; }
      ctx.globalAlpha = 0.25 + n.z * 0.35; ctx.fillStyle = color;
      ctx.font = `${(10 + n.z * 14) | 0}px monospace`; ctx.fillText(n.s, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  },

  // 5) מערבולת — חלקיקים מסתחררים סביב ליבה
  vortex(ctx, w, h, S, color, t) {
    if (!S.init) { S.init = true; S.ps = Array.from({ length: 120 }, (_, i) => ({ a: Math.random() * 6.3, r: 6 + Math.random() * (Math.min(w, h) * 0.45), sp: 0.004 + Math.random() * 0.02 })); }
    ctx.fillStyle = "rgba(7,11,18,0.3)"; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (const p of S.ps) {
      p.a += p.sp; p.r -= 0.12; if (p.r < 4) p.r = 6 + Math.random() * (Math.min(w, h) * 0.45);
      const x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r * 0.6;
      ctx.fillStyle = p.r < 30 ? "#eaf6ff" : color; ctx.globalAlpha = 0.3 + (1 - p.r / (Math.min(w, h) * 0.45)) * 0.6;
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

export default function Fx({ kind = "starfield", color = "#7fc8ff" }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const step = STEPS[kind] || STEPS.starfield;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, last = 0, hidden = false, S = {};
    const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; S = {}; };
    resize();
    const loop = (t) => { raf = requestAnimationFrame(loop); if (hidden || t - last < 40) return; last = t; try { step(ctx, w, h, S, color, t); } catch { /* ignore */ } };
    const onVis = () => { hidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);
    if (reduce) { try { step(ctx, w, h, S, color, 0); } catch { /* ignore */ } }   // פריים יחיד אם כיבו תנועה
    else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
  }, [kind, color]);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

// מטא לתצוגת הגלריה (שם + תיאור לכל אפקט)
export const FX_LIST = [
  { kind: "starfield", label: "שדה כוכבים", desc: "טיסה קדימה בין הכוכבים" },
  { kind: "grid", label: "רשת סינתוויב", desc: "מישור פרספקטיבה זורם" },
  { kind: "constellation", label: "קונסטלציה", desc: "נקודות מתחברות בקווים" },
  { kind: "numbers", label: "מספרים מרחפים", desc: "מספרי-המפתח עולים בעומק" },
  { kind: "vortex", label: "מערבולת", desc: "חלקיקים סביב הליבה" },
];
