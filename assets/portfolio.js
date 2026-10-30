/* Selected Work category rails. Full portfolio actions navigate to /work/. */
(function(){
  'use strict';
  var work=document.getElementById('work');
  if(!work)return;
  // Match the reference's surface through screen-blended fluid. Only these two
  // invitations sit above that fluid; retain their existing wrapper layering.
  var reference=work.querySelector('[data-work-category="concept-projects"] .work-end');
  var surface=getComputedStyle(reference).backgroundColor.match(/[\d.]+/g).map(Number);
  var base=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
  var alpha=(surface[0]-base[0])/(255-base[0])*(surface.length===4?surface[3]:1);
  work.querySelectorAll('#workEndPanel,#design-studiesEndPanel').forEach(function(card){
    card.style.setProperty('--work-end-surface','rgba(255,255,255,'+alpha+')');
  });
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

  window.addEventListener('resize',measureAll);
  reduced.addEventListener('change',measureAll);
  measureAll();
})();
