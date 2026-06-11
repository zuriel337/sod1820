import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Billboard } from "@react-three/drei";
import { supabase } from "../../lib/supabase.js";
import { C, F, KEY_NUMBERS } from "../../theme.js";

// פיזור צמתים על פני כדור (Fibonacci sphere) — חלוקה אחידה
function spherePoints(n, radius) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return pts;
}

// בניית מודל הגרף מנתוני המסד (או fallback ל-KEY_NUMBERS)
function buildGraph(roots, branches) {
  const nodes = [];
  const links = [];
  const byNumber = new Map();

  const addRoot = (number, label, meta) => {
    const node = { id: `r${number}`, number, label, kind: "root", meta };
    nodes.push(node);
    byNumber.set(number, node);
    return node;
  };

  if (roots.length) {
    roots.forEach(r => addRoot(r.number, r.root_word || String(r.number), {
      world: r.world, sefira: r.sefira, essence: r.essence,
      phrases: r.related_phrases || [], numbers: r.related_numbers || [],
    }));
  } else {
    // fallback — מספרי המפתח
    Object.entries(KEY_NUMBERS).forEach(([num, label]) =>
      addRoot(Number(num), label, { essence: label, phrases: [], numbers: [] }));
  }

  const rootPos = spherePoints(nodes.length, nodes.length > 6 ? 5.2 : 3.4);
  nodes.forEach((nd, i) => { nd.pos = rootPos[i]; });

  // ענפים — נתלים סביב המספר ההורה שלהם
  const branchesByNumber = new Map();
  branches.forEach(b => {
    if (!branchesByNumber.has(b.number)) branchesByNumber.set(b.number, []);
    branchesByNumber.get(b.number).push(b);
  });

  branchesByNumber.forEach((list, number) => {
    const parent = byNumber.get(number);
    if (!parent) return;
    const [px, py, pz] = parent.pos;
    list.forEach((b, i) => {
      const a = (i / list.length) * Math.PI * 2;
      const node = {
        id: b.id || `b${number}-${i}`, number, label: b.branch_name || String(number),
        kind: "branch",
        pos: [px + Math.cos(a) * 1.5, py + (i % 2 ? 0.9 : -0.9), pz + Math.sin(a) * 1.5],
        meta: { description: b.description, phrases: b.phrases || [] },
      };
      nodes.push(node);
      links.push([parent.pos, node.pos, "branch"]);
    });
  });

  // קשרים בין מספרי-שורש (related_numbers)
  nodes.filter(n => n.kind === "root").forEach(n => {
    (n.meta?.numbers || []).forEach(other => {
      const t = byNumber.get(Number(other));
      if (t && t.id !== n.id) links.push([n.pos, t.pos, "rel"]);
    });
  });

  return { nodes, links };
}

function Node({ node, selected, highlighted, onSelect }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  const isRoot = node.kind === "root";
  const base = isRoot ? "#d4af37" : "#6b3fa0";
  const active = selected || highlighted;
  useFrame(() => {
    if (ref.current && active) {
      const s = 1 + Math.sin(Date.now() / 220) * 0.12;
      ref.current.scale.setScalar(s);
    } else if (ref.current) {
      ref.current.scale.setScalar(hover ? 1.18 : 1);
    }
  });
  const size = isRoot ? 0.42 : 0.26;
  return (
    <group position={node.pos}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(node); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={active ? "#f6e27a" : base}
          emissive={active ? "#f6e27a" : (isRoot ? "#3a2a00" : "#1a0a2e")}
          emissiveIntensity={active ? 1.4 : 0.5}
          roughness={0.35} metalness={0.6}
        />
      </mesh>
      <Billboard>
        <Text
          position={[0, size + 0.32, 0]}
          fontSize={isRoot ? 0.42 : 0.3}
          color={active ? "#f6e27a" : (isRoot ? "#f6e27a" : "#c4b5fd")}
          anchorX="center" anchorY="middle"
          outlineWidth={0.012} outlineColor="#000"
        >
          {node.number}
        </Text>
      </Billboard>
    </group>
  );
}

