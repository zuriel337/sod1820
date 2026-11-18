import ShareActions from "../ShareActions.jsx";
import "./postEndShare2029.css";

// The end of a post is where a reader most wants to share it (ZURIEL 18.11.2026). Loaded by the post page as the reader approaches the
// end (toolOnApproach2029), so it never joins the post's opening graph; the one ShareActions sends the post's own public address.
export default function PostEndShare2029({ url, title, entityId }) {
  if (!url) return null;
  return <section className="sod29-post-end-share" aria-labelledby="sod29-post-end-share-title" data-post-end-share="true">
    <h2 id="sod29-post-end-share-title">סיימתם לקרוא? שתפו את הפוסט</h2>
    <p>מי שיקבל את הקישור יפתח את הפוסט עצמו, עם הכותרת והתמונה שלו.</p>
    <ShareActions type="post" url={url} title={title} entityId={entityId} sourceSurface="post_2029_end"
      channels={["native", "whatsapp", "telegram", "facebook", "copy"]} style={{ flexWrap: "wrap", overflowX: "visible" }} />
  </section>;
}
