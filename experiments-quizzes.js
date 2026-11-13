(function(global) {
  'use strict';

  // 8 Practical Laboratory Experiments derived from the Supplied Design Manuals & Practical Guides
  const PRACTICAL_EXPERIMENTS = [
    {
      id: 'exp1',
      num: 'EXPERIMENT 01',
      name: 'Logic Gate Truth-Table & Universal NAND Verification',
      sourceRef: 'Design Manual 1 · Logic Gates & S07',
      moduleLink: 'mod1',
      aim: 'To verify the truth tables of NOT, AND, OR, NAND, NOR, XOR, and XNOR gates and synthesize fundamental gates using universal 2-input NAND gates.',
      objectives: [
        'Test all 4 binary input combinations (00, 01, 10, 11) across standard logic gates.',
        'Verify that NAND(A,A) = ~A, NAND(NAND(A,B),NAND(A,B)) = A·B, and 3 NANDs implement A+B.'
      ],
      requiredConcepts: ['Binary voltage states (0V / VDD)', 'Boolean algebra', 'De Morgan\'s theorem'],
      diagram: 'A ──┬──[NAND]── Y = ~A      A ──[NAND]──┬──[NAND]── Y = A·B\n    └──┘                    B ──┘       └──┘',
      procedure: [
        '1. Open the Digital Logic Laboratory or Module 1 Gate Explorer.',
        '2. Toggle inputs A and B through 00, 01, 10, 11 and record the observed output.',
        '3. Switch to the NAND Universality bench and compare the 4-NAND XOR output against a native XOR gate.'
      ],
      inputValues: 'A ∈ {0, 1}, B ∈ {0, 1}',
      expectedOutput: 'AND: [0,0,0,1] · OR: [0,1,1,1] · NAND: [1,1,1,0] · XOR: [0,1,1,0]',
      liveSimType: 'GATE_BENCH',
      observation: 'Observed simulation outputs match theoretical Boolean truth tables across all four input states.',
      conclusion: 'Fundamental combinational gates operate deterministically on binary inputs, and 2-input NAND gates are functionally complete.',
      vivaQuestions: [
        { q: 'Why are NAND and NOR called universal gates?', a: 'Because any Boolean function (NOT, AND, OR, XOR, adders) can be implemented using exclusively NAND gates or exclusively NOR gates.' },
        { q: 'How many 2-input NAND gates are required to build a 2-input XOR gate?', a: 'Four 2-input NAND gates.' }
      ]
    },
    {
      id: 'exp2',
      num: 'EXPERIMENT 02',
      name: 'Boolean Expression Simplification & Karnaugh Map Grouping',
      sourceRef: 'Design Manual 2 · Boolean Expressions & S18–S20',
      moduleLink: 'mod2',
      aim: 'To translate a canonical Sum-of-Products (SOP) Boolean expression into a minimal gate circuit using a 4-variable Karnaugh Map.',
      objectives: [
        'Plot minterms on a Gray-code ordered 4-variable K-Map.',
        'Form largest power-of-two prime implicant groups (octets, quads, pairs) and verify the simplified circuit.'
      ],
      requiredConcepts: ['Minterms (Σm)', 'Gray code adjacency', 'Boolean absorption & complementation laws'],
      diagram: '      CD=00  01  11  10\nAB=00 [ m0 ][ m1][ m3][ m2]\nAB=01 [ m4 ][ m5][ m7][ m6]\nAB=11 [m12 ][m13][m15][m14]\nAB=10 [ m8 ][ m9][m11][m10]',
      procedure: [
        '1. Select minterms m(0, 1, 2, 3, 8, 9, 10, 11) in the Module 2 K-Map Laboratory.',
        '2. Observe the wrap-around 8-cell octet group across rows AB=00 and AB=10.',
        '3. Verify that the simplified expression reduces to F = ~B.'
      ],
      inputValues: 'Minterms Σm(0, 1, 2, 3, 8, 9, 10, 11)',
      expectedOutput: 'Minimal SOP Expression: F(A,B,C,D) = ~B',
      liveSimType: 'KMAP_BENCH',
      observation: 'Grouping adjacent power-of-two minterms eliminates redundant variables that change state within the group.',
      conclusion: 'Karnaugh Map minimization substantially reduces gate count and propagation delay prior to hardware synthesis.',
      vivaQuestions: [
        { q: 'Why do K-Map row and column headers use 00, 01, 11, 10 instead of binary 00, 01, 10, 11?', a: 'Gray code ordering guarantees that physically adjacent cells differ by only a single bit, allowing visual elimination of complemented literals.' }
      ]
    },
    {
      id: 'exp3',
      num: 'EXPERIMENT 03',
      name: 'Car Security Digital Control & Decoder/Multiplexer Routing',
      sourceRef: 'Design Manual 3 · Car Security System & Multiplexers',
      moduleLink: 'mod2',
      aim: 'To model a digital car-security alarm controller using combinational logic gates and test 4-to-1 Multiplexer signal routing.',
      objectives: [
        'Combine ArmedSwitch (A), DoorSensor (D), and VibrationSensor (V) into AlarmOutput = A · (D + V).',
        'Verify 4-to-1 Multiplexer routing controlled by select lines S1, S0.'
      ],
      requiredConcepts: ['Combinational control equations', '2:1 and 4:1 Multiplexers', 'Address Decoders'],
      diagram: 'Armed (A) ───────────┐\nDoor (D) ───┬─[OR]───┴─[AND]───► Alarm Siren (Y = A · (D + V))\nVib  (V) ───┘',
      procedure: [
        '1. Set Armed (A = 1) and trigger either Door (D = 1) or Vibration (V = 1).',
        '2. Verify Alarm asserts HIGH (1) only when A=1 and at least one sensor is active.',
        '3. In the Multiplexer bench, toggle S1,S0 from 00 to 11 and verify the selected data channel reaches output Y.'
      ],
      inputValues: 'A=1, D=1, V=0; MUX Select S1=1, S0=0',
      expectedOutput: 'Alarm Y = 1; MUX Output = D2',
      liveSimType: 'MUX_BENCH',
      observation: 'The alarm remains suppressed whenever Armed=0 and triggers immediately when Armed=1 and (D+V)=1.',
      conclusion: 'Real-world embedded control problems map directly to Boolean equations and multiplexer routing trees.',
      vivaQuestions: [
        { q: 'How is a Multiplexer used inside the RISC-V processor datapath?', a: 'The ALUSrc MUX selects between register rs2 and the sign-extended immediate; the ResultSrc MUX selects between ALU result, Data Memory, and PC+4.' }
      ]
    },
    {
      id: 'exp4',
      num: 'EXPERIMENT 04',
      name: 'Half Adder, Full Adder, Ripple-Carry Adder & ALU Design',
      sourceRef: 'Supplied Sessions S21–S32 · Adders, ALU & Hardware Implementation',
      moduleLink: 'mod2',
      aim: 'To construct 1-bit Half/Full Adders, chain four Full Adders into a 4-bit Ripple-Carry Adder/Subtractor, and verify ALU operation selection.',
      objectives: [
        'Verify Full Adder outputs Sum = A ⊕ B ⊕ Cin and Cout = AB + Cin(A ⊕ B).',
        'Perform 4-bit addition (9 + 5 = 14) and two\'s-complement subtraction (9 - 5 = 4) using Binvert + Cin=1.'
      ],
      requiredConcepts: ['Carry propagation', 'Two\'s-complement subtraction (A + ~B + 1)', 'Signed overflow (C3 ⊕ C4)'],
      diagram: 'Cin(Sub) ──► [FA0] ──C1──► [FA1] ──C2──► [FA2] ──C3──► [FA3] ──► Cout',
      procedure: [
        '1. Enter A = 9 (1001₂) and B = 5 (0101₂) in the 4-bit Ripple-Carry Adder lab.',
        '2. With Sub = 0 (ADD), observe stage carries and verify Sum = 14 (1110₂), Cout = 0.',
        '3. Switch Sub = 1 (SUBTRACT) to invert B and set Cin=1; verify Result = 4 (0100₂), Cout = 1.'
      ],
      inputValues: 'A = 9 (1001₂), B = 5 (0101₂), Mode = ADD (0) / SUB (1)',
      expectedOutput: 'ADD: 14 (1110₂), Cout=0 · SUB: 4 (0100₂), Cout=1, Overflow=0',
      liveSimType: 'ADDER_BENCH',
      observation: 'Each Full Adder stage waits for the incoming carry bit from the less-significant stage before settling.',
      conclusion: 'A single N-bit Ripple-Carry Adder hardware block performs both addition and two\'s-complement subtraction by conditionally inverting operand B and setting Cin=1.',
      vivaQuestions: [
        { q: 'What limits the maximum clock speed of a wide Ripple-Carry Adder?', a: 'The carry propagation delay from LSB (FA0) through N stages to MSB (FA_{N-1}).' }
      ]
    },
    {
      id: 'exp5',
      num: 'EXPERIMENT 05',
      name: 'Sequential D Flip-Flops, SISO/SIPO Shift Registers, Counter & PC',
      sourceRef: 'Supplied Sessions S33–S46 · Sequential Logic Manuals',
      moduleLink: 'mod3',
      aim: 'To analyze rising-edge-triggered D Flip-Flops, 4-bit SISO/SIPO shift registers, synchronous binary counters, and Program Counter (PC) state transitions.',
      objectives: [
        'Contrast level-sensitive latch transparency with rising-edge D Flip-Flop state capture.',
        'Shift a 4-bit serial stream into a SIPO register and step a synchronous Program Counter by +4.'
      ],
      requiredConcepts: ['Rising clock edge (0→1)', 'Setup & hold times', 'State feedback', 'Moore & Mealy FSMs'],
      diagram: 'Serial In ──► [DFF3] ──Q3──► [DFF2] ──Q2──► [DFF1] ──Q1──► [DFF0] ──► Serial Out',
      procedure: [
        '1. Toggle input D while Clock is LOW (0) and verify Q does not change until the rising clock edge.',
        '2. Shift bits 1, 0, 1, 1 into the 4-bit Shift Register across 4 clock pulses.',
        '3. Step the synchronous counter / PC and verify state progression.'
      ],
      inputValues: 'Serial Bit Stream: 1, 0, 1, 1 over 4 rising clock edges',
      expectedOutput: 'Parallel Q[3:0] after 4 edges = 1101₂',
      liveSimType: 'SEQ_BENCH',
      observation: 'State updates occur strictly at the rising clock transition, preventing combinational race conditions.',
      conclusion: 'Edge-triggered flip-flops enable deterministic multi-bit registers, shift registers, counters, and the CPU Program Counter.',
      vivaQuestions: [
        { q: 'What is the difference between a Moore FSM and a Mealy FSM?', a: 'In a Moore machine, outputs depend solely on the current state; in a Mealy machine, outputs depend on both the current state and the current inputs.' }
      ]
    },
    {
      id: 'exp6',
      num: 'EXPERIMENT 06',
      name: '32×32 Register File & RAM/ROM Read/Write Operations',
      sourceRef: 'Supplied Sessions S49–S58 · Register File & RAM/ROM',
      moduleLink: 'mod4',
      aim: 'To verify dual-port asynchronous reads and single-port synchronous writes in the 32×32-bit RV32I Register File (including hardwired x0=0) and inspect Data RAM load/store addressing.',
      objectives: [
        'Write values to registers x1 and x2 with RegWrite=1 and read both simultaneously via ports rs1 and rs2.',
        'Attempt a write to register x0 and verify x0 remains 0x00000000.'
      ],
      requiredConcepts: ['5-to-32 write decoder', '32:1 read multiplexers', 'x0 hardwired zero', 'SRAM vs. DRAM'],
      diagram: 'rs1[4:0] ──► [Read Port 1 MUX] ──► RD1 (32b)\nrs2[4:0] ──► [Read Port 2 MUX] ──► RD2 (32b)\nrd[4:0] + WE3 ──► [5:32 Write Decoder] ──► Regs x1..x31 (x0=0)',
      procedure: [
        '1. In the Module 4 Register File lab, set Write Port rd = x1, WriteData = 25, RegWrite = 1, and pulse Clock.',
        '2. Set Write Port rd = x0, WriteData = 99, RegWrite = 1, and pulse Clock.',
        '3. Read rs1 = x1 and rs2 = x0 and verify RD1 = 25 and RD2 = 0.'
      ],
      inputValues: 'Write(x1, 25, WE=1); Write(x0, 99, WE=1); Read(x1, x0)',
      expectedOutput: 'RD1 (x1) = 25 · RD2 (x0) = 0',
      liveSimType: 'REGFILE_BENCH',
      observation: 'Reads occur combinationally as soon as rs1/rs2 change, whereas writes commit on the clock edge when RegWrite=1 (except x0, which always reads 0).',
      conclusion: 'The dual-read, single-write Register File supplies two 32-bit operands to the ALU and captures one 32-bit result every instruction cycle.',
      vivaQuestions: [
        { q: 'Why does RISC-V hardwire x0 to zero instead of making it a normal writable register?', a: 'A hardwired zero simplifies the ISA so common operations like register move (ADDI rd, rs1, 0), load immediate (ADDI rd, x0, imm), and NOP (ADDI x0, x0, 0) need no separate hardware instructions.' }
      ]
    },
    {
      id: 'exp7',
      num: 'EXPERIMENT 07',
      name: 'Single-Cycle RISC-V Processor Execution & XOR/JAL Extension',
      sourceRef: 'Supplied Sessions S63–S79 · RV32I Datapath, Program 1 & Program 2',
      moduleLink: 'mod5',
      aim: 'To assemble and execute Course Program A (ADDI, AND, OR, SW, LW) and Course Program B (XOR, JAL) on the single-cycle RISC-V datapath and verify register, memory, and PC state.',
      objectives: [
        'Verify Program A final state: x1=8, x2=3, x3=0, x4=11, DataMemory[0]=11, x6=11.',
        'Verify Program B JAL redirect at PC=0x0C (target 0x14, skipping ADDI x4, x0, 99 at 0x10) and final state: x3=9, x4=0, x5=14, x6=12, x7=13.'
      ],
      requiredConcepts: ['RV32I machine encoding', 'Single-cycle datapath', 'Control signals', 'J-type PC offset'],
      diagram: 'PC ──► [Inst ROM] ──► [Control + RegFile + ImmGen] ──► [ALU] ──► [Data RAM] ──► Write-Back MUX',
      procedure: [
        '1. Load Course Program A in the CPU Architecture Laboratory and step through all 6 instructions.',
        '2. Verify x1=8, x2=3, x3=0, x4=11, DataMemory[0]=11, and x6=11.',
        '3. Load Course Program B, step across JAL at 0x0C, and confirm PC jumps directly to 0x14 (leaving x4=0).'
      ],
      inputValues: 'Course Program A (6 instructions) & Course Program B (8 instructions)',
      expectedOutput: 'Prog A: x6=11, Mem[0]=11 · Prog B: x3=9, x4=0 (skipped), x5=14, x6=12, x7=13',
      liveSimType: 'RISCV_BENCH',
      observation: 'During JAL x0, 8 at PC=0x0C, PCSrc selects PC + 8 = 0x14 while x0 discards the link address PC+4.',
      conclusion: 'The single-cycle datapath and control unit accurately execute arithmetic, logical, load/store, and jump instructions.',
      vivaQuestions: [
        { q: 'In Program B, why does `x4` remain 0 even though `ADDI x4, x0, 99` is present at address 0x10?', a: 'Because `JAL x0, 8` at address 0x0C adds offset 8 to 0x0C, redirecting the next PC to 0x14 and bypassing 0x10.' }
      ]
    },
    {
      id: 'exp8',
      num: 'EXPERIMENT 08',
      name: 'Memory-Mapped I/O LED Peripheral (0x00000100) & Performance Evaluation',
      sourceRef: 'Supplied Sessions S80–S88 · Memory-Mapped I/O & Faster CPU',
      moduleLink: 'mod6',
      aim: 'To interface a 4-bit LED peripheral register at memory-mapped address 0x00000100 using Store Word (SW) and evaluate processor speedup using the Iron Law and 5-stage pipelining.',
      objectives: [
        'Execute Program C (`ADDI x1, x0, 256; ADDI x2, x0, 5; SW x2, 0(x1)`) and verify the MMIO decoder latches 0101₂ into the LED register.',
        'Compare Single-Cycle execution time against a 5-stage pipelined processor with data forwarding.'
      ],
      requiredConcepts: ['Memory-Mapped I/O address decoding', 'MemWrite qualifying gate', 'Iron Law (IC × CPI × T_clk)', '5-stage pipeline'],
      diagram: 'ALU Effective Addr (0x00000100) ──► [Addr == 0x100 Comparator] ──┬─[AND]──► LED_WE ──► [4-Bit LED Reg]\nControl Unit MemWrite (1) ───────────────────────────────────────┘',
      procedure: [
        '1. Select Course Program C in the CPU Architecture Laboratory.',
        '2. Step through `ADDI x1, x0, 256`, `ADDI x2, x0, 5`, and `SW x2, 0(x1)`.',
        '3. Observe the 4-bit LED array illuminate pattern `0101₂` (5) and then `1111₂` (15).'
      ],
      inputValues: 'Store 5 (0101₂) and 15 (1111₂) to address 0x00000100 (256)',
      expectedOutput: 'MMIO_WE = 1; LED Register updates to 5 (0b0101) then 15 (0b1111)',
      liveSimType: 'MMIO_BENCH',
      observation: 'Standard SW instructions control external hardware peripherals without requiring special I/O instructions when an address decoder maps 0x00000100 to a peripheral register.',
      conclusion: 'Memory-Mapped I/O seamlessly unifies memory and peripheral access in RISC-V, while pipelining and caches scale instruction throughput.',
      vivaQuestions: [
        { q: 'Why does the MMIO decoder check both `Address == 0x00000100` AND `MemWrite == 1`?', a: 'Without checking `MemWrite == 1`, any instruction whose ALU output happens to equal 256 (such as `ADDI x1, x0, 256`) would accidentally overwrite the LED register!' }
      ]
    }
  ];

  // Comprehensive Question Bank across all 6 DDCA Modules (Part 6 Assessment System)
  const QUIZ_QUESTIONS = [
    // Module 1
    {
      id: 'q1_1', module: 'mod1', type: 'MCQ', category: 'Binary & Two\'s Complement',
      question: 'What is the 8-bit two\'s-complement binary representation of decimal -13?',
      options: ['11110011', '10001101', '11110010', '00001101'],
      answerIndex: 0,
      explanation: '+13 in 8-bit binary is 00001101₂. Inverting all bits gives 11110010₂, and adding 1 yields 11110011₂ (0xF3).'
    },
    {
      id: 'q1_2', module: 'mod1', type: 'MCQ', category: 'NAND Universality',
      question: 'According to De Morgan\'s law, what Boolean function is produced by NAND(NAND(A, A), NAND(B, B))?',
      options: ['A + B (OR)', 'A · B (AND)', 'A ⊕ B (XOR)', '~(A + B) (NOR)'],
      answerIndex: 0,
      explanation: 'NAND(A,A) = ~A and NAND(B,B) = ~B. Feeding both into a third NAND gives ~((~A) · (~B)) = A + B by De Morgan\'s theorem.'
    },
    {
      id: 'q1_3', module: 'mod1', type: 'SHORT', category: 'Radix Conversion',
      question: 'Convert decimal 45 into hexadecimal (format: 0x2D).',
      expectedAnswer: '0x2D',
      explanation: '45 = 2 × 16 + 13 (D in hex) = 0x2D (binary 00101101₂).'
    },
    // Module 2
    {
      id: 'q2_1', module: 'mod2', type: 'MCQ', category: 'Full Adder & Subtraction',
      question: 'How does a 4-bit Ripple-Carry Adder compute two\'s-complement subtraction (A - B) without a separate subtractor circuit?',
      options: [
        'Invert bits of B using XOR gates (Binvert=1) and set initial Carry-In (Cin) = 1',
        'Invert bits of A and set initial Carry-In (Cin) = 0',
        'AND bits of A and B and shift left by 1',
        'Set Carry-In (Cin) = 1 without changing B'
      ],
      answerIndex: 0,
      explanation: 'In two\'s complement, -B = ~B + 1. Therefore A - B = A + ~B + 1, achieved by XORing B with Sub=1 and setting Cin=1.'
    },
    {
      id: 'q2_2', module: 'mod2', type: 'MCQ', category: 'Karnaugh Maps',
      question: 'In a 4-variable Karnaugh Map, simplifying an 8-cell adjacent group (octet) of 1s eliminates how many variables from the product term?',
      options: ['3 variables (leaving a single literal)', '2 variables (leaving 2 literals)', '1 variable (leaving 3 literals)', 'All 4 variables'],
      answerIndex: 0,
      explanation: 'A group of 2^k adjacent minterms eliminates k variables. For an octet (2^3 = 8 cells), 3 variables change state and are eliminated, leaving 4 - 3 = 1 literal.'
    },
    // Module 3
    {
      id: 'q3_1', module: 'mod3', type: 'MCQ', category: 'Sequential Logic & Clocking',
      question: 'Why must the RISC-V Program Counter (PC) be built from edge-triggered D flip-flops rather than level-sensitive transparent D latches?',
      options: [
        'Transparent latches would allow PC + 4 feedback to race through the adder multiple times during a single high clock level',
        'D latches cannot store binary 1s',
        'D flip-flops require no clock signal',
        'Transparent latches can only count downward'
      ],
      answerIndex: 0,
      explanation: 'Because the PC output feeds the PC+4 adder whose output loops back to the PC input, a level-sensitive latch would continuously race during CLK=1. Edge triggering samples the next PC strictly once per rising clock edge.'
    },
    {
      id: 'q3_2', module: 'mod3', type: 'MCQ', category: 'Finite State Machines',
      question: 'Which statement accurately distinguishes a Moore FSM from a Mealy FSM?',
      options: [
        'Moore outputs depend only on the current state, whereas Mealy outputs depend on both current state and current inputs',
        'Mealy machines do not use flip-flops',
        'Moore machines cannot detect bit sequences',
        'Mealy outputs only change on falling clock edges'
      ],
      answerIndex: 0,
      explanation: 'In a Moore FSM, output logic is a function of state registers only: Y = λ(S). In a Mealy FSM, output logic is a function of state and input: Y = λ(S, X).'
    },
    // Module 4
    {
      id: 'q4_1', module: 'mod4', type: 'MCQ', category: 'Register File & Memory',
      question: 'In the RV32I 32×32-bit Register File, what happens when the instruction `ADDI x0, x1, 50` executes with RegWrite = 1?',
      options: [
        'Register x0 remains 0x00000000 because x0 is hardwired to zero',
        'Register x0 is updated to x1 + 50',
        'The processor triggers an illegal instruction exception',
        'Data Memory address 0 is overwritten with 50'
      ],
      answerIndex: 0,
      explanation: 'In RISC-V RV32I, register x0 (zero) is architecturally hardwired to 0. Any write targeting rd = x0 is discarded so x0 always reads 0.'
    },
    {
      id: 'q4_2', module: 'mod4', type: 'MCQ', category: 'SRAM vs DRAM & Architecture',
      question: 'Why are CPU L1/L2 caches constructed from 6-transistor SRAM while main system memory uses 1T1C DRAM?',
      options: [
        'SRAM offers much faster access without capacitor refresh cycles, whereas DRAM achieves much higher bit density per area at lower cost',
        'DRAM is non-volatile like an SSD, whereas SRAM is volatile',
        'SRAM requires 64 ms periodic refresh cycles, whereas DRAM never refreshes',
        'DRAM cannot be connected to a memory controller'
      ],
      answerIndex: 0,
      explanation: '6T SRAM uses cross-coupled inverters for fast (~1 ns) static retention without refresh, ideal for on-die caches. 1T1C DRAM packs 1 bit into a single capacitor + transistor for gigabyte density, but requires periodic refresh.'
    },
    // Module 5
    {
      id: 'q5_1', module: 'mod5', type: 'MCQ', category: 'RISC-V Instruction Encoding',
      question: 'During execution of `ADD x3, x1, x2` (where x1 = 10 and x2 = 20), what are the control signal values for RegWrite, ALUSrc, MemWrite, and ResultSrc?',
      options: [
        'RegWrite=1, ALUSrc=0 (rs2), MemWrite=0, ResultSrc=00 (ALU)',
        'RegWrite=1, ALUSrc=1 (Imm), MemWrite=0, ResultSrc=01 (Memory)',
        'RegWrite=0, ALUSrc=1 (Imm), MemWrite=1, ResultSrc=00 (ALU)',
        'RegWrite=1, ALUSrc=0 (rs2), MemWrite=1, ResultSrc=10 (PC+4)'
      ],
      answerIndex: 0,
      explanation: 'ADD is an R-type instruction: it reads rs1 (10) and rs2 (20) with ALUSrc=0, adds them in the ALU (30), does not write memory (MemWrite=0), selects the ALU output (ResultSrc=00), and writes 30 into x3 (RegWrite=1).'
    },
    {
      id: 'q5_2', module: 'mod5', type: 'SHORT', category: 'RISC-V Execution Trace',
      question: 'In Course Program B (`ADDI x1,x0,12; ADDI x2,x0,5; XOR x3,x1,x2`), what decimal value is stored in x3 after `XOR x3, x1, x2` executes?',
      expectedAnswer: '9',
      explanation: '12 in binary is 1100₂ and 5 in binary is 0101₂. Bitwise XOR: 1100₂ ⊕ 0101₂ = 1001₂ = 9.'
    },
    // Module 6
    {
      id: 'q6_1', module: 'mod6', type: 'MCQ', category: 'Memory-Mapped I/O (Course S80–S82)',
      question: 'In Course Program C (`ADDI x1, x0, 256; ADDI x2, x0, 5; SW x2, 0(x1)`), how does the hardware know to update the 4-bit LED peripheral register at address 0x00000100?',
      options: [
        'An address decoder detects ALU Address == 0x00000100 AND MemWrite == 1, asserting the LED register write-enable',
        'A special RISC-V `LED_OUT` opcode is executed by the ALU',
        'Register x2 is physically wired directly to the LED pins at all times',
        'The Program Counter jumps to address 0x00000100'
      ],
      answerIndex: 0,
      explanation: 'Memory-Mapped I/O uses standard load/store instructions (SW). When the ALU effective address equals 0x00000100 (256) and the Control Unit asserts MemWrite=1, the MMIO decoder enables the LED output register.'
    },
    {
      id: 'q6_2', module: 'mod6', type: 'SHORT', category: 'CPU Performance Iron Law',
      question: 'A program executes 1,000 instructions on a single-cycle RISC-V processor with CPI = 1.0 and Clock Period = 5 ns. What is the total CPU execution time in nanoseconds (enter number only)?',
      expectedAnswer: '5000',
      explanation: 'By the Iron Law: CPU Execution Time = Instruction Count × CPI × Clock Period = 1,000 × 1.0 × 5 ns = 5,000 ns (5 μs).'
    }
  ];

  global.ITM_EXPERIMENTS_QUIZZES = {
    PRACTICAL_EXPERIMENTS,
    QUIZ_QUESTIONS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ITM_EXPERIMENTS_QUIZZES;
  }
})(typeof window !== 'undefined' ? window : globalThis);
