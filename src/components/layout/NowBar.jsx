import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { seenCutoff, markSeenKey } from "../../lib/crossesNew.js";
import { timeAgoHe, stripHtml } from "../../lib/format.js";
import { F } from "../../theme.js";

// ⏱ «עכשיו» — סרגל דק יחיד בתחתית כל דפי הלגאסי, לכל הגולשים (גם לא מחוברים).
// מחליף את ה-Bottom Bar ואת הכפתור הצף של LiveChannelFeed (בקשת צוריאל 13.10.2026).
// שני מקורות בלבד, read-only: (1) הודעות צבי (tzvi-opoc) דרך אותו RPC מסונן-שרת של 2029,
// (2) הודעות המייל (channel_updates.source='email', status='live').
// «חדש» = מאז הביקור האחרון באותו דפדפן (localStorage). לא נוגע ב-status/publish.
export const NOW_BAR_HEIGHT = 34;
const SEEN_KEY = "now-bar";
const ZVI = "tzvi-opoc";
const POLL_MS = 90000;

const ts = (iso) => Date.parse(iso || "") || 0;

async function loadEmail() {
  if (!supabase) return [];
  const { data } = await supabase.from("channel_updates")
    .select("id,text,credit,created_at,link_url")
    .eq("status", "live").eq("source", "email").eq("page_only", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false }).limit(15);
  return (data || []).map((r) => ({
    key: `mail:${r.id}`, kind: "mail", who: r.credit || "מייל",
    text: stripHtml(r.text || "").replace(/\s+/g, " ").trim().slice(0, 600),
    at: r.created_at, href: r.link_url || null,
  })).filter((r) => r.text);
}

async function loadZvi() {
  const rows = await fetchGroupSourceArrivals({ limit: 40 });
  return rows.filter((r) => r.creatorSlug === ZVI && r.sourceKind === "group_message").slice(0, 15).map((r) => ({
    key: `zvi:${r.id}`, kind: "zvi", who: r.creator || "צבי", text: r.fullText || r.label, at: r.arrivalAt || r.at, href: null,
  }));
}

export default function NowBar() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [cutoff, setCutoff] = useState(() => seenCutoff(SEEN_KEY));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [m, z] = await Promise.allSettled([loadEmail(), loadZvi()]);
      if (!alive) return;
      const all = [...(m.status === "fulfilled" ? m.value : []), ...(z.status === "fulfilled" ? z.value : [])]
        .sort((a, b) => ts(b.at) - ts(a.at));
      setItems(all);
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const unseen = useMemo(() => items.filter((i) => i.at && i.at > cutoff).length, [items, cutoff]);

  const toggle = () => {
    if (open) {
      const now = new Date().toISOString();
      markSeenKey(SEEN_KEY, now);
      setCutoff(now);
    }
    setOpen(!open);
  };

  return (
    <>
      {open && (
        <div role="dialog" aria-label="עכשיו" dir="rtl" style={{
          position: "fixed", insetInline: 0, bottom: NOW_BAR_HEIGHT, zIndex: 9998, maxWidth: 520, marginInline: "auto",
          maxHeight: "60vh", overflowY: "auto", background: "#12101c", color: "#ede4d3",
          border: "1px solid rgba(212,175,55,.35)", borderBottom: "none", borderRadius: "12px 12px 0 0",
          boxShadow: "0 -8px 28px rgba(0,0,0,.45)", fontFamily: F.body,
        }}>
          {items.length === 0 && <div style={{ padding: 18, textAlign: "center", opacity: 0.7, fontSize: 14 }}>אין עדכונים כרגע</div>}
          {items.map((i) => {
            const fresh = i.at && i.at > cutoff;
            const body = (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.07)", background: fresh ? "rgba(212,175,55,.08)" : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, opacity: 0.75, marginBottom: 3 }}>
                  <span>{i.kind === "zvi" ? "💬" : "✉️"} {i.who}</span>
                  <span>{timeAgoHe(i.at)}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{i.text}</div>
              </div>
            );
            return i.href
              ? <a key={i.key} href={i.href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", display: "block" }}>{body}</a>
              : <div key={i.key}>{body}</div>;
          })}
        </div>
      )}
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unseen ? `עכשיו — ${unseen} עדכונים חדשים` : "עכשיו"} style={{
        position: "fixed", insetInline: 0, bottom: 0, zIndex: 9999, height: NOW_BAR_HEIGHT,
        paddingBottom: "env(safe-area-inset-bottom, 0px)", boxSizing: "content-box",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
        background: "#12101c", color: "#f0d58a", border: "none", borderTop: "1px solid rgba(212,175,55,.45)",
        fontFamily: F.body, fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
      }}>
        <span aria-hidden style={{ color: unseen ? "#ff5a6e" : "#f0d58a" }}>◉</span>
        <span>עכשיו</span>
        {unseen > 0 && (
          <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "#ff3b57", color: "#fff", fontSize: 12, lineHeight: "20px" }}>
            {unseen > 99 ? "99+" : unseen}
          </span>
        )}
      </button>
    </>
  );
}
