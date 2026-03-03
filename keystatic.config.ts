import { collection, config, fields } from '@keystatic/core';

const postSchema = (locale: 'zh' | 'en') => ({
  title: fields.text({ label: '标题', validation: { isRequired: true } }),
  entry: fields.slug({
    name: {
      label: '标题（用于生成 slug）',
      description: '用于生成 URL slug 和文件名。建议与“标题”保持一致。',
      validation: { isRequired: true },
    },
    slug: {
      label: 'Slug',
      description: '仅允许小写字母/数字/短横线（-），用于 URL。',
      validation: {
        pattern: {
          regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          message: '只能使用小写字母、数字和短横线（-）。',
        },
      },
    },
  }),
  description: fields.text({ label: '摘要', validation: { isRequired: true } }),
  date: fields.date({ label: '日期', validation: { isRequired: true } }),
  author: fields.text({ label: '作者', defaultValue: 'Bidmosaic', validation: { isRequired: true } }),
  tags: fields.array(fields.text({ label: '标签' }), { label: '标签' }),
  image: fields.image({
    label: '封面图',
    directory: 'public/images/blog',
    publicPath: '/images/blog/',
  }),
  status: fields.select({
    label: '状态',
    defaultValue: 'draft',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '已发布', value: 'published' },
    ] as const,
  }),
  locale: fields.select({
    label: '语言',
    defaultValue: locale,
    options: [{ label: locale, value: locale }] as const,
    description: '每个集合固定一个语言。',
  }),
  content: fields.markdoc({ label: '正文', extension: 'md' }),
});

const insightSchema = {
  title: fields.text({ label: '标题', validation: { isRequired: true } }),
  entry: fields.slug({
    name: {
      label: '标题（用于生成 slug）',
      validation: { isRequired: true },
    },
  }),
  summary: fields.text({ label: '摘要', validation: { isRequired: true } }),
  domain: fields.select({
    label: '领域',
    defaultValue: 'tech',
    options: [
      { label: '科技', value: 'tech' },
      { label: 'AI', value: 'ai' },
      { label: '金融', value: 'finance' },
      { label: '电商', value: 'ecommerce' },
      { label: '政策', value: 'policy' },
      { label: '加密', value: 'crypto' },
      { label: '综合', value: 'general' },
    ] as const,
  }),
  tags: fields.array(fields.text({ label: '标签' }), { label: '标签' }),
  source: fields.text({ label: '来源' }),
  sourceUrl: fields.url({ label: '来源链接' }),
  importance: fields.integer({ label: '重要性评分', defaultValue: 5, validation: { min: 1, max: 10 } }),
  publishedAt: fields.date({ label: '发布日期', validation: { isRequired: true } }),
  tier: fields.select({
    label: '订阅级别',
    defaultValue: 'free',
    options: [
      { label: '免费', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ] as const,
  }),
  status: fields.select({
    label: '状态',
    defaultValue: 'published',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '已发布', value: 'published' },
    ] as const,
  }),
  content: fields.markdoc({ label: '正文', extension: 'md' }),
};

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Bidmosaic' },
    locale: 'zh-CN',
    navigation: {
      情报: ['insights'],
      博客: ['postsZh', 'postsEn'],
    },
  },
  collections: {
    insights: collection({
      label: '情报',
      path: 'src/content/insights/*',
      slugField: 'entry',
      format: { data: 'yaml', contentField: 'content' },
      columns: ['title', 'publishedAt', 'domain', 'importance', 'status'],
      schema: insightSchema,
    }),
    postsZh: collection({
      label: '中文文章',
      path: 'src/content/blog/zh/*',
      slugField: 'entry',
      format: { data: 'yaml', contentField: 'content' },
      columns: ['title', 'date', 'status'],
      schema: postSchema('zh'),
    }),
    postsEn: collection({
      label: '英文文章',
      path: 'src/content/blog/en/*',
      slugField: 'entry',
      format: { data: 'yaml', contentField: 'content' },
      columns: ['title', 'date', 'status'],
      schema: postSchema('en'),
    }),
  },
});
