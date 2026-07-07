import { useState } from "react";
import { supabase } from "../lib/supabase.js";
// ⚠️ קליינט אחד בלבד! createClient נפרד יצר GoTrueClient כפול → מריבה על טוקן-האימות,
// רענון-לולאה ו-onAuthStateChange חוזר → שיטפון בקשות ("הכרום מקבל הרבה מידע"). מאוחד לקליינט המשותף.

const S = {
  wrap: {
    background: "#0f0f1a",
    border: "1px solid #2d2d4e",
    borderRadius: 12,
    padding: "32px 28px",
    maxWidth: 680,
    margin: "0 auto 48px",
    direction: "rtl",
    fontFamily: "'Heebo', sans-serif",
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    background: "linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#a0a0c0",
    marginBottom: 6,
    fontWeight: 600,
    letterSpacing: 1,
  },
  input: {
    width: "100%",
    background: "#13132a",
    border: "1px solid #2d2d4e",
    borderRadius: 7,
    color: "#e8e8ff",
    padding: "10px 14px",
    fontSize: 15,
    fontFamily: "'Heebo', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 18,
  },
  textarea: {
    width: "100%",
    background: "#13132a",
    border: "1px solid #2d2d4e",
    borderRadius: 7,
    color: "#e8e8ff",
    padding: "10px 14px",
    fontSize: 15,
    fontFamily: "'Heebo', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 18,
    resize: "vertical",
    minHeight: 90,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  wordRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addBtn: {
    background: "transparent",
    border: "1px dashed #2d2d4e",
    borderRadius: 7,
    color: "#a855f7",
    padding: "8px 16px",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    fontSize: 13,
    width: "100%",
    marginBottom: 18,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    padding: "0 4px",
  },
  submit: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    fontFamily: "'Heebo', sans-serif",
    cursor: "pointer",
    marginTop: 8,
    opacity: 1,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#a855f7",
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
    borderBottom: "1px solid #2d2d4e",
    paddingBottom: 6,
  },
  success: {
    textAlign: "center",
    color: "#4ade80",
    fontSize: 15,
    padding: "12px",
    background: "#0d2b1a",
    borderRadius: 8,
    marginTop: 12,
  },
  error: {
    textAlign: "center",
    color: "#f87171",
    fontSize: 14,
    padding: "12px",
    background: "#2b0d0d",
    borderRadius: 8,
    marginTop: 12,
  },
};

const EMPTY_WORD = { word: "", value: "" };

