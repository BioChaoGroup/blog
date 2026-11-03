import type { Lang } from '@/i18n/ui';
import { absoluteUrl, otherLang, withBase } from '@/lib/url';

export interface PageMeta {
  /** `<title>`; the site name is appended automatically for sub-pages. */
  title: string;
  description: string;
  /** Localized path of this page, e.g. `/projects/` or `/zh/projects/`. */
  path: string;
  lang: Lang;
  /** Absolute or base-relative image used for og:image. */
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  authors?: string[];
}

export function pageMeta(meta: PageMeta) {
  const siteName = 'BioChaoGroup';
  const fullTitle = meta.path === '/' ? `${siteName} — ${meta.title}` : `${meta.title} · ${siteName}`;
  const canonical = absoluteUrl(meta.path);
  const alternatePath =
    meta.lang === 'zh'
      ? meta.path.replace(/^\/zh(?=\/|$)/, '') || '/'
      : meta.path === '/'
        ? '/zh/'
        : `/zh${meta.path}`;
  const alternate = absoluteUrl(alternatePath);
  const image = meta.image ? (meta.image.startsWith('http') ? meta.image : absoluteUrl(meta.image)) : absoluteUrl('/og-default.png');

  return {
    fullTitle,
    description: meta.description,
    canonical,
    alternate,
    image,
    locale: meta.lang === 'zh' ? 'zh_CN' : 'en_US',
    localeAlternate: meta.lang === 'zh' ? 'en_US' : 'zh_CN',
    type: meta.type ?? 'website',
    robots: meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    publishedTime: meta.publishedTime?.toISOString(),
    modifiedTime: meta.modifiedTime?.toISOString(),
    tags: meta.tags ?? [],
    authors: meta.authors ?? [],
  };
}

/** Language-switcher target for a page whose translation may not exist yet. */
export function switchLangHref(lang: Lang, path: string, hasTranslation: boolean): string {
  const other = otherLang(lang);
  if (!hasTranslation) return other === 'zh' ? withBase('/zh/') : withBase('/');
  return other === 'zh' ? withBase(`/zh${path}`) : withBase(path);
}

export const siteMeta = {
  name: 'BioChaoGroup',
  email: 'fangchao@genomics.cn',
  github: 'https://github.com/BioChaoGroup',
  /** Override with a real social profile when available. */
  description: {
    en: 'Bioinformatics group working on long-read sequencing, pangenomes, metagenomes and DNA language models.',
    zh: '从事长读长测序、泛基因组、宏基因组与 DNA 语言模型研究的生物信息学小组。',
  },
} as const;
