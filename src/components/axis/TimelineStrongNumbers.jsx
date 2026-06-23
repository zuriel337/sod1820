import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { getRealityHints } from "../../lib/supabase.js";
import { computePulse } from "../../lib/reality.js";

// ===== המספרים החזקים לאורך הציר — גרף צד (דסקטופ רחב בלבד) =====
// משולב עם ציר ההתגלות: עמודות אנכיות של המספרים החיים ביותר מזרם המציאות
// (אותו מקור — src/lib/reality.js). כל עמודה מקשרת לדף המספר הקנוני (/number/:n).
// תמיד כהה — תואם לרקע הקבוע של עמוד הציר. מוסתר בנייד/טאבלט.

const TOP = 12;

export default function TimelineStrongNumbers() {
  const [hints, setHints] = useState(null);

  useEffect(() => {
    getRealityHints(1000).then(r => setHints(r || [])).catch(() => setHints([]));
  }, []);

  const rows = useMemo(() => {
    if (!hints?.length) return [];
    const pulse = computePulse(hints);
    const base = (pulse.hotScore?.length ? pulse.hotScore : pulse.hotAll) || [];
    return base.slice(0, TOP);
  }, [hints]);

  if (!rows.length) return null;
  const max = Math.max(...rows.map(r => r.all || 0), 1);

  return (
    <div className="tsn-rail" aria-label="המספרים החזקים בזרם המציאות">
      <style>{`
        .tsn-rail { display:none; }
        @media (min-width:1380px){ .tsn-rail{ display:block; position:fixed; top:50%; right:14px; transform:translateY(-50%);
          width:172px; z-index:40; direction:rtl; } }
        .tsn-card { background:rgba(10,7,16,0.92); border:1px solid ${C.borderGold}; border-radius:14px; padding:13px 13px 11px;
          box-shadow:0 10px 36px rgba(0,0,0,0.55); backdrop-filter:blur(6px); }
        .tsn-title { color:${C.goldBright}; font-family:${F.heading}; font-size:11px; letter-spacing:1.5; font-weight:800; text-align:center; margin-bottom:3px; }
        .tsn-sub { color:${C.muted}; font-family:${F.heading}; font-size:9.5px; text-align:center; margin-bottom:11px; }
        .tsn-row { display:block; text-decoration:none; margin-bottom:8px; }
        .tsn-row:last-child { margin-bottom:0; }
        .tsn-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:2px; }
        .tsn-val { color:${C.goldLight}; font-family:${F.mono}; font-size:13px; font-weight:800; }
        .tsn-row:hover .tsn-val { color:${C.goldBright}; }
        .tsn-cnt { color:${C.muted}; font-family:${F.mono}; font-size:10px; }
        .tsn-bar { height:6px; border-radius:999px; background:rgba(212,175,55,0.12); overflow:hidden; }
        .tsn-fill { height:100%; border-radius:999px; background:linear-gradient(90deg, ${C.gold}, #8458ff);
          transition:width .6s cubic-bezier(.2,.7,.3,1); }
      `}</style>
      <div className="tsn-card">
        <div className="tsn-title">🔥 מספרים חזקים</div>
        <div className="tsn-sub">החיים ביותר בזרם המציאות</div>
        {rows.map((r, i) => (
          <Link key={r.value} to={`/number/${r.value}`} className="tsn-row" title={`${r.all} הופעות`}>
            <div className="tsn-head">
              <span className="tsn-val">{r.value}</span>
              <span className="tsn-cnt">×{r.all}</span>
            </div>
            <div className="tsn-bar"><div className="tsn-fill" style={{ width: `${Math.round(((r.all || 0) / max) * 100)}%`, animationDelay: `${i * 40}ms` }} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
