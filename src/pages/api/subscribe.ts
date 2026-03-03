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
    return [];
  } catch {
    return [];
  }
}

function saveSubscribers(subscribers: Subscriber[]) {
  writeFileSync(SUBSCRIBERS_FILE, JSON.stringify({ subscribers }, null, 2), 'utf-8');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscribers = loadSubscribers();
    const existing = subscribers.find((item) => item.email === email);

    if (existing?.status === 'active') {
      return new Response(JSON.stringify({ ok: true, message: 'Already subscribed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existing) {
      existing.status = 'active';
      existing.source = existing.source || 'site';
      existing.subscribed_at = new Date().toISOString();
      existing.unsubscribed_at = null;
    } else {
      subscribers.push({
        email,
        status: 'active',
        source: 'site',
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      });
    }

    saveSubscribers(subscribers);

    return new Response(JSON.stringify({ ok: true, message: 'Subscribed successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
