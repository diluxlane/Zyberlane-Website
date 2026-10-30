'use strict';

// Static delivery guard: no browser timings or Core Web Vitals claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { build } = require('../scripts/build.cjs');

const root = path.resolve(__dirname, '..');
const { output } = build(root);
const home = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.equal(home, src, 'the build must copy homepage HTML verbatim');
// The previous 1,914,434-byte homepage repeated four base64 images. Allow
// modest headroom above the 89,923-byte baseline after exact-byte extraction.
assert.ok(Buffer.byteLength(home) <= 100_000, 'homepage HTML exceeded the measured baseline budget');
assert.doesNotMatch(home, /data:image\/(?:png|jpe?g);base64,/i, 'large images must not be embedded in HTML');

const expected = new Map([
  ['/assets/zyberlane-logo.png', 'c56f03457a856564eac62bbc9063a51d6dd2c213f7d542102ae12ac10b997321'],
  ['/assets/dilux-lane-portfolio.jpg', '441d81dd3b8df3a3214b4e400b4cc6fdd76f522a6e7141a7b8026bdd13e99550']
]);
for (const [url, digest] of expected) {
  const file = path.join(output, url.slice(1));
  assert.ok(fs.existsSync(file), `${url} must be present in production output`);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), digest,
    `${url} must retain the original visual image bytes`);
}
assert.equal((home.match(/src="\/assets\/zyberlane-logo\.png"/g) || []).length, 3);
assert.equal((home.match(/src="\/assets\/dilux-lane-portfolio\.jpg"/g) || []).length, 1);
assert.match(home, /id="heroLogo"/);
assert.match(home, /id="loadingScreen"/);
assert.match(home, /id="fluid" data-fluid-home/);
assert.match(home, /fonts\.googleapis\.com\/css2\?family=Anton&family=Poppins/);

console.log('Performance delivery budget passed: homepage HTML, identical image bytes, and critical effects.');
