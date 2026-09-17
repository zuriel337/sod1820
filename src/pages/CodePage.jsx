import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useFeatureState } from "../components/MaintenanceLock.jsx";
import TzofenEmbed from "../components/TzofenEmbed.jsx";
import ElsChallengeStrip from "../components/ElsChallengeStrip.jsx";
import UpdatesBox from "../components/UpdatesBox.jsx";
import SavedMatricesGallery from "../components/SavedMatricesGallery.jsx";
import { useElsJourneyReopen } from "../lib/research/useElsJourneyReopen.js";

const ELS_PREMIUM_PREVIEW = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/agent/els/fa6474a8-b4fb-4895-b033-75634b52596d/els-rebuild-premium.png";

const REBUILD_LAYERS = [
  {
    icon: "א",
    title: "טקסט ומטריצה — שכבת המקור",
    body: "אותיות התורה, מיקום מדויק, כיוון ודילוג נשארים הבסיס. כל מה שנבנה מעליהם שומר את הדרך חזרה למקור.",
  },
  {
    icon: "◎",
    title: "שכבות עומק",
    body: "ממצאים, מילים חוצות, קרבה, הקשר פסוקי ומקורות יוצגו כשכבות שניתן לפתוח ולסגור — בלי לאבד את המטריצה עצמה.",
  },
  {
    icon: "↗",
    title: "מסלולי ELS במרחב",
    body: "הדילוגים יהפכו למסלולים חזותיים שניתן לעקוב אחריהם קדימה ואחורה, להשוות ביניהם ולראות היכן הם נפגשים.",
  },
  {
    icon: "3D",
    title: "מרחב תלת־ממדי כשיש לו משמעות",
    body: "במקומות שבהם עומק, מיקום והצטלבות באמת מוסיפים מידע, המחקר יוכל לעבור מתצוגה שטוחה לשכבות, 2.5D ועד 3D — עם fallback מלא למכשירים חלשים ונגישות.",
  },
  {
    icon: "∞",
    title: "עץ ידע אחד",
    body: "צופן לא יישאר אי בודד. הוא יתחבר למספרים, מילים ושמות, פסוקים, ספרים, התכנסויות, מחקר שמור ורזיאל — דרך אותה זהות מחקרית.",
  },
  {
    icon: "⌖",
    title: "מסע מחקר רציף",
    body: "אפשר יהיה להיכנס מצופן אל מספר או מקור ולחזור לאותו מיקום מדויק. אותה חקירה תוכל להמשיך בין שכבות בלי להתחיל מחדש.",
  },
];

function CodeClosed({ message }) {
  const P = usePalette();
  return (
    <div style={{ direction: "rtl", maxWidth: 1060, margin: "0 auto", padding: "54px 18px 110px", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
        <img src="/els-icon.png" alt="" width="58" height="58" style={{ borderRadius: 15, objectFit: "cover", boxShadow: `0 0 32px ${P.glow}` }} />
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 4.5, marginTop: 14, marginBottom: 8 }}>דילוגי אותיות · ELS</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(34px,7vw,60px)", fontWeight: 800, margin: "0 0 12px", lineHeight: 1.12, textShadow: `0 0 55px ${P.glow}` }}>
          הצופן התנ״כי נבנה מחדש
        </h1>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: P.cardSoft || P.card, border: `1px solid ${P.borderStrong || P.border}`, borderRadius: 999, padding: "8px 17px", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 20 }}>
          🚧 סגור זמנית · עולם חדש נבנה כאן מתחת
        </div>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 17, lineHeight: 2, margin: "0 auto 10px" }}>
          אנחנו לא מוחקים את מנוע ה־ELS ולא מתחילים מערכת שנייה. המנוע הקיים נשמר מתחת — ומסביבו נבנית חוויית מחקר חדשה: שכבות, מסלולים, הקשרים, מרחב ועץ ידע אחד.
        </p>
        {message && <p style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: "8px auto 0" }}>{message}</p>}
      </div>

      <section aria-label="מסלול מחקר חיצוני זמני" style={{ maxWidth: 760, margin: "28px auto 8px", padding: "24px 22px", textAlign: "center", background: P.cardGrad || P.card, border: `1px solid ${P.borderStrong || P.border}`, borderRadius: 22, boxShadow: `0 0 34px ${P.glow}` }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 2.4, marginBottom: 8 }}>בינתיים · מסלול נוסף למחקר</div>
        <h2 style={{ color: P.accentText, fontFamily: F.heading, fontSize: "clamp(22px,4vw,30px)", margin: "0 0 11px", lineHeight: 1.35 }}>השער פתוח גם מעבר לכאן</h2>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, margin: "0 auto 8px", maxWidth: 650 }}>
          הצופן החדש של SOD1820 עדיין נבנה — אבל המחקר לא נעצר. עד שהמערכת שלנו תיפתח, אפשר להמשיך לחקור מספרים, דפוסים ורמזים גם ב־The First Verse — מרחב מחקר עצמאי שנוגע באותם אזורי סוד מזווית אחרת.
        </p>
        <p style={{ color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, margin: "0 auto 16px" }}>
          מי שמרגיש שהמסע כבר התחיל — יכול להמשיך מכאן.
        </p>
        <a
          href="https://www.thefirstverse.com/he?via=user-31"
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: 48, padding: "11px 22px", borderRadius: 999, textDecoration: "none",
            background: P.accentBtn, color: P.onAccent, border: `1px solid ${P.accent}`,
            boxShadow: `0 0 0 1px ${P.borderStrong || P.border}, 0 8px 28px ${P.glow}`,
            fontFamily: F.heading, fontSize: 14, fontWeight: 900,
          }}
        >
          המשך אל The First Verse ↗
        </a>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.7, marginTop: 12 }}>
          זהו קישור השותף של SOD1820. הצטרפות דרכו תומכת בהמשך הדרך ובבניית כלי המחקר הבאים.
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, margin: "34px 0 22px" }}>
        <figure style={{ margin: 0, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 22, padding: 10, overflow: "hidden" }}>
          <img src="/els-rebuild-crown-preview.webp" alt="כיוון המיתוג והעולם החזותי החדש" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 15, display: "block" }} />
          <figcaption style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, padding: "10px 5px 3px", textAlign: "center" }}>
            כיוון המיתוג והעולם החזותי החדש
          </figcaption>
        </figure>
        <figure style={{ margin: 0, background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 22, padding: 10, overflow: "hidden" }}>
          <img src={ELS_PREMIUM_PREVIEW} alt="הצצה איכותית לכיוון מערכת המחקר החדשה" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 15, display: "block", background: P.cardSoft || P.card }} />
          <figcaption style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, padding: "10px 5px 3px", textAlign: "center" }}>
            הצצה לכיוון מערכת המחקר החדשה — אותה חקירה, הרבה שכבות
          </figcaption>
        </figure>
      </div>

      <section aria-labelledby="els-rebuild-layers" style={{ marginTop: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div id="els-rebuild-layers" style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,34px)", fontWeight: 800 }}>מה נבנה עכשיו</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginTop: 5 }}>לא עוד מטריצה בודדת — סביבת מחקר רב־שכבתית.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {REBUILD_LAYERS.map(layer => (
            <article key={layer.title} style={{ background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: "18px 17px" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: P.cardSoft || P.card, border: `1px solid ${P.borderStrong || P.border}`, color: P.accentText, fontFamily: F.heading, fontSize: layer.icon === "3D" ? 11 : 19, fontWeight: 900, marginBottom: 11 }}>{layer.icon}</div>
              <h2 style={{ color: P.accentText, fontFamily: F.heading, fontSize: 16, margin: "0 0 7px" }}>{layer.title}</h2>
              <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0 }}>{layer.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: 760, margin: "34px auto 0" }}>
        <UpdatesBox
          source="code-rebuild"
          title="רוצים לדעת כשהצופן נפתח מחדש?"
          body="הירשמו לעדכונים ונשלח לכם הודעה כשהגרסה החדשה של הצופן התנ״כי תיפתח למחקר."
          cta="עדכנו אותי כשהצופן נפתח →"
        />
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>← חזרה לעמוד הבית</Link>
      </div>
    </div>
  );
}

