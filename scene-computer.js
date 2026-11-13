/* ITM_GL.buildComputer — a procedurally modelled desktop computer (1 unit = 1 cm).
 * Motherboard with routed PCB, LGA socket + CPU (IHS, die), tower cooler with spinning fan, DDR5 DIMMs with RGB bars,
 * NVMe SSD, VRM, PCIe, chipset, I/O. Returns a scene graph with logical component groups for picking / explode / tour. */
(function (global) {
  'use strict';
  const { Builder } = global.ITM_GL.geometry;
  const { Node } = global.ITM_GL.Engine;
  const TX = global.ITM_GL.textures;

  const C = {
    black: 0x0c0d11, plastic: 0x15171d, steel: 0xa4adb7, alu: 0xc4cbd3, aluDark: 0x20252c, copper: 0xc0773c, gold: 0xe8b84a,
    nickel: 0xcfd5dc, epoxy: 0x08090b, green: 0x0e4a2b, cyan: 0x18d6ee, magenta: 0xf040a0, tan: 0x4a3a24, white: 0xe7ebf0, blue: 0x1c6fff
  };

  const LAYOUT = {
    W: 24.4, D: 24.4,
    cpu: { x: -2.0, z: -3.6 }, dimmX: [5.2, 7.6], slotX: [5.2, 6.4, 7.6, 8.8],
    pcie: { x: -3.2, z: 5.2 }, m2: { x: -0.8, z: 1.4 }, chipset: { x: 6.2, z: 7.4 },
    holes: [[-11.2, -11.2], [11.2, -11.2], [-11.2, 11.2], [11.2, 11.2], [-11.2, 0], [11.2, 0], [0, -11.2], [0, 11.2], [3.2, 3.2]]
  };

  function buildComputer(R) {
    const L = LAYOUT, comps = {}, parts = {};
    const root = new Node('computer');
    const mk = (name, b, mat, group, opts) => {
      const n = new Node(name, R.createMesh(b.build ? b.build() : b), mat || {}); n.group = group || null; if (opts) Object.assign(n, opts); return n;
    };
    const group = (id, name) => { const g = new Node(name || id); g.group = id; comps[id] = { id, node: g, meshes: [] }; root.add(g); return g; };
    const addTo = (g, n) => { g.add(n); n.group = g.group; comps[g.group].meshes.push(n); return n; };

    /* ───────── textures ───────── */
    const tex = c => c ? R.createTexture(c) : null;
    const pcbT = TX.pcb(L.W, L.D, 150, L), dieT = TX.die(1024), ihsT = TX.ihs(1024, 900);
    const T = { pcb: tex(pcbT.albedo), pcbM: tex(pcbT.mr), die: tex(dieT.albedo), dieM: tex(dieT.mr), ihs: tex(ihsT.albedo) };

    /* ───────── bench tray + floor ───────── */
    const env = group('motherboard', 'Motherboard');
    {
      const b = new Builder();
      b.box(L.W + 3.4, 0.5, L.D + 3.4, { pos: [0, -1.55, 0], r: 0.5, col: 0x1a1f27, metal: 0.9, rough: 0.5 });
      for (const [x, z] of L.holes) b.cyl(0.42, 1.2, { pos: [x, -1.05, z], seg: 6, col: C.gold, metal: 1, rough: 0.25 }); // brass hex standoffs
      const tray = mk('tray', b, { proc: 3, bump: 0.002, texScale: [1, 1] }, 'motherboard'); addTo(env, tray);
    }
    {
      const b = new Builder(); b.box(400, 0.2, 400, { pos: [0, -2.2, 0], col: 0x05080e, rough: 1.0, metal: 0.0 });
      const f = mk('floor', b, { proc: 2 }, null, { pickable: false, castShadow: false }); root.add(f); parts.floor = f;
    }

    /* ───────── PCB ───────── */
    {
      const b = new Builder(); b.box(L.W, 0.17, L.D, { pos: [0, -0.17, 0], r: 0.12, col: 0xffffff, rough: 0.5, metal: 0.0 });
      const pcb = mk('pcb', b, { tex: T.pcb, tex2: T.pcbM, bump: 0.0035, tex2Emis: 2.4 }, 'motherboard'); addTo(env, pcb); parts.pcb = pcb;
    }
    // generic board-level small parts (merged into one mesh)
    {
      const b = new Builder(), rnd = TX.rng(3);
      // MLCC / SMD resistor fields
      for (let i = 0; i < 520; i++) {
        const x = (rnd() - 0.5) * 22, z = (rnd() - 0.5) * 22, rot = rnd() > 0.5 ? 0 : Math.PI / 2;
        // keep out of tall part footprints
        const inCpu = Math.abs(x - L.cpu.x) < 4 && Math.abs(z - L.cpu.z) < 4, inRam = x > 4.4 && x < 9.6 && z < 3.4 && z > -11, inPcie = Math.abs(z - L.pcie.z) < 1.2 && x < 2 && x > -8.2;
        if (inCpu || inRam || inPcie) continue;
        b.box(0.1, 0.05, 0.2, { pos: [x, 0, z], rot: [0, rot, 0], col: rnd() > 0.35 ? C.tan : 0x24262c, rough: 0.55 });
      }
      // QFN / SOIC chips
      for (const [x, z, w, d] of [[-10, 8, 1.2, 1.2], [-10.6, 5.5, 0.9, 0.9], [-7, 10, 1.4, 1.0], [2.0, 6.4, 1.0, 1.0], [10, 4, 1.6, 1.0], [-3.5, 10.5, 1.6, 0.8], [9.8, -1.8, 1.0, 1.0], [-6.6, 6.5, 0.9, 0.9]]) {
        b.box(w, 0.12, d, { pos: [x, 0, z], r: 0.03, col: C.epoxy, rough: 0.5 }); b.box(w * 0.3, 0.125, w * 0.3, { pos: [x - w * 0.25, 0, z - d * 0.25], col: 0x303338, rough: 0.8 });
      }
      // audio caps (gold polymer)
      for (let i = 0; i < 9; i++) { const x = -10.8 + (i % 5) * 0.95, z = 9.7 + Math.floor(i / 5) * 1.0; b.cyl(0.36, 0.7, { pos: [x, 0, z], bevel: 0.04, col: i % 3 ? 0xb8923a : 0x23252b, metal: 0.6, rough: 0.35, seg: 14 }); }
      // shielded audio codec
      b.box(3.0, 0.28, 2.2, { pos: [-8.4, 0, 8.6], r: 0.05, col: 0x6f7780, metal: 1, rough: 0.5 });
      // CR2032 battery in holder
      b.cyl(1.55, 0.34, { pos: [1.6, 0.35, 9.8], bevel: 0.05, col: 0x9aa1a9, metal: 1, rough: 0.5, seg: 32 }); b.cyl(1.7, 0.4, { pos: [1.6, 0, 9.8], bevel: 0.08, col: C.plastic, rough: 0.5, seg: 32 }); b.box(0.5, 0.35, 1.0, { pos: [1.6, 0.35, 8.1], col: C.steel, metal: 1, rough: 0.3 });
      // SATA stack (right-angle)
      for (let i = 0; i < 4; i++) b.box(2.9, 0.95, 0.78, { pos: [10.3, 0, 8.6 + (i % 2) * 0.9 + Math.floor(i / 2) * 2.2], r: 0.04, col: C.black, rough: 0.4 });
      // front-panel / USB headers (pin rows)
      for (const [x, z, n] of [[10.6, 11.0, 10], [-3.0, 11.3, 9], [3.5, 11.4, 8]]) { b.box(n * 0.254 + 0.2, 0.9, 0.5, { pos: [x, 0, z], col: C.black, rough: 0.4 }); for (let i = 0; i < n; i++) b.box(0.07, 1.25, 0.07, { pos: [x - n * 0.127 + 0.127 + i * 0.254, 0, z], col: C.gold, metal: 1, rough: 0.2 }); }
      // fan headers
      for (const [x, z] of [[-9.5, -0.2], [2.8, -11.2], [9.7, 3.2]]) b.box(1.3, 0.8, 0.5, { pos: [x, 0, z], r: 0.03, col: 0xefefe6, rough: 0.5 });
      // 24-pin ATX + 8-pin EPS connectors
      b.box(1.2, 2.0, 5.2, { pos: [11.0, 0, -5.6], r: 0.08, col: 0x6d7278, rough: 0.55 });
      for (let i = 0; i < 12; i++) for (let k = 0; k < 2; k++) b.box(0.28, 0.06, 0.28, { pos: [10.75 + k * 0.5, 2.0, -7.9 + i * 0.42], col: 0x0d0e11 });
      b.box(4.1, 2.0, 1.2, { pos: [3.0, 0, -11.0], r: 0.08, col: 0x6d7278, rough: 0.55 });
      for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) b.box(0.28, 0.06, 0.28, { pos: [1.7 + i * 0.85, 2.0, -11.25 + k * 0.5], col: 0x0d0e11 });
      // PCIe x1 slot
      b.box(2.6, 1.1, 0.9, { pos: [-9.0, 0, 8.6 - 4.2], col: C.black, rough: 0.5 });
      addTo(env, mk('smallparts', b, { }, 'motherboard'));
    }
    // chipset heatsink
    {
      const b = new Builder(), cx = L.chipset.x, cz = L.chipset.z;
      b.box(6.0, 0.7, 6.0, { pos: [cx, 0, cz], r: 0.25, col: C.aluDark, metal: 1, rough: 0.45 });
      for (let i = 0; i < 7; i++) b.box(5.4, 0.7, 0.2, { pos: [cx, 0.7, cz - 2.4 + i * 0.8], col: C.aluDark, metal: 1, rough: 0.4 });
      b.box(3.2, 0.1, 3.2, { pos: [cx, 1.38, cz], r: 0.15, col: 0x0a0c10, metal: 0.8, rough: 0.35 });
      addTo(env, mk('chipset', b, { proc: 3, bump: 0.002 }, 'motherboard'));
      const lb = new Builder(); lb.box(2.9, 0.04, 2.9, { pos: [cx, 1.47, cz], col: 0xffffff, rough: 0.3 });
      const lt = TX.label(512, 512, [{ t: 'ITM', y: 0.38, size: 0.2, col: '#7ee7f5', weight: 800 }, { t: 'RV32I CHIPSET', y: 0.58, size: 0.07, col: '#cfe9f2' }, { t: 'X-500', y: 0.7, size: 0.07, col: '#7aa3b3', font: 'ui-monospace,Menlo,monospace' }], { bg: '#05080c', align: 'center' });
      addTo(env, mk('chipset_logo', lb, { tex: R.createTexture(lt.albedo), tex2: null }, 'motherboard'));
    }

    /* ───────── PCIe + IO (own component) ───────── */
    const pci = group('pcie_connectors', 'PCIe & IO');
    {
      const b = new Builder(), px = L.pcie.x, pz = L.pcie.z;
      b.box(9.2, 1.15, 0.95, { pos: [px, 0, pz], r: 0.04, col: C.black, rough: 0.45 });
      b.box(8.6, 0.05, 0.2, { pos: [px - 0.1, 1.12, pz], col: 0x050506, rough: 0.8 });
      for (let i = 0; i < 60; i++) b.box(0.07, 0.04, 0.5, { pos: [px - 4.1 + i * 0.138, 1.13, pz], col: C.gold, metal: 1, rough: 0.2 });
      b.box(9.9, 0.55, 1.45, { pos: [px, 0, pz], r: 0.05, col: 0x9aa4ae, metal: 1, rough: 0.35 }); // steel armour (under plastic -> shows as rim)
      b.box(0.5, 1.3, 1.0, { pos: [px + 4.85, 0, pz], r: 0.04, col: 0xcdd2d8, rough: 0.5 }); // latch
      addTo(pci, mk('pciex16', b, { }, 'pcie_connectors'));
      const arm = new Builder(); // steel armour plate on top
      arm.box(10.2, 0.14, 1.6, { pos: [px, 1.18, pz], r: 0.06, col: 0x1c2229, metal: 1, rough: 0.4 }); arm.box(10.2, 0.02, 0.05, { pos: [px, 1.32, pz - 0.5], col: C.cyan, emis: 2.4 });
      addTo(pci, mk('armour', arm, { proc: 3, bump: 0.002 }, 'pcie_connectors'));
      // rear I/O (left edge)
      const io = new Builder(), ix = -11.0;
      io.box(2.4, 4.2, 13.2, { pos: [ix, 0, -5.2], r: 0.12, col: 0xaeb6bf, metal: 1, rough: 0.35 });
      const port = (z, y, w, h, col, tongue) => { io.box(0.12, h, w, { pos: [-12.14, y, z], col: 0x050506, rough: 0.8 }); if (tongue) io.box(0.5, 0.18, w * 0.78, { pos: [-12.0, y + h / 2 - 0.1, z], col: tongue, rough: 0.5, emis: tongue === C.blue ? 0.5 : 0 }); };
      for (let i = 0; i < 4; i++) { port(-10.6 + i * 1.5, 0.35, 1.3, 0.75, 0, i < 2 ? C.blue : 0x15181c); port(-10.6 + i * 1.5, 1.75, 1.3, 0.75, 0, i < 2 ? C.blue : 0x15181c); }
      port(-3.7, 0.4, 1.0, 0.45, 0, 0x2a2f36); port(-2.3, 0.4, 1.0, 0.45, 0, 0x2a2f36); port(-0.2, 0.3, 1.6, 1.4, 0, 0x2a2f36); port(-0.2, 2.1, 1.6, 1.4, 0, C.green);
      for (let i = 0; i < 3; i++) { io.cyl(0.35, 0.3, { pos: [-12.28, 1.2 + (i - 1) * 0.0 + 0.0, 1.4 + 0.0], rot: [0, 0, Math.PI / 2], col: i ? 0x3a3f47 : C.green, metal: 0.4, rough: 0.4, seg: 18 }); }
      addTo(pci, mk('io', io, { proc: 3, bump: 0.002 }, 'pcie_connectors'));
      pci.explode = [-4.0, 1.5, 0];
    }

    /* ───────── VRM ───────── */
    const vrm = group('vrm', 'VRM');
    {
      const b = new Builder();
      // choke rows (ferrite inductors w/ copper windings visible) left + top of socket
      const choke = (x, z) => { b.box(1.0, 0.78, 1.0, { pos: [x, 0, z], r: 0.08, col: 0x2b2e34, metal: 0.55, rough: 0.35 }); b.box(0.2, 0.8, 1.02, { pos: [x - 0.42, 0, z], col: C.copper, metal: 1, rough: 0.28 }); b.box(0.2, 0.8, 1.02, { pos: [x + 0.42, 0, z], col: C.copper, metal: 1, rough: 0.28 }); };
      for (let i = 0; i < 8; i++) choke(-6.55, -7.2 + i * 1.12);
      for (let i = 0; i < 9; i++) choke(-5.3 + i * 1.12, -8.15 - 0.0);
      // polymer caps rows beside chokes
      for (let i = 0; i < 8; i++) b.cyl(0.38, 0.95, { pos: [-7.5, 0, -7.2 + i * 1.12], bevel: 0.05, col: 0x16181d, metal: 0.4, rough: 0.35, seg: 14 });
      for (let i = 0; i < 10; i++) b.cyl(0.38, 0.95, { pos: [-5.3 + i * 1.12, 0, -9.15], bevel: 0.05, col: 0x16181d, metal: 0.4, rough: 0.35, seg: 14 });
      addTo(vrm, mk('chokes', b, {}, 'vrm'));
      // heatsinks
      const hs = new Builder();
      hs.box(2.6, 3.0, 10.6, { pos: [-9.0, 0, -7.0], r: 0.18, col: C.aluDark, metal: 1, rough: 0.42 });
      for (let i = 0; i < 17; i++) hs.box(2.2, 1.1, 0.13, { pos: [-9.0, 3.0, -12.0 + 3.7 + i * 0.6], col: C.aluDark, metal: 1, rough: 0.38 });
      hs.box(0.06, 0.6, 9.6, { pos: [-7.74, 1.2, -7.0], col: C.cyan, emis: 2.6 });
      hs.box(10.0, 2.8, 2.5, { pos: [-1.2, 0, -10.5], r: 0.18, col: C.aluDark, metal: 1, rough: 0.42 });
      for (let i = 0; i < 17; i++) hs.box(0.13, 1.1, 2.1, { pos: [-5.8 + i * 0.58, 2.8, -10.5], col: C.aluDark, metal: 1, rough: 0.38 });
      hs.box(9.2, 0.06, 0.06, { pos: [-1.2, 1.2, -9.22], col: C.cyan, emis: 2.6 });
      const hsn = addTo(vrm, mk('vrm_heatsinks', hs, { proc: 3, bump: 0.0025 }, 'vrm')); parts.vrmHS = hsn;
      hsn.explode = [-1.2, 4.2, -1.0];
    }

    /* ───────── CPU socket (motherboard) + package ───────── */
    const cx = L.cpu.x, cz = L.cpu.z;
    {
      const b = new Builder();
      b.box(6.6, 0.55, 6.4, { pos: [cx, 0, cz], r: 0.1, col: C.plastic, rough: 0.5 });
      // LGA lands field (gold)
      const ox = cx - 2.0, oz = cz - 1.7;
      for (let i = 0; i < 41; i++) for (let j = 0; j < 36; j++) { if (i > 14 && i < 26 && j > 12 && j < 23 && (i + j) % 2) continue; b.box(0.06, 0.04, 0.06, { pos: [ox + i * 0.1, 0.55, oz + j * 0.1], col: C.gold, metal: 1, rough: 0.2 }); }
      // load-plate frame (steel)
      b.box(6.4, 0.18, 0.9, { pos: [cx, 0.55, cz - 2.75], r: 0.04, col: C.steel, metal: 1, rough: 0.3 }); b.box(6.4, 0.18, 0.9, { pos: [cx, 0.55, cz + 2.75], r: 0.04, col: C.steel, metal: 1, rough: 0.3 });
      b.box(0.9, 0.18, 4.6, { pos: [cx - 2.75, 0.55, cz], r: 0.04, col: C.steel, metal: 1, rough: 0.3 }); b.box(0.9, 0.18, 4.6, { pos: [cx + 2.75, 0.55, cz], r: 0.04, col: C.steel, metal: 1, rough: 0.3 });
      // retention lever
      b.tube([[cx + 3.2, 0.9, cz + 2.4], [cx + 3.7, 0.9, cz + 2.4], [cx + 3.7, 0.9, cz - 0.4], [cx + 3.9, 0.9, cz - 0.6]], 0.11, { col: C.steel, metal: 1, rough: 0.25, seg: 8, sub: 4 });
      addTo(env, mk('socket', b, {}, 'motherboard'));
    }
    const pkg = group('cpu_package', 'CPU package');
    {
      const b = new Builder(), sy = 0.6; // substrate sits on socket lands
      b.box(4.5, 0.12, 3.75, { pos: [cx, sy, cz], r: 0.07, col: C.green, rough: 0.42 });
      for (let k = 0; k < 2; k++) for (let i = 0; i < 18; i++) {
        b.box(0.1, 0.05, 0.18, { pos: [cx - 1.7 + i * 0.2, sy + 0.12, cz - 1.5 - k * 0.22], col: C.tan, rough: 0.55 });
        b.box(0.1, 0.05, 0.18, { pos: [cx - 1.7 + i * 0.2, sy + 0.12, cz + 1.5 + k * 0.22], col: C.tan, rough: 0.55 });
      }
      for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) {
        b.box(0.18, 0.05, 0.1, { pos: [cx - 1.9 - k * 0.22, sy + 0.12, cz - 0.9 + i * 0.2], col: C.tan, rough: 0.55 });
        b.box(0.18, 0.05, 0.1, { pos: [cx + 1.9 + k * 0.22, sy + 0.12, cz - 0.9 + i * 0.2], col: C.tan, rough: 0.55 });
      }
      b.box(0.25, 0.015, 0.25, { pos: [cx - 2.0, sy + 0.12, cz + 1.55], col: C.gold, metal: 1, rough: 0.2 });
      addTo(pkg, mk('substrate', b, {}, 'cpu_package'));
      // solder TIM pad
      const tb = new Builder(); tb.box(1.8, 0.04, 1.4, { pos: [cx, sy + 0.12, cz], r: 0.04, col: 0xa7adb5, metal: 1, rough: 0.22 });
      addTo(pkg, mk('tim', tb, { }, 'cpu_package'));
      // IHS (nickel-plated copper lid) — separate node so it can lift off
      const ib = new Builder(); ib.box(3.9, 0.26, 3.4, { pos: [cx, sy + 0.16, cz], r: 0.07, col: 0xffffff, metal: 1, rough: 0.28 });
      const ihs = mk('ihs', ib, { tex: T.ihs, bump: 0.003 }, 'cpu_package'); pkg.add(ihs); comps.cpu_package.meshes.push(ihs); parts.ihs = ihs;
      // legs (visible when lifted)
      const lg = new Builder(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) lg.box(0.55, 0.16, 0.5, { pos: [cx + sx * 1.62, sy + 0.12, cz + sz * 1.4], col: 0xb5bcc5, metal: 1, rough: 0.3 });
      lg.box(3.6, 0.02, 3.1, { pos: [cx, sy + 0.14, cz], col: 0x8e949c, metal: 1, rough: 0.35 });
      const legs = mk('ihs_legs', lg, {}, 'cpu_package'); ihs.add(legs); legs.group = 'cpu_package'; comps.cpu_package.meshes.push(legs);
    }
    const dieG = group('cpu_die', 'CPU die');
    {
      const b = new Builder(); b.box(1.5, 0.09, 1.2, { pos: [cx, 0.72, cz], r: 0.012, col: 0xffffff, metal: 0.9, rough: 0.22 });
      const d = mk('die', b, { tex: T.die, tex2: T.dieM, irid: 0.55, tex2Emis: 0.9, bump: 0.0012 }, 'cpu_die'); addTo(dieG, d); parts.die = d;
    }

    /* ───────── DDR5 DIMMs + slots ───────── */
    const ram = group('ram', 'DDR5 memory');
    const dimmZ = -3.75, dimmLen = 13.3;
    {
      const sb = new Builder();
      for (const sx of L.slotX) {
        sb.box(0.9, 1.05, 13.8, { pos: [sx, 0, dimmZ], r: 0.05, col: 0x0b0c10, rough: 0.5 });
        sb.box(0.28, 0.06, 13.0, { pos: [sx, 1.05, dimmZ], col: 0x040405, rough: 0.8 });
        for (const e of [-1, 1]) sb.box(0.7, 1.9, 0.5, { pos: [sx, 0, dimmZ + e * 7.15], r: 0.05, col: 0xd8dce1, rough: 0.5 }); // latches
      }
      addTo(env, mk('dimm_slots', sb, {}, 'motherboard'));
    }
    parts.dimms = [];
    L.dimmX.forEach((dx, di) => {
      const dg = new Node('dimm' + di); dg.group = 'ram'; ram.add(dg); comps.ram.meshes.push(dg); dg.pos = [0, 0, 0]; dg.explode = [di ? 3.5 : 2.5, 6 + di * 2.5, 0]; parts.dimms.push(dg);
      const b = new Builder(); // PCB + chips
      b.box(0.14, 3.0, dimmLen, { pos: [dx, 1.0, dimmZ], r: 0.02, col: 0x0b2a1b, rough: 0.45 });
      b.box(0.16, 0.5, dimmLen - 0.4, { pos: [dx, 0.35, dimmZ], col: C.gold, metal: 1, rough: 0.2 });
      for (const s of [-1, 1]) for (let i = 0; i < 8; i++) b.box(0.07, 0.95, 1.2, { pos: [dx + s * 0.1, 2.2, dimmZ - 5.3 + i * 1.5], col: C.epoxy, rough: 0.55 });
      b.box(0.08, 0.6, 0.8, { pos: [dx + 0.1, 1.4, dimmZ + 4.5], col: C.epoxy, rough: 0.5 });
      addTo(dg, mk('dimm_pcb' + di, b, {}, 'ram'));
      const hb = new Builder(); // heat spreaders
      for (const s of [-1, 1]) {
        hb.box(0.2, 3.7, dimmLen - 0.7, { pos: [dx + s * 0.3, 1.0, dimmZ], r: 0.05, col: C.aluDark, metal: 1, rough: 0.4 });
        hb.box(0.2, 0.45, dimmLen - 0.7, { pos: [dx + s * 0.3, 4.7, dimmZ], r: 0.06, col: 0x2d333b, metal: 1, rough: 0.35 });
        for (let i = 0; i < 7; i++) hb.box(0.26, 0.9, 0.12, { pos: [dx + s * 0.3, 3.0, dimmZ - 4.5 + i * 1.5], col: 0x161a1f, metal: 1, rough: 0.3 });
      }
      addTo(dg, mk('dimm_sink' + di, hb, { proc: 3, bump: 0.002 }, 'ram'));
      const rb = new Builder(); rb.box(0.55, 0.32, dimmLen - 1.6, { pos: [dx, 5.0, dimmZ], r: 0.1, col: 0xffffff, rough: 0.35, emis: 1.25, emisCol: 0xffffff }); // RGB diffuser
      addTo(dg, mk('dimm_rgb' + di, rb, { emisAnim: 1, emisScale: 1.0 }, 'ram', { castShadow: false }));
      const lt = TX.label(1024, 128, [{ t: 'ITM  DDR5-6400  32GB', y: 0.5, size: 0.42, col: '#e8f6fb', weight: 700 }], { bg: '#151a20' });
      const lb = new Builder(); lb.box(0.04, 1.2, 8, { pos: [dx + 0.42, 2.6, dimmZ], col: 0xffffff, rough: 0.3 });
      const lm = mk('dimm_label' + di, lb, { tex: R.createTexture(lt.albedo), texScale: [1, 1] }, 'ram'); addTo(dg, lm);
    });

    /* ───────── NVMe SSD ───────── */
    const ssd = group('ssd', 'NVMe SSD');
    {
      const mx = L.m2.x, mz = L.m2.z, len = 8.0, x0 = mx - len / 2 - 0.0;
      const cb = new Builder(); cb.box(0.9, 0.55, 2.2, { pos: [mx + 0.4, 0, mz], col: C.black, rough: 0.5 }); cb.cyl(0.35, 0.7, { pos: [x0 - 0.35, 0, mz], seg: 6, col: C.gold, metal: 1, rough: 0.25 });
      cb.cyl(0.26, 0.12, { pos: [x0 - 0.35, 0.7, mz], seg: 16, col: C.steel, metal: 1, rough: 0.3 });
      addTo(env, mk('m2_slot', cb, {}, 'motherboard'));
      const b = new Builder(), y = 0.55;
      b.box(len, 0.08, 2.2, { pos: [mx - len / 2 + 0.3, y, mz], col: 0x0d1612, rough: 0.5 });
      b.box(1.2, 0.09, 1.2, { pos: [x0 + 1.2, y + 0.08, mz], r: 0.03, col: 0x1b1d22, metal: 0.4, rough: 0.35 }); // controller
      b.box(1.5, 0.09, 1.15, { pos: [x0 + 3.0, y + 0.08, mz], r: 0.03, col: C.epoxy, rough: 0.5 }); b.box(1.5, 0.09, 1.15, { pos: [x0 + 4.7, y + 0.08, mz], r: 0.03, col: C.epoxy, rough: 0.5 });
      b.box(0.9, 0.09, 0.9, { pos: [x0 + 6.4, y + 0.08, mz], r: 0.03, col: C.epoxy, rough: 0.5 });
      for (let i = 0; i < 24; i++) b.box(0.1, 0.05, 0.2, { pos: [x0 + 0.5 + (i % 12) * 0.62, y + 0.08, mz + (i < 12 ? -0.95 : 0.95)], col: C.tan, rough: 0.5 });
      b.box(0.9, 0.1, 1.9, { pos: [mx + 0.25, y, mz], col: C.gold, metal: 1, rough: 0.22 });
      const pcb = addTo(ssd, mk('ssd_pcb', b, {}, 'ssd')); pcb.explode = [0, 3.2, 0];
      const hb = new Builder(); hb.box(len - 0.9, 0.2, 2.35, { pos: [mx - len / 2 + 0.3, y + 0.3, mz], r: 0.06, col: 0x1d2229, metal: 1, rough: 0.35 });
      for (let i = 0; i < 12; i++) hb.box(0.12, 0.2, 2.2, { pos: [x0 + 0.9 + i * 0.5, y + 0.5, mz], col: 0x1d2229, metal: 1, rough: 0.35 });
      hb.box(len - 1.4, 0.02, 0.06, { pos: [mx - len / 2 + 0.3, y + 0.7, mz - 1.0], col: C.cyan, emis: 2.4 });
      const hs = addTo(ssd, mk('ssd_heatsink', hb, { proc: 3, bump: 0.002 }, 'ssd')); hs.explode = [0, 7.5, 0]; parts.ssdHS = hs;
      const lt = TX.label(1024, 256, [{ t: 'ITM  PRO 990', y: 0.34, size: 0.24, col: '#7ee7f5', weight: 800 }, { t: '2TB  NVMe PCIe 5.0 x4  ·  12,400 MB/s', y: 0.66, size: 0.13, col: '#c6d6de' }], { bg: '#0a0e13' });
      const lb = new Builder(); lb.box(3.6, 0.02, 0.9, { pos: [mx - 2.4, y + 0.71, mz + 0.3], col: 0xffffff, rough: 0.3 });
      const ln = addTo(ssd, mk('ssd_label', lb, { tex: R.createTexture(lt.albedo) }, 'ssd')); ln.explode = [0, 7.5, 0];
    }

    /* ───────── cooler: nickel base, copper heat pipes, alu fins, fan ───────── */
    const cool = group('cooling', 'Cooler');
    const baseY = 0.6 + 0.16 + 0.26;
    parts.coolerRoot = new Node('cooler'); cool.add(parts.coolerRoot); parts.coolerRoot.group = 'cooling';
    {
      const tx = cx, tz = cz, fy0 = baseY + 0.62, fh = 10.2; // fin stack origin
      const b = new Builder();
      b.box(5.2, 0.55, 5.2, { pos: [tx, baseY, tz], r: 0.1, col: C.nickel, metal: 1, rough: 0.22 });
      // fin stack (planes in XY, stacked along z)
      const nF = 46, pitch = 0.1, z0 = tz - nF * pitch / 2;
      for (let i = 0; i < nF; i++) b.box(10.6, fh, 0.058, { pos: [tx, fy0, z0 + i * pitch], r: 0.012, col: 0x8d959e, metal: 0.9, rough: 0.6 });
      for (const sx of [-1, 1]) b.box(0.14, fh, nF * pitch + 0.1, { pos: [tx + sx * 5.37, fy0, tz], r: 0.04, col: 0x2a3038, metal: 1, rough: 0.45 });
      b.box(10.8, 0.3, nF * pitch + 0.15, { pos: [tx, fy0 + fh, tz], r: 0.1, col: 0x14181e, metal: 1, rough: 0.35 });
      b.box(10.8, 0.14, nF * pitch + 0.15, { pos: [tx, fy0 - 0.12, tz], r: 0.05, col: 0x14181e, metal: 1, rough: 0.35 });
      b.box(8.6, 0.02, 0.12, { pos: [tx, fy0 + fh + 0.3, tz - 1.2], col: C.cyan, emis: 2.8 });
      b.box(8.6, 0.02, 0.12, { pos: [tx, fy0 + fh + 0.3, tz + 1.2], col: C.cyan, emis: 2.8 });
      const finMesh = mk('fins', b, {}, 'cooling'); parts.coolerRoot.add(finMesh); comps.cooling.meshes.push(finMesh);
      // heat pipes (copper)
      const hp = new Builder();
      for (let k = 0; k < 6; k++) {
        const z = tz - 1.9 + k * 0.76, top = fy0 + fh + 0.18;
        hp.tube([[tx - 4.3, top, z], [tx - 4.3, fy0 + 3.5, z], [tx - 3.5, fy0 + 0.9, z], [tx - 2.3, baseY + 0.2, z], [tx + 2.3, baseY + 0.2, z], [tx + 3.5, fy0 + 0.9, z], [tx + 4.3, fy0 + 3.5, z], [tx + 4.3, top, z]], 0.3, { col: C.copper, metal: 1, rough: 0.24, seg: 12, sub: 6 });
      }
      const hpm = mk('heatpipes', hp, {}, 'cooling'); parts.coolerRoot.add(hpm); comps.cooling.meshes.push(hpm);
      parts.coolerRoot.explode = [0, 15, 0];
    }
    // fan: frame + spinning rotor + RGB ring (axis = Z, blowing through the fins)
    {
      const fx = cx, fz = cz + 2.55 + 1.35, fy = baseY + 0.62 + 5.1; // fan centre
      const fan = new Node('fan'); fan.pos = [fx, fy, fz]; parts.coolerRoot.add(fan); fan.group = 'cooling';
      const fb = new Builder(); // frame (static)
      for (const [x, y, w, h] of [[0, 5.55, 12, 0.9], [0, -5.55, 12, 0.9], [-5.55, 0, 0.9, 10.2], [5.55, 0, 0.9, 10.2]]) fb.box(w, h, 2.5, { pos: [x, y - h / 2, 0], r: 0.2, col: 0x0f1216, rough: 0.5 });
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) fb.cyl(0.32, 0.2, { pos: [sx * 5.4, sy * 5.4, 1.25], rot: [Math.PI / 2, 0, 0], seg: 6, col: C.steel, metal: 1, rough: 0.3 });
      // spokes holding the motor
      for (let k = 0; k < 4; k++) fb.group({ rot: [0, 0, k * Math.PI / 2 + Math.PI / 4] }, g => g.box(0.35, 4.0, 0.25, { pos: [0, 0.2, -0.9], col: 0x0f1216, rough: 0.5 }));
      const frame = mk('fan_frame', fb, {}, 'cooling'); fan.add(frame); comps.cooling.meshes.push(frame);
      const rb = new Builder(); // rotor (spinning about z)
      rb.group({ rot: [Math.PI / 2, 0, 0] }, g => g.cyl(1.25, 0.9, { pos: [0, -0.1, 0], bevel: 0.18, seg: 28, col: 0x0b0d10, metal: 0.6, rough: 0.3 }));
      for (let k = 0; k < 9; k++) rb.group({ rot: [0, 0, k * Math.PI * 2 / 9] }, g => g.group({ pos: [3.15, 0, 0], rot: [0.5, 0, 0] }, h => h.box(3.7, 1.7, 0.07, { pos: [0, -0.85, 0], r: 0.35, seg: 2, col: 0x232830, metal: 0.2, rough: 0.35 })));
      const rotor = mk('fan_rotor', rb, { doubleSided: true }, 'cooling'); rotor.spin = { axis: 'z', speed: 9.0 }; fan.add(rotor); comps.cooling.meshes.push(rotor); parts.fanRotor = rotor;
      // RGB ring + hub accent
      const gb = new Builder(); const ring = [], rr = 4.95, rt = 0.14; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2; ring.push([rr + Math.cos(a) * rt, Math.sin(a) * rt]); }
      gb.group({ rot: [Math.PI / 2, 0, 0] }, g => g.lathe(ring.map(p => [p[0], p[1]]), { seg: 64, col: 0xffffff, emis: 1.7, emisCol: 0xffffff, pos: [0, 0.4, 0] }));
      const glow = mk('fan_ring', gb, { emisAnim: 1, emisScale: 1.0 }, 'cooling', { castShadow: false }); fan.add(glow); comps.cooling.meshes.push(glow);
    }

    /* ───────── focus poses, labels, anchors ───────── */
    const F = (t, dist, yaw, pitch, anchor) => ({ target: t, dist, yaw, pitch, anchor: anchor || t });
    const focus = {
      motherboard: F([0, 0, 0], 34, 0.55, 0.62, [0, 0.4, 7.5]),
      cooling: F([cx, 7.5, cz + 0.5], 24, 0.55, 0.38, [cx, 15.5, cz]),
      cpu_package: F([cx, 0.9, cz], 9.5, 0.45, 1.05, [cx + 2.8, 1.4, cz + 2.4]),
      cpu_die: F([cx, 0.78, cz], 3.9, 0.15, 1.18, [cx - 1.2, 1.0, cz - 2.6]),
      ram: F([6.4, 2.2, -3.6], 17, 0.7, 0.5, [6.4, 5.8, 2.0]),
      ssd: F([-4.8, 0.7, 1.4], 11, 0.4, 0.8, [-4.8, 1.2, 1.4]),
      vrm: F([-6.2, 1.2, -7.2], 15, 0.9, 0.7, [-9.0, 3.4, -4.0]),
      pcie_connectors: F([-6.5, 1.0, 4.0], 17, 0.5, 0.65, [-3.2, 1.6, 5.2])
    };
    return { root, comps, parts, focus, layout: L };
  }

  global.ITM_GL.buildComputer = buildComputer;
})(typeof window !== 'undefined' ? window : globalThis);
