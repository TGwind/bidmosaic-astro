# Plan: Keystatic Migration

1. Add Keystatic dependencies and Astro integration.
2. Define Keystatic content schema for blog posts (ZH/EN) and choose a locale directory layout.
3. Migrate existing seed posts into the chosen structure (mechanical move + adjust frontmatter if needed).
4. Switch public blog pages to use Astro Content Collections only (remove runtime storage reads and fallbacks).
5. Delete custom admin UI and API routes, remove runtime storage modules, and clean env vars/docs.
6. Verify build (`npm run build`) and basic navigation for both locales.