export default function CodePage() {
  const P = usePalette();
  const { loading, isAdmin } = useAuth();
  const elsState = useFeatureState("lock_els");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [sp, setSp] = useSearchParams();
  const elsTerm = sp.get("term") || sp.get("q") || "";
  const elsSkip = sp.get("skip");
  const elsMatrix = useMemo(
    () => (elsTerm && elsSkip) ? { search_term: elsTerm, skip_distance: parseInt(elsSkip, 10) || 0, scope: sp.get("scope") === "tanakh" ? "tanakh" : "torah", positions: null } : null,
    [elsTerm, elsSkip, sp]);
  const findingId = sp.get("finding") || "";
  const { journeyLoad: elsJourneyLoad, status: reopenStatus } = useElsJourneyReopen(findingId);
  const [reopenNotice, setReopenNotice] = useState(null);
  useEffect(() => { setReopenNotice(null); }, [findingId]);
  useEffect(() => {
    if (!findingId || reopenStatus === "none" || reopenStatus === "ok" || reopenStatus === "not-els") return;
    const t = setTimeout(() => {
      setReopenNotice(reopenStatus === "not-found"
        ? "הממצא לא נמצא בסביבת המחקר שלך."
        : "לא נשמר מיקום מדויק לממצא הזה — אפשר לחפש את המונח מחדש.");
    }, 1200);
    return () => clearTimeout(t);
  }, [findingId, reopenStatus]);
  if (loading || elsState.loading) {
    return <div style={{ direction: "rtl", textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: "120px 20px", position: "relative", zIndex: 1 }}>טוען…</div>;
  }
  if (!isAdmin && elsState.blocked) return <CodeClosed message={elsState.message} />;

  return (
    <div dir="rtl" style={{ position: "relative", zIndex: 1 }}>
      <ElsChallengeStrip onPick={(term) => setSp(prev => { const n = new URLSearchParams(prev); n.set("term", term); n.delete("q"); return n; })} />
      {reopenNotice && (
        <div style={{ margin: "0 auto 10px", maxWidth: 900, padding: "10px 14px", borderRadius: 12, background: P.card, border: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 13 }}>
          {reopenNotice}
        </div>
      )}
      <TzofenEmbed full seed={elsMatrix ? "" : elsTerm} matrix={elsMatrix} fromTopic={sp.get("from")}
        journeyLoad={elsJourneyLoad}
        onLoadError={() => setReopenNotice("לא נמצא המיקום המדויק שנשמר — ייתכן שהטקסט השתנה. אפשר לחפש את המונח מחדש.")} />
      <div style={{ position: "fixed", bottom: 12, insetInlineStart: 12, zIndex: 30, display: "flex", gap: 8 }}>
        <button
          onClick={() => setGalleryOpen(true)}
          title="גלריית המטריצות השמורות"
          style={{
            background: "rgba(8,5,2,.72)", color: "#f0d879", cursor: "pointer",
            border: "1px solid rgba(212,175,55,.42)", borderRadius: 999,
            padding: "6px 14px", fontFamily: "'Heebo', sans-serif", fontWeight: 800,
            fontSize: 12.5, backdropFilter: "blur(4px)",
          }}
        >🖼️ מטריצות שמורות</button>
      </div>
      <SavedMatricesGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
