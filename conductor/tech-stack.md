# Tech Stack

## Runtime
- Astro 5 + `@astrojs/node` adapter (SSR)

## Content
- Astro Content Collections (`src/content/*`) as the source of truth
- Markdown in-repo (frontmatter + body)

## CMS
- Keystatic (open-source, file-based CMS) to edit content in `src/content/*`

## Dependencies (blog rendering)
- Uses Astro content rendering (`astro:content`) and existing Markdown pipeline
- `@astrojs/markdoc` is available if we later choose `.mdoc` for richer authoring
