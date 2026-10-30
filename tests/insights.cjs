'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build} = require('../scripts/build.cjs');
const root = path.resolve(__dirname, '..');
const {pages} = build(root);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('insights/index.html');
const graph = JSON.parse(html.match(/<script type="application\/ld\+json" id="zyberlane-structured-data">([\s\S]*?)<\/script>/)[1])['@graph'];
const page = graph.find(node => node['@type'] === 'CollectionPage');
assert.equal(page.url, 'https://zyberlane.com/insights/');
assert.equal(page.isPartOf['@id'], 'https://zyberlane.com/#website');
assert.equal(page.about['@id'], 'https://zyberlane.com/#organization');
assert.deepEqual(page.mentions, [{'@id':'https://zyberlane.com/work/divine-tattoo/#project'}]);
assert.equal(graph.find(n => n['@type'] === 'BreadcrumbList').itemListElement.at(-1).name, 'Insights');
assert.equal(pages.filter(url => url.endsWith('/insights/')).length, 1);
assert.equal(pages.length, 11);
for (const route of ['blog', 'case-studies']) {
  assert.ok(!pages.some(url => url.includes('/' + route + '/')));
  assert.ok(!fs.existsSync(path.join(root, 'dist', route)));
}
assert.match(html, /id="case-studies"/); assert.match(html, /id="blog"/);
assert.match(html, /No articles published yet/);
assert.equal((html.match(/data-slug=/g) || []).length, 1);
assert.match(html, /href="\/work\/divine-tattoo\/"/);
assert.doesNotMatch(html, /BlogPosting|datePublished|dateModified|aggregateRating|"@type": "Review"/);
for (const file of ['index.html','work/index.html','work/divine-tattoo/index.html']) assert.match(read(file), /href="\/insights\/(?:#case-studies)?"/);
for (const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
 const target = match[1];
 assert.ok(fs.existsSync(path.join(root, 'dist', target, target.endsWith('/') ? 'index.html' : '')), 'Broken link: '+target);
}
for (const folder of ['docs','tests','scripts','security']) assert.ok(!fs.existsSync(path.join(root,'dist',folder)));
assert.match(read('vercel.json'), /noindex/);
console.log('PASS: one factual Insights hub, connected schema, valid local links, no fabricated articles or future URLs, private build sources excluded.');
