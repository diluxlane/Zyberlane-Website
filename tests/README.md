# Zyberlane regression checks

Run these dependency-free checks from the repository root:

```sh
node scripts/build.cjs
node tests/technical-seo.cjs
node tests/entity-seo.cjs
node tests/search-intent-seo.cjs
node security/verify.cjs
node tests/reviews-faq.cjs
node tests/fluid-compatibility.cjs
node --check assets/fluid.js
node --check assets/fluid-cpu.js
node --check assets/reviews-faq.js
node --check assets/site-pages.js
```

Technical SEO packaging, sitemap/canonical checks and deployment verification are
documented in [`docs/technical-seo.md`](../docs/technical-seo.md). With development-only
Playwright and Chromium installed, `node tests/technical-seo-browser.cjs` checks all
all sitemap-discovered public pages at desktop/mobile sizes with JavaScript enabled and disabled.
It uses the same `PORTFOLIO_BROWSER` executable override as the portfolio suite.

Entity generation and the offline Schema.org relationship checks are documented
in [`docs/entity-seo.md`](../docs/entity-seo.md). Run
`node scripts/structured-data.cjs --write` after intentional metadata/service edits;
stale managed JSON-LD fails the build. Only inert JSON-LD blocks are regenerated.

Phase 3 intent research and page ownership are recorded in
[`docs/search-intent-seo.md`](../docs/search-intent-seo.md). The search-intent check
verifies the eight intended destinations, synchronized metadata, heading hierarchy,
unchanged service identities, detail-page links/breadcrumbs and quotation-based
positioning. Removing a selected service destination must fail validation.

The security verifier checks executable script syntax, JSON-LD, inline-script
hashes against both hosting CSPs, package rendering/XSS guards, and pinned SDK
attributes. The reviews/FAQ suite checks review content, scroll geometry and
controls, right-to-left travel, future review panels, FAQ state, ARIA and focus, and
short-window/reduced-motion behavior. Collapsed reviews use vertical-driven
motion with a fitting sticky top. Expanded reviews and reduced motion keep the
same horizontal sequence with native overflow, arrow keys and panel controls.

## Homepage fluid integration

The root homepage (`/`) loads the red fluid atmosphere directly:

- `index.html` includes one decorative canvas, `assets/home-fluid.css`, and the
  ordered deferred scripts `assets/fluid-cpu.js` then `assets/fluid.js`.
- Existing content, navigation, forms, portfolio, custom cursor, loading sequence
  and floating buttons are retained. The homepage has no simulation controls.
- The canvas is a fixed screen-blended layer, below navigation and floating controls,
  with `pointer-events: none`. It cannot intercept clicks, focus or scrolling.
- The smoke uses the existing `#c4162a` brand red at restrained opacity over black.
- Desktop mouse movement is observed on the document. Passive touch listeners follow
  a finger during native page scrolling without preventing default or capturing page
  contacts. Touch Pointer Events are ignored on the homepage to prevent duplication.
- The effect starts after the existing loader finishes, sleeps in hidden tabs,
  and allocates no graphics on a reduced-motion homepage until that setting changes.
- The initially empty homepage skips simulation/display passes until genuine input.
  Its existing frame scheduler, input handling and natural dissipation are retained.
- Touch devices keep their original quality unless the existing automatic sample
  detects fewer than 38 FPS after 150 frames. Then only the display DPR cap changes
  from 1.25 to 1; shaders, simulation/dye grids and live fields are retained without
  reallocation. Desktop quality behavior is unchanged.
- Small height-only touch viewport changes reuse the normalized fields within
  20% of their allocated viewport height. Width/orientation changes and larger
  resizes use the existing state-preserving reallocation path.
- Only the homepage imports this atmosphere; About/Services/legal/admin pages do not.

## Fluid compatibility coverage

Compatible browsers use WebGL2 velocity/dye advection, vorticity confinement and
pressure projection. If WebGL2, floating-point render targets or shader setup are
unavailable, the page replaces the GPU canvas and uses a Canvas2D CPU fluid solver.
The fallback solves real velocity/pressure/dye fields; it does not draw particles.
If both renderers fail, the homepage hides the decorative layer and its original
content remains usable.

CPU quality is bounded more conservatively on the homepage because existing page
animations run alongside it. Real device frame rate and visual quality still need
browser verification; numerical tests are not a performance guarantee.

The compatibility suite covers missing WebGL/float extensions, shader failure,
actual CPU fluid evolution and pixel data, replacement-canvas input, pause/clear,
visibility and reduced motion. Homepage coverage also checks initialization without
simulation controls, passive touch handlers, touch Pointer Event deduplication,
cancellation, mouse movement, one document binding after fallback, loader sequencing,
no initial graphics under reduced motion, and non-intercepting homepage markup/styles.
Live-field regressions also cover repeated viewport resizing (including mobile
browser chrome) and the original automatic low-FPS quality threshold. Both must
retain existing dye while keeping one animation loop; explicit clear still works.
The suite also checks that idle frames do not redraw an empty field, fast touch
devices keep quality, and slow touch adaptation preserves the actual field buffers.

The scripts are served from the same origin. The existing CSP and its inline-script
hashes must remain valid; changes to inline executable scripts require matching
hashes in both `_headers` and `vercel.json`.

These tests use synthetic DOM/canvas/input harnesses. They do not verify real GPU
rendering, native touch, browser layout, authenticated CMS operations or device
performance. Before merging a visual or interaction change, inspect the homepage
on desktop/mobile: genuine pointer/touch should stir the smoke, scrolling and
ordinary controls should work, dialogs/menu should appear above it, reduced motion
should disable it, and the console should have no new errors. Check GPU and fallback
paths where available.

Algorithm reference: Mark Harris,
[GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu).
