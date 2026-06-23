import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getGalleryUpdates, getHomeSets, getGalleryImagesByIds } from "../lib/supabase.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";

// ===== ווידג'ט מאובזר לדף הבית: פיד «עדכוני גלריה» + נבחרים מהסטים =====
// טאבים בדסקטופ · אקורדיון במובייל (חוק העץ האחד: עדשה על gallery_images, לא טבלה חדשה).
// טאב «עדכונים» = source='update'. טאב לכל סדרה שצוריאל סימן «הצג בבית» — מציג את
// המובלטות שאצר (image_order) בסדר שקבע. «חדש» לפי ביקור אחרון (whats_new_law).

const valOf = (im, s) => im.primary_value ?? (im.all_values || [])[0] ?? (s?.numbers || [])[0];

export default function HomeFeed() {
  const P = usePalette();
  const [updates, setUpdates] = useState([]);
  const [sets, setSets] = useState([]);          // [{...set, imgs:[]}] — רק סדרות עם מובלטות
  const [active, setActive] = useState("updates");
  const [openAcc, setOpenAcc] = useState("updates");
  const cutoff = useMemo(() => seenCutoff("home-gallery"), []);

  useEffect(() => {
    getGalleryUpdates(12).then(r => { setUpdates(r || []); markSeenKey("home-gallery"); }).catch(() => {});
    getHomeSets().then(async hs => {
      const withImgs = await Promise.all((hs || []).map(async s => {
        let imgs = [];
        if (s.image_order?.length) {
          const rows = await getGalleryImagesByIds(s.image_order);
          const byId = Object.fromEntries((rows || []).map(r => [r.id, r]));
          imgs = s.image_order.map(id => byId[id]).filter(im => im && im.image_url); // שומר על סדר האצירה
        }
        return { ...s, imgs };
      }));
      setSets(withImgs.filter(s => s.imgs.length));
    }).catch(() => {});
  }, []);

  const tabs = useMemo(
    () => [{ key: "updates", label: "🆕 עדכונים" }, ...sets.map(s => ({ key: s.id, label: s.name }))],
    [sets]
  );

  if (!updates.length && !sets.length) return null;

  // ── גופי התוכן (משותפים לטאבים ולאקורדיון) ──
  const updatesBody = (
    updates.length === 0
      ? <div style={emptyS(P)}>אין עדכונים עדיין.</div>
      : <>
          <div className="hf-grid">
            {updates.map(u => {
              const fresh = isNewSince(u, cutoff);
              const title = cleanName(u.name) || "עדכון גלריה";
              const tag = valOf(u);
              return (
                <Link key={u.id} to="/gallery-updates" className="hf-card" style={fresh ? { borderColor: "#e0556a", boxShadow: "0 0 0 1px #e0556a55" } : undefined}>
                  <div className="hf-thumb" style={{ background: u.image_url ? `center/cover no-repeat url(${u.image_url})` : P.cardGrad }}>
                    {fresh && <span className="hf-new">🆕 חדש</span>}
                    {tag != null && <span className="hf-tag" title="התיוג המספרי">{tag}</span>}
                  </div>
                  <div className="hf-body">
                    <div className="hf-title">{title}</div>
                    {u.description && <div className="hf-desc">{stripHtml(u.description)}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <Link to="/gallery-updates" className="hf-more">לכל פיד העדכונים →</Link>
          </div>
        </>
  );

  const setBody = s => (
    <>
      <div className="hf-setmeta">
        <span style={{ color: P.inkSoft, fontFamily: F.mono, fontSize: 12.5 }}>{(s.numbers || []).join(" · ")}</span>
        <span style={{ flex: 1 }} />
        <Link to="/archive" className="hf-more">כל הסדרה בארכיון →</Link>
      </div>
      <div className="hf-grid hf-grid-sm">
        {s.imgs.map(im => {
          const v = valOf(im, s);
          return (
            <Link key={im.id} to={v != null ? `/number/${v}` : "/archive"} className="hf-sq" style={{ background: `center/cover no-repeat url(${im.image_url})` }} title={cleanName(im.name) || ""}>
              {v != null && <span className="hf-tag">{v}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );

  const bodyFor = key => key === "updates" ? updatesBody : (() => { const s = sets.find(x => x.id === key); return s ? setBody(s) : null; })();

  return (
    <div style={{ direction: "rtl" }}>
      <style>{css(P)}</style>
      <h2 className="hn-h2">🆕 פיד עדכונים ונבחרים</h2>
      <p className="hn-sub">תצלומי החדשות הטריים — ולצידם הסדרות שבחרנו להבליט</p>

      {/* ===== דסקטופ: טאבים ===== */}
      <div className="hf-d">
        <div className="hf-tabs" role="tablist">
          {tabs.map(t => (
            <button key={t.key} className={`hf-tab${active === t.key ? " on" : ""}`} onClick={() => setActive(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="hf-panel">{bodyFor(active)}</div>
      </div>

      {/* ===== מובייל: אקורדיון ===== */}
      <div className="hf-m">
        {tabs.map(t => {
          const open = openAcc === t.key;
          return (
            <div key={t.key} className="hf-acc">
              <button className="hf-acc-head" onClick={() => setOpenAcc(open ? null : t.key)}>
                <span>{t.label}</span><span className="hf-acc-arrow">{open ? "▲" : "▼"}</span>
              </button>
              {open && <div className="hf-acc-body">{bodyFor(t.key)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptyS = P => ({ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: "30px 16px", fontSize: 14 });

const css = P => `
  .hf-d { display: block; }
  .hf-m { display: none; }
  .hf-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 14px; }
  .hf-tab { flex: 0 0 auto; cursor: pointer; background: ${P.card}; border: 1px solid ${P.border}; color: ${P.ink};
    font-family: ${F.heading}; font-weight: 700; font-size: 13.5px; padding: 8px 16px; border-radius: 999px; white-space: nowrap; }
  .hf-tab:hover { border-color: ${P.accent}; }
  .hf-tab.on { background: ${P.accentBtn}; color: ${P.onAccent}; border-color: ${P.accentBtn}; }
  .hf-panel { animation: hf-fade .25s ease; }
  @keyframes hf-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .hf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .hf-grid-sm { grid-template-columns: repeat(6, 1fr); }
  @media (max-width: 820px) { .hf-grid { grid-template-columns: repeat(3, 1fr); } .hf-grid-sm { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 520px) { .hf-grid { grid-template-columns: 1fr 1fr; } .hf-grid-sm { grid-template-columns: repeat(3, 1fr); } }
  .hf-card { background: ${P.card}; border: 1px solid ${P.border}; border-radius: 14px; overflow: hidden; text-decoration: none;
    display: flex; flex-direction: column; transition: transform .15s, border-color .15s; }
  .hf-card:hover { transform: translateY(-3px); border-color: ${P.accent}; }
  .hf-thumb { height: 120px; position: relative; }
  .hf-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .hf-title { color: ${P.ink}; font-family: ${F.regal}; font-size: 14px; font-weight: 700; line-height: 1.45;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .hf-desc { color: ${P.inkSoft}; font-family: ${F.body}; font-size: 12.5px; line-height: 1.6;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .hf-new { position: absolute; top: 8px; inset-inline-end: 8px; background: #e0556a; color: #fff; font-family: ${F.heading};
    font-size: 10.5px; font-weight: 800; border-radius: 999px; padding: 2px 9px; animation: hn-pulse 1.8s ease-in-out infinite; }
  .hf-tag { position: absolute; top: 8px; inset-inline-start: 8px; background: rgba(212,175,55,0.92); color: #1a0e00;
    font-family: ${F.mono}; font-size: 12px; font-weight: 800; border-radius: 999px; padding: 2px 9px; }
  .hf-sq { position: relative; display: block; aspect-ratio: 1/1; border-radius: 12px; overflow: hidden; border: 1px solid ${P.border};
    transition: transform .15s, border-color .15s; }
  .hf-sq:hover { transform: translateY(-3px); border-color: ${P.accent}; }
  .hf-setmeta { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .hf-more { color: ${P.accentText}; text-decoration: none; font-family: ${F.heading}; font-weight: 700; font-size: 13px; }
  .hf-acc { border: 1px solid ${P.border}; border-radius: 12px; overflow: hidden; margin-bottom: 10px; background: ${P.card}; }
  .hf-acc-head { display: flex; align-items: center; justify-content: space-between; width: 100%; cursor: pointer;
    background: none; border: none; padding: 13px 15px; color: ${P.ink}; font-family: ${F.heading}; font-weight: 700; font-size: 15px; }
  .hf-acc-arrow { color: ${P.inkSoft}; font-size: 12px; }
  .hf-acc-body { padding: 0 13px 16px; }
  @media (max-width: 700px) { .hf-d { display: none; } .hf-m { display: block; } }
`;
