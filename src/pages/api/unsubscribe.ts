import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const prerender = false;

const SUBSCRIBERS_FILE = resolve(
  import.meta.env.SUBSCRIBERS_PATH || '../bidmosaic-intelligence/data/subscribers.json',
);

type Subscriber = {
  email: string;
  status: 'active' | 'unsubscribed';
  source?: string;
  subscribed_at: string;
  unsubscribed_at?: string | null;
};

function loadSubscribers(): Subscriber[] {
  if (!existsSync(SUBSCRIBERS_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
    if (Array.isArray(data.subscribers)) {
      return data.subscribers;
    }
    if (Array.isArray(data.emails)) {
      return data.emails.map((email: string) => ({
        email,
        status: 'active',
        source: 'legacy',
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      }));
    }
  } catch {
    return [];
  }
  return [];
}

function saveSubscribers(subscribers: Subscriber[]) {
  writeFileSync(SUBSCRIBERS_FILE, JSON.stringify({ subscribers }, null, 2), 'utf-8');
}

function renderMessage(title: string, desc: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:32px 24px;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
    <h1 style="margin:0 0 12px;font-size:24px;">${title}</h1>
    <p style="margin:0;color:#555;line-height:1.6;">${desc}</p>
  </div>
</body>
</html>`;
}

export const GET: APIRoute = async ({ url }) => {
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) {
    return new Response(renderMessage('退订失败', '链接缺少邮箱参数，请从邮件中的退订链接重新操作。'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const subscribers = loadSubscribers();
  const subscriber = subscribers.find((item) => item.email === email);

  if (!subscriber) {
    return new Response(renderMessage('邮箱未找到', `未找到 ${email} 的订阅记录。`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (subscriber.status !== 'unsubscribed') {
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribed_at = new Date().toISOString();
    saveSubscribers(subscribers);
  }

  return new Response(renderMessage('已退订成功', `${email} 已停止接收 BidMosaic Intelligence 邮件。`), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
