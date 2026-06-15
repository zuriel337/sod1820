import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// ===== שכבת זהב משותפת (golden_entity_law) =====
// מקור יחיד לזיהוי "מה זהב": ישויות nodes עם metadata.tier='gold'.
// כל רשימה באתר קוראת לזה כדי למיין זהב-ראשון + לסמן בכוכב — שינוי במקום אחד, עקביות בכל מקום.

let _cache = null; // { labels:Set<string>, values:Set<number> }
let _pending = null;

export async function loadGold() {
  if (_cache) return _cache;
  if (_pending) return _pending;
  _pending = (async () => {
    const { data } = await supabase.from("nodes")
      .select("label,metadata").eq("type", "entity").eq("is_active", true)
      .eq("metadata->>tier", "gold");
    const labels = new Set(); const values = new Set();
    (data || []).forEach(n => {
      if (n.label) labels.add(n.label);
      const v = Number(n.metadata?.value);
      if (Number.isFinite(v)) values.add(v);
    });
    _cache = { labels, values };
    return _cache;
  })();
  return _pending;
}

const EMPTY = { labels: new Set(), values: new Set() };

// הוק: מחזיר {labels, values} של הזהב (נטען פעם אחת, נשמר במטמון לכל הסשן).
export function useGold() {
  const [gold, setGold] = useState(_cache || EMPTY);
  useEffect(() => {
    let alive = true;
    loadGold().then(g => { if (alive) setGold(g); });
    return () => { alive = false; };
  }, []);
  return gold;
}

// מיון "זהב ראשון" — יציב (שומר על הסדר היחסי בתוך כל קבוצה).
export function sortGoldFirst(arr, isGold) {
  return arr
    .map((item, i) => ({ item, i, g: isGold(item) ? 0 : 1 }))
    .sort((a, b) => a.g - b.g || a.i - b.i)
    .map(x => x.item);
}
