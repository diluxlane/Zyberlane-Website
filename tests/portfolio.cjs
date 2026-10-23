// Browser integration check. Requires Playwright + Chromium; no production dependency.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'assets/portfolio.js'),'utf8');
const csp=fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n').find(l=>l.startsWith('  Content-Security-Policy: ')).slice(27);
const keys=['client-projects','concept-projects','design-studies'];
const titles=['Client Projects','Concept Projects','Design Studies'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const fixture=`(function(){
 var work=document.getElementById('work'),template=work.querySelector('.project-card[data-slug]').cloneNode(true);
 work.querySelectorAll('.project-card[data-slug]').forEach(function(card){card.remove();});
 var track=work.querySelector('.work-track'),end=track.querySelector('.work-end');
 ['client-projects','concept-projects','design-studies'].forEach(function(key,index){
  for(var i=0;i<[13,10,9][index];i++){
   var card=template.cloneNode(true);card.dataset.slug=key+'-test-'+i;card.dataset.projectCategory=key;
   card.querySelector('h3').textContent='TEST FIXTURE '+i;
   card.querySelector('img').src='/assets/divine-tattoo-logo.jpg';track.insertBefore(card,end);
  }
 });
})();\n`;
let base;
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,base).pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
 try{
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream'};
  if(path.extname(file)==='.html')headers['Content-Security-Policy']=csp;
  res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();}
});
const modes=[
 {name:'desktop',width:1280,height:900},
 {name:'tablet',width:800,height:900,touch:true},
 {name:'mobile',width:390,height:844,touch:true},
 {name:'narrow-mobile',width:320,height:740,touch:true},
 {name:'short-mobile',width:390,height:540,touch:true},
 {name:'reduced-mobile',width:390,height:844,touch:true,reduced:true}
].filter(mode=>!process.env.PORTFOLIO_MODES||process.env.PORTFOLIO_MODES.split(',').includes(mode.name));
async function showPanel(page,key,last){
 await page.evaluate(({key,last})=>{
  const s=document.querySelector('[data-work-category="'+key+'"]'),v=s.querySelector('.work-viewport'),panels=s.querySelector('.work-track').children;
  const panel=panels[last?panels.length-1:0],offset=panel.offsetLeft-panels[0].offsetLeft;
  window.scrollTo({top:scrollY+s.getBoundingClientRect().top-90+(s.classList.contains('scroll-work')?offset:0),behavior:'instant'});
  if(!s.classList.contains('scroll-work'))v.scrollTo({left:offset,behavior:'instant'});
 },{key,last});
 await aligned(page,key,last);
}
async function aligned(page,key,last){
 await page.waitForFunction(({key,last})=>{
  const s=document.querySelector('[data-work-category="'+key+'"]'),panels=s.querySelector('.work-track').children;
  return Math.abs(panels[last?panels.length-1:0].getBoundingClientRect().left-s.querySelector('.work-viewport').getBoundingClientRect().left)<1;
 },{key,last});
}
async function close(page){
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('portfolioDialog').open);
}
async function counts(page){return page.locator('[data-portfolio-category] .portfolio-gallery').evaluateAll(grids=>grids.map(g=>g.children.length));}
async function snapshot(page){return page.locator('#work .project-card[data-slug]').evaluateAll(cards=>cards.map(card=>{
 const properties=['backgroundColor','border','borderRadius','padding','color','font','transition','boxShadow'];
 const style=e=>Object.fromEntries(properties.map(p=>[p,getComputedStyle(e)[p]]));
 return {slug:card.dataset.slug,html:card.innerHTML,style:style(card),body:style(card.querySelector('.body')),image:style(card.querySelector('img')),width:card.getBoundingClientRect().width,height:card.getBoundingClientRect().height};
}));}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PORTFOLIO_BROWSER?{executablePath:process.env.PORTFOLIO_BROWSER}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],report=[];
 try{
  for(const mode of modes){
   const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},hasTouch:!!mode.touch,isMobile:!!mode.touch,reducedMotion:mode.reduced?'reduce':'no-preference'});
   await context.addInitScript(()=>sessionStorage.setItem('zyberlaneLoaded','1'));
   let useFixture=false;
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['https://divinetattoo.netlify.app','https://diluxln.netlify.app'].includes(url.origin))return route.fulfill({status:200,contentType:'text/plain',body:'Destination verified by portfolio test'});
    if(url.origin!==base)return route.abort();
    if(url.pathname==='/assets/portfolio.js'&&useFixture)return route.fulfill({status:200,contentType:'text/javascript',body:fixture+script});
    return route.continue();
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);
   page.on('pageerror',e=>errors.push(mode.name+': '+e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(r.url()+': '+r.status());});
   await page.goto(base,{waitUntil:'load'});
   assert.deepEqual(await page.locator('[data-work-category]').evaluateAll(els=>els.map(e=>e.dataset.workCategory)),keys);
   assert.deepEqual(await page.locator('#work .project-card[data-slug]').evaluateAll(els=>els.map(e=>[e.dataset.slug,e.dataset.projectCategory])),[['divine-tattoo','client-projects'],['dilux-lane','design-studies']]);
   assert.equal(await page.locator('.project-card .project-card').count(),0);
   assert.equal(await page.evaluate(()=>{const ids=Array.from(document.querySelectorAll('[id]'),e=>e.id);return ids.length-new Set(ids).size;}),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const originalCards=await snapshot(page);
   for(let i=0;i<keys.length;i++){
    const rail=page.locator('[data-work-category="'+keys[i]+'"]');
    await showPanel(page,keys[i],false);
    if(i!==1){
     await rail.locator('[data-work-next]').click();await aligned(page,keys[i],true);
     await rail.locator('[data-work-previous]').click();await aligned(page,keys[i],false);
     await rail.locator('.work-viewport').focus();await page.keyboard.press('ArrowRight');await aligned(page,keys[i],true);
    }else{
     assert.equal(await rail.locator('[data-work-next]').isDisabled(),true);
     assert.equal(await rail.locator('[data-work-previous]').isDisabled(),true);
    }
    if(process.env.PORTFOLIO_SCREENSHOTS&&i===0){
     fs.mkdirSync(process.env.PORTFOLIO_SCREENSHOTS,{recursive:true});
     await page.screenshot({path:path.join(process.env.PORTFOLIO_SCREENSHOTS,mode.name+'-rail.png')});
    }
    await rail.locator('[data-portfolio-filter]').click();await page.waitForFunction(()=>document.getElementById('portfolioDialog').open);
    assert.equal(await page.locator('#portfolioTitle').textContent(),titles[i]);
    assert.deepEqual(await page.locator('[data-portfolio-category]').evaluateAll(els=>els.map(e=>e.dataset.portfolioCategory)),[keys[i]]);
    assert.equal(await page.locator('#portfolioGallery .project-card').count(),i===1?0:1);
    assert.equal(await page.locator('#portfolioGallery .work-all:visible').count(),0);
    if(i!==1){
     const expected=i===0?'https://divinetattoo.netlify.app/':'https://diluxln.netlify.app/';
     const link=page.locator('#portfolioGallery .project-card .visit-btn');assert.equal(await link.getAttribute('href'),expected);
     const [popup]=await Promise.all([page.waitForEvent('popup'),link.click()]);await popup.waitForLoadState();assert.equal(popup.url(),expected);await popup.close();
    }
    await close(page);assert.equal(await page.evaluate(()=>document.activeElement.dataset.portfolioFilter),keys[i]);
   }
   await page.locator('#openPortfolio').click();await page.waitForFunction(()=>document.getElementById('portfolioDialog').open);
   assert.deepEqual(await page.locator('[data-portfolio-category]').evaluateAll(els=>els.map(e=>e.dataset.portfolioCategory)),keys);
   assert.deepEqual(await counts(page),[1,0,1]);
   if(process.env.PORTFOLIO_SCREENSHOTS){
    await page.waitForFunction(()=>document.getElementById('portfolioDialog').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
    await page.screenshot({path:path.join(process.env.PORTFOLIO_SCREENSHOTS,mode.name+'-all-work.png')});
   }
   await page.locator('#closePortfolio').click();await page.waitForFunction(()=>!document.getElementById('portfolioDialog').open);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'openPortfolio');
   await page.mouse.move(0,0);await page.waitForTimeout(350);
   assert.deepEqual(await snapshot(page),originalCards,'catalog cards stay unchanged after filtering and dialog cycles');
   if(!mode.reduced){
    await page.waitForFunction(()=>document.getElementById('fluid').dataset.state==='running');
    if(mode.touch){
     const session=await context.newCDPSession(page),before=await page.evaluate(()=>scrollY);
     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:360}]});
     for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:360-i*14}]});
     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await page.waitForFunction(before=>scrollY>before,before);
    }else{await page.mouse.move(40,250);await page.mouse.move(250,300,{steps:8});}
    await page.waitForFunction(()=>Number(document.getElementById('fluid').dataset.fluidMoves)>0);
   }
   // A larger catalog exists only in this intercepted test script response.
   useFixture=true;await page.reload({waitUntil:'load'});
   await page.locator('#openPortfolio').click();await page.waitForFunction(()=>document.getElementById('portfolioDialog').open);
   const initial=await counts(page),batch=mode.width<=560?3:mode.width<=860?4:6;
   assert.deepEqual(initial,[batch,batch,batch]);
   for(let i=0;i<keys.length;i++){
    const group=page.locator('[data-portfolio-category="'+keys[i]+'"]');
    await group.locator('h3').first().scrollIntoViewIfNeeded();
    assert.equal(await group.locator('h3').first().isVisible(),true,'every category is reachable before expanding earlier groups');
    const total=[13,10,9][i];let previous=initial[i];
    while(previous<total){
     const more=group.locator('.work-all');await more.scrollIntoViewIfNeeded();await page.waitForTimeout(50);
     const before=await page.locator('#portfolioDialog').evaluate(e=>e.scrollTop),otherCounts=await counts(page),windowTop=await page.evaluate(()=>scrollY);
     await more.click();
     const next=Math.min(previous+batch,total);assert.equal(await group.locator('.project-card').count(),next);
     const actual=await counts(page);assert.deepEqual(actual.map((n,j)=>j===i?null:n),otherCounts.map((n,j)=>j===i?null:n));
     assert.ok(Math.abs(await page.locator('#portfolioDialog').evaluate(e=>e.scrollTop)-before)<1,'View More preserves dialog scroll');
     assert.equal(await page.evaluate(()=>scrollY),windowTop,'View More preserves page scroll');
     previous=next;
    }
    assert.equal(await group.locator('.work-all').isVisible(),false);
    assert.equal(await group.locator('.project-card').evaluateAll(cards=>new Set(cards.map(c=>c.dataset.slug)).size),total);
   }
   await page.waitForFunction(()=>document.querySelector('#portfolioGallery').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
   assert.ok(await page.locator('#portfolioDialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog has no horizontal overflow');
   await close(page);
   // Category-specific views apply the same independent progressive disclosure.
   await showPanel(page,'concept-projects',true);await page.locator('[data-portfolio-filter="concept-projects"]').click();
   assert.deepEqual(await counts(page),[batch]);
   await page.locator('#portfolioGallery .work-all').click();assert.deepEqual(await counts(page),[Math.min(batch*2,10)]);
   await page.setViewportSize({width:1280,height:900});
   await page.waitForTimeout(200);assert.ok((await counts(page))[0]>=Math.min(batch*2,10),'resize retains revealed cards');
   await close(page);
   // Opening while a rail is still moving must settle the background immediately.
   await page.evaluate(()=>window.scrollTo({top:scrollY+300,behavior:'smooth'}));
   await page.waitForTimeout(70);
   const settled=await page.evaluate(()=>{document.getElementById('openPortfolio').click();return scrollY;});
   await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>scrollY),settled,'dialog cancels pending background smooth scroll');
   await close(page);
   report.push({mode:mode.name,batch,realCatalog:true,allAndCategoryViews:true,progressiveDisclosure:true,scrollAndFocus:true,layout:true});
   console.log('PASS '+mode.name+': real catalog, category rails, filtering, links, independent batches, scroll/focus, resize and dialog lifecycle.');
   await context.close();
  }
  assert.deepEqual(errors,[]);
  if(process.env.PORTFOLIO_SCREENSHOTS)fs.writeFileSync(path.join(process.env.PORTFOLIO_SCREENSHOTS,'verification.json'),JSON.stringify({report,errors},null,2)+'\n');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
