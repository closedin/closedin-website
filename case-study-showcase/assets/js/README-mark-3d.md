# closed:in 3D glass mark (keep)

Files that belong together:
- `assets/js/mark-3d.js`: Three.js module. `init(box, { gsap, ScrollTrigger, lenis, isMobile, trigger })` mounts a canvas in `box`; `renderStatic(canvas, size)` renders the rest pose (used for the poster and OG image).
- `assets/brand/closedin-mark.svg`: the 2D mark the geometry mirrors (measured from favicon.png, 500 px space).
- `assets/img/mark-poster.webp` and `.png`: pre-rendered fallback (Reduce Motion, no WebGL, slow devices) and OG source.
- `assets/demo/mark-3d.html`: standalone embed demo (`/assets/demo/mark-3d`).
- Vendor: `assets/vendor/three-0.186.1/` (module imports the patched `three.core.min.js`), gsap 3.15.0.

Behaviour: one full turn over the trigger section (scroll scrub), pointer tilt up to 0.15 rad, slow idle spin on desktop, adaptive quality (DPR and transmission resolution drop after 20 slow frames, then poster), render only while visible.
Tunables sit in `CONFIG` and `MARK` at the top of the module. Re-render the poster with `scripts/poster.mjs`.
