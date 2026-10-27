# Zyberlane Website

Official website repository for **Zyberlane**, a founder-led software and digital solutions studio.

**Live website:** https://zyberlane.vercel.app

## Overview

This repository contains Zyberlane's public-facing website and its supporting static pages, assets, SEO files, security configuration and browser-side integrations.

The website presents Zyberlane's services, selected work, company information and project inquiry flow. The current implementation is primarily static HTML, CSS and JavaScript, with Supabase used for supported backend functionality.

## Highlights

- Responsive multi-page company website.
- Service and project presentation.
- Project inquiry/contact experience.
- About, privacy-policy and terms pages.
- Search-engine files including `robots.txt` and `sitemap.xml`.
- Security headers and Content Security Policy configuration.
- Supabase-backed browser functionality where required.
- Vercel configuration for Git-based previews and hosting.

## Tech Stack

- **HTML / CSS / JavaScript** — core website implementation
- **Supabase** — database, storage and authentication-backed functionality
- **Vercel** — hosting and Git-based deployment
- **jsDelivr** — pinned browser-library delivery where used
- **Google Fonts** — web typography where used

## Repository Structure

```text
index.html          Main website
about/              About page
services/           Service pages
privacy-policy/     Privacy policy
terms/              Terms and conditions
admin/              Existing administrative interface
assets/             Images and shared static assets
docs/               Project documentation
security/           Security audit and verification material
scripts/            Repository utilities
robots.txt           Crawler directives
sitemap.xml          Sitemap
vercel.json          Vercel configuration
```

## Local Development

This project does not require a framework build step for the core static site. Serve the repository with a local HTTP server rather than opening pages directly from the filesystem when testing browser behavior.

For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

The repository is connected to Vercel for Git-based deployment.

**Production Vercel URL:** https://zyberlane.vercel.app

Repository documentation should use the verified Vercel URL above for the hosted preview/site reference.

## Security and Data

Do not commit private credentials, service-role keys, passwords or confidential client data.

Browser-accessible Supabase configuration must remain limited to values designed for public client use, with authorization enforced by database policies and application controls. Security-related repository material is documentation and verification support; it should not be treated as a substitute for reviewing the deployed system.

## Credits

- Website and Zyberlane-specific implementation maintained by **Zyberlane**.
- Zyberlane branding, original copy, logos and project-specific visual assets remain associated with their respective rights holder(s).
- Supabase, Vercel, Google Fonts, jsDelivr and other third-party technologies remain subject to their own terms and licenses.
- Client brands, trademarks, photographs and supplied materials remain the property of their respective owners.

## Copyright and License

No repository-wide open-source license is provided.

Public visibility of this repository does not by itself grant permission to reuse Zyberlane branding, site-specific design, original content, client materials or proprietary project assets. Third-party code, fonts, libraries, trademarks and media remain subject to their original licenses and ownership.
