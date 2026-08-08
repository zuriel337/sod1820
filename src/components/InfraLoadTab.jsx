import React, { useState, useEffect, useCallback } from "react";
import { F } from "../theme.js";
import { getInfraLoad } from "../lib/visits.js";

// 🩺 עומסים ותשתית — דשבורד מנהל: תנועת-גולשים יומית מול עומס-רקע שעתי (cron).
// מטרה: להראות במבט אחד שהעומס ≠ תנועת-גולשים אלא אירועי-רקע נקודתיים.
// מקור-אמת יחיד: RPC admin_infra_load (SECURITY DEFINER, אדמין-בלבד). סגנון בהיר-נקי כמו GrowthCenterTab.
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", blue: "#2f6df6", blueSoft: "rgba(47,109,246,.10)", amber: "#c26a12", amberSoft: "rgba(194,106,18,.12)", green: "#2f8f5b", red: "#c0392b" };
const nf = (n) => (n == null ? "—" : Number(n).toLocaleString("he"));

const Stat = ({ n, label, color, suffix, note, alert }) => (
  <div style={{ background: L.card, border: `1px solid ${alert ? "#e5c39a" : L.line}`, borderRadius: 14, padding: "13px 15px", minWidth: 120, textAlign: "center", flex: "1 0 120px" }}>
    <div style={{ color: color || L.ink, fontFamily: "'Courier New', monospace", fontSize: 25, fontWeight: 800, lineHeight: 1.1 }}>
      {n == null ? "—" : (typeof n === "number" ? nf(n) : n)}{suffix ? <span style={{ fontSize: 14, marginInlineStart: 3 }}>{suffix}</span> : null}
    </div>
    <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11.5, marginTop: 4 }}>{label}</div>
    {note ? <div style={{ color: alert ? L.amber : L.sub, fontFamily: F.body, fontSize: 10.5, marginTop: 4, fontWeight: alert ? 700 : 400 }}>{note}</div> : null}
  </div>
);

// חלוקה של "נחמד" למקסימום ציר
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * p; }

// גרף-עמודות יומי (כניסות) עם קו-ממוצע
function DailyBars({ data, avg }) {
  const W = 820, H = 260, mL = 40, mR = 12, mT = 16, mB = 30, pW = W - mL - mR, pH = H - mT - mB;
  const yMax = niceMax(Math.max(1, ...data.map(d => d.visits)));
  const n = data.length, slot = pW / n, bw = slot * 0.56;
  const Y = v => mT + pH - (pH * v / yMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", direction: "ltr" }} role="img" aria-label="כניסות יומיות">
      {ticks.map((t, i) => { const y = mT + pH - pH * t; return (
        <g key={i}><line x1={mL} y1={y} x2={mL + pW} y2={y} stroke={L.line} strokeWidth="1" />
        <text x={mL - 6} y={y + 3.5} textAnchor="end" fill={L.sub} fontSize="10.5" fontFamily="'Courier New',monospace">{nf(Math.round(yMax * t))}</text></g>); })}
      {data.map((d, i) => { const cx = mL + slot * i + slot / 2, h = pH * d.visits / yMax, y = Y(d.visits); return (
        <g key={i}>
          <rect x={cx - bw / 2} y={y} width={bw} height={Math.max(h, 1)} rx="4" fill={L.blue}>
            <title>{`${d.d} — כניסות ${nf(d.visits)} · אירועי-גולש ${nf(d.ve)} · חיפושים ${nf(d.searches)}`}</title>
          </rect>
          <text x={cx} y={H - 10} textAnchor="middle" fill={L.sub} fontSize="10" fontFamily="'Courier New',monospace">{d.d}</text>
        </g>); })}
      {avg != null && (<g>
        <line x1={mL} y1={Y(avg)} x2={mL + pW} y2={Y(avg)} stroke={L.gold} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85" />
        <text x={mL + pW - 2} y={Y(avg) - 5} textAnchor="end" fill={L.gold} fontSize="10.5" fontWeight="700" fontFamily="'Courier New',monospace">{`ממוצע ${nf(avg)}`}</text>
      </g>)}
    </svg>
  );
}

