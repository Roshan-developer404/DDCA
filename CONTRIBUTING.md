# Contributing

Contributions that improve correctness, clarity, accessibility and student learning are welcome.

## Good first contributions
- Correct or clarify a beginner explanation.
- Add a test program with expected PC/register/memory results.
- Improve keyboard navigation, responsive layout or screen-reader labels.
- Add a diagram only when its source and redistribution permission are clear.
- Improve WebGL fallback behavior or rendering performance.

## Before opening a pull request
1. Explain the learning outcome the change supports.
2. Keep real observations separate from simulated hardware activity.
3. If changing CPU behavior, include a small program and expected final state.
4. Test the affected page in a desktop browser and a narrow/mobile viewport.
5. Do not add copyrighted lecture images or vendor hardware artwork unless redistribution permission is confirmed.

## Code style (3D engine)
The renderer in `js/gl/` is intentionally dependency-free and framework-free. Keep new scene parts procedural (`Builder` primitives + canvas textures) so the repo stays small, and add a check to `tests/run_verification.js` when you change geometry or the scene↔data contract.

## Code style
The project currently uses static HTML/CSS/JavaScript and no build system. Keep changes small, readable and dependency-light. Avoid introducing a framework solely for a small visual enhancement.
