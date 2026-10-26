import React, { useId, useState } from "react";
import "./birth-charts-2029.css";

// Layout coordinates only. Channel/gate membership comes from the calculation adapter.
const CENTERS = Object.freeze([
  { key: "head", label: "ראש", x: 220, y: 58, shape: "triangle", theme: "השראה ושאלות" },
  { key: "ajna", label: "אג׳נה", x: 220, y: 166, shape: "inverted", theme: "עיבוד רעיונות והבנה" },
  { key: "throat", label: "גרון", x: 220, y: 275, shape: "square", theme: "ביטוי ותקשורת" },
  { key: "g", label: "זהות", x: 220, y: 385, shape: "diamond", theme: "זהות וכיוון" },
  { key: "heart", label: "לב ורצון", x: 337, y: 360, shape: "triangle", theme: "רצון והתחייבות" },
  { key: "spleen", label: "טחול", x: 65, y: 447, shape: "triangle", theme: "מודעות אינטואיטיבית" },
  { key: "solar", label: "רגש", x: 375, y: 447, shape: "triangle", theme: "רגש ותחושות" },
  { key: "sacral", label: "סקרל", x: 220, y: 492, shape: "square", theme: "תגובה ופעילות" },
  { key: "root", label: "שורש", x: 220, y: 596, shape: "square", theme: "דחף ולחץ לפעולה" },
]);
const CENTER_BY_KEY = new Map(CENTERS.map(center => [center.key, center]));
const SIGNS = ["טלה", "שור", "תאומים", "סרטן", "אריה", "בתולה", "מאזניים", "עקרב", "קשת", "גדי", "דלי", "דגים"];
const SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function centerShape(center) {
  const { x, y, shape } = center;
  if (shape === "square") return `${x - 37},${y - 33} ${x + 37},${y - 33} ${x + 37},${y + 33} ${x - 37},${y + 33}`;
  if (shape === "diamond") return `${x},${y - 43} ${x + 43},${y} ${x},${y + 43} ${x - 43},${y}`;
  const direction = shape === "inverted" ? -1 : 1;
  return `${x},${y - 43 * direction} ${x + 44},${y + 32 * direction} ${x - 44},${y + 32 * direction}`;
}

function channelPath(channel, index) {
  const [left, right] = channel.centers.map(key => CENTER_BY_KEY.get(key));
  if (!left || !right) return null;
  const offset = ((index % 5) - 2) * 10;
  return `M ${left.x + offset} ${left.y} C ${left.x + offset} ${(left.y + right.y) / 2}, ${right.x + offset} ${(left.y + right.y) / 2}, ${right.x + offset} ${right.y}`;
}

