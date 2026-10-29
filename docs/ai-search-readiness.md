# AI search and crawler readiness

Audit baseline: the merged `main` tree after Phase 4 (2026-10-29). This record concerns technical accessibility and machine readability; it does not predict rankings, indexing, citations or answer inclusion.

## OpenAI / ChatGPT Search

OpenAI distinguishes `OAI-SearchBot` (search discovery) from `GPTBot` (potential model-training use). OpenAI recommends allowing OAI-SearchBot in `robots.txt` and allowing requests from its currently published search crawler IP ranges: [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots), [published SearchBot ranges](https://openai.com/searchbot.json). Zyberlane's existing `User-agent: *` / `Allow: /` permits OAI-SearchBot on public paths; the `Disallow: /admin/` remains in force. No crawler-policy change was necessary. GPTBot has no specific override and inherits the current wildcard rule; this phase does not change that policy.

## Google AI Search and standard retrieval

Google says standard SEO fundamentals continue to apply to AI Overviews and AI Mode, that there is no special schema or AI text file requirement, and that inclusion is not guaranteed: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), [generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). Zyberlane has publicly crawlable static HTML, unique titles and descriptions, production canonicals, internal links, one canonical-derived sitemap, and visible-content-aligned JSON-LD. The existing metadata and structured data required no change for this phase.

## Repository checks

Run `node tests/ai-search-readiness.cjs`. It checks the effective repository `robots.txt` rules for Googlebot, Bingbot, OAI-SearchBot and GPTBot; preserves `/admin/` exclusion; checks sitemap identity and uniqueness; verifies every built indexable page has static title, description, OG URL, H1/main content, navigation and parseable JSON-LD; rejects preview/internal hosts in canonical identity; and confirms admin and internal sources stay out of the sitemap/build output.

The site is static HTML. The public pages' important headings, service descriptions, metadata, navigation, links and JSON-LD are in the initial HTML response. Home CMS scripts can synchronize editable metadata after page load; the CMS SEO regression suite checks that synchronization, and the initial metadata remains present if JavaScript does not run. No-JavaScript browser rendering still depends on the existing browser suite being run with Playwright/Chromium.

## Infrastructure boundary

Repository policy cannot verify that live requests from OpenAI's real, published IP ranges pass through Cloudflare or another CDN/firewall. Prior repository documentation records HTTP 200 responses for spoofed crawler User-Agent probes and generic automated requests receiving Cloudflare 1010 on 2026-10-25. Those observations are not proof of verified crawler access. A custom User-Agent is trivially spoofed and does not prove request origin.

Owner-only follow-up, if actual crawler access needs diagnosis: in Cloudflare Security Events, inspect recent requests to `zyberlane.com` and confirm whether verified OpenAI SearchBot IP traffic is challenged or blocked; check the applicable WAF/bot rules against the current [published SearchBot IP ranges](https://openai.com/searchbot.json). Do not allowlist a user-agent string alone. Confirm through event/request logs; no Cloudflare settings were changed in this phase.

## Deliberately not implemented

- No `llms.txt` or `ai.txt`: Google says these files are not needed for its AI Search features; this audit found no verified practical benefit that warrants another public file.
- No AI-specific schema, hidden text, new public pages, keyword additions, crawler-specific landing pages, or changes to `robots.txt`.
- No ranking, indexing, citation or AI Overview guarantee.

## Official references

- OpenAI, [Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots), including OAI-SearchBot, GPTBot and the published IP list.
- Google Search Central, [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).
- Google Search Central, [generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- Google Search Central, [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
