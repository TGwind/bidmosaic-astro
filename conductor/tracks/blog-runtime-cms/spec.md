# Track: Blog runtime CMS-lite

## Goal
Move blog content out of `src/content/blog` and allow operations to upload/manage posts and images at runtime.

## Requirements
- Filesystem-backed storage root (`BLOG_STORAGE_ROOT`)
- No database required
- Admin upload UI (`/admin`)
- Admin API endpoints under `/api/admin/*` protected by a server token
- Blog list + detail pages read runtime storage (SSR) and reflect updates immediately

## Acceptance
- Upload a Markdown post and see it on `/blog` or `/en/blog` without rebuilding
- Upload an image and reference it in the post content
- Draft posts do not show on public pages

