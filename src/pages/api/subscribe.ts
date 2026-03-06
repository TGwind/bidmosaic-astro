import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { checkRateLimit, getClientIP } from '@/lib/server/rateLimit';

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
    return [];
  } catch {
    return [];
  }
}

function saveSubscribers(subscribers: Subscriber[]) {
  writeFileSync(SUBSCRIBERS_FILE, JSON.stringify({ subscribers }, null, 2), 'utf-8');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

async function sendLeadAlertEmail(email: string, source: string, subscribedAt: string) {
  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT || '465');
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  const to = import.meta.env.LEAD_ALERT_EMAIL || import.meta.env.CONTACT_EMAIL || user;

  if (!host || !user || !pass || !to) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#0369a1;margin:0 0 16px">新订阅用户提醒</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap">用户邮箱</td><td style="padding:8px 12px;color:#111827">${email}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap">来源</td><td style="padding:8px 12px;color:#111827">${source}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap">订阅时间</td><td style="padding:8px 12px;color:#111827">${subscribedAt}</td></tr>
  </table>
  <p style="color:#9ca3af;font-size:12px;margin-top:16px">这封邮件来自 bidmosaic.com 的订阅表单。</p>
</div>`;

  await transporter.sendMail({
    from: `"BidMosaic" <${user}>`,
    to,
    subject: `[BidMosaic] 新订阅用户提醒：${email}`,
    html,
    text: `新订阅用户提醒\n用户邮箱：${email}\n来源：${source}\n订阅时间：${subscribedAt}`,
  });
}

// 5 requests per minute per IP
export const POST: APIRoute = async ({ request }) => {
  const limited = checkRateLimit('subscribe', getClientIP(request), 5, 60_000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const subscribers = loadSubscribers();
    const existing = subscribers.find((item) => item.email === email);

    if (existing?.status === 'active') {
      return new Response(JSON.stringify({ ok: true, message: 'Already subscribed' }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const subscribedAt = new Date().toISOString();
    const source = existing?.source || 'site';

    if (existing) {
      existing.status = 'active';
      existing.source = source;
      existing.subscribed_at = subscribedAt;
      existing.unsubscribed_at = null;
    } else {
      subscribers.push({
        email,
        status: 'active',
        source,
        subscribed_at: subscribedAt,
        unsubscribed_at: null,
      });
    }

    saveSubscribers(subscribers);

    try {
      await sendLeadAlertEmail(email, source, subscribedAt);
    } catch (error) {
      console.error('Failed to send subscriber alert email:', error);
    }

    return new Response(JSON.stringify({ ok: true, message: 'Subscribed successfully' }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
};
