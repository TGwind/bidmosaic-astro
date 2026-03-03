---
slug: "admin-upload-sample"
title: "后台上传示例：Markdown 文章（含 frontmatter / 标签 / 封面）"
description: "用于测试 /zh/admin 上传文章功能的一篇示例 Markdown。"
date: "2026-03-02"
author: "Bidmosaic"
tags: ["admin", "upload", "markdown", "sample"]
image: "https://picsum.photos/seed/bidmosaic-admin/1200/630"
---

# 后台上传示例文章

这是一篇用于测试管理后台 `/zh/admin` 的示例文章：

- 带 `frontmatter`（标题、日期、作者、标签、封面图等）
- 正文包含图片引用、代码块、表格与引用
- 你可以直接在后台选择 `locale=zh` 上传它

## 1) Frontmatter 字段说明

后台会优先读取 `--- ... ---` 中的字段：

- `slug`: 文章 slug（同语言下唯一）
- `title`: 标题
- `description`: 摘要
- `date`: `YYYY-MM-DD`
- `author`: 作者
- `tags`: 可以是数组（如本文）或英文逗号分隔的字符串（例如 `"seo,marketing"`）
- `image`: 封面图 URL

## 2) 图片示例（相对路径 assets）

下面两种写法都会被上传逻辑重写，把 `./assets/...` 变成该文章的 `/blog-assets/posts/<postId>/assets/...`。

注意：上传 Markdown 本身不会自动把本地图片带上去。
你需要在后台的“上传图片”里，把同名文件（例如 `demo.png`）上传到该文章的 assets 里。
本仓库已在 `docs/assets/demo.png` 放了一个占位图片，你可以直接选它上传。

Markdown 图片：

![示例图片（需要上传 assets/demo.png）](./assets/demo.png)

HTML 图片：

<img src="./assets/demo.png" alt="示例图片" width="520" />

## 3) 代码块

```ts
type PostFrontmatter = {
  slug?: string;
  title?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  author?: string;
  tags?: string[] | string;
  image?: string;
};
```

## 4) 引用与列表

> 这是一段引用，用于测试渲染效果。

1. 第一步：在 `/zh/admin` 填写 `ADMIN_TOKEN`
2. 第二步：选择本文件并上传
3. 第三步：如果图片没显示，把 `demo.png` 作为资产上传

## 5) 表格

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| slug | admin-upload-sample | 同语言下唯一 |
| tags | ["admin", "upload"] | 也可以用逗号字符串 |
| image | https://picsum.photos/... | 封面图 URL |

## 6) 小结

如果你在上传时不填“覆盖字段”，后台将按以下优先级取值：

1. 覆盖字段（表单输入）
2. frontmatter
3. 文件名（去掉 `zh-` / `en-` 前缀后生成 slug）
