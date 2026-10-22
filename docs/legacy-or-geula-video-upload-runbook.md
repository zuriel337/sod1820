# Legacy Or Geula video publication runbook

Use this runbook only for an explicitly approved, single-item publication to the
Legacy `or-geula` feed. It does not authorize a deployment, a 2029 publication,
or any schema, RLS, permission, Auth, or configuration change.

## Canonical route

1. Verify live coordination and resolve `legacy_content_protocol` before writing.
2. Resolve the exact source file and record its size, MIME type, and SHA-256.
3. Validate the original with `ffprobe`. Preserve the source bytes; do not
   transcode the publication copy.
4. Upload the MP4 through the existing `AGENT_MEDIA_UPLOAD_BRIDGE_V1`:
   - bucket: `media`
   - path: `sod1820/2029/video/YYYY/MM/<asset_uuid>/original.mp4`
   - MIME: `video/mp4`
   - overwrite: `false`
   - ticket TTL: at most 600 seconds
   - require the bridge response to report `verified=true` and matching SHA-256,
     size, MIME, bucket, and path.

   The `sod1820/2029/video` object namespace is the existing forward-only media
   storage convention used by new Or Geula videos. It is storage identity only:
   the Legacy publication boundary is the `channel_updates` row below. Do not
   create a 2029 post, finding, world item, or surface entry as part of this flow.
5. Before inserting, check for an existing row with the same public media URL or
   the same caption in the intended time window. Stop on a duplicate.
6. Insert exactly one `public.channel_updates` row:
   - `channel = 'or-geula'`
   - `text = <approved caption>`
   - `image_url = <verified public MP4 URL>`
   - `source = 'admin'`
   - `status = 'live'`
   - `priority = 50`
   - `expires_at = null` unless the approval specifies an expiry
   - `credit = 'אור הגאולה'`
   - `link_url = 'https://sod1820.co.il/or-geula/video/<row_uuid>'`
   - for an explicitly Legacy-only publication with a final approved caption,
     also set `seo_title = text`, `enrichment_status = 'enriched'`,
     `enrichment_source = 'caption'`, and `enriched_at = now()`. This prevents
     the scheduled enrichment worker from expanding the item into a semantic
     research-map write outside the approved Legacy-only scope.
7. Extract a representative JPEG frame locally without changing the MP4. Submit
   it to the existing `capture-video-thumb` function with the new row UUID. The
   function writes the canonical poster and fills `thumb_url` only when empty.

## Required acceptance

Publication is complete only after all of these pass:

- a read-only database check returns one live `or-geula` row with the exact
  approved caption, media URL, poster URL, and canonical watch URL;
- an anonymous PostgREST read returns that same row, proving the public Legacy
  reader can see it under the existing policy;
- HTTP read-back and `ffprobe` confirm the public object is the expected MP4,
  with the expected size, duration, codecs, and dimensions;
- a real browser reaches `readyState >= 3`, reports no media error, and advances
  `currentTime` after `play()`;
- the protected production watch route returns the application shell through an
  authorized Vercel read path. Do not disable or broaden Deployment Protection.

## Rollback

If the row or playback is wrong, first set only that row's `status` to `off` and
verify that it disappears from the public feed. Keep the media object for
forensics. Deleting the row or object requires separate explicit approval.

## Boundaries

- Never put Dropbox temporary URLs in `channel_updates`; they expire.
- Never print upload tickets, admin keys, service-role keys, or Vercel tokens.
- Never reuse an upload ticket or overwrite an existing media object.
- Do not run migrations, deploy functions or the site, or change RLS/permissions
  for a content publication.
- Record one bounded passive BEFORE/AFTER coordination batch to `ZURIEL` with no
  dispatch and no ACK wait.
