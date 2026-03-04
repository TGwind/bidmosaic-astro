import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIP } from '@/lib/server/rateLimit';

export const prerender = false;

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

async function readUpstreamError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => 'Upstream request failed');
  if (!raw) return 'Upstream request failed';
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (typeof parsed.error?.message === 'string') return parsed.error.message;
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // ignore and return raw
  }
  return raw;
}

// 10 requests per minute per IP
export const POST: APIRoute = async ({ request }) => {
  const limited = checkRateLimit('chat', getClientIP(request), 10, 60_000);
  if (limited) return limited;
  const apiKey = import.meta.env.OPENCLAW_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENCLAW_API_KEY on server' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  let userMessage = '';
  const rawBody = await request.text();
  const trimmedBody = rawBody.trim();

  if (trimmedBody) {
    try {
      const body = JSON.parse(trimmedBody) as {
        message?: string;
        messages?: Array<{ role?: string; content?: string }>;
      };
      if (typeof body.message === 'string' && body.message.trim()) {
        userMessage = body.message.trim();
      } else if (Array.isArray(body.messages)) {
        const lastUser = [...body.messages]
          .reverse()
          .find((m) => m?.role === 'user' && typeof m.content === 'string' && m.content.trim().length > 0);
        userMessage = lastUser?.content?.trim() ?? '';
      }
    } catch {
      // Fallback: treat non-JSON body as plain user text.
      userMessage = trimmedBody;
    }
  }

  if (!userMessage) {
    return new Response(
      JSON.stringify({
        error: 'message is required',
        debug: `bodyLen=${trimmedBody.length}`,
      }),
      {
      status: 400,
      headers: jsonHeaders,
      },
    );
  }

  try {
    // Strictly follow the proven request shape.
    const endpoint = import.meta.env.OPENCLAW_API_URL;
    const model = import.meta.env.OPENCLAW_MODEL || 'deepseek-chat';
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing OPENCLAW_API_URL on server' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: userMessage }],
        stream: true,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (upstream.ok && upstream.body) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const error = await readUpstreamError(upstream);
    return new Response(JSON.stringify({ error }), {
      status: upstream.status || 502,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upstream connection failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
};
