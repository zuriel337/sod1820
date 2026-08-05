import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

// ===== קובייה גימטרית מוכללת — «גימטריה מרחבית» =====
// מציגה מילה (טוב/אחד/…) על 6 פאות; המשתמש מסובב ומאיר פאה-אחר-פאה עד ההתגלות.
// שני מצבים (mode):
//   • multiply — כל פאה מוסיפה cols×rows הופעות; מונה litCount*perFace, ואז ×unit → finalValue (קוביית טוב: 6×10×17=1020).
//   • surround — «אחד מכל 6 הכיוונים»; מונה כיוונים (N/6), ובסוף מתגלה finalValue/finalTitle (קוביית אחד → 910=שרית).
// props: faceWord, cols, rows, mode, unit, finalTitle, finalValue, reveal:[{k,big?,label?}].

const TOTAL_FACES = 6;

// ציור פאה: רשת cols×rows של המילה + מסגרת. lit = מוארת (זהב חם).
function faceTexture(word, cols, rows, lit) {
  const s = 512, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.fillStyle = lit ? "#1c1405" : "#0c0a12"; g.fillRect(0, 0, s, s);
  if (lit) {
    const grd = g.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s * 0.72);
    grd.addColorStop(0, "rgba(255,220,120,0.28)"); grd.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }
  g.lineWidth = 10; g.strokeStyle = lit ? "#f6e27a" : "#5c4a1c"; g.strokeRect(26, 26, s - 52, s - 52);
  g.lineWidth = 3;  g.strokeStyle = lit ? "rgba(246,226,122,0.5)" : "rgba(92,74,28,0.5)"; g.strokeRect(44, 44, s - 88, s - 88);
  g.textAlign = "center"; g.textBaseline = "middle";
  const fs = Math.floor(340 / Math.max(cols, rows));
  g.font = `800 ${fs}px 'Arial Hebrew', 'Heebo', serif`;
  g.fillStyle = lit ? "#ffe9a8" : "#8a7a52";
  if (lit) { g.shadowColor = "rgba(255,220,120,0.85)"; g.shadowBlur = 16; }
  const pad = s * 0.16, span = s - pad * 2;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = pad + span * (cols === 1 ? 0.5 : c / (cols - 1));
    const y = pad + span * (rows === 1 ? 0.5 : r / (rows - 1));
    g.fillText(word, x, y);
  }
  g.shadowBlur = 0;
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

const FACE_TRANSFORMS = [
  { position: [1, 0, 0],  rotation: [0, Math.PI / 2, 0] },
  { position: [-1, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 1, 0],  rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, -1, 0], rotation: [Math.PI / 2, 0, 0] },
  { position: [0, 0, 1],  rotation: [0, 0, 0] },
  { position: [0, 0, -1], rotation: [0, Math.PI, 0] },
];

