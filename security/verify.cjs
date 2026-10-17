// Dependency-free source/security checks. Run: node security/verify.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pages = ['index.html', 'admin/index.html', 'about/index.html', 'services/index.html', 'privacy-policy/index.html', 'terms/index.html'];
const headers = read('_headers');
const csp = headers.split('\n').find(x => x.startsWith('  Content-Security-Policy: ')).slice(27);
const vercel = JSON.parse(read('vercel.json'));
assert.equal(vercel.headers[0].headers.find(h => h.key === 'Content-Security-Policy').value, csp);
let parsed = 0;
for (const p of pages) {
  for (const m of read(p).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/src=/.test(m[1])) continue;
    if (/application\/ld\+json/.test(m[1])) { JSON.parse(m[2]); continue; }
    new vm.Script(m[2], {filename:p}); parsed++;
    const hash = crypto.createHash('sha256').update(m[2]).digest('base64');
    assert.ok(csp.includes("'sha256-" + hash + "'"), p + ' CSP hash missing');
  }
}
new vm.Script(read('assets/site-pages.js'));
assert.ok(!csp.split(';').find(x => x.trim().startsWith('script-src')).includes('unsafe-'));
const home = read('index.html');
const encoding = home.slice(home.indexOf('  function escapeHtml('), home.indexOf('  // ---------- site_settings:'));
const renderer = home.slice(home.indexOf('  function renderPackages('), home.indexOf('  // ---------- testimonials'));
const cards = [];
const element = () => ({style:{}, textContent:'', innerHTML:'', querySelector:()=>({textContent:''})});
const grid = {innerHTML:'', appendChild:c=>cards.push(c)};
const sandbox = {document:{getElementById:id=>id==='packagesGrid'?grid:element(),createElement:element}};
vm.createContext(sandbox);
vm.runInContext(encoding + renderer, sandbox);
for (const payload of ['<img src=x onerror=alert(1)>', '</div><svg onload=alert(1)>', '"\'&<>']) {
  sandbox.renderPackages([{name:'Test',price:5000,currency:payload,billing_period:payload,features:[]}]);
  const html = cards.pop().innerHTML;
  assert.ok(!html.includes(payload), 'CMS value was inserted without encoding');
  assert.ok(!/<img|<svg|onerror=alert\(1\)>/.test(html), 'Executable CMS markup remains');
}
sandbox.renderPackages([{name:'Test',price:5000,currency:'LKR',billing_period:'project',features:[]}]);
assert.ok(cards.pop().innerHTML.includes('LKR 5,000<span> / project</span>'));
assert.ok(!home.includes("sb.from('projects').select('*')"));
assert.ok(!home.includes("'Something went wrong: ' + err.message"));
assert.ok(read('admin/index.html').includes("esc(p.currency||'USD') + ' ' + Number(p.agreed_price)"));
for(const p of ['index.html','admin/index.html'])assert.match(read(p),/@supabase\/supabase-js@2\.118\.0\/dist\/umd\/supabase.min.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/);
console.log('PASS: '+parsed+' inline scripts + shared JS parse; JSON-LD parses; CSP hashes/hosting parity; 3 XSS payloads encoded; normal package rendering; SDK pin/SRI attributes; query minimization and generic booking error.');
console.log('Not browser, database, advisory, visual screenshot or authenticated integration tests.');
