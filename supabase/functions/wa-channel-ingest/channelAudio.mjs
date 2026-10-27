// Ingest-side media signature check shared by Deno and Node tests.
// Only known audio payloads are accepted; a provider HTML/error page is never published as audio.
export function detectChannelAudio(bytes, mimeHint = "") {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (b.length < 4) return null;
  const ascii = (from, len) => String.fromCharCode(...b.subarray(from, from + len));
  const ogg = ascii(0, 4) === "OggS";
  const wav = b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
  const mp4 = b.length >= 12 && ascii(4, 4) === "ftyp";
  const mp3 = ascii(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0);
  const aac = b[0] === 0xff && (b[1] & 0xf6) === 0xf0;
  const webm = b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  const detected = ogg ? { mime: "audio/ogg", ext: "ogg" }
    : wav ? { mime: "audio/wav", ext: "wav" }
    : mp4 ? { mime: "audio/mp4", ext: "m4a" }
    : webm ? { mime: "audio/webm", ext: "webm" }
    : aac ? { mime: "audio/aac", ext: "aac" }
    : mp3 ? { mime: "audio/mpeg", ext: "mp3" }
    : null;
  if (!detected) return null;
  const hint = String(mimeHint || "").split(";")[0].trim().toLowerCase();
  const aliases = { "audio/x-m4a": "audio/mp4", "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav",
    "audio/x-aac": "audio/aac", "audio/opus": "audio/ogg", "application/ogg": "audio/ogg" };
  const expected = aliases[hint] || hint;
  if (expected && expected !== "application/octet-stream" && expected !== "binary/octet-stream" && expected !== detected.mime) return null;
  return detected;
}

export function isChannelMessageType(type) {
  return ["textMessage", "extendedTextMessage", "imageMessage", "videoMessage", "audioMessage", "quotedMessage"].includes(type);
}
