'use strict';

// Like portfolio.cjs, this uses a development-only Playwright installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../dist');
const csp = fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n').find(line => line.startsWith('  Content-Security-Policy: ')).slice(27);
const routes = Array.from(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g), match => new URL(match[1]).pathname);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': csp });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PORTFOLIO_BROWSER ? { executablePath: process.env.PORTFOLIO_BROWSER } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  let pages = 0;
  try {
    for (const mobile of [false, true]) {
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({ javaScriptEnabled, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
        // Keep the test focused on first-party rendering; CMS fallback is intentional.
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ': ' + response.url()); });
        for (const route of routes) {
          assert.equal((await page.goto(base + route, { waitUntil: 'load' })).status(), 200);
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://zyberlane.com' + route);
          assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
          if (route === '/') await page.waitForFunction(() => {
            const loader = document.getElementById('loadingScreen');
            return !loader || getComputedStyle(loader).display === 'none';
          });
          assert.ok(await page.locator('h1').isVisible());
          assert.equal(await page.locator('h1').count(), 1);
          await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).opacity === '1');
          assert.equal(await page.locator('h1').evaluate(element => getComputedStyle(element).opacity), '1');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ': horizontal overflow');
          if (mobile && javaScriptEnabled) {
            await page.locator('#navToggle').click();
            assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'true');
            assert.ok(await page.locator('#mainNav a[href="/about/"]').isVisible());
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'false');
          } else {
            assert.ok(await page.locator('#mainNav a[href="/about/"]').isVisible());
          }
          if (route === '/') {
            assert.equal(await page.locator('#work .project-card[data-slug]').count(), 2);
            assert.equal(await page.locator('#faq .faq-answer').count(), 12);
            assert.equal(await page.locator('#contactEmailLink').getAttribute('href'), 'mailto:contact@zyberlane.com');
            if (javaScriptEnabled) {
              await page.locator('#faq-services').scrollIntoViewIfNeeded();
              await page.locator('#faq-services').click();
              assert.equal(await page.locator('#faq-services').getAttribute('aria-expanded'), 'true');
            } else {
              assert.ok(await page.locator('#faq-answer-services').isVisible());
              assert.ok(await page.locator('#whyZyberlaneGrid').innerText());
            }
          } else if (!javaScriptEnabled && route !== '/work/') {
            const opacity = await page.locator('[data-page-reveal]').first().evaluate(element => getComputedStyle(element).opacity);
            assert.equal(opacity, '1', route + ': no-script content hidden');
          }
          if (route.startsWith('/services/') && route !== '/services/') {
            assert.equal(await page.locator('nav[aria-label="Breadcrumb"] a').count(), 3);
            await page.locator('a.cta-btn[href="/#booking"]').click();
            assert.equal(new URL(page.url()).origin, base, 'Preview navigation left its own host');
            assert.equal(new URL(page.url()).hash, '#booking');
            await page.waitForFunction(() => {
              const loader = document.getElementById('loadingScreen');
              return !loader || getComputedStyle(loader).display === 'none';
            });
            assert.ok(await page.locator('#booking').isVisible(), 'Service CTA did not reach the project request');
          }
          pages++;
        }
        await context.close();
        console.log('PASS: ' + (mobile ? '390px mobile' : '1440px desktop') + ', JavaScript ' + (javaScriptEnabled ? 'enabled' : 'disabled') + ': all ' + routes.length + ' pages, navigation, metadata and static content.');
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: ' + pages + ' rendered-page checks; no first-party page errors or broken assets. External CMS/fonts were excluded; verify them separately in production.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
