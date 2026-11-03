#!/usr/bin/env node
/** Export the approved fungal logo and app/share assets in the site palette.
 * The imagegen source supplies the silhouette; alpha masks use exact tokens
 * without re-typesetting the approved wordmark.
 * Run after pnpm install: node scripts/render-brand.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const sharp = astroRequire('sharp');
const source = readFileSync('public/brand/fungal-lockup-source.png');
const image = `data:image/png;base64,${source.toString('base64')}`;
const tokens = readFileSync('src/styles/tokens.css', 'utf8').split("[data-theme='dark']")[0];
const color = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]+)`, 'i'))[1];
const brand = color('brand');
const ink = color('ink');
const accent = color('accent');
const paper = color('paper');

const lockup = (nameInk = ink, subInk = accent) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="72 112 2040 510" width="2040" height="510" role="img" aria-label="BioChaoGroup · AI × BI × SCI">
<defs><mask id="logo" x="0" y="0" width="2172" height="724" maskUnits="userSpaceOnUse" style="mask-type:alpha"><image href="${image}" width="2172" height="724"/></mask></defs>
<g mask="url(#logo)"><path fill="${nameInk}" d="M0 0h2172v724H0z"/><path fill="${brand}" d="M0 0h680v724H0z"/><path fill="${subInk}" d="M680 450h1492v274H680z"/></g></svg>`;

const light = lockup();
writeFileSync('public/brand/biochaogroup-logo.svg', light);
await sharp(Buffer.from(light)).png().toFile('public/brand/biochaogroup-logo.png');
writeFileSync('public/brand/biochaogroup-logo-dark.svg', lockup('#e6f4f8', '#5ad8f0'));

// Browser/app icons use only the approved fungus on a solid paper tile.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
<rect width="640" height="640" rx="112" fill="${paper}"/>
<svg x="36" y="66" width="568" height="508" viewBox="72 112 600 510" overflow="hidden">
<defs><mask id="mark" x="0" y="0" width="680" height="724" maskUnits="userSpaceOnUse" style="mask-type:alpha"><image href="${image}" width="2172" height="724"/></mask></defs>
<path fill="${brand}" d="M0 0h680v724H0z" mask="url(#mark)"/></svg></svg>`;
// Keep the browser-tab SVG small instead of embedding the full source.
const iconPng = await sharp(Buffer.from(icon)).resize(128, 128).png().toBuffer();
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image href="data:image/png;base64,${iconPng.toString('base64')}" width="128" height="128"/></svg>\n`);
await sharp(Buffer.from(icon)).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(Buffer.from(icon)).resize(180, 180).png().toFile('public/apple-touch-icon.png');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${paper}"/><path fill="${brand}" d="M0 0h1200v10H0z"/>
<svg x="80" y="140" width="1040" height="260" viewBox="72 112 2040 510">${light.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
<text x="600" y="473" text-anchor="middle" font-family="sans-serif" font-size="28" fill="${accent}">Bioinformatics · Genomics · Research</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-default.png');
console.log(`Brand assets exported: ${brand} / ${ink} / ${accent}`);
