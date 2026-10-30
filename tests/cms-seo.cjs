'use strict';

// Test the actual existing settings renderer without network/database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const source = html.slice(html.indexOf('  function applySeoMetadata('), html.indexOf('  // ---------- services (Core Expertise)'));
const title = html.match(/<title>(.*?)<\/title>/)[1].replace(/&amp;/g, '&');
const description = html.match(/<meta name="description" content="([^"]+)"/)[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const initialGraph = JSON.parse(html.match(/<script type="application\/ld\+json" id="zyberlane-structured-data">([\s\S]*?)<\/script>/)[1]);
const selectors = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'];
function harness(){
  const elements = Object.fromEntries(selectors.map(selector => [selector, {
    content: selector.includes('title') ? title : description,
    setAttribute(name, value) { this[name] = value; }
  }]));
  const block = { textContent: JSON.stringify(initialGraph) };
  const hero = { textContent: 'Source hero text', getAttribute: () => 'hero_description' };
  const role = { textContent: 'Source role text', getAttribute: () => 'hero_role' };
  const document = {
    title,
    querySelector: selector => selector === '[data-cms="hero_role"]' ? role : selector === '[data-cms="hero_description"]' ? hero : elements[selector],
    querySelectorAll: selector => selector === '[data-cms]' ? [hero, role] : [],
    getElementById: id => id === 'zyberlane-structured-data' ? block : null
  };
  const sandbox = { document, STAT_KEYS: [] };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return { elements, block, hero, role, document, apply: sandbox.applySiteSettings };
}
function verify(h, expectedTitle, expectedDescription){
  assert.equal(h.document.title, expectedTitle);
  for (const selector of selectors) assert.equal(h.elements[selector].content, selector.includes('title') ? expectedTitle : expectedDescription);
  const graph = JSON.parse(h.block.textContent)['@graph'];
  const page = graph.find(node => node['@id'] === 'https://zyberlane.com/#webpage');
  const organization = graph.find(node => node['@id'] === 'https://zyberlane.com/#organization');
  assert.equal(page.name, expectedTitle); assert.equal(page.description, expectedDescription);
  assert.equal(organization.description, expectedDescription);
  // Identity, links, founder, publisher, profiles and logo must never change.
  for (let i = 0; i < graph.length; i++) {
    const copy = { ...graph[i] }, original = { ...initialGraph['@graph'][i] };
    if (copy['@id'] === page['@id']) { delete copy.name; delete original.name; }
    if ([page['@id'], organization['@id']].includes(copy['@id'])) { delete copy.description; delete original.description; }
    assert.deepEqual(copy, original);
  }
}
for (const [oldTitle, oldDescription] of [
  ['Zyberlane | Software, Web, AI & Automation | Sri Lanka', 'Zyberlane builds software, websites, AI systems and automation with a practical project scope. Based in Sri Lanka, working remotely with businesses and creators.'],
  ['Zyberlane — Software Company & AI Vibe Coding | Sri Lanka', 'Zyberlane builds websites and software with AI vibe coding and prompt engineering. Based in Sri Lanka, open for new client projects.']
]) {
  const h = harness();
  h.apply([{ key: 'seo_title', value: oldTitle }, { key: 'seo_description', value: oldDescription }]);
  verify(h, title, description);
}
const custom = harness();
const customTitle = 'Custom public page title';
const customDescription = 'An intentionally edited public description.';
custom.apply([{ key: 'seo_title', value: customTitle }, { key: 'seo_description', value: customDescription }, { key: 'hero_description', value: 'An intentional hero edit.' }]);
verify(custom, customTitle, customDescription); assert.equal(custom.hero.textContent, 'An intentional hero edit.');
const malicious = harness();
const payload = '</script><img src=x onerror=alert(1)>';
malicious.apply([{ key: 'seo_description', value: payload }]);
verify(malicious, title, payload); assert.ok(!malicious.block.textContent.includes('</script>'));
const missing = harness(); missing.apply([]); verify(missing, title, description);
const blank = harness(); blank.apply([{ key: 'seo_title', value: ' ' }, { key: 'seo_description', value: '' }]); verify(blank, title, description);
console.log('PASS: two legacy CMS defaults retain reviewed metadata; intentional SEO/hero edits work; rendered title/description/social/graph stay aligned; all entity identities unchanged; script-breakout text escaped; missing/blank settings preserve source defaults.');

// Previously shipped hero defaults upgrade; custom client-facing copy remains editable.
for (const oldRole of ['Software Company & AI Vibe Coding', 'Software · Web · AI · Automation']) {
  const h = harness(); h.apply([{ key: 'hero_role', value: oldRole }]);
  assert.equal(h.role.textContent, 'Source role text');
}
for (const oldHero of [
  'We design and build software and websites by pairing human direction with AI vibe coding — turning ideas into working products fast, without cutting corners on craft.',
  'We build websites, software and AI automation for businesses and creators,\n        remotely from Sri Lanka with direct founder communication.'
]) {
  const h = harness(); h.apply([{ key: 'hero_description', value: oldHero }]);
  assert.equal(h.hero.textContent, 'Source hero text');
}
const editedRole = harness(); editedRole.apply([{ key: 'hero_role', value: 'A custom role line' }]);
assert.equal(editedRole.role.textContent, 'A custom role line');
console.log('PASS: previous hero defaults upgrade across whitespace; custom role and description edits retain precedence.');
