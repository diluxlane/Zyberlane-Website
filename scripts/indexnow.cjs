'use strict';

// Manual post-publication notification. Never called by the build or preview.
const fs = require('node:fs');
const path = require('node:path');
const ORIGIN = 'https://zyberlane.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const ROOT = path.resolve(__dirname, '..');

function configuration(root = ROOT) {
  const files = fs.readdirSync(root).filter(name => /^[a-f0-9]{32}\.txt$/.test(name));
  if (files.length !== 1) throw new Error('Expected exactly one root IndexNow key file');
  const key = files[0].slice(0, -4);
  if (fs.readFileSync(path.join(root, files[0]), 'utf8').trim() !== key) throw new Error('IndexNow key file content mismatch');
  return { key, keyLocation: ORIGIN + '/' + files[0] };
}

function canonicalSet(root = ROOT) {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  return new Set(Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]));
}

function validateUrls(values, { deleted = false, canonicals = canonicalSet() } = {}) {
  if (!values.length || values.length > 100) throw new Error('Provide 1–100 changed URLs with --url');
  const urls = [];
  for (const value of values) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Invalid URL: ' + value); }
    if (url.origin !== ORIGIN || url.href !== value || url.username || url.password || url.search || url.hash ||
        !url.pathname.endsWith('/') || /\/(?:admin|docs|scripts|tests|security|dist)(?:\/|$)/i.test(url.pathname) ||
        url.pathname.includes('//') || url.pathname.includes('/./') || url.pathname.includes('/../')) {
      throw new Error('Only clean canonical production URLs are accepted: ' + value);
    }
    if (deleted ? canonicals.has(value) : !canonicals.has(value)) {
      throw new Error(deleted ? 'Deleted URL still appears in the current sitemap: ' + value : 'URL is not in the current canonical sitemap: ' + value);
    }
    if (!urls.includes(value)) urls.push(value);
  }
  return urls;
}

function parseArgs(args) {
  const options = { urls: [], deleted: false, submit: false, release: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') {
      if (!args[i + 1]) throw new Error('Missing value after --url');
      options.urls.push(args[++i]);
    } else if (args[i] === '--deleted') options.deleted = true;
    else if (args[i] === '--submit') options.submit = true;
    else if (args[i] === '--production-release') options.release = true;
    else if (args[i] !== '--dry-run') throw new Error('Unknown argument: ' + args[i]);
  }
  if (options.submit && !options.release) throw new Error('--submit requires --production-release after production publication');
  return options;
}

async function submit(args, { root = ROOT, request = fetch, log = console.log, environment = process.env } = {}) {
  const options = parseArgs(args);
  const { key, keyLocation } = configuration(root);
  const urls = validateUrls(options.urls, { deleted: options.deleted, canonicals: canonicalSet(root) });
  const payload = { host: 'zyberlane.com', key, keyLocation, urlList: urls };
  if (!options.submit) { log('DRY RUN: no network request made\n' + JSON.stringify({ change: options.deleted ? 'deleted' : 'added/updated', ...payload }, null, 2)); return payload; }
  if (environment.VERCEL || environment.DEPLOY_PRIME_URL || environment.CONTEXT === 'deploy-preview') {
    throw new Error('IndexNow submission is disabled in preview environments');
  }
  const get = async url => request(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  const proof = await get(keyLocation);
  if (proof.status !== 200 || (await proof.text()).trim() !== key) throw new Error('Production IndexNow key file is not live with the expected content');
  for (const url of urls) {
    const response = await get(url);
    if (options.deleted ? ![404, 410].includes(response.status) : response.status !== 200) {
      throw new Error('Production URL has not reached the expected ' + (options.deleted ? '404/410' : '200') + ' state: ' + url + ' (' + response.status + ')');
    }
  }
  const response = await request(ENDPOINT, {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(12000)
  });
  if (![200, 202].includes(response.status)) throw new Error('IndexNow returned HTTP ' + response.status);
  log('IndexNow accepted ' + urls.length + ' production URL(s): HTTP ' + response.status + '. This does not guarantee indexing.');
  return payload;
}

if (require.main === module) submit(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { configuration, canonicalSet, validateUrls, parseArgs, submit };
