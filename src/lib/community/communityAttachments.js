import { supabase } from "../supabase.js";
import { COMMUNITY_UPLOAD_POLICY } from "./communityUploadPolicy.js";

export const COMMUNITY_ATTACHMENT_MAX_FILES = COMMUNITY_UPLOAD_POLICY.maxFiles;
export const COMMUNITY_ATTACHMENT_MAX_BYTES = COMMUNITY_UPLOAD_POLICY.fileMaxBytes;
export const COMMUNITY_VIDEO_MAX_BYTES = COMMUNITY_UPLOAD_POLICY.videoMaxBytes;
export const COMMUNITY_ATTACHMENT_ACCEPT = Object.keys(COMMUNITY_UPLOAD_POLICY.types).join(",");

const TYPES = COMMUNITY_UPLOAD_POLICY.types;

export function validateCommunityAttachment(file) {
  const name = String(file?.name || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80);
  const extension = name.split(".").pop()?.toLowerCase();
  const type = TYPES[String(file?.type || "").toLowerCase()];
  if (!name || !type || !type.extensions.includes(extension)) throw new Error("אפשר לצרף תמונה, GIF, מסמך או סרטון MP4, WebM או MOV.");
  const limit = type.kind === "video" ? COMMUNITY_VIDEO_MAX_BYTES : COMMUNITY_ATTACHMENT_MAX_BYTES;
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > limit) throw new Error(type.kind === "video" ? "גודל סרטון חייב להיות עד 50MB." : "גודל קובץ חייב להיות עד 8MB.");
  return { name, extension, kind: type.kind, contentType: String(file.type).toLowerCase() };
}

export async function uploadCommunityAttachment(file) {
  const validated = validateCommunityAttachment(file);
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data?.user?.id) throw Object.assign(new Error("יש להתחבר כדי לצרף קבצים."), { code: "AUTH_REQUIRED" });
  const path = `community/${data.user.id}/${crypto.randomUUID()}.${validated.extension}`;
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
