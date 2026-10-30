> Historical phase record. Current agency positioning, service ownership, ten-route sitemap and portfolio navigation supersede conflicting older copy/counts here. See [agency-repositioning.md](agency-repositioning.md). Technical safeguards remain applicable.

# Client proof and case-study record

## Divine Tattoo

- **Classification:** Client Project. The homepage card uses `data-project-category="client-projects"` and describes that category as work created for actual clients.
- **Client/project name:** Divine Tattoo.
- **Verified project scope used publicly:** Zyberlane's homepage portfolio and Web Development page describe a responsive studio website, an artwork gallery and a custom content-management workflow.
- **Observable public work:** The linked public site at `https://divinetattoo.netlify.app/` was inspected on 2026-10-28. It loaded and visibly included a tattoo portfolio/gallery, service information, artist profiles, studio information and consultation/contact links. This verifies public site content, not private backend implementation.
- **Live project destination:** `https://divinetattoo.netlify.app/`, retained as an external project link. It is not used as a Zyberlane canonical, metadata identity or structured-data entity ID.
- **Related Zyberlane service:** `/services/web-development/`.
- **Project-page route:** `/work/divine-tattoo/`.

### Evidence sources

- `index.html`: the static project card, its `client-projects` classification, preview image, description and live project link; the Divine Tattoo testimonial and its named attribution/source link.
- `services/web-development/index.html`: the existing responsive website, gallery and custom content-management workflow description.
- `assets/divine-tattoo-logo.jpg`: existing client identity asset used on the project page.
- `https://divinetattoo.netlify.app/`: direct observation of the currently public website, limited to visible content and navigation.

The project scope text is a Zyberlane portfolio claim corroborated by the related service page. The public website shows the gallery and other visible page areas. The admin interface, underlying content-management implementation, technologies and division of individual work were not inspected or inferred.

### Review handling

The case-study page uses one exact short excerpt already present in the homepage's public testimonial: “The design is modern, professional, clean, and perfectly matches my brand.” It attributes the quote to Asanka Mahesh and Divine Tattoo and links to the same public Google reviews destination used on the homepage. It does not add stars, ratings, stronger wording or a new review. No `Review` or `AggregateRating` structured data is used. The testimonial remains ordinary visible text; Google says self-serving reviews for an organization's own site are not eligible for review snippets.

### Structured data choice

The route has a `WebPage` with the existing Zyberlane `WebSite` and `Organization` relationships and a breadcrumb. Its main entity is a Schema.org `CreativeWork` representing the documented client website project, created by the Zyberlane Organization and tied to this page through `mainEntityOfPage`. The page references the existing Web Development `Service` entity using `mentions`; the visible page also links to the service. No `CaseStudy` type, client Organization, business-result data, product, rating or local-business entity is created.

### Assets

The homepage card and project page reuse `assets/divine-tattoo-logo.jpg` (68 KB in the repository). The existing `assets/divine-tattoo-preview.jpg` contains an unverified “3,671+ happy clients” claim, so it is not displayed on either page. The source image is retained in the repository. No new or generated project imagery was added.

### Facts intentionally omitted

No project dates, duration, budget, team composition, implementation stack, private CMS details, before/after comparison, analytics, traffic, conversion, revenue, booking or lead results, search rankings, awards, certifications or quantified business outcomes were available in the inspected repository or public site. None are claimed. Current public-site copy includes business statistics, but they were not used as verified project outcomes.

## Requirements before adding another public case study

Confirm and record:

- Client and project name, with the portfolio classification confirmed as a genuine Client Project.
- Permission to identify the client and show supplied or captured project imagery where needed.
- The public project URL and confirmation that it remains suitable to link.
- Delivered scope and individual features, supported by repository evidence, client-approved details or observable public functionality.
- Screenshots that do not contain unsupported claims, private data or unapproved client materials.
- Technologies only when confirmed from the implementation.
- Any testimonial in its original wording, with clear attribution and an authoritative public source.
- Outcome metrics only when there is direct evidence and permission to publish them.

Concept Projects and Design Studies must stay in their existing categories and must not be represented as client engagements. Do not create public placeholder entries.
