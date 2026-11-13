/* Inside the Machine v5.1 — study-aid data: glossary, RV32I reference, formula sheet.
   Pure data + tiny helpers, no DOM access, so it is unit-tested in Node. */
(function (global) {
  'use strict';

  // term, definition, module the term is first taught in
  const GLOSSARY = [
    ['Bit', 'One binary digit: a 0 or a 1. Hardware stores it as a low or high voltage.', 'mod1'],
    ['Byte', '8 bits. The smallest unit a RISC-V memory address points at.', 'mod1'],
    ['Word (RV32)', '32 bits = 4 bytes. The native size of RV32I registers and instructions.', 'mod1'],
    ['MSB / LSB', 'Most / least significant bit: the leftmost / rightmost bit of a number.', 'mod1'],
    ['Radix (base)', 'The number of symbols per digit: 2 for binary, 8 for octal, 10 for decimal, 16 for hexadecimal.', 'mod1'],
    ["Two's complement", 'Signed integer encoding: invert all bits and add 1 to negate. N bits cover -2^(N-1) to 2^(N-1)-1.', 'mod1'],
    ['Overflow', 'The true result does not fit in N bits. For signed addition it happens when both operands have the same sign and the result has the other.', 'mod1'],
    ['CMOS', 'Complementary MOS: pairs of PMOS (pull-up) and NMOS (pull-down) transistors, so a gate draws almost no current while holding a value.', 'mod1'],
    ['Noise margin', 'How much unwanted voltage a signal can pick up and still be read as the correct logic level.', 'mod1'],
    ['Logic gate', 'A circuit that computes a Boolean function of its inputs (AND, OR, NOT, NAND, NOR, XOR, XNOR).', 'mod1'],
    ['Truth table', 'A table listing the output for every combination of inputs. n inputs give 2^n rows.', 'mod1'],
    ["De Morgan's laws", '~(A·B) = ~A + ~B and ~(A+B) = ~A · ~B. Used to convert between AND/OR forms and to build with NAND/NOR only.', 'mod1'],
    ['Universal gate', 'A gate type that can build every other gate on its own. NAND and NOR are universal.', 'mod1'],
    ['ISA', 'Instruction Set Architecture: the contract between software and hardware (instructions, registers, memory model). RISC-V is an ISA.', 'mod1'],
    ['Microarchitecture', 'How one particular processor implements an ISA (single-cycle, pipelined, caches, ...). Many designs can implement the same ISA.', 'mod1'],
    ['Combinational logic', 'Outputs depend only on the current inputs. No memory. Examples: adders, multiplexers, decoders, ALUs.', 'mod2'],
    ['Minterm', 'A product (AND) term that is 1 for exactly one input combination. A sum-of-minterms expression is a canonical form of any truth table.', 'mod2'],
    ['Karnaugh map (K-map)', 'A grid layout of a truth table in Gray-code order so adjacent 1s can be grouped to simplify a Boolean expression.', 'mod2'],
    ['Half adder', 'Adds two bits: Sum = A xor B, Carry = A·B.', 'mod2'],
    ['Full adder', 'Adds two bits plus a carry-in: Sum = A xor B xor Cin, Cout = AB + Cin(A xor B).', 'mod2'],
    ['Ripple-carry adder', 'A chain of full adders where each carry-out feeds the next carry-in. Simple, but delay grows linearly with width.', 'mod2'],
    ['Multiplexer (MUX)', 'Selects one of several inputs using select lines. A 2^k:1 MUX needs k select bits.', 'mod2'],
    ['Decoder', 'Turns an n-bit code into a one-hot output among 2^n lines. Used for register write-enable and memory addressing.', 'mod2'],
    ['ALU', 'Arithmetic Logic Unit: combinational block that performs add, subtract, AND, OR, XOR, compare and so on, chosen by a control code.', 'mod2'],
    ['Sequential logic', 'Outputs depend on current inputs and stored state. Needs a memory element such as a latch or flip-flop.', 'mod3'],
    ['Latch', 'Level-sensitive storage element (for example an SR or D latch): transparent while enabled.', 'mod3'],
    ['D flip-flop', 'Edge-triggered storage element: copies D to Q only on the active clock edge, then holds it.', 'mod3'],
    ['Clock', 'A periodic signal that tells every flip-flop when to sample its input, so the whole machine moves in lock-step.', 'mod3'],
    ['Setup / hold time', 'Window around the clock edge in which D must be stable. Violating it can make the flip-flop go metastable.', 'mod3'],
    ['Register', 'A group of flip-flops sharing one clock that stores a multi-bit value.', 'mod3'],
    ['Shift register', 'Registers chained so each clock moves the stored bits one position (SISO, SIPO, PISO, PIPO).', 'mod3'],
    ['Counter', 'A register plus an incrementer. The Program Counter is a counter that normally adds 4 each cycle.', 'mod3'],
    ['FSM', 'Finite State Machine: a state register plus next-state and output logic. Moore outputs depend on state only; Mealy outputs also depend on inputs.', 'mod3'],
    ['Program Counter (PC)', 'Register holding the address of the instruction being executed. Updated to PC+4, or to a branch/jump target.', 'mod3'],
    ['Register file', 'Array of registers with read ports and a write port. RV32I has 32 registers of 32 bits, with x0 hard-wired to 0.', 'mod4'],
    ['SRAM', 'Static RAM: 6 transistors per bit, fast, no refresh. Used for registers and caches.', 'mod4'],
    ['DRAM', 'Dynamic RAM: 1 transistor + 1 capacitor per bit, dense and cheap, needs periodic refresh. Used for main memory.', 'mod4'],
    ['ROM', 'Read-only memory: contents fixed or rarely written. Often holds boot code or the instruction memory in teaching designs.', 'mod4'],
    ['Memory hierarchy', 'Registers, cache, DRAM, storage: each level is bigger and slower than the one above it.', 'mod4'],
    ['Locality', 'Programs reuse recent data (temporal) and nearby data (spatial). Caches exploit both.', 'mod4'],
    ['Von Neumann vs Harvard', 'One shared memory for code and data, versus separate instruction and data memories.', 'mod4'],
    ['Instruction format', 'Layout of the 32 bits of an instruction. RV32I has R, I, S, B, U and J formats.', 'mod5'],
    ['Opcode', 'The low 7 bits of a RISC-V instruction. Together with funct3/funct7 it selects the operation.', 'mod5'],
    ['Immediate', 'A constant stored inside the instruction. It is sign-extended to 32 bits by the immediate generator.', 'mod5'],
    ['ABI name', 'Convention name for a register, for example x1 = ra (return address), x2 = sp (stack pointer), x10 = a0 (first argument).', 'mod5'],
    ['Datapath', 'The wires, registers, ALU and memories through which data flows while an instruction executes.', 'mod5'],
    ['Control unit', 'Decodes the opcode and produces control signals (RegWrite, ALUSrc, MemWrite, ResultSrc, Branch, ...) that steer the datapath.', 'mod5'],
    ['Single-cycle processor', 'Executes each instruction in exactly one (long) clock cycle: CPI = 1, but the clock must fit the slowest instruction.', 'mod5'],
    ['Assembler', 'Translates assembly text into machine code. A two-pass assembler first records label addresses, then encodes instructions.', 'mod5'],
    ['Branch', 'A conditional change of the PC (BEQ, BNE, ...). The target is PC + a sign-extended, 2-byte-aligned offset.', 'mod5'],
    ['Memory-mapped I/O', 'Devices (LEDs, UART) appear at fixed memory addresses; loads and stores to them talk to the device.', 'mod6'],
    ['CPI', 'Cycles Per Instruction: the average number of clock cycles each instruction takes.', 'mod6'],
    ['Iron Law', 'CPU time = Instruction Count x CPI x Clock Period. Every performance idea changes one of these three.', 'mod6'],
    ['Pipelining', 'Overlapping the execution of several instructions in different stages (IF, ID, EX, MEM, WB) to raise throughput.', 'mod6'],
    ['Hazard', 'Something that stops the next instruction entering the pipeline: structural, data, or control.', 'mod6'],
    ['Forwarding (bypassing)', 'Sending a result directly from a later pipeline stage to an earlier one instead of waiting for write-back.', 'mod6'],
    ['Stall (bubble)', 'A pipeline cycle in which no useful work advances, inserted to resolve a hazard.', 'mod6'],
    ['Cache', 'Small, fast memory that holds recently used blocks of main memory. A hit is served from it; a miss goes to the next level.', 'mod6'],
    ['Amdahl\'s Law', 'Overall speedup = 1 / ((1 - f) + f/s) when a fraction f of the work is sped up by factor s.', 'mod6']
  ].map(([term, def, module]) => ({ term, def, module }));

  // RV32I base instruction reference. `lab` = supported by the in-app assembler/simulator.
  const R = 'R', I = 'I', S = 'S', B = 'B', U = 'U', J = 'J';
  const INSTRUCTIONS = [
    // mnemonic, fmt, opcode, funct3, funct7, syntax, meaning, lab
    ['ADD', R, '0110011', '000', '0000000', 'add rd, rs1, rs2', 'rd = rs1 + rs2', 1],
    ['SUB', R, '0110011', '000', '0100000', 'sub rd, rs1, rs2', 'rd = rs1 - rs2', 1],
    ['SLL', R, '0110011', '001', '0000000', 'sll rd, rs1, rs2', 'rd = rs1 << rs2[4:0]', 0],
    ['SLT', R, '0110011', '010', '0000000', 'slt rd, rs1, rs2', 'rd = (rs1 < rs2) signed ? 1 : 0', 1],
    ['SLTU', R, '0110011', '011', '0000000', 'sltu rd, rs1, rs2', 'rd = (rs1 < rs2) unsigned ? 1 : 0', 0],
    ['XOR', R, '0110011', '100', '0000000', 'xor rd, rs1, rs2', 'rd = rs1 ^ rs2', 1],
    ['SRL', R, '0110011', '101', '0000000', 'srl rd, rs1, rs2', 'rd = rs1 >> rs2[4:0] (zero fill)', 0],
    ['SRA', R, '0110011', '101', '0100000', 'sra rd, rs1, rs2', 'rd = rs1 >> rs2[4:0] (sign fill)', 0],
    ['OR', R, '0110011', '110', '0000000', 'or rd, rs1, rs2', 'rd = rs1 | rs2', 1],
    ['AND', R, '0110011', '111', '0000000', 'and rd, rs1, rs2', 'rd = rs1 & rs2', 1],
    ['ADDI', I, '0010011', '000', '', 'addi rd, rs1, imm', 'rd = rs1 + imm', 1],
    ['SLTI', I, '0010011', '010', '', 'slti rd, rs1, imm', 'rd = (rs1 < imm) signed ? 1 : 0', 1],
    ['SLTIU', I, '0010011', '011', '', 'sltiu rd, rs1, imm', 'rd = (rs1 < imm) unsigned ? 1 : 0', 0],
    ['XORI', I, '0010011', '100', '', 'xori rd, rs1, imm', 'rd = rs1 ^ imm', 1],
    ['ORI', I, '0010011', '110', '', 'ori rd, rs1, imm', 'rd = rs1 | imm', 1],
    ['ANDI', I, '0010011', '111', '', 'andi rd, rs1, imm', 'rd = rs1 & imm', 1],
    ['SLLI', I, '0010011', '001', '0000000', 'slli rd, rs1, shamt', 'rd = rs1 << shamt', 0],
    ['SRLI', I, '0010011', '101', '0000000', 'srli rd, rs1, shamt', 'rd = rs1 >> shamt (zero fill)', 0],
    ['SRAI', I, '0010011', '101', '0100000', 'srai rd, rs1, shamt', 'rd = rs1 >> shamt (sign fill)', 0],
    ['LB', I, '0000011', '000', '', 'lb rd, imm(rs1)', 'rd = sext(mem8[rs1 + imm])', 0],
    ['LH', I, '0000011', '001', '', 'lh rd, imm(rs1)', 'rd = sext(mem16[rs1 + imm])', 0],
    ['LW', I, '0000011', '010', '', 'lw rd, imm(rs1)', 'rd = mem32[rs1 + imm]', 1],
    ['LBU', I, '0000011', '100', '', 'lbu rd, imm(rs1)', 'rd = zext(mem8[rs1 + imm])', 0],
    ['LHU', I, '0000011', '101', '', 'lhu rd, imm(rs1)', 'rd = zext(mem16[rs1 + imm])', 0],
    ['JALR', I, '1100111', '000', '', 'jalr rd, imm(rs1)', 'rd = PC + 4; PC = (rs1 + imm) & ~1', 0],
    ['SB', S, '0100011', '000', '', 'sb rs2, imm(rs1)', 'mem8[rs1 + imm] = rs2[7:0]', 0],
    ['SH', S, '0100011', '001', '', 'sh rs2, imm(rs1)', 'mem16[rs1 + imm] = rs2[15:0]', 0],
    ['SW', S, '0100011', '010', '', 'sw rs2, imm(rs1)', 'mem32[rs1 + imm] = rs2', 1],
    ['BEQ', B, '1100011', '000', '', 'beq rs1, rs2, label', 'if (rs1 == rs2) PC += offset', 1],
    ['BNE', B, '1100011', '001', '', 'bne rs1, rs2, label', 'if (rs1 != rs2) PC += offset', 1],
    ['BLT', B, '1100011', '100', '', 'blt rs1, rs2, label', 'if (rs1 < rs2) signed: PC += offset', 0],
    ['BGE', B, '1100011', '101', '', 'bge rs1, rs2, label', 'if (rs1 >= rs2) signed: PC += offset', 0],
    ['BLTU', B, '1100011', '110', '', 'bltu rs1, rs2, label', 'if (rs1 < rs2) unsigned: PC += offset', 0],
    ['BGEU', B, '1100011', '111', '', 'bgeu rs1, rs2, label', 'if (rs1 >= rs2) unsigned: PC += offset', 0],
    ['LUI', U, '0110111', '', '', 'lui rd, imm20', 'rd = imm20 << 12', 1],
    ['AUIPC', U, '0010111', '', '', 'auipc rd, imm20', 'rd = PC + (imm20 << 12)', 1],
    ['JAL', J, '1101111', '', '', 'jal rd, label', 'rd = PC + 4; PC += offset', 1]
  ].map(([mnemonic, fmt, opcode, funct3, funct7, syntax, meaning, lab]) => ({ mnemonic, fmt, opcode, funct3, funct7, syntax, meaning, lab: !!lab }));

  const FORMAT_LAYOUT = {
    R: [['funct7', 7], ['rs2', 5], ['rs1', 5], ['funct3', 3], ['rd', 5], ['opcode', 7]],
    I: [['imm[11:0]', 12], ['rs1', 5], ['funct3', 3], ['rd', 5], ['opcode', 7]],
    S: [['imm[11:5]', 7], ['rs2', 5], ['rs1', 5], ['funct3', 3], ['imm[4:0]', 5], ['opcode', 7]],
    B: [['imm[12|10:5]', 7], ['rs2', 5], ['rs1', 5], ['funct3', 3], ['imm[4:1|11]', 5], ['opcode', 7]],
    U: [['imm[31:12]', 20], ['rd', 5], ['opcode', 7]],
    J: [['imm[20|10:1|11|19:12]', 20], ['rd', 5], ['opcode', 7]]
  };

  const FORMULAS = [
    { name: 'Unsigned range (N bits)', expr: '0 … 2^N − 1', note: '8 bits: 0…255 · 32 bits: 0…4 294 967 295', module: 'mod1' },
    { name: "Two's-complement range", expr: '−2^(N−1) … 2^(N−1) − 1', note: '8 bits: −128…127 · 32 bits: −2 147 483 648…2 147 483 647', module: 'mod1' },
    { name: 'Negate (two\'s complement)', expr: '−x = ~x + 1', note: 'Invert every bit, then add one.', module: 'mod1' },
    { name: 'Sign extension', expr: 'copy the MSB into the new upper bits', note: '8-bit 0xF3 → 32-bit 0xFFFFFFF3', module: 'mod1' },
    { name: 'Truth-table size', expr: 'rows = 2^n', note: 'n input variables.', module: 'mod1' },
    { name: "De Morgan", expr: '~(A·B) = ~A + ~B   ~(A+B) = ~A·~B', note: 'Swap AND/OR and invert every literal.', module: 'mod1' },
    { name: 'Full adder', expr: 'S = A⊕B⊕Cin   Cout = AB + Cin(A⊕B)', note: 'Chain N of them for an N-bit ripple-carry adder.', module: 'mod2' },
    { name: 'Subtract with an adder', expr: 'A − B = A + ~B + 1', note: 'Invert B and set the carry-in to 1.', module: 'mod2' },
    { name: 'MUX select width', expr: 'k = log2(inputs)', note: '4:1 MUX → 2 select bits.', module: 'mod2' },
    { name: 'Memory addressing', expr: 'address bits = log2(locations)', note: '4 KiB of bytes → 12 address bits.', module: 'mod4' },
    { name: 'Memory capacity', expr: 'bytes = 2^address bits × bytes per location', note: '', module: 'mod4' },
    { name: 'Next PC', expr: 'PC + 4   or   PC + offset (taken branch / JAL)', note: 'Each RV32I instruction is 4 bytes.', module: 'mod5' },
    { name: 'Branch / JAL reach', expr: 'B: ±4 KiB   J: ±1 MiB', note: 'Offsets are multiples of 2; bit 0 is not stored.', module: 'mod5' },
    { name: 'Iron Law', expr: 'T = IC × CPI × Tclk', note: 'Instruction count × cycles per instruction × clock period.', module: 'mod6' },
    { name: 'Clock frequency', expr: 'f = 1 / Tclk', note: '2 ns period = 500 MHz.', module: 'mod6' },
    { name: 'Speedup', expr: 'S = T_old / T_new', note: '', module: 'mod6' },
    { name: "Amdahl's Law", expr: 'S = 1 / ((1 − f) + f / s)', note: 'f = fraction improved, s = speedup of that fraction.', module: 'mod6' },
    { name: 'Ideal pipeline speedup', expr: '≈ number of stages', note: 'Hazards and stalls reduce it. CPI = 1 + stall cycles per instruction.', module: 'mod6' },
    { name: 'Average memory access time', expr: 'AMAT = hit time + miss rate × miss penalty', note: '', module: 'mod6' }
  ];

  // ---- helpers -------------------------------------------------------------
  const toU32 = n => (Number(n) >>> 0);
  const toS32 = n => (Number(n) | 0);
  function parseNumber(text) {
    const t = String(text).trim().replace(/_/g, '');
    if (!t) return null;
    let v = null;
    if (/^-?0x[0-9a-f]+$/i.test(t)) v = parseInt(t, 16);
    else if (/^-?0b[01]+$/i.test(t)) v = parseInt(t.replace('0b', '').replace('0B', ''), 2);
    else if (/^-?\d+$/.test(t)) v = parseInt(t, 10);
    return v === null || Number.isNaN(v) || Math.abs(v) > 0xFFFFFFFF ? null : v;
  }
  function describeWord(n) {
    const u = toU32(n), s = toS32(n);
    const bin = u.toString(2).padStart(32, '0');
    const bytes = [24, 16, 8, 0].map(sh => (u >>> sh) & 0xFF);
    return {
      unsigned: u,
      signed: s,
      hex: '0x' + u.toString(16).toUpperCase().padStart(8, '0'),
      binary: bin.replace(/(.{8})(?=.)/g, '$1_'),
      octal: '0o' + u.toString(8),
      ascii: bytes.map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·')).join('')
    };
  }
  // Decode a 32-bit machine word into fields + mnemonic using the reference table.
  function decodeWord(word) {
    const w = toU32(word);
    const bits = w.toString(2).padStart(32, '0');
    const opcode = bits.slice(25), rd = bits.slice(20, 25), f3 = bits.slice(17, 20), rs1 = bits.slice(12, 17), rs2 = bits.slice(7, 12), f7 = bits.slice(0, 7);
    const fmtByOpcode = { '0110011': R, '0010011': I, '0000011': I, '1100111': I, '0100011': S, '1100011': B, '0110111': U, '0010111': U, '1101111': J };
    const fmt = fmtByOpcode[opcode];
    if (!fmt) return { word: w, bits, opcode, fmt: null, mnemonic: null };
    const bin = x => parseInt(x, 2);
    let imm = null;
    if (fmt === I) imm = toS32(w) >> 20;
    else if (fmt === S) imm = (toS32(w) >> 25 << 5) | bin(bits.slice(20, 25));
    else if (fmt === B) imm = ((toS32(w) >> 31) << 12) | (bin(bits[24]) << 11) | (bin(bits.slice(1, 7)) << 5) | (bin(bits.slice(20, 24)) << 1);
    else if (fmt === U) imm = w >>> 12;
    else if (fmt === J) imm = ((toS32(w) >> 31) << 20) | (bin(bits.slice(12, 20)) << 12) | (bin(bits[11]) << 11) | (bin(bits.slice(1, 11)) << 1);
    let hit = INSTRUCTIONS.find(i => i.fmt === fmt && i.opcode === opcode &&
      (fmt === U || fmt === J || i.funct3 === f3) &&
      (fmt === R ? i.funct7 === f7 : true) &&
      // shift-immediates are distinguished by funct7 (imm[11:5])
      (!(fmt === I && opcode === '0010011' && (f3 === '001' || f3 === '101')) || i.funct7 === f7));
    return { word: w, bits, opcode, rd: bin(rd), rs1: bin(rs1), rs2: bin(rs2), funct3: f3, funct7: f7, imm, fmt, mnemonic: hit ? hit.mnemonic : null, info: hit || null };
  }

  global.ITM_STUDENT_DATA = { GLOSSARY, INSTRUCTIONS, FORMAT_LAYOUT, FORMULAS, parseNumber, describeWord, decodeWord, toU32, toS32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.ITM_STUDENT_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
