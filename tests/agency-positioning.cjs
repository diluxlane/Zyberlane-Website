'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {build}=require('../scripts/build.cjs');
const {checkStructuredData,findSources}=require('../scripts/structured-data.cjs');
const {pages}=build(root),home=read('index.html'),work=read('work/index.html'),overview=read('services/index.html'),cms=read('assets/site-content.js');
const keys=['client-projects','concept-projects','design-studies'];
assert.equal(pages.length,11);
assert.ok(pages.includes('https://zyberlane.com/work/'));
for(const route of ['blog','case-studies'])assert.ok(!pages.includes('https://zyberlane.com/'+route+'/'),'No empty public index');
const visible=home.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
assert.doesNotMatch(visible,/Software Company|Software · Web · AI · Automation|free (?:website|SEO) (?:audit|review)|guaranteed ROI/i);
assert.match(home,/<div class="role[^>]*>Give your business a stronger presence<\/div>/);
assert.equal((home.match(/data-agency-service/g)||[]).length,6);
const groups=require('../scripts/service-capabilities.cjs');
const names=['Web Design & Development','Branding & Creative','Digital Marketing','Social Media & Content','Search & AI Visibility','AI & Business Automation'];
assert.deepEqual(groups.map(group=>group.name),names);
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
assert.deepEqual([...home.matchAll(/<article class="skill-card"[^>]*data-agency-service>[\s\S]*?<h3>(.*?)<\/h3>/g)].map(m=>strip(m[1])),names);
assert.doesNotMatch(visible,/Subject to confirmation|specialist confirmation required|data-service-status/ig);
assert.doesNotMatch(overview,/Subject to confirmation|specialist confirmation required|data-service-status/ig);
const graph=JSON.parse(overview.match(/id="zyberlane-structured-data">([\s\S]*?)<\/script>/)[1])['@graph'];
const definitions=graph.filter(n=>n['@type']==='Service');
assert.deepEqual(definitions.map(n=>n.name),groups.filter(g=>g.services.length).map(g=>g.name));
assert.equal(groups.reduce((n,g)=>n+g.services.length,0),23,'Only the 23 evidenced sub-services are advertised');
const sources=findSources(root);
const extra=sources.map(s=>s.file==='services/index.html'?{...s,html:s.html.replace('<ul class="service-examples">','<ul class="service-examples"><li data-subservice="E-Commerce">E-Commerce</li>')}:s);
assert.throws(()=>checkStructuredData(root,extra),/Visible sub-services do not match verified scope/);
const renamed=sources.map(s=>s.file==='services/index.html'?{...s,html:s.html.replace('data-subservice="Business Websites"','data-subservice="Unverified Service"')}:s);
assert.throws(()=>checkStructuredData(root,renamed),/Visible sub-services do not match verified scope/);
for(const group of groups){
 const card=overview.match(new RegExp('<article class="skill-card" id="'+group.id+'"[^>]*>([\\s\\S]*?)<\\/article>'))[1];
 assert.deepEqual([...card.matchAll(/data-subservice="([^"]+)"/g)].map(m=>strip(m[1])),group.services.map(item=>item[0]));
 for(const [name] of group.services) assert.ok(card.includes('>'+name.replace(/&/g,'&amp;')+'</strong>')||card.includes('>'+name+'</a></strong>'),'Sub-service must have a visible label');
 for(const omitted of group.omitted)assert.ok(!card.includes('data-subservice="'+omitted+'"'),'Unverified scope must stay internal');
 if(!group.services.length)assert.ok(!definitions.some(n=>n.name===group.name),'Request area must not become a Service entity');
}
assert.ok(!fs.existsSync(path.join(root,'dist/scripts/service-capabilities.cjs')),'Internal readiness register must not ship');
assert.doesNotMatch(cms,/from\('services'\)|renderServices/,'Legacy CMS expertise must not overwrite curated agency scope');
assert.ok(!home.includes('data-cms="stat_projects_completed"')&&!home.includes('data-cms="stat_happy_clients"'),'Unverified dynamic statistics not presented');
const cards=s=>[...s.matchAll(/data-slug="([^"]+)" data-project-category="([^"]+)"/g)].map(m=>[m[1],m[2]]);
assert.deepEqual(cards(work),cards(home),'Standalone catalog must match selected-work classification');
assert.deepEqual(cards(work),[['divine-tattoo','client-projects'],['dilux-lane','design-studies']]);
for(const key of keys){
 assert.ok(work.includes('data-portfolio-category="'+key+'"'));
 assert.ok(home.includes('href="/work/?category='+key+'"'));
}
assert.match(home,/id="openPortfolio"[^>]*href="\/work\/"/);
assert.ok(!home.includes('id="portfolioDialog"'));
assert.equal((work.match(/href="\/work\/divine-tattoo\/"/g)||[]).length,1,'Only the actual client project gets a case-study action');
const script=read('assets/work.js');
function harness(initial){
 let location=new URL('https://zyberlane.com/work/'+initial),pop;
 const links=['all',...keys].map(key=>({dataset:{workFilter:key},href:'https://zyberlane.com/work/'+(key==='all'?'':'?category='+key),textContent:key,attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},click(){this.events.click({button:0,preventDefault(){}});}}));
 const groups=keys.map(key=>({dataset:{portfolioCategory:key},hidden:false})),status={};
 const window={get location(){return location;},addEventListener(k,fn){pop=fn;}};
 const history={pushState(a,b,url){location=new URL(url);}};
 vm.runInNewContext(script,{URL,window,history,document:{querySelectorAll:s=>s==='[data-work-filter]'?links:groups,getElementById:()=>status}});
 return {links,groups,status,back(url){location=new URL('https://zyberlane.com/work/'+url);pop();}};
}
for(const key of keys){const h=harness('?category='+key);assert.deepEqual(h.groups.filter(g=>!g.hidden).map(g=>g.dataset.portfolioCategory),[key]);assert.equal(h.links.find(l=>l.dataset.workFilter===key).attrs['aria-pressed'],'true');}
const h=harness('?category=unknown');assert.ok(h.groups.every(g=>!g.hidden));
h.links[1].click();assert.deepEqual(h.groups.filter(g=>!g.hidden).map(g=>g.dataset.portfolioCategory),['client-projects']);
h.links[3].events.keydown({key:' ',preventDefault(){}});assert.deepEqual(h.groups.filter(g=>!g.hidden).map(g=>g.dataset.portfolioCategory),['design-studies']);
h.back('');assert.ok(h.groups.every(g=>!g.hidden));
let intercepted=false;h.links[2].events.click({button:0,ctrlKey:true,preventDefault(){intercepted=true;}});assert.equal(intercepted,false,'Modified click retains native new-tab behavior');
console.log('PASS: agency identity, six buyer categories, three evidence-backed Service entities and 23 categorized sub-services, no placeholder indexes, legacy CMS isolation, honest portfolio parity, category navigation, filter state/keyboard/history and modified-click behavior.');