// גרף-קו/שטח שעתי (עומס או תנועה); מדגיש שיא כשמעבירים spikeIdx
function HourLine({ data, valueKey, color, soft, unit, spikeIdx, spikeLabel }) {
  const W = 820, H = 260, mL = 40, mR = 12, mT = 18, mB = 30, pW = W - mL - mR, pH = H - mT - mB;
  const vals = data.map(d => Number(d[valueKey]) || 0);
  const yMax = niceMax(Math.max(1, ...vals));
  const n = data.length, step = n > 1 ? pW / (n - 1) : pW;
  const X = i => mL + step * i, Y = v => mT + pH - (pH * v / yMax);
  const line = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${X(n - 1).toFixed(1)} ${mT + pH} L ${X(0).toFixed(1)} ${mT + pH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const fmtY = t => unit === "s" ? (yMax * t < 10 ? (yMax * t).toFixed(0) : nf(Math.round(yMax * t))) : nf(Math.round(yMax * t));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", direction: "ltr" }} role="img" aria-label="עומס/תנועה שעתי">
      {ticks.map((t, i) => { const y = mT + pH - pH * t; return (
        <g key={i}><line x1={mL} y1={y} x2={mL + pW} y2={y} stroke={L.line} strokeWidth="1" />
        <text x={mL - 6} y={y + 3.5} textAnchor="end" fill={L.sub} fontSize="10.5" fontFamily="'Courier New',monospace">{fmtY(t)}</text></g>); })}
      <path d={area} fill={soft} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (i % 6 === 0 || i === n - 1) ? (
        <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fill={L.sub} fontSize="9.5" fontFamily="'Courier New',monospace">{String(d.h).replace(":00", "").split(" ")[1] || d.h}</text>
      ) : null)}
      {/* נקודות-מגע שקופות ל-tooltip */}
      {data.map((d, i) => (
        <rect key={"b" + i} x={X(i) - step / 2} y={mT} width={step} height={pH} fill="transparent">
          <title>{`${d.h} — ${unit === "s" ? `עומס ${d.load_s} שנ׳` : `אירועי-גולש ${nf(d.ve)}`}`}</title>
        </rect>
      ))}
      {spikeIdx != null && spikeIdx >= 0 && (<g>
        <line x1={X(spikeIdx)} y1={Y(vals[spikeIdx])} x2={X(spikeIdx)} y2={mT + 8} stroke={L.amber} strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
        <circle cx={X(spikeIdx)} cy={Y(vals[spikeIdx])} r="4.5" fill={L.amber} stroke={L.card} strokeWidth="2" />
        <text x={X(spikeIdx) - 6} y={mT + 15} textAnchor="end" fill={L.amber} fontSize="11" fontWeight="700" fontFamily={F.body}>{spikeLabel}</text>
      </g>)}
    </svg>
  );
}

const Card = ({ title, dot, cap, children }) => (
  <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: "16px 16px 12px", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
      {dot ? <span style={{ width: 10, height: 10, borderRadius: 3, background: dot, display: "inline-block" }} /> : null}
      <h3 style={{ margin: 0, fontFamily: F.heading, fontSize: 16, fontWeight: 700, color: L.ink }}>{title}</h3>
    </div>
    {cap ? <p style={{ margin: "0 0 12px", fontFamily: F.body, fontSize: 12.5, color: L.sub, lineHeight: 1.5 }}>{cap}</p> : null}
    {children}
  </div>
);

