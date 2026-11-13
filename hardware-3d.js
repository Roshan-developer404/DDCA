/* ITM_HARDWARE_3D — public facade used by app.js.
 * One shared WebGL stage (a single canvas/context) is re-parented into whichever 3D section is visible.
 * Views keep their own mode / selection / explode state. Includes picking, floating labels and the cinematic tour. */
(function (global) {
  'use strict';
  const HW = global.ITM_HARDWARE_DATA;
  const G = global.ITM_GL;
  const { clamp, lerp, easeInOut } = G.math;
  const SHORT = { motherboard: 'Motherboard', cpu_package: 'CPU package', cpu_die: 'Silicon die', ram: 'DDR5 memory', ssd: 'NVMe SSD', vrm: 'VRM', cooling: 'Cooler', pcie_connectors: 'PCIe & I/O' };

  let stage = null, stageError = null;

  /* ───────────────────────── stage (singleton) ───────────────────────── */
  function getStage() {
    if (stage || stageError) return stage;
    try {
      const canvas = document.createElement('canvas'); canvas.className = 'itm3d-canvas'; canvas.setAttribute('aria-label', '3D scene'); canvas.tabIndex = 0;
      const wrap = document.createElement('div'); wrap.className = 'itm3d-wrap'; wrap.appendChild(canvas);
      const overlay = document.createElement('div'); overlay.className = 'itm3d-overlay'; wrap.appendChild(overlay);
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;visibility:hidden;pointer-events:none;z-index:-1'; document.body.appendChild(host); host.appendChild(wrap);
      const R = new G.Engine.Renderer(canvas, { preserve: new URLSearchParams(location.search).has('capture') });
      const comp = G.buildComputer(R);
      const S = { R, canvas, wrap, overlay, host, comp, dp: null, view: null, mode: 'hardware', last: performance.now(), tweens: [], chips: {}, hover: null, tour: null, fadeTween: null };
      S.scenes = { hardware: { root: comp.root, explodeT: 0, shadowExtent: 24, fogScale: 1 }, datapath: null };
      S.cam = new G.Engine.OrbitCamera({ target: [0, 2.5, -1], dist: 48, yaw: 0.62, pitch: 0.46, minDist: 1.6, maxDist: 90, auto: 0.07 });
      S.cam.attach(canvas);
      // static explode offsets for parts that are not set in the scene builder
      comp.parts.ihs.explode = [0, 3.2, 0];
      comp.comps.cpu_package.node.explode = [0, 0.8, 0];
      // component chips
      Object.keys(SHORT).forEach(id => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'itm3d-chip'; b.innerHTML = '<i></i><span>' + SHORT[id] + '</span>';
        b.addEventListener('click', () => { if (S.view) S.view.selectComponent(id, true); }); b.addEventListener('pointerenter', () => setHover(S, id)); b.addEventListener('pointerleave', () => setHover(S, null));
        overlay.appendChild(b); S.chips[id] = b;
      });
      S.tip = document.createElement('div'); S.tip.className = 'itm3d-tip'; overlay.appendChild(S.tip);
      S.caption = document.createElement('div'); S.caption.className = 'itm3d-caption'; S.caption.hidden = true; overlay.appendChild(S.caption);
      S.hint = document.createElement('div'); S.hint.className = 'itm3d-hint'; S.hint.textContent = 'Drag to orbit · scroll to zoom · right-drag to pan · click parts to inspect'; overlay.appendChild(S.hint);
      let lastPick = 0;
      canvas.addEventListener('pointermove', e => {
        if (S.cam.dragging || S.tour) return; const now = performance.now(); if (now - lastPick < 70) return; lastPick = now;
        const r = canvas.getBoundingClientRect(), n = S.R.pick(sceneOf(S), S.cam, e.clientX - r.left, e.clientY - r.top);
        const g = n ? n.group : null; setHover(S, g && g.startsWith('dp:') ? (g === 'dp:wire' ? null : g) : g);
        S.tip.style.transform = `translate(${e.clientX - r.left + 14}px,${e.clientY - r.top + 14}px)`;
      });
      canvas.addEventListener('pointerleave', () => setHover(S, null));
      canvas.addEventListener('click', e => {
        if (S.cam._moved > 5 || !S.view) return; const r = canvas.getBoundingClientRect();
        const n = S.R.pick(sceneOf(S), S.cam, e.clientX - r.left, e.clientY - r.top); if (!n || !n.group) return;
        if (S.mode === 'hardware' && HW[n.group]) S.view.selectComponent(n.group, true);
        else if (S.mode === 'datapath' && n.group.startsWith('dp:')) { S.dpSel = n.group.slice(3); S.view.cb.onBlockSelect && S.view.cb.onBlockSelect(S.dpSel); }
      });
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); });
      stage = S; requestAnimationFrame(frame);
    } catch (err) { stageError = err; console.warn('[ITM] WebGL unavailable:', err.message); }
    return stage;
  }
  function sceneOf(S) { return S.mode === 'datapath' ? S.scenes.datapath : S.scenes.hardware; }
  function ensureDatapath(S) {
    if (!S.dp) { S.dp = G.buildDatapath(S.R); S.scenes.datapath = { root: S.dp.root, explodeT: 0, shadowExtent: 26, fogScale: 0.3 }; }
    return S.dp;
  }

  function tween(S, ms, fn, ease) { return new Promise(res => S.tweens.push({ t0: performance.now(), ms, fn, ease: ease || easeInOut, res })); }

  function setHover(S, g) {
    if (S.hover === g) return; S.hover = g;
    S.canvas.style.cursor = g && g !== 'dp:wire' ? 'pointer' : 'grab';
    if (g && S.mode === 'hardware' && HW[g]) { S.tip.textContent = SHORT[g]; S.tip.classList.add('on'); }
    else if (g && g.startsWith('dp:')) { const b = S.dp && S.dp.blocks[g.slice(3)]; S.tip.textContent = b ? b.def.s : ''; S.tip.classList.toggle('on', !!b); }
    else S.tip.classList.remove('on');
  }

  function applyHighlights(S) {
    const v = S.view, comps = S.comp.comps;
    for (const id in comps) {
      const sel = v && v.selected === id, hov = S.hover === id, iso = v && v.isolate && v.selected && v.selected !== id;
      for (const m of allMeshes(comps[id].node)) { m.highlight += ((sel ? 0.4 : hov ? 0.3 : 0) - m.highlight) * 0.25; m.dim += ((iso ? 0.85 : 0) - m.dim) * 0.2; }
    }
    if (S.dp) for (const id in S.dp.blocks) { const B = S.dp.blocks[id]; const extra = S.hover === 'dp:' + id ? 0.35 : 0; for (const n of B.nodes.slice(0, 2)) n.highlight = Math.max(B.active * 0.9, extra); }
  }
  function allMeshes(n, out) { out = out || []; if (n.mesh) out.push(n); n.children.forEach(c => allMeshes(c, out)); return out; }

  function frame(now) {
    const S = stage; requestAnimationFrame(frame); if (!S) return;
    const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now;
    for (let i = S.tweens.length - 1; i >= 0; i--) { const t = S.tweens[i], k = clamp((now - t.t0) / t.ms, 0, 1); t.fn(t.ease(k), k); if (k >= 1) { S.tweens.splice(i, 1); t.res(); } }
    const v = S.view; if (!v || document.hidden) return; const c = v.container; if (!c || !c.isConnected) return;
    const r = c.getBoundingClientRect(); if (r.width < 10 || r.height < 10 || r.bottom < 0 || r.top > innerHeight) return;
    const want = (v.heroShift && r.width > 900 && !S.tour) ? 0.3 : 0; S.cam.shift += (want - S.cam.shift) * 0.08;
    const sc = sceneOf(S); if (!sc) return;
    if (S.mode === 'datapath' && S.dp) S.dp.update(dt);
    if (S.mode === 'hardware') applyHighlights(S);
    S.hint.style.display = (r.width < 760 || S.tour) ? 'none' : '';
    S.cam.auto = (v.autoRotate && !S.tour && S.mode === 'hardware') ? 0.08 : 0;
    S.R.render(sc, S.cam, dt);
    layoutChips(S, r);
  }

  function layoutChips(S, r) {
    const show = S.mode === 'hardware' && S.view.labels && !S.tour;
    const w = S.canvas.clientWidth, h = S.canvas.clientHeight;
    for (const id in S.chips) {
      const el = S.chips[id]; if (!show) { el.style.display = 'none'; continue; }
      const a = S.comp.focus[id].anchor, off = S.comp.comps[id].node, e = S.scenes.hardware.explodeT;
      const p = S.cam.project([a[0] + off.off[0] + off.explode[0] * e * 0.8, a[1] + off.off[1] + off.explode[1] * e * 0.8 + (id === 'ram' ? e * 6 : 0) + (id === 'cooling' ? e * 15 : 0) + (id === 'cpu_package' ? e * 3 : 0), a[2] + off.off[2]], w, h);
      const near = S.cam.dist < 30 && S.view.selected !== id;
      el.style.display = p.visible && !near ? '' : 'none'; el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      el.classList.toggle('sel', S.view.selected === id); el.classList.toggle('dim', !!S.view.selected && S.view.selected !== id);
    }
  }

  /* ───────────────────────── component state helpers ───────────────────────── */
  function liftCooler(S, on, ms) {
    const n = S.comp.parts.coolerRoot, from = n.off[1], to = on ? 24 : 0; return tween(S, ms || 900, k => { n.off[1] = lerp(from, to, k); });
  }
  function liftLid(S, on, ms) {
    const n = S.comp.parts.ihs, from = n.off[1], to = on ? 6.5 : 0; return tween(S, ms || 900, k => { n.off[1] = lerp(from, to, k); });
  }
  function setExplode(S, on, ms) {
    const sc = S.scenes.hardware, from = sc.explodeT, to = on ? 1 : 0; return tween(S, ms || 1100, k => { sc.explodeT = lerp(from, to, k); });
  }
  function setMode(S, mode, instant) {
    if (S.mode === mode) return Promise.resolve();
    const R = S.R; if (mode === 'datapath') ensureDatapath(S);
    S.savedPose = S.savedPose || {}; S.savedPose[S.mode] = { target: S.cam.target.slice(), yaw: S.cam.yaw, pitch: S.cam.pitch, dist: S.cam.dist };
    const apply = () => {
      S.mode = mode; const pose = (S.savedPose && S.savedPose[mode]) || (mode === 'datapath' ? S.dp.focus : { target: [0, 2.5, -1], dist: 48, yaw: 0.62, pitch: 0.46 });
      const asp = S.canvas.clientWidth / Math.max(1, S.canvas.clientHeight), fit = (mode === 'datapath' && !(S.savedPose && S.savedPose.datapath)) ? clamp(1.45 / asp, 1, 2.0) : 1;
      Object.assign(S.cam, { target: pose.target.slice(), yaw: pose.yaw, pitch: pose.pitch, dist: pose.dist * fit }); S.cam.fly = null;
      S.cam.minDist = mode === 'datapath' ? 6 : 1.6; S.cam.maxDist = mode === 'datapath' ? 70 : 90; S.cam.minPitch = mode === 'datapath' ? 0.25 : -0.1;
      for (const id in S.chips) S.chips[id].style.display = 'none';
      S.view && S.view.cb.onModeChange && S.view.cb.onModeChange(mode);
    };
    if (instant) { apply(); return Promise.resolve(); }
    return tween(S, 260, (k) => { R.settings.fade = 1 - k; }).then(() => { apply(); return tween(S, 380, k => { R.settings.fade = k; }); });
  }

  /* ───────────────────────── tour ───────────────────────── */
  function cap(S, step, i, n) {
    S.caption.hidden = false;
    S.caption.innerHTML = `<div class="itm3d-cap-top"><span class="itm3d-cap-n">${i + 1} / ${n}</span><button type="button" class="itm3d-cap-x" aria-label="End tour">✕</button></div><h4>${step.title}</h4><p>${step.text}</p><div class="itm3d-cap-bar"><i style="width:${(i + 1) / n * 100}%"></i></div>`;
    S.caption.querySelector('.itm3d-cap-x').onclick = () => S.view && S.view.stopTour();
  }
  const sleep = (S, ms, tok) => new Promise(res => { const t0 = performance.now(); const id = setInterval(() => { if (tok.stop || performance.now() - t0 >= ms) { clearInterval(id); res(); } }, 60); });
  async function runTour(S, view) {
    const tok = { stop: false }; S.tour = tok; view.tourActive = true; S.hint.style.display = 'none';
    const heroEl = view.container.closest('.hero'); if (heroEl) heroEl.classList.add('touring');
    const C = S.comp, cam = S.cam, L = C.layout, cx = L.cpu.x, cz = L.cpu.z;
    const fly = (pose, ms) => cam.flyTo(pose, ms);
    const rs = (global.ITM_RISCV);
    const steps = [
      { title: 'A computer, from the outside', text: 'Heat-sink, fan, memory, storage, power delivery. Everything here exists to feed one tiny square of silicon. Let’s go find it.', run: async () => { await setMode(S, 'hardware', false); await setExplode(S, false, 400); await liftCooler(S, false, 300); await liftLid(S, false, 300); await fly({ target: [0, 2.5, -1], dist: 46, yaw: 0.9, pitch: 0.42 }, 1600); }, hold: 2600 },
      { title: 'The cooler', text: 'Six copper heat pipes carry up to ~250 W from a nickel base plate into 46 aluminium fins. A fan pushes air through them.', run: async () => { await fly({ target: [cx, 6.5, cz + 0.5], dist: 25, yaw: 0.55, pitch: 0.36 }, 2200); }, hold: 3000 },
      { title: 'Lift it off', text: 'Under the cooler sits the CPU package. The shiny lid is the integrated heat spreader, laser-etched and nickel-plated.', run: async () => { await Promise.all([liftCooler(S, true, 1800), fly({ target: [cx, 1.0, cz], dist: 10.5, yaw: 0.4, pitch: 0.72 }, 2400)]); }, hold: 2600 },
      { title: 'Open the lid', text: 'Remove the heat spreader and the chip is exposed: a thin slab of silicon, ringed by tiny decoupling capacitors on a green substrate.', run: async () => { await Promise.all([liftLid(S, true, 1600), fly({ target: [cx, 0.8, cz], dist: 5.4, yaw: 0.18, pitch: 1.1 }, 2400)]); }, hold: 3000 },
      { title: 'The die', text: 'Billions of transistors, grouped into cores, caches and controllers. Its rainbow sheen is thin-film interference from stacked metal and oxide layers.', run: async () => { await fly({ target: [cx, 0.8, cz], dist: 2.9, yaw: 0.05, pitch: 1.25 }, 2600); }, hold: 3200 },
      { title: 'Zoom into one core', text: 'Strip away the floor plan and a core is just this: fetch, decode, execute, memory, write-back. Here is a single-cycle RISC-V datapath you can run.', run: async () => { await setMode(S, 'datapath', false); ensureDatapath(S).setTrace(null); }, hold: 2600 }
    ];
    // live program steps
    let sim = null, prog = null;
    if (rs) { sim = new rs.SingleCycleRV32Simulator(); sim.loadProgram(rs.PRESET_PROGRAMS.progAdd30.source); sim.reset(); }
    const n = steps.length + (sim ? 3 : 0) + 1;
    let i = 0;
    for (const st of steps) { if (tok.stop) break; cap(S, st, i++, n); await st.run(); if (tok.stop) break; await sleep(S, st.hold, tok); }
    if (sim && !tok.stop) {
      const msgs = [['Cycle 1: ADDI x1, x0, 10', 'The instruction ROM outputs a word; the immediate generator and ALU compute 0 + 10; the result is written back to x1.'], ['Cycle 2: ADDI x2, x0, 20', 'Same path again: 0 + 20 = 20, written into x2. Watch the pulses follow the wires.'], ['Cycle 3: ADD x3, x1, x2', 'Now both operands come from the register file: 10 + 20 = 30, and the ALU result is written back to x3.']];
      for (const m of msgs) {
        if (tok.stop) break; cap(S, { title: m[0], text: m[1] }, i++, n);
        const t = sim.step(); if (!t.halted) { S.dp.setTrace(t); view.cb.onTourStep && view.cb.onTourStep(t); view.syncDatapathState(t); }
        await sleep(S, 3600, tok);
      }
    }
    if (!tok.stop) { cap(S, { title: 'Now it’s your turn', text: 'Open the CPU Lab to write your own RV32I assembly, step through it, and watch the 3D datapath light up.' }, i++, n); await sleep(S, 3200, tok); }
    S.tour = null; view.tourActive = false; S.caption.hidden = true; S.hint.style.display = '';
    cam.fly = null;
    if (view.mode === 'hardware') {
      if (S.mode !== 'hardware') await setMode(S, 'hardware', false);
      if (!view.delid) { liftLid(S, false, 700); liftCooler(S, false, 900); }
      view._auto.cooler = view._auto.lid = false; view.selected = null;
      cam.flyTo({ target: [0, 2.5, -1], dist: 48, yaw: 0.62, pitch: 0.46 }, 1400);
    }
    if (heroEl) heroEl.classList.remove('touring');
    view.cb.onTourEnd && view.cb.onTourEnd();
  }

  /* ───────────────────────── view factory ───────────────────────── */
  function createHardwareExplorerScene(container, cb) {
    cb = cb || {};
    const S = getStage();
    const view = {
      container, cb, selected: null, isolate: false, exploded: false, delid: false, labels: container.id !== 'home3dCanvas', heroShift: container.id === 'home3dCanvas', autoRotate: container.id === 'home3dCanvas', mode: 'hardware', tourActive: false, _auto: { cooler: false, lid: false }, lastTrace: null,
      activate() {
        if (!S) return; const was = S.view; S.view = view; container.appendChild(S.wrap); S.R.settings.fade = 1;
        S.R.resize();
        if (was !== view) { setMode(S, view.mode, true); S.scenes.hardware.explodeT = view.exploded ? 1 : 0; S.comp.parts.coolerRoot.off[1] = (view.delid || view._auto.cooler) ? 24 : 0; S.comp.parts.ihs.off[1] = (view.delid || view._auto.lid) ? 6.5 : 0; if (S.dp && view.lastTrace) S.dp.setTrace(view.lastTrace); if (view.selected && view.mode === 'hardware') view.selectComponent(view.selected, false, true); else if (view.mode === 'hardware') S.cam.flyTo(Object.assign({}, S.comp.focus.motherboard && { target: [0, 2.5, -1], dist: 48, yaw: 0.62, pitch: 0.46 }), 600); }
      },
      deactivate() { if (S && S.view === view) { if (S.tour) view.stopTour(); } },
      selectComponent(id, fly, silent) {
        if (!S || !HW[id]) return; view.selected = id; const f = S.comp.focus[id];
        if (view.mode !== 'hardware') setMode(S, 'hardware', true);
        const needOpen = id === 'cpu_die', needCooler = id === 'cpu_package' || id === 'cpu_die';
        if (needCooler && !view.delid && !view._auto.cooler && !view.exploded) { view._auto.cooler = true; liftCooler(S, true, 900); }
        if (needOpen && !view.delid && !view._auto.lid) { view._auto.lid = true; liftLid(S, true, 900); }
        if (!needOpen && view._auto.lid) { view._auto.lid = false; liftLid(S, false, 700); }
        if (!needCooler && view._auto.cooler) { view._auto.cooler = false; liftCooler(S, false, 700); }
        if (!view.autoRotate || fly !== false) S.cam.flyTo({ target: f.target.slice(), dist: f.dist, yaw: f.yaw, pitch: f.pitch }, silent ? 500 : 1300);
        if (cb.onComponentSelect && !silent) cb.onComponentSelect(HW[id]); else if (cb.onComponentSelect && silent) cb.onComponentSelect(HW[id]);
      },
      setViewMode(m) { view.mode = m; if (S && S.view === view) setMode(S, m, false); },
      toggleExploded() { view.exploded = !view.exploded; if (S) setExplode(S, view.exploded); return view.exploded; },
      toggleIsolateSelected() { view.isolate = !view.isolate; return view.isolate; },
      toggleDelid() { view.delid = !view.delid; if (S) { view._auto.cooler = view._auto.lid = false; liftCooler(S, view.delid, 800); liftLid(S, view.delid, 1000); if (view.delid) S.cam.flyTo({ target: [S.comp.layout.cpu.x, 0.8, S.comp.layout.cpu.z], dist: 6, yaw: 0.2, pitch: 1.05 }, 1400); } return view.delid; },
      toggleLabels() { view.labels = !view.labels; return view.labels; },
      resetCamera() { if (!S) return; view.selected = null; const m = view.mode; const asp = S.canvas.clientWidth / Math.max(1, S.canvas.clientHeight); S.cam.flyTo(m === 'datapath' ? Object.assign({}, S.dp.focus, { dist: S.dp.focus.dist * clamp(1.45 / asp, 1, 2.0) }) : { target: [0, 2.5, -1], dist: 48, yaw: 0.62, pitch: 0.46 }, 1100); },
      syncDatapathState(t) { view.lastTrace = t; if (S) { ensureDatapath(S).setTrace(t); } },
      startTour() { if (S && !S.tour) { S.view = view; view.activate(); runTour(S, view); } },
      stopTour() { if (S && S.tour) { S.tour.stop = true; S.caption.hidden = true; } },
      get stage() { return S; }
    };
    if (!S) {
      container.innerHTML = '<div class="itm3d-fallback"><strong>3D view unavailable</strong><span>Your browser or GPU blocked WebGL 2. The rest of the course works normally; see the screenshots in the README for what this view shows.</span></div>';
      for (const k of ['activate', 'deactivate', 'selectComponent', 'setViewMode', 'toggleExploded', 'toggleIsolateSelected', 'toggleDelid', 'toggleLabels', 'resetCamera', 'syncDatapathState', 'startTour', 'stopTour']) view[k] = function () { return false; };
      return view;
    }
    if (container.dataset.itmReady !== '1') container.dataset.itmReady = '1';
    view.activate();
    return view;
  }

  global.ITM_HARDWARE_3D = { HARDWARE_COMPONENTS: HW, createHardwareExplorerScene, getStage: () => stage };
})(typeof window !== 'undefined' ? window : globalThis);
