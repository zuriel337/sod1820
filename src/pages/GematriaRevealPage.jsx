import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { C, F, GEM } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// ===== מסתתר בתלת-מימד — שיטת ההפרשים של צוריאל =====
// מסתתר = סכום ההפרשים (בערך מוחלט) בין אותיות סמוכות.
// דוגמה: חכמה → |8-20|+|20-40|+|40-5| = 12+20+35 = 67 = בינה(רגיל).
//        התגלות → 395+397+27+24+394 = 1237.
// אומת מול טבלת bidim במסד (method='מסתתר').

const onlyHeb = s => [...(s || "")].filter(c => GEM[c] != null);

function compute(word) {
  const letters = onlyHeb(word);
  const pairs = [];
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i], b = letters[i + 1];
    pairs.push({ a, b, av: GEM[a], bv: GEM[b], diff: Math.abs(GEM[a] - GEM[b]) });
  }
  return { letters, pairs, total: pairs.reduce((s, p) => s + p.diff, 0) };
}

// טקסטורת אות עברית זוהרת.
function hebTile(ch) {
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.font = "bold 168px 'Times New Roman', serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.95)"; g.shadowBlur = 30;
  g.fillStyle = "#f6e27a"; g.fillText(ch, s / 2, s / 2 + 12);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
// טקסטורת תיבת-הפרש (מספר על לוח זהב כהה).
function numTile(n) {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.fillStyle = "#130d02"; g.fillRect(0, 0, s, s);
  g.strokeStyle = "#d4af37"; g.lineWidth = 8; g.strokeRect(7, 7, s - 14, s - 14);
  g.font = "bold 54px 'Courier New', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#f6e27a"; g.fillText(String(n), s / 2, s / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function makeGlow(color = "#ffd86b") {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, color); grd.addColorStop(0.25, color); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s); return new THREE.CanvasTexture(cv);
}

function GoldDust() {
  const ref = useRef();
  const tex = useMemo(() => makeGlow(), []);
  const geo = useMemo(() => {
    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = 4 + Math.random() * 15, th = Math.random() * Math.PI * 2; pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * 12; pos[i * 3 + 2] = Math.sin(th) * r - 4; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });
  return <points ref={ref} geometry={geo}><pointsMaterial map={tex} size={0.4} transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#ffd86b" opacity={0.8} /></points>;
}

function Letter({ tex, x, show, dim }) {
  const ref = useRef();
  useFrame((st, dt) => {
    if (!ref.current) return;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, show ? 1.2 : 0.001, Math.min(1, dt * 3));
    ref.current.scale.setScalar(s);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, Math.sin(st.clock.elapsedTime + x) * 0.06, 0.1);
    ref.current.material.opacity = THREE.MathUtils.lerp(ref.current.material.opacity, dim ? 0.35 : 1, 0.1);
  });
  return <sprite ref={ref} position={[x, 0, 0]} scale={0.001}><spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>;
}

// תיבת הפרש תלת-מימדית קטנה בין שתי אותיות.
function DiffBox({ value, x, show }) {
  const ref = useRef();
  const tex = useMemo(() => numTile(value), [value]);
  useFrame((st, dt) => {
    if (!ref.current) return;
    const s = THREE.MathUtils.lerp(ref.current.scale.x, show ? 1 : 0.001, Math.min(1, dt * 3.2));
    ref.current.scale.setScalar(s);
    ref.current.rotation.y += dt * 0.9;
    ref.current.position.y = 1.25 + Math.sin(st.clock.elapsedTime * 1.6 + x) * 0.06;
  });
  return (
    <mesh ref={ref} position={[x, 1.25, 0]} scale={0.001}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial map={tex} color="#caa83a" emissive="#3a2c00" emissiveIntensity={0.5} metalness={0.5} roughness={0.35} />
    </mesh>
  );
}

function Artifact({ tex, aspect, show }) {
  const g = useRef();
  useFrame((st, dt) => {
    if (!g.current) return;
    const s = THREE.MathUtils.lerp(g.current.scale.x, show && tex ? 1 : 0.0001, Math.min(1, dt * 3));
    g.current.scale.set(s, s, 1);
    g.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.3) * 0.1;
  });
  if (!tex) return null;
  const h = 2.7, w = h * (aspect || 1);
  return (
    <group ref={g} position={[0, -1.55, 0.5]} scale={0.0001}>
      <mesh position={[0, 0, -0.03]}><planeGeometry args={[w + 0.18, h + 0.18]} /><meshBasicMaterial color="#d4af37" /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  );
}

