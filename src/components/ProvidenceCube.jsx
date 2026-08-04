import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

// ===== הקובייה הרוחנית — «השגחה פרטית = 1020» (גימטריה תלת-ממדית) =====
// קובייה בת 6 פאות. בכל פאה המילה «טוב» 10 פעמים → 6×10 = 60 · 60×«טוב»(17) = 1020 = השגחה פרטית.
// המשתמש מסובב את הקובייה (גרירה) ומאיר פאה-אחר-פאה; מונה עולה 10→20→…→60 ואז מתגלה 1020.
// המנוע אימת: טוב=17 · השגחה פרטית=1020 · אמונה×10=1020 (src/lib/gematria.js).

const TOTAL_FACES = 6;
const PER_FACE = 10;         // «טוב» בכל פאה
const TOV = 17;              // ערך «טוב» ברגיל (מאומת במנוע)

// ציור פאה: רשת 2×5 של «טוב» + מסגרת. lit = מוארת (זהב חם) · כבויה = עמומה.
function faceTexture(lit) {
  const s = 512, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  // רקע הפאה
  g.fillStyle = lit ? "#1c1405" : "#0c0a12";
  g.fillRect(0, 0, s, s);
  // הילה פנימית כשמוארת
  if (lit) {
    const grd = g.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s * 0.72);
    grd.addColorStop(0, "rgba(255,220,120,0.28)"); grd.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }
  // מסגרת כפולה
  g.lineWidth = 10; g.strokeStyle = lit ? "#f6e27a" : "#5c4a1c"; g.strokeRect(26, 26, s - 52, s - 52);
  g.lineWidth = 3;  g.strokeStyle = lit ? "rgba(246,226,122,0.5)" : "rgba(92,74,28,0.5)"; g.strokeRect(44, 44, s - 88, s - 88);
  // 10 × «טוב» ברשת 2 טורים × 5 שורות
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 62px 'Arial Hebrew', 'Heebo', serif";
  g.fillStyle = lit ? "#ffe9a8" : "#8a7a52";
  if (lit) { g.shadowColor = "rgba(255,220,120,0.85)"; g.shadowBlur = 18; }
  const colsX = [s * 0.34, s * 0.66];
  const rowsY = [0.24, 0.38, 0.52, 0.66, 0.80].map(f => s * f);
  for (const y of rowsY) for (const x of colsX) g.fillText("טוב", x, y);
  g.shadowBlur = 0;
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// פאה בודדת = plane ממוקם על דופן הקובייה. לחיצה מאירה אותה.
function Face({ position, rotation, lit, onLight }) {
  const texOff = useMemo(() => faceTexture(false), []);
  const texOn = useMemo(() => faceTexture(true), []);
  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onLight(); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={lit ? texOn : texOff} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

const FACES = [
  { position: [1, 0, 0],  rotation: [0, Math.PI / 2, 0] },
  { position: [-1, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 1, 0],  rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, -1, 0], rotation: [Math.PI / 2, 0, 0] },
  { position: [0, 0, 1],  rotation: [0, 0, 0] },
  { position: [0, 0, -1], rotation: [0, Math.PI, 0] },
];

function Cube({ litArr, onLight, spin }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current && spin) ref.current.rotation.y += dt * 0.28; });
  return (
    <group ref={ref}>
      {FACES.map((f, i) => (
        <Face key={i} position={f.position} rotation={f.rotation} lit={litArr[i]} onLight={() => onLight(i)} />
      ))}
      {/* קווי-אור בקצוות הקובייה */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.02, 2.02, 2.02)]} />
        <lineBasicMaterial color="#d4af37" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

