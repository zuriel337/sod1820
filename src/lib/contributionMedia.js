import { supabase } from "./supabase.js";
import { uploadResumableMedia } from "./mediaResumableUpload.js";

export function mediaKindFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if ([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ].includes(m)) return "document";
  return null;
}

async function invoke(body) {
  if (!supabase) throw new Error("Supabase unavailable");
  const { data, error } = await supabase.functions.invoke("media-upload-intent", { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "media upload action failed");
  return data;
}

export async function issueContributionMediaUpload(file) {
  const kind = mediaKindFromMime(file?.type);
  if (!file || !kind) throw new Error("unsupported contribution media");
  return invoke({
    action: "issue",
    scope: "submission",
    kind,
    mime: file.type,
    size: file.size,
    filename: file.name,
  });
}

export async function uploadContributionMediaFile(file, { onProgress, signal } = {}) {
  const intent = await issueContributionMediaUpload(file);
  await uploadResumableMedia(file, intent, { onProgress, signal });
  const verified = await invoke({
    action: "verify",
    scope: "submission",
    path: intent.path,
    mime: intent.mime,
    size: intent.size,
  });
  if (!verified?.checks?.size_match || !verified?.checks?.mime_match) throw new Error("uploaded media verification failed");
  return { intent, verified };
}

export async function bindContributionMedia(contributionId, uploadResult, role = "attachment") {
  const path = uploadResult?.intent?.path || uploadResult?.path;
  if (!contributionId || !path) throw new Error("contribution and uploaded media are required");
  const { data, error } = await supabase.rpc("bind_contribution_media", {
    p_contribution_id: contributionId,
    p_storage_path: path,
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function getPrivateContributionMediaUrl(contributionId, mediaRef) {
  const storageObjectId = mediaRef?.storage_object_id;
  if (!contributionId || !storageObjectId) throw new Error("private media reference required");
  return invoke({
    action: "read_contribution_media",
    contribution_id: contributionId,
    storage_object_id: storageObjectId,
  });
}
