'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { build } = require('../scripts/build.cjs');
const { checkStructuredData, findSources, serialize } = require('../scripts/structured-data.cjs');
const vocabulary = require('./fixtures/schemaorg-used-vocabulary.json');
const root = path.resolve(__dirname, '..');
const { output, pages } = build(root);
const origin = 'https://zyberlane.com';
const read = file => fs.readFileSync(path.join(output, file), 'utf8');
const fileFor = url => url === origin + '/' ? 'index.html' : new URL(url).pathname.slice(1) + 'index.html';
const documents = pages.map(url => {
  const html = read(fileFor(url));
  const blocks = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)).filter(match => /type="application\/ld\+json"/.test(match[1]));
  assert.equal(blocks.length, 1); assert.match(blocks[0][1], /id="zyberlane-structured-data"/);
  const data = JSON.parse(blocks[0][2]);
  assert.equal(data['@context'], 'https://schema.org'); assert.ok(Array.isArray(data['@graph']));
  return { url, html, data, page: data['@graph'].find(node => node['@id'] === url + '#webpage') };
});
const nodes = new Map();
for (const { data } of documents) for (const node of data['@graph']) {
  const id = new URL(node['@id']);
  assert.equal(id.origin, origin); assert.ok(id.hash); assert.equal(id.search, '');
  assert.ok(!nodes.has(node['@id']), 'Conflicting/repeated entity definition: ' + node['@id']);
  nodes.set(node['@id'], node);
}
function isA(actual, expected) { return actual === expected || (vocabulary.classes[actual] || []).some(parent => isA(parent, expected)); }
function targetFor(value) {
  if (value && typeof value === 'object' && value['@id']) {
    const target = nodes.get(value['@id']); assert.ok(target, 'Unresolved entity reference: ' + value['@id']); return target;
  }
  if (typeof value === 'string' && value.startsWith(origin)) return [...nodes.values()].find(node => node.url === value && isA(node['@type'], 'WebPage'));
  return value;
}
let propertiesChecked = 0;
function validate(node) {
  if (!node['@type']) { assert.ok(nodes.has(node['@id']), 'Unresolved reference'); return; }
  assert.ok(Object.hasOwn(vocabulary.classes, node['@type']), 'Unknown Schema.org type: ' + node['@type']);
  for (const [key, original] of Object.entries(node)) {
    if (key.startsWith('@')) continue;
    const property = vocabulary.properties[key]; assert.ok(property, 'Unknown Schema.org property: ' + key);
    assert.ok(property.domain.some(type => isA(node['@type'], type)), key + ' is invalid on ' + node['@type']);
    for (const value of Array.isArray(original) ? original : [original]) {
      const target = targetFor(value);
      let valid = false;
      if (target && typeof target === 'object') valid = property.range.some(type => isA(target['@type'], type));
      if (typeof value === 'string' && property.range.includes('Text')) valid = true;
      if (typeof value === 'string' && property.range.includes('URL')) { assert.ok(URL.canParse(value)); valid = true; }
      if (Number.isInteger(value) && property.range.includes('Integer')) valid = true;
      assert.ok(valid, 'Invalid range for ' + node['@type'] + '.' + key);
      if (value && typeof value === 'object') validate(value);
      if (['url', 'contentUrl', 'item'].includes(key) && typeof value === 'string') assert.equal(new URL(value).origin, origin, 'Preview/external URL in page identity');
      propertiesChecked++;
    }
  }
}
for (const node of nodes.values()) validate(node);
const org = nodes.get(origin + '/#organization');
const founder = nodes.get(origin + '/#founder');
const website = nodes.get(origin + '/#website');
assert.equal(org['@type'], 'Organization'); assert.equal(org.name, 'Zyberlane'); assert.equal(org.url, origin + '/');
assert.equal(org.founder['@id'], founder['@id']); assert.equal(founder['@type'], 'Person');
assert.equal(founder.name, 'Dilux'); assert.equal(founder.alternateName, 'Dilukshan');
assert.equal(founder.affiliation['@id'], org['@id']); assert.equal(founder.url, origin + '/about/');
assert.equal(website['@type'], 'WebSite'); assert.equal(website.publisher['@id'], org['@id']);
assert.deepEqual(org.sameAs, ['https://github.com/Zyberlane', 'https://maps.app.goo.gl/43SbLYGa6dmvyjkN6']);
const home = documents.find(document => document.url === origin + '/');
for (const profile of org.sameAs) assert.ok(home.html.includes('href="' + profile + '"'), 'Unlinked official profile');
assert.ok(home.html.includes('href="mailto:' + org.email + '"')); assert.equal(org.contactPoint.email, org.email);
const logo = nodes.get(org.logo['@id']);
assert.equal(logo['@type'], 'ImageObject');
const image = fs.readFileSync(path.join(output, new URL(logo.contentUrl).pathname));
assert.equal(image.subarray(1, 4).toString(), 'PNG');
assert.ok(image.readUInt32BE(16) >= 112 && image.readUInt32BE(20) >= 112);

