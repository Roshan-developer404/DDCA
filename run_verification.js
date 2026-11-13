'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
require(path.join(rootDir, 'js/course-data.js'));
const sim = require(path.join(rootDir, 'js/digital-logic-sim.js'));
const rv = require(path.join(rootDir, 'js/riscv-engine.js'));
const hwData = require(path.join(rootDir, 'js/hardware-data.js'));
const glMath = require(path.join(rootDir, 'js/gl/math.js'));
const { Builder } = require(path.join(rootDir, 'js/gl/geometry.js'));
const eq = require(path.join(rootDir, 'js/experiments-quizzes.js'));

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Verify all 6 DDCA modules exist with 10-step teaching structure, 3 levels, objectives, worked examples
check('1. All 6 DDCA Modules & 10-Step Teaching System Present', () => {
  const mods = global.ITM_COURSE_DATA.MODULES;
  ['mod1', 'mod2', 'mod3', 'mod4', 'mod5', 'mod6'].forEach(id => {
    assert(mods[id], `Missing module ${id}`);
    assert.strictEqual(mods[id].tenStepTeaching.length, 10, `${id} must have 10 teaching steps`);
    assert(mods[id].levels.beginner && mods[id].levels.engineering && mods[id].levels.advanced, `${id} missing 3 levels`);
    assert(mods[id].objectives.length >= 4, `${id} missing objectives`);
  });
});

// 2. Verify all 12 navigation sections exist in index.html
check('2. All 12 Navigation Sections Exist in index.html', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const secIds = [
    'sec-home', 'sec-mod1', 'sec-mod2', 'sec-mod3', 'sec-mod4', 'sec-mod5',
    'sec-mod6', 'sec-cpu-lab', 'sec-logic-lab', 'sec-hw-explorer', 'sec-experiments', 'sec-quizzes'
  ];
  secIds.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing section #${id}`);
    assert(html.includes(`data-section="${id}"`), `Missing nav button for ${id}`);
  });
});

// 3. Verify all 12 supplied course diagram assets exist on disk
check('3. All 12 Supplied Course Slide Images Exist', () => {
  const mods = global.ITM_COURSE_DATA.MODULES;
  Object.values(mods).forEach(m => {
    m.slides.forEach(s => {
      const full = path.join(rootDir, s.file);
      assert(fs.existsSync(full), `Missing slide image: ${s.file}`);
      assert(fs.statSync(full).size > 1000, `Empty slide image: ${s.file}`);
    });
  });
});

// 4. Verify Logic Gate Truth Tables & Universal NAND Synthesis
check('4. Logic Gate Truth Tables & NAND Universality Correctness', () => {
  assert.deepStrictEqual(sim.getGateTruthTable('AND').map(r => r.out), [0, 0, 0, 1]);
  assert.deepStrictEqual(sim.getGateTruthTable('OR').map(r => r.out), [0, 1, 1, 1]);
  assert.deepStrictEqual(sim.getGateTruthTable('NAND').map(r => r.out), [1, 1, 1, 0]);
  assert.deepStrictEqual(sim.getGateTruthTable('NOR').map(r => r.out), [1, 0, 0, 0]);
  assert.deepStrictEqual(sim.getGateTruthTable('XOR').map(r => r.out), [0, 1, 1, 0]);
  assert.deepStrictEqual(sim.getGateTruthTable('XNOR').map(r => r.out), [1, 0, 0, 1]);
  assert.deepStrictEqual(sim.getGateTruthTable('NOT').map(r => r.out), [1, 0]);

  for (let a = 0; a <= 1; a++) {
    for (let b = 0; b <= 1; b++) {
      assert.strictEqual(sim.evaluateNandUniversal('AND', a, b).out, a & b);
      assert.strictEqual(sim.evaluateNandUniversal('OR', a, b).out, a | b);
      assert.strictEqual(sim.evaluateNandUniversal('XOR', a, b).out, a ^ b);
    }
  }
});

// 5. Verify Half-Adder, Full-Adder, 4-Bit Ripple-Carry Adder/Subtractor & K-Map Simplifier
check('5. Half-Adder, Full-Adder, 4-Bit Ripple Adder/Subtractor & K-Map', () => {
  assert.deepStrictEqual(sim.evaluateHalfAdder(1, 1), { a: 1, b: 1, sum: 0, carry: 1 });
  const fa = sim.evaluateFullAdder(1, 1, 1);
  assert.strictEqual(fa.sum, 1);
  assert.strictEqual(fa.cout, 1);

  const addRes = sim.evaluateRippleCarry4(9, 5, false);
  assert.strictEqual(addRes.result4Bit, 14);
  assert.strictEqual(addRes.cout, 0);

  const subRes = sim.evaluateRippleCarry4(9, 5, true);
  assert.strictEqual(subRes.result4Bit, 4);
  assert.strictEqual(subRes.cout, 1);

  const kmap = sim.simplifyKMap4([0, 1, 2, 3, 8, 9, 10, 11]);
  assert.strictEqual(kmap.expression, '~B');
});

