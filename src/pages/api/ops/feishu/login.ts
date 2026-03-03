import type { APIRoute } from 'astro';

export const prerender = false;

const FEISHU_STATE_COOKIE = 'ops_feishu_state';
const FEISHU_STATE_MAX_AGE = 10 * 60; // 10 minutes
const AUTHORIZE_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';

function createState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCallbackUrl(request: Request): string {
  const custom = import.meta.env.OPS_FEISHU_REDIRECT_URI?.trim();
  if (custom) return custom;

  const url = new URL(request.url);
  return `${url.origin}/api/ops/feishu/callback`;
}

function stateCookieHeader(state: string, request: Request): string {
  const protocol = new URL(request.url).protocol;
  const secure = protocol === 'https:' ? '; Secure' : '';
  return `${FEISHU_STATE_COOKIE}=${state}; HttpOnly; Path=/; Max-Age=${FEISHU_STATE_MAX_AGE}; SameSite=Lax${secure}`;
}

export const GET: APIRoute = async ({ request }) => {
  const appId = import.meta.env.OPS_FEISHU_APP_ID;

  if (!appId) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/ops/login?error=feishu_config' },
    });
  }

  const state = createState();
  const redirectUri = getCallbackUrl(request);

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': stateCookieHeader(state, request),
    },
  });
};
