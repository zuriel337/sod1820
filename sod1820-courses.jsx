import { useState } from "react";

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
    color: "#c9a227"
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
    color: "#e8a020"
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
    color: "#c9a227"
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
    color: "#e8c040"
  }
];

const TESTIMONIALS = [
  { name: "מיכל ר׳", text: "אחרי השיעור הראשון ראיתי את המספר שלי בכל מקום. זה שינה לי את החיים.", stars: 5 },
  { name: "דוד כ׳", text: "צוריאל מסביר דברים שאין להם הסבר — ועדיין מבינים הכל.", stars: 5 },
  { name: "שרה מ׳", text: "הקורס על המסתתר פתח לי ממד שלם שלא ידעתי שקיים.", stars: 5 }
];

// ===== STYLES =====
const C = {
  bg: "#080600",
  gold: "#c9a227",
  goldLight: "#e8c040",
  goldDim: "#8a6518",
  goldDark: "#3a2a00",
  surface: "#0d0a00",
  border: "#1e1600",
  text: "#c9a227",
  muted: "#5a4010",
  faint: "#2a1e00"
};

const btn = (variant = "primary") => ({
  background: variant === "primary" ? C.goldDark : "transparent",
  border: `1px solid ${variant === "primary" ? C.gold : C.goldDim}`,
  color: variant === "primary" ? C.goldLight : C.goldDim,
  padding: "12px 28px",
  cursor: "pointer",
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  borderRadius: 4,
  letterSpacing: 1,
  transition: "all 0.2s",
  fontWeight: 700
});

// ===== PAGES =====

function Landing({ onNav }) {
  return (
    <div style={{ direction: "rtl" }}>
      {/* Hero */}
      <div style={{
        minHeight: "92vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "60px 24px",
        background: `radial-gradient(ellipse at 50% 30%, #1a1200 0%, ${C.bg} 70%)`,
        position: "relative", overflow: "hidden"
      }}>
        {/* grid lines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#c9a227 1px, transparent 1px), linear-gradient(90deg, #c9a227 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: C.muted, marginBottom: 20 }}>
            SOD1820 · סוד המספרים
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 7vw, 72px)", color: C.goldLight,
            margin: "0 0 16px", lineHeight: 1.15, fontWeight: 900,
            fontFamily: "'Courier New', monospace"
          }}>
            הקוד שהסתירו
          </h1>
          <p style={{
            fontSize: 18, color: C.goldDim, maxWidth: 520,
            margin: "0 auto 36px", lineHeight: 1.8
          }}>
            גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה את המציאות מאחורי המציאות.
            למד אותה עם צוריאל פולייס.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={btn("primary")} onClick={() => onNav("courses")}>לכל הקורסים</button>
            <button style={btn("secondary")} onClick={() => onNav("login")}>כניסה לחשבון</button>
          </div>

          {/* stats */}
          <div style={{
            display: "flex", gap: 40, justifyContent: "center",
            marginTop: 60, flexWrap: "wrap"
          }}>
            {[["1820","תלמידים"],["4","שיטות"],["10+","שנות מחקר"]].map(([n,l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, color: C.goldLight, fontWeight: 900 }}>{n}</div>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Courses preview */}
      <div style={{ padding: "60px 24px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 8, textAlign: "center" }}>הקורסים</div>
        <h2 style={{ textAlign: "center", color: C.goldLight, margin: "0 0 40px", fontSize: 28 }}>בחר את הדרך שלך</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {COURSES.map(c => (
            <CourseCard key={c.id} course={c} onBuy={() => onNav("checkout", c)} />
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ padding: "40px 24px 60px", background: C.surface }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", color: C.goldLight, margin: "0 0 32px", fontSize: 22 }}>מה אומרים התלמידים</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 5, padding: "18px 20px"
              }}>
                <div style={{ color: C.gold, marginBottom: 8, fontSize: 14 }}>{"★".repeat(t.stars)}</div>
                <p style={{ color: C.goldDim, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px" }}>"{t.text}"</p>
                <div style={{ fontSize: 11, color: C.muted }}>— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, onBuy }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#0f0c00" : C.surface,
        border: `1px solid ${hov ? course.color : C.border}`,
        borderRadius: 6, padding: "22px 20px",
        transition: "all 0.2s", cursor: "pointer",
        position: "relative"
      }}
      onClick={onBuy}
    >
      {course.tag && (
        <div style={{
          position: "absolute", top: 14, left: 14,
          background: C.goldDark, border: `1px solid ${C.gold}`,
          color: C.goldLight, fontSize: 9, letterSpacing: 2,
          padding: "3px 8px", borderRadius: 2
        }}>{course.tag}</div>
      )}
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 6 }}>{course.level} · {course.lessons} שיעורים</div>
      <h3 style={{ color: C.goldLight, margin: "0 0 4px", fontSize: 18 }}>{course.title}</h3>
      <div style={{ color: C.goldDim, fontSize: 12, marginBottom: 12 }}>{course.subtitle}</div>
      <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, margin: "0 0 18px" }}>{course.desc}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22, color: C.goldLight, fontWeight: 900 }}>₪{course.price}</span>
        <span style={{ fontSize: 11, color: C.gold, letterSpacing: 1 }}>לפרטים ←</span>
      </div>
    </div>
  );
}

