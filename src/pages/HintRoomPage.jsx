import React, { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Html, Float, Sparkles } from "@react-three/drei";
import { useParams, Link } from "react-router-dom";
import * as THREE from "three";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// ===== חדר הרמז — /cheder/:n =====
// חדר תלת-מימד אימרסיבי לכל מספר/אות. כל insight = פאנל צף.
// לחיצה → הקראה עברית (Web Speech API). תמונות מהזרם על הקירות.

// ── TTS עברי ──
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "he-IL";
  utt.rate = 0.82;
  utt.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const heb = voices.find(v => v.lang === "he-IL" || v.lang === "he");
  if (heb) utt.voice = heb;
  window.speechSynthesis.speak(utt);
}
function stopSpeak() { window.speechSynthesis?.cancel(); }

// ── טקסטורת מספר זוהר ──
function makeNumberTex(n) {
  const w = 512, h = 256, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.font = "bold 160px 'Courier New', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(212,175,55,0.95)"; g.shadowBlur = 40;
  g.fillStyle = "#f6e27a";
  g.fillText(String(n), w / 2, h / 2);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// ── מרכז — המספר הגדול שנושם ──
function NumberCore({ n }) {
  const ref = useRef();
  const tex = useMemo(() => makeNumberTex(n), [n]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.22;
    const s = 1 + Math.sin(Date.now() * 0.001) * 0.06;
    ref.current.scale.setScalar(s);
  });
  return (
    <group ref={ref}>
      <Sparkles count={60} scale={4} size={3} speed={0.3} color="#d4af37" opacity={0.7} />
      <mesh>
        <planeGeometry args={[3.6, 1.8]} />
        <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#d4af37" intensity={2.5} distance={8} />
    </group>
  );
}

// ── פאנל insight צף ──
function InsightPanel({ insight, position, active, onClick }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.y += Math.sin(Date.now() * 0.0008 + position[0]) * dt * 0.15;
  });
  const [hov, setHov] = useState(false);
  return (
    <group ref={ref} position={position}>
      <Html
        distanceFactor={10}
        style={{ pointerEvents: "auto", userSelect: "none" }}
        center
      >
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          onClick={onClick}
          style={{
            width: 240,
            background: active
              ? "rgba(212,175,55,0.18)"
              : hov
              ? "rgba(212,175,55,0.10)"
              : "rgba(6,4,14,0.82)",
            border: `1.5px solid ${active ? "rgba(212,175,55,0.85)" : "rgba(212,175,55,0.28)"}`,
            borderRadius: 16,
            padding: "14px 16px",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            boxShadow: active ? "0 0 28px rgba(212,175,55,0.35)" : "0 4px 18px rgba(0,0,0,0.5)",
            transition: "all 0.2s",
            direction: "rtl",
          }}
        >
          <div style={{ color: "#d4af37", fontFamily: F.heading, fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1, opacity: 0.7 }}>
            {insight.origin === "ai" ? "🔵 AI · מאומת" : "✦ חידוש"}
            {(insight.related_numbers || []).slice(0, 3).map(n => (
              <span key={n} style={{ marginRight: 5, color: "rgba(212,175,55,0.7)", fontFamily: F.mono, fontSize: 10 }}>{n}</span>
            ))}
          </div>
          <div style={{ color: "#f0e8d0", fontFamily: F.regal, fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, marginBottom: 6 }}>
            {insight.title}
          </div>
          {insight.body && (
            <div style={{ color: "rgba(240,232,208,0.65)", fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7, maxHeight: 80, overflow: "hidden", maskImage: "linear-gradient(to bottom,#000 70%,transparent)" }}>
              {insight.body.slice(0, 160)}
            </div>
          )}
          <div style={{ marginTop: 8, color: active ? "#d4af37" : "rgba(212,175,55,0.45)", fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>
            {active ? "🔊 מקריא…" : "▶ לחץ להקראה"}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ── מסגרת תמונה צפה ──
function ImageFrame({ img, position }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={ref} position={position}>
      <Html distanceFactor={14} center style={{ pointerEvents: "none" }}>
        <div style={{
          width: 140, height: 90, overflow: "hidden", borderRadius: 10,
          border: "1px solid rgba(212,175,55,0.3)",
          boxShadow: "0 0 20px rgba(212,175,55,0.15)",
          opacity: 0.8,
        }}>
          <img src={img.image_url} alt={img.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </Html>
    </group>
  );
}

// ── סצנה ראשית ──
function Scene({ n, insights, images, activeIdx, onSelect }) {
  const count = insights.length;
  const R = Math.max(5, count * 1.4);

  return (
    <>
      <Stars radius={80} depth={40} count={2000} factor={3} fade />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 8, 0]} color="#d4af37" intensity={1.2} />

      {/* מרכז — המספר הגדול */}
      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.4}>
        <NumberCore n={n} />
      </Float>

      {/* פאנלי insights בסביבו */}
      {insights.map((ins, i) => {
        const a = (i / count) * Math.PI * 2;
        const pos = [Math.cos(a) * R, (i % 2 === 0 ? 0.6 : -0.6), Math.sin(a) * R];
        return (
          <InsightPanel
            key={ins.id}
            insight={ins}
            position={pos}
            active={activeIdx === i}
            onClick={() => onSelect(i)}
          />
        );
      })}

      {/* תמונות — טבעת חיצונית */}
      {images.slice(0, 8).map((img, i) => {
        const a = (i / Math.min(images.length, 8)) * Math.PI * 2 + 0.4;
        const pos = [Math.cos(a) * (R + 4.5), (i % 2 === 0 ? 2 : -2), Math.sin(a) * (R + 4.5)];
        return <ImageFrame key={img.id} img={img} position={pos} />;
      })}
    </>
  );
}

