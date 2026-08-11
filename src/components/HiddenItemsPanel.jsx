import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import { getHiddenHomeItems, adminSetPostHomeHidden, adminSetCipherHomeHidden, adminSetChannelUpdateHidden, setImageCuration } from "../lib/supabase.js";

// ↩️ פאנל-אדמין «מוסתרים» — כל מה שהוסתר מ«עדכונים אחרונים» בבית ומהטיקר, עם «בטל הסתרה» לכל פריט.
//    פוסטים (home_hidden) · צפנים (home_hidden) · פריטי-ערוץ (status='hidden') · רמזי-זרם (curator_hidden).
export default function HiddenItemsPanel() {
  const P = usePalette();
  const [data, setData] = useState(null);
  const load = () => getHiddenHomeItems().then(setData).catch(() => setData({ posts: [], ciphers: [], channels: [], hints: [] }));
  useEffect(() => { load(); }, []);

  const unhide = async (kind, id) => {
    if (kind === "post") await adminSetPostHomeHidden(id, false);
    else if (kind === "cipher") await adminSetCipherHomeHidden(id, false);
    else if (kind === "channel") await adminSetChannelUpdateHidden(id, false);
    else if (kind === "hint") await setImageCuration(id, { curator_hidden: false });
    setData(d => ({
      posts: kind === "post" ? d.posts.filter(x => x.id !== id) : d.posts,
      ciphers: kind === "cipher" ? d.ciphers.filter(x => x.id !== id) : d.ciphers,
      channels: kind === "channel" ? d.channels.filter(x => x.id !== id) : d.channels,
      hints: kind === "hint" ? d.hints.filter(x => x.id !== id) : d.hints,
    }));
  };

  if (!data) return <div style={{ color: P.inkSoft, fontFamily: F.body, padding: 12 }}>טוען מוסתרים…</div>;
  const total = data.posts.length + data.ciphers.length + data.channels.length + data.hints.length;

  const row = (kind, id, label, sub) => (
    <div key={kind + id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 10 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label || "—"}</div>
        {sub && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      <button onClick={() => unhide(kind, id)} style={{ flex: "0 0 auto", cursor: "pointer", border: "none", borderRadius: 999, padding: "6px 13px", fontFamily: F.heading, fontSize: 12, fontWeight: 800, background: P.accentBtn, color: P.onAccent }}>↩️ בטל הסתרה</button>
    </div>
  );

  const section = (title, rows) => rows.length > 0 ? (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 7 }}>{title} ({rows.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{rows}</div>
    </div>
  ) : null;

  return (
    <div style={{ direction: "rtl", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 17, fontWeight: 800 }}>🙈 מוסתרים מהבית ומהטיקר</div>
        <button onClick={load} style={{ cursor: "pointer", border: `1px solid ${P.border}`, background: P.card, color: P.inkSoft, borderRadius: 999, padding: "4px 11px", fontSize: 12, fontFamily: F.heading }}>↻ רענן</button>
      </div>
      {total === 0 ? <div style={{ color: P.inkSoft, fontFamily: F.body, padding: 12 }}>אין פריטים מוסתרים כרגע.</div> : (
        <>
          {section("📄 פוסטים", data.posts.map(p => row("post", p.id, stripHtml(p.title || ""), "/" + (p.slug || ""))))}
          {section("🔠 צפנים", data.ciphers.map(c => row("cipher", c.id, c.title || c.search_term, "/codes/" + (c.slug || ""))))}
          {section("📡 פריטי-ערוץ (טיקר)", data.channels.map(c => row("channel", c.id, stripHtml(c.text || "").slice(0, 70) || "עדכון", `${c.credit || ""} · ${c.channel || ""}`)))}
          {section("🌊 רמזי-זרם", data.hints.map(h => row("hint", h.id, h.name || `מספר ${h.primary_value ?? ""}`, h.primary_value != null ? `דומיננטי ${h.primary_value}` : "")))}
        </>
      )}
    </div>
  );
}