export function HumanDesignBodyGraph2029({ result }) {
  const id = useId();
  const [selection, setSelection] = useState({ kind: "center", key: "head" });
  const defined = new Set(result.definedCenters.map(center => center.key));
  const activeChannels = new Set(result.definedChannels.map(channel => channel.key));
  const topology = result.channelTopology || [];
  const selectedCenter = selection.kind === "center" ? CENTER_BY_KEY.get(selection.key) : null;
  const selectedChannel = selection.kind === "channel" ? result.definedChannels.find(channel => channel.key === selection.key) : null;
  const relatedChannels = selectedCenter ? result.definedChannels.filter(channel => channel.centers?.includes(selectedCenter.key)) : [];
  const activeGates = new Set(result.activatedGates);
  const centerGates = selectedCenter ? [...new Set(topology.flatMap(channel => channel.centers.flatMap((key, index) => key === selectedCenter.key && activeGates.has(channel.gates[index]) ? [channel.gates[index]] : [])))].sort((a, b) => a - b) : [];
  const selectCenter = key => setSelection({ kind: "center", key });
  return <section className="birth-chart" data-chart="human-design" aria-labelledby={`${id}-title`}>
    <header><div><small>תשעה מרכזים · אותה מפה שחושבה</small><h6 id={`${id}-title`}>מפת המרכזים שלך</h6></div><span>{result.definedCenters.length} מוגדרים · {result.definedChannels.length} ערוצים</span></header>
    <div className="birth-chart__layout">
      <div className="birth-chart__canvas birth-chart__body">
        <svg viewBox="0 0 440 650" aria-hidden="true" focusable="false">
          <path className="birth-chart__silhouette" d="M220 13 C145 13 166 128 149 230 C140 290 75 319 48 425 C35 480 85 502 126 472 L145 636 L295 636 L314 472 C355 502 405 480 392 425 C365 319 300 290 291 230 C274 128 295 13 220 13Z" />
          {topology.map((channel, index) => <path key={channel.key} d={channelPath(channel, index)} className="birth-chart__channel" data-defined={activeChannels.has(channel.key)} data-selected={selection.kind === "channel" && selection.key === channel.key} />)}
          {CENTERS.map(center => <polygon key={center.key} points={centerShape(center)} className="birth-chart__center" data-defined={defined.has(center.key)} data-selected={selectedCenter?.key === center.key} />)}
        </svg>
        {CENTERS.map((center, index) => <button type="button" key={center.key} className="birth-chart__center-hit" style={{ left: `${center.x / 4.4}%`, top: `${center.y / 6.5}%` }} aria-label={`מרכז ${center.label} · ${defined.has(center.key) ? "מוגדר" : "לא מוגדר"}`} aria-pressed={selectedCenter?.key === center.key} aria-controls={`${id}-detail`} onClick={() => selectCenter(center.key)}>{index + 1}</button>)}
      </div>
      <div className="birth-chart__reading">
        <p>בחרו מרכז בתרשים או ברשימה. הקווים המודגשים הם הערוצים המלאים שנמצאו בחישוב.</p>
        <div className="birth-chart__choices is-centers" aria-label="מרכזי המפה">{CENTERS.map((center, index) => <button type="button" key={center.key} data-defined={defined.has(center.key)} aria-pressed={selectedCenter?.key === center.key} aria-controls={`${id}-detail`} onClick={() => selectCenter(center.key)}><b>{index + 1}</b> {center.label}<small>{defined.has(center.key) ? "מוגדר" : "לא מוגדר"}</small></button>)}</div>
        <div className="birth-chart__detail" id={`${id}-detail`} aria-live="polite" aria-atomic="true">
          {selectedCenter ? <><h6>{selectedCenter.label} · {defined.has(selectedCenter.key) ? "מוגדר" : "לא מוגדר"}</h6><p>במסגרת Human Design המרכז משויך ל{selectedCenter.theme}. {defined.has(selectedCenter.key) ? "הוא מחובר במפה דרך ערוץ מלא אחד לפחות." : "לא נמצא עבורו ערוץ מלא במפה הזאת."}</p><span>{relatedChannels.length ? `ערוצים מחוברים: ${relatedChannels.map(channel => channel.key).join(" · ")}` : "ללא ערוץ מלא מחובר"}</span><span>{centerGates.length ? `שערים פעילים במרכז: ${centerGates.join(" · ")}` : "אין שער פעיל במרכז"}</span></> : null}
          {selectedChannel ? <><h6>ערוץ <bdi>{selectedChannel.key}</bdi></h6><p>{selectedChannel.centers.map(key => CENTER_BY_KEY.get(key)?.label || key).join(" ↔ ")}</p><span>שני שערי הערוץ פעילים בתוצאה שחושבה.</span></> : null}
        </div>
        {result.definedChannels.length ? <div className="birth-chart__choices" aria-label="ערוצים לחיצים">{result.definedChannels.map(channel => <button type="button" key={channel.key} aria-pressed={selectedChannel?.key === channel.key} aria-controls={`${id}-detail`} onClick={() => setSelection({ kind: "channel", key: channel.key })}>ערוץ <bdi>{channel.key}</bdi></button>)}</div> : null}
      </div>
    </div>
  </section>;
}

// Polar projection only: longitudes and aspects always come from the same engine result.
function point(longitude, ascendant, radius) {
  const radians = (longitude - ascendant) * Math.PI / 180;
  return { x: 320 - radius * Math.cos(radians), y: 320 + radius * Math.sin(radians) };
}

