'use strict';

// Source-controlled JSON-LD generation. Never derive identity from a request host or environment.
const fs = require('node:fs');
const path = require('node:path');
const ORIGIN = 'https://zyberlane.com';
const IDS = Object.freeze({ organization: ORIGIN + '/#organization', website: ORIGIN + '/#website', founder: ORIGIN + '/#founder', logo: ORIGIN + '/#logo' });
const PROFILES = Object.freeze(['https://github.com/Zyberlane', 'https://maps.app.goo.gl/43SbLYGa6dmvyjkN6']);
// Persistent service identities; keep the value if a displayed heading is renamed.
const SERVICE_IDS = Object.freeze({
  'Web Development': 'web-development',
  'Software Development': 'software-development',
  'Mobile App Development': 'mobile-app-development',
  'AI Agents & AI Automation': 'ai-agents-automation',
  'Business Automation & Integrations': 'business-automation-integrations',
  'SEO & Web Optimization': 'seo-web-optimization'
});
// A small set of independent buyer intents; retain the original entity IDs.
// Services without a detail page stay on the overview, never on a guessed URL.
const SERVICE_PAGES = Object.freeze({
  'web-development': '/services/web-development/',
  'software-development': '/services/web-app-development/',
  'ai-agents-automation': '/services/ai-automation/',
  'business-automation-integrations': '/services/ai-automation/'
});
const MANAGED = /<script\b(?=[^>]*\bid="zyberlane-structured-data")(?=[^>]*\btype="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/g;
const EXCLUDED = new Set(['assets', 'dist', 'docs', 'security', 'tests', 'scripts', 'node_modules']);
const ref = id => ({ '@id': id });

function decode(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, code) =>
    code.startsWith('#') ? String.fromCodePoint(parseInt(code.slice(code[1].toLowerCase() === 'x' ? 2 : 1), code[1].toLowerCase() === 'x' ? 16 : 10)) : named[code.toLowerCase()]);
}
function text(html) { return decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function attributes(tag) { return Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g), match => [match[1].toLowerCase(), decode(match[2] ?? match[3])])); }
function tags(html, name) { return Array.from(html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi')), match => attributes(match[0])); }
function metadata(file, html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) throw new Error(file + ': missing head');
  const canonical = tags(head, 'link').filter(link => link.rel === 'canonical');
  const description = tags(head, 'meta').filter(meta => meta.name === 'description');
  const title = Array.from(head.matchAll(/<title>([\s\S]*?)<\/title>/gi), match => text(match[1]));
  if (canonical.length !== 1 || description.length !== 1 || title.length !== 1) throw new Error(file + ': ambiguous metadata');
  const url = new URL(canonical[0].href);
  if (url.origin !== ORIGIN || url.search || url.hash) throw new Error(file + ': non-production canonical');
  const current = Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi))
    .filter(match => attributes(match[1])['aria-current'] === 'page').map(match => text(match[2]));
  const names = [...new Set(current)];
  if (url.pathname !== '/' && names.length !== 1) throw new Error(file + ': expected an unambiguous current navigation label');
  return { file, html, url: url.href, name: title[0], description: description[0].content, label: names[0] || 'Home' };
}

