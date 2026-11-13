(function(global) {
  'use strict';

  // 1. Step-by-Step Number System Converter (Module 1 Lab A)
  function convertNumberSystem(inputStr, fromBase, bitWidth) {
    bitWidth = bitWidth || 8;
    const clean = String(inputStr || '0').trim().replace(/^0[xXbBoO]/, '');
    let val = parseInt(clean, fromBase || 10);
    if (isNaN(val)) val = 0;

    const maxUnsigned = (1 << bitWidth) - 1;
    const unsignedVal = ((val % (1 << bitWidth)) + (1 << bitWidth)) % (1 << bitWidth);
    const signBit = (unsignedVal >> (bitWidth - 1)) & 1;
    const signedVal = signBit ? unsignedVal - (1 << bitWidth) : unsignedVal;

    // Division steps for unsignedVal -> binary
    const divSteps = [];
    let temp = Math.abs(val);
    if (temp === 0) {
      divSteps.push('0 ÷ 2 = 0, Remainder = 0 (LSB)');
    } else {
      let stepIdx = 0;
      while (temp > 0 && stepIdx < 16) {
        const q = Math.floor(temp / 2);
        const r = temp % 2;
        divSteps.push(`${temp} ÷ 2 = ${q}, Remainder = ${r}${stepIdx === 0 ? ' (LSB)' : (q === 0 ? ' (MSB)' : '')}`);
        temp = q;
        stepIdx++;
      }
    }

    const binStr = unsignedVal.toString(2).padStart(bitWidth, '0');
    const octStr = '0o' + unsignedVal.toString(8);
    const hexStr = '0x' + unsignedVal.toString(16).toUpperCase().padStart(Math.ceil(bitWidth / 4), '0');

    // Positional weights breakdown
    const weights = [];
    for (let i = bitWidth - 1; i >= 0; i--) {
      const bit = (unsignedVal >> i) & 1;
      if (bit) weights.push(`2^${i}(${1 << i})`);
    }
    const positionalFormula = weights.length ? weights.join(' + ') + ` = ${unsignedVal}` : '0';

    // Two's complement explanation
    const invertedBits = binStr.split('').map(b => (b === '1' ? '0' : '1')).join('');
    const twosCompSteps = val < 0
      ? `Negative input (${val}): Start with |${val}| = ${Math.abs(val).toString(2).padStart(bitWidth, '0')}₂ → Invert bits (1's comp) = ${((~Math.abs(val)) & maxUnsigned).toString(2).padStart(bitWidth, '0')}₂ → Add 1 = ${binStr}₂ (${hexStr})`
      : `Positive/unsigned representation in ${bitWidth}-bit two's complement: MSB sign bit = ${signBit} → Signed value = ${signedVal}, Unsigned value = ${unsignedVal} (1's complement inverse = ${invertedBits}₂)`;

    return {
      rawDecimal: val,
      unsignedVal,
      signedVal,
      binary: binStr,
      octal: octStr,
      hex: hexStr,
      divSteps,
      positionalFormula,
      twosCompSteps
    };
  }

  // 2. Logic Gate Evaluator & Truth Table Generator (Module 1 Lab B & Module 2 Lab A)
  function evaluateGate(gateType, a, b) {
    a = a ? 1 : 0;
    b = b ? 1 : 0;
    switch (String(gateType).toUpperCase()) {
      case 'NOT':  return a ^ 1;
      case 'AND':  return a & b;
      case 'OR':   return a | b;
      case 'NAND': return (a & b) ^ 1;
      case 'NOR':  return (a | b) ^ 1;
      case 'XOR':  return a ^ b;
      case 'XNOR': return (a ^ b) ^ 1;
      default:     return 0;
    }
  }

  function getGateTruthTable(gateType) {
    const type = String(gateType).toUpperCase();
    if (type === 'NOT') {
      return [
        { inputs: [0], out: 1 },
        { inputs: [1], out: 0 }
      ];
    }
    return [
      { inputs: [0, 0], out: evaluateGate(type, 0, 0) },
      { inputs: [0, 1], out: evaluateGate(type, 0, 1) },
      { inputs: [1, 0], out: evaluateGate(type, 1, 0) },
      { inputs: [1, 1], out: evaluateGate(type, 1, 1) }
    ];
  }

  // 3. NAND Universality Synthesizer (Module 1 Lab D)
  function evaluateNandUniversal(targetGate, a, b) {
    a = a ? 1 : 0;
    b = b ? 1 : 0;
    const nand = (x, y) => ((x & y) ^ 1);
    const type = String(targetGate).toUpperCase();
    if (type === 'NOT') {
      const n1 = nand(a, a);
      return { out: n1, count: 1, stages: [`G1 = NAND(A=${a}, A=${a}) = ${n1}`], expr: 'Y = NAND(A, A) = ~A' };
    }
    if (type === 'AND') {
      const n1 = nand(a, b);
      const n2 = nand(n1, n1);
      return { out: n2, count: 2, stages: [`G1 = NAND(A=${a}, B=${b}) = ${n1}`, `G2 = NAND(G1=${n1}, G1=${n1}) = ${n2}`], expr: 'Y = NAND(NAND(A,B), NAND(A,B)) = A · B' };
    }
    if (type === 'OR') {
      const n1 = nand(a, a);
      const n2 = nand(b, b);
      const n3 = nand(n1, n2);
      return { out: n3, count: 3, stages: [`G1 = NAND(A=${a}, A=${a}) = ${n1} (~A)`, `G2 = NAND(B=${b}, B=${b}) = ${n2} (~B)`, `G3 = NAND(G1=${n1}, G2=${n2}) = ${n3}`], expr: 'Y = NAND(NAND(A,A), NAND(B,B)) = A + B' };
    }
    // XOR via 4 NAND gates
    const n1 = nand(a, b);
    const n2 = nand(a, n1);
    const n3 = nand(b, n1);
    const n4 = nand(n2, n3);
    return {
      out: n4,
      count: 4,
      stages: [
        `G1 = NAND(A=${a}, B=${b}) = ${n1}`,
        `G2 = NAND(A=${a}, G1=${n1}) = ${n2}`,
        `G3 = NAND(B=${b}, G1=${n1}) = ${n3}`,
        `G4 = NAND(G2=${n2}, G3=${n3}) = ${n4}`
      ],
      expr: 'Y = NAND(NAND(A, NAND(A,B)), NAND(B, NAND(A,B))) = A ⊕ B'
    };
  }

  // 4. 4-Variable Quine-McCluskey / Karnaugh Map Simplifier (Module 2 Lab B)
  function simplifyKMap4(minterms) {
    const unique = Array.from(new Set((minterms || []).map(Number).filter(m => m >= 0 && m < 16))).sort((a, b) => a - b);
    if (unique.length === 0) return { expression: '0 (Always False)', groups: [], minterms: [] };
    if (unique.length === 16) return { expression: '1 (Always True)', groups: ['All 16 cells (Octet×2)'], minterms: unique };

    function countOnes(n) {
      let c = 0;
      while (n) { c += n & 1; n >>= 1; }
      return c;
    }
    function combineTerms(t1, t2) {
      let diff = 0, res = '';
      for (let i = 0; i < 4; i++) {
        if (t1[i] !== t2[i]) { diff++; res += '-'; }
        else res += t1[i];
      }
      return diff === 1 ? res : null;
    }
    function termToLiteral(mask) {
      const vars = ['A', 'B', 'C', 'D'];
      const parts = [];
      for (let i = 0; i < 4; i++) {
        if (mask[i] === '1') parts.push(vars[i]);
        else if (mask[i] === '0') parts.push('~' + vars[i]);
      }
      return parts.length ? parts.join('·') : '1';
    }

    let current = unique.map(m => ({
      mask: m.toString(2).padStart(4, '0'),
      cov: [m],
      used: false
    }));
    const primes = [];

    while (current.length > 0) {
      const nextMap = new Map();
      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const comb = combineTerms(current[i].mask, current[j].mask);
          if (comb) {
            current[i].used = true;
            current[j].used = true;
            const mergedCov = Array.from(new Set([...current[i].cov, ...current[j].cov])).sort((a, b) => a - b);
            nextMap.set(comb, { mask: comb, cov: mergedCov, used: false });
          }
        }
      }
      current.forEach(item => {
        if (!item.used && !primes.some(p => p.mask === item.mask)) {
          primes.push(item);
        }
      });
      current = Array.from(nextMap.values());
    }

    // Greedy essential prime implicant cover
    const uncovered = new Set(unique);
    const selected = [];
    // First pick essential prime implicants
    unique.forEach(m => {
      const covering = primes.filter(p => p.cov.includes(m));
      if (covering.length === 1 && !selected.includes(covering[0])) {
        selected.push(covering[0]);
        covering[0].cov.forEach(cm => uncovered.delete(cm));
      }
    });
    // Cover remaining minterms greedily
    while (uncovered.size > 0) {
      let best = null, bestCount = -1;
      primes.forEach(p => {
        const cnt = p.cov.filter(m => uncovered.has(m)).length;
        if (cnt > bestCount) { bestCount = cnt; best = p; }
      });
      if (!best || bestCount <= 0) break;
      selected.push(best);
      best.cov.forEach(cm => uncovered.delete(cm));
    }

    return {
      expression: selected.map(p => termToLiteral(p.mask)).join(' + '),
      groups: selected.map(p => `${termToLiteral(p.mask)} covers m(${p.cov.join(',')})`),
      minterms: unique
    };
  }

  // 5. Half Adder, Full Adder & 4-Bit Ripple-Carry Adder/Subtractor (Module 2 Labs C & D)
  function evaluateHalfAdder(a, b) {
    a = a ? 1 : 0; b = b ? 1 : 0;
    return { a, b, sum: a ^ b, carry: a & b };
  }

  function evaluateFullAdder(a, b, cin) {
    a = a ? 1 : 0; b = b ? 1 : 0; cin = cin ? 1 : 0;
    const axb = a ^ b;
    const sum = axb ^ cin;
    const cout = (a & b) | (cin & axb);
    return { a, b, cin, axb, ab: a & b, cin_axb: cin & axb, sum, cout };
  }

  function evaluateRippleCarry4(a4, b4, subtractMode) {
    const a = a4 & 0xF;
    const b = b4 & 0xF;
    const sub = subtractMode ? 1 : 0;
    let carry = sub;
    const stages = [];
    let result = 0;

    for (let i = 0; i < 4; i++) {
      const ai = (a >> i) & 1;
      const biRaw = (b >> i) & 1;
      const bi = biRaw ^ sub; // Two's complement inversion when sub=1
      const fa = evaluateFullAdder(ai, bi, carry);
      stages.push({ bit: i, ai, biRaw, bi, cin: carry, sum: fa.sum, cout: fa.cout });
      if (fa.sum) result |= (1 << i);
      carry = fa.cout;
    }
    const c3 = stages[2].cout;
    const c4 = stages[3].cout;
    const overflow = c3 ^ c4;
    return {
      a, b, subtractMode: Boolean(sub),
      result4Bit: result,
      cout: c4,
      overflow,
      stages
    };
  }

  // 6. Multiplexer, Decoder & Comparator (Module 2 Labs E & F)
  function evaluateMux4to1(d0, d1, d2, d3, s1, s0) {
    const sel = ((s1 ? 1 : 0) << 1) | (s0 ? 1 : 0);
    const inputs = [d0 ? 1 : 0, d1 ? 1 : 0, d2 ? 1 : 0, d3 ? 1 : 0];
    return { sel, selectedInput: `D${sel}`, out: inputs[sel], inputs };
  }

  // 7. Sequential Latches, D Flip-Flop, SISO/SIPO Shift Register, Counter & FSM (Module 3 Labs A–F)
  function evaluateSRLatch(s, r, prevQ) {
    s = s ? 1 : 0; r = r ? 1 : 0; prevQ = prevQ ? 1 : 0;
    if (s === 1 && r === 1) return { q: 0, qBar: 0, invalid: true, state: 'INVALID (S=1, R=1 Forbidden)' };
    if (s === 1 && r === 0) return { q: 1, qBar: 0, invalid: false, state: 'SET (Q = 1)' };
    if (s === 0 && r === 1) return { q: 0, qBar: 1, invalid: false, state: 'RESET (Q = 0)' };
    return { q: prevQ, qBar: prevQ ^ 1, invalid: false, state: `HOLD (Retains Q = ${prevQ})` };
  }

  function stepDFlipFlop(d, clkRisingEdge, prevQ) {
    d = d ? 1 : 0; prevQ = prevQ ? 1 : 0;
    const nextQ = clkRisingEdge ? d : prevQ;
    return { d, clkRisingEdge: Boolean(clkRisingEdge), q: nextQ, qBar: nextQ ^ 1 };
  }

  function stepShiftRegister4(currentBits4, serialInBit) {
    const bit = serialInBit ? 1 : 0;
    const prev = currentBits4 & 0xF;
    const shiftedOut = prev & 1;
    const next = ((bit << 3) | (prev >> 1)) & 0xF;
    return {
      prevBits: prev.toString(2).padStart(4, '0'),
      nextVal: next,
      parallelOut: next.toString(2).padStart(4, '0'),
      serialOutLSB: shiftedOut
    };
  }

  function stepFSM(currentState, inputX, fsmType) {
    // Sequence detector for '101' (States S0=IDLE, S1=GOT_1, S2=GOT_10, S3=GOT_101)
    const x = inputX ? 1 : 0;
    let nextState = 'S0';
    if (currentState === 'S0') nextState = x ? 'S1' : 'S0';
    else if (currentState === 'S1') nextState = x ? 'S1' : 'S2';
    else if (currentState === 'S2') nextState = x ? 'S3' : 'S0';
    else if (currentState === 'S3') nextState = x ? 'S1' : 'S2';

    const mooreOut = nextState === 'S3' ? 1 : 0;
    const mealyOut = (currentState === 'S2' && x === 1) ? 1 : 0;
    return {
      prevState: currentState,
      inputX: x,
      nextState,
      mooreOutput: mooreOut,
      mealyOutput: mealyOut,
      activeOutput: String(fsmType).toUpperCase() === 'MEALY' ? mealyOut : mooreOut
    };
  }

  // 8. 32×32-Bit RV32I Register File Model (Module 4 Lab B)
  class RegisterFile32 {
    constructor() {
      this.regs = new Int32Array(32);
    }
    read(rs1, rs2) {
      rs1 = rs1 & 31;
      rs2 = rs2 & 31;
      this.regs[0] = 0;
      return { rs1, rs2, rd1: this.regs[rs1], rd2: this.regs[rs2] };
    }
    writeOnClockEdge(rd, wd3, regWriteEnable) {
      rd = rd & 31;
      if (regWriteEnable && rd !== 0) {
        this.regs[rd] = wd3 | 0;
      }
      this.regs[0] = 0; // Architectural guarantee: x0 is hardwired to 0
      return this.regs[rd];
    }
    reset() {
      this.regs.fill(0);
    }
  }

  global.ITM_DIGITAL_SIM = {
    convertNumberSystem,
    evaluateGate,
    getGateTruthTable,
    evaluateNandUniversal,
    simplifyKMap4,
    evaluateHalfAdder,
    evaluateFullAdder,
    evaluateRippleCarry4,
    evaluateMux4to1,
    evaluateSRLatch,
    stepDFlipFlop,
    stepShiftRegister4,
    stepFSM,
    RegisterFile32
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ITM_DIGITAL_SIM;
  }
})(typeof window !== 'undefined' ? window : globalThis);