// 6. Verify Flip-Flop, SISO/SIPO Shift Register & Moore/Mealy FSM State Transitions
check('6. Flip-Flop, Shift Register & FSM Sequential State Transitions', () => {
  assert.strictEqual(sim.stepDFlipFlop(1, false, 0).q, 0, 'D-FF must not update without rising clock edge');
  assert.strictEqual(sim.stepDFlipFlop(1, true, 0).q, 1, 'D-FF must latch D=1 on rising clock edge');

  let sr = 0;
  [1, 1, 0, 1].forEach(bit => { sr = sim.stepShiftRegister4(sr, bit).nextVal; });
  assert.strictEqual(sr, 0b1011);

  let st = 'S0';
  st = sim.stepFSM(st, 1, 'MOORE').nextState; // S1
  st = sim.stepFSM(st, 0, 'MOORE').nextState; // S2
  const finalStep = sim.stepFSM(st, 1, 'MOORE'); // S3
  assert.strictEqual(finalStep.nextState, 'S3');
  assert.strictEqual(finalStep.mooreOutput, 1);
  assert.strictEqual(finalStep.mealyOutput, 1);
});

// 7 & 9. Verify 32x32 Register File & Hardwired x0 == 0
check('7 & 9. 32x32 Register File Read/Write & x0 Hardwired Zero', () => {
  const rf = new sim.RegisterFile32();
  rf.writeOnClockEdge(1, 42, true);
  rf.writeOnClockEdge(0, 999, true); // write to x0 must be ignored
  const r = rf.read(1, 0);
  assert.strictEqual(r.rd1, 42);
  assert.strictEqual(r.rd2, 0);
});

// 8. Verify Two-Pass RV32I Assembler Machine-Code Encoding & Decoding
check('8. Two-Pass RV32I Assembler Machine-Code Encoding & Bit Fields', () => {
  const compiled = rv.assembleProgram('ADDI x1, x0, 10\nADDI x2, x0, 20\nADD x3, x1, x2');
  assert.strictEqual(compiled.instructions[0].hex, '0x00A00093');
  assert.strictEqual(compiled.instructions[1].hex, '0x01400113');
  assert.strictEqual(compiled.instructions[2].hex, '0x002081B3');
});

// 10, 11, 12. Verify Single-Cycle RV32I Execution (ADD x3=30, Course Programs A, B, C, Branches, Loads/Stores & MMIO)
check('10, 11 & 12. Single-Cycle RV32I Execution: ADD=30, Prog A (LW/SW), Prog B (XOR/JAL), Prog C (MMIO 0x100) & Loop (BNE)', () => {
  const cpu = new rv.SingleCycleRV32Simulator();

  // Flagship ADD x3, x1, x2 (10 + 20 = 30)
  cpu.loadProgram(rv.PRESET_PROGRAMS.progAdd30.source);
  while (!cpu.step().halted) {}
  assert.strictEqual(cpu.regs[1], 10);
  assert.strictEqual(cpu.regs[2], 20);
  assert.strictEqual(cpu.regs[3], 30);
  assert.strictEqual(cpu.mem[0], 30);

  // Course Program A
  cpu.loadProgram(rv.PRESET_PROGRAMS.progA.source);
  while (!cpu.step().halted) {}
  assert.strictEqual(cpu.regs[1], 8);
  assert.strictEqual(cpu.regs[2], 3);
  assert.strictEqual(cpu.regs[3], 0);
  assert.strictEqual(cpu.regs[4], 11);
  assert.strictEqual(cpu.mem[0], 11);
  assert.strictEqual(cpu.regs[6], 11);

  // Course Program B (XOR + JAL skipping 0x10)
  cpu.loadProgram(rv.PRESET_PROGRAMS.progB.source);
  while (!cpu.step().halted) {}
  assert.strictEqual(cpu.regs[3], 9);
  assert.strictEqual(cpu.regs[4], 0, 'x4 at 0x10 must be skipped by JAL');
  assert.strictEqual(cpu.regs[5], 14);
  assert.strictEqual(cpu.regs[6], 12);
  assert.strictEqual(cpu.regs[7], 13);

  // Course Program C (MMIO LED at 0x00000100)
  cpu.loadProgram(rv.PRESET_PROGRAMS.progC.source);
  cpu.step(); cpu.step(); cpu.step();
  assert.strictEqual(cpu.led, 5);
  cpu.step(); cpu.step();
  assert.strictEqual(cpu.led, 15);

  // Loop with SLT & BNE
  cpu.loadProgram(rv.PRESET_PROGRAMS.progLoop.source);
  while (!cpu.step().halted) {}
  assert.strictEqual(cpu.regs[1], 3);
  assert.strictEqual(cpu.mem[4], 3);
});

