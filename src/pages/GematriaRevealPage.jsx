import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { C, F, GEM } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// ===== דוגמת חישוב נסתר (מסתתר) בתלת-מימד + תמונה אמיתית של המספר =====
// המילה מתפרקת לאותיות מרחפות, כל אות נפתחת למילוי שלה והערך הנסתר (מילוי − האות),
// הסכום מתגבש, ואז עולה תמונה אמיתית מהאוצר של מספר ההתגלות (1237).

const WORD = "התגלות";
const ART_NUMBER = 1237;

// מילוי (שם מלא של האות) — לשיטת "מסתתר": נסתר = מילוי − ערך האות.
const MILUI = {
  "א": ["אלף", 111], "ב": ["בית", 412], "ג": ["גימל", 83], "ד": ["דלת", 434], "ה": ["הא", 6],
  "ו": ["וו", 12], "ז": ["זין", 67], "ח": ["חית", 418], "ט": ["טית", 419], "י": ["יוד", 20],
  "כ": ["כף", 100], "ך": ["כף", 100], "ל": ["למד", 74], "מ": ["מם", 80], "ם": ["מם", 80],
  "נ": ["נון", 106], "ן": ["נון", 106], "ס": ["סמך", 120], "ע": ["עין", 130], "פ": ["פא", 81], "ף": ["פא", 81],
  "צ": ["צדי", 104], "ץ": ["צדי", 104], "ק": ["קוף", 186], "ר": ["ריש", 510], "ש": ["שין", 360], "ת": ["תו", 406],
};

function computeRows(word) {
  return [...word].map(ch => {
    const face = GEM[ch] || 0;
    const [name, nameVal] = MILUI[ch] || [ch, face];
    return { ch, face, name, nameVal, hidden: nameVal - face };
  });
}

// טקסטורת אות עברית זוהרת על רקע שקוף.
function hebTile(ch) {
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.font = "bold 168px 'Times New Roman', serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.95)"; g.shadowBlur = 30;
  g.fillStyle = "#f6e27a"; g.fillText(ch, s / 2, s / 2 + 12);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

function makeGlow(color = "#ffe6a0") {
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, color); grd.addColorStop(0.25, color); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

function GoldDust() {
  const ref = useRef();
  const tex = useMemo(() => makeGlow("#ffd86b"), []);
  const geo = useMemo(() => {
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + Math.random() * 16, th = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = Math.sin(th) * r - 4;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });
  return <points ref={ref} geometry={geo}>
    <pointsMaterial map={tex} size={0.4} transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#ffd86b" opacity={0.85} />
  </points>;
}

// אותיות מרחפות שמתכנסות למרכז בשלב החישוב.
function Letters({ rows, phase }) {
  const refs = useRef([]);
  const texes = useMemo(() => rows.map(r => hebTile(r.ch)), [rows]);
  const n = rows.length;
  useFrame((st, dt) => {
    const k = Math.min(1, dt * 2.4);
    rows.forEach((_, i) => {
      const m = refs.current[i]; if (!m) return;
      const baseX = (i - (n - 1) / 2) * 1.5;
      const conv = phase >= 2;
      const tx = conv ? 0 : baseX, ty = conv ? 1.6 : Math.sin(st.clock.elapsedTime + i) * 0.08, tz = conv ? 1.2 : 0;
      m.position.x += (tx - m.position.x) * k;
      m.position.y += (ty - m.position.y) * k;
      m.position.z += (tz - m.position.z) * k;
      const ts = conv ? 0.02 : 1.25;
      const cur = THREE.MathUtils.lerp(m.scale.x, ts, k);
      m.scale.setScalar(cur);
      m.material.opacity = THREE.MathUtils.clamp(THREE.MathUtils.lerp(m.material.opacity, conv ? 0 : 1, k), 0, 1);
    });
  });
  return rows.map((r, i) => (
    <sprite key={i} ref={el => (refs.current[i] = el)} position={[(i - (n - 1) / 2) * 1.5, 0, 0]} scale={1.25}>
      <spriteMaterial map={texes[i]} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  ));
}

// תמונת האוצר — נולדת מתוך הזוהר (3D plane + מסגרת זהב).
function Artifact({ tex, aspect, show }) {
  const g = useRef();
  useFrame((st, dt) => {
    if (!g.current) return;
    const target = show && tex ? 1 : 0.0001;
    const s = THREE.MathUtils.lerp(g.current.scale.x, target, Math.min(1, dt * 3));
    g.current.scale.set(s, s, 1);
    g.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.3) * 0.1;
  });
  if (!tex) return null;
  const h = 3.2, w = h * (aspect || 1);
  return (
    <group ref={g} position={[0, 0.1, 0]} scale={0.0001}>
      <mesh position={[0, 0, -0.03]}><planeGeometry args={[w + 0.2, h + 0.2]} /><meshBasicMaterial color="#d4af37" /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  );
}

function Scene({ rows, phase, tex, aspect }) {
  return (
    <>
      <color attach="background" args={["#05030d"]} />
      <fog attach="fog" args={["#05030d", 10, 32]} />
      <Stars radius={70} depth={40} count={2500} factor={4} fade speed={0.5} />
      <GoldDust />
      {phase < 4 && <Letters rows={rows} phase={phase} />}
      <Artifact tex={tex} aspect={aspect} show={phase >= 4} />
    </>
  );
}

