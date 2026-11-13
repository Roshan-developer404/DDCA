# Software & Technical Architecture (`inside-the-machine-v4`)

## 1. Separation of Concerns
Rather than relying on a single monolithic file, `inside-the-machine-v4` separates styling, curriculum data, simulation engines, 3D WebGL rendering, assessments, and UI routing into dedicated modules:

- **`css/styles.css`**: Restrained dark engineering UI theme (`#060d15` to `#0f1f31` surfaces, `#48d2e2` cyan and `#3ecf9a` emerald accents, `Manrope` + `DM Mono` typography, responsive breakpoints, and keyboard-accessible focus states).
- **`js/course-data.js`**: Pure data layer containing all 6 DDCA modules (`mod1`–`mod6`), the 10-step Beginner-First Teaching System per module, three explanation levels (`Beginner`, `Engineering`, `Advanced`), explicit cross-module prerequisite links, and RV32I architectural reference tables.
- **`js/digital-logic-sim.js`**: Deterministic, zero-dependency digital logic engine exported for both browser UI and Node.js automated testing (`convertNumberSystem`, `evaluateGate`, `getGateTruthTable`, `evaluateNandUniversal`, `simplifyKMap4`, `evaluateHalfAdder`, `evaluateFullAdder`, `evaluateRippleCarry4`, `evaluateMux4to1`, `evaluateSRLatch`, `stepDFlipFlop`, `stepShiftRegister4`, `stepFSM`, `RegisterFile32`).
- **`js/riscv-engine.js`**: Real Two-Pass RV32I Educational Assembler (`assembleProgram`), instruction bit-field encoder/decoder (`R`, `I`, `S`, `B`, `U`, `J` formats), `SingleCycleRV32Simulator` with 8-stage hardware trace generation and MMIO decoding at `0x00000100`, `simulatePipelineTimeline` (5-stage `IF/ID/EX/MEM/WB` cycle visualizer with RAW load-use/ALU hazard detection and forwarding), and `calculateIronLaw`.
- **`js/gl/`**: the zero-dependency WebGL2 engine. `math.js` (mat4), `geometry.js` (procedural Builder: rounded boxes, lathes, tubes with per-vertex PBR material), `engine.js` (GGX shading, fitted PCF shadows, 4x MSAA HDR, SSAO, bloom, ACES, ID-buffer picking, orbit camera), `textures.js` (procedural PCB/die/IHS/label canvases), `scene-computer.js` (the 3D computer) and `scene-datapath.js` (the live RV32I datapath).
- **`js/hardware-3d.js`**: facade used by `app.js`. One shared WebGL stage is re-parented into the visible section; handles picking, labels, explode/de-lid/isolate and the cinematic tour.
- **`js/hardware-data.js`**: educational metadata for the 8 hardware components.
  - **View A (External Hardware & Silicon Die)**: 8-layer FR-4 motherboard PCB, BGA-1744 CPU package with solder balls and removable IHS lid, silicon die floorplan, dual 262-pin DDR5 SO-DIMMs, M.2 2280 NVMe SSD, 8-phase VRM inductors/capacitors/DrMOS, sintered copper heat pipes with 15-blade blowers, and PCIe ×16 / EC connectors.
  - **View B (Internal 3D RV32I Datapath)**: Interactive 3D blocks for `PC`, `IMEM`, `CONTROL`, `IMMGEN`, `REGFILE`, `ALU`, `DMEM`, and `MMIO` with animated 3D signal packets driven directly by `SingleCycleRV32Simulator`.
  - Includes an automatic 2D compatibility fallback when WebGL is unavailable.
- **`js/experiments-quizzes.js`**: 8 complete laboratory experiment specifications (`exp1`–`exp8`) wired to live simulation verification plus 13 assessment items (`MCQ` and `SHORT` numerical/coding questions).
- **`js/app.js`**: Application controller managing navigation across all 12 sections, explanation-level switching, `localStorage` quiz persistence, and Professor Presentation Mode.
