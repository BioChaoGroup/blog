import { languages, type Lang } from '@/i18n/ui';

/** `import.meta.env.BASE_URL` always ends with `/`; normalise to `'' | '/blog'`. */
export const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}`;
}

/**
 * Absolute URL (needed for canonical links, RSS and Open Graph images).
 * Site is configured in `astro.config.mjs` via SITE_URL / SITE_BASE.
 */
export function absoluteUrl(path = '/'): string {
  const site = import.meta.env.SITE?.replace(/\/+$/, '') ?? 'https://biochaogroup.github.io';
  return `${site}${withBase(path)}`;
}

/** Path of a page in the given locale: `/projects/` -> `/zh/projects/`. */
export function localePath(lang: Lang, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') return withBase(clean);
  return withBase(`/zh${clean === '/' ? '/' : clean}`);
}

/** Strip base + locale prefix, returning the language-neutral path (`/projects/`). */
export function neutralPath(pathname: string): string {
  let p = pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  p = p.replace(/^\/zh(?=\/|$)/, '');
  return p.startsWith('/') ? p : `/${p}`;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'zh' : 'en';
}

/** `<html lang>` value and Open Graph locale. */
export function htmlLang(lang: Lang): string {
  return languages[lang].htmlLang;
}

export function ogLocale(lang: Lang): string {
  return languages[lang].ogLocale;
}

/** English pages live at `/x/`, Chinese at `/zh/x/`. */
export function langFromPath(pathname: string): Lang {
  const p = neutralPath(pathname);
  return pathname.includes('/zh/') || p === '/zh' ? 'zh' : 'en';
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    year: 'numeric',
    month: lang === 'zh' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Rough reading time: 220 wpm for English, 400 chars/min for Chinese. */
export function readingTime(body: string | undefined, lang: Lang): number {
  if (!body) return 1;
  const clean = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .trim();
  const minutes =
    lang === 'zh'
      ? [...clean].length / 400
      : clean.split(/\s+/).filter(Boolean).length / 220;
  return Math.max(1, Math.round(minutes));
}
