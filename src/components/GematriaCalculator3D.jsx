import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { METHODS, onlyHeb, GEM, mistater } from "../lib/gematria.js";

// ===== מחשבון גימטריה תלת-מימדי — 8 שיטות, כרטיסים צפים לחיצים =====
// מקלידים מילה → 8 כרטיסים תלת-מימדיים עם הערך בכל שיטה; לחיצה בוחרת שיטה ומציגה מילים שוות.

function hebTile(ch) {
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const g = cv.getContext("2d");
  g.fillStyle = "rgba(6,4,14,0.92)"; g.fillRect(28, 28, s - 56, s - 56);
  g.lineWidth = 6; g.strokeStyle = "#d4af37"; g.strokeRect(28, 28, s - 56, s - 56);
  g.font = "900 150px 'Arial Hebrew', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,220,120,0.9)"; g.shadowBlur = 20; g.fillStyle = "#ffe9a8"; g.fillText(ch, s / 2, s / 2 + 12);
  return new THREE.CanvasTexture(cv);
}
function cardTex(name, value, sub, on) {
  const w = 360, h = 220, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.fillStyle = on ? "rgba(26,18,4,0.96)" : "rgba(8,6,16,0.94)"; g.fillRect(0, 0, w, h);
  g.lineWidth = on ? 7 : 3; g.strokeStyle = on ? "#f6e27a" : "#9a7818"; g.strokeRect(5, 5, w - 10, h - 10);
  g.textAlign = "center";
  g.fillStyle = on ? "#f6e27a" : "#d4af37"; g.font = "bold 30px 'Heebo', sans-serif"; g.fillText(name, w / 2, 46);
  g.fillStyle = "#ffe9a8"; g.font = "bold 84px 'Courier New', monospace";
  g.shadowColor = "rgba(255,220,120,0.5)"; g.shadowBlur = on ? 24 : 8; g.fillText(String(value), w / 2, 128);
  g.shadowBlur = 0; g.fillStyle = "#bdb6c4"; g.font = "20px 'Heebo', sans-serif"; g.fillText(sub, w / 2, 188);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

function Letter({ tex, x }) {
  const ref = useRef();
  useFrame((st, dt) => { if (!ref.current) return; ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 1.15, Math.min(1, dt * 3))); ref.current.position.y = 2.7 + Math.sin(st.clock.elapsedTime + x) * 0.05; });
  return <sprite ref={ref} position={[x, 2.7, 0]} scale={0.001}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>;
}

function Card({ name, value, sub, x, y, on, onPick }) {
  const ref = useRef();
  const tex = useMemo(() => cardTex(name, value, sub, on), [name, value, sub, on]);
  useFrame((st, dt) => {
    if (!ref.current) return;
    const k = Math.min(1, dt * 4);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, on ? 1.1 : 0, k);
    const s = THREE.MathUtils.lerp(ref.current.scale.x, on ? 1.12 : 1, k);
    ref.current.scale.set(s, s, 1);
    ref.current.position.y = y + Math.sin(st.clock.elapsedTime * 0.8 + x) * 0.05;
  });
  return (
    <mesh ref={ref} position={[x, y, 0]} onClick={onPick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <planeGeometry args={[2.0, 1.22]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

function Scene({ word, results, active, setActive }) {
  const letters = useMemo(() => onlyHeb(word), [word]);
  const ltex = useMemo(() => letters.map(hebTile), [letters]);
  const lx = (i, n) => ((n - 1) / 2 - i) * 1.4;
  const cols = [-3.3, -1.1, 1.1, 3.3], rows = [0.55, -1.45];
  return (
    <>
      <color attach="background" args={["#030108"]} />
      <fog attach="fog" args={["#030108", 11, 30]} />
      <Stars radius={60} depth={35} count={700} factor={2.4} fade speed={0.3} />
      {letters.map((_, i) => <Letter key={i} tex={ltex[i]} x={lx(i, letters.length)} />)}
      {results.map((r, i) => (
        <Card key={r.key} name={r.key} value={r.value} sub={r.sub}
          x={cols[i % 4]} y={rows[Math.floor(i / 4)]} on={r.key === active} onPick={() => setActive(r.key)} />
      ))}
    </>
  );
}

export default function GematriaCalculator3D() {
  const [q, setQ] = useState("גאולה");
  const word = q.trim();
  const results = useMemo(() => METHODS.map(m => ({ key: m.key, sub: m.sub, value: m.fn(word) })), [word]);
  const [active, setActive] = useState("רגיל");
  const [equal, setEqual] = useState(null);
  const activeVal = results.find(r => r.key === active)?.value || 0;
  const letters = onlyHeb(word);

  useEffect(() => {
    let live = true; setEqual(null);
    if (!letters.length || !activeVal) return;
    supabase.from("bidim").select("phrase").eq("method", active).eq("value", activeVal).neq("phrase", word).limit(40)
      .then(({ data }) => { if (live) setEqual([...new Set((data || []).map(r => r.phrase).filter(Boolean))]); });
    return () => { live = false; };
  }, [active, activeVal, word, letters.length]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ position: "relative", height: "min(78vh, 660px)", borderRadius: 18, overflow: "hidden", border: `1px solid ${C.borderGold}`, background: "#030108", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", direction: "rtl" }}>
        <Canvas camera={{ position: [0, 0.3, 9.6], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <Scene word={word} results={results} active={active} setActive={setActive} />
        </Canvas>

        {/* קלט */}
        <div style={{ position: "absolute", top: 14, insetInline: 0, display: "flex", justifyContent: "center", padding: "0 16px" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה…" dir="rtl" style={{
            width: "min(420px, 92%)", background: "rgba(6,4,14,0.75)", border: `1px solid ${C.borderGold}`, borderRadius: 999,
            color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700, padding: "11px 18px", outline: "none", textAlign: "center", backdropFilter: "blur(6px)",
          }} />
        </div>

        {/* מילים שוות לשיטה הנבחרת */}
        <div style={{ position: "absolute", bottom: 12, insetInline: 12, background: "rgba(6,4,14,0.7)", backdropFilter: "blur(8px)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", maxHeight: 130, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
            <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>שווה ל־</span>
            <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 18, fontWeight: 800 }}>{activeVal}</span>
            <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>ב{active}:</span>
            <Link to={`/number/${activeVal}`} style={{ marginInlineStart: "auto", color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>דף המספר →</Link>
          </div>
          {equal === null ? (
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>מחשב…</span>
          ) : equal.length === 0 ? (
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>אין ביטויים נוספים בערך זה במאגר.</span>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {equal.map((p, i) => (
                <Link key={i} to={`/number/${encodeURIComponent(p)}`} title={p} style={{
                  textDecoration: "none", color: C.goldLight, fontFamily: F.body, fontSize: 12.5, background: "rgba(8,5,2,0.5)",
                  border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 10px", maxWidth: 230, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{p}</Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* פירוט מסתתר (הפרשים) — מתחת לקנבס */}
      {letters.length > 1 && (
        <div style={{ marginTop: 10, color: C.goldLight, fontFamily: F.mono, fontSize: 13.5, lineHeight: 1.9, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px", direction: "rtl", textAlign: "center" }}>
          <b style={{ color: C.goldDim, fontFamily: F.heading }}>מסתתר: </b>
          {letters.slice(0, -1).map((ch, i) => `|${ch}−${letters[i + 1]}|=${Math.abs(GEM[ch] - GEM[letters[i + 1]])}`).join("  ·  ")}
          {"  =  "}<b style={{ color: C.goldBright }}>{mistater(word)}</b>
        </div>
      )}
    </div>
  );
}
