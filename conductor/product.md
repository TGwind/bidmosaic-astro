# Bidmosaic Website

## What
Marketing website built with Astro, including a bilingual blog (ZH/EN).

## Why
Publish industry/marketing content and product updates to support inbound leads and brand credibility.

## Blog (Keystatic CMS)
Goal: use an open-source, file-based CMS (Keystatic) so non-developers can create/edit bilingual blog posts via an admin UI, with content stored in the repo as Markdown and shipped via the normal build/deploy pipeline.

Key capabilities:
- Create/edit posts in a CMS UI (no hand-editing Markdown)
- Git-backed history (review, rollback)
- Tagging and bilingual organization (`zh`/`en`)
- Public site renders from repo content (no runtime upload storage)
