# Search intent and service architecture

Research and architecture decision: 25 October 2026. This record was written
before changing public pages. It describes a qualitative English-language search
sample, not a rank tracker or a claim about Zyberlane's current rankings.

## Research method and limits

Current web searches covered these actual query groups:

- `website development sri lanka`; `web design sri lanka`;
  `"website development company" "Sri Lanka"`; `"website developer" "Sri Lanka"`;
  `"website designer" "Sri Lanka" pricing`.
- `custom software web application development sri lanka`;
  `"web application development" "Sri Lanka"`.
- `AI automation Sri Lanka services`; `AI agents Sri Lanka business automation`;
  `"AI automation" "Sri Lanka" services`; `"AI solutions sri lanka" services`;
  `"business automation" "Sri Lanka" services`.
- `mobile app development Sri Lanka`; `"mobile app development sri lanka" services`;
  `"SEO services" "Sri Lanka"`.
- Supplemental website-development/design queries with `price`, `pricing`,
  `services` and `portfolio` to inspect purchasing questions.

Two search providers were used. A recent-results filter on initial searches also
introduced news/research noise; unfiltered, explicit commercial queries were used
to distinguish service providers from that noise. No Sri Lankan GPS/IP location,
personalized Google.lk session, ad placement, map-pack capture or Search Console
query data was available. Results establish wording and information expectations;
their order is not a reliable local rank measurement. No search volumes, keyword
difficulty scores, demand growth estimates or competitor business claims were
independently measured.

## Existing site and factual boundaries

The merged Phase 2 source has five public pages and six service cards. The
homepage's Core Expertise cards describe working capabilities, not six services.
Work, FAQ, Contact and Request a Project are homepage sections. All public pages
already have unique metadata, production canonicals and connected JSON-LD.

Public sources for the new copy:

| Fact / scope | Existing source |
| --- | --- |
| Founder-led; Dilukshan (Dilux) plans, develops and communicates directly | About founder card |
| Remote operation from Sri Lanka; suitable international collaborations | About; homepage international FAQ |
| Business sites, landing pages, portfolios, responsive custom sites | Services Web Development card; homepage services/responsive FAQs |
| Web applications, dashboards, internal tools, admin/CMS | Services Web/Software cards |
| Booking, e-commerce and custom features assessed for feasibility | Homepage custom-functionality FAQ |
| AI assistants, agents, model integrations, data access, limitations and human review | Services AI card |
| Forms, APIs, third-party integrations, notifications and routine workflows | Services Business Automation card |
| Scoped mobile apps; platform feasibility assessed first | Services Mobile card |
| On-page/technical SEO, metadata, sitemap/robots, performance/usability | Services SEO card; no ranking guarantees |
| Requirements → scope → build/review → verify/deliver | About process and homepage Work Process |
| Price and timeline depend on scope; third-party domain/hosting charges may be separate; maintenance available | Homepage cost/timeline/hosting/support FAQs |
| Divine Tattoo is an actual client website with gallery and content management | Homepage Client Projects; `assets/portfolio-data.js` |
| Concept Projects and Design Studies are distinct from client work | Homepage portfolio categories; `docs/portfolio.md` |

The production homepage was inspected in the browser. The package section was
hidden (`display: none`) and its package grid empty. Source HTML likewise has no
numeric package rate. Budget options on the inquiry form are preferences, not
prices. No starting price, currency conversion, fixed delivery time or package
entitlement is introduced. Existing CMS pricing behavior remains unchanged.

## Competitor / SERP evidence

These are observations of providers' own pages, not endorsements or verification
of their claims. Search-result titles may differ from HTML title tags. The labels
below record the retrieved page/result titles and actual H1s where available.

