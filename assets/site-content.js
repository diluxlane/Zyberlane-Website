
(function(){
  var SUPABASE_URL = 'https://dgolqzznwsjjuuuoygug.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_eQwwDtIpggkDNdkjIlA8Lw_NZlkGs6V';

  if (typeof window.supabase === 'undefined') return; // CDN failed to load — static content stays as-is
  var sb;
  try {
    // shared singleton — avoids "Multiple GoTrueClient instances" warning
    // when more than one script on this page needs a Supabase client
    window.__zyberlaneSb = window.__zyberlaneSb || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    sb = window.__zyberlaneSb;
  } catch (e) { return; }

  // only http(s) URLs are ever assigned to href/src from CMS data — this
  // blocks javascript:/data: URI injection even if someone with write access
  // (e.g. a future client-portal account) puts something malicious in a field
  function safeUrl(url){
    if (typeof url !== 'string') return null;
    var trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  // Encode database text before inserting it into an HTML template.
  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- site_settings: plain text/attribute swaps ----------
  var STAT_KEYS = ['stat_years_experience', 'stat_projects_completed', 'stat_happy_clients'];
  var reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  function animateStatCount(el, rawValue){
    var match = /^(\d+(?:\.\d+)?)(.*)$/.exec(String(rawValue).trim());
    if (!match || reducedMotionMQ.matches){ el.textContent = rawValue; return; }
    var target = parseFloat(match[1]);
    var suffix = match[2] || '';
    var isInt = Number.isInteger(target);
    var duration = 1300;
    var start = null;
    function step(ts){
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = target * eased;
      el.textContent = (isInt ? Math.round(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = rawValue;
    }
    requestAnimationFrame(step);
  }

  // Keep an intentional CMS SEO edit consistent across the rendered head/graph.
  // Page/entity URLs and relationships always remain owned by the static build.
  function applySeoMetadata(map){
    var title = typeof map.seo_title === 'string' ? map.seo_title.trim() : '';
    var description = typeof map.seo_description === 'string' ? map.seo_description.trim() : '';
    if (!title && !description) return;
    if (title) document.title = title;
    [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[name="twitter:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:description"]', description]
    ].forEach(function(entry){
      var element = document.querySelector(entry[0]);
      if (element && entry[1]) element.setAttribute('content', entry[1]);
    });
    var block = document.getElementById('zyberlane-structured-data');
    if (!block) return;
    try {
      var data = JSON.parse(block.textContent);
      data['@graph'].forEach(function(node){
        if (node['@id'] === 'https://zyberlane.com/#webpage'){
          if (title) node.name = title;
          if (description) node.description = description;
        }
        if (node['@id'] === 'https://zyberlane.com/#organization' && description) node.description = description;
      });
      block.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    } catch (e) { /* Keep the existing graph if a separately edited block is invalid. */ }
  }

  function applySiteSettings(rows){
    // Upgrade only the previous default copy without writing to the shared CMS.
    // Any custom text entered through admin continues to take precedence.
    var legacyDefaults = {
      footer_tagline: ['Software Company'],
      hero_role: ['Software Company & AI Vibe Coding', 'Software · Web · AI · Automation', 'Software, Web, AI & Automation', 'Digital tools for your business'],
      hero_description: ['We design and build software and websites by pairing human direction with AI vibe coding — turning ideas into working products fast, without cutting corners on craft.', 'We build websites, software and AI automation for businesses and creators, remotely from Sri Lanka with direct founder communication.', 'Websites that explain your business. Software and automation that simplify everyday tasks. Built remotely from Sri Lanka, working directly with founder Dilux.'],
      seo_title: ['Zyberlane — Software Company & AI Vibe Coding | Sri Lanka', 'Zyberlane | Software, Web, AI & Automation | Sri Lanka', 'Zyberlane | Websites, Software & AI from Sri Lanka'],
      seo_description: ['Zyberlane builds websites and software with AI vibe coding and prompt engineering. Based in Sri Lanka, open for new client projects.', 'Zyberlane builds software, websites, AI systems and automation with a practical project scope. Based in Sri Lanka, working remotely with businesses and creators.', 'Founder-led website, web application and AI automation development from Sri Lanka. Explore Zyberlane\'s work and discuss a project with Dilux.']
    };
    var defaults = {
      footer_tagline: 'Brand · Web · Marketing',
      hero_role: document.querySelector('[data-cms="hero_role"]').textContent.trim(),
      hero_description: document.querySelector('[data-cms="hero_description"]').textContent.trim(),
      seo_title: document.title,
      seo_description: document.querySelector('meta[name="description"]').content
    };
    var map = {};
    rows.forEach(function(r){
      var isLegacy = Object.prototype.hasOwnProperty.call(legacyDefaults, r.key) &&
        typeof r.value === 'string' && [].concat(legacyDefaults[r.key]).indexOf(r.value.replace(/\s+/g, ' ').trim()) > -1;
      map[r.key] = isLegacy ? defaults[r.key] : r.value;
    });

    document.querySelectorAll('[data-cms]').forEach(function(el){
      var key = el.getAttribute('data-cms');
      if (map.hasOwnProperty(key) && typeof map[key] === 'string' && map[key].length){
        if (STAT_KEYS.indexOf(key) > -1){ animateStatCount(el, map[key]); return; }
        el.textContent = map[key];
      }
    });

    if (typeof map.availability_active === 'boolean'){
      var tag = document.getElementById('r5');
      if (tag) tag.style.display = map.availability_active ? '' : 'none';
    }

    if (map.contact_email){
      var mailto = 'mailto:' + map.contact_email;
      var emailLink = document.getElementById('contactEmailLink');
      if (emailLink) emailLink.href = mailto;
    }
    if (map.whatsapp_number_link){
      var waBtn = document.getElementById('waBtn');
      var fabWa = document.getElementById('fabWhatsapp');
      if (waBtn) waBtn.href = 'https://wa.me/' + map.whatsapp_number_link;
      if (fabWa) fabWa.href = 'https://wa.me/' + map.whatsapp_number_link;
      document.querySelectorAll('.whatsapp-quote').forEach(function(link){
        var query = link.href.split('?')[1];
        link.href = 'https://wa.me/' + map.whatsapp_number_link + (query ? '?' + query : '');
      });
    }
    if (map.social_instagram){ var si = document.getElementById('socialInstagram'); if (si){ var safeIg = safeUrl(map.social_instagram); if (safeIg) { si.href = safeIg; si.removeAttribute('aria-disabled'); si.removeAttribute('title'); si.setAttribute('aria-label', 'Instagram'); } } }
    if (map.social_tiktok){ var st = document.getElementById('socialTiktok'); if (st){ var safeTt = safeUrl(map.social_tiktok); if (safeTt) { st.href = safeTt; st.removeAttribute('aria-disabled'); st.removeAttribute('title'); st.setAttribute('aria-label', 'TikTok'); } } }
    if (map.social_github){ var sg = document.getElementById('socialGithub'); if (sg){ var safeGh = safeUrl(map.social_github); if (safeGh) sg.href = safeGh; } }

    // Raw HTML remains the source for crawlers that do not execute JavaScript.
    applySeoMetadata(map);
  }

  // ---------- services (source-controlled agency scope) ----------
  // Public services and Why Zyberlane stay synchronized with static schema.

  // ---------- packages (pricing) ----------
  function renderPackages(rows){
    var section = document.getElementById('packages');
    var navItem = document.getElementById('navPackagesItem');
    if (!rows || !rows.length){
      if (section) section.style.display = 'none';
      if (navItem) navItem.style.display = 'none';
      return;
    }
    var grid = document.getElementById('packagesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    rows.forEach(function(p){
      var card = document.createElement('div');
      card.className = 'skill-card package-card reveal in' + (p.is_featured ? ' featured' : '');
      var priceHtml = '';
      if (p.price !== null && p.price !== undefined){
        priceHtml = '<div class="price">' + escapeHtml(p.currency || 'USD') + ' ' + Number(p.price).toLocaleString() +
          '<span> / ' + escapeHtml(p.billing_period || 'project') + '</span></div>';
      } else {
        priceHtml = '<div class="price">Contact for pricing</div>';
      }
      var featuresHtml = '';
      if (Array.isArray(p.features) && p.features.length){
        featuresHtml = '<ul>' + p.features.map(function(f){
          var li = document.createElement('li'); li.textContent = f;
          return li.outerHTML;
        }).join('') + '</ul>';
      }
      card.innerHTML =
        (p.is_featured ? '<span class="featured-tag">Most Popular</span>' : '') +
        '<h3></h3>' +
        (p.tagline ? '<p class="tagline"></p>' : '') +
        priceHtml + featuresHtml;
      card.querySelector('h3').textContent = p.name;
      if (p.tagline) card.querySelector('.tagline').textContent = p.tagline;
      grid.appendChild(card);
    });
    if (section) section.style.display = '';
    if (navItem) navItem.style.display = '';
  }

  // ---------- testimonials are curated in static homepage markup ----------

  function safeFetch(promise){
    return promise.then(function(res){ return res && !res.error ? res.data : null; })
                   .catch(function(){ return null; });
  }

  Promise.allSettled([
    safeFetch(sb.from('site_settings').select('key, value')),
    safeFetch(sb.from('packages').select('*').eq('is_active', true).order('sort_order'))
  ]).then(function(results){
    var settings = results[0].value;
    var packages = results[1].value;

    if (settings) applySiteSettings(settings.map(function(r){
      // jsonb text values arrive already unwrapped as JS strings/booleans by supabase-js
      return { key: r.key, value: r.value };
    }));
    // Agency service availability is reviewed in source, never inferred from legacy CMS cards.
    renderPackages(packages || []);
    // The selected-work showcase uses the two curated project cards above.
  });
})();
