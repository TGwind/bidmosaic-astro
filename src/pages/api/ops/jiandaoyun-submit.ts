import type { APIRoute } from 'astro';
import { readSession } from '../../../lib/server/opsAuth';

export const prerender = false;

const JDY_CREATE_URL = 'https://api.jiandaoyun.com/api/v5/app/entry/data/create';
const JDY_DEPT_USER_LIST_URL = 'https://api.jiandaoyun.com/api/v5/corp/department/user/list';
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

type JdyUser = {
  username: string;
  name?: string;
  departments?: number[];
  type?: number;
  status?: number;
  integrate_id?: string;
};

async function findJdyUserByName(apiKey: string, feishuName: string): Promise<JdyUser | null> {
  const resp = await fetch(JDY_DEPT_USER_LIST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dept_no: 1, has_child: true }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) return null;

  let parsed: { users?: JdyUser[] };
  try {
    parsed = await resp.json();
  } catch {
    return null;
  }

  const members: JdyUser[] = parsed?.users ?? [];
  return members.find((m) => m.name === feishuName) ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.JIANDAOYUN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing JIANDAOYUN_API_KEY on server' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const session = await readSession(request.headers.get('cookie'));
  if (!session) {
    return new Response(JSON.stringify({ error: '未登录或登录已过期，请重新登录' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const feishuName = session.context.feishuName?.trim() ?? '';
  if (!feishuName) {
    return new Response(JSON.stringify({ error: '缺少飞书用户姓名，请退出后用飞书重新登录' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const data = payload.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return new Response(JSON.stringify({ error: 'data 字段不能为空' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const matchedUser = await findJdyUserByName(apiKey, feishuName);
  if (!matchedUser) {
    return new Response(
      JSON.stringify({ error: `未在简道云中找到姓名为「${feishuName}」的成员，请确认简道云成员姓名与飞书一致` }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const nextPayload = {
    ...payload,
    data_creator: matchedUser.username,
    data: {
      ...(data as Record<string, unknown>),
      _widget_0201001000004: { value: matchedUser.username },
    },
  };

  try {
    const upstream = await fetch(JDY_CREATE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nextPayload),
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
