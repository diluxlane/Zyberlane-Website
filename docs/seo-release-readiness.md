# Final SEO / AEO / GEO release-readiness audit — Phase 10

Audit date: 2026-10-30 (Sri Lanka). Source: GitHub `main` commit `9c7b0dd3320d41c2b6568d80827cbb2275a98f42`. **Status: ready for owner review; no verified repository-level technical release blocker.** This does not approve the current visual presentation or publish the build. Netlify production is intentionally older. The owner controls the later publication.

## PR ancestry and merge decision

GitHub PR metadata and first-parent Git history show a linear sequence, with each later PR based on main after the preceding phase had merged. There are no open Phase 1–9 SEO PRs, no stacked unmerged branch, and no remaining Phase 1–9 merge order. PR #39 followed an intervening README commit (`2071175`). Phase 1's PR #36 appears on first-parent history as the merged technical SEO commit. Full IDs are recorded here to avoid treating a still-existing branch as an unmerged PR.

| PR | Title | State | Base SHA | Head SHA | Merge SHA |
| --- | --- | --- | --- | --- | --- |
| #36 | Technical SEO and crawler accessibility foundation | Merged | `57db447fa9cc7a06e15d2368f5a09d8d5c35c946` | `2f165e90199d5f22ab1522195106c49bf60d4854` | `3de39d760408a4c22228557087d4f48d0c31555a` |
| #37 | SEO entity and structured data foundation | Merged | `3de39d760408a4c22228557087d4f48d0c31555a` | `03688a6d8c2394f3a2769bb98d79ff33ba3f8d39` | `211ce20fe5a6b13a053197f95c0a04cff5729ab3` |
| #38 | Search intent and service SEO architecture | Merged | `211ce20fe5a6b13a053197f95c0a04cff5729ab3` | `c5fbc1e2cb5ae84eadcc0bd1649e06f2456ab291` | `089dbf54a59751a8cc7a0ffb24f1d344bbd2d19e` |
| #39 | Add real client proof and Divine Tattoo case study | Merged | `207117584a3d5968717796ac9e3db49341a3acfb` | `05a2a9d8203dc7b1f152cf5564ba5e9b17064f76` | `02fe9d7a6efc1afd9515219d08d6ef3bdb74a000` |
| #40 | Verify AI search and crawler readiness | Merged | `02fe9d7a6efc1afd9515219d08d6ef3bdb74a000` | `d348ae7d74938a3b594272b2b4c06cd6b8704fb9` | `e54bd322c9c3fd035dc11123c0c99b6606730e7a` |
| #41 | Add Bing and IndexNow discovery foundation | Merged | `e54bd322c9c3fd035dc11123c0c99b6606730e7a` | `5fccb505ea4fa7785f41ff8a0999fabef9c6c50c` | `426453e4fdd94499d0e18b4c441026a942a01dd8` |
| #42 | Document external authority and review strategy | Merged | `426453e4fdd94499d0e18b4c441026a942a01dd8` | `645d91e041c32871109726dbf679107cc95b4731` | `2a334553fdbffec175263eede3f60dea1fb57690` |
| #43 | Optimize performance without visual changes | Merged | `2a334553fdbffec175263eede3f60dea1fb57690` | `465f96733b2c31532a82171ba36a0168849a382b` | `9ffc6fefdd7469f587b674dd5297928b3be685a9` |
| #44 | Add search performance measurement framework | Merged | `9ffc6fefdd7469f587b674dd5297928b3be685a9` | `34b579bf0e2b10e349c8956a81b08b074c02ff35` | `9c7b0dd3320d41c2b6568d80827cbb2275a98f42` |

Dependency chain: #36 → #37 → #38 → #39 → #40 → #41 → #42 → #43 → #44 → current main. **Merge plan:** review and merge only this Phase 10 documentation PR if acceptable. Do not remerge old PRs or retarget branches. PR #43 was already merged without browser pixel comparison in this environment; its owner visual review is now a **pre-production release gate**, not an achievable pre-merge gate.

## Intended URL and production boundary

`scripts/build.cjs` discovers one canonical per indexable source page and generates a single `https://zyberlane.com/sitemap.xml` containing these nine URLs. No duplicate, admin, preview, documentation or test URL is included. The root ownership key is a deliberately public non-page file.

| Category | Canonical URL path | Production at audit |
| --- | --- | --- |
| Primary business | `/` | 200 |
| Company | `/about/` | 200 |
| Service overview | `/services/` | 200 |
| Service detail | `/services/web-development/` | 404 — expected until approved publication |
| Service detail | `/services/web-app-development/` | 404 — expected until approved publication |
| Service detail | `/services/ai-automation/` | 404 — expected until approved publication |
| Client project | `/work/divine-tattoo/` | 404 — expected until approved publication |
| Legal | `/privacy-policy/` | 200 in Phase 9 audit |
| Legal | `/terms/` | 200 in Phase 9 audit |

