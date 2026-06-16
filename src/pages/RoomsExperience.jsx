import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles, Html, Line, Float } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { C, F } from "../theme.js";
import { getTopicCards, getGalleryImagesByIds } from "../lib/supabase.js";

// ===== חוויית חדרים (/sulamot5-7) — מסך מלא, מעבר מחדר לחדר =====
// כל ציר התכנסות = חדר. mode קובע את המבנה המרחבי: 5=מעגל · 6=מסדרון · 7=סולם-ספירלה.

// פלטות צבע לכל גרסה
const PAL = {
  5: { orb: "#d4af37", acc: "#fff3c4", spark: "#ffe9a8", l2: "#8458ff", bg: "#0d0a04", name: "מעגל זהב" },
  6: { orb: "#d4af37", acc: "#fff3c4", spark: "#ffe9a8", l2: "#8458ff", bg: "#0d0a04", name: "מסדרון זהב" },
  7: { orb: "#d4af37", acc: "#fff3c4", spark: "#ffe9a8", l2: "#8458ff", bg: "#0d0a04", name: "סולם זהב" },
  8: { orb: "#b06bff", acc: "#f0d6ff", spark: "#d9a8ff", l2: "#ff5ea8", bg: "#0a0612", name: "DNA סגול" },
  9: { orb: "#4fd0e0", acc: "#d6fbff", spark: "#a8f0ff", l2: "#3a7bff", bg: "#040a0e", name: "כיפת קרח" },
  10: { orb: "#5fce8f", acc: "#eaffe6", spark: "#bff0c8", l2: "#d4af37", bg: "#040e08", name: "מגדל ברקת" },
};

function layout(n, mode) {
  const P = [];
  for (let i = 0; i < n; i++) {
    if (mode === 6) {            // מסדרון — קו ישר קדימה
      P.push([(i % 2 ? 1 : -1) * 2.2, 0, -i * 9]);
    } else if (mode === 7) {     // סולם-ספירלה עולה
      const a = i * 1.1, R = 5;
      P.push([Math.cos(a) * R, i * 3.2 - n * 1.2, Math.sin(a) * R]);
    } else if (mode === 8) {     // DNA כפול — שתי סלילים שזורים, עולה
      const a = i * 0.95, s = i % 2 ? Math.PI : 0, R = 4.2;
      P.push([Math.cos(a + s) * R, i * 2.1 - n * 1.05, Math.sin(a + s) * R]);
    } else if (mode === 9) {     // כיפת כוכבים — חדרים על פני כדור גדול
      const off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5)), R = 12;
      const y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y));
      P.push([Math.cos(i * inc) * r * R, y * R, Math.sin(i * inc) * r * R]);
    } else if (mode === 10) {    // מגדל — קומות זו מעל זו, עולה
      P.push([(i % 2 ? 1.4 : -1.4), i * 4 - n * 2, 0]);
    } else {                     // 5 — מעגל חדרים
      const a = (i / n) * Math.PI * 2, R = 11;
      P.push([Math.cos(a) * R, 0, Math.sin(a) * R]);
    }
  }
  return P;
}

function CameraRig({ target }) {
  const look = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const [x, y, z] = target;
    pos.current.set(x, y + 1.3, z + 7);
    look.current.set(x, y, z);
    state.camera.position.lerp(pos.current, Math.min(1, dt * 1.6));
    state.camera.lookAt(look.current);
  });
  return null;
}

function Orb({ pos, card, active, onClick, pal }) {
  const ref = useRef();
  const r = 0.6 + (card.meter_score || 0) / 100 * 0.9;
  useFrame(({ clock }) => { if (ref.current) ref.current.scale.setScalar(1 + (active ? 0.16 : 0.06) * Math.sin(clock.elapsedTime * 1.6 + pos[0])); });
  const col = active ? pal.acc : pal.orb;
  return (
    <group position={pos}>
      <mesh scale={1.7}><sphereGeometry args={[r, 24, 24]} /><meshBasicMaterial color={col} transparent opacity={active ? 0.16 : 0.06} /></mesh>
      <mesh ref={ref} onClick={e => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
        <sphereGeometry args={[r, 64, 64]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 1.6 : 0.7} roughness={0.15} metalness={0.85} />
      </mesh>
      <Html center distanceFactor={16} style={{ pointerEvents: "none" }}>
        <div style={{ color: "#f7ecc6", fontFamily: F.regal, fontSize: 18, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 0 12px #000,0 0 4px #000", transform: "translateY(-3.2em)", textAlign: "center" }}>
          {card.title}
          <div style={{ color: pal.orb, fontFamily: "monospace", fontSize: 13 }}>{(card.highlight_numbers || []).join(" · ")}</div>
        </div>
      </Html>
    </group>
  );
}

// תמונות החדר הממוקד — לוחות צפים בקשת מול הכדור
function RoomImages({ pos, imgs }) {
  return (
    <group position={pos}>
      {imgs.slice(0, 7).map((im, i) => {
        const t = (i - (Math.min(imgs.length, 7) - 1) / 2);
        const a = t * 0.32;
        const p = [Math.sin(a) * 4.2, 0.2 + (i % 2 ? 0.5 : -0.4), 3 + Math.cos(a) * 1.2];
        return (
          <Float key={im.id} speed={2} floatIntensity={0.5} rotationIntensity={0.2}>
            <Html transform position={p} distanceFactor={6} style={{ pointerEvents: "none" }}>
              <div style={{ width: 150, borderRadius: 10, overflow: "hidden", border: `2px solid ${C.gold}`, boxShadow: "0 0 24px rgba(0,0,0,0.7)", background: "#0a0702" }}>
                <img src={im.image_url} alt="" style={{ width: "100%", maxHeight: 150, objectFit: "cover", display: "block" }} />
              </div>
            </Html>
          </Float>
        );
      })}
    </group>
  );
}

function World({ cards, positions, focus, setFocus, mode, focusImgs, pal }) {
  const tall = mode === 7 || mode === 8 || mode === 10;
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 8, 8]} intensity={1.4} color={pal.acc} />
      <pointLight position={[0, -6, -8]} intensity={0.8} color={pal.l2} />
      <Stars radius={90} depth={60} count={9000} factor={5} saturation={0} fade speed={0.5} />
      <Sparkles count={500} scale={tall ? [16, 44, 16] : 30} size={4} speed={0.4} color={pal.spark} />
      {/* קו מוביל בין החדרים (הסולם/המסלול) */}
      <Line points={positions} color={pal.orb} lineWidth={1.5} transparent opacity={0.3} />
      {cards.map((c, i) => (
        <Orb key={c.id} pos={positions[i]} card={c} active={i === focus} onClick={() => setFocus(i)} pal={pal} />
      ))}
      {focusImgs && positions[focus] && <RoomImages pos={positions[focus]} imgs={focusImgs} />}
      <CameraRig target={positions[focus] || [0, 0, 0]} />
    </>
  );
}

