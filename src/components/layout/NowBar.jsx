import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { loadNowBarEmail } from "../../lib/nowBarSources.js";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { seenCutoff, markSeenKey } from "../../lib/crossesNew.js";
import { timeAgoHe } from "../../lib/format.js";
import { F } from "../../theme.js";

// ⏱ «עכשיו» — סרגל דק יחיד בתחתית כל דפי הלגאסי, לכל הגולשים (גם לא מחוברים).
// מחליף את ה-Bottom Bar ואת הכפתור הצף של LiveChannelFeed (בקשת צוריאל 13.10.2026).
// מיילים כבויים כברירת מחדל: מרכז הקבלה הוא הבית הראשי. חיבור עתידי דורש בחירת יעד מפורשת.
// מקורות read-only: (1) הודעות צבי (tzvi-opoc) דרך אותו RPC מסונן-שרת של 2029,
// (2) שרשורי מייל שאושרו דרך הקורא המסונן-שרת email_source_threads_v1.
// «חדש» = מאז הביקור האחרון באותו דפדפן (localStorage). לא נוגע ב-status/publish.
export const NOW_BAR_HEIGHT = 34;
const SEEN_KEY = "now-bar";
const ZVI = "tzvi-opoc";
const POLL_MS = 90000;

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-label="מייל" role="img" style={{ flex: "none" }}>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#5ea8ff" />
    <path d="M3 7l9 6.5L21 7" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-label="וואטסאפ" role="img" style={{ flex: "none" }}>
    <circle cx="12" cy="12" r="11" fill="#25D366" />
    <path d="M12 5.2a6.8 6.8 0 0 0-5.8 10.3L5.3 18.8l3.4-.9A6.8 6.8 0 1 0 12 5.2z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9.6 9.2c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.4c0 .2 0 .3-.1.4l-.4.5c.5 1 1.3 1.7 2.3 2.2l.5-.6c.1-.1.3-.2.5-.1l1.4.7c.2.1.3.2.2.5-.1.6-.7 1.1-1.4 1.1-2.4-.2-4.4-2.2-4.9-4.4 0-.5.1-1 .3-1.5z" fill="#fff" />
  </svg>
);

const ts = (iso) => Date.parse(iso || "") || 0;

const loadEmail = () => loadNowBarEmail(supabase);

async function loadZvi() {
  const rows = await fetchGroupSourceArrivals({ limit: 40 });
  return rows.filter((r) => r.creatorSlug === ZVI && r.sourceKind === "group_message").slice(0, 15).map((r) => ({
    key: `zvi:${r.id}`, kind: "zvi", who: r.creator || "צבי", text: r.fullText || r.label, at: r.arrivalAt || r.at,
  }));
}

export default function NowBar({ includeEmail = false }) {
  const [items, setItems] = useState([]);
  const [mailState, setMailState] = useState("loading");
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState({});
  const [cutoff, setCutoff] = useState(() => seenCutoff(SEEN_KEY));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [m, z] = await Promise.allSettled([includeEmail ? loadEmail() : Promise.resolve([]), loadZvi()]);
      if (!alive) return;
      const all = [...(m.status === "fulfilled" ? m.value : []), ...(z.status === "fulfilled" ? z.value : [])]
        .sort((a, b) => ts(b.at) - ts(a.at));
      setMailState(m.status === "rejected" ? "unavailable" : m.value.length ? "available" : "empty");
      setItems(all);
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [includeEmail]);

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
          {includeEmail && mailState !== "available" && <div role="status" style={{ padding: "8px 14px", fontSize: 12, opacity: 0.7 }}>
            {mailState === "loading" ? "טוען עדכוני מייל…" : mailState === "unavailable" ? "עדכוני המייל אינם זמינים כרגע" : "אין כרגע עדכוני מייל שאושרו להצגה"}
          </div>}
          {items.length === 0 && <div style={{ padding: 18, textAlign: "center", opacity: 0.7, fontSize: 14 }}>אין עדכונים כרגע</div>}
          {items.map((i) => {
            const fresh = i.at && i.at > cutoff;
            const long = i.text.length > 160;
            const expanded = !!exp[i.key];
            return (
              <div key={i.key} onClick={long ? () => setExp((v) => ({ ...v, [i.key]: !v[i.key] })) : undefined}
                style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.07)", cursor: long ? "pointer" : "default", background: fresh ? "rgba(212,175,55,.08)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8, marginBottom: 3 }}>
                  {i.kind === "zvi" ? <WhatsAppIcon /> : <MailIcon />}
                  <span style={{ flex: 1 }}>{i.who}</span>
                  <span>{timeAgoHe(i.at)}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {long && !expanded ? `${i.text.slice(0, 160)}…` : i.text}
                </div>
              </div>
            );
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

