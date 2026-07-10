// 🎵 נגן-רקע גלובלי — אלמנט Audio יחיד שחי מחוץ ל-React ולכן שורד מעברי-דפים
// (ניווט בין פוסטים לא קוטע את הנגינה). הרצועות מהמאגר (באקט media הציבורי).
// החלפת רצועה = next/prev/playIndex. בסיום רצועה — מעבר אוטומטי לבאה.

const B = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media";

// רשימת-ניגון פותחת (מהמאגר). בהמשך אפשר להזין מטבלת DB בלי פריסה.
export const TRACKS = [
  { t: "ניגון · הבן יקיר לי אפרים", src: `${B}/uploads/2023/11/nygvn-580-b-hbn-ykyr-ly-aprym.mp3` },
  { t: "מוטי שטיינמץ · צאינה וראינה", src: `${B}/uploads/2016/01/mvty-shtyynmtz-tzaynh-vraynh-yshybh-atrt-shlmh-Motty-Steinmetz-Sings-New-Song.mp3` },
  { t: "אברהם פריד · הנני בידך", src: `${B}/uploads/2016/01/abrhm-pryd-syngl-chdsh-hnny-bydk-avraham-fried-new-single-riboin-haolomim.mp3` },
  { t: "יעקב שוואקי · לא ישא גוי", src: `${B}/uploads/2019/09/yakb-shvvaky-shyr-lchyylym-la-ysha-gvy.mp3` },
  { t: "אורי דוידי · מוכנים", src: `${B}/uploads/2019/09/avry-dvydy-mvknym-shyr-ktzby.mp3` },
  { t: "מחרוזת", src: `${B}/uploads/2015/12/artist-mchrvzt-1.mp3` },
  { t: "שיר 222 · ואפילו בהסתרה", src: `${B}/uploads/2023/11/shyr-222-vapylv-bhstrh-zakt-hytvmym-pah-nkryt-abvdh-zrh-hvdv-gyrsa-2-srt-htvb-byvtr-shkbsh-at-havlm.mp3` },
  { t: "שיר 358 · בעל התניא", src: `${B}/uploads/2018/01/shyr-358-vapylv-bhstrh-bal-htnya-yld-hpla.mp3` },
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
