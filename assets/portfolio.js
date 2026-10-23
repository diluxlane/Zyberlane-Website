/* One project catalog, category rails and the existing All Work dialog. */
(function(){
  'use strict';
  var work=document.getElementById('work');
  if(!work)return;
  var dialog=document.getElementById('portfolioDialog');
  var gallery=document.getElementById('portfolioGallery');
  var opener=document.getElementById('openPortfolio');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var catalog=Array.from(work.querySelectorAll('.project-card[data-slug]'));
  var rails=Array.from(work.querySelectorAll('[data-work-category]')).map(function(section){
    return {
      key:section.dataset.workCategory,
      title:section.querySelector('.work-category-title').textContent,
      description:section.querySelector('[data-category-description]').textContent,
      section:section,sticky:section.querySelector('.work-sticky'),
      viewport:section.querySelector('.work-viewport'),track:section.querySelector('.work-track'),
      previous:section.querySelector('[data-work-previous]'),next:section.querySelector('[data-work-next]'),
      position:section.querySelector('[data-work-position]'),end:section.querySelector('.work-end'),
      active:false,distance:0,index:0,top:90
    };
  });
  var unclassified=[];
  catalog.forEach(function(card){
    var rail=rails.find(function(item){return item.key===card.dataset.projectCategory;});
    if(rail)rail.track.insertBefore(card,rail.end);
    else{unclassified.push(card);card.remove();}
  });
  function cards(rail){return Array.from(rail.track.children).filter(function(card){return card.hasAttribute('data-slug');});}
  function panels(rail){return cards(rail).concat([rail.end]);}
  function controls(rail,progress){
    var count=cards(rail).length;
    rail.index=Math.round(progress*(panels(rail).length-1));
    rail.position.textContent=rail.index===count?'View All':String(rail.index+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
    rail.previous.disabled=rail.index===0;
    rail.next.disabled=rail.index===panels(rail).length-1;
    rail.end.querySelector('[data-work-empty]').hidden=count>0;
  }
  function update(rail){
    if(!rail.active){controls(rail,rail.distance?rail.viewport.scrollLeft/rail.distance:0);return;}
    var progress=Math.max(0,Math.min(1,(rail.top-rail.section.getBoundingClientRect().top)/rail.distance));
    rail.track.style.transform='translate3d('+(-progress*rail.distance)+'px,0,0)';
    controls(rail,progress);
  }
  var queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(function(){queued=false;rails.forEach(update);});
  }
  function measure(rail){
    // Preserve the occupied height while measuring, as in the original rail.
    var previousHeight=rail.section.style.height;
    rail.section.style.height=rail.section.offsetHeight+'px';
    rail.section.classList.remove('scroll-work');
    rail.track.style.transform='';rail.viewport.scrollLeft=0;
    rail.distance=Math.max(0,rail.track.scrollWidth-rail.viewport.clientWidth);
    rail.active=rail.distance>0&&!reduced.matches;
    if(rail.active){
      rail.section.classList.add('scroll-work');
      rail.section.style.setProperty('--work-height',(rail.sticky.offsetHeight+rail.distance+56)+'px');
    }else rail.section.style.removeProperty('--work-height');
    rail.section.style.height=previousHeight;
    update(rail);
  }
  function measureAll(){rails.forEach(measure);}
  function go(rail,target){
    var items=panels(rail);
    target=Math.max(0,Math.min(items.length-1,target));
    var offset=items[target].offsetLeft-items[0].offsetLeft;
    if(rail.active){
      window.scrollTo({top:window.scrollY+rail.section.getBoundingClientRect().top-rail.top+offset,behavior:reduced.matches?'auto':'smooth'});
    }else rail.viewport.scrollTo({left:offset,behavior:reduced.matches?'auto':'smooth'});
  }
  rails.forEach(function(rail){
    rail.previous.addEventListener('click',function(){go(rail,rail.index-1);});
    rail.next.addEventListener('click',function(){go(rail,rail.index+1);});
    rail.viewport.addEventListener('scroll',schedule,{passive:true});
    rail.viewport.addEventListener('keydown',function(event){
      if(event.target!==rail.viewport)return;
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
        event.preventDefault();go(rail,rail.index+(event.key==='ArrowRight'?1:-1));
      }
    });
    rail.viewport.addEventListener('focusin',function(event){
      var card=event.target.closest('.project-card');
      var target=panels(rail).indexOf(card);
      if(target>=0&&target!==rail.index)go(rail,target);
    });
  });
  document.querySelectorAll('.story-client-group a[href="#work"]').forEach(function(link){
    link.addEventListener('click',function(event){
      if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&!rails[0].active)rails[0].viewport.scrollLeft=0;
    });
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('load',measureAll);
  if(document.fonts)document.fonts.ready.then(measureAll);

  var motion=[],closing=false,oldOverflow='',lastOpener=opener,groups=[];
  function clearMotion(){motion.forEach(function(animation){animation.cancel();});motion=[];}
  function animateCards(elements){
    if(reduced.matches)return;
    elements.forEach(function(card,index){
      if(typeof card.animate==='function')motion.push(card.animate([
        {opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}
      ],{duration:640,delay:index*70,easing:'cubic-bezier(.2,0,0,1)',fill:'backwards'}));
    });
  }
  function copyCard(card){
    var copy=card.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(function(element){element.removeAttribute('id');});
    copy.querySelectorAll('img').forEach(function(image){image.loading='lazy';});
    return copy;
  }
  function gridColumns(grid){
    return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length||1;
  }
  function batchSize(grid){
    var columns=gridColumns(grid);
    return columns===1?3:columns*2;
  }
  function appendBatch(group,limit,animate){
    var added=[],fragment=document.createDocumentFragment();
    var target=Math.min(group.projects.length,limit);
    while(group.shown<target){
      var card=copyCard(group.projects[group.shown++]);fragment.appendChild(card);added.push(card);
    }
    group.grid.appendChild(fragment);
    group.more.hidden=group.shown>=group.projects.length;
    group.more.setAttribute('aria-label','View more '+group.title.toLowerCase()+' ('+group.shown+' of '+group.projects.length+' shown)');
    if(animate)animateCards(added);
    return added;
  }
  function buildGroup(category,projects){
    var container=document.createElement('div');container.className='portfolio-category';
    if(category.key)container.dataset.portfolioCategory=category.key;
    var head=document.createElement('div');head.className='section-head';
    var title=document.createElement(category.key?'h3':'p');title.textContent=category.title;head.appendChild(title);
    var description=document.createElement('span');description.className='eyebrow';description.textContent=category.description;head.appendChild(description);
    container.appendChild(head);
    var grid=document.createElement('div');grid.className='portfolio-gallery';grid.id='portfolio-'+(category.key||'pending');container.appendChild(grid);
    var empty=document.createElement('p');empty.className='portfolio-empty';empty.textContent='No '+category.title.toLowerCase()+' to show yet.';empty.hidden=projects.length>0;container.appendChild(empty);
    var more=document.createElement('button');more.type='button';more.className='visit-btn work-all';more.textContent='View More';more.setAttribute('aria-controls',grid.id);container.appendChild(more);
    var group={title:category.title,projects:projects,grid:grid,more:more,shown:0};
    more.addEventListener('click',function(){
      var scrollTop=dialog.scrollTop;
      var added=appendBatch(group,group.shown+batchSize(grid),true);
      if(more.hidden&&document.activeElement===more&&added.length){
        var link=added[0].querySelector('a');if(link)link.focus({preventScroll:true});
      }
      dialog.scrollTop=scrollTop;
    });
    gallery.appendChild(container);groups.push(group);
  }
  function openPortfolio(event){
    if(dialog.open)return;
    lastOpener=event.currentTarget;
    var filter=lastOpener.dataset.portfolioFilter||'all';
    var selected=rails.filter(function(rail){return filter==='all'||rail.key===filter;});
    if(!selected.length)return;
    clearMotion();closing=false;groups=[];gallery.replaceChildren();
    document.getElementById('portfolioTitle').textContent=filter==='all'?'All Work':selected[0].title;
    selected.forEach(function(rail){
      buildGroup(rail,catalog.filter(function(card){return card.dataset.projectCategory===rail.key;}));
    });
    // Unknown metadata never defaults to client work; keep those cards in All Work.
    if(filter==='all'&&unclassified.length)buildGroup({title:'Classification pending',description:'Project type has not been confirmed.'},unclassified);
    // Stop an in-flight rail scroll before locking the background page.
    window.scrollTo({top:window.scrollY,behavior:'instant'});
    oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();dialog.scrollTop=0;
    groups.forEach(function(group){appendBatch(group,batchSize(group.grid),false);});
    if(!reduced.matches&&typeof dialog.animate==='function')motion.push(dialog.animate([{opacity:0},{opacity:1}],{duration:220,easing:'cubic-bezier(.2,0,0,1)'}));
    animateCards(Array.from(gallery.querySelectorAll('.project-card')));
  }
  work.querySelectorAll('[data-portfolio-filter]').forEach(function(button){button.addEventListener('click',openPortfolio);});
  function closePortfolio(){
    if(closing||!dialog.open)return;
    closing=true;clearMotion();
    if(reduced.matches||typeof dialog.animate!=='function'){dialog.close();return;}
    var exit=dialog.animate([{opacity:1,translate:'0 0'},{opacity:0,translate:'0 12px'}],{duration:320,easing:'cubic-bezier(.2,0,0,1)',fill:'forwards'});
    motion.push(exit);exit.finished.catch(function(){}).then(function(){if(dialog.open)dialog.close();});
  }
  document.getElementById('closePortfolio').addEventListener('click',closePortfolio);
  dialog.addEventListener('cancel',function(event){event.preventDefault();closePortfolio();});
  dialog.addEventListener('click',function(event){
    if(event.target!==dialog)return;
    var rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePortfolio();
  });
  dialog.addEventListener('close',function(){
    clearMotion();closing=false;document.body.style.overflow=oldOverflow;lastOpener.focus({preventScroll:true});
  });
  window.addEventListener('resize',function(){
    measureAll();
    if(dialog.open)groups.forEach(function(group){
      var columns=gridColumns(group.grid),shown=Math.max(group.shown,batchSize(group.grid));
      appendBatch(group,Math.ceil(shown/columns)*columns,false);
    });
  });
  reduced.addEventListener('change',function(){clearMotion();measureAll();});
  measureAll();
})();
