import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    author: z.string().default('Bidmosaic'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    locale: z.enum(['zh', 'en']),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

const insights = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    domain: z.enum(['tech', 'ai', 'finance', 'ecommerce', 'policy', 'crypto', 'general']).default('tech'),
    tags: z.array(z.string()).default([]),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    importance: z.number().min(1).max(10).default(5),
    publishedAt: z.string(),
    tier: z.enum(['free', 'pro']).default('free'),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

export const collections = { blog, insights };
