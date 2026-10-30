'use strict';
// Browser regression: selected-work rails plus the standalone portfolio/filter journey.
// Uses a development-only Playwright installation; no production dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist');
const csp=fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n').find(l=>l.startsWith('  Content-Security-Policy: ')).slice(27);
const keys=['client-projects','concept-projects','design-studies'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Security-Policy':csp});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PORTFOLIO_BROWSER?{executablePath:process.env.PORTFOLIO_BROWSER}:{}),args:['--no-sandbox']});
 const errors=[];
 try{
  for(const width of [320,390,768,1280,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'load'});
   assert.deepEqual(await page.locator('[data-work-category]').evaluateAll(es=>es.map(e=>e.dataset.workCategory)),keys);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('#portfolioDialog').count(),0);
   assert.equal(await page.locator('#openPortfolio').getAttribute('href'),'/work/');
   // The native reduced-motion rail retains arrow navigation.
   const rail=page.locator('[data-work-category="client-projects"]');
   await rail.locator('[data-work-next]').click();
   await page.waitForFunction(()=>document.getElementById('workViewport').scrollLeft>0);
   await rail.locator('[data-work-previous]').click();
   await page.waitForFunction(()=>document.getElementById('workViewport').scrollLeft===0);
   await page.locator('#openPortfolio').click();await page.waitForURL(base+'/work/');
   assert.equal(await page.locator('.project-card').count(),2);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const key of keys){
    await page.locator('[data-work-filter="'+key+'"]').click();
    assert.deepEqual(await page.locator('[data-portfolio-category]:visible').evaluateAll(es=>es.map(e=>e.dataset.portfolioCategory)),[key]);
    assert.equal(await page.locator('[data-work-filter="'+key+'"]').getAttribute('aria-pressed'),'true');
   }
   await page.goBack();assert.equal(await page.locator('[data-work-filter="concept-projects"]').getAttribute('aria-pressed'),'true');
   await page.goto(base+'/work/?category=invalid');
   assert.equal(await page.locator('[data-portfolio-category]:visible').count(),3);
   await context.close();
   console.log('PASS '+width+'px: rails, standalone navigation, category filters, history, unknown filter and overflow.');
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});const page=await nojs.newPage();
  await page.goto(base+'/work/?category=design-studies');assert.equal(await page.locator('.project-card').count(),2);assert.equal(await page.locator('[data-portfolio-category]:visible').count(),3);
  await nojs.close();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
