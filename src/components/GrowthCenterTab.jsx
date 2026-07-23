import React, { useState, useEffect, useCallback } from "react";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { getGrowthCenter, getGaInsights } from "../lib/visits.js";
import { CLARITY_CONFIGURED, clarityUrl } from "../lib/clarity.js";

// 📈 מרכז הצמיחה — דשבורד-על אחד (Meta Growth OS) על events + subscribers + email_events.
// מקטעים: ⚡ זמן-אמת · ✉️ מייל ומנויים · 🚪 משפך-וולקום · 🌐 מקורות-הגעה מתויגים · 🔗 לולאת-שיתוף.
// אדמין-בלבד דרך RPC admin_growth_center (SECURITY DEFINER). סגנון בהיר-נקי כמו ElsStatsTab.
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", blue: "#2f6df6", green: "#2f8f5b", purple: "#7c4dff", red: "#c0392b", amber: "#b7791f" };

// מיפוי תגית-מקור → תווית + צבע ידידותיים (שאר התגיות = דומיין גולמי)
const TAGS = {
  "nl": ["📧 ניוזלטר (לחיצה)", L.green], "nl-share": ["📧 ניוזלטר (שיתוף)", L.green], "nl-fwd": ["📧 ניוזלטר (מיוחזר)", L.green],
  "ig": ["📸 אינסטגרם", L.purple], "ig-squid": ["📸 אינסטגרם", L.purple],
  "fb-code": ["👍 פייסבוק · קוד", L.blue], "fb-meluha": ["👍 פייסבוק · מלוכה", L.blue], "facebook": ["👍 פייסבוק", L.blue],
  "whatsapp": ["🟢 וואטסאפ", L.green], "wa": ["🟢 וואטסאפ", L.green], "wa-vip": ["🟢 וואטסאפ VIP", L.green],
  "share": ["🔗 שיתוף", L.amber], "raziel": ["🤖 רזיאל (בוט)", L.amber],
  "google": ["🔍 גוגל", L.sub], "ישיר": ["➡️ ישיר", L.sub], "spotim": ["💬 תגובות", L.sub],
  "code": ["🔠 צופן", L.purple], "els-artifact": ["🔠 צופן (Artifact)", L.purple], "chatgpt.com": ["🤖 ChatGPT", L.green],
};
const tagInfo = (t) => TAGS[t] || [t, L.sub];
const isCampaign = (t) => /^(nl|ig|fb|wa|share|raziel|code|els)/.test(t || "");

const Stat = ({ n, label, color, suffix, hint }) => (
  <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 14, padding: "13px 15px", minWidth: 104, textAlign: "center", flex: "1 0 104px" }} title={hint || ""}>
    <div style={{ color: color || L.ink, fontFamily: "'Courier New', monospace", fontSize: 25, fontWeight: 800, lineHeight: 1.1 }}>
      {n == null ? "—" : (typeof n === "number" ? n.toLocaleString("he") : n)}{suffix ? <span style={{ fontSize: 15 }}>{suffix}</span> : null}
    </div>
    <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11.5, marginTop: 3 }}>{label}</div>
  </div>
);

// גרף-עמודות מיני
function Bars({ data, color = L.blue, fmt = x => x, height = 78 }) {
  const max = Math.max(1, ...data.map(d => d.n));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, overflowX: "auto", paddingBottom: 2 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 15 }} title={`${fmt(d.d)}: ${d.n}`}>
          <span style={{ color: L.sub, fontFamily: "'Courier New',monospace", fontSize: 9 }}>{d.n || ""}</span>
          <div style={{ width: 12, height: `${Math.round((d.n / max) * (height - 28))}px`, minHeight: d.n ? 3 : 0, background: color, borderRadius: "3px 3px 0 0" }} />
          <span style={{ color: L.sub, fontFamily: F.body, fontSize: 8.5, whiteSpace: "nowrap", transform: "rotate(-45deg)", transformOrigin: "center", marginTop: 3 }}>{fmt(d.d)}</span>
        </div>
      ))}
    </div>
  );
}