| Source inspected | Title / H1 and architecture | Useful observation |
| --- | --- | --- |
| [WebDesigner.lk](https://webdesigner.lk/) | Title: Web Design Sri Lanka, Website Design & Development; H1: Web Design Sri Lanka; root page | Service detail, live portfolio, package scope and prices sit near conversion paths. Design/development wording overlaps strongly. |
| [Sha Web Design](https://www.shawebdesign.com/) | Title describes professional web design in Sri Lanka; H1 positions a responsive web design partner; separate design/development navigation | Work, process, FAQs and contact are easy to find. Prominence claims and large-client numbers are not transferable to Zyberlane. |
| [TekGeeks](https://www.tekgeeks.net/web-development-company-in-sri-lanka) | Title: Web Application Development Company Sri Lanka; H1: Web Application Development; dedicated service URL | Applications, integrations and e-commerce are discussed separately from visual websites. Visitor needs extend beyond a short service card. |
| [Konekt](https://konekt.lk/services/software-development-sri-lanka) | Title identifies software development in Sri Lanka; H1 emphasizes enterprise software; `/services/` child | Software and web apps share a destination with delivery process, capability detail and related service links. Its enterprise/team/technology claims do not establish Zyberlane's capabilities. |
| [SiTechra](https://sitechra.com/ai-automation-solutions) | Title identifies AI/automation solutions in Sri Lanka; AI solutions H1; dedicated page | Chatbots/integrations, cost and implementation questions are explicit. Its published price and ML/computer-vision claims are not Zyberlane facts. |
| [Kindforth](https://www.kindforth.com/services/business-automation) | H1: Business Automation Services in Sri Lanka; dedicated `/services/` child | Workflow examples, feasibility, process, questions and related services clarify what automation means. |
| [Weblook](https://weblook.com/mobile-app-development/) | Title: Mobile App Development Sri Lanka; dedicated page; platform-specific headings | Platform choice, integrations, app proof, quotations and support matter to buyers. Repeated headings/content and inconsistent timeline examples are not patterns to copy. |
| [DigitalUrgency](https://www.digitalurgency.lk/services/seo) | H1: SEO Services in Sri Lanka; dedicated service with package/process anchors | Visitors are offered deliverables, scope, pricing and next steps. Its wider ongoing SEO/local/content offering exceeds Zyberlane's currently documented technical/on-page scope. |

Broad website queries returned established providers and directories such as
Clutch, DesignRush and The Manifest, plus freelancer profiles. Competition appears
crowded from this sample; this is not a numerical difficulty estimate. Singular
developer queries mixed service-hiring intent with jobs. App-development queries
also included training courses. AI/automation results mixed specialist service
pages, broader providers, directories and discussion/news. Country modifiers are
useful context, not evidence that an office is required.

Opportunity: make a scoped, founder-led engagement easy to understand, distinguish
a website from a business application, explain automation inputs and human review,
and connect people to a relevant brief/quote. Avoid copying competitors' prose,
capability lists, technology stacks, prices, outcomes or local-office claims.

## Intent map — selected before implementation

| Primary destination | Primary intent / query theme | Secondary intent/themes | Information needed / why this page |
| --- | --- | --- | --- |
| `/` | Brand discovery: Zyberlane and what it does | Sri Lanka, remote delivery, founder communication, selected work | Business introduction and service choices; do not compete as the main landing page for each individual service. |
| `/about/` | Evaluate Zyberlane and its founder | Dilux, operating approach, remote collaboration | Public identity, direct communication and project process, with routes to services. |
| `/services/` | Compare Zyberlane's services / choose a starting point | Web, software, AI, mobile, integrations, optimization | Six genuine services, fit, pricing approach and links to detailed destinations; a service index rather than six keyword targets. |
| `/services/web-development/` | Commission a business website: website/web development or design in Sri Lanka | Landing pages, portfolios, responsive sites, CMS, redesign, website cost | One combined design/build destination; scope examples, real client reference, process, costs/support and a brief CTA. |
| `/services/web-app-development/` | Commission a custom web application / web-based business software | Internal tools, dashboards, admin/CMS, custom software development in Sri Lanka | Workflows, user roles/data/integrations, first-release scope and quotation inputs. Separate from brochure-site intent; do not imply native desktop/enterprise expertise. |
| `/services/ai-automation/` | Assess AI assistants/agents and workflow automation in Sri Lanka | AI solutions, business automation, APIs and form integrations | Distinguish AI tasks from rule-based connections; data access, human review, feasibility and a practical starting brief. Shared page avoids two overlapping thin destinations. |
| `/services/#mobile-app-development` | Assess a mobile app engagement | Platform choice, focused features, integration, quotation | Existing offering has feasibility caveats but no verified platform specialization/app-store work or substantial app proof. Strengthen the card; no standalone page yet. |
| `/services/#seo-web-optimization` | Improve technical/on-page website foundations | Metadata, crawlability, speed/usability | Match the advertised scope; do not imply link-building, ongoing editorial campaigns or guaranteed rankings. No broad SEO campaign landing page yet. |

Website design/development/company/designer variations share a single destination.
Web-based custom software and web applications share another. AI assistants/agents
and business workflow integrations share a third, with a real workflow section
anchor. Each service detail links back to Services and onward only where useful.
The six-item main navigation remains Home, About, Services, Work, FAQ, Contact.

## Architecture decision

Hybrid: retain the overview and create only three independent service pages.
The website page has existing client proof and buyer questions; the application
page answers materially different workflow/data/scoping questions; the automation
page explains AI and non-AI connections with human control. These use cases are
already advertised. No new service category, product or customer claim is needed.

Do not create separate design/development/designer/company pages, separate generic
software and web-app pages, separate overlapping AI-agent/chatbot/automation pages,
city pages, cheap/best/#1 pages, platform-specific pages, e-commerce/booking pages,
or a numeric pricing page without stronger distinct material. Country relevance
comes from real remote Sri Lankan operation, not invented offices. Do not target
jobs/courses, enterprise staffing, unsupported ML research, or every AI phrase.

## Implementation contract

- Reuse existing company-page CSS, typography, reveals, cards, process list, CTA,
  header/footer and mobile/no-JS navigation. No design-system or animation rewrite.
- Keep home hero brand/H1 and portfolio intact. Refine the introduction and add
  contextual service links in existing text. Preserve CMS hooks and behavior;
  published CMS fields can override homepage fallback text.
- Keep titles concise, specific and aligned with purpose; synchronize normal,
  Open Graph, Twitter and generated page metadata. Legal metadata stays intact.
- Keep all six persistent Phase 2 Service IDs. Change only their page destinations
  where a detail page exists; use Home → Services → detail breadcrumbs there.
- Phase 1 discovers canonical pages for sitemap/redirects; extend existing checks
  to discover all public pages instead of freezing a five-page list.
- Preserve preview platform noindex and canonical production identity. Push a
  review branch/PR through the existing Vercel project; no Netlify publication.

## Metadata changes

| Page / field | Before | After |
| --- | --- | --- |
| Home — Title | Zyberlane \| Software, Web, AI & Automation \| Sri Lanka | Zyberlane \| Websites, Software & AI from Sri Lanka |
| Home — Description | Zyberlane builds software, websites, AI systems and automation with a practical project scope. Based in Sri Lanka, working remotely with businesses and creators. | Founder-led website, web application and AI automation development from Sri Lanka. Explore Zyberlane's work and discuss a project with Dilux. |
| About — Title | About Zyberlane \| Software, Web, AI & Automation | About Zyberlane \| Founder-led Development in Sri Lanka |
| About — Description | Meet Zyberlane, an emerging technology company focused on practical software, web experiences, AI and automation, founded by Dilukshan (Dilux). | Meet Dilux, Zyberlane's founder. Learn how this Sri Lanka-based technology business scopes, builds and reviews web, software and AI projects remotely. |
| Services — Title | Zyberlane Services \| Software, Web, AI & Automation | Development & Automation Services \| Zyberlane |
| Services — Description | Explore Zyberlane's web, software, mobile app, AI automation, integration and website optimization services. Discuss a project with us. | Compare Zyberlane's website, software, mobile app, AI automation and SEO services from Sri Lanka. Explore the scope and discuss your project with Dilux. |

Normal, Open Graph and Twitter text agree; the generated WebPage entities follow
the same metadata. Privacy/Terms metadata and the OG image remain unchanged.

## Official guidance used

- [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content):
  satisfy the visitor's task; there is no preferred word count.
- [Google title links](https://developers.google.com/search/docs/appearance/title-link):
  descriptive, distinct titles without repetition or keyword chains.
- [Google snippets](https://developers.google.com/search/docs/appearance/snippet):
  accurate page-specific summaries; snippets can be generated from visible text.
- [Google crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable):
  ordinary anchors with useful destination text.
- Phase 2's existing Schema.org vocabulary and production entity IDs remain the
  standard; no special AI schema or FAQ rich-result claim is introduced.

## Future evidence and review

Review actual Search Console impressions/queries after the separately approved
production release. Revisit the qualitative intent map against those observations
before expanding. Consider mobile/SEO detail pages only with distinct, verified
scope, practical answers and relevant proof. Case studies need owner-approved
client facts and must preserve portfolio category truth. No blog, case studies,
location pages, backlink program or new packages are part of this phase.
