# Phase 9 — search performance and indexing measurement

Internal baseline recorded 2026-10-30 (Sri Lanka). This is a measurement plan, not a claim of rankings, indexing, traffic or AI citations. Main contains Phases 1–8: PRs #40 (AI search), #41 (Bing/IndexNow), #42 (external authority) and #43 (performance) are merged. The older Netlify production release has not been republished; the existing GitHub-connected Vercel project is preview only and noindex. Never evaluate unpublished pages as though they have had time to rank.

## Production versus repository, observed on 2026-10-30

Read-only HTTP GETs of `https://zyberlane.com` returned the following. The root robots file says `User-agent: *`, `Allow: /`, `Disallow: /admin/`, and points to the production sitemap. No `X-Robots-Tag` was present on the five inspected 200 pages; each had `<meta name="robots" content="index, follow">` and one production canonical. A 200 and an indexable directive establish availability, **not Google or Bing indexing**. The actual production sitemap contains five URLs and old `lastmod` values; main's generated sitemap contains nine canonical URLs and omits speculative `lastmod`.

| Intended canonical path | Current production HTTP | Live sitemap | Main build sitemap | Production title (where checked) | Production canonical / robots |
| --- | ---: | --- | --- | --- | --- |
| `/` | 200 | Yes | Yes | `Zyberlane \| Software, Web, AI & Automation \| Sri Lanka` | `https://zyberlane.com/`; index, follow |
| `/about/` | 200 | Yes | Yes | `About Zyberlane \| Software, Web, AI & Automation` | `https://zyberlane.com/about/`; index, follow |
| `/services/` | 200 | Yes | Yes | `Zyberlane Services \| Software, Web, AI & Automation` | `https://zyberlane.com/services/`; index, follow |
| `/privacy-policy/` | 200 | Yes | Yes | `Privacy Policy \| Zyberlane` | `https://zyberlane.com/privacy-policy/`; index, follow |
| `/terms/` | 200 | Yes | Yes | `Terms & Conditions \| Zyberlane` | `https://zyberlane.com/terms/`; index, follow |
| `/services/web-development/` | 404 | No | Yes | No live page | Main source has production canonical; no live page to inspect |
| `/services/web-app-development/` | 404 | No | Yes | No live page | Main source has production canonical; no live page to inspect |
| `/services/ai-automation/` | 404 | No | Yes | No live page | Main source has production canonical; no live page to inspect |
| `/work/divine-tattoo/` | 404 | No | Yes | No live page | Main source has production canonical; no live page to inspect |

All nine pages are present in `dist/` after `node scripts/build.cjs`. The previous Phase 8 Vercel branch deployment was READY, but a protected preview cannot be independently crawled from this environment; its route and header behavior should be checked during owner review. Main, not an open older PR, is the base for this record. The three existing production pages serve the earlier metadata, so present production query data describes an earlier release.

## Source definitions and collection rules