export default function InfraLoadTab() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { const d = await getInfraLoad(10, 48); if (d && d.error) throw new Error(d.error); setData(d); }
    catch (e) { setErr(e.message || String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ fontFamily: F.body, color: L.sub, padding: 20 }}>טוען נתוני תשתית…</div>;
  if (err) return (
    <div style={{ fontFamily: F.body, color: L.red, padding: 20 }}>
      שגיאה: {err}
      <div><button onClick={load} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.soft, cursor: "pointer", fontFamily: F.body }}>נסה שוב</button></div>
    </div>
  );

  const k = (data && data.kpis) || {};
  const daily = (data && data.daily) || [];
  const hourly = (data && data.hourly) || [];
  const avg = k.avg_visits;
  const spikeIdx = hourly.reduce((mi, d, i, a) => (Number(d.load_s) > Number(a[mi].load_s) ? i : mi), 0);
  const spikeBig = Number(k.spike_load_s) > 20;
  const ratio = k.normal_load_s > 0 ? Math.round(Number(k.spike_load_s) / Number(k.normal_load_s)) : null;

  return (
    <div style={{ fontFamily: F.body, color: L.ink, maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 22, fontWeight: 800, color: L.ink }}>🩺 עומסים ותשתית</h2>
        <button onClick={load} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${L.line}`, background: L.soft, cursor: "pointer", fontFamily: F.body, fontSize: 13, color: L.sub }}>↻ רענן</button>
      </div>
      <p style={{ margin: "0 0 18px", fontFamily: F.body, fontSize: 13.5, color: L.sub, maxWidth: "62ch", lineHeight: 1.55 }}>
        תנועת-הגולשים מול עומס-הרקע על מסד-הנתונים (10 ימים / 48 שעות, שעון ישראל). המטרה: לראות במבט אחד ש<b style={{ color: L.ink }}>עומס ≠ גולשים</b> — זינוקי-עומס הם כמעט תמיד אירועי-רקע נקודתיים.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat n={avg} label="כניסות ליום (ממוצע)" note="יציב לאורך התקופה" />
        <Stat n={k.peak_visits} label="יום שיא כניסות" suffix={k.peak_day} color={L.blue} note="שיא בריא, בלי עומס" />
        <Stat n={`~${k.normal_load_s}`} label="עומס-רקע רגיל" suffix="שנ׳/שעה" color={L.green} note="זניח (crons שוטפים)" />
        <Stat n={k.spike_load_s} label={`שיא-עומס · ${k.spike_hour || ""}`} suffix="שנ׳" color={L.amber} alert={spikeBig}
              note={ratio ? `×${ratio} מהרגיל` : "החורג ביותר בחלון"} />
      </div>

      <Card title="כניסות יומיות" dot={L.blue} cap="כמה גולשים נכנסו בכל יום. הקו המקווקו = ממוצע התקופה. תנועה יציבה = אין קפיצה חריגה מהגולשים.">
        {daily.length ? <DailyBars data={daily} avg={avg} /> : <div style={{ color: L.sub, fontSize: 13 }}>אין נתונים</div>}
      </Card>

      <Card title="עומס-רקע על מסד-הנתונים" dot={L.amber} cap="שניות-ריצה של משימות-רקע (cron) בכל שעה. קו שטוח = בריא; זינוק בודד = אירוע נקודתי (פרסום כבד / גיבוי). מעבר-עכבר על נקודה מציג פירוט.">
        {hourly.length ? <HourLine data={hourly} valueKey="load_s" color={L.amber} soft={L.amberSoft} unit="s" spikeIdx={spikeBig ? spikeIdx : null} spikeLabel={`שיא ${k.spike_load_s} שנ׳`} /> : <div style={{ color: L.sub, fontSize: 13 }}>אין נתונים</div>}
      </Card>

      <Card title="תנועת-משתמשים לפי שעה" dot={L.blue} cap="אירועי-גולש בכל שעה, לאותן 48 שעות — להשוואה מול גרף-העומס. אם בשעת-זינוק-עומס התנועה רגילה → העומס לא מהגולשים.">
        {hourly.length ? <HourLine data={hourly} valueKey="ve" color={L.blue} soft={L.blueSoft} unit="n" /> : <div style={{ color: L.sub, fontSize: 13 }}>אין נתונים</div>}
      </Card>

      <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 14, padding: 16, fontSize: 13.5, lineHeight: 1.6, color: L.ink }}>
        <b style={{ fontFamily: F.heading }}>איך לקרוא:</b> כשקו-העומס (הכתום) מזנק אבל קו-התנועה (הכחול) רגיל — מדובר באירוע-רקע נקודתי, לא בלחץ-גולשים.
        עומס-רקע רגיל הוא שבריר-שנייה עד ~2 שניות בשעה. זינוק חריג = פרסום כבד שרץ בתוך ה-DB או גיבוי לילי — נקודה לבדיקה, לא תקלת-קיבולת.
      </div>
    </div>
  );
}
