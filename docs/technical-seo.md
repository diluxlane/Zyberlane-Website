# Technical SEO foundation

This is a plain static HTML/CSS/JavaScript website. There is no framework router,
SSR runtime, production package dependency or package-manager install step.
The public pages are `/`, `/about/`, `/services/`, `/privacy-policy/` and `/terms/`.
Work, FAQ, Contact and the project-request form are homepage sections, not separate
pages. Their normal HTML links and their existing content are retained.

## Build and deployment

Run `node scripts/build.cjs` to produce `dist/`. Netlify uses `netlify.toml` to run
this command and publish that directory. The existing Vercel configuration builds
the same static files. Neither configuration creates a new deployment project.

The build copies HTML verbatim, the public `assets/` directory, root public
HTML/text/XML/icon files, and Netlify's `_headers`. Internal `docs/`, `security/`,
`scripts/`, `tests/`, hidden files, symbolic links and package/deployment state are
excluded. Authentication and CMS logic are unchanged. The admin login shell is
retained with its existing `noindex, nofollow`, no-store header and authorization.
Noindex and robots directives do not provide authentication.

The build generates and versions `sitemap.xml` and `_redirects`:

- Sitemap URLs come from each indexable page's canonical, not a second URL list.
- Non-production, query/fragment and mismatched file-path canonicals fail the build.
- Pages with `noindex` and ownership-verification HTML are excluded from the sitemap.
- There are no guessed `lastmod` dates. Add dates only with a reliable source of
  meaningful content-modification times.
- Explicit `index.html` variants permanently redirect to the existing directory URL.
- The known `zyberlane.netlify.app` hostname redirects to `https://zyberlane.com`,
  preserving paths and normal Netlify query-string handling. Arbitrary preview
  hostnames are not redirected.
- Root Google/Bing verification files are copied verbatim. No verification records
  or tags are replaced. DNS-based verification remains account-managed.

For a new public page, use a directory containing `index.html`, add the ordinary
HTML navigation link, and put shared resources under `assets/`. Set its canonical,
unique title, description and social metadata in its HTML head, then run the build
and checks. Internal source files belong in the excluded directories.

## Crawler policy

`robots.txt` intentionally keeps the pre-existing wildcard public allow and admin
exclusion. This permits Googlebot, Bingbot, OAI-SearchBot and GPTBot on public pages.
GPTBot has no explicit override; its existing wildcard permission is unchanged.
Search retrieval eligibility is distinct from model-training policy and does not
guarantee crawling, indexing, citation or ranking.

Public contact email links use Cloudflare's documented `email_off` comments so
their text and `mailto:` links remain readable in initial HTML. This only exempts
those already-public business links; it changes no global Cloudflare setting.

On 2026-10-25, public pages, robots and sitemap returned 200 to browser, Googlebot,
Bingbot and OAI-SearchBot user-agent probes. Generic Python requests received 403
with Cloudflare error 1010. User-agent probes do not verify requests from the real
crawlers' IP ranges. Cloudflare Security Events and verified-bot rules require
owner/account access to assess that separate infrastructure policy.

## Verification

```sh
node scripts/build.cjs
node tests/technical-seo.cjs
node security/verify.cjs
node tests/reviews-faq.cjs
node tests/fluid-compatibility.cjs
node tests/portfolio.cjs
node tests/technical-seo-browser.cjs
```

The last two checks require development-only Playwright and Chromium.
`PORTFOLIO_BROWSER` selects an installed browser executable. Browser checks cover
the built pages on desktop/mobile with JavaScript enabled and disabled. External
CMS/fonts are intentionally excluded in local tests and need live verification.
There is no configured linter, TypeScript compiler or production dependency install.

After release, verify the real production HTTP statuses, redirects, sitemap XML,
metadata, private/source-route exclusions, crawler probes, navigation, mobile
rendering and console. A local test server is not proof of Netlify/CDN behavior.

Strategic metadata rewrites, content expansion, entity/schema expansion, case
studies and broader performance work are outside this phase.
