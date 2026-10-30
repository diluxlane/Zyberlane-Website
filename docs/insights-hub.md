# Combined Insights hub

## Architecture and content
- Route: `/insights/`; navigation label: **Insights**; page heading: **Blog & Case Studies**.
- One collection suits one genuine case study and zero approved blog posts. No separate `/blog/` or `/case-studies/` indexes were created.
- Case Studies reuses the existing Divine Tattoo portfolio card and factual delivery summary. Its detail remains `/work/divine-tattoo/`, with existing project need, delivered features and genuine feedback unchanged. No performance results were added.
- Blog is an explicit “No articles published yet” empty state, with intended web, branding, marketing, search, AI, automation and business strategy subjects. No fake posts, authors, dates or article entities.
- Future approved substantive articles may use `/insights/<slug>/`. Add actual title, description, content, factual author/date information, appropriate article schema, hub card, internal links and generated sitemap entry together. Do not pre-create URLs.

## Navigation and design
Insights is linked from the footer of all eleven public pages, including Home. Work adds a contextual Blog & Case Studies link; Divine Tattoo adds More from Insights. The hub links back to Work, Services, project inquiry and Divine Tattoo. Main navigation retains its six existing items to avoid crowding. All existing CSS, JavaScript, typography, animation and fluid assets are reused unchanged; no redesign or new framework.

## Search architecture
Title, description, canonical, Open Graph and Twitter metadata use the production identity `https://zyberlane.com/insights/`. Generated CollectionPage connects to Organization, WebSite, Home → Insights breadcrumb and existing Divine Tattoo CreativeWork via `mentions`. No fake BlogPosting or review/rating schema. Existing service entities and Divine Tattoo breadcrumb remain unchanged. Sitemap increases from ten to eleven canonical URLs; generated index.html redirect is included. Search-intent and measurement documentation identify the combined collection, future article publication gates and separate client-proof tracking.

## Validation
All 15 recorded build/check commands pass in `qa/insights-checks.json`. New focused regression covers connected schema, eleven-route sitemap, real project links, no separate blog/case-study indexes, no fake articles and excluded internal source folders. Search-intent allowlist and agency page-count checks explicitly recognize the one requested route; safeguards remain intact.

Cloud browser tested the actual hub in fixed-width frames at 320, 390, 768, 1280 and 1440 pixels. Document client/scroll widths matched at 305/375/753/1265/1425 (scrollbar allowance): no page overflow. Mobile Blog empty state and desktop design inspected; Blog anchor and Divine Tattoo case-study navigation verified. This is browser layout QA, not physical-device, GPU or Core Web Vitals measurement. Separate local Playwright suites were not run. Preview wrappers were temporary build-only files and removed by the final build.

Existing Vercel noindex configuration, crawler rules, Netlify configuration and fluid engines are unchanged. GitHub-connected Vercel preview only; no production publication, Netlify account access or live IndexNow submissions. Branch is based on merged PR #48, main commit `71cf029b4f15e274e44513f443d07f4b4874a1f0`. PR remains owner-controlled and must not be automatically merged.

## Files changed

- `README.md`
- `_redirects`
- `about/index.html`
- `docs/insights-hub.md`
- `docs/qa/insights-checks.json`
- `docs/qa/insights-desktop.jpg`
- `docs/search-intent-seo.md`
- `docs/search-performance-measurement.md`
- `index.html`
- `insights/index.html`
- `privacy-policy/index.html`
- `scripts/structured-data.cjs`
- `services/ai-automation/index.html`
- `services/index.html`
- `services/web-app-development/index.html`
- `services/web-development/index.html`
- `sitemap.xml`
- `terms/index.html`
- `tests/README.md`
- `tests/agency-positioning.cjs`
- `tests/insights.cjs`
- `tests/search-intent-seo.cjs`
- `work/divine-tattoo/index.html`
- `work/index.html`
