import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { C, F, GEM } from "../theme.js";

// ===== טעימת מנוע הגימטריה — קליפ תלת-מימדי מחזורי לבית המדרש =====
// מציג מילה בכמה שיטות (רגיל · מילוי · מסתתר) עם תיבות-ערך תלת-מימדיות.
// ערכים תואמים ל-bidim במסד (המקור המאומת). פסיבי — בלי קלט (טעימה בלבד).

// מילוי — שם האות המלא וערכו (איות מאומת מול bidim: התגלות=1026, חכמה=613, משיח=878).
const MILUI_NAME = { "א": "אלף", "ב": "בית", "ג": "גימל", "ד": "דלת", "ה": "הי", "ו": "ויו", "ז": "זין", "ח": "חית", "ט": "טית", "י": "יוד", "כ": "כף", "ך": "כף", "ל": "למד", "מ": "מם", "ם": "מם", "נ": "נון", "ן": "נון", "ס": "סמך", "ע": "עין", "פ": "פא", "ף": "פא", "צ": "צדי", "ץ": "צדי", "ק": "קוף", "ר": "ריש", "ש": "שין", "ת": "תיו" };
const MILUI = Object.fromEntries(Object.entries(MILUI_NAME).map(([k, v]) => [k, [...v].reduce((s, c) => s + (GEM[c] || 0), 0)]));

// הסבר החישוב לפי השיטה — איך מגיעים לכל ערך.
function explain(word, method) {
  const L = lettersOf(word);
  if (method === 0) return L.map(c => `${c}=${GEM[c]}`).join("  ·  ");
  if (method === 1) return L.map(c => `${c}→${MILUI_NAME[c]} (${MILUI[c]})`).join("  ·  ");
  const out = [];
  for (let i = 0; i < L.length - 1; i++) out.push(`|${L[i]}−${L[i + 1]}|=${Math.abs(GEM[L[i]] - GEM[L[i + 1]])}`);
  return out.join("  ·  ");
}
const WORDS = ["התגלות", "חכמה", "משיח", "גאולה"];
const METHODS = [
  { key: "רגיל", sub: "חיבור ערכי האותיות", desc: "סוכמים את הערך המספרי של כל אות במילה." },
  { key: "מילוי", sub: "ערך שם האות המלא", desc: "כותבים את שֵם כל אות במלואו (א→אלף) וסוכמים את ערכו." },
  { key: "מסתתר", sub: "ההפרשים בין אותיות", desc: "מחשבים את ההפרש בין כל שתי אותיות סמוכות, וסוכמים — מה שמסתתר ביניהן." },
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
  // רקע כהה + מסגרת זהב כדי שהאות תיקרא בבירור
  g.fillStyle = "rgba(6,4,14,0.92)"; g.fillRect(20, 20, s - 40, s - 40);
  g.lineWidth = 6; g.strokeStyle = "#d4af37"; g.strokeRect(20, 20, s - 40, s - 40);
  g.font = "900 176px 'Arial Hebrew', 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.9)"; g.shadowBlur = 22; g.fillStyle = "#ffe9a8"; g.fillText(ch, s / 2, s / 2 + 14);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function numTile(n) {
  const s = 192, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.fillStyle = "#130d02"; g.fillRect(0, 0, s, s); g.strokeStyle = "#d4af37"; g.lineWidth = 10; g.strokeRect(8, 8, s - 16, s - 16);
  const str = String(n);
  g.font = `bold ${str.length >= 4 ? 78 : 96}px 'Courier New', monospace`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.6)"; g.shadowBlur = 12; g.fillStyle = "#f6e27a"; g.fillText(str, s / 2, s / 2 + 4);
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
  useFrame((st, dt) => { if (!ref.current) return; ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 1.35, Math.min(1, dt * 3))); ref.current.position.y = 1.95 + Math.sin(st.clock.elapsedTime + x) * 0.05; });
  return <sprite ref={ref} position={[x, 1.95, 0]} scale={0.001}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>;
}
function Box({ value, x }) {
  const ref = useRef(); const tex = useMemo(() => numTile(value), [value]);
  // תנודה עדינה (לא סיבוב מלא) — כדי שהמספר יישאר קריא
  useFrame((st, dt) => { if (!ref.current) return; ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 1.0, Math.min(1, dt * 3.4))); ref.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.8 + x) * 0.35; });
  return <mesh ref={ref} position={[x, 0.85, 0]} scale={0.001}><boxGeometry args={[0.92, 0.92, 0.92]} /><meshStandardMaterial map={tex} color="#caa83a" emissive="#3a2c00" emissiveIntensity={0.55} metalness={0.5} roughness={0.35} /></mesh>;
}

function Scene({ word, method }) {
  const L = useMemo(() => lettersOf(word), [word]);
  // עברית מימין לשמאל: האות הראשונה בצד ימין (x חיובי).
  const lx = (i, n) => ((n - 1) / 2 - i) * 1.6;
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

// אווירה ג'נרטיבית רכה (Web Audio) — דרון קוסמי בלי קובץ, כ"מוזיקה אחרת".
function startAmbient() {
  const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.6; lp.connect(master);
  const freqs = [110, 164.81, 220, 277.18];   // A2 · E3 · A3 · C#4 — אקורד פתוח
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
    const g = ctx.createGain(); g.gain.value = 0.16 / (i + 1);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04 + 0.025 * i;
    const lg = ctx.createGain(); lg.gain.value = 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    o.connect(g); g.connect(lp); o.start();
  });
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.2);
  return { ctx, master };
}
function stopAmbient(a) {
  try {
    a.master.gain.cancelScheduledValues(a.ctx.currentTime);
    a.master.gain.setValueAtTime(a.master.gain.value, a.ctx.currentTime);
    a.master.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
    setTimeout(() => { try { a.ctx.close(); } catch {} }, 700);
  } catch {}
}

