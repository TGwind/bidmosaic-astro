import type { APIRoute } from 'astro';
import { clearCookieHeader } from '../../../lib/server/opsAuth';

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/ops/login',
      'Set-Cookie': clearCookieHeader(),
    },
  });
};
