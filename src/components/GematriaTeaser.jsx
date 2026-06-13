import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { C, F, GEM } from "../theme.js";

// ===== טעימת מנוע הגימטריה — קליפ תלת-מימדי מחזורי לבית המדרש =====
// מציג מילה בכמה שיטות (רגיל · מילוי · מסתתר) עם תיבות-ערך תלת-מימדיות.
// ערכים תואמים ל-bidim במסד (המקור המאומת). פסיבי — בלי קלט (טעימה בלבד).

// מילוי (איות מאומת מול bidim): התגלות=1026, חכמה=613, משיח=878.
const MILUI = { "א": 111, "ב": 412, "ג": 83, "ד": 434, "ה": 15, "ו": 22, "ז": 67, "ח": 418, "ט": 419, "י": 20, "כ": 100, "ך": 100, "ל": 74, "מ": 80, "ם": 80, "נ": 106, "ן": 106, "ס": 120, "ע": 130, "פ": 81, "ף": 81, "צ": 104, "ץ": 104, "ק": 186, "ר": 510, "ש": 360, "ת": 416 };
const WORDS = ["התגלות", "חכמה", "משיח", "גאולה"];
const METHODS = [
  { key: "רגיל", sub: "חיבור ערכי האותיות" },
  { key: "מילוי", sub: "ערך שם האות המלא" },
  { key: "מסתתר", sub: "ההפרשים בין אותיות" },
];

const lettersOf = w => [...w].filter(c => GEM[c] != null);

// פריטי השיטה: תחת כל אות (רגיל/מילוי) או בין אותיות (מסתתר).
function methodItems(word, method, lx) {
  const L = lettersOf(word);
  if (method === 2) {
    const out = [];
    for (let i = 0; i < L.length - 1; i++) out.push({ value: Math.abs(GEM[L[i]] - GEM[L[i + 1]]), x: (lx(i, L.length) + lx(i + 1, L.length)) / 2, between: true });
    return out;
  }
  const map = method === 1 ? MILUI : GEM;
  return L.map((ch, i) => ({ value: map[ch] || 0, x: lx(i, L.length) }));
}

function hebTile(ch) {
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.font = "bold 168px 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.95)"; g.shadowBlur = 30; g.fillStyle = "#f6e27a"; g.fillText(ch, s / 2, s / 2 + 12);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function numTile(n) {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.fillStyle = "#130d02"; g.fillRect(0, 0, s, s); g.strokeStyle = "#d4af37"; g.lineWidth = 8; g.strokeRect(7, 7, s - 14, s - 14);
  g.font = "bold 50px 'Courier New', monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f6e27a"; g.fillText(String(n), s / 2, s / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function makeGlow() {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d"); const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "#ffd86b"); grd.addColorStop(0.25, "#ffd86b"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s); return new THREE.CanvasTexture(cv);
}

function Dust() {
  const ref = useRef(); const tex = useMemo(makeGlow, []);
  const geo = useMemo(() => {
    const n = 400, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = 4 + Math.random() * 12, t = Math.random() * 6.28; p[i * 3] = Math.cos(t) * r; p[i * 3 + 1] = (Math.random() - 0.5) * 9; p[i * 3 + 2] = Math.sin(t) * r - 3; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });
  return <points ref={ref} geometry={geo}><pointsMaterial map={tex} size={0.4} transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#ffd86b" opacity={0.8} /></points>;
}

function Letter({ tex, x }) {
  const ref = useRef();
  useFrame((st, dt) => { if (!ref.current) return; ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 1.05, Math.min(1, dt * 3))); ref.current.position.y = 0.45 + Math.sin(st.clock.elapsedTime + x) * 0.05; });
  return <sprite ref={ref} position={[x, 0.45, 0]} scale={0.001}><spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>;
}
function Box({ value, x }) {
  const ref = useRef(); const tex = useMemo(() => numTile(value), [value]);
  useFrame((st, dt) => { if (!ref.current) return; ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 0.78, Math.min(1, dt * 3.4))); ref.current.rotation.y += dt * 0.9; });
  return <mesh ref={ref} position={[x, -0.95, 0]} scale={0.001}><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial map={tex} color="#caa83a" emissive="#3a2c00" emissiveIntensity={0.5} metalness={0.5} roughness={0.35} /></mesh>;
}

function Scene({ word, method }) {
  const L = useMemo(() => lettersOf(word), [word]);
  const lx = (i, n) => (i - (n - 1) / 2) * 1.3;
  const tex = useMemo(() => L.map(hebTile), [L]);
  const items = useMemo(() => methodItems(word, method, lx), [word, method]);
  return (
    <>
      <color attach="background" args={["#070414"]} />
      <fog attach="fog" args={["#070414", 9, 26]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 4, 6]} intensity={1.1} color="#fff3cf" />
      <Stars radius={50} depth={30} count={1400} factor={3} fade speed={0.4} />
      <Dust />
      <group key={word}>{L.map((_, i) => <Letter key={i} tex={tex[i]} x={lx(i, L.length)} />)}</group>
      <group key={`${word}-${method}`}>{items.map((it, i) => <Box key={i} value={it.value} x={it.x} />)}</group>
    </>
  );
}

function Odometer({ to, k }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0; const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / 900); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, k]);
  return <span>{v}</span>;
}

export default function GematriaTeaser() {
  const [step, setStep] = useState(0);
  useEffect(() => { const t = setInterval(() => setStep(s => s + 1), 4600); return () => clearInterval(t); }, []);
  const method = step % 3;
  const word = WORDS[Math.floor(step / 3) % WORDS.length];
  const total = useMemo(() => methodItems(word, method, (i, n) => i).reduce((s, it) => s + it.value, 0), [word, method]);

  return (
    <div style={{ position: "relative", height: "min(74vh, 640px)", borderRadius: 18, overflow: "hidden", border: `1px solid ${C.borderGold}`, background: "#070414", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", direction: "rtl" }}>
      <Canvas camera={{ position: [0, 0, 7.6], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene word={word} method={method} />
      </Canvas>

      {/* טאבים של השיטות */}
      <div style={{ position: "absolute", top: 12, insetInline: 0, display: "flex", gap: 8, justifyContent: "center", pointerEvents: "none" }}>
        {METHODS.map((m, i) => (
          <span key={m.key} style={{
            fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "5px 14px", borderRadius: 999,
            border: `1px solid ${i === method ? C.gold : C.border}`,
            background: i === method ? "rgba(212,175,55,0.16)" : "rgba(8,5,16,0.5)",
            color: i === method ? C.goldBright : C.goldDim, transition: "all .3s",
          }}>{m.key}</span>
        ))}
      </div>

      {/* כותרת השיטה + המילה */}
      <div style={{ position: "absolute", top: 54, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13 }}>{METHODS[method].sub}</div>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 700, marginTop: 2, textShadow: "0 0 30px rgba(212,175,55,0.4)" }}>{word}</div>
      </div>

      {/* הסכום */}
      <div style={{ position: "absolute", bottom: 56, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 2 }}>{METHODS[method].key} = </span>
        <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 34, fontWeight: 800 }}><Odometer to={total} k={`${word}-${method}`} /></span>
      </div>

      {/* תווית סגור */}
      <div style={{ position: "absolute", bottom: 14, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(8,5,16,0.6)", color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, backdropFilter: "blur(6px)" }}>
          🔒 בקרוב · המנוע המלא נפתח בבית המדרש
        </span>
      </div>
    </div>
  );
}