function Graph({ graph, selected, highlightNumber, onSelect, autoRotate }) {
  const groupRef = useRef();
  useFrame(() => {
    if (autoRotate && groupRef.current) groupRef.current.rotation.y += 0.0016;
  });
  return (
    <group ref={groupRef}>
      {graph.links.map((l, i) => (
        <Line key={i} points={[l[0], l[1]]}
          color={l[2] === "rel" ? "#7a1320" : "#3a2a00"}
          lineWidth={l[2] === "rel" ? 1.1 : 0.8}
          transparent opacity={l[2] === "rel" ? 0.5 : 0.7} />
      ))}
      {graph.nodes.map(n => (
        <Node key={n.id} node={n}
          selected={selected?.id === n.id}
          highlighted={highlightNumber != null && n.number === highlightNumber}
          onSelect={onSelect} />
      ))}
    </group>
  );
}

// ===== עץ המספרים התלת-מימדי =====
export default function NumberTree({ height = 460, autoRotate = true, highlightNumber = null, onSelectNumber }) {
  const [data, setData] = useState({ roots: [], branches: [] });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [roots, branches] = await Promise.all([
          supabase.from("number_roots").select("number,root_word,world,sefira,essence,related_numbers,related_phrases").eq("is_active", true),
          supabase.from("number_branches").select("id,number,branch_name,description,phrases").eq("is_active", true),
        ]);
        if (alive) setData({ roots: roots.data || [], branches: branches.data || [] });
      } catch { /* fallback ל-KEY_NUMBERS */ }
    })();
    return () => { alive = false; };
  }, []);

  const graph = useMemo(() => buildGraph(data.roots, data.branches), [data]);

  function handleSelect(node) {
    setSelected(node);
    onSelectNumber?.(node.number, node);
  }

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: "radial-gradient(ellipse at 50% 40%, #0d0a14 0%, #050307 100%)" }}>
      <Canvas camera={{ position: [0, 0, 13], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <pointLight position={[8, 8, 8]} intensity={1.1} color="#f6e27a" />
        <pointLight position={[-8, -4, -6]} intensity={0.6} color="#6b3fa0" />
        <Suspense fallback={null}>
          <Graph graph={graph} selected={selected} highlightNumber={highlightNumber}
            onSelect={handleSelect} autoRotate={autoRotate} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom minDistance={6} maxDistance={22} />
      </Canvas>

      {/* פאנל מספר נבחר */}
      {selected && (
        <div style={{
          position: "absolute", top: 12, insetInlineStart: 12, maxWidth: 260,
          direction: "rtl", background: "rgba(8,5,2,0.94)", backdropFilter: "blur(8px)",
          border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: "14px 16px",
        }}>
          <button onClick={() => setSelected(null)} style={{
            position: "absolute", top: 8, insetInlineEnd: 10, background: "none",
            border: "none", color: C.muted, cursor: "pointer", fontSize: 16,
          }}>×</button>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 30, fontWeight: 800 }}>
            {selected.number}
          </div>
          <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {selected.label}
          </div>
          {selected.meta?.essence && (
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>{selected.meta.essence}</div>
          )}
          {selected.meta?.description && (
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>{selected.meta.description}</div>
          )}
          {(selected.meta?.world || selected.meta?.sefira) && (
            <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, marginTop: 8, letterSpacing: 1 }}>
              {[selected.meta.world, selected.meta.sefira].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      )}

      <div style={{
        position: "absolute", bottom: 10, insetInlineEnd: 14, color: C.muted,
        fontFamily: F.heading, fontSize: 10, letterSpacing: 1, direction: "rtl", pointerEvents: "none",
      }}>גרור לסיבוב · גלגל לזום · לחץ על צומת</div>
    </div>
  );
}
