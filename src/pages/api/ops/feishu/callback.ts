import type { APIRoute } from 'astro';
import { createSession, sessionCookieHeader } from '../../../../lib/server/opsAuth';

export const prerender = false;

const FEISHU_STATE_COOKIE = 'ops_feishu_state';
const APP_ACCESS_TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal';
const TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token';
const USER_INFO_URL = 'https://open.feishu.cn/open-apis/authen/v1/user_info';

function readCookie(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((entry) => {
      const [k, ...rest] = entry.trim().split('=');
      return [k.trim(), rest.join('=').trim()];
    }),
  );
  return cookies[key] || null;
}

function clearStateCookieHeader(request: Request): string {
  const protocol = new URL(request.url).protocol;
  const secure = protocol === 'https:' ? '; Secure' : '';
  return `${FEISHU_STATE_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export const GET: APIRoute = async ({ request, url }) => {
  const appId = import.meta.env.OPS_FEISHU_APP_ID;
  const appSecret = import.meta.env.OPS_FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/ops/login?error=feishu_config' },
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stateInCookie = readCookie(request.headers.get('cookie'), FEISHU_STATE_COOKIE);

  if (!code || !state || !stateInCookie || state !== stateInCookie) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/ops/login?error=feishu_state',
        'Set-Cookie': clearStateCookieHeader(request),
      },
    });
  }

  try {
    // Step 1: get app_access_token
    const appTokenResp = await fetch(APP_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const appTokenData = await appTokenResp.json();

    if (!appTokenData?.app_access_token) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/ops/login?error=feishu_token',
          'Set-Cookie': clearStateCookieHeader(request),
        },
      });
    }

    // Step 2: exchange code for user access_token using app_access_token
    const tokenResp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appTokenData.app_access_token}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!tokenResp.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/ops/login?error=feishu_token',
          'Set-Cookie': clearStateCookieHeader(request),
        },
      });
    }

    const tokenData = await tokenResp.json();

    if (tokenData?.code !== 0 || !tokenData?.data?.access_token) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/ops/login?error=feishu_token',
          'Set-Cookie': clearStateCookieHeader(request),
        },
      });
    }

    const userInfoResp = await fetch(USER_INFO_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.data.access_token}`,
      },
    });

    if (!userInfoResp.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/ops/login?error=feishu_token',
          'Set-Cookie': clearStateCookieHeader(request),
        },
      });
    }

    const userInfoData = await userInfoResp.json();
    const userData = userInfoData?.data;

    if (userInfoData?.code !== 0 || !userData) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/ops/login?error=feishu_token',
          'Set-Cookie': clearStateCookieHeader(request),
        },
      });
    }

    const sessionValue = await createSession({
      provider: 'feishu',
      feishuUserId: userData.user_id ?? '',
      feishuUnionId: userData.union_id ?? '',
      feishuOpenId: userData.open_id ?? '',
      feishuName: userData.name ?? '',
    });
    const headers = new Headers();
    headers.set('Location', '/ops');
    headers.append('Set-Cookie', sessionCookieHeader(sessionValue));
    headers.append('Set-Cookie', clearStateCookieHeader(request));

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/ops/login?error=feishu_token',
        'Set-Cookie': clearStateCookieHeader(request),
      },
    });
  }
};
