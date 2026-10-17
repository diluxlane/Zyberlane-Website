# Zyberlane Fluid Lab — mobile compatibility repair

The experiment remains isolated under `/fluid-preview/`. The homepage, shared
assets, security policy, database and hosting configuration are not changed.
PR #8 was merged by the repository owner; subsequent repairs belong on a separate
branch and must not be merged without review.

## Confirmed live failure

On 17 October 2026 the cloud browser opened
`https://zyberlane.vercel.app/fluid-preview/` and rendered the Fluid Lab shell,
but displayed `Fluid unavailable · WebGL2 required` with disabled controls.
The actual browser console reported:

```text
[Zyberlane fluid] Error: WebGL2 floating-point rendering is unavailable.
    at initialize (.../fluid-preview/fluid.js:408:66)
```

This reproduces a graphics compatibility failure. It does not establish the exact
browser/URL used by the person who reported a mobile failure.
`https://zyberlane.netlify.app/fluid-preview/` separately returned a Netlify 404;
merging GitHub/Vercel changes does not establish that Netlify has this route.

## Repair

- Preserve the WebGL2 velocity/pressure/dye solver on compatible browsers.
- Load a dependency-free Canvas2D CPU fluid solver from the same origin. It solves
  a velocity/pressure grid, vorticity, pressure projection and dye advection; it
  does not draw particle sprites.
- Recover automatically if WebGL2 is missing, float render targets are missing,
  shader setup fails, or the GPU context is interrupted.
- Replace a canvas that acquired WebGL before acquiring a Canvas2D context, then
  rebind pointer handlers. A single canvas cannot switch context types.
- Retain working mouse/touch controls, pointer cancellation, clear, pause/resume,
  coarse-pointer quality, reduced-motion and hidden-tab suspension in the fallback.
- Handle an ended pointer contact without crashing on capture.
- Keep the black/red direction, external scripts and existing CSP.

The CPU path trades some fine detail for compatibility and limits its grid size
and pressure iterations. Browsers lacking both WebGL and Canvas2D show an explicit
failure. Actual device performance still needs measurement.

## Validation

Run:

```sh
node --check fluid-preview/fluid.js
node --check fluid-preview/cpu-fluid.js
node fluid-preview/tests/compatibility.cjs
node security/verify.cjs
```

The regression suite runs the actual CPU solver with Canvas stubs, and checks:

- recovery from missing WebGL2, missing float extension and shader failure;
- replacement-canvas input wiring and enabled controls;
- touch contact/cancel and capture failure handling;
- one animation loop, pause/resume, hidden tabs, clear and reduced motion;
- finite evolving velocity/pressure/dye fields after 120 simulation steps;
- non-black red image pixels and a full reset to zero.

All of these pass. The nine unchanged GLSL programs also compile/link under native
Mesa GLES3. These results do not constitute a real browser rendering/touch test.

The original failure is verified in the cloud browser. The repaired branch still
requires HTTPS preview browser verification. Local `file:` navigation is blocked
by cloud browser URL policy. Vercel branch previews remain protected; no access
protection has been disabled or bypass granted. A successful signed-in session or
explicit authorization for a time-limited deployment share link is needed to test
that deployment. Such a link grants access to the full PR preview, not only this
route. The production alias remains on the owner's merged commit until a repair
is reviewed and merged by the owner.

## Browser checks before merging

Open the repaired HTTPS `/fluid-preview/` route. Check Settings shows either
`WebGL2 fluid` or `Canvas2D fluid`, advancing frames and `Runtime errors: 0`.
With ambient disabled, clear the canvas and verify mouse/touch input creates
continuous curling red smoke. Test mobile portrait/landscape, touch cancellation,
controls, quality, reduced motion, pause/resume and tab switching. Inspect browser
console and actual frame rate; adjust the effect if visible failures remain.

Algorithm reference: Mark Harris,
[GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu).
