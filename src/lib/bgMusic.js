// 🎵 נגן-רקע גלובלי — אלמנט Audio יחיד שחי מחוץ ל-React ולכן שורד מעברי-דפים
// (ניווט בין פוסטים לא קוטע את הנגינה). הרצועות מהמאגר (באקט media הציבורי).
// החלפת רצועה = next/prev/playIndex. בסיום רצועה — מעבר אוטומטי לבאה.

// 🎼 פסקול מלכותי/אפי — Kevin MacLeod (incompetech.com), רישיון CC-BY 4.0 → מותר מסחרית
//    כולל קרדיט (מוצג בשם-הרצועה: «· Kevin MacLeod · CC-BY»). תחושת פסקול-קולנוע/פנטזיה מלכותי.
// 🌌 פסקול חללי — «סימפוניית כוכבי-הלכת»: הקלטות Voyager של NASA, נחלת-הכלל (Public Domain Mark).
// שני העולמות בפלייליסט אחד — ⏭ נודד בין «ממלכה אפית» ל«חלל עמוק». מתארחים ב-incompetech/archive
// (range/streaming; ניגון cross-origin ב-<audio> בלי CORS). אפשר בעתיד להעתיק לבאקט media לאמינות.
const A = "https://archive.org/download";
const K = "https://incompetech.com/music/royalty-free/mp3-royaltyfree";
export const TRACKS = [
  { t: "Crusade · Kevin MacLeod · CC-BY", src: `${K}/Crusade.mp3` },
  { t: "Heroic Age · Kevin MacLeod · CC-BY", src: `${K}/Heroic%20Age.mp3` },
  { t: "Prelude and Action · Kevin MacLeod · CC-BY", src: `${K}/Prelude%20and%20Action.mp3` },
  { t: "Master of the Feast · Kevin MacLeod · CC-BY", src: `${K}/Master%20of%20the%20Feast.mp3` },
  { t: "Angevin · Kevin MacLeod · CC-BY", src: `${K}/Angevin.mp3` },
  { t: "Achilles · Kevin MacLeod · CC-BY", src: `${K}/Achilles.mp3` },
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager II", src: `${A}/SymphoniesOfThePlanets2/1-SymphoniesOfThePlanets-Nasa-VoyagerRecordings.mp3` },
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager III", src: `${A}/SymphoniesOfThePlanets3/2-SymphoniesOfThePlanets-Nasa-VoyagerRecordings.mp3` },
];

let audio = null;
let state = { i: 0, playing: false, loading: false, started: false };
const subs = new Set();
const emit = () => subs.forEach(f => { try { f(); } catch { /* noop */ } });
const set = (p) => { state = { ...state, ...p }; emit(); };

function ensure() {
  if (audio || typeof window === "undefined") return audio;
  audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.7;
  audio.addEventListener("playing", () => set({ playing: true, loading: false, started: true }));
  audio.addEventListener("pause", () => set({ playing: false }));
  audio.addEventListener("waiting", () => set({ loading: true }));
  audio.addEventListener("ended", () => load(state.i + 1, true));
  audio.addEventListener("error", () => set({ loading: false, playing: false }));
  return audio;
}

function load(i, autoplay) {
  if (!ensure()) return;
  const idx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  audio.src = TRACKS[idx].src;
  set({ i: idx, loading: !!autoplay });
  if (autoplay) audio.play().catch(() => set({ loading: false, playing: false }));
}

export function toggle() {
  if (!ensure()) return;
  if (!audio.src) { load(state.i, true); return; }
  if (audio.paused) { set({ loading: true }); audio.play().catch(() => set({ loading: false, playing: false })); }
  else audio.pause();
}
export function next() { load(state.i + 1, true); }
export function prev() { load(state.i - 1, true); }
export function playIndex(i) { load(i, true); }
export function pause() { if (audio && !audio.paused) audio.pause(); }
export function getState() { return state; }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
