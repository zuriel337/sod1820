import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line } from "@react-three/drei";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getTopicCards } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";

// ===== גלקסיית ההתכנסות (/sulamot) — תצוגת תלת-מימד של הצירים החזקים =====
// כל ציר = כדור זהב (גודל/זוהר לפי meter_score). קווים = הצטלבות (מספר משותף). לחיצה → חדר הציר.

function fibSphere(n, R) {
  if (n <= 1) return [[0, 0, 0]];
  const pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * inc;
    pts.push([Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R]);
  }
  return pts;
}

function Node({ pos, card, active, dim, onClick }) {
  const ref = useRef();
  const seed = pos[0] + pos[2];
  const radius = 0.42 + (card.meter_score || 0) / 100 * 0.85;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(1 + (active ? 0.18 : 0.07) * Math.sin(clock.elapsedTime * 1.8 + seed));
  });
  const col = active ? "#fff3c4" : "#d4af37";
  return (
    <group position={pos}>
      <mesh ref={ref} onClick={e => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 1.4 : 0.7} roughness={0.25} metalness={0.6} transparent opacity={dim ? 0.25 : 1} />
      </mesh>
      <Html center distanceFactor={14} style={{ pointerEvents: "none", opacity: dim ? 0.3 : 1 }}>
        <div style={{ color: "#f3e7c0", fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", textShadow: "0 0 10px #000, 0 0 4px #000", transform: "translateY(-2.6em)", textAlign: "center" }}>
          {card.title}
          <div style={{ color: C.gold, fontFamily: "monospace", fontSize: 11 }}>{"★".repeat(Math.max(1, Math.round((card.quality || 0) / 2)))}</div>
        </div>
      </Html>
    </group>
  );
}

function Galaxy({ cards, sel, setSel }) {
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

  return (
    <group>
      {links.map((l, k) => (
        <Line key={k} points={[l.a, l.b]} color="#d4af37" lineWidth={l.w} transparent opacity={Math.min(0.55, 0.14 + l.w * 0.13)} />
      ))}
      {cards.map((c, i) => (
        <Node key={c.id} pos={positions[i]} card={c}
          active={sel === c.id} dim={sel != null && sel !== c.id}
          onClick={() => setSel(s => (s === c.id ? null : c.id))} />
      ))}
    </group>
  );
}

export default function LaddersDemo() {
  const [cards, setCards] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    applySeo({ title: "גלקסיית ההתכנסות", description: "מפת תלת-מימד של צירי ההתכנסות החזקים — סוד 1820", path: "/sulamot" });
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cs => {
      if (!live) return;
      setCards((cs || []).slice().sort((a, b) => (b.meter_score || 0) - (a.meter_score || 0)).slice(0, 14));
    }).catch(() => setCards([]));
    return () => { live = false; };
  }, []);

  const selCard = cards?.find(c => c.id === sel);

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 120px)", minHeight: 520, background: "radial-gradient(circle at 50% 40%, #0d0a04, #05030a)", direction: "rtl" }}>
      <div style={{ position: "absolute", top: 18, insetInlineStart: 0, insetInlineEnd: 0, textAlign: "center", zIndex: 2, pointerEvents: "none" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>סוד 1820 · ניסויים</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, margin: "4px 0 0", textShadow: `0 0 30px ${C.goldDeep}` }}>✦ גלקסיית ההתכנסות</h1>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>הצירים החזקים ביותר · קווים = הצטלבות מספרים · לחצו כדור</div>
      </div>

      {!cards ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>טוען את הגלקסיה…</div>
      ) : !cards.length ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: F.body }}>אין עדיין צירים מאושרים.</div>
      ) : (
        <Canvas camera={{ position: [0, 0, 16], fov: 55 }} onPointerMissed={() => setSel(null)}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1.2} color="#fff1cc" />
          <pointLight position={[-10, -6, -8]} intensity={0.5} color="#8458ff" />
          <Stars radius={60} depth={40} count={2200} factor={4} saturation={0} fade speed={0.6} />
          <Galaxy cards={cards} sel={sel} setSel={setSel} />
          <OrbitControls enablePan={false} autoRotate={sel == null} autoRotateSpeed={0.5} minDistance={9} maxDistance={26} />
        </Canvas>
      )}

      {selCard && (
        <div style={{ position: "absolute", insetInlineEnd: 16, top: 92, width: "min(330px, 86vw)", zIndex: 3,
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
    </div>
  );
}
