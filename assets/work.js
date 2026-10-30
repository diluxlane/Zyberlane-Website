/* Static portfolio remains complete without JavaScript. Filters are progressive enhancement. */
(function(){
  'use strict';
  var filters=Array.from(document.querySelectorAll('[data-work-filter]'));
  var groups=Array.from(document.querySelectorAll('[data-portfolio-category]'));
  var status=document.getElementById('workFilterStatus');
  function apply(){
    var key=new URL(window.location.href).searchParams.get('category')||'all';
    if(!groups.some(function(group){return group.dataset.portfolioCategory===key;}))key='all';
    groups.forEach(function(group){group.hidden=key!=='all'&&group.dataset.portfolioCategory!==key;});
    filters.forEach(function(link){link.setAttribute('aria-pressed',String(link.dataset.workFilter===key));link.setAttribute('role','button');});
    var active=filters.find(function(link){return link.dataset.workFilter===key;});
    status.textContent='Showing '+(key==='all'?'all work':active.textContent.toLowerCase())+'.';
  }
  filters.forEach(function(link){
    link.addEventListener('click',function(event){
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();history.pushState(null,'',link.href);apply();
    });
    link.addEventListener('keydown',function(event){if(event.key===' '){event.preventDefault();link.click();}});
  });
  window.addEventListener('popstate',apply);apply();
})();
