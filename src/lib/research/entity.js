// 🧩 Everything is an Entity (= unified_graph_law). מבנה אחיד לכל סוג תוכן —
// מספר/ביטוי/פוסט/פסוק/תמונה/סרטון/התכנסות/אירוע. ה-Research Workspace, ה-AI
// ודפי-המספר עובדים מול Entity אחד, לא מול סוגים נפרדים.
export function makeEntity({ type, title, ref, link, metadata } = {}) {
  const r = ref ?? title;
  return {
    id: `${type}:${r}`,
    type,
    title: String(title ?? r ?? ""),
    ref: r ?? null,
    link: link ?? null,
    metadata: metadata || {},
    addedAt: Date.now(),
  };
}

// ממירים נוחים מהסוגים הנפוצים → Entity אחיד.
export const entityFromNumber = (n, meaning) =>
  makeEntity({ type: "number", title: String(n), ref: n, link: `/number/${n}`, metadata: { meaning } });
export const entityFromPhrase = (phrase, value) =>
  makeEntity({ type: "phrase", title: phrase, ref: phrase, metadata: { value } });
export const entityFromPost = (post) =>
  makeEntity({ type: "post", title: post.title, ref: post.slug, link: `/${post.slug}`, metadata: { slug: post.slug } });
export const entityFromVerse = (ref, text) =>
  makeEntity({ type: "verse", title: ref, ref, metadata: { text } });
export const entityFromConvergence = (card) =>
  makeEntity({ type: "convergence", title: card.title, ref: card.slug, link: `/topic/${card.slug}`, metadata: {} });
// חידוש מבית-המדרש (insight/הצלבה) → Entity. מקשר לפוסט-המקור אם קיים, אחרת לבית-המדרש.
export const entityFromInsight = (item) =>
  makeEntity({
    type: "convergence",
    title: item.title || "חידוש",
    ref: `insight:${item.id ?? item.title}`,
    link: item.source_ref ? `/${item.source_ref}` : "/beit-midrash",
    metadata: { numbers: item.related_numbers || [], kind: "insight" },
  });

export const ENTITY_ICON = {
  number: "🔢", phrase: "✦", post: "📖", verse: "📜", image: "🖼",
  video: "🎬", convergence: "🧩", cross: "⟡", event: "🗓", prayer: "🙏",
};
export const ENTITY_LABEL = {
  number: "מספר", phrase: "ביטוי", post: "פוסט", verse: "פסוק", image: "תמונה",
  video: "סרטון", convergence: "התכנסות", cross: "הצלבה", event: "אירוע", prayer: "תפילה",
};
