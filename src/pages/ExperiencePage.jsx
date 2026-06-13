import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

// ===== דף ניסיון: "היכל האור 1820" — חוויית מסך-מלא קולנועית =====
// שער זהב תלת-מימדי, אבק זהב, מספרי מפתח זורמים פנימה, מצלמה שעפה אל תוך האור,
// וכל הסצנה "נושמת" עם המוזיקה (ניתוח אודיו חי). מוזיקת פרימיום דרך חריץ קובץ.

const KEY_NUMS = [1, 3, 7, 14, 26, 45, 72, 358, 400, 474, 888, 1237, 1820, 2701];

// טקסטורת זוהר רכה (radial) — לאבק ולהילת השער.
function makeGlow(color = "#ffe6a0") {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, color); grd.addColorStop(0.25, color);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv); return t;
}

// טקסטורת מספר זוהר.
function makeNumber(n) {
  const w = 256, h = 128, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.font = "bold 84px 'Courier New', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.95)"; g.shadowBlur = 22;
  g.fillStyle = "#f6e27a"; g.fillText(String(n), w / 2, h / 2);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// אבק זהב מרחף.
function GoldDust() {
  const ref = useRef();
  const tex = useMemo(() => makeGlow("#ffd86b"), []);
  const geo = useMemo(() => {
    const count = 1100, pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 22, th = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = Math.sin(th) * r - 6;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.018; });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial map={tex} size={0.45} sizeAttenuation transparent depthWrite={false}
        blending={THREE.AdditiveBlending} color="#ffd86b" opacity={0.9} />
    </points>
  );
}

