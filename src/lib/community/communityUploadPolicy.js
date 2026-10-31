// One public upload contract consumed by validation and the protected Preview.
export const COMMUNITY_UPLOAD_POLICY = Object.freeze({
  maxFiles: 3, fileMaxBytes: 8 * 1024 * 1024, videoMaxBytes: 50 * 1024 * 1024,
  types: Object.freeze({
    "image/jpeg": { extensions: ["jpg", "jpeg"], kind: "image" },
    "image/png": { extensions: ["png"], kind: "image" },
    "image/webp": { extensions: ["webp"], kind: "image" },
    "image/gif": { extensions: ["gif"], kind: "image" },
    "application/pdf": { extensions: ["pdf"], kind: "file" },
    "text/plain": { extensions: ["txt"], kind: "file" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensions: ["docx"], kind: "file" },
    "video/mp4": { extensions: ["mp4"], kind: "video" },
    "video/webm": { extensions: ["webm"], kind: "video" },
    "video/quicktime": { extensions: ["mov"], kind: "video" },
  }),
});