// רשימת-פילוח קומפקטית ל-GA4 ({key, users|value})
function GaMini({ title, items }) {
  const rows = (items || []).slice(0, 6).map(it => ({ k: it.key ?? it.name ?? "?", v: it.users ?? it.value ?? it.sessions ?? 0 }));
  const max = Math.max(1, ...rows.map(r => r.v));
  if (rows.length === 0) return null;
  return (
    <div>
      <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 5 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 84, color: L.ink, fontFamily: F.body, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} dir="ltr" title={r.k}>{r.k}</div>
            <div style={{ flex: 1, background: "#edf1fb", borderRadius: 6, height: 15, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(4, Math.round((r.v / max) * 100))}%`, height: "100%", background: L.blue, borderRadius: 6 }} />
            </div>
            <div style={{ width: 44, color: L.blue, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 700, textAlign: "start" }}>{r.v.toLocaleString("he")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Panel = ({ title, children, right }) => (
  <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 11 }}>
      <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>{title}</div>
      {right}
    </div>
    {children}
  </div>
);

// שורת-משפך אופקית (label · value · bar ביחס למקסימום)
function FunnelRow({ label, n, max, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <div style={{ width: 130, color: L.ink, fontFamily: F.body, fontSize: 13, textAlign: "start" }}>{label}</div>
      <div style={{ flex: 1, background: "#f0ebdd", borderRadius: 8, height: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(3, Math.round((n / Math.max(1, max)) * 100))}%`, height: "100%", background: color, borderRadius: 8 }} />
        <span style={{ position: "absolute", insetInlineStart: 8, top: 0, lineHeight: "22px", color: L.ink, fontFamily: "'Courier New',monospace", fontSize: 12.5, fontWeight: 800 }}>{(n || 0).toLocaleString("he")}</span>
      </div>
    </div>
  );
}

