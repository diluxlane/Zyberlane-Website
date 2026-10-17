# Zyberlane Fluid Lab — isolated experiment

Draft PR #8 · branch `preview/zyberlane-fluid-smoke`. Do not merge into main.

Only files under `fluid-preview/` belong to this experiment. No production HTML,
shared assets, CSP, hosting configuration, database, domain, or main branch is changed.

## Why the first preview was unusable

Inspected on 17 October 2026:

1. Vercel's Git integration successfully deployed the original commit `6156778`.
   Its build logs show a static build completed in 62 ms and deployment reached
   `READY`. This repository has no package.json or Vite build pipeline.
2. The project enables Vercel Authentication for `all_except_custom_domains`.
   The branch preview redirected the cloud browser to Vercel login.
3. The preview's inline script was absent from the CSP's allowed script hashes.
   The deployed response enforced that CSP, so opening the page after authentication
   would still block its script. Missing hash:
   `sha256-OaIeGg3Lfnbva0DMZgTHgmdw+JJ/0ihZKv1gLJNPr2g=`.
4. The old renderer was a Canvas2D collection of fading radial-gradient particles,
   not a velocity/pressure fluid simulation. It also registered both Pointer Events
   and touch handlers, risking duplicate input on touch browsers.
5. `zyberlane.netlify.app` responds from Netlify. This PR has no Netlify deploy
   status, netlify.toml, or deployment workflow in its repository. Netlify dashboard
   settings could not be inspected; no claim is made that its Deploy Previews are
   enabled or disabled. Netlify production was not deployed or modified.

## Changes

- Same-origin external JS and CSS, compatible with the existing CSP without
  weakening the policy. Absolute asset paths survive slash normalization.
- WebGL2 grid-based fluid: velocity self-advection, curl/vorticity confinement,
  divergence, 20 Jacobi pressure iterations, pressure-gradient projection,
  dye advection/dissipation, and a red-only shaded display pass.
- One Pointer Events input path: mouse hover, touch/pen contact, pointer capture,
  cancellation cleanup, continuous stroke interpolation and a bounded input queue.
- Responsive controls for stir, pause, clear, ambient motion, quality, and
  inspectable diagnostics. Clear also stops ambient injection.
- Bounded DPR/display/texture sizes; coarse-pointer quality default; one adaptive
  downgrade; hidden-tab suspension; reduced-motion starts paused; context-loss recovery.
- This experimental renderer requires WebGL2 plus floating-point color buffers.
  Unsupported browsers display a visible fallback and stop instead of a silent canvas.

Algorithm reference: Mark Harris, [GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu).
The implementation is original and has no third-party script dependency.

## Verification status

| Check | Result |
| --- | --- |
| JS syntax / diff whitespace | Passed |
| Existing `node security/verify.cjs` | Passed; original CSP/hosting parity preserved |
| All 9 actual GLSL programs compile/link | Passed in native Mesa GLES3; not a browser test |
| Synthetic input/lifecycle tests with GPU stub | Passed: timestamp-based FPS, one RAF loop, mouse input, touch contact/cancel, coarse resolution, pause/resume, visibility, reduced-motion and unavailable-WebGL fallback |
| Vercel Git deployment | First replacement commit `f0a27c0` reached READY as a Preview, not Production |
| Cloud browser reaches deployed simulation | Blocked by authentication; sign-in did not complete |
| Browser console / actual pointer interaction | Not verified |
| Native mobile/touch and responsive visual QA | Not verified |
| Fluid visual quality / frame rate on real browser | Not verified; do not infer success from source or shader tests |

Access: automatic approval review rejected a temporary deployment share link, and
later rejected the authenticated fetch helper because that helper also creates or
reuses a protection bypass. No project protection was disabled. Secure browser login
reached a Google account identifier error. Browser verification remains pending
successful sign-in or explicit authorization for a temporary share link scoped to
the PR deployment. A deployment share link grants access to the full preview,
not only this route.

## Remaining browser checks

Open the protected branch preview's `/fluid-preview/` route after authorized access.
Observe the actual canvas and browser console. Confirm motion leaves continuous,
curling, fading red fluid; compare clear → hover/drag with ambient disabled.
Test native touch drag, multiple contacts, pointer cancellation, mobile portrait and
landscape, controls, quality changes, and reduced-motion. Check liveness/FPS in
Settings and test pause/resume and switching tabs. Iterate on observed rendering or
performance failures before claiming that this preview works.
