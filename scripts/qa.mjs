#!/usr/bin/env node
/**
 * Interaction/QA tests against the built site, driven by the Chrome DevTools
 * Protocol. Complements scripts/check-links.mjs (static) and scripts/shots.mjs
 * (layout): this one exercises the JavaScript the pages actually ship.
 *
 * Usage: node scripts/qa.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9444;
const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4321/blog';

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-crash-reporter',
    '--no-first-run',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/chrome-qa-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function devtoolsUrl() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* waiting */
    }
    await sleep(250);
  }
  throw new Error('DevTools endpoint unavailable');
}

const ws = new WebSocket(await devtoolsUrl());
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.text);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  const entry = msg.id && pending.get(msg.id);
  if (entry) {
    pending.delete(msg.id);
    msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
  }
});

function send(method, params = {}, sessionId) {
  id += 1;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

const navigate = async (path) => {
  await send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
  await sleep(650);
};

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---------- 1. theme toggle ----------
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await navigate('/');
const themeBefore = await evaluate('document.documentElement.dataset.theme');
await evaluate("document.getElementById('theme-toggle').click()");
await sleep(150);
const themeAfter = await evaluate('document.documentElement.dataset.theme');
const stored = await evaluate("localStorage.getItem('theme')");
check('theme toggle flips theme', themeBefore !== themeAfter, `${themeBefore} → ${themeAfter}`);
check('theme choice persisted', stored === themeAfter, `localStorage=${stored}`);
await navigate('/');
check('theme survives navigation', (await evaluate('document.documentElement.dataset.theme')) === themeAfter);
await evaluate("document.getElementById('theme-toggle').click()"); // restore light

// ---------- 2. mobile navigation ----------
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await navigate('/');
await evaluate("document.getElementById('nav-toggle').click()");
await sleep(200);
const navOpen = await evaluate("document.body.classList.contains('nav-open') && getComputedStyle(document.getElementById('site-nav')).display !== 'none'");
const expanded = await evaluate("document.getElementById('nav-toggle').getAttribute('aria-expanded')");
check('mobile nav opens', navOpen, `aria-expanded=${expanded}`);
await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
await sleep(150);
check('Escape closes mobile nav', !(await evaluate("document.body.classList.contains('nav-open')")));

// ---------- 3. article page features ----------
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await navigate('/posts/linked-read-metagenome-assembly/');
const anchors = await evaluate("document.querySelectorAll('.prose .heading-anchor').length");
check('heading anchors injected', anchors >= 5, `${anchors} anchors`);
const copyButtons = await evaluate("document.querySelectorAll('pre .copy-btn').length");
check('copy buttons injected', copyButtons >= 2, `${copyButtons} buttons`);
const langLabels = await evaluate("document.querySelectorAll('pre .code-block__lang').length");
check('code language labels', langLabels >= 2, `${langLabels} labels`);
const tocTargets = await evaluate(`(() => {
  const links = [...document.querySelectorAll('.toc a')];
  return { total: links.length, missing: links.filter(a => !document.getElementById(a.getAttribute('href').slice(1))).length };
})()`);
check('TOC targets exist', tocTargets.total > 0 && tocTargets.missing === 0, `${tocTargets.total} links, ${tocTargets.missing} missing`);
const katexCount = await evaluate("document.querySelectorAll('.katex').length");
check('math rendered', katexCount >= 4, `${katexCount} katex nodes`);
const figureCaps = await evaluate("document.querySelectorAll('.prose figure figcaption').length");
check('figures got captions', figureCaps >= 1, `${figureCaps} caption(s)`);

// citation / related / pager
const pager = await evaluate("document.querySelectorAll('.pager a').length");
check('prev/next pager rendered', pager >= 1, `${pager} links`);

// ---------- 4. language switch ----------
await navigate('/posts/');
const zhHref = await evaluate("document.querySelector('.lang-switch a').getAttribute('href')");
await send('Page.navigate', { url: `http://localhost:4321${zhHref}` }, sessionId);
await sleep(650);
const landed = await evaluate('location.pathname');
const zhTitle = await evaluate('document.documentElement.lang');
check('language switch reaches Chinese page', landed.startsWith('/blog/zh/posts'), landed);
check('html lang is zh-CN on Chinese pages', zhTitle === 'zh-CN', zhTitle);
const zhCanonical = await evaluate("document.querySelector('link[rel=canonical]').href");
check('zh canonical points to /zh/', zhCanonical.includes('/blog/zh/posts/'), zhCanonical);

// ---------- 5. filters ----------
await navigate('/projects/');
const totalCards = await evaluate("document.querySelectorAll('[data-filter-list] > [data-status]').length");
await evaluate("[...document.querySelectorAll('[data-filter]')].find(b => b.dataset.filter === 'active').click()");
await sleep(200);
const visibleActive = await evaluate("[...document.querySelectorAll('[data-filter-list] > [data-status]')].filter(el => !el.hidden).length");
const countText = await evaluate("document.querySelector('[data-filter-count]').textContent.trim()");
check('project status filter works', visibleActive > 0 && visibleActive < totalCards, `${visibleActive}/${totalCards} visible, counter "${countText}"`);

// ---------- 6. keyboard focus ----------
await navigate('/');
await evaluate("document.querySelector('.site-nav__link').focus()");
const outline = await evaluate("getComputedStyle(document.querySelector('.site-nav__link')).outlineStyle");
check('visible focus ring on keyboard focus', outline !== 'none', `outline-style=${outline}`);

// ---------- 7. 404 page ----------
const res = await fetch(`${BASE}/404/`);
const html404 = await res.text();
check('404 page bilingual', html404.includes('页面不存在') && html404.includes('Page not found'));

// ---------- 8. console errors ----------
check('no console errors across tested pages', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'clean');

ws.close();
chrome.kill();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
