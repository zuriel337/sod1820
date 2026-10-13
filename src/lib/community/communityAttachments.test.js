import test from "node:test";
import assert from "node:assert/strict";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_MAX_BYTES, uploadCommunityAttachment, validateCommunityAttachment } from "./communityAttachments.js";
import { supabase } from "../supabase.js";

test("accepts images, GIFs and documents with matching MIME and extension", () => {
  for (const [name, type] of [["a.jpg", "image/jpeg"], ["a.gif", "image/gif"], ["a.pdf", "application/pdf"], ["a.txt", "text/plain"], ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]]) {
    assert.equal(validateCommunityAttachment({ name, type, size: 200 }).name, name);
  }
  for (const [name, type] of [["a.svg", "image/svg+xml"], ["a.html", "text/html"], ["a.pdf", "image/png"], ["a.exe", "application/pdf"]]) {
    assert.throws(() => validateCommunityAttachment({ name, type, size: 200 }));
  }
  assert.throws(() => validateCommunityAttachment({ name: "large.pdf", type: "application/pdf", size: COMMUNITY_ATTACHMENT_MAX_BYTES + 1 }));
});

test("adds attachment links to the existing message body", () => {
  assert.equal(appendCommunityAttachments("שלום", [{ name: "מקור.pdf", url: "https://example.com/a.pdf" }]), "שלום\n\n📎 מקור.pdf\nhttps://example.com/a.pdf");
});

test("uploads through the existing public Community gallery path", async () => {
  const original = supabase.storage.from;
  let path;
  supabase.storage.from = () => ({
    upload: async (value, _file, options) => { path = value; assert.deepEqual(options, { upsert: false, contentType: "application/pdf" }); return { error: null }; },
    getPublicUrl: (value) => ({ data: { publicUrl: `https://example.com/${value}` } }),
  });
  try {
    const uploaded = await uploadCommunityAttachment({ name: "מקור.pdf", type: "application/pdf", size: 20 });
    assert.match(path, /^community\/[0-9a-f-]{36}\.pdf$/);
    assert.equal(uploaded.url, `https://example.com/${path}`);
  } finally { supabase.storage.from = original; }
});
