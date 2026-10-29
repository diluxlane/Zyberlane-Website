'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../scripts/build.cjs');
const { configuration, canonicalSet, validateUrls, parseArgs, submit } = require('../scripts/indexnow.cjs');

const root = path.resolve(__dirname, '..');
const { output, pages } = build(root);
const { key, keyLocation } = configuration(root);
assert.match(key, /^[a-f0-9]{32}$/);
assert.equal(keyLocation, 'https://zyberlane.com/' + key + '.txt');
assert.equal(fs.readFileSync(path.join(output, key + '.txt'), 'utf8').trim(), key);
assert.deepEqual([...canonicalSet(root)].sort(), [...pages].sort());
const home = 'https://zyberlane.com/';
const service = 'https://zyberlane.com/services/web-development/';
assert.deepEqual(validateUrls([home, service, service]), [home, service]);
for (const url of [
  'https://preview.vercel.app/', 'https://zyberlane.netlify.app/', 'http://localhost/',
  'https://example.com/', 'http://zyberlane.com/', 'https://zyberlane.com/admin/',
  'https://zyberlane.com/docs/', 'https://zyberlane.com/services/unknown/',
  'https://zyberlane.com/services/web-development/?draft=1',
  'https://zyberlane.com/services/web-development/index.html'
]) assert.throws(() => validateUrls([url]), /Only clean canonical|not in the current canonical/);
assert.throws(() => validateUrls([home], { deleted: true }), /still appears/);
assert.deepEqual(validateUrls(['https://zyberlane.com/old/'], { deleted: true }), ['https://zyberlane.com/old/']);
assert.throws(() => parseArgs(['--submit', '--url', home]), /--production-release/);

(async () => {
  let calls = 0;
  let outputText = '';
  await submit(['--dry-run', '--url', home, '--url', home], {
    root, request: () => { calls++; throw new Error('Dry run attempted network'); },
    log: line => { outputText += line; }
  });
  assert.equal(calls, 0);
  assert.match(outputText, /DRY RUN: no network request made/);
  await assert.rejects(() => submit(['--submit', '--production-release', '--url', home], {
    root, environment: { VERCEL: '1' }, request: () => { throw new Error('Preview attempted network'); }, log: () => {}
  }), /disabled in preview/);
  const visited = [];
  const fake = async (url, options = {}) => {
    visited.push({ url, method: options.method || 'GET', body: options.body });
    if (url === keyLocation) return { status: 200, text: async () => key };
    if (url === service) return { status: 404 };
    return { status: 200 };
  };
  await assert.rejects(() => submit(['--submit', '--production-release', '--url', service], { root, request: fake, log: () => {} }), /expected 200/);
  assert.equal(visited.some(call => call.method === 'POST'), false, 'A 404 cannot notify IndexNow');
  const successCalls = [];
  const success = async (url, options = {}) => {
    successCalls.push({ url, method: options.method || 'GET', body: options.body });
    if (url === keyLocation) return { status: 200, text: async () => key };
    return { status: 200 };
  };
  await submit(['--submit', '--production-release', '--url', service, '--url', service], { root, request: success, log: () => {} });
  const post = successCalls.filter(call => call.method === 'POST');
  assert.equal(post.length, 1);
  assert.equal(post[0].url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(post[0].body), { host: 'zyberlane.com', key, keyLocation, urlList: [service] });
  const removed = 'https://zyberlane.com/old/';
  const deletionCalls = [];
  await submit(['--submit', '--production-release', '--deleted', '--url', removed], {
    root, log: () => {}, request: async (url, options = {}) => {
      deletionCalls.push({ url, method: options.method || 'GET' });
      if (url === keyLocation) return { status: 200, text: async () => key };
      return { status: url === removed ? 404 : 200 };
    }
  });
  assert.deepEqual(deletionCalls.map(call => call.method), ['GET', 'GET', 'POST']);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'scripts/build.cjs'), 'utf8'), /indexnow|api\.indexnow\.org/i);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'), /indexnow|api\.indexnow\.org/i);
  console.log('PASS: key/public build, canonical and deletion guards, deduplication, dry-run offline, 404 refusal, explicit production submission and preview/build isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
