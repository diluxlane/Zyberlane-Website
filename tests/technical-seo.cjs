'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { build } = require('../scripts/build.cjs');
const root = path.resolve(__dirname, '..');
const { output, pages } = build(root);
const read = file => fs.readFileSync(path.join(output, file), 'utf8');
const attrs = tag => Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g), m => [m[1].toLowerCase(), m[2] ?? m[3]]));
const decode = value => value.replace(/&amp;/g, '&').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)));
const publicPages = pages.map(url => new URL(url).pathname.slice(1) + 'index.html');
const titles = new Set();
const canonicals = [];
let checkedLinks = 0, checkedResources = 0;

function localFile(url) {
  let file = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!file || file.endsWith('/')) file += 'index.html';
  return path.join(output, file);
}

for (const file of publicPages) {
  const html = read(file);
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
  const meta = Array.from(head.matchAll(/<meta\b[^>]*>/gi), m => attrs(m[0]));
  const links = Array.from(head.matchAll(/<link\b[^>]*>/gi), m => attrs(m[0]));
  const values = key => meta.filter(m => (m.name || m.property) === key).map(m => m.content);
  const one = key => { const all = values(key); assert.equal(all.length, 1, file + ': ' + key); assert.ok(all[0]); return all[0]; };
  const title = Array.from(head.matchAll(/<title>([\s\S]*?)<\/title>/gi), m => m[1]);
  assert.equal(title.length, 1); assert.ok(!titles.has(title[0]), 'Duplicate title'); titles.add(title[0]);
  const canonical = links.filter(link => link.rel === 'canonical');
  assert.equal(canonical.length, 1); canonicals.push(canonical[0].href);
  assert.ok(canonical[0].href.startsWith('https://zyberlane.com/'));
  assert.equal(one('robots'), 'index, follow');
  one('description'); one('viewport'); one('og:title'); one('og:description'); one('og:type');
  assert.equal(one('og:url'), canonical[0].href);
  for (const key of ['og:image', 'twitter:image']) {
    const image = new URL(one(key));
    assert.equal(image.origin, 'https://zyberlane.com');
    assert.ok(fs.existsSync(localFile(image)), key + ' missing image');
  }
  one('twitter:card'); one('twitter:title'); one('twitter:description');
  assert.ok(/<h1\b/i.test(html), file + ': missing static heading');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/application\/ld\+json/i.test(m[1])) JSON.parse(m[2]);
  }
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (!a.href || /^(?:mailto:|tel:|javascript:)/i.test(a.href)) continue;
    const url = new URL(decode(a.href), canonical[0].href);
    if (url.origin !== 'https://zyberlane.com') continue;
    const target = localFile(url);
    assert.ok(fs.existsSync(target), file + ': broken internal link ' + a.href);
    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      const ids = Array.from(fs.readFileSync(target, 'utf8').matchAll(/\bid\s*=\s*["']([^"']+)["']/g), m => m[1]);
      assert.ok(ids.includes(id), file + ': missing fragment ' + a.href);
    }
    checkedLinks++;
  }
  for (const m of html.matchAll(/<(?:script|img|link)\b[^>]*>/gi)) {
    const a = attrs(m[0]); const source = a.src || (a.rel !== 'canonical' && a.href);
    if (!source || /^(?:https?:|data:)/i.test(source)) continue;
    assert.ok(fs.existsSync(localFile(new URL(decode(source), canonical[0].href))), file + ': missing resource ' + source);
    checkedResources++;
  }
  for (const m of html.matchAll(/<a\b[^>]*href="mailto:contact@zyberlane\.com"[^>]*>contact@zyberlane\.com<\/a>/g)) {
    assert.equal(html.slice(m.index - 16, m.index), '<!--email_off-->');
    assert.equal(html.slice(m.index + m[0].length, m.index + m[0].length + 17), '<!--/email_off-->');
  }
}

const sitemap = read('sitemap.xml');
assert.deepEqual(Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), m => m[1]).sort(), canonicals.sort());
assert.ok(!/<lastmod>|<priority>|<changefreq>/.test(sitemap));
assert.equal(new Set(canonicals).size, publicPages.length);
const robots = read('robots.txt');
assert.equal(robots, fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'));
assert.match(robots, /User-agent: \*\s+Allow: \/\s+Disallow: \/admin\//);
assert.match(robots, /Sitemap: https:\/\/zyberlane\.com\/sitemap.xml/);
assert.match(read('admin/index.html'), /<meta name="robots" content="noindex, nofollow">/);
assert.match(read('_headers'), /\/admin\/\*[\s\S]*X-Robots-Tag: noindex, nofollow/);
for (const privatePath of ['docs', 'tests', 'scripts', 'security', '.git', '.env', 'netlify.toml', 'vercel.json']) {
  assert.ok(!fs.existsSync(path.join(output, privatePath)), 'Internal source published: ' + privatePath);
}
for (const file of [...publicPages, 'admin/index.html']) {
  const target = '/' + file.replace(/(?:^|\/)index\.html$/, match => match.startsWith('/') ? '/' : '');
  assert.ok(read('_redirects').includes('/' + file + ' ' + target + ' 301!'));
}
assert.match(read('_redirects'), /https:\/\/zyberlane\.netlify\.app\/\* https:\/\/zyberlane\.com\/:splat 301!/);

// Exercise future-page discovery and verification-file preservation independently of today's URL list.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'zyberlane-seo-'));
try {
  fs.mkdirSync(path.join(fixture, 'assets'));
  fs.writeFileSync(path.join(fixture, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  fs.writeFileSync(path.join(fixture, 'index.html'), '<link rel="canonical" href="https://zyberlane.com/">');
  fs.mkdirSync(path.join(fixture, 'future'));
  fs.writeFileSync(path.join(fixture, 'future/index.html'), '<link rel="canonical" href="https://zyberlane.com/future/">');
  fs.writeFileSync(path.join(fixture, 'google123test.html'), 'google-site-verification: google123test.html');
  fs.writeFileSync(path.join(fixture, 'BingSiteAuth.xml'), '<users><user>test-verification</user></users>');
  fs.mkdirSync(path.join(fixture, 'private'));
  fs.writeFileSync(path.join(fixture, 'private/index.html'), '<meta name="robots" content="noindex">');
  fs.writeFileSync(path.join(fixture, '.env'), 'TEST_ONLY=not-for-publishing');
  const result = build(fixture);
  assert.deepEqual(result.pages, ['https://zyberlane.com/', 'https://zyberlane.com/future/']);
  for (const file of ['google123test.html', 'BingSiteAuth.xml']) assert.equal(fs.readFileSync(path.join(result.output, file), 'utf8'), fs.readFileSync(path.join(fixture, file), 'utf8'));
  assert.ok(!fs.existsSync(path.join(result.output, '.env')));
  fs.writeFileSync(path.join(fixture, 'future/index.html'), '<link rel="canonical" href="https://preview.example/future/">');
  assert.throws(() => build(fixture), /canonical must be/);
} finally { fs.rmSync(fixture, { recursive: true, force: true }); }

console.log('PASS: ' + publicPages.length + ' public pages; unique metadata, production canonicals, JSON-LD syntax, ' + checkedLinks + ' internal links/fragments, ' + checkedResources + ' local resources; sitemap, robots and admin exclusion.');
console.log('PASS: internal source excluded; index redirects; future-page discovery; verification files preserved; preview canonical rejected.');
console.log('HTTP redirects, CDN crawler policy and browser rendering require separate live verification.');