// ── HUD — פאנל מידע בצד ──
function HUD({ n, insights, images, activeIdx, onSelect, loading }) {
  const active = activeIdx != null ? insights[activeIdx] : null;
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 300, height: "100vh",
      background: "linear-gradient(to left, rgba(4,2,10,0.88), transparent)",
      backdropFilter: "blur(4px)", padding: "28px 20px", direction: "rtl",
      display: "flex", flexDirection: "column", gap: 12, zIndex: 10,
      overflowY: "auto",
    }}>
      <Link to="/ניסיון" style={{ color: "rgba(212,175,55,0.5)", fontFamily: F.heading, fontSize: 11, textDecoration: "none" }}>
        ← ניסויים
      </Link>
      <div style={{ color: "#d4af37", fontFamily: F.mono, fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{n}</div>
      <div style={{ color: "rgba(212,175,55,0.55)", fontFamily: F.heading, fontSize: 11, letterSpacing: 2 }}>
        {loading ? "טוען…" : `${insights.length} חידושים · ${images.length} תמונות`}
      </div>

      <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: 12, marginTop: 4 }}>
        {active ? (
          <>
            <div style={{ color: "#d4af37", fontFamily: F.heading, fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>🔊 מוקרא עכשיו</div>
            <div style={{ color: "#f0e8d0", fontFamily: F.regal, fontSize: 14, fontWeight: 700, lineHeight: 1.6, marginBottom: 8 }}>
              {active.title}
            </div>
            {active.body && (
              <div style={{ color: "rgba(240,232,208,0.7)", fontFamily: F.body, fontSize: 12, lineHeight: 1.8, maxHeight: 220, overflowY: "auto" }}>
                {active.body}
              </div>
            )}
            {active.source_ref && (
              <Link to={`/${active.source_ref}`}
                style={{ display: "inline-block", marginTop: 10, color: "#d4af37", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>
                ← לפוסט המלא
              </Link>
            )}
            <button onClick={stopSpeak} style={{ marginTop: 10, display: "block", background: "none", border: "1px solid rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.6)", borderRadius: 999, padding: "5px 14px", cursor: "pointer", fontFamily: F.heading, fontSize: 11 }}>
              ■ עצור הקראה
            </button>
          </>
        ) : (
          <div style={{ color: "rgba(212,175,55,0.35)", fontFamily: F.body, fontSize: 12, lineHeight: 1.8 }}>
            לחץ על פאנל בחלל<br />כדי לשמוע את הרמז
          </div>
        )}
      </div>

      {/* רשימת כל הchidushim */}
      <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ color: "rgba(212,175,55,0.4)", fontFamily: F.heading, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>כל החידושים</div>
        {insights.map((ins, i) => (
          <button key={ins.id} onClick={() => onSelect(i)} style={{
            background: activeIdx === i ? "rgba(212,175,55,0.12)" : "none",
            border: `1px solid ${activeIdx === i ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.12)"}`,
            borderRadius: 8, padding: "7px 10px", cursor: "pointer", textAlign: "right", direction: "rtl",
          }}>
            <div style={{ color: "#f0e8d0", fontFamily: F.regal, fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{ins.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── דף ראשי ──
export default function HintRoomPage() {
  const { n: nRaw } = useParams();
  const n = parseInt(nRaw, 10) || 400;

  const [insights, setInsights] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(null);

  useEffect(() => {
    setLoading(true);
    setActiveIdx(null);
    stopSpeak();

    const fetchAll = async () => {
      // חידושים הקשורים למספר
      const { data: ins } = await supabase
        .from("insights")
        .select("id,title,body,origin,source_ref,related_numbers")
        .eq("is_active", true)
        .contains("related_numbers", [n])
        .order("created_at", { ascending: false })
        .limit(20);

      // תמונות מהזרם/גלריה
      const { data: imgs } = await supabase
        .from("gallery_images")
        .select("id,image_url,name,primary_value")
        .or(`primary_value.eq.${n},all_values.cs.{${n}}`)
        .not("image_url", "is", null)
        .order("importance", { ascending: false, nullsFirst: false })
        .limit(12);

      setInsights(ins || []);
      setImages(imgs || []);
      setLoading(false);
    };

    fetchAll().catch(() => setLoading(false));
  }, [n]);

  function handleSelect(i) {
    setActiveIdx(prev => prev === i ? null : i);
    if (insights[i]) {
      const text = `${insights[i].title}. ${insights[i].body || ""}`;
      speak(text);
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#04020e", position: "relative", overflow: "hidden" }}>
      {/* Canvas תלת-מימד */}
      <Canvas
        camera={{ position: [0, 2, 14], fov: 60 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene
            n={n}
            insights={insights}
            images={images}
            activeIdx={activeIdx}
            onSelect={handleSelect}
          />
        </Suspense>
      </Canvas>

      {/* HUD צד ימין */}
      <HUD
        n={n}
        insights={insights}
        images={images}
        activeIdx={activeIdx}
        onSelect={handleSelect}
        loading={loading}
      />

      {/* כפתור ניווט למספר אחר */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 10, alignItems: "center" }}>
        <NumberNav current={n} />
      </div>
    </div>
  );
}

// ── ניווט מהיר בין מספרים ──
const HOT = [400, 45, 1820, 380, 138, 59, 358, 1414];
function NumberNav({ current }) {
  return (
    <>
      {HOT.map(m => (
        <Link key={m} to={`/cheder/${m}`} style={{
          display: "inline-block",
          background: m === current ? "rgba(212,175,55,0.22)" : "rgba(4,2,14,0.7)",
          border: `1px solid ${m === current ? "rgba(212,175,55,0.7)" : "rgba(212,175,55,0.2)"}`,
          color: m === current ? "#d4af37" : "rgba(212,175,55,0.45)",
          fontFamily: F.mono, fontSize: 13, fontWeight: 700,
          borderRadius: 999, padding: "6px 14px", textDecoration: "none",
          backdropFilter: "blur(8px)",
        }}>
          {m}
        </Link>
      ))}
    </>
  );
}
