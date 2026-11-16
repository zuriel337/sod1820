# Smaller images for old Posts — proposal for decision (16 November 2026)

Proposal only, separate from the shell diet and from the reading prelude. Nothing here is implemented, merged or deployed. Owners it would extend: the Post reader's image rendering and the existing Storage render endpoint (already used for avatars). It needs ZURIEL's decision on cost before any code.

## What is known

- On old posts the largest paint is an image that finishes about 2.5 s after the text in the lab (Slow 4G, 4× CPU, cold; `docs/reviews/shell-diet-20261116/lab-results.md`).
- On 410 migrated WordPress posts every `srcset` candidate is the same full-size file, so a phone always downloads the original (`docs/reviews/post-cover-hint-20261116`).
- Supabase has a render endpoint that returns a resized copy. A copy that is not yet cached costs a transform on its first request (measured 0.9–1.9 s on a miss), and transforms are billed per original image.
- Neither the shell diet nor the reading prelude makes the image file smaller.

## The shape that would work

Width-bounded copies for the widths the reader actually uses (phone and desktop column), produced once per original rather than on the first visitor's request, and referenced from the existing `srcset`. The original stays the source and the fallback.

## What must be decided and measured first

1. The billing: how many originals (old posts and their body images), at what price per transform, once or per change.
2. Who pays the first transform: a one-time warm-up, or the first visitor (0.9–1.9 s on a miss).
3. In the lab: the LCP change on cover-largest and body-image-largest posts, with CLS unchanged.
4. Release only on an explicit approval of the exact commit and deployment.