export default function RoomsExperience({ mode = 5 }) {
  const nav = useNavigate();
  const [cards, setCards] = useState(null);
  const [focus, setFocus] = useState(0);
  const [imgCache, setImgCache] = useState({});

  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cs => {
      if (!live) return;
      setCards((cs || []).slice().sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0)).slice(0, 12));
    }).catch(() => setCards([]));
    return () => { live = false; };
  }, []);

  // טעינת תמונות החדר הממוקד (cache)
  const focusCard = cards?.[focus];
  useEffect(() => {
    if (!focusCard || imgCache[focusCard.id]) return;
    getGalleryImagesByIds(focusCard.image_ids || []).then(imgs => setImgCache(m => ({ ...m, [focusCard.id]: imgs || [] }))).catch(() => {});
  }, [focusCard, imgCache]);

  useEffect(() => {
    const onKey = e => {
      if (!cards) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setFocus(f => (f + 1) % cards.length);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setFocus(f => (f - 1 + cards.length) % cards.length);
      if (e.key === "Escape") nav("/sulamot");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards, nav]);

  const pal = PAL[mode] || PAL[5];
  const positions = useMemo(() => layout(cards?.length || 0, mode), [cards, mode]);
  const modeName = pal.name;

  const ui = { cursor: "pointer", fontFamily: F.heading, fontWeight: 700, fontSize: 14, padding: "9px 16px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(8,5,2,0.7)", color: C.goldBright, backdropFilter: "blur(4px)" };

  return (
    <div style={{ position: "fixed", inset: 0, background: `radial-gradient(circle at 50% 45%, ${pal.bg}, #04030a)`, direction: "rtl", zIndex: 50 }}>
      {!cards ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>טוען חדרים…</div>
      ) : (
        <Canvas dpr={[1, 2]} camera={{ position: [0, 2, 16], fov: 60 }} onPointerMissed={() => {}}>
          <World cards={cards} positions={positions} focus={focus} setFocus={setFocus} mode={mode} focusImgs={focusCard && imgCache[focusCard.id]} pal={pal} />
        </Canvas>
      )}

      {/* כותרת עליונה */}
      <div style={{ position: "absolute", top: 16, insetInline: 0, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4 }}>סולמות · {modeName} · מסך מלא</div>
        {focusCard && <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,4vw,32px)", fontWeight: 800, textShadow: `0 0 30px ${C.goldDeep}` }}>{focusCard.title}</div>}
      </div>

      {/* יציאה + מעבר גרסאות */}
      <div style={{ position: "absolute", top: 16, insetInlineStart: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={ui} onClick={() => nav("/sulamot")}>← יציאה</button>
        {[5, 6, 7, 8, 9, 10].map(m => (
          <button key={m} style={{ ...ui, opacity: m === mode ? 1 : 0.55, borderColor: m === mode ? C.gold : C.border }} onClick={() => nav(`/sulamot${m}`)}>{m}</button>
        ))}
      </div>

      {/* ניווט חדרים */}
      {cards && cards.length > 0 && (
        <div style={{ position: "absolute", bottom: 22, insetInline: 0, display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
          <button style={ui} onClick={() => setFocus(f => (f - 1 + cards.length) % cards.length)}>‹ הקודם</button>
          <span style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 15, minWidth: 70, textAlign: "center", textShadow: "0 0 8px #000" }}>{focus + 1} / {cards.length}</span>
          <button style={ui} onClick={() => setFocus(f => (f + 1) % cards.length)}>הבא ›</button>
          {focusCard && <button style={{ ...ui, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00" }} onClick={() => nav(`/topic/${encodeURIComponent(focusCard.slug)}`)}>פתח את הציר →</button>}
        </div>
      )}
    </div>
  );
}
