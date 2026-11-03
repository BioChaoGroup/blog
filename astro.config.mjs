// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeBasePath from './src/plugins/rehype-base-path.mjs';
import rehypeFigures from './src/plugins/rehype-figures.mjs';

/**
 * The site is published with GitHub Pages from `BioChaoGroup/blog`, so it lives
 * under https://biochaogroup.github.io/blog/. Both values can be overridden at
 * build time (e.g. when the repo is renamed or a custom domain is attached):
 *
 *   SITE_URL=https://lab.example.org SITE_BASE=/ pnpm build
 */
const site = process.env.SITE_URL ?? 'https://biochaogroup.github.io';
const base = process.env.SITE_BASE ?? '/blog';

const katexOptions = { strict: false, throwOnError: false };

// Order matters: rewrite internal links for the base path first, then wrap
// standalone images in figures, then render math.
/** @type {any[]} */
const rehypePlugins = [
  [rehypeBasePath, { base }],
  rehypeFigures,
  [rehypeKatex, katexOptions],
];

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  compressHTML: true,
  build: { format: 'directory' },
  markdown: {
    // Astro 7 defaults to the native Sätteri pipeline; remark-math/rehype-katex
    // still need the unified pipeline.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins,
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
      wrap: false,
    },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        // Emit hreflang alternates for the English / Chinese page pairs.
        const url = new URL(item.url);
        const path = url.pathname;
        const pairs = path.includes('/zh/')
          ? { en: path.replace('/zh/', '/'), zh: path }
          : { en: path, zh: path.replace(/^\/([^/]+)\//, '/$1/zh/') };
        item.links = [
          { lang: 'en', url: new URL(pairs.en, url).href },
          { lang: 'zh', url: new URL(pairs.zh, url).href },
          { lang: 'x-default', url: new URL(pairs.en, url).href },
        ];
        return item;
      },
    }),
  ],
});