export default function ProvidenceCube() {
  const [lit, setLit] = useState(() => Array(TOTAL_FACES).fill(false));
  const litCount = lit.filter(Boolean).length;
  const done = litCount === TOTAL_FACES;
  const [spin, setSpin] = useState(true);

  const lightFace = (i) => setLit(prev => prev[i] ? prev : prev.map((v, j) => (j === i ? true : v)));
  // «האר פאה הבאה» — מאיר את הפאה הכבויה הראשונה (למי שלא רוצה לסובב ולנחש)
  const lightNext = () => setLit(prev => {
    const i = prev.findIndex(v => !v);
    if (i === -1) return prev;
    return prev.map((v, j) => (j === i ? true : v));
  });
  const reset = () => setLit(Array(TOTAL_FACES).fill(false));

  // עוצרים את הסיבוב האוטומטי כשהמשתמש נוגע (חוזר אחרי שנייה של אי-מגע דרך OrbitControls)
  useEffect(() => { if (done) setSpin(false); }, [done]);

  const tov = litCount * PER_FACE;         // כמות «טוב» שהוארה (10,20,…,60)
  const value = tov * TOV;                 // הערך המצטבר (170,340,…,1020)

  return (
    <div style={{ direction: "rtl" }}>
      {/* הבמה התלת-ממדית */}
      <div style={{
        position: "relative", height: "min(64vh, 520px)", borderRadius: 18, overflow: "hidden",
        border: "1px solid rgba(212,175,55,0.35)", background: "#050311", boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
      }}>
        <Canvas camera={{ position: [3.4, 2.6, 4.6], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={["#050311"]} />
          <Stars radius={50} depth={30} count={500} factor={2} fade speed={0.25} />
          <ambientLight intensity={0.9} />
          <Cube litArr={lit} onLight={lightFace} spin={spin} />
          <OrbitControls
            enablePan={false} enableZoom={false}
            autoRotate={false} minPolarAngle={0.4} maxPolarAngle={Math.PI - 0.4}
            onStart={() => setSpin(false)}
          />
        </Canvas>

        {/* כיתוב עליון */}
        <div style={{ position: "absolute", top: 12, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ color: "#f6e27a", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 15, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            📦 הקובייה הרוחנית — הַאִירו את שש הפאות
          </div>
          <div style={{ color: "#cbb98a", fontFamily: "'Heebo',sans-serif", fontSize: 12, marginTop: 2, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            גררו לסובב · הקישו על פאה כדי להאירהּ
          </div>
        </div>

        {/* מונה + התגלות בתחתית */}
        <div style={{
          position: "absolute", bottom: 12, insetInline: 12, background: "rgba(6,4,14,0.72)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "10px 14px", textAlign: "center",
        }}>
          {/* שש נקודות-פאה */}
          <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 8 }}>
            {lit.map((v, i) => (
              <span key={i} style={{
                width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center",
                fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 12,
                background: v ? "linear-gradient(135deg,#f6e27a,#d4af37)" : "rgba(255,255,255,0.06)",
                color: v ? "#1a0e00" : "#7c745f", border: "1px solid rgba(212,175,55,0.35)",
                transition: "all .3s",
              }}>{(i + 1) * PER_FACE}</span>
            ))}
          </div>
          {!done ? (
            <div style={{ color: "#e9dcb0", fontFamily: "'Heebo',sans-serif", fontSize: 14 }}>
              הוארו <b style={{ color: "#f6e27a" }}>{litCount}</b> מתוך 6 פאות ·{" "}
              <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{tov}</b> פעמים «טוב» ·{" "}
              ערך מצטבר <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{value}</b>
            </div>
          ) : (
            <div style={{ animation: "cubeReveal .8s ease both" }}>
              <div style={{ color: "#cbb98a", fontFamily: "'Courier New',monospace", fontSize: 14, marginBottom: 2 }}>60 × 17</div>
              <div style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace", fontSize: 40, fontWeight: 800, lineHeight: 1, textShadow: "0 0 22px rgba(246,226,122,0.6)" }}>1020</div>
              <div style={{ color: "#ffe9a8", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 20, marginTop: 4 }}>הַשְׁגָּחָה פְּרָטִית</div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
            {!done && (
              <button onClick={lightNext} style={btn(true)}>✨ האר פאה</button>
            )}
            <button onClick={reset} style={btn(false)}>↺ אפס</button>
            <button onClick={() => setSpin(s => !s)} style={btn(false)}>{spin ? "⏸ עצור סיבוב" : "▶ סובב"}</button>
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
