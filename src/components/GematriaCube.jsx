import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

// ===== גוף גימטרי מוכלל — «גימטריה מרחבית» =====
// מציג מילה (טוב/אחד/אל/…) על פאות גוף גיאומטרי; המשתמש מסובב ומאיר פאה-אחר-פאה עד ההתגלות.
// שתי צורות (shape): "cube" = קובייה (6 פאות) · "icosa" = עשרימון משוכלל (20 פאות).
// שני מצבים (mode):
//   • multiply — כל פאה מוסיפה cols×rows הופעות; מונה litCount*perFace, ואז ×unit → finalValue
//                (קוביית טוב: 6×10×17=1020 · עשרימון הכתר: 20×1×31=620).
//   • surround — «אחד מכל הכיוונים»; מונה כיוונים, ובסוף מתגלה finalValue/finalTitle (קוביית אחד → 910=שרית).
// props: faceWord, cols, rows, mode, unit, finalTitle, finalValue, reveal:[{k,big?,label?}], shape.

// ציור פאה: רשת cols×rows של המילה + מסגרת. lit = מוארת (זהב חם). transparent → רקע שקוף (לעשרימון).
function faceTexture(word, cols, rows, lit, transparent) {
  const s = 512, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  if (!transparent) {
    g.fillStyle = lit ? "#1c1405" : "#0c0a12"; g.fillRect(0, 0, s, s);
    if (lit) {
      const grd = g.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s * 0.72);
      grd.addColorStop(0, "rgba(255,220,120,0.28)"); grd.addColorStop(1, "rgba(255,220,120,0)");
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    }
    g.lineWidth = 10; g.strokeStyle = lit ? "#f6e27a" : "#5c4a1c"; g.strokeRect(26, 26, s - 52, s - 52);
    g.lineWidth = 3;  g.strokeStyle = lit ? "rgba(246,226,122,0.5)" : "rgba(92,74,28,0.5)"; g.strokeRect(44, 44, s - 88, s - 88);
  }
  g.textAlign = "center"; g.textBaseline = "middle";
  // גופן עברי נקי + נפילה ל-sans-serif (לא serif — עברית-serif נראית מרושלת כשהגופן לא נטען)
  const fs = Math.floor((transparent ? 330 : 340) / Math.max(cols, rows));
  g.font = `800 ${fs}px 'Heebo','Arial Hebrew','Noto Sans Hebrew','Arial Unicode MS',sans-serif`;
  const pad = s * 0.16, span = s - pad * 2;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = pad + span * (cols === 1 ? 0.5 : c / (cols - 1));
    const y = pad + span * (rows === 1 ? 0.5 : r / (rows - 1));
    // קו-מתאר כהה — קריאוּת האותיות על גוף שקוף (עשרימון) בכל זווית
    if (transparent) { g.save(); g.lineJoin = "round"; g.lineWidth = Math.max(6, fs * 0.1); g.strokeStyle = "rgba(6,18,12,0.9)"; g.strokeText(word, x, y); g.restore(); }
    g.save();
    if (lit) { g.shadowColor = "rgba(255,220,120,0.9)"; g.shadowBlur = 18; }
    g.fillStyle = lit ? "#ffe9a8" : (transparent ? "#f0d886" : "#8a7a52");
    g.fillText(word, x, y);
    g.restore();
  }
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

