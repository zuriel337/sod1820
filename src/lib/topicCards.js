// עזרי תצוגה לכרטיסי התכנסות — מקור אחד לכוכבים ולתגית העוצמה (ללא כפילות בין הרכיבים).
export function topicStars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// תגית עוצמה — מושכת את העין למה שחשוב. מחזיר {icon,label} או null.
export function topicTag(card) {
  if (!card) return null;
  const days = (Date.now() - new Date(card.approved_at || card.created_at).getTime()) / 86400000;
  if ((card.quality || 0) >= 10) return { icon: "👑", label: "חתימת זהב" };
  if (Number.isFinite(days) && days <= 7) return { icon: "🔥", label: "נמצא השבוע" };
  if ((card.quality || 0) >= 8) return { icon: "⭐", label: "התכנסות נדירה" };
  return null;
}