// שער הזהב — טבעות זוהרות שמסתובבות ונושמות עם המוזיקה.
function Portal({ audio }) {
  const grp = useRef();
  const halo = useMemo(() => makeGlow("#ffefb0"), []);
  useFrame((_, dt) => {
    if (!grp.current) return;
    grp.current.rotation.z += dt * 0.07;
    const lvl = audio.current ? audio.current.level() : 0;
    const sc = 1 + lvl * 0.5;
    grp.current.scale.setScalar(sc);
  });
  return (
    <group ref={grp} position={[0, 0, -6]}>
      <sprite scale={[11, 11, 1]}>
        <spriteMaterial map={halo} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {[2.1, 2.6, 3.15, 3.8].map((r, i) => (
        <mesh key={i} rotation={[0, 0, i * 0.35]}>
          <torusGeometry args={[r, 0.035 + i * 0.012, 18, 160]} />
          <meshBasicMaterial color={i % 2 ? "#fff2c0" : "#e8c840"} transparent opacity={0.85}
            blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// מספרי מפתח שזורמים אל תוך השער (לכיוון הצופה).
function NumberStream() {
  const N = 50;
  const refs = useRef([]);
  const sprites = useMemo(() => Array.from({ length: N }, () => {
    const n = KEY_NUMS[Math.floor(Math.random() * KEY_NUMS.length)];
    return {
      tex: makeNumber(n),
      x: (Math.random() - 0.5) * 18,
      y: (Math.random() - 0.5) * 12,
      z: -20 - Math.random() * 30,
      sp: 2 + Math.random() * 4,
      sc: 0.7 + Math.random() * 1.1,
    };
  }), []);
  useFrame((_, dt) => {
    sprites.forEach((s, i) => {
      s.z += s.sp * dt;
      if (s.z > 7) { s.z = -34 - Math.random() * 10; s.x = (Math.random() - 0.5) * 18; s.y = (Math.random() - 0.5) * 12; }
      const m = refs.current[i];
      if (m) {
        m.position.set(s.x, s.y, s.z);
        const k = THREE.MathUtils.clamp((s.z + 20) / 26, 0, 1);
        m.material.opacity = k * 0.9;
        m.scale.set(s.sc * 2, s.sc, 1);
      }
    });
  });
  return sprites.map((s, i) => (
    <sprite key={i} ref={el => (refs.current[i] = el)}>
      <spriteMaterial map={s.tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  ));
}

// מצלמה — ריחוף עדין, ובכניסה עפה אל תוך השער.
function Rig({ entered }) {
  const p = useRef(0);
  useFrame((st, dt) => {
    p.current += ((entered ? 1 : 0) - p.current) * Math.min(1, dt * 0.5);
    const z = THREE.MathUtils.lerp(10, 1.6, p.current);
    const t = st.clock.elapsedTime;
    st.camera.position.set(Math.sin(t * 0.05) * 0.7, Math.cos(t * 0.04) * 0.5, z);
    st.camera.lookAt(0, 0, -6);
  });
  return null;
}

export default function ExperiencePage() {
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioEl = useRef(null);
  const audio = useRef(null);   // { level() }
  const ctxRef = useRef(null);

  useEffect(() => {
    document.title = "היכל האור 1820 · דף ניסיון · סוד 1820";
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function setupAudio() {
    if (ctxRef.current || !audioEl.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx(); ctxRef.current = ctx;
      const src = ctx.createMediaElementSource(audioEl.current);
      const an = ctx.createAnalyser(); an.fftSize = 64;
      const data = new Uint8Array(an.frequencyBinCount);
      src.connect(an); an.connect(ctx.destination);
      audio.current = {
        level() {
          an.getByteFrequencyData(data);
          let s = 0; for (let i = 0; i < 8; i++) s += data[i];
          return (s / 8) / 255;
        },
      };
    } catch { /* אם נכשל — הסצנה תרוץ בלי תגובה לאודיו */ }
  }

  async function enter() {
    setupAudio();
    try { await ctxRef.current?.resume?.(); } catch {}
    try { await audioEl.current?.play?.(); } catch {}
    try { await document.documentElement.requestFullscreen?.(); } catch {}
    setEntered(true);
  }

  function toggleMute() {
    const a = audioEl.current; if (!a) return;
    a.muted = !a.muted; setMuted(a.muted);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05030d", zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#05030d"]} />
        <fog attach="fog" args={["#05030d", 12, 40]} />
        <Stars radius={80} depth={50} count={3500} factor={4} saturation={0} fade speed={0.6} />
        <GoldDust />
        <Portal audio={audio} />
        <NumberStream />
        <Rig entered={entered} />
      </Canvas>

      {/* הבזק אור בכניסה */}
      <div style={{
        position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, #fff7df, transparent 60%)",
        opacity: entered ? 0 : 0, pointerEvents: "none", transition: "opacity 1.2s ease",
        animation: entered ? "flash 1.6s ease forwards" : "none",
      }} />

      {/* שכבת תוכן */}
      <div style={{
        position: "absolute", inset: 0, direction: "rtl", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none",
        padding: 24,
      }}>
        {!entered && (
          <div style={{ pointerEvents: "auto", maxWidth: 560, animation: "rise 1s ease both" }}>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 6, textTransform: "uppercase", marginBottom: 14 }}>
              דף ניסיון
            </div>
            <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(40px,9vw,86px)", fontWeight: 700, margin: 0, textShadow: "0 0 60px rgba(212,175,55,0.5)" }}>
              היכל האור
            </h1>
            <div style={{ color: C.goldLight, fontFamily: F.mono, fontSize: "clamp(22px,5vw,40px)", fontWeight: 800, letterSpacing: 6, marginTop: 4 }}>
              1820
            </div>
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 1.9, margin: "20px auto 30px", maxWidth: 440 }}>
              «לֹא יָבוֹא עוֹד שִׁמְשֵׁךְ … כִּי יְהוָה יִהְיֶה לָּךְ לְאוֹר עוֹלָם»<br />
              היכנסו אל תוך האור. הקול והמספרים יוליכו אתכם.
            </p>
            <button onClick={enter} className="exp-enter">✦ הכנס להיכל ✦</button>
          </div>
        )}

        {entered && (
          <div style={{ position: "absolute", bottom: 22, insetInline: 0, display: "flex", gap: 12, justifyContent: "center", pointerEvents: "auto" }}>
            <button onClick={toggleMute} className="exp-mini">{muted ? "🔇 הפעל קול" : "🔊 השתק"}</button>
            <Link to="/" onClick={() => { try { document.exitFullscreen?.(); } catch {} }} className="exp-mini">← יציאה</Link>
          </div>
        )}
      </div>

      {/* מוזיקה — חריץ פרימיום + נפילה לטראק הקיים (CC-BY) */}
      <audio ref={audioEl} loop crossOrigin="anonymous" preload="auto">
        <source src="/nisayon-premium.mp3" type="audio/mpeg" />
        <source src="/heichal-theme.mp3" type="audio/mpeg" />
      </audio>

      <style>{`
        .exp-enter {
          cursor: pointer; pointer-events: auto;
          background: linear-gradient(135deg, #f6e27a, #d4af37);
          color: #1a0e00; border: none; border-radius: 999px;
          font-family: ${F.heading}; font-weight: 800; font-size: 18px;
          padding: 15px 44px; letter-spacing: 2px;
          box-shadow: 0 0 40px rgba(212,175,55,0.55), 0 10px 30px rgba(0,0,0,0.5);
          transition: transform .2s, box-shadow .2s;
          animation: pulseGlow 2.4s ease-in-out infinite;
        }
        .exp-enter:hover { transform: scale(1.06); box-shadow: 0 0 60px rgba(246,226,122,0.8); }
        .exp-mini {
          cursor: pointer; background: rgba(8,5,16,0.6); color: ${C.goldLight};
          border: 1px solid ${C.borderGold}; border-radius: 999px; backdrop-filter: blur(8px);
          font-family: ${F.heading}; font-size: 13px; font-weight: 700; padding: 9px 18px; text-decoration: none;
        }
        .exp-mini:hover { color: ${C.goldBright}; border-color: ${C.gold}; }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 30px rgba(212,175,55,0.45), 0 10px 30px rgba(0,0,0,0.5);} 50% { box-shadow: 0 0 60px rgba(246,226,122,0.85), 0 10px 30px rgba(0,0,0,0.5);} }
        @keyframes rise { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform: translateY(0);} }
        @keyframes flash { 0% { opacity:0;} 25% { opacity:0.9;} 100% { opacity:0;} }
      `}</style>
    </div>
  );
}
