import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { cleanName } from "../../lib/galleryName.js";
import { topicConvergenceContentSections } from "../../lib/research/topicConvergence.js";

// 📜 TopicConvergenceContent — the ONE thin renderer of a Topic/Convergence Universal Finding's
// authored body (LEGACY_CONTENT_TO_ONE_RESEARCH_OS_BRIDGE_V1, work_log 1af998d5).
//
// It reads ONLY the shared projection (topicConvergenceContentSections) — no fetch, no write, no
// gematria, no author-specific branch. The same component serves a contributor phrases-only card,
// a richer editorial card, a root-array card and any future contributor's card. It can be mounted
// by the legacy /topic surface (compatibility) and by the P1 Universal Entity Hub / Research
// Viewer (forward) with the same props.
//
// Truth discipline (truth_axes_foundation_law PR1-PR4, convergence_number_method_law):
//   • editorial approval ≠ engine verification ≠ canonical — said once, at the top
//   • a phrase without an authored value/method is rendered WITHOUT a number
//   • an authored value is shown with the AUTHOR'S method label verbatim (or none), never resolved
//   • unknown source fields are listed by NAME (safe structured fallback) — never raw HTML
//   • a source `_do_not_publish` marker withholds the body unless `showWithheld` (authorized viewer)
//
// Props:
//   finding      Universal Finding from topicConvergenceToUniversalFinding (with findings column)
//   palette      usePalette() token set (light+dark aware)
//   imgs         gallery image rows already loaded by the host (bullet image toggles), optional
//   onLeave      (lens, selection) → host updates Research Context before navigating, optional
//   showWithheld render body even when the source flagged _do_not_publish (authorized viewer)
//   only / exclude  section keys to restrict rendering (lets a host keep its own layout order)

const ROW_VALUE_STYLE = {
  flex: "0 0 auto", minWidth: 56, textAlign: "center", fontFamily: F.mono, fontWeight: 800, color: "#241a02",
  background: "linear-gradient(135deg,#ffd86b,#d8b34a)", borderRadius: 8, padding: "2px 9px", textDecoration: "none", fontVariantNumeric: "tabular-nums",
};

