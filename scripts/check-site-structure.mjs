#!/usr/bin/env node
// Static crawlability and link audit for Image Everything, including /ko/ pages.
// Run from repo root: node scripts/check-site-structure.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = (process.env.SITE_ORIGIN || 'https://image.everytinytool.com').replace(/\/+$/, '');
const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
function localFile(url) {
  const u = new URL(url);
  const pathname = decodeURIComponent(u.pathname);
  if (!pathname.startsWith('/')) throw new Error('Unexpected path');
  const relative = pathname.slice(1);
  const normalized = pathname.endsWith('/') || relative === '' ? path.join(relative, 'index.html') : relative;
  const full = path.resolve(root, normalized);
  if (!full.startsWith(root + path.sep)) throw new Error('Path escapes repository');
  return full;
}
function find(html, re) {
  return [...html.matchAll(re)].map(m => m[1]);
}
assert(urls.length === 59, 'Expected 59 sitemap URLs, found ' + urls.length);
assert(new Set(urls).size === urls.length, 'Duplicate sitemap URL');
const paths = new Set();
let htmlPages = 0, assetRefs = 0, internalLinks = 0;
for (const url of urls) {
  let parsed;
  try { parsed = new URL(url); } catch { errors.push('Invalid sitemap URL: ' + url); continue; }
  assert(parsed.origin === origin, 'Wrong sitemap host: ' + url);
  assert(!paths.has(parsed.pathname), 'Duplicate sitemap path: ' + parsed.pathname);
  paths.add(parsed.pathname);
  const file = localFile(url);
  if (!fs.existsSync(file)) { errors.push('Missing sitemap target: ' + path.relative(root, file) + ' (' + url + ')'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  htmlPages++;
  const canonical = find(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/gi);
  assert(canonical.length === 1, 'Expected one canonical: ' + url + ' (found ' + canonical.length + ')');
  if (canonical.length) assert(canonical[0] === url, 'Canonical != sitemap: ' + url + ' -> ' + canonical[0]);
  assert((html.match(/<title\b[^>]*>[\s\S]*?<\/title>/gi) || []).length === 1, 'Missing/duplicate title: ' + url);
  assert((html.match(/<h1\b/gi) || []).length === 1, 'Missing/duplicate h1: ' + url);
  assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html), 'Noindex page in sitemap: ' + url);
  for (const target of find(html, /\b(?:href|src)=["']([^"']+)["']/gi)) {
    if (/^(#|mailto:|tel:|javascript:|data:|blob:)/i.test(target)) continue;
    let resolved;
    try { resolved = new URL(target.replaceAll('&amp;', '&'), url); } catch { errors.push('Malformed href/src on ' + url + ': ' + target); continue; }
    if (resolved.origin !== origin) continue;
    const out = localFile(resolved.href);
    if (/\/$/.test(resolved.pathname) || /\.(?:css|js|svg|webp|png|jpg|jpeg|gif|ico|html|txt|xml)$/i.test(resolved.pathname)) {
      if (!fs.existsSync(out)) errors.push('Broken internal reference: ' + url + ' -> ' + target);
      if (/\.(css|js|svg|webp|png|jpg|jpeg|gif|ico)$/i.test(resolved.pathname)) assetRefs++;
      else internalLinks++;
    }
  }
}
const enTools = ['compress-image','remove-background','pdf-compressor','resize-image','crop-image','convert-image','image-to-webp','webp-to-jpg','rotate-image','jpg-compressor','png-compressor','png-to-jpg','jpg-to-png','heic-to-jpg','video-compressor','metadata-inspector','metadata-cleaner'];
for (const tool of enTools) {
  assert(paths.has('/' + tool + '/'), 'Missing EN tool URL: ' + tool);
  assert(paths.has('/ko/' + tool + '/'), 'Missing KO tool URL: ' + tool);
}
assert(paths.has('/guides/'), 'Missing guides index');
assert(![...paths].some(p => /screen-ruler|compare-two-lists/.test(p)), 'Non-image content in sitemap');
console.log('Checked ' + htmlPages + '/' + urls.length + ' sitemap HTML pages, ' + internalLinks + ' internal links, ' + assetRefs + ' local asset references.');
if (errors.length) { for (const e of errors) console.error('FAIL ' + e); process.exitCode = 1; }
else console.log('PASS: sitemap, canonical, EN/KO tool coverage and static links.');
