// openweb.js — המודול הקנוני היחיד ל-OpenWeb (Spot.IM): טעינת ה-launcher + לחיצת-יד SSO.
//
// ⛔ canonical_ui_components_law — כל משטח שמציג תגובות/צ׳אט של OpenWeb טוען מכאן.
//    אין להזריק את סקריפט ה-launcher ידנית בשום רכיב אחר, ואין מימוש-SSO מקביל.
//
// זרימת ה-SSO (OpenWeb SSO v1, אישור Fred מ-OpenWeb 10.9.2026) — **בלי חתימת JWT**:
//   spot-im-api-ready → SPOTIM.startSSO() → codeA
//                     → Edge Function `openweb-sso` (מוסיפה access_token מה-Vault + primary_key)
//                     → codeB → SPOTIM.completeSSO(codeB) → המשתמש מחובר בווידג׳ט.
// ההתאמה בצד OpenWeb נעשית לפי publisher_primary_key = auth.users.id (אותו מפתח שנמסר להם).

import { useEffect } from 'react';
import { supabase } from './supabase.js';
import { useAuth } from './AuthContext.jsx';

export const OPENWEB_SPOT_ID = 'sp_OVtajBTj';
const LAUNCHER_ID  = 'spotim-script';
const LAUNCHER_SRC = `https://launcher.spot.im/spot/${OPENWEB_SPOT_ID}`;

// 🔁 מצב-מודול (יחיד לכל הדף) — ה-launcher נטען פעם אחת ונשאר, כדי שחזרה לדף
// הצ׳אט תזהה מחדש את אלמנט ה-conversation ולא "תברח".
let listenerAttached = false;   // האם כבר מאזינים ל-spot-im-api-ready
let apiReady = false;           // האם ה-SDK הכריז מוכנות
let ssoUserId = null;           // מזהה המשתמש שמחובר כרגע בווידג׳ט (או null)
let inflight = null;            // לחיצת-יד פעילה — מונע כפילות
let lastUser = null;            // המשתמש האחרון שנמסר מ-React (מקור-האמת של האפליקציה)

/** טוען את ה-launcher של OpenWeb פעם אחת. בטוח לקריאה חוזרת מכל רכיב. */
export function loadOpenWeb() {
  if (typeof document === 'undefined') return;
  attachApiReadyListener();
  if (document.getElementById(LAUNCHER_ID)) return;
  const s = document.createElement('script');
  s.id = LAUNCHER_ID;
  s.src = LAUNCHER_SRC;
  s.async = true;
  s.setAttribute('data-spotim-module', 'spotim-launcher');
  document.body.appendChild(s);
}

function attachApiReadyListener() {
  if (listenerAttached || typeof document === 'undefined') return;
  listenerAttached = true;
  document.addEventListener('spot-im-api-ready', () => {
    apiReady = true;
    // ה-SDK עלה אחרי שה-React כבר ידע מי מחובר → מסנכרנים עכשיו.
    syncOpenWebSso(lastUser);
  });
}

// ── עטיפות ל-SDK: OpenWeb מחזיר Promise בגרסאות החדשות ו-callback בישנות ──
function callSpotim(method, arg) {
  return new Promise((resolve, reject) => {
    const api = typeof window !== 'undefined' ? window.SPOTIM : null;
    if (!api || typeof api[method] !== 'function') {
      reject(new Error(`SPOTIM.${method} unavailable`));
      return;
    }
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const fail = (e) => {
      if (settled) return;
      settled = true;
      reject(e instanceof Error ? e : new Error(String(e?.message || e || `${method} failed`)));
    };
    const cb = (value, err) => { if (err) fail(err); else done(value); };
    let ret;
    try {
      ret = arg === undefined ? api[method](cb) : api[method](arg, cb);
    } catch (e) { fail(e); return; }
    if (ret && typeof ret.then === 'function') ret.then(done, fail);
    // אם ה-SDK לא החזיר Promise — ה-callback הוא זה שיפתור.
  });
}

/** מנרמל את תשובת startSSO — מחרוזת גולמית או אובייקט { codeA } / { code_a }. */
function readCodeA(res) {
  if (!res) return '';
  if (typeof res === 'string') return res.trim();
  return String(res.codeA ?? res.code_a ?? res.data?.codeA ?? res.data?.code_a ?? '').trim();
}

async function ssoLogin(user) {
  const codeA = readCodeA(await callSpotim('startSSO'));
  if (!codeA) throw new Error('startSSO returned no codeA');

  const { data, error } = await supabase.functions.invoke('openweb-sso', { body: { code_a: codeA } });
  if (error) throw error;
  if (!data?.ok || !data?.code_b) throw new Error(data?.error || 'openweb-sso returned no code_b');

  await callSpotim('completeSSO', data.code_b);
  ssoUserId = user.id;
}

async function ssoLogout() {
  try { await callSpotim('logout'); } catch { /* ה-SDK עשוי לא לחשוף logout — לא חוסם */ }
  ssoUserId = null;
}

/**
 * מיישר את מצב-ההתחברות של ווידג׳ט OpenWeb למצב-ההתחברות של האתר.
 * בטוח לקריאה בכל שינוי-auth ובכל רינדור — לא עושה כלום כשאין מה לשנות.
 * @param {{id: string}|null} user משתמש Supabase המחובר, או null לאורח.
 */
export function syncOpenWebSso(user) {
  lastUser = user || null;
  if (!apiReady || inflight) return inflight || Promise.resolve();

  const targetId = lastUser?.id || null;
  if (targetId === ssoUserId) return Promise.resolve();

  // התנתקות מהאתר, או החלפת-משתמש → קודם מנקים את הזהות הישנה בווידג׳ט.
  const task = (!targetId || ssoUserId)
    ? ssoLogout().then(() => (targetId ? ssoLogin(lastUser) : undefined))
    : ssoLogin(lastUser);

  inflight = task
    .catch((e) => {
      // כשל ב-SSO אף פעם לא שובר את הדף — הווידג׳ט פשוט נשאר במצב אורח.
      if (import.meta.env?.DEV) console.warn('[openweb-sso]', e?.message || e);
    })
    .finally(() => { inflight = null; });

  return inflight;
}

/**
 * ההוק הקנוני לכל משטח שמרנדר ווידג׳ט של OpenWeb (צ׳אט/תגובות):
 * טוען את ה-launcher פעם אחת ומיישר את ה-SSO למשתמש המחובר באתר.
 * שימוש: `useOpenWeb();` בראש הרכיב — זה הכל.
 */
export function useOpenWeb() {
  const { user } = useAuth();
  useEffect(() => { loadOpenWeb(); }, []);
  useEffect(() => { syncOpenWebSso(user); }, [user]);
}
