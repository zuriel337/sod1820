import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from "react-router-dom";
import { syncCategory47, getPostsFromSupabase, getPostBySlug, adaptPost } from "./lib/supabase.js";
import UploadFindings from "./components/UploadFindings.jsx";

// ===== DESIGN TOKENS =====
const C = {
  bg:           "#080500",
  bgGlow:       "#120d00",
  gold:         "#CFB53B",
  goldLight:    "#E8C840",
  goldBright:   "#F5D860",
  goldDim:      "#9A8040",
  goldDark:     "#3a2a00",
  goldDeep:     "#1A1200",
  surface:      "#0e0a00",
  surface2:     "#130e00",
  border:       "#251a00",
  borderGold:   "#3a2a00",
  muted:        "#8a8070",
  faint:        "#1A1200",
  danger:       "#8B2020",
};

const F = {
  royal:   "'Heebo', sans-serif",
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
    title: "הבלוג",
    description: "מחשבות, שיעורים ותובנות על הקוד הנסתר בתוך הגימטריה והשפה העברית.",
    bodyHtml: "<p>כאן תמצא פוסטים עדכניים, ניתוחים ושיתופים שנועדו לשפר את ההבנה שלך על עולם הגימטריה.</p>",
    category: "בלוג",
    tag: "blog",
  },
};

// ===== ORNAMENTS =====

const Ornament = ({ size = 20, color = C.gold }) => (
  <span style={{ color, fontSize: size, fontFamily: "serif", lineHeight: 1, userSelect: "none" }}>✦</span>
);

