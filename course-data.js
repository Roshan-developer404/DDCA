(function(global) {
  'use strict';

  const MODULES = {
    mod1: {
      id: 'mod1',
      num: 'MODULE 01',
      title: 'Introduction to Digital Design and Computer Architecture',
      subtitle: 'Digital Representation, Binary/Octal/Hex Conversions, Logic Gates, Boolean Algebra, NAND Universality, RISC-V Intro, Ripes & Logisim Evolution',
      sourceRef: 'Supplied Course Deck S01 (Introduction) & S07 (Logic Gates)',
      prerequisites: [],
      objectives: [
        'Explain why digital computers represent information using two noise-tolerant voltage states (Logic 0 and Logic 1).',
        'Convert unsigned and signed two\'s-complement numbers step-by-step between Binary, Octal, Decimal, and Hexadecimal.',
        'Analyze NOT, AND, OR, NAND, NOR, XOR, and XNOR gates using truth tables and Boolean algebra laws.',
        'Prove and construct NOT, AND, OR, and XOR gates exclusively using universal 2-input NAND gates.',
        'Understand the role of an Instruction Set Architecture (RISC-V) and how Ripes and Logisim Evolution support digital hardware verification.'
      ],
      topics: [
        '1. Introduction to digital design',
        '2. Introduction to computer architecture',
        '3. Binary number system & two\'s complement',
        '4. Number system conversions (Base 2, 8, 10, 16)',
        '5. Digital representation of information (ASCII, words)',
        '6. RISC-V ISA introduction',
        '7. Ripes simulator role & workflow',
        '8. Logisim Evolution circuit simulation workflow',
        '9. Fundamental logic gates & truth tables',
        '10. Boolean algebra & De Morgan\'s laws',
        '11. NAND gate universality'
      ],
      levels: {
        beginner: 'Computers are built from billions of microscopic electronic switches (transistors). Rather than trying to measure ten different voltage levels for decimal digits 0–9, hardware uses two stable states—OFF (0V, Logic 0) and ON (VDD, Logic 1). Simple switches combine into logic gates (like AND and NOT), which in turn build calculators, memory, and complete processors.',
        engineering: 'Digital CMOS circuits restore signal margins across noise thresholds (VIL, VIH, VOL, VOH). Information is encoded in N-bit positional radix-2 words (unsigned range 0 to 2^N-1; two\'s-complement signed range -2^(N-1) to 2^(N-1)-1). Combinational gates implement Boolean algebra over {0,1}; by De Morgan\'s theorem, ~(A·B) = ~A + ~B, making NAND functionally complete.',
        advanced: 'At the physical CMOS level, a 2-input NAND gate requires only 4 MOSFETs (two parallel PMOS transistors in the pull-up network and two series NMOS transistors in the pull-down network), whereas an AND gate requires a 4-transistor NAND followed by a 2-transistor CMOS inverter (6 MOSFETs total). This transistor efficiency is why cell libraries favor NAND/NOR synthesis.'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'Digital design is the engineering discipline of constructing reliable logic circuits from binary switches; computer architecture defines the programmer-visible instruction set (ISA) and hardware organization.' },
        { step: '2. Why is it needed?', text: 'Analog voltages drift with temperature, wire resistance, and electromagnetic noise. Binary thresholds regenerate clean 0 and 1 states at every gate stage.' },
        { step: '3. How does it work?', text: 'Positional weights (2^0, 2^1, 2^2, …) encode numbers in binary; CMOS transistor networks switch output nodes to VDD (1) or GND (0) according to Boolean laws.' },
        { step: '4. Internal structure', text: 'Abstraction hierarchy: Physics/MOSFETs → Logic Gates → Combinational/Sequential Blocks → Microarchitecture (Datapath + Control) → ISA (RISC-V) → Software.' },
        { step: '5. Real-world application', text: 'Every laptop CPU, embedded microcontroller (EC), DDR5 memory controller, and NVMe SSD controller processes binary words using CMOS gates.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slides S01 (Abstraction Hierarchy) and S07 (Logic Gates inside the Single-Cycle RISC-V Processor) below.' },
        { step: '7. Interactive experiment', text: 'Use the Step-by-Step Number System Converter, Interactive Gate Explorer, Boolean Law Verifier, and NAND Universality Builder below.' },
        { step: '8. Worked example', text: 'Convert -13 into 8-bit two\'s complement: +13 = 00001101₂ → invert bits = 11110010₂ → add 1 = 11110011₂ (0xF3).' },
        { step: '9. Practice questions', text: 'Why does a 2-input NAND gate tied together (A=B) act as a NOT gate? Because ~(A · A) = ~A by the idempotent law.' },
        { step: '10. Summary', text: 'Binary representation, Boolean algebra, and universal NAND/NOR gates form the physical bedrock upon which the entire RISC-V processor is constructed.' }
      ],
      slides: [
        { file: 'assets/source-slides/S01_Introduction_4_-02.png', deck: 'S01 Introduction, Slide 2', caption: 'Course Slide S01 — Introduction to Digital Design & Computer Architecture abstraction layers', tag: 'Course Material' },
        { file: 'assets/source-slides/S07_Logic_gates2_page6.png', deck: 'S07 Logic Gates, Slide 6', caption: 'Course Slide S07 — Logic gates operating inside the single-cycle RISC-V datapath', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: Radix Conversion & NAND Universality',
        problem: '1) Convert Decimal 45 to Binary, Octal, and Hexadecimal showing division steps. 2) Express OR(A,B) using only NAND gates.',
        solution: '1) 45 ÷ 2 = 22 R1 → 22 ÷ 2 = 11 R0 → 11 ÷ 2 = 5 R1 → 5 ÷ 2 = 2 R1 → 2 ÷ 2 = 1 R0 → 1 ÷ 2 = 0 R1. Reading MSB to LSB: 101101₂ = 055₈ = 0x2D.\n2) By double negation and De Morgan\'s Law: A + B = ~(~(A + B)) = ~((~A) · (~B)) = NAND(NAND(A,A), NAND(B,B)). Requires three 2-input NAND gates.'
      },
      summaryNotes: [
        'Unsigned N-bit range: 0 to 2^N - 1; Two\'s-complement N-bit range: -2^(N-1) to +2^(N-1) - 1.',
        'De Morgan\'s Theorems: ~(A · B) = ~A + ~B and ~(A + B) = ~A · ~B.',
        'NAND and NOR are universal gates: any combinational Boolean function can be synthesized solely from NAND gates.',
        'RISC-V is an open Instruction Set Architecture (ISA); Logisim Evolution models digital circuits, while Ripes simulates RISC-V assembly and datapaths.'
      ]
    },

    mod2: {
      id: 'mod2',
      num: 'MODULE 02',
      title: 'Combinational Logic Design',
      subtitle: 'Truth Tables, Karnaugh Maps, Half/Full Adders, Ripple-Carry Adders, Two\'s-Complement Subtraction, Multiplexers, Decoders, Comparators & ALU Design',
      sourceRef: 'Supplied Course Deck S18–S20 (Combinational Logic & K-Maps) & S21–S32 (Adders, MUX, ALU)',
      prerequisites: [{ id: 'mod1', label: 'Module 1: Logic Gates & Boolean Algebra' }],
      objectives: [
        'Construct truth tables and canonical Sum-of-Products (SOP) expressions for multi-input combinational circuits.',
        'Simplify 3-variable and 4-variable Boolean functions using Karnaugh Maps (K-Maps) by grouping adjacent power-of-two minterms.',
        'Design Half Adders (HA), Full Adders (FA), and N-bit Ripple-Carry Adders, and implement two\'s-complement subtraction (A - B = A + ~B + 1).',
        'Design and operate Multiplexers (MUX), Address Decoders, and Magnitude Comparators.',
        'Integrate arithmetic and logic units with a result multiplexer to build a complete ALU for the RISC-V execution stage.'
      ],
      topics: [
        '1. Combinational logic fundamentals (output depends purely on current inputs)',
        '2. Canonical SOP / POS & Boolean simplification',
        '3. Truth tables & minterm indexing',
        '4. Karnaugh maps (2, 3, and 4 variables with Gray code ordering)',
        '5. Half adder (Sum = A ⊕ B, Carry = A · B)',
        '6. Full adder (Sum = A ⊕ B ⊕ Cin, Cout = AB + Cin(A ⊕ B))',
        '7. 4-bit Ripple-Carry Adder & propagation delay',
        '8. Two\'s-complement adder/subtractor (Binvert + Cin = 1)',
        '9. Multiplexers (2:1, 4:1 data selectors)',
        '10. Binary decoders (N-to-2^N address/instruction decoding)',
        '11. Magnitude comparators (A=B, A<B, A>B)',
        '12. Arithmetic Logic Unit (ALU) architecture',
        '13. RISC-V datapath integration (ALUSrc MUX & ALU)'
      ],
      levels: {
        beginner: 'A combinational circuit has no memory—its output depends 100% on the inputs present right now, like a calculator key or a railway track switch (Multiplexer). By chaining 1-bit Full Adders together, we build a multi-bit adder that adds numbers inside the CPU.',
        engineering: 'Combinational logic implements memoryless Boolean mappings F: {0,1}^n → {0,1}^m. Karnaugh maps arrange minterms in Gray-code adjacency so adjacent 1-cells differ by a single complemented literal. A Full Adder computes Sum = A ⊕ B ⊕ Cin and Cout = A·B + Cin·(A ⊕ B). Inverting B and asserting Cin=1 converts an adder into a two\'s-complement subtractor (A + ~B + 1).',
        advanced: 'In a Ripple-Carry Adder, the worst-case critical path delay scales linearly as O(N · t_carry) because carry must ripple from LSB (FA0) to MSB (FA_{N-1}). Commercial RISC-V ALUs replace ripple-carry chains with Carry-Lookahead (CLA) or Kogge-Stone parallel prefix trees using Generate (G_i = A_i·B_i) and Propagate (P_i = A_i ⊕ B_i) signals to achieve O(log2 N) delay.'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'Memoryless digital circuitry whose outputs are a direct Boolean function of present inputs after a bounded gate propagation delay (t_pd).' },
        { step: '2. Why is it needed?', text: 'Processors must add register values, compute memory offsets, compare branch operands, and route buses within a single clock phase.' },
        { step: '3. How does it work?', text: 'Gates combine into building blocks: Adders compute arithmetic sums, Decoders activate one-hot lines, and Multiplexers steer selected buses to outputs.' },
        { step: '4. Internal structure', text: 'An ALU contains parallel functional units (Adder/Subtractor, AND, OR, XOR, SLT comparator) feeding a central output Multiplexer controlled by ALUControl.' },
        { step: '5. Real-world application', text: 'In the RISC-V processor (Module 5), the ALU executes R-type/I-type arithmetic, computes LW/SW effective addresses, and evaluates BEQ/BNE equality.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slide S18–S20 (Karnaugh-Map grouping and simplification) below.' },
        { step: '7. Interactive experiment', text: 'Operate the interactive 4-Variable K-Map Simplifier, Half/Full/Ripple-Carry Adder, Multiplexer/Decoder Tester, and ALU Foundation Bench.' },
        { step: '8. Worked example', text: 'Subtract 9 - 5 using 4-bit two\'s complement: A=1001₂ (9), B=0101₂ (5) → ~B=1010₂, Cin=1 → 1001 + 1010 + 1 = 10100₂ → 4-bit Sum = 0100₂ (4), Cout=1.' },
        { step: '9. Practice questions', text: 'How many select lines are required for an 8-to-1 Multiplexer? log2(8) = 3 select lines (S2, S1, S0).' },
        { step: '10. Summary', text: 'Combinational blocks (Adders, MUXes, Decoders, ALU) form the computational muscle of the processor datapath.' }
      ],
      slides: [
        { file: 'assets/source-slides/S18_to_S20_Combinational_and_K-Maps2_page8.png', deck: 'S18–S20 Combinational & K-Maps, Slide 8', caption: 'Course Slide S18–S20 — Karnaugh-map minterm grouping and Boolean simplification', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: K-Map Simplification & 4-Bit Subtraction',
        problem: 'Simplify F(A,B,C,D) = Σm(0, 1, 2, 3, 8, 9, 10, 11) using a 4-variable K-Map.',
        solution: 'Row 00 (m0,m1,m2,m3) and Row 10 (m8,m9,m10,m11) form an 8-cell octet wrap-around group where B=0 across all 8 cells while A, C, and D vary across {0,1}. Therefore, F(A,B,C,D) simplifies directly to ~B.'
      },
      summaryNotes: [
        'Half Adder: Sum = A ⊕ B, Carry = A · B. Full Adder: Sum = A ⊕ B ⊕ Cin, Cout = AB + Cin(A ⊕ B).',
        'Two\'s-complement subtraction: A - B is computed by feeding B through XOR gates controlled by Sub=1 and setting Cin = 1.',
        '2:1 Multiplexer equation: Y = (~S · D0) + (S · D1).',
        'In RISC-V, the ALUSrc multiplexer chooses between register operand rs2 (ALUSrc=0) and the sign-extended immediate (ALUSrc=1).'
      ]
    },

    mod3: {
      id: 'mod3',
      num: 'MODULE 03',
      title: 'Sequential Logic Design',
      subtitle: 'SR/D Latches, Edge-Triggered D Flip-Flops, Clocking, Registers, SISO/SIPO Shift Registers, Synchronous Counters, Program Counter & Moore/Mealy FSMs',
      sourceRef: 'Supplied Course Deck S33–S34 (Sequential Logic Circuits) & S35–S46 (Flip-Flops, Shift Registers, Counters, FSM)',
      prerequisites: [
        { id: 'mod1', label: 'Module 1: Logic Gates' },
        { id: 'mod2', label: 'Module 2: Combinational Circuits' }
      ],
      objectives: [
        'Distinguish combinational logic (memoryless) from sequential logic (state-holding with cross-coupled feedback).',
        'Compare level-sensitive latches (SR Latch, D Latch) with rising-edge-triggered D Flip-Flops.',
        'Construct multi-bit parallel load registers, SISO/SIPO shift registers, and synchronous binary counters.',
        'Explain how the Program Counter (PC) register updates synchronously on each clock edge (PC ← PC + 4 or Branch Target).',
        'Design and trace Moore (output depends only on state) and Mealy (output depends on state and current input) Finite State Machines.'
      ],
      topics: [
        '1. Sequential logic & feedback loops',
        '2. Cross-coupled NOR/NAND SR latch',
        '3. Gated D latch (transparent on CLK=1)',
        '4. Master-slave rising-edge D flip-flop',
        '5. Clock signals, setup time (t_su), hold time (t_h) & clock-to-Q (t_pcq)',
        '6. Multi-bit parallel registers with Write Enable',
        '7. Register file foundations',
        '8. Serial-In Serial-Out (SISO) shift registers',
        '9. Serial-In Parallel-Out (SIPO) shift registers',
        '10. Synchronous binary up-counters',
        '11. Program Counter (PC) register architecture',
        '12. Moore Finite State Machines',
        '13. Mealy Finite State Machines',
        '14. FSM state encoding & next-state logic'
      ],
      levels: {
        beginner: 'If combinational logic is a reflexes-only calculator, sequential logic is a calculator with a notebook. By feeding gate outputs back into inputs and synchronizing updates with a heartbeat (the Clock signal), flip-flops remember bits from one cycle to the next—allowing the CPU to remember which instruction it is executing.',
        engineering: 'A synchronous sequential system consists of a state register (bank of edge-triggered D flip-flops) and combinational next-state logic (S\' = δ(S, X)) plus output logic (Moore: Y = λ(S); Mealy: Y = λ(S, X)). Edge-triggered D flip-flops sample input D strictly on the rising clock transition (0 → 1), preventing transparent race-through across single-cycle datapaths.',
        advanced: 'To prevent metastability, input D must remain stable for at least Setup Time (t_su) before the rising clock edge and Hold Time (t_h) after the edge. The minimum clock period T_clk between two sequential registers separated by combinational delay t_pd must satisfy T_clk ≥ t_pcq + t_pd(max) + t_su.'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'Digital circuits containing storage elements (latches/flip-flops) whose outputs depend on both present inputs and stored historical state.' },
        { step: '2. Why is it needed?', text: 'Without sequential state, a computer could not store a Program Counter, architectural registers, or step through an instruction sequence.' },
        { step: '3. How does it work?', text: 'Bistable cross-coupled gates hold 0 or 1 indefinitely; a clock edge gates when new data D is latched into state Q.' },
        { step: '4. Internal structure', text: 'A rising-edge D Flip-Flop cascades a negative-level Master D-latch into a positive-level Slave D-latch so Q updates only on the 0→1 clock edge.' },
        { step: '5. Real-world application', text: 'The RISC-V Program Counter (PC) and all 32 registers (x0–x31) update synchronously on the rising clock edge at the end of each instruction cycle.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slide S33–S34 (Sequential Logic & Clocked State Retention) below.' },
        { step: '7. Interactive experiment', text: 'Run the Latch vs. D Flip-Flop Timing Lab, SISO/SIPO Shift Register Lab, Synchronous Counter/PC Lab, and Moore/Mealy FSM Explorer below.' },
        { step: '8. Worked example', text: 'Shift byte 1011₂ into a 4-bit SIPO register MSB-first over 4 rising clock edges: Cycle 1: 1000 → Cycle 2: 0100 → Cycle 3: 1010 → Cycle 4: 1011.' },
        { step: '9. Practice questions', text: 'Why must the Program Counter use edge-triggered D flip-flops instead of transparent D latches? A transparent latch would allow PC+4 to race around the adder loop multiple times during a single high clock phase!' },
        { step: '10. Summary', text: 'Edge-triggered flip-flops, registers, counters, and FSMs give digital hardware time-ordered state and control.' }
      ],
      slides: [
        { file: 'assets/source-slides/S33_and_S34__Sequential_Logic_Circuits2_page5.png', deck: 'S33–S34 Sequential Logic, Slide 5', caption: 'Course Slide S33–S34 — Sequential logic feedback and clocked state transitions', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: Program Counter (PC) Stepping & Moore vs. Mealy FSM',
        problem: 'A 32-bit RISC-V Program Counter starts at 0x00000000. Trace its value across 3 sequential clock edges, followed by a JAL instruction with offset +8 at the 4th edge.',
        solution: 'Initial: PC = 0x00. Edge 1 (PCSrc=0): PC ← 0x00 + 4 = 0x04. Edge 2 (PCSrc=0): PC ← 0x04 + 4 = 0x08. Edge 3 (PCSrc=0): PC ← 0x08 + 4 = 0x0C. Edge 4 (JAL at 0x0C, PCSrc=1, imm=8): PC ← 0x0C + 8 = 0x14 (skipping 0x10).'
      },
      summaryNotes: [
        'SR Latch: S=1,R=0 sets Q=1; S=0,R=1 resets Q=0; S=1,R=1 is forbidden/invalid.',
        'D Flip-Flop: Captures Q ← D strictly on the active (rising) clock edge.',
        'SISO / SIPO Shift Registers: Chain N flip-flops (Q_i → D_{i+1}) to serialize or parallelize data streams.',
        'Moore FSM outputs depend only on current state S; Mealy FSM outputs depend on both current state S and current input X.'
      ]
    },

    mod4: {
      id: 'mod4',
      num: 'MODULE 04',
      title: 'Memory Organization',
      subtitle: 'Register Files, RAM vs. ROM, SRAM vs. DRAM, Address Decoding, Load/Store Operations, Memory Hierarchy & Von Neumann vs. Harvard Architectures',
      sourceRef: 'Supplied Course Decks S49–S50 (Register File) & S51–S58 (RAM, ROM & Memory Hierarchy)',
      prerequisites: [
        { id: 'mod2', label: 'Module 2: Decoders & Multiplexers' },
        { id: 'mod3', label: 'Module 3: D Flip-Flops & Registers' }
      ],
      objectives: [
        'Design and operate a 32×32-bit dual-read, single-write Register File using an address decoder, 32-bit registers, and read multiplexers.',
        'Compare volatile memories (6-transistor SRAM vs. 1-transistor-1-capacitor DRAM) and non-volatile Instruction ROM.',
        'Trace how RISC-V Load Word (LW) and Store Word (SW) instructions calculate byte addresses and transfer 32-bit words.',
        'Explain the Memory Hierarchy pyramid (Registers → L1/L2/L3 Cache → Main DRAM → NVMe SSD) in terms of latency, capacity, and cost.',
        'Contrast Von Neumann (unified memory, Von Neumann bottleneck) with Harvard (separate Instruction ROM and Data RAM) architectures.'
      ],
      topics: [
        '1. Random Access Memory (RAM) organization',
        '2. Read-Only Memory (ROM) for instruction storage',
        '3. Static RAM (6T SRAM) for caches & register files',
        '4. Dynamic RAM (1T1C DRAM) for main memory',
        '5. 32×32-bit multi-port Register File architecture (x0 hardwired to 0)',
        '6. Memory hierarchy (Registers → Cache → DRAM → Storage)',
        '7. Von Neumann architecture (unified instruction/data memory)',
        '8. Harvard architecture (split instruction ROM & data RAM)',
        '9. The Von Neumann bottleneck & mitigation via split L1I/L1D caches',
        '10. Word alignment & RISC-V LW / SW memory operations'
      ],
      levels: {
        beginner: 'A CPU cannot keep millions of variables inside its handful of ultra-fast registers. Instead, computers use a pyramid of storage: 32 tiny Registers right inside the core (instant access), small SRAM Caches nearby, gigabytes of DRAM sticks on the motherboard, and terabytes of non-volatile SSD storage.',
        engineering: 'An M × N memory array contains M addressable locations of N bits each, requiring k = log2(M) address lines decoded by a k-to-M row decoder. The RV32I Register File provides two combinational read ports (A1→RD1, A2→RD2) via two 32-to-1 32-bit multiplexers, and one clocked write port (A3, WD3, WE3) via a 5-to-32 write-enable decoder, with register x0 hardwired to 0x00000000.',
        advanced: 'SRAM cells use 6 cross-coupled MOSFETs (~0.5–2 ns access, no refresh needed, low density), whereas DRAM cells store charge on a single trench/stacked capacitor switched by 1 access transistor (1T1C, ~50 ns access, destructive read requiring sense-amplifier restoration and periodic 64 ms refresh).'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'The subsystem of register arrays, SRAM caches, DRAM banks, and ROM arrays that store program instructions and data words.' },
        { step: '2. Why is it needed?', text: 'No single memory technology is simultaneously ultra-fast (sub-nanosecond), high-capacity (terabytes), non-volatile, and inexpensive.' },
        { step: '3. How does it work?', text: 'Address decoders assert a single wordline based on the binary address; bitlines read or write the selected row of storage cells.' },
        { step: '4. Internal structure', text: 'Register File: 5-to-32 Write Decoder + 32 parallel 32-bit D-registers + two 32:1 Read MUXes. Memory: Row/Column decoders + Bitline sense amplifiers.' },
        { step: '5. Real-world application', text: 'In our single-cycle RISC-V CPU, split Instruction ROM and Data RAM (Harvard style) allow fetching an instruction and executing LW/SW in the same clock cycle without bus contention.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slides S49–S50 (Register File Organization & Gate Implementation) and S51–S58 (Memory in the Datapath) below.' },
        { step: '7. Interactive experiment', text: 'Use the 32×32 Register File Port Tester, Configurable RAM/ROM Explorer, and Von Neumann vs. Harvard Bottleneck Simulator below.' },
        { step: '8. Worked example', text: 'Execute SW x4, 0(x0) followed by LW x6, 0(x0) when x4 = 11: SW writes 11 to DataMemory[0] (MemWrite=1); LW reads DataMemory[0]=11 into x6 (MemRead=1, RegWrite=1).' },
        { step: '9. Practice questions', text: 'What happens if an instruction attempts to write 99 into register x0 (ADDI x0, x0, 99)? x0 remains 0 because its storage output is hardwired to ground.' },
        { step: '10. Summary', text: 'Multi-port register files feed the ALU every cycle, while addressable RAM/ROM and cache hierarchies bridge capacity and speed.' }
      ],
      slides: [
        { file: 'assets/source-slides/S49_and_S50_Register_File2_page4.png', deck: 'S49–S50 Register File, Slide 4', caption: 'Course Slide S49–S50 (Page 4) — Register File dual-read, single-write port interface', tag: 'Course Material' },
        { file: 'assets/source-slides/S49_and_S50_Register_File2_page6.png', deck: 'S49–S50 Register File, Slide 6', caption: 'Course Slide S49–S50 (Page 6) — Internal decoder and multiplexer implementation of the Register File', tag: 'Course Material' },
        { file: 'assets/source-slides/S51_to_S58_RAM_ROM2_page10.png', deck: 'S51–S58 RAM/ROM, Slide 10', caption: 'Course Slide S51–S58 — Connecting Instruction ROM and Data RAM to the RISC-V datapath', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: Register File Port Timing & Word Addressing',
        problem: 'Given x1 = 0x00000010 (16) and x2 = 42, trace the exact Register File and Data Memory signals during `SW x2, 8(x1)`.',
        solution: '1) Register File reads rs1=x1 (RD1=16) and rs2=x2 (RD2=42) combinationally; RegWrite=0.\n2) ImmGen sign-extends S-type offset 8.\n3) ALUSrc=1 selects immediate 8; ALU adds 16 + 8 = 24 (0x00000018).\n4) Data Memory receives Address=0x18, WriteData=42, MemWrite=1, and stores 42 at word address 0x18 on the clock edge.'
      },
      summaryNotes: [
        'RV32I Register File: 32 registers (x0–x31), 32 bits wide; two asynchronous read ports (rs1, rs2) and one synchronous write port (rd).',
        'x0 (zero) is hardwired to 0x00000000; writes to x0 are ignored.',
        'SRAM is fast (cache/registers, 6 transistors/bit); DRAM is dense (main RAM, 1 capacitor + 1 transistor/bit, needs refresh).',
        'Harvard architecture separates Instruction Memory and Data Memory buses so instruction fetch and data load/store do not collide.'
      ]
    },

    mod5: {
      id: 'mod5',
      num: 'MODULE 05 · PRIORITY',
      title: 'Computer Organization and RISC-V Processor Architecture',
      subtitle: 'Stored-Program Concept, ISA vs. Microarchitecture, RV32I Registers & ABI Names, R/I/S/B/U/J Formats, Real Assembler, Single-Cycle Datapath, Control Unit & Pipelining Intro',
      sourceRef: 'Supplied Course Decks S63–S74 (RISC-V ISA, Single-Cycle Datapath & Control Unit)',
      prerequisites: [
        { id: 'mod2', label: 'Module 2: Adders, MUXes & ALU' },
        { id: 'mod3', label: 'Module 3: Program Counter & Clocked Registers' },
        { id: 'mod4', label: 'Module 4: 32×32 Register File & RAM/ROM' }
      ],
      objectives: [
        'Distinguish Computer Architecture (the programmer-visible RV32I ISA contract) from Microarchitecture (the hardware datapath and control implementation).',
        'Master the 32 RV32I registers (x0–x31), their ABI names (zero, ra, sp, a0–a7, t0–t6, s0–s11), and all six 32-bit instruction formats (R, I, S, B, U, J).',
        'Assemble RV32I assembly instructions into 32-bit binary/hexadecimal machine code and decode bit fields (opcode, rd, funct3, rs1, rs2, funct7, immediates).',
        'Trace every stage of instruction execution (`Fetch → Decode → Register Read → ALU Execute → Memory Access → Write-Back → Next PC`), including the step-by-step demonstration of `ADD x3, x1, x2` (10 + 20 = 30).',
        'Derive the exact Main Control Unit and ALU Decoder truth tables (`RegWrite, ALUSrc, MemRead, MemWrite, ResultSrc, Branch, Jump, ALUOp`).'
      ],
      topics: [
        'Section A: Computer Organization Fundamentals (Stored-program, ISA vs. Microarchitecture, Datapath, Control, Internal Buses)',
        'Section B: Understanding RISC-V (RISC principles, RV32I meaning, ISA vs. physical silicon chip)',
        'Section C: RISC-V 32 Integer Registers (x0–x31, ABI names, hardwired x0=0)',
        'Section D: RISC-V 32-Bit Instruction Formats (R, I, S, B, U, J bit fields)',
        'Section E: RV32I Instruction Set (ADD, SUB, AND, OR, XOR, SLT, ADDI, LW, SW, BEQ, BNE, LUI, JAL)',
        'Section F: Live Assembly-to-Machine-Code Two-Pass Assembler Lab',
        'Section G: Step-by-Step Fetch, Decode & Execute (`ADD x3, x1, x2` with x1=10, x2=20 → x3=30)',
        'Section H: Interactive Single-Cycle RISC-V Datapath Visualizer',
        'Section I: Control Unit & ALU Decoder Truth-Table Explorer',
        'Section J: Single-Cycle Processor Timing & Critical Path Analysis',
        'Section K: Advanced Processor Introduction (5-Stage Pipeline IF/ID/EX/MEM/WB, Hazards, Forwarding & Stalls)',
        'Section L: Ripes & Logisim Evolution Practical Verification Connection'
      ],
      levels: {
        beginner: 'RISC-V (pronounced "risk-five") is a clean, open-standard language that software uses to talk to hardware. Every instruction is exactly 32 bits long. Using only the parts you already learned—a Program Counter (Module 3), Instruction ROM & Register File (Module 4), and an ALU & Multiplexers (Module 2)—we wire together a complete working CPU!',
        engineering: 'RV32I is a 32-bit load-store Reduced Instruction Set Computer architecture with 32 general-purpose registers (x0–x31) and fixed 32-bit little-endian instruction encodings across six formats (R, I, S, B, U, J) where source/destination register specifiers (rs1[19:15], rs2[24:20], rd[11:7]) remain in fixed bit positions to allow parallel register read during instruction decode.',
        advanced: 'In a single-cycle microarchitecture (CPI = 1.0), all combinational datapath propagation (IMEM access + RegFile read + ALUSrc MUX + ALU evaluation + DMEM access + ResultSrc MUX + RegFile setup) must complete within a single clock period T_clk. Commercial implementations break this long critical path into a 5-stage pipeline (IF, ID, EX, MEM, WB) with forwarding paths and hazard-detection stall logic.'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'The complete integration of digital logic blocks into a stored-program processor capable of fetching, decoding, and executing RV32I machine code.' },
        { step: '2. Why is it needed?', text: 'Fixed-function circuits only solve one problem; a programmable CPU executes any algorithm stored in memory simply by changing software instructions.' },
        { step: '3. How does it work?', text: 'PC indexes Instruction Memory → Control Unit decodes opcode[6:0] → Register File outputs rs1/rs2 → ALU computes result/address → Data Memory or ALU writes back to rd.' },
        { step: '4. Internal structure', text: 'Datapath (PC, +4 Adder, Branch Adder, IMEM, RegFile, ImmGen, ALUSrc MUX, ALU, DMEM, ResultSrc MUX, PCSrc MUX) steered by the Control Unit.' },
        { step: '5. Real-world application', text: 'RISC-V cores power embedded controllers, SSD controllers, IoT SoCs, and university teaching processors simulated in Ripes and Logisim.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slide S72–S74 (Complete Single-Cycle RISC-V Datapath and Control Unit) below.' },
        { step: '7. Interactive experiment', text: 'Use the Live RV32I Assembler, the `ADD x3, x1, x2` (10+20=30) Micro-Step Walkthrough, and the 3D/2D Single-Cycle CPU Datapath Lab.' },
        { step: '8. Worked example', text: 'Encode `ADD x3, x1, x2`: funct7=0000000, rs2=00010 (x2), rs1=00001 (x1), funct3=000, rd=00011 (x3), opcode=0110011 → 0x002081B3.' },
        { step: '9. Practice questions', text: 'Why are rd, rs1, and rs2 kept in the exact same bit positions across R, I, S, and B formats? So the Register File can begin reading rs1 and rs2 immediately before the opcode is even finished decoding!' },
        { step: '10. Summary', text: 'Module 5 unites Modules 1–4 into a working RISC-V processor: combinational ALU/MUXes + sequential PC/Registers + RAM/ROM.' }
      ],
      slides: [
        { file: 'assets/source-slides/S72_to_S74_Single_cycle_data_path_and_control_unit1_page6.png', deck: 'S72–S74 Single-Cycle Datapath, Slide 6', caption: 'Course Slide S72–S74 — Complete Single-Cycle RISC-V Datapath and Control Unit schematic', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: Complete Walkthrough of `ADD x3, x1, x2` (x1 = 10, x2 = 20 → x3 = 30)',
        problem: 'Assume PC = 0x00000008, x1 = 10, and x2 = 20. Trace all 8 hardware sub-steps of `ADD x3, x1, x2` (machine code 0x002081B3).',
        solution: '1. Program Counter: Outputs current address PC = 0x00000008.\n2. Instruction Fetch: Instruction Memory reads 32-bit word 0x002081B3 (`0000000 00010 00001 000 00011 0110011`).\n3. Instruction Decode: Control Unit inspects opcode `0110011` (R-type), funct3 `000`, funct7 `0000000` and asserts `RegWrite=1, ALUSrc=0, MemWrite=0, ResultSrc=00 (ALU), Branch=0, ALUControl=ADD`.\n4. Register Read: Register File reads port A1 = rs1 (`00001` = x1) → RD1 = 10, and port A2 = rs2 (`00010` = x2) → RD2 = 20.\n5. ALU Execution: With ALUSrc=0, the ALUSrc MUX passes RD2 (20) to SrcB. The ALU adds SrcA (10) + SrcB (20) = 30 (0x0000001E).\n6. Memory Access: Bypassed (`MemRead=0, MemWrite=0`).\n7. Write-Back: ResultSrc=00 routes ALU Result (30) to Register File write port WD3 (`rd = 00011 = x3`). On the rising clock edge, `x3 ← 30`.\n8. Next PC: With `Branch=0, Jump=0`, PCSrc=0 selects the PC+4 adder output: `PC ← 0x0000000C`.'
      },
      summaryNotes: [
        'Architecture (ISA) is what software sees (registers, instructions); Microarchitecture is how hardware implements it (single-cycle, pipelined).',
        'RV32I Instruction Formats: R-type (register-register), I-type (immediate/LW), S-type (SW), B-type (BEQ/BNE), U-type (LUI), J-type (JAL).',
        'Control Signals: R-type asserts RegWrite=1, ALUSrc=0; LW asserts RegWrite=1, ALUSrc=1, MemRead=1, ResultSrc=01; SW asserts ALUSrc=1, MemWrite=1; BEQ asserts Branch=1, ALUOp=SUB.',
        'Critical Path: The slowest instruction in a single-cycle CPU is LW (PC → IMEM → RegFile → ALU → DMEM → MUX → RegFile).'
      ]
    },

    mod6: {
      id: 'mod6',
      num: 'MODULE 06',
      title: 'Processor Performance and Advanced Concepts',
      subtitle: 'Iron Law of CPU Performance, CPI, Clock Period, Pipelining, Cache & Locality, Memory-Mapped I/O (0x00000100 LEDs), Processor Validation & XOR/JAL Extensions',
      sourceRef: 'Supplied Course Decks S75–S79 (Complete, Run & Extend RV32I), S80–S82 (Memory-Mapped I/O) & S83–S88 (From Working CPU to Faster CPU)',
      prerequisites: [
        { id: 'mod4', label: 'Module 4: Memory Hierarchy & SRAM/DRAM' },
        { id: 'mod5', label: 'Module 5: Single-Cycle RISC-V Datapath' }
      ],
      objectives: [
        'Calculate processor performance using the Iron Law (`CPU Execution Time = Instruction Count × CPI × Clock Cycle Time`).',
        'Validate a processor implementation using reference instruction traces (Program 1: ADDI/AND/OR/SW/LW) and extend the datapath with `XOR` and `JAL` (Program 2).',
        'Design and trace Memory-Mapped I/O (MMIO) address decoding where `SW` to `0x00000100` drives a 4-bit peripheral LED register (Program 3).',
        'Analyze how 5-stage pipelining overlaps instruction stages (IF, ID, EX, MEM, WB) to increase clock frequency and instruction throughput.',
        'Explain how cache memory exploits temporal and spatial locality to reduce Average Memory Access Time (AMAT).'
      ],
      topics: [
        '1. CPU performance metrics (Latency vs. Throughput)',
        '2. Instruction Count (IC) determined by algorithm, compiler & ISA',
        '3. Cycles Per Instruction (CPI) determined by microarchitecture',
        '4. Clock cycle time (T_clk) & clock frequency (f = 1 / T_clk)',
        '5. The Iron Law: CPU Time = IC × CPI × T_clk',
        '6. 5-Stage Pipelining (IF, ID, EX, MEM, WB overlap & hazards)',
        '7. Cache memory, Temporal Locality & Spatial Locality',
        '8. Memory-Mapped I/O (MMIO address decoder & LED register at 0x00000100)',
        '9. Processor validation methodology & debugging checklist',
        '10. Extending the single-cycle RV32I datapath with XOR and JAL'
      ],
      levels: {
        beginner: 'Once a CPU works correctly, engineers ask: how do we make it faster? The Iron Law shows there are only three knobs: run fewer instructions, take fewer clock cycles per instruction (CPI), or make each clock tick shorter. Pipelining works like a laundry assembly line so 5 instructions overlap at once, while Cache keeps favorite data right next to the CPU.',
        engineering: 'Execution time is T_cpu = IC × CPI × T_clk = (IC × CPI) / f_clk. In a single-cycle processor, CPI = 1.0, but T_clk is bottlenecked by the LW critical path. Splitting the datapath into K=5 balanced pipeline stages reduces T_clk to ~(T_path / K) + t_reg, while caches reduce effective CPI stalls via AMAT = T_hit + MissRate × T_penalty.',
        advanced: 'Extending the single-cycle RV32I processor with JAL requires: (1) J-type immediate extraction and sign-extension in ImmGen, (2) asserting Jump=1 to force PCSrc=1 (PC ← PC + imm_J), and (3) widening the ResultSrc write-back multiplexer to 3-to-1 so ResultSrc=10 writes the link address (PC + 4) into destination register rd.'
      },
      tenStepTeaching: [
        { step: '1. What is it?', text: 'The methodology for verifying, extending, interfacing (MMIO), and quantitatively optimizing a processor architecture.' },
        { step: '2. Why is it needed?', text: 'An untested CPU may silently corrupt state, cannot communicate with external hardware without I/O, and runs slowly if restricted to uncached single-cycle timing.' },
        { step: '3. How does it work?', text: 'Self-checking test programs validate datapath stages; address decoders map peripheral registers into the memory space; pipelining and caches accelerate throughput.' },
        { step: '4. Internal structure', text: 'MMIO adds an address comparator (Addr == 0x00000100) ANDed with MemWrite to enable a 4-bit peripheral D-register driving external LEDs.' },
        { step: '5. Real-world application', text: 'Microcontroller GPIO pins, UARTs, and timers in embedded systems are controlled by reading and writing Memory-Mapped I/O addresses.' },
        { step: '6. Visual explanation', text: 'Inspect Course Slides S75–S79 (Program 1 & Program 2 JAL Traces), S80–S82 (Memory-Mapped LED I/O), and S83–S88 (Faster CPU) below.' },
        { step: '7. Interactive experiment', text: 'Run the Iron Law CPU Performance Calculator, 5-Stage Pipeline Cycle Visualizer, Cache Locality Simulator, and MMIO LED Decoder Lab.' },
        { step: '8. Worked example', text: 'A program of 2,000 instructions runs on a single-cycle CPU (CPI=1, T_clk=5 ns) in 10,000 ns (10 μs). On a 5-stage pipeline (CPI=1.2, T_clk=1.2 ns), it completes in 2,880 ns (3.47× speedup).' },
        { step: '9. Practice questions', text: 'In Program 2 (`JAL x0, 8` at PC=0x0C), why is `ADDI x4, x0, 99` at PC=0x10 not executed? Because JAL updates PC to 0x0C + 8 = 0x14!' },
        { step: '10. Summary', text: 'Module 6 completes our journey: validating the RV32I processor, connecting it to the physical world via MMIO, and scaling performance with pipelining and caches.' }
      ],
      slides: [
        { file: 'assets/source-slides/S75-S79__Complete,_Run_and_Extend_the_Single-Cycle_RISC-V_Processor1_page4.png', deck: 'S75–S79 Complete & Run RV32I, Slide 4', caption: 'Course Slide S75–S79 (Page 4) — Program 1 validation trace (ADDI, AND, OR, SW, LW)', tag: 'Course Material' },
        { file: 'assets/source-slides/S75-S79__Complete,_Run_and_Extend_the_Single-Cycle_RISC-V_Processor1_page8.png', deck: 'S75–S79 Extend RV32I, Slide 8', caption: 'Course Slide S75–S79 (Page 8) — Program 2 trace showing XOR and JAL skipping address 0x10', tag: 'Course Material' },
        { file: 'assets/source-slides/S80-S82_Memory_Mapped_IO1_page5.png', deck: 'S80–S82 Memory-Mapped I/O, Slide 5', caption: 'Course Slide S80–S82 — Memory-Mapped I/O address decoder and 4-bit LED register at 0x00000100', tag: 'Course Material' },
        { file: 'assets/source-slides/S83-S88_From_Working_CPU_to_Faster_CPU1_page11.png', deck: 'S83–S88 Faster CPU, Slide 11', caption: 'Course Slide S83–S88 — Performance optimization via Pipelining and Cache Memory', tag: 'Course Material' }
      ],
      workedExample: {
        title: 'Worked Example: Memory-Mapped I/O Address Decoding & Iron Law Speedup',
        problem: '1) Trace `ADDI x1, x0, 256; ADDI x2, x0, 5; SW x2, 0(x1)`. 2) Compute speedup when moving from Single-Cycle (CPI=1.0, T_clk=5.0 ns) to a 5-Stage Pipeline (effective CPI=1.25 due to hazards, T_clk=1.2 ns).',
        solution: '1) x1 = 256 (0x00000100), x2 = 5 (0101₂). SW calculates Effective Address = 256 + 0 = 0x00000100 and asserts MemWrite=1. The MMIO address decoder recognizes 0x00000100, asserts LED_WE=1, and latches 0101₂ (LED3=0, LED2=1, LED1=0, LED0=1).\n2) Single-Cycle time per instruction = 1.0 × 5.0 ns = 5.0 ns. Pipelined time per instruction = 1.25 × 1.2 ns = 1.5 ns. Speedup = 5.0 / 1.5 = 3.33×.'
      },
      summaryNotes: [
        'Iron Law: CPU Execution Time = Instruction Count × CPI × Clock Cycle Time.',
        'Program 1 validates register file, ALU (AND/OR), and Data Memory (SW/LW): x1=8, x2=3, x3=0, x4=11, Mem[0]=11, x6=11.',
        'Program 2 validates XOR and JAL: JAL at 0x0C with offset +8 jumps to 0x14, skipping the instruction at 0x10.',
        'Program 3 validates Memory-Mapped I/O: SW to 0x00000100 asserts LED write-enable and lights the 4-bit LED peripheral.'
      ]
    }
  };

  // RV32I 32 Integer Registers Reference Table (Module 5 Section C)
  const RV32_REGISTERS_TABLE = [
    { reg: 'x0', abi: 'zero', role: 'Hardwired Constant 0 (Always reads 0, writes ignored)', saver: '—' },
    { reg: 'x1', abi: 'ra', role: 'Return Address (stores link PC+4 on JAL/JALR calls)', saver: 'Caller' },
    { reg: 'x2', abi: 'sp', role: 'Stack Pointer (points to top of call stack in RAM)', saver: 'Callee' },
    { reg: 'x3', abi: 'gp', role: 'Global Pointer (base for static global variables)', saver: '—' },
    { reg: 'x4', abi: 'tp', role: 'Thread Pointer (thread-local storage base)', saver: '—' },
    { reg: 'x5–x7', abi: 't0–t2', role: 'Temporary Registers (scratchpad values across ALU ops)', saver: 'Caller' },
    { reg: 'x8', abi: 's0 / fp', role: 'Saved Register 0 / Frame Pointer', saver: 'Callee' },
    { reg: 'x9', abi: 's1', role: 'Saved Register 1 (preserved across function calls)', saver: 'Callee' },
    { reg: 'x10–x11', abi: 'a0–a1', role: 'Function Arguments 0–1 & Return Values', saver: 'Caller' },
    { reg: 'x12–x17', abi: 'a2–a7', role: 'Function Arguments 2–7', saver: 'Caller' },
    { reg: 'x18–x27', abi: 's2–s11', role: 'Saved Registers 2–11 (long-lived local variables)', saver: 'Callee' },
    { reg: 'x28–x31', abi: 't3–t6', role: 'Temporary Registers 3–6', saver: 'Caller' }
  ];

  // RV32I Instruction Formats Reference (Module 5 Section D)
  const RV32_FORMATS = [
    { fmt: 'R-Type', fields: '[31:25] funct7 (7b) | [24:20] rs2 (5b) | [19:15] rs1 (5b) | [14:12] funct3 (3b) | [11:7] rd (5b) | [6:0] opcode (0110011)', use: 'Register-to-Register ALU ops (ADD, SUB, AND, OR, XOR, SLT)' },
    { fmt: 'I-Type', fields: '[31:20] imm[11:0] (12b) | [19:15] rs1 (5b) | [14:12] funct3 (3b) | [11:7] rd (5b) | [6:0] opcode (0010011 / 0000011)', use: 'Immediate ALU ops (ADDI, ANDI, ORI, XORI) & Loads (LW)' },
    { fmt: 'S-Type', fields: '[31:25] imm[11:5] (7b) | [24:20] rs2 (5b) | [19:15] rs1 (5b) | [14:12] funct3 (3b) | [11:7] imm[4:0] (5b) | [6:0] opcode (0100011)', use: 'Memory Stores (SW: M[rs1 + sign_ext(imm)] ← rs2)' },
    { fmt: 'B-Type', fields: '[31:25] imm[12|10:5] | [24:20] rs2 | [19:15] rs1 | [14:12] funct3 | [11:7] imm[4:1|11] | [6:0] opcode (1100011)', use: 'Conditional Branches (BEQ, BNE: PC ← PC + imm if cond)' },
    { fmt: 'U-Type', fields: '[31:12] imm[31:12] (20b) | [11:7] rd (5b) | [6:0] opcode (0110111)', use: 'Upper Immediate (LUI: rd ← imm << 12)' },
    { fmt: 'J-Type', fields: '[31:12] imm[20|10:1|11|19:12] (20b) | [11:7] rd (5b) | [6:0] opcode (1101111)', use: 'Unconditional Jumps (JAL: rd ← PC+4; PC ← PC + imm)' }
  ];

  global.ITM_COURSE_DATA = {
    MODULES: MODULES,
    RV32_REGISTERS_TABLE: RV32_REGISTERS_TABLE,
    RV32_FORMATS: RV32_FORMATS
  };
})(typeof window !== 'undefined' ? window : globalThis);
