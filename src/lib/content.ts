import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '@/i18n/ui';
import { localePath } from '@/lib/url';

export type Project = CollectionEntry<'projects'>;
export type Tool = CollectionEntry<'tools'>;
export type Post = CollectionEntry<'posts'>;

type WithLang = { data: { lang: Lang; key: string; draft: boolean } };

/** Drop drafts in production, keep them in `astro dev` so writing stays fast. */
export function visible<T extends WithLang>(entries: T[]): T[] {
  return import.meta.env.DEV ? entries : entries.filter((entry) => !entry.data.draft);
}

export function byKey<T extends WithLang>(entries: T[]) {
  const map = new Map<string, Partial<Record<Lang, T>>>();
  for (const entry of entries) {
    const bucket = map.get(entry.data.key) ?? {};
    bucket[entry.data.lang] = entry;
    map.set(entry.data.key, bucket);
  }
  return map;
}

export async function getProjects(lang: Lang): Promise<Project[]> {
  const all = visible(await getCollection('projects'));
  return all
    .filter((p) => p.data.lang === lang)
    .sort((a, b) => a.data.order - b.data.order || b.data.year - a.data.year);
}

export async function getTools(lang: Lang): Promise<Tool[]> {
  const all = visible(await getCollection('tools'));
  return all.filter((t) => t.data.lang === lang).sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = visible(await getCollection('posts'));
  return all
    .filter((p) => p.data.lang === lang)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** All keys that exist in at least one locale, with the entry for each locale. */
export async function getTranslationIndex<K extends 'projects' | 'tools' | 'posts'>(collection: K) {
  const entries = visible((await getCollection(collection)) as CollectionEntry<K>[]);
  return byKey(entries as unknown as WithLang[]);
}

/** True when `key` has a translation in the other locale (drives the language switcher). */
export function hasTranslation(index: Map<string, Record<string, unknown>>, key: string, lang: Lang): boolean {
  const bucket = index.get(key);
  return Boolean(bucket && bucket[lang === 'en' ? 'zh' : 'en']);
}

/** Previous / next post inside one locale, by date. */
export function neighbours(posts: Post[], key: string): { prev?: Post; next?: Post } {
  const i = posts.findIndex((p) => p.data.key === key);
  if (i === -1) return {};
  return { next: posts[i + 1], prev: posts[i - 1] };
}

/** Aggregate tags with counts, most frequent first. */
export function tagCloud<T extends { data: { tags: string[] } }>(entries: T[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.data.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}


export interface RelatedItem {
  kind: string;
  title: string;
  summary: string;
  href: string;
}

/** Resolve frontmatter `related: [key, ...]` into project/tool cards. */
export async function resolveRelated(keys: string[], lang: Lang): Promise<RelatedItem[]> {
  if (!keys.length) return [];
  const [projects, tools] = await Promise.all([getProjects(lang), getTools(lang)]);
  const items: RelatedItem[] = [];
  for (const key of keys) {
    const project = projects.find((entry) => entry.data.key === key);
    if (project) {
      items.push({
        kind: project.data.lang === 'zh' ? '项目' : 'Project',
        title: project.data.title,
        summary: project.data.summary,
        href: localePath(lang, `/projects/${key}/`),
      });
      continue;
    }
    const tool = tools.find((entry) => entry.data.key === key);
    if (tool) {
      items.push({
        kind: tool.data.lang === 'zh' ? '工具' : 'Tool',
        title: tool.data.name,
        summary: tool.data.tagline,
        href: localePath(lang, `/tools/${key}/`),
      });
    }
  }
  return items;
}
