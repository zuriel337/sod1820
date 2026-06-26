import React, { useRef, useEffect } from "react";

// ===== מטריקס דיגיטל-ריין — רקע canvas קל לבית-הקוד =====
// קוד נופל (ספרות + אותיות עבריות). ~18fps, מכבד prefers-reduced-motion,
// עוצר כשהטאב מוסתר. position:absolute מאחורי תוכן ההירו, pointer-events:none.

const CHARS = "0123456789אבגדהוזחטיכלמנסעפצקרשת67·506·1820·424".split("");

export default function MatrixRain({ color = "#7fc8ff", fontSize = 16 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, cols = 0, drops = [], raf = 0, last = 0, hidden = false;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      cols = Math.max(1, Math.floor(w / fontSize));
      drops = Array.from({ length: cols }, () => Math.floor(Math.random() * (h / fontSize)));
    }
    resize();

    function draw(t) {
      raf = requestAnimationFrame(draw);
      if (hidden || t - last < 55) return;   // ~18fps — חסכוני
      last = t;
      ctx.fillStyle = "rgba(7,11,18,0.16)";   // דהייה — שובל הקוד
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = CHARS[(Math.random() * CHARS.length) | 0];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // ראש הזרם בהיר, השובל בצבע האקסנט
        ctx.fillStyle = Math.random() > 0.92 ? "#eaf6ff" : color;
        ctx.fillText(ch, x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    const onVis = () => { hidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);
    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [color, fontSize]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4, pointerEvents: "none" }}
    />
  );
}
