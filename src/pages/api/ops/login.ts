import type { APIRoute } from 'astro';
import { createSession, sessionCookieHeader } from '../../../lib/server/opsAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const password = formData.get('password')?.toString() ?? '';

  const expectedPass = import.meta.env.OPS_PASSWORD;

  if (!expectedPass) {
    return new Response('Server misconfiguration: OPS_PASSWORD not set', { status: 500 });
  }

  if (password !== expectedPass) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/ops/login?error=1' },
    });
  }

  const sessionValue = await createSession();
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/ops',
      'Set-Cookie': sessionCookieHeader(sessionValue),
    },
  });
};
