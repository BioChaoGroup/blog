#!/usr/bin/env node
/**
 * Content integrity check — run before every build (`pnpm check:content`).
 *
 * Verifies, without booting Astro:
 *   1. every entry declares a key that matches its filename
 *   2. every key exists in both locales (en + zh)
 *   3. no key is declared twice in the same locale
 *   4. frontmatter contains the required fields for its collection
 *   5. tags come from the documented vocabulary (warning only)
 *   6. dates are ISO formatted and blog dates are not in the future by > 1 day
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT = join(ROOT, 'src', 'content');

const COLLECTIONS = {
  projects: { required: ['key', 'lang', 'title', 'summary', 'status', 'year'], tags: false },
  tools: { required: ['key', 'lang', 'name', 'tagline', 'summary', 'category'], tags: false },
  blog: { required: ['key', 'lang', 'title', 'description', 'date', 'authors', 'tags'], tags: true },
};

const VOCAB = new Set([
  'long-read', 'linked-read', 'assembly', 'metagenomics', 'pangenome', 'sequencing',
  'benchmark', 'machine-learning', 'dna-language-models', 'microbiome', 'methods',
  'workflow', 'reproducibility', 'infrastructure', 'visualization', 'tutorial',
  'opinion', 'software',
]);

const errors = [];
const warnings = [];

/** Minimal YAML frontmatter reader (flat scalars, inline arrays, block lists). */
function readFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  let currentKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const listItem = rawLine.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      const value = stripQuotes(listItem[1]);
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(value);
      continue;
    }
    const kv = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1];
    const value = kv[2].trim();
    if (value === '') {
      data[currentKey] = [];
      continue;
    }
    if (value.startsWith('[')) {
      data[currentKey] = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((v) => stripQuotes(v.trim()))
        .filter(Boolean);
    } else {
      data[currentKey] = stripQuotes(value);
    }
  }
  return data;
}

function stripQuotes(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(md|mdx)$/.test(name)) out.push(full);
  }
  return out;
}

const seen = new Map(); // `${collection}:${lang}:${key}` -> file

for (const [collection, rules] of Object.entries(COLLECTIONS)) {
  const dir = join(CONTENT, collection);
  let files = [];
  try {
    files = walk(dir);
  } catch {
    warnings.push(`no content directory yet: src/content/${collection}`);
    continue;
  }
  for (const file of files) {
    const rel = relative(ROOT, file);
    const data = readFrontmatter(readFileSync(file, 'utf8'));
    if (!data) {
      errors.push(`${rel}: missing YAML frontmatter`);
      continue;
    }
    for (const field of rules.required) {
      if (data[field] === undefined || data[field] === '') {
        errors.push(`${rel}: required field "${field}" is missing`);
      }
    }
    const lang = data.lang;
    if (lang !== 'en' && lang !== 'zh') errors.push(`${rel}: lang must be "en" or "zh" (got ${JSON.stringify(lang)})`);
    if (data.key && !/^[a-z0-9][a-z0-9-]*$/.test(data.key)) {
      errors.push(`${rel}: key "${data.key}" must be lowercase/dashed ASCII`);
    }
    // filename -> key agreement
    const base = rel.split('/').pop().replace(/\.(md|mdx)$/, '').replace(/\.(en|zh)$/, '');
    if (data.key && base !== data.key) {
      errors.push(`${rel}: filename "${base}" does not match key "${data.key}"`);
    }
    if (lang === 'zh' && !/\.zh$/.test(rel.replace(/\.(md|mdx)$/, ''))) {
      errors.push(`${rel}: Chinese entry must be named <key>.zh.md`);
    }
    if (lang === 'en' && /\.zh$/.test(rel.replace(/\.(md|mdx)$/, ''))) {
      errors.push(`${rel}: English entry must be named <key>.md (no .zh)`);
    }
    if (data.key && lang) {
      const id = `${collection}:${lang}:${data.key}`;
      if (seen.has(id)) errors.push(`${rel}: duplicate ${lang} key "${data.key}" (also in ${seen.get(id)})`);
      else seen.set(id, rel);
    }
    // blog specifics
    if (collection === 'blog') {
      if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
        errors.push(`${rel}: date must be YYYY-MM-DD`);
      } else if (data.date) {
        const when = new Date(`${data.date}T00:00:00Z`);
        if (when.valueOf() > Date.now() + 86400000) warnings.push(`${rel}: date ${data.date} is in the future`);
      }
      if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.updated))) {
        errors.push(`${rel}: updated must be YYYY-MM-DD`);
      }
      if (rules.tags && Array.isArray(data.tags)) {
        for (const tag of data.tags) {
          if (!VOCAB.has(tag)) warnings.push(`${rel}: tag "${tag}" is not in the documented vocabulary`);
        }
      } else {
        errors.push(`${rel}: tags must be a list`);
      }
      if (data.description && String(data.description).length > 300) {
        errors.push(`${rel}: description is longer than 300 characters`);
      }
    }
  }
}

// both locales present
const keys = new Map();
for (const [id, file] of seen) {
  const [collection, lang, key] = id.split(':');
  const bucket = keys.get(`${collection}:${key}`) ?? {};
  bucket[lang] = file;
  keys.set(`${collection}:${key}`, bucket);
}
for (const [id, bucket] of keys) {
  if (!bucket.en || !bucket.zh) {
    const [collection, key] = id.split(':');
    const missing = bucket.en ? 'zh' : 'en';
    const anchor = bucket.en ?? bucket.zh;
    errors.push(`src/content/${collection}/${key}: missing ${missing} translation (have: ${anchor})`);
  }
}

const counts = {};
for (const [collection] of Object.entries(COLLECTIONS)) {
  const pairs = [...keys.keys()].filter((id) => id.startsWith(`${collection}:`)).length;
  counts[collection] = pairs;
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  · ${w}`);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nContent check failed.');
  process.exit(1);
}

console.log(
  `\nContent check passed: ${counts.projects} projects, ${counts.tools} tools, ${counts.blog} posts (each in en + zh).`,
);
