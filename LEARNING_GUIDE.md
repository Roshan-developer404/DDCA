# Student Learning Guide

## The architecture story

A computer is not a single mysterious box. It is a hierarchy of abstractions. Semiconductor devices form logic gates; gates form combinational and sequential circuits; circuits form registers, ALUs and memories; these blocks form a processor datapath and control unit; the processor communicates with memory and I/O to execute programs.

## Six-module progression

### Module 1 — Digital foundations
Learn computer fundamentals, digital information, binary/decimal/hexadecimal conversion, bit and byte units, signed representation, two's complement and binary arithmetic. Be able to convert values and explain why digital logic uses two stable states.

### Module 2 — Combinational logic
Study NOT, AND, OR, NAND, NOR, XOR and XNOR; truth tables; Boolean expressions and simplification; Karnaugh maps; half/full adders; ripple-carry addition; two's-complement subtraction; multiplexers; decoders; comparators; and ALU design. A combinational circuit's output depends on its current inputs.

### Module 3 — Sequential logic
Understand state and feedback. Study SR/D latches and flip-flops, clocking, multi-bit registers, SISO/SIPO shift registers, synchronous counters, Program Counter construction, and Moore/Mealy finite-state machines. A sequential circuit's output/state depends on present inputs and stored previous state.

### Module 4 — Memory subsystem
Study addressable storage, register-file read/write ports, instruction ROM, data RAM, address decoding, memory alignment, load/store behavior, and the hierarchy of registers, cache, main memory and secondary storage. Understand temporal and spatial locality.

### Module 5 — RISC-V processor
Study stored-program execution, ISA vs microarchitecture, the bounded RV32I subset used in the course, instruction formats, assembly and machine-code encoding, PC, register file, immediate generation, ALU, control unit, single-cycle datapath, and control signals. Use Ripes as a reference environment and Logisim to inspect a student-built circuit.

### Module 6 — Integration and performance
Run complete programs; trace PC, operands, control signals, ALU/memory operations and write-back; debug the first incorrect stage; extend the processor with XOR and JAL; connect LEDs through memory-mapped I/O; and evaluate CPI, clock period, CPU time, pipelining, cache and parallelism.

## RISC-V lab worked examples

### Program A — register file, ALU, RAM

```asm
ADDI x1, x0, 8
ADDI x2, x0, 3
AND  x3, x1, x2
OR   x4, x1, x2
SW   x4, 0(x0)
LW   x6, 0(x0)
```

Expected results: `x1=8`, `x2=3`, `x3=0`, `x4=11`, `DataMemory[0]=11`, `x6=11`.

### Program B — XOR and JAL

```asm
ADDI x1, x0, 12
ADDI x2, x0, 5
XOR  x3, x1, x2
JAL  x0, 8
ADDI x4, x0, 99   # skipped by the jump
ADD  x5, x3, x2
AND  x6, x5, x1
OR   x7, x6, x2
```

Expected results: `x1=12`, `x2=5`, `x3=9`; JAL at PC `0x0C` redirects to `0x14`, so the instruction at `0x10` is skipped; then `x5=14`, `x6=12`, `x7=13`.

### Program C — memory-mapped LED output

```asm
ADDI x1, x0, 256       # 0x00000100: LED register address
ADDI x2, x0, 5         # 0101₂
SW   x2, 0(x1)         # write 5 to the LED register
```

The ALU calculates the effective address. The control unit asserts `MemWrite`. An address decoder recognizes `0x00000100`; the LED write enable is generated; the peripheral register captures `0101₂`.

## Performance formulas

`CPU execution time = Instruction Count × CPI × Clock Period`

For a basic single-cycle teaching processor, CPI is approximately 1. The clock period must accommodate the longest instruction path. Pipelining overlaps instruction stages to improve throughput. Cache memory reduces average memory-access delay by exploiting temporal and spatial locality. These are different architectural techniques.

## Debugging checklist

1. Confirm PC and fetched instruction.
2. Check source register values and immediate generation.
3. Verify control signals and mux selections.
4. Check ALU operation or effective address.
5. Inspect memory read/write and data.
6. Verify destination register and write-back source.
7. Re-run and compare actual state with the expected trace.

## Accuracy boundaries

The browser cannot read the physical laptop's embedded-controller firmware state, CPU registers, cache lines, DRAM signals or GPU command stream. Those are modeled in the visual labs. The RISC-V CPU lab is a small educational subset, not a complete ISA implementation. Always compare learning-model outputs with your course's Logisim/Ripes exercises and official specifications.

## Practical-manual connection

The supplied practical manuals and session materials add implementation activities to the concept sequence:
- Logic gate truth-table construction.
- Boolean expression implementation using gates.
- A car-security digital control example.
- Decoder and multiplexer construction.
- ALU design and a hardware ALU implementation using Arduino.
- Multi-bit register file read/write behavior.
- SISO/SIPO shift registers built from D flip-flops.
- FSM controller and synchronous counter / Program Counter implementation.
- RAM/ROM read/write operations and RISC-V assembly in Ripes.

The Learn page groups these into a practical workbench so students can connect the lecture concept with a design-manual activity.
