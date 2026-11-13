/* ITM_GL.buildDatapath — the single-cycle RV32I datapath as a lit 3D circuit board.
 * Blocks have live-updating top plates; wires are tubes with travelling pulses driven by the simulator's activeBuses. */
(function (global) {
  'use strict';
  const { Builder } = global.ITM_GL.geometry;
  const { Node } = global.ITM_GL.Engine;
  const { lin } = global.ITM_GL.math;

  const COL = { cyan: 0x22d3ee, amber: 0xfbbf24, green: 0x34d399, violet: 0xa78bfa, pink: 0xf472b6, blue: 0x60a5fa, grey: 0x94a3b8 };
  const BLOCKS = [
    { id: 'PC', t: 'PC', s: 'Program Counter', x: -13.5, z: -2, w: 3.2, d: 3.0, c: 'amber' },
    { id: 'ADD4', t: 'PC + 4', s: 'Adder', x: -13.5, z: -8, w: 3.2, d: 2.2, c: 'grey' },
    { id: 'IMEM', t: 'INSTR ROM', s: 'Instruction Memory', x: -8, z: -2, w: 4.6, d: 3.6, c: 'cyan' },
    { id: 'CONTROL', t: 'CONTROL', s: 'Main Decoder', x: -8, z: 5.5, w: 4.6, d: 3.2, c: 'amber' },
    { id: 'IMMGEN', t: 'IMM GEN', s: 'Sign Extend', x: -2.5, z: 7.8, w: 3.8, d: 2.6, c: 'violet' },
    { id: 'REGFILE', t: 'REG FILE', s: '32 × 32-bit', x: -1.2, z: -2.8, w: 5.0, d: 4.4, c: 'cyan' },
    { id: 'MUXB', t: 'MUX', s: 'ALUSrc', x: 4.0, z: 3.5, w: 1.8, d: 2.8, c: 'grey' },
    { id: 'ALU', t: 'ALU', s: 'Arithmetic Logic Unit', x: 8.2, z: 0.8, w: 4.8, d: 4.0, c: 'green' },
    { id: 'DMEM', t: 'DATA RAM', s: 'Data Memory', x: 14, z: 0.8, w: 4.6, d: 4.0, c: 'green' },
    { id: 'MMIO', t: 'LED I/O', s: 'MMIO @ 0x100', x: 14, z: -6, w: 4.0, d: 2.8, c: 'pink' },
    { id: 'WBMUX', t: 'MUX', s: 'WB', x: 18.5, z: -1.5, w: 1.8, d: 3.4, c: 'grey' }
  ];
  const P = (...a) => a;
  const MUX_ALU = [[4.9, 3.5], [5.3, 3.5], [5.3, 1.8], [5.8, 1.8]];
  const BUSES = {
    PC_IMEM: { from: ['PC'], to: ['IMEM'], c: 'amber', paths: [[[-11.9, -2], [-10.3, -2]]] },
    IMEM_CTRL: { from: ['IMEM'], to: ['CONTROL'], c: 'violet', paths: [[[-8, -0.2], [-8, 3.9]]] },
    IMEM_REG: { from: ['IMEM'], to: ['REGFILE'], c: 'cyan', paths: [[[-5.7, -2.8], [-3.7, -2.8]]] },
    IMEM_IMM: { from: ['IMEM'], to: ['IMMGEN'], c: 'violet', paths: [[[-6.6, -0.2], [-6.6, 2.4], [-2.5, 2.4], [-2.5, 6.5]]] },
    REG_ALU_A: { from: ['REGFILE'], to: ['ALU'], c: 'cyan', paths: [[[1.3, -3.8], [5.0, -3.8], [5.0, -0.4], [5.8, -0.4]]] },
    REG_ALU_B: { from: ['REGFILE'], to: ['MUXB', 'ALU'], c: 'cyan', paths: [[[1.3, -1.6], [2.6, -1.6], [2.6, 3.5], [3.1, 3.5]], MUX_ALU] },
    IMM_ALU_B: { from: ['IMMGEN'], to: ['MUXB', 'ALU'], c: 'violet', paths: [[[-0.6, 7.8], [4.0, 7.8], [4.0, 4.9]], MUX_ALU] },
    ALU_DMEM: { from: ['ALU'], to: ['DMEM'], c: 'green', paths: [[[10.6, 1.9], [11.7, 1.9]]] },
    ALU_WB: { from: ['ALU'], to: ['WBMUX'], c: 'green', paths: [[[9.0, -1.2], [9.0, -3.6], [18.5, -3.6], [18.5, -3.2]]] },
    DMEM_WB: { from: ['DMEM'], to: ['WBMUX'], c: 'green', paths: [[[16.3, -0.4], [17.6, -0.4]]] },
    WB_REG: { from: ['WBMUX'], to: ['REGFILE'], c: 'amber', paths: [[[19.4, -1.5], [19.9, -1.5], [19.9, -10.6], [-1.2, -10.6], [-1.2, -5.0]]] },
    PC_PLUS4: { from: ['PC'], to: ['ADD4', 'PC'], c: 'amber', paths: [[[-13.5, -3.5], [-13.5, -6.9]], [[-15.1, -8], [-15.9, -8], [-15.9, -2], [-15.1, -2]]] },
    PC_LINK_WB: { from: ['ADD4'], to: ['WBMUX'], c: 'amber', paths: [[[-11.9, -8.4], [-11.0, -8.4], [-11.0, -9.7], [18.8, -9.7], [18.8, -3.2]]] },
    BRANCH_TARGET: { from: ['IMMGEN'], to: ['PC'], c: 'pink', paths: [[[-4.4, 8.2], [-4.4, 10.4], [-16.4, 10.4], [-16.4, -1.2], [-15.1, -1.2]]] },
    ALU_MMIO: { from: ['ALU'], to: ['MMIO'], c: 'pink', paths: [[[10.0, -1.2], [10.0, -6.0], [12.0, -6.0]]] },
    REG_DMEM_WD: { from: ['REGFILE'], to: ['DMEM'], c: 'cyan', paths: [[[0.2, -0.6], [0.2, 5.6], [14.0, 5.6], [14.0, 2.8]]] }
  };
  const CTRL = {
    CTRL_REG: { to: ['REGFILE'], paths: [[[-5.7, 4.6], [-3.0, 4.6], [-3.0, -0.6]]] },
    CTRL_MUX: { to: ['MUXB'], paths: [[[-5.7, 4.2], [3.1, 4.2]]] },
    CTRL_ALU: { to: ['ALU'], paths: [[[-5.7, 6.0], [7.0, 6.0], [7.0, 2.8]]] },
    CTRL_DMEM: { to: ['DMEM'], paths: [[[-5.7, 6.6], [12.5, 6.6], [12.5, 2.8]]] }
  };

  const hexs = (n, w) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(w || 2, '0');
  const css = h => '#' + h.toString(16).padStart(6, '0');

  function drawPlate(cv, blk, live, active) {
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height, col = css(COL[blk.c]);
    ctx.fillStyle = active ? '#0d1a22' : '#080d12'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, active ? col + '33' : col + '14'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = col; ctx.globalAlpha = active ? 1 : 0.45; ctx.lineWidth = 6; ctx.strokeRect(5, 5, w - 10, h - 10); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.fillStyle = active ? '#ffffff' : '#9fb3c1';
    const tiny = blk.w < 2.5;
    const fit = (txt, size, weight, family) => { let f = size; ctx.font = `${weight} ${f}px ${family}`; while (ctx.measureText(txt).width > w * 0.88 && f > 8) { f *= 0.92; ctx.font = `${weight} ${f}px ${family}`; } };
    fit(blk.t, tiny ? h * 0.22 : h * 0.3, 800, 'Segoe UI, Helvetica, Arial, sans-serif'); ctx.fillText(blk.t, w / 2, h * (live && live.length ? 0.27 : 0.5));
    fit(blk.s, h * 0.115, 500, 'Segoe UI, Helvetica, Arial, sans-serif'); ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fillText(blk.s, w / 2, h * (live && live.length ? 0.4 : 0.7)); ctx.globalAlpha = 1;
    if (live && live.length) {
      ctx.fillStyle = '#e8fbff';
      live.slice(0, 3).forEach((t, i) => { fit(t, h * 0.15, 700, 'ui-monospace, Menlo, Consolas, monospace'); ctx.fillText(t, w / 2, h * (0.58 + i * 0.17)); });
    }
  }

  function buildDatapath(R) {
    const root = new Node('datapath'); const blocks = {}, buses = {};
    // board
    {
      const b = new Builder(); b.box(40, 0.4, 27, { pos: [1.5, -0.4, 0], r: 0.4, col: 0x080c11, metal: 0.4, rough: 0.35 });
      b.box(39, 0.05, 0.12, { pos: [1.5, 0, -12.9], col: COL.cyan, emis: 2.0 }); b.box(39, 0.05, 0.12, { pos: [1.5, 0, 12.9], col: COL.cyan, emis: 2.0 });
      const n = new Node('dpboard', R.createMesh(b.build()), { proc: 3, bump: 0.002 }); n.group = null; n.pickable = false; root.add(n);
      const fb = new Builder(); fb.box(400, 0.2, 400, { pos: [0, -1.4, 0], col: 0x05080e, rough: 1.0 });
      const f = new Node('dpfloor', R.createMesh(fb.build()), { proc: 2 }); f.pickable = false; f.castShadow = false; root.add(f);
    }
    // blocks
    BLOCKS.forEach(blk => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * blk.d / blk.w);
      drawPlate(cv, blk, null, false);
      const tex = R.createTexture(cv);
      const body = new Builder(); body.box(blk.w, 0.7, blk.d, { pos: [blk.x, 0, blk.z], r: 0.22, col: 0x10171f, metal: 0.7, rough: 0.35 });
      const edge = new Builder(); edge.box(blk.w + 0.08, 0.08, blk.d + 0.08, { pos: [blk.x, 0.05, blk.z], r: 0.24, col: COL[blk.c], emis: 1.2 });
      for (let i = 0; i < Math.floor(blk.w / 0.55); i++) for (const s of [-1, 1]) body.box(0.22, 0.12, 0.28, { pos: [blk.x - blk.w / 2 + 0.45 + i * 0.55, 0, blk.z + s * (blk.d / 2 + 0.06)], col: 0xe8b84a, metal: 1, rough: 0.25 });
      const plate = new Builder(); plate.box(blk.w - 0.3, 0.05, blk.d - 0.3, { pos: [blk.x, 0.7, blk.z], r: 0.1, col: 0xffffff, rough: 0.4, emis: 0.9 });
      const g = new Node('blk_' + blk.id);
      const nb = new Node('b', R.createMesh(body.build()), {}); const ne = new Node('e', R.createMesh(edge.build()), {}); ne.castShadow = false;
      const np = new Node('p', R.createMesh(plate.build()), { tex, emisScale: 0.9 }); np.castShadow = false;
      for (const n of [nb, ne, np]) { n.group = 'dp:' + blk.id; n.hlCol = lin(COL[blk.c]).map(v => Math.pow(v, 0.7)); g.add(n); }
      root.add(g); blocks[blk.id] = { def: blk, node: g, nodes: [nb, ne, np], cv, tex, active: 0, target: 0, live: null };
    });
    // wires
    const mkWire = (id, def, color, radius, isCtrl) => {
      const wb = new Builder(), ab = new Builder(); const lane = (Object.keys(buses).length % 4) * 0.045;
      for (const path of def.paths) {
        const pts = path.map(p => [p[0], 0.5 + lane, p[1]]);
        wb.tube(pts, radius, { col: color, emis: 1, seg: 8, sub: 0, smoothPath: false, cap: true });
        // arrow head at the end
        const a = path[path.length - 2], z = path[path.length - 1], dx = z[0] - a[0], dz = z[1] - a[1];
        ab.group({ pos: [z[0], 0.5 + lane, z[1]], rot: [0, Math.atan2(-dz, dx), -Math.PI / 2] }, g => g.lathe([[0, -0.52], [radius * 3.0, -0.52], [0, 0.0]], { seg: 10, col: color, emis: 1 }));
      }
      const wn = new Node('wire_' + id, R.createMesh(wb.build()), { emisAnim: 3 }); wn.castShadow = false; wn.group = 'dp:wire'; wn.pickable = false;
      const an = new Node('arrow_' + id, R.createMesh(ab.build()), { emisScale: 0.3 }); an.castShadow = false; an.pickable = false;
      root.add(wn); root.add(an); buses[id] = { node: wn, arrow: an, def, ctrl: !!isCtrl, target: 0 };
    };
    for (const id in BUSES) mkWire(id, BUSES[id], COL[BUSES[id].c], 0.11, false);
    for (const id in CTRL) mkWire(id, CTRL[id], COL.violet, 0.05, true);

    function setTrace(t) {
      if (t && (t.halted || !t.inst)) t = null;
      const act = new Set(t ? t.activeBuses : []);
      const hot = new Set();
      for (const id in BUSES) { const on = act.has(id); buses[id].target = on ? 1 : 0; if (on) { BUSES[id].from.concat(BUSES[id].to).forEach(b => hot.add(b)); } }
      const ctrlOn = act.has('IMEM_CTRL'); for (const id in CTRL) { buses[id].target = ctrlOn ? 0.75 : 0; if (ctrlOn) CTRL[id].to.forEach(b => hot.add(b)); }
      if (t) { hot.add('PC'); hot.add('IMEM'); }
      const c = t && t.ctrl || {}, I = t && t.inst;
      const live = !t ? {} : {
        PC: [hexs(t.prevPC), '→ ' + hexs(t.nextPC)],
        IMEM: [I.hex, I.asm.length > 18 ? I.asm.slice(0, 18) : I.asm],
        CONTROL: [(I.op || '') + ' ' + (I.format || '').replace('-Type', ''), 'ALU:' + (c.ALUControl || '-'), 'RW:' + (c.RegWrite ? 1 : 0) + ' MW:' + (c.MemWrite ? 1 : 0)],
        IMMGEN: ['imm = ' + I.imm],
        REGFILE: ['A=' + t.valA + '  B=' + t.valB, c.RegWrite && I.rd ? 'x' + I.rd + ' ← ' + t.writeBackVal : ''],
        MUXB: [act.has('IMM_ALU_B') ? 'imm' : 'rs2'],
        ALU: [t.valA + ' , ' + t.aluSrcB, '= ' + t.aluResult],
        DMEM: act.has('DMEM_WB') ? ['read', '' + t.memReadData] : act.has('ALU_DMEM') ? ['write', '' + t.valB] : [],
        MMIO: act.has('ALU_MMIO') ? ['LED ←', '' + (t.valB & 15)] : [],
        WBMUX: act.has('WB_REG') ? ['← ' + t.writeBackVal] : [],
        ADD4: [hexs(t.prevPC + 4)]
      };
      for (const id in blocks) {
        const B = blocks[id]; B.target = hot.has(id) ? 1 : 0;
        drawPlate(B.cv, B.def, live[id] && live[id].filter(Boolean), hot.has(id)); R.updateTexture(B.tex, B.cv);
      }
    }
    function update(dt) {
      const k = Math.min(1, dt * 7);
      for (const id in buses) { const b = buses[id]; b.node.pulse += (b.target - b.node.pulse) * k; b.arrow.material.emisScale = 0.28 + 1.3 * b.node.pulse; }
      for (const id in blocks) { const B = blocks[id]; B.active += (B.target - B.active) * k; for (const n of B.nodes.slice(0, 2)) n.highlight = B.active * 0.9; B.nodes[2].material.emisScale = 0.55 + 0.9 * B.active; }
    }
    setTrace(null);
    return { root, blocks, buses, setTrace, update, focus: { target: [1.5, 0, -0.5], dist: 38, yaw: 0.0, pitch: 1.18 }, BLOCKS };
  }

  global.ITM_GL.buildDatapath = buildDatapath;
  global.ITM_GL.datapathDefs = { BLOCKS, BUSES };
})(typeof window !== 'undefined' ? window : globalThis);
