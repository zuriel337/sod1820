import React, { useLayoutEffect, useRef, useState } from "react";
import { DESIGN_V2_PALETTES, use2029Palette } from "../../lib/palette.js";
import { encodeMessageFormatting, parseMessageFormatting, plainMessageText } from "../../lib/community/messageFormatting.js";

const colorKey = value => String(value || "").replace(/\s/g, "").toLowerCase();
const tones = new Map();
for (const palette of Object.values(DESIGN_V2_PALETTES)) {
  for (const [tone, value] of [["gold", palette.warmAccent], ["blue", palette.accentText]]) {
    const hex = value.replace("#", "");
    tones.set(colorKey(value), tone);
    tones.set(`rgb(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)})`, tone);
  }
}
const EMOJI = ["😀", "😊", "❤️", "👍", "🙏", "✨", "🎉", "💡", "🌷", "🕊️", "👏", "🤔"];

function fillEditor(editor, value) {
  const doc = editor.ownerDocument;
  const build = nodes => nodes.map(node => {
    if (node.type === "text") return doc.createTextNode(node.text);
    const tag = { bold: "strong", underline: "u", quote: "blockquote" }[node.type] || "span";
    const element = doc.createElement(tag);
    if (node.type === "gold" || node.type === "blue") element.className = `sod29-community-text-${node.type}`;
    element.append(...build(node.children)); return element;
  });
  editor.replaceChildren(...build(parseMessageFormatting(value)));
}

function readEditor(editor) {
  const view = editor.ownerDocument.defaultView;
  const visitChildren = parent => {
    const nodes = [];
    for (const node of parent.childNodes) {
      if (node.nodeType === 3) {
        if (!node.textContent) continue;
        const style = view.getComputedStyle(node.parentElement);
        let underline = false;
        for (let current = node.parentElement; current && current !== editor; current = current.parentElement) {
          if (view.getComputedStyle(current).textDecorationLine.includes("underline")) underline = true;
        }
        let result = { type: "text", text: node.textContent };
        const tone = tones.get(colorKey(style.color));
        if (tone) result = { type: tone, children: [result] };
        if (underline) result = { type: "underline", children: [result] };
        if (Number(style.fontWeight) >= 600 || style.fontWeight === "bold") result = { type: "bold", children: [result] };
        nodes.push(result);
      } else if (node.nodeType === 1) {
        if (node.tagName === "BR") { nodes.push({ type: "text", text: "\n" }); continue; }
        const children = visitChildren(node);
        if (node.tagName === "BLOCKQUOTE") nodes.push({ type: "quote", children });
        else {
          const block = ["DIV", "P"].includes(node.tagName);
          if (block && nodes.length && !plainMessageText(encodeMessageFormatting(nodes)).endsWith("\n")) nodes.push({ type: "text", text: "\n" });
          nodes.push(...children);
          if (block && node.nextSibling) nodes.push({ type: "text", text: "\n" });
        }
      }
    }
    return nodes;
  };
  return encodeMessageFormatting(visitChildren(editor));
}

