import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Billboard } from "@react-three/drei";
import { getNumberGraph } from "../../lib/supabase.js";
import { C, F, KEY_NUMBERS } from "../../theme.js";

// 🕸️ עץ-קשרים ממוקד-מספר: המספר במרכז, חוטים יוצאים להתכנסויות שלו,
// ומכל התכנסות חוטים למספרים האחרים שמתכנסים יחד. לחיצה על מספר = מרכוז מחדש.

const COL = {
  center: "#f6e27a", num: "#d4af37", conv: "#8b5cf6",
  threadConv: "#7a5a12", threadSib: "#4c2d83", threadScale: "#1f6f6b",
};

// בונה צמתים+חוטים מההתכנסויות. מרכז במרכז, התכנסויות בטבעת פנימית,
// מספרים-אחים בטבעת חיצונית (משותף בין התכנסויות → חוטים מצטלבים = רשת).
function buildWeb(value, convs) {
  const nodes = [{ id: "center", kind: "center", number: value, pos: [0, 0, 0] }];
  const links = [];
  const numPos = new Map();

  convs.forEach((cv, i) => {
    const ang = (i / Math.max(1, convs.length)) * Math.PI * 2;
    const cpos = [Math.cos(ang) * 4.6, (i % 2 ? 1.3 : -1.3), Math.sin(ang) * 4.6];
    const lead = cv.metadata?.highlight?.[0] ?? cv.metadata?.numbers?.[0] ?? "";
    nodes.push({ id: "cv" + i, kind: "conv", label: String(lead), title: cv.label, slug: cv.metadata?.slug, pos: cpos });
    links.push([[0, 0, 0], cpos, "conv"]);

    const sibs = (cv.metadata?.numbers || []).filter(x => Number(x) !== Number(value));
    sibs.forEach((s, j) => {
      let sn = numPos.get(s);
      if (!sn) {
        const sa = ang + (j - (sibs.length - 1) / 2) * 0.34;
        sn = { id: "n" + s, kind: "num", number: s, pos: [Math.cos(sa) * 8.4, (j % 2 ? 1.8 : -1.8), Math.sin(sa) * 8.4] };
        numPos.set(s, sn); nodes.push(sn);
      }
      links.push([cpos, sn.pos, "sib"]);
    });
  });

  // קני-מידה (×10 / ÷10) — שכנים ישירים של המרכז
  const scales = [value * 10];
  if (value % 10 === 0 && value >= 20) scales.push(value / 10);
  scales.forEach((s, k) => {
    if (numPos.has(s)) { links.push([[0, 0, 0], numPos.get(s).pos, "scale"]); return; }
    const sa = (k + 0.5) * Math.PI;
    const sn = { id: "sc" + s, kind: "num", number: s, pos: [Math.cos(sa) * 3.0, k ? -2.6 : 2.6, Math.sin(sa) * 3.0] };
    numPos.set(s, sn); nodes.push(sn); links.push([[0, 0, 0], sn.pos, "scale"]);
  });

  return { nodes, links };
}

function WebNode({ node, onPick }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  const isCenter = node.kind === "center";
  const isConv = node.kind === "conv";
  const base = isCenter ? COL.center : isConv ? COL.conv : COL.num;
  useFrame(() => {
    if (!ref.current) return;
    if (isCenter) ref.current.scale.setScalar(1 + Math.sin(Date.now() / 240) * 0.12);
    else ref.current.scale.setScalar(hover ? 1.22 : 1);
  });
  const size = isCenter ? 0.62 : isConv ? 0.34 : 0.34;
  return (
    <group position={node.pos}>
      <mesh ref={ref}
        onClick={e => { e.stopPropagation(); onPick(node); }}
        onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}>
        <sphereGeometry args={[size, 26, 26]} />
        <meshStandardMaterial color={base} emissive={base}
          emissiveIntensity={isCenter ? 1.5 : hover ? 1.0 : 0.45} roughness={0.32} metalness={0.6} />
      </mesh>
      <Billboard>
        <Text position={[0, size + 0.36, 0]} fontSize={isCenter ? 0.62 : isConv ? 0.32 : 0.4}
          color={isCenter ? COL.center : isConv ? "#c4b5fd" : "#f6e27a"}
          anchorX="center" anchorY="middle" outlineWidth={0.014} outlineColor="#000">
          {isConv ? "✦" + node.label : node.number}
        </Text>
      </Billboard>
    </group>
  );
}