for (const { url, page, html } of documents) {
  assert.ok(page, 'Missing page entity'); assert.equal(page.url, url);
  assert.equal(page.isPartOf['@id'], website['@id']); assert.equal(page.about['@id'], org['@id']);
  assert.ok(html.includes('href="' + url + '"')); // Canonical and social URLs are separately checked by Phase 1.
  if (url !== origin + '/') {
    const breadcrumb = nodes.get(page.breadcrumb['@id']);
    assert.equal(breadcrumb['@type'], 'BreadcrumbList');
    assert.deepEqual(breadcrumb.itemListElement.map(item => [item.position, item.item]), [[1, origin + '/'], [2, url]]);
    assert.ok(html.includes('href="/">Home</a>')); // A genuine navigation path, not invented intermediate pages.
  }
}
const about = documents.find(document => document.url === origin + '/about/');
assert.equal(about.page['@type'], 'AboutPage'); assert.ok(about.html.includes('<h3>Dilukshan (Dilux)</h3>'));
const services = documents.find(document => document.url === origin + '/services/');
assert.equal(services.page['@type'], 'CollectionPage'); assert.equal(services.page.mainEntity.length, 6);
const decode = value => value.replace(/&amp;/g, '&');
const visible = Array.from(services.html.matchAll(/<article class="skill-card"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>[\s\S]*?<\/article>/g), match => [decode(match[1]), decode(match[2])]);
const represented = services.page.mainEntity.map(reference => {
  const service = nodes.get(reference['@id']); assert.equal(service['@type'], 'Service');
  assert.equal(service.provider['@id'], org['@id']); assert.equal(service.mainEntityOfPage['@id'], services.page['@id']);
  assert.equal(service.url, services.url); return [service.name, service.description];
});
assert.deepEqual(represented, visible);
const banned = ['PostalAddress', 'LocalBusiness', 'FAQPage', 'Review', 'AggregateRating', 'Offer', 'Product', 'SearchAction', 'Project'];
for (const node of nodes.values()) assert.ok(!banned.includes(node['@type']), 'Unnecessary/misleading entity added');
const serialized = JSON.stringify(documents.map(document => document.data));
assert.ok(!/vercel\.app|netlify\.app|localhost|127\.0\.0\.1|"(?:birthDate|streetAddress|legalName|foundingDate|numberOfEmployees|price|ratingValue|telephone)"/.test(serialized));
assert.ok(!serialized.includes('Worldwide'));
assert.ok(!serialize({ description: '</script><script>alert(1)</script>' }).includes('</script>'));

// Meaningful drift and relationship failures must be caught, not silently published.
const sources = findSources(root);
const changed = sources.map(source => source.file === 'services/index.html' ? { ...source, html: source.html.replace('Modern websites and web experiences', 'Changed service wording and web experiences') } : source);
assert.throws(() => checkStructuredData(root, changed), /stale structured data/);
assert.throws(() => validate({ '@type': 'Organization', affiliation: { '@id': org['@id'] } }), /invalid on/);
assert.throws(() => validate({ '@type': 'Service', provider: { '@id': origin + '/#missing' } }), /Unresolved/);

// A hosting platform's environment must never become the business/page identity.
execFileSync(process.execPath, ['scripts/build.cjs'], { cwd: root, env: { ...process.env,
  VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'entity-test.vercel.app',
  DEPLOY_URL: 'https://entity-test.netlify.app', DEPLOY_PRIME_URL: 'http://localhost:4321'
} });
for (const { url, html } of documents) assert.equal(read(fileFor(url)), html, 'Hosting environment changed HTML/SEO identity');

console.log('PASS: ' + documents.length + ' connected page graphs; ' + nodes.size + ' unique entity definitions; ' + propertiesChecked + ' property/range checks against the retrieved Schema.org vocabulary.');
console.log('PASS: public founder/organization/profile facts; six matching visible services; real logo; production-only identities even under preview environment variables; breadcrumbs; drift detection; invalid relationships rejected; no personal/private/fabricated extensions.');
console.log('Schema vocabulary and graph checks do not guarantee Google rich-result display or search/AI ranking.');
