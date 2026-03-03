# Track: Keystatic CMS for Blog Publishing

## Goal
Replace the custom runtime blog CMS (`/admin`, `/api/admin/*`, `.bidmosaic-blog` filesystem storage) with Keystatic as the official open-source publishing backend.

The public website should render blog content from the repo (`src/content/blog/*`) via Astro Content Collections, with content updates delivered through the normal build/deploy pipeline (Git-backed history).

## Scope
In scope:
- Integrate Keystatic into the Astro project as the blog authoring UI.
- Make `src/content/blog` the single source of truth for public blog pages.
- Remove custom admin UI and admin API routes.
- Remove runtime blog storage module and related env vars.

Out of scope (initially):
- Migrating historical runtime posts from `.bidmosaic-blog` into repo (optional follow-up).
- Advanced workflows (review/approval, scheduled publishing).

## Requirements
Content model (both locales):
- `title` (string, required)
- `description` (string, required)
- `date` (YYYY-MM-DD, required)
- `author` (string, required; default "Bidmosaic")
- `tags` (string list, optional)
- `image` (string/asset path, optional)
- `body` (Markdown content, required)

Locale structure:
- Repo content organized per locale, recommended:
  - `src/content/blog/zh/<slug>.md`
  - `src/content/blog/en/<slug>.md`

Public pages:
- `/zh/blog/` and `/zh/blog/[slug]/` read only `src/content/blog/zh/*`
- `/blog/` and `/blog/[slug]/` read only `src/content/blog/en/*`

Security:
- Keystatic admin route must not be publicly editable without authentication.
  - Preferred: GitHub-backed editing (commit/PR) with provider auth.
  - Minimum: restrict Keystatic to non-production until auth is configured.

## Acceptance Criteria
- Editors can create/edit a Chinese post and an English post through Keystatic, committed into the repo.
- After deploy, the posts appear on the corresponding public blog index and detail pages.
- Custom admin UI pages are removed:
  - `src/pages/admin/index.astro`
  - `src/pages/zh/admin/index.astro`
  - `src/components/admin/BlogAdminPage.astro`
- Custom admin APIs are removed:
  - `src/pages/api/admin/**`
- Runtime blog storage is removed:
  - `src/lib/server/blog/storage.ts` and `src/lib/server/blog/public.ts` are no longer used (and can be deleted when clean).
- `.env` no longer needs `ADMIN_TOKEN` / `BLOG_STORAGE_ROOT` for blog publishing.

## Risks / Notes
- This migration changes the publishing model from "upload instantly live" to "Git + build/deploy".
- Keystatic dependency installation requires npm registry access in the development environment.

