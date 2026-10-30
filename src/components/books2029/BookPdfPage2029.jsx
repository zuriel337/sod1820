import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import jbig2Url from "pdfjs-dist/wasm/jbig2.wasm?url";
import jbig2FallbackUrl from "pdfjs-dist/wasm/jbig2_nowasm_fallback.js?url";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { readBookPdfBytes2029 } from "./bookPdfSource2029.js";
import "./bookPdfPage2029.css";

GlobalWorkerOptions.workerSrc = workerUrl;
const fontAssets = import.meta.glob("../../../node_modules/pdfjs-dist/standard_fonts/*.{ttf,pfb}", { eager: true, query: "?url", import: "default" });
const fonts = Object.fromEntries(Object.entries(fontAssets).map(([path, url]) => [path.split("/").at(-1), url]));
const wasm = { "jbig2.wasm": jbig2Url, "jbig2_nowasm_fallback.js": jbig2FallbackUrl };

class BookPdfBinaryDataFactory {
  async fetch({ kind, filename }) {
    const table = kind === "wasmUrl" ? wasm : kind === "standardFontDataUrl" ? fonts : null;
    const url = table && Object.hasOwn(table, filename) ? table[filename] : null;
    if (!url) throw new Error("book_pdf_unsupported_asset");
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error("book_pdf_asset_unavailable");
    return new Uint8Array(await response.arrayBuffer());
  }
}

// A page renderer inside the canonical reader, not another reader/navigation surface.
export default function BookPdfPage2029({ manifest, page, selectionKey }) {
  const container = useRef(null), canvas = useRef(null);
  const [width, setWidth] = useState(0);
  const [documentState, setDocumentState] = useState(null);
  const [progress, setProgress] = useState(null);
  const [failure, setFailure] = useState(false);
  const [paint, setPaint] = useState(null);
  const source = manifest.pdfUrl;
  const documentReady = documentState?.source === source && documentState?.sha256 === manifest.pdfSha256;
  const painted = documentReady && paint?.source === source && paint?.sha256 === manifest.pdfSha256 && paint?.page === page && paint?.width === width;

  useEffect(() => {
    const element = container.current;
    const measure = () => setWidth(Math.max(0, Math.floor(element.clientWidth)));
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    let active = true, task;
    setFailure(false); setProgress(null); setDocumentState(null); setPaint(null);
    (async () => {
      const bytes = await readBookPdfBytes2029(manifest, { signal: abort.signal, onProgress: value => { if (active) setProgress(value); } });
      if (!active) return;
      setProgress(null);
      task = getDocument({ data: bytes, isEvalSupported: false, enableXfa: false, enableHWA: false, useWorkerFetch: false, BinaryDataFactory: BookPdfBinaryDataFactory, stopAtErrors: true, maxImageSize: 16_000_000 });
      const document = await task.promise;
      if (document.numPages !== manifest.pdfPages) throw new Error("book_pdf_page_count");
      if (active) setDocumentState({ source, sha256: manifest.pdfSha256, document });
    })().catch(() => { if (!active) return; setFailure(true); void task?.destroy().catch(() => {}); });
    return () => { active = false; abort.abort(); void task?.destroy().catch(() => {}); };
  }, [source, manifest.pdfSha256, manifest.pdfBytes, manifest.pdfPages]);

  useEffect(() => {
    container.current.scrollTop = 0;
  }, [source, page, selectionKey]);

  useEffect(() => {
    if (!documentReady || width < 1) return;
    let active = true, renderTask, pdfPage;
    const buffer = document.createElement("canvas");
    setFailure(false);
    (async () => {
      if (!Number.isInteger(page) || page < 1 || page > manifest.pdfPages) throw new Error("book_pdf_page");
      pdfPage = await documentState.document.getPage(page);
      if (!active) return;
      const unit = pdfPage.getViewport({ scale: 1 });
      const cssHeight = width * unit.height / unit.width;
      const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (width * cssHeight)));
      const viewport = pdfPage.getViewport({ scale: width / unit.width * density });
      buffer.width = Math.ceil(viewport.width); buffer.height = Math.ceil(viewport.height);
      renderTask = pdfPage.render({ canvas: buffer, viewport });
      await renderTask.promise;
      if (!active) return;
      const target = canvas.current;
      target.width = buffer.width; target.height = buffer.height;
      target.getContext("2d", { alpha: false }).drawImage(buffer, 0, 0);
      setPaint({ source, sha256: manifest.pdfSha256, page: pdfPage.pageNumber, width });
    })().catch(error => { if (active && error.name !== "RenderingCancelledException") setFailure(true); }).finally(() => { buffer.width = 0; buffer.height = 0; pdfPage?.cleanup(); });
    return () => { active = false; renderTask?.cancel(); };
  }, [documentReady, documentState, width, page, source, manifest.pdfPages, manifest.pdfSha256]);

  return <div ref={container} className="book-pdf-page29" role="region" tabIndex={0} aria-label={`${manifest.title}, עמוד המקור ${page}`} data-book-pdf-renderer="controlled" data-book-pdf-source={source} data-book-requested-page={page} data-book-rendered-href={painted && !failure ? `${source}#page=${paint.page}&view=FitH` : undefined} data-book-source-sha256={manifest.pdfSha256} aria-busy={!painted && !failure}>
    <canvas ref={canvas} key={page} data-book-pdf-canvas="true" data-book-pdf-page={painted ? paint.page : undefined} data-book-pdf-page-count={documentReady ? documentState.document.numPages : undefined} data-book-pdf-painted={painted && !failure ? "true" : "false"} role="img" aria-label={`${manifest.title}, צילום עמוד PDF ${page}`} style={{ visibility: painted && !failure ? "visible" : "hidden" }} />
    {!painted && !failure ? <div className="book-pdf-page29-status"><CanonicalProgress compact title="טעינת עמוד המקור" detail={documentReady ? "הכנת צילום העמוד לקריאה" : "פתיחת קובץ הספר"} current={documentReady ? null : progress?.loaded} total={documentReady ? null : progress?.total} /></div> : null}
    {failure ? <div className="book-pdf-page29-status" role="status"><p>לא ניתן להציג כרגע את צילום העמוד.</p><a href={`${source}#page=${page}&view=FitH`} target="_blank" rel="noreferrer">פתח את ה־PDF המקורי · עמוד {page}</a></div> : null}
  </div>;
}
