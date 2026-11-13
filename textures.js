/* ITM_GL.textures — procedural canvas textures: PCB with routed copper, silicon die floorplan, laser-etched IHS, labels.
 * Every texture returns {albedo: canvas, mr: canvas|null}; mr = (R metal, G rough, B emissive mask). */
(function (global) {
  'use strict';
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /** Motherboard PCB, top-down. World size (cm): W x D. `parts` = list of {x,z,w,d,kind} for component pads/keepouts. */
  function pcb(W, D, px, layout) {
    const w = Math.round(W * px), h = Math.round(D * px), R = rng(42);
    const A = cv(w, h), M = cv(w, h), a = A.getContext('2d'), m = M.getContext('2d');
    const X = x => (x + W / 2) * px, Z = z => (z + D / 2) * px;
    // soldermask: deep graphite w/ faint blue tint, satin
    a.fillStyle = '#0b1017'; a.fillRect(0, 0, w, h); m.fillStyle = 'rgb(0,175,0)'; m.fillRect(0, 0, w, h);
    // subtle fibre-weave noise
    for (let i = 0; i < 90000; i++) { const x = R() * w, y = R() * h; a.fillStyle = `rgba(${40 + R() * 40},${50 + R() * 40},${70 + R() * 40},${0.03 + R() * 0.05})`; a.fillRect(x, y, 1 + R() * 3, 1); }
    const copper = '#b8753a', gold = '#e8b84d', trace = (pts, wd, col, glow) => {
      for (const [ctx, c, wmul] of [[a, col, 1], [m, 'rgb(255,70,' + (glow ? 90 : 0) + ')', 1]]) {
        ctx.strokeStyle = c; ctx.lineWidth = wd * px * wmul; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Z(p[1])) : ctx.moveTo(X(p[0]), Z(p[1]))); ctx.stroke();
      }
    };
    const dark = '#6d4524';
    // bus routing helper: 45° dog-leg between two points
    const route = (x0, z0, x1, z1, wd, col, off) => {
      const dx = x1 - x0, dz = z1 - z0, k = Math.min(Math.abs(dx), Math.abs(dz));
      const mid = [x0 + Math.sign(dx) * (Math.abs(dx) - k) * (off || 0.5) , z0];
      const p1 = [x0 + Math.sign(dx) * (Math.abs(dx) - k) * (off == null ? 0.5 : off), z0];
      const p2 = [p1[0] + Math.sign(dx) * k, z0 + Math.sign(dz) * k];
      trace([[x0, z0], p1, p2, [x1, z1]], wd, col);
    };
    // inner-layer ghost routing (darker, wide, behind mask)
    for (let i = 0; i < 160; i++) {
      const x0 = (R() - 0.5) * W, z0 = (R() - 0.5) * D, x1 = x0 + (R() - 0.5) * 14, z1 = z0 + (R() - 0.5) * 14;
      route(x0, z0, x1, z1, 0.05, 'rgba(60,38,22,0.55)', R());
    }
    // DDR5 memory buses: serpentine, length-matched lanes from CPU → DIMM slots
    const cpu = layout.cpu, dimms = layout.dimmX;
    for (let lane = 0; lane < 34; lane++) {
      const z0 = cpu.z - 1.9 + lane * 0.115, x0 = cpu.x + 3.1;
      for (const dx of dimms) {
        const pts = [[x0, z0]];
        const bend = 0.5 + (lane % 4) * 0.22;
        pts.push([x0 + 0.9 + bend, z0], [x0 + 1.4 + bend, z0 + 0.5 + (lane % 3) * 0.15 - 0.3]);
        pts.push([dx - 0.6, z0 + 0.5 + (lane % 3) * 0.15 - 0.3], [dx - 0.25, z0 + 0.1 * (lane % 5)]);
        trace(pts, 0.055, copper);
      }
    }
    // PCIe differential pairs from CPU toward the x16 slot
    for (let lane = 0; lane < 32; lane++) {
      const pair = lane >> 1, off = (lane & 1) * 0.12, x0 = cpu.x - 2.0 + pair * 0.28 + off;
      trace([[x0, cpu.z + 2.3], [x0, cpu.z + 3.2 + (pair % 3) * 0.1], [x0 - 1.2 + pair * 0.02, layout.pcie.z - 1.4], [x0 - 1.2 + pair * 0.02, layout.pcie.z - 0.4]], 0.06, copper);
    }
    // M.2 lanes (x4)
    for (let lane = 0; lane < 8; lane++) trace([[cpu.x - 2.4 - lane * 0.14, cpu.z + 2.2], [cpu.x - 2.4 - lane * 0.14, layout.m2.z - 0.3], [layout.m2.x + 1.6, layout.m2.z - 0.3 + lane * 0.07 - 0.2]], 0.055, copper);
    // CPU ↔ chipset DMI link
    for (let lane = 0; lane < 16; lane++) trace([[cpu.x + 2.4, cpu.z + 2.3 + lane * 0.06], [cpu.x + 4.2, cpu.z + 4 + lane * 0.1], [layout.chipset.x - 2.5, layout.chipset.z - 2.2 + lane * 0.1], [layout.chipset.x - 1.7, layout.chipset.z - 1.2 + lane * 0.1]], 0.05, copper);
    // glowing accent traces (emissive mask → LED lines along board edge)
    const accent = (pts) => { a.strokeStyle = '#0fd1e8'; a.lineWidth = 0.09 * px; a.lineCap = 'round'; a.lineJoin = 'round'; a.beginPath(); pts.forEach((p, i) => i ? a.lineTo(X(p[0]), Z(p[1])) : a.moveTo(X(p[0]), Z(p[1]))); a.stroke();
      m.strokeStyle = 'rgb(40,90,255)'; m.lineWidth = 0.09 * px; m.lineCap = 'round'; m.lineJoin = 'round'; m.beginPath(); pts.forEach((p, i) => i ? m.lineTo(X(p[0]), Z(p[1])) : m.moveTo(X(p[0]), Z(p[1]))); m.stroke(); };
    const e = 0.7; accent([[-W / 2 + e, D / 2 - 3], [-W / 2 + e, D / 2 - e], [-W / 2 + 3.5, D / 2 - e], [-W / 2 + 4.6, D / 2 - e - 1.1], [-W / 2 + 9, D / 2 - e - 1.1]]);
    accent([[W / 2 - e, -D / 2 + 3], [W / 2 - e, -D / 2 + e], [W / 2 - 4, -D / 2 + e]]);
    // vias scatter
    for (let i = 0; i < 2600; i++) { const x = X((R() - 0.5) * W), y = Z((R() - 0.5) * D); a.fillStyle = '#c28a4a'; a.beginPath(); a.arc(x, y, 0.045 * px, 0, 7); a.fill(); a.fillStyle = '#05070a'; a.beginPath(); a.arc(x, y, 0.02 * px, 0, 7); a.fill(); m.fillStyle = 'rgb(255,60,0)'; m.beginPath(); m.arc(x, y, 0.045 * px, 0, 7); m.fill(); }
    // gold pad fields for SMD footprints
    const pads = (x, z, wd, dp, n, vertical) => { for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1); const px0 = vertical ? x : x - wd / 2 + t * wd, pz0 = vertical ? z - dp / 2 + t * dp : z; a.fillStyle = gold; a.fillRect(X(px0) - 0.05 * px, Z(pz0) - 0.1 * px, 0.1 * px, 0.2 * px); m.fillStyle = 'rgb(255,50,0)'; m.fillRect(X(px0) - 0.05 * px, Z(pz0) - 0.1 * px, 0.1 * px, 0.2 * px); } };
    for (let k = 0; k < 120; k++) pads(-8 + R() * 16, -8 + R() * 16, 0.35, 0.2, 2, false);
    // gold edge ring around mounting holes
    for (const [hx, hz] of layout.holes) { for (const [ctx, c] of [[a, gold], [m, 'rgb(255,40,0)']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(hx), Z(hz), 0.62 * px, 0, 7); ctx.fill(); } a.fillStyle = '#04060a'; a.beginPath(); a.arc(X(hx), Z(hz), 0.17 * px, 0, 7); a.fill(); }
    // silkscreen: crisp off-white
    const silk = (txt, x, z, size, rot, col) => { a.save(); a.translate(X(x), Z(z)); a.rotate(rot || 0); a.fillStyle = col || 'rgba(225,232,240,0.92)'; a.font = `600 ${size * px}px ui-monospace,Menlo,Consolas,monospace`; a.textAlign = 'center'; a.fillText(txt, 0, 0); a.restore(); m.save(); m.translate(X(x), Z(z)); m.rotate(rot || 0); m.fillStyle = 'rgb(0,235,0)'; m.font = a.font; m.textAlign = 'center'; m.fillText(txt, 0, 0); m.restore(); };
    silk('INSIDE THE MACHINE', -7.4, 11.95, 0.36, 0, '#7ee7f5');
    silk('DDR5-6400  CH A', layout.dimmX[0] + 1.2, -11.45, 0.3); silk('CH B', layout.dimmX[1] + 1.2, -11.45, 0.3);
    silk('PCIE5 x16', layout.pcie.x - 3, layout.pcie.z - 1.0, 0.34); silk('M.2_1', layout.m2.x - 2.2, layout.m2.z + 1.2, 0.3);
    silk('LGA-1700', cpu.x, cpu.z + 4.7, 0.34); silk('CPU_PWR', -6.6, -11.9, 0.28); silk('ATX_PWR', 11.0, -9.5, 0.26, Math.PI / 2);
    silk('VRM 16+1+2', -8, -3.2, 0.28);
    a.strokeStyle = 'rgba(225,232,240,0.7)'; a.lineWidth = 0.05 * px; const box = (x, z, w2, d2) => a.strokeRect(X(x - w2 / 2), Z(z - d2 / 2), w2 * px, d2 * px);
    box(cpu.x, cpu.z, 7.6, 7.6);
    // micro-scratch & dust for realism
    for (let i = 0; i < 160; i++) { a.strokeStyle = `rgba(255,255,255,${0.012 + R() * 0.02})`; a.lineWidth = 1; a.beginPath(); const x = R() * w, y = R() * h; a.moveTo(x, y); a.lineTo(x + (R() - 0.5) * 90, y + (R() - 0.5) * 90); a.stroke(); }
    return { albedo: A, mr: M };
  }

  /** Silicon die floorplan: cores, SRAM arrays, GPU, IO. */
  function die(size) {
    const A = cv(size, size), M = cv(size, size), a = A.getContext('2d'), m = M.getContext('2d'), R = rng(7);
    a.fillStyle = '#0d1d2a'; a.fillRect(0, 0, size, size); m.fillStyle = 'rgb(255,60,70)'; m.fillRect(0, 0, size, size);
    const S = size;
    const sram = (x, y, w, h, hue) => { a.fillStyle = `hsl(${hue},62%,30%)`; a.fillRect(x, y, w, h); a.strokeStyle = `hsla(${hue},70%,55%,0.45)`; a.lineWidth = 1; const st = Math.max(3, S / 170);
      for (let i = x; i < x + w; i += st) { a.beginPath(); a.moveTo(i, y); a.lineTo(i, y + h); a.stroke(); } a.strokeStyle = `hsla(${hue},70%,55%,0.22)`; for (let j = y; j < y + h; j += st * 2) { a.beginPath(); a.moveTo(x, j); a.lineTo(x + w, j); a.stroke(); } };
    const logic = (x, y, w, h, hue) => { a.fillStyle = `hsl(${hue},64%,27%)`; a.fillRect(x, y, w, h); a.strokeStyle = `hsla(${hue},80%,60%,0.55)`; a.lineWidth = Math.max(2, S / 330); a.strokeRect(x, y, w, h); const st = Math.max(2, S / 260);
      for (let i = 0; i < (w * h) / (st * st * 7); i++) { a.fillStyle = `hsla(${hue + R() * 30 - 15},${55 + R() * 30}%,${28 + R() * 30}%,${0.35 + R() * 0.35})`; a.fillRect(x + R() * w, y + R() * h, st * (1 + R() * 4), st); } };
    const label = (t, x, y, w, h) => { a.fillStyle = 'rgba(210,235,255,0.88)'; a.font = `800 ${Math.max(12, S / 40)}px ui-monospace,Menlo,monospace`; a.textAlign = 'center'; a.fillText(t, x + w / 2, y + h / 2 + S / 150); };
    // layout: 3x? tile — compute-cores top, GPU left-bottom, ring/L3 mid, uncore bottom
    const pad = S * 0.045;
    // IO ring edge
    a.fillStyle = '#122a38'; a.fillRect(0, 0, S, S); a.strokeStyle = '#0a1620'; a.lineWidth = pad * 0.35; a.strokeRect(pad * 0.5, pad * 0.5, S - pad, S - pad);
    const cw = (S - pad * 2) / 4;
    for (let i = 0; i < 4; i++) { const x = pad + i * cw; logic(x + 2, pad, cw - 4, S * 0.3, 190 + i * 6); sram(x + 2, pad + S * 0.3 + 3, cw - 4, S * 0.09, 205); label('P-CORE ' + i, x, pad, cw, S * 0.3); }
    sram(pad, pad + S * 0.45, S - pad * 2, S * 0.1, 215); label('L3 CACHE  30 MB', pad, pad + S * 0.45, S - pad * 2, S * 0.1);
    for (let i = 0; i < 8; i++) { const x = pad + i * ((S - pad * 2) * 0.5 / 8); logic(x + 1, pad + S * 0.57, (S - pad * 2) * 0.5 / 8 - 2, S * 0.15, 165); }
    label('E-CORES', pad, pad + S * 0.57, (S - pad * 2) * 0.5, S * 0.15);
    logic(pad + (S - pad * 2) * 0.52, pad + S * 0.57, (S - pad * 2) * 0.48, S * 0.28, 270); label('iGPU  32 EU', pad + (S - pad * 2) * 0.52, pad + S * 0.57, (S - pad * 2) * 0.48, S * 0.28);
    logic(pad, pad + S * 0.74, (S - pad * 2) * 0.24, S * 0.11, 30); label('DDR5 MC', pad, pad + S * 0.74, (S - pad * 2) * 0.24, S * 0.11);
    logic(pad + (S - pad * 2) * 0.26, pad + S * 0.74, (S - pad * 2) * 0.24, S * 0.11, 340); label('PCIe 5.0', pad + (S - pad * 2) * 0.26, pad + S * 0.74, (S - pad * 2) * 0.24, S * 0.11);
    // power-delivery metal mesh over everything (top-layer grid)
    a.strokeStyle = 'rgba(240,190,90,0.035)'; a.lineWidth = 2; for (let i = 0; i < S; i += S / 40) { a.beginPath(); a.moveTo(i, 0); a.lineTo(i, S); a.stroke(); a.beginPath(); a.moveTo(0, i); a.lineTo(S, i); a.stroke(); }
    // bond pads along edge
    a.fillStyle = '#c9a24a'; for (let i = 0; i < 70; i++) { const t = pad * 0.3 + i * ((S - pad * 0.6) / 70); for (const [x, y] of [[t, pad * 0.2], [t, S - pad * 0.45], [pad * 0.2, t], [S - pad * 0.45, t]]) a.fillRect(x, y, pad * 0.2, pad * 0.2); }
    // faint glow lines in mr for emissive "circuits"
    m.fillStyle = 'rgb(255,45,25)';
    for (let i = 0; i < 40; i++) { const x = pad + R() * (S - pad * 2), y = pad + R() * (S - pad * 2); m.fillStyle = `rgb(255,40,${R() > 0.93 ? 180 : 10})`; m.fillRect(x, y, S / 90 * (1 + R() * 5), S / 400); }
    return { albedo: A, mr: M };
  }

  /** Nickel-plated IHS top with laser etching. */
  function ihs(w, h) {
    const A = cv(w, h), a = A.getContext('2d'), R = rng(11);
    const g = a.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#b9c0c9'); g.addColorStop(0.5, '#d9dee4'); g.addColorStop(1, '#a8b0ba'); a.fillStyle = g; a.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { a.fillStyle = `rgba(${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},0.025)`; a.fillRect(R() * w, R() * h, 2 + R() * 40, 1); }
    a.fillStyle = 'rgba(40,46,56,0.82)'; a.textAlign = 'left';
    a.font = `800 ${h * 0.11}px Segoe UI, Helvetica, Arial, sans-serif`; a.fillText('RV32I', w * 0.1, h * 0.28);
    a.font = `600 ${h * 0.075}px Segoe UI, Helvetica, Arial, sans-serif`; a.fillText('INSIDE THE MACHINE', w * 0.1, h * 0.40);
    a.font = `500 ${h * 0.052}px ui-monospace, Menlo, monospace`; a.fillText('X-5000  ·  8P+16E  ·  5.8 GHz', w * 0.1, h * 0.52);
    a.fillText('S/N  ITM-2026-000001  ·  MADE IN SIMULATION', w * 0.1, h * 0.60);
    a.fillStyle = 'rgba(40,46,56,0.6)'; for (let i = 0; i < 90; i++) { a.fillRect(w * 0.1 + i * 4.2, h * 0.7, (i % 3 === 0 ? 3 : 1.5), h * 0.1); } // barcode
    a.beginPath(); a.arc(w * 0.82, h * 0.5, h * 0.16, 0, 7); a.lineWidth = h * 0.012; a.strokeStyle = 'rgba(40,46,56,0.7)'; a.stroke();
    a.font = `800 ${h * 0.12}px Segoe UI, sans-serif`; a.textAlign = 'center'; a.fillText('ITM', w * 0.82, h * 0.545);
    return { albedo: A, mr: null };
  }

  function label(w, h, lines, o) {
    o = o || {}; const A = cv(w, h), a = A.getContext('2d');
    a.fillStyle = o.bg || '#111'; a.fillRect(0, 0, w, h);
    if (o.grad) { const g = a.createLinearGradient(0, 0, w, h); o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c)); a.fillStyle = g; a.fillRect(0, 0, w, h); }
    a.textBaseline = 'middle'; a.textAlign = o.align || 'left'; let y = h * 0.2;
    for (const L of lines) { a.fillStyle = L.col || '#fff'; a.font = `${L.weight || 700} ${L.size * h}px ${L.font || 'Segoe UI, Helvetica, Arial, sans-serif'}`; a.fillText(L.t, o.align === 'center' ? w / 2 : w * 0.06, h * L.y); }
    return { albedo: A, mr: null };
  }

  /** DDR5 DIMM / SSD PCB face with gold fingers drawn in a strip. */
  function dimmPCB(w, h) {
    const A = cv(w, h), M = cv(w, h), a = A.getContext('2d'), m = M.getContext('2d'), R = rng(5);
    a.fillStyle = '#0a1a12'; a.fillRect(0, 0, w, h); m.fillStyle = 'rgb(0,180,0)'; m.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { a.strokeStyle = '#9b6a35'; a.lineWidth = 2; a.beginPath(); const y = R() * h * 0.8 + h * 0.1; a.moveTo(R() * w, y); a.lineTo(R() * w, y + (R() - 0.5) * 80); a.stroke(); }
    const n = 144; for (let i = 0; i < n; i++) { const x = w * 0.03 + i * (w * 0.94 / n); a.fillStyle = '#f0c04a'; a.fillRect(x, h * 0.9, w * 0.94 / n * 0.62, h * 0.1); m.fillStyle = 'rgb(255,50,0)'; m.fillRect(x, h * 0.9, w * 0.94 / n * 0.62, h * 0.1); }
    return { albedo: A, mr: M };
  }

  global.ITM_GL = global.ITM_GL || {};
  global.ITM_GL.textures = { pcb, die, ihs, label, dimmPCB, rng, cv };
})(typeof window !== 'undefined' ? window : globalThis);
