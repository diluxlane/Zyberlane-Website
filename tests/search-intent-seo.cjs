'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../scripts/build.cjs');
const { findSources, checkStructuredData } = require('../scripts/structured-data.cjs');
const root = path.resolve(__dirname, '..');
const { output, pages } = build(root);
const origin = 'https://zyberlane.com';
const routes = ['/', '/about/', '/services/', '/services/web-development/', '/services/web-app-development/', '/services/ai-automation/', '/privacy-policy/', '/terms/', '/work/divine-tattoo/'];
const detailRoutes = routes.filter(route => route.startsWith('/services/') && route !== '/services/');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.ok(vercel.redirects.some(rule => rule.source === '/services/:service/index.html' && rule.destination === '/services/:service/' && rule.permanent === true), 'Nested service index.html variants need permanent same-host redirects');
assert.deepEqual(pages.slice().sort(), routes.map(route => origin + route).sort(), 'Unplanned public landing pages or a missing destination');
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const text = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const documents = new Map();
const titles = new Set(), descriptions = new Set();
for (const route of routes) {
  const html = fs.readFileSync(path.join(output, route.slice(1), 'index.html'), 'utf8');
  const head = html.split('</head>')[0];
  const title = text(head.match(/<title>(.*?)<\/title>/s)[1]);
  const metas = [...head.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)];
  const meta = key => {
    const matches = metas.filter(match => match[1] === key);
    assert.equal(matches.length, 1, route + ': ' + key);
    return decode(matches[0][2]);
  };
  assert.ok(!titles.has(title)); titles.add(title);
  const description = meta('description');
  assert.ok(!descriptions.has(description)); descriptions.add(description);
  for (const key of ['og:title', 'twitter:title']) assert.equal(meta(key), title);
  for (const key of ['og:description', 'twitter:description']) assert.equal(meta(key), description);
  assert.equal(meta('og:url'), origin + route);
  assert.equal(meta('robots'), 'index, follow');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const headings = [...body.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)];
  let previous = 0;
  for (const heading of headings) {
    const level = Number(heading[1][1]);
    assert.ok(text(heading[2]), route + ': empty heading');
    assert.ok(level <= previous + 1, route + ': skipped heading level');
    previous = level;
  }
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json" id="zyberlane-structured-data">([\s\S]*?)<\/script>/)[1])['@graph'];
  const page = graph.find(node => node['@id'] === origin + route + '#webpage');
  assert.equal(page.name, title); assert.equal(page.description, description);
  assert.ok(!/vercel\.app|netlify\.app|localhost|127\.0\.0\.1/.test(head.replace(/<script(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/g, '')));
  documents.set(route, { html, graph, page });
}

const overview = documents.get('/services/');
const definitions = overview.graph.filter(node => node['@type'] === 'Service');
const destinations = {
  'web-development': '/services/web-development/',
  'software-development': '/services/web-app-development/',
  'mobile-app-development': '/services/',
  'ai-agents-automation': '/services/ai-automation/',
  'business-automation-integrations': '/services/ai-automation/',
  'seo-web-optimization': '/services/'
};
assert.equal(definitions.length, 6, 'Existing service coverage must be retained');
for (const [slug, route] of Object.entries(destinations)) {
  const service = definitions.find(node => node['@id'] === origin + '/#service-' + slug);
  assert.ok(service, 'Persistent service identity lost: ' + slug);
  assert.equal(service.url, origin + route);
  assert.equal(service.mainEntityOfPage['@id'], origin + route + '#webpage');
  assert.ok(overview.html.includes('id="' + slug + '"'), 'Missing overview section anchor');
}
for (const route of detailRoutes) {
  const { html, graph, page } = documents.get(route);
  assert.ok(overview.html.includes('href="' + route + '"'), 'Detail page orphaned from overview');
  assert.ok(documents.get('/').html.includes('href="' + route + '"'), 'Detail page orphaned from Home');
  assert.ok(documents.get('/about/').html.includes('href="' + route + '"'), 'Detail page orphaned from About');
  assert.ok(html.includes('href="/#booking"') && html.includes('href="/#contact"'));
  assert.ok(html.includes('href="/assets/site-pages.css"') && html.includes('src="/assets/site-pages.js"'));
  const nav = html.match(/<nav id="mainNav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.deepEqual([...nav.matchAll(/<a\b[^>]*>(.*?)<\/a>/g)].map(match => text(match[1])), ['Home', 'About', 'Services', 'Work', 'FAQ', 'Contact']);
  const trail = graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement;
  assert.deepEqual(trail.map(item => item.item), [origin + '/', origin + '/services/', origin + route]);
  assert.ok(html.includes('href="' + route + '" aria-current="page">' + trail[2].name + '</a>'));
  assert.ok(page.mainEntity.length >= 1);
  assert.ok(html.includes('Sri Lanka') && html.includes('Dilux'));
  assert.ok(!/\b(?:LKR|USD|Rs\.?)\s*[\d,]+|\$\s*\d|#1|world-class|leading company|best-in-class/i.test(text(html.split('</head>')[1])), 'Unsupported price or positioning claim');
}
assert.match(documents.get('/services/web-development/').html, /Divine Tattoo[\s\S]*?Client Projects/);
assert.match(documents.get('/services/ai-automation/').html, /id="business-automation"/);

// Never silently fall back to the overview when a selected destination is removed.
const sources = findSources(root).filter(source => source.file !== 'services/web-development/index.html');
assert.throws(() => checkStructuredData(root, sources), /Missing canonical service destination/);
assert.ok(!fs.existsSync(path.join(output, 'docs')), 'Research record must not ship as a public SEO page');
console.log('PASS: 9 public destinations including the Phase 4 project page; unique synchronized metadata; one H1 and ordered headings; three discoverable service pages; six stable service entities; real breadcrumbs; production identity; quotation-based content; missing destinations rejected.');
