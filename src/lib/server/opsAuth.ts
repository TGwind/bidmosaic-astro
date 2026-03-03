const COOKIE_NAME = 'ops_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface OpsSessionContext {
  provider?: 'password' | 'feishu';
  feishuUserId?: string;
  feishuUnionId?: string;
  feishuOpenId?: string;
  feishuName?: string;
}

export interface OpsSessionData {
  timestamp: number;
  context: OpsSessionContext;
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseSessionToken(sessionValue: string): { timestamp: string; payload: string; sig: string } | null {
  const parts = sessionValue.split('.');
  if (parts.length === 2) {
    const [timestamp, sig] = parts;
    return { timestamp, payload: '', sig };
  }
  if (parts.length === 3) {
    const [timestamp, payload, sig] = parts;
    return { timestamp, payload, sig };
  }
  return null;
}

export async function createSession(context: OpsSessionContext = {}): Promise<string> {
  const secret = import.meta.env.OPS_SESSION_SECRET;
  const timestamp = Date.now().toString();
  const normalized: OpsSessionContext = {
    provider: context.provider ?? 'password',
    feishuUserId: context.feishuUserId ?? '',
    feishuUnionId: context.feishuUnionId ?? '',
    feishuOpenId: context.feishuOpenId ?? '',
    feishuName: context.feishuName ?? '',
  };
  const payload = toBase64Url(JSON.stringify(normalized));
  const sig = await hmacSha256(secret, `${timestamp}.${payload}`);
  return `${timestamp}.${payload}.${sig}`;
}

export async function readSession(cookieHeader: string | null): Promise<OpsSessionData | null> {
  if (!cookieHeader) return null;

  const secret = import.meta.env.OPS_SESSION_SECRET;
  if (!secret) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=').trim()];
    }),
  );

  const sessionValue = cookies[COOKIE_NAME];
  if (!sessionValue) return null;

  const parsed = parseSessionToken(sessionValue);
  if (!parsed) return null;

  const { timestamp, payload, sig } = parsed;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > SESSION_DURATION) return null;

  const signedValue = payload ? `${timestamp}.${payload}` : timestamp;
  const expected = await hmacSha256(secret, signedValue);
  if (sig !== expected) return null;

  if (!payload) {
    return {
      timestamp: ts,
      context: { provider: 'password' },
    };
  }

  try {
    const raw = fromBase64Url(payload);
    const parsedContext = JSON.parse(raw) as OpsSessionContext;
    return {
      timestamp: ts,
      context: {
        provider: parsedContext.provider === 'feishu' ? 'feishu' : 'password',
        feishuUserId: parsedContext.feishuUserId ?? '',
        feishuUnionId: parsedContext.feishuUnionId ?? '',
        feishuOpenId: parsedContext.feishuOpenId ?? '',
        feishuName: parsedContext.feishuName ?? '',
      },
    };
  } catch {
    return {
      timestamp: ts,
      context: { provider: 'password' },
    };
  }
}

export async function validateSession(cookieHeader: string | null): Promise<boolean> {
  return (await readSession(cookieHeader)) !== null;
}

export function sessionCookieHeader(value: string): string {
  const maxAge = Math.floor(SESSION_DURATION / 1000);
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
