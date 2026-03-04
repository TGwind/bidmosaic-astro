import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIP } from '@/lib/server/rateLimit';

export const prerender = false;

const TARGET = 'https://api.jiandaoyun.com/api/v5/app/entry/data/create';
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

// 10 requests per minute per IP
export const POST: APIRoute = async ({ request }) => {
  const limited = checkRateLimit('jiandaoyun', getClientIP(request), 10, 60_000);
  if (limited) return limited;
  const apiKey = import.meta.env.JIANDAOYUN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing JIANDAOYUN_API_KEY on server' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  let body = '';
  try {
    body = await request.text();
    if (!body.trim()) {
      return new Response(JSON.stringify({ error: 'Request body is required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const upstream = await fetch(TARGET, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(30000),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upstream request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
};