function Web({ graph, autoRotate, onPick }) {
  const g = useRef();
  useFrame(() => { if (autoRotate && g.current) g.current.rotation.y += 0.0014; });
  return (
    <group ref={g}>
      {graph.links.map((l, i) => (
        <Line key={i} points={[l[0], l[1]]}
          color={l[2] === "sib" ? COL.threadSib : l[2] === "scale" ? COL.threadScale : COL.threadConv}
          lineWidth={l[2] === "conv" ? 1.3 : 1} transparent opacity={0.62} />
      ))}
      {graph.nodes.map(n => <WebNode key={n.id} node={n} onPick={onPick} />)}
    </group>
  );
}

export default function NumberGraph({ value, onCenter, height = 460, autoRotate = true }) {
  const [convs, setConvs] = useState(null);
  const [selConv, setSelConv] = useState(null);

  useEffect(() => {
    let alive = true; setConvs(null); setSelConv(null);
    getNumberGraph(value).then(r => { if (alive) setConvs(r.convergences || []); }).catch(() => alive && setConvs([]));
    return () => { alive = false; };
  }, [value]);

  const graph = useMemo(() => buildWeb(Number(value), convs || []), [value, convs]);

  function pick(node) {
    if (node.kind === "num") { onCenter?.(node.number); }
    else if (node.kind === "conv") { setSelConv(node); }
  }

  const empty = convs && convs.length === 0;

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: "radial-gradient(ellipse at 50% 40%, #0d0a14 0%, #050307 100%)" }}>
      <Canvas camera={{ position: [0, 1, 16], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.75} />
        <pointLight position={[8, 8, 8]} intensity={1.1} color="#f6e27a" />
        <pointLight position={[-8, -4, -6]} intensity={0.6} color="#8b5cf6" />
        <Suspense fallback={null}>
          <Web graph={graph} autoRotate={autoRotate} onPick={pick} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom minDistance={7} maxDistance={28} />
      </Canvas>

      {/* כותרת המרכז */}
      <div style={{ position: "absolute", top: 12, insetInlineStart: 14, direction: "rtl", pointerEvents: "none" }}>
        <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 2 }}>במרכז</div>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 26, fontWeight: 800 }}>{value}</div>
        {KEY_NUMBERS[value] && <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 12, maxWidth: 200 }}>{KEY_NUMBERS[value]}</div>}
      </div>

      {/* טוען / אין קשרים */}
      {!convs && <Overlay>טוען קשרים…</Overlay>}
      {empty && <Overlay>למספר {value} אין עדיין התכנסויות מאוצרות — מוצגים קני-המידה (×10) בלבד.</Overlay>}

      {/* פאנל התכנסות נבחרת */}
      {selConv && (
        <div style={{ position: "absolute", bottom: 12, insetInlineStart: 12, maxWidth: 280, direction: "rtl", background: "rgba(8,5,2,0.94)", backdropFilter: "blur(8px)", border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: "12px 14px" }}>
          <button onClick={() => setSelConv(null)} style={{ position: "absolute", top: 6, insetInlineEnd: 10, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>×</button>
          <div style={{ color: "#c4b5fd", fontFamily: F.heading, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>✦ התכנסות</div>
          <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{selConv.title}</div>
          {selConv.slug && (
            <Link to={`/topic/${encodeURIComponent(selConv.slug)}`} style={{ textDecoration: "none", display: "inline-block", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "7px 14px", borderRadius: 999 }}>פתח את ההתכנסות →</Link>
          )}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 10, insetInlineEnd: 14, color: C.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 1, direction: "rtl", pointerEvents: "none" }}>גררו לסיבוב · לחצו על מספר למרכוז · על ✦ להתכנסות</div>
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 60, pointerEvents: "none" }}>
      <div style={{ background: "rgba(8,5,2,0.8)", color: C.goldDim, fontFamily: F.body, fontSize: 13, padding: "8px 16px", borderRadius: 999, direction: "rtl", maxWidth: "80%", textAlign: "center" }}>{children}</div>
    </div>
  );
}
