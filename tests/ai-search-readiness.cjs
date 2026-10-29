'use strict';

// Repository-level retrieval checks; this does not prove access from verified crawler IPs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../scripts/build.cjs');

const root = path.resolve(__dirname, '..');
const { output, pages } = build(root);
const origin = 'https://zyberlane.com';
const read = (file, base = root) => fs.readFileSync(path.join(base, file), 'utf8');

function robotsAllows(text, userAgent, pathname) {
  const groups = [];
  let group = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (key === 'user-agent') {
      if (!group || group.hasRules) { group = { agents: [], rules: [], hasRules: false }; groups.push(group); }
      group.agents.push(match[2].toLowerCase());
    } else if (['allow', 'disallow'].includes(key) && group) {
      group.rules.push({ allow: key === 'allow', path: match[2] });
      group.hasRules = true;
    }
  }
  const matching = groups.filter(candidate => candidate.agents.some(agent => agent === '*' || userAgent.toLowerCase().includes(agent)));
  const specificity = Math.max(0, ...matching.flatMap(candidate => candidate.agents.filter(agent => agent !== '*').map(agent => agent.length)));
  const chosen = matching.filter(candidate => candidate.agents.some(agent => agent === '*' || agent.length === specificity));
  const rules = chosen.flatMap(candidate => candidate.rules).filter(rule => rule.path && pathname.startsWith(rule.path));
  if (!rules.length) return true;
  const mostSpecific = Math.max(...rules.map(rule => rule.path.length));
  return rules.filter(rule => rule.path.length === mostSpecific).some(rule => rule.allow);
}

const robots = read('robots.txt');
for (const agent of ['Googlebot', 'Bingbot', 'OAI-SearchBot']) {
  assert.ok(robotsAllows(robots, agent, '/'), agent + ' must be permitted on public paths');
  assert.ok(!robotsAllows(robots, agent, '/admin/'), agent + ' must remain excluded from /admin/');
}
assert.match(robots, /Sitemap:\s*https:\/\/zyberlane\.com\/sitemap\.xml/i);
assert.ok(robotsAllows(robots, 'GPTBot', '/'), 'GPTBot policy remains inherited from the existing wildcard rule');

const sitemap = read('sitemap.xml', output);
const sitemapUrls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap URLs must be unique');
assert.deepEqual([...sitemapUrls].sort(), [...pages].sort(), 'sitemap must match discovered indexable HTML canonicals');
for (const url of sitemapUrls) {
  assert.equal(new URL(url).origin, origin, 'sitemap must contain production URLs only');
  assert.ok(!/vercel\.app|netlify\.app|localhost|127\.0\.0\.1|github\.com/i.test(url));
}
assert.ok(!sitemapUrls.some(url => /\/admin\//.test(url)));
assert.ok(!fs.existsSync(path.join(output, 'docs')) && !fs.existsSync(path.join(output, 'tests')), 'internal records and tests must not ship');

const htmlFiles = [];
function listHtml(dir, prefix = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, item.name);
    if (item.isDirectory()) listHtml(path.join(dir, item.name), relative);
    else if (item.isFile() && item.name.endsWith('.html')) htmlFiles.push(relative);
  }
}
listHtml(output);
for (const file of htmlFiles) {
  const html = read(file, output);
  const pagePath = '/' + file.replace(/(?:^|\/)index\.html$/, match => match.startsWith('/') ? '/' : '');
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if (!canonical) continue; // The private admin shell is not an indexable public page.
  assert.equal(canonical, origin + pagePath, file + ': canonical must match the production route');
  assert.match(html, /<title>[^<]+<\/title>/i, file + ': title must be present in initial HTML');
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, file + ': description must be present in initial HTML');
  assert.match(html, /<meta\s+property="og:url"\s+content="[^"]+"/i, file + ': Open Graph URL must be present');
  assert.match(html, /<main\b[\s\S]*?<h1\b[^>]*>[\s\S]*?\S[\s\S]*?<\/h1>/i, file + ': H1 and main content must be static HTML');
  assert.match(html, /<nav\b[^>]*id="mainNav"[\s\S]*?<a\b[^>]*href="\/(?:about|services)\//i, file + ': crawlable navigation links must be present');
  assert.match(html, /<script\s+type="application\/ld\+json"/i, file + ': JSON-LD must be present in initial HTML');
  const jsonLdBlocks = Array.from(html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi), match => JSON.parse(match[1]));
  assert.ok(jsonLdBlocks.length, file + ': structured data must parse as JSON');
  const identityUrls = [];
  const collectIdentityUrls = value => {
    if (Array.isArray(value)) return value.forEach(collectIdentityUrls);
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (['@id', 'url', 'contentUrl'].includes(key) && typeof child === 'string') identityUrls.push(child);
        else collectIdentityUrls(child);
      }
    }
  };
  jsonLdBlocks.forEach(collectIdentityUrls);
  for (const url of identityUrls) {
    assert.equal(new URL(url).origin, origin, file + ': structured-data identity URLs must use production origin');
    assert.ok(!/vercel\.app|netlify\.app|localhost|127\.0\.0\.1/i.test(url), file + ': preview/internal host must not enter structured-data identity');
  }
  assert.equal(html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1], canonical, file + ': Open Graph URL must match the canonical');
}

const admin = read('admin/index.html', output);
assert.match(admin, /<meta\s+name="robots"\s+content="noindex, nofollow"/i);
assert.match(read('_headers', output), /\/admin\/\*[\s\S]*?X-Robots-Tag:\s*noindex, nofollow/i);
console.log('PASS: public crawler rules; admin exclusion; production-only unique sitemap; static metadata, H1, navigation and JSON-LD; preview host isolation; internal source exclusion.');
console.log('LIMIT: repository checks and spoofable User-Agent probes cannot verify genuine crawler IP access through Cloudflare/CDN.');
