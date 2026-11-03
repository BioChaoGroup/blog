#!/usr/bin/env node
/**
 * Screenshot + layout QA harness driven by the Chrome DevTools Protocol.
 *
 * Chrome's `--screenshot` flag cannot emulate a mobile viewport (it renders at
 * the window width and crops), so this script drives a real headless Chrome
 * session, sets device metrics, and captures both the viewport and the full
 * page. It also reports document scrollWidth/scrollHeight so horizontal
 * overflow bugs are caught numerically instead of by eyeballing pixels.
 *
 * Usage: node scripts/shots.mjs [--port 9333] [--out .screenshots] [--only name]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const PORT = Number(getArg('--port', '9333'));
const OUT = getArg('--out', '.screenshots');
const ONLY = getArg('--only', '');
const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4321/blog';

const shots = [
  { name: 'home', path: '/', width: 1440, height: 900 },
  { name: 'home-mobile', path: '/', width: 390, height: 844, mobile: true },
  { name: 'projects', path: '/projects/', width: 1440, height: 900 },
  { name: 'tools', path: '/tools/', width: 1440, height: 900 },
  { name: 'posts', path: '/posts/', width: 1440, height: 900 },
  { name: 'post', path: '/posts/linked-read-metagenome-assembly/', width: 1440, height: 900 },
  { name: 'post-mobile', path: '/posts/linked-read-metagenome-assembly/', width: 390, height: 844, mobile: true },
  { name: 'publications', path: '/publications/', width: 1440, height: 900 },
  { name: 'team', path: '/team/', width: 1440, height: 900 },
  { name: 'zh-home', path: '/zh/', width: 1440, height: 900 },
  { name: 'zh-posts', path: '/zh/posts/', width: 1440, height: 900 },
  { name: 'tags', path: '/tags/', width: 1440, height: 900 },
  { name: '404', path: '/404/', width: 1440, height: 900 },
  { name: 'projects-mobile', path: '/projects/', width: 390, height: 844, mobile: true },
  { name: 'posts-mobile', path: '/posts/', width: 390, height: 844, mobile: true },
  { name: 'publications-mobile', path: '/publications/', width: 390, height: 844, mobile: true },
  { name: 'team-mobile', path: '/team/', width: 390, height: 844, mobile: true },
  { name: 'zh-post-mobile', path: '/zh/posts/pangenome-workflow/', width: 390, height: 844, mobile: true },
];

const selected = ONLY ? shots.filter((s) => s.name.includes(ONLY)) : shots;
if (!selected.length) {
  console.error(`no shots match --only ${ONLY}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-crash-reporter',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/chrome-cdp-profile',
    'about:blank',
  ],
  { stdio: 'ignore', detached: false },
);

async function waitForDevtools() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not come up');
}

const browserWsUrl = await waitForDevtools();
const ws = new WebSocket(browserWsUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} (${JSON.stringify(msg.params ?? {})})`));
    else resolve(msg.result);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);

const results = [];

for (const shot of selected) {
  const { width, height, mobile = false, path, name } = shot;
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile },
    sessionId,
  );
  await send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
  await sleep(500);
  // Web fonts change text metrics; measuring before they settle produces false
  // layout reports (and wrong full-page heights).
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true }, sessionId).catch(() => {});
  await sleep(250);

  const { result } = await send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        const de = document.documentElement;
        const contained = (el) => {
          let node = el.parentElement;
          while (node && node !== document.body) {
            const ox = getComputedStyle(node).overflowX;
            if (ox !== 'visible') return true;
            node = node.parentElement;
          }
          return false;
        };
        const desc = (el) => {
          let out = el.tagName.toLowerCase();
          if (typeof el.className === 'string' && el.className.trim()) out += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
          if (el.id) out += '#' + el.id;
          return out;
        };
        const wide = [...document.querySelectorAll('body *')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ el, r }) => r.right > de.clientWidth + 1 && !contained(el) && r.width > 0)
          .slice(0, 8)
          .map(({ el, r }) => desc(el) + ' → right ' + Math.round(r.right) + ' w ' + Math.round(r.width));
        return JSON.stringify({ scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, scrollHeight: de.scrollHeight, title: document.title, wide });
      })()`,
      returnByValue: true,
    },
    sessionId,
  );
  const info = JSON.parse(result.value);

  // viewport capture
  const viewport = await send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: false },
    sessionId,
  );
  writeFileSync(`${OUT}/${name}-viewport.png`, Buffer.from(viewport.data, 'base64'));

  // full-page capture
  const metrics = await send('Page.getLayoutMetrics', {}, sessionId);
  const contentHeight = Math.min(Math.ceil(metrics.cssContentSize.height), 16000);
  await send('Emulation.setDeviceMetricsOverride', { width, height: contentHeight, deviceScaleFactor: mobile ? 1 : 1, mobile }, sessionId);
  await sleep(350);
  const full = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
  writeFileSync(`${OUT}/${name}-full.png`, Buffer.from(full.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }, sessionId);

  results.push({
    name,
    path,
    viewport: `${width}x${height}`,
    scrollWidth: info.scrollWidth,
    clientWidth: info.clientWidth,
    overflow: info.scrollWidth > info.clientWidth + 1,
    pageHeight: info.scrollHeight,
    title: info.title,
    wide: info.wide,
  });
  console.log(
    `${info.scrollWidth > info.clientWidth + 1 ? 'OVERFLOW' : 'ok      '} ${name.padEnd(14)} ${width}x${height}  document ${info.scrollWidth}px  height ${info.scrollHeight}px  ${info.title.slice(0, 48)}`,
  );
  if (info.wide.length) console.log(`         wide elements: ${info.wide.join(' | ')}`);
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
ws.close();
chrome.kill();
const overflowing = results.filter((r) => r.overflow);
console.log(`\n${results.length} pages captured → ${OUT}/ (report.json). ${overflowing.length} with horizontal overflow.`);
process.exit(0);
