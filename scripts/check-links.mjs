#!/usr/bin/env node
/**
 * Static link checker over the built site (`dist/`).
 *
 * Verifies that every internal href/src resolves to a real file in dist, that
 * anchors point at existing ids, and reports external links (optionally checking
 * them with HEAD requests when `--external` is passed).
 *
 * Usage: node scripts/check-links.mjs [--external] [--base /blog] [--dir dist]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DIR = option('--dir', 'dist');
const BASE = option('--base', process.env.SITE_BASE ?? '/blog').replace(/\/+$/, '');
const CHECK_EXTERNAL = flag('--external');

if (!existsSync(DIR)) {
  console.error(`dist directory not found: ${DIR} (run \`pnpm build\` first)`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(DIR);
const htmlFiles = files.filter((file) => file.endsWith('.html'));

/** Map a site path (after base) to a dist file. */
function resolveTarget(sitePath) {
  let path = sitePath.split('#')[0].split('?')[0];
  if (!path.startsWith('/')) return null;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  if (path === '' || path === '/') path = '/index.html';
  const candidates = [];
  if (path.endsWith('/')) candidates.push(join(DIR, path, 'index.html'));
  else if (/\.[a-z0-9]+$/i.test(path)) candidates.push(join(DIR, path));
  else candidates.push(join(DIR, `${path}/index.html`), join(DIR, `${path}.html`), join(DIR, path));
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

const idCache = new Map();
function idsOf(file) {
  if (idCache.has(file)) return idCache.get(file);
  const html = readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  idCache.set(file, ids);
  return ids;
}

const broken = [];
const external = new Map();
let internalCount = 0;
let anchorCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const page = `/${relative(DIR, file).split('\\').join('/')}`;
  for (const match of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const [, attr, raw] = match;
    const url = raw.trim();
    if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:')) continue;
    if (url.startsWith('//')) {
      external.set(url, page);
      continue;
    }
    if (/^https?:\/\//i.test(url)) {
      external.set(url, page);
      continue;
    }
    if (!url.startsWith('/')) {
      broken.push({ page, url, reason: 'not root-relative (base-path safe links only)' });
      continue;
    }
    internalCount += 1;
    const target = resolveTarget(url);
    if (!target) {
      broken.push({ page, url, reason: 'target file missing' });
      continue;
    }
    const hash = url.split('#')[1];
    if (hash && target.endsWith('.html')) {
      anchorCount += 1;
      if (!idsOf(target).has(decodeURIComponent(hash))) {
        broken.push({ page, url, reason: `anchor #${hash} not found` });
      }
    }
  }
}

console.log(`checked ${htmlFiles.length} HTML files · ${internalCount} internal links · ${anchorCount} anchors · ${external.size} unique external URLs`);

if (broken.length) {
  console.error(`\n${broken.length} broken internal link(s):`);
  for (const item of broken) console.error(`  ✗ ${item.page} → ${item.url}  (${item.reason})`);
} else {
  console.log('all internal links resolve');
}

let externalFailures = [];
if (CHECK_EXTERNAL) {
  const urls = [...external.keys()];
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
        clearTimeout(timer);
        return { url, status: res.status };
      } catch (error) {
        return { url, status: `error: ${error.name}` };
      }
    }),
  );
  externalFailures = results.filter((r) => typeof r.status !== 'number' || r.status >= 400 || r.status === 405);
  console.log(`\nexternal links: ${results.length} checked, ${externalFailures.length} failing/unverifiable`);
  for (const failure of externalFailures.slice(0, 20)) console.log(`  · ${failure.status} ${failure.url}`);
}

process.exit(broken.length > 0 ? 1 : 0);