export default function UploadFindings() {
  const [form, setForm] = useState({
    title: "",
    mainNumber: "",
    date: new Date().toISOString().slice(0, 10),
    source: "",
    analysis: "",
  });
  const [words, setWords] = useState([{ ...EMPTY_WORD }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState(null); // null | "saving" | "ok" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setWord = (i, k, v) =>
    setWords(ws => ws.map((w, idx) => idx === i ? { ...w, [k]: v } : w));

  const addWord = () => setWords(ws => [...ws, { ...EMPTY_WORD }]);
  const removeWord = i => setWords(ws => ws.filter((_, idx) => idx !== i));

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async file => {
    const ext = file.name.split(".").pop();
    const res = await fetch(
      `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/gallery/${Date.now()}.${ext}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer sb_publishable_vyUxS9qIkxqbOqiNd-L-BQ_LBPZhwhg",
          "Content-Type": file.type,
        },
        body: file,
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`העלאת תמונה נכשלה: ${err}`);
    }
    const { Key } = await res.json();
    return `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/${Key}`;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    let image_url = null;
    if (imageFile) {
      try {
        image_url = await uploadImage(imageFile);
      } catch (err) {
        setErrorMsg(err.message);
        setStatus("error");
        return;
      }
    }

    const wordValues = words
      .filter(w => w.word.trim())
      .map(w => ({ word: w.word.trim(), value: Number(w.value) || 0 }));

    const { error } = await supabase.from("gallery_posts").insert({
      title: form.title,
      primary_number: form.mainNumber ? Number(form.mainNumber) : null,
      event_date: form.date || null,
      source_name: form.source || null,
      analysis_text: form.analysis || null,
      word_values: wordValues.length ? wordValues : null,
      image_url,
      is_published: false,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("ok");
      setForm({ title: "", mainNumber: "", date: new Date().toISOString().slice(0, 10), source: "", analysis: "" });
      setWords([{ ...EMPTY_WORD }]);
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div style={{ padding: "0 18px" }}>
      <div style={S.wrap}>
        <div style={S.title}>✦ העלאת ממצא גמטריה ✦</div>

        <form onSubmit={handleSubmit}>
          {/* כותרת + מספר ראשי */}
          <div style={S.row}>
            <div>
              <label style={S.label}>כותרת הממצא</label>
              <input
                style={S.input}
                placeholder="למשל: קשר בין ישראל ל-1820"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                required
              />
            </div>
            <div>
              <label style={S.label}>מספר ראשי</label>
              <input
                style={S.input}
                type="number"
                placeholder="1820"
                value={form.mainNumber}
                onChange={e => set("mainNumber", e.target.value)}
              />
            </div>
          </div>

          {/* תאריך + מקור */}
          <div style={S.row}>
            <div>
              <label style={S.label}>תאריך</label>
              <input
                style={S.input}
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
              />
            </div>
            <div>
              <label style={S.label}>מקור / ספר</label>
              <input
                style={S.input}
                placeholder="תורה, זוהר, תנ״ך..."
                value={form.source}
                onChange={e => set("source", e.target.value)}
              />
            </div>
          </div>

          {/* ניתוח טקסט */}
          <label style={S.label}>ניתוח טקסט</label>
          <textarea
            style={S.textarea}
            placeholder="פרט את הקשר הגמטרי שמצאת..."
            value={form.analysis}
            onChange={e => set("analysis", e.target.value)}
            rows={4}
          />

          {/* מילים וערכים */}
          <div style={S.sectionTitle}>מילים וערכיהן</div>
          {words.map((w, i) => (
            <div key={i} style={S.wordRow}>
              <input
                style={{ ...S.input, marginBottom: 0 }}
                placeholder="מילה / ביטוי"
                value={w.word}
                onChange={e => setWord(i, "word", e.target.value)}
              />
              <input
                style={{ ...S.input, marginBottom: 0, width: 80, textAlign: "center" }}
                type="number"
                placeholder="ערך"
                value={w.value}
                onChange={e => setWord(i, "value", e.target.value)}
              />
              <button
                type="button"
                style={S.removeBtn}
                onClick={() => removeWord(i)}
                disabled={words.length === 1}
              >×</button>
            </div>
          ))}
          <button type="button" style={S.addBtn} onClick={addWord}>
            + הוסף מילה
          </button>

          {/* תמונה */}
          <div style={S.sectionTitle}>תמונה</div>
          <label style={{
            display: "block",
            background: "#13132a",
            border: "1px dashed #2d2d4e",
            borderRadius: 7,
            padding: "16px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 18,
            color: "#a0a0c0",
            fontFamily: "'Heebo', sans-serif",
            fontSize: 14,
          }}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 6, display: "block", margin: "0 auto 8px" }} />
            ) : "לחץ לבחירת תמונה"}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>

          <button
            type="submit"
            style={{ ...S.submit, opacity: status === "saving" ? 0.6 : 1 }}
            disabled={status === "saving"}
          >
            {status === "saving" ? "שומר..." : "שמור ממצא"}
          </button>

          {status === "ok" && (
            <div style={S.success}>✓ הממצא נשמר בהצלחה ב-Supabase!</div>
          )}
          {status === "error" && (
            <div style={S.error}>שגיאה: {errorMsg}</div>
          )}
        </form>
      </div>
    </div>
  );
}