function graphs(root, sources) {
  const pages = sources.filter(source => source.html.includes('id="zyberlane-structured-data"')).map(source => metadata(source.file, source.html));
  if (!pages.length) return []; // Plain verification files/build fixtures are not entity pages.
  const home = pages.find(page => page.url === ORIGIN + '/');
  const about = pages.find(page => page.url === ORIGIN + '/about/');
  const services = pages.find(page => page.url === ORIGIN + '/services/');
  if (!home || !about || !services) throw new Error('Entity architecture requires the existing Home, About and Services pages');
  const founderCard = about.html.match(/<div class="founder-card"[^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
  if (!founderCard.includes('<h3>Dilukshan (Dilux)</h3>') || !founderCard.includes('Founder of Zyberlane')) throw new Error('Founder facts must match the public About section');
  const anchors = tags(home.html, 'a');
  for (const profile of PROFILES) if (!anchors.some(anchor => anchor.href === profile)) throw new Error('Official profile no longer linked by the website: ' + profile);
  const emailLink = anchors.find(anchor => anchor.id === 'contactEmailLink');
  if (!/^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+$/.test(emailLink?.href || '')) throw new Error('Missing public business email');
  const email = emailLink.href.slice(7);
  const logo = '/assets/favicon.png'; // Existing official mark has a dark background for white-background legibility.
  const logoFile = path.join(root, logo.slice(1));
  if (!fs.existsSync(logoFile)) throw new Error('Missing existing official logo');
  const cards = Array.from(services.html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi))
    .filter(match => (attributes(match[1]).class || '').split(/\s+/).includes('skill-card'));
  const serviceNodes = cards.map(match => {
    const name = text(match[2].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '');
    const description = text(match[2].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    if (!SERVICE_IDS[name] || !description) throw new Error('Assign a verified, persistent identity to the visible service: ' + name);
    const destination = ORIGIN + (SERVICE_PAGES[SERVICE_IDS[name]] || '/services/');
    if (!pages.some(page => page.url === destination)) throw new Error('Missing canonical service destination: ' + destination);
    return { '@type': 'Service', '@id': ORIGIN + '/#service-' + SERVICE_IDS[name], name, description,
      url: destination, provider: ref(IDS.organization), mainEntityOfPage: ref(destination + '#webpage') };
  });
  if (!serviceNodes.length || new Set(serviceNodes.map(node => node['@id'])).size !== serviceNodes.length) throw new Error('Missing/duplicate service identities');

  return pages.map(page => {
    const type = page === about ? 'AboutPage' : page === services ? 'CollectionPage' : 'WebPage';
    const node = { '@type': type, '@id': page.url + '#webpage', url: page.url, name: page.name, description: page.description,
      isPartOf: ref(IDS.website), about: ref(IDS.organization) };
    const graph = [node];
    if (page === home) {
      graph.unshift(
        { '@type': 'Organization', '@id': IDS.organization, name: 'Zyberlane', url: home.url,
          description: home.description, logo: ref(IDS.logo), founder: ref(IDS.founder), sameAs: [...PROFILES], email,
          contactPoint: { '@type': 'ContactPoint', contactType: 'project inquiries', email, url: home.url + '#contact' } },
        { '@type': 'WebSite', '@id': IDS.website, name: 'Zyberlane', url: home.url, publisher: ref(IDS.organization) },
        { '@type': 'ImageObject', '@id': IDS.logo, contentUrl: ORIGIN + logo }
      );
    } else {
      node.breadcrumb = ref(page.url + '#breadcrumb');
      const trail = [{ name: 'Home', item: home.url }];
      if (page !== services && new URL(page.url).pathname.startsWith('/services/')) trail.push({ name: services.label, item: services.url });
      trail.push({ name: page.label, item: page.url });
      graph.push({ '@type': 'BreadcrumbList', '@id': page.url + '#breadcrumb', itemListElement:
        trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) });
    }
    if (page === about) {
      node.mainEntity = ref(IDS.organization);
      node.mentions = ref(IDS.founder);
      graph.push({ '@type': 'Person', '@id': IDS.founder, name: 'Dilux', alternateName: 'Dilukshan', url: about.url, affiliation: ref(IDS.organization) });
    }
    if (page === services) {
      node.mainEntity = serviceNodes.map(service => ref(service['@id']));
      graph.push(...serviceNodes);
    } else {
      const primaryServices = serviceNodes.filter(service => service.url === page.url);
      if (primaryServices.length) node.mainEntity = primaryServices.map(service => ref(service['@id']));
    }
    if (page.url === ORIGIN + '/work/divine-tattoo/') {
      const projectId = page.url + '#project';
      node.mainEntity = ref(projectId);
      node.mentions = ref(ORIGIN + '/#service-web-development');
      graph.push({ '@type': 'CreativeWork', '@id': projectId, name: 'Divine Tattoo client website',
        description: 'Responsive studio website with an artwork gallery and a custom content-management workflow.',
        url: page.url, creator: ref(IDS.organization), mainEntityOfPage: ref(page.url + '#webpage') });
    }
    return { ...page, graph: { '@context': 'https://schema.org', '@graph': graph } };
  });
}

function serialize(value) { return JSON.stringify(value, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function prepare(root, sources) {
  return graphs(root, sources).map(page => {
    const matches = page.html.match(MANAGED) || [];
    if (matches.length !== 1 || (page.html.match(/type="application\/ld\+json"/g) || []).length !== 1) throw new Error(page.file + ': expected exactly one managed JSON-LD block');
    const block = '<script type="application/ld+json" id="zyberlane-structured-data">\n' + serialize(page.graph) + '\n</script>';
    return { ...page, updated: page.html.replace(MANAGED, () => block) };
  });
}
function checkStructuredData(root, sources) {
  for (const page of prepare(root, sources)) if (page.updated !== page.html) throw new Error(page.file + ': stale structured data; run node scripts/structured-data.cjs --write');
}
function findSources(root) {
  const sources = [];
  function visit(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink() || EXCLUDED.has(entry.name)) continue;
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visit(path.join(directory, entry.name), file);
      else if (file.endsWith('.html')) sources.push({ file, html: fs.readFileSync(path.join(root, file), 'utf8') });
    }
  }
  visit(root); return sources;
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const pages = prepare(root, findSources(root));
  if (process.argv.includes('--write')) {
    for (const page of pages) fs.writeFileSync(path.join(root, page.file), page.updated);
    console.log('Generated connected JSON-LD for ' + pages.length + ' public pages; visible HTML and metadata retained.');
  } else {
    checkStructuredData(root, findSources(root));
    console.log('PASS: source JSON-LD matches public metadata, founder facts, linked profiles and visible service content.');
  }
}
module.exports = { ORIGIN, IDS, PROFILES, SERVICE_IDS, SERVICE_PAGES, prepare, checkStructuredData, findSources, serialize };
