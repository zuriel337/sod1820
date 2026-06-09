import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, syncCategory47, syncAllComments, getPostsFromSupabase, getPostBySlug, adaptPost, getGematriaByPhrases, searchPosts, getDistinctCategoriesAndTags, getGematriaByValue, getCommentsByPostId, getChatMessages, sendChatMessage, subscribeToChatMessages, getPopularPosts, sendContactMessage } from "./lib/supabase.js";
import UploadFindings from "./components/UploadFindings.jsx";

// ===== GEMATRIA =====
const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
const calcGem = w => [...w].reduce((s,c) => s + (GEM[c] || 0), 0);

// ===== DESIGN TOKENS =====
const C = {
  bg:           "#07050E",
  bgGlow:       "#110e1e",
  gold:         "#d4af37",
  goldLight:    "#e8c840",
  goldBright:   "#f6e27a",
  goldDim:      "#9a7818",
  goldDark:     "#3a2200",
  goldDeep:     "#1a0e00",
  crimson:      "#7a1320",
  crimsonLight: "#a01f2e",
  royal:        "#3d1f5c",
  royalLight:   "#6b3fa0",
  surface:      "#0d0a0e",
  surface2:     "#140f0c",
  border:       "rgba(212,175,55,0.18)",
  borderGold:   "rgba(212,175,55,0.38)",
  muted:        "#8a7a5e",
  faint:        "#1a0f0a",
  danger:       "#8B2020",
};

const F = {
  royal:   "'Heebo', sans-serif",
  regal:   "'David Libre', serif",
  cinzel:  "'Cinzel', serif",
  heading: "'Heebo', sans-serif",
  body:    "'Frank Ruhl Libre', serif",
  mono:    "'Courier New', monospace",
};

// ===== DATA =====
const COURSES = [
  {
    id: 1,
    title: "שער האלף-בית",
    subtitle: "גימטריה רגילה — מהאות לעולם",
    price: 297,
    lessons: 12,
    level: "מתחיל",
    tag: "פופולרי",
    desc: "הבסיס המוחלט. תלמד לקרוא מספרים כשפה חיה — כל אות, כל שורש, כל פסוק.",
    color: "#CFB53B",
    syllabus: ["מהי גימטריה?","22 האותיות וערכן","חישוב מילים ופסוקים","שורשים ומשפחות מילים","יישום בחיי היומיום","תרגול מעשי מלא"],
  },
  {
    id: 2,
    title: "המסתתר",
    subtitle: "שיטת ההפרשים — מה שמסתתר בין האותיות",
    price: 397,
    lessons: 10,
    level: "מתקדם",
    tag: "חדש",
    desc: "שיטה ייחודית של צוריאל פולייס. גלה את הקוד שמסתתר בין אות לאות.",
    color: "#CFB53B",
    syllabus: ["עקרון ההפרש","מה מסתתר בין שתי אותיות","פענוח מילים מורכבות","דוגמאות מהתנ״ך","שיטת הפולייס","תרגול עצמאי"],
  },
  {
    id: 3,
    title: "אלבם — הצד השני",
    subtitle: "הצופן הקדום של ההיפוך",
    price: 347,
    lessons: 8,
    level: "בינוני",
    tag: "",
    desc: "א↔ל, ב↔מ — כל מילה היא גם מילה אחרת. גלה את הממד הנסתר של כל מושג.",
    color: "#CFB53B",
    syllabus: ["שיטת אלבם","לוח ה-11 היפוכים","מילים ומשמעויות כפולות","סודות בשמות","יישומים מתקדמים","פרויקט גמר"],
  },
  {
    id: 4,
    title: "ארבעת העולמות",
    subtitle: "ארבע שיטות · ארבע רמות · מספר אחד",
    price: 597,
    lessons: 20,
    level: "מאסטר",
    tag: "הכי מקיף",
    desc: "זהות, מסתתר, פוטנציאל, נשמה — ארבע שיטות הגימטריה של sod1820 בקורס אחד שלם.",
    color: "#E8C84A",
    syllabus: ["עולם הזהות","עולם המסתתר","עולם הפוטנציאל","עולם הנשמה","שילוב ארבעת השיטות","אנליזה עמוקה","פרויקטים מיוחדים","מאסטרקלאס חי"],
  },
];

const TESTIMONIALS = [
  { name: "מיכל ר׳", text: "אחרי השיעור הראשון ראיתי את המספר שלי בכל מקום. זה שינה לי את החיים.", stars: 5 },
  { name: "דוד כ׳", text: "צוריאל מסביר דברים שאין להם הסבר — ועדיין מבינים הכל.", stars: 5 },
  { name: "שרה מ׳", text: "הקורס על המסתתר פתח לי ממד שלם שלא ידעתי שקיים.", stars: 5 },
  { name: "יוסף ב׳", text: "השקעתי בקורס ארבעת העולמות ושינה את האופן שבו אני רואה את המציאות.", stars: 5 },
  { name: "רחל א׳", text: "הסברים ברורים, עמוקים ומרגשים. ממליצה לכל אחד.", stars: 5 },
];

// ===== KEY NUMBERS =====

const LOGO_URL =
  "https://sod1820.co.il/wp-content/uploads/2018/12/cropped-cropped-%D7%9C%D7%95%D7%92%D7%95-%D7%90%D7%AA%D7%A8-1.png";

const KEY_NUMBERS = {
  1:    "האחד — שורש הכל",
  3:    "שלמות / חשכה / קוד הבריאה 333",
  7:    "חותם הבריאה",
  14:   "דוד מלכות",
  26:   "יהוה",
  40:   "מ — זרע שינוי",
  45:   "גאולה",
  358:  "משיח = נחש",
  400:  "ת — חותם התפשטות",
  1237: "התגלות — לילה כיום יאיר",
  1820: "סוד השם יהוה × עמים",
};

const PAGE_CONTENT_STORE_KEY = "sod1820_page_content";
const PAGE_CONTENT_DEFAULTS = {
  home: {
    title: "סוד 1820",
    description: "גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה את המציאות מאחורי המציאות.",
    bodyHtml: "<p>גלה איך המילים והמספרים מתחברים כדי לחשוף מבנים נסתרות. כאן תוכל לקדם את עצמך עם שיטות למידה חדשות ולראות את המספרים כחלופה לשפה.</p>",
    category: "ראשי",
    tag: "home",
  },
  about: {
    title: "צוריאל פולייס",
    description: "צוריאל פולייס הוא חוקר גימטריה עצמאי עם למעלה מ-10 שנות מחקר, שמפתח שיטות מקוריות לחשיפה של הסודות בשפה.",
    bodyHtml: "<p>העמוד הזה מכיל את הסיפור מאחורי השיטות, החזון והדרך שבה צוריאל פיתח את הגישה הייחודית שלו.</p>",
    category: "אודות",
    tag: "about",
  },
  courses: {
    title: "כל הקורסים",
    description: "בחר קורס שמתאים לרמתך ופתח עולם חדש של משמעות במספרים ובמילים.",
    bodyHtml: "<p>כל קורס מעריך את התובנות שלך ומלמד אותך כיצד להשתמש בגימטריה באופן יומיומי בבחירה של מילים, שמות והחלטות.</p>",
    category: "קורסים",
    tag: "courses",
  },
  blog: {
    title: "פוסטים אחרונים",
    description: "",
    bodyHtml: "",
    category: "",
    tag: "blog",
  },
};

// ===== ORNAMENTS =====

const Ornament = ({ size = 20, color = C.gold }) => (
  <span style={{ color, fontSize: size, fontFamily: "serif", lineHeight: 1, userSelect: "none" }}>✦</span>
);

const RoyalDivider = ({ width = 300 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, margin: "0 auto", width }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.gold}, transparent)` }} />
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <span style={{ color: C.gold, fontSize: 13, lineHeight: 1, userSelect: "none" }}>❖</span>
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
    </div>
    <div style={{ width: "54%", height: 1, background: `linear-gradient(to right, transparent, ${C.borderGold}, transparent)` }} />
  </div>
);

// ===== SHARED COMPONENTS =====

function GoldButton({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const [hov, setHov] = useState(false);
  const isPrimary = variant === "primary";
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isPrimary
          ? (hov ? `linear-gradient(135deg, #3a2a00, #4a3600)` : `linear-gradient(135deg, #2A1E00, #3a2a00)`)
          : "transparent",
        border: `1px solid ${hov ? C.goldBright : C.gold}`,
        color: hov ? C.goldBright : C.goldLight,
        padding: "13px 36px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: F.heading,
        fontSize: 13,
        letterSpacing: 3,
        borderRadius: 2,
        transition: "all 0.25s",
        fontWeight: 600,
        opacity: disabled ? 0.4 : 1,
        textTransform: "uppercase",
        boxShadow: hov && isPrimary ? `0 0 24px ${C.goldDark}` : "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function RoyalInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: C.muted, letterSpacing: 4,
        marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase"
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: C.bg,
          border: `1px solid ${focused ? C.gold : C.border}`,
          borderBottom: `1px solid ${focused ? C.goldBright : C.borderGold}`,
          color: C.goldBright,
          padding: "12px 16px",
          fontSize: 15,
          fontFamily: F.body,
          borderRadius: 2,
          outline: "none",
          boxSizing: "border-box",
          direction: (type === "email" || type === "password") ? "ltr" : "rtl",
          transition: "border-color 0.25s",
          boxShadow: focused ? `inset 0 0 20px ${C.goldDeep}` : "none",
        }}
      />
    </div>
  );
}

function SectionHeader({ eyebrow, title, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "right", marginBottom: 56 }}>
      {eyebrow && (
        <div style={{
          fontSize: 12, letterSpacing: 6, color: C.goldDim,
          marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase"
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        color: C.goldLight,
        margin: "0 0 20px",
        fontSize: "clamp(26px, 4.2vw, 40px)",
        fontFamily: F.regal,
        fontWeight: 700,
        letterSpacing: 2,
        textShadow: `0 0 50px rgba(212,175,55,0.4), 0 1px 3px rgba(0,0,0,0.7)`,
      }}>{title}</h2>
      <RoyalDivider />
    </div>
  );
}