const RoyalDivider = ({ width = 280 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 auto", width, justifyContent: "center" }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.gold}, transparent)` }} />
    <Ornament size={10} color={C.goldDim} />
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
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
        fontFamily: F.royal,
        fontWeight: 700,
        letterSpacing: 2,
        textShadow: `0 0 40px ${C.goldDark}`,
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
          color: "#f5f0e8", fontSize: 16, lineHeight: 1.85,
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
    async function load() {
      try {
        let { posts: rows, total } = await getPostsFromSupabase(10);
        if (total === 0) {
          await syncCategory47();
          ({ posts: rows } = await getPostsFromSupabase(10));
        }
        setPosts(rows.map(adaptPost));
      } catch {
        // fallback to WP if Supabase unavailable
        try {
          const res = await fetch(`${WP_API}?_embed=1&per_page=10&categories=47`);
          if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setPosts(d); }
        } catch {}
      } finally {
        setLoading(false);
      }
    }
    load();
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
        background: `radial-gradient(ellipse at 50% 20%, #1a1200 0%, ${C.bg} 60%)`,
      }}>
        <div style={{
          position: "relative",
          display: "inline-block",
          marginBottom: 20,
          opacity: 0.95,
          transform: "translateZ(0)",
        }}>
          <img
            src={LOGO_URL}
            alt="SOD1820 logo"
            style={{
              height: 76,
              width: "auto",
              display: "block",
              animation: "crown-spin 12s linear infinite, royal-pulse 4.2s ease-in-out infinite",
              filter: "drop-shadow(0 0 18px rgba(232,200,74,0.6))",
            }}
          />
          <span style={{
            position: "absolute",
            top: "-16%",
            left: "-14%",
            color: C.goldLight,
            fontSize: 18,
            opacity: 0.9,
            animation: "royal-sparkle 3.6s ease-in-out infinite",
          }}>✦</span>
          <span style={{
            position: "absolute",
            top: "4%",
            right: "-12%",
            color: C.goldBright,
            fontSize: 14,
            opacity: 0.85,
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
          color: "#f5f0e8", fontSize: 16, lineHeight: 1.95,
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

function BlogPage({ onNav, pageContent, adminMode }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(0);
  const { title, description, bodyHtml, category } = pageContent || {};

  // fetch categories once
  useEffect(() => {
    fetch("https://sod1820.co.il/wp-json/wp/v2/categories?per_page=40&hide_empty=true")
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) ? setCategories(data) : null)
      .catch(() => {});
  }, []);

  // fetch posts when page or category changes
  useEffect(() => {
    setLoading(true);
    setError("");
    const catParam = selectedCat ? `&categories=${selectedCat}` : "";
    fetch(`${WP_API}?_embed=1&per_page=${PER_PAGE}&page=${currentPage}${catParam}`)
      .then(r => {
        const tp = r.headers.get("X-WP-TotalPages");
        if (tp) setTotalPages(parseInt(tp, 10));
        if (!r.ok) throw new Error(`שגיאה ${r.status}`);
        return r.json();
      })
      .then(data => { setPosts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [currentPage, selectedCat]);

  function goTo(p) {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectCat(id) {
    setSelectedCat(id);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ padding: "64px 24px", maxWidth: 1040, margin: "0 auto", direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <SectionHeader eyebrow={category || "פוסטים"} title={title || "תובנות ותגליות"} />
        {adminMode && (
          <button onClick={() => onNav("admin", "blog")} style={{
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

      {/* category filter */}
      {categories.length > 0 && (
        <div style={{
          display: "flex", gap: 8, justifyContent: "center",
          flexWrap: "wrap", marginBottom: 44,
        }}>
          <button onClick={() => selectCat(0)} style={{
            background: selectedCat === 0 ? C.goldDark : "transparent",
            border: `1px solid ${selectedCat === 0 ? C.gold : C.border}`,
            color: selectedCat === 0 ? C.goldBright : C.muted,
            padding: "7px 18px", cursor: "pointer",
            fontFamily: F.heading, fontSize: 10,
            letterSpacing: 3, borderRadius: 2, transition: "all 0.2s",
            textTransform: "uppercase",
          }}>הכל</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => selectCat(cat.id)} style={{
              background: selectedCat === cat.id ? C.goldDark : "transparent",
              border: `1px solid ${selectedCat === cat.id ? C.gold : C.border}`,
              color: selectedCat === cat.id ? C.goldBright : C.muted,
              padding: "7px 18px", cursor: "pointer",
              fontFamily: F.heading, fontSize: 10,
              letterSpacing: 3, borderRadius: 2, transition: "all 0.2s",
              textTransform: "uppercase",
            }}>
              {cat.name}
              <span style={{ fontSize: 8, opacity: 0.5, marginRight: 5 }}>({cat.count})</span>
            </button>
          ))}
        </div>
      )}

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
          <GoldButton variant="secondary" onClick={() => setCurrentPage(c => c)}>
            נסה שוב
          </GoldButton>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 20,
      }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.map(post => <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />)
        }
      </div>

      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: "center", padding: "72px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
          אין פוסטים להצגה
        </div>
      )}

      {/* pagination */}
      {!loading && !error && totalPages > 1 && (
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

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
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
  );
}

// ===== POST PAGE =====

const POST_CONTENT_CSS = `
  .sod-post-content { direction: rtl; color: #f0ede0; }
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
    color: #f0ede0;
    font-family: 'Frank Ruhl Libre', serif;
    font-size: 15.5px;
    line-height: 2.1;
    margin: 0 0 1.4em;
  }
  .sod-post-content a {
    color: ${C.gold};
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 0.2s;
  }
  .sod-post-content a:hover { color: ${C.goldBright}; }
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
    color: #f0ede0;
    font-family: 'Frank Ruhl Libre', serif;
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
    font-family: 'Frank Ruhl Libre', serif;
    margin-top: 8px;
    letter-spacing: 1px;
  }
  .sod-post-content .wp-block-quote { border-right: 3px solid ${C.gold}; }
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
    font-family: 'Frank Ruhl Libre', serif; font-size: 14px;
  }
  .sod-post-content tr:nth-child(even) td { background: ${C.surface}; }
`;

function PostPage({ post, onBack }) {
  const [fullPost, setFullPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${WP_API}/${post.id}?_embed=1`)
      .then(r => {
        if (!r.ok) throw new Error(`שגיאה ${r.status}`);
        return r.json();
      })
      .then(data => { setFullPost(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [post.id]);

  const image = fullPost?._embedded?.["wp:featuredmedia"]?.[0]?.source_url
    ?? post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url
    ?? null;
  const author = fullPost?._embedded?.author?.[0]?.name ?? "";
  const title  = stripHtml(fullPost?.title?.rendered ?? post?.title?.rendered ?? "");
  const date   = formatDateHe(fullPost?.date ?? post?.date ?? "");
  const content = fullPost?.content?.rendered ?? "";

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

            <div style={{
              marginTop: 60, paddingTop: 28,
              borderTop: `1px solid ${C.border}`,
              textAlign: "center",
            }}>
              <a
                href={fullPost.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: C.muted, fontSize: 10, fontFamily: F.heading,
                  letterSpacing: 4, textTransform: "uppercase",
                  textDecoration: "none", transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = C.goldDim)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >
                קרא באתר המקורי ↗
              </a>
            </div>
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
    bg: "#080500", text: "#f5f0e8", heading: "#CFB53B",
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
                style={{ width: "100%", textAlign: "center" }}
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

function Navbar({ page, onNav, navItems }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 860 : false);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItems?.length ? navItems : NAV_ITEMS;

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 860);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  function handleItem(item) {
    setMenuOpen(false);
    if (item.route) {
      onNav(item.route);
    } else if (item.url && item.url !== "#") {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else if (item.key && !item.url) {
      onNav(item.key);
    }
  }

  function isActive(item) {
    return item.route ? page === item.route : page === item.key;
  }

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(5,4,0,0.98)" : "rgba(5,4,0,0.88)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.borderGold : C.border}`,
      padding: mobile ? "0 16px" : "0 32px",
      display: "grid",
      gridTemplateColumns: mobile ? "auto auto" : "auto 1fr auto",
      alignItems: "center",
      height: 64,
      direction: "rtl",
      transition: "all 0.35s",
      gap: 16,
    }}>
      {/* logo — right in RTL */}
      <button onClick={() => { setMenuOpen(false); onNav("home"); }} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10, padding: 0,
      }}>
        <img
          src={LOGO_URL}
          alt="SOD1820"
          className="logo-animated"
          style={{ height: 36, width: "auto" }}
        />
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>
            כי לה' המלוכה
          </div>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 7, letterSpacing: 3, textTransform: "uppercase" }}>
            SOD1820
          </div>
        </div>
      </button>

      {!mobile && (
        <div style={{ display: "flex", gap: 0, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {items.map(n => (
            <button key={n.key} onClick={() => handleItem(n)} style={{
              background: isActive(n) ? C.goldDark : "none",
              border: "none",
              color: isActive(n) ? C.goldBright : C.muted,
              padding: "8px 22px",
              cursor: "pointer",
              fontFamily: F.heading,
              fontSize: 14, fontWeight: 700, letterSpacing: 3,
              borderRadius: 2, transition: "all 0.25s",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              {n.label}
              {n.url && !n.route && (
                <span style={{ fontSize: 7, marginRight: 4, opacity: 0.45 }}>↗</span>
              )}
            </button>
          ))}
        </div>
      )}

      {mobile ? (
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.14)",
            color: C.goldLight, padding: "10px 12px", borderRadius: 4,
            cursor: "pointer", fontSize: 16, fontFamily: F.heading,
            letterSpacing: 2, transition: "all 0.2s",
          }}>
            ☰
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <GoldButton
            style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2, whiteSpace: "nowrap" }}
            onClick={() => onNav("checkout", COURSES[3])}
          >
            הרשם עכשיו
          </GoldButton>
        </div>
      )}

      {mobile && menuOpen && (
        <div style={{
          position: "absolute",
          top: 64, right: 0, left: 0,
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: `0 10px 40px rgba(0,0,0,0.35)`,
          zIndex: 90,
          padding: "18px 16px 22px",
        }}>
          <div style={{ display: "grid", gap: 10 }}>
            {items.map(n => (
              <button key={n.key} onClick={() => handleItem(n)} style={{
                background: isActive(n) ? C.goldDark : C.bg,
                border: `1px solid ${isActive(n) ? C.gold : C.border}`,
                color: isActive(n) ? C.goldBright : C.goldLight,
                padding: "14px 16px",
                cursor: "pointer",
                fontFamily: F.heading,
                fontSize: 14, letterSpacing: 2,
                borderRadius: 4,
                textAlign: "right",
                textTransform: "uppercase",
              }}>
                {n.label}
              </button>
            ))}
            <GoldButton
              style={{ width: "100%", padding: "14px 16px", fontSize: 14, letterSpacing: 2 }}
              onClick={() => { setMenuOpen(false); onNav("checkout", COURSES[3]); }}
            >
              הרשם עכשיו
            </GoldButton>
          </div>
        </div>
      )}
    </nav>
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
      background: C.surface,
      padding: "48px 36px 32px",
      direction: "rtl",
    }}>
      <div style={{
        maxWidth: 1040, margin: "0 auto",
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: 32,
        paddingBottom: 36,
      }}>
        <div style={{ maxWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 32, width: "auto" }} />
            <div>
              <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>כי לה' המלוכה</div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 7, letterSpacing: 2 }}>SOD1820</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: F.body, lineHeight: 1.8 }}>
            צוריאל פולייס<br />sod1820.co.il
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>ניווט</div>
            {items.map(n => (
              <div key={n.key} style={{ marginBottom: 10 }}>
                <button onClick={() => handleItem(n)} style={{
                  background: "none", border: "none", color: C.goldDim,
                  cursor: "pointer", fontSize: 13, fontFamily: F.body, padding: 0,
                }}>{n.label}</button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>קורסים</div>
            {COURSES.map(c => (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <button onClick={() => onNav("detail", c)} style={{
                  background: "none", border: "none", color: C.goldDim,
                  cursor: "pointer", fontSize: 13, fontFamily: F.body, padding: 0,
                }}>{c.title}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1040, margin: "0 auto",
        paddingTop: 24, borderTop: `1px solid ${C.faint}`,
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 10
      }}>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: F.heading, letterSpacing: 3 }}>
          א↔ל &nbsp;·&nbsp; ב↔מ &nbsp;·&nbsp; ג↔נ &nbsp;·&nbsp; כ↔ת
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>
            © 2024 SOD1820 · כל הזכויות שמורות
          </div>
          {[["דוח מספרים","numbers-report"],["תצוגה מקדימה","theme-preview"],["ניהול","admin"]].map(([label, key]) => (
            <button key={key} onClick={() => onNav(key)} style={{
              background: "none", border: "none", color: C.faint,
              cursor: "pointer", fontSize: 9, fontFamily: F.heading,
              letterSpacing: 2, textTransform: "uppercase",
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
              onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
            >{label}</button>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ===== APP ROOT =====

export default function App() {
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
    setPage(p);
    if (p === "admin") {
      setSelectedPageKey(typeof data === "string" ? data : selectedPageKey || "home");
    } else if (p === "post" && data) {
      setSelectedPost(data);
    } else if (p === "number" && data) {
      setSelectedTag(data);
    } else if (data) {
      setSelectedCourse(data);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: "#f5f0e8", fontFamily: F.body, fontSize: 16, position: "relative" }}>
      {/* space background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "url(https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=20)",
        backgroundSize: "cover", backgroundPosition: "center center",
        opacity: 0.06,
      }} />

      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar page={page} onNav={nav} navItems={navItems} />
        <main>
          {page === "home"     && <Landing onNav={nav} pageContent={getPageContent("home")} adminMode={adminMode} />}
          {page === "courses"  && <CoursesPage onNav={nav} pageContent={getPageContent("courses")} adminMode={adminMode} />}
          {page === "about"    && <AboutPage onNav={nav} pageContent={getPageContent("about")} adminMode={adminMode} />}
          {page === "blog"     && <BlogPage onNav={nav} pageContent={getPageContent("blog")} adminMode={adminMode} />}
          {page === "post"     && (
            <PostPage post={selectedPost} onBack={() => nav("blog")} />
          )}
          {page === "number"   && selectedTag && (
            <NumberPage
              tag={selectedTag}
              onNav={nav}
              onBack={() => nav("blog")}
            />
          )}
          {page === "login"    && <LoginPage onNav={nav} />}
          {page === "detail"   && (
            <CourseDetailPage
              course={selectedCourse}
              onBuy={c => nav("checkout", c)}
              onBack={() => nav("courses")}
            />
          )}
          {page === "checkout"       && <CheckoutPage course={selectedCourse} onNav={nav} />}
          {page === "numbers-report" && <NumbersReportPage />}
          {page === "theme-preview"  && <ThemePreviewPage />}
          {page === "admin"          && <AdminPage
            pageContent={pageContent}
            onSavePage={savePageContent}
            selectedPageKey={selectedPageKey}
            setSelectedPageKey={setSelectedPageKey}
            setAdminMode={setAdminMode}
          />}
        </main>
        <Footer onNav={nav} navItems={navItems} />
        <NumberSidebar onNav={nav} />
      </div>
    </div>
  );
}
1