// שורת-השוואה במקטע «מדידה כנה»
function CmpRow({ icon, label, n, note, color, big }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${L.line}` }}>
      <div style={{ width: big ? 200 : 210, display: "flex", alignItems: "center", gap: 7, color: L.ink, fontFamily: F.body, fontSize: big ? 14 : 13, fontWeight: big ? 800 : 500 }}>
        <span style={{ fontSize: big ? 18 : 15 }}>{icon}</span>{label}
      </div>
      <div style={{ color: color || L.ink, fontFamily: "'Courier New',monospace", fontSize: big ? 24 : 17, fontWeight: 800, minWidth: 78, textAlign: "start" }}>
        {n == null ? "—" : n.toLocaleString("he")}
      </div>
      <div style={{ flex: 1, color: L.sub, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

export default function GrowthCenterTab() {
  const [d, setD] = useState(null);
  const [ga, setGa] = useState(undefined); // undefined=טוען · null=לא זמין · object=נתונים
  const [days, setDays] = useState(7);
  const [err, setErr] = useState(null); // null=אין · 'forbidden' · 'error'
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    let live = true;
    setErr(null); setRefreshing(true);
    getGrowthCenter(days)
      .then(res => { if (live) { if (res && res.error === "forbidden") setErr("forbidden"); else if (!res) setErr("error"); else setD(res); } })
      .catch(() => { if (live) setErr("error"); })
      .finally(() => { if (live) setRefreshing(false); });
    // GA4 — עצמאי; כישלון/אי-חיבור לא שובר את הטאב
    setGa(undefined);
    getGaInsights(days)
      .then(res => { if (live) setGa(res && res.configured !== false && !res.error ? res : null); })
      .catch(() => { if (live) setGa(null); });
    return () => { live = false; };
  }, [days]);

  useEffect(() => { setD(null); const stop = load(); return stop; }, [load]);

  const selector = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select value={days} onChange={e => setDays(+e.target.value)} style={{ fontFamily: F.body, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.card, color: L.ink }}>
        <option value={1}>24 שעות</option><option value={7}>7 ימים</option><option value={30}>30 יום</option><option value={90}>90 יום</option>
      </select>
      <button onClick={load} disabled={refreshing} style={{ fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.card, color: L.gold, cursor: refreshing ? "default" : "pointer", opacity: refreshing ? 0.5 : 1 }}>
        {refreshing ? "…" : "↻ רענן"}
      </button>
    </div>
  );

  if (err === "forbidden") return (
    <div style={{ color: L.red, fontFamily: F.body, padding: 20, lineHeight: 1.8 }}>
      🔒 נדרשת הרשאת אדמין. ודא שאתה מחובר מ<b>חשבון האדמין</b> (yosiviner7@gmail.com) — בחשבונות הבדיקה האחרים זה חסום בכוונה.
    </div>
  );
  if (err === "error") return (
    <div style={{ color: L.red, fontFamily: F.body, padding: 20, lineHeight: 1.8 }}>
      ⚠️ שגיאה בטעינת מרכז הצמיחה (רשת / זמן-תגובה). <button onClick={load} style={{ color: L.blue, background: "none", border: "none", cursor: "pointer", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>↻ נסה שוב</button> · או בחר טווח קצר יותר (7 ימים).
    </div>
  );
  if (d === null) return <div style={{ color: L.sub, fontFamily: F.body, padding: 20 }}>טוען את מרכז הצמיחה… <span style={{ fontSize: 11 }}>(עד כמה שניות בטווחים ארוכים)</span></div>;

  const meas = d.measurement || null;
  const email = d.email || {}, k = email.kpis || {};
  const funnel = d.funnel || {}, con = funnel.concierge || {};
  const acq = d.acquisition || [], sharing = d.sharing || {}, rt = d.realtime || {};
  const signup = email.signup_series || [], opens = email.opens_series || [];
  const bySource = email.by_source || [], recent = email.recent_subs || [], campaigns = email.campaigns || [];
  const cta = funnel.welcome_cta || [], byPlat = sharing.by_platform || [];

  const growthColor = k.growth_pct == null ? L.sub : k.growth_pct >= 0 ? L.green : L.red;
  const growthTxt = k.growth_pct == null ? "—" : `${k.growth_pct >= 0 ? "▲" : "▼"} ${Math.abs(k.growth_pct)}%`;
  const funnelMax = Math.max(funnel.welcome_views || 0, funnel.join_views || 0, 1);
  const campaignRows = acq.filter(x => isCampaign(x.src));

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, margin: 0, flex: 1, minWidth: 220 }}>
          📈 <b style={{ color: L.ink }}>מרכז הצמיחה</b> — מייל · מנויים · משפך-וולקום · מאיפה מגיעים · לולאת-שיתוף · זמן-אמת.
        </p>
        {selector}
      </div>

      {/* ⚡ זמן-אמת */}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat n={rt.visitors_15m} label="🟢 גולשים עכשיו (15 ד׳)" color={L.green} hint="מבקרים ייחודיים ב-15 הדקות האחרונות · בלי בוטים" />
        <Stat n={rt.views_15m} label="צפיות (15 ד׳)" color={L.blue} />
        <Stat n={rt.today_visitors} label="גולשים היום" color={L.gold} />
        {ga && <Stat n={ga.realtime} label="🔵 GA4 · כעת באתר" color={L.blue} hint="ספירת זמן-אמת של גוגל" />}
      </div>

      {/* 🎯 מדידה כנה — יישור המקורות */}
      {meas && (() => {
        const ev = meas.events || {}, sv = meas.site_visits || {};
        const humanPeople = sv.visitors_human, gaUsers = ga?.totals?.users;
        const people = [gaUsers, humanPeople].filter(x => x != null); // טווח «אנשים» — אותה יחידה בלבד
        const lo = people.length ? Math.min(...people) : null;
        const hi = people.length ? Math.max(...people) : null;
        return (
          <Panel title={`🎯 מדידה כנה — כמה באמת נכנסו (${d.meta?.days} י׳)`}>
            <div style={{ background: "#eef6ef", border: `1px solid ${L.green}44`, borderRadius: 12, padding: "12px 15px", marginBottom: 14 }}>
              <div style={{ color: L.ink, fontFamily: F.heading, fontSize: 15, fontWeight: 800, marginBottom: 3 }}>
                האמת שלך: בערך <span style={{ color: L.green }}>{lo != null && hi != null && lo !== hi ? `${lo.toLocaleString("he")}–${hi.toLocaleString("he")}` : (humanPeople ?? "—").toLocaleString?.("he")}</span> אנשים אמיתיים
              </div>
              <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>
                המספר האמיתי נמצא בין <b>GA4</b> (שמרני — חוסמי-פרסומות מסתירים ממנו גולשים) לבין <b>הספירה הפנימית</b> (נדיבה — סינון-הבוטים לא מושלם). כל המספרים בטאב הזה כבר <b>מסוננים מבוטים</b>.
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              <CmpRow icon="👥" label="אנשים אמיתיים (פנימי)" n={sv.visitors_human} color={L.green} big
                note="עוגייה, בלי בוטים · הכי קרוב ל«בן-אדם» — זה המספר לתלות בו" />
              {ga
                ? <CmpRow icon="🔵" label="GA4 · משתמשים" n={ga.totals?.users} color={L.blue} big
                    note="ספירת גוגל (מסננת בוטים) · שמרנית — חוסמי-פרסומות לא נספרים" />
                : <CmpRow icon="🔵" label="GA4 · משתמשים" n={null} color={L.sub} note={ga === undefined ? "טוען מ-Google Analytics…" : "GA4 לא מחובר / לא זמין כרגע"} />}
              <CmpRow icon="🔄" label="סשנים אנושיים (פנימי)" n={ev.sessions_human} color={L.purple}
                note="ביקור בודד · אדם אחד = כמה סשנים לאורך התקופה" />
              <CmpRow icon="🔵" label="GA4 · הפעלות" n={ga?.totals?.sessions} color={L.blue} note="הפעלות לפי גוגל" />
              <CmpRow icon="📄" label="צפיות-עמוד אנושיות" n={ev.views_human} color={L.ink}
                note="כמה עמודים נצפו בפועל (אדם אחד גולש כמה עמודים)" />
              <CmpRow icon="🔵" label="GA4 · צפיות בדפים" n={ga?.totals?.views} color={L.blue} note="צפיות לפי גוגל" />
              <CmpRow icon="🤖" label="בוטים שסוננו" n={ev.bots} color={L.red}
                note={`${ev.bot_pct}% מהתנועה הגולמית = בוטים/סורקים · לא נספרים כאנשים`} />
              <CmpRow icon="📊" label="הכל כולל בוטים" n={ev.total} color={L.sub}
                note="← זה מה שנראה «כפול». כל מדד שלא מסנן בוטים מנפח את המספר" />
            </div>

            <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 12, padding: "12px 15px", marginTop: 10 }}>
              <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 7 }}>למה היו לך מספרים שונים ⬇</div>
              <div style={{ color: L.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.85 }}>
                <div>🤖 <b>בוטים:</b> {ev.bot_pct}% מהתנועה הגולמית = סורקים. מדד שלא מסנן אותם מציג ~פי {(ev.total && ev.humans ? (ev.total / Math.max(1, ev.humans)).toFixed(1) : "1.7")} יותר.</div>
                <div>📏 <b>יחידות:</b> «צפיות/כניסות» ≠ «מבקרים». אדם אחד שגולש 4 עמודים = <b>1 מבקר</b> אבל <b>4 צפיות</b>.</div>
                <div>🍪 <b>עוגייה מול סשן:</b> הספירה הפנימית של «אנשים» מאחדת ימים לפי עוגייה; «סשנים» סופר כל ביקור בנפרד — לכן גבוה יותר.</div>
                <div>✅ <b>בטאב הזה:</b> הכול כבר אנושי-בלבד (בוטים מסוננים) — אז אין יותר «חגיגה», יש מספר אחד לעקוב אחריו.</div>
              </div>
            </div>
          </Panel>
        );
      })()}

      {/* 🔵 GA4 — פילוח משלים */}
      {ga && (
        <Panel title="🔵 Google Analytics — פילוח (מסונן-בוטים ע״י גוגל)" right={<span style={{ color: L.sub, fontFamily: F.body, fontSize: 11 }}>מעורבות {ga.totals?.engagementRate != null ? Math.round(ga.totals.engagementRate * (ga.totals.engagementRate <= 1 ? 100 : 1)) + "%" : "—"}</span>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
            <GaMini title="🔗 ערוצי תנועה" items={ga.channels} />
            <GaMini title="🌐 מקורות" items={ga.sources} />
            <GaMini title="📱 מכשירים" items={ga.devices} />
            <GaMini title="🌍 מדינות" items={ga.countries} />
          </div>
        </Panel>
      )}

      {/* 🎥 הקלטות-סשן — Microsoft Clarity */}
      {CLARITY_CONFIGURED && (
        <Panel title="🎥 הקלטות-סשן ומפות-חום — Microsoft Clarity"
          right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: L.green, fontFamily: F.body, fontSize: 11.5, fontWeight: 700 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: L.green, boxShadow: `0 0 6px ${L.green}` }} />מקליט חי</span>}>
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65, marginBottom: 12 }}>
            רואים <b style={{ color: L.ink }}>בעיניים</b> מה גולשים אמיתיים עושים — היכן הם עוצרים, לוחצים, מתייאשים (rage-clicks) ואיפה עוזבים. Clarity מסנן בוטים בעצמו, אז זו עוד זווית על <b>התנועה האנושית</b>. הדשבורד נפתח בלשונית חדשה (לא ניתן להטמעה).
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              ["🎥 צפייה בהקלטות", "impressions", L.purple, "כל סשן כסרטון — לצפות במסע האמיתי"],
              ["🔥 מפות-חום", "heatmaps", L.red, "היכן לוחצים / גוללים בכל עמוד"],
              ["📊 דשבורד Clarity", "dashboard", L.blue, "rage-clicks · dead-clicks · scroll · שגיאות"],
            ].map(([label, view, col, sub]) => (
              <a key={view} href={clarityUrl(view)} target="_blank" rel="noopener noreferrer"
                style={{ flex: "1 1 190px", textDecoration: "none", background: L.card, border: `1px solid ${col}44`, borderRadius: 14, padding: "14px 16px", display: "block" }}>
                <div style={{ color: col, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>{label} ←</div>
                <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
              </a>
            ))}
          </div>
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11, marginTop: 11, lineHeight: 1.6 }}>
            💡 טיפ: בתוך Clarity אפשר לסנן הקלטות לפי דף (למשל <code>/welcome</code>), לפי מכשיר, ולפי אירועים כמו rage-click — כדי לראות בדיוק איפה נתקעים.
          </div>
        </Panel>
      )}

      {/* ✉️ מייל ומנויים */}
      <Panel title="✉️ מייל ומנויים">
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
          <Stat n={k.subs_total} label="סה״כ מנויים" color={L.ink} />
          <Stat n={k.subs_active} label="פעילים" color={L.green} />
          <Stat n={k.subs_unsub} label="הוסרו" color={L.red} hint="active=false — כולל רשימת-הישנה" />
          <Stat n={k.new_period} label={`נרשמו (${d.meta?.days} י׳)`} color={L.blue} />
          <Stat n={growthTxt} label="מול תקופה קודמת" color={growthColor} hint={`תקופה קודמת: ${k.new_prev ?? 0}`} />
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <Stat n={k.welcome_sent} label="מיילי-פתיחה שנשלחו" color={L.amber} hint="ספירה אמיתית — כל מייל-פתיחה שיצא בפועל לנרשם חדש (מאז שהאוטומציה עלתה)" />
          <Stat n={k.welcome_unique_opens} label="פתחו מייל-פתיחה" color={L.green} hint="ייחודיים · נמדד מפיקסל email-open" />
          <Stat n={k.welcome_open_rate} suffix={k.welcome_open_rate == null ? "" : "%"} label="שיעור פתיחה" color={L.purple} hint="פתיחות ייחודיות ÷ מיילים שנשלחו בפועל" />
          <Stat n={k.campaigns_sent} label="דיוור המוני" color={L.sub} hint="סה״כ נמענים מקמפיינים ידניים (טרם נשלח)" />
        </div>
        <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11, marginTop: 10, lineHeight: 1.6, background: "#fbf7ec", border: `1px solid ${L.line}`, borderRadius: 10, padding: "8px 12px" }}>
          ℹ️ <b>הבהרה:</b> אלה מיילי-<b>פתיחה אוטומטיים</b> שיוצאים לכל נרשם חדש — לא דיוור המוני. «דיוור המוני» = 0 כי מעולם לא נשלח כזה. הספירה אמיתית (מרגע שהאוטומציה עלתה), אז תגדל כשיירשמו אנשים חדשים.
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {signup.length > 0 && <Panel title={`📈 הרשמות ליום (${d.meta?.days} י׳)`}><Bars data={signup} color={L.gold} /></Panel>}
        {opens.some(x => x.n > 0)
          ? <Panel title="📬 פתיחות מייל-פתיחה ליום"><Bars data={opens} color={L.green} /></Panel>
          : <Panel title="📬 פתיחות מייל-פתיחה"><div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>עדיין אין פתיחות מתועדות. הפיקסל (<code>email-open</code>) התחיל למדוד מהרגע שהאוטומציה עלתה — הנתונים יצטברו ככל שנרשמים חדשים יפתחו את המייל.</div></Panel>}
      </div>

      {/* 🚪 משפך-וולקום */}
      <Panel title="🚪 משפך-וולקום ואונבורדינג">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <div>
            <FunnelRow label="👀 צפו בדף /welcome" n={funnel.welcome_views} max={funnelMax} color={L.blue} />
            <FunnelRow label="🧍 מבקרים ייחודיים" n={funnel.welcome_visitors} max={funnelMax} color={L.purple} />
            <FunnelRow label="👆 לחצו על קישור" n={funnel.welcome_clicks} max={funnelMax} color={L.green} />
            <FunnelRow label="👥 צפו בדף /join" n={funnel.join_views} max={funnelMax} color={L.amber} />
            <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
              <Stat n={con.quick} label="קונסיירז׳ · כפתור" color={L.blue} />
              <Stat n={con.ask} label="קונסיירז׳ · שאלת-AI" color={L.purple} />
              <Stat n={funnel.start_views} label="צפיות /start" color={L.sub} />
            </div>
          </div>
          <div>
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginBottom: 8 }}>👆 לחיצות לפי כפתור בדף /welcome:</div>
            {cta.length === 0
              ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין לחיצות מתועדות (הדף עלה זה עתה — יצטבר בקרוב).</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {cta.map((c, i) => (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 12px" }}>
                      <span style={{ color: L.ink, fontFamily: F.body, fontSize: 12.5, fontWeight: 600 }} dir="ltr">{c.cta}</span>
                      <span style={{ background: "#eef3ff", color: L.blue, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{c.n}</span>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      </Panel>

      {/* 🌐 מקורות-הגעה */}
      <Panel title={`🌐 מאיפה מגיעים (${d.meta?.days} י׳) — מסומן ✦ = ערוץ מתויג שלנו`}>
        {campaignRows.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginBottom: 7 }}>✦ הערוצים המתויגים שלנו (מדיד = הקמפיינים עובדים):</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {campaignRows.map((x, i) => {
                const [lbl, col] = tagInfo(x.src);
                return (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: L.card, border: `1px solid ${col}44`, borderRadius: 12, padding: "7px 12px" }}>
                    <span style={{ color: col, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>{lbl}</span>
                    <span style={{ color: L.ink, fontFamily: "'Courier New',monospace", fontSize: 13, fontWeight: 800 }}>{x.visitors}</span>
                    <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11 }}>גולשים · {x.hits} כניסות</span>
                    {x.today > 0 && <span style={{ background: "#eafaf0", color: L.green, fontFamily: F.body, fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "1px 8px" }}>היום {x.today}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13 }}>
            <thead><tr style={{ color: L.sub, textAlign: "start" }}>
              <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>מקור</th>
              <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>גולשים</th>
              <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>כניסות</th>
              <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>היום</th>
            </tr></thead>
            <tbody>
              {acq.slice(0, 20).map((x, i) => {
                const [lbl, col] = tagInfo(x.src);
                const tagged = isCampaign(x.src);
                return (
                  <tr key={i}>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, color: tagged ? col : L.ink, fontWeight: tagged ? 700 : 400 }}>{tagged ? "✦ " : ""}{lbl}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace", fontWeight: 700 }}>{(x.visitors || 0).toLocaleString("he")}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace", color: L.sub }}>{(x.hits || 0).toLocaleString("he")}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace", color: x.today > 0 ? L.green : L.sub }}>{x.today || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* 🔗 לולאת-שיתוף */}
        <Panel title="🔗 לולאת-שיתוף והפניות">
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 12 }}>
            <Stat n={sharing.shares_total} label="שיתופים בתקופה" color={L.amber} />
            <Stat n={sharing.referrals_period} label="הפניות (הרשמות)" color={L.green} hint={`סה״כ אי-פעם: ${sharing.referrals_total ?? 0}`} />
            <Stat n={sharing.referral_credits} label="קרדיטי-הפניה" color={L.purple} />
          </div>
          {byPlat.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {byPlat.map((p, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "4px 6px 4px 11px" }}>
                  <span style={{ color: L.ink, fontFamily: F.body, fontSize: 12.5 }}>{p.platform}</span>
                  <span style={{ background: "#fdf5e3", color: L.amber, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 8px" }}>{p.n}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* מקורות-הרשמה */}
        <Panel title="🎯 מאיפה נרשמו לניוזלטר">
          {bySource.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין.</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {bySource.map((s, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 13px" }}>
                  <span style={{ color: L.ink, fontFamily: F.body, fontSize: 12.5, fontWeight: 600 }} dir="ltr">{s.source}</span>
                  <span style={{ background: "#eafaf0", color: L.green, fontFamily: "'Courier New',monospace", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{s.n}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* קמפיינים אחרונים */}
      {campaigns.length > 0 && (
        <Panel title="📮 דיוורים אחרונים">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13 }}>
              <thead><tr style={{ color: L.sub }}>
                <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>נושא</th>
                <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>נמענים</th>
                <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>נשלח</th>
                <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>נכשל</th>
                <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: `1px solid ${L.line}` }}>מתי</th>
              </tr></thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, color: L.ink, fontWeight: 600 }}>{c.subject}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace" }}>{c.recipients}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace", color: L.green }}>{c.sent}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, fontFamily: "'Courier New',monospace", color: c.failed ? L.red : L.sub }}>{c.failed}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${L.line}`, color: L.sub, fontSize: 11.5 }}>{c.created_at ? timeAgoHe(c.created_at) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* נרשמים אחרונים */}
      <Panel title="🕒 נרשמים אחרונים">
        <div style={{ display: "grid", gap: 6 }}>
          {recent.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין עדיין.</div> : recent.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontFamily: F.body, fontSize: 13 }}>
              <span style={{ color: L.ink, fontFamily: "'Courier New',monospace" }} dir="ltr">✉ {r.email}</span>
              {r.source && <span style={{ color: L.blue, fontSize: 11.5 }} dir="ltr">{r.source}</span>}
              <span style={{ color: L.sub, fontSize: 11, marginInlineStart: "auto" }}>{r.created_at ? timeAgoHe(r.created_at) : ""}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11, textAlign: "center", marginTop: 4 }}>
        עודכן {d.meta?.generated_at ? timeAgoHe(d.meta.generated_at) : "עכשיו"} · מקור: events · subscribers · email_events
      </div>
    </div>
  );
}