export default function GematriaTeaser() {
  const [wordIdx, setWordIdx] = useState(0);
  const [method, setMethod] = useState(0);
  const [sound, setSound] = useState(false);
  const ambRef = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setMethod(m => { const nm = (m + 1) % 3; if (nm === 0) setWordIdx(w => (w + 1) % WORDS.length); return nm; }), 8800);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => { if (ambRef.current) stopAmbient(ambRef.current); }, []);
  const word = WORDS[wordIdx];
  const total = useMemo(() => methodItems(word, method, (i, n) => i).reduce((s, it) => s + it.value, 0), [word, method]);
  const breakdown = useMemo(() => explain(word, method), [word, method]);

  function toggleSound() {
    if (ambRef.current) { stopAmbient(ambRef.current); ambRef.current = null; setSound(false); }
    else { ambRef.current = startAmbient(); setSound(!!ambRef.current); }
  }

  return (
    <div style={{ position: "relative", height: "min(74vh, 640px)", borderRadius: 18, overflow: "hidden", border: `1px solid ${C.borderGold}`, background: "#070414", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", direction: "rtl" }}>
      <Canvas camera={{ position: [0, 0.7, 9.4], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene word={word} method={method} />
      </Canvas>

      {/* מוזיקה ג'נרטיבית (בלחיצה) */}
      <button onClick={toggleSound} aria-label="מוזיקה" style={{
        position: "absolute", top: 12, insetInlineStart: 12, width: 38, height: 38, borderRadius: "50%", cursor: "pointer",
        border: `1px solid ${C.borderGold}`, background: sound ? "rgba(212,175,55,0.2)" : "rgba(8,5,16,0.6)", color: C.goldBright, fontSize: 16, backdropFilter: "blur(6px)",
      }}>{sound ? "🔊" : "🎵"}</button>

      {/* טאבים של השיטות — לחיצים */}
      <div style={{ position: "absolute", top: 12, insetInline: 0, display: "flex", gap: 8, justifyContent: "center" }}>
        {METHODS.map((m, i) => (
          <button key={m.key} onClick={() => setMethod(i)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "6px 15px", borderRadius: 999,
            border: `1px solid ${i === method ? C.gold : C.border}`,
            background: i === method ? "rgba(212,175,55,0.18)" : "rgba(8,5,16,0.5)",
            color: i === method ? C.goldBright : C.goldDim, transition: "all .25s", backdropFilter: "blur(6px)",
          }}>{m.key}</button>
        ))}
      </div>

      {/* הסבר השיטה — ברור, כדי שיהיה זמן להבין */}
      <div style={{ position: "absolute", top: 52, insetInline: 0, textAlign: "center", pointerEvents: "none", padding: "0 16px" }}>
        <span key={method} style={{
          display: "inline-block", maxWidth: 560, color: C.goldLight, fontFamily: F.body, fontSize: "clamp(13px,2.6vw,15.5px)", lineHeight: 1.7,
          background: "rgba(6,4,14,0.6)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 16px", backdropFilter: "blur(6px)",
          animation: "teaserIn .5s ease both",
        }}>{METHODS[method].desc}</span>
      </div>

      {/* ★ הלב: המספר הגדול במרכז, עם הסבר יפה ★ */}
      <div style={{ position: "absolute", insetInline: 0, top: "60%", transform: "translateY(-50%)", textAlign: "center", pointerEvents: "none", padding: "0 16px" }}>
        <div key={`${word}-${method}`} style={{ position: "relative", display: "inline-block", animation: "teaserIn .6s ease both" }}>
          <span style={{ position: "absolute", inset: "-40% -30%", background: "radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)", filter: "blur(6px)" }} />
          <div style={{ position: "relative", color: C.goldDim, fontFamily: F.heading, fontSize: 14, letterSpacing: 3 }}>{word} · {METHODS[method].key}</div>
          <div style={{ position: "relative", color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(58px,13vw,118px)", fontWeight: 800, lineHeight: 1, textShadow: "0 0 50px rgba(246,226,122,0.5)" }}>
            <Odometer to={total} k={`${word}-${method}`} />
          </div>
          <div style={{ position: "relative", marginTop: 14, display: "inline-block", maxWidth: 580, color: C.goldLight, fontFamily: F.mono, fontSize: "clamp(12px,2.5vw,15px)", lineHeight: 1.8, background: "rgba(8,5,16,0.55)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 15px" }}>
            {breakdown}
          </div>
        </div>
      </div>

      <style>{`@keyframes teaserIn { from { opacity:0; transform:translateY(10px) scale(.97);} to { opacity:1; transform:translateY(0) scale(1);} }`}</style>

      {/* תווית סגור */}
      <div style={{ position: "absolute", bottom: 14, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(8,5,16,0.6)", color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, backdropFilter: "blur(6px)" }}>
          🔒 בקרוב · המנוע המלא נפתח בבית המדרש
        </span>
      </div>
    </div>
  );
}