The live sitemap still has five URLs; the production IndexNow key path returns 404. Those are expected release-state differences, **not repository defects**. After publication, all nine routes and the key must be available. A 200 and allowed robots access are eligibility basics, not proof of indexing or ranking: [Google technical requirements](https://developers.google.com/search/docs/essentials/technical).

## Combined technical findings

| Area | Finding / evidence | Release status |
| --- | --- | --- |
| Robots | `User-agent: *`, `Allow: /`, `Disallow: /admin/`; one production sitemap directive. Googlebot, Bingbot and OAI-SearchBot inherit public access; no GPTBot-specific override. | Repository ready |
| Canonical and OG | Nine source/built pages each have one production canonical, matching OG URL and index/follow metadata. No preview or localhost canonical. | Ready in build |
| Sitemap | Nine unique production URLs, generated from canonical HTML; no speculative `lastmod`, admin or internal entries. Live production has five until release. | Ready in build; deploy pending |
| Redirects | Netlify `_redirects` includes old Zyberlane Netlify host → production and all built `/index.html` variants including nested project and service paths. Vercel `vercel.json` explicitly covers root, one-segment pages and nested services; nested project index variant on Vercel was not independently probed. No preview → production redirect is configured. | Production rules ready; preview variant check recommended |
| Preview | Prior Vercel checks documented `X-Robots-Tag: noindex`; phase tests ensure production identity under preview variables. The current protected preview's response headers could not be independently rechecked. | Owner verification gate; no policy change |
| Static content / links | Titles, H1, core service copy, navigation and JSON-LD are in initial HTML; technical suite validates internal paths/fragments and local assets. CMS metadata synchronization test passes. | Ready in build |
| Structured data | Valid connected Organization, WebSite, Person, six Service definitions, page types, breadcrumbs and Divine Tattoo CreativeWork; 28 unique definitions, 198 property/range checks. Stable production IDs; no Review/AggregateRating, fake address, employee, award, result or offer. | Ready in build; no rich-result promise |
| Service intent | Home/overview serve introduction and choice; three service details own website, web application and AI/automation intents. No extra doorway/city pages. Cannibalization can only be evaluated with post-release query/page data. | Ready; data later |
| Client proof | Divine Tattoo is classified as Client Project; concept/design categories remain separate. Scope is factual, links to Web Development and the live client site; no invented outcomes or review schema. | Ready in build |
| OpenAI | OpenAI recommends OAI-SearchBot robots and published crawler IP access: [official crawler guide](https://developers.openai.com/api/docs/bots). Repo allows it; genuine IP passage through Cloudflare/CDN is unverified. Spoofed User-Agent 200 probes are not proof. | Repository ready; infrastructure check if needed |
| Google AI | [Official guidance](https://developers.google.com/search/docs/appearance/ai-features) requires normal Search fundamentals, textual content and matching visible schema; no special AI schema/file. `llms.txt`/`ai.txt` absent by design. | Technical fundamentals ready; no inclusion promise |
| Bing | Sitemap/robots compatible. No fabricated verification token; property import from Search Console or actual owner-provided verification is an account action. | Account action pending |
| IndexNow | 32-character key matches root filename/content and production keyLocation; CLI limits URLs to canonical production origin, deduplicates, rejects admin/internal/preview/localhost, dry-runs offline and requires explicit `--submit --production-release`, live key and live URL checks. Build/preview never submit. **No live POST.** | Ready in build; wait for release |
| External authority | Internal audit permits genuine reviews/attribution, rejects incentives/link schemes/spam. The Divine Tattoo footer credit currently points to old `zyberlane.netlify.app`; client-approved update to authoritative domain is documented, not made. GBP eligibility/address needs owner verification. | Non-blocking owner/client work |
| Performance | Phase 8 reused identical logo bytes and extracted an identical JPEG: home HTML 1,914,434 → 89,923 bytes, local gzip estimate 1,320,922 → 22,738. No demonstrated LCP/INP/CLS change. Images, typography and effects remain byte/code identical except four image source references. | Delivery improvement verified; browser/field metrics unknown |
| Measurement | Phase 9 document and blank CSV cover brand/non-brand, service/page groups, indexing, Google/Bing, AI observations and 7/28/90-day windows. No fabricated traffic or CWV values. | Ready for owner exports after release |
| Security | CSP hashes/hosting parity, script SRI, frame/content-type/referrer protections, admin noindex/no-store and client-side publishable Supabase key verified by repository checks. Authentication and RLS are not authenticated live-tested here; `noindex` is not access control. Public IndexNow key is not a password. | Static checks pass; live auth remains separate verification |
| Build isolation | `dist/` has 30 files: nine indexable page HTML files, admin HTML with noindex, 15 assets, key, robots, sitemap, `_headers`, `_redirects`. No `docs/`, `tests/`, `scripts/`, `security/`, `.git/`, `.env` or source SQL. | Ready |

Domain reference classification: the old `zyberlane.netlify.app` string is confined to the intended redirect rules and internal notes; `divinetattoo.netlify.app` is the legitimate external client site; `diluxln.netlify.app` is a separate external founder portfolio link. None is a canonical, OG URL, sitemap URL, JSON-LD identity or IndexNow host. Search/asset checks found no missing local references. No obvious doorway, cloaking, hidden AI content, keyword stuffing, scaled pages, review markup misuse or link manipulation was added. This is a code/content audit, not a guarantee against a search policy determination: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

### Historical evidence note

`docs/client-proof-case-studies.md` describes unused `assets/divine-tattoo-preview.jpg` as containing an unverified “3,671+ happy clients” claim. Direct visual inspection of the *current* 810×1536 asset shows the client's hero screenshot and no visible count. The image is not referenced by public HTML, though the general asset copy includes it in `dist/`. The historical description and current bytes cannot be reconciled from available evidence; no client metric is used on the site. This is a documentation reconciliation item, not a verified public-page defect or a reason to alter visuals in Phase 10.

## Gates and backlog

**Verified technical blockers:** none in the combined repository build/tests. Production's four 404s and key 404 are expected before publication; they would become release blockers **if still present after publication**. Current preview header response, browser interactions, actual crawler IP passage, authenticated admin/RLS and live CDN redirect outcomes remain unverified rather than passed.

**Required owner release gate:** inspect the already-merged Phase 8 image-source change on the existing Vercel preview before publication. At minimum desktop/mobile Home, portfolio JPEG, logo, hero, 1.9-second loader, fluid background and portfolio rail; include 320/390/768/1280/1440 px where possible. A browser pixel test was unavailable during PR #43, so do not call it visually approved without the owner's check. Also review the known earlier visible changes from Phase 3/4 and decide whether to accept them for release or defer publication until visual restoration.

**Recommended, not technical blockers:** verify Bing/GSC account setup; inspect Google Business Profile details and genuine review attribution; obtain client approval before updating the old credit URL; inspect Cloudflare Security Events for *real verified* crawler IPs if indexing/access problems appear. Reconcile the historical unused preview-image note when maintaining evidence docs.

**DEFERRED — VISUAL RESTORATION:** compare Home/About/Services revised copy/links, three new service-page compositions, Divine Tattoo case-study page, portfolio/card surfaces, mobile spacing and any owner-reported visual regressions against the last approved historical baseline. Do not repair them in Phase 10. No Phase 10 public visual changes.

**DEFERRED — POST-RELEASE DATA:** actual Google/Bing indexing, CTR/queries, cannibalization, AI citations, field CWV and rankings. Use `docs/search-performance-measurement.md` without treating older-production data as a test of unpublished pages. Google's current [AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) also mentions a Generative AI performance report; inspect availability in the owner's Search Console account later rather than inventing numbers.

## Controlled release checklist

### Phase 10 review (no production action)

1. Confirm #36–#44 are merged into main at or after the SHA above. Review this Phase 10 PR; merge it only after owner review. No older PR remerge/rebase/retarget is needed.
2. Confirm all current non-browser tests and JS syntax checks pass; do not call browser suites green without a usable Chromium runtime.
3. Owner reviews Phase 8 visual fidelity and decides the release/visual-restoration boundary. Verify the existing Vercel preview's `X-Robots-Tag: noindex`, its nine routes and important interactions, plus `/work/divine-tattoo/index.html` behavior if convenient. Never redirect preview to production or use preview host in SEO IDs.

### Immediately before owner-controlled Netlify publication

4. Record final reviewed main commit and the pre-release Search Console 28-day snapshot if available. Confirm the intended sitemap count is **nine**, the canonical host is `https://zyberlane.com`, and production still intentionally has the older release.
5. Owner manually publishes exactly that approved main build to Netlify. The assistant does not log in, deploy, change settings or spend credits in this phase.

### After publication, before search notifications

6. Check each of the nine paths in the URL table for HTTP 200, expected canonical, index/follow/no noindex header, readable content and important links. Check `/robots.txt` public allowance and `/admin/` exclusion; check `https://zyberlane.com/sitemap.xml` has exactly the nine canonical URLs; verify root IndexNow key file returns the exact key. Check `/index.html`, nested variants and old-host redirects for same intended destination without loops. Check real production CDN/security headers and owner-controlled authentication separately.
7. Only after the production key and each selected changed URL are live, run `node scripts/indexnow.cjs --dry-run --url https://zyberlane.com/<changed-route>/` for the small approved set. The script accepts multiple `--url` arguments. Owner may explicitly run the same set with `--submit --production-release`; record result. Do not notify unchanged or still-404 URLs, and never run in Vercel preview. This is optional discovery, not a ranking guarantee.
8. In Search Console confirm the sitemap and inspect priority URLs; in Bing import/verify property and submit the same sitemap. Do not request indexing repeatedly. If genuine crawlers fail, examine Cloudflare/hosting logs and published IP ranges before changing rules.
9. Record release date/commit and use Phase 9's **7-day technical**, **28-day directional**, **90-day trend** review schedule. Unpublished pages have no valid pre-release page baseline. No ranking or AI citation promise.

The next project after this final SEO audit is **Zyberlane Visual Restoration**, not another SEO phase.