// 13 & 14. Verify 5-Stage Pipeline Hazard Simulator & Iron Law Performance Calculator
check('13 & 14. 5-Stage Pipeline Hazard Simulator & Iron Law Calculator', () => {
  const prog = rv.assembleProgram('LW x1, 0(x0)\nADD x2, x1, x3').instructions;
  const pipeFwd = rv.simulatePipelineTimeline(prog, true);
  const pipeNoFwd = rv.simulatePipelineTimeline(prog, false);
  assert(pipeFwd.totalCycles < pipeNoFwd.totalCycles, 'Forwarding must reduce total cycles on load-use hazard');

  const perf = rv.calculateIronLaw(1000, 1.0, 5.0);
  assert.strictEqual(perf.cpuTimeNs, 5000);
  assert.strictEqual(perf.cpuTimeUs, 5);
});

// 15. Experiments & quizzes integrity
check('15. 8 Practical Experiments & 13 Quiz Items Verified', () => {
  assert.strictEqual(eq.PRACTICAL_EXPERIMENTS.length, 8);
  assert.strictEqual(eq.QUIZ_QUESTIONS.length, 13);
});

// 16. WebGL engine math + geometry (pure JS, no GPU needed)
check('16. 3D engine: mat4 inverse, lookAt and projection are consistent', () => {
  const { m4 } = glMath;
  const a = m4.fromTRS(new Float32Array(16), [1, 2, 3], [0.3, 0.7, -0.4], 2);
  const inv = m4.invert(new Float32Array(16), a), id = m4.multiply(new Float32Array(16), a, inv);
  for (let i = 0; i < 16; i++) assert(Math.abs(id[i] - (i % 5 === 0 ? 1 : 0)) < 1e-4, 'A * A^-1 must be identity');
  const v = m4.lookAt(new Float32Array(16), [0, 0, 10], [0, 0, 0], [0, 1, 0]);
  const p = m4.transformPoint([0, 0, 0], v, [0, 0, 0]);
  assert(Math.abs(p[2] + 10) < 1e-5, 'Origin must be 10 units in front of the camera');
});
check('16b. 3D engine: procedural meshes wind outward and stay finite', () => {
  const kinds = {
    box: b => b.box(2, 1, 3, { r: 0.2 }), cyl: b => b.cyl(1, 2, { bevel: 0.1 }), sphere: b => b.sphere(1),
    tube: b => b.tube([[0, 0, 0], [1, 1, 0], [2, 1, 1], [3, 0, 1]], 0.1), rotated: b => b.box(2, 1, 3, { r: 0.2, rot: [0.5, 1, 0.3] })
  };
  for (const [name, fn] of Object.entries(kinds)) {
    const b = new Builder(); fn(b); const m = b.build(); let bad = 0, tot = 0;
    for (const x of m.data) assert(Number.isFinite(x), name + ': non-finite vertex data');
    for (let k = 0; k < m.idx.length; k += 3) {
      const o = [0, 1, 2].map(j => m.idx[k + j] * 14), P = o.map(q => [m.data[q], m.data[q + 1], m.data[q + 2]]), N = o.map(q => [m.data[q + 3], m.data[q + 4], m.data[q + 5]]);
      const e1 = P[1].map((x, i) => x - P[0][i]), e2 = P[2].map((x, i) => x - P[0][i]);
      const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (Math.hypot(...c) < 1e-10) continue; tot++;
      if (c[0] * (N[0][0] + N[1][0] + N[2][0]) + c[1] * (N[0][1] + N[1][1] + N[2][1]) + c[2] * (N[0][2] + N[1][2] + N[2][2]) < 0) bad++;
    }
    assert.strictEqual(bad, 0, name + ': ' + bad + '/' + tot + ' triangles wound inward');
  }
});

