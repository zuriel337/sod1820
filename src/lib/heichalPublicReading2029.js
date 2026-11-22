export const HEICHAL_PUBLIC_READING = Object.freeze({
  title: "היכל המחקר",
  description: "ממצאים, שאלות ורעיונות שפורסמו לציבור. בכל ממצא אפשר לעיין במקור שעליו הוא מבוסס.",
});

export function requestedHeichalResearch(search, isAdmin) {
  return isAdmin === true && new URLSearchParams(search).get("mode") === "research";
}
