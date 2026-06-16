import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line, Sparkles, Float, Cloud } from "@react-three/drei";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getTopicCards } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";

// ===== גלקסיית ההתכנסות — רכיב מדורג (level 1-4), עוצמה גרפית עולה =====
function fibSphere(n, R) {
  if (n <= 1) return [[0, 0, 0]];
  const pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * inc;
    pts.push([Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R]);
  }
  return pts;
}

// כוכבי-לוויין = המספרים המובלטים, מקיפים את הציר (level >= 2)
function Satellites({ nums, R, level }) {
  const ref = useRef();
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.5; });
  const segs = level >= 4 ? 20 : 12;
  return (
    <group ref={ref}>
      {nums.slice(0, 5).map((n, i) => {
        const a = (i / Math.min(nums.length, 5)) * Math.PI * 2;
        const p = [Math.cos(a) * R, Math.sin(a * 1.3) * R * 0.4, Math.sin(a) * R];
        return (
          <group key={n} position={p}>
            <mesh>
              <sphereGeometry args={[0.13, segs, segs]} />
              <meshStandardMaterial color="#ffe9a8" emissive="#ffcf4d" emissiveIntensity={1.2} />
            </mesh>
            {level >= 3 && <Html center distanceFactor={20} style={{ pointerEvents: "none" }}>
              <div style={{ color: "#ffe9a8", fontFamily: "monospace", fontSize: 10, fontWeight: 700, textShadow: "0 0 6px #000" }}>{n}</div>
            </Html>}
          </group>
        );
      })}
    </group>
  );
}

function Node({ pos, card, active, dim, onClick, level }) {
  const ref = useRef();
  const seed = pos[0] + pos[2];
  const radius = 0.42 + (card.meter_score || 0) / 100 * 0.85;
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + (active ? 0.18 : 0.07) * Math.sin(clock.elapsedTime * 1.8 + seed));
  });
  const col = active ? "#fff3c4" : "#d4af37";
  const segs = level >= 4 ? 64 : level >= 3 ? 48 : 32;
  return (
    <group position={pos}>
      {/* הילה זוהרת (level >= 4) */}
      {level >= 4 && (
        <mesh scale={1.6}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial color={col} transparent opacity={dim ? 0.04 : 0.13} />
        </mesh>
      )}
      <mesh ref={ref} onClick={e => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
        <sphereGeometry args={[radius, segs, segs]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 1.5 : 0.75} roughness={level >= 4 ? 0.15 : 0.28} metalness={level >= 4 ? 0.85 : 0.6} transparent opacity={dim ? 0.22 : 1} />
      </mesh>
      {level >= 2 && !dim && <Satellites nums={card.highlight_numbers || card.numbers || []} R={radius + 0.55} level={level} />}
      <Html center distanceFactor={14} style={{ pointerEvents: "none", opacity: dim ? 0.3 : 1 }}>
        <div style={{ color: "#f3e7c0", fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 0 10px #000, 0 0 4px #000", transform: "translateY(-2.8em)", textAlign: "center" }}>
          {card.title}
          <div style={{ color: C.gold, fontFamily: "monospace", fontSize: 11 }}>{"★".repeat(Math.max(1, Math.round((card.quality || 0) / 2)))}</div>
        </div>
      </Html>
    </group>
  );
}

function PulsingLine({ a, b, w, level }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && level >= 3) ref.current.material.opacity = 0.14 + w * 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2 + a[0]));
  });
  return <Line ref={ref} points={[a, b]} color="#d4af37" lineWidth={w} transparent opacity={Math.min(0.55, 0.14 + w * 0.13)} />;
}

