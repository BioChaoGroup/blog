#!/usr/bin/env node
/**
 * WCAG contrast audit for the design tokens (`src/styles/tokens.css`).
 *
 * Every colour pair below is text-on-surface used by the site. The palette is
 * anchored on BGI's brand blue, and the rule is: body and link text must reach
 * WCAG AA (4.5:1) in both themes; large display text may use the 3:1 tier.
 *
 * Usage: node scripts/contrast.mjs
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const body = css.slice(open + 1, close);
  const vars = {};
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[match[1]] = normalise(match[2]);
  }
  return vars;
}

function normalise(hex) {
  if (hex.length === 4) return `#${[...hex.slice(1)].map((c) => c + c).join('')}`;
  return hex.toLowerCase();
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const light = block(':root');
const dark = block("[data-theme='dark']");

/** [label, foreground token, background token, minimum ratio] */
const pairs = [
  ['light body text', 'ink', 'paper', 4.5],
  ['light secondary text', 'ink-2', 'paper', 4.5],
  ['light muted text', 'ink-3', 'paper', 4.5],
  ['light label text', 'ink-4', 'paper', 4.5],
  ['light link', 'accent', 'paper', 4.5],
  ['light link hover', 'accent-2', 'paper', 4.5],
  ['light link on card', 'accent', 'paper-2', 4.5],
  ['light draft/warn text', 'warm', 'paper', 4.5],
  ['light info text', 'info', 'paper-2', 4.5],
  ['light display heading', 'accent-display', 'paper', 3.0],
  ['light button label', 'accent-contrast', 'brand', 4.5],
  ['light body on brand block', 'accent-contrast', 'brand', 4.5],
  ['light tag text', 'ink-3', 'paper-3', 4.5],

  ['dark body text', 'ink', 'paper', 4.5],
  ['dark secondary text', 'ink-2', 'paper', 4.5],
  ['dark muted text', 'ink-3', 'paper', 4.5],
  ['dark label text', 'ink-4', 'paper', 4.5],
  ['dark link', 'accent', 'paper', 4.5],
  ['dark link hover', 'accent-2', 'paper', 4.5],
  ['dark link on card', 'accent', 'paper-2', 4.5],
  ['dark draft/warn text', 'warm', 'paper', 4.5],
  ['dark cyan highlight', 'accent-bright', 'paper', 4.5],
  ['dark display heading', 'accent-display', 'paper', 3.0],
  ['dark button label', 'accent-contrast', 'brand', 4.5],
  ['dark tag text', 'ink-3', 'paper-3', 4.5],
];

let failures = 0;
for (const [label, fg, bg, min] of pairs) {
  const theme = label.startsWith('dark') ? dark : light;
  if (!theme[fg] || !theme[bg]) {
    console.log(`SKIP  ${label} (missing token ${!theme[fg] ? fg : bg})`);
    failures += 1;
    continue;
  }
  const value = ratio(theme[fg], theme[bg]);
  const pass = value >= min;
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(24)} ${theme[fg]} on ${theme[bg]}  ${value.toFixed(2)}:1 (min ${min})`,
  );
}

console.log(`\n${pairs.length - failures}/${pairs.length} contrast checks passed.`);
process.exit(failures ? 1 : 0);
