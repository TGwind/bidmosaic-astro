import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.bidmosaic.com',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    server: { watch: { ignored: ['**/backup/**'] } },
  },
  integrations: [react(), markdoc(), keystatic()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  image: {
    domains: [],
  },
});