export function SkyWheel2029({ result }) {
  const id = useId();
  const [selectedKey, setSelectedKey] = useState("sun");
  const selected = result.bodies.find(body => body.key === selectedKey) || result.bodies[0];
  const ascendant = result.angles.ascendant.longitude;
  const selectedAspects = result.aspects.filter(aspect => aspect.left === selected?.label || aspect.right === selected?.label);
  return <section className="birth-chart" data-chart="sky" aria-labelledby={`${id}-title`}>
    <header><div><small>מיקומים טרופיים · חלוקה ל־12 מזלות</small><h6 id={`${id}-title`}>השמיים ברגע הלידה</h6></div><span>{result.bodies.length} גרמי שמיים</span></header>
    <div className="birth-chart__layout">
      <div className="birth-chart__canvas birth-chart__sky">
        <svg viewBox="0 0 640 640" role="img" aria-label="גלגל מזלות, מיקומי כוכבים, אופק והיבטים. הפירוט זמין בכפתורים לצד הגלגל.">
          <circle cx="320" cy="320" r="296" className="birth-chart__ring" /><circle cx="320" cy="320" r="244" className="birth-chart__ring" /><circle cx="320" cy="320" r="171" className="birth-chart__ring" />
          {SIGNS.map((sign, index) => {
            const inner = point(index * 30, ascendant, 244), outer = point(index * 30, ascendant, 296), label = point(index * 30 + 15, ascendant, 271);
            return <g key={sign}><line {...{ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }} className="birth-chart__division" /><text x={label.x} y={label.y} className="birth-chart__sign" aria-hidden="true">{`${SIGN_SYMBOLS[index]}\uFE0E`}</text></g>;
          })}
          {result.aspects.map((aspect, index) => {
            const positions = [...result.bodies, { key: "ascendant", label: "אופק עולה", ...result.angles.ascendant }, { key: "midheaven", label: "רום שמיים", ...result.angles.midheaven }];
            const left = positions.find(body => body.label === aspect.left), right = positions.find(body => body.label === aspect.right);
            if (!left || !right) return null;
            const a = point(left.longitude, ascendant, 171), b = point(right.longitude, ascendant, 171);
            return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="birth-chart__aspect" data-selected={left.key === selected?.key || right.key === selected?.key} />;
          })}
          {[["ASC", result.angles.ascendant], ["MC", result.angles.midheaven]].map(([label, angle]) => {
            const a = point(angle.longitude, ascendant, 124), b = point(angle.longitude, ascendant, 239), text = point(angle.longitude, ascendant, 114);
            return <g key={label}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="birth-chart__axis" /><text x={text.x} y={text.y} className="birth-chart__axis-label">{label}</text></g>;
          })}
          {result.bodies.map((body, index) => {
            const actual = point(body.longitude, ascendant, 171), marker = point(body.longitude, ascendant, 190 + (index % 3) * 18);
            return <g key={body.key} data-selected={body.key === selected?.key}><line x1={actual.x} y1={actual.y} x2={marker.x} y2={marker.y} className="birth-chart__division" /><circle cx={actual.x} cy={actual.y} r="4" className="birth-chart__position" /><circle cx={marker.x} cy={marker.y} r="12" className="birth-chart__marker" /><text x={marker.x} y={marker.y} className="birth-chart__marker-label" aria-hidden="true">{index + 1}</text></g>;
          })}
        </svg>
      </div>
      <div className="birth-chart__reading">
        <p>בחרו כוכב כדי להאיר את הקשרים שלו ולראות את המיקום המדויק.</p>
        <div className="birth-chart__choices is-bodies" aria-label="בחירת גרם שמיים">{result.bodies.map((body, index) => <button type="button" key={body.key} aria-pressed={body.key === selected?.key} aria-controls={`${id}-detail`} onClick={() => setSelectedKey(body.key)}><b>{index + 1}</b> {body.label}</button>)}</div>
        <div className="birth-chart__detail" id={`${id}-detail`} aria-live="polite" aria-atomic="true">
          {selected ? <><h6>{selected.label} · {selected.signLabel}</h6><p><bdi>{selected.degree}°</bdi> בתוך המזל · אורך מלקה <bdi>{selected.longitude}°</bdi></p><span>{selectedAspects.length ? `${selectedAspects.length} היבטים בתוצאה הזאת` : "לא נמצא היבט מרכזי בטווח החישוב"}</span><ul>{selectedAspects.map((aspect, index) => <li key={index}>{aspect.left} {aspect.symbol} {aspect.right} · {aspect.label} · סטייה <bdi>{aspect.orb}°</bdi></li>)}</ul></> : null}
        </div>
        <p className="birth-chart__note">החלוקה החיצונית מציגה מזלות. גבולות בתים אינם זמינים במנוע הנוכחי.</p>
      </div>
    </div>
  </section>;
}
