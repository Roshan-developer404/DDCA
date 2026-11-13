# Verification & Automated Testing Report (`inside-the-machine-v4`)

All 17 verification criteria specified in Part 9 were tested using the automated Node.js verification suite (`node tests/run_verification.js`) and headless Chromium (`selenium` WebDriver).

## Automated Test Suite Results (`tests/run_verification.js`)

| Verification Requirement | Test Method | Actual Outcome | Status |
|---|---|---|---|
| 1. All six modules open | Automated DOM & `ITM_COURSE_DATA` check (`mod1`–`mod6`, 10-step teaching grid, 3 levels) | All 6 modules verified present and render cleanly | **PASS** |
| 2. Every lesson navigation link works | Verified all 12 `data-section` buttons and cross-module prerequisite buttons | All 12 primary sections & prerequisite links switch views accurately | **PASS** |
| 3. All course diagrams load | File existence & byte-size check across all 12 PNG slides in `assets/source-slides/` | All 12 lecture slide PNGs verified intact (`70 KB`–`1.58 MB`) | **PASS** |
| 4. Logic gate truth tables are correct | Exhaustive check of `AND`, `OR`, `NAND`, `NOR`, `XOR`, `XNOR`, `NOT` + NAND universality | 100% match with Boolean truth tables | **PASS** |
| 5. Half-adder & full-adder outputs are correct | Verified `HA(1,1) -> Sum=0, Carry=1`, `FA(1,1,1) -> Sum=1, Cout=1`, 4-bit ADD (`9+5=14`) & SUB (`9-5=4`) | Exact arithmetic & carry output verified | **PASS** |
| 6. Flip-flop state changes are correct | Verified rising-edge D-FF (`CLK=0` holds state, `CLK↑` latches `D`), 4-bit SISO/SIPO (`1011₂`), and `'101'` FSM | State transitions occur strictly on clock edges | **PASS** |
| 7. Register-file behavior is correct | Verified dual asynchronous read ports (`rs1`, `rs2`) and clocked write port (`rd`, `WE3=1`) | `RD1` and `RD2` reflect written state accurately | **PASS** |
| 8. RISC-V encoding & decoding are correct | Verified Two-Pass Assembler on `ADDI x1,x0,10` (`0x00A00093`), `ADDI x2,x0,20` (`0x01400113`), `ADD x3,x1,x2` (`0x002081B3`) | Exact 32-bit hex & binary bit-fields (`opcode`, `rd`, `funct3`, `rs1`, `rs2`, `funct7`) | **PASS** |
| 9. `x0` remains zero | Attempted `writeOnClockEdge(0, 999, true)` and `ADDI x0, x0, 99` | `x0` remains `0` in all cases | **PASS** |
| 10. CPU instruction execution updates registers | Executed Flagship `ADD x3, x1, x2` (`10+20=30`) and Course Program A (`x1=8, x2=3, x3=0, x4=11, x6=11`) | All destination registers match expected trace | **PASS** |
| 11. Branch & Jump instructions update PC | Executed Course Program B (`JAL x0, 8` at `0x0C` → `PC=0x14`, skipping `0x10` so `x4=0`) and Program D (`BNE` loop) | PC redirects accurately on `JAL`, `BEQ`, and `BNE` | **PASS** |
| 12. Load & store access simulated memory & MMIO | Executed `SW`/`LW` in Program A (`Mem[0]=11`) and MMIO in Program C (`SW` to `0x00000100` → `LED=5`, then `15`) | Word-aligned RAM and MMIO `0x00000100` LED register verified | **PASS** |
| 13. Pipeline visualizations match simulation | Tested `LW x1, 0(x0); ADD x2, x1, x3` with forwarding ON (1 stall) vs. OFF (2 stalls) | Timeline table and CPI match hazard logic | **PASS** |
| 14. Performance calculations are correct | Tested `calculateIronLaw(1000, 1.0, 5.0)` | `5,000 ns` (`5.0 μs`), `0.2 GHz` (`200 MHz`) | **PASS** |
| 15. Responsive layouts work | Verified desktop (`1440×920`), tablet (`1024×768`), and mobile (`390×844`) CSS grid breakpoints | Clean responsive stacking with zero horizontal overflow | **PASS** |
| 16. WebGL fallback works | Tested headless rendering without WebGL / CDN scripts | Graceful compatibility notice displayed; all simulations remain interactive | **PASS** |
| 17. No JavaScript errors remain | Checked with `node --check`, `check_web_app.py`, and Chromium `driver.get_log("browser")` | `0` syntax errors, `0` runtime console errors | **PASS** |
