(function(global) {
  'use strict';

  const ABI_TO_REG = {
    zero:0, ra:1, sp:2, gp:3, tp:4,
    t0:5, t1:6, t2:7,
    s0:8, fp:8, s1:9,
    a0:10, a1:11, a2:12, a3:13, a4:14, a5:15, a6:16, a7:17,
    s2:18, s3:19, s4:20, s5:21, s6:22, s7:23, s8:24, s9:25, s10:26, s11:27,
    t3:28, t4:29, t5:30, t6:31
  };
  const REG_TO_ABI = [
    'zero','ra','sp','gp','tp','t0','t1','t2','s0','s1',
    'a0','a1','a2','a3','a4','a5','a6','a7',
    's2','s3','s4','s5','s6','s7','s8','s9','s10','s11','t3','t4','t5','t6'
  ];

  function parseRegister(token) {
    if (!token) throw new Error('Missing register operand');
    const clean = String(token).trim().toLowerCase();
    if (/^x([0-9]|[12][0-9]|3[01])$/.test(clean)) {
      return parseInt(clean.slice(1), 10);
    }
    if (Object.prototype.hasOwnProperty.call(ABI_TO_REG, clean)) {
      return ABI_TO_REG[clean];
    }
    throw new Error(`Unknown RV32I register "${token}" (use x0–x31 or ABI names like zero, ra, sp, a0, t0, s0)`);
  }

  function parseImmediate(token, labels, currentPC, isBranchOrJump) {
    if (token === undefined || token === null) throw new Error('Missing immediate operand');
    const clean = String(token).trim();
    if (labels && Object.prototype.hasOwnProperty.call(labels, clean)) {
      return isBranchOrJump ? (labels[clean] - currentPC) : labels[clean];
    }
    const val = Number(clean);
    if (!Number.isNaN(val)) return val | 0;
    throw new Error(`Invalid immediate or unknown label "${token}"`);
  }

  // Pack 32-bit instruction encodings according to official RV32I Unprivileged Specification
  function encodeRType(funct7, rs2, rs1, funct3, rd, opcode) {
    return (((funct7 & 0x7F) << 25) |
            ((rs2 & 0x1F) << 20) |
            ((rs1 & 0x1F) << 15) |
            ((funct3 & 0x7) << 12) |
            ((rd & 0x1F) << 7) |
            (opcode & 0x7F)) >>> 0;
  }

  function encodeIType(imm12, rs1, funct3, rd, opcode) {
    return ((((imm12 & 0xFFF) << 20) |
            ((rs1 & 0x1F) << 15) |
            ((funct3 & 0x7) << 12) |
            ((rd & 0x1F) << 7) |
            (opcode & 0x7F))) >>> 0;
  }

  function encodeSType(imm12, rs2, rs1, funct3, opcode) {
    const imm11_5 = (imm12 >> 5) & 0x7F;
    const imm4_0  = imm12 & 0x1F;
    return (((imm11_5 << 25) |
            ((rs2 & 0x1F) << 20) |
            ((rs1 & 0x1F) << 15) |
            ((funct3 & 0x7) << 12) |
            (imm4_0 << 7) |
            (opcode & 0x7F))) >>> 0;
  }

  function encodeBType(imm13, rs2, rs1, funct3, opcode) {
    const imm12   = (imm13 >> 12) & 0x1;
    const imm11   = (imm13 >> 11) & 0x1;
    const imm10_5 = (imm13 >> 5)  & 0x3F;
    const imm4_1  = (imm13 >> 1)  & 0xF;
    return (((imm12 << 31) |
            (imm10_5 << 25) |
            ((rs2 & 0x1F) << 20) |
            ((rs1 & 0x1F) << 15) |
            ((funct3 & 0x7) << 12) |
            (imm4_1 << 8) |
            (imm11 << 7) |
            (opcode & 0x7F))) >>> 0;
  }

  function encodeUType(imm20, rd, opcode) {
    return (((imm20 & 0xFFFFF) << 12) |
            ((rd & 0x1F) << 7) |
            (opcode & 0x7F)) >>> 0;
  }

  function encodeJType(imm21, rd, opcode) {
    const imm20    = (imm21 >> 20) & 0x1;
    const imm19_12 = (imm21 >> 12) & 0xFF;
    const imm11    = (imm21 >> 11) & 0x1;
    const imm10_1  = (imm21 >> 1)  & 0x3FF;
    return (((imm20 << 31) |
            (imm10_1 << 21) |
            (imm11 << 20) |
            (imm19_12 << 12) |
            ((rd & 0x1F) << 7) |
            (opcode & 0x7F))) >>> 0;
  }

  // Real Two-Pass RV32I Educational Assembler
  function assembleProgram(sourceText) {
    const rawLines = String(sourceText || '').split(/\r?\n/);
    const labels = {};
    const cleanedLines = [];
    let pc = 0;

    // Pass 1: Strip comments, extract labels, assign byte addresses
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].split('#')[0].split('//')[0].trim();
      if (!line) continue;
      while (line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const labelName = line.slice(0, colonIdx).trim();
        if (labelName) labels[labelName] = pc;
        line = line.slice(colonIdx + 1).trim();
      }
      if (!line) continue;
      cleanedLines.push({ lineNo: i + 1, pc, text: line });
      pc += 4;
    }

    // Pass 2: Parse operands and encode 32-bit machine words
    const instructions = [];
    for (let i = 0; i < cleanedLines.length; i++) {
      const item = cleanedLines[i];
      const parts = item.text.replace(/,/g, ' ').trim().split(/\s+/);
      const op = parts[0].toUpperCase();
      const args = parts.slice(1);

      let rd = 0, rs1 = 0, rs2 = 0, imm = 0, word = 0, format = 'R-Type';

      if (['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT'].includes(op)) {
        if (args.length < 3) throw new Error(`Line ${item.lineNo}: ${op} requires rd, rs1, rs2`);
        rd = parseRegister(args[0]);
        rs1 = parseRegister(args[1]);
        rs2 = parseRegister(args[2]);
        const f3Map = { ADD: 0, SUB: 0, SLT: 2, XOR: 4, OR: 6, AND: 7 };
        const f7 = op === 'SUB' ? 0x20 : 0x00;
        word = encodeRType(f7, rs2, rs1, f3Map[op], rd, 0x33);
        format = 'R-Type';
      } else if (['ADDI', 'ANDI', 'ORI', 'XORI', 'SLTI'].includes(op)) {
        if (args.length < 3) throw new Error(`Line ${item.lineNo}: ${op} requires rd, rs1, imm`);
        rd = parseRegister(args[0]);
        rs1 = parseRegister(args[1]);
        imm = parseImmediate(args[2], labels, item.pc, false);
        const f3Map = { ADDI: 0, SLTI: 2, XORI: 4, ORI: 6, ANDI: 7 };
        word = encodeIType(imm, rs1, f3Map[op], rd, 0x13);
        format = 'I-Type';
      } else if (op === 'LW') {
        rd = parseRegister(args[0]);
        const memMatch = (args[1] || '').match(/^(-?(?:0x[\da-fA-F]+|\d+))\(([^)]+)\)$/);
        if (memMatch) {
          imm = parseImmediate(memMatch[1], labels, item.pc, false);
          rs1 = parseRegister(memMatch[2]);
        } else {
          rs1 = parseRegister(args[1]);
          imm = parseImmediate(args[2] || '0', labels, item.pc, false);
        }
        word = encodeIType(imm, rs1, 0x2, rd, 0x03);
        format = 'I-Type';
      } else if (op === 'SW') {
        rs2 = parseRegister(args[0]);
        const memMatch = (args[1] || '').match(/^(-?(?:0x[\da-fA-F]+|\d+))\(([^)]+)\)$/);
        if (memMatch) {
          imm = parseImmediate(memMatch[1], labels, item.pc, false);
          rs1 = parseRegister(memMatch[2]);
        } else {
          rs1 = parseRegister(args[1]);
          imm = parseImmediate(args[2] || '0', labels, item.pc, false);
        }
        word = encodeSType(imm, rs2, rs1, 0x2, 0x23);
        format = 'S-Type';
      } else if (op === 'BEQ' || op === 'BNE') {
        if (args.length < 3) throw new Error(`Line ${item.lineNo}: ${op} requires rs1, rs2, offset/label`);
        rs1 = parseRegister(args[0]);
        rs2 = parseRegister(args[1]);
        imm = parseImmediate(args[2], labels, item.pc, true);
        const f3 = op === 'BEQ' ? 0x0 : 0x1;
        word = encodeBType(imm, rs2, rs1, f3, 0x63);
        format = 'B-Type';
      } else if (op === 'LUI' || op === 'AUIPC') {
        if (args.length < 2) throw new Error(`Line ${item.lineNo}: ${op} requires rd, imm20`);
        rd = parseRegister(args[0]);
        const rawImm20 = parseImmediate(args[1], labels, item.pc, false);
        imm = (rawImm20 & 0xFFFFF) << 12;
        word = encodeUType(rawImm20, rd, op === 'LUI' ? 0x37 : 0x17);
        format = 'U-Type';
      } else if (op === 'JAL') {
        if (args.length === 1) {
          rd = 1; // default ra
          imm = parseImmediate(args[0], labels, item.pc, true);
        } else {
          rd = parseRegister(args[0]);
          imm = parseImmediate(args[1], labels, item.pc, true);
        }
        word = encodeJType(imm, rd, 0x6F);
        format = 'J-Type';
      } else {
        throw new Error(`Line ${item.lineNo}: Unsupported instruction "${op}"`);
      }

      const bin32 = (word >>> 0).toString(2).padStart(32, '0');
      const hex32 = '0x' + (word >>> 0).toString(16).toUpperCase().padStart(8, '0');
      instructions.push({
        index: i,
        pc: item.pc,
        pcHex: '0x' + item.pc.toString(16).toUpperCase().padStart(2, '0'),
        asm: item.text,
        op,
        rd,
        rs1,
        rs2,
        imm,
        word,
        hex: hex32,
        binary: bin32,
        format,
        fields: {
          opcode: bin32.slice(25, 32),
          rdBits: bin32.slice(20, 25),
          funct3: bin32.slice(17, 20),
          rs1Bits: bin32.slice(12, 17),
          rs2Bits: bin32.slice(7, 12),
          funct7: bin32.slice(0, 7),
          top12: bin32.slice(0, 12)
        }
      });
    }

    return { instructions, labels };
  }

  // Decode Control Signals for any instruction
  function getControlSignals(op, zeroFlag, addr) {
    const base = {
      RegWrite: 0, ALUSrc: 0, MemRead: 0, MemWrite: 0,
      ResultSrc: '00 (ALU)', Branch: 0, Jump: 0, PCSrc: 0,
      ALUOp: '00', ALUControl: 'ADD', MMIO_WE: 0
    };
    if (['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT'].includes(op)) {
      base.RegWrite = 1; base.ALUSrc = 0; base.ALUOp = '10 (R-Type)'; base.ALUControl = op;
    } else if (['ADDI', 'ANDI', 'ORI', 'XORI', 'SLTI'].includes(op)) {
      base.RegWrite = 1; base.ALUSrc = 1; base.ALUOp = '10 (I-ALU)'; base.ALUControl = op.replace(/I$/, '');
    } else if (op === 'LW') {
      base.RegWrite = 1; base.ALUSrc = 1; base.MemRead = 1; base.ResultSrc = '01 (Mem)'; base.ALUControl = 'ADD';
    } else if (op === 'SW') {
      base.ALUSrc = 1; base.MemWrite = 1; base.ResultSrc = 'XX'; base.ALUControl = 'ADD';
      if ((addr >>> 0) === 0x00000100) base.MMIO_WE = 1;
    } else if (op === 'BEQ' || op === 'BNE') {
      base.Branch = 1; base.ALUOp = '01 (Branch)'; base.ALUControl = 'SUB';
      const taken = op === 'BEQ' ? Boolean(zeroFlag) : !Boolean(zeroFlag);
      base.PCSrc = taken ? 1 : 0;
    } else if (op === 'JAL') {
      base.RegWrite = 1; base.Jump = 1; base.PCSrc = 1; base.ResultSrc = '10 (PC+4)'; base.ALUControl = 'PC+IMM';
    } else if (op === 'LUI' || op === 'AUIPC') {
      base.RegWrite = 1; base.ALUSrc = 1; base.ALUControl = 'PASS_U_IMM';
    }
    return base;
  }

  // Pre-loaded Course & Reference Programs
  const PRESET_PROGRAMS = {
    progA: {
      name: 'Course Program A · Register File, ALU & Data RAM (S75–S79)',
      source: [
        'ADDI x1, x0, 8',
        'ADDI x2, x0, 3',
        'AND  x3, x1, x2',
        'OR   x4, x1, x2',
        'SW   x4, 0(x0)',
        'LW   x6, 0(x0)'
      ].join('\n')
    },
    progB: {
      name: 'Course Program B · XOR & JAL PC Redirect (S75–S79)',
      source: [
        'ADDI x1, x0, 12',
        'ADDI x2, x0, 5',
        'XOR  x3, x1, x2',
        'JAL  x0, 8',
        'ADDI x4, x0, 99   # Skipped by JAL!',
        'ADD  x5, x3, x2',
        'AND  x6, x5, x1',
        'OR   x7, x6, x2'
      ].join('\n')
    },
    progC: {
      name: 'Course Program C · Memory-Mapped LED I/O at 0x100 (S80–S82)',
      source: [
        'ADDI x1, x0, 256  # 0x00000100 LED MMIO address',
        'ADDI x2, x0, 5    # 0101 binary pattern',
        'SW   x2, 0(x1)    # Latch 0101 into LEDs',
        'ADDI x2, x0, 15   # 1111 binary pattern',
        'SW   x2, 0(x1)    # Latch 1111 into LEDs'
      ].join('\n')
    },
    progAdd30: {
      name: 'Module 5 Flagship Demo · ADD x3, x1, x2 (x1=10, x2=20 → x3=30)',
      source: [
        'ADDI x1, x0, 10   # Load 10 into x1',
        'ADDI x2, x0, 20   # Load 20 into x2',
        'ADD  x3, x1, x2   # x3 = x1 + x2 = 30',
        'SW   x3, 0(x0)    # Store 30 into DataMemory[0]'
      ].join('\n')
    },
    progLoop: {
      name: 'Supplementary Program D · Loop Counter with SLT & BNE',
      source: [
        'ADDI x1, x0, 0',
        'ADDI x2, x0, 3',
        'loop: ADDI x1, x1, 1',
        'SLT  x3, x1, x2',
        'BNE  x1, x2, loop',
        'SW   x1, 4(x0)'
      ].join('\n')
    }
  };

  // Single-Cycle RV32I Simulator Class
  class SingleCycleRV32Simulator {
    constructor() {
      this.regs = new Int32Array(32);
      this.mem = {};
      this.pc = 0;
      this.cycles = 0;
      this.led = 0;
      this.program = [];
      this.labels = {};
      this.lastTrace = null;
      this.executedIndices = new Set();
      this.loadProgram(PRESET_PROGRAMS.progA.source);
    }

    loadProgram(sourceText) {
      const compiled = assembleProgram(sourceText);
      this.program = compiled.instructions;
      this.labels = compiled.labels;
      this.reset();
      return compiled;
    }

    reset() {
      this.regs.fill(0);
      this.mem = {};
      this.pc = 0;
      this.cycles = 0;
      this.led = 0;
      this.lastTrace = null;
      this.executedIndices.clear();
    }

    step() {
      const idx = this.pc / 4;
      if (idx < 0 || idx >= this.program.length || (this.pc % 4 !== 0)) {
        return { halted: true, reason: 'PC reached end of Instruction ROM' };
      }

      const inst = this.program[idx];
      const op = inst.op;
      const rd = inst.rd;
      const rs1 = inst.rs1;
      const rs2 = inst.rs2;
      const imm = inst.imm;
      const valA = this.regs[rs1] | 0;
      const valB = this.regs[rs2] | 0;

      let aluSrcB = valB;
      let aluResult = 0;
      let zeroFlag = 0;
      let memReadData = 0;
      let writeBackVal = 0;
      let nextPC = this.pc + 4;
      let activeBuses = ['PC_IMEM', 'IMEM_CTRL'];

      if (['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT'].includes(op)) {
        aluSrcB = valB;
        aluResult = op === 'ADD' ? (valA + valB) :
                    op === 'SUB' ? (valA - valB) :
                    op === 'AND' ? (valA & valB) :
                    op === 'OR'  ? (valA | valB) :
                    op === 'XOR' ? (valA ^ valB) :
                    (valA < valB ? 1 : 0);
        aluResult |= 0;
        zeroFlag = aluResult === 0 ? 1 : 0;
        writeBackVal = aluResult;
        if (rd !== 0) this.regs[rd] = writeBackVal;
        activeBuses.push('IMEM_REG', 'REG_ALU_A', 'REG_ALU_B', 'ALU_WB', 'WB_REG', 'PC_PLUS4');
      } else if (['ADDI', 'ANDI', 'ORI', 'XORI', 'SLTI'].includes(op)) {
        aluSrcB = imm;
        aluResult = op === 'ADDI' ? (valA + imm) :
                    op === 'ANDI' ? (valA & imm) :
                    op === 'ORI'  ? (valA | imm) :
                    op === 'XORI' ? (valA ^ imm) :
                    (valA < imm ? 1 : 0);
        aluResult |= 0;
        zeroFlag = aluResult === 0 ? 1 : 0;
        writeBackVal = aluResult;
        if (rd !== 0) this.regs[rd] = writeBackVal;
        activeBuses.push('IMEM_REG', 'IMEM_IMM', 'REG_ALU_A', 'IMM_ALU_B', 'ALU_WB', 'WB_REG', 'PC_PLUS4');
      } else if (op === 'LUI' || op === 'AUIPC') {
        aluSrcB = imm;
        aluResult = op === 'LUI' ? imm : (this.pc + imm);
        writeBackVal = aluResult;
        if (rd !== 0) this.regs[rd] = writeBackVal;
        activeBuses.push('IMEM_IMM', 'IMM_ALU_B', 'ALU_WB', 'WB_REG', 'PC_PLUS4');
      } else if (op === 'LW') {
        aluSrcB = imm;
        aluResult = (valA + imm) >>> 0;
        memReadData = this.mem[aluResult] ?? 0;
        writeBackVal = memReadData | 0;
        if (rd !== 0) this.regs[rd] = writeBackVal;
        activeBuses.push('IMEM_REG', 'IMEM_IMM', 'REG_ALU_A', 'IMM_ALU_B', 'ALU_DMEM', 'DMEM_WB', 'WB_REG', 'PC_PLUS4');
      } else if (op === 'SW') {
        aluSrcB = imm;
        aluResult = (valA + imm) >>> 0;
        this.mem[aluResult] = valB | 0;
        if (aluResult === 0x00000100) {
          this.led = valB & 0xF;
          activeBuses.push('IMEM_REG', 'IMEM_IMM', 'REG_ALU_A', 'IMM_ALU_B', 'ALU_MMIO', 'PC_PLUS4');
        } else {
          activeBuses.push('IMEM_REG', 'IMEM_IMM', 'REG_ALU_A', 'IMM_ALU_B', 'REG_DMEM_WD', 'ALU_DMEM', 'PC_PLUS4');
        }
      } else if (op === 'BEQ' || op === 'BNE') {
        aluSrcB = valB;
        aluResult = (valA - valB) | 0;
        zeroFlag = aluResult === 0 ? 1 : 0;
        const taken = op === 'BEQ' ? (zeroFlag === 1) : (zeroFlag === 0);
        nextPC = taken ? (this.pc + imm) : (this.pc + 4);
        activeBuses.push('IMEM_REG', 'IMEM_IMM', 'REG_ALU_A', 'REG_ALU_B', taken ? 'BRANCH_TARGET' : 'PC_PLUS4');
      } else if (op === 'JAL') {
        writeBackVal = this.pc + 4;
        if (rd !== 0) this.regs[rd] = writeBackVal;
        nextPC = this.pc + imm;
        activeBuses.push('IMEM_IMM', 'PC_LINK_WB', 'WB_REG', 'BRANCH_TARGET');
      }

      this.regs[0] = 0; // Hardwired zero
      const prevPC = this.pc;
      this.pc = nextPC;
      this.cycles++;
      this.executedIndices.add(idx);

      const ctrl = getControlSignals(op, zeroFlag, aluResult);
      this.lastTrace = {
        inst,
        prevPC,
        nextPC,
        valA,
        valB,
        aluSrcB,
        aluResult,
        zeroFlag,
        memReadData,
        writeBackVal,
        ctrl,
        activeBuses,
        eightSteps: [
          `1. Program Counter: Outputs current instruction address PC = 0x${prevPC.toString(16).toUpperCase().padStart(2, '0')}.`,
          `2. Instruction Fetch: Instruction ROM outputs 32-bit machine word ${inst.hex} (${inst.asm}).`,
          `3. Instruction Decode: Control Unit decodes opcode ${inst.fields.opcode} (${inst.format}) → RegWrite=${ctrl.RegWrite}, ALUSrc=${ctrl.ALUSrc}, MemWrite=${ctrl.MemWrite}, ResultSrc=${ctrl.ResultSrc}.`,
          `4. Register Read: Register File reads rs1=x${rs1} (${REG_TO_ABI[rs1]}=${valA}) and rs2=x${rs2} (${REG_TO_ABI[rs2]}=${valB}).`,
          `5. ALU Execution: ALU (${ctrl.ALUControl}) computes ${valA} vs ${aluSrcB} → Result = ${aluResult} (Zero=${zeroFlag}).`,
          `6. Memory Access: ${op === 'LW' ? `Data RAM reads word ${memReadData} from 0x${aluResult.toString(16).toUpperCase()}` : op === 'SW' ? `Data RAM / MMIO writes ${valB} to 0x${aluResult.toString(16).toUpperCase()}` : 'Bypassed (MemRead=0, MemWrite=0)'}.`,
          `7. Write-Back: ${ctrl.RegWrite ? (rd === 0 ? 'Write to x0 ignored (x0 remains 0)' : `Register x${rd} (${REG_TO_ABI[rd]}) ← ${writeBackVal}`) : 'No register write (RegWrite=0)'}.`,
          `8. Next PC: PCSrc=${ctrl.PCSrc} updates PC ← 0x${nextPC.toString(16).toUpperCase().padStart(2, '0')}.`
        ]
      };

      return { halted: false, trace: this.lastTrace };
    }
  }

  // 5-Stage Pipeline Cycle-by-Cycle Hazard & Forwarding Simulator (Module 5 Section K & Module 6 Lab B)
  function simulatePipelineTimeline(instructions, enableForwarding) {
    const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'];
    const timeline = [];
    const hazards = [];
    let currentCycle = 0;

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      let startCycle = i === 0 ? 0 : timeline[i - 1].startCycle + 1;
      let stallCycles = 0;

      // Check RAW data hazard with previous instruction
      if (i > 0) {
        const prev = instructions[i - 1];
        const prevWrites = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT', 'ADDI', 'LW', 'LUI'].includes(prev.op) && prev.rd !== 0;
        const usesRs1 = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT', 'ADDI', 'LW', 'SW', 'BEQ', 'BNE'].includes(inst.op) && inst.rs1 === prev.rd;
        const usesRs2 = ['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLT', 'SW', 'BEQ', 'BNE'].includes(inst.op) && inst.rs2 === prev.rd;

        if (prevWrites && (usesRs1 || usesRs2)) {
          if (prev.op === 'LW') {
            stallCycles = enableForwarding ? 1 : 2;
            hazards.push(`Load-Use RAW Hazard on x${prev.rd} between "${prev.asm}" and "${inst.asm}" → ${stallCycles} stall bubble(s) inserted${enableForwarding ? ' + MEM→EX Forwarding' : ''}.`);
          } else if (!enableForwarding) {
            stallCycles = 2;
            hazards.push(`ALU RAW Hazard on x${prev.rd} between "${prev.asm}" and "${inst.asm}" (Forwarding OFF) → 2 stall bubbles inserted.`);
          } else {
            hazards.push(`ALU RAW Hazard on x${prev.rd} between "${prev.asm}" and "${inst.asm}" resolved with 0 stalls via EX/MEM → EX Forwarding!`);
          }
        }
        if (['BEQ', 'BNE', 'JAL'].includes(prev.op)) {
          stallCycles += 1;
          hazards.push(`Control Hazard after "${prev.asm}" → 1 branch-delay flush/bubble.`);
        }
      }

      const rowSlots = [];
      for (let c = 0; c < startCycle; c++) rowSlots.push('');
      rowSlots.push('IF');
      rowSlots.push('ID');
      for (let s = 0; s < stallCycles; s++) rowSlots.push('STALL');
      rowSlots.push('EX');
      rowSlots.push('MEM');
      rowSlots.push('WB');

      timeline.push({
        asm: inst.asm,
        startCycle: startCycle + stallCycles,
        stallCycles,
        slots: rowSlots
      });
      currentCycle = Math.max(currentCycle, rowSlots.length);
    }

    return {
      totalCycles: currentCycle,
      instructionCount: instructions.length,
      effectiveCPI: instructions.length ? Number((currentCycle / instructions.length).toFixed(2)) : 1.0,
      timeline,
      hazards
    };
  }

  // CPU Performance Iron Law Calculator (Module 6 Lab A)
  function calculateIronLaw(instructionCount, cpi, clockPeriodNs) {
    const ic = Math.max(1, Number(instructionCount) || 1);
    const c = Math.max(0.1, Number(cpi) || 1.0);
    const tClk = Math.max(0.05, Number(clockPeriodNs) || 1.0);
    const totalCycles = ic * c;
    const cpuTimeNs = totalCycles * tClk;
    const freqGHz = Number((1.0 / tClk).toFixed(3));
    return {
      instructionCount: ic,
      cpi: c,
      clockPeriodNs: tClk,
      frequencyGHz: freqGHz,
      totalCycles,
      cpuTimeNs: Number(cpuTimeNs.toFixed(2)),
      cpuTimeUs: Number((cpuTimeNs / 1000).toFixed(3))
    };
  }

  global.ITM_RISCV = {
    ABI_TO_REG,
    REG_TO_ABI,
    parseRegister,
    assembleProgram,
    getControlSignals,
    PRESET_PROGRAMS,
    SingleCycleRV32Simulator,
    simulatePipelineTimeline,
    calculateIronLaw
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ITM_RISCV;
  }
})(typeof window !== 'undefined' ? window : globalThis);
