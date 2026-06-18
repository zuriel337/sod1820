import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles, Html, OrbitControls } from "@react-three/drei";
import { useParams, useNavigate } from "react-router-dom";
import { C, F, KEY_NUMBERS } from "../theme.js";
import { applySeo } from "../lib/seo.js";

// ===== גלקסיות — namespace מערכתי קבוע למסך-מלא (/galaxy/:slug) =====
// כל גלקסיה = מדור אינטראקטיבי במסך מלא, נכנסים אליו מהיכל השערים.
// כל כוכב = ישות בגרף (מספר מפתח); לחיצה פותחת את הדף הקנוני /number/:n
// (חוק העץ האחד — מציירים פעם אחת, מפנים מכל מקום).
//
// להוסיף מדור/גלקסיה חדשה = שורה אחת ב-GALAXIES + דלת בהיכל.
const GALAXIES = {
  numbers: {
    title: "גלקסיית עץ המספרים",
    subtitle: "כל כוכב — מספר מפתח. געו בו והיכנסו אל הדף שלו.",
    accent: "#f6e27a",
    nodes: Object.entries(KEY_NUMBERS).map(([n, label]) => ({ n: Number(n), label })),
  },
};

// פיזור פיבונאצ'י על ספירה — גלקסיה תלת-ממדית מאוזנת
function fibSphere(n, R) {
  if (n <= 1) return [[0, 0, 0]];
  const pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * inc;
    pts.push([Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R]);
  }
  return pts;
}

function StarNode({ node, pos, accent, onPick }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.4; });
  return (
    <group position={pos}>
      <mesh ref={ref}
        onClick={(e) => { e.stopPropagation(); onPick(node); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "default"; }}>
        <sphereGeometry args={[hover ? 0.46 : 0.34, 28, 28]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={hover ? 2.2 : 1.1} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={15} style={{ pointerEvents: "none" }}>
        <div style={{
          color: "#fff", fontFamily: "monospace", fontWeight: 800, fontSize: hover ? 15 : 12,
          textShadow: `0 0 8px #000, 0 0 14px ${accent}`, whiteSpace: "nowrap", transform: "translateY(-26px)",
        }}>{node.n}</div>
      </Html>
    </group>
  );
}

function GalaxyScene({ g, onPick }) {
  const pts = useMemo(() => fibSphere(g.nodes.length, 6.5), [g.nodes.length]);
  const grp = useRef();
  useFrame(({ clock }) => { if (grp.current) grp.current.rotation.y = clock.elapsedTime * 0.05; });
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={2.2} color={g.accent} />
      <Stars radius={90} depth={50} count={3500} factor={4} fade speed={1} />
      <Sparkles count={70} scale={16} size={3} speed={0.3} color={g.accent} />
      {/* גרעין הגלקסיה הזוהר */}
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color={g.accent} emissive={g.accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <group ref={grp}>
        {g.nodes.map((node, i) => (
          <StarNode key={node.n} node={node} pos={pts[i]} accent={g.accent} onPick={onPick} />
        ))}
      </group>
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.35} minDistance={7} maxDistance={22} />
    </>
  );
}

const backBtn = {
  position: "absolute", top: 16, insetInlineStart: 16, zIndex: 5, cursor: "pointer",
  background: "rgba(8,5,2,.72)", color: "#f6e27a", border: "1px solid rgba(212,175,55,.42)",
  borderRadius: 999, padding: "8px 16px", fontFamily: F.heading, fontWeight: 700, fontSize: 14,
  backdropFilter: "blur(4px)",
};

export default function GalaxyPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const g = GALAXIES[slug];

  useEffect(() => {
    applySeo({
      title: (g ? g.title : "גלקסיה") + " — סוד 1820",
      description: g ? g.subtitle : "גלקסיות סוד 1820 — מדורים אינטראקטיביים במסך מלא.",
      path: `/galaxy/${slug || ""}`,
    });
  }, [slug, g]);

  if (!g) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "radial-gradient(circle at 50% 45%, #0b0a1e, #04030a)", direction: "rtl", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 40 }}>🌌</div>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, fontWeight: 800 }}>הגלקסיה הזו בבנייה</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14 }}>בקרוב ייפתח כאן מדור חדש.</div>
        <button onClick={() => nav("/היכל")} style={{ ...backBtn, position: "static", marginTop: 8 }}>← חזרה להיכל השערים</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "radial-gradient(circle at 50% 45%, #0b0a1e, #04030a)", direction: "rtl" }}>
      <Canvas camera={{ position: [0, 0, 14], fov: 60 }}>
        <GalaxyScene g={g} onPick={(node) => nav(`/number/${node.n}`)} />
      </Canvas>

      {/* כותרת הגלקסיה */}
      <div style={{ position: "absolute", top: 16, insetInline: 0, textAlign: "center", pointerEvents: "none", zIndex: 4 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4 }}>גלקסיה · מסך מלא</div>
        <div style={{ color: g.accent, fontFamily: F.regal, fontSize: "clamp(20px,4vw,32px)", fontWeight: 800, textShadow: "0 0 30px #000" }}>{g.title}</div>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 4 }}>{g.subtitle}</div>
      </div>

      {/* חזרה להיכל */}
      <button onClick={() => nav("/היכל")} style={backBtn}>← היכל השערים</button>
    </div>
  );
}