function CoursesPage({ onNav }) {
  return (
    <div style={{ padding: "40px 24px", maxWidth: 980, margin: "0 auto", direction: "rtl" }}>
      <div style={{ fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 6 }}>SOD1820</div>
      <h1 style={{ color: C.goldLight, margin: "0 0 8px", fontSize: 28 }}>כל הקורסים</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 36 }}>בחר את השיטה שמדברת אליך</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {COURSES.map(c => (
          <CourseCard key={c.id} course={c} onBuy={() => onNav("checkout", c)} />
        ))}
      </div>
    </div>
  );
}

function LoginPage({ onNav }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit() {
    if (email && pass) setDone(true);
  }

  if (done) return (
    <div style={{
      minHeight: "70vh", display: "flex", alignItems: "center",
      justifyContent: "center", direction: "rtl"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
        <h2 style={{ color: C.goldLight, margin: "0 0 8px" }}>ברוך הבא</h2>
        <p style={{ color: C.muted, fontSize: 13 }}>הכניסה הצליחה</p>
        <button style={{ ...btn(), marginTop: 20 }} onClick={() => onNav("courses")}>לקורסים שלי</button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "80vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, direction: "rtl"
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "36px 32px", width: "100%", maxWidth: 380
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 8 }}>SOD1820</div>
          <h2 style={{ color: C.goldLight, margin: 0, fontSize: 22 }}>
            {mode === "login" ? "כניסה לחשבון" : "הרשמה"}
          </h2>
        </div>

        <div style={{ display: "flex", gap: 0, marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          {[["login","כניסה"],["register","הרשמה"]].map(([k,v]) => (
            <button key={k} onClick={() => setMode(k)} style={{
              flex: 1, background: mode===k ? C.goldDark : "transparent",
              border: "none", color: mode===k ? C.goldLight : C.muted,
              padding: "9px 0", cursor: "pointer",
              fontFamily: "'Courier New', monospace", fontSize: 12
            }}>{v}</button>
          ))}
        </div>

        <Field label="אימייל" value={email} onChange={setEmail} type="email" />
        <Field label="סיסמה" value={pass} onChange={setPass} type="password" />

        {mode === "register" && <Field label="שם מלא" value="" onChange={() => {}} />}

        <button style={{ ...btn(), width: "100%", marginTop: 8, textAlign: "center" }} onClick={handleSubmit}>
          {mode === "login" ? "כניסה" : "יצירת חשבון"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            {mode === "login" ? "אין לך חשבון? " : "כבר רשום? "}
          </span>
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{
            background: "none", border: "none", color: C.goldDim,
            cursor: "pointer", fontSize: 11, fontFamily: "'Courier New', monospace"
          }}>{mode === "login" ? "הרשמה" : "כניסה"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 5 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: C.bg, border: `1px solid ${C.border}`,
          color: C.goldLight, padding: "10px 12px", fontSize: 14,
          fontFamily: "'Courier New', monospace", borderRadius: 3,
          outline: "none", boxSizing: "border-box", direction: "ltr"
        }}
      />
    </div>
  );
}

function CheckoutPage({ course, onNav }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [done, setDone] = useState(false);

  if (!course) return (
    <div style={{ padding: 40, textAlign: "center", direction: "rtl" }}>
      <p style={{ color: C.muted }}>לא נבחר קורס</p>
      <button style={btn()} onClick={() => onNav("courses")}>לקורסים</button>
    </div>
  );

  if (done) return (
    <div style={{
      minHeight: "70vh", display: "flex", alignItems: "center",
      justifyContent: "center", direction: "rtl"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: C.goldLight }}>✦</div>
        <h2 style={{ color: C.goldLight, margin: "0 0 8px" }}>התשלום התקבל!</h2>
        <p style={{ color: C.muted, fontSize: 13 }}>הקורס "{course.title}" מחכה לך</p>
        <button style={{ ...btn(), marginTop: 20 }} onClick={() => onNav("courses")}>לקורסים שלי</button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "80vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, direction: "rtl"
    }}>
      <div style={{ width: "100%", maxWidth: 820, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Order summary */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "28px 24px", alignSelf: "start"
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, marginBottom: 16 }}>סיכום הזמנה</div>
          <h3 style={{ color: C.goldLight, margin: "0 0 6px", fontSize: 18 }}>{course.title}</h3>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>{course.lessons} שיעורים · {course.level}</div>
          <div style={{
            borderTop: `1px solid ${C.border}`, paddingTop: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ color: C.muted, fontSize: 13 }}>סה״כ לתשלום</span>
            <span style={{ fontSize: 24, color: C.goldLight, fontWeight: 900 }}>₪{course.price}</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: C.faint, lineHeight: 1.8 }}>
            ✓ גישה מיידית<br />
            ✓ צפייה ללא הגבלה<br />
            ✓ עדכונים לנצח<br />
            ✓ תמיכה ישירה
          </div>
        </div>

        {/* Payment form */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "28px 24px"
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, marginBottom: 20 }}>פרטי תשלום</div>

          <Field label="אימייל" value={email} onChange={setEmail} type="email" />

          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 5, marginTop: 4 }}>מספר כרטיס</div>
          <input
            value={card}
            onChange={e => setCard(e.target.value.replace(/\D/g,'').slice(0,16))}
            placeholder="1234 5678 9012 3456"
            style={{
              width: "100%", background: C.bg, border: `1px solid ${C.border}`,
              color: C.goldLight, padding: "10px 12px", fontSize: 14,
              fontFamily: "'Courier New', monospace", borderRadius: 3,
              outline: "none", boxSizing: "border-box", direction: "ltr",
              marginBottom: 14
            }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 5 }}>תוקף</div>
              <input
                value={expiry}
                onChange={e => setExpiry(e.target.value.slice(0,5))}
                placeholder="MM/YY"
                style={{
                  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                  color: C.goldLight, padding: "10px 12px", fontSize: 14,
                  fontFamily: "'Courier New', monospace", borderRadius: 3,
                  outline: "none", boxSizing: "border-box", direction: "ltr"
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 5 }}>CVV</div>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value.slice(0,3))}
                placeholder="123"
                style={{
                  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                  color: C.goldLight, padding: "10px 12px", fontSize: 14,
                  fontFamily: "'Courier New', monospace", borderRadius: 3,
                  outline: "none", boxSizing: "border-box", direction: "ltr"
                }}
              />
            </div>
          </div>

          <button
            style={{ ...btn(), width: "100%", marginTop: 20, textAlign: "center", fontSize: 14, padding: "14px" }}
            onClick={() => { if (email && card.length === 16 && cvv.length === 3) setDone(true); }}
          >
            לתשלום · ₪{course.price}
          </button>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: C.faint }}>
            🔒 תשלום מאובטח · SSL
          </div>
        </div>

      </div>
    </div>
  );
}