// 🔷 עשרימון (icosahedron) — 20 פאות, גוף סימטרי; על כל פאה המילה («אל»). מרנדר גוף אזמרגד שקוף +
//    שפת-זהב, ועל כל אחת מ-20 הפאות משטח-כיתוב עם המילה (רקע שקוף) — הקשה מאירה פאה.
function Icosa({ word, litArr, onLight, spin }) {
  const ref = useRef();
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.7, 0), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  // מרכזי-הפאות + בסיס-כיוון — למיקום וכיוון משטחי-הכיתוב (20 משולשים, פוזיציה לא-מאונדקסת: 3 קדקודים לפאה).
  //    האות מיושרת «זקופה» בתוך המשולש: הנורמל = ציר-מבט החוצה, ה«מעלה» = מהמרכז אל קדקוד — כך «אל»
  //    יושבת ממורכזת ועקבית בכל פאה (במקום גלגול אקראי שנראה מרושל).
  const faces = useMemo(() => {
    const pos = geo.attributes.position, out = [];
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const centroid = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3);
      const normal = centroid.clone().normalize();                              // החוצה (עשרימון ממורכז)
      const up = a.clone().sub(centroid).normalize();                           // אל קדקוד a
      const right = new THREE.Vector3().crossVectors(up, normal).normalize();
      const up2 = new THREE.Vector3().crossVectors(normal, right).normalize();  // אורתונורמלי
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up2, normal));
      out.push({ centroid, normal, q });
    }
    return out;   // 20
  }, [geo]);
  const texOff = useMemo(() => faceTexture(word, 1, 1, false, true), [word]);
  const texOn  = useMemo(() => faceTexture(word, 1, 1, true, true), [word]);
  useFrame((_, dt) => { if (ref.current && spin) ref.current.rotation.y += dt * 0.28; });
  return (
    <group ref={ref}>
      {/* גוף האזמרגד השקוף */}
      <mesh geometry={geo}>
        <meshBasicMaterial color="#1f6f52" transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* שפת-זהב */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#d4af37" transparent opacity={0.7} />
      </lineSegments>
      {/* 20 משטחי-כיתוב «אל» — אחד לכל פאה */}
      {faces.map((f, i) => (
        <mesh key={i} position={f.centroid.clone().add(f.normal.clone().multiplyScalar(0.03))} quaternion={f.q}
          onClick={(e) => { e.stopPropagation(); onLight(i); }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}>
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial map={litArr[i] ? texOn : texOff} transparent side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function GematriaCube({ faceWord, cols = 2, rows = 5, mode = "multiply", unit = 0, finalTitle = "", finalValue = 0, reveal = [], shape = "cube" }) {
  const TOTAL_FACES = shape === "icosa" ? 20 : 6;
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
          {shape === "icosa"
            ? <Icosa word={faceWord} litArr={lit} onLight={lightFace} spin={spin} />
            : <Cube word={faceWord} cols={cols} rows={rows} litArr={lit} onLight={lightFace} spin={spin} />}
          <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.4} maxPolarAngle={Math.PI - 0.4} onStart={() => setSpin(false)} />
        </Canvas>

        <div style={{ position: "absolute", top: 12, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ color: "#f6e27a", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 15, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            {shape === "icosa" ? "🔷 הַאִירו את עשרים הפאות" : "📦 הַאִירו את שש הפאות"}
          </div>
          <div style={{ color: "#cbb98a", fontFamily: "'Heebo',sans-serif", fontSize: 12, marginTop: 2, textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
            גררו לסובב · הקישו על פאה כדי להאירהּ
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 12, insetInline: 12, background: "rgba(6,4,14,0.72)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "10px 14px", textAlign: "center" }}>
          {shape === "icosa" ? (
            // 20 פאות — פס-התקדמות קומפקטי במקום 20 שבבים
            <div style={{ marginBottom: 8 }}>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(212,175,55,0.35)", overflow: "hidden" }}>
                <div style={{ width: `${(litCount / TOTAL_FACES) * 100}%`, height: "100%", background: "linear-gradient(90deg,#f6e27a,#d4af37)", transition: "width .3s" }} />
              </div>
            </div>
          ) : (
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
          )}
          {!done ? (
            <div style={{ color: "#e9dcb0", fontFamily: "'Heebo',sans-serif", fontSize: 14 }}>
              {mode === "multiply" ? (
                <>הוארו <b style={{ color: "#f6e27a" }}>{litCount}</b>/{TOTAL_FACES} · <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{litCount * perFace}</b> פעמים «{faceWord}» · ערך <b style={{ color: "#f6e27a", fontFamily: "'Courier New',monospace" }}>{running}</b></>
              ) : (
                <>«{faceWord}» מ־<b style={{ color: "#f6e27a" }}>{litCount}</b> מתוך {TOTAL_FACES} הכיוונים</>
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
