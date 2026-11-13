<div align="center">

# Inside the Machine

### A photoreal 3D computer you can take apart: heat-sink → silicon → a live RISC-V datapath.

**Hand-written WebGL2. Zero dependencies. No build step. Works offline.**

[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)
![WebGL2](https://img.shields.io/badge/WebGL-2.0-990000?logo=webgl)
![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-29d8ee)
![Tests](https://img.shields.io/badge/tests-18%20suites-34d399)
![Made for](https://img.shields.io/badge/made%20for-CSE%20·%20ECE%20·%20EEE-a78bfa)

<img src="assets/screenshots/tour.gif" alt="Cinematic tour: cooler lifts off, the CPU lid opens, the silicon die appears, then a live RISC-V datapath executes ADD" width="860">

<sub>The built-in 60-second tour (time-lapsed here): cooler → lid → die → live datapath.</sub>

</div>

---

## Why this exists

Most architecture courses show you a block diagram and ask you to imagine the machine. **Inside the Machine** lets you *open* one:

- **Take it apart.** A procedurally modelled desktop computer (tower cooler with spinning fan, DDR5 with RGB, NVMe, VRM, LGA socket, routed PCB). Explode it, lift the cooler, de-lid the CPU, zoom into the die.
- **Zoom into one core.** A single-cycle RV32I datapath built as a lit 3D circuit board. Write assembly, press *Step*, and watch pulses travel along the exact buses the instruction uses. Every block shows its live values.
- **Learn the theory next to it.** Six DDCA modules, a gate-level lab, a real two-pass assembler, a pipeline-hazard visualiser, eight lab manuals and a quiz bank. All wired to the 3D scene.
- **Study with it.** A learning path with saved progress, objective checklists per module, `Ctrl K` search across lessons / terms / instructions, and a **Study Toolkit**: 59-term glossary, printable RV32I reference card, live instruction encoder/decoder, 32-bit number lab, formula sheet and spaced-repetition flashcards.

> No Three.js, no React, no bundler. The renderer is ~1,000 lines of plain JavaScript in [`js/gl/`](js/gl). Clone it, open `index.html`, done.

## Screenshots

| | |
|---|---|
| ![Home](assets/screenshots/01_home_hero.png) | ![Exploded](assets/screenshots/02_exploded_view.png) |
| **Hero** — auto-orbiting scene, one-click tour | **Exploded view** — every part separates along its own axis |
| ![Die](assets/screenshots/03_silicon_die.png) | ![Datapath](assets/screenshots/04_cpu_lab_live_datapath.png) |
| **Silicon die** — thin-film iridescence over a labelled floorplan | **Live datapath** — pulses follow `activeBuses` from the simulator |
| ![Path](assets/screenshots/05_learning_path.png) | ![Toolkit](assets/screenshots/06_study_toolkit.png) |
| **Learning path** — sidebar progress, resume where you stopped | **Study Toolkit** — encode `add x3,x1,x2` and see every field |
| ![Card](assets/screenshots/07_riscv_card.png) | |
| **RISC-V card** — formats and all 37 RV32I instructions (printable) | |

## For students

| Do this | Where |
|---|---|
| Follow the six modules in order, tick the objectives you can explain, answer the module quiz | sidebar → *Learn* |
| Find anything fast | `Ctrl K` (or `/`), then type `carry`, `BEQ`, `Amdahl`… |
| Look up an instruction, its format and encoding | Study toolkit → *RISC-V card* (Print button gives a one-page handout) |
| See how assembly becomes bits, or decode a hex word from a lab | Study toolkit → *Encode / decode*, then *Run in CPU Lab* |
| Practise two's complement and base conversion | Study toolkit → *Number lab* |
| Memorise terms | Study toolkit → *Flashcards* (`Space` flip, `←` review, `→` got it) |

Progress is stored only in your browser (`localStorage`); *Reset my progress* in the sidebar clears it. Shortcuts: `[` / `]` previous / next section, `\` hide the sidebar, `?` help.

## Run it

```bash
git clone https://github.com/<you>/inside-the-machine && cd inside-the-machine
python3 -m http.server 8080      # or: npx serve .   (any static server; file:// works in most browsers too)
# open http://localhost:8080
```

Deep links: `index.html#sec-cpu-lab`, `#sec-hw-explorer`, `#sec-mod5`, …

Requires a browser with **WebGL 2** (Chrome, Edge, Firefox, Safari 15+). Without it the 3D panels show a notice and the rest of the course still works.

## What's in the 3D engine

Everything is written from scratch ([`js/gl/engine.js`](js/gl/engine.js)):

| Feature | How |
|---|---|
| Physically-based shading | Cook-Torrance GGX, Schlick Fresnel, metalness/roughness per vertex |
| Studio lighting | Analytic image-based environment with softboxes, strip light and rim lights, no HDR files |
| Shadows | Camera-fitted, texel-snapped PCF shadow map (crisp even when zoomed to the die) |
| Post-processing | 4× MSAA into an HDR target, SSAO, multi-level bloom, ACES tone mapping, chromatic aberration, vignette |
| Materials | Screen-space bump mapping, procedural brushed/blasted metal, thin-film iridescence, animated RGB emission, travelling wire pulses |
| Procedural assets | Rounded boxes, lathes, swept tubes; PCB with routed length-matched buses, silicon floorplan, laser-etched lid, all generated at runtime |
| Interaction | ID-buffer picking, orbit / pan / pinch camera with fly-to, fade transitions, floating labels |

## Project layout

```
index.html              the app shell (12 sections)
css/                    styles.css (base) + theme.css (v5 look) + student.css (sidebar, toolkit)
js/gl/                  WebGL2 engine, geometry builder, textures, 3D computer, 3D datapath
js/hardware-3d.js       facade: one shared stage, picking, explode/de-lid, cinematic tour
js/hardware-data.js     educational text for the 8 hardware components
js/student.js            progress, sidebar state, search palette, Study Toolkit
js/student-data.js       glossary, RV32I reference table, formula sheet, decoder (unit-tested)
js/riscv-engine.js      two-pass RV32I assembler + single-cycle simulator + pipeline model
js/digital-logic-sim.js gate-level simulation library
js/course-data.js       six-module curriculum content
tests/                  18 Node suites + optional Playwright browser test
docs/                   architecture, roadmap, limitations, source attribution
```

## Tests

```bash
npm test                       # 18 suites: curriculum, logic sim, assembler, simulator, pipeline, 3D math/geometry, scene↔data contracts
npm i -D playwright && npm run test:e2e   # boots headless Chromium, checks all three 3D views render and the tour runs
```

## Honest notes

- The hardware is a **stylised educational model**, not a teardown of a specific product. The die floorplan is illustrative.
- `logic-microscope.html` is a standalone legacy page that still loads Three.js and Tailwind from CDNs (needs internet). The main app does not.
- `assets/source-slides/` contains course slide images; make sure you have the right to redistribute them before publishing (see [`docs/SOURCE_ATTRIBUTION.md`](docs/SOURCE_ATTRIBUTION.md)).

## Contributing

Ideas that would be great PRs: a pipelined 3D datapath with hazard stalls, a GPU/PCIe card scene, touch-first tour controls, an RV32M extension, a cache-hierarchy visualiser. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