function PageBody({ bodyHtml }) {
  if (!bodyHtml) return null;
  return (
    <div
      style={{
        color: C.goldDim,
        fontFamily: F.body,
        fontSize: 16,
        lineHeight: 2,
        maxWidth: 750,
        margin: "0 auto 40px",
        textAlign: "center",
      }}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

// ===== COURSE CARD =====

function CourseCard({ course, onBuy, onDetail }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onDetail(course)}
      style={{
        background: hov
          ? `linear-gradient(160deg, ${C.surface2} 0%, ${C.bg} 100%)`
          : C.surface,
        border: `1px solid ${hov ? course.color : C.border}`,
        borderTop: `2px solid ${hov ? course.color : C.borderGold}`,
        borderRadius: 2,
        padding: "32px 28px",
        transition: "all 0.3s",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxShadow: hov ? `0 8px 40px ${C.goldDeep}, inset 0 1px 0 ${C.borderGold}` : `inset 0 1px 0 ${C.faint}`,
      }}
    >
      {/* corner ornament */}
      <div style={{
        position: "absolute", top: 12, left: 14,
        fontSize: 9, color: hov ? course.color : C.muted,
        fontFamily: F.heading, letterSpacing: 2, transition: "color 0.3s"
      }}>✦ ✦ ✦</div>

      {course.tag && (
        <div style={{
          position: "absolute", top: -1, right: 28,
          background: C.goldDark,
          border: `1px solid ${C.gold}`,
          borderTop: "none",
          color: C.goldBright,
          fontSize: 9, letterSpacing: 3,
          padding: "5px 12px", fontFamily: F.heading,
          textTransform: "uppercase"
        }}>{course.tag}</div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{
          fontSize: 10, color: C.muted, letterSpacing: 3,
          marginBottom: 12, fontFamily: F.heading, textTransform: "uppercase"
        }}>
          {course.level} &nbsp;·&nbsp; {course.lessons} שיעורים
        </div>

        <h3 style={{
          color: C.goldLight,
          margin: "0 0 8px",
          fontSize: 22,
          fontFamily: F.royal,
          fontWeight: 700,
          letterSpacing: 1,
          lineHeight: 1.3,
        }}>{course.title}</h3>

        <div style={{
          color: C.goldDim, fontSize: 13, marginBottom: 18,
          fontFamily: F.body, fontStyle: "italic"
        }}>{course.subtitle}</div>

        <p style={{
          color: "#ede4d3", fontSize: 16, lineHeight: 1.85,
          margin: "0 0 24px", flex: 1,
          fontFamily: F.body
        }}>{course.desc}</p>
      </div>

      <div style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: 20, marginTop: "auto",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span style={{
          fontSize: 26, color: C.goldBright, fontWeight: 900,
          fontFamily: F.heading
        }}>₪{course.price}</span>
        <GoldButton
          variant="secondary"
          style={{ padding: "8px 20px", fontSize: 11 }}
          onClick={e => { e.stopPropagation(); onBuy(course); }}
        >לרכישה</GoldButton>
      </div>
    </div>
  );
}

// ===== COURSE DETAIL PAGE =====

function CourseDetailPage({ course, onBuy, onBack }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px", direction: "rtl" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: C.muted,
        cursor: "pointer", fontFamily: F.heading,
        fontSize: 11, marginBottom: 40, letterSpacing: 3,
        textTransform: "uppercase", transition: "color 0.2s",
      }}
        onMouseEnter={e => e.target.style.color = C.goldDim}
        onMouseLeave={e => e.target.style.color = C.muted}
      >← חזרה לקורסים</button>

      <div style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${course.color}`,
        borderTop: `3px solid ${course.color}`,
        borderRadius: 2,
        padding: "44px 40px",
        marginBottom: 20,
        boxShadow: `0 0 60px ${C.goldDeep}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
          <div style={{ flex: 1 }}>
            {course.tag && (
              <div style={{
                display: "inline-block", marginBottom: 16,
                background: C.goldDark, border: `1px solid ${C.gold}`,
                color: C.goldBright, fontSize: 9, letterSpacing: 4,
                padding: "5px 14px", fontFamily: F.heading, textTransform: "uppercase"
              }}>{course.tag}</div>
            )}
            <div style={{
              fontSize: 10, color: C.muted, letterSpacing: 4,
              marginBottom: 12, fontFamily: F.heading, textTransform: "uppercase"
            }}>{course.level} · {course.lessons} שיעורים</div>

            <h1 style={{
              color: C.goldBright, margin: "0 0 12px",
              fontSize: "clamp(26px, 4vw, 38px)",
              fontFamily: F.royal, fontWeight: 700,
              textShadow: `0 0 50px ${C.goldDark}`, lineHeight: 1.2,
            }}>{course.title}</h1>

            <p style={{ color: C.goldDim, fontSize: 16, margin: 0, fontFamily: F.body, fontStyle: "italic" }}>
              {course.subtitle}
            </p>
          </div>

          <div style={{ textAlign: "center", minWidth: 140 }}>
            <div style={{
              fontSize: 40, color: C.goldBright, fontWeight: 900,
              fontFamily: F.heading, marginBottom: 16
            }}>₪{course.price}</div>
            <GoldButton onClick={() => onBuy(course)} style={{ width: "100%", textAlign: "center" }}>
              לרכישה
            </GoldButton>
          </div>
        </div>

        <div style={{
          marginTop: 32, paddingTop: 28,
          borderTop: `1px solid ${C.border}`
        }}>
          <p style={{ color: C.goldLight, fontSize: 15, lineHeight: 2.1, margin: 0, fontFamily: F.body }}>
            {course.desc}
          </p>
        </div>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: "36px 40px",
      }}>
        <div style={{
          fontSize: 11, color: C.goldDim, letterSpacing: 5,
          marginBottom: 28, fontFamily: F.heading, textTransform: "uppercase"
        }}>תוכן הקורס</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {course.syllabus.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, color: C.goldDim, fontSize: 14, fontFamily: F.body }}>
              <span style={{
                color: C.gold, fontSize: 9, minWidth: 22,
                fontFamily: F.heading, letterSpacing: 1, paddingTop: 3
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {item}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 28, paddingTop: 24,
          borderTop: `1px solid ${C.border}`,
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10
        }}>
          {["✓ גישה מיידית", "✓ צפייה ללא הגבלה", "✓ עדכונים לנצח", "✓ תמיכה ישירה"].map(f => (
            <div key={f} style={{ fontSize: 13, color: C.goldDim, fontFamily: F.body }}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== LATEST POSTS SECTION =====

function LatestPostsSection({ onNav }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPostsFromSupabase({ limit: 10 })
      .then(({ posts: rows }) => {
        setPosts(rows.map(adaptPost));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <div style={{
      padding: "88px 24px",
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SectionHeader eyebrow="" title="פוסטים אחרונים" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 16,
        }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
            : posts.map(post => (
                <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />
              ))
          }
        </div>
        {!loading && (
          <div style={{ textAlign: "center", marginTop: 44 }}>
            <GoldButton variant="secondary" onClick={() => onNav("blog")}>
              לכל הפוסטים ←
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== LANDING PAGE =====

function Landing({ onNav }) {
  return (
    <div style={{ direction: "rtl" }}>

      {/* ── CROWN ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "48px 18px 32px",
        background: `radial-gradient(ellipse at 50% 20%, rgba(26,18,0,0.5) 0%, transparent 60%)`,
      }}>
        <div style={{
          position: "relative",
          display: "inline-block",
          marginBottom: 20,
          opacity: 0.95,
          transform: "translateZ(0)",
        }}>
          {/* קרני אור */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 160, height: 160,
            background: `conic-gradient(from 0deg,
              transparent 0deg, rgba(212,175,55,0.16) 12deg, transparent 24deg,
              transparent 60deg, rgba(212,175,55,0.11) 72deg, transparent 84deg,
              transparent 120deg, rgba(212,175,55,0.14) 132deg, transparent 144deg,
              transparent 180deg, rgba(212,175,55,0.09) 192deg, transparent 204deg,
              transparent 240deg, rgba(212,175,55,0.12) 252deg, transparent 264deg,
              transparent 300deg, rgba(212,175,55,0.08) 312deg, transparent 324deg)`,
            borderRadius: "50%",
            animation: "light-rays 16s linear infinite",
            pointerEvents: "none",
          }} />
          <img
            src={LOGO_URL}
            alt="SOD1820 logo"
            style={{
              height: 76,
              width: "auto",
              display: "block",
              position: "relative", zIndex: 1,
              animation: "crown-spin 12s linear infinite, royal-pulse 4.2s ease-in-out infinite",
              filter: "drop-shadow(0 0 24px rgba(232,200,74,0.78))",
            }}
          />
          <span style={{
            position: "absolute", zIndex: 2,
            top: "-16%", left: "-14%",
            color: C.goldLight, fontSize: 18, opacity: 0.9,
            animation: "royal-sparkle 3.6s ease-in-out infinite",
          }}>✦</span>
          <span style={{
            position: "absolute", zIndex: 2,
            top: "4%", right: "-12%",
            color: C.goldBright, fontSize: 14, opacity: 0.85,
            animation: "royal-sparkle 4.6s ease-in-out infinite reverse",
          }}>✦</span>
        </div>
      </div>

      {/* ── GEMATRIA UPLOAD FINDINGS ── */}
      <UploadFindings />

      {/* ── LATEST POSTS ── */}
      <LatestPostsSection onNav={onNav} />

    </div>
  );
}

// ===== HOME PAGE =====

function HeroSection({ onNav }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center",
      padding: "72px 24px 56px",
      background: `radial-gradient(ellipse at 50% 0%, rgba(26,18,0,0.55) 0%, transparent 65%)`,
    }}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: 32 }}>
        {/* קרני אור מסתובבות */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 180, height: 180,
          background: `conic-gradient(from 0deg,
            transparent 0deg, rgba(212,175,55,0.18) 12deg, transparent 24deg,
            transparent 60deg, rgba(212,175,55,0.12) 72deg, transparent 84deg,
            transparent 120deg, rgba(212,175,55,0.15) 132deg, transparent 144deg,
            transparent 180deg, rgba(212,175,55,0.1) 192deg, transparent 204deg,
            transparent 240deg, rgba(212,175,55,0.13) 252deg, transparent 264deg,
            transparent 300deg, rgba(212,175,55,0.09) 312deg, transparent 324deg)`,
          borderRadius: "50%",
          animation: "light-rays 14s linear infinite",
          pointerEvents: "none",
        }} />
        <img
          src={LOGO_URL}
          alt="SOD1820 logo"
          style={{
            height: 80, width: "auto", display: "block", position: "relative", zIndex: 1,
            animation: "crown-spin 12s linear infinite, royal-pulse 4.2s ease-in-out infinite",
            filter: "drop-shadow(0 0 28px rgba(232,200,74,0.85))",
          }}
        />
        <span style={{ position: "absolute", top: "-16%", left: "-14%", color: C.goldLight, fontSize: 18, opacity: 0.9, animation: "royal-sparkle 3.6s ease-in-out infinite", zIndex: 2 }}>✦</span>
        <span style={{ position: "absolute", top: "4%", right: "-12%", color: C.goldBright, fontSize: 14, opacity: 0.85, animation: "royal-sparkle 4.6s ease-in-out infinite reverse", zIndex: 2 }}>✦</span>
      </div>

      <div style={{ fontSize: 10, color: C.goldDim, letterSpacing: 7, marginBottom: 20, fontFamily: F.cinzel, textTransform: "uppercase" }}>SOD1820 · צוריאל פולייס</div>

      <h1 style={{
        color: C.goldBright,
        margin: "0 0 20px",
        fontSize: "clamp(32px, 6vw, 62px)",
        fontFamily: F.regal,
        fontWeight: 700,
        letterSpacing: 2,
        lineHeight: 1.2,
        textShadow: `0 0 80px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)`,
        maxWidth: 680,
        animation: "hero-shimmer 5s ease-in-out infinite",
      }}>
        הקוד הנסתר בשפה העברית
      </h1>

      <p style={{
        color: C.goldDim,
        fontSize: "clamp(14px, 2vw, 17px)",
        fontFamily: F.body,
        lineHeight: 2,
        maxWidth: 540,
        margin: "0 0 40px",
      }}>
        גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה את המציאות מאחורי המציאות. למד לקרוא את הקוד שמסתתר בכל מילה.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <GoldButton onClick={() => onNav("courses")}>לכל הקורסים</GoldButton>
        <GoldButton variant="secondary" onClick={() => onNav("about")}>אודות צוריאל</GoldButton>
      </div>

      <div style={{ marginTop: 52 }}>
        <RoyalDivider width={220} />
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    ["112", "אירועים מתועדים"],
    ["10+", "שנות מחקר"],
    ["1820", "שם יהוה"],
    ["4", "שיטות גימטריה"],
  ];
  return (
    <div style={{
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      padding: "28px 24px",
    }}>
      <div style={{
        maxWidth: 840, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      }}>
        {stats.map(([num, label], i) => (
          <div key={label} style={{
            textAlign: "center",
            padding: "12px 16px",
            borderRight: i < stats.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{
              fontSize: 28, color: C.goldBright, fontWeight: 900,
              fontFamily: F.heading, textShadow: `0 0 20px ${C.goldDeep}`,
            }}>{num}</div>
            <div style={{
              fontSize: 9, color: C.muted, marginTop: 6,
              letterSpacing: 3, fontFamily: F.heading, textTransform: "uppercase",
            }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== ELS — דילוגי אותיות =====
const ELS_SOURCE = `
  בראשית ברא אלהים את השמים ואת הארץ
  והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים
  ויאמר אלהים יהי אור ויהי אור
  וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך
  ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד
  ויאמר אלהים יהי רקיע בתוך המים ויהי מבדיל בין מים למים
  ויעש אלהים את הרקיע ויבדל בין המים אשר מתחת לרקיע ובין המים אשר מעל לרקיע ויהי כן
  ויקרא אלהים לרקיע שמים ויהי ערב ויהי בקר יום שני
`;
const ELS_FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function elsNormalize(s) {
  return [...(s || "")].filter(ch => /[א-ת]/.test(ch))
    .map(ch => ELS_FINALS[ch] || ch).join('');
}
const ELS_LETTERS = elsNormalize(ELS_SOURCE);

function elsSearch(targetRaw, skipMin, skipMax, dir) {
  const target = elsNormalize(targetRaw);
  const N = ELS_LETTERS.length, L = target.length;
  const hits = [];
  if (L < 2) return { hits, N, target };
  const dirs = dir === 'fwd' ? [1] : dir === 'back' ? [-1] : [1, -1];
  for (let skip = skipMin; skip <= skipMax; skip++) {
    for (const d of dirs) {
      const step = skip * d;
      for (let start = 0; start < N; start++) {
        const end = start + step * (L - 1);
        if (end < 0 || end >= N) continue;
        let ok = true;
        for (let k = 0; k < L; k++) {
          if (ELS_LETTERS[start + step * k] !== target[k]) { ok = false; break; }
        }
        if (ok) {
          const positions = [];
          for (let k = 0; k < L; k++) positions.push(start + step * k);
          hits.push({ skip, dir: d, start, positions });
        }
      }
    }
  }
  return { hits, N, target };
}

function ELSMatrix({ hit }) {
  const cols = Math.abs(hit.skip);
  const set = new Set(hit.positions);
  const min = Math.min(...hit.positions);
  const max = Math.max(...hit.positions);
  const startRow = Math.max(0, Math.floor(min / cols) - 1);
  const endRow = Math.min(Math.ceil(ELS_LETTERS.length / cols), Math.floor(max / cols) + 2);
  const rows = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isHit = set.has(idx);
      rows.push(
        <div key={idx} style={{
          width: 26, height: 30, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 3,
          background: isHit ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "#0a0700",
          color: isHit ? C.goldBright : "#6f6347",
          fontWeight: isHit ? 700 : 400,
          boxShadow: isHit ? `0 0 8px rgba(122,19,32,0.6)` : "none",
        }}>{idx < ELS_LETTERS.length ? ELS_LETTERS[idx] : ""}</div>
      );
    }
  }
  return (
    <div style={{
      display: "grid", gap: 3, direction: "rtl",
      gridTemplateColumns: `repeat(${cols}, 26px)`,
      fontFamily: F.regal, fontSize: 15, overflowX: "auto", padding: 4,
    }}>{rows}</div>
  );
}

function ELSSection() {
  const [target, setTarget] = useState("אור");
  const [skipMin, setSkipMin] = useState(1);
  const [skipMax, setSkipMax] = useState(100);
  const [dir, setDir] = useState("both");
  const [result, setResult] = useState(() => elsSearch("אור", 1, 100, "both"));

  function run() {
    const lo = Math.max(1, parseInt(skipMin) || 1);
    const hi = Math.max(lo, parseInt(skipMax) || lo);
    setResult(elsSearch(target, lo, hi, dir));
  }

  const inputStyle = {
    width: "100%", background: "#050400", border: `1px solid ${C.border}`,
    color: C.goldBright, padding: "10px 12px", borderRadius: 6,
    fontFamily: F.royal, fontSize: 15, outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 11, color: C.goldDim, letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 6, fontFamily: F.heading,
  };

  return (
    <div style={{
      padding: "80px 24px",
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
      direction: "rtl",
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionHeader eyebrow="כלי דילוגי אותיות" title="הצופן שמסתתר בטקסט" />

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>מילת היעד</label>
              <input style={inputStyle} value={target} maxLength={20}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מינימלי</label>
              <input style={inputStyle} type="number" value={skipMin} min={1}
                onChange={e => setSkipMin(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מקסימלי</label>
              <input style={inputStyle} type="number" value={skipMax} min={1}
                onChange={e => setSkipMax(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>כיוון</label>
              <select style={inputStyle} value={dir} onChange={e => setDir(e.target.value)}>
                <option value="both">שני הכיוונים</option>
                <option value="fwd">קדימה בלבד</option>
                <option value="back">אחורה בלבד</option>
              </select>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <GoldButton onClick={run}>חפש דילוגים ◆</GoldButton>
          </div>
        </div>

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20,
        }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
            טקסט: <b style={{ color: C.goldBright }}>{result.N}</b> אותיות ·
            יעד: <b style={{ color: C.goldBright }}>{result.target || "—"}</b> ·
            נמצאו <b style={{ color: C.goldBright }}>{result.hits.length}</b> מופעים
          </div>
          {result.hits.length === 0 ? (
            <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
              לא נמצאו מופעים בטווח הזה. נסה להרחיב את טווח הדילוג או מילה קצרה יותר.
            </div>
          ) : (
            <>
              {result.hits.slice(0, 6).map((h, i) => (
                <div key={i} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 0" }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: F.royal }}>
                    מופע {i + 1} · דילוג <b style={{ color: C.goldBright }}>{h.skip}</b> ·
                    כיוון <b style={{ color: C.goldBright }}>{h.dir === 1 ? "קדימה" : "אחורה"}</b> ·
                    מיקום התחלה <b style={{ color: C.goldBright }}>{h.start + 1}</b>
                  </div>
                  <ELSMatrix hit={h} />
                </div>
              ))}
              {result.hits.length > 6 && (
                <div style={{ color: C.muted, textAlign: "center", padding: 16, fontSize: 13 }}>
                  ...ועוד {result.hits.length - 6} מופעים
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ color: C.goldDim, fontSize: 11, textAlign: "center", marginTop: 24, fontFamily: F.heading }}>
          טקסט המקור: בראשית א׳ (נחלת הכלל) · גרסה מלאה תחפש בכל 304,805 אותיות התורה
        </div>
      </div>
    </div>
  );
}

function FeaturedCoursesSection({ onNav }) {
  return (
    <div style={{
      padding: "80px 24px",
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SectionHeader eyebrow="קורסים" title="בחר את הדרך שלך" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 20,
          marginBottom: 44,
        }}>
          {COURSES.map(c => (
            <CourseCard
              key={c.id}
              course={c}
              onBuy={course => onNav("checkout", course)}
              onDetail={course => onNav("detail", course)}
            />
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <GoldButton variant="secondary" onClick={() => onNav("courses")}>
            לכל הקורסים ←
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  return (
    <div style={{
      padding: "80px 24px",
      borderTop: `1px solid ${C.border}`,
      background: C.bg,
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SectionHeader eyebrow="תלמידים" title="מה אומרים התלמידים" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 16,
        }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderTop: `2px solid ${C.borderGold}`,
              borderRadius: 2,
              padding: "28px 24px",
            }}>
              <div style={{ color: C.goldBright, fontSize: 14, marginBottom: 12 }}>
                {"★".repeat(t.stars)}
              </div>
              <p style={{
                color: "#ede4d3", fontFamily: F.body,
                fontSize: 14, lineHeight: 2,
                margin: "0 0 16px", fontStyle: "italic",
              }}>"{t.text}"</p>
              <div style={{
                fontSize: 10, color: C.goldDim,
                fontFamily: F.heading, letterSpacing: 3,
                textTransform: "uppercase",
              }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== AXIS / TIMELINE CONSTANTS =====
const AXIS_COLOR = {
  '7.10':      '#c0392b',
  'אירן':      '#8e44ad',
  'טראמפ':    '#2471a3',
  'קורונה':   '#b7950b',
  'אסון_טבע': '#935116',
  'ירושלים':  '#b7770d',
};
const AXIS_LABEL = {
  '7.10':      '7.10 — שמחת תורה',
  'אירן':      'אירן',
  'טראמפ':    'טראמפ',
  'קורונה':   'קורונה',
  'אסון_טבע': 'אסון טבע',
  'ירושלים':  'ירושלים',
};
const WEIGHT_R = [0, 5, 7, 10, 14, 20];
const cleanLabel = s => s ? s.replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#\d+;/g, '').trim() : '';

// ── LIVE SIGNAL BAR ───────────────────────────────────────────────────────────
function LiveSignalBar({ events }) {
  const anchors = events
    .filter(e => (e.weight || 1) >= 3)
    .sort((a, b) => (b.metadata?.occurred_at || '').localeCompare(a.metadata?.occurred_at || ''))
    .slice(0, 6);

  if (!anchors.length) return null;

  const items = [...anchors, ...anchors];

  return (
    <div style={{
      background: `linear-gradient(90deg, ${C.bg} 0%, ${C.surface} 50%, ${C.bg} 100%)`,
      borderTop: `1px solid ${C.borderGold}`,
      borderBottom: `1px solid ${C.border}`,
      overflow: 'hidden',
      height: 44,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', animation: 'ticker-scroll 50s linear infinite', whiteSpace: 'nowrap' }}>
        {items.map((e, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 28px',
            color: e.axis_theme ? (AXIS_COLOR[e.axis_theme] || C.goldDim) : C.goldDim,
            fontSize: 11, fontFamily: F.heading, letterSpacing: 2,
          }}>
            <span style={{ color: C.goldDim, fontSize: 7 }}>✦</span>
            {e.hebrew_date && <span style={{ color: C.goldDim, fontSize: 10 }}>{e.hebrew_date}</span>}
            {e.hebrew_date && <span style={{ color: C.border, margin: '0 2px' }}>·</span>}
            <span>{cleanLabel(e.label).slice(0, 55)}{cleanLabel(e.label).length > 55 ? '…' : ''}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── TIME AXIS SECTION ─────────────────────────────────────────────────────────
function TimelineSection({ events, onNav }) {
  const [sel, setSel] = useState(null);

  const byYear = {};
  events.forEach(e => {
    const yr = e.metadata?.year;
    if (!yr || yr < 2014 || yr > 2027) return;
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(e);
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;

  return (
    <section style={{
      padding: '72px 0 56px',
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
      borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto 40px' }}>
        <SectionHeader eyebrow="ציר הזמן" title="עשר שנות רמזים" />
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          padding: '0 40px',
          minWidth: years.length * 110 + 80,
        }}>
          <div style={{
            position: 'absolute',
            top: 48, left: 40, right: 40, height: 1,
            background: `linear-gradient(to right, transparent, ${C.borderGold} 15%, ${C.gold} 50%, ${C.borderGold} 85%, transparent)`,
            zIndex: 0,
          }} />

          {years.map(yr => {
            const evts = byYear[yr].sort((a, b) => (b.weight || 1) - (a.weight || 1));
            const topW = evts[0]?.weight || 1;
            const markerR = topW >= 4 ? 6 : topW >= 3 ? 4 : 3;

            return (
              <div key={yr} style={{
                flex: '0 0 110px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', zIndex: 1, paddingTop: 8,
              }}>
                <div style={{
                  fontSize: 10, lineHeight: '22px', marginBottom: 8,
                  color: topW >= 4 ? C.goldBright : topW >= 3 ? C.goldLight : C.goldDim,
                  fontFamily: F.cinzel, letterSpacing: 2, fontWeight: topW >= 4 ? 700 : 400,
                }}>{yr}</div>

                <div style={{
                  width: markerR * 2, height: markerR * 2, borderRadius: '50%',
                  background: topW >= 4 ? C.goldBright : topW >= 3 ? C.gold : C.borderGold,
                  boxShadow: topW >= 4 ? `0 0 14px ${C.gold}88` : 'none',
                  marginBottom: 14, flexShrink: 0,
                }} />

                {evts.slice(0, 7).map((e, i) => {
                  const r = WEIGHT_R[e.weight || 1];
                  const col = e.axis_theme ? (AXIS_COLOR[e.axis_theme] || '#55504a') : '#55504a';
                  const isSel = sel?.id === e.id;
                  return (
                    <div
                      key={e.id || i}
                      title={cleanLabel(e.label).slice(0, 80)}
                      onClick={() => setSel(isSel ? null : e)}
                      style={{
                        width: r * 2, height: r * 2, borderRadius: '50%',
                        background: col,
                        border: `1px solid ${isSel ? C.goldBright : 'rgba(255,255,255,0.1)'}`,
                        cursor: 'pointer', marginBottom: 6, flexShrink: 0,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        transform: isSel ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: isSel ? `0 0 ${r + 4}px ${col}` : e.weight >= 4 ? `0 0 ${r}px ${col}88` : 'none',
                      }}
                    />
                  );
                })}
                {evts.length > 7 && (
                  <div style={{ fontSize: 8, color: C.muted, fontFamily: F.heading, letterSpacing: 1, marginTop: 2 }}>
                    +{evts.length - 7}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', padding: '20px 24px 0' }}>
        {Object.entries(AXIS_COLOR).map(([theme, color]) => (
          <div key={theme} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.muted, fontFamily: F.heading }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {AXIS_LABEL[theme] || theme}
          </div>
        ))}
      </div>

      {sel && (
        <div
          onClick={() => setSel(null)}
          style={{
            maxWidth: 560, margin: '28px auto 0',
            padding: '20px 24px',
            background: C.surface,
            border: `1px solid ${sel.axis_theme ? (AXIS_COLOR[sel.axis_theme] || C.borderGold) : C.borderGold}`,
            borderTop: `3px solid ${sel.axis_theme ? (AXIS_COLOR[sel.axis_theme] || C.gold) : C.gold}`,
            borderRadius: 2, direction: 'rtl', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: C.goldLight, fontFamily: F.body, lineHeight: 1.7, flex: 1 }}>
              {cleanLabel(sel.label)}
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: F.heading, letterSpacing: 2, flexShrink: 0 }}>
              {sel.metadata?.year}
            </div>
          </div>
          {sel.hebrew_date && (
            <div style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading, letterSpacing: 3, marginBottom: 10 }}>
              {sel.hebrew_date}{sel.metadata?.occurred_at ? ` · ${sel.metadata.occurred_at.slice(0, 10)}` : ''}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {sel.axis_theme && (
              <div style={{
                background: (AXIS_COLOR[sel.axis_theme] || C.goldDark) + '22',
                border: `1px solid ${AXIS_COLOR[sel.axis_theme] || C.borderGold}`,
                color: AXIS_COLOR[sel.axis_theme] || C.goldDim,
                fontSize: 9, letterSpacing: 3, padding: '3px 10px', fontFamily: F.heading,
              }}>{sel.axis_theme}</div>
            )}
            {sel.metadata?.post_wp_id && (
              <button
                onClick={ev => { ev.stopPropagation(); onNav('blog'); }}
                style={{
                  background: 'none', border: `1px solid ${C.border}`,
                  color: C.goldDim, fontSize: 9, letterSpacing: 2,
                  fontFamily: F.heading, padding: '3px 10px', cursor: 'pointer',
                }}
              >לפוסט ←</button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── AXIS THEME CARDS ──────────────────────────────────────────────────────────
function AxisThemeCards({ events, onNav }) {
  const [hovTheme, setHovTheme] = useState(null);

  const themes = {};
  events.forEach(e => {
    if (!e.axis_theme) return;
    if (!themes[e.axis_theme]) themes[e.axis_theme] = { count: 0, maxWeight: 0, latest: null };
    themes[e.axis_theme].count++;
    if ((e.weight || 1) > themes[e.axis_theme].maxWeight) themes[e.axis_theme].maxWeight = e.weight || 1;
    const d = e.metadata?.occurred_at || '';
    if (!themes[e.axis_theme].latest || d > (themes[e.axis_theme].latest.date || ''))
      themes[e.axis_theme].latest = { label: e.label, date: d, hebrew_date: e.hebrew_date };
  });

  const sorted = Object.entries(themes).sort((a, b) => b[1].maxWeight - a[1].maxWeight || b[1].count - a[1].count);
  if (!sorted.length) return null;

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <SectionHeader eyebrow="צירים" title="ציריי המחקר" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {sorted.map(([theme, data]) => {
            const col = AXIS_COLOR[theme] || C.goldDim;
            const hov = hovTheme === theme;
            return (
              <div
                key={theme}
                onMouseEnter={() => setHovTheme(theme)}
                onMouseLeave={() => setHovTheme(null)}
                onClick={() => onNav('blog')}
                style={{
                  background: hov ? C.surface2 : C.surface,
                  border: `1px solid ${hov ? col : C.border}`,
                  borderTop: `3px solid ${col}`,
                  borderRadius: 2, padding: '24px 20px',
                  cursor: 'pointer', transition: 'all 0.22s', direction: 'rtl',
                }}
              >
                <div style={{
                  fontSize: 20, color: col, fontFamily: F.regal, fontWeight: 700, marginBottom: 8,
                  textShadow: hov ? `0 0 20px ${col}66` : 'none', transition: 'text-shadow 0.22s',
                }}>{AXIS_LABEL[theme] || theme}</div>
                <div style={{ fontSize: 30, color: C.goldBright, fontFamily: F.heading, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
                  {data.count}
                </div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: F.heading, letterSpacing: 3, marginBottom: 14 }}>
                  רמזים מתועדים
                </div>
                {data.latest?.hebrew_date && (
                  <div style={{ fontSize: 9, color: col, fontFamily: F.heading, letterSpacing: 2, marginBottom: 12 }}>
                    {data.latest.hebrew_date}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(w => (
                    <div key={w} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: w <= data.maxWeight ? col : C.faint, transition: 'background 0.22s',
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── GALLERY NUMBERS SECTION ───────────────────────────────────────────────────
function GalleryNumbersSection() {
  const [byNumber, setByNumber] = useState([]);
  const [hovIdx, setHovIdx] = useState(null);

  useEffect(() => {
    supabase
      .from('galleries')
      .select('id, name, anchor_number, img_count')
      .gt('anchor_number', 0)
      .order('anchor_number', { ascending: true })
      .limit(300)
      .then(({ data }) => {
        if (!data) return;
        const grouped = {};
        data.forEach(g => {
          const n = g.anchor_number;
          if (!grouped[n]) grouped[n] = { anchor_number: n, rows: [], total: 0 };
          grouped[n].rows.push(g);
          grouped[n].total += g.img_count || 0;
        });
        setByNumber(
          Object.values(grouped).map(g => ({
            anchor_number: g.anchor_number,
            name: g.rows.sort((a, b) => (a.name?.length || 99) - (b.name?.length || 99))[0]?.name || '',
            count: g.rows.length,
            total: g.total,
          }))
        );
      });
  }, []);

  if (!byNumber.length) return null;

  return (
    <section style={{
      padding: '64px 0',
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
      borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ padding: '0 24px', maxWidth: 1040, margin: '0 auto 32px' }}>
        <SectionHeader eyebrow="גלריות" title="המספרים הגדולים" />
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 16, padding: '0 32px', width: 'max-content' }}>
          {byNumber.map((g, i) => {
            const hov = hovIdx === i;
            return (
              <div
                key={g.anchor_number}
                onMouseEnter={() => setHovIdx(i)}
                onMouseLeave={() => setHovIdx(null)}
                style={{
                  width: 140, flexShrink: 0,
                  background: hov ? C.surface2 : C.surface,
                  border: `1px solid ${hov ? C.gold : C.border}`,
                  borderTop: `2px solid ${hov ? C.goldBright : C.borderGold}`,
                  borderRadius: 2, padding: '20px 16px',
                  cursor: 'pointer', transition: 'all 0.22s',
                  textAlign: 'center', direction: 'rtl',
                }}
              >
                <div style={{
                  fontSize: g.anchor_number > 9999 ? 22 : g.anchor_number > 999 ? 28 : 36,
                  color: hov ? C.goldBright : C.goldLight,
                  fontFamily: F.regal, fontWeight: 700, lineHeight: 1.1, marginBottom: 8,
                  textShadow: hov ? `0 0 24px ${C.goldDark}` : 'none', transition: 'all 0.22s',
                }}>{g.anchor_number}</div>
                <div style={{
                  fontSize: 9, color: C.muted, fontFamily: F.heading,
                  letterSpacing: 1, lineHeight: 1.5, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{g.name}</div>
                {g.total > 0 && (
                  <div style={{ marginTop: 8, fontSize: 8, color: C.goldDim, fontFamily: F.heading, letterSpacing: 2 }}>
                    {g.total} תמונות{g.count > 1 ? ` · ${g.count} גלריות` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HomePage({ onNav, pageContent, adminMode }) {
  const [axisEvents, setAxisEvents] = useState([]);

  useEffect(() => {
    supabase
      .from('nodes')
      .select('id, label, weight, hebrew_date, axis_theme, metadata')
      .eq('type', 'event')
      .then(({ data }) => setAxisEvents(data ?? []));
  }, []);

  return (
    <div style={{ direction: "rtl" }}>
      <HeroSection onNav={onNav} />
      <LiveSignalBar events={axisEvents} />
      <TimelineSection events={axisEvents} onNav={onNav} />
      <AxisThemeCards events={axisEvents} onNav={onNav} />
      <GalleryNumbersSection />
      <StatsBar />
      <ELSSection />
      <div style={{ padding: "40px 0", background: C.surface }}>
        <UploadFindings />
      </div>
      <TestimonialsSection />
      <LatestPostsSection onNav={onNav} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 80px" }}>
        <PopularPostsWidget onNav={onNav} />
      </div>
    </div>
  );
}

// ===== COURSES PAGE =====

function CoursesPage({ onNav, pageContent, adminMode }) {
  const [filter, setFilter] = useState("הכל");
  const levels = ["הכל", "מתחיל", "בינוני", "מתקדם", "מאסטר"];
  const filtered = filter === "הכל" ? COURSES : COURSES.filter(c => c.level === filter);
  const { title, description, bodyHtml, category } = pageContent || {};

  return (
    <div style={{ padding: "64px 24px", maxWidth: 1040, margin: "0 auto", direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <SectionHeader eyebrow={category || "SOD1820"} title={title || "כל הקורסים"} />
        {adminMode && (
          <button onClick={() => onNav("admin", "courses")} style={{
            background: C.bgGlow, border: `1px solid ${C.gold}`,
            color: C.goldLight, padding: "10px 16px", borderRadius: 4,
            cursor: "pointer", fontFamily: F.heading, fontSize: 12,
            letterSpacing: 2, textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            ערוך דף
          </button>
        )}
      </div>
      {description && (
        <p style={{ color: C.goldDim, fontSize: 15, lineHeight: 2, marginBottom: 32, fontFamily: F.body, textAlign: "center" }}>
          {description}
        </p>
      )}
      <PageBody bodyHtml={bodyHtml} />

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 48, flexWrap: "wrap" }}>
        {levels.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            background: filter === l ? C.goldDark : "transparent",
            border: `1px solid ${filter === l ? C.gold : C.border}`,
            color: filter === l ? C.goldBright : C.muted,
            padding: "8px 20px",
            cursor: "pointer",
            fontFamily: F.heading,
            fontSize: 11,
            letterSpacing: 3,
            borderRadius: 2,
            transition: "all 0.25s",
            textTransform: "uppercase",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {filtered.map(c => (
          <CourseCard
            key={c.id}
            course={c}
            onBuy={course => onNav("checkout", course)}
            onDetail={course => onNav("detail", course)}
          />
        ))}
      </div>
    </div>
  );
}

// ===== ABOUT PAGE =====

function AboutPage({ onNav, pageContent, adminMode }) {
  const { title, description, bodyHtml, category } = pageContent || {};
  return (
    <div style={{ direction: "rtl", maxWidth: 780, margin: "0 auto", padding: "64px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <SectionHeader eyebrow={category || "אודות"} title={title || "צוריאל פולייס"} />
        {adminMode && (
          <button onClick={() => onNav("admin", "about")} style={{
            background: C.bgGlow, border: `1px solid ${C.gold}`,
            color: C.goldLight, padding: "10px 16px", borderRadius: 4,
            cursor: "pointer", fontFamily: F.heading, fontSize: 12,
            letterSpacing: 2, textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            ערוך דף
          </button>
        )}
      </div>

      <div style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`,
        borderRadius: 2,
        padding: "48px 40px",
        marginBottom: 20,
        boxShadow: `0 4px 40px ${C.goldDeep}`,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.goldDark} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, color: C.goldLight,
          margin: "0 auto 32px",
          boxShadow: `0 0 30px ${C.goldDeep}`,
        }}>✦</div>

        <p style={{ color: C.goldLight, fontSize: 15, lineHeight: 2.2, marginBottom: 20, fontFamily: F.body, textAlign: "center" }}>
          {description || "צוריאל פולייס הוא חוקר גימטריה עצמאי עם למעלה מ-10 שנות מחקר מעמיק בקודים הנסתרים של השפה העברית. הוא פיתח מספר שיטות ייחודיות שאינן מלמדות בשום מקום אחר — ביניהן שיטת ההפרשים (\"המסתתר\") ומסגרת \"ארבעת העולמות\"."}
        </p>

        <PageBody bodyHtml={bodyHtml} />

        <div style={{ margin: "24px 0" }}>
          <RoyalDivider width={160} />
        </div>

        <p style={{ color: C.goldDim, fontSize: 14, lineHeight: 2.1, fontFamily: F.body, textAlign: "center" }}>
          עם קהילה של למעלה מ-1820 תלמידים, צוריאל מאמין שגימטריה אינה מיסטיקה —
          היא מתמטיקה של השפה, כלי חשיבה שמשנה את האופן שבו רואים מילים, מספרים ומציאות.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 12,
        marginBottom: 40
      }}>
        {[["10+","שנות מחקר"],["1820","תלמידים"],["4","שיטות ייחודיות"],["50+","שיעורים מוקלטים"]].map(([n, l]) => (
          <div key={l} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderTop: `2px solid ${C.borderGold}`,
            borderRadius: 2,
            padding: "24px 16px",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: 28, color: C.goldBright, fontWeight: 900,
              fontFamily: F.heading, textShadow: `0 0 20px ${C.goldDeep}`
            }}>{n}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8, letterSpacing: 3, fontFamily: F.heading, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <GoldButton onClick={() => onNav("courses")}>לקורסים של צוריאל</GoldButton>
      </div>
    </div>
  );
}

// ===== LOGIN PAGE =====

function LoginPage({ onNav }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!email || !pass) { setError("יש למלא את כל השדות"); return; }
    setError(""); setDone(true);
  }

  if (done) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 24, color: C.goldLight, textShadow: `0 0 40px ${C.goldDark}` }}>✦</div>
        <h2 style={{ color: C.goldBright, margin: "0 0 12px", fontFamily: F.royal, fontSize: 26 }}>
          {mode === "login" ? "ברוך הבא" : "ברוך הצטרפותך"}
        </h2>
        <RoyalDivider width={120} />
        <p style={{ color: C.muted, fontSize: 13, marginTop: 16, fontFamily: F.body }}>
          {mode === "login" ? "הכניסה הצליחה" : "החשבון נוצר בהצלחה"}
        </p>
        <GoldButton style={{ marginTop: 32 }} onClick={() => onNav("courses")}>לקורסים שלי →</GoldButton>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, direction: "rtl" }}>
      <div style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`,
        borderRadius: 2,
        padding: "48px 40px",
        width: "100%", maxWidth: 400,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: C.muted, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>SOD1820</div>
          <h2 style={{ color: C.goldBright, margin: "0 0 16px", fontSize: 22, fontFamily: F.royal }}>
            {mode === "login" ? "כניסה לחשבון" : "הרשמה"}
          </h2>
          <RoyalDivider width={120} />
        </div>

        <div style={{ display: "flex", marginBottom: 28, border: `1px solid ${C.border}`, borderRadius: 2, overflow: "hidden" }}>
          {[["login","כניסה"],["register","הרשמה"]].map(([k, v]) => (
            <button key={k} onClick={() => { setMode(k); setError(""); }} style={{
              flex: 1,
              background: mode === k ? C.goldDark : "transparent",
              border: "none",
              color: mode === k ? C.goldBright : C.muted,
              padding: "10px 0", cursor: "pointer",
              fontFamily: F.heading, fontSize: 11,
              letterSpacing: 2, transition: "all 0.2s",
              textTransform: "uppercase"
            }}>{v}</button>
          ))}
        </div>

        {mode === "register" && <RoyalInput label="שם מלא" value={name} onChange={setName} />}
        <RoyalInput label="אימייל" value={email} onChange={setEmail} type="email" />
        <RoyalInput label="סיסמה" value={pass} onChange={setPass} type="password" />

        {error && <div style={{ color: "#c05050", fontSize: 12, marginBottom: 16, textAlign: "center", fontFamily: F.body }}>{error}</div>}

        <GoldButton style={{ width: "100%", textAlign: "center", marginTop: 8 }} onClick={handleSubmit}>
          {mode === "login" ? "כניסה" : "יצירת חשבון"}
        </GoldButton>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: F.body }}>
            {mode === "login" ? "אין לך חשבון? " : "כבר רשום? "}
          </span>
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{
            background: "none", border: "none", color: C.goldDim,
            cursor: "pointer", fontSize: 12, fontFamily: F.heading,
            letterSpacing: 1, textDecoration: "underline"
          }}>{mode === "login" ? "הרשמה" : "כניסה"}</button>
        </div>
      </div>
    </div>
  );
}

// ===== CHECKOUT PAGE =====

function CheckoutPage({ course, onNav }) {
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!course) return (
    <div style={{ padding: 60, textAlign: "center", direction: "rtl" }}>
      <p style={{ color: C.muted, marginBottom: 24, fontFamily: F.body }}>לא נבחר קורס</p>
      <GoldButton onClick={() => onNav("courses")}>לקורסים</GoldButton>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 24, color: C.goldBright, textShadow: `0 0 60px ${C.goldDark}` }}>✦</div>
        <h2 style={{ color: C.goldBright, margin: "0 0 12px", fontFamily: F.royal, fontSize: 28 }}>
          התשלום התקבל
        </h2>
        <RoyalDivider width={140} />
        <p style={{ color: C.goldDim, fontSize: 15, margin: "20px 0 8px", fontFamily: F.body }}>
          הקורס <strong>"{course.title}"</strong> מחכה לך
        </p>
        <p style={{ color: C.muted, fontSize: 12, fontFamily: F.body }}>קישור גישה נשלח לאימייל</p>
        <GoldButton style={{ marginTop: 36 }} onClick={() => onNav("courses")}>לקורסים שלי →</GoldButton>
      </div>
    </div>
  );

  function handlePay() {
    if (!email) { setError("יש להזין אימייל"); return; }
    if (card.length !== 16) { setError("מספר כרטיס לא תקין"); return; }
    if (cvv.length < 3) { setError("CVV לא תקין"); return; }
    if (!expiry) { setError("יש להזין תוקף"); return; }
    setError(""); setDone(true);
  }

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 24px", direction: "rtl" }}>
      <div style={{
        width: "100%", maxWidth: 880,
        display: "grid",
        gridTemplateColumns: "minmax(240px, 340px) 1fr",
        gap: 24,
      }}>

        {/* Order summary */}
        <div style={{
          background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.border}`,
          borderTop: `3px solid ${course.color}`,
          borderRadius: 2,
          padding: "32px 28px",
          alignSelf: "start",
          position: "sticky", top: 76,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 5, color: C.muted, marginBottom: 20, fontFamily: F.heading, textTransform: "uppercase" }}>
            סיכום הזמנה
          </div>
          {course.tag && (
            <div style={{
              display: "inline-block", marginBottom: 12,
              background: C.goldDark, border: `1px solid ${C.gold}`,
              color: C.goldBright, fontSize: 9, letterSpacing: 3,
              padding: "4px 12px", fontFamily: F.heading, textTransform: "uppercase"
            }}>{course.tag}</div>
          )}
          <h3 style={{ color: C.goldBright, margin: "0 0 8px", fontSize: 20, fontFamily: F.royal }}>{course.title}</h3>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 24, fontFamily: F.body }}>
            {course.lessons} שיעורים · {course.level}
          </div>
          <div style={{
            borderTop: `1px solid ${C.border}`, paddingTop: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20
          }}>
            <span style={{ color: C.muted, fontSize: 13, fontFamily: F.body }}>סה״כ לתשלום</span>
            <span style={{ fontSize: 26, color: C.goldBright, fontWeight: 900, fontFamily: F.heading }}>₪{course.price}</span>
          </div>
          <div style={{ fontSize: 13, color: C.goldDim, lineHeight: 2.2, fontFamily: F.body }}>
            ✓ גישה מיידית<br />
            ✓ צפייה ללא הגבלה<br />
            ✓ עדכונים לנצח<br />
            ✓ תמיכה ישירה
          </div>
        </div>

        {/* Payment form */}
        <div style={{
          background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.borderGold}`,
          borderRadius: 2,
          padding: "36px 32px",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 5, color: C.muted, marginBottom: 28, fontFamily: F.heading, textTransform: "uppercase" }}>
            פרטי תשלום
          </div>

          <RoyalInput label="אימייל" value={email} onChange={setEmail} type="email" placeholder="your@email.com" />

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase" }}>מספר כרטיס</div>
            <input
              value={card.replace(/(.{4})/g, "$1 ").trim()}
              onChange={e => setCard(e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="1234 5678 9012 3456"
              style={{
                width: "100%", background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.goldBright, padding: "12px 16px", fontSize: 15,
                fontFamily: F.mono, borderRadius: 2,
                outline: "none", boxSizing: "border-box", direction: "ltr",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase" }}>תוקף</div>
              <input
                value={expiry}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                  setExpiry(v);
                }}
                placeholder="MM/YY"
                style={{
                  width: "100%", background: C.bg,
                  border: `1px solid ${C.border}`,
                  color: C.goldBright, padding: "12px 16px", fontSize: 14,
                  fontFamily: F.mono, borderRadius: 2,
                  outline: "none", boxSizing: "border-box", direction: "ltr",
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase" }}>CVV</div>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="123"
                type="password"
                style={{
                  width: "100%", background: C.bg,
                  border: `1px solid ${C.border}`,
                  color: C.goldBright, padding: "12px 16px", fontSize: 14,
                  fontFamily: F.mono, borderRadius: 2,
                  outline: "none", boxSizing: "border-box", direction: "ltr",
                }}
              />
            </div>
          </div>

          {error && <div style={{ color: "#c05050", fontSize: 12, margin: "8px 0 16px", textAlign: "center", fontFamily: F.body }}>{error}</div>}

          <GoldButton
            style={{ width: "100%", textAlign: "center", fontSize: 15, padding: "16px", marginTop: 8 }}
            onClick={handlePay}
          >
            לתשלום &nbsp;·&nbsp; ₪{course.price}
          </GoldButton>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: C.muted, fontFamily: F.heading, letterSpacing: 2 }}>
            🔒 תשלום מאובטח · SSL · 256-bit
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== BLOG PAGE =====

const WP_API = "https://sod1820.co.il/wp-json/wp/v2/posts";
const PER_PAGE = 10;

const toSlug = name => name.trim().replace(/\s+/g, '-');
const fromSlug = slug => decodeURIComponent(slug).replace(/-/g, ' ');

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => { try { return String.fromCodePoint(parseInt(code, 10)); } catch { return ""; } })
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateHe(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateWP(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
}

function WPArticleCard({ post, onPost }) {
  const [hov, setHov] = useState(false);
  const title  = stripHtml(post.title?.rendered ?? "");
  const terms  = (post._embedded?.["wp:term"] ?? []).flat();
  const cats   = terms.filter(t => t.taxonomy === "category");
  const tags   = terms.filter(t => t.taxonomy === "post_tag").slice(0, 5);
  const date   = formatDateWP(post.date);
  const author = post.author || "מערכת כי לה' המלוכה";
  const excerpt = stripHtml(post.excerpt?.rendered ?? "").slice(0, 320);

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: 20,
        background: hov ? C.surface2 : C.surface,
        border: `1px solid ${hov ? C.borderGold : C.border}`,
        borderTop: `2px solid ${hov ? C.goldBright : C.gold}`,
        borderRadius: 2,
        padding: "20px 24px 22px",
        cursor: "pointer",
        transition: "all 0.25s",
        boxShadow: hov ? `0 6px 32px ${C.goldDeep}` : "none",
        direction: "rtl",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onPost}
    >
      {/* categories line */}
      {cats.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span style={{ color: C.goldDim, fontSize: 12, marginLeft: 4 }}>📁</span>
          {cats.map((cat, i) => (
            <span key={cat.id}>
              <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 11, letterSpacing: 0.5 }}>
                {cat.name}
              </span>
              {i < cats.length - 1 && <span style={{ color: C.border, margin: "0 3px" }}>,</span>}
            </span>
          ))}
        </div>
      )}

      {/* title */}
      <h2 style={{
        color: hov ? C.goldBright : "#ede4d3",
        fontFamily: F.royal, fontWeight: 700,
        fontSize: "clamp(15px, 2vw, 19px)",
        lineHeight: 1.5, margin: "0 0 12px",
        transition: "color 0.2s",
      }}>{title}</h2>

      {/* meta row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "4px 10px",
        alignItems: "center", marginBottom: excerpt ? 14 : 0,
        paddingBottom: excerpt ? 12 : 0,
        borderBottom: excerpt ? `1px solid ${C.border}` : "none",
        fontSize: 10.5, color: C.muted, fontFamily: F.heading,
      }}>
        <span>מאת {author}</span>
        <span style={{ color: C.border }}>|</span>
        <span style={{ direction: "ltr", display: "inline-block" }}>{date}</span>
        {tags.length > 0 && (
          <>
            <span style={{ color: C.border }}>|</span>
            {tags.map(tag => (
              <span key={tag.id} style={{ color: C.goldDim }}>#{tag.name}</span>
            ))}
          </>
        )}
      </div>

      {/* excerpt */}
      {excerpt && (
        <p style={{
          color: "#c8bfb0", fontSize: 14.5, lineHeight: 1.9,
          fontFamily: F.body, margin: 0,
        }}>
          {excerpt}{excerpt.length >= 320 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

function PostSkeleton() {
  const bar = (w, h = 10, mt = 0) => (
    <div style={{
      height: h, width: w, background: C.faint,
      borderRadius: 1, marginTop: mt,
    }} />
  );
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%",
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${C.borderGold}`,
      borderRadius: 2, overflow: "hidden",
    }}>
      <div style={{ height: 196, background: C.faint }} />
      <div style={{ padding: "24px 24px 28px" }}>
        {bar("28%", 8)}
        {bar("88%", 14, 14)}
        {bar("65%", 14, 8)}
        {bar("95%", 10, 20)}
        {bar("80%", 10, 8)}
        {bar("70%", 10, 8)}
        {bar("22%", 10, 20)}
      </div>
    </div>
  );
}

function PostCard({ post, onPost }) {
  const [hov, setHov] = useState(false);

  const image   = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const title   = stripHtml(post.title?.rendered ?? "");
  const excerpt = stripHtml(post.excerpt?.rendered ?? "").slice(0, 180);
  const date    = formatDateHe(post.date);
  const terms   = (post._embedded?.["wp:term"] ?? []).flat();
  const cats    = terms.filter(t => t.taxonomy === "category").slice(0, 2);
  const tags    = terms.filter(t => t.taxonomy === "post_tag").slice(0, 3);

  return (
    <div
      onClick={onPost}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column",
        height: "100%",
        background: hov ? C.surface2 : C.surface,
        border: `1px solid ${hov ? C.gold : C.border}`,
        borderTop: `2px solid ${hov ? C.goldBright : C.borderGold}`,
        borderRadius: 2, overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s",
        boxShadow: hov ? `0 8px 40px ${C.goldDeep}` : "none",
      }}
    >
      {/* featured image */}
      <div style={{
        height: 196, position: "relative", overflow: "hidden", flexShrink: 0,
        background: image ? "transparent" : `linear-gradient(135deg, ${C.goldDeep} 0%, ${C.faint} 100%)`,
      }}>
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: "brightness(0.72) sepia(0.25)",
              transition: "transform 0.45s",
              transform: hov ? "scale(1.05)" : "scale(1)",
              display: "block",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 52, color: C.borderGold, fontFamily: F.body,
          }}>✦</div>
        )}
        {/* fade to card bg */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
          background: `linear-gradient(to top, ${hov ? C.surface2 : C.surface}, transparent)`,
          transition: "background 0.3s",
        }} />
      </div>

      {/* content */}
      <div style={{ padding: "22px 24px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          color: hov ? C.goldBright : C.goldLight,
          margin: "0 0 12px", fontSize: 17,
          fontFamily: F.royal, fontWeight: 700,
          lineHeight: 1.45,
          transition: "color 0.25s",
        }}>{title}</h3>

        <p style={{
          color: "#ede4d3", fontSize: 16, lineHeight: 1.95,
          margin: "0 0 18px", flex: 1, fontFamily: F.body,
        }}>
          {excerpt}{excerpt.length >= 180 ? "…" : ""}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RoyalDivider width={28} />
          <span style={{
            fontSize: 10, color: hov ? C.goldBright : C.goldDim,
            fontFamily: F.heading, letterSpacing: 3,
            textTransform: "uppercase", transition: "color 0.25s",
          }}>קרא עוד</span>
        </div>
      </div>

      {/* meta row */}
      <div style={{
        padding: "9px 20px 13px",
        borderTop: `1px solid ${C.faint}`,
        display: "flex", flexWrap: "wrap",
        alignItems: "center", gap: 5,
        background: hov ? C.surface2 : C.surface,
        transition: "background 0.3s",
      }}>
        <span style={{
          fontSize: 9, color: C.muted, fontFamily: F.heading,
          letterSpacing: 0, marginLeft: 6, whiteSpace: "nowrap",
        }}>{date}</span>

        {cats.map(cat => (
          <span key={cat.id} style={{
            background: C.goldDark,
            border: `1px solid ${C.borderGold}`,
            color: C.goldBright,
            fontSize: 8, padding: "2px 8px",
            fontFamily: F.heading, letterSpacing: 1,
            textTransform: "uppercase", borderRadius: 1,
          }}>{cat.name}</span>
        ))}

        {tags.map(tag => (
          <span key={tag.id} style={{
            background: C.faint,
            border: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 8, padding: "2px 8px",
            fontFamily: F.heading, letterSpacing: 1,
            textTransform: "uppercase", borderRadius: 1,
          }}>{tag.name}</span>
        ))}
      </div>
    </div>
  );
}

function BlogPage({ onNav, pageContent, adminMode, filterCategory = null, filterTag = null }) {
  // paginated posts
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = { current: null };

  // gematria
  const [gemInput, setGemInput] = useState("");
  const [gemValue, setGemValue] = useState(null);
  const [gemWords, setGemWords] = useState([]);
  const [gemResults, setGemResults] = useState(null);
  const [gemLoading, setGemLoading] = useState(false);
  const gemTimer = { current: null };

  // filters
  const [filterCat, setFilterCat] = useState(null);
  const [filterTagL, setFilterTagL] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [allCats, setAllCats] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const { title, description, bodyHtml, category } = pageContent || {};
  const showPanel = !filterCategory && !filterTag;

  // active search mode: "text" | "gem" | null
  const activeMode = searchResults !== null ? "text" : gemResults !== null ? "gem" : null;
  const activeCat  = filterCategory || filterCat;
  const activeTag  = filterTag || filterTagL;

  useEffect(() => {
    setLoading(true); setError(""); setCurrentPage(1);
    setSearchQuery(""); setSearchResults(null);
    setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]);
    setFilterCat(null); setFilterTagL(null); setFilterYear(null);
  }, [filterCategory, filterTag]);

  // load categories + tags for dropdowns once
  useEffect(() => {
    if (!showPanel) return;
    getDistinctCategoriesAndTags().then(({ categories, tags }) => {
      setAllCats(categories); setAllTags(tags);
    }).catch(() => {});
  }, [showPanel]);

  // paginated posts (when no search active)
  useEffect(() => {
    if (activeMode) return;
    setLoading(true); setError("");
    getPostsFromSupabase({ limit: PER_PAGE, page: currentPage, category: activeCat, tag: activeTag, year: filterYear })
      .then(({ posts: rows, total }) => {
        setPosts(rows.map(adaptPost));
        setTotalPages(Math.ceil(total / PER_PAGE) || 1);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [currentPage, activeCat, activeTag, filterYear, activeMode]);

  // reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterCat, filterTagL, filterYear]);

  function goTo(p) { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }

  // text search with debounce
  function handleSearch(q) {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      searchPosts(q, { category: activeCat, tag: activeTag, year: filterYear })
        .then(rows => { setSearchResults(rows.map(adaptPost)); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 350);
  }

  // gematria input handler
  function handleGemInput(val) {
    setGemInput(val);
    setGemResults(null); setGemValue(null); setGemWords([]);
    clearTimeout(gemTimer.current);
    if (!val.trim()) return;
    gemTimer.current = setTimeout(async () => {
      setGemLoading(true);
      const isNum = /^\d+$/.test(val.trim());
      const num = isNum ? parseInt(val.trim()) : calcGem(val.trim());
      setGemValue(num);
      try {
        const [posts, words] = await Promise.all([
          searchPosts(String(num), { category: activeCat, tag: activeTag, year: filterYear }),
          getGematriaByValue(num),
        ]);
        setGemResults(posts.map(adaptPost));
        setGemWords(words);
      } catch {}
      setGemLoading(false);
    }, 400);
  }

  function clearAll() {
    setSearchQuery(""); setSearchResults(null);
    setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]);
    setFilterCat(null); setFilterTagL(null); setFilterYear(null);
    setCurrentPage(1);
  }

  const hasAnyFilter = searchQuery || gemInput || filterCat || filterTagL || filterYear;
  const displayPosts = activeMode === "text" ? searchResults : activeMode === "gem" ? gemResults : posts;
  const isSearching  = searchLoading || gemLoading;
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  function goTo(p) {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const inputStyle = {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#ede4d3", fontFamily: F.body, fontSize: 15,
    padding: "12px 0", direction: "rtl",
  };
  const selectStyle = {
    background: C.surface2, border: `1px solid ${C.border}`,
    color: C.muted, fontFamily: F.heading, fontSize: 12,
    padding: "8px 12px", borderRadius: 3, cursor: "pointer",
    outline: "none", flex: 1,
  };

  const isFilteredView = !!(filterCategory || filterTag);

  return (
    <div style={{ padding: "64px 16px", maxWidth: 1200, margin: "0 auto", direction: "rtl" }}>

      {/* ── CATEGORY/TAG HEADER (WordPress style) ── */}
      {isFilteredView ? (
        <header style={{ marginBottom: 36, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.goldDim, fontFamily: F.heading, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            {filterCategory ? "קטגוריה" : "תגית"}
          </div>
          <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontWeight: 700, fontSize: "clamp(22px, 4vw, 36px)", margin: "0 0 12px", lineHeight: 1.3 }}>
            {filterCategory || filterTag}
          </h1>
          {filterCategory === "תיעוד אירועים" && (
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, margin: 0, lineHeight: 1.8 }}>
              תיעוד אירועים ורמזים – בנושאי אחרית הימים וגאולת ישראל
            </p>
          )}
        </header>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
            <SectionHeader
              eyebrow={category || "פוסטים"}
              title={title || "תובנות ותגליות"}
            />
            {adminMode && (
              <button onClick={() => onNav("admin", "blog")} style={{
                background: C.bgGlow, border: `1px solid ${C.gold}`,
                color: C.goldLight, padding: "10px 16px", borderRadius: 4,
                cursor: "pointer", fontFamily: F.heading, fontSize: 12,
                letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap",
              }}>ערוך דף</button>
            )}
          </div>
          {description && (
            <p style={{ color: C.goldDim, fontSize: 15, lineHeight: 2, marginBottom: 32, fontFamily: F.body, textAlign: "center" }}>
              {description}
            </p>
          )}
          <PageBody bodyHtml={bodyHtml} />
        </>
      )}

      {/* ── SEARCH PANEL ── */}
      {showPanel && (
        <div style={{
          maxWidth: 700, margin: "0 auto 40px",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 6, overflow: "hidden",
        }}>
          {/* 1. חיפוש טקסט */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
              <span style={{ color: C.goldDim, fontSize: 15, marginLeft: 10 }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => { setGemInput(""); setGemResults(null); handleSearch(e.target.value); }}
                placeholder="חיפוש בכותרת ובתוכן הפוסט..."
                style={inputStyle}
              />
              {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"0 4px" }}>×</button>}
            </div>
          </div>

          {/* 2. גימטריה */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
              <span style={{ color: "#b39ddb", fontSize: 13, marginLeft: 10, whiteSpace: "nowrap" }}>✡ גימטריה</span>
              <input
                value={gemInput}
                onChange={e => { setSearchQuery(""); setSearchResults(null); handleGemInput(e.target.value); }}
                placeholder="הכנס מילה או מספר — למשל: משיח או 358"
                style={{ ...inputStyle, fontSize: 14 }}
              />
              {gemInput && <button onClick={() => { setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"0 4px" }}>×</button>}
            </div>
            {gemValue !== null && (
              <div style={{ padding: "6px 16px 10px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#c4b5fd", fontFamily: F.heading }}>
                  = <strong style={{ fontSize: 16 }}>{gemValue}</strong>
                </span>
                {gemWords.length > 0 && (
                  <span style={{ fontSize: 11, color: C.muted }}>
                    · מילים זהות: {gemWords.map(w => w.phrase).join(" · ")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. פילטרים */}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterCat || ""} onChange={e => { setFilterCat(e.target.value || null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">📂 כל הקטגוריות</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={filterTagL || ""} onChange={e => { setFilterTagL(e.target.value || null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">🏷 כל התגיות</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={filterYear || ""} onChange={e => { setFilterYear(e.target.value ? parseInt(e.target.value) : null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">📅 כל התקופות</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {hasAnyFilter && (
              <button onClick={clearAll} style={{
                background: "none", border: `1px solid ${C.crimson}`,
                color: C.crimsonLight, borderRadius: 3, padding: "7px 14px",
                cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 1,
              }}>נקה הכל ×</button>
            )}
          </div>

          {/* status */}
          {(isSearching || activeMode) && (
            <div style={{ padding: "6px 16px 10px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
              {isSearching ? "מחפש..." : activeMode === "text" ? `${searchResults?.length ?? 0} תוצאות עבור "${searchQuery}"` : activeMode === "gem" ? `${gemResults?.length ?? 0} פוסטים עם המספר ${gemValue}` : ""}
            </div>
          )}
        </div>
      )}

      <style>{`
        .blog-two-col { display: flex; gap: 24px; align-items: flex-start; }
        .blog-main { flex: 1 1 0; min-width: 0; }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .wp-masonry { columns: 2 360px; column-gap: 24px; }
        @media (max-width: 900px) {
          .blog-two-col { flex-direction: column-reverse; }
          .blog-events-sidebar { width: 100% !important; position: static !important; }
        }
        @media (max-width: 700px) {
          .wp-masonry { columns: 1; }
        }
        @media (max-width: 600px) {
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="blog-two-col">
        {/* sidebar — first child = right side in RTL */}
        {showPanel && !activeMode && (
          <div className="blog-events-sidebar">
            <EventsSidebar onNav={onNav} />
          </div>
        )}

        {/* main content */}
        <div className="blog-main">
          {error && (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.borderGold}`,
              borderRadius: 2, padding: "36px",
              textAlign: "center", marginBottom: 40,
            }}>
              <div style={{ fontSize: 32, color: C.goldDim, marginBottom: 16 }}>✦</div>
              <p style={{ color: "#b05050", fontSize: 14, fontFamily: F.body, marginBottom: 20 }}>
                לא ניתן לטעון פוסטים: {error}
              </p>
              <GoldButton variant="secondary" onClick={() => setCurrentPage(p => p)}>
                נסה שוב
              </GoldButton>
            </div>
          )}

          {/* WordPress-style masonry for category/tag pages */}
          {isFilteredView ? (
            <div className="wp-masonry">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
                : displayPosts.map(post => (
                    <WPArticleCard key={post.id} post={post} onPost={() => onNav("post", post)} />
                  ))
              }
            </div>
          ) : (
            <div className="blog-grid">
              {isSearching
                ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                : activeMode
                  ? displayPosts.map(post => <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />)
                  : loading
                    ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
                    : displayPosts.map(post => <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />)
              }
            </div>
          )}

          {!isSearching && !activeMode && !loading && !error && displayPosts.length === 0 && (
            <div style={{ textAlign: "center", padding: "72px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
              אין פוסטים להצגה
            </div>
          )}
          {!isSearching && activeMode && displayPosts.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
              לא נמצאו תוצאות
            </div>
          )}

          {!loading && !error && !searchResults && totalPages > 1 && (
            <div style={{
              display: "flex", gap: 8, justifyContent: "center",
              marginTop: 56, flexWrap: "wrap", alignItems: "center",
            }}>
              <GoldButton
                variant="secondary"
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}
              >← הקודם</GoldButton>

              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => goTo(p)} style={{
                  background: p === currentPage ? C.goldDark : "transparent",
                  border: `1px solid ${p === currentPage ? C.gold : C.border}`,
                  color: p === currentPage ? C.goldBright : C.muted,
                  width: 38, height: 38, cursor: "pointer",
                  fontFamily: F.heading, fontSize: 12,
                  borderRadius: 2, transition: "all 0.2s",
                }}>{p}</button>
              ))}

              <GoldButton
                variant="secondary"
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}
              >הבא →</GoldButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== EVENTS SIDEBAR =====
function EventsSidebar({ onNav }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPostsFromSupabase({ limit: 10, page: 1, category: "תיעוד אירועים" })
      .then(({ posts }) => { setEvents(posts); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{
      width: 270, flexShrink: 0,
      background: "linear-gradient(180deg, rgba(122,19,32,0.14), rgba(122,19,32,0.06))",
      border: "1px solid rgba(160,31,46,0.30)",
      borderRadius: 6, overflow: "hidden",
      position: "sticky", top: 80, alignSelf: "flex-start",
    }}>
      {/* header */}
      <div style={{
        padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(160,31,46,0.22)",
        background: "rgba(122,19,32,0.18)",
      }}>
        <span style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 700 }}>
          📋 תיעוד אירועים
        </span>
        <span style={{
          background: C.crimson, color: "#f6e27a",
          fontSize: 9, padding: "2px 7px", borderRadius: 10,
          fontFamily: F.heading, letterSpacing: 1, fontWeight: 700,
        }}>חי</span>
      </div>

      {/* event list */}
      <div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "11px 16px", borderBottom: "1px solid rgba(160,31,46,0.12)" }}>
                <div style={{ height: 9, background: C.surface2, borderRadius: 2, marginBottom: 6, width: "50%" }} />
                <div style={{ height: 11, background: C.surface2, borderRadius: 2, width: "85%" }} />
              </div>
            ))
          : events.map(post => {
              const d = post.date ? new Date(post.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              return (
                <div
                  key={post.wp_id}
                  onClick={() => onNav("post", adaptPost(post))}
                  style={{ padding: "11px 16px", borderBottom: "1px solid rgba(160,31,46,0.12)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(122,19,32,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontSize: 9, color: "#c87070", fontFamily: F.heading, letterSpacing: 1, marginBottom: 3 }}>{d}</div>
                  <div style={{ fontSize: 13, color: "#ede4d3", fontFamily: F.body, lineHeight: 1.45 }}>{post.title}</div>
                </div>
              );
            })
        }
      </div>

      {/* footer */}
      <div
        onClick={() => navigate('/category/' + toSlug('תיעוד אירועים'))}
        style={{
          padding: "11px 16px", textAlign: "center", cursor: "pointer",
          color: "#c87070", fontFamily: F.heading, fontSize: 11, letterSpacing: 2,
          borderTop: "1px solid rgba(160,31,46,0.22)", transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.goldBright}
        onMouseLeave={e => e.currentTarget.style.color = "#c87070"}
      >
        ← כל תיעוד האירועים
      </div>
    </div>
  );
}

// ===== GLOBAL STYLES =====
const GLOBAL_CSS = `
  .sod-inflate {
    display: inline-block;
    transition: transform 0.16s ease, text-shadow 0.18s ease;
    cursor: pointer;
  }
  .sod-inflate:hover {
    transform: scale(1.09);
    text-shadow: 0 0 10px currentColor;
  }
  .sod-inflate:active {
    transform: scale(0.95);
    opacity: 0.8;
  }
  @keyframes light-rays {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes hero-shimmer {
    0%, 100% { opacity: 0.88; }
    50%       { opacity: 1; filter: drop-shadow(0 0 18px rgba(246,226,122,0.35)); }
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;

// ===== POST PAGE =====

const POST_CONTENT_CSS = `
  .sod-post-content { direction: rtl; color: #ede4d3; overflow-x: hidden; font-family: 'Heebo', sans-serif; text-align: center; }
  .sod-post-content h1, .sod-post-content h2, .sod-post-content h3,
  .sod-post-content h4, .sod-post-content h5 {
    font-family: 'Heebo', sans-serif;
    font-weight: 700;
    line-height: 1.3;
    margin: 2.4em 0 0.9em;
    letter-spacing: 0;
    text-align: center;
  }
  .sod-post-content h1 {
    color: ${C.goldBright};
    font-size: clamp(18px, 2.6vw, 27px);
    text-shadow: 0 0 40px ${C.goldDeep};
  }
  .sod-post-content h2 {
    color: ${C.goldLight};
    font-size: clamp(14px, 2.1vw, 22px);
  }
  .sod-post-content h3 {
    color: ${C.gold};
    font-size: clamp(12px, 1.7vw, 17px);
  }
  .sod-post-content p {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 15.5px;
    line-height: 2.1;
    margin: 0 0 1.4em;
  }
  .sod-post-content a {
    color: ${C.gold} !important;
    text-decoration: underline !important;
    text-underline-offset: 3px;
    display: inline-block;
    transition: color 0.18s, transform 0.16s ease, text-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .sod-post-content a:hover,
  .sod-post-content a:focus {
    color: ${C.goldBright} !important;
    transform: scale(1.07);
    text-shadow: 0 0 12px ${C.gold};
  }
  .sod-post-content a:active {
    color: #fff !important;
    transform: scale(0.95);
    opacity: 0.85;
  }
  .sod-post-content a:visited { color: ${C.goldLight} !important; }
  .sod-post-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 2em auto;
    border-radius: 2px;
    border: 1px solid ${C.border};
    filter: brightness(0.85) sepia(0.15);
  }
  .sod-post-content ul, .sod-post-content ol {
    padding-right: 1.6em;
    margin: 0 0 1.4em;
  }
  .sod-post-content li {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 15px;
    line-height: 2;
    margin-bottom: 0.4em;
  }
  .sod-post-content blockquote {
    border-right: 3px solid ${C.gold};
    margin: 2em 0;
    padding: 16px 24px;
    background: ${C.surface};
    border-radius: 0 2px 2px 0;
  }
  .sod-post-content blockquote p {
    color: ${C.goldLight};
    font-style: italic;
    margin: 0;
  }
  .sod-post-content code {
    background: ${C.faint};
    color: ${C.goldLight};
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }
  .sod-post-content pre {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 2px;
    padding: 20px;
    overflow-x: auto;
    margin: 1.6em 0;
  }
  .sod-post-content pre code { background: none; padding: 0; }
  .sod-post-content hr {
    border: none;
    border-top: 1px solid ${C.border};
    margin: 2.5em 0;
  }
  .sod-post-content strong { color: ${C.goldLight}; font-weight: 700; }
  .sod-post-content em { font-style: italic; color: ${C.gold}; }
  .sod-post-content figure { margin: 2em 0; }
  .sod-post-content figcaption {
    text-align: center;
    font-size: 11px;
    color: ${C.muted};
    font-family: 'Heebo', sans-serif;
    margin-top: 8px;
    letter-spacing: 1px;
  }
  .sod-post-content .wp-block-quote { border-right: 3px solid ${C.gold}; }

  /* ── iframes & embeds ── */
  .sod-post-content iframe {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
    margin: 1.5em auto !important;
    border: none;
    direction: ltr;
  }
  /* WordPress block embed wrapper (padding-bottom trick) */
  .sod-post-content .wp-block-embed,
  .sod-post-content figure.wp-block-embed {
    max-width: 100%;
    margin: 2em auto;
    direction: ltr;
  }
  .sod-post-content .wp-block-embed__wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
  }
  .sod-post-content .wp-block-embed__wrapper iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100% !important;
    height: 100% !important;
    aspect-ratio: unset;
    margin: 0 !important;
  }
  /* YouTube span wrapper (old WP embed format) */
  .sod-post-content .embed-youtube,
  .sod-post-content span.embed-youtube {
    display: block !important;
    max-width: 100% !important;
    margin: 1.5em auto !important;
    text-align: center;
  }
  .sod-post-content .embed-youtube iframe {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
  }
  /* WordPress video shortcode container */
  .sod-post-content .wp-video {
    width: auto !important;
    max-width: min(100%, 360px) !important;
    margin: 1.5em auto !important;
    display: block !important;
  }

  /* ── author attribution ── */
  .sod-post-content .post-author {
    display: block;
    text-align: right;
    color: #c9a535;
    font-style: italic;
    font-family: 'Heebo', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    margin: 6px 0;
    opacity: 0.92;
  }

  /* ── collapse Elementor spacers & excess whitespace ── */
  .sod-post-content div[style*="height"] { height: auto !important; max-height: 24px !important; }
  .sod-post-content div[style*="min-height"] { min-height: 0 !important; }
  .sod-post-content .elementor-spacer,
  .sod-post-content .elementor-spacer-inner { height: 16px !important; }

  /* ── override dark inline colors from WordPress/Elementor ── */
  .sod-post-content [style*="color:#000"],
  .sod-post-content [style*="color: #000"],
  .sod-post-content [style*="color:black"],
  .sod-post-content [style*="color: black"],
  .sod-post-content [style*="color:#111"],
  .sod-post-content [style*="color:#222"],
  .sod-post-content [style*="color:#333"] {
    color: #ede4d3 !important;
  }
  .sod-post-content [style*="color:#0000ff"],
  .sod-post-content [style*="color: #0000ff"],
  .sod-post-content [style*="color:blue"],
  .sod-post-content [style*="color: blue"] {
    color: ${C.goldBright} !important;
  }

  /* ── videos (mp4 / shortcode / reels) ── */
  .sod-post-content video {
    max-width: min(100%, 360px) !important;
    width: auto !important;
    height: auto !important;
    display: block !important;
    margin: 1.5em auto !important;
  }
  .sod-post-content table {
    width: 100%; border-collapse: collapse; margin: 1.6em 0;
  }
  .sod-post-content th {
    background: ${C.goldDark}; color: ${C.goldBright};
    font-family: 'Heebo', sans-serif; font-size: 12px;
    padding: 10px 14px; text-align: right;
    border: 1px solid ${C.borderGold};
  }
  .sod-post-content td {
    color: ${C.goldDim}; padding: 9px 14px;
    border: 1px solid ${C.border};
    font-family: 'Heebo', sans-serif; font-size: 14px;
  }
  .sod-post-content tr:nth-child(even) td { background: ${C.surface}; }
`;

function PostPage({ post, onBack }) {
  const [fullPost, setFullPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!post?.slug) return;
    setLoading(true);
    setError("");
    getPostBySlug(post.slug)
      .then(row => {
        if (row) setFullPost(row);
        else setError("הפוסט לא נמצא");
        setLoading(false);
      })
      .catch(() => { setError("שגיאה בטעינה"); setLoading(false); });
  }, [post?.slug]);

  const image   = fullPost?.image_url ?? post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const author  = fullPost?.author ?? "";
  const title   = stripHtml(fullPost?.title ?? post?.title?.rendered ?? "");
  const date    = formatDateHe(fullPost?.date ?? post?.date ?? "");
  const content = fullPost?.content ?? "";

  return (
    <div style={{ direction: "rtl" }}>
      {/* hero image */}
      {image && !loading && (
        <div style={{
          height: "clamp(220px, 40vw, 480px)",
          position: "relative", overflow: "hidden",
          background: C.goldDeep,
        }}>
          <img src={image} alt={title} style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "brightness(0.5) sepia(0.3)", display: "block",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom, rgba(5,4,0,0.1) 30%, ${C.bg} 100%)`,
          }} />
        </div>
      )}

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "52px 24px 96px" }}>
        <button
          onClick={onBack}
          onMouseEnter={e => (e.currentTarget.style.color = C.goldDim)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          style={{
            background: "none", border: "none", color: C.muted,
            cursor: "pointer", fontFamily: F.heading,
            fontSize: 10, marginBottom: 40, letterSpacing: 4,
            textTransform: "uppercase", transition: "color 0.2s",
          }}
        >← חזרה לפוסטים</button>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 42, color: C.goldDim, marginBottom: 20 }}>✦</div>
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 2 }}>
              טוען פוסט...
            </p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#b05050", fontFamily: F.body, fontSize: 14 }}>{error}</p>
            <GoldButton variant="secondary" style={{ marginTop: 20 }} onClick={onBack}>
              חזרה לפוסטים
            </GoldButton>
          </div>
        )}

        {fullPost && !loading && (
          <>
            <div style={{
              fontSize: 9, color: C.muted, letterSpacing: 4,
              marginBottom: 18, fontFamily: F.heading, textTransform: "uppercase",
            }}>
              {date}{author && ` · ${author}`}
            </div>

            <h1 style={{
              color: C.goldBright, margin: "0 0 28px",
              fontSize: "clamp(24px, 4.5vw, 44px)",
              fontFamily: F.royal, fontWeight: 700,
              lineHeight: 1.2, letterSpacing: 1,
              textShadow: `0 0 70px ${C.goldDeep}`,
            }}>{title}</h1>

            <div style={{ marginBottom: 48 }}>
              <RoyalDivider width={160} />
            </div>

            <style>{POST_CONTENT_CSS}</style>
            <div
              className="sod-post-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ===== DYNAMIC MENU =====

const WP_MENU_BASE = "https://sod1820.co.il/wp-json";

const STATIC_NAV_ITEMS = [
  { key: "home",    label: "ראשי" },
  { key: "courses", label: "קורסים" },
  { key: "blog",    label: "פוסטים" },
  { key: "about",   label: "אודות" },
  { key: "login",   label: "כניסה" },
];

function mapUrlToRoute(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "") return "home";
    if (/course|קורס|shop|product/i.test(path)) return "courses";
    if (/about|אודות|who|me/i.test(path)) return "about";
    if (/blog|post|article|בלוג|news/i.test(path)) return "blog";
    if (/login|account|my-account/i.test(path)) return "login";
  } catch { /* invalid URL */ }
  return null;
}

async function fetchWpMenu() {
  // Try WP REST API Menus plugin (menus/v1)
  try {
    const listRes = await fetch(`${WP_MENU_BASE}/menus/v1/menus`, { signal: AbortSignal.timeout(5000) });
    if (listRes.ok) {
      const menus = await listRes.json();
      const menu = Array.isArray(menus) && menus.length > 0
        ? (menus.find(m => /primary|main|ראשי/i.test(m.slug || m.name || "")) ?? menus[0])
        : null;
      if (menu) {
        const menuId = menu.ID ?? menu.id;
        const detailRes = await fetch(`${WP_MENU_BASE}/menus/v1/menus/${menuId}`, { signal: AbortSignal.timeout(5000) });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const items = detail.items ?? [];
          return items
            .filter(it => !it.parent || it.parent === 0)
            .map(it => ({
              key:      String(it.ID ?? it.id),
              label:    stripHtml(it.title ?? ""),
              url:      it.url ?? "",
              route:    mapUrlToRoute(it.url),
            }));
        }
      }
    }
  } catch { /* plugin not installed or CORS */ }

  // Try wp/v2/menu-items (WordPress 5.9+ core)
  try {
    const res = await fetch(`${WP_MENU_BASE}/wp/v2/menu-items?per_page=20`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items
          .filter(it => !it.parent || it.parent === 0)
          .sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0))
          .map(it => ({
            key:   String(it.id),
            label: stripHtml(it.title?.rendered ?? ""),
            url:   it.url ?? "",
            route: mapUrlToRoute(it.url),
          }));
      }
    }
  } catch { /* not available */ }

  return null; // triggers fallback to STATIC_NAV_ITEMS
}

// ===== NUMBER SIDEBAR + PAGE =====

function NumberButton({ tag, onClick }) {
  const [hov, setHov] = useState(false);
  const meaning = KEY_NUMBERS[parseInt(tag.name, 10)];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: meaning ? "9px 18px" : "11px 18px",
        background: hov ? C.goldDark : (meaning ? `${C.goldDeep}88` : "none"),
        border: "none", borderBottom: `1px solid ${C.faint}`,
        cursor: "pointer", transition: "background 0.15s",
      }}
    >
      <span style={{
        fontSize: 9, color: hov ? C.goldDim : C.muted,
        fontFamily: F.heading, letterSpacing: 1,
        minWidth: 32, textAlign: "left", transition: "color 0.15s",
      }}>×{tag.count}</span>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 18, fontFamily: F.heading, fontWeight: 700,
          color: hov ? C.goldBright : (meaning ? C.goldLight : C.goldDim),
          transition: "color 0.15s", lineHeight: 1.2,
        }}>{tag.name}</div>
        {meaning && (
          <div style={{
            fontSize: 8, color: hov ? C.goldDim : C.muted,
            fontFamily: F.body, marginTop: 2, fontStyle: "italic",
            lineHeight: 1.3, maxWidth: 160,
          }}>{meaning}</div>
        )}
      </div>
    </button>
  );
}

function NumberPage({ tag, onNav, onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PER = 9;

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${WP_API}?_embed=1&per_page=${PER}&page=${currentPage}&tags=${tag.id}`)
      .then(r => {
        const tp = r.headers.get("X-WP-TotalPages");
        if (tp) setTotalPages(parseInt(tp, 10));
        if (!r.ok) throw new Error(`שגיאה ${r.status}`);
        return r.json();
      })
      .then(data => { setPosts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [tag.id, currentPage]);

  function goTo(p) { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 24px", direction: "rtl" }}>
      <button
        onClick={onBack}
        onMouseEnter={e => (e.currentTarget.style.color = C.goldDim)}
        onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", fontFamily: F.heading,
          fontSize: 10, marginBottom: 40, letterSpacing: 4,
          textTransform: "uppercase", transition: "color 0.2s",
        }}
      >← חזרה</button>

      <SectionHeader
        eyebrow={`תגית · ${tag.count} פוסטים`}
        title={`המספר ${tag.name}`}
      />

      {KEY_NUMBERS[parseInt(tag.name, 10)] && (
        <div style={{
          textAlign: "center", margin: "-28px auto 44px",
          maxWidth: 520,
          padding: "14px 24px",
          background: `linear-gradient(135deg, ${C.goldDeep}, transparent)`,
          border: `1px solid ${C.borderGold}`,
          borderRadius: 2,
        }}>
          <p style={{
            color: C.goldLight, fontFamily: F.body,
            fontSize: 15, fontStyle: "italic", margin: 0, lineHeight: 1.8,
          }}>
            {KEY_NUMBERS[parseInt(tag.name, 10)]}
          </p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#b05050", fontFamily: F.body }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.map(post => (
              <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />
            ))
        }
      </div>

      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
          אין פוסטים עם תגית זו
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 48, flexWrap: "wrap", alignItems: "center" }}>
          <GoldButton variant="secondary" disabled={currentPage === 1}
            onClick={() => goTo(currentPage - 1)}
            style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}>← הקודם</GoldButton>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => goTo(p)} style={{
              background: p === currentPage ? C.goldDark : "transparent",
              border: `1px solid ${p === currentPage ? C.gold : C.border}`,
              color: p === currentPage ? C.goldBright : C.muted,
              width: 38, height: 38, cursor: "pointer",
              fontFamily: F.heading, fontSize: 12, borderRadius: 2, transition: "all 0.2s",
            }}>{p}</button>
          ))}
          <GoldButton variant="secondary" disabled={currentPage === totalPages}
            onClick={() => goTo(currentPage + 1)}
            style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}>הבא →</GoldButton>
        </div>
      )}
    </div>
  );
}

function NumberSidebar({ onNav }) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [search, setSearch] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 760 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch("https://sod1820.co.il/wp-json/wp/v2/tags?per_page=100&hide_empty=true&orderby=count&order=desc")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setAllTags(
            data
              .filter(t => /^\d+$/.test(t.name.trim()))
              .sort((a, b) => b.count - a.count)
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = search.trim()
    ? allTags.filter(t => t.name.includes(search.trim()))
    : allTags;

  function handleSelect(tag) {
    onNav("number", tag);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      {/* toggle tab */}
      <button
        onClick={() => setOpen(o => !o)}
        title="סוד המספרים"
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 200,
          background: open ? C.goldDark : C.surface,
          border: `1px solid ${C.gold}`,
          borderRight: "none",
          borderRadius: "4px 0 0 4px",
          color: C.goldBright,
          width: 34, height: 90,
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 7,
          transition: "background 0.2s",
          boxShadow: `-4px 0 16px ${C.goldDeep}`,
          padding: 0,
        }}
      >
        <span style={{
          fontSize: 12, color: C.goldBright,
          transition: "transform 0.3s",
          transform: open ? "rotate(45deg)" : "none",
          display: "block", lineHeight: 1,
        }}>✦</span>
        <span style={{
          fontSize: 7, color: C.muted, letterSpacing: 1,
          fontFamily: F.heading, textTransform: "uppercase",
          writingMode: "vertical-rl",
        }}>מספרים</span>
      </button>

      {/* backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 198,
            background: "rgba(5,4,0,0.6)",
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* panel */}
      <div style={{
        position: "fixed",
        right: 0, top: 0, bottom: 0,
        width: isMobile ? "100vw" : 280,
        maxWidth: 280,
        zIndex: 199,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        background: C.surface,
        borderLeft: `2px solid ${C.borderGold}`,
        display: "flex", flexDirection: "column",
        direction: "rtl",
        boxShadow: open ? `-16px 0 60px ${C.goldDeep}` : "none",
      }}>

        {/* header */}
        <div style={{
          height: 60, flexShrink: 0,
          padding: "0 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 12, letterSpacing: 3 }}>
            סוד המספרים
          </div>
          <button onClick={() => setOpen(false)}
            onMouseEnter={e => (e.currentTarget.style.color = C.goldBright)}
            onMouseLeave={e => (e.currentTarget.style.color = C.goldDim)}
            style={{
              background: C.bgGlow,
              border: `1px solid ${C.gold}`,
              borderRadius: 6,
              color: C.goldBright,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              fontFamily: "monospace",
              transition: "all 0.2s",
            }}>✕</button>
        </div>

        {/* search */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value.replace(/\D/g, ""))}
            placeholder="חפש מספר..."
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={{
              width: "100%",
              background: C.bg,
              border: `1px solid ${inputFocused ? C.gold : C.border}`,
              color: C.goldBright,
              padding: "9px 14px",
              fontFamily: F.heading, fontSize: 17, fontWeight: 700,
              borderRadius: 2, outline: "none",
              boxSizing: "border-box", direction: "ltr",
              letterSpacing: 3, textAlign: "center",
              transition: "border-color 0.2s",
            }}
          />
          {search ? (
            <div style={{
              fontSize: 9, color: C.muted, letterSpacing: 2, fontFamily: F.heading,
              textAlign: "center", marginTop: 8, textTransform: "uppercase",
            }}>
              {filtered.length} תוצאות
            </div>
          ) : (
            <div style={{
              fontSize: 9, color: C.muted, letterSpacing: 2, fontFamily: F.heading,
              textAlign: "center", marginTop: 8, textTransform: "uppercase",
            }}>
              הקלד מספר לחיפוש חופשי
            </div>
          )}
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 16px",
              color: C.muted, fontFamily: F.body, fontSize: 13,
            }}>
              {allTags.length === 0 ? "טוען מספרים..." : "אין תוצאות"}
            </div>
          ) : (
            filtered.map(tag => (
              <NumberButton key={tag.id} tag={tag} onClick={() => handleSelect(tag)} />
            ))
          )}
        </div>

        {/* footer */}
        <div style={{
          padding: "11px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0,
          fontSize: 9, color: C.muted, textAlign: "center",
          fontFamily: F.heading, letterSpacing: 3, textTransform: "uppercase",
        }}>
          {allTags.length} מספרים · SOD1820
        </div>
      </div>
    </>
  );
}

// ===== THEME PREVIEW PAGE =====

const THEMES_DATA = [
  {
    id: "a", name: "תבנית א — עמוק",
    bg: "#080500", text: "#ede4d3", heading: "#CFB53B",
    accent: "#CFB53B", surface: "#0e0a00",
    font: "'Heebo', sans-serif",
  },
  {
    id: "b", name: "תבנית ב — זהב",
    bg: "#0a0800", text: "#FFD700", heading: "#FFD700",
    accent: "#FFD700", surface: "#130e00",
    font: "'Heebo', sans-serif",
  },
  {
    id: "c", name: "תבנית ג — קלאסי",
    bg: "#000000", text: "#ffffff", heading: "#e8c040",
    accent: "#e8c040", surface: "#0d0d0d",
    font: "'David Libre', serif",
  },
];

function ThemePreviewPage() {
  const [active, setActive] = useState("a");
  const T = THEMES_DATA.find(t => t.id === active);

  return (
    <div style={{ direction: "rtl", padding: "60px 24px" }}>
      <SectionHeader eyebrow="עיצוב" title="תצוגה מקדימה" />

      {/* switcher */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 44, flexWrap: "wrap" }}>
        {THEMES_DATA.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            background: active === t.id ? C.goldDark : "transparent",
            border: `2px solid ${active === t.id ? C.gold : C.border}`,
            color: active === t.id ? C.goldBright : C.muted,
            padding: "10px 28px", cursor: "pointer",
            fontFamily: F.heading, fontSize: 14, fontWeight: 700,
            borderRadius: 2, transition: "all 0.25s",
          }}>{t.name}</button>
        ))}
      </div>

      {/* preview panel */}
      <div style={{
        maxWidth: 680, margin: "0 auto",
        background: T.bg,
        border: "1px solid #3a3a2a",
        borderRadius: 4, padding: "52px 44px",
        transition: "background 0.35s",
        boxShadow: `0 0 60px rgba(0,0,0,0.8)`,
      }}>
        <h2 style={{
          color: T.heading, fontFamily: T.font,
          fontSize: 28, fontWeight: 700, margin: "0 0 14px",
          textAlign: "center", letterSpacing: 1,
        }}>כי לה' המלוכה</h2>

        <div style={{ width: 56, height: 1, background: T.accent, margin: "0 auto 28px" }} />

        <p style={{
          color: T.text, fontFamily: T.font,
          fontSize: 16, lineHeight: 2, margin: "0 0 36px", textAlign: "center",
        }}>
          גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה
          את המציאות מאחורי המציאות.
        </p>

        {/* sample card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.accent}55`,
          borderTop: `2px solid ${T.accent}`,
          borderRadius: 2, padding: "22px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
        }}>
          <div>
            <div style={{ color: T.heading, fontFamily: T.font, fontSize: 19, fontWeight: 700 }}>
              שער האלף-בית
            </div>
            <div style={{ color: T.text, fontFamily: T.font, fontSize: 13, opacity: 0.65, marginTop: 5 }}>
              גימטריה רגילה · 12 שיעורים
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.accent, fontFamily: T.font, fontSize: 26, fontWeight: 900, marginBottom: 10 }}>
              ₪297
            </div>
            <button style={{
              background: "transparent",
              border: `1px solid ${T.accent}`,
              color: T.accent, padding: "7px 20px",
              cursor: "pointer", fontFamily: T.font,
              fontSize: 12, fontWeight: 700, borderRadius: 2,
            }}>לרכישה</button>
          </div>
        </div>

        {/* color swatches */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 28 }}>
          {[["רקע", T.bg], ["טקסט", T.text], ["כותרת", T.heading]].map(([label, val]) => (
            <div key={label} style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 2, padding: "5px 12px",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <div style={{ width: 11, height: 11, background: val, borderRadius: 2, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Heebo', sans-serif", fontSize: 10, letterSpacing: 1 }}>
                {label}: {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== ADMIN PAGE =====

const ADMIN_PASSWORD  = "sod1820";
const ADMIN_STORE_KEY = "sod1820_clues";

function AdminPage({ pageContent, onSavePage, selectedPageKey, setSelectedPageKey, setAdminMode }) {
  const [authed,  setAuthed]  = useState(false);
  const [pw,      setPw]      = useState("");
  const [pwError, setPwError] = useState(false);

  const [editPageKey, setEditPageKey] = useState(selectedPageKey || "home");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [pageBodyHtml, setPageBodyHtml] = useState("");
  const [pageCategory, setPageCategory] = useState("");
  const [pageTag, setPageTag] = useState("");

  const [fTitle,    setFTitle]    = useState("");
  const [fContent,  setFContent]  = useState("");
  const [fNumbers,  setFNumbers]  = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fImage,    setFImage]    = useState(null);
  const [fImgName,  setFImgName]  = useState("");
  const [okMsg,     setOkMsg]     = useState("");
  const [syncing,   setSyncing]   = useState(false);

  const [clues, setClues] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADMIN_STORE_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const currentPage = selectedPageKey || editPageKey || "home";
    const pageData = (pageContent?.[currentPage] || PAGE_CONTENT_DEFAULTS[currentPage] || {});
    setPageTitle(pageData.title || "");
    setPageDescription(pageData.description || "");
    setPageBodyHtml(pageData.bodyHtml || "");
    setPageCategory(pageData.category || "");
    setPageTag(pageData.tag || "");
    setEditPageKey(currentPage);
  }, [selectedPageKey, editPageKey, pageContent]);

  function handleAuth() {
    if (pw.trim() === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
      setAdminMode && setAdminMode(true);
    } else setPwError(true);
  }

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFImgName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setFImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!fTitle.trim()) return;
    const clue = {
      id: Date.now(),
      title: fTitle.trim(),
      content: fContent.trim(),
      numbers: fNumbers.split(",").map(s => s.trim()).filter(Boolean),
      category: fCategory.trim(),
      image: fImage,
      imageName: fImgName,
      createdAt: new Date().toISOString(),
    };
    const updated = [clue, ...clues];
    setClues(updated);
    try { localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(updated)); } catch {}
    setFTitle(""); setFContent(""); setFNumbers(""); setFCategory(""); setFImage(null); setFImgName("");
    setOkMsg("✦ הרמז נשמר בהצלחה");
    setTimeout(() => setOkMsg(""), 3000);
  }

  function handleDelete(id) {
    const updated = clues.filter(c => c.id !== id);
    setClues(updated);
    try { localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(updated)); } catch {}
  }

  if (!authed) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`, borderRadius: 2,
        padding: "44px 40px", width: "100%", maxWidth: 360,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 20, margin: "0 0 16px" }}>
            ממשק ניהול
          </h2>
          <RoyalDivider width={100} />
        </div>
        <RoyalInput label="סיסמה" value={pw} onChange={setPw} type="password" />
        {pwError && <div style={{ color: "#c05050", fontSize: 13, marginBottom: 12, textAlign: "center", fontFamily: F.body }}>סיסמה שגויה</div>}
        <GoldButton style={{ width: "100%", textAlign: "center" }} onClick={handleAuth}>כניסה</GoldButton>
      </div>
    </div>
  );

  const labelStyle = {
    fontSize: 10, color: C.muted, letterSpacing: 4,
    marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase",
    display: "block",
  };
  const inputStyle = {
    width: "100%", background: C.bg,
    border: `1px solid ${C.border}`, color: C.goldBright,
    padding: "10px 14px", fontSize: 15,
    fontFamily: F.body, borderRadius: 2,
    outline: "none", boxSizing: "border-box", direction: "rtl",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "60px 24px", direction: "rtl" }}>
      <SectionHeader eyebrow="ניהול" title="פאנל ניהול — עמודים ורמזים" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "start", marginBottom: 40 }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.gold}`, borderRadius: 2, padding: "28px 28px",
        }}>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 24, fontFamily: F.heading, textTransform: "uppercase",
          }}>עריכת עמוד</div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
              <div>
                <label style={labelStyle}>בחר עמוד</label>
                <select value={editPageKey} onChange={e => setEditPageKey(e.target.value)} style={inputStyle}>
                  {Object.keys(PAGE_CONTENT_DEFAULTS).map(key => (
                    <option key={key} value={key}>{PAGE_CONTENT_DEFAULTS[key].category || key}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => { setSelectedPageKey(editPageKey); setAdminMode(true); }} style={{
                background: C.bgGlow, border: `1px solid ${C.gold}`,
                color: C.goldLight, padding: "12px 18px", borderRadius: 4,
                cursor: "pointer", fontFamily: F.heading, fontSize: 12,
                letterSpacing: 2, textTransform: "uppercase",
              }}>
                פתח עמוד
              </button>
            </div>

            <RoyalInput label="כותרת עמוד" value={pageTitle} onChange={setPageTitle} />
            <div>
              <label style={labelStyle}>תיאור עמוד</label>
              <textarea
                value={pageDescription}
                onChange={e => setPageDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
              />
            </div>
            <div>
              <label style={labelStyle}>תוכן HTML מלא</label>
              <textarea
                value={pageBodyHtml}
                onChange={e => setPageBodyHtml(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "monospace" }}
                placeholder="הכנס HTML תקין כאן: <p>קטע תיאור נוסף</p>"
              />
            </div>
            <RoyalInput label="קטגוריה" value={pageCategory} onChange={setPageCategory} />
            <RoyalInput label="תגית" value={pageTag} onChange={setPageTag} />
            <GoldButton
              style={{ width: "100%", textAlign: "center" }}
              onClick={() => {
                onSavePage(editPageKey, {
                  title: pageTitle,
                  description: pageDescription,
                  bodyHtml: pageBodyHtml,
                  category: pageCategory,
                  tag: pageTag,
                });
                setOkMsg("✦ תוכן העמוד נשמר בהצלחה");
                setTimeout(() => setOkMsg(""), 3000);
              }}
            >שמור עמוד</GoldButton>

            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 12, fontFamily: F.heading, textTransform: "uppercase" }}>
                סנכרון Supabase — קטגוריה 47
              </div>
              <GoldButton
                variant="secondary"
                disabled={syncing}
                style={{ width: "100%", textAlign: "center", marginBottom: 10 }}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const count = await syncCategory47();
                    setOkMsg(`✦ סונכרנו ${count} פוסטים ל-Supabase`);
                  } catch (e) {
                    setOkMsg(`⚠ שגיאה: ${e.message}`);
                  } finally {
                    setSyncing(false);
                    setTimeout(() => setOkMsg(""), 4000);
                  }
                }}
              >
                {syncing ? "מסנכרן..." : "סנכרן פוסטים מ-WordPress"}
              </GoldButton>
              <GoldButton
                variant="secondary"
                disabled={syncing}
                style={{ width: "100%", textAlign: "center", borderColor: C.crimsonLight, color: "#c87070" }}
                onClick={async () => {
                  setSyncing(true);
                  setOkMsg("מסנכרן תגובות...");
                  try {
                    const count = await syncAllComments(({ page, totalPages, totalSynced }) => {
                      setOkMsg(`עמוד ${page}/${totalPages} — ${totalSynced} תגובות`);
                    });
                    setOkMsg(`✦ סונכרנו ${count} תגובות ל-Supabase`);
                  } catch (e) {
                    setOkMsg(`⚠ שגיאה: ${e.message}`);
                  } finally {
                    setSyncing(false);
                    setTimeout(() => setOkMsg(""), 6000);
                  }
                }}
              >
                {syncing ? "מסנכרן..." : "סנכרן תגובות מ-WordPress"}
              </GoldButton>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── ADD FORM ── */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.gold}`, borderRadius: 2, padding: "28px 28px",
        }}>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 24, fontFamily: F.heading, textTransform: "uppercase",
          }}>הוסף רמז חדש</div>

          <RoyalInput label="כותרת *" value={fTitle} onChange={setFTitle} />

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>תוכן</label>
            <textarea
              value={fContent}
              onChange={e => setFContent(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
            />
          </div>

          <RoyalInput label="מספרים קשורים (מופרדים בפסיק)" value={fNumbers} onChange={setFNumbers} placeholder="26, 72, 1820" />
          <RoyalInput label="קטגוריה" value={fCategory} onChange={setFCategory} />

          {/* image upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>תמונה</label>
            <label style={{
              display: "flex", alignItems: "center", gap: 10,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 2, padding: "9px 14px", cursor: "pointer",
            }}>
              <span style={{ color: C.goldDim, fontSize: 15, lineHeight: 1 }}>📎</span>
              <span style={{ color: fImgName ? C.goldLight : C.muted, fontSize: 14, fontFamily: F.body }}>
                {fImgName || "בחר תמונה..."}
              </span>
              <input type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
            </label>
            {fImage && (
              <img src={fImage} alt="" style={{
                height: 72, marginTop: 10, borderRadius: 2,
                border: `1px solid ${C.border}`, display: "block",
              }} />
            )}
          </div>

          {okMsg && (
            <div style={{
              color: C.goldLight, fontSize: 13, marginBottom: 16,
              textAlign: "center", fontFamily: F.body,
            }}>{okMsg}</div>
          )}

          <GoldButton
            style={{ width: "100%", textAlign: "center" }}
            disabled={!fTitle.trim()}
            onClick={handleSave}
          >שמור רמז</GoldButton>
        </div>

        {/* ── CLUES LIST ── */}
        <div>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase",
          }}>רמזים שמורים ({clues.length})</div>

          {clues.length === 0 ? (
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, padding: "24px 0" }}>
              אין רמזים עדיין
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxHeight: "68vh", overflowY: "auto" }}>
              {clues.map(clue => (
                <div key={clue.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRight: `3px solid ${C.gold}`,
                  borderRadius: 2, padding: "14px 16px",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  {clue.image && (
                    <img src={clue.image} alt="" style={{
                      width: 48, height: 48, objectFit: "cover",
                      borderRadius: 2, flexShrink: 0,
                      border: `1px solid ${C.border}`,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: C.goldBright, fontFamily: F.heading,
                      fontSize: 14, fontWeight: 700, marginBottom: 4,
                    }}>{clue.title}</div>
                    {clue.category && (
                      <span style={{
                        background: C.goldDark, border: `1px solid ${C.borderGold}`,
                        color: C.goldLight, fontSize: 9, padding: "2px 8px",
                        fontFamily: F.heading, letterSpacing: 2,
                        textTransform: "uppercase", borderRadius: 1,
                        display: "inline-block", marginBottom: 4,
                      }}>{clue.category}</span>
                    )}
                    {clue.numbers.length > 0 && (
                      <div style={{ color: C.muted, fontSize: 11, fontFamily: F.heading, letterSpacing: 1 }}>
                        מספרים: {clue.numbers.join(" · ")}
                      </div>
                    )}
                    {clue.content && (
                      <div style={{
                        color: C.muted, fontSize: 12, fontFamily: F.body,
                        marginTop: 4, lineHeight: 1.7,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{clue.content}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(clue.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = "#c05050")}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    style={{
                      background: "none", border: "none", color: C.muted,
                      cursor: "pointer", fontSize: 16, lineHeight: 1,
                      fontFamily: "monospace", transition: "color 0.2s", flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== NUMBERS REPORT PAGE =====

const REPORT_PASSWORD = "1820";

function NumbersReportPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwError,  setPwError]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [report,   setReport]   = useState(null);

  function handleAuth() {
    if (pw.trim() === REPORT_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  }

  async function runScan() {
    setScanning(true);
    setReport(null);
    setProgress({ done: 0, total: 1 });
    try {
      const first = await fetch(`${WP_API}?per_page=100&page=1&_fields=id,title,content`);
      const totalPages = parseInt(first.headers.get("X-WP-TotalPages") || "1", 10);
      const posts1 = await first.json();
      setProgress({ done: 1, total: totalPages });

      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetch(`${WP_API}?per_page=100&page=${i + 2}&_fields=id,title,content`)
            .then(r => r.json())
            .then(d => { setProgress(p => ({ ...p, done: p.done + 1 })); return d; })
        )
      );
      const allPosts = [posts1, ...rest].flat();

      const counts = {};
      for (const post of allPosts) {
        const text = (post.title?.rendered ?? "") + " " + (post.content?.rendered ?? "");
        for (const match of text.matchAll(/\b(\d{1,5})\b/g)) {
          const k = parseInt(match[1], 10);
          if (k > 0) counts[k] = (counts[k] || 0) + 1;
        }
      }

      const numbers = Object.entries(counts)
        .map(([n, count]) => ({ num: parseInt(n, 10), count, meaning: KEY_NUMBERS[parseInt(n, 10)] ?? null }))
        .filter(r => r.count >= 2 || r.meaning)
        .sort((a, b) => b.count - a.count);

      setReport({ generated: new Date().toISOString(), totalPosts: allPosts.length, numbers });
    } catch { /* silent */ }
    finally { setScanning(false); }
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "numbers-report.json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  if (!authed) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`, borderRadius: 2,
        padding: "44px 40px", width: "100%", maxWidth: 360,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 20, margin: "0 0 16px" }}>דוח מספרים</h2>
          <RoyalDivider width={100} />
        </div>
        <RoyalInput label="סיסמה" value={pw} onChange={setPw} type="password" />
        {pwError && <div style={{ color: "#c05050", fontSize: 12, marginBottom: 12, textAlign: "center", fontFamily: F.body }}>סיסמה שגויה</div>}
        <GoldButton style={{ width: "100%", textAlign: "center" }} onClick={handleAuth}>כניסה</GoldButton>
      </div>
    </div>
  );

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 24px", direction: "rtl" }}>
      <SectionHeader eyebrow="כלי ניתוח" title="דוח מספרים" />

      {!report && !scanning && (
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 2, marginBottom: 28 }}>
            הכלי סורק את כל הפוסטים, מחלץ מספרים חוזרים וממיין לפי תדירות.<br />
            מספרי מפתח מסומנים בזהב.
          </p>
          <GoldButton onClick={runScan}>הפעל סריקה</GoldButton>
        </div>
      )}

      {scanning && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 20 }}>✦</div>
          <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, marginBottom: 20 }}>
            סורק... {progress.done} / {progress.total} עמודים ({pct}%)
          </p>
          <div style={{ maxWidth: 280, margin: "0 auto", height: 3, background: C.faint, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: C.gold, borderRadius: 2, width: `${pct}%`, transition: "width 0.35s" }} />
          </div>
        </div>
      )}

      {report && (
        <>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
            <GoldButton variant="secondary" onClick={runScan} style={{ fontSize: 11 }}>סרוק מחדש</GoldButton>
            <GoldButton onClick={downloadJson} style={{ fontSize: 11 }}>הורד JSON</GoldButton>
          </div>
          <div style={{ textAlign: "center", marginBottom: 32, color: C.muted, fontFamily: F.body, fontSize: 13 }}>
            {report.totalPosts} פוסטים · {report.numbers.length} מספרים ייחודיים חוזרים
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            {report.numbers.map(({ num, count, meaning }) => (
              <div key={num} style={{
                display: "grid", gridTemplateColumns: "56px 1fr 44px",
                alignItems: "center", gap: 16, padding: "10px 18px",
                background: meaning ? `linear-gradient(to left, ${C.goldDeep}99, transparent)` : "transparent",
                border: `1px solid ${meaning ? C.borderGold : C.faint}`,
                borderRadius: 2,
              }}>
                <span style={{ color: meaning ? C.goldBright : C.goldDim, fontFamily: F.heading, fontSize: 17, fontWeight: 700 }}>{num}</span>
                <span style={{ color: meaning ? C.goldLight : C.muted, fontFamily: F.body, fontSize: 13 }}>
                  {meaning || "—"}
                </span>
                <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 1, textAlign: "left" }}>×{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===== NAVBAR =====

const NAV_ITEMS = [
  { key: "home",    label: "ראשי" },
  { key: "courses", label: "קורסים" },
  { key: "blog",    label: "פוסטים" },
  { key: "about",   label: "אודות" },
  { key: "login",   label: "כניסה" },
];

function Navbar({ page, onNav }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(5,4,0,0.98)" : "rgba(5,4,0,0.88)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.borderGold : C.border}`,
      padding: "0 24px",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      height: 64,
      direction: "rtl",
      transition: "all 0.35s",
      gap: 16,
    }}>
      {/* logo — right in RTL */}
      <button onClick={() => onNav("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10, padding: 0,
      }}>
        <div style={{ position: "relative", display: "inline-flex" }}>
          <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
          <span style={{
            position: "absolute", top: -5, right: -8,
            background: `linear-gradient(135deg, ${C.crimsonLight}, ${C.crimson})`,
            color: "#f6e27a", fontSize: 7, fontWeight: 800, letterSpacing: 0.5,
            fontFamily: F.heading, padding: "1.5px 4px", borderRadius: 3,
            border: `1px solid ${C.goldDim}`, lineHeight: 1.3,
            boxShadow: `0 0 6px rgba(122,19,32,0.6)`, textTransform: "uppercase",
          }}>AI</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>
            כי לה' המלוכה
          </div>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 7, letterSpacing: 3, textTransform: "uppercase" }}>
            SOD1820
          </div>
        </div>
      </button>

      {/* center nav */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        <button onClick={() => onNav("blog")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "blog" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "blog" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          פוסטים אחרונים
        </button>
        <button onClick={() => onNav("spotchat")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "spotchat" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "spotchat" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          צאט האתר
        </button>
        <button onClick={() => onNav("contact")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "contact" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "contact" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          צור קשר
        </button>
      </div>

      {/* register button — left in RTL */}
      <GoldButton
        style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2, whiteSpace: "nowrap" }}
        onClick={() => onNav("checkout", COURSES[3])}
      >
        הרשם עכשיו
      </GoldButton>
    </nav>
  );
}

// ===== CONTACT PAGE =====
function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErr("נא למלא שם, אימייל והודעה"); return;
    }
    setSending(true); setErr("");
    try {
      await sendContactMessage(form);
      setSent(true);
    } catch { setErr("שגיאה בשליחה — נסה שוב"); }
    finally { setSending(false); }
  }

  const field = (label, key, type = "text", rows) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </label>
      {rows ? (
        <textarea rows={rows} value={form[key]} onChange={e => set(key, e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3, color: "#ede4d3", fontFamily: F.body, fontSize: 15, padding: "12px 16px", outline: "none", resize: "vertical", direction: "rtl", lineHeight: 1.7 }} />
      ) : (
        <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3, color: "#ede4d3", fontFamily: F.heading, fontSize: 14, padding: "12px 16px", outline: "none", direction: "rtl" }} />
      )}
    </div>
  );

  return (
    <div style={{ direction: "rtl", maxWidth: 1000, margin: "0 auto", padding: "64px 16px 96px" }}>
      {/* hero */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>יצירת קשר</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: "clamp(28px,6vw,52px)", fontWeight: 700, margin: "0 0 14px", letterSpacing: 1 }}>
          נשמח לשמוע ממך
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
          שאלות, הצעות, שיתופי פעולה — כל פנייה מתקבלת בברכה
        </p>
        <RoyalDivider width={140} style={{ margin: "22px auto 0" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>

        {/* left — form */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: 2, padding: "36px 32px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 20 }}>✦</div>
              <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 24, marginBottom: 12 }}>ההודעה נשלחה!</h2>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 15 }}>נחזור אליך בהקדם האפשרי</p>
              <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                style={{ marginTop: 24, background: "none", border: `1px solid ${C.borderGold}`, color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, padding: "10px 24px", cursor: "pointer", borderRadius: 2 }}>
                שלח הודעה נוספת
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {field("שם מלא *", "name")}
              {field("אימייל *", "email", "email")}
              {field("נושא", "subject")}
              {field("הודעה *", "message", "text", 6)}
              {err && <p style={{ color: "#c05050", fontFamily: F.heading, fontSize: 12, marginBottom: 16 }}>{err}</p>}
              <GoldButton type="submit" disabled={sending} style={{ width: "100%", padding: "14px", fontSize: 13, letterSpacing: 3 }}>
                {sending ? "שולח..." : "שלח הודעה ✦"}
              </GoldButton>
            </form>
          )}
        </div>

        {/* right — author card + info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* author card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.crimson}`, borderRadius: 2, padding: "28px 28px 24px" }}>
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 18 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${C.goldDark}, ${C.crimson})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, border: `2px solid ${C.borderGold}`,
              }}>✦</div>
              <div>
                <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                  יוסי וינר
                </div>
                <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
                  מייסד ועורך — סוד 1820
                </div>
              </div>
            </div>
            <p style={{ color: "#c8bfb0", fontFamily: F.body, fontSize: 14, lineHeight: 1.85, margin: 0 }}>
              חוקר גימטריה, צפנים בתורה ורמזי אחרית הימים. מפיץ תובנות על הגאולה ומתעד אירועים בזמן אמת דרך משקפת הקבלה.
            </p>
          </div>

          {/* contact info boxes */}
          {[
            { icon: "✉", label: "אימייל", value: "yosiviner7@gmail.com" },
            { icon: "🌐", label: "אתר", value: "sod1820.co.il" },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2,
              padding: "18px 22px", display: "flex", gap: 14, alignItems: "center",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                <div style={{ color: "#ede4d3", fontFamily: F.body, fontSize: 14 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== POPULAR POSTS WIDGET =====
function PopularPostsWidget({ onNav }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    getPopularPosts({ limit: 8 }).then(rows => {
      setPosts(rows.map(r => ({
        id: r.wp_id, title: r.title, slug: r.slug,
        image_url: r.image_url, date: r.date, commentCount: r.comment_count,
      })));
    }).catch(() => {});
  }, []);

  if (!posts.length) return null;

  return (
    <div style={{ marginTop: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <RoyalDivider width={48} />
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          פוסטים פופולריים
        </span>
        <RoyalDivider width={48} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map((post, i) => {
          const d = post.date ? new Date(post.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          return (
            <div key={post.id} onClick={() => onNav("post", { slug: post.slug, id: post.id })}
              style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            >
              <span style={{ color: C.borderGold, fontFamily: F.heading, fontSize: 13, fontWeight: 700, width: 24, textAlign: "center", flexShrink: 0 }}>
                {i + 1}
              </span>
              {post.image_url && (
                <img src={post.image_url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 2, flexShrink: 0, filter: "brightness(0.8)" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#ede4d3", fontFamily: F.body, fontSize: 13, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {post.title}
                </div>
                <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, marginTop: 3 }}>
                  {d}{post.commentCount > 0 && ` · ${post.commentCount} תגובות`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== CHAT PAGE =====
function ChatPage() {
  const [messages, setMessages]   = useState([]);
  const [author,   setAuthor]     = useState(() => localStorage.getItem("chat_author") || "");
  const [text,     setText]       = useState("");
  const [sending,  setSending]    = useState(false);
  const [error,    setError]      = useState("");
  const bottomRef = useRef(null);

  // load messages
  useEffect(() => {
    getChatMessages().then(setMessages).catch(() => {});
  }, []);

  // realtime subscription
  useEffect(() => {
    const channel = subscribeToChatMessages(msg => {
      setMessages(prev => [...prev, msg]);
    });
    return () => { channel.unsubscribe?.(); };
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const name = author.trim() || "אנונימי";
    const body = text.trim();
    if (!body) return;
    setSending(true); setError("");
    try {
      await sendChatMessage({ author: name, content: body });
      localStorage.setItem("chat_author", name);
      setText("");
      // reload to pick up any missed messages
      getChatMessages().then(setMessages).catch(() => {});
    } catch (err) {
      setError("שגיאה בשליחה — נסה שוב");
    } finally {
      setSending(false);
    }
  }

  const formatTime = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mi}`;
  };

  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "52px 16px 96px" }}>
      {/* header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
          קהילת סוד 1820
        </div>
        <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: "clamp(24px, 5vw, 38px)", fontWeight: 700, margin: "0 0 10px" }}>
          צ׳אט קהילתי
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, margin: 0 }}>
          שאל, שתף, התחבר — בית הפגישה של חוקרי הסוד
        </p>
        <RoyalDivider width={120} style={{ margin: "18px auto 0" }} />
      </div>

      {/* messages */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 4, padding: "20px 16px",
        minHeight: 320, maxHeight: 520, overflowY: "auto",
        marginBottom: 20, display: "flex", flexDirection: "column", gap: 2,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, fontSize: 14, padding: "60px 0" }}>
            אין הודעות עדיין — היה הראשון לכתוב
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const sameAuthor = prev?.author === msg.author;
          return (
            <div key={msg.id} style={{ marginTop: sameAuthor ? 3 : 14 }}>
              {!sameAuthor && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                    {msg.author}
                  </span>
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              )}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "8px 14px",
                color: "#d8d0c4",
                fontFamily: F.body,
                fontSize: 15,
                lineHeight: 1.7,
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* compose form */}
      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text"
          placeholder="שמך (אופציונלי)"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          maxLength={60}
          style={{
            background: C.surface2, border: `1px solid ${C.border}`,
            color: "#ede4d3", fontFamily: F.heading, fontSize: 13,
            padding: "10px 14px", borderRadius: 3, outline: "none",
            direction: "rtl",
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            placeholder="כתוב הודעה..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            maxLength={1000}
            rows={3}
            style={{
              flex: 1,
              background: C.surface2, border: `1px solid ${C.border}`,
              color: "#ede4d3", fontFamily: F.body, fontSize: 15,
              padding: "10px 14px", borderRadius: 3, outline: "none",
              resize: "vertical", direction: "rtl", lineHeight: 1.7,
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              alignSelf: "flex-end",
              background: text.trim() ? `linear-gradient(135deg, ${C.goldDark}, ${C.goldDeep})` : C.surface2,
              border: `1px solid ${text.trim() ? C.gold : C.border}`,
              color: text.trim() ? C.goldBright : C.muted,
              fontFamily: F.heading, fontSize: 11, letterSpacing: 2,
              padding: "10px 20px", borderRadius: 3, cursor: text.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {sending ? "שולח..." : "שלח ✦"}
          </button>
        </div>
        {error && <div style={{ color: "#c05050", fontFamily: F.heading, fontSize: 11 }}>{error}</div>}
        <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 9, letterSpacing: 1 }}>
          Enter לשליחה • Shift+Enter לשורה חדשה
        </div>
      </form>
    </div>
  );
}

// ===== SPOTIM CHAT PAGE =====
function SpotimChatPage() {
  useEffect(() => {
    if (document.getElementById("spotim-script")) return;
    const s = document.createElement("script");
    s.id = "spotim-script";
    s.src = "https://launcher.spot.im/spot/sp_OVtajBTj";
    s.async = true;
    s.setAttribute("data-spotim-module", "spotim-launcher");
    s.setAttribute("data-post-id", "daf-tzaat-rashi");
    document.body.appendChild(s);
    return () => { document.getElementById("spotim-script")?.remove(); };
  }, []);

  return (
    <div style={{ direction: "rtl", maxWidth: 860, margin: "0 auto", padding: "52px 16px 96px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
          קהילת סוד 1820
        </div>
        <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 700, margin: "0 0 10px" }}>
          צאט האתר
        </h1>
        <RoyalDivider width={120} style={{ margin: "18px auto 0" }} />
      </div>
      <div id="spotim-container" style={{ minHeight: 400 }} />
    </div>
  );
}

// ===== FOOTER =====

function Footer({ onNav, navItems }) {
  const items = navItems?.length ? navItems : NAV_ITEMS;

  function handleItem(item) {
    if (item.route) onNav(item.route);
    else if (item.url && item.url !== "#") window.open(item.url, "_blank", "noopener,noreferrer");
    else if (item.key && !item.url) onNav(item.key);
  }

  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
      padding: "56px 36px 28px",
      direction: "rtl",
    }}>
      <div style={{
        maxWidth: 1040,
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 32,
        paddingBottom: 36,
      }}>
        <div style={{ minWidth: 240, flex: 1, maxWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
              <span style={{
                position: "absolute", top: -5, right: -8,
                background: `linear-gradient(135deg, ${C.crimsonLight}, ${C.crimson})`,
                color: "#f6e27a", fontSize: 7, fontWeight: 800,
                fontFamily: F.heading, padding: "1.5px 4px",
                borderRadius: 3, border: `1px solid ${C.goldDim}`,
                lineHeight: 1.3, boxShadow: "0 0 6px rgba(122,19,32,0.6)",
                textTransform: "uppercase",
              }}>AI</span>
            </div>
            <div>
              <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                סוד המספרים
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 9, letterSpacing: 2, marginTop: 4 }}>
                לימוד גימטריה מעמיק לדרך שלמה
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: F.body, lineHeight: 1.8, maxWidth: 260 }}>
            צוריאל פולייס · sod1820.co.il<br />
            נחזור בקרוב עם שיעורים חיים, כלים מיוחדים וגישה אישית.
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, flexWrap: "wrap", flex: 2, minWidth: 240 }}>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>
              קישורים מהירים
            </div>
            {items.map(n => (
              <button key={n.key} onClick={() => handleItem(n)} style={{
                display: "block",
                background: "none",
                border: "none",
                color: C.goldDim,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: F.body,
                padding: "6px 0",
                textAlign: "right",
              }}>
                {n.label}
              </button>
            ))}
          </div>

          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>
              קורסים פופולריים
            </div>
            {COURSES.map(c => (
              <button key={c.id} onClick={() => onNav("detail", c)} style={{
                display: "block",
                background: "none",
                border: "none",
                color: C.goldDim,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: F.body,
                padding: "6px 0",
                textAlign: "right",
              }}>
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 220, flex: 1, maxWidth: 260 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>
            כלים
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {[["דוח מספרים", "numbers-report"], ["תצוגה מקדימה", "theme-preview"], ["ניהול", "admin"]].map(([label, key]) => (
              <button key={key} onClick={() => onNav(key)} style={{
                background: C.bgGlow,
                border: `1px solid ${C.borderGold}`,
                color: C.goldBright,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: F.heading,
                letterSpacing: 1.5,
                padding: "12px 14px",
                textTransform: "uppercase",
                borderRadius: 4,
                textAlign: "right",
                transition: "transform 0.2s, background 0.2s",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = C.surface;
                  e.currentTarget.style.transform = "translateX(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = C.bgGlow;
                  e.currentTarget.style.transform = "none";
                }}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1040,
        margin: "0 auto",
        paddingTop: 26,
        borderTop: `1px solid ${C.faint}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: F.heading, letterSpacing: 3, lineHeight: 1.5 }}>
          © {new Date().getFullYear()} SOD1820 · כל הזכויות שמורות
        </div>
        <div style={{ fontSize: 11, color: C.goldDim, fontFamily: F.body, textAlign: "right" }}>
          א↔ל · ב↔מ · ג↔נ · כ↔ת
        </div>
      </div>
    </footer>
  );
}

// ===== APP ROOT =====

// ===== SLUG-BASED POST PAGE =====

function PostPageBySlug({ onNav }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getPostBySlug(slug)
      .then(row => {
        if (row) setPost(row);
        else setError("הפוסט לא נמצא");
        setLoading(false);
      })
      .catch(() => { setError("שגיאה בטעינה"); setLoading(false); });
  }, [slug]);

  const image    = post?.image_url ?? null;
  const author   = post?.author ?? "";
  const title    = stripHtml(post?.title ?? "");
  const date     = formatDateHe(post?.date ?? "");
  const modified = post?.modified && post.modified !== post.date ? formatDateHe(post.modified) : null;
  const content  = (post?.content ?? "")
    // strip injected full-HTML boilerplate (common from pasted AI-generated content)
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    // collapse whitespace artifacts left by the above
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br>")
    .replace(/<p[^>]*>(\s|&nbsp;)*<\/p>/gi, "")
    .replace(/<div[^>]*style="[^"]*height:\s*\d+px[^"]*"[^>]*>\s*<\/div>/gi, "")
    .replace(/(מאת[:\s]+[^\n<]{2,40})/g, '<span class="post-author">$1</span>');
  const cats     = post?.categories ?? [];
  const tags     = post?.tags ?? [];

  const [gematriaItems, setGematriaItems] = useState([]);
  useEffect(() => {
    if (!tags.length) { setGematriaItems([]); return; }
    getGematriaByPhrases(tags).then(setGematriaItems).catch(() => {});
  }, [tags.join(",")]);  // eslint-disable-line

  const [comments, setComments] = useState([]);
  useEffect(() => {
    if (!post?.wp_id) return;
    getCommentsByPostId(post.wp_id).then(setComments).catch(() => {});
  }, [post?.wp_id]);

  return (
    <div style={{ direction: "rtl" }}>
      {image && !loading && (
        <div style={{ height: "clamp(220px, 40vw, 480px)", position: "relative", overflow: "hidden", background: C.goldDeep }}>
          <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) sepia(0.3)", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(5,4,0,0.1) 30%, ${C.bg} 100%)` }} />
        </div>
      )}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "52px 16px 96px" }}>
        <button onClick={() => navigate("/post")}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 10, marginBottom: 40, letterSpacing: 4, textTransform: "uppercase" }}>
          ← חזרה לפוסטים
        </button>
        {loading && <div style={{ textAlign: "center", padding: "80px 0" }}><div style={{ fontSize: 42, color: C.goldDim, marginBottom: 20 }}>✦</div><p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 2 }}>טוען...</p></div>}
        {error && <p style={{ color: "#b05050", fontFamily: F.body }}>{error}</p>}
        {post && !loading && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              {cats.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, justifyContent: "center" }}>
                  {cats.map(name => (
                    <span key={name} className="sod-inflate" onClick={() => navigate('/category/' + toSlug(name))} style={{
                      background: C.goldDark, border: `1px solid ${C.borderGold}`,
                      color: C.goldBright, fontSize: 10, padding: "3px 10px",
                      fontFamily: F.heading, letterSpacing: 1,
                      textTransform: "uppercase", borderRadius: 1,
                    }}>{name}</span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, marginBottom: 18, fontFamily: F.heading, textTransform: "uppercase" }}>
                {date}{author && ` · ${author}`}{modified && ` · עודכן: ${modified}`}
              </div>
              <h1 style={{ color: "#E8D5A3", margin: "0 0 28px", fontSize: "clamp(24px, 4.5vw, 44px)", fontFamily: F.royal, fontWeight: 700, lineHeight: 1.2, letterSpacing: 1, textShadow: `0 0 70px ${C.goldDeep}` }}>{title}</h1>
              <RoyalDivider width={160} />
            </div>
            {gematriaItems.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 9, color: "#b39ddb", letterSpacing: 3, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 8 }}>מספרים קשורים</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {gematriaItems.map(({ phrase, ragil }) => (
                    <span key={phrase} className="sod-inflate" onClick={() => navigate('/number/' + encodeURIComponent(phrase))} style={{
                      background: "#1a0a2e", border: "1px solid #7c3aed",
                      color: "#c4b5fd", fontSize: 10, padding: "3px 12px",
                      fontFamily: F.heading, letterSpacing: 1, borderRadius: 1,
                    }}>{phrase} | {ragil}</span>
                  ))}
                </div>
              </div>
            )}
            <style>{POST_CONTENT_CSS}</style>
            <div className="sod-post-content" dangerouslySetInnerHTML={{ __html: content }} />
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 48 }}>
                {tags.map(name => (
                  <span key={name} className="sod-inflate" onClick={() => navigate('/tag/' + toSlug(name))} style={{
                    background: C.faint, border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 10, padding: "3px 10px",
                    fontFamily: F.heading, letterSpacing: 1,
                    textTransform: "uppercase", borderRadius: 1,
                  }}>{name}</span>
                ))}
              </div>
            )}

            {/* ── COMMENTS ── */}
            {comments.length > 0 && (
              <div style={{ marginTop: 64 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                  <RoyalDivider width={48} />
                  <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>
                    תגובות ({comments.length})
                  </span>
                  <RoyalDivider width={48} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {comments.map(c => {
                    const isReply = c.parent_wp_id && c.parent_wp_id !== 0;
                    const cDate = c.date
                      ? new Date(c.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div key={c.wp_id} style={{
                        marginRight: isReply ? 32 : 0,
                        background: isReply ? "rgba(61,31,92,0.12)" : C.surface,
                        border: `1px solid ${isReply ? "rgba(107,63,160,0.25)" : C.border}`,
                        borderRight: `3px solid ${isReply ? C.royalLight : C.borderGold}`,
                        borderRadius: 2, padding: "14px 18px 16px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                          <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                            {isReply && <span style={{ color: C.royalLight, marginLeft: 6 }}>↩</span>}
                            {c.author_name}
                          </span>
                          <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 1 }}>{cDate}</span>
                        </div>
                        <div
                          style={{ color: "#d4ccbf", fontSize: 14, lineHeight: 1.85, fontFamily: F.body }}
                          dangerouslySetInnerHTML={{ __html: c.content }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== GEMATRIA PHRASE PAGE =====

function GematriaPhrasePage({ onNav }) {
  const { phrase } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(phrase);
  const [item, setItem] = useState(null);

  useEffect(() => {
    getGematriaByPhrases([decoded]).then(rows => setItem(rows[0] ?? null)).catch(() => {});
  }, [decoded]);

  return (
    <div style={{ direction: "rtl", maxWidth: 780, margin: "0 auto", padding: "52px 24px 96px" }}>
      <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 10, marginBottom: 40, letterSpacing: 4, textTransform: "uppercase" }}>← חזרה</button>
      <h1 style={{ color: "#c4b5fd", fontFamily: F.royal, fontSize: "clamp(22px, 4vw, 38px)", marginBottom: 16 }}>{decoded}</h1>
      {item && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 48 }}>
          {[["רגיל", item.ragil]].filter(([,v]) => v).map(([label, val]) => (
            <span key={label} style={{ background: "#1a0a2e", border: "1px solid #7c3aed", color: "#c4b5fd", fontSize: 12, padding: "4px 14px", fontFamily: F.heading, borderRadius: 1 }}>{label}: {val}</span>
          ))}
        </div>
      )}
      <BlogPage onNav={onNav} filterTag={decoded} />
    </div>
  );
}

// ===== CATEGORY PAGE =====

function CategoryPage({ onNav }) {
  const { slug } = useParams();
  const categoryName = fromSlug(slug);
  return <BlogPage onNav={onNav} filterCategory={categoryName} />;
}

// ===== TAG PAGE =====

function TagPage({ onNav }) {
  const { slug } = useParams();
  const tagName = fromSlug(slug);
  return <BlogPage onNav={onNav} filterTag={tagName} />;
}

// ===== SPACE BACKGROUND =====
const _genStars = (n, spread) =>
  Array.from({ length: n }, () => {
    const x = Math.floor(Math.random() * spread);
    const y = Math.floor(Math.random() * spread);
    const o = (0.12 + Math.random() * 0.65).toFixed(2);
    return `${x}px ${y}px 0 0 rgba(255,255,255,${o})`;
  }).join(',');
const _genStars2 = (n, spread) =>
  Array.from({ length: n }, () => {
    const x = Math.floor(Math.random() * spread);
    const y = Math.floor(Math.random() * spread);
    const o = (0.25 + Math.random() * 0.5).toFixed(2);
    return `${x}px ${y}px 0 1px rgba(255,255,255,${o})`;
  }).join(',');
const STARS_SM = _genStars(180, 2400);
const STARS_LG = _genStars2(35, 2400);

function SpaceBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* city night photo — LA skyline */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        opacity: 0.28,
      }} />
      {/* strong center mask — keeps text readable, city glows at edges */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 80% at 50% 48%, rgba(7,5,14,0.97) 0%, rgba(7,5,14,0.85) 40%, rgba(7,5,14,0.45) 68%, rgba(7,5,14,0.08) 100%)",
      }} />
      {/* crimson glow top + royal purple bottom — from new palette */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse at 50% -10%, rgba(122,19,32,0.30) 0%, transparent 55%)",
          "radial-gradient(ellipse at 50% 110%, rgba(61,31,92,0.25) 0%, transparent 50%)",
          "radial-gradient(ellipse at 15% 25%, rgba(80,30,150,0.14) 0%, transparent 48%)",
          "radial-gradient(ellipse at 85% 70%, rgba(122,19,32,0.12) 0%, transparent 44%)",
        ].join(','),
      }} />
      {/* subtle stars over the city */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, boxShadow: STARS_SM, opacity: 0.35 }} />
    </div>
  );
}

// ===== MAIN APP =====

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState("home");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [navItems, setNavItems] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedPageKey, setSelectedPageKey] = useState("home");
  const [pageContent, setPageContent] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(PAGE_CONTENT_STORE_KEY) || "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    fetchWpMenu().then(items => {
      if (items?.length) setNavItems(items);
    });
  }, []);

  // sync page state from URL
  useEffect(() => {
    const p = location.pathname;
    if (p === "/post") setPage("blog");
    else if (p === "/chat") setPage("chat");
    else if (p === "/דף-צאט-ראשי") setPage("spotchat");
    else if (p === "/צור-קשר") setPage("contact");
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem(PAGE_CONTENT_STORE_KEY, JSON.stringify(pageContent)); }
    catch {}
  }, [pageContent]);

  function getPageContent(key) {
    return { ...PAGE_CONTENT_DEFAULTS[key], ...(pageContent[key] || {}) };
  }

  function savePageContent(key, values) {
    setPageContent(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...values },
    }));
  }

  function nav(p, data = null) {
    // URL-based navigation for posts, blog, category, tag
    if (p === "post" && data?.slug) {
      navigate(`/${data.slug}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (p === "blog") {
      navigate("/post");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (p === "chat") {
      navigate("/chat");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (p === "spotchat") {
      navigate("/דף-צאט-ראשי");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (p === "contact") {
      navigate("/צור-קשר");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPage(p);
    if (p === "admin") {
      setSelectedPageKey(typeof data === "string" ? data : selectedPageKey || "home");
    } else if (p === "number" && data) {
      setSelectedTag(data);
    } else if (data) {
      setSelectedCourse(data);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: "#ede4d3", fontFamily: F.body, fontSize: 16, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>
      {/* space background */}
      <SpaceBackground />

      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar page={page} onNav={nav} navItems={navItems} />
        <main>
          <Routes>
            <Route path="/post" element={<BlogPage onNav={nav} pageContent={getPageContent("blog")} adminMode={adminMode} />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/דף-צאט-ראשי" element={<SpotimChatPage />} />
            <Route path="/צור-קשר" element={<ContactPage />} />
            <Route path="/number/:phrase" element={<GematriaPhrasePage onNav={nav} />} />
            <Route path="/category/:slug" element={<CategoryPage onNav={nav} />} />
            <Route path="/tag/:slug" element={<TagPage onNav={nav} />} />
            <Route path="/:slug" element={<PostPageBySlug onNav={nav} />} />
            <Route path="*" element={
              <>
                {page === "courses"  && <CoursesPage onNav={nav} pageContent={getPageContent("courses")} adminMode={adminMode} />}
                {page === "about"    && <AboutPage onNav={nav} pageContent={getPageContent("about")} adminMode={adminMode} />}
                {page === "number"   && selectedTag && <NumberPage tag={selectedTag} onNav={nav} onBack={() => nav("blog")} />}
                {page === "login"    && <LoginPage onNav={nav} />}
                {page === "detail"   && <CourseDetailPage course={selectedCourse} onBuy={c => nav("checkout", c)} onBack={() => nav("courses")} />}
                {page === "checkout" && <CheckoutPage course={selectedCourse} onNav={nav} />}
                {page === "numbers-report" && <NumbersReportPage />}
                {page === "theme-preview"  && <ThemePreviewPage />}
                {page === "admin"    && <AdminPage pageContent={pageContent} onSavePage={savePageContent} selectedPageKey={selectedPageKey} setSelectedPageKey={setSelectedPageKey} setAdminMode={setAdminMode} />}
                {!["courses","about","number","login","detail","checkout","numbers-report","theme-preview","admin"].includes(page) && <HomePage onNav={nav} pageContent={getPageContent("home")} adminMode={adminMode} />}
              </>
            } />
          </Routes>
        </main>
        <Footer onNav={nav} navItems={navItems} />
        <NumberSidebar onNav={nav} />
      </div>
    </div>
  );
}