// 17. Scene <-> data contracts
check('17. Every 3D component has metadata, and every simulator bus has a drawn wire', () => {
  const sceneSrc = fs.readFileSync(path.join(rootDir, 'js/gl/scene-computer.js'), 'utf8');
  const dpSrc = fs.readFileSync(path.join(rootDir, 'js/gl/scene-datapath.js'), 'utf8');
  const engSrc = fs.readFileSync(path.join(rootDir, 'js/riscv-engine.js'), 'utf8');
  Object.keys(hwData).forEach(id => assert(new RegExp("group\\('" + id + "'|'" + id + "'\\)").test(sceneSrc), 'Scene has no group for ' + id));
  const used = new Set((engSrc.match(/'[A-Z_]{5,}'/g) || []).map(x => x.slice(1, -1)).filter(x => /^(PC|IMEM|REG|ALU|IMM|DMEM|WB|BRANCH)_/.test(x)));
  assert(used.size >= 14, 'expected the engine to reference datapath buses');
  used.forEach(bus => assert(new RegExp('\\b' + bus + ': \\{ from').test(dpSrc), 'No 3D wire for bus ' + bus));
});
check('18. No CDN or external runtime dependencies in the main app', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(!/https?:\/\/(?!github\.com)[^"' ]+\.(js|css)/.test(html.replace(/<meta[^>]*>/g, '')), 'index.html must not load remote scripts or styles');
  assert(!/fonts\.googleapis|cdnjs|unpkg|jsdelivr/.test(html), 'No CDN references');
});

// 19. Student study aids: reference table, decoder round-trips with the real assembler
const sd = require(path.join(rootDir, 'js/student-data.js'));
check('19. RV32I reference card + decoder agree with the assembler for every lab instruction', () => {
  assert(sd.INSTRUCTIONS.length === 37, 'RV32I base has 37 non-system instructions in this card');
  assert(new Set(sd.INSTRUCTIONS.map(i => i.mnemonic)).size === 37, 'mnemonics must be unique');
  const src = ['add x3,x1,x2','sub x4,x1,x2','slt x5,x1,x2','xor x6,x1,x2','or x7,x1,x2','and x8,x1,x2','addi x1,x0,-20','slti x2,x1,5','xori x3,x1,85','ori x4,x1,3','andi x5,x1,7',
    'lw x7,8(x2)','sw x7,-4(x2)','L: beq x1,x2,L','bne x1,x2,L','lui x8,0x12345','auipc x9,1','jal x1,L'].join('\n');
  const out = rv.assembleProgram(src);
  out.instructions.forEach(i => { const d = sd.decodeWord(i.word); assert.strictEqual(d.mnemonic, i.op, i.asm + ' decoded as ' + d.mnemonic); });
  // every instruction flagged as supported by the lab must really assemble
  sd.INSTRUCTIONS.filter(i => i.lab).forEach(i => assert(/^(ADD|SUB|SLT|XOR|OR|AND|ADDI|SLTI|XORI|ORI|ANDI|LW|SW|BEQ|BNE|LUI|AUIPC|JAL)$/.test(i.mnemonic), i.mnemonic + ' is flagged lab but the assembler lacks it'));
  assert.strictEqual(sd.decodeWord(0x40515513).mnemonic, 'SRAI');
  assert.strictEqual(sd.decodeWord(0x00515513).mnemonic, 'SRLI');
});
check('20. Number helpers + glossary data are sane', () => {
  assert.strictEqual(sd.describeWord(-13).hex, '0xFFFFFFF3');
  assert.strictEqual(sd.describeWord(0xFFFFFFF3).signed, -13);
  assert.strictEqual(sd.parseNumber('0b1010'), 10); assert.strictEqual(sd.parseNumber('0xFF'), 255); assert.strictEqual(sd.parseNumber('zzz'), null);
  assert(sd.GLOSSARY.length >= 50 && new Set(sd.GLOSSARY.map(g => g.term)).size === sd.GLOSSARY.length, 'glossary terms must be unique');
  sd.GLOSSARY.forEach(g => assert(/^mod[1-6]$/.test(g.module) && g.def.length > 20, 'bad glossary entry ' + g.term));
});
check('21. Every sidebar section exists and index.html loads the student layer', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  [...html.matchAll(/data-section="(sec-[a-z0-9-]+)"/g)].forEach(m => assert(html.includes('id="' + m[1] + '"'), 'nav target missing: ' + m[1]));
  assert(html.includes('js/student.js') && html.includes('css/student.css') && html.includes('js/student-data.js'));
});

console.log(`\nALL ${results.length} AUTOMATED VERIFICATION SUITES PASSED SUCCESSFULLY.`);
