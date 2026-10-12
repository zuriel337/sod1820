import React, { useEffect, useState } from "react";
import { usePalette } from "../lib/palette.js";
import { fetchCommunityStream } from "../lib/community/razielCommunitySeam.js";
import { genAvatar } from "../lib/avatar.js";

// 🧪 הקהילה — SHADOW PREVIEW, INTERNAL ONLY. G3 Community Core 2029 Phase 2
// (work_log dd097ffa-1689-4d97-ad29-b3144c4d38ed, task_key
// G3_COMMUNITY_CORE_2029_PHASE2_SHADOW_V1). Unlinked from any public nav, same pattern as
// ExplorerPreviewPage/EntityHubPreviewPage — a Human-Gate visual review surface, not a live
// route. Must never replace /community/chat or /forum (do_not_touch).
//
// One chronological, read-only Community preview. Keep classification/moderation behind
// the canonical projection; no fake reply, like, send, or identity-verification actions.
//
// The existing canonical community_stream_projection RPC is live. This remains a
// read-only, unlinked preview: do not open writing or replace the legacy chat until gated.
export default function CommunityShadowPreview2029Page() {
  const pal = usePalette();
  const [messages, setMessages] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCommunityStream({ limit: 50 })
      .then((rows) => { if (alive) setMessages(rows); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pal.pageBg, color: pal.ink, padding: 24, fontFamily: "inherit" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>הקהילה</h1>
        <p style={{ color: pal.inkSoft, fontSize: 13, marginBottom: 14 }}>
          תצוגת חיבור ראשונית · קריאה בלבד · עד 50 הפריטים המעודכנים
        </p>
        <div role="note" style={{ border: "1px solid", borderColor: pal.border, borderRadius: 10, padding: "10px 12px", marginBottom: 18, fontSize: 13, lineHeight: 1.7 }}>
          ההיסטוריה מוצגת ממקור הקהילה המאוחד. האווטארים הצבעוניים הם סימון זמני לפי השם, לא תמונות מאומתות של הכותבים.
          <div style={{ marginTop: 4 }}>
            <a href="/community/chat" style={{ color: pal.accentDim, textDecoration: "underline" }}>לצ׳אט הוותיק לשליחת הודעות</a>
          </div>
        </div>

        {loadError && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>
            לא ניתן לטעון כרגע את ההודעות. הצ׳אט הוותיק נשאר נגיש דרך הקישור שלמעלה.
          </div>
        )}

        {!loadError && messages === null && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>טוען…</div>
        )}

        {!loadError && messages !== null && messages.length === 0 && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>אין עדיין הודעות.</div>
        )}

        {!loadError && messages && messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => {
              const name = m.author_display_name || "אורח";
              const when = m.created_at && !Number.isNaN(new Date(m.created_at).getTime())
                ? new Date(m.created_at).toLocaleString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                : null;
              return (
                <article key={m.id} style={{ background: pal.cardSoft, border: "1px solid", borderColor: pal.border, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                    <img src={genAvatar(name, 64)} alt="" loading="lazy" width="34" height="34"
                      style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 650, fontSize: 14 }}>{name}</div>
                      {when && <time dateTime={m.created_at} style={{ color: pal.inkSoft, fontSize: 11 }}>{when}</time>}
                    </div>
                    {m.parent_id && <span style={{ color: pal.inkSoft, fontSize: 11 }}>תגובה</span>}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                    {m.body?.trim() || "לתוכן ההודעה אין טקסט זמין בתצוגה זו."}
                  </div>
                  {typeof m.reactions?.likes === "number" && (
                    <div style={{ marginTop: 7, fontSize: 12, color: pal.accentDim }}>♥ {m.reactions.likes}</div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
