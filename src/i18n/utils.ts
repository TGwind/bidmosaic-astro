import zh from './zh.json';
import en from './en.json';

const translations: Record<string, typeof zh> = { zh, en };

export const defaultLocale = 'en';
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split('/');
  if (locales.includes(locale as Locale)) return locale as Locale;
  return defaultLocale;
}

export function useTranslations(locale: Locale) {
  return translations[locale] ?? translations[defaultLocale];
}

export function getLocalePath(path: string, locale: Locale): string {
  if (locale === defaultLocale) return path;
  return `/${locale}${path}`;
}