// ===== NAV + APP =====
const NAV_ITEMS = [
  { key: "home", label: "ראשי" },
  { key: "courses", label: "קורסים" },
  { key: "login", label: "כניסה" }
];

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function nav(p, course = null) {
    setPage(p);
    if (course) setSelectedCourse(course);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Courier New', monospace" }}>

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,6,0,0.95)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56, direction: "rtl"
      }}>
        <button onClick={() => nav("home")} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Courier New', monospace", color: C.goldLight,
          fontSize: 16, fontWeight: 900, letterSpacing: 2
        }}>SOD1820</button>

        <div style={{ display: "flex", gap: 4 }}>
          {NAV_ITEMS.map(n => (
            <button key={n.key} onClick={() => nav(n.key)} style={{
              background: page === n.key ? C.goldDark : "none",
              border: "none", color: page === n.key ? C.goldLight : C.muted,
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "'Courier New', monospace", fontSize: 12,
              borderRadius: 3
            }}>{n.label}</button>
          ))}
          <button style={{ ...btn("primary"), padding: "6px 16px", fontSize: 11 }} onClick={() => nav("checkout", COURSES[3])}>
            הרשם עכשיו
          </button>
        </div>
      </nav>

      {/* Pages */}
      {page === "home" && <Landing onNav={nav} />}
      {page === "courses" && <CoursesPage onNav={nav} />}
      {page === "login" && <LoginPage onNav={nav} />}
      {page === "checkout" && <CheckoutPage course={selectedCourse} onNav={nav} />}

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: "24px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        direction: "rtl", flexWrap: "wrap", gap: 12
      }}>
        <div style={{ fontSize: 12, color: C.muted }}>SOD1820 · צוריאל פולייס · sod1820.co.il</div>
        <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2 }}>
          א↔ל · ב↔מ · ג↔נ · כ↔ת
        </div>
      </footer>
    </div>
  );
}
