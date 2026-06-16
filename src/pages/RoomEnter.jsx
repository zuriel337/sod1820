import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles, Html, Cloud, OrbitControls } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { C, F } from "../theme.js";
import { getTopicCards, getGalleryImagesByIds } from "../lib/supabase.js";

// ===== /sulamot11 — כניסה לתוך החדר (קוסמי) =====
// HUB: כוכבי-צירים בחלל. לחיצה → המצלמה עפה לתוך הכדור (הבזק) → INSIDE: התמונות עוטפות אותך 360°.

function hubPositions(n, R = 11) {
  const off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5)), P = [];
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y));
    P.push([Math.cos(i * inc) * r * R, y * R * 0.7, Math.sin(i * inc) * r * R]);
  }
  return P;
}

function HubOrb({ pos, card, onEnter }) {
  const ref = useRef();
  const r = 0.7 + (card.meter_score || 0) / 100 * 1.0;
  useFrame(({ clock }) => { if (ref.current) ref.current.scale.setScalar(1 + 0.07 * Math.sin(clock.elapsedTime * 1.5 + pos[0])); });
  return (
    <group position={pos}>
      <mesh scale={1.8}><sphereGeometry args={[r, 24, 24]} /><meshBasicMaterial color="#ffd970" transparent opacity={0.1} /></mesh>
      <mesh ref={ref} onClick={e => { e.stopPropagation(); onEnter(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
        <sphereGeometry args={[r, 64, 64]} />
        <meshStandardMaterial color="#e9c14e" emissive="#ffcf4d" emissiveIntensity={0.8} roughness={0.12} metalness={0.9} />
      </mesh>
      <Html center distanceFactor={15} style={{ pointerEvents: "none" }}>
        <div style={{ color: "#f7ecc6", fontFamily: F.regal, fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 0 12px #000", transform: "translateY(-3em)", textAlign: "center" }}>
          {card.title}
          <div style={{ color: "#ffcf4d", fontFamily: "monospace", fontSize: 12 }}>היכנס →</div>
        </div>
      </Html>
    </group>
  );
}

function Rig({ phase, targetPos }) {
  useFrame((state, dt) => {
    const cam = state.camera;
    if (phase === "hub") {
      cam.position.lerp(new THREE.Vector3(0, 2, 20), Math.min(1, dt * 1.4));
      cam.lookAt(0, 0, 0);
    } else if (phase === "entering" && targetPos) {
      cam.position.lerp(new THREE.Vector3(...targetPos), Math.min(1, dt * 1.6));
      cam.lookAt(...targetPos);
    }
  });
  return null;
}

// פנים החדר — התמונות עוטפות 360°
function RoomInterior({ card, imgs }) {
  const N = Math.max(imgs.length, 1);
  return (
    <group>
      <Html center style={{ pointerEvents: "none" }}>
        <div style={{ textAlign: "center", transform: "translateY(-40px)" }}>
          <div style={{ color: "#fff3c4", fontFamily: "monospace", fontSize: 52, fontWeight: 900, textShadow: "0 0 30px #ffcf4d" }}>{(card.highlight_numbers || [])[0] ?? ""}</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 800, textShadow: "0 0 14px #000" }}>{card.title}</div>
        </div>
      </Html>
      {imgs.map((im, i) => {
        const a = (i / N) * Math.PI * 2, R = 6;
        const p = [Math.sin(a) * R, (i % 3 - 1) * 1.6, Math.cos(a) * R];
        return (
          <Html key={im.id} center position={p} distanceFactor={9} style={{ pointerEvents: "none" }}>
            <div style={{ width: 175, borderRadius: 12, overflow: "hidden", border: `2px solid ${C.gold}`, boxShadow: "0 0 26px rgba(0,0,0,0.8)", background: "#0a0712" }}>
              <img src={im.image_url} alt="" style={{ width: "100%", maxHeight: 175, objectFit: "cover", display: "block" }} />
            </div>
          </Html>
        );
      })}
    </group>
  );
}

export default function RoomEnter() {
  const nav = useNavigate();
  const [cards, setCards] = useState(null);
  const [phase, setPhase] = useState("hub");   // hub | entering | inside | exiting
  const [idx, setIdx] = useState(null);
  const [flash, setFlash] = useState(0);
  const [imgCache, setImgCache] = useState({});

  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cs => {
      if (!live) return;
      setCards((cs || []).slice().sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0)).slice(0, 12));
    }).catch(() => setCards([]));
    return () => { live = false; };
  }, []);

  const positions = useMemo(() => hubPositions(cards?.length || 0), [cards]);
  const card = idx != null ? cards?.[idx] : null;

  useEffect(() => {
    if (!card || imgCache[card.id]) return;
    getGalleryImagesByIds(card.image_ids || []).then(im => setImgCache(m => ({ ...m, [card.id]: im || [] }))).catch(() => {});
  }, [card, imgCache]);

  function enter(i) {
    setIdx(i); setPhase("entering"); setFlash(1);
    setTimeout(() => { setPhase("inside"); }, 1000);
    setTimeout(() => setFlash(0), 1400);
  }
  function exit() {
    setFlash(1); setPhase("exiting");
    setTimeout(() => { setPhase("hub"); setIdx(null); }, 250);
    setTimeout(() => setFlash(0), 700);
  }

  const ui = { cursor: "pointer", fontFamily: F.heading, fontWeight: 700, fontSize: 14, padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(8,5,18,0.7)", color: C.goldBright, backdropFilter: "blur(4px)" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 45%, #0a0820, #04030a)", direction: "rtl", zIndex: 50 }}>
      {!cards ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>טוען חלל…</div>
      ) : (
        <Canvas dpr={[1, 2]} camera={{ position: [0, 2, 20], fov: 62 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 8, 8]} intensity={1.3} color="#fff1cc" />
          <pointLight position={[0, -6, -8]} intensity={0.9} color="#7b5cff" />
          <Stars radius={100} depth={70} count={11000} factor={5} saturation={0} fade speed={0.4} />
          <Sparkles count={600} scale={40} size={4} speed={0.4} color="#cfa8ff" />
          <Cloud position={[0, 0, -10]} opacity={0.07} speed={0.15} segments={30} bounds={[26, 14, 8]} color="#5b3fbf" />

          {(phase === "hub" || phase === "entering") && cards.map((c, i) => (
            <HubOrb key={c.id} pos={positions[i]} card={c} onEnter={() => enter(i)} />
          ))}

          {phase === "inside" && card && <RoomInterior card={card} imgs={imgCache[card.id] || []} />}

          {phase === "inside"
            ? <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.5} minDistance={1} maxDistance={9} />
            : <Rig phase={phase} targetPos={idx != null ? positions[idx] : null} />}
        </Canvas>
      )}

      {/* הבזק מעבר */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, #fff7e0, #ffcf4d)", opacity: flash, transition: "opacity .55s ease", pointerEvents: "none", zIndex: 60 }} />

      {/* כותרת */}
      <div style={{ position: "absolute", top: 16, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4 }}>סולמות · כניסה לתוך החדר · קוסמי</div>
        {phase === "hub" && <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,4vw,30px)", fontWeight: 800, textShadow: `0 0 30px ${C.goldDeep}` }}>בחרו ציר — והיכנסו פנימה</div>}
      </div>

      {/* פקדים */}
      <div style={{ position: "absolute", top: 16, insetInlineStart: 16, display: "flex", gap: 8 }}>
        <button style={ui} onClick={() => nav("/sulamot")}>← יציאה</button>
        {phase === "inside" && <button style={ui} onClick={exit}>↑ חזרה לחלל</button>}
      </div>

      {phase === "inside" && card && (
        <div style={{ position: "absolute", bottom: 22, insetInline: 0, display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={{ ...ui, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00" }} onClick={() => nav(`/topic/${encodeURIComponent(card.slug)}`)}>פתח את מרכז ההתכנסות →</button>
        </div>
      )}
    </div>
  );
}
