// Delivery integrity of the existing witness, not research/engine verification.
export async function readBookPdfBytes2029(manifest, { signal, onProgress } = {}) {
  if (!/^https:\/\//.test(manifest.pdfUrl) || !/^[a-f0-9]{64}$/.test(manifest.pdfSha256) || !Number.isSafeInteger(manifest.pdfBytes) || manifest.pdfBytes < 1) throw new Error("book_pdf_manifest");
  const response = await fetch(manifest.pdfUrl, { credentials: "omit", signal });
  if (!response.ok || !/application\/pdf/i.test(response.headers.get("content-type") || "")) throw new Error("book_pdf_response");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("book_pdf_stream");
  let loaded = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      if (loaded > manifest.pdfBytes) throw new Error("book_pdf_size");
      chunks.push(value);
      onProgress?.({ loaded, total: manifest.pdfBytes });
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  if (loaded !== manifest.pdfBytes) throw new Error("book_pdf_size");
  const data = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  const digest = await crypto.subtle.digest("SHA-256", data);
  const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (sha256 !== manifest.pdfSha256) throw new Error("book_pdf_witness_mismatch");
  return data;
}
