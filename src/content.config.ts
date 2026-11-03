import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content model
 * -------------
 * Every published item exists once per locale (`lang: en | zh`) and shares a
 * stable `key`. The key is the URL slug and the join between translations:
 *
 *   src/content/projects/pangenome.md      -> /projects/pangenome/
 *   src/content/projects/pangenome.zh.md   -> /zh/projects/pangenome/
 *
 * `pnpm check:content` enforces that both locales exist for every key.
 */

const locale = z.enum(['en', 'zh']);

const link = z.object({
  label: z.string(),
  href: z.string(),
  kind: z
      .enum(['paper', 'code', 'data', 'demo', 'docs', 'tool', 'project', 'other'])
      .default('other'),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase slug, dashed'),
    lang: locale,
    title: z.string(),
    summary: z.string().max(320),
    status: z.enum(['active', 'completed', 'published', 'archived']).default('active'),
    year: z.number().int().min(2000).max(2100),
    period: z.string().optional(),
    /** Public code repository, if any. */
    repo: z.string().url().optional(),
    /** DOI or publisher URL of the associated paper. */
    paper: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    members: z.array(z.string()).default([]),
    collaborators: z.array(z.string()).default([]),
    /** Keys of tools released by the project. */
    tools: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    cover: z.string().optional(),
    links: z.array(link).default([]),
    draft: z.boolean().default(false),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase slug, dashed'),
    lang: locale,
    name: z.string(),
    tagline: z.string().max(200),
    summary: z.string().max(400),
    category: z.enum([
      'assembly',
      'sequencing',
      'metagenomics',
      'genomics',
      'machine-learning',
      'visualization',
      'infrastructure',
    ]),
    repo: z.string().url().optional(),
    package: z.string().optional(),
    install: z.string().optional(),
    language: z.string().optional(),
    license: z.string().optional(),
    version: z.string().optional(),
    status: z.enum(['stable', 'beta', 'experimental', 'archived']).default('beta'),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    links: z.array(link).default([]),
    draft: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase slug, dashed'),
    lang: locale,
    title: z.string(),
    description: z.string().max(300),
    /** One-sentence standfirst shown under the title. */
    lede: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    authors: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    kind: z.enum(['article', 'note', 'tutorial']).default('article'),
    cover: z.string().optional(),
    /** Optional related project/tool keys rendered as cards at the end. */
    related: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, tools, posts };
