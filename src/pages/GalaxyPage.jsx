import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles, Html, OrbitControls } from "@react-three/drei";
import { useParams, useNavigate } from "react-router-dom";
import { C, F, KEY_NUMBERS } from "../theme.js";
import { applySeo } from "../lib/seo.js";
import { getTopicCardBySlug, getGalleryImagesByIds } from "../lib/supabase.js";

const decodeHtml = (s) => { try { const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value; } catch { return s || ""; } };

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

// כרטיס-תמונה מרחף (drei Html) — לחיצה פותחת את ההסבר המלא
function ImageCard({ img, pos, onPick }) {
  const [hover, setHover] = useState(false);
  return (
    <group position={pos}>
      <Html center distanceFactor={12} style={{ pointerEvents: "auto" }} zIndexRange={[20, 0]}>
        <button onClick={() => onPick(img)}
          onMouseEnter={() => { setHover(true); document.body.style.cursor = "pointer"; }}
          onMouseLeave={() => { setHover(false); document.body.style.cursor = "default"; }}
          title={img.name ? decodeHtml(img.name) : "תמונה מהגלריה"}
          style={{
            width: hover ? 128 : 112, height: hover ? 128 : 112, padding: 0, cursor: "pointer",
            border: `2px solid ${hover ? "#f6e27a" : "rgba(212,175,55,.5)"}`, borderRadius: 12, overflow: "hidden",
            background: "#000", boxShadow: hover ? "0 0 30px rgba(212,175,55,.6)" : "0 0 16px rgba(0,0,0,.6)",
            transition: "all .2s ease",
          }}>
          <img src={img.image_url} alt={img.name || ""} loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </button>
      </Html>
    </group>
  );
}

function GalaxyScene({ g, onPick, onPickImage }) {
  const nums = g.nodes || [];
  const imgs = g.images || [];
  const numPts = useMemo(() => fibSphere(nums.length, 6), [nums.length]);
  const imgPts = useMemo(() => fibSphere(imgs.length, 10.5), [imgs.length]);
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
        {nums.map((node, i) => (
          <StarNode key={node.n} node={node} pos={numPts[i]} accent={g.accent} onPick={onPick} />
        ))}
        {imgs.map((im, i) => (
          <ImageCard key={im.id || i} img={im} pos={imgPts[i]} onPick={onPickImage} />
        ))}
      </group>
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.3} minDistance={7} maxDistance={30} />
    </>
  );
}

// חלונית הסבר לתמונה — תמונה גדולה + תיאור + מספרי OCR לחיצים
function ImageOverlay({ img, onClose, nav }) {
  const nums = [...new Set((img.ocr_numbers || []).map(Number).filter(n => n > 0))].slice(0, 14);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(3,2,8,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, direction: "rtl" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(880px,96vw)", maxHeight: "92vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 14, background: "rgba(12,9,18,.97)", border: "1px solid rgba(212,175,55,.4)", borderRadius: 16, padding: 18, boxShadow: "0 20px 70px rgba(0,0,0,.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#f6e27a", fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>{img.name ? decodeHtml(img.name) : "תמונה מהגלריה"}</div>
          <button onClick={onClose} aria-label="סגור" style={{ background: "none", border: "none", color: "#cfc9d6", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <img src={img.image_url} alt={img.name || ""} style={{ width: "100%", maxHeight: "52vh", objectFit: "contain", borderRadius: 10, background: "#000" }} />
        {img.description && <div style={{ color: "#e8e2d2", fontFamily: F.body, fontSize: 15, lineHeight: 1.75 }}>{decodeHtml(img.description)}</div>}
        {nums.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#cfc9d6", fontFamily: F.heading, fontSize: 12 }}>מספרים בתמונה:</span>
            {nums.map(n => (
              <button key={n} onClick={() => nav(`/number/${n}`)} style={{ cursor: "pointer", fontFamily: F.mono, fontWeight: 800, fontSize: 13, color: "#1a0e00", background: "linear-gradient(135deg,#e9c84a,#9a7818)", border: "none", borderRadius: 999, padding: "4px 12px" }}>{n}</button>
            ))}
          </div>
        )}
      </div>
    </div>
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
  const [g, setG] = useState(() => GALAXIES[slug] || null);
  const [loading, setLoading] = useState(!GALAXIES[slug]);
  const [sel, setSel] = useState(null); // תמונה נבחרת לחלונית הסבר

  // גלקסיה סטטית (רישום) → מיידי; אחרת — נשאב טופיק לפי slug (כל טופיק = גלקסיה,
  // המספרים המובלטים שלו = כוכבים → לחיצה פותחת /number/:n).
  useEffect(() => {
    if (GALAXIES[slug]) { setG(GALAXIES[slug]); setLoading(false); return; }
    let alive = true; setLoading(true);
    getTopicCardBySlug(slug).then(async t => {
      if (!alive) return;
      const nums = [...new Set((((t && t.highlight_numbers) || []).map(Number)).filter(Boolean))];
      const imgIds = (t && t.image_ids) || [];
      if (t && (nums.length || imgIds.length)) {
        let images = [];
        if (imgIds.length) { try { images = await getGalleryImagesByIds(imgIds); } catch { /* ignore */ } }
        if (!alive) return;
        setG({
          title: t.title || "גלקסיה",
          subtitle: t.subtitle || "כל כוכב — מספר; כל תמונה — רמז. געו וחקרו.",
          accent: "#f6e27a",
          nodes: nums.map(n => ({ n, label: "" })),
          images,
        });
      } else setG(null);
      setLoading(false);
    }).catch(() => { if (alive) { setG(null); setLoading(false); } });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    applySeo({
      title: (g ? g.title : "גלקסיה") + " — סוד 1820",
      description: g ? g.subtitle : "גלקסיות סוד 1820 — מדורים אינטראקטיביים במסך מלא.",
      path: `/galaxy/${slug || ""}`,
    });
  }, [slug, g]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "radial-gradient(circle at 50% 45%, #0b0a1e, #04030a)", direction: "rtl", display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>
        טוען גלקסיה…
      </div>
    );
  }

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
      <Canvas camera={{ position: [0, 0, 16], fov: 60 }}>
        <GalaxyScene g={g} onPick={(node) => nav(`/number/${node.n}`)} onPickImage={setSel} />
      </Canvas>

      {sel && <ImageOverlay img={sel} onClose={() => setSel(null)} nav={nav} />}

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