function Scene({ cards, sel, setSel, level }) {
  const positions = useMemo(() => fibSphere(cards.length, 6.5), [cards.length]);
  const links = useMemo(() => {
    const out = [];
    for (let i = 0; i < cards.length; i++)
      for (let j = i + 1; j < cards.length; j++) {
        const a = new Set(cards[i].numbers || []);
        const shared = (cards[j].numbers || []).filter(n => a.has(n));
        if (shared.length) out.push({ a: positions[i], b: positions[j], w: shared.length });
      }
    return out;
  }, [cards, positions]);

  const inner = (
    <group>
      {links.map((l, k) => <PulsingLine key={k} {...l} level={level} />)}
      {cards.map((c, i) => (
        <Node key={c.id} pos={positions[i]} card={c} level={level}
          active={sel === c.id} dim={sel != null && sel !== c.id}
          onClick={() => setSel(s => (s === c.id ? null : c.id))} />
      ))}
      {/* ליבת זהב מרכזית (level >= 3) */}
      {level >= 3 && (
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffcf4d" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );

  return (
    <>
      <ambientLight intensity={level >= 4 ? 0.7 : 0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.3} color="#fff1cc" />
      <pointLight position={[-10, -6, -8]} intensity={level >= 3 ? 0.8 : 0.5} color="#8458ff" />
      {level >= 4 && <pointLight position={[0, 0, 0]} intensity={1.4} color="#ffcf4d" distance={14} />}
      <Stars radius={70} depth={45} count={level >= 4 ? 7000 : level >= 3 ? 5000 : level >= 2 ? 3500 : 2200} factor={4} saturation={0} fade speed={0.6} />
      {level >= 2 && <Sparkles count={level >= 4 ? 400 : level >= 3 ? 220 : 120} scale={18} size={level >= 4 ? 4 : 3} speed={0.4} color="#ffe9a8" />}
      {level >= 4 && <Cloud position={[0, 0, -6]} opacity={0.08} speed={0.2} segments={28} bounds={[18, 10, 6]} color="#6b4fcf" />}
      {level >= 3 ? <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>{inner}</Float> : inner}
    </>
  );
}

export default function ConvergenceGalaxy({ level = 1 }) {
  const [cards, setCards] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    applySeo({ title: `גלקסיית ההתכנסות · גרסה ${level}`, description: "מפת תלת-מימד של צירי ההתכנסות החזקים — סוד 1820", path: `/sulamot${level > 1 ? level : ""}` });
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cs => {
      if (!live) return;
      setCards((cs || []).slice().sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0)).slice(0, level >= 3 ? 18 : 14));
    }).catch(() => setCards([]));
    return () => { live = false; };
  }, [level]);

  const selCard = cards?.find(c => c.id === sel);
  const dpr = level >= 4 ? [1, 2] : [1, 1.5];

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)", minHeight: 520, background: "radial-gradient(circle at 50% 40%, #0d0a04, #05030a)", direction: "rtl" }}>
      <div style={{ position: "absolute", top: 18, insetInlineStart: 0, insetInlineEnd: 0, textAlign: "center", zIndex: 2, pointerEvents: "none" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>סוד 1820 · ניסויים · גרסה {level}</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, margin: "4px 0 0", textShadow: `0 0 30px ${C.goldDeep}` }}>✦ גלקסיית ההתכנסות</h1>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>הצירים החזקים · קווים = הצטלבות · לחצו כדור{level >= 2 ? " · כוכבי-לוויין = המספרים" : ""}</div>
      </div>

      {!cards ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>טוען את הגלקסיה…</div>
      ) : !cards.length ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: F.body }}>אין עדיין צירים מאושרים.</div>
      ) : (
        <Canvas dpr={dpr} camera={{ position: [0, 0, 16], fov: 55 }} onPointerMissed={() => setSel(null)}>
          <Scene cards={cards} sel={sel} setSel={setSel} level={level} />
          <OrbitControls enablePan={false} autoRotate={sel == null} autoRotateSpeed={level >= 4 ? 0.7 : 0.5} minDistance={9} maxDistance={28} />
        </Canvas>
      )}

      {selCard && (
        <div style={{ position: "absolute", insetInlineEnd: 16, top: 96, width: "min(330px, 86vw)", zIndex: 3,
          background: "rgba(10,7,2,0.92)", border: `1px solid ${C.gold}`, borderRadius: 16, padding: "16px 18px", boxShadow: `0 0 40px ${C.goldDeep}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 21, fontWeight: 700 }}>{selCard.title}</span>
            <span style={{ color: C.gold, fontFamily: "monospace", fontSize: 12 }}>מד {selCard.meter_score ?? 0}</span>
          </div>
          {selCard.subtitle && <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, margin: "6px 0 10px" }}>{selCard.subtitle}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {(selCard.highlight_numbers || []).map(n => (
              <span key={n} style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: C.goldBright, border: `1px solid ${C.gold}`, borderRadius: 999, padding: "2px 11px", background: "rgba(212,175,55,0.15)" }}>{n}</span>
            ))}
          </div>
          <Link to={`/topic/${encodeURIComponent(selCard.slug)}`} style={{ display: "inline-block", textDecoration: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 18px", borderRadius: 999 }}>פתח את מרכז ההתכנסות →</Link>
        </div>
      )}

      {/* ניווט בין הגרסאות */}
      <div style={{ position: "absolute", bottom: 14, insetInlineStart: 0, insetInlineEnd: 0, display: "flex", gap: 8, justifyContent: "center", zIndex: 3 }}>
        {[1, 2, 3, 4].map(l => (
          <Link key={l} to={`/sulamot${l > 1 ? l : ""}`} style={{ textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
            padding: "6px 14px", borderRadius: 999, border: `1px solid ${l === level ? C.gold : C.border}`,
            background: l === level ? "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(8,5,2,0.5))" : "rgba(8,5,2,0.6)",
            color: l === level ? C.goldBright : C.muted }}>גרסה {l}</Link>
        ))}
      </div>
    </div>
  );
}
