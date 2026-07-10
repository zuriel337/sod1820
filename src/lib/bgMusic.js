// 🎵 נגן-רקע גלובלי — אלמנט Audio יחיד שחי מחוץ ל-React ולכן שורד מעברי-דפים
// (ניווט בין פוסטים לא קוטע את הנגינה). הרצועות מהמאגר (באקט media הציבורי).
// החלפת רצועה = next/prev/playIndex. בסיום רצועה — מעבר אוטומטי לבאה.

// 🌌 פסקול חללי — «סימפוניית כוכבי-הלכת»: הקלטות החלל של גשושיות Voyager של NASA.
// נחלת-הכלל (Public Domain Mark 1.0) → מותר להטמעה מסחרית באתר. ~30 דק' כל רצועה (אמביינט
// חייזרי-קוסמי, מהפנט). מתארח ב-archive.org (סטרימינג/range נתמכים; ניגון cross-origin ב-<audio>
// לא דורש CORS). אפשר בעתיד להעתיק לבאקט media למקסימום אמינות.
const A = "https://archive.org/download";
export const TRACKS = [
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager II", src: `${A}/SymphoniesOfThePlanets2/1-SymphoniesOfThePlanets-Nasa-VoyagerRecordings.mp3` },
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager III", src: `${A}/SymphoniesOfThePlanets3/2-SymphoniesOfThePlanets-Nasa-VoyagerRecordings.mp3` },
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager IV", src: `${A}/4-01-symphonies-of-the-planets-4/4-01_Symphonies_of_the_Planets_4.mp3` },
  { t: "סימפוניית כוכבי-הלכת · NASA Voyager V", src: `${A}/5-01-symphonies-of-the-planets-5/5-01_Symphonies_of_the_Planets_5.mp3` },
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
