# Phase 8: performance and Core Web Vitals

Internal audit, 2026-10-30. Public design, text, CSS, animation, effects, and page structure are frozen. The authoritative URL is `https://zyberlane.com`; Vercel remains a noindex preview. Production Netlify publication is deferred.

## Measurement scope and interpretation

Google's current good thresholds are LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile of real visits, separately for mobile and desktop where available. Source: [web.dev Web Vitals](https://web.dev/articles/vitals). [Google Search Central](https://developers.google.com/search/docs/appearance/page-experience) cautions against pursuing a perfect score solely for SEO.

**Field data:** no Search Console or CrUX account data was available in this audit. LCP, INP and CLS field values are unavailable. The deferred production release also means current production data would describe an older build.

**Browser lab data:** unavailable. The runner has the Playwright package but no Chromium executable; an attempt to install the official Playwright Chromium browser failed on the network download. The existing protected Vercel preview redirects this unauthenticated cloud browser to Vercel login. No Lighthouse timings, LCP element trace, interaction timings, screenshots, or pixel differences were measured. Do not interpret transfer sizes as CWV values.

**Static delivery baseline:** `node scripts/build.cjs`, before changing source. The gzip numbers below are local level-9 compression estimates, not observed CDN transfers. Counts are uncompressed UTF-8 HTML bytes, compressed estimates, external-script-tag counts and image-tag counts. Important content is present in initial HTML.

| Route | HTML bytes before | gzip estimate before | external scripts | images |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1,914,434 | 1,320,922 | 6 | 10 |
| `/about/` | 11,120 | 3,758 | 1 | 2 |
| `/services/` | 17,736 | 4,716 | 1 | 2 |
| `/services/web-development/` | 12,893 | 4,174 | 1 | 2 |
| `/services/web-app-development/` | 13,173 | 4,260 | 1 | 2 |
| `/services/ai-automation/` | 13,324 | 4,340 | 1 | 2 |
| `/work/divine-tattoo/` | 10,403 | 2,861 | 1 | 3 |

Initial production package: 29 files. Largest external assets: `zyberlane-logo.png` 346,301 bytes (1411x1411), `divine-tattoo-preview.jpg` 200,681 bytes (810x1536), `divine-tattoo-logo.jpg` 67,295 bytes (480x480). The home document additionally repeated the exact 346,301-byte logo as three base64 data URIs and contained a 329,492-byte JPEG data URI (1079x2109). This is the measured delivery bottleneck; repeated base64 also increases parsing work. Four inline images accounted for 1,824,532 characters of the document. There was no duplicate JavaScript package in the static output.

The homepage imports Google Fonts with preconnect to both Google origins and `display=swap`; the other pages use the same family request. A synchronous, SRI-pinned Supabase UMD script from jsDelivr appears near the end of the homepage; it is followed by CMS and booking logic. The raw static cards and contact content remain usable without that request. The homepage has a 1,900 ms loader with a later removal transition. Its hero reveal waits for the window `load` event, and the fluid initialization waits for the loader. The WebGL canvas already stops on document hiding; the Canvas2D fallback and reduced-motion behavior already exist. These paths may affect LCP or main-thread responsiveness, but impact cannot be ranked without a browser trace. Fonts, loader timing, and shader behavior are deliberately untouched.

Existing CSS supplies image geometry in the relevant components. The Divine Tattoo and review thumbnails already specify intrinsic image dimensions and lazy loading. The original four base64 images have no explicit width/height attributes; changing their geometry without screenshot comparison was rejected. The remaining asset requests are small apart from the existing portfolio preview. The root `_headers`/`vercel.json` preserve security controls and admin no-store; no immutable cache rule is set for mutable filenames. CDN cache hit rate and TTFB were not measurable here.

## Exact-byte optimization

- Replace three homepage logo data URIs with the already published `/assets/zyberlane-logo.png`. All three original decoded byte sequences had SHA-256 `c56f03457a856564eac62bbc9063a51d6dd2c213f7d542102ae12ac10b997321`, identical to this asset.
- Extract the existing Dilux Lane project JPEG without re-encoding to `/assets/dilux-lane-portfolio.jpg`; SHA-256 `441d81dd3b8df3a3214b4e400b4cc6fdd76f522a6e7141a7b8026bdd13e99550`. No crop, compression or color change was made.
- No other HTML bytes changed. Replacing the four new URLs with their original data URIs reconstructs the old homepage byte for byte. CSS, scripts, copy, metadata, portfolio categories, and the loader/fluid implementations are unchanged.

| Comparable local static measure | Before | After | Difference |
| --- | ---: | ---: | ---: |
| Home HTML bytes | 1,914,434 | 89,923 | -1,824,511 |
| Home HTML local gzip estimate | 1,320,922 | 22,738 | -1,298,184 |
| Home HTML gzip estimate + unique extracted image files | 1,320,922 | 698,531 | -622,391 (~47%) |
| Referenced standalone image files for these four placements | 0 | 2 | +2 requests on a cold cache |

The final row is a local size estimate, excluding headers, transport framing, CDN compression/caching behavior and unrelated assets. On a repeat visit the ordinary image URLs may be cached. It does not assert a measured LCP, FCP, TTFB, total browser transfer, or speed increase. The build now has 30 files. Only one new image file was added; the other is reused.

`tests/performance-budget.cjs` verifies the resulting HTML budget against the measured ~90 KB baseline with modest headroom, forbids image data URIs, checks the exact image hashes and production output, and guards the loader, fluid canvas and font family. No Lighthouse score is used as a unit-test target.

## Intentionally deferred

- Loader shortening/removal, hero reveal scheduling, fluid startup timing, shader changes, CPU fallback changes: visual behavior and measured impact need a controlled browser trace.
- Font family/weight removal or substitution: typography must stay exact and usage was not proved redundant.
- Image recompression, cropping, format changes, added lazy loading, width/height changes: would require viewport screenshot comparison and visual sign-off.
- CDN cache headers: mutable asset filenames make unconditional immutable caching unsafe; do not change CSP, admin protections or dashboard settings for this phase.
- Third-party or CMS rearchitecture: no measured evidence and functional risk; no new monitoring or analytics dependency.

## Release and measurement follow-up

Before approval, inspect the existing Vercel preview at 320, 390, 768, 1280 and 1440 px, checking home loader/hero/fluid/portfolio and the unchanged About, Services, three service pages and project page. Verify the new JPEG and logo requests return 200 and compare to the previous preview. Browser-based suites and screenshots remain an explicit verification gap in this environment. The owner can review Search Console CWV/CrUX mobile and desktop data when the approved build is eventually published to `zyberlane.com`, then compare p75 visits over matching periods. Search Console data from the currently older production deployment is not a before/after comparison for this branch. Do not deploy to Netlify as part of this phase.