export default function TopicConvergenceContent({ finding, palette: P, imgs = [], onLeave, showWithheld = false, only = null, exclude = null }) {
  const [openBullet, setOpenBullet] = useState(null);
  const content = topicConvergenceContentSections(finding);
  if (!content || !P) return null;

  const box = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 };
  const h = { color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 };
  const soft = { color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 };
  const leave = (lens, selection) => { if (typeof onLeave === "function") onLeave(lens, selection); };
  const show = (key) => (!only || only.includes(key)) && !(exclude && exclude.includes(key));
  const S = content.sections;

  // Source-owned "do not publish" marker: withhold the body for unauthorized viewers (truth_axes P3 —
  // a missing gate is not consent). Card metadata/links rendered by the host are unaffected.
  if (content.flags?.doNotPublish && !showWithheld) {
    if (!show("withheld")) return null;
    return (
      <div style={{ ...soft, padding: "0 4px", borderInlineStart: `2px solid ${P.border}`, paddingInlineStart: 12, marginBottom: 20 }}>
        🔒 גוף הכרטיס מסומן במקור כ«לא לפרסום» — התוכן המחקרי שמור ואינו מוצג כאן.
      </div>
    );
  }

  const attribution = [content.createdBy, ...content.attribution.map(a => a.text)].filter(Boolean);
  const unsupportedNames = [...new Set(content.unsupported.map(u => u.field || (u.elementType ? `[${u.elementType}]` : u.sourcePath)))];
  const showHeader = show("header") && (!content.isEmpty || attribution.length);

  return (
    <>
      {/* מסגרת-אמת אחת לכל התוכן המקורי (לא חוזרים עליה בכל מקטע) */}
      {showHeader && (
        <div style={{ ...soft, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline", marginBottom: 12, padding: "0 4px" }}>
          <span>📜 תוכן-המקור של הכרטיס · אישור-עריכה ≠ אימות-מנוע ≠ קנוני</span>
          {attribution.length > 0 && <span>· מקור/כותב: <b style={{ color: P.ink }}>{[...new Set(attribution)].join(" · ")}</b></span>}
          {content.flags?.doNotPublish && showWithheld && <span style={{ color: P.accentText, fontWeight: 800 }}>· 🔒 מסומן במקור «לא לפרסום» (מוצג לצופה מורשה בלבד)</span>}
        </div>
      )}

      {/* כותרת + מושגים (root-array) */}
      {show("headline") && S.headline.length > 0 && S.bullets.length === 0 && (
        <div style={box}><div style={{ ...h, fontSize: 19 }}>{S.headline[0].text}</div></div>
      )}
      {show("hint") && S.hint.map(f => (
        <div key={f.sourcePath} style={{ ...box, borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.07)", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.85 }}><b>רמז משלים: </b>{f.text}</div>
        </div>
      ))}
      {show("concepts") && S.concepts.length > 0 && (
        <div style={box}>
          {S.concepts.map(c => (
            <div key={c.sourcePath} style={{ marginBottom: 12 }}>
              {c.title && <div style={{ ...h, fontSize: 19, marginBottom: 6 }}>{c.title}</div>}
              {c.text && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.9 }}>{c.text}</div>}
              {c.hint && <div style={{ ...soft, marginTop: 4 }}>🔮 {c.hint}</div>}
            </div>
          ))}
        </div>
      )}

      {/* טענות-מספר של הכותב (root-array) — הערך עם תווית-השיטה של הכותב כלשונה */}
      {show("numericClaims") && S.numericClaims.length > 0 && (
        <div style={box}>
          <div style={h}>🔢 ההתכנסות — כל ביטוי והערך שלו <span style={{ ...soft, fontSize: 11.5 }}>· ערך ושיטה כפי שנכתבו בכרטיס</span></div>
          <div style={{ display: "grid", gap: 8 }}>
            {S.numericClaims.map(c => (
              <div key={c.sourcePath} style={{ display: "flex", gap: 10, alignItems: "baseline", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px" }}>
                {c.value != null ? (
                  <Link to={`/number/${c.value}`} onClick={() => leave("number", { entityId: String(c.value), entityType: "number" })} style={ROW_VALUE_STYLE}>{c.value}</Link>
                ) : (
                  <span style={{ ...ROW_VALUE_STYLE, background: "transparent", color: P.inkSoft, border: `1px dashed ${P.border}` }}>—</span>
                )}
                <span style={{ flex: "1 1 auto", minWidth: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.55 }}>
                  {c.title && <b style={{ color: P.accentText }}>{c.title} · </b>}
                  {c.phrase}
                  {c.methodLabel && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 12.5 }}> ({c.methodLabel})</span>}
                  {c.note && <span style={{ color: P.inkSoft, fontSize: 12.5 }}> · {c.note}</span>}
                  {c.hint && <div style={soft}>🔮 {c.hint}</div>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* שורות-התכנסות של הכרטיס (convergence_display_law) */}
      {show("rows") && S.rows.length > 0 && (
        <div style={box}>
          <div style={h}>🔢 ההתכנסות — כל ביטוי והערך שלו</div>
          <div style={{ display: "grid", gap: 8 }}>
            {S.rows.map(r => (
              <div key={r.sourcePath} style={{ display: "flex", gap: 10, alignItems: "baseline", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px" }}>
                {r.value != null ? (
                  <Link to={`/number/${r.value}`} onClick={() => leave("number", { entityId: String(r.value), entityType: "number" })} style={ROW_VALUE_STYLE}>{r.value}</Link>
                ) : (
                  <span style={{ ...ROW_VALUE_STYLE, background: "transparent", color: P.inkSoft, border: `1px dashed ${P.border}` }}>—</span>
                )}
                <span style={{ flex: "1 1 auto", minWidth: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.55 }}>
                  {r.phrase && (
                    <Link to={`/number/${encodeURIComponent(r.phrase)}`} onClick={() => leave("number", { entityId: String(r.phrase), entityType: "phrase" })}
                      style={{ color: "inherit", textDecoration: "none", borderBottom: `1px dotted ${P.borderStrong}` }}>{r.phrase}</Link>
                  )}
                  {r.note && <span style={{ color: P.inkSoft, fontSize: 12.5 }}> · {r.note}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ביטויי-ההתכנסות של הכותב — בלי מספר (אין ערך/שיטה מוצהרים בכרטיס) */}
      {show("phrases") && S.phrases.length > 0 && (
        <div style={box}>
          <div style={h}>🔤 ביטויים בהתכנסות ({S.phrases.length})</div>
          <div style={{ ...soft, marginBottom: 10 }}>הביטויים כפי שנכתבו בכרטיס. ערך ושיטה אינם מוצהרים לכל ביטוי — הצגת המספר והאימות במנוע נעשית בדף הביטוי.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {S.phrases.map(p => (
              <Link key={p.sourcePath} to={`/number/${encodeURIComponent(p.text)}`}
                onClick={() => leave("number", { entityId: p.text, entityType: "phrase" })}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44, padding: "6px 14px", borderRadius: 999,
                  border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.4 }}>{p.text}</Link>
            ))}
          </div>
        </div>
      )}

      {/* ממצאים (headline + bullets, עם תמונה לחיצה מתחת לשורה) */}
      {show("bullets") && S.bullets.length > 0 && (
        <div style={box}>
          {S.headline.length > 0 && <div style={{ ...h, fontSize: 19 }}>{S.headline[0].text}</div>}
          <ul style={{ margin: 0, paddingInlineStart: 22, color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.95 }}>
            {S.bullets.map((b, i) => {
              // תמונה מקושרת מפורשת, ואחרת — אוטומטית לפי מיקום השורה (התנהגות /topic הקיימת)
              const img = (b.imageId ? imgs.find(x => String(x.id) === b.imageId) : null) || imgs[i] || null;
              const open = openBullet === b.sourcePath;
              return (
                <li key={b.sourcePath} style={{ marginBottom: img ? 4 : 0 }}>
                  <span onClick={img ? () => setOpenBullet(open ? null : b.sourcePath) : undefined}
                    style={{ cursor: img ? "pointer" : "default", borderBottom: img ? `1px dashed ${P.borderStrong}` : "none", color: img && open ? P.accentText : "inherit" }}>
                    {b.text}{img && <span style={{ color: P.accentDim, fontSize: 12, marginInlineStart: 6 }}>{open ? "▾" : "🖼"}</span>}
                  </span>
                  {img && open && (
                    <div style={{ margin: "8px 0 4px", maxWidth: 420 }}>
                      <img src={img.image_url} alt={cleanName(img.name) || b.text} loading="lazy"
                        style={{ width: "100%", borderRadius: 10, border: `1px solid ${P.borderStrong}`, display: "block" }} />
                      {(img.description || cleanName(img.name)) && <div style={{ ...soft, marginTop: 5 }}>{img.description || cleanName(img.name)}</div>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* מסלולי קשר */}
      {show("connections") && S.connections.length > 0 && (
        <div style={box}>
          <div style={h}>🔗 מסלולי קשר</div>
          <div style={{ display: "grid", gap: 8 }}>
            {S.connections.map(cn => (
              <div key={cn.sourcePath} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "8px 12px" }}>
                {cn.number != null ? (
                  <Link to={`/number/${cn.number}`} onClick={() => leave("number", { entityId: String(cn.number), entityType: "number" })}
                    style={{ fontFamily: F.mono, fontWeight: 800, color: P.accentText, fontSize: 15, textDecoration: "none" }}>{cn.number}</Link>
                ) : <span style={{ fontFamily: F.mono, color: P.inkSoft }}>{cn.numberRaw ?? "—"}</span>}
                <span style={{ color: P.accentDim }}>↔</span>
                {cn.links.map((l, j) => <span key={j} style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5 }}>{l}</span>)}
                {cn.note && <span style={{ ...soft, fontSize: 12.5 }}>· {cn.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* מועמדים — ביטויים שהכותב סימן כלא-מאושרים */}
      {show("candidates") && S.candidates.length > 0 && (
        <div style={{ ...box, borderStyle: "dashed" }}>
          <div style={h}>🧪 מועמדים ({S.candidates.length}) <span style={{ ...soft, fontSize: 11.5 }}>· סומנו בכרטיס כלא-מאושרים</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {S.candidates.map(c => (
              <span key={c.sourcePath} style={{ display: "inline-flex", alignItems: "center", minHeight: 40, padding: "5px 12px", borderRadius: 999, border: `1px dashed ${P.border}`, color: P.inkSoft, fontFamily: F.body, fontSize: 14 }}>{c.text}</span>
            ))}
          </div>
        </div>
      )}

      {/* הפניות לעוגנים אחרים — מפנים, לא משכפלים */}
      {show("convergenceRefs") && S.convergenceRefs.length > 0 && (
        <div style={{ ...box, display: "grid", gap: 8 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 1 }}>🧠 עוגנים קשורים</div>
          {S.convergenceRefs.map(r => (
            <Link key={r.sourcePath} to={r.slug ? `/topic/${encodeURIComponent(r.slug)}` : "#"}
              onClick={() => r.slug && leave("topic", { entityId: r.slug, entityType: "topic" })}
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 13px" }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4 }}>{r.title || r.slug}</div>
                {r.note && <div style={soft}>{r.note}</div>}
              </span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, flexShrink: 0 }}>←</span>
            </Link>
          ))}
        </div>
      )}

      {/* הפוסט/ים המלאים */}
      {show("posts") && S.posts.filter(p => p.slug).length > 0 && (
        <div style={{ ...box, display: "grid", gap: 8 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 1 }}>📖 הפוסטים המלאים</div>
          {S.posts.filter(p => p.slug).map(p => (
            <Link key={p.sourcePath} to={`/${p.slug}`} onClick={() => leave("post", { entityType: "post", locator: `/${p.slug}` })}
              style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 13px" }}>
              <span style={{ fontSize: 20 }}>📖</span>
              <span style={{ flex: 1, minWidth: 0, color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4 }}>{p.title || "קראו את הפוסט המלא"}</span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, flexShrink: 0 }}>←</span>
            </Link>
          ))}
        </div>
      )}

      {/* הסתייגות מחקרית */}
      {show("caveat") && S.caveat.map(f => (
        <div key={f.sourcePath} style={{ ...soft, fontSize: 13, lineHeight: 1.8, padding: "0 4px", borderInlineStart: `2px solid ${P.border}`, paddingInlineStart: 12, marginBottom: 20 }}>⚠️ {f.text}</div>
      ))}

      {/* שדות-מקור שאינם נתמכים לתצוגה — נספרים בשם, לא נמחקים ולא מרונדרים כ-HTML */}
      {show("unsupported") && unsupportedNames.length > 0 && (
        <div style={{ ...soft, padding: "0 4px", marginBottom: 20 }}>
          ℹ️ {unsupportedNames.length} שדות-מקור נוספים שמורים בכרטיס ואינם מוצגים: {unsupportedNames.join(" · ")}
        </div>
      )}
    </>
  );
}