- [Google Search Console Performance](https://support.google.com/webmasters/answer/7576553): clicks, impressions, CTR = clicks / impressions, and average position; dimensions include query, page, country, device, search appearance and date. Fix the search type to Web (text-based) for the core comparison; record other types separately. Record property, time zone, date window, search type, filters and export timestamp. Google can assign performance to its selected canonical. A chart total is property aggregated; page tables can aggregate differently and need not sum to chart totals. Some queries are anonymized. Do not sum exported CTR or average-position rows, or mix chart and page totals.
- [Google URL Inspection](https://support.google.com/webmasters/answer/9012289) and [Page indexing](https://support.google.com/webmasters/answer/7440203) require verified property access. No account results were available. Record inspected URL, Google-selected canonical, index decision/reason, crawl/robots status and inspection timestamp. Do not equate 200 or a `site:` result with complete indexing coverage.
- [Bing Search Performance](https://www.bing.com/webmasters/help/search-performance-c680da36): clicks, impressions, CTR and average position for Web and Chat sources; crawl requests, crawl errors and indexed pages in crawl/indexing reporting. Keep source/vertical explicit; Bing says keyword and page tables cover Web, while Chat appears in source-level reporting. Bing data starts when the property is added and may not be backdated. [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) is an additional public-preview report for supported AI citation activity, cited pages and grounding queries if available in the owner's account. Citation counts are not rankings.
- [Search Console Core Web Vitals](https://support.google.com/webmasters/answer/9205520): CrUX real-user field data for mobile/desktop LCP, INP and CLS in groups, generally at the 75th percentile. No field values were available in Phase 8 or now. Too little data can mean no report; that is not a failed score. Do not compare a Lighthouse lab run with CrUX field data or assume the old production release's history reflects this new build.
- [Google's clicks/impressions/position definitions](https://support.google.com/webmasters/answer/7042828) explain that position is an impression-based average, not a fixed rank. Results vary by query, locale, device and time. Google Search Console Web data may include Google AI features; it does not provide a dependable standalone ChatGPT/AI-overview ranking metric.

## Current agency query taxonomy (supersedes the Phase 3 grouping)

Use observed queries first; the examples below are labels for classifying exports, not a promise of impressions or an exhaustive keyword list. Normalize case/whitespace. Mark queries containing `zyberlane` or `zyberlane.com`, including `dilux zyberlane`, **branded** before applying service themes. A bare `Dilux` query is not automatically brand demand. Assign each observed query to one primary group; label uncertain or mixed intent `other / review`, rather than force a service match.

| Group | Observed-query classification examples | Intended destination |
| --- | --- | --- |
| Branded | `zyberlane`, `zyberlane.com`, `dilux zyberlane` | `/`, sometimes `/about/` |
| Web design / development | business website, landing page, website redesign, custom web application | `/services/web-development/`; application intent may use `/services/web-app-development/` |
| Branding | brand identity, logo design, creative direction | `/services/#branding-creative` (conditional scope; export page as `/services/`) |
| Digital marketing | campaign planning, digital marketing strategy, channel coordination | `/services/#digital-marketing` (conditional scope) |
| SEO / AEO / GEO | technical SEO, search visibility, answer engine optimization, generative discovery | `/services/#seo-web-optimization` |
| Paid advertising | Google Ads, Meta Ads, Facebook / Instagram advertising | `/services/#digital-marketing` (expertise confirmation required) |
| Social / content | social creatives, content planning, video editing, motion assets | `/services/#social-content` (conditional scope) |
| Automation | AI assistant, business workflow, tool integration | `/services/ai-automation/` |
| Other / review | ambiguous or mixed non-branded query | Manual review |

These classify actual exports; they do not claim keyword demand or current specialist availability. Apply branded precedence, then specific paid/search/social families before generic digital marketing. Keep a `query_group` column using the labels above. Preserve prior taxonomy exports and annotate the repositioning release date; do not compare renamed groups without remapping the original queries. Query fragments are not separately indexable landing pages.

Page groups: `/` (brand introduction), `/about/` (founder/trust), `/services/` (overview), the three individual service routes above (distinct commercial intents), `/work/` (portfolio collection), and `/work/divine-tattoo/` (real client proof). `/privacy-policy/` and `/terms/` are tracked for indexing hygiene, not commercial query goals. Only canonical `https://zyberlane.com` URLs count; no Vercel or Netlify preview hostname belongs in exports. Review any query showing the wrong landing page for intent, but do not assume a second page is needed.

Country/device slices: Sri Lanka versus any actually observed international country (no invented international demand); Mobile versus Desktop. Keep country and device as separate filters first, then cross-filter only when there is enough data. Compare brand and non-brand separately and keep low-volume rows directional rather than statistically conclusive. CTR must be interpreted with impressions, position distribution, SERP features and intent; do not rewrite titles on a low-CTR number alone.

## Release baseline and follow-up

1. Immediately before the owner-approved Netlify release, save the exact release date/time, commit and ten-route sitemap expectation. Export the last complete 28 days of Google Web performance (site chart, Queries, Pages, Countries, Devices and Search appearance) with filters noted. Save Bing Web/Chat and crawl/indexing snapshots **if** the property is already verified and data exists. This is an older-production baseline, not a baseline for any page URLs absent at the time of that export; mark their pre-release page metrics **N/A**, not zero.
2. After the owner publishes the approved build, check all ten intended canonical URLs for 200, production canonical, no `noindex`, sitemap inclusion and working internal links. Confirm the one production sitemap has ten expected URLs. In Search Console inspect URLs in order: `/`, `/services/`, `/services/web-development/`, `/services/web-app-development/`, `/services/ai-automation/`, `/work/`, `/work/divine-tattoo/`, `/about/`, then the two legal pages. In Bing use URL Inspection/Site Explorer and submit the existing sitemap after verification. Do not repeatedly request indexing.
3. If changed production URLs are notified through the Phase 6 explicit IndexNow tool after publication, record exact URL, submission time, HTTP response and prior 200 availability. A 200/202 API acknowledgment is not evidence of crawling, indexing, ranking or attribution. Never notify preview-only or currently 404 URLs.
4. At **7 days**, review release/technical signals: route availability, submitted sitemap, indexing reasons, crawl errors, major impressions/click movement and data completeness. Do not draw a traffic winner from hours or one week. At **28 days**, compare like-for-like completed 28-day windows where possible: brand/non-brand, pages that existed in both periods, Sri Lanka and device slices. Report new page discovery separately. At **90 days**, inspect sustained trends across matching 28-day or monthly periods, accounting for seasonality, campaigns and search changes. Keep raw exports and report dates; do not claim causality merely from a before/after line.
5. Use [the blank CSV template](search-measurement-template.csv) for manually normalized export rows. One row is one dimension/filter/window/source combination; `dimension` states whether it is a site chart, query, page or other slice. Do not combine duplicate aggregations or sum query rows into site totals. Blank metrics mean unknown, not zero. There is no API key, tracking tag or frontend script in this phase.

## Per-URL indexing register

Start all Google/Bing fields as **unknown** until account inspection. For each of the ten production canonicals above, capture the following after release (one row per engine and inspection): URL; intended canonical; live HTTP; robots/noindex; live sitemap presence; engine-reported indexed status/reason; engine-selected canonical where exposed; last crawl/inspection date; inspector; evidence link/screenshot. Preserve the difference between `not indexed`, `not verified`, and `unknown`. A published page can legitimately take time to be discovered; troubleshoot actual reasons before changing copy.

## Fixed AI/retrieval observation set

Keep the existing seven prompts as a historical baseline. After the agency release add one fixed, separately recorded prompt per new query family (branding, digital marketing, paid ads, social/content and SEO/AEO/GEO); save the exact wording before comparisons. Use these seven historical prompts, recorded verbatim with system, date/time, region/language if known, fresh-session method, whether Zyberlane appeared, whether `zyberlane.com` was cited, cited destination and obvious factual errors:

1. `Who is Zyberlane?`
2. `What does Zyberlane do?`
3. `Zyberlane Sri Lanka`
4. `website developer Sri Lanka`
5. `web development company Sri Lanka`
6. `AI automation Sri Lanka`
7. `web application development Sri Lanka`

Run the same small set before release (clearly marked old production) and after publication/indexing at comparable intervals. Observations are snapshots, not stable rank positions, guaranteed citations or a complete view of AI search. When available, use Bing AI Performance's owner report as a separate source; do not combine its counts with manual prompts. Search Console cannot be used to claim a separate ChatGPT citation count.

## Decision rules

| Observation after publication | First investigation | Content action |
| --- | --- | --- |
| Canonical page stays unindexed after a reasonable discovery interval | Inspect engine reason, HTTP, robots, sitemap, canonical and internal links | Only after a specific cause is known |
| No impressions on a new page | Confirm published and indexed; check query demand/intent fit and data lag | No automatic rewrite |
| Impressions rise, clicks do not | Split brand/non-brand, page, country, device, position and SERP context; check sample size | Consider later only if a persistent mismatch is clear |
| Unexpected page earns a service query | Compare the current agency intent ownership and internal paths | Fix a demonstrated ownership issue; no duplicate doorway page |
| Average position changes | Inspect query/page/country/device trend and impression volume | Never assert a single fixed rank from an aggregate |
| Bing/AI citation appears or disappears | Save query, cited URL, system, dates and factual accuracy | Observation alone is not proof of a ranking mechanism |
| CWV report has no data | Check property/device and CrUX sufficiency | Do not call it a performance failure |

The next phase can use this evidence for a full release-readiness audit. Do not start Phase 10 or publish to Netlify from this document.
