'use strict';

// Browser layout regression for the Phase 4 project page. Requires Playwright + Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const routes = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 800, height: 900, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'narrow-phone', width: 320, height: 740, touch: true }
];
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
let base;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, base).pathname;
  const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PORTFOLIO_BROWSER ? { executablePath: process.env.PORTFOLIO_BROWSER } : {}),
    args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const mode of routes) {
      const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height }, hasTouch: !!mode.touch, isMobile: !!mode.touch });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(mode.name + ': ' + error.message));
      await page.goto(base + '/work/divine-tattoo/', { waitUntil: 'load' });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).opacity === '1');
      assert.equal(await page.locator('h1').count(), 1);
      assert.ok(await page.locator('h1').isVisible());
      assert.equal(await page.locator('.case-brand-panel img').evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), mode.name + ': horizontal overflow');
      assert.ok(await page.locator('a[href="https://divinetattoo.netlify.app/"]').first().isVisible());
      assert.ok(await page.locator('a[href="/#booking"]').isVisible());
      if (mode.touch) {
        await page.locator('#navToggle').click();
        assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'true');
        assert.ok(await page.locator('#mainNav a[href="/services/"]').isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'false');
      }
      if (process.env.CLIENT_PROOF_SCREENSHOTS) {
        fs.mkdirSync(process.env.CLIENT_PROOF_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: path.join(process.env.CLIENT_PROOF_SCREENSHOTS, mode.name + '.png'), fullPage: true });
      }
      await context.close();
      console.log('PASS ' + mode.name + ' (' + mode.width + 'px): project page content, logo asset, links, navigation and overflow.');
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
