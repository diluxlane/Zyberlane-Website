# Zyberlane homepage fluid atmosphere

The root homepage (`/`) loads the red fluid atmosphere directly. The `/fluid-preview/`
lab remains available for diagnostics, pause/clear/quality controls and comparison.
Both use the same engines under `assets/`.

## Homepage integration

- `index.html` includes one decorative canvas, `assets/home-fluid.css`, and the
  ordered deferred scripts `assets/fluid-cpu.js` then `assets/fluid.js`.
- Existing content, navigation, forms, portfolio, custom cursor, loading sequence
  and floating buttons are retained. There are no Fluid Lab controls on the homepage.
- The canvas is a fixed screen-blended layer, below navigation and floating controls,
  with `pointer-events: none`. It cannot intercept clicks, focus or scrolling.
- The smoke uses the existing `#c4162a` brand red at restrained opacity over black.
- Desktop mouse movement is observed on the document. Passive touch listeners follow
  a finger during native page scrolling without preventing default or capturing page
  contacts. Touch Pointer Events are ignored on the homepage to prevent duplication.
- The effect starts after the existing loader finishes, sleeps in hidden tabs,
  and allocates no graphics on a reduced-motion homepage until that setting changes.
- Only the homepage imports this atmosphere; About/Services/legal/admin pages do not.

## Compatibility

Compatible browsers use WebGL2 velocity/dye advection, vorticity confinement and
pressure projection. If WebGL2, floating-point render targets or shader setup are
unavailable, the page replaces the GPU canvas and uses a Canvas2D CPU fluid solver.
The fallback solves real velocity/pressure/dye fields; it does not draw particles.

The GPU-only lab was observed failing in the cloud browser on 17 October 2026 with
`WebGL2 floating-point rendering is unavailable`. The CPU fallback addresses that
capability failure. If both renderers fail, the homepage hides the decorative layer
and its original content remains usable.

CPU quality is bounded more conservatively on the homepage because existing page
animations run alongside it. Real device frame rate and visual quality still need
browser verification; numerical tests are not a performance guarantee.

## Checks

```sh
node --check assets/fluid.js
node --check assets/fluid-cpu.js
node fluid-preview/tests/compatibility.cjs
node security/verify.cjs
```

The compatibility suite covers missing WebGL/float extensions, shader failure,
actual CPU fluid evolution and pixel data, replacement-canvas input, pause/clear,
visibility and reduced motion. Homepage coverage also checks initialization without
lab controls, passive touch handlers, touch Pointer Event deduplication, cancellation,
mouse movement, one document binding after fallback, loader sequencing, no initial
graphics under reduced motion, and non-intercepting homepage markup/styles.

The existing CSP and its inline-script hashes remain unchanged. The new scripts
are served from the same origin and need no weaker script policy.

## Deployment and remaining verification

This change is prepared in Draft PR #9 on `fix/fluid-mobile-compatibility`.
It has not been merged by the agent. Preview the root `/` route of its Vercel
Preview deployment to review the actual homepage, rather than only `/fluid-preview/`.

Vercel previews are protected by authentication. Automatic approval review previously
rejected a deployment share link without specific authorization; none has been
created for this change. Local file navigation is also blocked by cloud browser URL
policy. Full browser visual/pointer/native-touch/performance checks therefore remain
pending an authorized preview session or temporary share link. No protection settings
have been disabled. A share link grants access to the full preview deployment.

Netlify's `/fluid-preview/` returned 404 in the earlier inspection; a GitHub merge
and successful Vercel deployment do not establish that Netlify production is updated.
No Netlify production deployment is performed by this PR.

Before merging, verify the homepage renders curling red smoke under pointer/touch,
ordinary links/forms and mobile vertical/horizontal scrolling remain usable, dialogs
and menu appear above the atmosphere, reduced-motion disables it, and browser console
has no errors introduced by the atmosphere. Check both GPU and fallback paths where
available. The lab diagnostics can help identify the renderer and frame rate.

Algorithm reference: Mark Harris,
[GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu).