function Scene({ data, phase, revealed, tex, aspect }) {
  const n = data.letters.length;
  const lx = i => (i - (n - 1) / 2) * 1.5;
  const letterTex = useMemo(() => data.letters.map(hebTile), [data.letters]);
  return (
    <>
      <color attach="background" args={["#05030d"]} />
      <fog attach="fog" args={["#05030d", 11, 34]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 5, 6]} intensity={1.1} color="#fff3cf" />
      <Stars radius={70} depth={40} count={2200} factor={4} fade speed={0.5} />
      <GoldDust />
      {phase < 4 && data.letters.map((_, i) => <Letter key={i} tex={letterTex[i]} x={lx(i)} show={phase >= 0} dim={phase >= 2} />)}
      {phase < 4 && data.pairs.map((p, i) => <DiffBox key={i} value={p.diff} x={(lx(i) + lx(i + 1)) / 2} show={phase >= 1 && i < revealed} />)}
      <Artifact tex={tex} aspect={aspect} show={phase >= 4} />
    </>
  );
}

function Odometer({ to, run }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    let raf, t0;
    const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / 1100); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <span>{v}</span>;
}

const SAMPLES = ["התגלות", "חכמה", "משיח", "גאולה", "1820"];

export default function GematriaRevealPage() {
  const [word, setWord] = useState("התגלות");
  const [input, setInput] = useState("התגלות");
  const data = useMemo(() => compute(word), [word]);
  const [phase, setPhase] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [run, setRun] = useState(0);
  const [imgs, setImgs] = useState([]);
  const [img, setImg] = useState(null);
  const [tex, setTex] = useState(null);
  const [aspect, setAspect] = useState(1);
  const [equals, setEquals] = useState([]);

  useEffect(() => {
    document.title = "מסתתר בתלת-מימד · סוד 1820";
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // מילים שוות (רגיל) לערך המסתתר + תמונות אמיתיות של אותו מספר.
  useEffect(() => {
    let live = true; setImgs([]); setImg(null); setEquals([]);
    if (!data.total) return;
    supabase.from("gematria_words").select("phrase").eq("ragil", data.total).neq("phrase", word).limit(10)
      .then(({ data: d }) => { if (live && d) setEquals(d.map(r => r.phrase)); });
    supabase.from("gallery_images").select("id,name,image_url")
      .or(`primary_value.eq.${data.total},all_values.cs.{${data.total}}`).not("image_url", "is", null).limit(60)
      .then(({ data: d }) => { if (live && d?.length) { setImgs(d); setImg(d[Math.floor(Math.random() * d.length)]); } });
    return () => { live = false; };
  }, [data.total, word]);

  useEffect(() => {
    if (!img?.image_url) { setTex(null); return; }
    const tl = new THREE.TextureLoader(); tl.setCrossOrigin("anonymous"); let live = true;
    tl.load(img.image_url, t => { if (!live) return; t.colorSpace = THREE.SRGBColorSpace; setTex(t); setAspect((t.image?.width || 1) / (t.image?.height || 1)); }, undefined, () => { if (live) setTex(null); });
    return () => { live = false; };
  }, [img]);

  // ציר הזמן.
  useEffect(() => {
    setPhase(0); setRevealed(0);
    const np = data.pairs.length;
    const t = [];
    t.push(setTimeout(() => setPhase(1), 800));
    for (let i = 1; i <= np; i++) t.push(setTimeout(() => setRevealed(i), 800 + i * 520));
    const afterReveal = 800 + np * 520 + 500;
    t.push(setTimeout(() => setPhase(2), afterReveal));
    t.push(setTimeout(() => setPhase(3), afterReveal + 1500));
    t.push(setTimeout(() => setPhase(4), afterReveal + 2900));
    return () => t.forEach(clearTimeout);
  }, [run, data.pairs.length]);

  function go(w) { const c = onlyHeb(w).join(""); if (!c) return; setWord(/^\d+$/.test(w.trim()) ? w.trim() : c); setRun(r => r + 1); }
  function submit(e) { e.preventDefault(); go(input); }
  function another() { if (imgs.length) { setImg(imgs[Math.floor(Math.random() * imgs.length)]); setRun(r => r + 1); } }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05030d", zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0.7, 7.4], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene data={data} phase={phase} revealed={revealed} tex={tex} aspect={aspect} />
      </Canvas>

      {/* פאנל הסבר */}
      <div style={{ position: "absolute", top: 16, insetInline: 0, display: "flex", justifyContent: "center", direction: "rtl", padding: "0 14px", pointerEvents: "none" }}>
        <div style={{ background: "rgba(8,5,16,0.66)", backdropFilter: "blur(8px)", border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "13px 18px", maxWidth: 560, width: "100%", boxShadow: "0 14px 40px rgba(0,0,0,0.5)", pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>מסתתר · הפרשים בין אותיות</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>{word}</span>
          </div>

          {phase >= 1 && (
            <div style={{ marginTop: 10, display: "grid", gap: 5 }}>
              {data.pairs.slice(0, revealed).map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8, color: C.muted, fontFamily: F.body, fontSize: 13.5, animation: "rowIn .4s ease both" }}>
                  <span><b style={{ color: C.goldBright, fontFamily: F.regal }}>{p.a}</b>({p.av}) ← → <b style={{ color: C.goldBright, fontFamily: F.regal }}>{p.b}</b>({p.bv}) · ההפרש</span>
                  <b style={{ color: C.gold, fontFamily: F.mono, fontSize: 16 }}>{p.diff}</b>
                </div>
              ))}
            </div>
          )}

          {phase >= 2 && (
            <div style={{ marginTop: 11, paddingTop: 9, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>מסתתר =</span>
              <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 30, fontWeight: 800 }}><Odometer to={data.total} run={phase >= 2} /></span>
            </div>
          )}

          {phase >= 3 && equals.length > 0 && (
            <div style={{ marginTop: 8, color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.8, animation: "rowIn .5s ease both" }}>
              שווה בגימטריה רגילה ל: {equals.map((p, i) => <b key={i} style={{ color: C.goldLight }}>{p}{i < equals.length - 1 ? " · " : ""}</b>)}
            </div>
          )}
          {phase >= 4 && img?.name && (
            <div style={{ marginTop: 6, color: C.goldDim, fontFamily: F.body, fontSize: 12, animation: "rowIn .5s ease both" }}>🖼 רמז אמיתי מהמספר {data.total}: {img.name}</div>
          )}
          {phase >= 4 && img == null && (
            <div style={{ marginTop: 6, color: C.goldDim, fontFamily: F.body, fontSize: 12 }}>אין עדיין תמונה למספר {data.total} במאגר.</div>
          )}
        </div>
      </div>

      {/* בקרים + קלט מילה */}
      <div style={{ position: "absolute", bottom: 18, insetInline: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, direction: "rtl" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {SAMPLES.map(s => <button key={s} onClick={() => { setInput(s); go(s); }} className="gr-chip">{s}</button>)}
        </div>
        <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="הקלידו מילה…" style={{ background: "rgba(8,5,16,0.7)", border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 16px", outline: "none", textAlign: "center", width: 170 }} />
          <button type="submit" className="gr-btn">חשב ✦</button>
          <button type="button" onClick={another} className="gr-btn">🎲</button>
          <Link to="/" className="gr-btn">←</Link>
        </form>
      </div>

      <style>{`
        .gr-btn { cursor:pointer; background:rgba(8,5,16,0.6); color:${C.goldLight}; border:1px solid ${C.borderGold}; border-radius:999px; backdrop-filter:blur(8px); font-family:${F.heading}; font-size:13px; font-weight:700; padding:9px 16px; text-decoration:none; }
        .gr-btn:hover { color:${C.goldBright}; border-color:${C.gold}; }
        .gr-chip { cursor:pointer; background:rgba(20,15,12,0.5); color:${C.goldLight}; border:1px solid ${C.border}; border-radius:999px; font-family:${F.body}; font-size:13px; padding:6px 14px; }
        .gr-chip:hover { border-color:${C.gold}; color:${C.goldBright}; }
        @keyframes rowIn { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
      `}</style>
    </div>
  );
}
