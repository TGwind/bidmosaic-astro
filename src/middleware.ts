import type { MiddlewareHandler } from 'astro';

const FILE_EXTENSION_RE = /\.[a-z0-9]+$/i;

type Locale = 'zh' | 'en';
const LOCALE_COOKIE = 'bidmosaic_locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getLocaleFromPathname(pathname: string): Locale {
  return pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
}

function parsePreferredLocale(acceptLanguageHeader: string | null): Locale {
  const header = (acceptLanguageHeader ?? '').toLowerCase();
  if (!header.trim()) return 'en';

  let bestEn = 0;
  let bestZh = 0;

  for (const rawPart of header.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    const [range, ...params] = part.split(';').map((s) => s.trim());
    if (!range) continue;

    let q = 1;
    for (const p of params) {
      const m = p.match(/^q=([0-9.]+)$/);
      if (m) {
        const parsed = Number(m[1]);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }

    if (range === '*' || range.startsWith('en')) bestEn = Math.max(bestEn, q);
    if (range.startsWith('zh')) bestZh = Math.max(bestZh, q);
  }

  return bestZh > bestEn ? 'zh' : 'en';
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, url } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const pathname = url.pathname;

  const rawCookieLocale = context.cookies.get(LOCALE_COOKIE)?.value;
  const cookieLocale: Locale | undefined = rawCookieLocale === 'zh' || rawCookieLocale === 'en' ? rawCookieLocale : undefined;

  // Normalize locale roots.
  if (pathname === '/zh') {
    const targetUrl = new URL(url);
    targetUrl.pathname = '/zh/';
    return context.redirect(targetUrl.toString(), 308);
  }

  // Backward compatibility: "/en/..." now maps to the default locale (unprefixed).
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const targetUrl = new URL(url);
    targetUrl.pathname = pathname === '/en' ? '/' : pathname.replace(/^\/en(?=\/)/, '');
    return context.redirect(targetUrl.toString(), 308);
  }

  // First entry rule: only decide locale automatically on homepage ("/").
  // Do this before checking Accept so `curl -I` (which often sends Accept: */*) still sees the redirect.
  if (pathname === '/') {
    const preferredLocale: Locale = cookieLocale ?? parsePreferredLocale(request.headers.get('accept-language'));
    if (preferredLocale === 'zh') {
      context.cookies.set(LOCALE_COOKIE, 'zh', { path: '/', sameSite: 'lax', maxAge: ONE_YEAR_SECONDS });
      const targetUrl = new URL(url);
      targetUrl.pathname = '/zh/';
      return context.redirect(targetUrl.toString(), 302);
    }
    if (cookieLocale !== 'en') {
      context.cookies.set(LOCALE_COOKIE, 'en', { path: '/', sameSite: 'lax', maxAge: ONE_YEAR_SECONDS });
    }
  }

  const accept = request.headers.get('accept') ?? '';
  if (!accept.includes('text/html')) return next();

  if (pathname.startsWith('/_astro/')) return next();
  if (FILE_EXTENSION_RE.test(pathname)) return next();

  const currentLocale = getLocaleFromPathname(pathname);

  // Persist explicit locale choice based on URL.
  if (currentLocale !== cookieLocale) {
    context.cookies.set(LOCALE_COOKIE, currentLocale, { path: '/', sameSite: 'lax', maxAge: ONE_YEAR_SECONDS });
  }

  return next();
};
