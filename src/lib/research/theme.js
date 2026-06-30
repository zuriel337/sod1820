// 🎨 פלטת «סביבת המחקר» — זהב עמוק על קרם, נקי, מודרני, מובייל-ראשון. גופן Heebo חמוד.
// scoped לסביבת-המחקר בלבד (לא דורסת canonical_colors_law — דף הבית נשאר זהב-מלכותי).
// מצב לילה (לבן על סגול) = שלב מאוחר (toggle).
export const RW = {
  bg: "#f7f4ec",        // קרם (לא לבן-לבן)
  card: "#fffdf8",
  line: "#ece4d3",
  ink: "#221d12",
  ink2: "#6b6150",
  ink3: "#9a8f78",
  accent: "#b07d12",    // זהב עמוק (ניגודיות טובה לכפתורים)
  accentSoft: "#f3e6c2",
  chip: "#f4eede",
  good: "#1f9d57",
  radius: 16,
  tap: 44,              // יעד-מגע מינימלי (iOS)
  font: "'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
};

// CSS של סביבת-המחקר (classes — מאפשר hover + media-queries + bottom-sheet במובייל).
// מוזרק פעם אחת ע״י ResearchShell. כל הצבעים מתוך RW → קל להחליף ל-night-mode בעתיד.
export const rwCss = (t = RW) => `
  .rw{--bg:${t.bg};--card:${t.card};--line:${t.line};--ink:${t.ink};--ink2:${t.ink2};--ink3:${t.ink3};
      --acc:${t.accent};--accS:${t.accentSoft};--chip:${t.chip};--r:${t.radius}px;
      background:var(--bg);color:var(--ink);font-family:${t.font};
      height:100vh;height:100dvh;overflow-y:auto;scrollbar-gutter:stable}
  .rw *{box-sizing:border-box}
  /* כפתורים/שדות לא יורשים font-family בדפדפן → כופים את Heebo על כל הסביבה (מעיף את גופן ברירת-המחדל המכוער) */
  .rw button,.rw input,.rw select,.rw textarea{font-family:inherit}
  .rw-head{position:sticky;top:0;z-index:30;background:var(--card);border-bottom:1px solid var(--line);
    display:flex;align-items:center;gap:12px;padding:11px 16px}
  .rw-logo{font-weight:800;font-size:19px}.rw-logo b{color:var(--acc)}
  .rw-search{flex:1;max-width:520px;background:var(--bg);border:1px solid var(--line);border-radius:999px;
    padding:11px 16px;color:var(--ink3);font-size:16px;cursor:text}
  .rw-ic{width:42px;height:42px;border-radius:999px;background:var(--bg);border:1px solid var(--line);
    display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer}
  .rw-av{width:42px;height:42px;border-radius:999px;background:linear-gradient(135deg,var(--acc),#e7c869);
    color:#1a0e00;display:flex;align-items:center;justify-content:center;font-weight:800}
  /* במה: סרגלים מתקפלים בצדדים (גרירה/לחיצה), אזור-כלים גמיש במרכז (investing/IDE) */
  .rw-stage{display:flex;align-items:flex-start;padding:0 clamp(12px,1.8vw,30px);max-width:none;margin:0;gap:0}
  .rw-stage.wide{max-width:none}
  .rw-pwrap{flex:0 0 auto;width:330px;display:grid;gap:12px;position:sticky;top:74px}
  .rw-pwrap.left{width:240px}
  .rw-work{flex:1;min-width:0;padding:0 12px}
  .rw-grip{flex:0 0 12px;align-self:stretch;min-height:60vh;cursor:col-resize;display:flex;align-items:center;justify-content:center;
    color:var(--ink3);background:none;border:none;padding:0;touch-action:none}
  .rw-grip:hover{color:var(--acc)}
  .rw-grip b{writing-mode:vertical-rl;font-size:14px;letter-spacing:-2px;line-height:.6;user-select:none}
  /* סרגל-סגול נקי בסגנון ChatGPT: אייקון-פאנל למעלה (פתיחה) + אייקוני התוכן */
  /* מסילה צפה בסגנון אפליקציית-בנק (דיסקונט/ChatGPT): צללית-עומק רכה + הילה, פתוח וסגור */
  .rw-rail{flex:0 0 52px;align-self:stretch;min-height:60vh;background:var(--card);border:1px solid var(--line);border-radius:18px;
    cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px 0;position:relative;font-family:inherit;
    box-shadow:0 14px 32px -16px rgba(60,46,16,.30),0 4px 10px -5px rgba(60,46,16,.13),inset 0 1px 0 rgba(255,255,255,.55);transition:box-shadow .18s,transform .18s,background .18s,border-color .18s}
  .rw-rail:hover{background:var(--accS);border-color:var(--acc);box-shadow:0 18px 38px -16px rgba(60,46,16,.36),0 5px 12px -5px rgba(60,46,16,.16);transform:translateY(-1px)}
  /* צל אחיד מתחת — שמאל כמו ימין, פתוח וסגור */
  .rw-rail.r,.rw-rail.l{box-shadow:0 14px 32px -16px rgba(60,46,16,.30),0 4px 10px -5px rgba(60,46,16,.13),inset 0 1px 0 rgba(255,255,255,.55)}
  .rw-rail-toggle{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--ink2);background:var(--bg);border:1px solid var(--line);cursor:pointer;font-family:inherit}
  .rw-rail:hover .rw-rail-toggle{color:var(--acc);background:#fff}
  .rw-rail-icons{display:flex;flex-direction:column;gap:8px;font-size:18px;opacity:.92}
  .rw-rail-i{width:36px;height:36px;border-radius:10px;border:1px solid transparent;background:none;cursor:pointer;font-size:18px;
    display:flex;align-items:center;justify-content:center;font-family:inherit;line-height:1;transition:.12s}
  .rw-rail-i:hover{background:var(--accS);border-color:var(--acc)}
  .rw-rail-dot{position:absolute;top:8px;inset-inline-start:8px;width:10px;height:10px;border-radius:999px;background:#e0533a;box-shadow:0 0 0 2px var(--card);z-index:1}
  /* טאבים בקיר השמאלי — פשוט (טאב פעיל אחד) ומשוכלל (badge חי) */
  .rw-tabs{display:flex;flex-direction:column;gap:10px}
  .rw-tabbar{display:flex;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:4px}
  .rw-tab{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px;border:none;background:none;
    border-radius:10px;cursor:pointer;color:var(--ink3);font-family:inherit;transition:.12s}
  .rw-tab:hover{background:var(--accS);color:var(--ink2)}
  .rw-tab.on{background:var(--acc);color:#fff}
  .rw-tab-ic{font-size:17px;line-height:1}
  .rw-tab-lb{font-size:10.5px;font-weight:700}
  .rw-tab-badge{position:absolute;top:3px;inset-inline-end:6px;min-width:15px;height:15px;padding:0 3px;border-radius:999px;
    background:#e0533a;color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}
  .rw-tab.on .rw-tab-badge{background:#fff;color:var(--acc)}
  .rw-tabbody{animation:rwFade .16s ease}
  @keyframes rwFade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
  .rw-phead{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;color:var(--ink3);
    letter-spacing:1px;padding:0 2px 9px}
  .rw-phead button{cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink2);border-radius:9px;
    width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-family:inherit}
  .rw-phead button:hover{border-color:var(--acc);color:var(--acc);background:var(--accS)}
  .rw-ic.on{background:var(--accS);border-color:var(--acc);color:var(--acc)}
  /* שורת-כלים אופקית — תפריט-המשנה של המעבדה (לחיצה נכנסת ישר לכלי) */
  .rw-toolbar{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;margin-bottom:4px;-webkit-overflow-scrolling:touch}
  .rw-tchip{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--ink2);border-radius:999px;
    padding:8px 15px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;white-space:nowrap;min-height:40px}
  .rw-tchip:hover{border-color:var(--acc);color:var(--acc)}
  .rw-tchip.on{background:var(--acc);border-color:var(--acc);color:#fff}
  /* «עוד» — תפריט הכלים שיעבדו (בבנייה) */
  .rw-subnav{display:flex;align-items:flex-start;gap:8px}
  .rw-subnav .rw-toolbar{flex:1;min-width:0;margin-bottom:0}
  .rw-more-wrap{position:relative;flex:none;padding-bottom:12px}
  .rw-more-back{position:fixed;inset:0;z-index:40}
  .rw-more-pop{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:41;min-width:210px;
    background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px;
    box-shadow:0 14px 36px -12px rgba(60,46,16,.34),0 3px 8px -3px rgba(60,46,16,.14)}
  .rw-more-h{font-size:10.5px;font-weight:800;color:var(--ink3);letter-spacing:.3px;padding:6px 9px 7px}
  .rw-more-item{display:block;width:100%;text-align:right;border:none;background:none;color:var(--ink2);
    border-radius:9px;padding:9px 10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
  .rw-more-item:hover{background:var(--chip);color:var(--acc)}
  .rw-rc{order:1;display:grid;gap:12px;position:sticky;top:74px}
  .rw-nav{order:3;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:9px;position:sticky;top:74px}
  .rw-nav a{display:flex;align-items:center;gap:11px;padding:12px 13px;border-radius:12px;color:var(--ink2);
    font-weight:700;font-size:15.5px;text-decoration:none;min-height:${t.tap}px;cursor:pointer}
  .rw-nav a.on{background:var(--accS);color:var(--acc)}
  .rw-future{margin-top:8px;border-top:1px dashed var(--line);padding-top:9px;color:var(--ink3);font-size:12.5px;font-weight:700}
  .rw-future .lk{color:var(--ink2);font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:8px;padding:9px 13px 2px;cursor:pointer}
  .rw-adv{margin-inline-start:auto;font-size:10.5px;font-weight:800;background:var(--accS);color:var(--acc);border-radius:999px;padding:2px 9px}
  .rw-exp{color:var(--ink3);font-size:11.5px;font-weight:600;line-height:1.5;padding:0 13px 8px;border-bottom:1px solid var(--line)}
  .rw-exp b{color:var(--acc)}
  /* צל אחיד מתחת לשני הקירות הפתוחים (שמאל=ימין) */
  .rw-panel{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;box-shadow:0 14px 32px -16px rgba(60,46,16,.30),0 4px 10px -5px rgba(60,46,16,.13)}
  .rw-pwrap:not(.left) .rw-panel,.rw-pwrap.left .rw-panel{box-shadow:0 14px 32px -16px rgba(60,46,16,.30),0 4px 10px -5px rgba(60,46,16,.13)}
  /* קיר-שמאל (טאבים): גם המסילה-עליונה וגם גוף-הטאב מקבלים כרטיס+צל כמו ימין */
  .rw-pwrap.left .rw-tabbar{box-shadow:0 8px 20px -14px rgba(60,46,16,.24)}
  .rw-pwrap.left .rw-tabbody{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:4px 2px;
    box-shadow:0 14px 32px -16px rgba(60,46,16,.30),0 4px 10px -5px rgba(60,46,16,.13)}
  .rw-ph{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;font-weight:800;font-size:14.5px;border-bottom:1px solid var(--line)}
  .rw-pb{padding:12px 14px}
  .rw-muted{color:var(--ink2);font-size:13px}
  .rw-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:0 1px 2px rgba(40,30,10,.05);padding:20px}
  .rw-chip{display:inline-block;background:var(--chip);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-weight:700;font-size:14px;margin:3px 0}
  .rw-arrow{color:var(--ink3);text-align:center;font-size:13px;margin:1px 0}
  .rw-cta{display:flex;gap:8px;margin-top:10px}
  .rw-cta button{flex:1;border-radius:12px;padding:11px;font-weight:800;font-size:14px;min-height:${t.tap}px;cursor:pointer;border:1px solid var(--acc)}
  .rw-cta .b1{background:var(--acc);color:#fff}.rw-cta .b2{background:var(--card);color:var(--acc)}
  .rw-savei{display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid var(--line);font-size:14px}.rw-savei:first-child{border-top:none}
  .rw-hot{background:var(--accS);border-radius:12px;padding:11px 12px;font-weight:700;font-size:14px;color:var(--acc)}
  .rw-qa{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .rw-qa button{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:9px 14px;font-size:13.5px;
    font-weight:700;color:var(--ink);min-height:${t.tap}px;cursor:pointer;transition:transform .1s ease}
  .rw-qa button:active{transform:scale(.96)}
  .rw-qa .pri{background:var(--acc);border-color:var(--acc);color:#fff}
  .rw-empty{color:var(--ink3);font-size:13px;line-height:1.6;padding:6px 2px}
  /* 📝 פנקס-מחקר — משטח כתיבה חופשי, נשמר מסשן-לסשן */
  .rw-notes{width:100%;box-sizing:border-box;min-height:190px;resize:vertical;border:1px solid var(--line);border-radius:12px;
    background:var(--bg);color:var(--ink);font-family:inherit;font-size:15px;line-height:1.7;padding:12px 13px;outline:none}
  .rw-notes:focus{border-color:var(--acc)}
  .rw-notes-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}
  .rw-notes-print{border:1px solid var(--line);background:var(--card);color:var(--ink2);border-radius:999px;
    padding:7px 14px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;min-height:34px}
  .rw-notes-print:hover{border-color:var(--acc);color:var(--acc)}
  /* פנקס-פעיל — שורת-פעולה שמופיעה כשמסמנים טקסט */
  .rw-notes-sel{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;
    background:var(--accS);border:1px solid var(--line);border-radius:10px;padding:6px 9px}
  .rw-mini{border:1px solid var(--line);background:var(--card);color:var(--ink2);border-radius:8px;
    min-width:30px;height:30px;padding:0 8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
  .rw-mini:hover{border-color:var(--acc);color:var(--acc)}
  /* בורר-אוסף בשורת-שמור */
  .rw-er-sel{flex:none;max-width:92px;border:1px solid var(--line);background:var(--card);color:var(--ink2);
    border-radius:8px;font-size:11.5px;font-weight:700;font-family:inherit;padding:5px 6px;cursor:pointer}
  .rw-er-sel:hover{border-color:var(--acc)}
  /* התחברות + מצב «בבנייה» */
  .rw-cta button.off{opacity:.5;cursor:default}
  .rw-login{width:100%;border:1px solid var(--acc);background:var(--accS);color:var(--acc);border-radius:12px;
    padding:11px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;min-height:42px}
  .rw-login:hover{background:var(--acc);color:#fff}
  .rw-soon{background:var(--chip);border:1px dashed var(--line);border-radius:12px;padding:11px 12px;font-weight:700;font-size:13px;color:var(--ink2);line-height:1.6}
  /* כלי-מספר — שדה הקלדה גדול */
  .rw-num-in{flex:1;min-width:0;font-size:20px;font-weight:800;text-align:center;border:1px solid var(--acc);
    border-radius:10px;background:var(--bg);color:var(--ink);padding:11px 14px;outline:none;font-family:inherit}
  /* רשימת-יכולות (לא כפתורים) — צ'קליסט מידע ברור */
  ul.rw-caps{list-style:none;margin:0;padding:0;display:grid;gap:7px}
  .rw-caps li{position:relative;padding-inline-start:21px;font-size:13px;color:var(--ink2);line-height:1.5;font-weight:600}
  .rw-caps li:before{content:"✓";position:absolute;inset-inline-start:0;top:0;color:var(--acc);font-weight:800}
  /* בורר-שיטה בחיפוש-פסוקים — שורת צ'יפים גלילה */
  .vs-methods{display:flex;gap:6px;overflow-x:auto;padding:1px 1px 9px;-webkit-overflow-scrolling:touch}
  .vs-mchip{flex:0 0 auto;border:1px solid var(--line);background:var(--chip);color:var(--ink2);border-radius:999px;
    padding:6px 12px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:.12s}
  .vs-mchip:hover{border-color:var(--acc);color:var(--acc)}
  .vs-mchip.on{background:var(--acc);border-color:var(--acc);color:#fff}
  /* פריט-ישות לחיץ (EntityRow) — שורה נקייה עם כפתור-הסרה */
  .rw-sec-t{font-size:11.5px;font-weight:800;color:var(--ink3);letter-spacing:.02em;margin:0 0 5px}
  .rw-er{display:flex;align-items:center;gap:6px;padding:2px 0}
  .rw-er-lk{flex:1;display:flex;align-items:center;gap:7px;min-width:0;text-decoration:none;color:var(--ink);
    background:var(--chip);border:1px solid var(--line);border-radius:10px;padding:8px 11px;font-size:13.5px;font-weight:700;
    transition:border-color .15s,background .15s}
  a.rw-er-lk:hover{border-color:var(--acc);background:var(--accS)}
  .rw-er-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rw-er-x{flex:none;border:none;background:none;cursor:pointer;color:var(--ink3);font-size:14px;
    width:30px;height:30px;border-radius:9px;transition:background .15s,color .15s}
  .rw-er-x:hover{background:var(--chip);color:var(--acc)}
  /* בית-הכלים — מסך פתיחה של סביבת המחקר */
  .rw-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(216px,1fr));gap:13px}
  .rw-tool{display:flex;flex-direction:column;gap:7px;text-align:right;text-decoration:none;color:inherit;
    background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:17px 16px;min-height:128px;cursor:pointer;
    transition:border-color .15s,transform .1s ease,box-shadow .15s}
  .rw-tool:hover{border-color:var(--acc);box-shadow:0 6px 20px rgba(176,125,18,.13);transform:translateY(-2px)}
  .rw-tool .ic{font-size:29px;line-height:1}
  .rw-tool .tt{font-weight:800;font-size:15.5px}
  .rw-tool .ds{color:var(--ink2);font-size:12.5px;line-height:1.5;flex:1}
  .rw-tool .bg{align-self:flex-start;font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 10px}
  .rw-tool .bg.live{background:#e4f6ea;color:var(--good)}
  .rw-tool .bg.open{background:var(--accS);color:var(--acc)}
  .rw-tool .bg.soon{background:var(--chip);color:var(--ink3)}
  .rw-tool.dis{cursor:default;opacity:.7}
  .rw-tool.dis:hover{border-color:var(--line);box-shadow:none;transform:none}
  /* כלי-דגל — בולטים: מסגרת זהב, רקע זהוב-עדין, הילה */
  .rw-tool.flag{border-color:var(--acc);background:linear-gradient(180deg,var(--accS),var(--card) 70%);
    box-shadow:0 12px 30px -14px rgba(176,125,18,.34),0 3px 8px -3px rgba(176,125,18,.16)}
  .rw-tool.flag:hover{box-shadow:0 16px 36px -14px rgba(176,125,18,.42),0 4px 10px -3px rgba(176,125,18,.2);transform:translateY(-2px)}
  .rw-tool.flag .tt{color:var(--acc)}
  .rw-tool .bg.flag{background:var(--acc);color:#fff}
  /* תווית-קבוצה בין הפתוחים לנעולים */
  .rw-grp{margin:20px 2px 11px;font-size:12.5px;font-weight:800;color:var(--ink3);letter-spacing:.3px;
    display:flex;align-items:center;gap:9px}
  .rw-grp:after{content:"";flex:1;height:1px;background:var(--line)}
  .rw-back{background:none;border:none;color:var(--acc);font-weight:800;font-size:14.5px;cursor:pointer;padding:6px 2px;margin-bottom:6px}
  .rw-h1{font-weight:800;font-size:22px;margin:2px 0 3px}
  .rw-sub{color:var(--ink2);font-size:13.5px;line-height:1.6;margin-bottom:16px}
  /* בית-מגירה במובייל (ChatGPT) */
  .rw-fab{display:none}.rw-sheet,.rw-backdrop{display:none}
  @media (max-width:760px){
    .rw-stage{padding:12px;padding-bottom:90px}
    .rw-pwrap,.rw-grip,.rw-rail,.rw-nav,.rw-rc,.rw-ptog{display:none}
    .rw-work{padding:0}
    .rw-fab{display:flex;position:fixed;bottom:14px;left:12px;right:12px;height:52px;border-radius:16px;
      background:var(--ink);color:var(--card);align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:16px;
      box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:40;border:none;cursor:pointer}
    .rw-backdrop.open{display:block;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:45}
    .rw-sheet{display:block;position:fixed;left:0;right:0;bottom:-100%;background:var(--card);border-radius:20px 20px 0 0;
      box-shadow:0 -8px 30px rgba(0,0,0,.25);z-index:46;max-height:82vh;overflow:auto;padding:8px 12px calc(20px + env(safe-area-inset-bottom));
      transition:bottom .28s ease}
    .rw-sheet.open{bottom:0}
    .rw-grab{width:42px;height:5px;border-radius:999px;background:var(--line);margin:8px auto 12px}
    .rw-sheet .rw-panel{margin-bottom:10px}
  }
`;
