# Zyberlane content refinement — 2026-10-30

Scope: benefit-led copy within the existing components; Calino.in was consulted only for general content structure and conversion clarity. No Calino wording, assets, layout, claims, metrics, pricing or branding was copied.

## Exact visible copy changes

### index.html

- Before: Software · Web · AI · Automation
  - After: Digital tools for your business

- Before: We build websites, software and AI automation for businesses and creators, remotely from Sri Lanka with direct founder communication.
  - After: Websites that explain your business. Software and automation that simplify everyday tasks. Built remotely from Sri Lanka, working directly with founder Dilux.

- Before: Core Expertise
  - After: Why Zyberlane

- Before: What we bring ● to the build
  - After: Practical scope ● human review

- Before: Zyberlane is open for new projects and collaborations. Tell us what you're building, and we'll discuss a practical approach.
  - After: Ready to discuss your project? Share what your business needs, the features that matter and any constraints. Work directly with Dilux to agree a practical scope.

- Before: Chat with our WhatsApp agent to get a quote for your project.
  - After: Start on WhatsApp with your goals and requirements so we can discuss a quotation.

- Before: Tell us ● what you're building
  - After: Share your goals ● and essential features

- Before: A responsive website for an independent tattoo studio, with an artwork gallery and a custom content-management workflow.
  - After: A responsive studio website that brings tattoo artwork and business information together, with a gallery and a custom content-management workflow.

### about/index.html

- Before: What drives the work
  - After: Why Zyberlane

- Before: We work with businesses, startups, creators and organizations to turn ideas into useful digital products. The focus is on understanding the problem, choosing a suitable approach and building something people can actually use.
  - After: Work directly with founder Dilux to explain your goals, ask questions and review progress. Custom solutions start with your users and everyday tasks, with a practical scope agreed before development.

- Before: AI-assisted workflows support development and iteration, alongside human decisions, testing and review. Clear communication and a realistic scope are part of the build.
  - After: AI assists development and iteration; human decisions, testing and review guide the result. We discuss feasibility, limitations and costs openly so you can decide what belongs in your project.

- Before: Zyberlane operates remotely from Sri Lanka and can collaborate with clients elsewhere when the project is a suitable fit.
  - After: Collaborate remotely from Sri Lanka or elsewhere, with requirements, communication and previews agreed around the project. Explore the services to see where your idea fits.

### services/index.html

- Before: Modern websites and web experiences built around your business, audience and content.
  - After: Business websites, landing pages and portfolios that explain your services, showcase your work and give visitors a clear way to enquire.

- Before: Custom digital tools for a clear business need, with features scoped around how people will use them.
  - After: Custom applications, dashboards and admin tools that bring business information and everyday tasks into one usable workflow.

- Before: Focused mobile applications for businesses and product ideas. Platform choices, essential features and integration feasibility are assessed before committing to a build.
  - After: Focused mobile apps that help customers or staff complete specific tasks on their phones. Platform choices, essential features and integrations are assessed before a build is agreed.

- Before: AI assistants and integrations for tasks where automation can be useful. Access to data, limitations and human review are considered as part of the scope.
  - After: AI assistants and model integrations to help people find information or handle defined tasks. Data access, limitations and human review are agreed as part of the scope.

- Before: Connect forms, APIs and third-party services to reduce repetitive work and move information between systems.
  - After: Connect forms, APIs and existing tools so information can move between systems with less manual re-entry. Notifications and routine steps follow an agreed workflow.

- Before: Technical and on-page improvements for new or existing websites, covering how pages are found, understood and used. The scope is agreed after reviewing your site.
  - After: Metadata, search-friendly page structure and performance improvements that help search engines understand your site and visitors use it. The scope follows a review of your existing website.

- Before: Share your goals, requirements and constraints. We can discuss what fits and define a realistic project scope.
  - After: See the Divine Tattoo client project, then share your goals, essential features and constraints. We can discuss what fits and agree a realistic scope.

### work/divine-tattoo/index.html

- Before: Project overview
  - After: The project need