export default function CommunityRichText2029({ id, inputRef, value, onChange, onFocus, onKeyDown, expanded = true, disabled = false, maxLength = 1500, maxEncodedLength = 5000, label = "מה תרצו לשתף?", placeholder = "הוסף תגובה…" }) {
  const localRef = useRef(null), editorRef = inputRef || localRef;
  const lastValue = useRef(null), lastPreset = useRef(null), savedRange = useRef(null), composing = useRef(false), inputRevision = useRef(0);
  const palette = use2029Palette();
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [active, setActive] = useState({ bold: false, underline: false });
  const remember = () => {
    const editor = editorRef.current, selection = editor?.ownerDocument.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
    if (editor) setActive({ bold: editor.ownerDocument.queryCommandState("bold"), underline: editor.ownerDocument.queryCommandState("underline") });
  };
  const moveToEnd = editor => {
    const range = editor.ownerDocument.createRange(), selection = editor.ownerDocument.getSelection();
    range.selectNodeContents(editor); range.collapse(false); selection.removeAllRanges(); selection.addRange(range); savedRange.current = range.cloneRange();
  };
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastValue.current === value && lastPreset.current === palette.preset) return;
    const focused = editor.ownerDocument.activeElement === editor;
    fillEditor(editor, value); lastValue.current = value; lastPreset.current = palette.preset; savedRange.current = null;
    if (focused) moveToEnd(editor);
  }, [value, palette.preset]);
  // The placeholder follows the real content at once, including while a word is
  // still being composed (phone keyboards keep the word "in composition" until
  // it is committed, and the draft state is not updated until then).
  const syncEmpty = () => { const editor = editorRef.current; if (editor) editor.setAttribute("data-empty", String(!editor.textContent)); };
  const change = () => {
    if (composing.current) return;
    const next = readEditor(editorRef.current);
    if (plainMessageText(next).length > maxLength || next.length > maxEncodedLength) {
      fillEditor(editorRef.current, value); moveToEnd(editorRef.current); setError("ההודעה הגיעה לאורך המרבי."); return;
    }
    lastValue.current = next; setError(""); onChange(next); remember();
  };
  const command = (name, argument) => {
    if (disabled) return;
    const editor = editorRef.current, doc = editor.ownerDocument, selection = doc.getSelection();
    editor.focus({ preventScroll: true });
    const range = savedRange.current;
    if (range && editor.contains(range.commonAncestorContainer)) { selection.removeAllRanges(); selection.addRange(range); }
    else moveToEnd(editor);
    const revision = inputRevision.current;
    doc.execCommand(name, false, argument);
    if (revision === inputRevision.current) change();
    else remember();
  };
  return <div className="sod29-community-rich-wrap" style={{ "--community-text-gold": palette.warmAccent, "--community-text-blue": palette.accentText }}>
    <div ref={editorRef} id={id} className="sod29-community-rich-input" contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" aria-disabled={disabled} aria-describedby={error ? `${id}-error` : undefined} data-placeholder={placeholder} data-empty={!plainMessageText(value)} dir="auto"
      onFocus={event => { onFocus?.(event); remember(); }} onBlur={remember} onSelect={remember} onMouseUp={remember} onKeyUp={remember} onInput={() => { inputRevision.current++; syncEmpty(); change(); }}
      onCompositionStart={() => { composing.current = true; syncEmpty(); }} onCompositionUpdate={syncEmpty} onCompositionEnd={() => { composing.current = false; syncEmpty(); change(); }}
      onPaste={event => { event.preventDefault(); remember(); command("insertText", event.clipboardData.getData("text/plain")); }}
      onDrop={event => { event.preventDefault(); if (!event.dataTransfer.files.length) { remember(); command("insertText", event.dataTransfer.getData("text/plain")); } }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented) return;
        if ((event.ctrlKey || event.metaKey) && ["b", "u"].includes(event.key.toLowerCase())) { event.preventDefault(); remember(); command(event.key.toLowerCase() === "b" ? "bold" : "underline"); }
        if (event.key === "Escape") setEmojiOpen(false);
      }} />
    <div className="sod29-community-format-tools" role="group" aria-label="עיצוב הטקסט" hidden={!expanded} onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()}>
      <button type="button" disabled={disabled} aria-label="הדגשה" title="הדגשה" aria-pressed={active.bold} onClick={() => command("bold")}><strong aria-hidden="true">B</strong></button>
      <button type="button" disabled={disabled} aria-label="קו תחתון" title="קו תחתון" aria-pressed={active.underline} onClick={() => command("underline")}><u aria-hidden="true">U</u></button>
      <button type="button" disabled={disabled} aria-label="צבע זהב" title="צבע זהב" className="sod29-community-text-gold" onClick={() => command("foreColor", palette.warmAccent)}><span aria-hidden="true">א</span></button>
      <button type="button" disabled={disabled} aria-label="צבע כחול" title="צבע כחול" className="sod29-community-text-blue" onClick={() => command("foreColor", palette.accentText)}><span aria-hidden="true">א</span></button>
      <button type="button" disabled={disabled} aria-label="ניקוי עיצוב" title="ניקוי עיצוב" onClick={() => command("removeFormat")}><span aria-hidden="true">Tx</span></button>
      <button type="button" disabled={disabled} aria-label="אימוג׳ים" title="אימוג׳ים" aria-expanded={emojiOpen} aria-controls={`${id}-emoji`} onClick={() => setEmojiOpen(open => !open)}><span aria-hidden="true">☺</span></button>
    </div>
    {expanded && emojiOpen ? <div id={`${id}-emoji`} className="sod29-community-emoji-picker" role="group" aria-label="בחירת אימוג׳י" onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onKeyDown={event => { if (event.key === "Escape") setEmojiOpen(false); }}>{EMOJI.map(emoji => <button key={emoji} type="button" disabled={disabled} aria-label={`הוספת ${emoji}`} onClick={() => { command("insertText", emoji); setEmojiOpen(false); }}>{emoji}</button>)}</div> : null}
    {error ? <span id={`${id}-error`} role="alert" className="sod29-community-status">{error}</span> : null}
  </div>;
}
