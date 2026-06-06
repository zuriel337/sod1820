import { useState } from "react";

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
  valueTag: {
    background: "#1a1a35",
    border: "1px solid #2d2d4e",
    borderRadius: 5,
    color: "#f59e0b",
    padding: "10px 10px",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    minWidth: 60,
    boxSizing: "border-box",
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
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setWord = (i, k, v) =>
    setWords(ws => ws.map((w, idx) => idx === i ? { ...w, [k]: v } : w));

  const addWord = () => setWords(ws => [...ws, { ...EMPTY_WORD }]);
  const removeWord = i => setWords(ws => ws.filter((_, idx) => idx !== i));

  const handleSubmit = e => {
    e.preventDefault();
    console.log("ממצא גמטריה:", { ...form, words });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
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
                required
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

          <button type="submit" style={S.submit}>שמור ממצא</button>

          {submitted && (
            <div style={S.success}>✓ הממצא נשמר בהצלחה!</div>
          )}
        </form>
      </div>
    </div>
  );
}