function Face({ position, rotation, texOff, texOn, lit, onLight }) {
  return (
    <mesh position={position} rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onLight(); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={lit ? texOn : texOff} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Cube({ word, cols, rows, litArr, onLight, spin }) {
  const ref = useRef();
  const texOff = useMemo(() => faceTexture(word, cols, rows, false), [word, cols, rows]);
  const texOn  = useMemo(() => faceTexture(word, cols, rows, true), [word, cols, rows]);
  useFrame((_, dt) => { if (ref.current && spin) ref.current.rotation.y += dt * 0.28; });
  return (
    <group ref={ref}>
      {FACE_TRANSFORMS.map((f, i) => (
        <Face key={i} position={f.position} rotation={f.rotation} texOff={texOff} texOn={texOn} lit={litArr[i]} onLight={() => onLight(i)} />
      ))}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.02, 2.02, 2.02)]} />
        <lineBasicMaterial color="#d4af37" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

export default function GematriaCube({ faceWord, cols = 2, rows = 5, mode = "multiply", unit = 0, finalTitle = "", finalValue = 0, reveal = [] }) {
  const [lit, setLit] = useState(() => Array(TOTAL_FACES).fill(false));
  const [spin, setSpin] = useState(true);
  const litCount = lit.filter(Boolean).length;
  const done = litCount === TOTAL_FACES;
  const perFace = cols * rows;

  const lightFace = (i) => setLit(prev => prev[i] ? prev : prev.map((v, j) => (j === i ? true : v)));
  const lightNext = () => setLit(prev => { const i = prev.findIndex(v => !v); return i === -1 ? prev : prev.map((v, j) => (j === i ? true : v)); });
  const reset = () => setLit(Array(TOTAL_FACES).fill(false));
  useEffect(() => { if (done) setSpin(false); }, [done]);

  const running = mode === "multiply" ? litCount * perFace * unit : 0;

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ position: "relative", height: "min(60vh, 480px)", borderRadius: 18, overflow: "hidden",
        border: "1px solid rgba(212,175,55,0.35)", background: "#050311", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}>
        <Canvas camera={{ position: [3.4, 2.6, 4.6], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={["#050311"]} />
          <Stars radius={50} depth={30} count={500} factor={2} fade speed={0.25} />
          <ambientLight intensity={0.9} />
          <Cube word={faceWord} cols={cols} rows={rows} litArr={lit} onLight={lightFace} spin={spin} />
          <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.4} maxPolarAngle={Math.PI - 0.4} onStart={() => setSpin(false)} />
        </Canvas>

        <div style={{ position: "absolute", top: 12, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ color: "#f6e27a", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 15, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            📦 הַאִירו את שש הפאות
          </div>
          <div style={{ color: "#cbb98a", fontFamily: "'Heebo',sans-serif", fontSize: 12, marginTop: 2, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            גררו לסובב · הקישו על פאה כדי להאירהּ
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 12, insetInline: 12, background: "rgba(6,4,14,0.72)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 8 }}>
            {lit.map((v, i) => (
              <span key={i} style={{ width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
                fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: mode === "multiply" ? 11 : 13,
                background: v ? "linear-gradient(135deg,#f6e27a,#d4af37)" : "rgba(255,255,255,0.06)",
                color: v ? "#1a0e00" : "#7c745f", border: "1px solid rgba(212,175,55,0.35)", transition: "all .3s" }}>
                {mode === "multiply" ? (i + 1) * perFace : (v ? "◆" : i + 1)}
              </span>
            ))}
          </div>
          {!done ? (
            <div style={{ color: "#e9dcb0", fontFamily: "'Heebo',sans-serif", fontSize: 14 }}>
              {mode === "multiply" ? (
                <>הוארו <b style={{ color: "#f6e27a" }}>{litCount}</b>/6 · <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{litCount * perFace}</b> פעמים «{faceWord}» · ערך <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{running}</b></>
              ) : (
                <>«{faceWord}» מ־<b style={{ color: "#f6e27a" }}>{litCount}</b> מתוך 6 הכיוונים</>
              )}
            </div>
          ) : (
            <div style={{ animation: "cubeReveal .8s ease both" }}>
              {reveal.map((r, i) => (
                r.big ? (
                  <div key={i} style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace", fontSize: 40, fontWeight: 800, lineHeight: 1, textShadow: "0 0 22px rgba(246,226,122,0.6)" }}>{r.k}</div>
                ) : r.label ? (
                  <div key={i} style={{ color: "#ffe9a8", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 20, marginTop: 4 }}>{r.k}</div>
                ) : (
                  <div key={i} style={{ color: "#cbb98a", fontFamily: "'Courier New',monospace", fontSize: 14, marginBottom: 2 }}>{r.k}</div>
                )
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
            {!done && <button onClick={lightNext} style={btn(true)}>✨ האר פאה</button>}
            <button onClick={reset} style={btn(false)}>↺ אפס</button>
            <button onClick={() => setSpin(s => !s)} style={btn(false)}>{spin ? "⏸ עצור" : "▶ סובב"}</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes cubeReveal{from{opacity:0;transform:translateY(10px) scale(.92)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function btn(primary) {
  return {
    cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 13,
    padding: "7px 14px", borderRadius: 999, border: "1px solid rgba(212,175,55,0.4)",
    background: primary ? "linear-gradient(135deg,#e3c259,#c9a227)" : "rgba(6,4,14,0.6)",
    color: primary ? "#2a1e00" : "#e9dcb0",
  };
}
