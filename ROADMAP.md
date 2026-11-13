# Future Development Roadmap (`inside-the-machine-v4`)

## Completed in v4.0
- [x] Complete modular software architecture (`css/`, `js/`, `assets/models/`, `assets/source-slides/`, `docs/`, `tests/`).
- [x] 12-section navigation covering all 6 DDCA modules, CPU Lab, Digital Logic Lab, 3D Hardware Explorer, 8 Practical Experiments, and 13 Assessments.
- [x] 10-step Beginner-First Teaching System and 3 toggleable explanation levels (`Beginner`, `Engineering`, `Advanced`) across every module.
- [x] Real Two-Pass RV32I Assembler supporting labels, ABI register names (`zero`, `ra`, `sp`, `a0–a7`, `t0–t6`, `s0–s11`), and R/I/S/B/U/J binary/hex encoding.
- [x] Flagship `ADD x3, x1, x2` (`x1=10, x2=20 → x3=30`) 8-stage walkthrough plus Course Programs A, B, and C.
- [x] Dual-View 3D Hardware & Datapath Explorer on a hand-written WebGL2 engine (PBR, shadows, SSAO, bloom) and Professor Presentation Mode.

## Planned for v4.1+
- [ ] Add sub-word memory instructions (`LB`, `LBU`, `LH`, `LHU`, `SB`, `SH`) and `JALR` indirect jumps.
- [ ] Add interactive 2-way and 4-way set-associative cache tag/index/offset replacement simulator (LRU vs. FIFO).
- [ ] Export student experiment reports and quiz completion certificates as printable PDF lab sheets.
