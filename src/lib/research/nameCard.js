// 🖼️ כרטיס «סיפור השם» — ייצור תמונה בצד-הלקוח (Canvas).
// הדפדפן מרנדר עברית נייטיב (RTL + shaping) → אין היפוך-עברית כמו ב-Pillow/satori
// (legacy_content_protocol §2). מחזיר Blob/dataURL לשיתוף/הורדה.

const GOLD = "#e9c84a";
const GOLD2 = "#c79a2e";
const CREAM = "#f3ead2";
const MUTE = "#b9ab86";

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// עוטף טקסט למספר שורות לפי רוחב מרבי; מחזיר מערך שורות
function wrap(ctx, text, maxW) {
  const words = String(text).split(" ");
  const lines = []; let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// מתאים גודל-גופן כך שהטקסט ייכנס ברוחב
function fitFont(ctx, text, weight, maxSize, minSize, maxW, family) {
  let s = maxSize;
  for (; s >= minSize; s -= 2) { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW) break; }
  return s;
}

export function drawNameCard(ctx, W, H, data, family = "Heebo, Arial, sans-serif") {
  const { name, value, hebNum, verseRef, verseText } = data;
  ctx.save();
  ctx.textAlign = "center";
  ctx.direction = "rtl";

  // רקע — מלכותי כהה עם זוהר זהב עדין
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#171228"); bg.addColorStop(.5, "#0e0a18"); bg.addColorStop(1, "#080610");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * .26, 40, W / 2, H * .26, W * .7);
  glow.addColorStop(0, "rgba(233,200,74,.16)"); glow.addColorStop(1, "rgba(233,200,74,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // מסגרת זהב
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 3;
  roundRect(ctx, 38, 38, W - 76, H - 76, 34); ctx.stroke();
  ctx.strokeStyle = "rgba(233,200,74,.35)"; ctx.lineWidth = 1;
  roundRect(ctx, 52, 52, W - 104, H - 104, 26); ctx.stroke();

  const cx = W / 2;

  // מותג עליון (ללא רווח בין הספרות — אחרת ה-RTL הופך «1820»→«0281»)
  ctx.fillStyle = GOLD; ctx.font = `800 40px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
  ctx.fillText("✦  סוד 1820  ✦", cx, 150);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // "השם שלך"
  ctx.fillStyle = MUTE; ctx.font = `600 40px ${family}`;
  ctx.fillText("השם שלך", cx, 282);

  // השם — גדול, מותאם רוחב
  const ns = fitFont(ctx, name, 800, 150, 60, W - 220, family);
  ctx.fillStyle = CREAM; ctx.font = `800 ${ns}px ${family}`;
  ctx.fillText(name, cx, 282 + 60 + ns * .75);

  let y = 282 + 60 + ns * .75;

  // "נושא את הערך"
  y += 90; ctx.fillStyle = MUTE; ctx.font = `600 38px ${family}`;
  ctx.fillText("נושא את הערך", cx, y);

  // הערך — ענק
  y += 170; ctx.fillStyle = GOLD; ctx.font = `800 190px ${family}`;
  ctx.fillText(String(value), cx, y);

  // מספר עברי
  if (hebNum) { y += 64; ctx.fillStyle = GOLD2; ctx.font = `700 52px ${family}`; ctx.fillText(hebNum, cx, y); }

  // קו מפריד
  y += 60; ctx.strokeStyle = "rgba(233,200,74,.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 200, y); ctx.lineTo(cx + 200, y); ctx.stroke();

  // הפסוק שלך
  if (verseText) {
    y += 70; ctx.fillStyle = GOLD; ctx.font = `800 40px ${family}`;
    ctx.fillText("הפסוק שלך", cx, y);
    y += 50; ctx.fillStyle = MUTE; ctx.font = `600 32px ${family}`;
    ctx.fillText(verseRef, cx, y);
    ctx.fillStyle = CREAM; ctx.font = `600 42px ${family}`;
    const lines = wrap(ctx, verseText, W - 200).slice(0, 3);
    y += 58; lines.forEach(ln => { ctx.fillText(ln, cx, y); y += 56; });
  }

  // תחתית — קריאה לפעולה
  ctx.fillStyle = MUTE; ctx.font = `600 32px ${family}`;
  ctx.fillText("גלה את סיפור השם שלך  ·  sod1820.co.il/research", cx, H - 78);

  ctx.restore();
}

// יוצר את הכרטיס ומחזיר { blob, url } (PNG)
export async function makeNameCard(data) {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* noop */ }
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  drawNameCard(ctx, W, H, data);
  const blob = await new Promise(res => canvas.toBlob(res, "image/png", 0.95));
  const url = canvas.toDataURL("image/png");
  return { blob, url };
}
