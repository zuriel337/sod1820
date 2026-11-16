// Both Post and the existing source-continuation reader own this presentation.
// Keep the CSS with a used JS export: the current bundler drops a shared pure-CSS
// chunk reached from those two lazy routes. This entry adds no reader or preload.
import "./post2029-reading.css";
import "./post2029-legacy-grade.css";
import "./post2029-semantic.css";
// The shared Royal layer is opt-in (.r29): importing it changes nothing until an element carries .r29 (here: a series Post).
import "../components/experience2029/royal2029.css";
import "./post2029-reality-map-royal.css";

export function postReadingClassName(extra = "") {
  return extra ? `sod29-reading-post ${extra}` : "sod29-reading-post";
}
