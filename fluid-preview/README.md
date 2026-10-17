# Zyberlane homepage fluid A/B experiment

This branch (`preview/amin-fluid-cursor`) is **B**, the Amin-inspired experiment.
**A** remains available on `fix/fluid-mobile-compatibility`, commit
`786b5ddd0fc899620067bfcbd913fe67fe6c17a1`, in PR #9. No production release or merge
is authorized by this experiment. Compare the root homepage `/` of each preview.

Each branch ships one active GPU implementation in `assets/fluid.js`. The existing
`assets/fluid-cpu.js` remains a used compatibility renderer for browsers without
floating-point WebGL. The `/fluid-preview/` lab uses the same engines and provides
its existing diagnostic controls. There are no backup implementations or extra
framework dependencies in this branch.

## Licensed source and scope

The B solver is adapted from Inspira UI's MIT-licensed `FluidCursor.vue` at
`unovue/inspira-ui`, revision `04c57ab62b9713872ebbf68988dff1836ed3d764`, path
`app/components/inspira/ui/fluid-cursor/FluidCursor.vue`.

Amin's component was studied at `amin-nepali/amin-nepali`, revision
`626aea086b9c2f5aa7ae294571dd2c78563465aa`. It matches the licensed solver except
for three TypeScript declarations and a framebuffer error guard. Amin's repository
has no license notice; code is sourced from the licensed upstream instead. The
complete upstream MIT copyright/permission notice is retained inside the runtime
script. No Vue, portfolio integration, branding, rainbow generator, prop watchers,
capture settings or unrelated source files are imported.

## Rendering and integration

- Both versions solve velocity, pressure and dye fields with advection and
  vorticity. B uses the reference's pass order and dissipation formula.
- B retains curl 3, density dissipation 3.5, velocity dissipation 2, pressure 0.1,
  20 pressure iterations, splat radius 0.2 and aspect-corrected force 6000.
- B uses simulation short-side resolution 128 desktop / 96 coarse pointer and dye
  1024 desktop / 512 coarse pointer, with existing adaptive quality. Explicit lab
  high quality uses dye 1440. Missing linear filtering selects manual filtering,
  dye 256 and no shading. Texture dimensions are bounded by hardware limits and
  aspect ratio 2.5; the existing output-canvas DPR/1920-pixel caps remain.
- GPU RGBA/RG/R half-float formats are probed for support, with WebGL1 support and
  the existing CPU fallback. CPU fallback is a compatibility path, not an identical
  implementation of B's GPU physics; check `canvas.dataset.renderer` when comparing.
- The palette is fixed Zyberlane `#c4162a`. The GPU overlay clears to transparent.
  Existing homepage HTML/CSS, opacity, content, navigation, buttons and layout are
  unchanged. No controls or implementation details are added to the homepage UI.
- Initial load, touchstart, resize and quality changes do not inject homepage fluid.
  Only trusted movement injects; touchstart primes a contact without a splat.
  Passive touch handlers preserve native scrolling and avoid duplicate Pointer
  Events. The canvas retains `pointer-events: none`.
- The existing loader and reduced-motion behavior are retained. A single RAF loop
  sleeps in hidden tabs and the back/forward cache. Final page teardown removes
  listeners and deletes GPU resources; resize releases replaced targets and probe
  allocations. GPU context loss switches cleanly to the CPU renderer.

## Checks and deployment

This is a static site with no `package.json` or bundler build command. Vercel serves
the repository's HTML/assets directly; do not introduce Vue/Vite to run the effect.

```sh
node --check assets/fluid.js
node --check assets/fluid-cpu.js
node fluid-preview/tests/compatibility.cjs
node security/verify.cjs
```

The existing compatibility suite now includes WebGL call/resource harnesses for
WebGL2/WebGL1, manual filtering, high DPI, mobile/desktop input, idle startup,
resize, context loss, back/forward cache and teardown. Its CPU numerical tests
remain. Harness input is synthetic evidence, not real browser/device testing.

Vercel previews require authentication. Real Chrome visuals, native touch, scrolling,
frame rate and application console checks remain pending until the fixed deployment
can be opened in an authorized browser session. Native shader compilation and mock
resource counts are not browser or performance guarantees. No deployment protection,
CSP/hosting configuration, main branch or Netlify production deployment is changed.
