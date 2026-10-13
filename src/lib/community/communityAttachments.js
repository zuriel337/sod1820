import { supabase } from "../supabase.js";

export const COMMUNITY_ATTACHMENT_MAX_FILES = 3;
export const COMMUNITY_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;

const TYPES = Object.freeze({
  "image/jpeg": { extensions: ["jpg", "jpeg"], kind: "image" },
  "image/png": { extensions: ["png"], kind: "image" },
  "image/webp": { extensions: ["webp"], kind: "image" },
  "image/gif": { extensions: ["gif"], kind: "image" },
  "application/pdf": { extensions: ["pdf"], kind: "file" },
  "text/plain": { extensions: ["txt"], kind: "file" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensions: ["docx"], kind: "file" },
});

export function validateCommunityAttachment(file) {
  const name = String(file?.name || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80);
  const extension = name.split(".").pop()?.toLowerCase();
  const type = TYPES[String(file?.type || "").toLowerCase()];
  if (!name || !type || !type.extensions.includes(extension)) throw new Error("אפשר לצרף תמונה, GIF, PDF, TXT או DOCX בלבד.");
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > COMMUNITY_ATTACHMENT_MAX_BYTES) throw new Error("גודל קובץ חייב להיות עד 8MB.");
  return { name, extension, kind: type.kind, contentType: file.type };
}

export async function uploadCommunityAttachment(file) {
  const validated = validateCommunityAttachment(file);
  const path = `community/${crypto.randomUUID()}.${validated.extension}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { upsert: false, contentType: validated.contentType });
  if (error) throw error;
  const url = supabase.storage.from("gallery").getPublicUrl(path).data?.publicUrl;
  if (!url) throw new Error("כתובת הקובץ לא התקבלה.");
  return { url, name: validated.name, kind: validated.kind };
}

export function appendCommunityAttachments(body, attachments) {
  const parts = [String(body || "").trim(), ...attachments.map(({ name, url }) => `📎 ${name}\n${url}`)];
  return parts.filter(Boolean).join("\n\n");
}