- Before: Zyberlane’s portfolio identifies Divine Tattoo as a client website project for an independent tattoo studio. The published project is described as a responsive site with an artwork gallery and a custom content-management workflow.
  - After: For an independent tattoo studio, a website needs to help visitors explore the artwork, understand the services and find a way to contact the studio. The Divine Tattoo project brings those elements together in a responsive studio website.

- Before: The live site currently presents studio and service information, artist profiles, a visual portfolio, and consultation links. This page records the documented project scope and links to the public work so visitors can review it directly.
  - After: Zyberlane built an artwork gallery and a custom content-management workflow alongside the website. Explore the linked public site to see studio information, artist profiles, tattoo work and consultation links; the client’s feedback appears below.

- Before: A public website for Divine Tattoo, described as responsive in Zyberlane’s portfolio and Web Development service page.
  - After: A responsive website that presents the studio and its services across desktop and mobile screens, with links for consultation enquiries.

- Before: A visual portfolio for presenting tattoo work. The gallery is visible on the live project website.
  - After: A visual gallery that lets visitors explore tattoo artwork before contacting the studio. View the work on the linked public website.

- Before: Zyberlane’s portfolio describes a custom content-management workflow as part of the delivered scope.
  - After: A custom workflow for managing website content, included in the documented project scope. The public site shows the published content; the admin interface is private.

## Supporting changes and affected files

- `index.html`: hero, Why Zyberlane heading/eyebrow, Divine Tattoo card, contact and request copy; known previous hero defaults upgrade through the existing CMS renderer. Intentional custom admin text keeps precedence; no database writes. Existing expertise cards remain editable through the CMS.
- `about/index.html`: existing company copy now explains founder communication, practical scope, custom solutions, AI assistance with human review, honest limitations/cost discussions and remote collaboration.
- `services/index.html`: descriptions for the same six services, matching generated Service JSON-LD descriptions, and the existing CTA paragraph. One inline link to `/work/divine-tattoo/` makes client work directly accessible before the project request. All existing buttons and their destinations are retained.
- `work/divine-tattoo/index.html`: existing overview reframed as the project need, delivered scope and usefulness of three features. Live-site links, classification, attribution and exact testimonial are retained. No unsupported before/after business problem or measured result is asserted.
- `_headers` and `vercel.json`: only the changed executable script’s CSP hash is synchronized. Policies, redirects and preview protection are unchanged.
- `tests/cms-seo.cjs`: regression coverage for previous hero defaults, whitespace normalization and custom-copy precedence.
- `tests/entity-seo.cjs`: stale-schema negative fixture now targets the revised visible service text, preserving drift detection.
- `docs/content-refinement.md`: this exact copy and validation record.

## Preservation checks

No new services, pricing offers, audit/review offers, popups, lead magnets, fabricated clients, results, stats, awards, certifications or team-size claims were added. Client Projects, Concept Projects and Design Studies remain separate.

DOM structure and attributes match the base version on all four edited pages except for one inline case-study link in the Services CTA paragraph. Inline and external styles, typography, colours, spacing rules, images, animations, WebGL/fluid implementation, navigation, existing buttons, contact destinations and portfolio behavior are unchanged. Text can wrap differently; pixel-identical rendering is not claimed.

Canonical URLs, meta descriptions/titles, service URLs, entity IDs and graph relationships are unchanged. Only the six generated Service descriptions were synchronized to visible copy. Sitemap, robots, IndexNow, schema generator, preview noindex and build architecture are unchanged.

## Validation

Passed: static build, technical SEO, entity/schema relationships and drift detection, search intent, CMS SEO/hero default migration, security/CSP parity, reviews/FAQ, client proof, AI-search readiness, IndexNow and performance budget. Source comparison verified unchanged DOM/styles and crawler/portfolio/fluid files.

Browser rendering/layout, interactive portfolio and pixel comparisons were not run: Chromium is absent and its Playwright download failed with a truncated/non-ZIP response. Review the Git-connected Vercel preview at desktop/mobile widths before merge. No Netlify deployment, production publication, merge or IndexNow submission was performed.