// מונה מתגלגל לערך הסופי.
function Odometer({ to, run }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    let raf, t0;
    const step = (t) => { t0 ??= t; const p = Math.min(1, (t - t0) / 1100); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <span>{v}</span>;
}

export default function GematriaRevealPage() {
  const rows = useMemo(() => computeRows(WORD), []);
  const total = useMemo(() => rows.reduce((s, r) => s + r.hidden, 0), [rows]);
  const [phase, setPhase] = useState(0);
  const [run, setRun] = useState(0);
  const [imgs, setImgs] = useState([]);
  const [img, setImg] = useState(null);
  const [tex, setTex] = useState(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    document.title = "מסתתר · חישוב נסתר בתלת-מימד · סוד 1820";
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // שליפת תמונות אמיתיות של מספר ההתגלות.
  useEffect(() => {
    let live = true;
    supabase.from("gallery_images")
      .select("id,name,description,image_url")
      .or(`primary_value.eq.${ART_NUMBER},all_values.cs.{${ART_NUMBER}}`)
      .not("image_url", "is", null).limit(60)
      .then(({ data }) => { if (live && data?.length) { setImgs(data); setImg(data[Math.floor(Math.random() * data.length)]); } });
    return () => { live = false; };
  }, []);

  // טעינת טקסטורת התמונה הנבחרת.
  useEffect(() => {
    if (!img?.image_url) { setTex(null); return; }
    const tl = new THREE.TextureLoader(); tl.setCrossOrigin("anonymous");
    let live = true;
    tl.load(img.image_url, t => { if (!live) return; t.colorSpace = THREE.SRGBColorSpace; setTex(t); setAspect((t.image?.width || 1) / (t.image?.height || 1)); }, undefined, () => { if (live) setTex(null); });
    return () => { live = false; };
  }, [img]);

  // ציר הזמן של החשיפה.
  useEffect(() => {
    setPhase(0);
    const t = [
      setTimeout(() => setPhase(1), 900),                 // חשיפת המילוי
      setTimeout(() => setPhase(2), 900 + rows.length * 420 + 400), // התכנסות + מונה
      setTimeout(() => setPhase(3), 900 + rows.length * 420 + 1900), // הסכום הנסתר
      setTimeout(() => setPhase(4), 900 + rows.length * 420 + 3200), // עליית התמונה
    ];
    return () => t.forEach(clearTimeout);
  }, [run, rows.length]);

  function replay() { setRun(r => r + 1); }
  function another() { if (imgs.length) { setImg(imgs[Math.floor(Math.random() * imgs.length)]); setRun(r => r + 1); } }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05030d", zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0.4, 7.5], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <Scene rows={rows} phase={phase} tex={tex} aspect={aspect} />
      </Canvas>

      {/* פאנל ההסבר (עברית חדה) */}
      <div style={{
        position: "absolute", top: 18, insetInline: 0, display: "flex", justifyContent: "center",
        direction: "rtl", pointerEvents: "none", padding: "0 14px",
      }}>
        <div style={{
          background: "rgba(8,5,16,0.62)", backdropFilter: "blur(8px)", border: `1px solid ${C.borderGold}`,
          borderRadius: 16, padding: "14px 18px", maxWidth: 560, width: "100%", boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>שיטת מסתתר · החישוב הנסתר</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>{WORD}</span>
          </div>

          {/* טבלת המילוי הנסתר */}
          {phase >= 1 && (
            <div style={{ marginTop: 12, display: "grid", gap: 5 }}>
              {rows.map((r, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "26px 1fr auto", alignItems: "center", gap: 8,
                  color: C.muted, fontFamily: F.body, fontSize: 13.5, opacity: 0,
                  animation: `rowIn .45s ease forwards`, animationDelay: `${i * 0.34}s`,
                }}>
                  <b style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18 }}>{r.ch}</b>
                  <span>מילוי <b style={{ color: C.goldLight }}>{r.name}</b> = {r.nameVal} − {r.face} (האות)</span>
                  <b style={{ color: C.gold, fontFamily: F.mono }}>{r.hidden}</b>
                </div>
              ))}
            </div>
          )}

          {/* הסכום */}
          {phase >= 2 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>סך נסתר =</span>
              <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 30, fontWeight: 800 }}>
                <Odometer to={total} run={phase >= 2} />
              </span>
            </div>
          )}

          {/* גשר אל המספר והתמונה */}
          {phase >= 3 && (
            <div style={{ marginTop: 10, color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, animation: "rowIn .5s ease both" }}>
              ומאחורי כל מספר חבוי אוצר — הנה רמז אמיתי מהמספר{" "}
              <b style={{ color: C.goldBright, fontFamily: F.mono }}>{ART_NUMBER}</b> (מספר ההתגלות):
              {img?.name && <span style={{ color: C.goldLight }}> {" · "}{img.name}</span>}
            </div>
          )}
        </div>
      </div>

      {/* בקרים */}
      <div style={{ position: "absolute", bottom: 22, insetInline: 0, display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={replay} className="gr-btn">▶ הרץ שוב</button>
        <button onClick={another} className="gr-btn">🎲 תמונה אחרת</button>
        <Link to="/" className="gr-btn">← יציאה</Link>
      </div>

      <style>{`
        .gr-btn { cursor:pointer; background:rgba(8,5,16,0.6); color:${C.goldLight}; border:1px solid ${C.borderGold};
          border-radius:999px; backdrop-filter:blur(8px); font-family:${F.heading}; font-size:13px; font-weight:700;
          padding:9px 18px; text-decoration:none; }
        .gr-btn:hover { color:${C.goldBright}; border-color:${C.gold}; }
        @keyframes rowIn { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
      `}</style>
    </div>
  );
}
