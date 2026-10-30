# Zyberlane service hierarchy refinement

30 October 2026. PR #47 was verified merged before editing. This follow-up starts from main `0b65d328192fc040af7c8a4c90319fe0263a52c3`, on `feat/services-capability-hierarchy`; no direct main changes or automatic merge.

## Final six top-level categories and exact published sub-services

The homepage has **exactly six service cards**, one per category below, with short descriptions and no sub-service lists. The separate Services page uses the same six categories in the same order. Its existing card styling is reused for detailed category groups; lists use the existing responsive breakpoints. No new sub-service landing pages were created.

### 1. Web Design & Development

- Business Websites
- Landing Pages
- Portfolio Websites
- Website Redesign
- CMS / Admin Systems
- Booking / Contact Systems
- Web Applications

### 2. Branding & Creative

No specific delivery sub-services are advertised yet. The category remains a neutral project-brief discussion area with a contact action; it does not promise delivery of unverified specialist work.

### 3. Digital Marketing

No specific delivery sub-services are advertised yet. The category remains a neutral project-brief discussion area with a contact action; it does not promise delivery of unverified specialist work.

### 4. Social Media & Content

No specific delivery sub-services are advertised yet. The category remains a neutral project-brief discussion area with a contact action; it does not promise delivery of unverified specialist work.

### 5. Search & AI Visibility

- Technical SEO
- On-page SEO
- Search Visibility
- AEO
- GEO
- Structured Data
- Sitemap / Robots / Indexing Foundations
- AI-search Readiness
- Bing / IndexNow Readiness

### 6. AI & Business Automation

- AI Assistants
- AI Agents
- Business Workflow Automation
- Form / API Integrations
- Notifications
- Repetitive-task Automation
- Suitable AI-assisted Workflows

There are **23 advertised sub-services** across the evidenced web/search/automation scope. All six requested category headings are retained. Branding, digital marketing and social/content do not yet have verified delivery sub-services in the available owner/repository evidence; filling these categories with the suggested offers would misrepresent readiness.

## Internal omissions — not displayed on the website

- **Web Design & Development:** E-Commerce.
- **Branding & Creative:** Brand Identity, Logo Design, Brand Direction, Graphic Design, Posters / Campaign Graphics, Advertising Creatives, Motion Graphics.
- **Digital Marketing:** Digital Marketing Strategy, Campaign Planning, Audience Targeting, Google Ads, Meta Ads, Marketing Creative Coordination.
- **Social Media & Content:** Social Media Marketing, Content Planning, Social Media Creatives, Content Creation, Script / Campaign Content, Video Editing, Short-form Content, Promotional Video.

These 22 items remain omitted because no suitable, available delivery workflow/specialist was confirmed in the supplied context. WhatsApp category names alone are insufficient evidence. This does not assert that the owner lacks these skills; it records the limit of the evidence available for public claims. Before advertising one, confirm delivery responsibility, examples/quality, platform/language fit, availability and agreed scope, then update the internal register, public scope and tests together.

The internal register is `scripts/service-capabilities.cjs`, excluded from the public build. Public status badges, confirmation notes and unsupported sub-service lists were removed. The site still identifies Dilux as the direct point of communication and describes the developing project-based network without employee/team-size claims. Related homepage FAQs and About wording were synchronized so they do not reintroduce internal readiness notes or advertise omitted capabilities.

## SEO/schema and intent ownership

- Services description, Open Graph and Twitter metadata now describe six project areas plus detailed web/search/automation scope. Homepage metadata/copy removes operational confirmation notes. Existing titles, production canonicals, entity IDs and page URLs are retained.
- The three supported Service entities remain Web Design & Development, Search & AI Visibility, and AI & Business Automation. Their descriptions include the exact visible sub-service labels. The other three headings remain project enquiry areas rather than fabricated Service entities.
- Build validation matches every category and sub-service against the internal register, rejecting unknown categories, extra/missing sub-services and duplicate category coverage. Entity tests still enforce drift detection, type/property ranges and resolved relationships.
- `/services/#web-development` owns the seven website sub-services, linking to the existing website and web-application detail pages. `/services/#seo-web-optimization` owns the nine search-readiness items. `/services/#ai-agents-automation` owns the seven automation items and links to the existing automation detail page. The other three anchors are brief-discussion destinations only.
- Homepage category links lead to their matching Services groups; useful existing detail links remain in the FAQ and Services page. No one-page-per-keyword/sub-service expansion.
- Search-intent and measurement documents point to this finalized hierarchy, while distinguishing observed demand from delivery readiness. The original PR #47 report is explicitly marked historical where this refinement supersedes it.
- The sitemap is unchanged at **ten canonical public URLs**. Sitemap and generated redirects are byte-identical to current main: no new useful routes were added. Internal registry/docs/test files remain excluded from publication.
- Robots, Vercel/Netlify configuration, preview safeguards, IndexNow code/key, fluid/WebGL engines and existing animations are unchanged. No live IndexNow request or Netlify operation was performed.

## Validation and limits

All **14 automated checks passed**; commands, exit codes and output are in [service-hierarchy-checks.json](qa/service-hierarchy-checks.json). They cover build, structured data, technical SEO, entities, search intent, CMS defaults, AI-search readiness, IndexNow guards, performance budget, client proof, security/CSP, FAQ behavior, the agency hierarchy and fluid compatibility.

The initial search-intent run caught removal of direct homepage detail links when the FAQ was rewritten. Those useful links were restored; the final run passed. Tests were not weakened to accept orphaned pages.

Cloud-browser checks covered Home and Services at **320, 390, 768, 1280 and 1440px**: all ten combinations had six category cards, Home had zero sub-service items, Services had 23, and document scroll width matched client width with no page-level horizontal overflow. The desktop detailed group and narrow/mobile layout were visually inspected. This is fixed-width browser QA, not a physical-device touch test, full no-JavaScript matrix or a measured Core Web Vitals result. The local Playwright browser suites were not rerun in this follow-up; the preceding task documented a missing local Chromium executable.

[Services screenshot](qa/service-hierarchy-1280.jpg).

## Files changed in this refinement

```text
README.md
about/index.html
assets/site-pages.css
docs/agency-repositioning.md
docs/qa/service-hierarchy-1280.jpg
docs/qa/service-hierarchy-checks.json
docs/search-intent-seo.md
docs/search-performance-measurement.md
docs/service-hierarchy.md
index.html
scripts/service-capabilities.cjs
scripts/structured-data.cjs
services/index.html
services/web-development/index.html
tests/README.md
tests/agency-positioning.cjs
tests/entity-seo.cjs
```

## Review workflow

A new PR targets current main because #47 is already merged. Use the existing GitHub-connected Vercel preview only. Do not merge automatically. No new hosting project, Vercel configuration change, manual deployment, Netlify access/publication or live IndexNow submission.
