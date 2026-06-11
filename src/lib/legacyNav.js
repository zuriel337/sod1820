import { useNavigate } from "react-router-dom";

// מתאם: ממפה את קריאות onNav(key, data) הישנות לכתובות ה-routes החדשות.
export function useLegacyNav() {
  const navigate = useNavigate();
  return function nav(key, data = null) {
    const go = (p) => { navigate(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
    switch (key) {
      case "home":            return go("/");
      case "blog":            return go("/post");
      case "post":            return go("/" + (data?.slug ?? ""));
      case "about":           return go("/about");
      case "contact":         return go("/contact");
      case "chat":            return go("/community/chat");
      case "spotchat":        return go("/community/chat");
      case "login":           return go("/login");
      case "admin":           return go("/admin");
      case "traffic":         return go("/traffic");
      case "numbers-report":  return go("/numbers-report");
      case "theme-preview":   return go("/theme-preview");
      case "number": {
        const phrase = typeof data === "string" ? data : (data?.phrase ?? data?.label ?? data?.value ?? "");
        return go("/number/" + encodeURIComponent(phrase));
      }
      default:                return go("/");
    }
  };
}
